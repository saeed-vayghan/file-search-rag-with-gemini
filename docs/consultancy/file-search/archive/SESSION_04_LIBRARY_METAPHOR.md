# 🦅 Mitra Party Session: The Library Metaphor

> **Session ID**: 0x4D_LIBRARY_EXPANSION
> **Theme**: Converting "File Dump" to "Digital Library"
> **Attendees**: All Agents

---

**[Mitra/Host]**: 🔵 CONNECTED.
**[Mitra/Host]**: The User wants to evolve the SaaS from a "Box of Files" to a "Structured Library".
**[Mitra/Host]**: We need **Sections**, **Shelves**, and **Rich Metadata**.

**[Sina/Analyst]**: 📊 **Concept: The "Collection"**
*   Currently, we just have a flat list of files.
*   **New Feature**: Users create **Collections** (e.g., "Tax 2024", "Research Papers", "Recipes").
*   **Behavior**:
    *   Users upload files *into* a Collection.
    *   Users can "Chat with the Whole Library" (Scoped Search).
    *   Users can "Chat with a Collection" (Scoped Search).

**[Experto]**: 🔎 **Technical Feasibility**
*   **Strategy**: Use **Custom Metadata** for efficiency.
    *   *Note*: While there is no hard limit on Stores, managing thousands of small stores (one per collection per user) adds unnecessary complexity.
    *   **Decision**: Stick to **One Store Per User** and filters.
    *   When adding a file to the Store, we attach:
        ```json
        "customMetadata": {
           "userId": "user_123",
           "collectionId": "col_999",
           "type": "finance",
           "year": "2024"
        }
        ```
    *   **Search**: When user asks "How much did I spend?", we set the filter:
        `c.key = "collectionId" AND c.value = "col_999"` (if they selected the collection).

**[Mani/Designer]**: 🎨 **UX Vision: The "Stacks"**
*   **Home View**: Not a list of files. A grid of **"Shelves"** (Collections) with dynamic covers generated from the content.
*   **Drill Down**: Click a Shelf -> See the "Spines" of the documents.
*   **Search Bar**: "Command Palette" style.
    *   `@Financials` find "Receipt" -> Scopes the AI instantly.
*   **Metadata Editor**: A sidebar to tag documents manually (Author, Genre, Key Entities).

**[Jamshid/Architect]**: 🏛️ **Schema Update**
*   We need a new `Collection` model in MongoDB.
*   `Collection`: `{ _id, userId, name, color, icon }`.
*   `File`: Add `collectionId` (Ref).
*   **Ingestion Update**: We must pass this metadata to Google during `batchAdd`.

---

**[Mitra/Host]**: 🏁 Consensus:
1.  **Feature**: "Collections" (Virtual Folders).
2.  **Tech**: Single Store + Metadata Filtering (`collectionId`).
3.  **UX**: Shelf View + Scoped Chat.
