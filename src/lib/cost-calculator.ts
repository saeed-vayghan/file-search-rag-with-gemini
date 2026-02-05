import { PRICING_RATES, SURCHARGES, TIER_2_THRESHOLD } from "@/config/pricing";

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
