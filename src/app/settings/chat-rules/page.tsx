"use client";

import { useEffect, useState } from "react";
import { getChatModeSettings, updateChatModeSettings, type ChatModeSettings } from "@/actions/user-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

import { ArrowLeft, Shield, Sparkles, Save, Loader2 } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export default function ChatRulesPage() {
    const { t, dir } = useI18n();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<ChatModeSettings | null>(null);

    useEffect(() => {
        async function load() {
            setLoading(true);
            const data = await getChatModeSettings();
            if (data) setSettings(data);
            setLoading(false);
        }
        load();
    }, []);

    const handleSave = async () => {
        if (!settings) return;
        setSaving(true);
        await updateChatModeSettings(settings);
        setSaving(false);
    };

    if (loading) {
        return <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-500"><Loader2 className="animate-spin" /></div>;
    }

    if (!settings) return <div className="p-8 text-center text-red-400">Failed to load settings.</div>;

    return (
        <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200 font-sans">
            <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border/40 bg-background/95 px-6 backdrop-blur">
                <Link href="/settings" className="text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft className={cn("h-4 w-4", dir === "rtl" && "rotate-180")} />
                </Link>
                <h1 className="text-lg font-medium">Chat Rules & Modes</h1>
            </header>

            <div className="flex-1 p-8 space-y-8 max-w-3xl mx-auto w-full">

                {/* Limited Mode */}
                <Card className="border-blue-500/20 bg-slate-900/50">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-blue-400">
                                <Shield className="h-5 w-5" /> Limited Mode (Strict)
                            </CardTitle>
                            {/* <Switch checked={settings.limited.enabled} /> */}
                        </div>
                        <CardDescription>
                            Forces the AI to answer ONLY using the provided documents. Prevents hallucinations.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-slate-400 mb-2 block">System Instruction (Prompt)</label>
                            <Textarea
                                value={settings.limited.instruction}
                                onChange={(e) => setSettings({
                                    ...settings,
                                    limited: { ...settings.limited, instruction: e.target.value }
                                })}
                                className="min-h-[100px] bg-slate-950 border-slate-800 font-mono text-sm leading-relaxed"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Auxiliary Mode */}
                <Card className="border-purple-500/20 bg-slate-900/50">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-purple-400">
                                <Sparkles className="h-5 w-5" /> Auxiliary Mode (Creative)
                            </CardTitle>
                        </div>
                        <CardDescription>
                            Allows the AI to use general knowledge to explain, expand, or fill gaps in the documents.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-slate-400 mb-2 block">System Instruction (Prompt)</label>
                            <Textarea
                                value={settings.auxiliary.instruction}
                                onChange={(e) => setSettings({
                                    ...settings,
                                    auxiliary: { ...settings.auxiliary, instruction: e.target.value }
                                })}
                                className="min-h-[100px] bg-slate-950 border-slate-800 font-mono text-sm leading-relaxed"
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-4 pt-4 border-t border-slate-800">
                    <Link href="/settings">
                        <Button variant="ghost">Cancel</Button>
                    </Link>
                    <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 min-w-[100px]">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" /> Save Rules</>}
                    </Button>
                </div>
            </div>
        </div>
    );
}
