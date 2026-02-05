import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, Check, Info } from "lucide-react";

type ModelOption = {
    model: string;
    indexing_hint?: string;
    query_hint?: string;
};

interface ModelSelectorProps {
    label: string;
    models: ModelOption[];
    selectedModel: string;
    onSelect: (model: string) => void;
    hintKey?: "indexing_hint" | "query_hint";
    disabled?: boolean;
    className?: string;
}

export function ModelSelector({
    label,
    models,
    selectedModel,
    onSelect,
    hintKey = "indexing_hint",
    disabled = false,
    className
}: ModelSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState<"bottom" | "top">("bottom");
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Smart positioning logic
    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            const dropdownHeight = 200; // Approximate max height

            // Prefer bottom if space is available, otherwise top
            // Prefer bottom if space is available, otherwise top
            if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
                setTimeout(() => setDropdownPosition("top"), 0);
            } else {
                setTimeout(() => setDropdownPosition("bottom"), 0);
            }
        }
    }, [isOpen]);

    const handleSelect = (model: string) => {
        onSelect(model);
        setIsOpen(false);
    };

    return (
        <div className={cn("space-y-1 relative", className)} ref={dropdownRef}>
            {label && <label className="text-xs text-slate-500 block mb-1">{label}</label>}

            <div className="relative">
                <button
                    ref={buttonRef}
                    type="button"
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    disabled={disabled}
                    className={cn(
                        "w-full flex items-center justify-between bg-slate-800 border border-slate-700 text-slate-200 text-xs h-9 pl-3 pr-3 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-colors",
                        disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-750 cursor-pointer"
                    )}
                >
                    <span className="truncate">{selectedModel}</span>
                    <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", isOpen && "rotate-180")} />
                </button>

                {isOpen && (
                    <div className={cn(
                        "absolute left-0 right-0 z-50 bg-slate-800 border border-slate-700 rounded-md shadow-xl animate-in fade-in zoom-in-95 duration-100",
                        dropdownPosition === "bottom" ? "top-full mt-1" : "bottom-full mb-1"
                    )}>
                        <div className="py-1">
                            {models.map((m) => {
                                const hint = m[hintKey];
                                const isSelected = m.model === selectedModel;

                                return (
                                    <div
                                        key={m.model}
                                        className={cn(
                                            "group flex items-center justify-between px-3 py-2 text-xs cursor-pointer transition-colors",
                                            isSelected ? "bg-blue-600/10 text-blue-400" : "text-slate-200 hover:bg-slate-700"
                                        )}
                                        onClick={() => handleSelect(m.model)}
                                    >
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <span className="truncate">{m.model}</span>
                                            {isSelected && <Check className="h-3 w-3 shrink-0" />}
                                        </div>

                                        {hint && (
                                            <div className="relative flex items-center group/info ml-2">
                                                <Info className="h-3.5 w-3.5 text-slate-500 hover:text-slate-300 transition-colors" />

                                                {/* Tooltip */}
                                                <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-slate-900 border border-slate-700 rounded-md shadow-2xl text-xs text-slate-300 pointer-events-none opacity-0 group-hover/info:opacity-100 transition-opacity z-[60]">
                                                    {hint}
                                                    {/* Arrow */}
                                                    <div className="absolute -bottom-1 right-1.5 w-2 h-2 bg-slate-900 border-b border-l border-slate-700 transform -rotate-45"></div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
