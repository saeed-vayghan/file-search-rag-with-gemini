# 💰 API Cost Monitoring & Token Optimization

**Status**: Draft / Planned
**Purpose**: Define how the system monitors, estimates, and optimizes Google AI API costs.

---

## 1. Pricing Pillars (Gemini API)

Our system primarily uses `gemini-3-flash-preview` (which supports the File Search tool/RAG). Based on Google's pricing model for Embeddings and Generation:

| Operation | Cost Category | Price (approx) | Notes |
| :--- | :--- | :--- | :--- |
| **File Indexing** | Input Tokens (Embeddings) | $0.15 / 1M tokens | Charged once per file ingestion. |
| **File Storage** | Storage | **Free** | Vector store storage is currently not charged. |
| **Query Embedding** | Input Tokens | **Free** | Query-time embedding for search is usually free. |
| **RAG Retrieval** | Context Tokens | Standard Flash Rates | Retrieved chunks count as context input tokens. |
| **Reply Generation** | Output Tokens | Standard Flash Rates | The final AI response molecules. |

> [!NOTE]
> Rates are subject to change. The system should rely on **token counts** rather than hardcoded currency values for long-term monitoring.

---

## 2. Model Comparison (Future-Proofing)

While we currently target **Gemini 1.5 Flash**, the system is designed to support more advanced or cost-efficient models. Below is the pricing comparison for standard context lengths (<= 128k/200k tokens):

| Model Name | Input (per 1M) | Output (per 1M) | Indexing (Embeddings) | Tier |
| :--- | :--- | :--- | :--- | :--- |
| **Gemini 3 Pro (Preview)** | **$2.00** | **$12.00** | $0.15 | Advanced |
| **Gemini 3 Flash (Preview)** | **$0.50** | **$3.00** | $0.15 | Performance |
| **Gemini 2.5 Pro** | **$1.25** | **$10.00** | $0.15 | Stable Pro |
| **Gemini 2.5 Flash-Lite** | **$0.10** | **$0.40** | $0.15 | Low-Latency |
| **Gemini 1.5 Flash** | **$0.075** | **$0.30** | $0.15 | Current Default |

---

## 3. Token Counting Strategy

To accurately monitor usage without waiting for the billing dashboard, we use two methods:

### A. Pre-flight Counting (Estimation)
Before sending a large request (or during indexing), we can use the `count_tokens` method to estimate the size.
- **Tools Included**: System instructions and tool definitions (like `fileSearch`) also consume tokens.
- **Multimodal**: Images and videos have specific token weights.

### B. Post-response Tracking (Actuals)
The `usage_metadata` object returned by the Gemini SDK provides the source of truth for every call:
```json
{
  "prompt_token_count": 1250,      // Includes query + retrieved context
  "candidates_token_count": 150,   // The AI's reply
  "total_token_count": 1400,
  "cached_content_token_count": 0  // Important for context caching optimization
}
```

---

## 3. Implementation Plan

### Phase A: Logging & Visibility
- [ ] **Usage Metadata Capture**: Update `sendMessageAction` and `GoogleAIService` to log usage metadata for every generation.
- [ ] **Indexing Logs**: Log the token count of files during the ingestion process.

### Phase B: Usage Dashboard
- [ ] **Stats Aggregation**: Create a new DB collection `usage_logs` to store daily token consumption per user.
- [ ] **Tier Enforcement**: Use token counts to enforce "Soft Limits" for different subscription tiers.

### Phase C: Optimization (Future)
- [ ] **Context Caching**: Implement Gemini Context Caching for frequently searched libraries to reduce repeated context costs ($0.01875 / 1M tokens/hour).
- [ ] **Chunk Pruning**: Optimize the number of retrieved chunks to balance accuracy vs. context window cost.

---

## 4. Reference Material
- [Understand and Count Tokens](https://ai.google.dev/gemini-api/docs/tokens?lang=python)
- [Gemini Pricing](https://ai.google.dev/pricing)

---

## 5. Practical Example (Premium Scenario)

Let's trace a full interaction using **Gemini 3 Pro (Preview)** baseline rates ($2.00/1M input, $12.00/1M output, $0.15/1M embedding).

### Step 1: Indexing a 100-page PDF
- **Document Size**: ~50,000 tokens.
- **Cost (Embedding)**: `(50k / 1M) * $0.15` = **$0.0075**.
- *Storage is free, indexing cost remains constant across models.*

### Step 2: Asking a Question (The RAG Call)
- **User Query**: "Summarize the risks section." (~20 tokens).
- **System Prompt**: Core instructions (~200 tokens).
- **RAG Retrieval**: System pulls 5 relevant chunks (~2,500 tokens).
- **AI Response**: A deep reasoning summary (~300 tokens).

### Step 3: Total Chat Cost
- **Input Tokens**: `20 (query) + 200 (system) + 2,500 (retrieved) = 2,720 tokens`.
- **Input Cost**: `(2,720 / 1M) * $2.00` = **$0.00544**.
- **Output Cost**: `(300 / 1M) * $12.00` = **$0.00360**.
- **Total per Message**: **$0.00904**.

### Comparison: Premium vs. Standard
| Phase | Gemini 1.5 Flash | Gemini 3 Pro | Intelligence Level |
| :--- | :--- | :--- | :--- |
| **Indexing** | $0.0075 | $0.0075 | N/A (Standard Embedding) |
| **One Message** | $0.00029 | **$0.00904** | **31x more expensive** |

> [!WARNING]
> While Gemini 3 Pro provides vastly superior reasoning, a single message costs as much as **31 messages** on Flash. Use for specific complex libraries only.

---

## 6. Purchasing Power Comparison ($1 USD)

What does a **$1.00 budget** buy you on each model? (Assuming 100-page docs and 3k-token messages).

| Feature | Gemini 1.5 Flash | Gemini 3 Pro (Preview) |
| :--- | :--- | :--- |
| **Indexing (100-pg PDFs)** | **~133 Documents** | **~133 Documents** |
| **RAG Chat Messages** | **~3,400 Messages** | **~110 Messages** |

### Key Takeaway:
Indexing costs are identical because they use the same background embedding tools. However, for the same $1 cost, you can have **3,400 quick interactions** on Flash or **110 deep-reasoning sessions** on Pro.
