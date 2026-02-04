import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import { join } from "path";
import connectToDatabase from "@/lib/db";
import FileModel from "@/models/File";
import { MESSAGES, LOG_MESSAGES } from "@/config/constants";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        await connectToDatabase();
        const file = await FileModel.findById(id);

        if (!file) {
            return NextResponse.json({ error: MESSAGES.ERRORS.FILE_NOT_FOUND }, { status: 404 });
        }

        if (!file.localPath) {
            return NextResponse.json({ error: MESSAGES.ERRORS.PREVIEW_NOT_AVAILABLE }, { status: 404 });
        }

        // Get the absolute path to the file
        const absolutePath = join(process.cwd(), file.localPath);

        // Check if file exists
        try {
            await stat(absolutePath);
        } catch {
            return NextResponse.json({ error: MESSAGES.ERRORS.FILE_NOT_FOUND_ON_DISK }, { status: 404 });
        }

        // Read the file
        const fileBuffer = await readFile(absolutePath);

        // Return with proper Content-Type
        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": file.mimeType || "application/octet-stream",
                "Content-Disposition": `inline; filename="${file.displayName}"`,
                "Cache-Control": "private, max-age=3600",
            },
        });
    } catch (error) {
        console.error(LOG_MESSAGES.API.FILE_FAIL, error);
        return NextResponse.json({ error: MESSAGES.ERRORS.INTERNAL_SERVER_ERROR }, { status: 500 });
    }
}
