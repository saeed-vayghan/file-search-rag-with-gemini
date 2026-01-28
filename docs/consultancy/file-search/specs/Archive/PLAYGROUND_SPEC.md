# Google File API Playground Specification

## 1. Overview
The **Playground** is an isolated section of the application designed to let developers (and power users) explore, experiment with, and debug the **Google File API**. It provides an interactive environment to select predefined API scenarios, modify the execution code on the fly, and visualize the request/response payloads in real-time.

## 2. User Experience (UX)
The Playground offers an IDE-like interface:
-   **Sidebar**: A categorized list of File API scenarios (e.g., "List Files", "Upload File", "Create Store").
-   **Main Editor**: A robust code editor (Monaco Engine) pre-loaded with the selected scenario's TypeScript code. The user can edit this code freely.
-   **Action Bar**: "Run" button to execute the code server-side.
-   **Output Panel**:
    -   **Result**: Beautifully formatted JSON response.
    -   **Console**: captured logs (`console.log`) from the execution.
    -   **Error**: Detailed stack traces if requests fail.

## 3. Architecture & Components

### 3.1 Directory Structure
We will isolate the playground logic to keep the main app clean.
```
src/
  app/
    playground/
      page.tsx          # Main entry point
      layout.tsx        # Playground-specific layout (full screen)
      _components/      # Playground UI components
        SnippetList.tsx
        CodeEditor.tsx
        ResultViewer.tsx
  actions/
    playground.ts       # Server actions for code execution
  config/
    playground-scenarios.ts # Configuration definitions
```

### 3.2 Configuration System
All playground scenarios are defined in a central config file: `src/config/playground-scenarios.ts`.
This ensures extensibility without touching the core UI logic.

**Config Schema:**
```typescript
interface PlaygroundScenario {
    id: string;
    category: 'Files' | 'Stores' | 'Operations';
    name: string;
    description: string;
    code: string; // The executable code template
}
```

### 3.3 Execution Engine (The "Sandbox")
To allow users to "update the js code", we will implement a Server Action that utilizes Node.js's `vm` module to execute the submitted code in a controlled context.

**Security Note:** functionality is strictly restricted to the `GoogleGenAI` SDK context to prevent system-level RCE.
**Context Injected:**
-   `ai`: The authenticated `GoogleGenAI` client.
-   `console`: A captured console logger to return logs to the UI.

### 3.4 Request/Response Visualization
The execution result will be serialized and returned to the client. We will use a component like `react-json-view` or a custom recursive renderer to make the JSON payloads readable (collapsible, color-coded).

## 4. Implementation Plan

### Phase 1: Foundation
1.  **Config**: Create `src/config/playground-scenarios.ts` with initial scenarios ("List Files", "Get Store").
2.  **Server Action**: Implement `executePlaygroundCode(code: string)` in `src/actions/playground.ts`.
    -   Setup `vm` context.
    -   Inject `GoogleGenAI` client.
    -   Capture standard output.

### Phase 2: UI Construction
1.  **Layout**: Create a full-height, split-pane layout for `/playground`.
2.  **Editor**: Integrate `@monaco-editor/react` for TypeScript highlighting.
3.  **Result View**: create a clean JSON output tab.

### Phase 3: Integration & Polish
1.  **Scenario Loading**: Connect the Sidebar to the Config.
2.  **Error Handling**: Graceful display of API errors (400/403/500).
3.  **Loading States**: Skeleton loaders while code executes.

## 5. Predefined Scenarios (Draft)
The initial config will include:
1.  **List Files**: `await ai.files.list()`
2.  **Get File Info**: `await ai.files.get({ name: '...' })`
3.  **List Stores**: `await ai.fileSearchStores.list()`
4.  **Create Store**: `await ai.fileSearchStores.create(...)`
5.  **Search Store**: `await ai.models.generateContent(...)` (RAG Probe)
