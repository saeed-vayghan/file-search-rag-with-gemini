/**
 * PRICING CONFIGURATION (Feb 2026)
 * Centralized rates for Google Gemini models and surcharges.
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
export const TIER_2_THRESHOLD = 200_000;
