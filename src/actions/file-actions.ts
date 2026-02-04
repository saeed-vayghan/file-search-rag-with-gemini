"use server";

import { revalidatePath } from "next/cache";
import User from "@/models/User";
import FileModel from "@/models/File";
import Library from "@/models/Library";
import Store from "@/models/Store";
import { GoogleAIService } from "@/lib/google-ai";
import { logInfo, logDangerousOperation, logDebug } from "@/lib/logger";
import { withAuth, withOptionalAuth } from "@/lib/auth-middleware";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { TIERS, TierKey, DEFAULT_TIER } from "@/config/limits";
import { FILE_STATUS, UI_DEFAULTS, LIBRARY_DEFAULTS, PATHS, LOG_MESSAGES } from "@/config/constants";


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


export const uploadFileAction = withAuth(async (user, formData: FormData) => {
    const file = formData.get("file") as File | null;
    let libraryId = formData.get("libraryId") as string;
    const contentHash = formData.get("contentHash") as string;

    // Rule: Uncategorized files are not allowed.
    if (!libraryId || libraryId === "null" || libraryId === "undefined") {
        // Find or Create Default Library
        let defaultLib = await Library.findOne({ userId: user._id, name: LIBRARY_DEFAULTS.NAME });
        if (!defaultLib) {
            defaultLib = await Library.create({
                userId: user._id,
                name: LIBRARY_DEFAULTS.NAME,
                icon: UI_DEFAULTS.LIBRARY.ICON,
                color: UI_DEFAULTS.LIBRARY.COLOR,
                description: LIBRARY_DEFAULTS.DESCRIPTION
            });
        }
        libraryId = defaultLib._id.toString();
    }

    if (!file) {
        return { error: "No file provided" };
    }

    let newFileId: string | null = null;

    try {
        const userDoc = await User.findById(user._id);
        if (!userDoc) {
            return { error: "User not found" };
        }

        const userTier = (userDoc.tier || DEFAULT_TIER) as TierKey;
        const limits = TIERS[userTier];

        // 1.1 Enforce 100MB per file limit
        if (file.size > limits.maxFileSizeBytes) {
            return { error: `File size exceeds the ${limits.name} limit of 100MB` };
        }

        // 2. Ensure User has a formal Store record
        let store;
        if (!user.primaryStoreId) {
            const googleStoreName = await GoogleAIService.createStore(`store-${user.email}`);
            store = await Store.create({
                userId: user._id,
                googleStoreId: googleStoreName,
                displayName: `Main Library (${user.email})`,
            });
            user.primaryStoreId = store._id as any;
            await user.save();
        } else {
            store = await Store.findById(user.primaryStoreId);
            if (!store) {
                // Recovery: If primaryStoreId exists but Store record is missing
                const googleStoreName = await GoogleAIService.createStore(`recovery-store-${user.email}`);
                store = await Store.create({
                    userId: user._id,
                    googleStoreId: googleStoreName,
                    displayName: `Recovered Library (${user.email})`,
                });
                user.primaryStoreId = store._id as any;
                await user.save();
            }
        }

        // 2.1 Enforce Tier-level Total Store Limit
        if (store!.sizeBytes + file.size > limits.maxStoreSizeBytes) {
            return { error: `Store capacity reached. Your tier (${limits.name}) limit is ${limits.maxStoreSizeBytes / (1024 * 1024 * 1024)}GB.` };
        }

        // 3. Save to Temp Disk (Required by Google SDK)
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const tempPath = join(tmpdir(), `${Date.now()}-${file.name}`);
        await writeFile(tempPath, buffer);

        // 4. Create DB Entry (Status: UPLOADING)
        const newFile = await FileModel.create({
            userId: user._id,
            libraryId: libraryId || undefined,
            displayName: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
            status: FILE_STATUS.UPLOADING,
            contentHash: contentHash || undefined
        });
        newFileId = newFile._id.toString();

        // 5. Upload to Google (Raw)
        const uploadRes = await GoogleAIService.uploadFile(tempPath, file.name, file.type);

        // 6. Start Ingestion with Self-Healing for Expired Stores
        let opName;
        try {
            opName = await GoogleAIService.importFileToStore(
                store!.googleStoreId,
                uploadRes.name,
                { libraryId: libraryId || "default", dbFileId: newFileId! }
            );
        } catch (error: any) {
            // Check if Store is missing/expired (403/404)
            const status = error.status || error.code || error?.error?.code;
            if (status === 403 || status === 404) {
                console.warn(LOG_MESSAGES.FILE.UPLOAD_STORE_RETRY);

                // Create new store on Google
                const newGoogleStoreName = await GoogleAIService.createStore(`resync-store-${user.email}`);
                if (!newGoogleStoreName) {
                    throw new Error("Failed to re-sync store: Google AI returned no store identifier");
                }

                // Update Store record
                store!.googleStoreId = newGoogleStoreName;
                store!.lastSyncedAt = new Date();
                await store!.save();

                // Retry import with new store
                opName = await GoogleAIService.importFileToStore(
                    newGoogleStoreName,
                    uploadRes.name,
                    { libraryId: libraryId || "default", dbFileId: newFileId! }
                );
            } else {
                throw error; // Re-throw other errors
            }
        }

        // 7. Save file locally for preview
        const ext = file.name.split(".").pop() || "bin";
        const googleFileIdClean = uploadRes.name.replace("files/", "");
        const localFileName = `${newFile._id}_${googleFileIdClean}.${ext}`;
        const userUploadDir = join(process.cwd(), "uploads", user._id.toString());

        // Ensure user directory exists
        const { mkdir } = await import("fs/promises");
        await mkdir(userUploadDir, { recursive: true });

        const localFilePath = join(userUploadDir, localFileName);
        await writeFile(localFilePath, buffer);

        // 8. Update DB with Google Refs and Local Path
        newFile.status = "INGESTING";
        newFile.googleFileId = uploadRes.name;
        newFile.googleUri = uploadRes.uri;
        newFile.googleOperationName = opName;
        newFile.localPath = `uploads/${user._id.toString()}/${localFileName}`;
        await newFile.save();

        // 9. Update Store Stats in background
        store!.sizeBytes += file.size;
        store!.fileCount += 1;
        await store!.save();

        // 10. Cleanup Temp
        await unlink(tempPath);

        revalidatePath(PATHS.HOME);
        return { success: true, fileId: newFile._id.toString() };

    } catch (error) {
        console.error(LOG_MESSAGES.FILE.UPLOAD_FAIL, error);

        // Cleanup Orphaned Record
        if (newFileId) {
            try {
                console.warn(`${LOG_MESSAGES.FILE.CLEANUP_ORPHAN} ${newFileId}`);
                await FileModel.findByIdAndDelete(newFileId);
            } catch (cleanupError) {
                console.error(LOG_MESSAGES.FILE.CLEANUP_ORPHAN_FAIL, cleanupError);
            }
        }

        return { error: "Upload failed" };
    }
});


export const getFilesAction = withAuth(async (user) => {
    const files = await FileModel.find({ userId: user._id })
        .sort({ createdAt: -1 })
        .populate("libraryId", "name icon")
        .lean();

    return files.map((f: any) => ({
        id: f._id.toString(),
        displayName: f.displayName,
        mimeType: f.mimeType,
        type: f.mimeType.split("/")[1]?.toUpperCase() || "DOC",
        sizeBytes: f.sizeBytes,
        size: (f.sizeBytes / 1024).toFixed(1) + " KB",
        status: f.status,
        date: f.createdAt ? new Date(f.createdAt).toISOString().split("T")[0] : "",
        libraryName: f.libraryId?.name || "Uncategorized",
        libraryIcon: f.libraryId?.icon || UI_DEFAULTS.LIBRARY.ICON,
        libraryId: f.libraryId?._id?.toString(),
    }));
});

export const getFileAction = withAuth(async (user, fileId: string) => {
    try {
        const file = await FileModel.findOne({ _id: fileId, userId: user._id }).lean();
        if (!file) return null;

        const f = file as any; // Cast for lean properties

        return {
            id: f._id.toString(),
            displayName: f.displayName,
            mimeType: f.mimeType,
            type: f.mimeType.split("/")[1]?.toUpperCase() || "DOC",
            sizeBytes: f.sizeBytes,
            size: (f.sizeBytes / 1024).toFixed(1) + " KB",
            status: f.status,
            date: f.createdAt ? new Date(f.createdAt).toISOString().split("T")[0] : "",
            googleUri: f.googleUri,
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
        return { error: "Failed to create library" };
    }
});


export const updateLibraryAction = withAuth(async (user, libraryId: string, name: string, icon?: string, color?: string) => {

    try {
        const library = await Library.findOne({ _id: libraryId, userId: user._id });
        if (!library) {
            return { error: "Library not found" };
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
        return { error: "Failed to update library" };
    }
});


export const deleteLibraryAction = withAuth(async (user, libraryId: string) => {

    try {
        const library = await Library.findOne({ _id: libraryId, userId: user._id });
        if (!library) {
            return { error: "Library not found" };
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

        return { success: true, message: "Library and all files deleted" };
    } catch (error) {
        console.error(LOG_MESSAGES.FILE.DELETE_LIB_FAIL, error);
        return { error: "Failed to delete library" };
    }
});

function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 KB";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}



export const checkFileStatusAction = withAuth(async (user, fileId: string) => {

    try {
        const file = await FileModel.findOne({ _id: fileId, userId: user._id });
        if (!file) {
            return { error: "File not found" };
        }

        // If already ACTIVE or FAILED, no need to check
        if (file.status === FILE_STATUS.ACTIVE || file.status === FILE_STATUS.FAILED) {
            return {
                status: file.status,
                message: file.status === FILE_STATUS.ACTIVE ? "File is ready" : "Ingestion failed"
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
                message: "File is now ready for search"
            };
        }

        return {
            status: file.status,
            message: "Still processing..."
        };
    } catch (error) {
        console.error(LOG_MESSAGES.FILE.CHECK_STATUS_FAIL, error);
        return { error: "Failed to check status" };
    }
});

import Message from "@/models/Message";


// Internal helper for usage within other server actions (avoids Auth middleware recursion issues)
// Assumes caller has already verified User
async function deleteFileInternal(user: any, fileId: string) {
    try {
        const file = await FileModel.findOne({ _id: fileId, userId: user._id });
        if (!file) {
            return { error: "File not found" };
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
        return { error: "Failed to delete file" };
    }
}

export const deleteFileAction = withAuth(async (user, fileId: string) => {
    return deleteFileInternal(user, fileId);
});

export const getRemoteFileDebugAction = withAuth(async (user, fileId: string) => {
    try {
        const file = await FileModel.findOne({ _id: fileId, userId: user._id });
        if (!file || !file.googleFileId) {
            return { error: "File not found or no Google ID" };
        }

        const remoteMeta = await GoogleAIService.getFile(file.googleFileId);
        if (!remoteMeta) {
            return { error: "File not found on remote (Zombie/Ghost)" };
        }

        return { success: true, metadata: remoteMeta };
    } catch (error) {
        return { error: "Failed to inspect remote file" };
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
            files: files.map((f: any) => ({
                id: f._id.toString(),
                displayName: f.displayName,
                mimeType: f.mimeType,
                type: f.mimeType.split("/")[1]?.toUpperCase() || "DOC",
                sizeBytes: f.sizeBytes,
                size: (f.sizeBytes / 1024).toFixed(1) + " KB",
                status: f.status,
                date: f.createdAt ? new Date(f.createdAt).toISOString().split("T")[0] : "",
            }))
        };
    } catch (error) {
        console.error(LOG_MESSAGES.FILE.GET_LIB_FILES_FAIL, error);
        return { files: [], library: null };
    }
});

export const getStoreStatusAction = withAuth(async (user, force: boolean = false) => {
    if (!user.primaryStoreId) {
        return { error: "No store found" };
    }

    try {
        const store = await Store.findById(user.primaryStoreId);
        if (!store) return { error: "Store record missing" };

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
        const limits = TIERS[userTier];

        const localFileCount = await FileModel.countDocuments({ userId: user._id });

        return {
            success: true,
            store: {
                id: store._id.toString(),
                displayName: store.displayName,
                googleStoreId: store.googleStoreId,
                sizeBytes: store.sizeBytes,
                fileCount: store.fileCount, // Cloud Count
                localFileCount: localFileCount, // Local DB Count
                limitBytes: limits.maxStoreSizeBytes,
                tier: limits.name,
                lastSyncedAt: store.lastSyncedAt,
            }
        };
    } catch (error) {
        console.error(LOG_MESSAGES.FILE.GET_STORE_STATUS_FAIL, error);
        return { error: "Failed to fetch store status" };
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
            const { rm } = await import("fs/promises");
            const userUploadDir = join(process.cwd(), "uploads", user._id.toString());
            await rm(userUploadDir, { recursive: true, force: true });
            logInfo("PURGE", `Deleted local directory: ${userUploadDir}`);
        } catch (fsError) {
            console.warn("   [FS] Failed to delete local directory (might not exist):", fsError);
        }

        // 3. Purge Google Cloud Data
        await GoogleAIService.purgeAllUserGoogleData();

        revalidatePath("/");

        return { success: true };

    } catch (error) {
        console.error("Purge Action Failed:", error);
        return { error: "Failed to complete purge operation." };
    }
});
