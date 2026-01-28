"use client";

import { useState, useRef, useEffect, use } from "react";
import { Button } from "@/components/ui/button";
import { sendMessageAction, getChatHistoryAction, deleteChatHistoryAction, type ChatMessage } from "@/actions/chat-actions";
import { getFileAction } from "@/actions/file-actions";
import { ArrowLeft, Send, Paperclip, MoreVertical, Search, FileText, Loader2, Clock, HardDrive, CheckCircle, Download, Trash2, Calendar as CalendarIcon, Shield, Sparkles } from "lucide-react";
import { DeleteHistoryModal } from "@/components/chat/DeleteHistoryModal";
import { ChatCalendar } from "@/components/chat/ChatCalendar";
import { DateSeparator } from "@/components/chat/DateSeparator";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

type FileInfo = {
    id: string;
    displayName: string;
    type: string;
    size: string;
    status: string;
    date: string;
    mimeType: string;
} | null;

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
    const { t, dir } = useI18n();
    const { id: fileId } = use(params);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [fileInfo, setFileInfo] = useState<FileInfo>(null);
    const [loadingFile, setLoadingFile] = useState(true);
    const [activeTab, setActiveTab] = useState<"preview" | "info">("preview");
    const [hasMore, setHasMore] = useState(true);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [chatMode, setChatMode] = useState<"limited" | "auxiliary">("limited");

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = (smooth = true) => {
        messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Fetch chat history on mount
    useEffect(() => {
        async function loadHistory() {
            if (!fileId) return;
            // Clear current messages to prevent hydration mismatch if re-entering
            setMessages([]);
            const { messages: history, hasMore: more } = await getChatHistoryAction(fileId, "file");
            setMessages(history);
            setHasMore(more);
        }
        loadHistory();
    }, [fileId]);

    const loadMoreMessages = async () => {
        if (!hasMore || messages.length === 0) return;

        const oldestMessage = messages[0];
        // @ts-ignore
        const before = oldestMessage.createdAt;

        const { messages: olderMessages, hasMore: more } = await getChatHistoryAction(fileId, "file", before);

        if (olderMessages.length > 0) {
            setMessages(prev => [...olderMessages, ...prev]);
            setHasMore(more);
        } else {
            setHasMore(false);
        }
    };

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (e.currentTarget.scrollTop === 0 && hasMore) {
            const oldHeight = e.currentTarget.scrollHeight;
            loadMoreMessages().then(() => {
                // Restore scroll position roughly
                requestAnimationFrame(() => {
                    if (chatContainerRef.current) {
                        const newHeight = chatContainerRef.current.scrollHeight;
                        chatContainerRef.current.scrollTop = newHeight - oldHeight;
                    }
                });
            });
        }
    };

    const handleDateSelect = async (date: string) => {
        // Jump to date: Load messages before end of that day
        const targetDate = new Date(date);
        targetDate.setDate(targetDate.getDate() + 1); // Next day to include all of selected day
        const { messages: newMessages, hasMore: more } = await getChatHistoryAction(fileId, "file", targetDate.toISOString(), 50);
        setMessages(newMessages);
        setHasMore(more);
        // We might want to scroll to specific message here, but simpler is just loading context
    };

    // Fetch file info on mount
    useEffect(() => {
        async function loadFile() {
            setLoadingFile(true);
            const info = await getFileAction(fileId);
            setFileInfo(info);
            setLoadingFile(false);
        }
        loadFile();
    }, [fileId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = { role: "user", content: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const result = await sendMessageAction(fileId, "file", messages, input, chatMode);
            if (result.error) {
                setMessages((prev) => [
                    ...prev,
                    { role: "assistant", content: `${t.common.error}: ${result.error}` },
                ]);
            } else {
                setMessages((prev) => [
                    ...prev,
                    {
                        role: "assistant",
                        content: result.reply,
                        citations: result.citations
                    },
                ]);
            }
        } catch {
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: t.common.error },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-slate-950">
            {/* Header */}
            <header className="flex h-14 items-center gap-4 border-b border-border bg-slate-950 px-6 shrink-0">
                <Link href="/" className="text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft className={cn("h-4 w-4", dir === "rtl" && "rotate-180")} />
                </Link>
                <div className="h-6 w-px bg-border mx-2" />
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-blue-500">
                        <FileText className="h-4 w-4" />
                    </div>
                    <div>
                        <h1 className="text-sm font-medium text-slate-100 truncate max-w-[200px]">
                            {loadingFile ? t.common.loading : (fileInfo?.displayName || t.chat.defaultTitle)}
                        </h1>
                        <span className="text-[10px] text-slate-500">
                            {fileInfo ? `${fileInfo.type} • ${fileInfo.size}` : t.chat.defaultSubtitle}
                        </span>
                    </div>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <ChatCalendar onDateSelect={handleDateSelect} />
                    <Button variant="ghost" size="icon" onClick={() => setIsDeleteModalOpen(true)}>
                        <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-400 transition-colors" />
                    </Button>

                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel: File Preview */}
                <div className="w-[45%] border-r border-border bg-slate-900 flex flex-col hidden md:flex"> {/* Hidden on small screens if needed, otherwise standard */}
                    {loadingFile ? (
                        <div className="flex-1 flex items-center justify-center text-slate-600">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : fileInfo ? (
                        <>
                            {/* Tabs */}
                            <div className="flex border-b border-slate-800">
                                <button
                                    onClick={() => setActiveTab("preview")}
                                    className={cn(
                                        "flex-1 px-4 py-3 text-sm font-medium transition-colors",
                                        activeTab === "preview"
                                            ? "text-blue-400 border-b-2 border-blue-400 bg-slate-800/50"
                                            : "text-slate-500 hover:text-slate-300"
                                    )}
                                >
                                    {t.chat.preview}
                                </button>
                                <button
                                    onClick={() => setActiveTab("info")}
                                    className={cn(
                                        "flex-1 px-4 py-3 text-sm font-medium transition-colors",
                                        activeTab === "info"
                                            ? "text-blue-400 border-b-2 border-blue-400 bg-slate-800/50"
                                            : "text-slate-500 hover:text-slate-300"
                                    )}
                                >
                                    {t.chat.info}
                                </button>
                            </div>

                            {/* Tab Content */}
                            {activeTab === "preview" ? (
                                <div className="flex-1 relative">
                                    {fileInfo.mimeType === "application/pdf" ? (
                                        <iframe
                                            src={`/api/files/${fileId}`}
                                            className="absolute inset-0 w-full h-full"
                                            title={fileInfo.displayName}
                                        />
                                    ) : fileInfo.mimeType.startsWith("text/") ? (
                                        <iframe
                                            src={`/api/files/${fileId}`}
                                            className="absolute inset-0 w-full h-full bg-white"
                                            title={fileInfo.displayName}
                                        />
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center p-6 text-slate-500">
                                            <FileText className="h-16 w-16 mb-4 opacity-50" />
                                            <p className="text-lg font-medium mb-2">{fileInfo.displayName}</p>
                                            <p className="text-sm text-slate-600 mb-4">{fileInfo.mimeType}</p>
                                            <a
                                                href={`/api/files/${fileId}`}
                                                download={fileInfo.displayName}
                                                className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                                            >
                                                <Download className={cn("h-4 w-4 mr-2", dir === "rtl" && "ml-2 mr-0")} />
                                                {t.chat.download}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="p-6 space-y-6 overflow-y-auto">
                                    {/* File Header */}
                                    <div className="flex items-start gap-4">
                                        <div className="h-16 w-16 rounded-lg bg-slate-800 flex items-center justify-center text-blue-500">
                                            <FileText className="h-8 w-8" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h2 className="text-lg font-medium text-slate-100 truncate">{fileInfo.displayName}</h2>
                                            <p className="text-sm text-slate-500">{fileInfo.mimeType}</p>
                                        </div>
                                    </div>

                                    {/* File Details */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-800/50 rounded-lg p-4">
                                            <div className="flex items-center gap-2 text-slate-500 mb-1">
                                                <HardDrive className="h-4 w-4" />
                                                <span className="text-xs">{t.chat.size}</span>
                                            </div>
                                            <p className="text-lg font-medium text-slate-200">{fileInfo.size}</p>
                                        </div>
                                        <div className="bg-slate-800/50 rounded-lg p-4">
                                            <div className="flex items-center gap-2 text-slate-500 mb-1">
                                                <Clock className="h-4 w-4" />
                                                <span className="text-xs">{t.chat.uploaded}</span>
                                            </div>
                                            <p className="text-lg font-medium text-slate-200">{fileInfo.date}</p>
                                        </div>
                                    </div>

                                    {/* Status */}
                                    <div className="bg-slate-800/50 rounded-lg p-4">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className={cn(
                                                "h-5 w-5",
                                                fileInfo.status === "ACTIVE" ? "text-emerald-500" : "text-yellow-500"
                                            )} />
                                            <div>
                                                <p className="text-sm font-medium text-slate-200">
                                                    {fileInfo.status === "ACTIVE" ? t.chat.readyForSearch : t.chat.processing}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {fileInfo.status === "ACTIVE"
                                                        ? t.chat.indexedSearchable
                                                        : t.chat.ingestionInProgress}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tips */}
                                    <div className="pt-4 border-t border-slate-800">
                                        <p className="text-sm text-slate-500">
                                            💡 <strong>{t.chat.info}:</strong> {t.chat.tip}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
                            <FileText className="h-12 w-12 mb-4 opacity-50" />
                            <p className="font-medium">{t.chat.fileNotFound}</p>
                            <Link href="/" className="text-blue-500 text-sm mt-2 hover:underline">
                                {t.chat.returnDashboard}
                            </Link>
                        </div>
                    )}
                </div>

                {/* Right Panel: Chat Interface */}
                <div className="flex-1 flex flex-col bg-slate-950 relative border-l border-border md:border-l-0">
                    {/* Chat History */}
                    <div
                        className="flex-1 overflow-y-auto p-6 space-y-6"
                        ref={chatContainerRef}
                        onScroll={handleScroll}
                    >
                        {isLoading && hasMore && (
                            <div className="flex justify-center py-2">
                                <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                            </div>
                        )}
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-slate-500">
                                <FileText className="h-12 w-12 mb-4 opacity-50" />
                                <p className="text-sm">{t.chat.startPrompt}</p>
                            </div>
                        )}
                        {messages.map((msg, idx) => {
                            const showDateSeparator = idx === 0 ||
                                (messages[idx - 1].createdAt && msg.createdAt &&
                                    new Date(messages[idx - 1].createdAt!).toDateString() !== new Date(msg.createdAt).toDateString());

                            return (
                                <div key={idx}>
                                    {showDateSeparator && msg.createdAt && (
                                        <DateSeparator date={msg.createdAt} />
                                    )}
                                    <div className={cn("flex gap-4 max-w-3xl mx-auto", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
                                        <div className={cn(
                                            "flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold",
                                            msg.role === "user" ? "bg-blue-600 text-white" : "bg-slate-800 text-blue-500"
                                        )}>
                                            {msg.role === "user" ? "S" : "AI"}
                                        </div>
                                        <div className={cn(
                                            "rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap max-w-[80%]",
                                            msg.role === "user"
                                                ? "bg-blue-600 text-white"
                                                : "bg-slate-900 border border-slate-800 text-slate-200"
                                        )}>
                                            {renderMessageWithCitations(msg.content)}

                                            {/* Citations Block */}
                                            {msg.citations && msg.citations.length > 0 && (
                                                <div className="mt-3 pt-3 border-t border-slate-700/50">
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        <p className="text-[10px] uppercase font-bold text-slate-500">{t.chat.sources || "Sources"}</p>
                                                        <span className="text-[10px] text-slate-600" title="Citations reference internal file segments">(IDs refer to file segments)</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {msg.citations.map((cit, i) => (
                                                            <a
                                                                key={i}
                                                                href={cit.uri}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-blue-400 transition-colors border border-slate-700"
                                                            >
                                                                <span className="font-mono text-[10px] opacity-70">[{i + 1}]</span>
                                                                {/* In single file chat, title is redundant, so we hide it or show minimal text if it's different */}
                                                                {cit.title && cit.title !== fileInfo?.displayName && (
                                                                    <span className="truncate max-w-[150px]">{cit.title}</span>
                                                                )}
                                                            </a>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {isLoading && (
                            <div className="flex gap-4 max-w-3xl mx-auto">
                                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-blue-500">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                </div>
                                <div className="rounded-lg p-4 text-sm bg-slate-900 border border-slate-800 text-slate-400">
                                    {t.chat.searching}
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-slate-950">
                        {/* Mode Selector */}
                        <div className="max-w-3xl mx-auto mb-2 flex justify-end">
                            <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setChatMode("limited")}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                                        chatMode === "limited"
                                            ? "bg-slate-800 text-blue-400 shadow-sm"
                                            : "text-slate-500 hover:text-slate-300"
                                    )}
                                    title={t.chat?.modeLimited || "Limited: Answers only from context"}
                                >
                                    <Shield className="h-3.5 w-3.5" />
                                    <span>Limited</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setChatMode("auxiliary")}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                                        chatMode === "auxiliary"
                                            ? "bg-slate-800 text-purple-400 shadow-sm"
                                            : "text-slate-500 hover:text-slate-300"
                                    )}
                                    title={t.chat?.modeAuxiliary || "Auxiliary: Expands with general knowledge"}
                                >
                                    <Sparkles className="h-3.5 w-3.5" />
                                    <span>Auxiliary</span>
                                </button>
                            </div>
                        </div>

                        <div className="max-w-3xl mx-auto relative flex items-end border border-input rounded-md bg-transparent focus-within:ring-1 focus-within:ring-blue-500/50 transition-all">
                            <div className="flex h-[52px] items-center px-2">
                                <Button type="button" variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                                    <Paperclip className="h-4 w-4" />
                                </Button>
                            </div>
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                className={cn(
                                    "flex h-[52px] w-full rounded-md bg-transparent border-0 px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50",
                                    dir === "rtl" && "text-right"
                                )}
                                placeholder={t.chat.placeholder}
                                disabled={isLoading}
                            />
                            <div className="flex h-[52px] items-center px-2">
                                <Button
                                    type="submit"
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700 h-8 w-8 p-0 rounded-full"
                                    disabled={isLoading || !input.trim()}
                                >
                                    <Send className={cn("h-4 w-4", dir === "rtl" && "rotate-180")} />
                                </Button>
                            </div>
                        </div>
                        <div className="text-center mt-2">
                            <span className="text-[10px] text-slate-500">{t.chat.warning}</span>
                        </div>
                    </form>
                </div>
            </div>


            <DeleteHistoryModal
                fileId={fileId}
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onDeleted={() => setMessages([])}
            />
        </div >
    );
}

function renderMessageWithCitations(content: string) {
    const parts = content.split(/(\[.*?\])/g);
    return parts.map((part, i) => {
        if (part.startsWith("[") && part.endsWith("]")) {
            return (
                <span key={i} className="inline-flex items-center justify-center rounded bg-blue-500/10 px-1.5 py-0.5 text-xs font-medium text-blue-400 mx-1 cursor-pointer hover:bg-blue-500/20 transition-colors">
                    {part}
                </span>
            );
        }
        return part;
    });
}
