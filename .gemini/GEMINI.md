# Project Context: AI Agents Party

## 🧠 Memory & Preferences
- **Communication Language**: English


## 🦅 Mitra System
This project uses the **Mitra** multi-agent system for AI Agent Party and discussion. It enables a collaborative environment where specialized agents work together to solve complex problems.

### Agents
See the [Agent Registry](../mitra/agents/registry.md) for a full list of available agents and their capabilities.

### Key Features
- **Memory Persistence**: Use `*save` and `*load` to maintain session context across all agents.
- **Consultancy Mode**: Agents provide high-level strategy and specs, not direct implementation code.

### Key Files & Folders
- **Gemini CLI Configs**: `.gemini/`
- **Antigravity Configs**: `.agent/`
- **Agent Registry**: `mitra/agents/registry.md`
- **Party Guide**: `mitra/docs/party_mode.md`
- **Command Definitions**: `.gemini/commands/`

## 🛡️ Core Logic & Limits
- **Storage Model**: One User = One `Store` record (MongoDB) linked to One Google File Search Store.
- **Tiered Limits**:
    - **Free**: 1 GB
    - **Tier 1**: 10 GB (Current Default)
    - **Tier 2**: 100 GB
    - **Tier 3**: 1 TB
- **File Limit**: Strict 100 MB per-document limit.
- **Health**: Optimal retrieval latency is maintained by keeping stores under 20 GB.
- **i18n**: Fully supports English and Farsi (RTL).


## 🚀 Quick Start
To start working with the collective intelligence:
```bash
/mitra:orchestrator
```
