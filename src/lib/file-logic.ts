import { TierConfig } from "@/config/limits";
import { UI_DEFAULTS } from "@/config/constants";
import { join } from "path";

/**
 * Validates if the file size is within the user's tier limits.
 */
export function validateFileSize(fileSize: number, limits: TierConfig): { valid: boolean; error?: string } {
    if (fileSize > limits.maxFileSizeBytes) {
        return {
            valid: false,
            error: `File size exceeds the ${limits.name} limit of 100MB`
        };
    }
    return { valid: true };
}

/**
 * Validates if the store has enough capacity for the new file.
 */
export function validateStoreCapacity(
    currentStoreSize: number,
    newFileSize: number,
    limits: TierConfig
): { valid: boolean; error?: string } {
    if (currentStoreSize + newFileSize > limits.maxStoreSizeBytes) {
        const limitGB = limits.maxStoreSizeBytes / (1024 * 1024 * 1024);
        return {
            valid: false,
            error: `Store capacity reached. Your tier (${limits.name}) limit is ${limitGB}GB.`
        };
    }
    return { valid: true };
}

/**
 * Pure function to map a DB file document to a UI-friendly object.
 */
export function mapFileToUi(f: any) {
    return {
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
        libraryId: f.libraryId?._id?.toString() || f.libraryId?.toString(),
    };
}

/**
 * Pure function to construct the local storage path for an uploaded file.
 */
export function generateLocalFilePath(
    processCwd: string,
    userId: string,
    fileId: string,
    googleFileId: string,
    originalName: string
): { relativePath: string; absolutePath: string } {
    const ext = originalName.split(".").pop() || "bin";
    const googleFileIdClean = googleFileId.replace("files/", "");
    const localFileName = `${fileId}_${googleFileIdClean}.${ext}`;
    const relativePath = `uploads/${userId}/${localFileName}`;
    const absolutePath = join(processCwd, relativePath);

    return { relativePath, absolutePath };
}
