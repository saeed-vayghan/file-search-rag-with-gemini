"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MessageRendererProps {
    content: string;
    role: "user" | "assistant";
}

/**
 * Smart message renderer that detects and renders:
 * - Markdown (headers, lists, tables, etc.)
 * - Code blocks with simple styling
 * - Citation badges [1], [2], etc.
 * - Plain text fallback
 */
export function MessageRenderer({ content, role }: MessageRendererProps) {
    // Detect if content is likely markdown
    const hasMarkdownSyntax = /(?:^|\n)#{1,6}\s|```|\*\*|__|\[.*?\]\(.*?\)|^\s*[-*+]\s|^\s*\d+\.\s/m.test(content);

    // For user messages, always render as plain text with citation badges
    if (role === "user") {
        return <div className="whitespace-pre-wrap">{renderCitationBadges(content)}</div>;
    }

    // For assistant messages, use markdown if detected
    if (hasMarkdownSyntax) {
        return (
            <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                        // Code blocks with simple styling (no syntax highlighting)
                        code({ node, className, children, ...props }: any) {
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
                        a({ node, children, href, ...props }) {
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
                        table({ node, children, ...props }) {
                            return (
                                <div className="overflow-x-auto my-4">
                                    <table className="min-w-full border-collapse border border-slate-700" {...props}>
                                        {children}
                                    </table>
                                </div>
                            );
                        },
                        th({ node, children, ...props }) {
                            return (
                                <th className="border border-slate-700 px-3 py-2 bg-slate-800 text-left font-semibold" {...props}>
                                    {children}
                                </th>
                            );
                        },
                        td({ node, children, ...props }) {
                            return (
                                <td className="border border-slate-700 px-3 py-2" {...props}>
                                    {children}
                                </td>
                            );
                        },
                        // Lists
                        ul({ node, children, ...props }) {
                            return <ul className="list-disc list-inside my-2 space-y-1" {...props}>{children}</ul>;
                        },
                        ol({ node, children, ...props }) {
                            return <ol className="list-decimal list-inside my-2 space-y-1" {...props}>{children}</ol>;
                        },
                        // Headings
                        h1({ node, children, ...props }) {
                            return <h1 className="text-2xl font-bold mt-4 mb-2" {...props}>{children}</h1>;
                        },
                        h2({ node, children, ...props }) {
                            return <h2 className="text-xl font-bold mt-3 mb-2" {...props}>{children}</h2>;
                        },
                        h3({ node, children, ...props }) {
                            return <h3 className="text-lg font-semibold mt-2 mb-1" {...props}>{children}</h3>;
                        },
                        // Paragraphs
                        p({ node, children, ...props }) {
                            return <p className="my-2 leading-relaxed" {...props}>{children}</p>;
                        },
                    }}
                >
                    {content}
                </ReactMarkdown>
            </div>
        );
    }

    // Fallback to plain text with citation badges
    return <div className="whitespace-pre-wrap leading-relaxed">{renderCitationBadges(content)}</div>;
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
