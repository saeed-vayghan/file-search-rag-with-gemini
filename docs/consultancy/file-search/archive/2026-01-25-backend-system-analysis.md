# 🛠️ Backend System Analysis: File Search SaaS

> **Date**: 2026-01-25
> **Workflow**: Backend Developer (System Analysis)
> **Source**: PRD v2.1, Data Model Viz, Session 03
> **Target**: Next.js App Router (Serverless)

---

## 1. Architectural Mapping

The generic "Microservice" workflow is adapted for our **Next.js Monolith** decision (per Architect Jamshid).

*   **Service Boundary**: The entire Backend is `src/app/api/*`.
*   **Data Access**: Mongoose ODM via `src/lib/db.ts` (Singleton).
*   **External Service**: Google Gemini API via `src/lib/google.ts` (Singleton Service Wrapper).

### 📍 Ecosystem Constraints
*   **Runtime**: Node.js 18+ (Vercel / Next.js compatible).
*   **Dependency**: Must use `google.generativeai` SDK.
*   **Persistence**: MongoDB Atlas (Schema Validation Strict).
*   **Auth**: NextAuth v5 (Edge compatible where possible, but likely Node runtime for Mongo adapter).

---

## 2. API Endpoint Specification (Implementation Targets)

Based on Session 03 and PRD v2.1, we must implement these exact routes:

### 📂 File Management (`/api/files`)
| Method | Path | Action | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/files/upload` | 1. Parse FormData. <br> 2. `files.upload` (Google). <br> 3. Create Mongo `File` (Status: UPLOADING). | ✅ Yes |
| `POST` | `/api/files/ingest` | 1. `stores.importFile` (LRO). <br> 2. Update Mongo (Status: INGESTING). | ✅ Yes |
| `GET` | `/api/files/sse` | **SSE Stream**. Polls `operations.get`. Pushes `{status: ACTIVE}`. | ✅ Yes |
| `GET` | `/api/files` | List Mongo Files (Paginated). Support `?collectionId=` filter. | ✅ Yes |

### 📚 Library/Collections (`/api/collections`)
| Method | Path | Action | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/collections` | List user's collections. | ✅ Yes |
| `POST` | `/api/collections` | Create new shelf `{name, color}`. | ✅ Yes |

### 💬 Chat (`/api/chat`)
| Method | Path | Action | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/chat` | 1. Construct `file_search` tool config. <br> 2. Apply Custom Metadata Filter (`collectionId`). <br> 3. `generateContent` (Stream). | ✅ Yes |

---

## 3. Data & Security Strategy

### 🛡️ Security Boundaries (OWASP)
1.  **Tenant Isolation**:
    *   **Rule**: Every Mongo Query MUST include `userId: session.user.id`.
    *   **Rule**: Every Google Store Request MUST use the `storeId` associated with `session.user.id`.
2.  **Input Sanity**:
    *   Validate `customMetadata` keys strictly (prevent arbitrary tag injection).
    *   Max file size: 100MB (Enforced at Upload handling).

### ⚡ Performance Baselines
*   **Cold Start**: Keep `lib/google.ts` lightweight.
*   **Lency**:
    *   Upload: ~2-5s (Network dependent).
    *   Ingest: Background Task (Async).
    *   Chat: <500ms TTFB (Streaming).

---

## 4. Implementation Plan (Phase 2)

1.  **Scaffold**: `create-next-app` (TS, Tailwind, ESLint).
2.  **Dependencies**: `mongoose`, `google-generative-ai`, `next-auth@beta`.
3.  **Core Libs**:
    *   `src/lib/db.ts` (Mongo Connection).
    *   `src/lib/google.ts` (Service Class).
4.  **API Implementation**: One route group at a time (`files`, then `collections`, then `chat`).

READY TO EXECUTE.
