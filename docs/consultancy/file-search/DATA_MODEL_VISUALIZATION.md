# 🏛️ Data Model Visualization: The Library Metaphor

**Status**: Up-to-Date (Aligned with `TECHNICAL_SPECS.md`)
**Purpose**: A human-readable guide to how our database concepts map to real-world objects.

---

## 1. The Concept Mapping

We use a strict **Library Metaphor** to make the system intuitive for users.

| SaaS Concept | Real World Metaphor | Technical Implementation |
| :--- | :--- | :--- |
| **User** | **The Patron** | Holds the account. One User = One formal `Store` record. |
| **Library** | **The Wing** | A specialized room for books. Grouping logic for files. |
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
  "tier": "TIER_1",
  
  // 🔗 LINK TO STORE
  // Instead of a direct ID, we link to a formal Store record
  "primaryStoreId": "store_saeed_001" 
}

// Collection: stores
{
  "_id": "store_saeed_001",
  "userId": "user_saeed_001",
  "googleStoreId": "fileSearchStores/store-saeed-uid-123",
  "displayName": "store-saeed@example.com",
  "fileCount": 42,
  "sizeBytes": 104857600,
  "status": "ACTIVE"
}
```

### 🏛️ The Wings (Libraries)
*Logical groupings. A book belongs to one library wing.*

```json
// Collection: libraries
[
  {
    "_id": "lib_finance_2024",
    "userId": "user_saeed_001",
    "name": "Financials",
    "description": "Annual reports and tax filings",
    "color": "#FF5733", // 🟧 Orange Wing
    "icon": "💰"
  },
  {
    "_id": "lib_research_ai",
    "userId": "user_saeed_001",
    "name": "AI Research",
    "color": "#33C1FF", // 🟦 Blue Wing
    "icon": "🤖"
  }
]
```

### 📄 The Books (Files)
*The system creates a robust link between the Mongo Record (Metadata) and Google's Vector Index (Content).*

```json
// Collection: files
[
  // 📘 BOOK 1: A Tax Contract (In the 'Financials' Wing)
  {
    "_id": "file_contract_001",
    "userId": "user_saeed_001",
    "libraryId": "lib_finance_2024", // <--- Located in the Orange Wing
    "displayName": "Contract_2024.pdf",
    "mimeType": "application/pdf",
    "sizeBytes": 102400,
    "status": "ACTIVE", // ✅ Ready to Chat
    
    // ☁️ GLOBAL CLOUD REFERENCES
    "googleFileId": "files/abc-123-contract",
    "googleUri": "https://generativelanguage.../files/abc-123",
    "googleOperationName": "operations/op-ingest-123",
    
    // 🛠️ MODERN ADDITIONS
    "contentHash": "sha256_hash_abc_123", /* Deduplication */
    "localPath": "/uploads/saeed_001/file_contract_001_Contract_2024.pdf", /* Preview */
    
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

### Scenario B: "Search a Library"
> *"What are the payment terms in this contract?"* (while viewing Financials)

*   **Logic**: The Librarian puts on "blinders" and **ONLY** looks at books verifying:
    *   `customMetadata.library_id == "lib_finance_2024"`
*   **Scope**: Only the Orange Wing.

---

**Note**: For strict schema definitions (types, required fields), refer to `TECHNICAL_SPECS.md`. This document is for conceptual understanding.
