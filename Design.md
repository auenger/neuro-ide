# Project Name: Neuro-IDE (代号)

> **Slogan:** The "Director's Cut" of Software Development.
> **定位:** 一个以 Markdown 文档为核心、多角色 CLI 为引擎的桌面端 AI 开发环境。

## 1. 核心架构设计 (Architecture)

采用 **"Electron Sidecar Architecture" (Electron 边车模式)**。

- **Frontend (渲染进程):** React + Tailwind CSS (负责 UI)。
- **Backend (主进程):** Electron + Node.js (负责系统 I/O)。
- **Engine (执行引擎):** 第三方 CLI 工具 (Claude Code, Aider, Qwen Agent) 作为子进程运行。
- **Bridge (中间件):** `node-pty` (终端模拟) + `chokidar` (文件监听)。

### 逻辑数据流

```mermaid
graph TD
    User[用户输入] -->|MD/Chat| GUI[Electron UI]
    GUI -->|路由指令| ProcessMgr[多进程管理器]

    subgraph "Headless CLI Pool (后台进程池)"
        ProcessMgr -->|stdin| P1[Role: 架构师 (Claude)]
        ProcessMgr -->|stdin| P2[Role: 前端 (Claude)]
    end

    P1 -->|修改文件| FS[文件系统]
    P2 -->|修改文件| FS

    FS -->|Chokidar 监听| GUI
    GUI -->|渲染 Diff| Editor[Monaco Diff View]

```

---

## 2. 功能模块详述 (Features)

### 2.1. 界面布局 (The 3-Column Layout)

| 区域            | 占比 | 核心组件                              | 功能描述                                          |
| --------------- | ---- | ------------------------------------- | ------------------------------------------------- |
| **左栏 (资源)** | 20%  | `Sidebar`, `FileTree`, `RoleSwitcher` | 1. **角色切换器**：点击头像切换后台 Session。<br> |

<br>2. **文件树**：支持拖拽文件到中间栏生成引用。 |
| **中栏 (控制)** | 40% | `MarkdownEditor` (上), `ChatConsole` (下) | 1. **MD 画布**：项目的 Source of Truth，支持双向链接。<br>

<br>2. **对话流**：CLI 的输入输出窗口 (支持 ANSI 解析)。 |
| **右栏 (舞台)** | 40% | `MonacoEditor`, `DiffView` | 1. **多态容器**：平时是代码编辑器，AI 改代码时变为 Diff 对比视图。<br>

<br>2. **兜底终端**：支持一键切换为纯 xterm.js 视图。 |

### 2.2. 核心交互逻辑

1. **多进程路由 (Session Routing):**

- 每个“角色”对应一个独立的 `pty` 进程。
- 切换 Tab 时，前端仅仅是切换了 `xterm` 的数据流订阅源，后台进程始终保活 (Keep-Alive)。

2. **文件拖拽注入 (Drag-to-Context):**

- 操作：从左侧树拖拽 `App.tsx` 到中间 MD 编辑器。
- UI 表现：显示为 `[[📎 App.tsx]]` 胶囊。
- 后台动作：自动向当前 Active 的 CLI 发送 `/add src/App.tsx` (或等效指令)。

3. **智能 Diff 触发 (Auto-Diff):**

- 监听 `ProjectDir` 下的文件变更。
- 一旦检测到 `change` 事件，且当前处于 AI 生成状态，右侧栏自动锁定并展示 Diff。
- 提供 **[Accept]** (Git add) 和 **[Reject]** (Git restore) 按钮。

---

## 3. 技术栈推荐 (Tech Stack)

这是为你量身定制的“高效率”组合：

### Core

- **Framework:** **Electron** (主框架)
- **UI Library:** **React** (组件化状态管理最强，适合复杂 IDE)
- **Bundler:** **Vite** (Electron-Vite 模板，开发体验极快)
- **State Management:** **Zustand** (轻量级，比 Redux 好用太多，适合管理 Session 状态)

### 关键库 (Libraries)

- **Terminal:** **`node-pty`** (后端伪终端) + **`xterm.js`** (前端渲染)。
- **Editor:** **`@monaco-editor/react`** (微软官方封装的 React 组件，支持 Diff)。
- **Markdown:** **`react-markdown`** 或 **`Milkdown`** (如果需要所见即所得)。
- **File Watch:** **`chokidar`** (Node.js 端最稳的文件监听)。
- **Styling:** **Tailwind CSS** + **shadcn/ui** (直接复制粘贴现成的 UI 组件，如 Tabs, Dialog, Sidebar，节省大量 UI 开发时间)。

---

---

## 4. 开发路线图 (Roadmap)

### Phase 1: “带皮肤的终端” (The Skin) - ✅ 已完成
**目标：** 把 `node-pty` 和 `xterm` 跑通，能在 React 里运行 `claude code`。
- [x] 初始化 Electron + Vite + React。
- [x] 集成 `node-pty` 与 IPC 通信。

### Phase 2: “三栏布局与 Markdown” (The Layout) - ✅ 已完成
**目标：** 实现 UI 布局，分离“文档”与“对话”。
- [x] 引入 `react-resizable-panels`。
- [x] 实现可折叠面板与双栏 Markdown 编辑器。

### Phase 3: “IDE 的灵魂” (The Soul) - ✅ 已完成
**目标：** 实现多角色与 Diff 视图。
- [x] 多角色 Session 管理 (Keep-Alive)。
- [x] `chokidar` 文件监听与 Monaco Diff 视图。
- [x] 星标文件、变更文件追踪。

### Phase 4: “集成的 AI 工作流” (The Brain) - 🚀 当前阶段
**目标：** 深度整合第三方 AI 工具链 (Claude Code) 与 自动化配置管理。
- [x] **Claude History 浏览器**：解析并同步 Claude Code 历史，可视化查询消息细节。
- [x] **配置管理器 (Config Manager)**：取代手动修改 JSON，通过 GUI 管理角色与工作区。
- [x] **工作空间自动化**：最近工作空间恢复、Dock 菜单集成。
- [ ] **多标签页编辑器**：支持同时打开多个代码文件。
- [ ] **增强型 AI 对话**：直接在 UI 中集成 LLM API。

---

## 5. 核心愿景 (Core Vision)

Neuro-IDE 不仅仅是一个终端外壳，它是开发者与 AI 工具链（如 Claude Code）之间的 **"Director's Cut"** 层。通过将碎片化的命令行交互转化为持久化、可视化的 IDE 元数据，让 AI 真正成为开发者的深度合伙人。
