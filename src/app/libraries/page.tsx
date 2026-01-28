import { getLibrariesAction } from "@/actions/file-actions";
import { LibrariesView } from "@/components/LibrariesView";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function LibrariesPage() {
    const libraries = await getLibrariesAction();
    return <LibrariesView libraries={libraries} />;
}
