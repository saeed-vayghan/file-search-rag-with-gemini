# Refactor Specification: Backend Logic deduplication

## Goal
Reduce code duplication and improve maintainability by centralizing common patterns found in Server Actions and Lib files.

## 1. Centralize Database Connection (Completed)
**Status**: Done. `withAuth` middleware now handles DB connection.

## 2. Standardize Error Handling (Completed)
**Status**: Done. `withAuth` middleware includes standard try/catch logic.

## 3. User & Store Population Helper (Pending)
**Problem**: Repeated logic to fetch user and populate `primaryStoreId`.
**Solution**: Create a `withStore` middleware or specific helper.

## 4. Centralize Constants (In Progress)
**Status**: Chat Modes completed.
**New Findings**:
- **File Status**: `UPLOADING`, `ACTIVE`, `FAILED`, `INGESTING` are hardcoded in `File.ts`, `mock-data.ts`, `file-actions.ts`, `DashboardView.tsx`, `InspectFileModal.tsx`.
- **UI Defaults**: `text-slate-500` and `📁` are repeated in `Library.ts` and `file-actions.ts`.
- **Paths**: `/libraries` is used in multiple `revalidatePath` calls.

**Plan**:
1.  **Update `src/config/constants.ts`**:
    -   Add `FILE_STATUS` enum/object.
    -   Add `UI_CONSTANTS` (Default Icon, Default Color).
    -   Add `LIBRARY_CONSTANTS` (Default Name).
    -   Add `PATHS` object.
    -   Add `ERROR_MESSAGES` (optional, for "Default" error).
2.  **Refactor Files**:
    -   Update `src/models/File.ts` to use `FILE_STATUS`.
    -   Update `src/models/Library.ts` to use `UI_CONSTANTS`.
    -   Update `src/actions/file-actions.ts` to use all of the above.
    -   Update UI components (`DashboardView`, `InspectFileModal`) to use constants.

## 5. Cache Invalidation Helper (Pending)
**Problem**: `revalidatePath("/")` etc. are repeated frequently.
**Solution**: Create a helper to revalidate common paths.
**Implementation**:
- Create `src/lib/cache-utils.ts` (or add to `utils.ts`).
- Export `revalidateGlobalCache()` which invalidates `/`, `/libraries`, `/store`, etc.
- Replace manual revalidation in `file-actions.ts`.

## Execution Plan (Phase 2)
- [x] Update `src/config/constants.ts` with new constants.
- [x] Refactor `File.ts` and `Library.ts` models.
- [x] Refactor `file-actions.ts` to use new constants.
- [x] Refactor UI components to use new constants.
