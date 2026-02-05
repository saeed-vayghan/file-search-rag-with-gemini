"use server";

import { revalidatePath } from "next/cache";
import User from "@/models/User";
import FileModel from "@/models/File";
import Library from "@/models/Library";
import Store from "@/models/Store";
import * as GoogleAIService from "@/lib/google";
import { logInfo, logDangerousOperation } from "@/lib/logger";
import { withAuth } from "@/lib/auth";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { rm } from "fs/promises";
import { TIERS, TierKey, DEFAULT_TIER } from "@/config/limits";
import { FILE_STATUS, UI_DEFAULTS, PATHS, LOG_MESSAGES, MESSAGES } from "@/config/constants";
import { validateFileSize, validateStoreCapacity, mapFileToUi, generateLocalFilePath, mapStoreStatsToUi } from "@/lib/file";
import Message from "@/models/Message";
import { RATE_LIMIT_CONFIG } from "@/config/ratelimit";
import { formatBytes } from "@/lib/utils";
import { ensureUserStore, resolveLibraryId, importFileWithRetry, deleteFileInternal } from "./utils";
import UsageLog from "@/models/UsageLog";


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
        const store = await ensureUserStore(user);

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
        const operation = await importFileWithRetry(
            store,
            uploadRes.name,
            uploadRes.uri,
            file.type,
            { libraryId, dbFileId: newFileId! },
            user,
            file.name,
            file.size
        );

        // 7.5. Non-blocking Grace Period (requested: just wait for 2 seconds and let it go)
        await new Promise(resolve => setTimeout(resolve, 2000));

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
        newFile.googleOperationName = operation?.name;
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


export const getFilesAction = withAuth(async (user, libraryId?: string): Promise<{ files: any[]; library?: any; error?: string }> => {
    try {
        const query: any = { userId: user._id };
        if (libraryId) {
            query.libraryId = libraryId;
        }

        const files = await FileModel.find(query)
            .sort({ createdAt: -1 })
            .populate("libraryId", "name icon color description")
            .lean();

        let libraryData = null;
        if (libraryId) {
            const library = await Library.findOne({ _id: libraryId, userId: user._id }).lean();
            if (library) {
                libraryData = {
                    id: library._id.toString(),
                    name: library.name,
                    icon: library.icon || UI_DEFAULTS.LIBRARY.ICON,
                    color: library.color || UI_DEFAULTS.LIBRARY.COLOR,
                    description: library.description || "",
                };
            }
        }

        return {
            files: files.map(_f => ({
                ...mapFileToUi(_f as any),
                indexingCost: (_f as any).indexingCost
            })),
            library: libraryData || undefined
        };
    } catch (error) {
        console.error(LOG_MESSAGES.FILE.GET_FILES_FAIL, error);
        return { files: [], error: MESSAGES.ERRORS.GENERIC_ERROR };
    }
});


export const getFileAction = withAuth(async (user, fileId: string) => {
    try {
        const file = await FileModel.findOne({ _id: fileId, userId: user._id }).lean();
        if (!file) return null;

        return {
            ...mapFileToUi(file),
            googleUri: (file as any).googleUri, // Additional property for single file view if needed
        };
    } catch (error) {
        console.error(LOG_MESSAGES.FILE.GET_FILES_FAIL, error);
        return null;
    }
});


export const getUserStatsAction = withAuth(async (user) => {
    try {
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
    } catch (error) {
        console.error(LOG_MESSAGES.USER.FETCH_SETTINGS_FAIL, error);
        return {
            name: user.name || "User",
            totalDocs: 0,
            storageUsed: "0 KB",
            storageLimit: "1 GB",
        };
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

        if (file.googleFileId) {
            const remoteFile = await GoogleAIService.getFile(file.googleFileId);

            if (remoteFile) {
                if (remoteFile.state === "ACTIVE") {
                    file.status = FILE_STATUS.ACTIVE;
                    await file.save();
                    revalidatePath(PATHS.HOME);
                    return { status: FILE_STATUS.ACTIVE, message: MESSAGES.SUCCESS.FILE_READY };

                } else if (remoteFile.state === "FAILED") {
                    file.status = FILE_STATUS.FAILED;
                    await file.save();
                    revalidatePath(PATHS.HOME);
                    return { status: FILE_STATUS.FAILED, message: MESSAGES.ERRORS.INGESTION_FAILED };
                }
            }
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

        return {
            success: true,
            metadata: {
                ...remoteMeta,
                indexingCost: file.indexingCost,
                indexingTokens: file.indexingTokens
            }
        };
    } catch (error) {
        console.error(LOG_MESSAGES.GOOGLE.INSPECT_FAIL, error);
        return { error: MESSAGES.ERRORS.INSPECT_REMOTE_FAILED };
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

        // Calculate total indexing cost of active files
        const files = await FileModel.find({ userId: user._id }).select("indexingCost");
        const totalIndexingCost = files.reduce((sum, f) => sum + (f.indexingCost || 0), 0);

        return {
            success: true,
            store: mapStoreStatsToUi(store, localFileCount, userTier, totalIndexingCost)
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
        await UsageLog.deleteMany({}); // Purge all usage logs

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
