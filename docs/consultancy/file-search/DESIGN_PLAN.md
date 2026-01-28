# 🎨 Design Plan: File Search SaaS (v2)

**Objective**: Create a professional, accessible, "Fintech-grade" interface for the "Library".
**Pivot**: Removed Glassmorphism. Focus on Cleanliness, Hierarchy, and Trust.

## 1. Visual Identity (The "Fintech" Vibe)
-   **Style**: Solid, Matte, High-Contrast, Organized.
-   **Typography**: **Inter** (Standard, Legible) or **Plus Jakarta Sans** (Modern Fintech).
-   **Colors (Dark Mode "Vault")**:
    -   Background: `#0f172a` (Slate 950) - Deep, solid navy-grey.
    -   Surface: `#1e293b` (Slate 800) - Distinct cards.
    -   Border: `#334155` (Slate 700) - High contrast borders.
    -   Accent: `#3b82f6` (Blue 500) - Trustworthy Blue (not neon).
    -   Success: `#10b981` (Emerald 500) - Data is safe.
-   **Accessibility**: WCAG AA Compliant. High contrast text. Focus rings.

## 2. Key UX Principles
-   **Hierarchy**: Use font weights and size to denote importance. Data first.
-   **Density**: Information-dense but not cluttered. "Data Table" feel for files.
-   **Affordance**: Buttons look like buttons. Cards look like cards. No ambiguous floating elements.

## 3. Key Screens (Re-Imagined)

### A. The Dashboard ("The Vault")
-   **Layout**: Classic Admin Layout.
    -   **Sidebar**: Clearly defined, solid background, high contrast active states.
    -   **Header**: Breadcrumbs + Search.
    -   **Main Area**:
        -   **KPI Section**: Clear metrics (Storage Used, Files Indexed).
        -   **Data Grid**: A robust table for Recent Files with sortable headers.
        -   **Collections List**: Horizontal cards, no fancy blurs.

### B. The Reading Room ("The Analyst View")
-   **Focus**: Readability and citation accuracy.
-   **Layout**:
    -   **Split Pane**: Distinct separation between Document and Chat.
    -   **Chat**:
        -   Bubbles: Light grey vs Blue. High contrast.
        -   Typography: Larger line-height for reading.

## 4. Deliverables
-   `ui_concept_fintech_dashboard.png`
-   `ui_concept_fintech_reading.png`
-   Updated `DESIGN_SPECS.md`
