"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
    content: string;
    className?: string;
}

/**
 * Copy button with visual feedback for chat messages
 */
export function CopyButton({ content, className }: CopyButtonProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    return (
        <button
            onClick={handleCopy}
            className={cn(
                "p-1.5 rounded hover:bg-slate-700/50 transition-all duration-200",
                "text-slate-400 hover:text-slate-200",
                copied && "text-green-400",
                className
            )}
            title={copied ? "Copied!" : "Copy to clipboard"}
        >
            {copied ? (
                <Check className="h-3.5 w-3.5" />
            ) : (
                <Copy className="h-3.5 w-3.5" />
            )}
        </button>
    );
}
