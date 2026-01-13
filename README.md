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

#### 2. The Interface (Layout & Design)
- **Flexible 3-Pane Layout**: Adjustable Sidebar, Main Panel (Markdown/Chat), and Stage Panel (Code Editor).
- **Professional UI**: Dark theme inspired by VS Code, featuring SVG icons and a clean aesthetic.
- **Markdown Studio**: Integrated dual-pane Markdown editor with real-time GitHub Flavored Markdown preview.

#### 3. The Workspace (File & Project Management)
- **Workspace Management**: Open and switch local directories, with automatic terminal session migration.
- **Recursive File Tree**: Infinite nesting, automatic sorting, and real-time file watching via `chokidar`.
- **Global Search**: Deep file search capability, powered by recursive backend search, accessible directly from the sidebar.
- **Monaco Editor Support**: Full-featured code editing (VS Code engine) with syntax highlighting for major languages.
- **Custom Role Management**: Create, edit, and manage custom roles. Roles are saved globally, with per-workspace activation settings.

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
