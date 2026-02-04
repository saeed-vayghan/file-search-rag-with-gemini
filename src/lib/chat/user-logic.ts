import { CHAT_CONSTANTS, CHAT_MODES, ChatModeType } from "@/config/constants";

export type ChatModeSettings = {
    limited: { instruction: string; enabled: boolean };
    auxiliary: { instruction: string; enabled: boolean };
    defaultMode: ChatModeType;
};

/**
 * Pure function to normalize database settings into a complete ChatModeSettings object.
 */
export function normalizeChatModeSettings(dbSettings: any): ChatModeSettings {
    return {
        limited: {
            instruction: dbSettings?.limited?.instruction || CHAT_CONSTANTS.MODES.LIMITED.DEFAULT_INSTRUCTION,
            enabled: dbSettings?.limited?.enabled ?? true
        },
        auxiliary: {
            instruction: dbSettings?.auxiliary?.instruction || CHAT_CONSTANTS.MODES.AUXILIARY.DEFAULT_INSTRUCTION,
            enabled: dbSettings?.auxiliary?.enabled ?? true
        },
        defaultMode: dbSettings?.defaultMode || CHAT_MODES.LIMITED
    };
}
