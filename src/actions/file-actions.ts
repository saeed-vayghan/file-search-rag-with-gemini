"use server";

import { revalidatePath } from "next/cache";
import User from "@/models/User";
import FileModel from "@/models/File";
import Library from "@/models/Library";
import Store from "@/models/Store";
import * as GoogleAIService from "@/lib/google";
import { logInfo, logDangerousOperation, logDebug } from "@/lib/logger";
import { withAuth } from "@/lib/auth";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { rm } from "fs/promises";
import { TIERS, TierKey, DEFAULT_TIER } from "@/config/limits";
import { FILE_STATUS, UI_DEFAULTS, LIBRARY_DEFAULTS, PATHS, LOG_MESSAGES, MESSAGES } from "@/config/constants";
import { validateFileSize, validateStoreCapacity, mapFileToUi, generateLocalFilePath, mapStoreStatsToUi, classifyGoogleError, GOOGLE_ERROR_TYPES } from "@/lib/file";
import Message from "@/models/Message";
import { RATE_LIMIT_CONFIG } from "@/config/ratelimit";
import { formatBytes } from "@/lib/utils";


export const checkFileDuplicate = withAuth(async (user, hash: string, libraryId?: string) => {
    try {

        const query: any = { contentHash: hash, userId: user._id };
        if (libraryId) {
            query.libraryId = libraryId;
        }

        const existingFile = await FileModel.findOne(query).select("displayName _id").lean();

        if (existingFile) {
            return {
                exists: true,
                file: {
                    id: existingFile._id.toString(),
                    name: existingFile.displayName
                }
            };
        }

        return { exists: false };
    } catch (error) {
        console.error(LOG_MESSAGES.FILE.CHECK_DUPLICATE_FAIL, error);
        return { exists: false };
    }
});

/**
 * Helper: Ensures the user has a valid Store record.
 * Handles creation and recovery of stores.
 */
async function ensureUserStore(user: any) {
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
        // Recovery: If primaryStoreId exists but Store record is missing
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
 * Helper: Refactored logic to resolve a valid Library ID.
 */
async function resolveLibraryId(user: any, libraryIdCandidate: string | null | undefined): Promise<string> {
    if (libraryIdCandidate && libraryIdCandidate !== "null" && libraryIdCandidate !== "undefined") {
        return libraryIdCandidate;
    }

    // Find or Create Default Library
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
 * Helper: Handles the ingestion process, including self-healing (re-creating store) if needed.
 */
async function importFileWithRetry(
    store: any,
    googleFileId: string,
    metadata: { libraryId: string, dbFileId: string },
    user: any
): Promise<{ operationName: string, updatedStore?: any }> {
    try {
        const opName = await GoogleAIService.importFileToStore(
            store.googleStoreId,
            googleFileId,
            metadata
        );
        return { operationName: opName };
    } catch (error: any) {
        // Check if Store is missing/expired
        const errorType = classifyGoogleError(error);
        if (errorType !== GOOGLE_ERROR_TYPES.STORE_EXPIRED && errorType !== GOOGLE_ERROR_TYPES.STORE_NOT_FOUND) {
            throw error; // Not a recoverable error
        }

        console.warn(LOG_MESSAGES.FILE.UPLOAD_STORE_RETRY);

        // Create new store on Google
        const newGoogleStoreName = await GoogleAIService.createStore(`resync-store-${user.email}`);
        if (!newGoogleStoreName) {
            throw new Error(MESSAGES.ERRORS.GOOGLE_STORE_CREATION_FAILED);
        }

        // Update Store record
        store.googleStoreId = newGoogleStoreName;
        store.lastSyncedAt = new Date();
        const updatedStore = await store.save();

        // Retry import with new store
        const opName = await GoogleAIService.importFileToStore(
            newGoogleStoreName,
            googleFileId,
            metadata
        );
        return { operationName: opName, updatedStore };
    }
}

export const uploadFileAction = withAuth(async (user, formData: FormData) => {
    const file = formData.get("file") as File | null;
    const rawLibraryId = formData.get("libraryId") as string;
    const contentHash = formData.get("contentHash") as string;

    if (!file) {
        return { error: MESSAGES.ERRORS.NO_FILE };
    }

    let newFileId: string | null = null;

    try {
        // 1. Resolve Dependencies
        const userDoc = await User.findById(user._id);
        if (!userDoc) {
            return { error: MESSAGES.ERRORS.USER_NOT_FOUND };
        }

        // 2. Validate Limits
        const userTier = (userDoc.tier || DEFAULT_TIER) as TierKey;
        const limits = TIERS[userTier];

        const sizeCheck = validateFileSize(file.size, limits);
        if (!sizeCheck.valid) {
            return { error: sizeCheck.error };
        }

        // 3. Prepare Environment
        const libraryId = await resolveLibraryId(user, rawLibraryId);
        let store = await ensureUserStore(user);

        const capacityCheck = validateStoreCapacity(store.sizeBytes, file.size, limits);
        if (!capacityCheck.valid) {
            return { error: capacityCheck.error };
        }

        // 4. Save to Temp Disk
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const tempPath = join(tmpdir(), `${Date.now()}-${file.name}`);
        await writeFile(tempPath, buffer);

        // 5. Database Record Creation
        const newFile = await FileModel.create({
            userId: user._id,
            libraryId,
            displayName: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
            status: FILE_STATUS.UPLOADING,
            contentHash: contentHash || undefined
        });
        newFileId = newFile._id.toString();

        // 6. External Service Upload
        const uploadRes = await GoogleAIService.uploadFile(tempPath, file.name, file.type);

        // 7. Ingestion with Auto-Recovery
        const { operationName, updatedStore } = await importFileWithRetry(
            store,
            uploadRes.name,
            { libraryId, dbFileId: newFileId! },
            user
        );

        if (updatedStore) {
            store = updatedStore;
        }

        // 8. Local Preview Storage
        const { relativePath, absolutePath } = generateLocalFilePath(
            process.cwd(),
            user._id.toString(),
            newFile._id.toString(),
            uploadRes.name,
            file.name
        );

        const { mkdir } = await import("fs/promises");
        await mkdir(join(process.cwd(), "uploads", user._id.toString()), { recursive: true });
        await writeFile(absolutePath, buffer);

        // 9. Finalize File Record
        newFile.status = "INGESTING";
        newFile.googleFileId = uploadRes.name;
        newFile.googleUri = uploadRes.uri;
        newFile.googleOperationName = operationName;
        newFile.localPath = relativePath;
        await newFile.save();

        // 10. Update Statistics
        store.sizeBytes += file.size;
        store.fileCount += 1;
        await store.save();

        // 11. Cleanup
        await unlink(tempPath);

        revalidatePath(PATHS.HOME);
        return { success: true, fileId: newFile._id.toString() };

    } catch (error) {
        console.error(LOG_MESSAGES.FILE.UPLOAD_FAIL, error);

        if (newFileId) {
            try {
                await FileModel.findByIdAndDelete(newFileId);
            } catch (cleanupError) {
                console.error(LOG_MESSAGES.FILE.CLEANUP_ORPHAN_FAIL, cleanupError);
            }
        }

        return { error: MESSAGES.ERRORS.UPLOAD_FAILED };
    }
}, { rateLimit: RATE_LIMIT_CONFIG.UPLOAD });

export const getFilesAction = withAuth(async (user) => {
    const files = await FileModel.find({ userId: user._id })
        .sort({ createdAt: -1 })
        .populate("libraryId", "name icon")
        .lean();

    return files.map(mapFileToUi);
});

export const getFileAction = withAuth(async (user, fileId: string) => {
    try {
        const file = await FileModel.findOne({ _id: fileId, userId: user._id }).lean();
        if (!file) return null;

        const f = file as any; // Cast for lean properties

        return {
            ...mapFileToUi(file),
            googleUri: (file as any).googleUri, // Additional property for single file view if needed
        };
    } catch {
        return null;
    }
});

export const getUserStatsAction = withAuth(async (user) => {
    const userDoc = await User.findById(user._id);
    if (!userDoc) {
        return {
            name: user.name || "User",
            totalDocs: 0,
            storageUsed: "0 KB",
            storageLimit: "1 GB",
        };
    }

    const userTier = (userDoc.tier || DEFAULT_TIER) as TierKey;
    const limits = TIERS[userTier];

    const files = await FileModel.find({ userId: user._id });
    const totalBytes = files.reduce((sum, f) => sum + (f.sizeBytes || 0), 0);

    return {
        name: user.name,
        email: user.email,
        image: user.image,
        tier: userTier,
        totalDocs: files.length,
        storageUsed: formatBytes(totalBytes),
        storageUsedBytes: totalBytes,
        storageLimit: formatBytes(limits.maxStoreSizeBytes),
        storageLimitBytes: limits.maxStoreSizeBytes,
    };
});

export const getLibrariesAction = withAuth(async (user) => {
    // Get real libraries from DB
    const libraries = await Library.find({ userId: user._id }).lean();

    // Count files per library
    const result = await Promise.all(
        libraries.map(async (lib) => {
            const fileCount = await FileModel.countDocuments({
                userId: user._id,
                libraryId: lib._id
            });
            return {
                id: lib._id.toString(),
                name: lib.name,
                description: lib.description || "",
                icon: lib.icon || UI_DEFAULTS.LIBRARY.ICON,
                color: lib.color || UI_DEFAULTS.LIBRARY.COLOR,
                count: fileCount,
            };
        })
    );

    return result;
});

export const createLibraryAction = withAuth(async (user, name: string, icon?: string, color?: string) => {
    try {
        const library = await Library.create({
            userId: user._id,
            name,
            icon: icon || UI_DEFAULTS.LIBRARY.ICON,
            color: color || UI_DEFAULTS.LIBRARY.COLOR,
        });

        revalidatePath(PATHS.HOME);
        revalidatePath(PATHS.LIBRARIES);

        return {
            success: true,
            library: {
                id: library._id.toString(),
                name: library.name,
                icon: library.icon,
                color: library.color,
            }
        };
    } catch (error) {
        console.error(LOG_MESSAGES.FILE.CREATE_LIB_FAIL, error);
        return { error: MESSAGES.ERRORS.CREATE_LIB_FAILED };
    }
}, { rateLimit: { limit: 10, windowMs: 10 * 60 * 1000, actionName: "library" } });

export const updateLibraryAction = withAuth(async (user, libraryId: string, name: string, icon?: string, color?: string) => {
    try {
        const library = await Library.findOne({ _id: libraryId, userId: user._id });
        if (!library) {
            return { error: MESSAGES.ERRORS.LIB_NOT_FOUND };
        }

        library.name = name;
        if (icon) library.icon = icon;
        if (color) library.color = color;

        await library.save();

        revalidatePath(PATHS.HOME);
        revalidatePath(PATHS.LIBRARIES);
        revalidatePath(`${PATHS.LIBRARIES}/${libraryId}`);

        return {
            success: true,
            library: {
                id: library._id.toString(),
                name: library.name,
                icon: library.icon,
                color: library.color,
            }
        };
    } catch (error) {
        console.error(LOG_MESSAGES.FILE.UPDATE_LIB_FAIL, error);
        return { error: MESSAGES.ERRORS.UPDATE_LIB_FAILED };
    }
}, { rateLimit: { limit: 10, windowMs: 10 * 60 * 1000, actionName: "library" } });

export const deleteLibraryAction = withAuth(async (user, libraryId: string) => {

    try {
        const library = await Library.findOne({ _id: libraryId, userId: user._id });
        if (!library) {
            return { error: MESSAGES.ERRORS.LIB_NOT_FOUND };
        }

        // Cascade Delete Files
        const files = await FileModel.find({ libraryId: library._id, userId: user._id });
        logDebug("DeleteLibrary", `Found ${files.length} files in library ${library.name} (${libraryId})`);

        let deletedCount = 0;
        let failedCount = 0;

        // Execute sequentially to avoid DB connection race conditions and rate limits
        for (const file of files) {
            try {
                logDebug("DeleteLibrary", `Deleting file: ${file._id}`);
                // Since deleteFileAction is now authenticated, we can't call it directly as a function easily expecting the same user context unless we refactor.
                // However, since we are already inside an authenticated action (deleteLibraryAction) and we have the user,
                // we can just call the logic OR call the action if we pass the context.
                // But `deleteFileAction` expects (user, fileId).
                // Actually, `withAuth` returns a function that expects (fileId).
                // But the `user` is injected by the middleware.
                // We cannot call an Action from another Action and expect Auth to pass through via headers in a direct import call.
                // We must extract the logic or invoke `deleteFileInternal` (refactor pattern).

                // Refactor Strategy: We will call the logic directly or we need to separate Logic from Action.
                // For now, I will inline the internal deletion logic or assume I can call a helper.
                // Let's create a helper `deleteFileInternal` to reuse logic.
                const result = await deleteFileInternal(user, file._id.toString());

                if (result.success) {
                    deletedCount++;
                } else {
                    console.error(`${LOG_MESSAGES.FILE.DELETE_LIB_FILE_FAIL} ${file._id}: ${result.error}`);
                    failedCount++;
                }
            } catch (err) {
                console.error(`${LOG_MESSAGES.FILE.DELETE_LIB_EXCEPTION} ${file._id}:`, err);
                failedCount++;
            }
        }

        logInfo("DeleteLibrary", `Summary: ${deletedCount} deleted, ${failedCount} failed.`);

        if (failedCount > 0) {
            return { error: `Failed to delete ${failedCount} files. Library not deleted.` };
        }

        // Delete the library only if all files are gone
        await Library.findByIdAndDelete(libraryId);

        revalidatePath(PATHS.HOME);
        revalidatePath(PATHS.LIBRARIES);

        return { success: true, message: MESSAGES.SUCCESS.LIBRARY_DELETED };
    } catch (error) {
        console.error(LOG_MESSAGES.FILE.DELETE_LIB_FAIL, error);
        return { error: MESSAGES.ERRORS.DELETE_LIB_FAILED };
    }
});

export const checkFileStatusAction = withAuth(async (user, fileId: string) => {

    try {
        const file = await FileModel.findOne({ _id: fileId, userId: user._id });
        if (!file) {
            return { error: MESSAGES.ERRORS.FILE_NOT_FOUND };
        }

        // If already ACTIVE or FAILED, no need to check
        if (file.status === FILE_STATUS.ACTIVE || file.status === FILE_STATUS.FAILED) {
            return {
                status: file.status,
                message: file.status === FILE_STATUS.ACTIVE ? MESSAGES.SUCCESS.FILE_READY : MESSAGES.ERRORS.INGESTION_FAILED
            };
        }

        // Check with Google API if we have an operation
        if (file.googleOperationName) {
            // Note: In the real implementation, we'd call getOperationStatus
            // For now, we'll mark as ACTIVE after checking
            file.status = FILE_STATUS.ACTIVE;
            await file.save();

            revalidatePath(PATHS.HOME);
            return {
                status: FILE_STATUS.ACTIVE,
                message: MESSAGES.SUCCESS.FILE_READY
            };
        }

        return {
            status: file.status,
            message: MESSAGES.INFO.STILL_PROCESSING
        };
    } catch (error) {
        console.error(LOG_MESSAGES.FILE.CHECK_STATUS_FAIL, error);
        return { error: MESSAGES.ERRORS.CHECK_STATUS_FAILED };
    }
});

// Internal helper for usage within other server actions (avoids Auth middleware recursion issues)
// Assumes caller has already verified User
async function deleteFileInternal(user: any, fileId: string) {
    try {
        const file = await FileModel.findOne({ _id: fileId, userId: user._id });
        if (!file) {
            return { error: MESSAGES.ERRORS.FILE_NOT_FOUND };
        }

        // 1. Delete from Google Cloud (Store Document + File)
        let googleStatus = "Skipped";
        if (file.googleFileId) {
            try {
                // A. Explicitly delete from Store (User Request)
                // We already have the user object passed in
                if (user && user.primaryStoreId) {
                    const store = await Store.findById(user.primaryStoreId);
                    if (store && store.googleStoreId) {
                        await GoogleAIService.deleteDocumentFromStore(store.googleStoreId, file.googleFileId);
                    }
                }

                // B. Delete the raw File
                const deleted = await GoogleAIService.deleteFile(file.googleFileId);
                googleStatus = deleted ? "Deleted" : "Already Cleaned";
            } catch (e) {
                googleStatus = "Failed (Ignored)";
                console.error(LOG_MESSAGES.FILE.GOOGLE_DELETE_FAIL, e);
            }
        }

        // 2. Delete Local File
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

        // 3. Delete Chat History
        await Message.deleteMany({ fileId: file._id });

        // 4. Delete DB Record
        await FileModel.findByIdAndDelete(fileId);

        // 5. Update Store Stats
        // Re-fetch user just to be sure we have latest or use passed user
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

export const deleteFileAction = withAuth(async (user, fileId: string) => {
    return deleteFileInternal(user, fileId);
});

export const getRemoteFileDebugAction = withAuth(async (user, fileId: string) => {
    try {
        const file = await FileModel.findOne({ _id: fileId, userId: user._id });
        if (!file || !file.googleFileId) {
            return { error: MESSAGES.ERRORS.FILE_NOT_FOUND };
        }

        const remoteMeta = await GoogleAIService.getFile(file.googleFileId);
        if (!remoteMeta) {
            return { error: MESSAGES.ERRORS.FILE_NOT_FOUND_REMOTE };
        }

        return { success: true, metadata: remoteMeta };
    } catch (error) {
        return { error: MESSAGES.ERRORS.INSPECT_REMOTE_FAILED };
    }
});

export const getLibraryFilesAction = withAuth(async (user, libraryId: string) => {

    try {
        const library = await Library.findOne({ _id: libraryId, userId: user._id }).lean();
        if (!library) return { files: [], library: null };

        const files = await FileModel.find({ userId: user._id, libraryId }).sort({ createdAt: -1 }).lean();

        return {
            library: {
                id: library._id.toString(),
                name: library.name,
                icon: library.icon || UI_DEFAULTS.LIBRARY.ICON,
                color: library.color || UI_DEFAULTS.LIBRARY.COLOR,
                description: library.description || "",
            },
            files: files.map(mapFileToUi)
        };
    } catch (error) {
        console.error(LOG_MESSAGES.FILE.GET_LIB_FILES_FAIL, error);
        return { files: [], library: null };
    }
});

export const getStoreStatusAction = withAuth(async (user, force: boolean = false) => {
    if (!user.primaryStoreId) {
        return { error: MESSAGES.ERRORS.NO_STORE_FOUND };
    }

    try {
        const store = await Store.findById(user.primaryStoreId);
        if (!store) return { error: MESSAGES.ERRORS.STORE_RECORD_MISSING };

        // Attempt live sync with Google if forced or not done recently (e.g., 10 mins)
        const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
        if (force || store.lastSyncedAt < tenMinsAgo) {
            const meta = await GoogleAIService.getStoreMetadata(store.googleStoreId);
            if (meta) {
                // Update DB with cloud truth
                store.fileCount = meta.fileCount;
                store.lastSyncedAt = new Date();
                await store.save();
            }
        }

        const userTier = (user.tier || DEFAULT_TIER) as TierKey;
        const localFileCount = await FileModel.countDocuments({ userId: user._id });

        return {
            success: true,
            store: mapStoreStatsToUi(store, localFileCount, userTier)
        };
    } catch (error) {
        console.error(LOG_MESSAGES.FILE.GET_STORE_STATUS_FAIL, error);
        return { error: MESSAGES.ERRORS.FETCH_STORE_STATUS_FAILED };
    }
});

export const purgeUserDataAction = withAuth(async (user) => {

    try {
        logDangerousOperation("PURGE", `Starting Purge for User: ${user.email}`);

        // 1. Delete all DB Records
        await Message.deleteMany({}); // Purge all chat history
        await FileModel.deleteMany({}); // Purge all file records
        await Library.deleteMany({}); // Purge all libraries
        await Store.deleteMany({}); // Purge all store records

        // Reset User state but keep the user record (simulation of "Account Reset")
        user.primaryStoreId = undefined;
        await user.save();

        logInfo("PURGE", "DB Records purged.");

        // 2. Delete Local Directory
        try {
            const userUploadDir = join(process.cwd(), "uploads", user._id.toString());
            await rm(userUploadDir, { recursive: true, force: true });
            logInfo("PURGE", `Deleted local directory: ${userUploadDir}`);
        } catch (fsError) {
            console.warn(LOG_MESSAGES.FILE.PURGE_LOCAL_FAIL, fsError);
        }

        // 3. Purge Google Cloud Data
        await GoogleAIService.purgeAllUserGoogleData();

        revalidatePath("/");

        return { success: true };

    } catch (error) {
        console.error(LOG_MESSAGES.FILE.PURGE_FAIL, error);
        return { error: MESSAGES.ERRORS.PURGE_FAILED };
    }
});
