
/**
 * Unified logic for calculating Google Gemini API costs.
 * Aligned with 'API_COST_MONITORING.md' (Feb 2026).
 */

export const PRICING_RATES: Record<string, { in: number; inT2: number; out: number; outT2?: number }> = {
    // Gemini 3 Pro (Preview)
    "gemini-3-pro-preview": { in: 2.00, inT2: 4.00, out: 12.00, outT2: 18.00 },

    // Gemini 3 Flash (Preview)
    "gemini-3-flash-preview": { in: 0.50, inT2: 0.50, out: 3.00, outT2: 3.00 },

    // Gemini 2.5 Pro
    "gemini-2.5-pro": { in: 1.25, inT2: 2.50, out: 10.00, outT2: 15.00 },

    // Gemini 2.5 Flash-Lite
    "gemini-2.5-flash-lite": { in: 0.10, inT2: 0.10, out: 0.40, outT2: 0.40 },

    // Fallback/Legacy (Gemini 1.5 Flash)
    "gemini-1.5-flash": { in: 0.075, inT2: 0.075, out: 0.30 },
};

export const SURCHARGES = {
    GOOGLE_SEARCH_PER_1K: 14.00,
    INDEXING_PER_1M: 0.15,
};

// Threshold for Tier 2 pricing (tokens)
const TIER_2_THRESHOLD = 200_000;

export interface CostBreakdown {
    total: number;
    details: {
        tokenCost: number;
        searchCost: number;
        isTier2: boolean;
    };
}

/**
 * Calculates the cost of a generative chat turn (Input + Output + Tools).
 */
export function calculateChatCost(
    modelId: string,
    inputTokens: number,
    outputTokens: number,
    searchCount: number = 0
): CostBreakdown {
    // Default to Gemini 3 Flash if model unknown
    const rates = PRICING_RATES[modelId] || PRICING_RATES["gemini-3-flash-preview"];

    // 1. Determine Input Cost (Tiered)
    const isTier2 = inputTokens > TIER_2_THRESHOLD;
    const activeInputRate = isTier2 ? rates.inT2 : rates.in;
    const inputCost = (inputTokens / 1_000_000) * activeInputRate;

    // 2. Determine Output Cost (Tiered if verified, usually flat for some models but spec says tiered)
    const activeOutputRate = (isTier2 && rates.outT2) ? rates.outT2 : rates.out;
    const outputCost = (outputTokens / 1_000_000) * activeOutputRate;

    const tokenCost = inputCost + outputCost;

    // 3. Search Surcharge
    const searchCost = (searchCount / 1_000) * SURCHARGES.GOOGLE_SEARCH_PER_1K;

    return {
        total: parseFloat((tokenCost + searchCost).toFixed(9)), // High precision for small micro-charges
        details: {
            tokenCost: parseFloat(tokenCost.toFixed(9)),
            searchCost: parseFloat(searchCost.toFixed(9)),
            isTier2
        }
    };
}

/**
 * Calculates the cost of File Indexing (Embedding).
 */
export function calculateIndexingCost(totalTokens: number): number {
    return parseFloat(((totalTokens / 1_000_000) * SURCHARGES.INDEXING_PER_1M).toFixed(9));
}
