"use client";

import { StoreStatsView } from "@/components/StoreStatsView";
import { useEffect, useState } from "react";
import { getStoreStatusAction } from "@/actions/file-actions";
import { Loader2 } from "lucide-react";

export default function StorePage() {
    const [storeData, setStoreData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadStore() {
            const result = await getStoreStatusAction();
            if ("success" in result && result.success && result.store) {
                setStoreData(result.store);
            } else {
                setError(result.error || "Failed to load store data");
            }
            setIsLoading(false);
        }
        loadStore();
    }, []);

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-full items-center justify-center text-red-400 min-h-[400px]">
                {error}
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto">
            <StoreStatsView initialStore={storeData} />
        </div>
    );
}
