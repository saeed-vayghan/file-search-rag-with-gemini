
export const indexingModels = [
    {
        "model": "gemini-3-pro-preview",
        "indexing_hint": "Best for high-stakes enterprise libraries where you need the most sophisticated indexing metadata and future-proof compatibility with agentic reasoning."
    },
    {
        "model": "gemini-3-flash-preview",
        "indexing_hint": "The optimal balance for modern RAG; provides 'Pro-grade' extraction for complex documents (handwriting/OCR) at a much faster processing speed."
    },
    {
        "model": "gemini-2.5-pro",
        "indexing_hint": "Choose this if your existing pipeline is built on the 2.5 architecture and requires high-fidelity parsing of massive, multi-modal legacy datasets."
    },
    {
        "model": "gemini-2.5-flash-lite",
        "indexing_hint": "Most cost-efficient entry point for indexing simple text-heavy libraries (markdown, txt) where document structure is straightforward."
    }
]



export const queryModels = [
    {
        "model": "gemini-3-pro-preview",
        "query_hint": "Use for 'Deep Thinking' tasks; best at connecting obscure dots across multiple retrieved chunks and handling highly complex, multi-step user questions."
    },
    {
        "model": "gemini-3-flash-preview",
        "query_hint": "The 'Goldilocks' query model; offers a 15% accuracy boost over 2.5 Flash while maintaining the low latency needed for real-time chat bots."
    },
    {
        "model": "gemini-2.5-pro",
        "query_hint": "A reliable workhorse for stable production environments that need a large context window and proven reasoning without the 'preview' experimental status."
    },
    {
        "model": "gemini-2.5-flash-lite",
        "query_hint": "Maximum cost savings; perfect for high-volume, simple retrieval tasks like FAQ bots or keyword-heavy technical support where speed and price are the priority."
    }
]