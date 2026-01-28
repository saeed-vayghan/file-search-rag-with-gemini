import { GoogleGenAI } from "@google/genai";

if (!process.env.GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY is not defined");
}

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
const MODEL_NAME = "gemini-3-flash-preview"; // Must match PoC - supports File Search tool

export class GoogleAIService {

    /**
     * 1. Uploads a raw file to Google's staging area.
     */
    static async uploadFile(filePath: string, displayName: string, mimeType: string) {
        console.log(`[GoogleAI] Uploading: ${displayName} (${mimeType}) from ${filePath}`);

        try {
            // Verify file exists locally before sending
            const { stat } = await import("fs/promises");
            const stats = await stat(filePath);
            console.log(`[GoogleAI] Local file verified. Size: ${stats.size} bytes`);

            // Note: The SDK's files.upload expects a path string in Node.js environment
            const uploadResponse = await ai.files.upload({
                file: filePath,
                config: {
                    displayName,
                    mimeType
                }
            });
            console.log(`[GoogleAI] Upload success. URI: ${uploadResponse.uri}`);
            return {
                name: uploadResponse.name!, // "files/..."
                uri: uploadResponse.uri!,
            };
        } catch (error) {
            console.error("[GoogleAI] Upload Failed:", error);
            throw error;
        }
    }

    /**
     * 2. Creates a user-specific Vector Store if one doesn't exist.
     */
    static async createStore(displayName: string) {
        console.log(`[GoogleAI] Creating Store: ${displayName}`);
        try {
            const store = await ai.fileSearchStores.create({
                config: { displayName }
            });
            return store.name; // "fileSearchStores/..."
        } catch (error) {
            console.error("[GoogleAI] Store Creation Failed:", error);
            throw error;
        }
    }

    /**
     * 3. Ingests an uploaded file into the Vector Store with metadata.
     * Returns the Operation Name for polling.
     */
    /**
     * 3. Ingests an uploaded file into the Vector Store with metadata.
     * Returns the Operation Name for polling.
     */
    static async importFileToStore(storeName: string, googleFileId: string, metadata: { libraryId: string, dbFileId: string }) {
        console.log(`[GoogleAI] Importing ${googleFileId} into ${storeName} (Lib: ${metadata.libraryId}, File: ${metadata.dbFileId})`);
        try {
            // Custom Metadata must be strictly typed as stringValue
            const customMetadata = [
                { key: "library_id", stringValue: metadata.libraryId },
                { key: "db_file_id", stringValue: metadata.dbFileId }
            ];

            const operation = await ai.fileSearchStores.importFile({
                fileSearchStoreName: storeName,
                fileName: googleFileId,
                config: {
                    customMetadata
                }
            });

            return operation.name; // "operations/..."
        } catch (error) {
            console.error("[GoogleAI] Ingestion Start Failed:", error);
            throw error;
        }
    }

    /**
     * 4. Checks the status of an ingestion operation.
     * Note: The SDK expects the full operation object, not just the name.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static async getOperationStatus(operation: any) {
        try {
            const op = await ai.operations.get({ operation });
            return {
                done: op.done,
                metadata: op.metadata
            };
        } catch (error) {
            console.error("[GoogleAI] Operation Status Check Failed:", error);
            throw error;
        }
    }

    /**
     * 5. Performs a RAG Search.
     */
    static async search(storeName: string, query: string, scope?: { type: 'global' | 'library' | 'file', id?: string }, systemInstruction?: string) {
        const startTime = Date.now();
        console.log(`[GoogleAI] Searching ${storeName}: "${query}" (Scope: ${JSON.stringify(scope)})`);

        // Construct Metadata Filter
        let metadataFilter: string | undefined;
        if (scope?.type === 'library' && scope.id) {
            metadataFilter = `library_id = "${scope.id}"`;
        } else if (scope?.type === 'file' && scope.id) {
            metadataFilter = `db_file_id = "${scope.id}"`;
        }

        try {
            const response = await ai.models.generateContent({
                model: MODEL_NAME,
                contents: query,
                config: {
                    systemInstruction: systemInstruction,
                    tools: [{
                        fileSearch: {
                            fileSearchStoreNames: [storeName],
                            metadataFilter: metadataFilter || undefined
                        } as any
                    }]
                }
            });

            // Parse Citations from Grounding Metadata
            const candidate = response.candidates?.[0];
            const groundingMetadata = candidate?.groundingMetadata;

            console.log("[DEBUG] GoogleAI Raw Metadata:", JSON.stringify(groundingMetadata, null, 2));

            const citations = groundingMetadata?.groundingChunks?.map((chunk: any, index: number) => ({
                id: index,
                uri: chunk.web?.uri || chunk.retrievedContext?.uri,
                title: chunk.web?.title || chunk.retrievedContext?.title || "Source",
            })) || [];

            return {
                text: response.text,
                citations
            };
        } catch (error: any) {
            const duration = Date.now() - startTime;
            console.error(`[GoogleAI] Search Failed (${duration}ms):`, error);

            // Enhance error for specific cases
            if (error.cause?.code === 'ETIMEDOUT' || error.cause?.code === 'ESOCKETTIMEDOUT' || error.message.includes("fetch failed")) {
                console.error("[GoogleAI] Network/Timeout Error detected. The request took too long or connection was dropped.");
                throw new Error("Search request timed out. Please try again or refine your query.");
            }

            throw error;
        }
    }
    /**
     * 6. Deletes a file from Google's File API.
     */
    static async deleteFile(fileName: string) {
        console.log(`[GoogleAI] Deleting: ${fileName}`);
        try {
            await ai.files.delete({ name: fileName });
            return true;
        } catch (error: any) {
            console.error("[GoogleAI] Delete Failed:", error);
            // Re-throw if it's not a 404 (Resource Not Found) or 403 (Permission Denied/Expired)
            // The API returns 403 if the file is already deleted/expired (retention policy)
            const status = error.status || error.code || error?.error?.code;
            if (status !== 404 && status !== 403) {
                throw error;
            }
            console.log(`[GoogleAI] File ${fileName} not found on remote (Status ${status}), assuming deleted.`);
            return false;
        }
    }

    /**
     * 6.5. Deletes a document from a specific File Search Store.
     * Since we might not have the Document ID, we list docs to find the one matching our file.
     */
    static async deleteDocumentFromStore(storeName: string, googleFileId: string) {
        console.log(`[GoogleAI] Attempting to remove file ${googleFileId} from store ${storeName}`);
        try {
            // clean ID: "files/abc" -> "abc"
            const cleanId = googleFileId.replace("files/", "");

            // 1. List documents in the store to find the one derived from this file
            // Note: The SDK expects 'parent' or similar. 
            // In the REST API, it is GET v1beta/{parent=projects/*/locations/*/fileSearchStores/*}/documents
            // So we pass the storeName as the parent.
            const response = await ai.fileSearchStores.documents.list({
                parent: storeName
            } as any); // Cast to any because the SDK types might be experimental/incomplete for this specific alpha method.

            for await (const doc of response) {
                // Strategy 1: Check if the doc name contains the cleanId
                // Strategy 2: Check if 'displayName' matches the cleanId
                if (doc.displayName === cleanId || doc.name?.includes(cleanId)) {
                    console.log(`[GoogleAI] Found matching document: ${doc.name}. Deleting with force=true...`);
                    await ai.fileSearchStores.documents.delete({
                        name: doc.name as string,
                        config: {
                            force: true
                        }
                    } as any);
                    console.log(`[GoogleAI] Document deleted.`);
                    return true;
                }
            }

            console.log(`[GoogleAI] No matching document found in store for ${googleFileId}.`);

        } catch (error) {
            console.warn("[GoogleAI] Failed to delete document from store (non-critical):", error);
        }
    } /**
     * 7. Inspects a file's metadata from Google's File API.
     */
    static async getFile(fileName: string) {
        console.log(`[GoogleAI] Inspecting: ${fileName}`);
        try {
            const file = await ai.files.get({ name: fileName });
            return file;
        } catch (error) {
            console.error("[GoogleAI] Inspection Failed:", error);
            return null;
        }
    }
    /**
     * 8. Retrieves metadata for a Vector Store (e.g., size, file count).
     */
    static async getStoreMetadata(storeName: string) {
        console.log(`[GoogleAI] Fetching Metadata for: ${storeName}`);
        try {
            const store = await ai.fileSearchStores.get({ name: storeName });
            return {
                name: store.name,
                displayName: store.displayName,
                // @ts-ignore - API field mismatch fix
                fileCount: Number((store as any).activeDocumentsCount) || (store as any).fileCount || 0,
                // SDK might not expose sizeBytes directly yet, we'll estimate or wait for API update
                // For now, we return what it gives us
                raw: store
            };
        } catch (error) {
            console.error("[GoogleAI] Store Meta Fetch Failed:", error);
            return null;
        }
    }

    /**
     * 9. DANGER ZONE: Purges ALL data (Stores + Files) for this API Key.
     * This mimics the cleanup logic in poc/delete-all.js.
     */
    static async purgeAllUserGoogleData() {
        console.log("🔥 [GoogleAI] Initiating GLOBAL PURGE...");

        // 1. Delete all Stores
        try {
            console.log("   [GoogleAI] Deleting all stores...");
            const stores = await ai.fileSearchStores.list();
            for await (const store of stores) {
                try {
                    await ai.fileSearchStores.delete({ name: store.name as string, config: { force: true } });
                    console.log(`   [GoogleAI] Deleted store: ${store.name}`);
                } catch (e) {
                    console.warn(`   [GoogleAI] Failed to delete store ${store.name} (ignoring):`, e);
                }
            }
        } catch (e) {
            console.warn("   [GoogleAI] Error listing stores for purge:", e);
        }

        // 2. Delete all Files
        try {
            console.log("   [GoogleAI] Deleting all files...");
            const files = await ai.files.list();
            for await (const file of files) {
                try {
                    await ai.files.delete({ name: file.name as string });
                    console.log(`   [GoogleAI] Deleted file: ${file.name}`);
                } catch (e) {
                    console.warn(`   [GoogleAI] Failed to delete file ${file.name} (ignoring):`, e);
                }
            }
        } catch (e) {
            console.warn("   [GoogleAI] Error listing files for purge:", e);
        }

        console.log("✅ [GoogleAI] Global Purge Complete.");
        return true;
    }
}
