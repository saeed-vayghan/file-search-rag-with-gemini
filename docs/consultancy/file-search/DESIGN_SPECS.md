# 📐 Design Specifications: File Search SaaS

**Status**: DRAFT (v2 - Fintech Pivot)
**Target Audience**: Frontend Engineer (Kaveh)

## 1. Design System Tokens (Tailwind - Slate Theme)

| Token | Value | Designation |
| :--- | :--- | :--- |
| `background` | `slate-950` (#020617) | App background (Deepest Navy) |
| `surface` | `slate-900` (#0f172a) | Card backgrounds |
| `surface-hover` | `slate-800` (#1e293b) | Interactive states |
| `border` | `slate-700` (#334155) | High contrast borders |
| `primary` | `blue-600` (#2563eb) | Trustworthy Action Blue |
| `text-main` | `white` | Primary content |
| `text-muted` | `slate-400` | Secondary labels |
| `radius` | `0.375rem` (rounded-md) | Tighter, professional radius |

## 2. Layout & Components (Shadcn/UI - Clean Variant)

### 2.1 The Dashboard (`/dashboard`)
*Refer to `ui_concept_fintech_dashboard.png`*

-   **Structure**: Classic Admin Dashboard.
    -   **Sidebar**: Solid `slate-900` background. Border-right `slate-800`.
    -   **Cards**: `bg-slate-900`, `border-slate-800`. **NO BACKDROP BLUR.**
-   **Key Components**:
    -   **KPI Cards**: Simple metrics. Big Number + Label.
    -   **Data Table**: Use `TanStack Table`.
        -   Striped rows optional.
        -   Compact density.
    -   **Status Badges**: Solid colors, no glows.
        -   `bg-emerald-500/10 text-emerald-500` (Active)
        -   `bg-amber-500/10 text-amber-500` (Processing)

### 2.2 The Reading Room (`/chat/[id]`)
*Refer to `ui_concept_fintech_reading.png`*

-   **Focus**: Accessibility & Readability.
-   **Structure**: Split View.
    -   **Chat Bubbles**:
        -   User: `bg-blue-600 text-white`
        -   AI: `bg-slate-800 text-slate-100`
    -   **Typography**: `prose-slate` invert. large base size (`text-base` or `text-lg`).

## 3. Accessibility Checklist
-   [ ] **Contrast**: Check blue buttons against dark background (Aim for usually > 4.5:1).
-   [ ] **Focus**: Visible ring on all interactive elements.
-   [ ] **Structure**: Use proper HTML5 (`<main>`, `<nav>`, `<aside>`).
