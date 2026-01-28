# 🦅 Mitra Consultancy Report: File Search SaaS

> **Status**: DRAFT FOR APPROVAL
> **Project**: Knowledge-Based Semantic Search Platform (SaaS)
> **Core Tech**: Google Gemini File API + File Search

---

## 1. 📋 Requirements & PRD (by Sina - Analyst)

### Product Vision
A clean, premium SaaS platform that allows users to upload personal/business documents and interact with them via a semantic chat interface. The system leverages Google's managed File Search infrastructure to avoid building custom vector databases.

### Key Features
*   **Authentication & User Management**:
    *   Secure generic Login/Signup (Email/Password or Social).
    *   User Profiles: Manage subscription/usage quotas.
*   **Document Management**:
    *   **Upload**: Drag-and-drop interface supporting PDF, TXT, MD, CSV.
    *   **Ingestion Status**: Real-time feedback (Uploading -> Processing -> Ready) via SSE.
    *   **Management**: List, View Metadata, Delete files.
*   **Intelligence & Search**:
    *   **Chat Interface**: "ChatGPT-like" experience grounded in the user's documents.
    *   **Citations**: UI must show which document source provided the answer.
    *   **History**: Save past chat sessions.

### Non-Functional Requirements
*   **Latency**: Streaming responses for chat is non-negotiable.
*   **Data Privacy**: Logical separation of user files (Tenant Isolation).
*   **Scalability**: Stateless backend design.

---

## 2. 🏛️ System Architecture (by Jamshid - Architect)

### Technical Stack Selection
*   **Frontend**: **Next.js (App Router)** - Standard for modern SaaS. Good SEO for landing page + React interactions for dashboard.
*   **Styling**: **Tailwind CSS** + **Framer Motion** (for the "Wow" factor requested).
*   **Backend**: **Next.js API Routes** (Serverless) OR **Standalone Node.js/Express**.
    *   *Decision*: **Next.js API Routes** initially for simplicity, unless long-running file processing requires a worker queue (likely needed for large uploads).
*   **Database**: **PostgreSQL (via Prisma or Drizzle)** or **MongoDB**.
    *   *Decision*: **MongoDB** fits well with the "Document" metadata nature and JSON-like user profiles.
*   **Auth**: **Auth.js (NextAuth)** or **Clerk**.
    *   *Recommendation*: **Auth.js** for maximum control and cost efficiency, or **Clerk** for speed of implementation. Let's start with **Auth.js**.
*   **AI Engine**: **Google Gemini API (via Python/Node SDK)**.
    *   *Service*: Google AI Studio File API (Generative AI).

### Data Flow & Architecture
1.  **Upload Flow**: Client -> Server (Temp Storage) -> Google File API -> DB (Metadata saved: `file_uri`, `status: PROCESSING`).
2.  **Processing**: Background poller or Webhook (if avail) checks Google File status. Server pushes update to Client via SSE.
3.  **Chat Flow**: Client Msg -> Server -> Gemini Pro (with `file_uris` embedded in context) -> Stream Response -> Client.

### Challenge: Vector Wheel? 🛑
*   **Requirement**: "Do not implement a vector wheel."
*   **Architect's Note**: We rely 100% on Google's "File Search" capabilities (Vertex AI Search or Gemini 1.5 Pro Long Context/Caching).
*   **Optimization**: We *will* implement a **Caching Layer** (Redis or In-Memory) for user session history to avoid re-fetching unchanged chat logs, ensuring snappy UI.

---

## 3. 📅 Project Roadmap (by Zal - Manager)

### Phase 1: The Skeleton (Days 1-2)
*   Initialize Repo (Next.js + Tailwind).
*   Setup MongoDB & Auth.js.
*   Create minimal Dashboard Layout.

### Phase 2: The Engine (Days 3-4)
*   Implement `GoogleFileService`: Wrapper for Upload/List/Delete.
*   Build API endpoints for file handling.
*   Implement "Ingestion Loop" (Check status -> Update DB).

### Phase 3: The Interface (Days 5-6)
*   Build the Chat UI (Streaming text support).
*   Connect Chat to Backend -> Google Gemini.
*   Implement "Real-time" status updates (SSE).

### Phase 4: The Polish (Day 7+)
*   Refine aesthetics ("Premium Feel").
*   Landing Page.
*   Deploy.

---

## ❓ Pending Decisions for User
1.  **Database**: Conform to **MongoDB**? (Preferred for this data shape).
2.  **Auth Constraints**: Any strict preference? (Google Login is a must?).
3.  **File Size/Quota**: Do we limit users for the MVP (e.g., 10 files max)?

