# 💰 API Cost Monitoring & Token Optimization

**Status**: Final / Updated (Feb 2026)
**Purpose**: Define how the system monitors, estimates, and optimizes Google AI API costs.

---

## 1. Platform-Wide Pricing Pillars

Regardless of the generative model used for chat, the underlying **File Search (RAG)** and **Platform Services** follow these fixed rates:

| Operation | Cost Category | Price (approx) | Notes |
| --- | --- | --- | --- |
| **File Indexing** | Platform Fee | **$0.15 / 1M tokens** | One-time charge. Uses `gemini-embedding-001`. |
| **File Storage** | Storage | **Free** | Managed vector store storage is currently unbilled. |
| **RAG Retrieval** | Context Tokens | Model-Specific | Retrieved chunks are billed as standard input tokens. |
| **Google Search** | Grounding Surcharge | **$14 / 1,000 queries** | Billed after first 5,000 queries/mo (Gemini 3 models). |

---

## 2. Model Comparison & Tiered Pricing

Gemini 3 and 2.5 models use **Tiered Pricing**. If your prompt (Query + System + RAG Chunks) exceeds **200,000 tokens**, the price per token increases.

| Model Name | Input (≤200k) | Input (>200k) | Output (≤200k) | Output (>200k) |
| --- | --- | --- | --- | --- |
| **Gemini 3 Pro** | **$2.00 / 1M** | **$4.00 / 1M** | **$12.00 / 1M** | **$18.00 / 1M** |
| **Gemini 3 Flash** | **$0.50 / 1M** | $0.50 / 1M | **$3.00 / 1M** | $3.00 / 1M |
| **Gemini 2.5 Pro** | **$1.25 / 1M** | **$2.50 / 1M** | **$10.00 / 1M** | **$15.00 / 1M** |
| **Gemini 2.5 Flash-Lite** | **$0.10 / 1M** | $0.10 / 1M | **$0.40 / 1M** | $0.40 / 1M |

---

## 3. Context Caching Optimization (Phase C)

For high-traffic libraries, we use **Explicit Context Caching** to get a **90% discount** on input tokens. However, this introduces a **time-based storage fee**.

* **Discount:** Cached tokens cost **$0.01 – $0.20 per 1M** (vs. $0.10 – $2.00).
* **Storage Fee:** * **Pro Models:** $4.50 / 1M tokens per hour.
* **Flash Models:** $1.00 / 1M tokens per hour.



> [!TIP]
> **Break-even Point:** On Gemini 3 Pro, you must query the cached document at least **3 times per hour** for the token savings to outweigh the storage cost.

---

## 4. Practical Example (Premium Scenario)

Let's trace a full interaction using **Gemini 3 Pro (Preview)**.

### Step 1: Indexing a 100-page PDF

* **Document Size:** ~50,000 tokens.
* **Cost (Embedding):** `(50k / 1M) * $0.15` = **$0.0075** (One-time).

### Step 2: Asking a Question (The RAG Call)

* **User Query:** "Summarize the risks section." (~20 tokens).
* **System Prompt:** Core instructions (~200 tokens).
* **RAG Retrieval:** System pulls 5 relevant chunks (~2,500 tokens).
* **Input Total:** 2,720 tokens.
* **Output Total:** 300 tokens (AI Response).

### Step 3: Total Chat Cost

* **Input Cost:** `(2,720 / 1M) * $2.00` = **$0.00544**.
* **Output Cost:** `(300 / 1M) * $12.00` = **$0.00360**.
* **Total per Message:** **$0.00904**.

---

## 5. Purchasing Power Comparison ($1 USD)

What does a **$1.00 budget** buy you? (Calculated for 3k-token RAG messages).

| Feature | Gemini 2.5 Flash-Lite | Gemini 3 Pro |
| --- | --- | --- |
| **Indexing (100-pg PDFs)** | **~133 Documents** | **~133 Documents** |
| **RAG Chat Messages** | **~2,200 Messages** | **~110 Messages** |
| **Google Search Queries** | **~71 Searches** | **~71 Searches** |

### Key Takeaway:

Indexing costs are model-independent. The real variance is in the **reasoning cost**. For high-volume support, **Flash-Lite** provides 20x better value than Pro. Use Pro only for "Deep Research" tiers where tiered pricing thresholds (>200k tokens) are likely to be hit.


## Cost calculation

### 1. Ingestion Phase (Indexing Cost)

When you use `client.files.upload` followed by `fileSearchStores.importFile`, you are performing a two-step ingestion.

* **`client.files.upload`**: This function returns a `File` object. It does **not** trigger a charge. It simply stages the file in Google’s temporary storage (deleted after 48 hours).
* **`fileSearchStores.importFile`**: This is the **billing event**. It triggers a "Long Running Operation" (LRO) that chunks and embeds the file.

**How to calculate from the response:**
The response of `importFile` is an **Operation** object. To find the cost, you must poll this operation until it is `done`. The final operation metadata contains the token count.

```javascript
// 1. Start the import
const operation = await client.fileSearchStores.importFile({
  fileSearchStoreName: "stores/my-store",
  fileName: "files/my-file-id"
});

// 2. Wait for completion (Simplified polling)
// In a real app, use the operation name to 'get' the status
const finishedOp = await client.operations.get({ name: operation.name });

// 3. Extract the cost
// The 'metadata' field contains the processed token count
const indexedTokens = finishedOp.metadata.totalTokens || 0; 
const indexingCost = (indexedTokens / 1_000_000) * 0.15;

console.log(`Indexing Cost: $${indexingCost.toFixed(6)}`);

```

---

### 2. Generation Phase (Query Cost)

When you call `models.generateContent` with the `fileSearch` tool enabled, Google bills you for the **Total Input Context**, which includes the chunks retrieved from your store.

**How to calculate from the response:**
The `generateContent` response includes a `usageMetadata` object. This is the **source of truth** for your bill.

```javascript
const response = await client.models.generateContent({
  model: "gemini-3-flash-preview",
  tools: [{ fileSearch: { fileSearchStoreNames: ["stores/my-store"] } }],
  contents: [{ role: "user", parts: [{ text: "What is the warranty period?" }] }]
});

// EXTRACT THE TRUTH
const usage = response.usageMetadata;

const inputTokens = usage.promptTokenCount;      // Question + System + RETRIEVED CHUNKS
const outputTokens = usage.candidatesTokenCount; // The actual answer
const searchCount = response.groundingMetadata?.webSearchQueries?.length || 0;

// Apply the math
const cost = calculateLiveCost("gemini-3-flash-preview", inputTokens, outputTokens, searchCount);

```

---

### 3. The "Unified" JS Calculation Engine

This logic specifically handles the "Tier 2" jump (over 200k tokens) and the search surcharge, which are the two biggest surprises in Gemini billing.

```javascript
/**
 * Unified Calculation Logic for Production
 */
function calculateLiveCost(modelId, inputTokens, outputTokens, searchCount = 0) {
  const RATES = {
    "gemini-3-pro-preview": { in: 2.00, inT2: 4.00, out: 12.00 },
    "gemini-3-flash-preview": { in: 0.50, inT2: 0.50, out: 3.00 },
    "gemini-2.5-flash-lite": { in: 0.10, inT2: 0.10, out: 0.40 }
  };

  const model = RATES[modelId] || RATES["gemini-3-flash-preview"];

  // Rule: Tier 2 pricing triggers if input > 200,000 tokens
  const isTier2 = inputTokens > 200_000;
  const activeInRate = isTier2 ? model.inT2 : model.in;

  const tokenCost = ((inputTokens / 1_000_000) * activeInRate) + 
                    ((outputTokens / 1_000_000) * model.out);

  // Rule: Google Search Surcharge is $14 per 1,000 searches
  const searchCost = (searchCount / 1_000) * 14.00;

  return {
    total: (tokenCost + searchCost).toFixed(6),
    details: { tokenCost, searchCost, isTier2 }
  };
}

```

### Summary for your Report

| Function | Response Data to Capture | Why? |
| --- | --- | --- |
| **`importFile`** | `operation.metadata.totalTokens` | This is the one-time $0.15/1M fee. |
| **`generateContent`** | `usageMetadata.promptTokenCount` | This includes the **cost of RAG retrieval** (the chunks). |
| **`generateContent`** | `groundingMetadata.webSearchQueries` | This detects the $0.014 per-search surcharge. |

**Important Note:** The `usageMetadata.promptTokenCount` is much higher than your question length because File Search automatically injects the most relevant document pieces into that count. That is exactly what you are billed for.