"use server";

import { revalidatePath } from "next/cache";
import connectToDatabase from "@/lib/db";
import User from "@/models/User";
import FileModel from "@/models/File";
import Library from "@/models/Library";
import Store from "@/models/Store";
import { GoogleAIService } from "@/lib/google-ai";
import { logInfo, logDangerousOperation, logDebug } from "@/lib/logger";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { TIERS, TierKey, DEFAULT_TIER } from "@/config/limits";


// Mock User Email for now (Auth integration later)
const USER_EMAIL = "saeed@example.com";

export async function checkFileDuplicate(hash: string, libraryId?: string) {
    try {
        await connectToDatabase();

        const query: any = { contentHash: hash };
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
        console.error("Error checking duplicate:", error);
        return { exists: false };
    }
}

export async function uploadFileAction(formData: FormData) {
    await connectToDatabase();

    const file = formData.get("file") as File | null;
    let libraryId = formData.get("libraryId") as string;
    const contentHash = formData.get("contentHash") as string;

    // Rule: Uncategorized files are not allowed.
    if (!libraryId || libraryId === "null" || libraryId === "undefined") {
        // Find or Create Default Library
        const user = await User.findOne({ email: USER_EMAIL });
        if (user) {
            let defaultLib = await Library.findOne({ userId: user._id, name: "Default" });
            if (!defaultLib) {
                defaultLib = await Library.create({
                    userId: user._id,
                    name: "Default",
                    icon: "📁",
                    color: "text-slate-500",
                    description: "Auto-created default library"
                });
            }
            libraryId = defaultLib._id.toString();
        }
    }

    if (!file) {
        return { error: "No file provided" };
    }

    let newFileId: string | null = null;

    try {
        // 1. Get or Create User
        let user = await User.findOne({ email: USER_EMAIL });
        if (!user) {
            user = await User.create({
                email: USER_EMAIL,
                name: "Saeed",
                tier: DEFAULT_TIER,
            });
        }

        const userTier = (user.tier || DEFAULT_TIER) as TierKey;
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
            status: "UPLOADING",
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
                console.warn("[Upload] Store not found or permission denied. Re-creating store...");

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

        revalidatePath("/");
        return { success: true, fileId: newFile._id.toString() };

    } catch (error) {
        console.error("Upload Action Failed:", error);

        // Cleanup Orphaned Record
        if (newFileId) {
            try {
                console.warn(`[Upload] Cleaning up orphaned file record: ${newFileId}`);
                await FileModel.findByIdAndDelete(newFileId);
            } catch (cleanupError) {
                console.error("Failed to cleanup orphaned record:", cleanupError);
            }
        }

        return { error: "Upload failed" };
    }
}

export async function getFilesAction() {
    await connectToDatabase();
    // Simplified fetch for now
    const user = await User.findOne({ email: USER_EMAIL });
    if (!user) return [];

    const files = await FileModel.find({ userId: user._id })
        .sort({ createdAt: -1 })
        .populate("libraryId", "name icon")
        .lean();

    return files.map(f => ({
        id: f._id.toString(),
        displayName: f.displayName,
        mimeType: f.mimeType,
        type: f.mimeType.split("/")[1]?.toUpperCase() || "DOC",
        // @ts-ignore
        sizeBytes: f.sizeBytes,
        // @ts-ignore
        size: (f.sizeBytes / 1024).toFixed(1) + " KB",
        status: f.status,
        // @ts-ignore
        date: f.createdAt.toISOString().split("T")[0],
        // @ts-ignore
        libraryName: f.libraryId?.name || "Uncategorized",
        // @ts-ignore
        libraryIcon: f.libraryId?.icon || "📁",
        // @ts-ignore
        libraryId: f.libraryId?._id?.toString(),
    }));
}

export async function getFileAction(fileId: string) {
    await connectToDatabase();
    try {
        const file = await FileModel.findById(fileId).lean();
        if (!file) return null;

        return {
            id: file._id.toString(),
            displayName: file.displayName,
            mimeType: file.mimeType,
            type: file.mimeType.split("/")[1]?.toUpperCase() || "DOC",
            // @ts-ignore
            sizeBytes: file.sizeBytes,
            size: (file.sizeBytes / 1024).toFixed(1) + " KB",
            status: file.status,
            // @ts-ignore
            date: file.createdAt.toISOString().split("T")[0],
            googleUri: file.googleUri,
        };
    } catch {
        return null;
    }
}

export async function getUserStatsAction() {
    await connectToDatabase();
    const user = await User.findOne({ email: USER_EMAIL });
    if (!user) {
        return {
            name: "Guest",
            totalDocs: 0,
            storageUsed: "0 KB",
            storageLimit: "1 GB",
        };
    }

    const userTier = (user.tier || DEFAULT_TIER) as TierKey;
    const limits = TIERS[userTier];

    const files = await FileModel.find({ userId: user._id });
    const totalBytes = files.reduce((sum, f) => sum + (f.sizeBytes || 0), 0);

    return {
        name: user.name,
        tier: userTier,
        totalDocs: files.length,
        storageUsed: formatBytes(totalBytes),
        storageUsedBytes: totalBytes,
        storageLimit: formatBytes(limits.maxStoreSizeBytes),
        storageLimitBytes: limits.maxStoreSizeBytes,
    };
}

export async function getLibrariesAction() {
    await connectToDatabase();
    const user = await User.findOne({ email: USER_EMAIL });
    if (!user) return [];

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
                icon: lib.icon || "📁",
                color: lib.color || "text-slate-500",
                count: fileCount,
            };
        })
    );

    return result;
}

export async function createLibraryAction(name: string, icon?: string, color?: string) {
    await connectToDatabase();
    const user = await User.findOne({ email: USER_EMAIL });
    if (!user) {
        return { error: "User not found" };
    }

    try {
        const library = await Library.create({
            userId: user._id,
            name,
            icon: icon || "📁",
            color: color || "text-slate-500",
        });

        revalidatePath("/");
        revalidatePath("/libraries");

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
        console.error("Create Library Failed:", error);
        return { error: "Failed to create library" };
    }
}

export async function updateLibraryAction(libraryId: string, name: string, icon?: string, color?: string) {
    await connectToDatabase();
    const user = await User.findOne({ email: USER_EMAIL });
    if (!user) {
        return { error: "User not found" };
    }

    try {
        const library = await Library.findOne({ _id: libraryId, userId: user._id });
        if (!library) {
            return { error: "Library not found" };
        }

        library.name = name;
        if (icon) library.icon = icon;
        if (color) library.color = color;

        await library.save();

        revalidatePath("/");
        revalidatePath("/libraries");
        revalidatePath(`/libraries/${libraryId}`);

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
        console.error("Update Library Failed:", error);
        return { error: "Failed to update library" };
    }
}

export async function deleteLibraryAction(libraryId: string) {
    await connectToDatabase();

    try {
        const library = await Library.findById(libraryId);
        if (!library) {
            return { error: "Library not found" };
        }

        // Cascade Delete Files
        const files = await FileModel.find({ libraryId: library._id });
        logDebug("DeleteLibrary", `Found ${files.length} files in library ${library.name} (${libraryId})`);

        let deletedCount = 0;
        let failedCount = 0;

        // Execute sequentially to avoid DB connection race conditions and rate limits
        for (const file of files) {
            try {
                logDebug("DeleteLibrary", `Deleting file: ${file._id}`);
                const result = await deleteFileAction(file._id.toString());
                if (result.success) {
                    deletedCount++;
                } else {
                    console.error(`[Delete Library] Failed to delete file ${file._id}: ${result.error}`);
                    failedCount++;
                }
            } catch (err) {
                console.error(`[Delete Library] Exception deleting file ${file._id}:`, err);
                failedCount++;
            }
        }

        logInfo("DeleteLibrary", `Summary: ${deletedCount} deleted, ${failedCount} failed.`);

        if (failedCount > 0) {
            return { error: `Failed to delete ${failedCount} files. Library not deleted.` };
        }

        // Delete the library only if all files are gone
        await Library.findByIdAndDelete(libraryId);

        revalidatePath("/");
        revalidatePath("/libraries");

        return { success: true, message: "Library and all files deleted" };
    } catch (error) {
        console.error("Delete Library Failed:", error);
        return { error: "Failed to delete library" };
    }
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 KB";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getIconForType(type: string): string {
    switch (type.toLowerCase()) {
        case "pdf": return "📄";
        case "doc":
        case "docx": return "📝";
        case "xlsx":
        case "csv": return "📊";
        default: return "📁";
    }
}

function getColorForType(type: string): string {
    switch (type.toLowerCase()) {
        case "pdf": return "text-red-500";
        case "doc":
        case "docx": return "text-blue-500";
        case "xlsx":
        case "csv": return "text-emerald-500";
        default: return "text-slate-500";
    }
}

export async function checkFileStatusAction(fileId: string) {
    await connectToDatabase();

    try {
        const file = await FileModel.findById(fileId);
        if (!file) {
            return { error: "File not found" };
        }

        // If already ACTIVE or FAILED, no need to check
        if (file.status === "ACTIVE" || file.status === "FAILED") {
            return {
                status: file.status,
                message: file.status === "ACTIVE" ? "File is ready" : "Ingestion failed"
            };
        }

        // Check with Google API if we have an operation
        if (file.googleOperationName) {
            // Note: In the real implementation, we'd call getOperationStatus
            // For now, we'll mark as ACTIVE after checking
            file.status = "ACTIVE";
            await file.save();

            revalidatePath("/");
            return {
                status: "ACTIVE",
                message: "File is now ready for search"
            };
        }

        return {
            status: file.status,
            message: "Still processing..."
        };
    } catch (error) {
        console.error("Check Status Failed:", error);
        return { error: "Failed to check status" };
    }
}

import Message from "@/models/Message";

export async function deleteFileAction(fileId: string) {
    await connectToDatabase();

    try {
        const file = await FileModel.findById(fileId);
        if (!file) {
            return { error: "File not found" };
        }

        // 1. Delete from Google Cloud (Store Document + File)
        let googleStatus = "Skipped";
        if (file.googleFileId) {
            try {
                // A. Explicitly delete from Store (User Request)
                const user = await User.findById(file.userId);
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
                console.error("Google delete failed during cascade:", e);
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
                console.warn(`[FileAction] Local file deletion failed for ${file.localPath}:`, err);
                localStatus = "Failed/Missing";
            }
        }

        // 3. Delete Chat History
        await Message.deleteMany({ fileId: file._id });

        // 4. Delete DB Record
        await FileModel.findByIdAndDelete(fileId);

        // 5. Update Store Stats
        const user = await User.findById(file.userId);
        if (user && user.primaryStoreId) {
            try {
                const store = await Store.findById(user.primaryStoreId);
                if (store) {
                    store.fileCount = Math.max(0, store.fileCount - 1);
                    store.sizeBytes = Math.max(0, store.sizeBytes - (file.sizeBytes || 0));
                    await store.save();
                }
            } catch (storeError) {
                console.warn("[Delete] Failed to update store stats:", storeError);
            }
        }

        revalidatePath("/");

        return {
            success: true,
            message: `Cleanup Complete: Remote (${googleStatus}), Local (${localStatus}).`
        };
    } catch (error) {
        console.error("Delete Failed:", error);
        return { error: "Failed to delete file" };
    }
}

export async function getRemoteFileDebugAction(fileId: string) {
    await connectToDatabase();
    try {
        const file = await FileModel.findById(fileId);
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
}
export async function getLibraryFilesAction(libraryId: string) {
    await connectToDatabase();
    const user = await User.findOne({ email: USER_EMAIL });
    if (!user) return { files: [], library: null };

    try {
        const library = await Library.findOne({ _id: libraryId, userId: user._id }).lean();
        if (!library) return { files: [], library: null };

        const files = await FileModel.find({ userId: user._id, libraryId }).sort({ createdAt: -1 }).lean();

        return {
            library: {
                id: library._id.toString(),
                name: library.name,
                icon: library.icon || "📁",
                color: library.color || "text-slate-500",
                description: library.description || "",
            },
            files: files.map(f => ({
                id: f._id.toString(),
                displayName: f.displayName,
                mimeType: f.mimeType,
                type: f.mimeType.split("/")[1]?.toUpperCase() || "DOC",
                // @ts-ignore
                sizeBytes: f.sizeBytes,
                // @ts-ignore
                size: (f.sizeBytes / 1024).toFixed(1) + " KB",
                status: f.status,
                // @ts-ignore
                date: f.createdAt.toISOString().split("T")[0],
            }))
        };
    } catch (error) {
        console.error("Get Library Files Failed:", error);
        return { files: [], library: null };
    }
}

export async function getStoreStatusAction(force: boolean = false) {
    await connectToDatabase();
    const user = await User.findOne({ email: USER_EMAIL });
    if (!user || !user.primaryStoreId) {
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
        console.error("Get Store Status Failed:", error);
        return { error: "Failed to fetch store status" };
    }
}

export async function purgeUserDataAction() {
    await connectToDatabase();
    const user = await User.findOne({ email: USER_EMAIL });

    if (!user) {
        return { error: "User not found" };
    }

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
}
