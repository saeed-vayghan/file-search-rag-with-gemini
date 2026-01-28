# 🦅 Mitra Party Session: API Deep Dive

> **Session ID**: 0x3C_API_REVIEW
> **Theme**: Google File API Endpoint Mapping
> **Attendees**: Experto (Lead), Jamshid (Architect), Kaveh (Engineer)

---

**[Mitra/Host]**: 🔵 CONNECTED.
**[Mitra/Host]**: Purpose: Map specific Google API endpoints to our SaaS Features. Avoid generic terms.
**[Mitra/Host]**: Experto, list the critical endpoints.

**[Experto]**: 🔎 **Endpoint Registry**:

| SaaS Feature | Google Endpoint (v1beta) | Notes |
| :--- | :--- | :--- |
| **1. Upload** | `POST /upload/v1beta/files` | Uses Multipart upload. Returns `fileUri`. Expires in 48h. |
| **2. Ingest** | `POST /v1beta/{store}/files:batchAdd` | Moves raw file to Store. Async. Returns `operation`. |
| **3. Check Status** | `GET /v1beta/{operation}` | Poll this for `state=SUCCEEDED`. |
| **4. Cleanup** | `DELETE /v1beta/files/{name}` | **Crucial**. We must delete the raw file after step 2. |
| **5. Search/Chat** | `POST /v1beta/models/{model}:generateContent` | Use `tools: [{ file_search: ... }]`. |
| **6. User Delete** | `DELETE /v1beta/{store}/files/{id}` | Removes from Knowledge Base. |

---

**[Kaveh/Engineer]**: ⚙️ Question on **Ingestion**. The `batchAdd` endpoint takes a list. Should we batch user uploads?
**[Jamshid/Architect]**: No. UX is Real-time. User uploads one file -> we process one file.
**[Experto]**: Agreed. `batchAdd` supports up to 32 files, but for a responsive SaaS, 1-by-1 is fine.
**[Experto]**: ⚠️ **Gotcha**: The `batch_add` call returns an LRO (Long Running Operation). You **cannot** start Chatting until this operation completes.
**[Mani/Designer]**: That confirms my "Processing" state. I need the `operation.name` to poll status.

**[Sina/Analyst]**: 📊 Question on **Search**. Can we see *what* chunks triggered the answer?
**[Experto]**: Yes. The `generateContent` response includes `groundingMetadata`.
**[Experto]**: It looks like:
```json
"groundingMetadata": {
  "groundingChunks": [
    { "retrievedContext": { "uri": "gs://...", "title": "TaxReport.pdf" } }
  ]
}
```
**[Sina/Analyst]**: Perfect. We will display these as "Citations" in the UI.

**[Jamshid/Architect]**: 🏛️ **Final Architecture Confirmation**:
1.  **Frontend**: POST /api/upload ->
2.  **Backend**: `files.upload` -> `stores.files.batchAdd` -> Return `op_name`.
3.  **Frontend**: Poll /api/status?op=... ->
4.  **Backend**: `operations.get` -> if Done, `files.delete(raw)`.

**[Mitra/Host]**: 🏁 Session Adjourned. All endpoints mapped.
