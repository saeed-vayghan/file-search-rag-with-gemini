"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EditLibraryModal } from "./EditLibraryModal";
import { ArrowLeft, FileText, Search, MessageSquare, Pencil } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useState } from "react";
import { Input } from "@/components/ui/input";

type LibraryFile = {
    id: string;
    displayName: string;
    type: string;
    size: string;
    status: string;
    date: string;
    mimeType: string;
    indexingCost?: number;
};

type LibraryMeta = {
    id: string;
    name: string;
    icon: string;
    color: string;
    description?: string;
};

interface LibraryDetailsViewProps {
    library: LibraryMeta;
    initialFiles: LibraryFile[];
}

import { formatCurrency } from "@/lib/utils";

export function LibraryDetailsView({ library, initialFiles }: LibraryDetailsViewProps) {
    const { t, dir } = useI18n();
    const [searchQuery, setSearchQuery] = useState("");
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const filteredFiles = initialFiles.filter(file =>
        file.displayName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col min-h-screen">
            <EditLibraryModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                library={library}
            />

            <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border/40 bg-background/95 px-6 backdrop-blur">
                <Link href="/libraries" className="text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft className={cn("h-4 w-4", dir === "rtl" && "rotate-180")} />
                </Link>
                <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditModalOpen(true)}>
                    <span className="text-xl">{library.icon}</span>
                    <h1 className="text-lg font-medium group-hover:text-blue-400 transition-colors">{library.name}</h1>
                    <Pencil className="h-3 w-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <Link href={`/chat/library/${library.id}`}>
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-sm">
                            <MessageSquare className="h-4 w-4" />
                            Ask Library
                        </Button>
                    </Link>
                </div>
            </header>

            <div className="flex-1 p-8 space-y-6 w-full max-w-[1400px] mx-auto">
                <div className="flex items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className={cn("absolute top-2.5 h-4 w-4 text-muted-foreground", dir === "rtl" ? "right-3" : "left-3")} />
                        <Input
                            placeholder={t.chat.searching}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={cn("bg-slate-900 border-border/50 pl-9", dir === "rtl" && "pr-9 pl-3")}
                        />
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredFiles.length === 0 ? (
                        <Card className="col-span-full border-dashed">
                            <CardContent className="py-12 text-center text-muted-foreground">
                                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p className="text-lg">{searchQuery ? "No matching files" : "No files in this library"}</p>
                            </CardContent>
                        </Card>
                    ) : (
                        filteredFiles.map((file) => (
                            <Link key={file.id} href={`/chat/${file.id}`}>
                                <Card className="hover:border-blue-500/50 transition-colors cursor-pointer h-full group">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 group-hover:text-blue-400 transition-colors truncate">
                                                <FileText className="h-4 w-4 text-slate-500 shrink-0" />
                                                <span className="truncate">{file.displayName}</span>
                                            </div>
                                            {file.indexingCost !== undefined && (
                                                <div className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 font-mono">
                                                    {formatCurrency(file.indexingCost, 6)}
                                                </div>
                                            )}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-xs text-muted-foreground">{file.type} • {file.size}</p>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
