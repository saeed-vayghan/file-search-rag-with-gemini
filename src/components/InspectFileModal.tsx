"use client";

import { Button } from "@/components/ui/button";
import { Loader2, Server, AlertTriangle, X } from "lucide-react";
import { getRemoteFileDebugAction } from "@/actions/file-actions";
import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { ForceEnglishWrapper } from "@/components/ForceEnglishWrapper";


interface InspectFileModalProps {
    fileId: string;
    fileName: string;
    isOpen: boolean;
    onClose: () => void;
}

export function InspectFileModal({ fileId, fileName, isOpen, onClose }: InspectFileModalProps) {
    const { t, dir } = useI18n();
    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen, fileId]);

    const loadData = async () => {
        setIsLoading(true);
        setError(null);
        setData(null);
        try {
            const result = await getRemoteFileDebugAction(fileId);
            if ('error' in result) {
                setError(result.error || "Unknown error");
            } else {
                setData(result.metadata);
            }
        } catch (e) {
            setError("Failed to fetch remote data");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <ForceEnglishWrapper>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">

                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-slate-800">
                        <div>
                            <h2 className="text-lg font-medium flex items-center gap-2 text-slate-100">
                                <Server className="h-5 w-5 text-blue-500" />
                                Remote Inspection: <span className="text-slate-400 text-base">{fileName}</span>
                            </h2>
                            <p className="text-xs text-slate-500 mt-1">
                                Direct metadata from Google Gemini File API
                            </p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Content */}
                    <div className="p-4 overflow-y-auto flex-1">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center p-8 text-slate-500">
                                <Loader2 className="h-8 w-8 animate-spin mb-4" />
                                <p>Fetching from Google Cloud...</p>
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center justify-center p-8 text-red-400 bg-red-500/10 rounded-lg border border-red-500/20">
                                <AlertTriangle className="h-8 w-8 mb-4 hover:animate-ping" />
                                <p className="font-medium text-center">{error}</p>
                                <Button variant="outline" size="sm" onClick={loadData} className="mt-4 border-red-500/30 hover:bg-red-500/20">
                                    Retry
                                </Button>
                            </div>
                        ) : data ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <InfoItem label="File Name" value={data.displayName} />
                                    <InfoItem label="Remote ID" value={data.name} />
                                    <InfoItem label="State" value={data.state} isStatus />
                                    <InfoItem label="Size" value={formatBytes(data.sizeBytes)} />
                                    <InfoItem label="Created" value={new Date(data.createTime).toLocaleString()} />
                                    <InfoItem label="Updated" value={new Date(data.updateTime).toLocaleString()} />
                                    <InfoItem label="URI" value={data.uri} />
                                    {data.indexingCost !== undefined && (
                                        <InfoItem label="Indexing Cost" value={`$${data.indexingCost.toFixed(5)}`} />
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs text-slate-500">Raw JSON</label>
                                    <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-xs overflow-x-auto text-slate-300 max-h-64 overflow-y-auto">
                                        <pre>{JSON.stringify(data, null, 2)}</pre>
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end p-4 border-t border-slate-800 bg-slate-900/50">
                        <Button variant="ghost" onClick={onClose}>
                            Close
                        </Button>
                    </div>
                </div>
            </div>
        </ForceEnglishWrapper>
    );
}

function InfoItem({ label, value, isStatus }: { label: string, value: string, isStatus?: boolean }) {
    return (
        <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
            <span className="text-xs text-slate-500 block mb-1">{label}</span>
            <span className={`font-medium text-sm ${isStatus ? getStatusColor(value) : "text-slate-200"} break-all`}>
                {value || "-"}
            </span>
        </div>
    );
}

function getStatusColor(status: string) {
    if (!status) return "text-slate-200";
    switch (status.toUpperCase()) {
        case "ACTIVE": return "text-emerald-500";
        case "PROCESSING": return "text-yellow-500";
        case "FAILED": return "text-red-500";
        default: return "text-slate-200";
    }
}

function formatBytes(bytes: number) {
    // Handle string inputs from API
    const num = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
    if (!num) return "0 B";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(num) / Math.log(k));
    return parseFloat((num / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
