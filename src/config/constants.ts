export const CHAT_CONSTANTS = {
    MODES: {
        LIMITED: {
            DEFAULT_INSTRUCTION: "Answer ONLY using the provided context. Do not use outside knowledge. If the answer is not found, say so."
        },
        AUXILIARY: {
            DEFAULT_INSTRUCTION: "Use the provided context as a primary source, but feel free to expand with your general knowledge to provide a helpful answer."
        }
    }
} as const;

export const FILE_STATUS = {
    UPLOADING: "UPLOADING",
    INGESTING: "INGESTING",
    ACTIVE: "ACTIVE",
    FAILED: "FAILED"
} as const;

export type FileStatusType = typeof FILE_STATUS[keyof typeof FILE_STATUS];

export const UI_DEFAULTS = {
    LIBRARY: {
        ICON: "📁",
        COLOR: "text-slate-500",
        ICONS: ["📁", "📄", "📊", "💼", "📚", "💰", "⚖️", "🏥", "🎓", "🔧"]
    }
} as const;

export const LIBRARY_DEFAULTS = {
    NAME: "Default",
    DESCRIPTION: "Auto-created default library"
} as const;

export const PATHS = {
    HOME: "/",
    LIBRARIES: "/libraries",
    SETTINGS: "/settings",
    SETTINGS_CHAT_RULES: "/settings/chat-rules",
    STORE: "/store",
    AUTH_SIGNIN: "/auth/signin",
    SEARCH: "/search"
} as const;

export const MESSAGES = {
    ERRORS: {
        NO_STORE: "No document store found. Please upload a document first.",
        INVALID_STORE: "Store record is invalid (missing Google ID).",
        GENERIC_ERROR: "Failed to process your question. Please try again.",
        ACCESS_DENIED: "Access denied",
        DELETE_HISTORY_FAILED: "Failed to delete history",
        NAME_EMPTY: "Name cannot be empty",
        UPDATE_SETTINGS_FAILED: "Failed to update settings",
        UPDATE_PROFILE_FAILED: "Failed to update profile",
    },
    INFO: {
        NO_RELEVANT_INFO: "I couldn't find relevant information in your documents."
    }
} as const;

export const LOG_MESSAGES = {
    AUTH: {
        ACTION_FAILED: "[AuthMiddleware] Action failed:"
    },
    USER: {
        FETCH_SETTINGS_FAIL: "Failed to fetch settings:",
        UPDATE_SETTINGS_FAIL: "Failed to update settings:",
        UPDATE_PROFILE_FAIL: "Failed to update user profile:"
    },
    CHAT: {
        ENRICH_CITATIONS_FAIL: "Failed to enrich citations:",
        ACTION_FAIL: "Chat Action Failed:",
        GET_HISTORY_FAIL: "Get History Failed:",
        DELETE_HISTORY_FAIL: "Delete History Failed:"
    },
    FILE: {
        CHECK_DUPLICATE_FAIL: "Error checking duplicate:",
        UPLOAD_FAIL: "Upload Action Failed:",
        UPLOAD_STORE_RETRY: "[Upload] Store not found or permission denied. Re-creating store...",
        CLEANUP_ORPHAN: "[Upload] Cleaning up orphaned file record:",
        CLEANUP_ORPHAN_FAIL: "Failed to cleanup orphaned record:",
        CREATE_LIB_FAIL: "Create Library Failed:",
        UPDATE_LIB_FAIL: "Update Library Failed:",
        DELETE_LIB_FAIL: "Delete Library Failed:",
        DELETE_LIB_FILE_FAIL: "[Delete Library] Failed to delete file",
        DELETE_LIB_EXCEPTION: "[Delete Library] Exception deleting file",
        CHECK_STATUS_FAIL: "Check Status Failed:",
        DELETE_FAIL: "Delete Failed:",
        GOOGLE_DELETE_FAIL: "Google delete failed during cascade:",
        LOCAL_DELETE_FAIL: "[FileAction] Local file deletion failed for",
        STORE_STATS_FAIL: "[Delete] Failed to update store stats:",
        GET_LIB_FILES_FAIL: "Get Library Files Failed:",
        GET_STORE_STATUS_FAIL: "Get Store Status Failed:",
        PURGE_FAIL: "Purge Action Failed:",
        PURGE_LOCAL_FAIL: "   [FS] Failed to delete local directory (might not exist):"
    }
} as const;

export const CHAT_MODES = {
    LIMITED: "limited",
    AUXILIARY: "auxiliary"
} as const;

export const CHAT_ROLES = {
    USER: "user",
    ASSISTANT: "assistant"
} as const;

export const CHAT_SCOPES = {
    FILE: "file",
    LIBRARY: "library",
    GLOBAL: "global"
} as const;

export type ChatModeType = typeof CHAT_MODES[keyof typeof CHAT_MODES];
export type ChatRoleType = typeof CHAT_ROLES[keyof typeof CHAT_ROLES];
export type ChatScopeType = typeof CHAT_SCOPES[keyof typeof CHAT_SCOPES];
