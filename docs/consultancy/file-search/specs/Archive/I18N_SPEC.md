# Feature Spec: Internationalization (i18n)

**Version**: 1.2  
**Status**: APPROVED  
**Languages**: English (LTR, default), Farsi/Persian (RTL)

---

## Overview

Simple dictionary-based i18n. English keys are the defaults. Switching to Farsi re-renders UI with Farsi translations. No external i18n library required.

---

## Architecture

### Dictionary Structure

```typescript
// src/lib/i18n/types.ts
export type Locale = "en" | "fa";

export type Dictionary = {
  nav: {
    dashboard: string;
    search: string;
    collections: string;
    settings: string;
    activity: string;
  };
  upload: {
    title: string;
    dragDrop: string;
    chooseFile: string;
    supports: string;
  };
  chat: {
    placeholder: string;
    searching: string;
    askAbout: string;
  };
  common: {
    loading: string;
    error: string;
    save: string;
    cancel: string;
    delete: string;
  };
  // ... more keys
};
```

### Dictionary Files

```typescript
// src/lib/i18n/en.ts
export const en: Dictionary = {
  nav: {
    dashboard: "Dashboard",
    search: "Search",
    // ...
  }
};

// src/lib/i18n/fa.ts
export const fa: Dictionary = {
  nav: {
    dashboard: "داشبورد",
    search: "جستجو",
    // ...
  }
};
```

---

## Context Provider

```typescript
// src/lib/i18n/provider.tsx
const I18nContext = createContext<{
  locale: Locale;
  t: Dictionary;
  setLocale: (locale: Locale) => void;
}>();

export function I18nProvider({ children }) {
  const [locale, setLocale] = useState<Locale>("en");
  const t = locale === "en" ? en : fa;
  
  // Persist to localStorage
  // Update document.dir and document.lang
  
  return (
    <I18nContext.Provider value={{ locale, t, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);
```

---

## Usage in Components

```tsx
function Sidebar() {
  const { t } = useI18n();
  
  return (
    <nav>
      <Link>{t.nav.dashboard}</Link>
      <Link>{t.nav.search}</Link>
    </nav>
  );
}
```

---

## Fonts

### English
- **Inter** (already configured via `next/font`)

### Farsi
- **Vazir** (primary, modern)
- **B-Nazanin** (fallback, traditional)

```css
:root[lang="fa"] {
  --font-sans: 'Vazir', 'B Nazanin', sans-serif;
}
```

---

## RTL Support

```tsx
// In I18nProvider
useEffect(() => {
  document.documentElement.dir = locale === "fa" ? "rtl" : "ltr";
  document.documentElement.lang = locale;
}, [locale]);
```

### Tailwind RTL Classes
Install `tailwindcss-rtl` for utilities like `ms-4` (margin-start) instead of `ml-4`.

---

## Language Switcher

Simple toggle button:
```tsx
function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  
  return (
    <button onClick={() => setLocale(locale === "en" ? "fa" : "en")}>
      {locale === "en" ? "فارسی" : "English"}
    </button>
  );
}
```

---

## File Structure

```
/public/fonts/
  Vazir.woff2
  BNazanin.woff2
/src/lib/i18n/
  types.ts      # Dictionary type definitions
  en.ts         # English dictionary
  fa.ts         # Farsi dictionary
  provider.tsx  # Context provider + hook
  index.ts      # Barrel export
```

---

## Implementation Steps

1. Create `/src/lib/i18n/` folder with types, dictionaries, provider
2. Download Vazir and B-Nazanin fonts to `/public/fonts/`
3. Add font CSS configuration
4. Wrap app in `I18nProvider`
5. Install `tailwindcss-rtl` and configure Tailwind
6. Replace hardcoded strings with `t.key` throughout app
7. Add `LanguageSwitcher` component to sidebar/settings
8. Test both languages

---

## Verification

1. App loads in English by default
2. Click language toggle → UI re-renders in Farsi
3. Layout flips to RTL, Vazir font loads
4. Preference persists across page reloads
5. All components display correctly in RTL
