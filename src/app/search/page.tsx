import { getFilesAction } from "@/actions/file-actions";
import { SearchView } from "@/components/SearchView";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function SearchPage() {
    const result = await getFilesAction();
    const files = ("error" in result) ? [] : result;
    return <SearchView initialFiles={files} />;
}
