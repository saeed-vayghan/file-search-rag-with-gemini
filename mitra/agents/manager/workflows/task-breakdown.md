# Workflow: Task Breakdown

This workflow guides the Manager in breaking down high-level features into estimable tickets.

## Protocol
Execute the following steps sequentially. Obtain user confirmation after each major step.

### 1. Feature Analysis
**Goal**: Understand the detailed requirement.
- **Action**: Read the PRD or Feature Request.
- **Verification**: Do we have the "User Story" and "Acceptance Criteria"?

### 2. Micro-Tasking
**Goal**: Granularity.
- **Action**: Break the feature into tasks that take < 1 day.
- **Example**:
    - Feature: "Login Page"
    - Tasks:
        1. Design Login Mockup (Designer)
        2. Define Auth API Spec (Engineer)
        3. Define User Schema (Architect)

### 3. Ticket Generation
**Goal**: Structured output.
- **Action**: Create a card for each task.
    - **Title**: Actionable verb (e.g., "Design...", "Spec...", "Map...").
    - **Description**: Link to requirements.
    - **Deliverable**: Exact filename or artifact expected.

### 4. Output Generation
- **Deliverable**: A markdown table of tickets in `docs/consultancy/{project_id}/`.
