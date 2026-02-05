"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
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

            <Card>
                <CardHeader>
                    <CardTitle>Usage History</CardTitle>
                    <CardDescription>
                        Recent API interactions and their calculated costs.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[400px]">
                        <div className="w-full overflow-auto">
                            <table className="w-full caption-bottom text-sm text-left">
                                <thead className="[&_tr]:border-b">
                                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                        <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Date</th>
                                        <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Type</th>
                                        <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Model</th>
                                        <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Tokens (In/Out/Total)</th>
                                        <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Cost</th>
                                    </tr>
                                </thead>
                                <tbody className="[&_tr:last-child]:border-0">
                                    {stats.logs.map((log: any) => (
                                        <tr key={log._id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                            <td className="p-4 align-middle">{formatDate(log.createdAt)}</td>
                                            <td className="p-4 align-middle">
                                                <Badge variant={log.type === 'indexing' ? 'secondary' : 'default'}>
                                                    {log.type}
                                                </Badge>
                                            </td>
                                            <td className="p-4 align-middle font-mono text-xs">{log.modelName}</td>
                                            <td className="p-4 align-middle font-mono text-xs">
                                                {log.tokens.input} / {log.tokens.output} / {log.tokens.total}
                                            </td>
                                            <td className="p-4 align-middle text-right font-mono text-xs">
                                                {formatCurrency(log.totalCost, 6)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

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
