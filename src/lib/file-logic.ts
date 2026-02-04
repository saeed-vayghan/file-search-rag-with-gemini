import { TierConfig } from "@/config/limits";

/**
 * Validates if the file size is within the user's tier limits.
 * Pure function: (size, limits) -> ValidationResult
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
 * Pure function: (currentSize, newSize, limits) -> ValidationResult
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
