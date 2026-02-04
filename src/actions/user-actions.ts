"use server";

import User from "@/models/User";
import { revalidatePath } from "next/cache";
import { withAuth, withOptionalAuth } from "@/lib/auth-middleware";
import { MESSAGES, PATHS, LOG_MESSAGES } from "@/config/constants";
import { normalizeChatModeSettings, ChatModeSettings } from "@/lib/user-logic";

export type { ChatModeSettings } from "@/lib/user-logic";

export const getChatModeSettings = withOptionalAuth(async (user): Promise<ChatModeSettings | null> => {
    try {
        if (!user) return null;

        const userDoc = await User.findById(user._id).select("settings");
        if (!userDoc || !userDoc.settings?.chatModes) return null;

        return normalizeChatModeSettings(userDoc.settings.chatModes);
    } catch (error) {
        console.error(LOG_MESSAGES.USER.FETCH_SETTINGS_FAIL, error);
        return null;
    }
});

export const updateChatModeSettings = withAuth(async (user, settings: ChatModeSettings) => {
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
        revalidatePath(PATHS.SETTINGS);
        revalidatePath(PATHS.SETTINGS_CHAT_RULES);
        return { success: true };
    } catch (error) {
        console.error(LOG_MESSAGES.USER.UPDATE_SETTINGS_FAIL, error);
        return { success: false, error: MESSAGES.ERRORS.UPDATE_SETTINGS_FAILED };
    }
});

export const updateUserAction = withAuth(async (user, data: { name: string }) => {
    try {
        if (!data.name || data.name.trim().length === 0) {
            return { success: false, error: MESSAGES.ERRORS.NAME_EMPTY };
        }

        await User.findByIdAndUpdate(user._id, { name: data.name });
        revalidatePath(PATHS.SETTINGS);
        return { success: true };
    } catch (error) {
        console.error(LOG_MESSAGES.USER.UPDATE_PROFILE_FAIL, error);
        return { success: false, error: MESSAGES.ERRORS.UPDATE_PROFILE_FAILED };
    }
});
