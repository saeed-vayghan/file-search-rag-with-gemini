# Feature Spec: Search Scoping & Context Isolation

**Version**: 1.0
**Status**: DRAFT

---

## 1. Problem Statement

When a user chats with a specific file (e.g., in `/chat/[id]`), the system currently searches the **entire** vector store. This means a question about "Chapter 1" might retrieve content from a completely different book in the same library.
Conversely, users also need the ability to explicitly search *across* a specific collection or the entire library.

## 2. Solution: Metadata Filtering

Instead of creating separate Vector Stores for every file (which hits quota limits and is hard to manage), we will use **Metadata Filtering** within the "One Store Per User" (or Multi-Store) architecture.

### 2.1 Why Metadata Filtering?
- **Efficiency**: Keeps all embeddings in one manageable index.
- **Flexibility**: Allows dynamic subsetting (File-only, Collection-only, or Global) at query time.
- **Quota Friendly**: Avoids the 100-store limit per project.

---

## 3. Implementation Changes

### 3.1 Ingestion Pipeline (`src/lib/google-ai.ts`)

We must enforce strict metadata tagging during `importFileToStore`.

**New Metadata Schema:**
```json
[
  { "key": "dbFileId", "stringValue": "65b..." },
  { "key": "dbCollectionId", "stringValue": "65c..." }
]
```
*Note: We prefix with `db` to avoid collision with internal keys.*

**Update `importFileToStore`:**
- Accept `fileId` (MongoDB ID) and `collectionId`.
- Inject into `customMetadata`.

### 3.2 Search Logic (`src/lib/google-ai.ts`)

Update `GoogleAIService.search` to accept a scope filter.

```typescript
type SearchScope = 
  | { type: "file"; id: string }
  | { type: "collection"; id: string }
  | { type: "global" };
```

**Filter Construction:**
- **File Scope**: `metadataFilter: 'dbFileId = "65b..."'`
- **Collection Scope**: `metadataFilter: 'dbCollectionId = "65c..."'`
- **Global Scope**: `undefined` (No filter).

---

## 4. Workflows

### Scenario A: Single File Chat (`/chat/[id]`)
- **User Intent**: "What is the conclusion of **this** PDF?"
- **System Action**: Calls `search(storeId, query, { type: "file", id: fileId })`.
- **Result**: RAG only retrieves chunks tagged with that `fileId`.

### Scenario B: Collection Search (New Feature)
- **User Intent**: "Find 'invoice #102' in my **Financials** collection."
- **System Action**: Calls `search(storeId, query, { type: "collection", id: collectionId })`.
- **Result**: RAG retrieval is bounded to files in that collection.

### Scenario C: Global Search
- **User Intent**: "Where did I mention 'Project X'?"
- **System Action**: Calls `search(storeId, query, { type: "global" })`.
- **Result**: Scans the entire Knowledge Base.

---

## 5. Verification Plan

1.  **Ingest** two distinct files: "Book A (History)" and "Book B (Science)".
2.  **Verify Setup**: Check `getRemoteFileDebugAction` (from Cleanup Spec) to ensure metadata `dbFileId` is present.
3.  **Test Single Chat**: Ask a question unique to Book A while inside Book B's chat.
    - **Expected**: "I cannot find this information" (Correct isolation).
4.  **Test Global Chat**: Ask the same question globally.
    - **Expected**: Retrieves the answer from Book A.
