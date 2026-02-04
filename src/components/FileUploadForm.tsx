"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { uploadFileAction, getLibrariesAction } from "@/actions/file-actions";
import { Upload, Loader2, CheckCircle, XCircle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

type UploadStatus = "idle" | "uploading" | "success" | "error";

type Library = {
    id: string;
    name: string;
    icon: string;
};

export function FileUploadForm() {
    const { t, dir } = useI18n();
    const [status, setStatus] = useState<UploadStatus>("idle");
    const [dragActive, setDragActive] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [selectedLibrary, setSelectedLibrary] = useState<string>("");
    const [libraries, setLibraries] = useState<Library[]>([]);
    const [showLibraryDropdown, setShowLibraryDropdown] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    useEffect(() => {
        async function loadLibraries() {
            const libs = await getLibrariesAction();
            if (!("error" in libs)) {
                setLibraries(libs);
            }
        }
        loadLibraries();
    }, []);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        const file = e.dataTransfer?.files?.[0];
        if (file) {
            handleUpload(file);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleUpload(file);
        }
    };

    const handleUpload = async (file: File) => {
        setStatus("uploading");
        setErrorMessage(null);

        try {
            // 1. Calculate Hash
            const { calculateSHA256 } = await import("@/lib/hash-utils"); // Dynamic import
            const hash = await calculateSHA256(file);

            // 2. Check for Duplicates (Client-side Check)
            const { checkFileDuplicate } = await import("@/actions/file-actions");
            const duplicate = await checkFileDuplicate(hash, selectedLibrary);

            if ('error' in duplicate) {
                setStatus("error");
                setErrorMessage(duplicate.error || "Failed to check duplicates");
                return;
            }

            if (duplicate.exists) {
                setStatus("error");
                // @ts-ignore
                setErrorMessage(t.upload.duplicateError?.replace("{name}", duplicate.file?.name || "") || `Duplicate of: ${duplicate.file?.name}`);
                return;
            }

            const formData = new FormData();
            formData.append("file", file);
            formData.append("libraryId", selectedLibrary);
            formData.append("contentHash", hash);

            const result = await uploadFileAction(formData);
            if (result.error) {
                setStatus("error");
                setErrorMessage(result.error);
            } else {
                setStatus("success");
                router.refresh();
                setTimeout(() => setStatus("idle"), 2000);
            }
        } catch (err) {
            console.error(err);
            setStatus("error");
            setErrorMessage(t.common.error);
        }
    };

    const selectedLibraryName = libraries.find(l => l.id === selectedLibrary);

    return (
        <div className="space-y-3">
            {/* Library Selector */}
            {libraries.length > 0 && status === "idle" && (
                <div className="relative">
                    <label className="text-xs text-slate-500 mb-1 block">{t.upload.selectLibrary}</label>
                    <button
                        type="button"
                        onClick={() => setShowLibraryDropdown(!showLibraryDropdown)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-md border border-slate-700 bg-slate-800 text-sm hover:border-slate-600 transition-colors"
                    >
                        <span className="flex items-center gap-2">
                            {selectedLibraryName ? (
                                <>
                                    <span>{selectedLibraryName.icon}</span>
                                    <span>{selectedLibraryName.name}</span>
                                </>
                            ) : (
                                <span className="text-slate-400">{t.upload.noLibrary}</span>
                            )}
                        </span>
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                    </button>

                    {showLibraryDropdown && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowLibraryDropdown(false)} />
                            <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-md border border-slate-700 bg-slate-800 shadow-lg overflow-hidden">
                                <button
                                    type="button"
                                    className="w-full px-3 py-2 text-start text-sm hover:bg-slate-700 text-slate-300"
                                    onClick={() => { setSelectedLibrary(""); setShowLibraryDropdown(false); }}
                                >
                                    {t.upload.noLibrary}
                                </button>
                                {libraries.map(lib => (
                                    <button
                                        key={lib.id}
                                        type="button"
                                        className={cn(
                                            "w-full px-3 py-2 text-start text-sm hover:bg-slate-700 flex items-center gap-2",
                                            selectedLibrary === lib.id && "bg-blue-600/20 text-blue-400"
                                        )}
                                        onClick={() => { setSelectedLibrary(lib.id); setShowLibraryDropdown(false); }}
                                    >
                                        <span>{lib.icon}</span>
                                        <span>{lib.name}</span>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Drop Zone */}
            <div
                className={cn(
                    "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
                    dragActive
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-slate-700 hover:border-slate-600",
                    status === "success" && "border-emerald-500 bg-emerald-500/10",
                    status === "error" && "border-red-500 bg-red-500/10"
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <input
                    ref={inputRef}
                    type="file"
                    className="hidden"
                    onChange={handleChange}
                    accept=".pdf,.doc,.docx,.txt,.md,.xlsx,.csv"
                />

                {status === "idle" && (
                    <>
                        <Upload className="h-10 w-10 text-slate-500 mb-4" />
                        <p className="text-sm text-slate-400 mb-2">
                            {t.upload.dragDrop}
                        </p>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => inputRef.current?.click()}
                        >
                            {t.upload.browse}
                        </Button>
                        <p className="text-xs text-slate-500 mt-4">
                            {t.upload.supportedFormats}
                        </p>
                    </>
                )}

                {status === "uploading" && (
                    <>
                        <Loader2 className="h-10 w-10 text-blue-500 mb-4 animate-spin" />
                        <p className="text-sm text-slate-300">{t.upload.uploading}</p>
                        <p className="text-xs text-slate-500 mt-2">
                            {t.upload.largeFileWait}
                        </p>
                    </>
                )}

                {status === "success" && (
                    <>
                        <CheckCircle className="h-10 w-10 text-emerald-500 mb-4" />
                        <p className="text-sm text-emerald-400">{t.upload.success}</p>
                    </>
                )}

                {status === "error" && (
                    <>
                        <XCircle className="h-10 w-10 text-red-500 mb-4" />
                        <p className="text-sm text-red-400">{errorMessage || t.common.error}</p>
                        <Button
                            size="sm"
                            variant="outline"
                            className="mt-4"
                            onClick={() => setStatus("idle")}
                        >
                            {t.common.retry}
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
}
