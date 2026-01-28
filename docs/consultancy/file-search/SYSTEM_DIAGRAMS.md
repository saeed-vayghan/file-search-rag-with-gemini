# 📐 System Diagrams & Architecture: File Search SaaS

**Version**: 1.0
**Reference**: `TECHNICAL_SPECS.md`
**Status**: APPROVED

This document serves as the visual reference for the system's architecture, data flows, and state logic.

---

## 1. High-Level Architecture (Container Diagram)

This diagram illustrates how the core components of the SaaS interact with external Google services.

```mermaid
graph TD
    User((User))
    
    subgraph "Next.js Application (Vercel)"
        UI[Frontend UI]
        API[Backend API Routes]
        Auth[Auth.js Session]
    end
    
    subgraph "Data Persistence"
        DB[(MongoDB Atlas)]
    end
    
    subgraph "Google Cloud / AI"
        G_File[Google File API]
        G_Gemini[Gemini 1.5/2.0 Models]
        G_Vector[File Search Store]
    end

    User -- "HTTPS" --> UI
    UI -- "Server Actions" --> API
    API -- "Validate Session" --> Auth
    API -- "Read/Write Metadata" --> DB
    
    %% Critical Flows
    API -- "1. Upload Binary" --> G_File
    API -- "2. Ingest & Index" --> G_Vector
    API -- "3. Generate Answer" --> G_Gemini
    G_Gemini -- "RAG Retrieval" --> G_Vector
```

---

## 2. Data Model (Entity Relationship)

We enable a **Multi-Store Architecture**: A User can manage multiple independent Vector Stores (e.g., "Personal", "Work"). Files and Libraries belong to a specific Store.

```mermaid
erDiagram
    USER ||--o{ STORE : "manages"
    STORE ||--o{ FILE : "contains"
    STORE ||--o{ LIBRARY : "groups files in"
    
    USER {
        ObjectId _id PK
        String email "Index"
    }

    STORE {
        ObjectId _id PK
        ObjectId userId FK
        String googleStoreId "fileSearchStores/xyz-123"
        String displayName "My Knowledge Base"
    }

    LIBRARY {
        ObjectId _id PK
        ObjectId storeId FK
        String name "Financials"
        String colorHex
    }

    FILE {
        ObjectId _id PK
        ObjectId storeId FK
        ObjectId libraryId FK "Required (Default if null)"
        String status "Enum"
        String googleFileId "files/abc-999"
        String googleUri "gs://..."
    }
```

> **Critical Logic**: Uncategorized files are NOT allowed. If a user does not select a library, the system MUST automatically assign the file to a "Default" library (bootstrapped per user).

### 2.1 Sample MongoDB Records
To demonstrate the schema in practice, here is a snapshot of the database for a user with multiple libraries.

**User Collection**
```json
{
  "_id": "user_123",
  "email": "saeed@example.com",
  "name": "Saeed",
  "primaryStoreId": "store_1", // Links to the formal Store collection
  "createdAt": "2024-05-20T10:00:00Z"
}
```

**Store Collection**
```json
[
  {
    "_id": "store_1",
    "userId": "user_123",
    "googleStoreId": "fileSearchStores/store-xyz-789",
    "displayName": "Personal Knowledge Base",
    "sizeBytes": 4500000000, // 4.5 GB tracked locally
    "fileCount": 125,
    "status": "ACTIVE",
    "lastSyncedAt": "2024-05-25T14:30:00Z"
  }
]
```

**Libraries Collection**
```json
[
  {
    "_id": "lib_A",
    "userId": "user_123",
    "name": "Invoices",
    "icon": "💰",
    "color": "text-emerald-500",
    "description": "2024 Expenses"
  },
  {
    "_id": "lib_B",
    "userId": "user_123",
    "name": "Research",
    "icon": "🔬",
    "color": "text-blue-500"
  }
]
```

**Files Collection**
```json
[
  {
    "_id": "file_1",
    "userId": "user_123",
    "libraryId": "lib_A", // Linked to "Invoices"
    "displayName": "invoice_may.pdf",
    "mimeType": "application/pdf",
    "status": "ACTIVE",
    "googleFileId": "files/abc-001",
    "googleUri": "https://generativelanguage.googleapis.com/v1beta/files/abc-001",
    "sizeBytes": 102400
  },
  {
    "_id": "file_2",
    "userId": "user_123",
    "libraryId": null, // Uncategorized file
    "displayName": "random_notes.txt",
    "mimeType": "text/plain",
    "status": "PROCESSING",
    "googleFileId": "files/abc-002"
  }
]
```

---

## 3. Core Workflows (Sequence Diagrams)

### 3.1 The Ingestion Pipeline (Verified PoC)
This flow represents the **"Upload & Index"** process. It separates the raw upload from the semantic indexing.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant API as Next.js Server
    participant DB as MongoDB
    participant G_Raw as Google File Service
    participant G_Store as Google Vector Store

    User->>API: Upload File ("contract.pdf")
    
    Note over API, G_Raw: Phase 1: Raw Upload
    API->>G_Raw: files.upload(stream)
    G_Raw-->>API: { fileUri: "files/abc-123" }
    API->>DB: Create File Doc (Status: UPLOADING)

    Note over API, G_Store: Phase 2: Vector Ingestion
    API->>G_Store: stores.importFile(storeId, fileUri, metadata)
    Note right of API: Metadata: { libraryId: "lib_1", year: "2024" }
    G_Store-->>API: Operation { name: "ops/op-xyz" }
    API->>DB: Update File (Status: INGESTING, opName: "ops/op-xyz")

    Note over API, G_Store: Phase 3: Polling Strategy
    loop Every 2s
        API->>G_Store: operations.get(opName)
        G_Store-->>API: Status (Processing / Done)
    end
    
    API->>DB: Update File (Status: ACTIVE)
    
    Note over API, G_Raw: Phase 4: Cleanup (Optional)
    API->>G_Raw: files.delete(fileUri)
    Note right of API: Store retains the vector index equivalent
```

### 3.2 The Chat Loop (RAG)
How we retrieve answers using the "One Store Per User" model.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant API as Next.js Server
    participant Gemini as Gemini Pro Model
    participant Store as File Search Store

    User->>API: "Summarize my tax documents"
    
    API->>DB: Look up `googleStoreId` for User
    
    Note over API, Gemini: Tool Configuration
    API->>Gemini: generateContent(prompt, tools)
    Note right of API: Tool: { fileSearch: { filter: "libraryId == 'tax'" } }

    Gemini->>Store: Vector Search (Filtered)
    Store-->>Gemini: Relevant Context Chunks
    
    Gemini-->>API: Generated Answer ("Based on your P&L...")
    API-->>User: Stream Text Response
```

---

## 4. State Machines

### 4.1 File Lifecycle
The state transitions for a `File` document in MongoDB.

```mermaid
stateDiagram-v2
    [*] --> UPLOADING: User Initiates
    
    UPLOADING --> INGESTING: Raw Upload Success
    UPLOADING --> FAILED: Network Error
    
    INGESTING --> ACTIVE: Polling Complete (Done=True)
    INGESTING --> FAILED: Polling Error / Timeout
    
    ACTIVE --> DELETING: User Deletes
    DELETING --> [*]: Cleanup Complete
    
    FAILED --> [*]: Manual Retry
```
---

## 5. Tiered Limits Architecture

The system enforces a strict hierarchical limit policy defined in `src/config/limits.ts`.

### 5.1 Limit Enforcement Flow
```mermaid
graph LR
    U[Upload Request] --> F[File Size Check]
    F -- "> 100MB" --> Err1[Reject: File Limit]
    F -- "< 100MB" --> S[Store Capacity Check]
    S -- "New Total > Tier Limit" --> Err2[Reject: Store Full]
    S -- "OK" --> P[Ingestion Pipeline]
```

### 5.2 Tier Configuration
| Tier | Storage Limit | Per-File Limit | Best For |
| :--- | :--- | :--- | :--- |
| **FREE** | 1 GB | 100 MB | Evaluation |
| **TIER 1** | 10 GB | 100 MB | Professionals |
| **TIER 2** | 100 GB | 100 MB | Business |
| **TIER 3** | 1 TB | 100 MB | Enterprise |

> [!TIP]
> **Performance Recommendation**: While higher tiers allow massive storage, each File Search store should remain under **20GB** for optimal retrieval latencies. For users needing > 20GB, the system architecture supports horizontal scaling via multiple parallel stores.
