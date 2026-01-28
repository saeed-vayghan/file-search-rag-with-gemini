# 🦅 Mitra Party Session: Challenge & Refine

**Topic**: File Search SaaS - Architecture & UX Challenge
**Attendees**: Mitra (Host), Jamshid (Architect), Sina (Analyst), Mani (Designer), Kaveh (Engineer)

---

## 1. The Database Deployment Challenge
**Mitra**: The User has mandated **MongoDB**. Jamshid, update your constraints. Kaveh, any objections?

**Kaveh (Engineer)**: MongoDB is fine, but for a "premium" SaaS, are we using Atlas or a local docker container?
**Jamshid (Architect)**: For development, we'll use a local Docker container (`mongo:latest`). For production, we assume Atlas.
**Challenge**: How do we handle relational data like "User owns File"?
**Jamshid**: MongoDB is perfect for this. We embed basic file metadata in the User object or have a `Files` collection with `userId` reference. Since we aren't doing complex joins, it's faster than SQL for this JSON-heavy metadata.

## 2. The "No Vector DB" Challenge
**Sina (Analyst)**: The user said "No vector wheel." But are we sure Google File Search is enough?
**Jamshid**: It's a risk. Google's File API is great for *context retrieval*, but does it have "fuzzy search" for the file *list*?
**Kaveh**: Good point. The `files.list` API might just be basic pagination.
**Solution**: We will implement a simple text index on the MongoDB `Files` collection for the *dashboard* search (finding a file by name). The *semantic* search (asking questions) will go purely through Google Gemini using the `file_uris`.

## 3. The UX/UI "Premium" Challenge
**Mani (Designer)**: "Upload and wait" is boring. If the user uploads a 50MB PDF, it takes time to process.
**Challenge**: How do we keep the user engaged?
**Mani**: We need a **State Machine** for the File Card.
*   *State 1: Uploading* (Progress bar)
*   *State 2: Ingesting* (Google Processing - pulsing yellow)
*   *State 3: Ready* (Green check + "Ask me" button)
*   *State 4: Failed* (Red + Retry)
**Jamshid**: We need SSE (Server-Sent Events) for this. Polling is amateur. Next.js API Routes support SSE, but it's tricky with Vercel timeouts.
**Decision**: We will use a client-side polling fallback if SSE drops, but aim for SSE.

## 4. Visualizing the Flow
**Mitra**: Jamshid, the user wants diagrams.
**Jamshid**: I will draft:
1.  **Ingestion Sequence**: Client -> Next.js -> Gemini -> DB.
2.  **Chat Data Flow**: User -> Chat UI -> API -> Gemini (Context) -> Stream.
3.  **File State Machine**: The lifecycle of a document.

---

**Consensus Reached**:
*   **DB**: MongoDB (Mongoose/Prisma).
*   **Search**: Hybrid (Mongo Text Search for filename, Gemini for content).
*   **Feedback**: Strict State Machine for files.
