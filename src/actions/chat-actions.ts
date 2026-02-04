"use server";

import User from "@/models/User";
import FileModel from "@/models/File";
import Library from "@/models/Library";
import * as GoogleAIService from "@/lib/google";
import { logChatRequest, logChatResponse } from "@/lib/logger";
import { withAuth } from "@/lib/auth";
import Message from "@/models/Message";
import { MESSAGES, LOG_MESSAGES, CHAT_SCOPES, CHAT_ROLES, CHAT_MODES, ChatScopeType, ChatRoleType, ChatModeType } from "@/config/constants";
import { revalidatePath } from "next/cache";
import { resolveSystemInstruction, extractGoogleFileIdsFromCitations, enrichCitationsWithFileNames, mapMessageToUi } from "@/lib/chat";
import { RATE_LIMIT_CONFIG } from "@/config/ratelimit";

export type ChatMessage = {
    id?: string;
    role: ChatRoleType;
    content: string;
    citations?: { id: number; uri?: string; title?: string }[];
    createdAt?: string;
};

export const sendMessageAction = withAuth(async (
    user,
    contextId: string,
    scope: ChatScopeType,
    history: ChatMessage[],
    newMessage: string,
    mode?: ChatModeType
): Promise<{ reply: string; citations?: any[]; error?: string }> => {
    try {
        // User already authenticated, get populated store
        const userWithStore = await User.findById(user._id).populate("primaryStoreId");

        if (!userWithStore || !userWithStore.primaryStoreId) {
            return {
                reply: "",
                error: MESSAGES.ERRORS.NO_STORE,
            };
        }

        const googleStoreId = (userWithStore.primaryStoreId as any)?.googleStoreId;

        if (!googleStoreId) {
            return {
                reply: "",
                error: MESSAGES.ERRORS.INVALID_STORE,
            };
        }

        // 2. Determine Chat Mode & Instruction
        const defaultMode = (user.settings?.defaultMode || CHAT_MODES.LIMITED) as ChatModeType;
        const requestedMode = mode || defaultMode;
        const systemInstruction = resolveSystemInstruction(user.settings, requestedMode);

        // Log chat request details
        logChatRequest({
            scope,
            contextId,
            chatMode: requestedMode,
            userMessage: newMessage,
            systemInstruction,
        });

        // 3. Save User Message
        const messageData: any = {
            role: CHAT_ROLES.USER,
            content: newMessage,
            scope,
            mode: requestedMode,
            userId: user._id,
        };
        if (scope === CHAT_SCOPES.FILE) messageData.fileId = contextId;
        if (scope === CHAT_SCOPES.LIBRARY) messageData.libraryId = contextId;

        await Message.create(messageData);

        // 4. Perform RAG Search (Scoped)
        const result = await GoogleAIService.search(
            googleStoreId,
            newMessage,
            { type: scope, id: contextId },
            systemInstruction
        );
        const replyText = result.text || MESSAGES.INFO.NO_RELEVANT_INFO;

        // Log chat response details
        logChatResponse({
            chatMode: requestedMode,
            replyLength: replyText.length,
            citationsCount: result.citations?.length || 0,
            replyPreview: replyText.substring(0, 100) + (replyText.length > 100 ? '...' : ''),
        });

        // 4.5 Resolve Citations
        let enrichedCitations = result.citations || [];
        try {
            if (enrichedCitations.length > 0) {
                const googleFileIds = extractGoogleFileIdsFromCitations(enrichedCitations);
                if (googleFileIds.length > 0) {
                    const files = await FileModel.find({
                        $or: [
                            { googleFileId: { $in: googleFileIds } },
                            { googleFileId: { $in: googleFileIds.map((id: string) => `files/${id}`) } }
                        ]
                    }).select("googleFileId displayName localPath").lean();

                    const fileMap = new Map();
                    files.forEach(f => {
                        if (f.googleFileId) fileMap.set(f.googleFileId, f);
                        if (f.googleFileId) fileMap.set(f.googleFileId.replace("files/", ""), f);
                    });

                    enrichedCitations = enrichCitationsWithFileNames(enrichedCitations, fileMap);
                }
            }
        } catch (citationError) {
            console.warn(LOG_MESSAGES.CHAT.ENRICH_CITATIONS_FAIL, citationError);
        }

        // 5. Save Assistant Message
        const assistantMessageData = { ...messageData, role: CHAT_ROLES.ASSISTANT, content: replyText, citations: enrichedCitations };
        await Message.create(assistantMessageData);

        if (scope === CHAT_SCOPES.FILE) revalidatePath(`/chat/${contextId}`);

        return {
            reply: replyText,
            citations: enrichedCitations
        };
    } catch (error) {
        console.error(LOG_MESSAGES.CHAT.ACTION_FAIL, error);
        return {
            reply: "",
            error: error instanceof Error ? error.message : MESSAGES.ERRORS.GENERIC_ERROR,
        };
    }
}, { rateLimit: RATE_LIMIT_CONFIG.CHAT });


export const getChatHistoryAction = withAuth(async (
    user,
    contextId: string,
    scope: ChatScopeType,
    before?: string, // ISO Date string
    limit: number = 50
): Promise<{ messages: ChatMessage[]; hasMore: boolean; error?: string }> => {
    try {
        const query: any = { scope };

        // Enforce Ownership Verification
        if (scope === CHAT_SCOPES.FILE) {
            const file = await FileModel.findOne({ _id: contextId, userId: user._id }).select("_id");
            if (!file) return { messages: [], hasMore: false, error: MESSAGES.ERRORS.ACCESS_DENIED };
            query.fileId = contextId;
        } else if (scope === CHAT_SCOPES.LIBRARY) {
            const lib = await Library.findOne({ _id: contextId, userId: user._id }).select("_id");
            if (!lib) return { messages: [], hasMore: false, error: MESSAGES.ERRORS.ACCESS_DENIED };
            query.libraryId = contextId;
        } else if (scope === CHAT_SCOPES.GLOBAL) {
            // Enforce User Isolation for Global Chat
            query.userId = user._id;
        }

        if (before) {
            query.createdAt = { $lt: new Date(before) };
        }

        const messages = await Message.find(query)
            .sort({ createdAt: -1 }) // Newest first
            .limit(limit + 1) // Fetch one extra to check hasMore
            .lean();

        const hasMore = messages.length > limit;
        const resultMessages = hasMore ? messages.slice(0, limit) : messages;

        // Reverse to return oldest first (chronological order for chat UI)
        return {
            messages: resultMessages.reverse().map(mapMessageToUi),
            hasMore,
        };
    } catch (error) {
        console.error(LOG_MESSAGES.CHAT.GET_HISTORY_FAIL, error);
        return { messages: [], hasMore: false };
    }
});

export type DeleteHistoryOptions =
    | { mode: "all" }
    | { mode: "range"; from: string; to: string }; // ISO Date strings

export const deleteChatHistoryAction = withAuth(async (
    user,
    contextId: string,
    scope: ChatScopeType,
    options: DeleteHistoryOptions
): Promise<{ success: boolean; error?: string }> => {
    try {
        const query: any = { scope };

        // Enforce Ownership Verification
        if (scope === CHAT_SCOPES.FILE) {
            const file = await FileModel.findOne({ _id: contextId, userId: user._id }).select("_id");
            if (!file) return { success: false, error: MESSAGES.ERRORS.ACCESS_DENIED };
            query.fileId = contextId;
        } else if (scope === CHAT_SCOPES.LIBRARY) {
            const lib = await Library.findOne({ _id: contextId, userId: user._id }).select("_id");
            if (!lib) return { success: false, error: MESSAGES.ERRORS.ACCESS_DENIED };
            query.libraryId = contextId;
        } else if (scope === CHAT_SCOPES.GLOBAL) {
            query.userId = user._id;
        }

        if (options.mode === "range") {
            const fromDate = new Date(options.from);
            const toDate = new Date(options.to);
            query.createdAt = {
                $gte: fromDate,
                $lte: toDate
            };
        }

        await Message.deleteMany(query);
        if (scope === CHAT_SCOPES.FILE) revalidatePath(`/chat/${contextId}`);
        // Can also revalidate /chat/global and /chat/library/[id] if paths known

        return { success: true };
    } catch (error) {
        console.error(LOG_MESSAGES.CHAT.DELETE_HISTORY_FAIL, error);
        return { success: false, error: MESSAGES.ERRORS.DELETE_HISTORY_FAILED };
    }
});
