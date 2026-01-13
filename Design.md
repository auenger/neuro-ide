# Project Name: Neuro-IDE (代号)

> **Slogan:** The "Director's Cut" of Software Development.
> **定位:** 一个以 Markdown 文档为核心、多角色 CLI 为引擎的桌面端 AI 开发环境。

## 1. 核心架构设计 (Architecture)

采用 **"Electron Sidecar Architecture" (Electron 边车模式)**。

* **Frontend (渲染进程):** React + Tailwind CSS (负责 UI)。
* **Backend (主进程):** Electron + Node.js (负责系统 I/O)。
* **Engine (执行引擎):** 第三方 CLI 工具 (Claude Code, Aider, Qwen Agent) 作为子进程运行。
* **Bridge (中间件):** `node-pty` (终端模拟) + `chokidar` (文件监听)。

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

| 区域 | 占比 | 核心组件 | 功能描述 |
| --- | --- | --- | --- |
| **左栏 (资源)** | 20% | `Sidebar`, `FileTree`, `RoleSwitcher` | 1. **角色切换器**：点击头像切换后台 Session。<br>

<br>2. **文件树**：支持拖拽文件到中间栏生成引用。 |
| **中栏 (控制)** | 40% | `MarkdownEditor` (上), `ChatConsole` (下) | 1. **MD 画布**：项目的 Source of Truth，支持双向链接。<br>

<br>2. **对话流**：CLI 的输入输出窗口 (支持 ANSI 解析)。 |
| **右栏 (舞台)** | 40% | `MonacoEditor`, `DiffView` | 1. **多态容器**：平时是代码编辑器，AI 改代码时变为 Diff 对比视图。<br>

<br>2. **兜底终端**：支持一键切换为纯 xterm.js 视图。 |

### 2.2. 核心交互逻辑

1. **多进程路由 (Session Routing):**
* 每个“角色”对应一个独立的 `pty` 进程。
* 切换 Tab 时，前端仅仅是切换了 `xterm` 的数据流订阅源，后台进程始终保活 (Keep-Alive)。


2. **文件拖拽注入 (Drag-to-Context):**
* 操作：从左侧树拖拽 `App.tsx` 到中间 MD 编辑器。
* UI 表现：显示为 `[[📎 App.tsx]]` 胶囊。
* 后台动作：自动向当前 Active 的 CLI 发送 `/add src/App.tsx` (或等效指令)。


3. **智能 Diff 触发 (Auto-Diff):**
* 监听 `ProjectDir` 下的文件变更。
* 一旦检测到 `change` 事件，且当前处于 AI 生成状态，右侧栏自动锁定并展示 Diff。
* 提供 **[Accept]** (Git add) 和 **[Reject]** (Git restore) 按钮。



---

## 3. 技术栈推荐 (Tech Stack)

这是为你量身定制的“高效率”组合：

### Core

* **Framework:** **Electron** (主框架)
* **UI Library:** **React** (组件化状态管理最强，适合复杂 IDE)
* **Bundler:** **Vite** (Electron-Vite 模板，开发体验极快)
* **State Management:** **Zustand** (轻量级，比 Redux 好用太多，适合管理 Session 状态)

### 关键库 (Libraries)

* **Terminal:** **`node-pty`** (后端伪终端) + **`xterm.js`** (前端渲染)。
* **Editor:** **`@monaco-editor/react`** (微软官方封装的 React 组件，支持 Diff)。
* **Markdown:** **`react-markdown`** 或 **`Milkdown`** (如果需要所见即所得)。
* **File Watch:** **`chokidar`** (Node.js 端最稳的文件监听)。
* **Styling:** **Tailwind CSS** + **shadcn/ui** (直接复制粘贴现成的 UI 组件，如 Tabs, Dialog, Sidebar，节省大量 UI 开发时间)。

---

## 4. 开发路线图 (MVP Roadmap)

建议分三个阶段进行，不要试图一步到位。

### Phase 1: “带皮肤的终端” (The Skin)

**目标：** 把 `node-pty` 和 `xterm` 跑通，能在 React 里运行 `claude code`。

1. 初始化 Electron + Vite + React 项目。
2. 在主进程集成 `node-pty`，创建一个 shell。
3. 前端集成 `xterm.js`。
4. 实现 IPC 通信：前端打字 -> 主进程 pty 写入 -> pty 输出 -> 前端 xterm 显示。
5. **里程碑：** 你能在你的 App 里像用 iTerm2 一样用命令行。

### Phase 2: “三栏布局与 Markdown” (The Layout)

**目标：** 实现 UI 布局，分离“文档”与“对话”。

1. 引入 `react-resizable-panels` 实现可拖拽的三栏布局。
2. 中间栏实现“上 MD 下 Chat”的分割。
3. 实现 Chat 气泡化：编写简单的正则，把不含控制码的纯文本渲染成 React 组件，复杂的扔给 xterm。
4. **里程碑：** 你可以一边写 Markdown 笔记，一边在下方跟 CLI 聊天。

### Phase 3: “IDE 的灵魂” (The Soul)

**目标：** 实现多角色与 Diff 视图。

1. **多 Session 管理：** `SessionManager` 类，管理多个 pty 实例。
2. **文件监听：** 集成 `chokidar`。
3. **Diff 视图：** 当 `chokidar` 报警时，读取文件内容，传给 `MonacoDiffEditor`。
4. **里程碑：** 完整的 MVP。你可以切换角色，AI 改完代码后，你能在右边进行 Review。

---

## 5. 立即行动建议 (Next Step)

**现在，请执行以下命令开始你的项目：**

我们使用 `electron-vite` 模板（目前最好的 Electron 脚手架）：

```bash
# 1. 创建项目
npm create @quick-start/electron neuro-ide -- --template react-ts

# 2. 进入目录
cd neuro-ide

# 3. 安装核心原生依赖 (这一步最容易报错，所以先装)
npm install node-pty 
# 注意：node-pty 需要编译原生模块，确保你电脑装了 build tools
# Windows: npm install --global --production windows-build-tools
# Mac: xcode-select --install

# 4. 安装 UI 和编辑器依赖
npm install xterm xterm-addon-fit @monaco-editor/react react-resizable-panels chokidar zustand clsx tailwind-merge

# 5. 启动
npm run dev

```

