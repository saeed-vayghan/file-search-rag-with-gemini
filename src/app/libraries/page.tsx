import { getLibrariesAction } from "@/actions/lib-actions";
import { LibrariesView } from "@/components/LibrariesView";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function LibrariesPage() {
    const result = await getLibrariesAction();
    const libraries = ("error" in result) ? [] : result;
    return <LibrariesView libraries={libraries} />;
}
