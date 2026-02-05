"use server";

import { revalidatePath } from "next/cache";
import User from "@/models/User";
import FileModel from "@/models/File";
import Library from "@/models/Library";
import Store from "@/models/Store";
import * as GoogleAIService from "@/lib/google";
import { unlink } from "fs/promises";
import { join } from "path";
import { LIBRARY_DEFAULTS, UI_DEFAULTS, PATHS, LOG_MESSAGES, MESSAGES } from "@/config/constants";
import { classifyGoogleError, GOOGLE_ERROR_TYPES } from "@/lib/file";
import Message from "@/models/Message";
import UsageLog from "@/models/UsageLog";
import { calculateIndexingCost } from "@/lib/cost-calculator";

/**
 * Helper: Ensures the user has a valid Store record.
 */
export async function ensureUserStore(user: any) {
    if (!user.primaryStoreId) {
        const googleStoreName = await GoogleAIService.createStore(`store-${user.email}`);
        const store = await Store.create({
            userId: user._id,
            googleStoreId: googleStoreName,
            displayName: `Main Library (${user.email})`,
        });
        user.primaryStoreId = store._id;
        await user.save();
        return store;
    }

    const store = await Store.findById(user.primaryStoreId);
    if (!store) {
        const googleStoreName = await GoogleAIService.createStore(`recovery-store-${user.email}`);
        const newStore = await Store.create({
            userId: user._id,
            googleStoreId: googleStoreName,
            displayName: `Recovered Library (${user.email})`,
        });
        user.primaryStoreId = newStore._id;
        await user.save();
        return newStore;
    }

    return store;
}

/**
 * Helper: Resolve a valid Library ID.
 */
export async function resolveLibraryId(user: any, libraryIdCandidate: string | null | undefined): Promise<string> {
    if (libraryIdCandidate && libraryIdCandidate !== "null" && libraryIdCandidate !== "undefined") {
        return libraryIdCandidate;
    }

    const defaultLib = await Library.findOne({ userId: user._id, name: LIBRARY_DEFAULTS.NAME });
    if (defaultLib) {
        return defaultLib._id.toString();
    }

    const newLib = await Library.create({
        userId: user._id,
        name: LIBRARY_DEFAULTS.NAME,
        icon: UI_DEFAULTS.LIBRARY.ICON,
        color: UI_DEFAULTS.LIBRARY.COLOR,
        description: LIBRARY_DEFAULTS.DESCRIPTION
    });
    return newLib._id.toString();
}

/**
 * Helper: Internal utility to log indexing costs and update file records.
 */
async function logIndexingUsage(
    user: any,
    googleOperationName: string,
    fileUri: string,
    mimeType: string,
    dbFileId: string,
    fileName: string,
    fileSize: number
) {
    try {
        const rawTokens = await GoogleAIService.countTokens(fileUri, mimeType);
        const totalTokens = rawTokens || 0;

        if (totalTokens > 0) {
            const cost = calculateIndexingCost(totalTokens);

            // 1. Log Usage event
            await UsageLog.create({
                userId: user._id,
                type: "indexing",
                totalCost: cost,
                modelName: "gemini-embedding-001",
                tokens: { input: totalTokens, output: 0, total: totalTokens },
                details: { tokenCost: cost, searchCost: 0, isTier2: false },
                meta: {
                    operationName: googleOperationName,
                    fileName,
                    fileSize
                },
                contextId: dbFileId
            });

            // 2. Update File record
            await FileModel.findByIdAndUpdate(dbFileId, {
                indexingTokens: totalTokens,
                indexingCost: cost,
            });
            return { totalTokens, cost };
        }
    } catch (error) {
        console.error("Failed to log indexing usage:", error);
    }
    return null;
}

/**
 * Helper: Handles ingestion process with auto-recovery.
 */
export async function importFileWithRetry(
    store: any,
    googleFileId: string,
    googleFileUri: string,
    mimeType: string,
    metadata: { libraryId: string, dbFileId: string },
    user: any,
    fileName: string,
    fileSize: number
) {
    const attemptImport = async (targetStoreId: string) => {
        const operation = await GoogleAIService.importFileToStore(targetStoreId, googleFileId, metadata);

        await logIndexingUsage(
            user,
            operation.name || "unknown",
            googleFileUri,
            mimeType,
            metadata.dbFileId,
            fileName,
            fileSize
        );
        return operation;
    };

    try {
        return await attemptImport(store.googleStoreId);
    } catch (error: any) {
        const errorType = classifyGoogleError(error);
        const shouldRetry = errorType === GOOGLE_ERROR_TYPES.STORE_EXPIRED || errorType === GOOGLE_ERROR_TYPES.STORE_NOT_FOUND;

        if (!shouldRetry) throw error;

        console.warn(LOG_MESSAGES.FILE.UPLOAD_STORE_RETRY);

        const newStoreName = await GoogleAIService.createStore(`resync-store-${user.email}`);
        if (!newStoreName) throw new Error(MESSAGES.ERRORS.GOOGLE_STORE_CREATION_FAILED);

        store.googleStoreId = newStoreName;
        store.lastSyncedAt = new Date();
        await store.save();

        return await attemptImport(newStoreName);
    }
}

/**
 * Internal helper for deleting files (avoids Auth middleware recursion).
 */
export async function deleteFileInternal(user: any, fileId: string) {
    try {
        const file = await FileModel.findOne({ _id: fileId, userId: user._id });
        if (!file) {
            return { error: MESSAGES.ERRORS.FILE_NOT_FOUND };
        }

        let googleStatus = "Skipped";
        if (file.googleFileId) {
            try {
                if (user && user.primaryStoreId) {
                    const store = await Store.findById(user.primaryStoreId);
                    if (store && store.googleStoreId) {
                        await GoogleAIService.deleteDocumentFromStore(store.googleStoreId, file.googleFileId);
                    }
                }
                const deleted = await GoogleAIService.deleteFile(file.googleFileId);
                googleStatus = deleted ? "Deleted" : "Already Cleaned";
            } catch (e) {
                googleStatus = "Failed (Ignored)";
                console.error(LOG_MESSAGES.FILE.GOOGLE_DELETE_FAIL, e);
            }
        }

        let localStatus = "Skipped";
        if (file.localPath) {
            try {
                const absolutePath = join(process.cwd(), file.localPath);
                await unlink(absolutePath);
                localStatus = "Deleted";
            } catch (err) {
                console.warn(`${LOG_MESSAGES.FILE.LOCAL_DELETE_FAIL} ${file.localPath}:`, err);
                localStatus = "Failed/Missing";
            }
        }

        await Message.deleteMany({ fileId: file._id });
        await FileModel.findByIdAndDelete(fileId);

        const freshUser = await User.findById(user._id);
        if (freshUser && freshUser.primaryStoreId) {
            try {
                const store = await Store.findById(freshUser.primaryStoreId);
                if (store) {
                    store.fileCount = Math.max(0, store.fileCount - 1);
                    store.sizeBytes = Math.max(0, store.sizeBytes - (file.sizeBytes || 0));
                    await store.save();
                }
            } catch (storeError) {
                console.warn(LOG_MESSAGES.FILE.STORE_STATS_FAIL, storeError);
            }
        }

        revalidatePath(PATHS.HOME);

        return {
            success: true,
            message: `Cleanup Complete: Remote (${googleStatus}), Local (${localStatus}).`
        };
    } catch (error) {
        console.error(LOG_MESSAGES.FILE.DELETE_FAIL, error);
        return { error: MESSAGES.ERRORS.DELETE_FILE_FAILED };
    }
}
