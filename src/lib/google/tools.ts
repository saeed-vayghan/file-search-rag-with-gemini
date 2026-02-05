import { ChatScopeType } from "@/config/constants";

// new Tools: Mermaid / Diagram


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
 * Resolves the tools configuration for a specific request.
 */
export function resolveTools(options: {
    storeName?: string;
    scope?: { type: ChatScopeType; id?: string };
}): any[] {
    const tools: any[] = [];

    if (options.storeName) {
        tools.push({
            fileSearch: {
                fileSearchStoreNames: [options.storeName],
                metadataFilter: constructRAGFilter(options.scope)
            }
        });
    }

    // Add more tools here as we expand (e.g., functionCalling, codeExecution)

    return tools;
}
