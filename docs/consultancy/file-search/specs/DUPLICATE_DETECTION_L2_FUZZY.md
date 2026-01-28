# Feature Specification: Duplicate Detection Level 2 (Fuzzy / Semantic)

## 🤖 Agent Identity
- **Primary Agent**: Antigravity (Google Deepmind)
- **Active Skills**: `google-file-api-expert`
- **Loaded Workflows**:
  - **Engineer**: `/mitra-engineer` (Kaveh)
  - **Architect**: `/mitra-architect` (Jamshid)

---

## 1. Objective
Detect and warn users when they attempt to upload a file that is *almost* identical to an existing one (e.g., minor typo fix, v1 vs v2), preventing library clutter without blocking valid updates.

## 2. Technical Solution: Hybrid Similarity

### Approach A: Vector Similarity (Recommended for RAG context)
Since we are already using Google Gemini for RAG, we can leverage embeddings.
*   **Mechanism**: Generate an embedding for the *entire document* (or a summary/first chunk).
*   **Comparison**: Cosine Similarity.
*   **Threshold**: > 0.95 (High similarity).

### Approach B: MinHash (Locality Sensitive Hashing)
Legacy method, faster if not using embeddings, but less semantic.
*   **Mechanism**: Extract text set -> MinHash Signature -> Jaccard Similarity.

### Workflow (Vector Approach)

1.  **Post-Upload Analysis** (Async):
    *   Upload proceeds as normal (unless L1 blocks it).
    *   During ingestion (RAG processing), generate a "Document Level Embedding".

2.  **Interactive Check (Alternative Flow)**:
    *   *Note*: Real-time semantic checking is slow.
    *   **Optimized Flow**:
        1.  Extract text sample (first 4KB) on client? (Risky/Complex)
        2.  **Better**: Perform check *after* text extraction on server, but *before* final commitment to Vector Store?

### refined Workflow (for MVP)
1.  **Upload & Extract**: User uploads file. Text is extracted.
2.  **Similarity Scan**:
    *   Compare extracted text/embedding against existing files in the library.
3.  **Decision**:
    *   **Similarity > 95%**: Mark status as `POTENTIAL_DUPLICATE`.
    *   **UI Notification**: *"This looks 98% similar to 'Business_Plan_v1.pdf'. Keep both?"*
    *   **User Action**: [Keep Both] | [Discard New] | [Replace Old]

## 3. Implementation Steps (Kaveh)
1.  [ ] **Research**: Test cosine similarity on "v1 vs v2" documents using `google-ai.ts`.
2.  [ ] **UI**: Design a "Conflict Resolution" modal for Soft Duplicates.
3.  [ ] **Backend**: Store `documentEmbedding` in `File` model (if not already handled by Vector Store).

## 4. Challenges
*   **Latency**: Calculation is heavy. Best done as a background job or "Warning after upload" rather than blocking.
