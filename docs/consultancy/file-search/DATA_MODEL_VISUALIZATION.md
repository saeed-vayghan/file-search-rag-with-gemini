# 🏛️ Data Model Visualization: The Library Metaphor

**Status**: Up-to-Date (Aligned with `TECHNICAL_SPECS.md`)
**Purpose**: A human-readable guide to how our database concepts map to real-world objects.

---

## 1. The Concept Mapping

We use a strict **Library Metaphor** to make the system intuitive for users.

| SaaS Concept | Real World Metaphor | Technical Implementation |
| :--- | :--- | :--- |
| **User** | **The Library** | Holds the keys to the building. One User = One Google Vector Store. |
| **Collection** | **The Shelf** | A way to group books. Purely organizational (Virtual Tag). |
| **File** | **The Book** | The actual knowledge source. Indexed by AI for search. |

---

## 2. Mock Database State (Visualized)

Imagine looking inside the database for a user named **Saeed**.

### 👤 The Library Owner (User)
*One User = One Global "Knowledge Base" (Google Store).*

```json
// Collection: users
{
  "_id": "user_saeed_001",
  "name": "Saeed",
  "email": "saeed@example.com",
  "image": "https://avatar.com/saeed.png",
  
  // 🔑 THE MASTER KEY
  // This ID links the user to their isolated vector space in Google Cloud.
  "googleStoreId": "fileSearchStores/store-saeed-uid-123" 
}
```

### 📚 The Shelves (Collections)
*Virtual folders. A book can sit on a shelf, but the shelf is just a label.*

```json
// Collection: collections
[
  {
    "_id": "col_finance_2024",
    "userId": "user_saeed_001",
    "name": "Financials",
    "color": "#FF5733", // 🟧 Orange Shelf
    "icon": "💰"
  },
  {
    "_id": "col_research_ai",
    "userId": "user_saeed_001",
    "name": "AI Research",
    "color": "#33C1FF", // 🟦 Blue Shelf
    "icon": "🤖"
  }
]
```

### 📄 The Books (Files)
*The system creates a robust link between the Mongo Record (Metadata) and Google's Vector Index (Content).*

```json
// Collection: files
[
  // 📘 BOOK 1: A Tax Contract (On the 'Financials' Shelf)
  {
    "_id": "file_contract_001",
    "userId": "user_saeed_001",
    "collectionId": "col_finance_2024", // <--- Sitting on the Orange Shelf
    "displayName": "Contract_2024.pdf",
    "mimeType": "application/pdf",
    "sizeBytes": 102400,
    "status": "ACTIVE", // ✅ Ready to Chat
    
    // ☁️ GLOBAL CLOUD REFERENCES
    "googleFileId": "files/abc-123-contract",
    "googleUri": "https://generativelanguage.../files/abc-123",
    "googleOperationName": "operations/op-ingest-123", /* Log for debugging */
    
    "createdAt": "2026-01-25T10:00:00Z"
  }
]
```

---

## 3. How "Search" Works (The Librarian)

When you ask a question, the AI acts as the Librarian.

### Scenario A: "Search Everything"
> *"What did I work on in 2024?"*

*   **Logic**: The Librarian looks through **ALL** books in `store-saeed-uid-123`.
*   **Scope**: Entire Library.

### Scenario B: "Search a Collection"
> *"What are the payment terms in this contract?"* (while viewing Financials)

*   **Logic**: The Librarian puts on "blinders" and **ONLY** looks at books verifying:
    *   `customMetadata.collectionId == "col_finance_2024"`
*   **Scope**: Only the Orange Shelf.

---

**Note**: For strict schema definitions (types, required fields), refer to `TECHNICAL_SPECS.md`. This document is for conceptual understanding.
