export type TierKey = "FREE" | "TIER_1" | "TIER_2" | "TIER_3";

export interface TierConfig {
    name: string;
    maxStoreSizeBytes: number;
    maxFileSizeBytes: number;
    label: string;
    description: string;
}

export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB

export const TIERS: Record<TierKey, TierConfig> = {
    FREE: {
        name: "Free",
        label: "Free",
        maxStoreSizeBytes: 1 * 1024 * 1024 * 1024, // 1 GB
        maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
        description: "For personal exploration",
    },
    TIER_1: {
        name: "Tier 1",
        label: "Professional",
        maxStoreSizeBytes: 10 * 1024 * 1024 * 1024, // 10 GB
        maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
        description: "Small teams and power users",
    },
    TIER_2: {
        name: "Tier 2",
        label: "Business",
        maxStoreSizeBytes: 100 * 1024 * 1024 * 1024, // 100 GB
        maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
        description: "Scaling fast-growing companies",
    },
    TIER_3: {
        name: "Tier 3",
        label: "Enterprise",
        maxStoreSizeBytes: 1000 * 1024 * 1024 * 1024, // 1 TB
        maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
        description: "Unlimited potential for large-scale operations",
    },
};

export const DEFAULT_TIER: TierKey = "TIER_1"; // User is on Tier 1
export const FILE_SEARCH_OPTIMAL_LIMIT = 20 * 1024 * 1024 * 1024; // 20 GB recommended limit
