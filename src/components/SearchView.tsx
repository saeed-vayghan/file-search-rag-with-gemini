"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, FileText, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface SearchViewProps {
    initialFiles: any[];
}

export function SearchView({ initialFiles }: SearchViewProps) {
    const { t, dir } = useI18n();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [filteredFiles, setFilteredFiles] = useState(initialFiles);
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        setIsSearching(true);

        // Simple client-side filtering for now
        // In a real app with many files, this might be a server action or API call
        if (!query.trim()) {
            setFilteredFiles(initialFiles);
        } else {
            const lowerQuery = query.toLowerCase();
            const filtered = initialFiles.filter(file =>
                file.displayName.toLowerCase().includes(lowerQuery) ||
                (file.type && file.type.toLowerCase().includes(lowerQuery))
            );
            setFilteredFiles(filtered);
        }
        setIsSearching(false);
    };

    return (
        <div className="flex flex-col min-h-screen">
            <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border/40 bg-background/95 px-6 backdrop-blur">
                <Link href="/" className="text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft className={cn("h-4 w-4", dir === "rtl" && "rotate-180")} />
                </Link>
                <h1 className="text-lg font-medium">{t.nav.search}</h1>
            </header>

            <div className="flex-1 p-8 space-y-6 w-full max-w-[1400px] mx-auto">
                <div className="max-w-2xl mx-auto space-y-4">
                    <div className="relative">
                        <Search className={cn("absolute top-3.5 h-5 w-5 text-muted-foreground", dir === "rtl" ? "right-3" : "left-3")} />
                        <Input
                            type="search"
                            placeholder={t.chat.searching}
                            className={cn("w-full bg-slate-900 h-12 text-lg", dir === "rtl" ? "pr-10" : "pl-10")}
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                        />
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                        {t.dashboard.recentFiles}
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-8">
                    {filteredFiles.length === 0 ? (
                        <Card className="col-span-full border-dashed">
                            <CardContent className="py-12 text-center text-muted-foreground">
                                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p className="text-lg">{isSearching ? "No matches found" : t.dashboard.noFiles}</p>
                                {!isSearching && (
                                    <Link href="/">
                                        <Button variant="outline" className="mt-4">{t.upload.title}</Button>
                                    </Link>
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        filteredFiles.map((file) => (
                            <Link key={file.id} href={`/chat/${file.id}`}>
                                <Card className="hover:border-blue-500/50 transition-colors cursor-pointer h-full group">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium flex items-center gap-2 group-hover:text-blue-400 transition-colors">
                                            <FileText className="h-4 w-4 text-slate-500" />
                                            {file.displayName}
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
