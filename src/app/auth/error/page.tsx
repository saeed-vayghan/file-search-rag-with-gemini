"use client";

import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Suspense } from "react";

function ErrorContent() {
    const searchParams = useSearchParams();
    const error = searchParams.get("error");

    const errorMessages: Record<string, { title: string; description: string }> = {
        Configuration: {
            title: "Server Configuration Error",
            description: "There is a problem with the server configuration. Please contact support.",
        },
        AccessDenied: {
            title: "Access Denied",
            description: "You do not have permission to sign in.",
        },
        Verification: {
            title: "Verification Failed",
            description: "The verification token has expired or has already been used.",
        },
        OAuthSignin: {
            title: "OAuth Sign-in Error",
            description: "Error in constructing an authorization URL.",
        },
        OAuthCallback: {
            title: "OAuth Callback Error",
            description: "Error in handling the response from the OAuth provider.",
        },
        OAuthCreateAccount: {
            title: "Account Creation Failed",
            description: "Could not create OAuth provider user in the database.",
        },
        EmailCreateAccount: {
            title: "Email Account Creation Failed",
            description: "Could not create email provider user in the database.",
        },
        Callback: {
            title: "Callback Error",
            description: "Error in the OAuth callback handler route.",
        },
        Default: {
            title: "Authentication Error",
            description: "An error occurred during the authentication process.",
        },
    };

    const errorInfo = errorMessages[error || "Default"] || errorMessages.Default;

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
            <Card className="w-full max-w-md bg-slate-900 border-slate-800 p-8">
                <div className="flex flex-col items-center space-y-6">
                    {/* Error Icon */}
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                        <span className="text-4xl">⚠️</span>
                    </div>

                    {/* Error Message */}
                    <div className="text-center space-y-2">
                        <h1 className="text-2xl font-bold text-white">
                            {errorInfo.title}
                        </h1>
                        <p className="text-slate-400">
                            {errorInfo.description}
                        </p>
                    </div>

                    {/* Error Code */}
                    {error && (
                        <div className="w-full p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                            <p className="text-xs text-slate-400 text-center">
                                Error Code: <span className="text-red-400 font-mono">{error}</span>
                            </p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="w-full space-y-3">
                        <Link href="/auth/signin" className="block w-full">
                            <Button className="w-full bg-blue-600 hover:bg-blue-700">
                                Try Again
                            </Button>
                        </Link>
                        <Link href="/" className="block w-full">
                            <Button variant="outline" className="w-full border-slate-700 hover:bg-slate-800">
                                Go Home
                            </Button>
                        </Link>
                    </div>
                </div>
            </Card>
        </div>
    );
}

export default function AuthErrorPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center bg-slate-950">
                <div className="text-slate-400">Loading...</div>
            </div>
        }>
            <ErrorContent />
        </Suspense>
    );
}
