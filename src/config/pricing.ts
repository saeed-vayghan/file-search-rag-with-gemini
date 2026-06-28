/**
 * 🤖 AGENT INSTRUCTIONS FOR UPDATING PRICING 🤖
 * 
 * When asked to "update pricing", future AI agents MUST follow these steps carefully:
 * 1. Verify Active Rates: NEVER guess or hallucinate pricing data. Always fetch the 
 *    live pricing from official Google AI Studio (ai.google.dev) or Google Cloud 
 *    Vertex AI pricing documentation.
 * 2. Multi-tier Context Limits: Pay attention to Tier 2 (T2) scaling for models 
 *    with large context windows. Often input costs double and output costs scale by 
 *    1.5x after a certain token threshold (e.g., 128k or 200k tokens).
 * 3. Keep Synced: When adding a new model to this list, ensure it matches the exact 
 *    model string defined in `src/config/gemini-models.ts`.
 * 4. Surcharges: Check if Google Search Grounding or Indexing API surcharges have 
 *    changed and update `SURCHARGES` below accordingly.
 */

/**
 * PRICING CONFIGURATION (Feb 2026)
 * Centralized rates for Google Gemini models and surcharges.
 */

export const PRICING_RATES: Record<string, { in: number; inT2: number; out: number; outT2?: number }> = {
    // Gemini 3.5 Flash
    "gemini-3.5-flash": { in: 1.50, inT2: 1.50, out: 9.00, outT2: 9.00 },

    // Gemini 3.1 Pro
    "gemini-3.1-pro-preview": { in: 2.00, inT2: 4.00, out: 12.00, outT2: 18.00 },

    // Gemini 3.1 Flash-Lite
    "gemini-3.1-flash-lite": { in: 0.10, inT2: 0.10, out: 0.40, outT2: 0.40 },

    // Gemini 2.5 Pro
    "gemini-2.5-pro": { in: 1.25, inT2: 2.50, out: 10.00, outT2: 15.00 },

    // Fallback/Legacy (Gemini 1.5 Flash)
    "gemini-1.5-flash": { in: 0.075, inT2: 0.075, out: 0.30 },
};

export const SURCHARGES = {
    GOOGLE_SEARCH_PER_1K: 14.00,
    INDEXING_PER_1M: 0.15,
};

// Threshold for Tier 2 pricing (tokens)
export const TIER_2_THRESHOLD = 200_000;
