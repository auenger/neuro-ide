# Neuro-IDE

Neuro-IDE is a modern, AI-assisted Integrated Development Environment (IDE) built with **Electron**, **React**, and **TypeScript**. It features a unique three-pane layout designed to seamlessly integrate multi-role terminal sessions, a professional code editor, and real-time Markdown previewing.

For Chinese documentation, please see [README_CN.md](README_CN.md).

## 🚀 Project Overview

Neuro-IDE aims to redefine the coding experience by embedding role-based AI workflows directly into the IDE. It provides context-aware terminals for different roles (Architect, Frontend, Backend), allowing developers to switch contexts effortlessly while maintaining state.

## 📅 Status: Phase 4 - Integrated AI Workflows

Start Date: Jan 2026
Last Updated: Feb 26, 2026

### ✅ Key Features Implemented

#### 1. The Core (Terminal System)

- **Robust Electron Architecture**: Built on a type-safe foundation using Electron, Vite, and React.
- **Native Terminal Integration**: Powered by `node-pty` for real system process management.
- **High-Performance Rendering**: Utilizes `xterm.js` for a smooth, native-like terminal experience.
- **Role-Based Sessions**: Supports multiple persistent terminal sessions (e.g., Architect, Frontend, Backend) with independent command history and state.
- **Multi-Terminal Instances**: Each role can have multiple terminal tabs, allowing parallel command execution.
- **Terminal Management**:
  - Create unlimited terminal instances per role
  - Switch between terminals with intuitive tab interface
  - Rename terminals with inline editing
  - Quick restart and clear screen functions
  - Close individual terminals (minimum one per role)
- **Cross-Platform Support**: Full compatibility with Windows, macOS, and Linux
- **Copy/Paste Support**: Right-click paste and keyboard shortcuts (Ctrl/Cmd+C/V) in terminals

#### 2. The Interface (Layout & Design)

- **Flexible 3-Pane Layout**: Adjustable Sidebar, Main Panel (Markdown/Chat), and Stage Panel (Code Editor).
- **Professional UI**: Dark theme inspired by VS Code, featuring SVG icons and a clean aesthetic.
- **Markdown Studio**: Integrated dual-pane Markdown editor with real-time GitHub Flavored Markdown preview.
- **Collapsible Panels**: Markdown editor can be collapsed to maximize terminal space.
- **Terminal Tabs**: Clean tab interface for managing multiple terminal instances.

#### 3. The AI Engine (Claude Code Integration)

- **Claude History Browser**: Full integration with Claude Code history.
  - **Project Auto-Detection**: Automatically identifies relevant Claude projects for the current workspace.
  - **Conversation List**: Collapsible sidebar section for quick access to recent AI conversations.
  - **Incremental Sync**: One-click synchronization of the latest Claude sessions to the workspace.
  - **Rich Analytics**: Visualized token usage (Input, Output, Cache) and edited file trackers.
  - **Overlay Modal**: Deep dive into full project histories without leaving the main workspace context.
  - **Offline Persistence**: Optional storage of history data within the `.neuro` folder for fast loading.

#### 4. The Workspace & Configuration

- **Config Manager**: Centralized GUI for managing all IDE settings.
  - **Role Editor**: Configure default commands, icons, and environment for each role.
  - **Workspace Settings**: Per-project ignore patterns, auto-sync preferences, and terminal behaviors.
- **Workspace Management**: Open and switch local directories, with automatic terminal session migration.
- **Recent Workspaces**: Quick access to up to 8 recently opened folders via native OS menus or the Workspace Picker.
- **Recursive File Tree**: Infinite nesting, automatic sorting, and real-time file watching via `chokidar`.
- **Global Search**: Deep file search capability with filename prioritization.
- **Monaco Editor Support**: Full-featured code editing (VS Code engine) with syntax highlighting and advanced features.
- **Starred Files**: Quick access to frequently used files and folders with drag-to-reorder support.
- **Changed Files Tracking**: Automatically tracks modified files for easy review and starring.
- **Terminal Activity Monitor**: Smart notifications for terminal output activity and idle states.

## 🛠 Tech Stack

- **Core**: Electron, React, TypeScript
- **Build Tooling**: Vite, Electron-Vite
- **Terminal**: node-pty, xterm.js, xterm-addon-fit
- **Editor**: @monaco-editor/react
- **State Management**: Zustand
- **File System**: Node.js fs, chokidar

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm or yarn

### Installation

```bash
$ npm install
```

### Development

Run the application in development mode with hot-reloading:

```bash
$ npm run dev
```

### Build

Build the application for production:

```bash
# For macOS
$ npm run build:mac

# For Windows
$ npm run build:win

# For Linux
$ npm run build:linux
```

## 🔜 Roadmap

- [ ] **Multi-Tab Editor**: Allow opening multiple files in the editor simultaneously with a tabbed interface.
- [ ] **Direct AI Chat**: Integrated chat interface directly calling LLM APIs without external CLI dependencies.
- [ ] **Plugin System**: Allow third-party extensions for custom roles and terminal enhancements.

---

License: MIT
