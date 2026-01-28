# Feature Spec: File Management, Inspection & Cleanup

**Version**: 1.0
**Status**: DRAFT

---

## 1. Problem Statement

Currently, when a user deletes a file via the Web App, it is only removed from the MongoDB `Files` collection (and potentially the UI). The actual file resource often remains in:
1.  **Google Cloud (Gemini File API)**: The file persists as `files/xxxxx`.
2.  **Google Vector Store**: The file reference remains in the user's vector store.
3.  **Local Filesystem**: The original uploaded file might remain in `uploads/`.

This leads to "Zombie Files" — orphan resources that consume quota, clutter the remote environment, and potentially leak data.

---

## 2. Goals

1.  **Atomic Deletion**: When a file is deleted in the app, it must be removed from **all** storage layers (DB, Google, Local, Chat History).
2.  **Reconciliation**: Provide a mechanism to detect and clean up *existing* zombie files that were deleted from the app but remain on Google Cloud.

---

## 3. Enhanced Deletion Workflow

We need to update `deleteFileAction` in `src/actions/file-actions.ts` to perform a cascading delete.

### Steps:
1.  **Retrieve File Metadata**: Fetch the file document from MongoDB to get `googleFileId`, `localPath`, and `_id`.
2.  **Delete from Google Cloud**:
    - Call `GoogleAIService.deleteFile(googleFileId)`.
    - This API call will remove the file from the File API.
    - *Note*: Deleting the file automatically removes it from any associated Vector Stores.
3.  **Delete Local File**:
    - Remove the file at `localPath` (e.g., `uploads/USER_ID/filename.pdf`).
4.  **Delete Chat History**:
    - Remove all `Message` documents where `fileId` matches.
5.  **Delete Database Record**:
    - Finally, remove the `File` document from MongoDB.

### Error Handling
- If Google Deletion fails (e.g., 404 Not Found), proceed with DB deletion (as it's already gone).
- If Google Deletion fails with other errors, log the error but **do not** abort the DB deletion? (Debatable: typically we want to clear the DB state so the user doesn't see it, but we should log the zombie for later cleanup). -> **Decision**: Log warning, proceed with DB deletion to maintain UI responsiveness.

---

## 4. Reconciliation Script (Zombie Hunter)

Since we have existing zombie files, we need a script/tool to clean them up.

### Logic:
1.  **Fetch Cloud State**: List all files from Google File API (`ai.files.list()`).
2.  **Fetch DB State**: List all `googleFileId`s from MongoDB `File` collection.
3.  **Compare**:
    - **Zombies**: File exists in Cloud but NOT in DB.
    - **Ghosts**: File exists in DB but NOT in Cloud (Data integrity issue).
4.  **Action**:
    - For **Zombies**: Call `ai.files.delete(name)`.
    - For **Ghosts**: Mark status as `FAILED` or `MISSING` in DB.

---

## 5. Implementation Plan

### Phase 1: Update Server Action
- Modify `src/lib/google-ai.ts`: Add `deleteFile(name: string)`.
- Modify `src/actions/file-actions.ts`: Update `deleteFileAction`.

### Phase 2: Create Cleanup Tool
- Create `scripts/cleanup-zombies.ts`.
- This script can be run manually via `npm run cleanup:zombies`.

### Phase 3: Integration
- Verify by uploading a file, checking Google list, deleting via App, checking Google list again.

---

## 6. Verification Steps

1.  Upload a file "TestDelete.pdf".
2.  Verify it appears in `docs/specs/ZOMBIE_FILES_CLEANUP_SPEC.md` (or list output).
3.  Delete "TestDelete.pdf" from the Web UI.
4.  Run the list script.
5.  **Pass**: The file should NOT appear in the list.

---

## 7. Remote Inspection Feature (Dashboard)

**Goal**: Enable users to view the actual remote status and metadata of a file directly from Google's servers to verify sync/ingestion status.

### UI Changes
- **Dashboard**: Add "Inspect Remote" option to the **Actions Menu** for each file.
- **Modal/Popover**: Display the raw or formatted JSON response from Google:
    - `name` (files/ID)
    - `state` (ACTIVE/PROCESSING/FAILED)
    - `sizeBytes`
    - `createTime`
    - `uri`

### Backend Action
- **`getRemoteFileDebugAction(fileId: string)`**:
    1.  Get `googleFileId` from DB.
    2.  Call `ai.files.get(name)`.
    3.  Return the metadata object.
    4.  If 404, return "File not found on remote (Zombie/Ghost)".

