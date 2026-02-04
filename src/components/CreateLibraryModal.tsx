"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createLibraryAction } from "@/actions/file-actions";
import { X, Loader2, FolderPlus } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { UI_DEFAULTS } from "@/config/constants";

const COLOR_OPTIONS = [
    { name: "Slate", value: "text-slate-500" },
    { name: "Blue", value: "text-blue-500" },
    { name: "Emerald", value: "text-emerald-500" },
    { name: "Red", value: "text-red-500" },
    { name: "Purple", value: "text-purple-500" },
    { name: "Amber", value: "text-amber-500" },
];

interface CreateLibraryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CreateLibraryModal({ isOpen, onClose }: CreateLibraryModalProps) {
    const { t, dir } = useI18n();
    const [name, setName] = useState("");
    const [selectedIcon, setSelectedIcon] = useState<string>(UI_DEFAULTS.LIBRARY.ICON);
    const [selectedColor, setSelectedColor] = useState("text-slate-500");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsLoading(true);
        setError(null);

        try {
            const result = await createLibraryAction(name.trim(), selectedIcon, selectedColor);
            if (result.error) {
                setError(result.error);
            } else {
                router.refresh();
                onClose();
                setName("");
                setSelectedIcon(UI_DEFAULTS.LIBRARY.ICON);
                setSelectedColor("text-slate-500");
            }
        } catch {
            setError(t.common.error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative z-10 w-full max-w-md rounded-lg border border-slate-800 bg-slate-900 p-6 shadow-xl">
                <button
                    onClick={onClose}
                    className={cn(
                        "absolute top-4 text-slate-400 hover:text-white",
                        dir === "rtl" ? "left-4" : "right-4"
                    )}
                >
                    <X className="h-4 w-4" />
                </button>

                <div className="flex items-center gap-3 mb-6">
                    <div className="h-10 w-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
                        <FolderPlus className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                        <h2 className="text-lg font-medium text-slate-100">{t.createLibrary.title}</h2>
                        <p className="text-xs text-slate-500">{t.createLibrary.subtitle}</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-sm text-slate-400 mb-1 block">{t.createLibrary.nameLabel}</label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t.createLibrary.namePlaceholder}
                            className="bg-slate-800"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="text-sm text-slate-400 mb-2 block">{t.createLibrary.iconLabel}</label>
                        <div className="flex flex-wrap gap-2">
                            {UI_DEFAULTS.LIBRARY.ICONS.map((icon) => (
                                <button
                                    key={icon}
                                    type="button"
                                    onClick={() => setSelectedIcon(icon)}
                                    className={`h-10 w-10 rounded-lg text-lg flex items-center justify-center transition-colors ${selectedIcon === icon
                                        ? "bg-blue-600 ring-2 ring-blue-400"
                                        : "bg-slate-800 hover:bg-slate-700"
                                        }`}
                                >
                                    {icon}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-sm text-slate-400 mb-2 block">{t.createLibrary.colorLabel}</label>
                        <div className="flex flex-wrap gap-2">
                            {COLOR_OPTIONS.map((color) => (
                                <button
                                    key={color.value}
                                    type="button"
                                    onClick={() => setSelectedColor(color.value)}
                                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${selectedColor === color.value
                                        ? "bg-blue-600 text-white"
                                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                                        }`}
                                >
                                    {color.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {error && (
                        <p className="text-sm text-red-400">{error}</p>
                    )}

                    <div className="flex gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="flex-1"
                            disabled={isLoading}
                        >
                            {t.createLibrary.cancel}
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                            disabled={isLoading || !name.trim()}
                        >
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                t.createLibrary.create
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
