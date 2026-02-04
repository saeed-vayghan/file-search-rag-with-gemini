"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Locale, Dictionary } from "./types";
import { en } from "./en";
import { fa } from "./fa";
import { MESSAGES } from "@/config/constants";

const dictionaries: Record<Locale, Dictionary> = { en, fa };

type I18nContextType = {
    locale: Locale;
    t: Dictionary;
    setLocale: (locale: Locale) => void;
    dir: "ltr" | "rtl";
};

export const I18nContext = createContext<I18nContextType | undefined>(undefined);

const STORAGE_KEY = "preferred-locale";

export function I18nProvider({ children }: { children: ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>("en");
    const [mounted, setMounted] = useState(false);

    // Load saved preference on mount
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
        if (saved && (saved === "en" || saved === "fa")) {
            setLocaleState(saved);
        }
        setMounted(true);
    }, []);

    // Update document attributes when locale changes
    useEffect(() => {
        if (!mounted) return;

        const dir = locale === "fa" ? "rtl" : "ltr";
        document.documentElement.dir = dir;
        document.documentElement.lang = locale;

        // Update font class
        if (locale === "fa") {
            document.documentElement.classList.add("font-farsi");
            document.documentElement.classList.remove("font-sans");
        } else {
            document.documentElement.classList.remove("font-farsi");
            document.documentElement.classList.add("font-sans");
        }
    }, [locale, mounted]);

    const setLocale = (newLocale: Locale) => {
        setLocaleState(newLocale);
        localStorage.setItem(STORAGE_KEY, newLocale);
    };

    const t = dictionaries[locale];
    const dir = locale === "fa" ? "rtl" : "ltr";

    // Prevent hydration mismatch - render with default until mounted
    if (!mounted) {
        return (
            <I18nContext.Provider value={{ locale: "en", t: en, setLocale, dir: "ltr" }}>
                {children}
            </I18nContext.Provider>
        );
    }

    return (
        <I18nContext.Provider value={{ locale, t, setLocale, dir }}>
            {children}
        </I18nContext.Provider>
    );
}

export function useI18n() {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error(MESSAGES.ERRORS.USE_I18N_CONTEXT);
    }
    return context;
}
