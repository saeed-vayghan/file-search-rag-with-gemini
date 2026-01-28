"use server";

import connectToDatabase from "@/lib/db";
import User from "@/models/User";
import { revalidatePath } from "next/cache";

// Mock User Email for now
const USER_EMAIL = "saeed@example.com";

export type ChatModeSettings = {
    limited: { instruction: string; enabled: boolean };
    auxiliary: { instruction: string; enabled: boolean };
    defaultMode: "limited" | "auxiliary";
};

export async function getChatModeSettings(): Promise<ChatModeSettings | null> {
    await connectToDatabase();
    try {
        const user = await User.findOne({ email: USER_EMAIL }).select("settings");
        if (!user || !user.settings?.chatModes) return null;

        // Ensure default structure if partial
        return {
            limited: {
                instruction: user.settings.chatModes.limited?.instruction || "Answer ONLY using the provided context. Do not use outside knowledge. If the answer is not found, say so.",
                enabled: user.settings.chatModes.limited?.enabled ?? true
            },
            auxiliary: {
                instruction: user.settings.chatModes.auxiliary?.instruction || "Use the provided context as a primary source, but feel free to expand with your general knowledge to provide a helpful answer.",
                enabled: user.settings.chatModes.auxiliary?.enabled ?? true
            },
            defaultMode: (user.settings.chatModes as any).defaultMode || "limited"
        };
    } catch (error) {
        console.error("Failed to fetch settings:", error);
        return null;
    }
}

export async function updateChatModeSettings(settings: ChatModeSettings) {
    await connectToDatabase();
    try {
        await User.findOneAndUpdate(
            { email: USER_EMAIL },
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
}
