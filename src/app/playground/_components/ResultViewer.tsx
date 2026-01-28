"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlaygroundResult } from "@/actions/playground";
import { Loader2, Terminal, AlertCircle, CheckCircle } from "lucide-react";

interface ResultViewerProps {
    result: PlaygroundResult | null;
    isLoading: boolean;
}

export function ResultViewer({ result, isLoading }: ResultViewerProps) {
    if (isLoading) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-sm font-medium">Running on server...</p>
            </div>
        );
    }

    if (!result) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-600">
                <Terminal className="h-12 w-12 mb-4 opacity-20" />
                <p className="text-sm">Run code to see output</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-slate-900">
            {/* Status Bar */}
            <div className={`
                flex items-center justify-between px-4 py-2 border-b border-white/5 text-xs font-mono
                ${result.success ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}
            `}>
                <div className="flex items-center gap-2">
                    {result.success ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                    <span>{result.success ? "Success" : "Failed"}</span>
                </div>
                <span>{result.durationMs}ms</span>
            </div>

            {/* Content */}
            <Tabs defaultValue="output" className="flex-1 flex flex-col min-h-0">
                <div className="px-4 pt-2 border-b border-white/5">
                    <TabsList className="bg-transparent h-8 p-0 gap-4">
                        <TabsTrigger value="output" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none px-0 pb-2 text-xs font-medium text-slate-400 data-[state=active]:text-blue-400">
                            Result (JSON)
                        </TabsTrigger>
                        <TabsTrigger value="logs" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none px-0 pb-2 text-xs font-medium text-slate-400 data-[state=active]:text-blue-400">
                            Console Logs ({result.logs.length})
                        </TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex-1 min-h-0 relative">
                    <TabsContent value="output" className="absolute inset-0 m-0">
                        <ScrollArea className="h-full p-4">
                            {result.error ? (
                                <div className="text-red-400 font-mono text-sm whitespace-pre-wrap">
                                    {result.error}
                                </div>
                            ) : (
                                <pre className="text-emerald-300 font-mono text-xs whitespace-pre-wrap">
                                    {JSON.stringify(result.output, null, 2)}
                                </pre>
                            )}
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="logs" className="absolute inset-0 m-0">
                        <ScrollArea className="h-full p-4 bg-black/20">
                            <div className="font-mono text-xs space-y-1">
                                {result.logs.length === 0 && (
                                    <span className="text-slate-600 italic">No logs captured.</span>
                                )}
                                {result.logs.map((log, i) => (
                                    <div key={i} className="text-slate-300 border-b border-white/5 pb-1">
                                        <span className="text-slate-600 mr-2">[{i + 1}]</span>
                                        {log}
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
