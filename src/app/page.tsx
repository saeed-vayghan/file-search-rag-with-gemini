import { getFilesAction, getUserStatsAction } from "@/actions/file-actions";
import { getLibrariesAction } from "@/actions/lib-actions";
import { DashboardView } from "@/components/DashboardView";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  // Fetch real data from the database
  const [filesResult, userStatsResult, librariesResult] = await Promise.all([
    getFilesAction(),
    getUserStatsAction(),
    getLibrariesAction(),
  ]);

  const files = ("error" in filesResult) ? [] : filesResult.files;
  const userStats = ("error" in userStatsResult) ? { name: "Guest", totalDocs: 0, storageUsed: "0 KB", storageLimit: "1 GB" } : userStatsResult;
  const libraries = ("error" in librariesResult) ? [] : librariesResult;

  return <DashboardView files={files} userStats={userStats} libraries={libraries} />;
}
