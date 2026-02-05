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
    SEARCH: "/search",
    BILLING: "/billing"
} as const;

export const MESSAGES = {
    ERRORS: {
        UNAUTHORIZED: "Unauthorized: Please sign in to continue",
        NO_STORE: "No document store found. Please upload a document first.",
        INVALID_STORE: "Store record is invalid (missing Google ID).",
        GENERIC_ERROR: "Failed to process your question. Please try again.",
        ACCESS_DENIED: "Access denied",
        DELETE_HISTORY_FAILED: "Failed to delete history",
        NAME_EMPTY: "Name cannot be empty",
        UPDATE_SETTINGS_FAILED: "Failed to update settings",
        UPDATE_PROFILE_FAILED: "Failed to update profile",
        NO_FILE: "No file provided",
        USER_NOT_FOUND: "User not found",
        UPLOAD_FAILED: "Upload failed",
        CREATE_LIB_FAILED: "Failed to create library",
        LIB_NOT_FOUND: "Library not found",
        UPDATE_LIB_FAILED: "Failed to update library",
        DELETE_LIB_FAILED: "Failed to delete library",
        FILE_NOT_FOUND: "File not found",
        CHECK_STATUS_FAILED: "Failed to check status",
        DELETE_FILE_FAILED: "Failed to delete file",
        FILE_NOT_FOUND_REMOTE: "File not found on remote (Zombie/Ghost)",
        INSPECT_REMOTE_FAILED: "Failed to inspect remote file",
        NO_STORE_FOUND: "No store found",
        STORE_RECORD_MISSING: "Store record missing",
        FETCH_STORE_STATUS_FAILED: "Failed to fetch store status",
        PURGE_FAILED: "Failed to complete purge operation.",
        GOOGLE_API_KEY_MISSING: "GOOGLE_API_KEY is not defined",
        GOOGLE_CREDENTIALS_MISSING: "Missing Google OAuth credentials in environment variables",
        GOOGLE_STORE_CREATION_FAILED: "Failed to create Google AI store",
        SEARCH_TIMEOUT: "Search request timed out. Please try again or refine your query.",
        USE_TOAST_CONTEXT: "useToast must be used within a ToastProvider",
        USE_I18N_CONTEXT: "useI18n must be used within an I18nProvider",
        MONGODB_URI_MISSING: "Please define the MONGODB_URI environment variable inside .env.local",
        PREVIEW_NOT_AVAILABLE: "File not available for preview",
        FILE_NOT_FOUND_ON_DISK: "File not found on disk",
        INTERNAL_SERVER_ERROR: "Internal server error",
        INGESTION_FAILED: "Ingestion failed",
        RATE_LIMIT_EXCEEDED: "Too many requests. Please try again later.",
    },
    INFO: {
        NO_RELEVANT_INFO: "I couldn't find relevant information in your documents.",
        STILL_PROCESSING: "Still processing...",
    },
    SUCCESS: {
        LIBRARY_DELETED: "Library and all files deleted",
        FILE_READY: "File is now ready for search",
    }
} as const;

export const LOG_MESSAGES = {
    API: {
        FILE_FAIL: "File API Error:",
        RUN_FAIL: "Run failed:",
    },
    AUTH: {
        ACTION_FAILED: "[AuthMiddleware] Action failed:",
        SIGN_IN_ERROR: "[Auth] Sign-in error:",
        NEW_USER: "[Auth] New user sign-in:",
        USER_CREATED: "[Auth] User created:",
        USER_LOGGED_IN: "[Auth] User logged in:",
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
        GET_FILES_FAIL: "Get Files Failed:",
        GET_STORE_STATUS_FAIL: "Get Store Status Failed:",
        PURGE_FAIL: "Purge Action Failed:",
        PURGE_LOCAL_FAIL: "   [FS] Failed to delete local directory (might not exist):"
    },
    GOOGLE: {
        UPLOAD_FAIL: "[GoogleAI] Upload Failed:",
        STORE_CREATE_FAIL: "[GoogleAI] Store Creation Failed:",
        INGEST_START_FAIL: "[GoogleAI] Ingestion Start Failed:",
        OP_STATUS_FAIL: "[GoogleAI] Operation Status Check Failed:",
        SEARCH_FAIL: "[GoogleAI] Search Failed",
        TIMEOUT_ERROR: "[GoogleAI] Network/Timeout Error detected. The request took too long or connection was dropped.",
        DELETE_FAIL: "[GoogleAI] Delete Failed:",
        DOC_DELETE_FAIL: "[GoogleAI] Failed to delete document from store (non-critical):",
        INSPECT_FAIL: "[GoogleAI] Inspection Failed:",
        STORE_META_FAIL: "[GoogleAI] Store Meta Fetch Failed:",
        STORE_DELETE_FAIL: "   [GoogleAI] Failed to delete store",
        STORE_LIST_FAIL: "   [GoogleAI] Error listing stores for purge:",
        FILE_DELETE_FAIL: "   [GoogleAI] Failed to delete file",
        FILE_LIST_FAIL: "   [GoogleAI] Error listing files for purge:",
    },
    PLAYGROUND: {
        EXECUTION_ERROR: "Playground Execution Error:"
    },
    UI: {
        DELETE_FAIL: "Delete failed:",
        CLIPBOARD_FAIL: "Failed to copy to clipboard:",
        LOCALE_WARN: "Locale change ignored in ForceEnglishWrapper",
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
