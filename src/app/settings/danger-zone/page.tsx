"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { purgeUserDataAction } from "@/actions/file-actions";
import { AlertTriangle, Trash2, CheckCircle, Loader2 } from "lucide-react";

export default function DangerZonePage() {
    const { t, dir } = useI18n();
    const router = useRouter();

    const [confirmText, setConfirmText] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const handlePurge = async () => {
        if (confirmText !== "DELETE") return;

        setIsDeleting(true);
        setError("");

        try {
            const result = await purgeUserDataAction();
            if (result.success) {
                setSuccess(true);
                // Redirect after a brief delay to show success message
                setTimeout(() => {
                    router.push("/");
                    router.refresh();
                }, 2000);
            } else {
                setError(result.error || t.dangerZone.errorMessage);
                setIsDeleting(false);
            }
        } catch (e) {
            setError(t.dangerZone.errorMessage);
            setIsDeleting(false);
        }
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center space-y-4 animate-in fade-in zoom-in duration-300">
                <CheckCircle className="w-16 h-16 text-emerald-500" />
                <h1 className="text-2xl font-bold text-emerald-500">{t.dangerZone.successTitle}</h1>
                <p className="text-slate-400">{t.dangerZone.successMessage}</p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto p-8 space-y-8">
            <div className="flex items-center gap-3 border-b border-border pb-6">
                <AlertTriangle className="w-8 h-8 text-red-500" />
                <h1 className="text-3xl font-bold text-slate-100 uppercase tracking-wider">
                    {t.dangerZone.title}
                </h1>
            </div>

            <div className="space-y-6">
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 space-y-3">
                    <h2 className="text-xl font-semibold text-red-400 flex items-center gap-2">
                        <Trash2 className="w-5 h-5" />
                        {t.dangerZone.warningTitle}
                    </h2>
                    <p className="text-red-300/80 leading-relaxed">
                        {t.dangerZone.warningText}
                    </p>
                </div>

                <div className="bg-slate-900 border border-border rounded-lg p-8 space-y-6 shadow-xl">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-400">
                            {t.dangerZone.confirmTitle}
                        </label>
                        <p className="text-xs text-slate-500">
                            {t.dangerZone.confirmText}
                        </p>
                    </div>

                    <input
                        type="text"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder="DELETE"
                        className="w-full bg-black/50 border border-border rounded-md px-4 py-3 text-slate-100 placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/50 font-mono tracking-widest text-center uppercase"
                        dir="ltr"
                    />

                    {error && (
                        <div className="p-3 bg-red-950/50 text-red-400 text-sm rounded-md text-center">
                            {error}
                        </div>
                    )}

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            onClick={() => router.back()}
                            className="px-4 py-2 text-slate-400 hover:text-slate-200 transition-colors text-sm font-medium"
                            disabled={isDeleting}
                        >
                            {t.dangerZone.cancelButton}
                        </button>
                        <button
                            onClick={handlePurge}
                            disabled={confirmText !== "DELETE" || isDeleting}
                            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-md font-bold transition-all shadow-lg hover:shadow-red-900/20 flex items-center gap-2"
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {t.common.loading}
                                </>
                            ) : (
                                t.dangerZone.confirmButton
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
