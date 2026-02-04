import { getUserStatsAction } from "@/actions/file-actions";
import { SettingsView } from "@/components/SettingsView";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
    const { auth } = await import("@/lib/auth");
    const session = await auth();
    const result = await getUserStatsAction();
    const userStats = ("error" in result) ? { name: "Guest", totalDocs: 0, storageUsed: "0 KB", storageLimit: "1 GB" } : result;

    // Inject session expiry into userStats for display
    if (session?.expires) {
        (userStats as any).expires = session.expires;
    }

    return <SettingsView userStats={userStats} />;
}
