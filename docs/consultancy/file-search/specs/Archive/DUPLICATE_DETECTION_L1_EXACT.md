# Feature Specification: Duplicate Detection Level 1 (Exact Match)

## 🤖 Agent Identity
- **Primary Agent**: Antigravity (Google Deepmind)
- **Active Skills**: `google-file-api-expert`, `workflow-loader`
- **Loaded Workflows**:
  - **Engineer**: `/mitra-engineer` (Kaveh)
  - **Architect**: `/mitra-architect` (Jamshid)

---

## 1. Objective
Implement a strict, zero-false-positive mechanism to prevent users from uploading files that are bit-for-bit identical to existing files in their library, regardless of filename.

## 2. Technical Solution: SHA-256 Hashing

### Algorithm
We will use **SHA-256** to generate a unique fingerprint for every file.

### Data Model Changes
**File Schema (MongoDB)**:
```typescript
interface IFile {
  // ... existing fields
  contentHash: string; // [NEW] Indexed field, SHA-256 hex string
}
// Index: { contentHash: 1, libraryId: 1 } (Unique compound index optional, or just check logic)
```

### Workflow

1.  **Client-Side Hashing**:
    *   **Component**: `FileUploadForm.tsx`
    *   **Action**: Before upload starts, read the `File` object using `FileReader` or `SubtleCrypto`.
    *   **Logic**: Calculate SHA-256 hash of the file blob.

2.  **Pre-Upload Check**:
    *   **Server Action**: `checkFileExistence(hash: string, libraryId: string)`
    *   **Query**: `db.files.findOne({ contentHash: hash, libraryId: libraryId })`
    *   **Response**:
        *   `found: false` -> Proceed with upload.
        *   `found: true` -> Return metadata (original filename, ID).

3.  **UI Feedback**:
    *   If duplicate found: Stop upload immediately.
    *   **Error Message**: *"Duplicate detected! This file matches 'Report_Final.pdf' which is already in this library."*
    *   **Action**: Offer link to existing file.

## 3. Implementation Steps (Kaveh)
1.  [ ] Update `File` Mongoose model to include `contentHash`.
2.  [ ] Create migration script to calculate hashes for *existing* files (background job).
3.  [ ] Implement client-side SHA-256 hashing helper in `src/lib/hash-utils.ts`.
4.  [ ] Update `uploadFileAction` to accept a hash and perform the check (or separate check action).
