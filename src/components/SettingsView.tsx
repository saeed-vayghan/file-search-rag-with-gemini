"use client";

import { useState, useTransition } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, User, Key, Bell, Palette, MessageSquare, CreditCard } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { updateUserAction } from "@/actions/user-actions";
import { signOut } from "next-auth/react";

interface SettingsViewProps {
    userStats: {
        name: string;
        email?: string;
        image?: string | null;
        expires?: string;
        [key: string]: any;
    };
}

export function SettingsView({ userStats }: SettingsViewProps) {
    const { t, dir } = useI18n();

    const [name, setName] = useState(userStats.name);
    const [isPending, startTransition] = useTransition();

    const handleSave = () => {
        startTransition(async () => {
            const result = await updateUserAction({ name });
            if ("error" in result) {
                // You might want to add a toast notification here
                alert("Failed to update profile: " + result.error);
            } else if (!result.success) {
                alert("Failed to update profile");
            }
        });
    };

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
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="mt-1 bg-slate-800"
                            />
                        </div>
                        <div className="flex items-center gap-4 mb-4">
                            {/* Avatar Display */}
                            {userStats.image ? (
                                <img src={userStats.image} alt={userStats.name} className="h-16 w-16 rounded-full border border-slate-700" />
                            ) : (
                                <div className="h-16 w-16 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                                    <User className="h-8 w-8 text-slate-500" />
                                </div>
                            )}
                            <div className="text-sm text-slate-400">
                                Google Account
                            </div>
                        </div>

                        <div>
                            <label className="text-sm text-muted-foreground">{t.settings.email}</label>
                            <Input defaultValue={userStats.email || "Unknown"} className="mt-1 bg-slate-800" disabled />
                        </div>
                        {userStats.expires && (
                            <div>
                                <label className="text-sm text-muted-foreground">Session Expires</label>
                                <Input
                                    defaultValue={new Date(userStats.expires).toLocaleString()}
                                    className="mt-1 bg-slate-800"
                                    disabled
                                />
                            </div>
                        )}
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700"
                                onClick={handleSave}
                                disabled={isPending}
                            >
                                {isPending ? "Saving..." : t.settings.saveChanges}
                            </Button>
                            <Button
                                size="sm"
                                variant="destructive"
                                onClick={async () => {
                                    signOut({ callbackUrl: "/auth/signin" });
                                }}
                            >
                                Sign Out
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Chat Rules */}
                <Link href="/settings/chat-rules" className="block">
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

                {/* Billing */}
                <Link href="/billing" className="block">
                    <Card className="hover:bg-slate-900/50 transition-colors cursor-pointer border-green-500/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CreditCard className="h-4 w-4 text-green-400" /> API Usage & Billing
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">Monitor your API costs, token usage, and consumption history.</p>
                        </CardContent>
                    </Card>
                </Link>

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
