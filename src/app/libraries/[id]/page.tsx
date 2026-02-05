import { getFilesAction } from "@/actions/file-actions";
import { LibraryDetailsView } from "@/components/LibraryDetailsView";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function LibraryPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const result = await getFilesAction(id);

    if ("error" in result || !result.library) {
        notFound();
    }

    const { library, files } = result;

    return <LibraryDetailsView library={library} initialFiles={files} />;
}
