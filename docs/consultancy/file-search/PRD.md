# 📄 Product Requirements Document (PRD): File Search SaaS

**Version**: 3.0 (Production Ready)
**Status**: APPROVED
**Tech Ref**: `TECHNICAL_SPECS.md`

---

## 1. 👁️ Product Overview
**Goal**: Build a "Premium" SaaS that allows users to chat with their documents using Google's infinite context window and File Search capabilities.
**Philosophy**: "No Custom Vector Wheels." We rely on Google for the hard AI work, focusing on UX/UI and workflow.

---

## 2. 🧱 System Architecture (High Level)

### 2.1 The Concept
A hierarchical "Library" for every user.
*   **User** = The Library Owner (Owns 1 Google File Search Store).
*   **Collections** = The Shelves (Virtual tags for organization).
*   **Files** = The Books (The actual assets indexed by Gemini).

### 2.2 Tech Stack
*   **Frontend**: Next.js 15 (App Router), TailwindCSS.
*   **Backend**: Next.js Server Actions.
*   **Database**: MongoDB (User/File Metadata).
*   **AI Engine**: Google Gemini API (`@google/genai` SDK).

*(See `TECHNICAL_SPECS.md` for detailed Schema, API Flows, and Diagrams)*

---

## 3. 🔐 Authentication
**Strategy**: **Auth.js (v5)**.
*   **Providers**: Google OAuth (Primary), Email Magic Link (Fallback).
*   **Rule**: One User = One Google Store. Access is strictly scoped to the logged-in user's content.

---

## 4. 🚦 Core Features

### 4.1 Knowledge Management (Dashboard)
*   **Upload**: Drag & drop PDF/TXT/MD files.
    *   **Limits**: 100MB per-document limit enforced.
*   **Organize**: Create "Collections" (e.g., "Financials", "Research") and assign files to them.
*   **Status Tracking**: Real-time indicators for "Uploading", "Indexing", "Ready".
*   **Tiered Storage**: Automatic capacity enforcement based on user tier (Free: 1GB, Tier 1: 10GB, Tier 2: 100GB, Tier 3: 1TB).
*   **Vector Store Health**: Visualized capacity tracking and retrieval latency monitoring.

### 4.2 The "Reading Room" (Chat)
*   **Context Scope**:
    *   **Global Chat**: Search across all files in the library.
    *   **Focused Chat**: Select a specific "Collection" to narrow the answer context.
*   **Experience**:
    *   Streaming responses (character-by-character).
    *   Citations/Sources referenced in the answer.

---

## 5. 💅 UX/UI Requirements
*   **Vibe**: Glassmorphism, Clean, "Linear-style" design.
    *   Subtle background gradients.
    *   Smooth transitions (Framer Motion).
*   **Dashboard**:
    *   **Grid View**: Visual representation of Collections as "Shelves".
    *   **List View**: Dense table for file management.
*   **Sidebar**: Collapsible navigation for quick access to recent chats and collections.

---

## 6. 🛠️ Development Phases

### Phase 1: Foundation
*   [x] PoC Verification (API & Data Flow).
*   [x] Technical Specifications Defined.
*   [x] Repository Setup & Boilerplate.

### Phase 2: Core Logic & Storage
*   [x] Database Connection & Formal Models (User, Store, File, Collection).
*   [x] File Upload & Ingestion Pipeline.
*   [x] Tier-based Limit Enforcement (100MB file / Tiered Total).
*   [x] Self-Healing Store Sync (Google <-> MongoDB).

### Phase 3: Interface & Experience
*   [x] Dashboard UI with Collection Shelves & Recent Files.
*   [x] Vector Store Status Dashboard (20GB health monitoring).
*   [x] i18n Support (En/Fa) with RTL/LTR switching.
*   [ ] Chat Interface (Search Room).
*   [ ] Multi-File Chat Context.
*   [ ] Citations/Sources visualization.

---

**Approvals**:
*   *Architecture*: Validated by PoC.
*   *Product*: Approved.
