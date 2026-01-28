"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, User, Key, Bell, Palette, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

interface SettingsViewProps {
    userStats: { name: string };
}

export function SettingsView({ userStats }: SettingsViewProps) {
    const { t, dir } = useI18n();

    return (
        <div className="flex flex-col min-h-screen">
            <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border/40 bg-background/95 px-6 backdrop-blur">
                <Link href="/" className="text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft className={cn("h-4 w-4", dir === "rtl" && "rotate-180")} />
                </Link>
                <h1 className="text-lg font-medium">{t.settings.title}</h1>
            </header>

            <div className="flex-1 p-8 space-y-6 max-w-2xl mx-auto w-full">
                {/* Language (Integrated here or kept in Sidebar? Sidebar has it. Duplicate here is fine for settings page) */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            Language
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">{t.settings.language}</p>
                                <p className="text-sm text-muted-foreground">{t.settings.languageDesc}</p>
                            </div>
                            <LanguageSwitcher />
                        </div>
                    </CardContent>
                </Card>

                {/* Profile */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-4 w-4" /> {t.settings.profile}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm text-muted-foreground">{t.settings.name}</label>
                            <Input defaultValue={userStats.name} className="mt-1 bg-slate-800" />
                        </div>
                        <div>
                            <label className="text-sm text-muted-foreground">{t.settings.email}</label>
                            <Input defaultValue="saeed@example.com" className="mt-1 bg-slate-800" disabled />
                        </div>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">{t.settings.saveChanges}</Button>
                    </CardContent>
                </Card>

                {/* Chat Rules */}
                <Link href="/settings/chat-rules">
                    <Card className="hover:bg-slate-900/50 transition-colors cursor-pointer border-blue-500/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MessageSquare className="h-4 w-4 text-blue-400" /> Chat Rules
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">Customize how the AI responds in Limited vs. Auxiliary modes.</p>
                        </CardContent>
                    </Card>
                </Link>

                {/* API Key */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Key className="h-4 w-4" /> {t.settings.apiConfig}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm text-muted-foreground">{t.settings.googleApiKey}</label>
                            <Input type="password" defaultValue="•••••••••••••••" className="mt-1 bg-slate-800" />
                            <p className="text-xs text-muted-foreground mt-1">{t.settings.apiKeyHelp}</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Preferences */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Palette className="h-4 w-4" /> {t.settings.preferences}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">{t.settings.comingSoon}</p>
                    </CardContent>
                </Card>

                {/* Notifications */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bell className="h-4 w-4" /> {t.settings.notifications}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">{t.settings.comingSoon}</p>
                    </CardContent>
                </Card>
            </div>
        </div >
    );
}
