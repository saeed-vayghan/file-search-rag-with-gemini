"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { formatCurrency } from "@/lib/utils";

interface MessageRendererProps {
    content: string;
    role: "user" | "assistant";
    cost?: number; // New
    tokens?: number; // New
}

/**
 * Smart message renderer that detects and renders:
 * - Markdown (headers, lists, tables, etc.)
 * - Code blocks with simple styling
 * - Citation badges [1], [2], etc.
 * - Plain text fallback
 * - Cost badges (if available)
 */
export function MessageRenderer({ content, role, cost, tokens }: MessageRendererProps) {
    // Detect if content is likely markdown
    const hasMarkdownSyntax = /(?:^|\n)#{1,6}\s|```|\*\*|__|\[.*?\]\(.*?\)|^\s*[-*+]\s|^\s*\d+\.\s/m.test(content);

    // For user messages, always render as plain text with citation badges
    if (role === "user") {
        return <div className="whitespace-pre-wrap">{renderCitationBadges(content)}</div>;
    }

    // For assistant messages, use markdown if detected
    const contentNode = hasMarkdownSyntax ? (
        <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    // Code blocks with simple styling (no syntax highlighting)
                    code({ className, children, ...props }: any) {
                        const isInline = !className;

                        return isInline ? (
                            <code className="bg-slate-800 px-1.5 py-0.5 rounded text-xs font-mono text-blue-300" {...props}>
                                {children}
                            </code>
                        ) : (
                            <pre className="bg-slate-800 rounded-md p-3 overflow-x-auto my-2 border border-slate-700">
                                <code className="text-sm font-mono text-slate-200" {...props}>
                                    {children}
                                </code>
                            </pre>
                        );
                    },
                    // Links - Open in new tab
                    a({ children, href, ...props }: any) {
                        return (
                            <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 underline"
                                {...props}
                            >
                                {children}
                            </a>
                        );
                    },
                    // Tables
                    table({ children, ...props }: any) {
                        return (
                            <div className="overflow-x-auto my-4">
                                <table className="min-w-full border-collapse border border-slate-700" {...props}>
                                    {children}
                                </table>
                            </div>
                        );
                    },
                    th({ children, ...props }: any) {
                        return (
                            <th className="border border-slate-700 px-3 py-2 bg-slate-800 text-left font-semibold" {...props}>
                                {children}
                            </th>
                        );
                    },
                    td({ children, ...props }: any) {
                        return (
                            <td className="border border-slate-700 px-3 py-2" {...props}>
                                {children}
                            </td>
                        );
                    },
                    // Lists
                    ul({ children, ...props }: any) {
                        return <ul className="list-disc list-inside my-2 space-y-1" {...props}>{children}</ul>;
                    },
                    ol({ children, ...props }: any) {
                        return <ol className="list-decimal list-inside my-2 space-y-1" {...props}>{children}</ol>;
                    },
                    // Headings
                    h1({ children, ...props }: any) {
                        return <h1 className="text-2xl font-bold mt-4 mb-2" {...props}>{children}</h1>;
                    },
                    h2({ children, ...props }: any) {
                        return <h2 className="text-xl font-bold mt-3 mb-2" {...props}>{children}</h2>;
                    },
                    h3({ children, ...props }: any) {
                        return <h3 className="text-lg font-semibold mt-2 mb-1" {...props}>{children}</h3>;
                    },
                    // Paragraphs
                    p({ children, ...props }: any) {
                        return <p className="my-2 leading-relaxed" {...props}>{children}</p>;
                    },
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    ) : (
        <div className="whitespace-pre-wrap leading-relaxed">{renderCitationBadges(content)}</div>
    );

    return (
        <div>
            {contentNode}
            {cost !== undefined && (
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-700/30">
                    <span className="text-[10px] text-slate-500 font-mono">
                        {formatCurrency(cost, 6)}
                    </span>
                    {tokens !== undefined && (
                        <span className="text-[10px] text-slate-600 font-mono">
                            ({tokens} toks)
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

/**
 * Helper function to render citation badges like [1], [2]
 */
function renderCitationBadges(text: string) {
    const parts = text.split(/(\\[.*?\\])/g);
    return parts.map((part, i) => {
        if (part.startsWith("[") && part.endsWith("]")) {
            return (
                <span
                    key={i}
                    className="inline-flex items-center justify-center rounded bg-blue-500/10 px-1.5 py-0.5 text-xs font-medium text-blue-400 mx-1 cursor-pointer hover:bg-blue-500/20 transition-colors"
                >
                    {part}
                </span>
            );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
    });
}
