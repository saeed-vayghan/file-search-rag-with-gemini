# 🤖 Project Rules & Guidelines: File Search SaaS

This document outlines the rules, architectural patterns, and development guidelines for agents working on this workspace.

---

## 🏛️ Architecture & Stack

- **Framework**: Next.js 15 (App Router, React Server Components, Server Actions).
- **Database**: MongoDB (via Mongoose ODM) with collections:
  - `User`: Accounts and tier settings (`FREE`, `TIER_1`, `TIER_2`, `TIER_3`).
  - `Store`: Tracks Google Vector Store mappings (`fileSearchStores/...`).
  - `Library`: Logical file groups within a User's workspace.
  - `File`: Metadata, status (`UPLOADING`, `INGESTING`, `ACTIVE`, `FAILED`), and Google File/Operation references.
  - `Message`: Chat history with system/user/assistant messages.
  - `RateLimit` / `UsageLog`: Rate-limiting and token usage tracking.
- **AI Engine**: Google Gemini API via `@google/genai` SDK.
- **Styling**: Tailwind CSS + Radix UI + shadcn/ui.

---

## 🛠️ Development Guidelines

### 1. Next.js Server Actions & Security
- **Always** wrap user-facing server actions with `withAuth` to guarantee secure session mapping.
- Keep business logic inside Server Actions under [src/actions/](file:///Users/saeed/Projects/repos/file-search/src/actions) or utility files in [src/lib/](file:///Users/saeed/Projects/repos/file-search/src/lib).

### 2. Google Gemini API Integration
- Always use the unified AI client fetched from `getAIClient()` in [src/lib/google/google-ai.ts](file:///Users/saeed/Projects/repos/file-search/src/lib/google/google-ai.ts).
- For file search RAG, use the `fileSearch` tool in `generateContent` configuration rather than custom vector searches.
- Retain Google API response metadata like `totalTokens` and `groundingMetadata` for billing calculations.
- File uploads live for 48 hours on Google staging. Verify they are imported into a long-lasting `FileSearchStore` (which persists indefinitely).

### 3. File & Data Consistency
- Every file must map to a `Library`. If a user uploads a file without specifying a library, auto-resolve it to the user's default/bootstrapped Library.
- Update `Store` stats (`sizeBytes`, `fileCount`) whenever files are added or deleted to maintain synchronization.
- Implement deduplication checks using the file content hash (`contentHash`) to prevent redundant uploads.

### 4. Internationalization & RTL
- The application supports English (`en`) and Farsi (`fa`).
- Respect dictionary keys in [src/dictionaries/](file:///Users/saeed/Projects/repos/file-search/src/dictionaries) for all user-facing text.
- Adjust UI layouts automatically when Farsi is active by utilizing the dynamic RTL settings.

### 5. Code Quality & Standards
- Maintain clean, descriptive logs using the custom logging engine in [src/lib/logger.ts](file:///Users/saeed/Projects/repos/file-search/src/lib/logger.ts).
- Do not bypass the defined limits config in [src/config/limits.ts](file:///Users/saeed/Projects/repos/file-search/src/config/limits.ts).
- Write components in [src/components/](file:///Users/saeed/Projects/repos/file-search/src/components) adhering to dark-mode and glassmorphism styling presets.
