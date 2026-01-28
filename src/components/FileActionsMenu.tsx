"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { checkFileStatusAction, deleteFileAction } from "@/actions/file-actions";
import { MoreHorizontal, RefreshCw, Trash2, MessageSquare, Loader2, Server } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { InspectFileModal } from "@/components/InspectFileModal";

import { useToast } from "@/lib/toast";
import { ConfirmModal } from "@/components/ConfirmModal";

interface FileActionsMenuProps {
    fileId: string;
    fileName: string;
}

export function FileActionsMenu({ fileId, fileName }: FileActionsMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isInspectOpen, setIsInspectOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    const router = useRouter();
    const { t, dir } = useI18n();
    const { toast } = useToast();

    const handleCheckStatus = async () => {
        setIsLoading(true);
        try {
            const result = await checkFileStatusAction(fileId);
            if (result.error) {
                toast({
                    title: t.common.error,
                    description: result.error,
                    type: "error"
                });
            } else {
                toast({
                    title: "Status Checked",
                    description: result.message || "File status updated",
                    type: "info"
                });
                router.refresh();
            }
        } catch {
            toast({
                title: t.common.error,
                description: "Failed to connect to server",
                type: "error"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        // Just open the modal
        setIsDeleteOpen(true);
        setIsOpen(false);
    };

    const confirmDelete = async () => {
        setIsLoading(true);
        try {
            const result = await deleteFileAction(fileId);
            if (result.error) {
                toast({
                    title: "Deletion Failed",
                    description: result.error,
                    type: "error"
                });
            } else {
                if (result.message) {
                    toast({
                        title: "File Deleted",
                        description: result.message,
                        type: "success",
                        duration: 6000
                    });
                }
                router.refresh();
            }
        } catch {
            toast({
                title: t.common.error,
                description: "Failed to delete file",
                type: "error"
            });
        } finally {
            setIsLoading(false);
            setIsDeleteOpen(false);
        }
    };

    const handleChat = () => {
        router.push(`/chat/${fileId}`);
    };

    return (
        <div className="relative">
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsOpen(!isOpen)}
                disabled={isLoading}
            >
                {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <MoreHorizontal className="h-4 w-4" />
                )}
            </Button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className={cn(
                        "absolute top-full mt-1 z-50 w-48 rounded-md border border-slate-800 bg-slate-900 shadow-lg",
                        dir === "rtl" ? "left-0" : "right-0" // RTL dropdown position
                    )}>
                        <div className="py-1">
                            <button
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
                                onClick={() => { handleChat(); setIsOpen(false); }}
                            >
                                <MessageSquare className="h-4 w-4 text-blue-500" />
                                {t.actions.chat}
                            </button>
                            <button
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
                                onClick={() => { handleCheckStatus(); setIsOpen(false); }}
                            >
                                <RefreshCw className="h-4 w-4 text-emerald-500" />
                                {t.actions.checkStatus}
                            </button>
                            <button
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
                                onClick={() => { setIsInspectOpen(true); setIsOpen(false); }}
                            >
                                <Server className="h-4 w-4 text-violet-500" />
                                Inspect Remote
                            </button>
                            <div className="my-1 border-t border-slate-800" />
                            <button
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-slate-800"
                                onClick={() => { handleDelete(); }}
                            >
                                <Trash2 className="h-4 w-4" />
                                {t.actions.delete}
                            </button>
                        </div>
                    </div>
                </>
            )}

            <InspectFileModal
                fileId={fileId}
                fileName={fileName}
                isOpen={isInspectOpen}
                onClose={() => setIsInspectOpen(false)}
            />

            <ConfirmModal
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                onConfirm={confirmDelete}
                title={t.actions.delete}
                description={`${t.actions.deleteConfirm} "${fileName}"? This cannot be undone.`}
                confirmText={t.actions.delete}
                cancelText={t.common.cancel}
                isLoading={isLoading}
            />
        </div>
    );
}

