import { getFilesAction } from "@/actions/file-actions";
import { SearchView } from "@/components/SearchView";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function SearchPage() {
    const files = await getFilesAction();
    return <SearchView initialFiles={files} />;
}
