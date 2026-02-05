"use server";

import { revalidatePath } from "next/cache";
import FileModel from "@/models/File";
import Library from "@/models/Library";
import { withAuth } from "@/lib/auth";
import { UI_DEFAULTS, PATHS, LOG_MESSAGES, MESSAGES } from "@/config/constants";
import { logDebug } from "@/lib/logger";
import { deleteFileInternal } from "./utils";


export const getLibrariesAction = withAuth(async (user) => {
    const libraries = await Library.find({ userId: user._id }).lean();
    const result = await Promise.all(
        libraries.map(async (lib) => {
            const fileCount = await FileModel.countDocuments({
                userId: user._id,
                libraryId: lib._id
            });
            return {
                id: lib._id.toString(),
                name: lib.name,
                description: lib.description || "",
                icon: lib.icon || UI_DEFAULTS.LIBRARY.ICON,
                color: lib.color || UI_DEFAULTS.LIBRARY.COLOR,
                count: fileCount,
            };
        })
    );
    return result;
});


export const createLibraryAction = withAuth(async (user, name: string, icon?: string, color?: string) => {
    try {
        const library = await Library.create({
            userId: user._id,
            name,
            icon: icon || UI_DEFAULTS.LIBRARY.ICON,
            color: color || UI_DEFAULTS.LIBRARY.COLOR,
        });
        revalidatePath(PATHS.HOME);
        revalidatePath(PATHS.LIBRARIES);
        return {
            success: true,
            library: {
                id: library._id.toString(),
                name: library.name,
                icon: library.icon,
                color: library.color,
            }
        };
    } catch (error) {
        console.error(LOG_MESSAGES.FILE.CREATE_LIB_FAIL, error);
        return { error: MESSAGES.ERRORS.CREATE_LIB_FAILED };
    }
}, { rateLimit: { limit: 10, windowMs: 10 * 60 * 1000, actionName: "library" } });


export const updateLibraryAction = withAuth(async (user, libraryId: string, name: string, icon?: string, color?: string) => {
    try {
        const library = await Library.findOne({ _id: libraryId, userId: user._id });
        if (!library) {
            return { error: MESSAGES.ERRORS.LIB_NOT_FOUND };
        }
        library.name = name;
        if (icon) library.icon = icon;
        if (color) library.color = color;
        await library.save();

        revalidatePath(PATHS.HOME);
        revalidatePath(PATHS.LIBRARIES);
        revalidatePath(`${PATHS.LIBRARIES}/${libraryId}`);

        return {
            success: true,
            library: {
                id: library._id.toString(),
                name: library.name,
                icon: library.icon,
                color: library.color,
            }
        };
    } catch (error) {
        console.error(LOG_MESSAGES.FILE.UPDATE_LIB_FAIL, error);
        return { error: MESSAGES.ERRORS.UPDATE_LIB_FAILED };
    }
}, { rateLimit: { limit: 10, windowMs: 10 * 60 * 1000, actionName: "library" } });


export const deleteLibraryAction = withAuth(async (user, libraryId: string) => {
    try {
        const library = await Library.findOne({ _id: libraryId, userId: user._id });
        if (!library) {
            return { error: MESSAGES.ERRORS.LIB_NOT_FOUND };
        }

        const files = await FileModel.find({ libraryId: library._id, userId: user._id });
        logDebug("DeleteLibrary", `Found ${files.length} files in library ${library.name} (${libraryId})`);

        let failedCount = 0;

        for (const file of files) {
            try {
                const result = await deleteFileInternal(user, file._id.toString());
                if (!result.success) {
                    failedCount++;
                }
            } catch (err) {
                console.error("Library File Delete Exception:", err);
                failedCount++;
            }
        }

        if (failedCount > 0) {
            return { error: `Failed to delete ${failedCount} files. Library not deleted.` };
        }

        await Library.findByIdAndDelete(libraryId);
        revalidatePath(PATHS.HOME);
        revalidatePath(PATHS.LIBRARIES);
        return { success: true, message: MESSAGES.SUCCESS.LIBRARY_DELETED };
    } catch (error) {
        console.error(LOG_MESSAGES.FILE.DELETE_LIB_FAIL, error);
        return { error: MESSAGES.ERRORS.DELETE_LIB_FAILED };
    }
});
