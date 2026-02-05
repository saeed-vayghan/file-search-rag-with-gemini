"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { MESSAGES } from "@/config/constants";

export interface Toast {
    id: string;
    title?: string;
    description?: string;
    type?: "success" | "error" | "info" | "warning";
    duration?: number;
}

interface ToastContextType {
    toasts: Toast[];
    toast: (props: Omit<Toast, "id">) => void;
    dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const toast = (props: Omit<Toast, "id">) => {
        const id = crypto.randomUUID();
        const newToast = { id, ...props };
        setToasts((prev) => [...prev, newToast]);

        if (props.duration !== Infinity) {
            setTimeout(() => {
                dismiss(id);
            }, props.duration || 5000);
        }
    };

    const dismiss = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ toasts, toast, dismiss }}>
            {children}
            <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-[350px] pointer-events-none">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={cn(
                            "pointer-events-auto flex items-start w-full rounded-lg border shadow-lg p-4 transition-all animate-in slide-in-from-right-full fade-in duration-300 gap-3",
                            t.type === "success" && "bg-emerald-950/90 border-emerald-900 text-emerald-50",
                            t.type === "error" && "bg-red-950/90 border-red-900 text-red-50",
                            t.type === "warning" && "bg-amber-950/90 border-amber-900 text-amber-50",
                            (!t.type || t.type === "info") && "bg-slate-900/90 border-slate-800 text-slate-50",
                            // RTL Support helper
                            "rtl:left-4 rtl:right-auto rtl:slide-in-from-left-full"
                        )}
                        role="alert"
                    >
                        <div className="flex-shrink-0 mt-0.5">
                            {t.type === "success" && <CheckCircle className="h-5 w-5 text-emerald-400" />}
                            {t.type === "error" && <AlertCircle className="h-5 w-5 text-red-400" />}
                            {t.type === "warning" && <AlertTriangle className="h-5 w-5 text-amber-400" />}
                            {(!t.type || t.type === "info") && <Info className="h-5 w-5 text-blue-400" />}
                        </div>
                        <div className="flex-1">
                            {t.title && <h4 className="font-semibold text-sm">{t.title}</h4>}
                            {t.description && <p className="text-sm opacity-90 mt-1">{t.description}</p>}
                        </div>
                        <button
                            onClick={() => dismiss(t.id)}
                            className="flex-shrink-0 text-white/50 hover:text-white transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error(MESSAGES.ERRORS.USE_TOAST_CONTEXT);
    }
    return context;
}
