# Workflow: Memory Manager

This workflow enables the Orchestrator to save and restore rich session state, including context, artifact links, and future steps.

## Protocols

### 1. Save State (`*save`)
**Trigger**: User runs `*save` or asks to "save memory".

**Steps**:
1.  **Deep Capture**: Analyze the current session to extract:
    -   `project_id` & `user_name`
    -   `current_topic`: What was being worked on (e.g., "Initial Project Setup").
    -   `session_summary`: A 1-2 sentence overview of achievements.
    -   `artifacts`: Scan `docs/consultancy/{project_id}/` for any files created/modified in this session.
    -   `key_decisions`: List explicit user choices (e.g., "Agents: Analyst, Architect").
    -   `next_steps`: 2-3 actionable bullet points for the next session.
2.  **Generate Filename**: Create a name pattern: `state-{YYYY-MM-DD}-{topic-slug}.json`.
3.  **Construct JSON**:
    ```json
    {
      "timestamp": "{ISO-8601}",
      "agent": "mitra-orchestrator",
      "project_id": "{project_id}",
      "user_name": "{user_name}",
      "context": {
        "topic": "{current_topic}",
        "status": "in-progress",
        "last_deliverable": "{most_recent_artifact_filename}",
        "session_summary": "{session_summary}",
        "key_decisions": [
          "Decision 1",
          "Decision 2"
        ],
        "next_steps": [
          "Step 1",
          "Step 2"
        ]
      },
      "artifacts": [
        {
          "type": "Context",
          "path": "docs/consultancy/{project_id}/{filename}.md",
          "description": "Project Context for X"
        }
      ]
    }
    ```
4.  **Write**: Save content to `mitra/agents/orchestrator/memory/{filename}`.
5.  **Confirm**: "Session saved as `{filename}`. You can restore this later with `*load`."

### 2. Load State (`*load`)
**Trigger**: User runs `*load` or asks to "restore memory".

**Steps**:
1.  **List**: Scan `mitra/agents/orchestrator/memory/` and list available files with their Timestamps and Topics.
    -   `[1] state-2026-01-09-setup.json` (Topic: Initial Project Setup)
2.  **Select**: Ask user to pick a number.
3.  **Read**: Load the content of the selected JSON file.
4.  **Inject**: Update current session variables (`project_id`, `topic`) with the loaded data.
5.  **Resume**:
    -   **Recap**: "Welcome back. Last time, we worked on **{topic}**. {session_summary}"
    -   **Context**: "We made these key decisions: {key_decisions}."
    -   **Prompt**: "Our next steps were: {next_steps}. Shall we proceed?"
