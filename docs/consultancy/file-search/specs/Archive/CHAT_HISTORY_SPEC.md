# Feature Spec: Persistent Chat History

**Version**: 1.1  
**Status**: DRAFT

---

## Overview

Enable users to continue previous conversations when returning to a document's chat page. All chat messages are persisted in MongoDB with lazy loading for performance.

---

## Data Model

### ChatMessage Collection

```typescript
interface IChatMessage {
  _id: ObjectId;
  fileId: ObjectId;         // Reference to File document
  userId: ObjectId;         // Reference to User document
  role: "user" | "assistant";
  content: string;
  citations?: string[];     // Optional: source references from RAG
  createdAt: Date;
}
```

**Indexes:**
- `{ fileId: 1, createdAt: -1 }` – Fast retrieval by file, reverse chronological
- `{ fileId: 1, createdAt: 1 }` – For deletion queries

---

## Server Actions

| Action | Description |
|--------|-------------|
| `getChatHistoryAction(fileId, before?, limit)` | Paginated fetch, returns `limit` messages before `before` date |
| `saveChatMessageAction(fileId, role, content, citations?)` | Saves a single message |
| `deleteChatHistoryAction(fileId, options?)` | Deletes messages (all or by date range) |

### Pagination Strategy

- Default: Load **last 50 messages** on page mount
- Scroll up → trigger `getChatHistoryAction(fileId, oldestLoadedDate, 50)`
- Returns `{ messages, hasMore }` for infinite scroll

---

## Deletion Options

```typescript
type DeleteOptions = 
  | { mode: "all" }                           // Purge all history
  | { mode: "range", from: Date, to: Date };  // Delete date range
```

UI: Modal with options:
- "Delete All History" button
- Date range picker for custom window

---

## Calendar Jump Feature

- Small calendar icon in chat header
- Opens date picker modal
- Selecting a date:
  1. Fetches messages around that date
  2. Scrolls to that position in history
  3. Shows date separator in chat

---

## Frontend Changes

### Chat Page (`/chat/[id]`)

1. **On Mount**: Load last 50 messages
2. **Scroll Up**: Infinite scroll loads older messages
3. **Calendar Picker**: Jump to specific date
4. **Delete Button**: Modal with deletion options
5. **Date Separators**: Visual breaks between days

---

## Implementation Steps

1. Create `src/models/ChatMessage.ts` with schema
2. Add paginated `getChatHistoryAction` with cursor-based pagination
3. Add `deleteChatHistoryAction` with options
4. Update Chat page with:
   - Infinite scroll loader
   - Calendar picker component
   - Delete modal with date range
   - Date separators in message list
5. Persist messages after send

---

## Verification

1. Send 100+ messages across multiple days
2. Reload page → only last 50 load initially
3. Scroll up → older messages load
4. Use calendar to jump to specific date
5. Delete messages by date range
6. Delete all history
