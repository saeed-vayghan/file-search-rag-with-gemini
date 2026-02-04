"use server";

import connectToDatabase from "@/lib/db";
import User from "@/models/User";
import FileModel from "@/models/File";
import Library from "@/models/Library";
import { GoogleAIService } from "@/lib/google-ai";
import { logChatRequest, logChatResponse, logDebug } from "@/lib/logger";
import { withAuth } from "@/lib/auth-middleware";
import Message from "@/models/Message";
import { revalidatePath } from "next/cache";

export type ChatMessage = {
    id?: string;
    role: "user" | "assistant";
    content: string;
    citations?: { id: number; uri?: string; title?: string }[];
    createdAt?: string;
};

export const sendMessageAction = withAuth(async (
    user,
    contextId: string,
    scope: "file" | "library" | "global",
    history: ChatMessage[],
    newMessage: string,
    mode?: "limited" | "auxiliary"
): Promise<{ reply: string; citations?: any[]; error?: string }> => {
    await connectToDatabase();

    try {
        // User already authenticated, get populated store
        const userWithStore = await User.findById(user._id).populate("primaryStoreId");

        if (!userWithStore || !userWithStore.primaryStoreId) {
            return {
                reply: "",
                error: "No document store found. Please upload a document first.",
            };
        }

        // Access the populated Store document
        // @ts-ignore
        const googleStoreId = userWithStore.primaryStoreId.googleStoreId;

        if (!googleStoreId) {
            return {
                reply: "",
                error: "Store record is invalid (missing Google ID).",
            };
        }

        // 2. Determine Chat Mode & Instruction
        const defaultMode = (user.settings?.defaultMode || "limited") as "limited" | "auxiliary";
        const requestedMode = mode || defaultMode;

        // Define default instructions as fallback
        const DEFAULT_LIMITED = "Answer ONLY using the provided context. Do not use outside knowledge. If the answer is not found, say so.";
        const DEFAULT_AUXILIARY = "Use the provided context as a primary source, but feel free to expand with your general knowledge to provide a helpful answer.";

        let systemInstruction: string;
        if (requestedMode === "limited") {
            systemInstruction = user.settings?.chatModes?.limited?.instruction || DEFAULT_LIMITED;
        } else {
            systemInstruction = user.settings?.chatModes?.auxiliary?.instruction || DEFAULT_AUXILIARY;
        }

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
            role: "user",
            content: newMessage,
            scope,
            mode: requestedMode,
            userId: user._id,
        };
        if (scope === "file") messageData.fileId = contextId;
        if (scope === "library") messageData.libraryId = contextId;
        // Global scope has no specific ID (or userId implicitly)

        await Message.create(messageData);

        // 4. Perform RAG Search (Scoped)
        const result = await GoogleAIService.search(
            googleStoreId,
            newMessage,
            { type: scope, id: contextId },
            systemInstruction
        );
        const replyText = result.text || "I couldn't find relevant information in your documents.";

        // Log chat response details
        logChatResponse({
            chatMode: requestedMode,
            replyLength: replyText.length,
            citationsCount: result.citations?.length || 0,
            replyPreview: replyText.substring(0, 100) + (replyText.length > 100 ? '...' : ''),
        });

        // 4.5 Resolve Citations (Map Google File ID -> Display Name)
        let enrichedCitations = result.citations || [];
        try {
            if (enrichedCitations.length > 0) {
                // citation.title is currently the Google ID (e.g. "files/abc...") or a generic title
                // We want to replace it with the actual file displayName from our DB.

                // 1. Extract potential File IDs from citations
                // The API usually returns the file ID as the title OR part of the URI
                const googleFileIds = enrichedCitations
                    .map((c: any) => c.title)
                    .filter((t: string) => t && (t.startsWith("files/") || t.length > 20)); // Basic heuristic

                logDebug("Chat", "Extracted IDs:", googleFileIds);

                if (googleFileIds.length > 0) {
                    // 2. Find matching files in DB
                    // We need to match on googleFileId OR clean ID
                    const files = await FileModel.find({
                        $or: [
                            { googleFileId: { $in: googleFileIds } },
                            // Also try matching without "files/" prefix just in case
                            { googleFileId: { $in: googleFileIds.map((id: string) => `files/${id}`) } }
                        ]
                    }).select("googleFileId displayName localPath").lean();

                    logDebug("Chat", "Found Files:", files.map(f => `${f.googleFileId} -> ${f.displayName}`));

                    // 3. Create a Map
                    const fileMap = new Map();
                    files.forEach(f => {
                        if (f.googleFileId) fileMap.set(f.googleFileId, f);
                        if (f.googleFileId) fileMap.set(f.googleFileId.replace("files/", ""), f);
                    });

                    // 4. Update Citations
                    enrichedCitations = enrichedCitations.map((c: any) => {
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
                    logDebug("Chat", "Enriched Citations:", JSON.stringify(enrichedCitations, null, 2));
                }
            }
        } catch (citationError) {
            console.warn("Failed to enrich citations:", citationError);
            // Fallback to original citations if mapping fails
        }

        // 5. Save Assistant Message with Citations
        const assistantMessageData = { ...messageData, role: "assistant", content: replyText, citations: enrichedCitations };
        await Message.create(assistantMessageData);

        // Revalidate cache
        if (scope === "file") revalidatePath(`/chat/${contextId}`);
        // TODO: Revalidate library/global paths when created

        return {
            reply: replyText,
            // @ts-ignore
            citations: enrichedCitations
        };
    } catch (error) {
        console.error("Chat Action Failed:", error);
        return {
            reply: "",
            error: error instanceof Error ? error.message : "Failed to process your question. Please try again.",
        };
    }
});



export const getChatHistoryAction = withAuth(async (
    user,
    contextId: string,
    scope: "file" | "library" | "global",
    before?: string, // ISO Date string
    limit: number = 50
): Promise<{ messages: ChatMessage[]; hasMore: boolean; error?: string }> => {
    await connectToDatabase();
    try {
        const query: any = { scope };

        // Enforce Ownership Verification
        if (scope === "file") {
            const file = await FileModel.findOne({ _id: contextId, userId: user._id }).select("_id");
            if (!file) return { messages: [], hasMore: false, error: "Access denied" };
            query.fileId = contextId;
        } else if (scope === "library") {
            const lib = await Library.findOne({ _id: contextId, userId: user._id }).select("_id");
            if (!lib) return { messages: [], hasMore: false, error: "Access denied" };
            query.libraryId = contextId;
        } else if (scope === "global") {
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
            messages: resultMessages.reverse().map((m: any) => ({
                id: m._id.toString(),
                role: m.role as "user" | "assistant",
                content: m.content,
                citations: m.citations?.map((c: any) => ({
                    id: c.id,
                    uri: c.uri,
                    title: c.title
                })),
                createdAt: m.createdAt.toISOString(),
            })),
            hasMore,
        };
    } catch (error) {
        console.error("Get History Failed:", error);
        return { messages: [], hasMore: false };
    }
});

export type DeleteHistoryOptions =
    | { mode: "all" }
    | { mode: "range"; from: string; to: string }; // ISO Date strings

export const deleteChatHistoryAction = withAuth(async (
    user,
    contextId: string,
    scope: "file" | "library" | "global",
    options: DeleteHistoryOptions
): Promise<{ success: boolean; error?: string }> => {
    await connectToDatabase();
    try {
        const query: any = { scope };

        // Enforce Ownership Verification
        if (scope === "file") {
            const file = await FileModel.findOne({ _id: contextId, userId: user._id }).select("_id");
            if (!file) return { success: false, error: "Access denied" };
            query.fileId = contextId;
        } else if (scope === "library") {
            const lib = await Library.findOne({ _id: contextId, userId: user._id }).select("_id");
            if (!lib) return { success: false, error: "Access denied" };
            query.libraryId = contextId;
        } else if (scope === "global") {
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
        if (scope === "file") revalidatePath(`/chat/${contextId}`);
        // Can also revalidate /chat/global and /chat/library/[id] if paths known

        return { success: true };
    } catch (error) {
        console.error("Delete History Failed:", error);
        return { success: false, error: "Failed to delete history" };
    }
});
