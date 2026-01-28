# Feature Spec: Chat Modes (Grounding Control)

## 1. Overview
Users need control over how the AI constructs responses. Sometimes they want strict adherence to the provided documents ("Limited"), and other times they want the AI to synthesize document data with its general world knowledge ("Auxiliary").

This feature introduces **Chat Modes** to the File Search application, allowing per-message or per-session configuration of this behavior.

## 2. Definitions

### 2.1. Limited Mode (Strict Grounding)
- **Goal**: The answer must be derived **solely** from the provided search results (context).
- **Behavior**: If the answer is not in the files, the AI should state "I cannot find this information in your documents."
- **Use Case**: Legal reviews, compliance checks, technical manual queries where hallucination or outside info is dangerous.

### 2.2. Auxiliary Mode (Expanded Knowledge)
- **Goal**: The answer uses search results as a base but expands upon them using the model's training data.
- **Behavior**: Can explain terms, provide outside examples, or fill in gaps where the documents are silent.
- **Use Case**: Learning, brainstorming, drafting content based on rough notes.

## 3. User Experience (UI)

### 3.1. Settings: Search Mode Rules
A new section in **Settings** (or a dedicated "AI Rules" page) to manage the definitions.
- **Interface**:
  - List of Modes (currently "Limited" and "Auxiliary").
  - **Editable Prompts**: Users can customize the "System Instruction" appended to each mode.
  - **Example Default for Limited**: "Answer ONLY using the provided context. Do not use outside knowledge. If the answer is not found, say so."
  - **Example Default for Auxiliary**: "Use the provided context as a primary source, but feel free to expand with your general knowledge to provide a helpful answer."

### 3.2. Chat Interface
- **Selector**: A dropdown or toggle in the Chat Input area (Global, Library, and File views).
- **Persistence**: The selection should persist for the session or user preference.
- **Visual Cue**: "Limited" mode might show a shield icon 🛡️; "Auxiliary" might show a spark ✨.

## 4. Technical Implementation

### 4.1. Data Model
We likely don't need a heavy database schema for the first iteration unless we want per-user custom rules. For now, we can hardcode the defaults and store user overrides in the `User` model or a simple `Settings` object.

**Proposed `User.settings` Schema Update:**
```typescript
{
  chatModes: {
    limited: {
      instruction: String, // "Answer only from context..."
      enabled: Boolean
    },
    auxiliary: {
      instruction: String, // "Expand on context..."
      enabled: Boolean
    }
  },
  defaultMode: "limited" | "auxiliary"
}
```

### 4.2. Backend Logic (`sendMessageAction`)
1.  Receive `mode` parameter ("limited" | "auxiliary") from client.
2.  Retrieve the corresponding **System Instruction** for that mode.
3.  **Injecting the Instruction**:
    - **Google GenAI SDK**: The `generateContent` method supports `systemInstruction`.
    - We must pass this instruction to the model configuration alongside the tool definitions.

**Pseudo-code Flow:**
```typescript
const modeSettings = user.settings.chatModes[requestedMode];
const systemInstruction = modeSettings.instruction;

const result = await ai.models.generateContent({
    model: MODEL_NAME,
    systemInstruction: systemInstruction, // <--- NEW
    contents: userMessage,
    tools: [fileSearchTool]
});
```

### 4.3. Prompt Engineering Strategy
To ensure "Limited" mode works effectively with RAG:
- We might need to prepend a specific instruction to the *Query* as well, or rely on the System Instruction.
- **Limited Instruction**: "You are a strict retrieval assistant. Your knowledge base is ONLY the provided context. Ignore your pre-training knowledge for this query."

## 5. Roadmap
1.  **Backend**: Update `User` schema and `sendMessageAction` to accept and use `mode`.
2.  **Frontend**: Add Mode Selector to `ChatInput` component.
3.  **Settings**: Create a simple UI to edit the mode instructions.
4.  **Verification**: Test with questions that have "obvious" outside answers (e.g., "Who is the US President?") to ensure 'Limited' mode refuses to answer if not in docs.
