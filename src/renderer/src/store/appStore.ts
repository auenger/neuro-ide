import { create } from 'zustand'

export type Role = 'architect' | 'frontend' | 'backend' | string

export interface RoleConfig {
    id: string
    name: string
    icon: string
    prompt: string // Markdown format prompt
    customPrompt?: string // Custom terminal PS1
    isBuiltIn: boolean
    isActive: boolean
}

export interface Session {
    id: string
    role: string
    name: string
    icon: string
    prompt: string
    customPrompt?: string
    ptyPid?: number
    terminals: TerminalInstance[] // Multiple terminal instances
    activeTerminalId: string // Currently active terminal in this session
}

export interface TerminalInstance {
    id: string // Unique ID for this terminal instance
    sessionId: string // Parent session ID
    name: string // Display name like "Terminal 1", "Terminal 2"
    ptyPid?: number
}

export interface FileEntry {
    name: string
    isDirectory: boolean
    path: string
}

export interface StarredItem {
    id: string
    path: string
    name: string
    isDirectory: boolean
    order: number
}

export type MarkdownViewMode = 'source' | 'preview' | 'split'

interface AppState {
    // Workspace
    workspacePath: string | null
    workspaceChangeCounter: number // Used to trigger terminal recreation
    setWorkspacePath: (path: string | null) => void
    incrementWorkspaceChangeCounter: () => void

    // Role management
    roles: RoleConfig[]
    addRole: (role: RoleConfig) => void
    updateRole: (id: string, updates: Partial<RoleConfig>) => void
    deleteRole: (id: string) => void

    // Session management
    sessions: Session[]
    activeSessionId: string

    // Terminal instance management
    addTerminalToSession: (sessionId: string) => void
    removeTerminalFromSession: (sessionId: string, terminalId: string) => void
    setActiveTerminal: (sessionId: string, terminalId: string) => void
    renameTerminal: (sessionId: string, terminalId: string, newName: string) => void

    // Starred files
    starredItems: StarredItem[]
    addStarredItem: (item: Omit<StarredItem, 'id' | 'order'>) => void
    removeStarredItem: (id: string) => void
    reorderStarredItems: (items: StarredItem[]) => void

    // File tree
    fileTree: FileEntry[]
    setFileTree: (files: FileEntry[]) => void

    // File watching
    changedFiles: Set<string>
    addChangedFile: (path: string) => void
    clearChangedFiles: () => void

    // Editor state
    currentFile: string | null
    currentFileContent: string
    originalFileContent: string // For diff view
    editorMode: 'editor' | 'diff' | 'terminal'

    // Markdown view mode
    markdownViewMode: MarkdownViewMode
    setMarkdownViewMode: (mode: MarkdownViewMode) => void

    // Unsaved changes check
    checkUnsavedChanges: (() => Promise<boolean>) | null
    setCheckUnsavedChanges: (check: (() => Promise<boolean>) | null) => void

    // Actions
    setActiveSession: (id: string) => void
    setCurrentFile: (path: string | null) => void
    setCurrentFileContent: (content: string) => void
    setOriginalFileContent: (content: string) => void
    setEditorMode: (mode: 'editor' | 'diff' | 'terminal') => void
}

// Helper function to create a new terminal instance
const createTerminalInstance = (sessionId: string, index: number = 1): TerminalInstance => ({
    id: `${sessionId}-terminal-${index}-${Date.now()}`,
    sessionId,
    name: `Terminal ${index}`,
    ptyPid: undefined
})

// Helper function to create a session with default terminal
const createSession = (role: RoleConfig): Session => {
    const terminalId = `${role.id}-terminal-1-${Date.now()}`
    return {
        id: role.id,
        role: role.id,
        name: role.name,
        icon: role.icon,
        prompt: role.prompt,
        customPrompt: role.customPrompt,
        terminals: [{
            id: terminalId,
            sessionId: role.id,
            name: 'Terminal 1',
            ptyPid: undefined
        }],
        activeTerminalId: terminalId
    }
}

const DEFAULT_ROLES: RoleConfig[] = [
    {
        id: 'architect',
        name: '架构师',
        icon: 'home',
        prompt: `# 架构师角色

你是一个资深的系统架构师,负责:
- 设计系统架构
- 技术选型
- 性能优化
- 代码审查`,
        customPrompt: '[架构师]$ ',
        isBuiltIn: true,
        isActive: true
    },
    {
        id: 'frontend',
        name: '前端工程师',
        icon: 'monitor',
        prompt: `# 前端工程师角色

你是一个前端开发专家,负责:
- UI/UX 实现
- 前端框架开发
- 性能优化
- 响应式设计`,
        customPrompt: '[前端]$ ',
        isBuiltIn: true,
        isActive: true
    },
    {
        id: 'backend',
        name: '后端工程师',
        icon: 'server',
        prompt: `# 后端工程师角色

你是一个后端开发专家,负责:
- API 设计与实现
- 数据库设计
- 服务器架构
- 安全与性能`,
        customPrompt: '[后端]$ ',
        isBuiltIn: true,
        isActive: true
    }
]

export const useAppStore = create<AppState>((set, get) => ({
    // Initial state
    workspacePath: null,
    workspaceChangeCounter: 0,

    // Default built-in roles
    roles: DEFAULT_ROLES,

    sessions: DEFAULT_ROLES.map(role => createSession(role)),
    activeSessionId: 'architect',
    starredItems: [],
    fileTree: [],
    changedFiles: new Set(),
    currentFile: null,
    currentFileContent: '',
    originalFileContent: '',
    editorMode: 'editor',
    markdownViewMode: 'split',

    // Actions
    setWorkspacePath: async (path) => {
        set({ workspacePath: path })

        if (path) {
            try {
                // Initialize ConfigManager implicit via load calls if needed, 
                // but we access via window.api
                if (window.api && window.api.config) {
                    // Load global roles
                    const globalRoles: RoleConfig[] = await window.api.config.load({
                        workspacePath: path, // Path needed for IPC, but backend uses global dir for roles
                        filename: 'roles.json',
                        defaultValue: DEFAULT_ROLES
                    })

                    // Load local role active status
                    const roleSettings: Record<string, boolean> = await window.api.config.loadRoleSettings({
                        workspacePath: path,
                        defaultValue: {}
                    })

                    // Merge global roles with local settings
                    const mergedRoles = globalRoles.map(role => ({
                        ...role,
                        isActive: roleSettings[role.id] !== undefined ? roleSettings[role.id] : role.isActive
                    }))

                    const loadedStarred = await window.api.config.load({
                        workspacePath: path,
                        filename: 'starred.json',
                        defaultValue: []
                    })

                    // Reconstruct sessions from ACTIVE roles only
                    const sessions = mergedRoles
                        .filter(role => role.isActive)
                        .map(role => createSession(role))

                    set({
                        roles: mergedRoles,
                        sessions: sessions,
                        starredItems: loadedStarred,
                        // If active session is not in new sessions, reset to first
                        activeSessionId: sessions.length > 0
                            ? (sessions.find(s => s.id === get().activeSessionId) ? get().activeSessionId : sessions[0].id)
                            : 'architect'
                    })
                }
            } catch (e) {
                console.error('Failed to load config:', e)
            }
        } else {
            set({ roles: DEFAULT_ROLES, starredItems: [] })
        }
    },

    incrementWorkspaceChangeCounter: () => set((state) => ({
        workspaceChangeCounter: state.workspaceChangeCounter + 1
    })),

    // Role management
    addRole: (role) => set((state) => {
        const newRoles = [...state.roles, role]
        const newSessions = [...state.sessions, createSession(role)]

        if (state.workspacePath && window.api?.config) {
            // Save roles globally
            window.api.config.save({
                workspacePath: state.workspacePath,
                filename: 'roles.json',
                data: newRoles
            })
            // Save active status locally
            const roleSettings = newRoles.reduce((acc, role) => ({
                ...acc,
                [role.id]: role.isActive
            }), {})
            window.api.config.saveRoleSettings({
                workspacePath: state.workspacePath,
                data: roleSettings
            })
        }

        return { roles: newRoles, sessions: newSessions }
    }),

    updateRole: (id, updates) => set((state) => {
        const newRoles = state.roles.map(role =>
            role.id === id ? { ...role, ...updates } : role
        )
        const newSessions = state.sessions.map(session =>
            session.id === id ? { ...session, ...updates } : session
        )

        if (state.workspacePath && window.api?.config) {
            // Save roles globally
            window.api.config.save({
                workspacePath: state.workspacePath,
                filename: 'roles.json',
                data: newRoles
            })

            // Save active status locally
            const roleSettings = newRoles.reduce((acc, role) => ({
                ...acc,
                [role.id]: role.isActive
            }), {})
            window.api.config.saveRoleSettings({
                workspacePath: state.workspacePath,
                data: roleSettings
            })
        }

        return {
            roles: newRoles,
            sessions: newSessions
        }
    }),

    deleteRole: (id) => set((state) => {
        const newRoles = state.roles.filter(role => role.id !== id)

        if (state.workspacePath && window.api?.config) {
            // Save roles globally
            window.api.config.save({
                workspacePath: state.workspacePath,
                filename: 'roles.json',
                data: newRoles
            })
            // Save active status locally
            const roleSettings = newRoles.reduce((acc, role) => ({
                ...acc,
                [role.id]: role.isActive
            }), {})
            window.api.config.saveRoleSettings({
                workspacePath: state.workspacePath,
                data: roleSettings
            })
        }

        return {
            roles: newRoles,
            sessions: state.sessions.filter(session => session.id !== id),
            activeSessionId: state.activeSessionId === id ? state.roles[0].id : state.activeSessionId
        }
    }),

    setActiveSession: (id) => set({ activeSessionId: id }),

    // Starred files management
    addStarredItem: (item) => set((state) => {
        const id = `starred-${Date.now()}-${Math.random()}`
        const order = state.starredItems.length
        const newItems = [...state.starredItems, { ...item, id, order }]

        if (state.workspacePath && window.api?.config) {
            window.api.config.save({
                workspacePath: state.workspacePath,
                filename: 'starred.json',
                data: newItems
            })
        }

        return {
            starredItems: newItems
        }
    }),

    removeStarredItem: (id) => set((state) => {
        const newItems = state.starredItems.filter(item => item.id !== id)

        if (state.workspacePath && window.api?.config) {
            window.api.config.save({
                workspacePath: state.workspacePath,
                filename: 'starred.json',
                data: newItems
            })
        }

        return {
            starredItems: newItems
        }
    }),

    reorderStarredItems: (items) => set((state) => {
        if (state.workspacePath && window.api?.config) {
            window.api.config.save({
                workspacePath: state.workspacePath,
                filename: 'starred.json',
                data: items
            })
        }
        return { starredItems: items }
    }),

    setFileTree: (files) => set({ fileTree: files }),

    addChangedFile: (path) => set((state) => {
        const newSet = new Set(state.changedFiles)
        newSet.add(path)
        return { changedFiles: newSet }
    }),

    clearChangedFiles: () => set({ changedFiles: new Set() }),

    setCurrentFile: (path) => set({ currentFile: path }),

    setCurrentFileContent: (content) => set({ currentFileContent: content }),

    setOriginalFileContent: (content) => set({ originalFileContent: content }),

    setEditorMode: (mode) => set({ editorMode: mode }),

    setMarkdownViewMode: (mode) => set({ markdownViewMode: mode }),

    // Terminal instance management
    addTerminalToSession: (sessionId) => set((state) => {
        const session = state.sessions.find(s => s.id === sessionId)
        if (!session) return state

        const newTerminalIndex = session.terminals.length + 1
        const newTerminal = createTerminalInstance(sessionId, newTerminalIndex)

        const newSessions = state.sessions.map(s =>
            s.id === sessionId
                ? {
                    ...s,
                    terminals: [...s.terminals, newTerminal],
                    activeTerminalId: newTerminal.id
                }
                : s
        )

        return { sessions: newSessions }
    }),

    removeTerminalFromSession: (sessionId, terminalId) => set((state) => {
        const session = state.sessions.find(s => s.id === sessionId)
        if (!session || session.terminals.length <= 1) return state // Keep at least one terminal

        const newTerminals = session.terminals.filter(t => t.id !== terminalId)
        const newActiveTerminalId = session.activeTerminalId === terminalId
            ? newTerminals[0].id
            : session.activeTerminalId

        const newSessions = state.sessions.map(s =>
            s.id === sessionId
                ? {
                    ...s,
                    terminals: newTerminals,
                    activeTerminalId: newActiveTerminalId
                }
                : s
        )

        return { sessions: newSessions }
    }),

    setActiveTerminal: (sessionId, terminalId) => set((state) => {
        const newSessions = state.sessions.map(s =>
            s.id === sessionId
                ? { ...s, activeTerminalId: terminalId }
                : s
        )
        return { sessions: newSessions }
    }),

    renameTerminal: (sessionId, terminalId, newName) => set((state) => {
        const newSessions = state.sessions.map(s => {
            if (s.id === sessionId) {
                return {
                    ...s,
                    terminals: s.terminals.map(t =>
                        t.id === terminalId
                            ? { ...t, name: newName }
                            : t
                    )
                }
            }
            return s
        })
        return { sessions: newSessions }
    }),

    checkUnsavedChanges: null,
    setCheckUnsavedChanges: (check) => set({ checkUnsavedChanges: check })
}))

