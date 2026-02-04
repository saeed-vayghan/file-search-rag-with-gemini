/**
 * Rate Limiting Configuration
 * Centralized source of truth for all rate-limit thresholds and windows.
 */

export const RATE_LIMIT_CONFIG = {
    // Global IP-based shield (Middleware)
    GLOBAL: {
        limit: 100,
        windowMs: 60 * 1000, // 1 minute
        actionName: "global"
    },

    // Per-User Action Limits (Server Actions)
    CHAT: {
        limit: 15,
        windowMs: 60 * 1000, // 1 minute
        actionName: "chat"
    },

    UPLOAD: {
        limit: 20,
        windowMs: 60 * 60 * 1000, // 1 hour
        actionName: "upload"
    },

    LIBRARY: {
        limit: 10,
        windowMs: 10 * 60 * 1000, // 10 minutes
        actionName: "library"
    }
} as const;

export type RateLimitActionType = keyof typeof RATE_LIMIT_CONFIG;
