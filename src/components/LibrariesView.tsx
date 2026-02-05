"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { deleteLibraryAction } from "@/actions/lib-actions";
import { ArrowLeft, Plus, Trash2, Loader2, Library } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { CreateLibraryModal } from "@/components/CreateLibraryModal";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";

import { ConfirmModal } from "@/components/ConfirmModal";
import { useToast } from "@/lib/toast";

interface LibraryViewProps {
    libraries: any[];
}

export function LibrariesView({ libraries: initialLibraries }: LibraryViewProps) {
    const { t, dir } = useI18n();
    const router = useRouter();
    const [libraries, setLibraries] = useState(initialLibraries);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    // Sync state with server/prop updates
    useEffect(() => {
        setLibraries(initialLibraries);
    }, [initialLibraries]);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const { toast } = useToast();

    const handleDelete = async () => {
        if (!deleteId) return;
        setIsDeleting(true);

        try {
            const res = await deleteLibraryAction(deleteId);
            if ('success' in res && res.success) {
                setLibraries(prev => prev.filter(l => l.id !== deleteId));
                setDeleteId(null);
                toast({
                    title: "Success",
                    description: "Library deleted successfully.",
                    type: "success"
                });
                router.refresh();
            } else {
                toast({
                    title: "Error",
                    description: res.error || "Failed to delete library.",
                    type: "error"
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "An unexpected error occurred.",
                type: "error"
            });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleModalClose = () => {
        setIsCreateOpen(false);
        router.refresh();
    };

    return (
        <div className="flex flex-col min-h-screen">
            <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border/40 bg-background/95 px-6 backdrop-blur">
                <Link href="/" className="text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft className={cn("h-4 w-4", dir === "rtl" && "rotate-180")} />
                </Link>
                <h1 className="text-lg font-medium">{t.libraries.title}</h1>
                <div className="ml-auto">
                    <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => setIsCreateOpen(true)}
                    >
                        <Plus className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" /> {t.libraries.newLibrary}
                    </Button>
                </div>
            </header>

            <div className="flex-1 p-8 space-y-6">
                {libraries.length === 0 ? (
                    <div className="text-center py-12 bg-slate-900 rounded-lg border border-border border-dashed">
                        <Library className="h-12 w-12 mx-auto text-slate-600 mb-3" />
                        <h3 className="text-lg font-medium text-slate-300">{t.libraries.noLibraries}</h3>
                        <p className="text-slate-500">{t.libraries.noLibrariesDesc}</p>
                        <Button onClick={() => setIsCreateOpen(true)} className="mt-6 bg-blue-600 hover:bg-blue-700">
                            <Plus className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" /> {t.libraries.create}
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {libraries.map((lib) => (
                            <div
                                key={lib.id}
                                className="bg-slate-900 border border-border rounded-lg p-5 hover:border-purple-500/50 transition-colors group relative"
                            >
                                <Link href={`/libraries/${lib.id}`} className="block">
                                    <div className="flex items-center justify-between mb-8">
                                        <h2 className="text-xl font-semibold text-white group-hover:text-purple-400 transition-colors">
                                            {lib.name}
                                        </h2>
                                        <span className="text-2xl">{lib.icon}</span>
                                    </div>
                                    <p className="text-slate-400 text-sm mb-4">{lib.description}</p>
                                    <div className="text-sm text-slate-500">
                                        {lib.count} {lib.count === 1 ? t.libraries.document : t.libraries.documents}
                                    </div>
                                </Link>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                        "absolute bottom-4 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-opacity z-10",
                                        dir === "rtl" ? "left-4" : "right-4"
                                    )}
                                    onClick={() => setDeleteId(lib.id)}
                                    disabled={deleteId === lib.id}
                                >
                                    {deleteId === lib.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <CreateLibraryModal
                isOpen={isCreateOpen}
                onClose={handleModalClose}
            />

            <ConfirmModal
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={handleDelete}
                title={t.libraries.deleteTitle}
                description={t.libraries.deleteConfirm}
                confirmText={t.common.delete}
                cancelText={t.createLibrary.cancel}
                isLoading={isDeleting}
            />
        </div>
    );
}
