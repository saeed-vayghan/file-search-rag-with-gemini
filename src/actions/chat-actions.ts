"use server";

import mongoose from "mongoose";

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
import UsageLog from "@/models/UsageLog";
import { calculateChatCost } from "@/lib/cost-calculator";

export type ChatMessage = {
    id?: string;
    role: ChatRoleType;
    content: string;
    citations?: { id: number; uri?: string; title?: string }[];
    cost?: number;
    tokens?: number;
    createdAt?: string;
};

export type DeleteHistoryOptions =
    | { mode: "all" }
    | { mode: "range"; from: string; to: string }; // ISO Date strings


/**
 * Validates and retrieves the Google Store ID for a user.
 */
async function getValidStoreId(userId: any): Promise<string> {
    const userWithStore = await User.findById(userId).populate("primaryStoreId");
    if (!userWithStore || !userWithStore.primaryStoreId) {
        throw new Error(MESSAGES.ERRORS.NO_STORE);
    }
    const googleStoreId = (userWithStore.primaryStoreId as any)?.googleStoreId;
    if (!googleStoreId) {
        throw new Error(MESSAGES.ERRORS.INVALID_STORE);
    }
    return googleStoreId;
}

/**
 * Persists a chat message toward the DB.
 */
async function persistMessage(data: {
    role: ChatRoleType;
    content: string;
    scope: ChatScopeType;
    userId: any;
    mode: ChatModeType;
    contextId: string;
    citations?: any[];
    cost?: number;
    tokens?: number;
}) {
    const messageData: any = {
        role: data.role,
        content: data.content,
        scope: data.scope,
        mode: data.mode,
        userId: data.userId,
        citations: data.citations,
        cost: data.cost,
        tokens: data.tokens,
    };
    if (data.scope === CHAT_SCOPES.FILE && data.contextId) {
        messageData.fileId = new mongoose.Types.ObjectId(data.contextId);
    }
    if (data.scope === CHAT_SCOPES.LIBRARY && data.contextId) {
        messageData.libraryId = new mongoose.Types.ObjectId(data.contextId);
    }

    return await Message.create(messageData);
}

/**
 * Enriches raw citations from Google with DB file display names.
 */
async function resolveCitations(citations: any[]) {
    if (!citations || citations.length === 0) return [];

    try {
        const googleFileIds = extractGoogleFileIdsFromCitations(citations);
        if (googleFileIds.length === 0) return citations;

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

        return enrichCitationsWithFileNames(citations, fileMap);
    } catch (error) {
        console.warn(LOG_MESSAGES.CHAT.ENRICH_CITATIONS_FAIL, error);
        return citations;
    }
}


export const sendMessageAction = withAuth(async (
    user,
    contextId: string,
    scope: ChatScopeType,
    history: ChatMessage[],
    newMessage: string,
    mode?: ChatModeType,
    modelName?: string
): Promise<{ reply: string; citations?: any[]; cost?: number; tokens?: number; error?: string }> => {
    try {
        let persistedUsage: { cost?: number; tokens?: number } | null = null;
        // 1. Validate Store
        const googleStoreId = await getValidStoreId(user._id);

        // 2. Resolve Mode & Instruction
        const requestedMode = mode || (user.settings?.defaultMode || CHAT_MODES.LIMITED) as ChatModeType;
        const systemInstruction = resolveSystemInstruction(user.settings, requestedMode);

        logChatRequest({ scope, contextId, chatMode: requestedMode, modelName, userMessage: newMessage, systemInstruction });

        // 3. Save User Message
        await persistMessage({
            role: CHAT_ROLES.USER,
            content: newMessage,
            scope,
            mode: requestedMode,
            userId: user._id,
            contextId
        });

        // 4. AIService RAG Search
        const result = await GoogleAIService.search(
            googleStoreId,
            newMessage,
            { type: scope, id: contextId },
            systemInstruction,
            modelName
        );
        const replyText = result.text || MESSAGES.INFO.NO_RELEVANT_INFO;

        // --- NEW: Cost Calculation & Logging ---
        if (result.usageMetadata) {
            const usage = result.usageMetadata;
            const searchCount = result.groundingMetadata?.webSearchQueries?.length || 0;
            const activeModel = modelName || "gemini-3-flash-preview"; // Default fallback

            const costData = calculateChatCost(
                activeModel,
                usage.promptTokenCount || 0,
                usage.candidatesTokenCount || 0,
                searchCount
            );

            // Fire and forget log
            UsageLog.create({
                userId: user._id,
                type: "chat",
                totalCost: costData.total,
                modelName: activeModel,
                tokens: {
                    input: usage.promptTokenCount || 0,
                    output: usage.candidatesTokenCount || 0,
                    total: usage.totalTokenCount || 0,
                },
                details: costData.details,
                meta: { searchCount },
                contextId
            }).catch(e => console.error(LOG_MESSAGES.CHAT.ACTION_FAIL + " (Cost Log)", e));

            persistedUsage = {
                cost: costData.total,
                tokens: usage.totalTokenCount || 0
            };
        }
        // ---------------------------------------

        logChatResponse({
            chatMode: requestedMode,
            replyLength: replyText.length,
            citationsCount: result.citations?.length || 0,
            replyPreview: replyText.substring(0, 100) + (replyText.length > 100 ? '...' : ''),
        });

        // 5. Enrich & Save Assistant Message (Single Point of Persistence)
        const enrichedCitations = await resolveCitations(result.citations || []);

        await persistMessage({
            role: CHAT_ROLES.ASSISTANT,
            content: replyText,
            scope,
            mode: requestedMode,
            userId: user._id,
            contextId,
            citations: enrichedCitations,
            cost: persistedUsage?.cost,
            tokens: persistedUsage?.tokens
        });

        if (scope === CHAT_SCOPES.FILE) revalidatePath(`/chat/${contextId}`);

        return {
            reply: replyText,
            citations: enrichedCitations,
            cost: persistedUsage?.cost,
            tokens: persistedUsage?.tokens
        };
    } catch (error: any) {
        console.error(LOG_MESSAGES.CHAT.ACTION_FAIL, error);
        return {
            reply: "",
            error: error.message || MESSAGES.ERRORS.GENERIC_ERROR,
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
