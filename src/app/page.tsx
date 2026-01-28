import { getFilesAction, getUserStatsAction, getLibrariesAction } from "@/actions/file-actions";
import { DashboardView } from "@/components/DashboardView";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  // Fetch real data from the database
  const [files, userStats, libraries] = await Promise.all([
    getFilesAction(),
    getUserStatsAction(),
    getLibrariesAction(),
  ]);

  return <DashboardView files={files} userStats={userStats} libraries={libraries} />;
}
