"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Database, HardDrive, FileText, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatBytes, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/lib/toast";
import { getStoreStatusAction } from "@/actions/file-actions";
import { cn } from "@/lib/utils";

interface StoreStatsViewProps {
    initialStore: {
        displayName: string;
        googleStoreId: string;
        sizeBytes: number;
        fileCount: number;
        localFileCount?: number; // Added
        limitBytes: number;
        tier: string;
        lastSyncedAt: Date | string;
        totalIndexingCost?: number;
    };
}

export function StoreStatsView({ initialStore }: StoreStatsViewProps) {
    const [store, setStore] = useState(initialStore);
    const [isSyncing, setIsSyncing] = useState(false);
    const { toast } = useToast();

    const percentage = Math.min((store.sizeBytes / store.limitBytes) * 100, 100);
    const isWarning = percentage > 80;
    const isCritical = percentage > 95;

    // 20GB Optimal Limit Check
    const OPTIMAL_LIMIT = 21474836480; // 20 GB
    const isAboveOptimal = store.sizeBytes > OPTIMAL_LIMIT;

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const result = await getStoreStatusAction(true); // FORCE SYNC
            if ("success" in result && result.success && result.store) {
                setStore(result.store as any);
                toast({
                    title: "Sync Complete",
                    description: "Store statistics updated from cloud",
                    type: "success"
                });
            } else {
                toast({
                    title: "Sync Failed",
                    description: result.error || "Could not sync with Google",
                    type: "error"
                });
            }
        } catch {
            toast({
                title: "Error",
                description: "Connection failed",
                type: "error"
            });
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                        <Database className="h-6 w-6 text-blue-500" />
                        Vector Store Status
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Management and capacity tracking for your <span className="text-blue-400 font-bold">{store.tier}</span> plan
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="gap-2"
                >
                    <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
                    Refresh Cloud Stats
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Capacity Card */}
                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                            <HardDrive className="h-4 w-4" />
                            Storage Used ({store.tier} - {formatBytes(store.limitBytes)} Limit)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-100 mb-4">
                            {formatBytes(store.sizeBytes)} / {formatBytes(store.limitBytes)}
                        </div>
                        <Progress
                            value={percentage}
                            className="bg-slate-800"
                            indicatorClassName={cn(
                                isCritical ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-blue-600"
                            )}
                        />
                        <div className="mt-4 space-y-2">
                            {isAboveOptimal ? (
                                <div className="flex items-center gap-1.5 text-amber-500 text-[10px] leading-tight">
                                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                    <span>Store exceeds the 20GB optimal retrieval limit. You may notice higher latencies during search.</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 text-emerald-500 text-[10px]">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Healthy retrieval latency (Below 20GB)
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Metadata Card */}
                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Indexed Content
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center text-sm py-2 border-b border-slate-800/50">
                            <span className="text-slate-400">Total Documents</span>
                            <div className="text-right">
                                <div className="text-slate-100 font-medium">
                                    {store.fileCount} <span className="text-slate-500 text-xs">Cloud</span>
                                </div>
                                {store.localFileCount !== undefined && (
                                    <div className="text-slate-400 text-xs">
                                        vs {store.localFileCount} <span className="text-slate-600">Local</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        {/* Cost Row Added */}
                        <div className="flex justify-between items-center text-sm py-2 border-b border-slate-800/50">
                            <span className="text-slate-400">Total Indexing Cost</span>
                            <div className="text-right">
                                <div className="text-slate-100 font-medium font-mono">
                                    {formatCurrency(store.totalIndexingCost || 0, 6)}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between items-center text-sm py-2 border-b border-slate-800/50">
                            <span className="text-slate-400">Cloud Provider</span>
                            <span className="text-slate-100 font-medium">Google Generative AI</span>
                        </div>
                        <div className="flex justify-between items-center text-sm pt-2">
                            <span className="text-slate-400">Last Synced</span>
                            <span className="text-slate-100 font-medium text-xs">
                                {new Date(store.lastSyncedAt).toLocaleString()}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Technical Details Card */}
            <Card className="bg-slate-900 border-slate-800 mt-6">
                <CardHeader>
                    <CardTitle className="text-md font-medium text-slate-100">Technical Identifier</CardTitle>
                </CardHeader>
                <CardContent>
                    <code className="block bg-black/40 p-3 rounded border border-slate-800 text-blue-400 text-xs break-all">
                        {store.googleStoreId}
                    </code>
                    <p className="mt-4 text-xs text-slate-500 leading-relaxed">
                        This store handles all cross-collection semantic searching. Files are logically isolated using
                        metadata filtering during retrieval. To ensure performance, the total content should stay below 20GB.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
