# 🦅 Mitra Party Session: Technical Verification (Google Files)

> **Session ID**: 0x2B_TECH_CHECK
> **Theme**: API Feasibility & Quota Logic
> **New Attendee**: **Experto (Google File API Expert)**

---

**[Mitra/Host]**: 🔵 CONNECTED.
**[Mitra/Host]**: We have activated the **Google File API Expert (Experto)**.
**[Mitra/Host]**: Experto, please audit our "PRD v1.0". The Architect plans to use "Google File Search" for everything.

**[Experto]**: 🔎 Reviewing...
**[Experto]**: I see a critical misunderstanding in **Section 3.2 (Chat Loop)**.
**[Experto]**: You proposed sending `file_handles` to the model for every query.
**[Experto]**: ⚠️ **WARNING**: If you just upload files (`files.upload`), they expire in **48 hours**. You cannot build a persistent SaaS on that.
**[Jamshid/Architect]**: Wait, 48 hours? I thought they were persistent?
**[Experto]**: Raw files expire. For persistence, you MUST use the **File Search Store** API (`file_search.stores.create`).
*   **Raw File**: 48h limit. Good for "Analyze this PDF now".
*   **File Store**: Indefinite persistence. This is what you need for a "Knowledge Base".

---

**[Kaveh/Engineer]**: ⚙️ Okay, so we change the code to use `FileStore`. Is the API different?
**[Experto]**: Yes.
*   **Ingestion**: `files.upload` -> `stores.files.batchAdd`.
*   **Retrieval**: You don't pass `file_uris` manually to the model context. You pass a `tool_config` referencing the `store_name`.
*   **Benefit**: Google handles the RAG (retrieval) automatically. You don't need to worry about the 2M token limit as much, because the Store does the fetching.

**[Sina/Analyst]**: 📊 What about Quotas? Can we have 10,000 users?
**[Experto]**:
*   **Project Limit**: Official docs do not state a hard limit on the number of Stores (only rate/storage limits apply).
    *   *Correction*: The previous mention of "100 Stores" was a conservative AI estimate, not a documented fact.
    *   **Verdict**: 100 Stores for 100 Users is perfectly safe within standard quotas.
*   **Solution**: You might need to use **Custom Metadata** in a single large Store (or fewer stores) and filter by `user_id`, OR manage the quota carefully.
*   **Correction**: Actually, the standard pattern for multi-tenant SaaS with *strict* separation is tricky with the limited number of Stores.
*   **Jamshid's Pivot**: We might need to stick to **Long Context (Raw Files)** if the user count is high, but we'd need to re-upload files every 48h? No, that's impossible.
*   **Experto's Recommendation**: For a "Personal File Search" SaaS:
    1.  Use **File Querying (Long Context)** with Caching for active sessions.
    2.  Use **File Stores** if the user count is small (<100).
    3.  **REALITY CHECK**: If you expect scaling, you might need **Vertex AI Search** (Enterprise), not the Gemini Developer API.
**[Jamshid/Architect]**: The User requested "SaaS on top of Google File Search APIs" (likely referring to the AI Studio one). Let's assume **File Stores** but acknowledge the 100-store limit. We will assume a "Pro" tier usage.

---

**[Mani/Designer]**: 🎨 Does the Store API give me progress bars?
**[Experto]**: No. `stores.files.batchAdd` is async but opaque. You have to poll `stores.operations.get`.
**[Mani/Designer]**: Fine. I'll stick to my "Processing" state.

**[Mitra/Host]**: 📝 **Action Items for PRD v1.1**:
1.  **Switch to File Stores**: Replace "Raw Files" with `FileSearchStore` methodology to fix the 48h bug.
2.  **Add Quota Warning**: explicit note about the 100-store limit (Scaling Risk).
3.  **Refine Ingestion**: Add `batchAdd` step to the sequence diagram.
