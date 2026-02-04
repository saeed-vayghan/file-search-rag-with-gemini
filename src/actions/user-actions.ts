"use server";

import connectToDatabase from "@/lib/db";
import User from "@/models/User";
import { revalidatePath } from "next/cache";
import { withAuth, withOptionalAuth } from "@/lib/auth-middleware";

export type ChatModeSettings = {
    limited: { instruction: string; enabled: boolean };
    auxiliary: { instruction: string; enabled: boolean };
    defaultMode: "limited" | "auxiliary";
};

export const getChatModeSettings = withOptionalAuth(async (user): Promise<ChatModeSettings | null> => {
    await connectToDatabase();
    try {
        if (!user) return null;

        const userDoc = await User.findById(user._id).select("settings");
        if (!userDoc || !userDoc.settings?.chatModes) return null;

        // Ensure default structure if partial
        return {
            limited: {
                instruction: userDoc.settings.chatModes.limited?.instruction || "Answer ONLY using the provided context. Do not use outside knowledge. If the answer is not found, say so.",
                enabled: userDoc.settings.chatModes.limited?.enabled ?? true
            },
            auxiliary: {
                instruction: userDoc.settings.chatModes.auxiliary?.instruction || "Use the provided context as a primary source, but feel free to expand with your general knowledge to provide a helpful answer.",
                enabled: userDoc.settings.chatModes.auxiliary?.enabled ?? true
            },
            defaultMode: (userDoc.settings.chatModes as any).defaultMode || "limited"
        };
    } catch (error) {
        console.error("Failed to fetch settings:", error);
        return null;
    }
});

export const updateChatModeSettings = withAuth(async (user, settings: ChatModeSettings) => {
    await connectToDatabase();
    try {
        await User.findByIdAndUpdate(
            user._id,
            {
                $set: {
                    "settings.chatModes": {
                        limited: settings.limited,
                        auxiliary: settings.auxiliary,
                        defaultMode: settings.defaultMode
                    }
                }
            },
            { upsert: true, new: true }
        );
        revalidatePath("/settings");
        revalidatePath("/settings/chat-rules");
        return { success: true };
    } catch (error) {
        console.error("Failed to update settings:", error);
        return { success: false, error: "Failed to update settings" };
    }
});

export const updateUserAction = withAuth(async (user, data: { name: string }) => {
    await connectToDatabase();
    try {
        if (!data.name || data.name.trim().length === 0) {
            return { success: false, error: "Name cannot be empty" };
        }

        await User.findByIdAndUpdate(user._id, { name: data.name });
        revalidatePath("/settings");
        return { success: true };
    } catch (error) {
        console.error("Failed to update user profile:", error);
        return { success: false, error: "Failed to update profile" };
    }
});
