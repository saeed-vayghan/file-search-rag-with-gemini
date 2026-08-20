/**
 * 🤖 AGENT INSTRUCTIONS FOR UPDATING GEMINI MODELS 🤖
 * 
 * When asked to "update Gemini models", future AI agents MUST follow these steps carefully:
 * 1. Verify Active Models: NEVER guess or hallucinate model names. Always fetch the live list 
 *    of models from the Google GenAI API (`getAIClient().models.list()`) or check the official 
 *    Google Cloud Vertex AI/Gemini pricing pages.
 * 2. Preview vs Stable: If a flagship model (e.g., `gemini-3.1-pro`) returns a 404 NOT_FOUND, 
 *    it might only be available under a preview string (e.g., `gemini-3.1-pro-preview`). Check 
 *    the API response exactly.
 * 3. Update Pricing: When updating this file, you MUST also update `src/config/pricing.ts` 
 *    to reflect the new model strings and their official input/output costs.
 * 4. Update Fallbacks: Check `src/lib/cost-calculator.ts` and `src/actions/chat-actions.ts` 
 *    to ensure fallback models (like `gemini-2.5-pro` or `gemini-3.5-flash`) are still valid.
 * 5. Test: Ensure no `404 NOT_FOUND` errors occur when a user performs a chat request.
 */

export const queryModels = [
    {
        "model": "gemini-3.7-flash",
        "query_hint": "The latest flagship Flash model; optimized for speed, multimodal tasks, and coding with high-performance agentic RAG capabilities."
    },
    {
        "model": "gemini-3.1-pro-preview",
        "query_hint": "Use for 'Deep Thinking' tasks; best at connecting obscure dots across multiple retrieved chunks and handling highly complex reasoning."
    },
    {
        "model": "gemini-3.5-flash-lite",
        "query_hint": "Maximum cost savings; perfect for high-volume, simple retrieval tasks where speed and price are the priority."
    },
    {
        "model": "gemini-2.5-pro",
        "query_hint": "A reliable workhorse for stable production environments that need a large context window and proven reasoning."
    }
]