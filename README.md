# Neuro-IDE

Neuro-IDE is a modern, AI-assisted Integrated Development Environment (IDE) built with **Electron**, **React**, and **TypeScript**. It features a unique three-pane layout designed to seamlessly integrate multi-role terminal sessions, a professional code editor, and real-time Markdown previewing.

For Chinese documentation, please see [README_CN.md](README_CN.md).

## 🚀 Project Overview

Neuro-IDE aims to redefine the coding experience by embedding role-based AI workflows directly into the IDE. It provides context-aware terminals for different roles (Architect, Frontend, Backend), allowing developers to switch contexts effortlessly while maintaining state.

## 📅 Status: Phase 3 Complete (MVP)

Start Date: Jan 2026
Last Updated: Jan 2026

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

#### 3. The Workspace (File & Project Management)
- **Workspace Management**: Open and switch local directories, with automatic terminal session migration.
- **Recursive File Tree**: Infinite nesting, automatic sorting, and real-time file watching via `chokidar`.
- **Global Search**: Deep file search capability with filename prioritization, powered by recursive backend search.
- **Monaco Editor Support**: Full-featured code editing (VS Code engine) with syntax highlighting for major languages.
- **Custom Role Management**: Create, edit, and manage custom roles. Roles are saved globally, with per-workspace activation settings.
- **Starred Files**: Quick access to frequently used files and folders with drag-to-reorder support.

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

- [ ] **Multi-Tab Support**: Allow opening multiple files in the editor simultaneously.
- [ ] **Git Integration**: Visual Git status indicators and basic version control operations.
- [ ] **AI Engine Integration**: Connect the role-based terminals to actual LLM backends for autonomous coding assistance.

---

License: MIT
