import { TierConfig, TIERS } from "@/config/limits";
import { UI_DEFAULTS } from "@/config/constants";
import { formatBytes } from "../utils";
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
        size: formatBytes(f.sizeBytes),
        status: f.status,
        date: f.createdAt ? new Date(f.createdAt).toISOString().split("T")[0] : "",
        libraryName: f.libraryId?.name || "Uncategorized",
        libraryIcon: f.libraryId?.icon || UI_DEFAULTS.LIBRARY.ICON,
        libraryId: f.libraryId?._id?.toString() || f.libraryId?.toString(),
    };
}

/**
 * Pure function to map DB store and user data to a unified status object.
 */
export function mapStoreStatsToUi(store: any, localFileCount: number, userTier: string) {
    const limits = TIERS[userTier as keyof typeof TIERS] || TIERS.TIER_1;

    return {
        id: store._id.toString(),
        displayName: store.displayName,
        googleStoreId: store.googleStoreId,
        sizeBytes: store.sizeBytes,
        fileCount: store.fileCount, // Cloud Count (synced)
        localFileCount: localFileCount, // Local DB Count
        limitBytes: limits.maxStoreSizeBytes,
        tier: limits.name,
        lastSyncedAt: store.lastSyncedAt,
    };
}

/**
 * Pure logic to find a matching document name in a list by Google File ID.
 */
export function findMatchingDocument(docs: any[], googleFileId: string): string | null {
    const cleanId = googleFileId.replace("files/", "");
    const match = docs.find(doc => doc.displayName === cleanId || doc.name?.includes(cleanId));
    return match ? match.name : null;
}

/**
 * Semantic Google AI Error Classifiers.
 */
export const GOOGLE_ERROR_TYPES = {
    STORE_EXPIRED: "STORE_EXPIRED",
    STORE_NOT_FOUND: "STORE_NOT_FOUND",
    QUOTA_EXCEEDED: "QUOTA_EXCEEDED",
    UNKNOWN: "UNKNOWN"
} as const;

export function classifyGoogleError(error: any): keyof typeof GOOGLE_ERROR_TYPES {
    const status = error.status || error.code || error?.error?.code;
    const message = error.message?.toLowerCase() || "";

    if (status === 403) return GOOGLE_ERROR_TYPES.STORE_EXPIRED;
    if (status === 404) return GOOGLE_ERROR_TYPES.STORE_NOT_FOUND;
    if (message.includes("quota") || status === 429) return GOOGLE_ERROR_TYPES.QUOTA_EXCEEDED;

    return GOOGLE_ERROR_TYPES.UNKNOWN;
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
