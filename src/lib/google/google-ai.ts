import { GoogleGenAI } from "@google/genai";
import { stat } from "fs/promises";
import { logFileOperation, logStoreOperation, logDangerousOperation, logInfo } from "@/lib/logger";
import { MESSAGES, LOG_MESSAGES } from "@/config/constants";
import { translateGoogleError, constructRAGFilter, parseGroundingCitations } from "@/lib/chat";
import { findMatchingDocument } from "@/lib/file";

if (!process.env.GOOGLE_API_KEY) {
    throw new Error(MESSAGES.ERRORS.GOOGLE_API_KEY_MISSING);
}

let globalAiClient: GoogleGenAI | null = null;

const MODEL_NAME = "gemini-3-flash-preview"; // Must match PoC - supports File Search tool


export function getAIClient(): GoogleGenAI {
    if (!globalAiClient) {
        if (!process.env.GOOGLE_API_KEY) {
            throw new Error(MESSAGES.ERRORS.GOOGLE_API_KEY_MISSING);
        }
        globalAiClient = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
    }
    return globalAiClient;
}

/**
 * 1. Uploads a raw file to Google's staging area.
 */
export async function uploadFile(
    filePath: string,
    displayName: string,
    mimeType: string
) {
    const aiClient = getAIClient();
    logFileOperation({ operation: "upload", fileName: displayName, additionalInfo: `Type: ${mimeType}, Path: ${filePath}` });

    try {
        const stats = await stat(filePath);
        logInfo("GoogleAI", `Local file verified. Size: ${stats.size} bytes`);

        const uploadResponse = await aiClient.files.upload({
            file: filePath,
            config: {
                displayName,
                mimeType
            }
        });
        logInfo("GoogleAI", `Upload success. URI: ${uploadResponse.uri}`);
        return {
            name: uploadResponse.name!, // "files/..."
            uri: uploadResponse.uri!,
        };
    } catch (error) {
        console.error(LOG_MESSAGES.GOOGLE.UPLOAD_FAIL, error);
        throw error;
    }
}

/**
 * 2. Creates a user-specific Vector Store if one doesn't exist.
 */
export async function createStore(
    displayName: string
) {
    const aiClient = getAIClient();
    logStoreOperation({ operation: "create", storeName: displayName });
    try {
        const store = await aiClient.fileSearchStores.create({
            config: { displayName }
        });
        return store.name; // "fileSearchStores/..."
    } catch (error) {
        console.error(LOG_MESSAGES.GOOGLE.STORE_CREATE_FAIL, error);
        throw error;
    }
}

/**
 * 3. Ingests an uploaded file into the Vector Store with metadata.
 * Returns the Operation Name for polling.
 */
export async function importFileToStore(
    storeName: string,
    googleFileId: string,
    metadata: { libraryId: string, dbFileId: string }
) {
    const aiClient = getAIClient();
    logInfo("GoogleAI", `Importing ${googleFileId} into ${storeName} (Lib: ${metadata.libraryId}, File: ${metadata.dbFileId})`);
    try {
        // Custom Metadata must be strictly typed as stringValue
        const customMetadata = [
            { key: "library_id", stringValue: metadata.libraryId },
            { key: "db_file_id", stringValue: metadata.dbFileId }
        ];

        const operation = await aiClient.fileSearchStores.importFile({
            fileSearchStoreName: storeName,
            fileName: googleFileId,
            config: {
                customMetadata
            }
        });

        return operation.name!; // "operations/..."
    } catch (error) {
        console.error(LOG_MESSAGES.GOOGLE.INGEST_START_FAIL, error);
        throw error;
    }
}

/**
 * 4. Checks the status of an ingestion operation.
 * Note: The SDK expects the full operation object, not just the name.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getOperationStatus(
    operation: any
) {
    const aiClient = getAIClient();
    try {
        const op = await aiClient.operations.get({ operation });
        return {
            done: op.done,
            metadata: op.metadata
        };
    } catch (error) {
        console.error(LOG_MESSAGES.GOOGLE.OP_STATUS_FAIL, error);
        throw error;
    }
}

/**
 * 5. Performs a RAG Search.
 */
export async function search(
    storeName: string,
    query: string,
    scope?: { type: 'global' | 'library' | 'file', id?: string },
    systemInstruction?: string
) {
    const aiClient = getAIClient();
    try {
        const metadataFilter = constructRAGFilter(scope);

        const response = await aiClient.models.generateContent({
            model: MODEL_NAME,
            contents: query,
            config: {
                systemInstruction: systemInstruction,
                tools: [{
                    fileSearch: {
                        fileSearchStoreNames: [storeName],
                        metadataFilter
                    } as any
                }]
            }
        });

        return {
            text: response.text,
            citations: parseGroundingCitations(response.candidates?.[0]?.groundingMetadata)
        };
    } catch (error: any) {
        console.error(LOG_MESSAGES.GOOGLE.SEARCH_FAIL, error);
        throw new Error(translateGoogleError(error));
    }
}

/**
 * 6. Deletes a file from Google's File API.
 */
export async function deleteFile(
    fileName: string
) {
    const aiClient = getAIClient();
    logFileOperation({ operation: "delete", fileName });
    try {
        await aiClient.files.delete({ name: fileName });
        return true;
    } catch (error: any) {
        console.error(LOG_MESSAGES.GOOGLE.DELETE_FAIL, error);
        // Re-throw if it's not a 404 (Resource Not Found) or 403 (Permission Denied/Expired)
        // The API returns 403 if the file is already deleted/expired (retention policy)
        const status = error.status || error.code || error?.error?.code;
        if (status !== 404 && status !== 403) {
            throw error;
        }
        logInfo("GoogleAI", `File ${fileName} not found on remote (Status ${status}), assuming deleted.`);
        return false;
    }
}

/**
 * 6.5. Deletes a document from a specific File Search Store.
 * Since we might not have the Document ID, we list docs to find the one matching our file.
 */
export async function deleteDocumentFromStore(
    storeName: string,
    googleFileId: string
) {
    const aiClient = getAIClient();
    logInfo("GoogleAI", `Attempting to remove file ${googleFileId} from store ${storeName}`);
    try {
        // clean ID: "files/abc" -> "abc"
        const cleanId = googleFileId.replace("files/", "");

        // 1. List documents in the store to find the one derived from this file
        // Note: The SDK expects 'parent' or similar. 
        // In the REST API, it is GET v1beta/{parent=projects/*/locations/*/fileSearchStores/*}/documents
        // So we pass the storeName as the parent.
        const response = await aiClient.fileSearchStores.documents.list({
            parent: storeName
        } as any);

        // Collect documents from async iterator
        const docs = [];
        for await (const doc of response) {
            docs.push(doc);
        }

        const matchingName = findMatchingDocument(docs, googleFileId);
        if (matchingName) {
            logInfo("GoogleAI", `Found matching document: ${matchingName}. Deleting with force=true...`);
            await aiClient.fileSearchStores.documents.delete({
                name: matchingName,
                config: {
                    force: true
                }
            } as any);
            logInfo("GoogleAI", "Document deleted.");
            return true;
        }

        logInfo("GoogleAI", `No matching document found in store for ${googleFileId}.`);

    } catch (error) {
        console.warn(LOG_MESSAGES.GOOGLE.DOC_DELETE_FAIL, error);
    }
}

/**
 * 7. Inspects a file's metadata from Google's File API.
 */
export async function getFile(
    fileName: string
) {
    const aiClient = getAIClient();
    logFileOperation({ operation: "inspect", fileName });
    try {
        const file = await aiClient.files.get({ name: fileName });
        return file;
    } catch (error) {
        console.error(LOG_MESSAGES.GOOGLE.INSPECT_FAIL, error);
        return null;
    }
}

/**
 * 8. Retrieves metadata for a Vector Store (e.g., size, file count).
 */
export async function getStoreMetadata(
    storeName: string
) {
    const aiClient = getAIClient();
    logStoreOperation({ operation: "fetch", storeName });
    try {
        const store = await aiClient.fileSearchStores.get({ name: storeName });
        return {
            name: store.name,
            displayName: store.displayName,
            fileCount: Number((store as any).activeDocumentsCount) || (store as any).fileCount || 0,
            // SDK might not expose sizeBytes directly yet, we'll estimate or wait for API update
            // For now, we return what it gives us
            raw: store
        };
    } catch (error) {
        console.error(LOG_MESSAGES.GOOGLE.STORE_META_FAIL, error);
        return null;
    }
}

/**
 * 9. DANGER ZONE: Purges ALL data (Stores + Files) for this API Key.
 * This mimics the cleanup logic in poc/delete-all.js.
 */
export async function purgeAllUserGoogleData() {
    const aiClient = getAIClient();
    logDangerousOperation("GoogleAI", "Initiating GLOBAL PURGE...");

    // 1. Delete all Stores
    try {
        logInfo("GoogleAI", "Deleting all stores...");
        const stores = await aiClient.fileSearchStores.list();
        for await (const store of stores) {
            try {
                await aiClient.fileSearchStores.delete({ name: store.name as string, config: { force: true } });
                logInfo("GoogleAI", `Deleted store: ${store.name}`);
            } catch (e) {
                console.warn(`${LOG_MESSAGES.GOOGLE.STORE_DELETE_FAIL} ${store.name} (ignoring):`, e);
            }
        }
    } catch (e) {
        console.warn(LOG_MESSAGES.GOOGLE.STORE_LIST_FAIL, e);
    }

    // 2. Delete all Files
    try {
        logInfo("GoogleAI", "Deleting all files...");
        const files = await aiClient.files.list();
        for await (const file of files) {
            try {
                await aiClient.files.delete({ name: file.name as string });
                logInfo("GoogleAI", `Deleted file: ${file.name}`);
            } catch (e) {
                console.warn(`${LOG_MESSAGES.GOOGLE.FILE_DELETE_FAIL} ${file.name} (ignoring):`, e);
            }
        }
    } catch (e) {
        console.warn(LOG_MESSAGES.GOOGLE.FILE_LIST_FAIL, e);
    }

    logDangerousOperation("GoogleAI", "Global Purge Complete.");
    return true;
}
