# Contributing to File Search RAG SaaS

Thank you for your interest in contributing! This guide will help you understand the project architecture and how to make meaningful contributions.

---

## 📋 Table of Contents

1. [Frontend Development](#1-frontend-development)
2. [Backend Development](#2-backend-development)
3. [Third-Party Services](#3-third-party-services)
4. [Infrastructure](#4-infrastructure)
5. [Development Workflow](#5-development-workflow)

---

## 1. Frontend Development

### Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI + Shadcn/ui
- **Icons**: Lucide React
- **State Management**: React Hooks (useState, useEffect)
- **Routing**: Next.js App Router (file-based)
- **Auth**: NextAuth.js v5 (Google OAuth)

### Directory Structure

```
src/app/
├── layout.tsx              # Root layout with Sidebar
├── page.tsx                # Home page (Dashboard)
├── globals.css             # Global Tailwind styles
├── chat/
│   ├── global/page.tsx     # Global chat page
│   ├── library/[id]/page.tsx  # Library-scoped chat
│   └── [id]/page.tsx       # File-specific chat
├── libraries/
│   ├── page.tsx            # Libraries list page
│   └── [id]/page.tsx       # Library details page
├── settings/
│   ├── page.tsx            # General settings
│   ├── chat-rules/page.tsx # Chat mode configuration
│   └── danger-zone/page.tsx # Destructive actions
├── store/page.tsx          # Store management & sync
├── search/page.tsx         # Global file search
├── playground/page.tsx     # Google API playground
└── api/
    └── files/[id]/route.ts # File download API route
```

### Key Components

**Location**: `src/components/`

| Component | Purpose |
|-----------|---------|
| `Sidebar.tsx` | Main navigation sidebar |
| `DashboardView.tsx` | Home dashboard with stats and file manager |
| `LibrariesView.tsx` | Libraries grid display |
| `LibraryDetailsView.tsx` | Single library with file list |
| `SearchView.tsx` | Global search interface |
| `SettingsView.tsx` | Settings page container |
| `StoreStatsView.tsx` | Vector store statistics and sync |
| `FileUploadForm.tsx` | Drag-and-drop file upload |
| `chat/MessageRenderer.tsx` | Smart markdown/HTML renderer for chat |
| `chat/CopyButton.tsx` | Copy-to-clipboard for messages |
| `chat/DateSeparator.tsx` | Date separators in chat history |
| `chat/DeleteHistoryModal.tsx` | Chat history deletion modal |
| `chat/ChatCalendar.tsx` | Calendar for file chat page |
| `ui/*` | Reusable UI primitives (button, input, card, etc.) |

### Layouts

**Root Layout** (`src/app/layout.tsx`):
- Sets up global providers (i18n)
- Renders sidebar
- Applies global styles and fonts
- Max width: 1600px

### Styling Guidelines

1. **Tailwind First**: Use Tailwind utility classes
2. **Dark Mode**: Design is dark-mode optimized
3. **RTL Support**: Use `dir` from `useI18n()` for directional icons
4. **Responsive**: Mobile-first approach
5. **Colors**:
   - Primary: Blue (`blue-400`, `blue-600`)
   - Secondary: Purple (`purple-400`, `purple-600`)
   - Background: Slate (`slate-900`, `slate-950`)

### Adding a New Page

1. Create file in `src/app/[route]/page.tsx`
2. Use `"use client"` directive if using React hooks
3. Import components from `@/components`
4. Add route to `Sidebar.tsx` navigation

**Example**:
```tsx
"use client";

import { useState } from "react";

export default function MyNewPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <h1 className="text-2xl font-bold">My New Feature</h1>
        </div>
    );
}
```

---

## 2. Backend Development

### Architecture & Standards
This project follows a **Modular Server Actions** pattern with a focus on **Functional Programming** principles:

1. **Side-Effect Isolation**: Complex logic is extracted into pure helpers or unified modules in `@/lib`.
2. **Semantic Error Patterns**: All actions return standard `{ success: boolean, result?, error? }` objects with semantic error classification.
3. **Module Consolidation**: Logic is strictly organized into domain directories within `src/lib/` (e.g., `google`, `chat`, `file`).
4. **Action Decomposition**: Large actions are broken down into smaller internal helpers to ensure readability and testability.

### Directory Structure

```
src/
├── actions/                 # Server Actions (API layer)
│   ├── action-utils.ts      # Shared action helpers (Internal)
│   ├── chat-actions.ts      # Chat message handling
│   ├── file-actions.ts      # File specific operations
│   ├── lib-actions.ts       # Library specific operations
│   ├── playground-actions.ts # Code sandbox operations
│   ├── user-actions.ts      # User profile & settings
│   └── utils.ts             # Orchestration & shared logic
├── models/                  # Mongoose schemas
│   └── ...
└── lib/                     # Unified modules
    ├── auth/                # Session & HOF helpers
    ├── chat/                # Prompting & History
    ├── database/            # Connection & Base models
    ├── file/                # validation & mapping
    ├── google/              # AI Service wrappers
    ├── i18n/                # Internationalization
    ├── logger/              # Centralized logging
    └── utils.ts             # Core UI/Logic helpers
```

### Server Actions ("Routes")

**Location**: `src/actions/`

Server Actions replace traditional API routes. They are marked with `"use server"` directive.

#### **chat-actions.ts**
- `sendMessageAction()`: Handle chat messages, invoke RAG, save to DB
- `getChatHistoryAction()`: Load paginated chat history
- `deleteChatHistoryAction()`: Clear chat history

#### **file-actions.ts** (Purely File Context)
- `uploadFileAction()`: Upload file to Google File API
- `getFilesAction()`: List all user files (with optional library filter)
- `getFileAction()`: Get single file metadata
- `deleteFileAction()`: Delete file from Google + DB + Local Preview
- `checkFileDuplicate()`: Content-hash based duplicate check
- `checkFileStatusAction()`: Google Ingestion status sync

#### **lib-actions.ts** (Library Context)
- `createLibraryAction()`: Create new library
- `getLibrariesAction()`: List all libraries with document counts
- `updateLibraryAction()`: Update library metadata (icon, color, etc)
- `deleteLibraryAction()`: Cascading delete of library and its files

#### **playground-actions.ts**
- `executePlaygroundCode()`: Execute Google API code in sandbox

#### **user-actions.ts**
- `getUserSettingsAction()`: Fetch user settings
- `updateUserSettingsAction()`: Save settings changes
- `updateUserAction()`: Update user profile (name, etc)

### Adding a New Server Action

1. Create or edit file in `src/actions/`
2. Add `"use server";` at the top
3. Write async function
4. Import in client component
5. Call as regular function

**Example**:
```typescript
"use server";

import connectToDatabase from "@/lib/db";
import User from "@/models/User";

export async function getMyDataAction() {
    await connectToDatabase();
    const user = await User.findOne({ email: "user@example.com" });
    return user;
}
```

### Database Models

**Location**: `src/models/`

All models use **Mongoose** for MongoDB:

- **User**: Email, settings, primaryStoreId reference
- **Store**: Google Cloud store ID (one per user)
- **Library**: User-defined file groupings
- **File**: File metadata, googleFileId, libraryId, hash
- **Message**: Chat history with scope (global/library/file)

### Authentication & Middleware

**Framework**: NextAuth.js v5 (Beta)

**Location**: `@/lib/auth`
- Config: `lib/auth/auth.ts`
- Middleware Wrapper: `lib/auth/auth-middleware.ts`
- Exports: `lib/auth/index.ts`

**Pattern**:
Instead of global middleware for all routes, we use a **Higher-Order Function (HOF)** pattern for Server Actions to ensure type-safe, secure execution.

**`withAuth` Wrapper**:
Every secure Server Action must be wrapped with `withAuth`. This wrapper:
1. Verifies the user's session
2. Redirects to `/auth/signin` if unauthorized (or throws error)
3. Injects the hydrated `User` Mongoose document as the first argument

**Example**:
```typescript
import { withAuth } from "@/lib/auth-middleware";

export const mySecureAction = withAuth(async (user, data: string) => {
    // `user` is guaranteed to be a valid IUser Mongoose document
    console.log("Acting on behalf of:", user.email);
    return { success: true };
});
```

**Redirects**:
- Unauthenticated users are automatically redirected to the Google Sign-in page.
- Session expiration is handled automatically by NextAuth.

---

## 3. Third-Party Services

### Google Gemini API

**Purpose**: Semantic search (RAG), file vectorization

**Location**: `@/lib/google/google-ai.ts`

**API Wrapper** (`GoogleAIService`):
- `uploadFile()`: Upload file to Google Cloud
- `deleteFile()`: Delete file from Google Cloud
- `listFiles()`: List all uploaded files
- `createStore()`: Create new vector store
- `deleteStore()`: Delete vector store
- `getStore()`: Get store details
- `listStores()`: List all stores
- `search()`: Perform RAG search with grounding

**Environment Variable**:
```
GOOGLE_API_KEY=your_api_key_here
```

**Key Features**:
- File Search tool configuration
- Grounding metadata parsing
- Citation extraction
- System instruction customization (chat modes)

### MongoDB

**Purpose**: Store user data, file metadata, chat history

**Connection**: `src/lib/db.ts`

**Environment Variable**:
```
MONGO_URI=mongodb://localhost:27017/file-search
```

**Models**:
- One User → One Store
- User → Many Libraries → Many Files
- User → Many Messages (chat history)

### React Markdown

**Purpose**: Render AI responses as markdown

**Location**: `src/components/chat/MessageRenderer.tsx`

**Features**:
- GitHub Flavored Markdown (tables, strikethrough)
- Code blocks with styling
- Link handling (open in new tab)

### Monaco Editor

**Purpose**: Code editor for Playground

**Location**: `src/app/playground/page.tsx`

**Features**:
- TypeScript syntax highlighting
- IntelliSense auto-completion
- Dark theme (vs-dark)

---

## 4. Infrastructure

### Docker Setup

**Files**:
- `Dockerfile`: Next.js production build
- `docker-compose.yml`: Multi-container orchestration

**Services**:
1. **web**: Next.js app (port 3000)
2. **mongo**: MongoDB (port 27017)

**Volumes**:
- `mongo-data`: Persistent MongoDB storage

### Environment Variables

**Development** (`.env`):
```bash
GOOGLE_API_KEY=your_gemini_api_key
MONGO_URI=mongodb://localhost:27017/file-search

# NextAuth.js & Google OAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_random_secret_string
GOOGLE_CLIENT_ID=your_google_cloud_client_id
GOOGLE_CLIENT_SECRET=your_google_cloud_client_secret
```

**Production** (Docker Compose):
```yaml
environment:
  - NODE_ENV=production
  - MONGODB_URI=mongodb://mongo:27017/file-search
  - GOOGLE_API_KEY=${GOOGLE_API_KEY}
```

### Running Locally

**Without Docker**:
```bash
# Start MongoDB (if using Docker just for DB)
docker-compose up mongo -d

# Install dependencies
npm install

# Run development server
npm run dev
```

**With Docker (full stack)**:
```bash
docker-compose up --build
```

**Access**:
- App: http://localhost:3000
- MongoDB: mongodb://localhost:27017

### Deployment

**Build for Production**:
```bash
npm run build
npm start
```

**Docker Production**:
```bash
docker-compose up -d
```

### Database Management

**MongoDB Compass** (GUI):
- Connect to `mongodb://localhost:27017`
- Database: `file-search`
- Collections: `users`, `stores`, `libraries`, `files`, `messages`

---

## 5. Development Workflow

### Getting Started

1. **Clone the repository**
2. **Install dependencies**: `npm install`
3. **Set up environment**: Copy `.env.example` to `.env`
4. **Start MongoDB**: `docker-compose up mongo -d`
5. **Run dev server**: `npm run dev`
6. **Open browser**: http://localhost:3000

### Making Changes

1. **Create a feature branch**: `git checkout -b feature/my-feature`
2. **Make changes** following guidelines above
3. **Test locally**: Verify functionality works
4. **Commit**: `git commit -m "feat: add my feature"`
5. **Push**: `git push origin feature/my-feature`
6. **Open PR**: Submit pull request for review

### Code Style

- **TypeScript**: Strict mode enabled
- **Formatting**: Use ESLint (`npm run lint`)
- **Naming**:
  - Components: PascalCase (`MyComponent.tsx`)
  - Actions: camelCase with `Action` suffix (`myAction`)
  - Files: kebab-case for routes, PascalCase for components

### Testing Chat Modes

After making changes to chat functionality:

1. Check server console for logs:
```
=== CHAT REQUEST ===
Scope: global
Chat Mode: LIMITED
User Message: "test query"
...
```

2. Verify UI selector works (Limited vs Auxiliary)
3. Test citations rendering
4. Test markdown rendering

### Common Tasks

**Add a new UI component**:
1. Create in `src/components/MyComponent.tsx`
2. Export from component file
3. Import in page: `import { MyComponent } from "@/components/MyComponent"`

**Add a new database model**:
1. Create in `src/models/MyModel.ts`
2. Define Mongoose schema
3. Use in Server Actions

**Add a new page**:
1. Create `src/app/my-route/page.tsx`
2. Add navigation link in `Sidebar.tsx`

**Modify Google AI behavior**:
1. Edit `src/lib/google-ai.ts`
2. Update `GoogleAIService` methods
3. Adjust system instructions in `chat-actions.ts`

---

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Google Gemini API](https://ai.google.dev/docs)
- [Mongoose Docs](https://mongoosejs.com/docs/guide.html)
- [Radix UI](https://www.radix-ui.com/)

---

## 🤝 Need Help?

- **Issues**: Open a GitHub issue
- **Questions**: Create a discussion thread
- **Security**: Email maintainers directly

---

**Happy Coding!** 🚀
