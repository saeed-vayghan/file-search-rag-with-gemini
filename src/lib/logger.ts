/**
 * Centralized logging utilities for the application
 * Provides consistent, reusable logging functions across all modules
 */

type LogLevel = "info" | "debug" | "warn" | "error" | "success";

interface ChatRequestLog {
    scope: "file" | "library" | "global";
    contextId: string;
    chatMode: "limited" | "auxiliary";
    modelName?: string;
    userMessage: string;
    systemInstruction?: string;
}

interface ChatResponseLog {
    chatMode: "limited" | "auxiliary";
    replyLength: number;
    citationsCount: number;
    replyPreview: string;
}

interface FileOperationLog {
    operation: "upload" | "delete" | "import" | "inspect";
    fileName: string;
    fileId?: string;
    additionalInfo?: string;
}

interface StoreOperationLog {
    operation: "create" | "delete" | "fetch" | "purge";
    storeName: string;
    additionalInfo?: string;
}

/**
 * Format a log prefix with emoji and module name
 */
function formatPrefix(module: string, level: LogLevel = "info"): string {
    const prefixes: Record<LogLevel, string> = {
        info: "ℹ️",
        debug: "🔍",
        warn: "⚠️",
        error: "❌",
        success: "✅",
    };
    return `${prefixes[level]} [${module}]`;
}

/**
 * Log a chat request with detailed information
 */
export function logChatRequest(data: ChatRequestLog): void {
    console.log("\n=== CHAT REQUEST ===");
    console.log(`Scope: ${data.scope}`);
    console.log(`Context ID: ${data.contextId}`);
    console.log(`Chat Mode: ${data.chatMode.toUpperCase()}`);
    if (data.modelName) {
        console.log(`Model: ${data.modelName}`);
    }
    console.log(`User Message: "${data.userMessage}"`);
    if (data.systemInstruction) {
        console.log(`System Instruction: ${data.systemInstruction}`);
    }
    console.log("==================\n");
}

/**
 * Log a chat response with summary details
 */
export function logChatResponse(data: ChatResponseLog): void {
    console.log("\n=== CHAT RESPONSE ===");
    console.log(`Mode Used: ${data.chatMode.toUpperCase()}`);
    console.log(`Reply Length: ${data.replyLength} chars`);
    console.log(`Citations Count: ${data.citationsCount}`);
    console.log(`Reply Preview: "${data.replyPreview}"`);
    console.log("===================\n");
}

/**
 * Log Google AI file operations
 */
export function logFileOperation(data: FileOperationLog): void {
    const moduleName = "GoogleAI";
    const operationText = data.operation.toUpperCase();

    console.log(`${formatPrefix(moduleName)} ${operationText}: ${data.fileName}${data.fileId ? ` (${data.fileId})` : ""}`);

    if (data.additionalInfo) {
        console.log(`   ${data.additionalInfo}`);
    }
}

/**
 * Log Google AI store operations
 */
export function logStoreOperation(data: StoreOperationLog): void {
    const moduleName = "GoogleAI";
    const operationText = data.operation.charAt(0).toUpperCase() + data.operation.slice(1);

    console.log(`${formatPrefix(moduleName)} ${operationText} Store: ${data.storeName}`);

    if (data.additionalInfo) {
        console.log(`   ${data.additionalInfo}`);
    }
}

/**
 * Log debug information (can be disabled in production)
 */
export function logDebug(module: string, message: string, data?: any): void {
    if (process.env.NODE_ENV !== "production") {
        console.log(`${formatPrefix(module, "debug")} ${message}`);
        if (data !== undefined) {
            console.log(data);
        }
    }
}

/**
 * Log warnings
 */
export function logWarn(module: string, message: string, error?: any): void {
    console.warn(`${formatPrefix(module, "warn")} ${message}`);
    if (error) {
        console.warn(error);
    }
}

/**
 * Log errors
 */
export function logError(module: string, message: string, error?: any): void {
    console.error(`${formatPrefix(module, "error")} ${message}`);
    if (error) {
        console.error(error);
    }
}

/**
 * Log success operations
 */
export function logSuccess(module: string, message: string): void {
    console.log(`${formatPrefix(module, "success")} ${message}`);
}

/**
 * Log purge/destructive operations with special formatting
 */
export function logDangerousOperation(module: string, operation: string, details?: string): void {
    console.log(`🔥 [${module}] ${operation}`);
    if (details) {
        console.log(`   ${details}`);
    }
}

/**
 * General purpose info log
 */
export function logInfo(module: string, message: string): void {
    console.log(`${formatPrefix(module)} ${message}`);
}
