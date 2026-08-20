# Project Dependency Upgrade Reference

This document tracks the Node.js packages and Google Gemini API model configurations to be updated in the system.

## 📦 NPM Package Dependencies

| Package | Current Version | Target Version | Update Type | Reason of Update |
| :--- | :--- | :--- | :--- | :--- |
| `@google/genai` | `1.38.0` | `2.18.0` | Minor/Major SDK | Support newer Gemini models and official SDK integrations. |
| `next` | `16.1.4` | `16.3.1` | Minor Framework | Stability, security, and React 19 performance improvements. |
| `next-auth` | `5.0.0-beta.30` | `5.0.0-beta.32` | Beta Patch | Resolve session handling bugs and dependency alerts. |
| `mongoose` | `9.1.5` | `9.9.3` | Minor ODM | Fix memory leak warnings and mongoose-specific options issues. |
| `lucide-react` | `0.563.0` | `1.33.0` | Major Icon Library | Access new icons and properties. |
| `tailwindcss` | `4.1.18` | `4.3.3` | Minor Styling | CSS compilation improvements and bug fixes. |
| `@tailwindcss/postcss` | `4.1.18` | `4.3.3` | Minor Dev | Alignment with main tailwindcss package versions. |
| `zod` | `4.3.6` | `4.4.3` | Minor Validation | Minor schema parsing enhancements. |

## 🤖 Google Gemini Model Mappings

| Model Role | Current Config Model | Proposed Model | Reason |
| :--- | :--- | :--- | :--- |
| **Flagship Flash RAG Model** | `gemini-3.5-flash` | `gemini-3.7-flash` | Latest fast multimodal model with improved context reasoning. |
| **High-volume / Budget Model** | `gemini-3.1-flash-lite` | `gemini-3.5-flash-lite` | Upgrade 3.1 lite to 3.5 lite for better performance at minimal cost. |
| **Text Embedding Model** | `gemini-embedding-001` | `gemini-embedding-2` | Newer generation embedding model for better vector search accuracy. |
| **Test/POC Model** | `gemini-3-flash-preview` | `gemini-3.7-flash` | Update development/POC cleanups to standard production API models. |
