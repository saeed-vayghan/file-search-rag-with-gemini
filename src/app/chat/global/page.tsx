"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { sendMessageAction, getChatHistoryAction, deleteChatHistoryAction, type ChatMessage } from "@/actions/chat-actions";
import { getLibrariesAction } from "@/actions/file-actions";
import { ArrowLeft, Send, Paperclip, Trash2, Globe, Loader2, ChevronDown, FolderOpen, Check, Shield, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { DateSeparator } from "@/components/chat/DateSeparator";
import { DeleteHistoryModal } from "@/components/chat/DeleteHistoryModal";
import { MessageRenderer } from "@/components/chat/MessageRenderer";
import { CopyButton } from "@/components/chat/CopyButton";

export default function GlobalChatPage() {
    const { t, dir } = useI18n();
    const router = useRouter();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [chatMode, setChatMode] = useState<"limited" | "auxiliary">("limited");

    // Scope Selector State
    const [isScopeOpen, setIsScopeOpen] = useState(false);
    const [libraries, setLibraries] = useState<{ id: string, name: string, icon: string }[]>([]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = (smooth = true) => {
        messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Fetch libraries and history on mount
    useEffect(() => {
        async function init() {
            setMessages([]);
            // Load History
            // Load History
            const histRes = await getChatHistoryAction("global", "global");
            if (!('error' in histRes) && 'messages' in histRes) {
                setMessages(histRes.messages);
                setHasMore(histRes.hasMore);
            }

            // Load Libraries for Selector
            const libs = await getLibrariesAction();
            if (!("error" in libs)) {
                setLibraries(libs);
            }
        }
        init();
    }, []);

    const loadMoreMessages = async () => {
        if (!hasMore || messages.length === 0) return;

        const oldestMessage = messages[0];
        // @ts-ignore
        const before = oldestMessage.createdAt;

        const histRes = await getChatHistoryAction("global", "global", before);

        if (!('error' in histRes)) {
            if (histRes.messages.length > 0) {
                setMessages(prev => [...histRes.messages, ...prev]);
                setHasMore(histRes.hasMore);
            } else {
                setHasMore(false);
            }
        }
    };

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (e.currentTarget.scrollTop === 0 && hasMore) {
            const oldHeight = e.currentTarget.scrollHeight;
            loadMoreMessages().then(() => {
                requestAnimationFrame(() => {
                    if (chatContainerRef.current) {
                        const newHeight = chatContainerRef.current.scrollHeight;
                        chatContainerRef.current.scrollTop = newHeight - oldHeight;
                    }
                });
            });
        }
    };

    const handleScopeSelect = (scope: 'global' | string) => {
        setIsScopeOpen(false);
        if (scope === 'global') {
            // Already here
            return;
        }
        // Redirect to Library Chat
        router.push(`/chat/library/${scope}`);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = { role: "user", content: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const result = await sendMessageAction("global", "global", messages, input, chatMode);

            if (!("reply" in result) || !result.reply) {
                // Auth failure or complete error
                setMessages((prev) => [
                    ...prev,
                    { role: "assistant", content: `${t.common.error}: ${result.error || "Unknown error"}` },
                ]);
            } else {
                // Success
                if (result.error) {
                    toast.error(result.error);
                }
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

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-slate-950">
            {/* Header */}
            <header className="flex h-14 items-center gap-4 border-b border-border bg-slate-950 px-6 shrink-0 relative z-20">
                <Link href="/" className="text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft className={cn("h-4 w-4", dir === "rtl" && "rotate-180")} />
                </Link>
                <div className="h-6 w-px bg-border mx-2" />

                {/* Scope Selector */}
                <div className="relative">
                    <button
                        onClick={() => setIsScopeOpen(!isScopeOpen)}
                        className="flex items-center gap-2 hover:bg-slate-900 pr-3 pl-2 py-1 rounded transition-colors group"
                    >
                        <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-purple-500">
                            <Globe className="h-4 w-4" />
                        </div>
                        <div className="text-left">
                            <h1 className="text-sm font-medium text-slate-100 flex items-center gap-1 group-hover:text-blue-400 transition-colors">
                                Global Search <ChevronDown className="h-3 w-3 opacity-50" />
                            </h1>
                            <span className="text-[10px] text-slate-500">Searching all files</span>
                        </div>
                    </button>

                    {/* Dropdown */}
                    {isScopeOpen && (
                        <>
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setIsScopeOpen(false)}
                            />
                            <div className="absolute top-full left-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-lg shadow-xl overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-100">
                                <div className="p-1">
                                    <h3 className="text-[10px] uppercase font-bold text-slate-500 px-3 py-2">Select Scope</h3>

                                    {/* Global Option */}
                                    <button
                                        onClick={() => handleScopeSelect('global')}
                                        className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm text-slate-200 bg-slate-800/50 hover:bg-slate-800 transition-colors rounded-sm mb-1"
                                    >
                                        <div className="h-6 w-6 rounded bg-purple-500/20 flex items-center justify-center text-purple-400">
                                            <Globe className="h-3 w-3" />
                                        </div>
                                        <span className="flex-1">Global (All Files)</span>
                                        <Check className="h-3 w-3 text-purple-500" />
                                    </button>

                                    {/* Library Options */}
                                    <div className="max-h-[300px] overflow-y-auto space-y-0.5">
                                        {libraries.map(lib => (
                                            <button
                                                key={lib.id}
                                                onClick={() => handleScopeSelect(lib.id)}
                                                className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors rounded-sm"
                                            >
                                                <div className="h-6 w-6 rounded bg-slate-800 flex items-center justify-center">
                                                    <span className="text-xs">{lib.icon}</span>
                                                </div>
                                                <span className="flex-1 truncate">{lib.name}</span>
                                            </button>
                                        ))}
                                        {libraries.length === 0 && (
                                            <div className="px-3 py-2 text-xs text-slate-500 italic">
                                                No libraries found
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="ml-auto">
                    <Button variant="ghost" size="icon" onClick={() => setIsDeleteModalOpen(true)}>
                        <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-400 transition-colors" />
                    </Button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 flex flex-col bg-slate-950 relative">
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
                                <Globe className="h-16 w-16 mb-4 opacity-20" />
                                <p className="text-lg font-medium mb-2">Global Knowledge Base</p>
                                <p className="text-sm">Ask a question across all your libraries and files.</p>
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
                                            msg.role === "user" ? "bg-blue-600 text-white" : "bg-purple-600/20 text-purple-400"
                                        )}>
                                            {msg.role === "user" ? "S" : "AI"}
                                        </div>
                                        <div className={cn(
                                            "rounded-lg p-4 pr-10 text-sm leading-relaxed max-w-[80%] relative",
                                            msg.role === "user"
                                                ? "bg-blue-600 text-white"
                                                : "bg-slate-900 border border-slate-800 text-slate-200"
                                        )}>
                                            <div className="absolute top-2 right-2">
                                                <CopyButton content={msg.content} />
                                            </div>
                                            <MessageRenderer content={msg.content} role={msg.role} />
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
                                                                <span className="truncate max-w-[150px]">{cit.title || "Document Chunk"}</span>
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
                                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-purple-500">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                </div>
                                <div className="rounded-lg p-4 text-sm bg-slate-900 border border-slate-800 text-slate-400">
                                    Searching entire knowledge base...
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
                        <div className="max-w-3xl mx-auto relative flex items-end border border-input rounded-md bg-transparent focus-within:ring-1 focus-within:ring-purple-500/50 transition-all">
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
                                    "flex h-[52px] w-full rounded-md bg-transparent border-0 px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0",
                                    dir === "rtl" && "text-right"
                                )}
                                placeholder="Ask about any document..."
                                disabled={isLoading}
                            />
                            <div className="flex h-[52px] items-center px-2">
                                <Button
                                    type="submit"
                                    size="sm"
                                    className="bg-purple-600 hover:bg-purple-700 h-8 w-8 p-0 rounded-full"
                                    disabled={isLoading || !input.trim()}
                                >
                                    <Send className={cn("h-4 w-4", dir === "rtl" && "rotate-180")} />
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            <DeleteHistoryModal
                fileId="global"
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onDeleted={() => setMessages([])}
            />
        </div>
    );
}
