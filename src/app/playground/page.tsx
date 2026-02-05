"use client";

import { useState } from "react";
import { PLAYGROUND_SCENARIOS, PlaygroundScenario } from "@/config/playground-scenarios";
import { executePlaygroundCode, PlaygroundResult } from "@/actions/playground-actions";
import { CodeEditor } from "./_components/CodeEditor";
import { ResultViewer } from "./_components/ResultViewer";
import { Button } from "@/components/ui/button";
import { Play, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { MESSAGES, LOG_MESSAGES, PATHS } from "@/config/constants";

export default function PlaygroundPage() {
    const [selectedScenario, setSelectedScenario] = useState<PlaygroundScenario>(PLAYGROUND_SCENARIOS[0]);
    const [code, setCode] = useState<string>(PLAYGROUND_SCENARIOS[0].code);
    const [isRunning, setIsRunning] = useState(false);
    const [result, setResult] = useState<PlaygroundResult | null>(null);

    const handleScenarioChange = (scenario: PlaygroundScenario) => {
        // Confirm if code changed? (Skip for now for speed)
        setSelectedScenario(scenario);
        setCode(scenario.code);
        setResult(null);
    };

    const handleRun = async () => {
        setIsRunning(true);
        // Clear previous result partially? Keep it until new one arrives?
        try {
            const res = await executePlaygroundCode(code);
            if ('error' in res) {
                setResult({
                    success: false,
                    logs: [`Execution Error: ${res.error}`],
                    durationMs: 0
                });
            } else {
                setResult(res);
            }
        } catch (e) {
            console.error(LOG_MESSAGES.API.RUN_FAIL, e);
        } finally {
            setIsRunning(false);
        }
    };

    const handleReset = () => {
        setCode(selectedScenario.code);
    };

    return (
        <div className="flex h-full bg-slate-950 text-slate-200 overflow-hidden">
            {/* Sidebar: Scenarios */}
            <div className="w-64 flex-shrink-0 border-r border-slate-800 bg-slate-950 flex flex-col">
                <div className="p-4 border-b border-slate-800">
                    <h2 className="font-bold text-slate-100 flex items-center gap-2">
                        <span className="text-xl">🧪</span> Playground
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">Google File API Sandbox</p>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {PLAYGROUND_SCENARIOS.map((scenario) => (
                        <button
                            key={scenario.id}
                            onClick={() => handleScenarioChange(scenario)}
                            className={cn(
                                "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                                selectedScenario.id === scenario.id
                                    ? "bg-blue-600/10 text-blue-400 border border-blue-600/20"
                                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                            )}
                        >
                            <div className="font-medium">{scenario.name}</div>
                            <div className="text-[10px] opacity-70 truncate">{scenario.description}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content: Split View */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Toolbar */}
                <div className="h-12 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between px-4">
                    <div className="text-sm font-medium text-slate-300">
                        {selectedScenario.name}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleReset}
                            disabled={isRunning || code === selectedScenario.code}
                            className="text-slate-500 hover:text-slate-300 h-8"
                        >
                            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                            Reset
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleRun}
                            disabled={isRunning}
                            className="bg-green-600 hover:bg-green-500 text-white h-8"
                        >
                            {isRunning ? (
                                <span className="flex items-center gap-2">Running...</span>
                            ) : (
                                <>
                                    <Play className="h-3.5 w-3.5 mr-1.5 fill-current" />
                                    Run
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Split Pane: Editor (Top) | Result (Bottom) */}
                <div className="flex-1 flex flex-col min-h-0">
                    {/* Editor (50%) */}
                    <div className="flex-1 min-h-0 border-b border-slate-800">
                        <CodeEditor code={code} onChange={(val) => setCode(val || "")} />
                    </div>

                    {/* Result (50%) */}
                    <div className="flex-1 min-h-0 bg-slate-900 overflow-hidden">
                        <ResultViewer result={result} isLoading={isRunning} />
                    </div>
                </div>
            </div>
        </div>
    );
}
