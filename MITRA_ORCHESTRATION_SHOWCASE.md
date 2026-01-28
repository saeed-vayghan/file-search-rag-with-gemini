# Case Study: Orchestrating Development with Mitra Agents

This document illustrates how the **Mitra Multi-Agent System** was utilized to orchestrate the end-to-end planning and specification of the **File Search Project**.

It demonstrates the core philosophy of Mitra: **"Consultancy-First, Implementation-Second"**. Instead of jumping straight into code, the agents acted as a consulting firm (Manager, Architect, Analyst, Engineer) to define the product, solve architectural challenges, and produce detailed specifications.

---

## 1. The Concept

**Goal**: Build a SaaS application that allows users to upload documents and perform semantic search using **Google File Search APIs**.

> *"I want to create a web app that lets users upload, list, and delete documents... Users can ask complex questions, and the AI will answer them by extracting context..."* — [Prompt 1]

---

## 2. The Orchestration Process

The development followed a "Party Mode" workflow where specialized agents collaborated to refine the idea.

### Phase 1: The Kickoff & Strategy
**Agent**: `Mitra (Orchestrator)`

The user engaged Mitra to "think about this project" and involve other agents. Mitra didn't just generate a generic response; she activated the "Company":

*   **Sina (Analyst)** evaluated the requirements.
*   **Jamshid (Architect)** proposed the tech stack (MongoDB vs Postgres debate).
*   **Zal (Manager)** ensured a roadmap was in place.

> *"I want you (Mitra Orchestrator) to think about this project... Consider the entire software lifecycle, including specifications, requirements, PRD documents..."* — [Prompt 2]

### Phase 2: Technical refinement ("Party Mode")
**Agents**: `Jamshid (Architect)`, `Kaveh (Engineer)`, `Sina (Analyst)`

The user initiated **Party Mode** to let agents challenge each other. This led to critical technical decisions:

*   **Database**: Switching to MongoDB for flexible schema.
*   **API Limits**: Clarifying the "100 store limit" via the `google-file-api-expert` skill.
*   **Architecture**: Deciding to use a "One Store Per User" model but implementing **Metadata Filtering** (Search Scoping) to allow collection-based search.

> *"Initiate 'party mode' to let all agents challenge your early docs and decisions."* — [Prompt 3]

### Phase 3: Specification Generation
**Agents**: `Kaveh (Engineer)`, `Mani (Designer)`

Once the high-level plan was set, the agents produced granular **Feature Specifications**. These are not just "ideas" but implementing-ready blueprints.

#### Key Artifacts Produced:

| Feature | Challenge | Agent Solution (Spec) |
| :--- | :--- | :--- |
| **Hallucination Control** | Users need strict answers from docs vs. general knowledge. | **[Chat Modes Spec](/docs/consultancy/file-search/specs/Archive/CHAT_MODES_SPEC.md)**: Defined "Limited" vs "Auxiliary" modes. |
| **Data Integrity** | Users uploading the same file twice. | **[Duplicate Detection Spec](/docs/consultancy/file-search/specs/Archive/DUPLICATE_DETECTION_L1_EXACT.md)**: Designed a SHA-256 hash check before upload. |
| **Zombie Files** | Deleting a file in App vs Google Cloud. | **[File Cleanup Spec](/docs/consultancy/file-search/specs/Archive/FILE_CLEANUP_SPEC.md)**: Created a "Zombie Hunter" reconciliation script strategy. |
| **Localization** | Support for Farsi (RTL). | **[i18n Spec](/docs/consultancy/file-search/specs/Archive/I18N_SPEC.md)**: Designed a lightweight dictionary solution without heavy libraries. |
| **Search Precision** | "Search only in this folder". | **[Search Scoping Spec](/docs/consultancy/file-search/specs/Archive/SEARCH_SCOPING_SPEC.md)**: Implemented metadata filtering on top of vector stores. |

### Phase 4: Validation (POC)
**Agent**: `Kaveh (Engineer)`

Before writing the full app, the **Engineer** agent was tasked to verify the specs using a **Proof of Concept (POC)** script.

> *"I want you to test the specs... Use JS to write simple code. Don't forget about testing... based on the specs and predefined rules."* — [Prompt 18]

This ensured that the "Paper Architecture" actually worked against the real Google File APIs.

---

## 3. The Power of Mitra

This case study highlights the difference between a **Coding Assistant** and a **Consultancy Framework**:

1.  **Proactive Thinking**: Agents didn't just write code; they asked "What about authentication?", "What about file limits?", "What if the user deletes a file?"
2.  **Role Specialization**: The **Architect** worried about the database, while the **Product Manager** worried about the "Library Metaphor" UX.
3.  **Documentation Driven**: The output was a set of **Specs** (Blueprints), allowing the human developer to implement with clarity and confidence.

**Result**: A robust, well-architected SaaS foundation, designed by a team of AI agents, implemented by a human.

---

### Reference Links
- [Mitra System Documentation](/mitra/docs/README.md)
- [Agent Registry](/mitra/docs/AGENTS.md)
