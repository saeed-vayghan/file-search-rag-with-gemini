import { getLibraryFilesAction } from "@/actions/file-actions";
import { LibraryDetailsView } from "@/components/LibraryDetailsView";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function LibraryPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { library, files } = await getLibraryFilesAction(id);

    if (!library) {
        notFound();
    }

    return <LibraryDetailsView library={library} initialFiles={files} />;
}
