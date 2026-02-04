import { CHAT_CONSTANTS, CHAT_MODES, ChatModeType, ChatScopeType } from "@/config/constants";
import { MESSAGES } from "@/config/constants";

/**
 * Pure function to construct a metadata filter for Google AI based on search scope.
 */
export function constructRAGFilter(scope?: { type: ChatScopeType; id?: string }): string | undefined {
    if (scope?.type === 'library' && scope.id) {
        return `library_id = "${scope.id}"`;
    } else if (scope?.type === 'file' && scope.id) {
        return `db_file_id = "${scope.id}"`;
    }
    return undefined;
}

/**
 * Pure function to parse and shape grounding metadata from Google AI response.
 */
export function parseGroundingCitations(groundingMetadata: any): any[] {
    return groundingMetadata?.groundingChunks?.map((chunk: any, index: number) => ({
        id: index,
        uri: chunk.web?.uri || chunk.retrievedContext?.uri,
        title: chunk.web?.title || chunk.retrievedContext?.title || "Source",
    })) || [];
}

/**
 * Pure function to resolve the system instruction based on user settings and requested mode.
 */
export function resolveSystemInstruction(
    settings: any,
    requestedMode: ChatModeType
): string {
    const DEFAULT_LIMITED = CHAT_CONSTANTS.MODES.LIMITED.DEFAULT_INSTRUCTION;
    const DEFAULT_AUXILIARY = CHAT_CONSTANTS.MODES.AUXILIARY.DEFAULT_INSTRUCTION;

    if (requestedMode === CHAT_MODES.LIMITED) {
        return settings?.chatModes?.limited?.instruction || DEFAULT_LIMITED;
    }

    return settings?.chatModes?.auxiliary?.instruction || DEFAULT_AUXILIARY;
}

/**
 * Pure function to extract potential Google File IDs from raw AI citations.
 */
export function extractGoogleFileIdsFromCitations(citations: any[]): string[] {
    return citations
        .map((c: any) => c.title)
        .filter((t: string) => t && (t.startsWith("files/") || t.length > 20)); // Basic heuristic
}

/**
 * Pure function to enrich citations with friendly display names from a file map.
 */
export function enrichCitationsWithFileNames(
    citations: any[],
    fileMap: Map<string, any>
): any[] {
    return citations.map((c: any) => {
        let title = c.title;

        // Try matching title directly or with files/ prefix
        const file = fileMap.get(title) || fileMap.get(`files/${title}`);

        if (file) {
            title = file.displayName;
        }

        return {
            ...c,
            title
        };
    });
}

/**
 * Pure function to map a DB message document to a UI-friendly object.
 */
export function mapMessageToUi(m: any) {
    return {
        id: m._id.toString(),
        role: m.role,
        content: m.content,
        citations: m.citations?.map((c: any) => ({
            id: c.id,
            uri: c.uri,
            title: c.title
        })),
        createdAt: m.createdAt.toISOString(),
    };
}

/**
 * Pure function to translate technical Google errors to user-friendly messages.
 */
export function translateGoogleError(error: any): string {
    const message = error.message || "";
    const causeCode = error.cause?.code || "";

    if (
        causeCode === 'ETIMEDOUT' ||
        causeCode === 'ESOCKETTIMEDOUT' ||
        message.includes("fetch failed")
    ) {
        return MESSAGES.ERRORS.SEARCH_TIMEOUT;
    }

    // Default to generic error or the error message itself
    return error.message || MESSAGES.ERRORS.GENERIC_ERROR;
}
