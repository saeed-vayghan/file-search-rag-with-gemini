import type { Metadata } from "next";
import { Inter, Vazirmatn } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { cn } from "@/lib/utils";
import { I18nProvider } from "@/lib/i18n";

const inter = Inter({ subsets: ["latin"] });
const vazirmatn = Vazirmatn({ subsets: ["arabic"], variable: "--font-vazirmatn" });

export const metadata: Metadata = {
  title: "File Search SaaS",
  description: "AI-powered document search library",
};

import { ToastProvider } from "@/lib/toast";
import { AuthProvider } from "@/components/AuthProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr" className={cn("dark", vazirmatn.variable)}>
      <head />
      <body className={cn(inter.className, vazirmatn.className, "min-h-screen bg-[#050505] text-foreground antialiased")}>
        <AuthProvider>
          <I18nProvider>
            <ToastProvider>
              <div className="flex min-h-screen w-full max-w-[1600px] mx-auto border-x border-border/30 shadow-[0_0_80px_-10px_rgba(255,255,255,0.2)] bg-background">
                {/* Sidebar */}
                <Sidebar />

                {/* Main Content Area */}
                <main className="flex-1 transition-all duration-300 ease-in-out w-full">
                  {children}
                </main>
              </div>
            </ToastProvider>
          </I18nProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
