# File Search SaaS 🔍

A powerful, AI-driven document search and management system powered by **Google Gemini API** and **MongoDB**. This application allows users to upload, organize, and perform semantic search (RAG) on their documents with high precision.

### [MITRA ORCHESTRATION SHOWCASE](MITRA_ORCHESTRATION_SHOWCASE.md)
Read more to see how [Mitra](https://github.com/saeed-vayghan/mitra) Orchestration helped to develop this application.

---

## 🚀 Features

*   **Smart Document Management**: Upload and organize files into libraries (Project-based isolation).
*   **Semantic Search (RAG)**: Ask questions about your documents using Google's Gemini models with Grounding.
*   **Vector Store Integration**: Automatically handles storage and vectorization of files via Google Cloud.
*   **Interactive Playground**: A built-in sandbox (`/playground`) to experiment with Google File APIs directly from the browser.
*   **Duplicate Detection**: Smart hashing to prevent duplicate file uploads.
*   **Internationalization**: Fully localized UI (English & Farsi) with RTL support.
*   **Responsive Design**: Modern, dark-mode UI built with Tailwind CSS and Radix UI.

## 🛠️ Tech Stack

*   **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
*   **Database**: [MongoDB](https://www.mongodb.com/) (Mongoose ODM)
*   **AI Engine**: [Google Gemini API](https://ai.google.dev/) (`@google/genai`)
*   **Styling**: Tailwind CSS + Shadcn/Radix UI
*   **Editor**: Monaco Editor (for Playground)

## 📦 Prerequisites

*   Node.js 18+
*   Docker (for local MongoDB)
*   Google AI Studio API Key

## ⚡ Getting Started

### 1. Clone the Repository
```bash
git clone <repository-url>
cd file-search
```

### 2. Environment Setup
Create a `.env` file in the root directory:
```env
# Database
MONGO_URI=mongodb://root:example@localhost:27017/file_search?authSource=admin

# Google AI
GOOGLE_API_KEY=your_gemini_api_key_here
```

### 3. Start Infrastructure
Run MongoDB via Docker Compose:
```bash
docker-compose up -d mongo
```

### 4. Install Dependencies
```bash
npm install
```

### 5. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📚 Core Concepts

### 1. Libraries vs. Stores
*   **Vector Store**: The underlying Google Cloud resource that holds vector embeddings of your files. Each user has one primary store (e.g., `store-user@example.com`).
*   **Library**: A logical grouping of files within the application (e.g., "Legal Docs", "Invoices"). This helps you organize files on the UI side, even though they live in the same Vector Store.

### 2. Scoped Search
You can control the context of your AI chats:
*   **Global Chat**: Searches across *all* your uploaded files.
*   **Library Chat**: Restricts the search context to files within a specific Library.
*   **File Chat**: "Talk" to a single file. The AI only sees that specific document.

### 3. Search Modes
Located in the Chat Settings, you can tune the AI's behavior:
*   **Limited Mode (Strict)**: The AI relies *heavily* on your documents. If the answer isn't in the files, it will say "I don't know". Good for contracts/facts.
*   **Auxiliary Mode (Creative)**: The AI uses your documents as inspiration but can draw from its general knowledge. Good for brainstorming or creative writing.

### 4. Settings & Customization
*   **General**: Toggle between English and Farsi (with auto-RTL layout).
*   **Danger Zone**:
    *   **Purge**: Wipes all data from Google Cloud (Nuclear option).

### 5. Store Management (`/store`)
*   **Sync Stats**: View real-time file counts (Local vs. Cloud).
*   **Force Refresh**: Trigger a manual sync to fix mismatches between your local DB and Google Cloud.

## 🧪 Google File API Playground

This project includes a dedicated Playground to safely test Google's File API without writing external scripts.

**Access**: Go to `/playground` in your browser.

**Capabilities**:
*   **List Files**: View all files currently uploaded to your Google Cloud project.
*   **Manage Stores**: Create, list, and inspect Vector Stores.
*   **RAG Probe**: Test semantic search queries against specific stores using `gemini-1.5-flash`.
*   **Code Sandbox**: Edit the TypeScript code in the in-browser Monaco editor and run it server-side.

## 📂 Project Structure

```
src/
├── actions/        # Server Actions (Backend Logic)
├── app/            # Next.js App Router (Pages & Layout)
├── components/     # Reusable UI Components
├── config/         # App Configuration (Tiers, Scenarios)
├── lib/            # Utilities (DB, AI Client, i18n)
├── models/         # Mongoose Schemas (User, File, Store)
└── dictionaries/   # Localization JSON files
```

## 🌍 Localization (i18n)

The app supports **English (en)** and **Farsi (fa)**.
-   Language defaults to English.
-   Switch language via the Sidebar settings.
-   Farsi layout automatically adjusts to **RTL**.

## 🐛 Debugging

*   **Terminal Logs**: The server outputs deep logs for Google API operations (Uploads, Search, Deletion).
*   **Store Stats**: Check `/store` to see the sync status between your local DB and Google Cloud.
*   **Danger Zone**: Reset your account or purge external data via Settings if states get desynchronized.
