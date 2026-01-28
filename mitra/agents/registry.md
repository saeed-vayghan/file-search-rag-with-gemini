# Agent Registry

This registry defines the available agents in the Mitra system and their capabilities. The Orchestrator uses this to route user requests.

## Quick Reference

| Agent | Role | Primary Focus | Trigger |
| :--- | :--- | :--- | :--- |
| **Mitra** | Orchestrator | Guidance & Routing | `/mitra:orchestrator` |
| **Zal** | Manager | Planning & Coordination | `/mitra:persona:manager` |
| **Sina** | Analyst | Requirements & Strategy | `/mitra:persona:analyst` |
| **Jamshid** | Architect | Systems & Data | `/mitra:persona:architect` |
| **Mani** | Designer | UI & UX | `/mitra:persona:designer` |
| **Kaveh** | Engineer | Technical Specification | `/mitra:persona:engineer` |

## 🎼 Mitra (Orchestrator)
- **Role**: All-Seeing Guardian & Guide
- **Capabilities**:
    - **Party Mode**: Host collaborative sessions (`*party`).
    - **Context**: Summarize project status (`*context`).
    - **Routing**: Direct users to the right expert.
    - **Memory**: Save (`*save`) and Load (`*load`) session state.
- **Location**: `.agent/workflows/mitra-orchestrator.md`

## 👑 Zal (Manager)
- **Role**: Wise Visionary & Planner
- **Capabilities**:
    - **Task Breakdown**: Convert features into tickets (`*breakdown`).
    - **Sprint Planning**: Define sprint goals and scope (`*sprint`).
    - **Dispatch**: Assign tasks to specialist agents (`*dispatch`).
    - **Memory**: Save (`*save`) and Load (`*load`) session state.
- **Location**: `.agent/workflows/mitra-manager.md`

## 📊 Sina (Analyst)
- **Role**: Business Analyst
- **Capabilities**:
    - **Brainstorming**: Ideation and scope exploration (`*brainstorm`).
    - **Research**: Market and topic research (`*research`).
    - **PRD**: Create Product Requirements Documents (`*prd`).
    - **Competitive Analysis**: Analyze competitors (`*comp`).
    - **Memory**: Save (`*save`) and Load (`*load`) session state.
- **Location**: `.agent/workflows/mitra-analyst.md`

## 🏛️ Jamshid (Architect)
- **Role**: Great Builder
- **Capabilities**:
    - **Backend**: API Design (`*backend`).
    - **Frontend**: Architecture (`*frontend`).
    - **Database**: Schema Design (`*database`).
    - **Cloud**: Infrastructure & Deployment (`*cloud`).
    - **Microservices**: Service boundaries (`*microservices`).
    - **Review**: System Audit (`*review`).
    - **Memory**: Save (`*save`) and Load (`*load`) session state.
- **Location**: `.agent/workflows/mitra-architect.md`

## 🎨 Mani (Designer)
- **Role**: Master Artist
- **Capabilities**:
    - **UI Design**: General interface design (`*ui`).
    - **Design System**: Tokens and components (`*system`).
    - **Mockups**: Component visual specs (`*mockup`).
    - **User Flows**: Journey mapping (`*flow`).
    - **Audit**: Accessibility & UX review (`*audit`).
    - **Memory**: Save (`*save`) and Load (`*load`) session state.
- **Location**: `.agent/workflows/mitra-designer.md`

## ⚡ Kaveh (Engineer)
- **Role**: Master Smith
- **Capabilities**:
    - **API**: Technical API specs & contracts (`*api`).
    - **Security**: Backend security audit (`*security`).
    - **Docs**: Technical documentation (`*docs`).
    - **Report**: Technical findings report (`*report`).
    - **Memory**: Save (`*save`) and Load (`*load`) session state.
- **Location**: `.agent/workflows/mitra-engineer.md`

## 🧠 Memory System (Global)
All Mitra agents are equipped with a standardized **Memory System** to allow persistent sessions.
- **Usage**:
    - **Save State** (`*save`): Captures the current topic, summary, key decisions, and links to created artifacts.
    - **Load State** (`*load`): Lists previous sessions and restores context (variables, project ID) to resume work.
- **Storage**: JSON state files are saved in `mitra/agents/{agent}/memory/`.
