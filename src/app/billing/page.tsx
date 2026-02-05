"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatDate, formatBytes } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InfoIcon, CoinsIcon, ActivityIcon, SearchIcon, Loader2 } from "lucide-react";
import { getUsageStatsAction } from "@/actions/billing-actions";
import { toast } from "sonner";

export default function BillingPage() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const res = await getUsageStatsAction();
            if (res.error) {
                toast.error(res.error);
            } else {
                setStats(res);
            }
        } catch (e) {
            toast.error("Failed to load billing stats");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="flex h-96 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>;
    }

    if (!stats) return null;

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">API Usage & Cost</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Cost (All Time)</CardTitle>
                        <CoinsIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(stats.totalCost, 6)}</div>
                        <p className="text-xs text-muted-foreground">
                            Calculated via billing spec
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
                        <ActivityIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalTokens.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            Input + Output + Indexing
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Indexing Cost</CardTitle>
                        <SearchIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(stats.indexingCost, 6)}</div>
                        <p className="text-xs text-muted-foreground">
                            One-time ingestion fees
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Chat Cost</CardTitle>
                        <InfosIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(stats.chatCost, 6)}</div>
                        <p className="text-xs text-muted-foreground">
                            RAG & Generation
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle>Indexing History</CardTitle>
                        <CardDescription>
                            One-time file ingestion costs.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <ScrollArea className="h-[400px]">
                            <div className="w-full">
                                <table className="w-full text-sm text-left">
                                    <thead className="border-b">
                                        <tr className="text-muted-foreground">
                                            <th className="h-10 px-2 font-medium">File / Date</th>
                                            <th className="h-10 px-2 font-medium">Tokens</th>
                                            <th className="h-10 px-2 font-medium text-right">Cost</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {stats.logs.filter((l: any) => l.type === 'indexing').map((log: any) => (
                                            <tr key={log._id} className="hover:bg-muted/50">
                                                <td className="p-2">
                                                    <div className="font-medium truncate max-w-[200px]" title={log.meta?.fileName}>
                                                        {log.meta?.fileName || "Unknown File"}
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground flex gap-2">
                                                        <span>{formatDate(log.createdAt)}</span>
                                                        {log.meta?.fileSize && <span>• {formatBytes(log.meta.fileSize)}</span>}
                                                    </div>
                                                </td>
                                                <td className="p-2 font-mono text-[10px]">{log.tokens.total.toLocaleString()}</td>
                                                <td className="p-2 text-right font-mono text-xs">{formatCurrency(log.totalCost, 6)}</td>
                                            </tr>
                                        ))}
                                        {stats.logs.filter((l: any) => l.type === 'indexing').length === 0 && (
                                            <tr>
                                                <td colSpan={3} className="p-8 text-center text-muted-foreground italic">No indexing records found.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle>Chat History</CardTitle>
                        <CardDescription>
                            Consumption from RAG prompts and generations.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <ScrollArea className="h-[400px]">
                            <div className="w-full">
                                <table className="w-full text-sm text-left">
                                    <thead className="border-b">
                                        <tr className="text-muted-foreground">
                                            <th className="h-10 px-2 font-medium">Query / Date</th>
                                            <th className="h-10 px-2 font-medium text-center">In/Out</th>
                                            <th className="h-10 px-2 font-medium text-right">Cost</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {stats.logs.filter((l: any) => l.type === 'chat').map((log: any) => (
                                            <tr key={log._id} className="hover:bg-muted/50">
                                                <td className="p-2">
                                                    <div className="text-[10px] text-muted-foreground mb-1">{formatDate(log.createdAt)}</div>
                                                    <div className="text-[10px]">
                                                        {log.meta?.charCount ? (
                                                            <span className="bg-blue-500/10 text-blue-500 px-1 rounded">{log.meta.charCount} chars</span>
                                                        ) : (
                                                            <span className="text-muted-foreground">Char count N/A</span>
                                                        )}
                                                        <span className="ml-2 font-mono opacity-60">{log.modelName}</span>
                                                    </div>
                                                </td>
                                                <td className="p-2 text-center font-mono text-[10px]">
                                                    {log.tokens.input} / {log.tokens.output}
                                                </td>
                                                <td className="p-2 text-right font-mono text-xs">{formatCurrency(log.totalCost, 6)}</td>
                                            </tr>
                                        ))}
                                        {stats.logs.filter((l: any) => l.type === 'chat').length === 0 && (
                                            <tr>
                                                <td colSpan={3} className="p-8 text-center text-muted-foreground italic">No chat records found.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>About Pricing</CardTitle>
                    <CardDescription>
                        Pricing logic source: `API_COST_MONITORING.md`
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>• <strong>Gemini 3 Pro</strong>: $2.00 / 1M Input (Standard), $4.00 (Tier 2)</p>
                    <p>• <strong>File Indexing</strong>: $0.15 / 1M Input</p>
                    <p>• <strong>Search Surcharge</strong>: $0.014 per ground query</p>
                </CardContent>
            </Card>
        </div>
    );
}

function InfosIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
        </svg>
    )
}
