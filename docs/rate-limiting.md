# Rate Limiting Guide

This document outlines the rate-limiting architecture and configurations implemented to protect the API and Server Actions from abuse while managing operational costs.

## Architecture

The system uses a **two-layer defense strategy**:

### 1. Global IP-Based Shield (Middleware)
- **Scope**: All API routes and Server Actions.
- **Implementation**: Edge-compatible `Map` in `src/proxy.ts`.
- **Purpose**: Lightweight, high-performance defense against brute-force and automated scripts. It blocks requests at the earliest possible stage.
- **Storage**: In-memory (per-instance). Ideal for edge deployments.

### 2. Fine-Grained Action Limits (Server Actions)
- **Scope**: High-cost operations (Chat, Uploads, Library management).
- **Implementation**: MongoDB-backed persistent store via `withAuth` HOF.
- **Purpose**: Strict enforcement of usage policies across server restarts and multiple instances.
- **Storage**: MongoDB `RateLimit` collection with a TTL index for automatic cleanup of expired windows.

---

## Default Limits

All limits are centralized in `src/config/ratelimit.ts` for easy adjustment.

| Action | Key Type | Limit | Window | Action Name |
| :--- | :--- | :--- | :--- | :--- |
| **Global Shield** | IP Address | 100 requests | 1 minute | `global` |
| **Chat** | User ID | 15 messages | 1 minute | `chat` |
| **File Upload** | User ID | 20 files | 1 hour | `upload` |
| **Library Management** | User ID | 10 actions | 10 minutes | `library` |

---

## Technical Implementation

### Configuration
Centralized configuration allows for quick updates without touching business logic:
```typescript
// src/config/ratelimit.ts
export const RATE_LIMIT_CONFIG = {
    CHAT: { limit: 15, windowMs: 60000, actionName: "chat" },
    // ...
};
```

### Applying Limits to Actions
Limits are applied declaratively using the `withAuth` higher-order function:
```typescript
// src/actions/chat-actions.ts
export const sendMessageAction = withAuth(async (user, ...) => {
    // ... logic ...
}, { rateLimit: RATE_LIMIT_CONFIG.CHAT });
```

### RateLimit Model (MongoDB)
The `RateLimit` model ensures persistence:
- `key`: Unique identifier (e.g., `user:<id>:chat` or IP).
- `hits`: Number of requests in current window.
- `resetAt`: Timestamp when the window expires.
- **TTL Index**: Automatically deletes records after `resetAt`, keeping the database lean.

---

## Error Handling

When a limit is exceeded:
1. The server returns a standardized error message: `MESSAGES.ERRORS.RATE_LIMIT_EXCEEDED` ("Too many requests. Please try again later.").
2. The UI catches this in the `getChatModeSettings` or action calls and displays a **Toast Notification** to the user.
3. Middleware returns a `429 Too Many Requests` HTTP status code.

## Monitoring & Logs
Failed attempts are logged with:
- `LOG_MESSAGES.AUTH.ACTION_FAILED` (Server-side)
- `LOG_MESSAGES.USER.FETCH_SETTINGS_FAIL` (Client-side)
