"use client";

import { ReactNode } from "react";
import { I18nContext } from "@/lib/i18n/provider";
import { en } from "@/lib/i18n/en";
import { LOG_MESSAGES } from "@/config/constants";

/**
 * A wrapper component that forces the content to be in English and LTR.
 * Use this for components that should not be localized (e.g. debugging tools, admin panels).
 */
export function ForceEnglishWrapper({ children }: { children: ReactNode }) {
    return (
        <I18nContext.Provider
            value={{
                locale: "en",
                t: en,
                dir: "ltr",
                setLocale: () => console.warn(LOG_MESSAGES.UI.LOCALE_WARN)
            }}
        >
            <div dir="ltr" className="font-sans text-left">
                {children}
            </div>
        </I18nContext.Provider>
    );
}
