"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, FolderOpen, Settings, FileText, Search, Database, AlertTriangle, FlaskConical, LogOut, CreditCard } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useSession, signOut } from "next-auth/react";
import { Button } from "./ui/button";

export function Sidebar() {
    const pathname = usePathname();
    const { t, dir } = useI18n();
    const { data: session, status } = useSession();

    const navItems = [
        { label: t.nav.dashboard, icon: LayoutDashboard, href: "/" },
        { label: t.nav.search, icon: Search, href: "/search" },
        { label: t.nav.libraries, icon: FolderOpen, href: "/libraries" },
        { label: t.nav.store, icon: Database, href: "/store" },
        { label: "Billing", icon: CreditCard, href: "/billing" },
        { label: "Ask AI", icon: Search, href: "/chat/global" },
        { label: "Playground", icon: FlaskConical, href: "/playground" },
        { label: t.nav.settings, icon: Settings, href: "/settings" },
    ];

    return (
        <aside className={cn(
            "sticky top-0 z-40 h-screen w-64 border-border bg-slate-950 shrink-0",
            dir === "rtl" ? "border-l" : "border-r"
        )}>
            <div className="flex h-16 items-center px-6 border-b border-border/40">
                <FolderOpen className={cn("h-6 w-6 text-blue-500", dir === "rtl" ? "ml-2" : "mr-2")} />
                <span className="font-bold text-lg tracking-tight">File Search</span>
            </div>

            <nav className="space-y-1 p-4">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-blue-600 text-white shadow-md relative overflow-hidden"
                                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                            )}
                        >
                            <item.icon className="h-4 w-4" />
                            {item.label}
                            {isActive && (
                                <div className="absolute inset-0 bg-blue-600/10 opacity-0 hover:opacity-100 transition-opacity" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className="absolute bottom-4 start-4 end-4">


                <Link href="/settings/danger-zone" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors">
                    <AlertTriangle className="h-4 w-4" />
                    {t.dangerZone.title}
                </Link>

                {/* Language Switcher */}
                <div className="mt-2 px-1">
                    <LanguageSwitcher />
                </div>

                {/* User Profile */}
                {status === "authenticated" && session?.user && (
                    <div className="mt-4 border-t border-border pt-4 space-y-3">
                        <div className="flex items-center gap-3 px-2">
                            {session.user.image ? (
                                <img
                                    src={session.user.image}
                                    alt={session.user.name || "User"}
                                    className="h-8 w-8 rounded-full"
                                />
                            ) : (
                                <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-500">
                                    {session.user.name?.[0] || session.user.email?.[0] || "U"}
                                </div>
                            )}
                            <div className="flex flex-col flex-1 min-w-0">
                                <span className="text-xs font-medium text-white truncate">
                                    {session.user.name || "User"}
                                </span>
                                <span className="text-[10px] text-slate-500 truncate">
                                    {session.user.email}
                                </span>
                            </div>
                        </div>
                        <Button
                            onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                            variant="outline"
                            size="sm"
                            className="w-full border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white"
                        >
                            <LogOut className="h-3.5 w-3.5 mr-2" />
                            Sign Out
                        </Button>
                    </div>
                )}

                {/* Loading State */}
                {status === "loading" && (
                    <div className="mt-4 border-t border-border pt-4">
                        <div className="flex items-center gap-3 px-2">
                            <div className="h-8 w-8 rounded-full bg-slate-800 animate-pulse" />
                            <div className="flex flex-col gap-1 flex-1">
                                <div className="h-3 bg-slate-800 rounded animate-pulse w-20" />
                                <div className="h-2 bg-slate-800 rounded animate-pulse w-16" />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </aside >
    );
}
