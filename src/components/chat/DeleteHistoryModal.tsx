"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Trash2, Loader2, X } from "lucide-react";
import { deleteChatHistoryAction } from "@/actions/chat-actions";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { LOG_MESSAGES } from "@/config/constants";

interface DeleteHistoryModalProps {
    fileId: string;
    isOpen: boolean;
    onClose: () => void;
    onDeleted: () => void;
}

export function DeleteHistoryModal({ fileId, isOpen, onClose, onDeleted }: DeleteHistoryModalProps) {
    const { t, dir } = useI18n();
    const [isLoading, setIsLoading] = useState(false);
    const [mode, setMode] = useState<"all" | "range">("all");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    const handleDelete = async () => {
        if (mode === "range" && (!fromDate || !toDate)) return;

        setIsLoading(true);
        try {
            await deleteChatHistoryAction(fileId, "file",
                mode === "all"
                    ? { mode: "all" }
                    : { mode: "range", from: fromDate, to: toDate }
            );
            onDeleted();
            onClose();
        } catch (error) {
            console.error(LOG_MESSAGES.UI.DELETE_FAIL, error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b border-slate-800">
                    <h2 className="text-lg font-medium flex items-center gap-2 text-red-500">
                        <Trash2 className="h-5 w-5" />
                        {t.chat && t.chat.deleteHistory ? t.chat.deleteHistory : "Delete History"}
                    </h2>
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <div className="p-4 space-y-4">
                    <p className="text-sm text-slate-400">
                        Permanently remove chat messages from your history.
                    </p>

                    <div className="flex gap-4">
                        <Button
                            variant={mode === "all" ? "default" : "outline"}
                            onClick={() => setMode("all")}
                            className={cn("flex-1", mode === "all" ? "bg-red-600 hover:bg-red-700 text-white border-0" : "")}
                        >
                            Delete All
                        </Button>
                        <Button
                            variant={mode === "range" ? "default" : "outline"}
                            onClick={() => setMode("range")}
                            className={cn("flex-1", mode === "range" ? "bg-blue-600 hover:bg-blue-700 text-white border-0" : "")}
                        >
                            Select Range
                        </Button>
                    </div>

                    {mode === "range" && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-400">From</label>
                                <Input
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className="bg-slate-950"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-400">To</label>
                                <Input
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    className="bg-slate-950"
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 p-4 bg-slate-950/50">
                    <Button variant="ghost" onClick={onClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        className="bg-red-600 hover:bg-red-700"
                        onClick={handleDelete}
                        disabled={isLoading || (mode === "range" && (!fromDate || !toDate))}
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Delete
                    </Button>
                </div>
            </div>
        </div>
    );
}
