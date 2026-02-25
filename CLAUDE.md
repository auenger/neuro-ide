# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Neuro-IDE** is an AI-assisted IDE built with Electron, React, and TypeScript. It features a three-pane layout integrating multi-role terminal sessions, code editing, and Markdown previewing. The unique selling point is role-based terminal sessions - each role (Architect, Frontend, Backend) maintains independent terminal state with custom prompts.

**Status**: Phase 3 Complete (MVP) - Started: Jan 2026, Last Updated: Feb 2026

## Code Style

- **Single quotes, no semicolons** - Prettier config: `singleQuote: true`, `semi: false`
- **Print width: 100** - Max line length
- **2-space indentation** - Enforced by `.editorconfig`
- **LF line endings** - No CRLF
- **Trailing whitespace trimmed** - Enforced by `.editorconfig`

Note: This project **does not have tests configured**. When adding new features, focus on manual testing.

## Development Commands

```bash
# Install dependencies
npm install

# Development (with hot-reload)
npm run dev

# Type checking
npm run typecheck        # Check both main and renderer
npm run typecheck:node   # Main process only
npm run typecheck:web    # Renderer process only

# Code quality
npm run format           # Prettier format
npm run lint             # ESLint

# Building
npm run build            # Build with typecheck
npm run build:mac        # macOS app
npm run build:win        # Windows app
npm run build:linux      # Linux app

# Preview production build
npm start
```

## Architecture: Electron Sidecar Pattern

The codebase follows a classic Electron architecture with clear separation between main and renderer processes.

### Process Structure

```
src/
├── main/           # Electron main process (Node.js environment)
├── preload/        # Preload scripts (secure IPC bridge)
└── renderer/       # React UI (browser environment)
```

### Main Process (`src/main/index.ts`)

**Key Classes**:
- `SessionManager` - Manages `node-pty` terminal sessions, one per role/terminal instance
- `FileWatcher` - Wraps `chokidar` for real-time file change monitoring
- `ConfigManager` - Handles JSON config persistence (roles, settings, starred files)
- `RecentWorkspacesManager` - macOS Dock menu and Windows Jump List integration
- `ClaudeHistoryService` - Parses Claude Code JSONL history for analytics (`claudeHistory.ts`)

**IPC Handlers** (via `ipcMain.handle` and `ipcMain.on`):

**Pattern**: `category:action` naming convention for all IPC channels

- `workspace:select` - Directory picker dialog
- `dialog:openDirectory` - Generic directory selection
- `fs:readDir`, `fs:readFile`, `fs:writeFile`, `fs:searchInWorkspace` - File operations
- `config:load`, `config:save`, `config:loadRoleSettings`, `config:saveRoleSettings` - Configuration
- `session:create`, `session:input`, `session:resize`, `session:kill` - Terminal control
- `claude-history:*` - Claude analytics (detect, getProjects, getSessions, getMessages, search, stats)

**Important Events**:
- `workspace:opened` - Sent to renderer when workspace is applied
- `file:changed` - File watcher events (add, change, unlink)
- `terminal:incoming` - Terminal output from pty

### Renderer Process

**State Management**: Zustand store at `src/renderer/src/store/appStore.ts`

Key state slices:
- `roles` - Global role definitions (architect, frontend, backend, custom)
- `sessions` - Active terminal sessions with multiple terminal instances per role
- `workspacePath` - Current workspace directory
- `fileChanges` - Map of changed files with metadata
- `terminalActivities` - Terminal activity tracking for notifications
- `starredItems` - Quick access files with drag-to-reorder

**Three-Pane Layout** (`react-resizable-panels`):
1. **Sidebar (20%)** - Role switcher + file tree + starred files + changed files
2. **MainPanel (45%)** - Markdown editor (top) + Chat console (bottom)
3. **StagePanel (35%)** - Monaco editor or diff view

### Preload Bridge (`src/preload/`)

Exposes secure APIs to renderer via `contextBridge`:
- `window.api.workspace` - Workspace selection
- `window.api.fs` - File system operations
- `window.api.config` - Configuration persistence
- `window.api.session` - Terminal session management

## Configuration Storage

**Global Config** (workspace-independent):
- Location: `~/.neuro-ide-global/`
- Files: `roles.json`, `recent-workspaces.json`, `current-workspace.json`

**Workspace Config** (per-workspace):
- Location: `<workspace>/.neuro/`
- Files: `starred.json`, `role-settings.json`, `settings.json`

**Role Settings Pattern**:
- Role definitions are **global** (shared across all workspaces)
- Role activation status is **per-workspace** (which roles are active)

## Key Patterns & Conventions

### Terminal Session Model
- Each `Session` represents a **role** with multiple `TerminalInstance` children
- Terminal IDs format: `{roleId}-terminal-{index}-{timestamp}`
- Minimum one terminal per session (can't close the last terminal)
- Sessions are only created for **active** roles

### File Watching
- Uses `chokidar` with smart ignores (node_modules, .git, build dirs, hidden files except .neuro)
- Emits `file:changed` events to renderer
- Triggers file tree refreshes and changed file tracking

### Workspace Switching
- When workspace changes: `workspaceChangeCounter` increments, triggering terminal recreation
- Terminal sessions are killed and recreated with new working directory
- File watcher restarts with new directory

### Terminal Custom Prompts
- Unix only (macOS/Linux) - Windows uses default PowerShell
- Set via `customPrompt` field on `RoleConfig`
- Injected as `PS1` environment variable

## Important Technical Details

### Claude History Service
The `claudeHistoryService` in `src/main/claudeHistory.ts` provides comprehensive analytics for Claude Code usage:

**Features**:
- Detects Claude Code installation and history directory
- Reads Claude's JSONL session files
- Provides project/session/message hierarchy
- Calculates token usage statistics (input, output, cache costs)
- Tracks file edit history via `file-history-snapshot` messages
- Real-time file watching for new sessions/messages

**IPC Handlers** (`claude-history:*`):
- `detect` - Check if Claude Code is installed
- `getProjects` - List all projects with session counts
- `getSessions` - Get sessions for a specific project
- `getMessages` - Paginated message retrieval (offset/limit support)
- `search` - Full-text search across sessions
- `getSessionStats` - Token usage and cost for a session
- `getProjectStats` - Aggregated stats for a project
- `getGlobalStats` - Overall usage across all projects
- `getRecentEdits` - Files recently edited via Claude

**Data Flow**:
1. Claude Code stores sessions in `~/claude-history/<encoded-project-path>/<session-id>.jsonl`
2. Each line is a JSON message with type, content, timestamps, tokens
3. Service parses these into structured types for UI consumption

### Platform-Specific Behavior
- **Windows**: Uses PowerShell, ignores custom prompts
- **macOS**: Dock menu shows recent workspaces (max 8)
- **Linux**: No native recent workspaces menu

### Terminal Activity Monitor
- Optional notification system for inactive terminals
- Configurable threshold (default 2000ms)
- Settings persisted per-workspace in `settings.json`

### Monaco Editor Integration
- Full VS Code editor engine
- Supports diff view mode
- Used for all code editing in StagePanel

### Global Search
- Backend-powered recursive search via `fs:searchInWorkspace`
- Filename matches prioritized (marked with `isFilenameMatch: true`)
- Max 1000 results to prevent performance issues

## Common Modifications

### Adding a New Role
Roles are stored globally. Use the RoleManager UI or modify `~/.neuro-ide-global/roles.json`:
```json
{
  "id": "custom-role",
  "name": "Custom Role",
  "icon": "star",
  "prompt": "# Role Description\\n...",
  "customPrompt": "[Custom]$ ",
  "isBuiltIn": false,
  "isActive": true
}
```

### Modifying Terminal Shell
Edit `src/main/index.ts` in `SessionManager` constructor - default shell detection logic.

### Changing Panel Sizes
Edit `src/renderer/src/components/Layout.tsx` - `defaultSize`, `minSize`, `maxSize` props on `<Panel>` components.

### Adding File Watcher Ignores
Edit `src/main/index.ts` in `FileWatcher.watch()` - add patterns to the `ignored` callback.

## Testing Considerations

**Note**: This project does not currently have automated tests configured. Manual testing is required for:

- Terminal session creation/destruction on all platforms (macOS, Windows, Linux)
- File watcher behavior with symlinks and network drives
- Workspace switching with unsaved editor changes
- Role activation/deactivation preserves terminal state correctly
- Claude History parsing with various JSONL message formats
- Token usage calculations and cost estimates

## Renderer Component Structure

**Main Components** (`src/renderer/src/components/`):
- `Layout.tsx` - Root layout with `react-resizable-panels`
- `Sidebar.tsx` - Role switcher, file tree, starred files
- `MainPanel.tsx` - Markdown editor + chat console
- `StagePanel.tsx` - Monaco editor with diff mode support
- `Terminal.tsx` - xterm.js terminal with tab support
- `RoleManager.tsx` - CRUD for custom roles
- `WorkspacePicker.tsx` - Initial workspace selection dialog
- `ClaudeHistory.tsx` - Browse Claude Code sessions/messages
- `ChangedFiles.tsx` - File change tracking UI
- `StarredFiles.tsx` - Quick access with drag-to-reorder
- `TerminalActivityMonitor.tsx` - Inactivity notifications

**Utils** (`src/renderer/src/utils/`):
- `icons.tsx` - Icon component helpers

**State** (`src/renderer/src/store/`):
- `appStore.ts` - Zustand store with all app state
