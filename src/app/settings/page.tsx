import { getUserStatsAction } from "@/actions/file-actions";
import { SettingsView } from "@/components/SettingsView";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
    const userStats = await getUserStatsAction();
    return <SettingsView userStats={userStats} />;
}
