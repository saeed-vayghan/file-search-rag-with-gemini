"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Database, FileText, FolderOpen, ChevronLeft, ChevronRight, Check, Lock, Zap } from "lucide-react";
import Link from "next/link";
import { cn, formatCurrency } from "@/lib/utils";
import { FileUploadForm } from "@/components/FileUploadForm";
import { FileActionsMenu } from "@/components/FileActionsMenu";
import { useI18n } from "@/lib/i18n";
import { TIERS, TierKey } from "@/config/limits";
import { FILE_STATUS, UI_DEFAULTS, PATHS, FileStatusType as FileStatus } from "@/config/constants";

interface DashboardFile {
    id: string;
    displayName: string;
    type: string;
    size: string;
    status: string;
    date: string;
    mimeType: string;
    indexingCost?: number;
    libraryId?: string;
    libraryName?: string;
    libraryIcon?: string;
}

interface DashboardLibrary {
    id: string;
    name: string;
    icon: string;
    color: string;
    count: number;
}

interface DashboardViewProps {
    files: DashboardFile[];
    userStats: {
        totalFiles: number;
        totalLibraries: number;
        totalStorage: string;
        storageUsed: string;
        storageLimit: string;
        storageUsedBytes: number;
        storageLimitBytes: number;
        tier: string;
    };
    libraries: DashboardLibrary[];
}

const LIBRARIES_PER_PAGE = 3;
const FILES_PER_PAGE = 10;

// Helper component for file status badges
const StatusBadge = ({ status }: { status: FileStatus }) => {
    const { t } = useI18n();
    let variant: "default" | "secondary" | "destructive" | "outline" | null | undefined = "secondary";
    let text = "Unknown";

    switch (status) {
        case FILE_STATUS.UPLOADING:
            variant = "secondary";
            text = t.upload?.uploading || "Uploading...";
            break;
        case FILE_STATUS.INGESTING:
            variant = "default";
            text = t.chat?.processing || "Processing...";
            break;
        case FILE_STATUS.ACTIVE:
            variant = "default";
            text = t.chat?.readyForSearch || "Ready";
            break;
        case FILE_STATUS.FAILED:
            variant = "destructive";
            text = t.upload?.failed || "Failed";
            break;
        default:
            variant = "secondary";
            text = "Unknown";
    }

    return <Badge variant={variant}>{text}</Badge>;
};

export function DashboardView({ files, userStats, libraries }: DashboardViewProps) {
    const { t, dir } = useI18n();
    const [libraryPage, setLibraryPage] = useState(1);
    const [filePage, setFilePage] = useState(1);

    // Pagination Logic: Libraries
    const totalLibraryPages = Math.ceil(libraries.length / LIBRARIES_PER_PAGE);
    const currentLibraries = libraries.slice(
        (libraryPage - 1) * LIBRARIES_PER_PAGE,
        libraryPage * LIBRARIES_PER_PAGE
    );

    // Pagination Logic: Files
    const totalFilePages = Math.ceil(files.length / FILES_PER_PAGE);
    const currentFiles = files.slice(
        (filePage - 1) * FILES_PER_PAGE,
        filePage * FILES_PER_PAGE
    );

    return (
        <div className="flex flex-col min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border/40 bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="cursor-pointer font-medium text-foreground">{t.nav.dashboard}</span>
                </div>
            </header>

            <div className="flex-1 space-y-6 p-8 pt-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-3xl font-bold tracking-tight">{t.nav.dashboard}</h2>
                </div>

                {/* KPIs */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {t.dashboard.storageUsed}
                            </CardTitle>
                            <Database className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{userStats.storageUsed} <span className="text-sm text-muted-foreground font-normal">/ {userStats.storageLimit}</span></div>
                            <div className="h-2 w-full bg-slate-800 rounded-full mt-3 overflow-hidden">
                                <div
                                    className={cn("h-full bg-blue-600 transition-all", dir === "rtl" ? "rtl:flip" : "")}
                                    style={{ width: `${Math.min((userStats.storageUsedBytes / userStats.storageLimitBytes) * 100, 100)}%` }}
                                />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Current Tier
                            </CardTitle>
                            <Zap className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{TIERS[userStats.tier as TierKey]?.label || "Professional"}</div>
                            <p className="text-xs text-muted-foreground mt-2">
                                {TIERS[userStats.tier as TierKey]?.name || "Tier 1"} Active
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Subscription Tiers */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Subscription Tiers</h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {(Object.keys(TIERS) as TierKey[]).map((key) => {
                            const tier = TIERS[key];
                            const isActive = key === userStats.tier;

                            return (
                                <Card key={key} className={cn(
                                    "relative transition-all",
                                    isActive ? "border-blue-500 bg-blue-500/5 shadow-lg" : "opacity-60 grayscale-[0.5]"
                                )}>
                                    {isActive && (
                                        <div className="absolute -top-3 left-4 bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                                            Current Plan
                                        </div>
                                    )}
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-md flex items-center justify-between">
                                            {tier.name}
                                            {isActive ? <Check className="h-4 w-4 text-blue-500" /> : <Lock className="h-4 w-4 text-slate-500" />}
                                        </CardTitle>
                                        <p className="text-xs text-muted-foreground">{tier.description}</p>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="text-xl font-bold text-slate-100">
                                            {tier.maxStoreSizeBytes / (1024 * 1024 * 1024)}GB <span className="text-xs font-normal text-slate-500">Storage</span>
                                        </div>
                                        <ul className="space-y-1.5">
                                            <li className="text-[10px] text-slate-400 flex items-center gap-1.5">
                                                <Check className="h-3 w-3 text-blue-500" /> 100MB File Limit
                                            </li>
                                            <li className="text-[10px] text-slate-400 flex items-center gap-1.5">
                                                <Check className="h-3 w-3 text-blue-500" /> File Search Tools
                                            </li>
                                        </ul>
                                        <Button
                                            variant={isActive ? "default" : "outline"}
                                            size="sm"
                                            className="w-full mt-2 h-8 text-xs"
                                            disabled={!isActive}
                                        >
                                            {isActive ? "Manage Plan" : "Upgrade Required"}
                                        </Button>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>

                {/* Libraries */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium">{t.libraries.title}</h3>
                        <Link href={PATHS.LIBRARIES}>
                            <Button variant="outline" size="sm" className="gap-2">
                                {t.libraries.title}
                                <FolderOpen className="h-4 w-4" />
                            </Button>
                        </Link>
                    </div>
                    {libraries.length === 0 ? (
                        <Card className="border-dashed">
                            <CardContent className="py-8 text-center text-muted-foreground">
                                <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>{t.libraries.noLibraries}</p>
                                <p className="text-sm">{t.libraries.noLibrariesDesc}</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            <div className="grid gap-4 md:grid-cols-3">
                                {currentLibraries.map((lib) => (
                                    <Link key={lib.id} href={`${PATHS.LIBRARIES}/${lib.id}`} className="block">
                                        <Card className="hover:border-purple-500/50 transition-colors cursor-pointer group h-full">
                                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                                <CardTitle className="text-md font-medium group-hover:text-purple-500 transition-colors">{lib.name}</CardTitle>
                                                <div className="text-xl">{lib.icon}</div>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-2xl font-bold">{lib.count} <span className="text-xs font-normal text-muted-foreground">{t.libraries.documents}</span></div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                ))}
                            </div>

                            {/* Library Pagination Controls */}
                            {totalLibraryPages > 1 && (
                                <div className="flex items-center justify-end gap-2 mt-4">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setLibraryPage(p => Math.max(1, p - 1))}
                                        disabled={libraryPage === 1}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <span className="text-xs text-muted-foreground">
                                        Page {libraryPage} of {totalLibraryPages}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setLibraryPage(p => Math.min(totalLibraryPages, p + 1))}
                                        disabled={libraryPage === totalLibraryPages}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Upload Section */}
                <div id="upload-section" className="space-y-2 scroll-mt-24">
                    <h3 className="text-lg font-medium">{t.upload.title}</h3>
                    <FileUploadForm />
                </div>

                {/* Recent Files Table */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium">{t.dashboard.recentFiles}</h3>
                        <Link href={PATHS.SEARCH}>
                            <Button variant="outline" size="sm">{t.nav.search}</Button>
                        </Link>
                    </div>

                    <div className="rounded-md border border-slate-800 bg-slate-900/50">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-900 text-muted-foreground">
                                <tr>
                                    <th className="h-10 px-4 font-medium text-start">{t.dashboard.name}</th>
                                    <th className="h-10 px-4 font-medium text-start">{t.dashboard.library}</th>
                                    <th className="h-10 px-4 font-medium text-start">{t.dashboard.type}</th>
                                    <th className="h-10 px-4 font-medium text-start">{t.dashboard.date}</th>
                                    <th className="h-10 px-4 font-medium text-start">{t.dashboard.sizeCol}</th>
                                    <th className="h-10 px-4 font-medium text-start">Cost</th>
                                    <th className="h-10 px-4 font-medium text-start">{t.dashboard.status}</th>
                                    <th className="h-10 px-4 font-medium text-end">{t.actions.checkStatus}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {files.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="p-8 text-center text-muted-foreground">
                                            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                            <p>{t.dashboard.noFiles}</p>
                                            <p className="text-xs">{t.dashboard.uploadFirst}</p>
                                        </td>
                                    </tr>
                                ) : (
                                    currentFiles.map((file) => (
                                        <tr key={file.id} className="border-t border-slate-800 hover:bg-slate-900/50 transition-colors group">
                                            <td className="p-4 font-medium text-slate-200">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-slate-500" />
                                                    <Link href={`/chat/${file.id}`} className="hover:underline hover:text-blue-400">
                                                        {file.displayName}
                                                    </Link>
                                                </div>
                                            </td>
                                            <td className="p-4 text-muted-foreground">
                                                {file.libraryId ? (
                                                    <Link href={`${PATHS.LIBRARIES}/${file.libraryId}`} className="flex items-center gap-1.5 hover:text-blue-400 transition-colors">
                                                        <span>{file.libraryIcon}</span>
                                                        <span>{file.libraryName}</span>
                                                    </Link>
                                                ) : (
                                                    <span className="flex items-center gap-1.5 opacity-50">
                                                        <span>{UI_DEFAULTS.LIBRARY.ICON}</span>
                                                        <span>Uncategorized</span>
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 text-muted-foreground">{file.type}</td>
                                            <td className="p-4 text-muted-foreground">{file.date}</td>
                                            <td className="p-4 text-muted-foreground">{file.size}</td>
                                            <td className="p-4 text-muted-foreground font-mono text-xs">
                                                {file.indexingCost ? formatCurrency(file.indexingCost, 6) : '-'}
                                            </td>
                                            <td className="p-4">
                                                <StatusBadge status={file.status as FileStatus} />
                                            </td>
                                            <td className="p-4 text-end">
                                                <FileActionsMenu fileId={file.id} fileName={file.displayName} />
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* File Pagination Controls */}
                    {totalFilePages > 1 && (
                        <div className="flex items-center justify-end gap-2 mt-4">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setFilePage(p => Math.max(1, p - 1))}
                                disabled={filePage === 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-xs text-muted-foreground">
                                Page {filePage} of {totalFilePages}
                            </span>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setFilePage(p => Math.min(totalFilePages, p + 1))}
                                disabled={filePage === totalFilePages}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
