import { create } from 'zustand'

export type Role = 'neuro' | string

// Init command configuration
export interface InitCommand {
  id: string
  command: string
  delay: number // Delay in seconds after execution (0 = no delay)
  groupWithNext: boolean // Whether to chain with next command using &&
}

export interface RoleConfig {
  id: string
  name: string
  icon: string
  prompt: string // Markdown format prompt
  customPrompt?: string // Custom terminal PS1
  initCommands?: InitCommand[] // Terminal initialization commands
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
  initCommands?: InitCommand[]
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

// Terminal layout mode
export type TerminalLayoutMode = 'tabs' | 'grid'

// Grid layout configuration
export interface GridLayoutConfig {
  rows: number // 1-4
  cols: number // 1-4
}

// File change tracking
export interface FileChangeInfo {
  path: string
  changeType: 'add' | 'change' | 'unlink'
  timestamp: number
}

// Terminal activity tracking
export interface TerminalActivityState {
  terminalId: string
  lastOutputTime: number
  isActive: boolean // Is currently outputting
  hasNotified: boolean // Has shown completion notification
}

// Terminal notification settings
export interface TerminalNotificationSettings {
  enabled: boolean
  inactiveThreshold: number // milliseconds
}

// File watcher settings
export interface FileWatcherSettings {
  ignoredDirectories: string[]
}

interface AppState {
  // Workspace
  workspacePath: string | null
  workspaceChangeCounter: number // Used to trigger terminal recreation
  setWorkspacePath: (path: string | null) => void
  incrementWorkspaceChangeCounter: () => void

  // Claude History integration
  claudeProject: ClaudeProject | null
  claudeSessions: ClaudeSession[]
  claudeSyncStatus: {
    syncing: boolean
    lastSync: number | null
    message: string | null
  }
  deletedSessionIds: string[] // Deleted session IDs for current project
  syncClaudeHistory: () => Promise<void>
  refreshClaudeHistory: () => Promise<void>
  setClaudeProject: (project: ClaudeProject | null) => void
  setClaudeSessions: (sessions: ClaudeSession[]) => void
  markSessionDeleted: (sessionId: string) => Promise<void>
  restoreSession: (sessionId: string) => Promise<void>
  loadDeletedSessions: () => Promise<void>

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
  reorderTerminals: (sessionId: string, newOrder: string[]) => void

  // Starred files
  starredItems: StarredItem[]
  addStarredItem: (item: Omit<StarredItem, 'id' | 'order'>) => void
  removeStarredItem: (id: string) => void
  reorderStarredItems: (items: StarredItem[]) => void

  // File tree
  fileTree: FileEntry[]
  setFileTree: (files: FileEntry[]) => void

  // File watching (legacy - kept for backward compatibility)
  changedFiles: Set<string>
  addChangedFile: (path: string) => void
  clearChangedFiles: () => void

  // Enhanced file change tracking
  fileChanges: Map<string, FileChangeInfo>
  addFileChange: (info: FileChangeInfo) => void
  removeFileChange: (path: string) => void
  clearFileChanges: () => void

  // Terminal activity tracking
  terminalActivities: Map<string, TerminalActivityState>
  updateTerminalActivity: (terminalId: string, isActive: boolean) => void
  markTerminalNotified: (terminalId: string) => void
  getInactiveTerminals: () => TerminalActivityState[]

  // Terminal notification settings
  terminalNotificationSettings: TerminalNotificationSettings
  setTerminalNotificationEnabled: (enabled: boolean) => void
  setTerminalNotificationThreshold: (threshold: number) => void

  // File watcher settings
  fileWatcherSettings: FileWatcherSettings
  setIgnoredDirectories: (dirs: string[]) => void
  addIgnoredDirectory: (dir: string) => void
  removeIgnoredDirectory: (dir: string) => void

  // Editor state
  currentFile: string | null
  currentFileContent: string
  originalFileContent: string // For diff view
  editorMode: 'editor' | 'diff' | 'terminal'
  stagePanelVisible: boolean // Control stage panel visibility

  // Markdown view mode
  markdownViewMode: MarkdownViewMode
  setMarkdownViewMode: (mode: MarkdownViewMode) => void

  // Terminal layout mode
  terminalLayoutMode: TerminalLayoutMode
  gridLayoutConfig: GridLayoutConfig
  setTerminalLayoutMode: (mode: TerminalLayoutMode) => void
  toggleTerminalLayoutMode: () => void
  setGridLayoutConfig: (config: GridLayoutConfig) => void

  // Unsaved changes check
  checkUnsavedChanges: (() => Promise<boolean>) | null
  setCheckUnsavedChanges: (check: (() => Promise<boolean>) | null) => void

  // Actions
  setActiveSession: (id: string) => void
  setCurrentFile: (path: string | null) => void
  setCurrentFileContent: (content: string) => void
  setOriginalFileContent: (content: string) => void
  setEditorMode: (mode: 'editor' | 'diff' | 'terminal') => void
  setStagePanelVisible: (visible: boolean) => void
  toggleStagePanelVisible: () => void
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
    initCommands: role.initCommands,
    terminals: [
      {
        id: terminalId,
        sessionId: role.id,
        name: 'Terminal 1',
        ptyPid: undefined
      }
    ],
    activeTerminalId: terminalId
  }
}

const DEFAULT_ROLES: RoleConfig[] = [
  {
    id: 'neuro',
    name: 'Neuro',
    icon: 'home',
    prompt: 'claude --dangerously-skip-permissions',
    customPrompt: '[Neuro]$ ',
    isBuiltIn: true,
    isActive: true
  }
]

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  workspacePath: null,
  workspaceChangeCounter: 0,

  // Claude History initial state
  claudeProject: null,
  claudeSessions: [],
  claudeSyncStatus: {
    syncing: false,
    lastSync: null,
    message: null
  },
  deletedSessionIds: [],

  // Default built-in roles
  roles: DEFAULT_ROLES,

  sessions: DEFAULT_ROLES.map((role) => createSession(role)),
  activeSessionId: 'neuro',
  starredItems: [],
  fileTree: [],
  changedFiles: new Set(),
  currentFile: null,
  currentFileContent: '',
  originalFileContent: '',
  editorMode: 'editor',
  stagePanelVisible: false,
  markdownViewMode: 'split',

  // Terminal layout mode
  terminalLayoutMode: 'tabs',
  gridLayoutConfig: { rows: 2, cols: 2 },

  // Enhanced file change tracking
  fileChanges: new Map(),
  terminalActivities: new Map(),

  // Terminal notification settings
  terminalNotificationSettings: {
    enabled: false, // Default to off
    inactiveThreshold: 2000 // 2 seconds
  },

  // File watcher settings
  fileWatcherSettings: {
    ignoredDirectories: []
  },

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
          const mergedRoles = globalRoles.map((role) => ({
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
            .filter((role) => role.isActive)
            .map((role) => createSession(role))

          set({
            roles: mergedRoles,
            sessions: sessions,
            starredItems: loadedStarred,
            // If active session is not in new sessions, reset to first
            activeSessionId:
              sessions.length > 0
                ? sessions.find((s) => s.id === get().activeSessionId)
                  ? get().activeSessionId
                  : sessions[0].id
                : 'neuro'
          })

          // Load global settings
          const savedSettings = await window.api.config.load({
            workspacePath: path,
            filename: 'settings.json',
            defaultValue: {
              terminalNotification: {
                enabled: false,
                inactiveThreshold: 2000
              },
              fileWatcher: {
                ignoredDirectories: []
              }
            }
          })

          if (savedSettings && savedSettings.terminalNotification) {
            set({ terminalNotificationSettings: savedSettings.terminalNotification })
          }

          if (savedSettings && savedSettings.fileWatcher) {
            set({ fileWatcherSettings: savedSettings.fileWatcher })
            // Notify main process to update ignored directories
            if (window.api?.fs?.setIgnoredDirectories) {
              window.api.fs.setIgnoredDirectories(savedSettings.fileWatcher.ignoredDirectories)
            }
          }
        }
      } catch (e) {
        console.error('Failed to load config:', e)
      }
    } else {
      set({ roles: DEFAULT_ROLES, starredItems: [] })
    }
  },

  incrementWorkspaceChangeCounter: () =>
    set((state) => ({
      workspaceChangeCounter: state.workspaceChangeCounter + 1
    })),

  // Role management
  addRole: (role) =>
    set((state) => {
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
        const roleSettings = newRoles.reduce(
          (acc, role) => ({
            ...acc,
            [role.id]: role.isActive
          }),
          {}
        )
        window.api.config.saveRoleSettings({
          workspacePath: state.workspacePath,
          data: roleSettings
        })
      }

      return { roles: newRoles, sessions: newSessions }
    }),

  updateRole: (id, updates) =>
    set((state) => {
      const newRoles = state.roles.map((role) => (role.id === id ? { ...role, ...updates } : role))

      // Rebuild sessions based on active status
      // If a role becomes inactive, remove it from sessions
      // If a role becomes active, add it to sessions
      const updatedRole = newRoles.find((r) => r.id === id)
      let newSessions = [...state.sessions]

      if (updatedRole) {
        if (updatedRole.isActive) {
          // Role is active - update if exists, add if doesn't
          const sessionExists = newSessions.some((s) => s.id === id)
          if (sessionExists) {
            // Update existing session
            newSessions = newSessions.map((session) =>
              session.id === id ? { ...session, ...updates } : session
            )
          } else {
            // Add new session for newly activated role
            newSessions.push(createSession(updatedRole))
          }
        } else {
          // Role is inactive - remove from sessions
          newSessions = newSessions.filter((s) => s.id !== id)
        }
      }

      if (state.workspacePath && window.api?.config) {
        // Save roles globally
        window.api.config.save({
          workspacePath: state.workspacePath,
          filename: 'roles.json',
          data: newRoles
        })

        // Save active status locally
        const roleSettings = newRoles.reduce(
          (acc, role) => ({
            ...acc,
            [role.id]: role.isActive
          }),
          {}
        )
        window.api.config.saveRoleSettings({
          workspacePath: state.workspacePath,
          data: roleSettings
        })
      }

      // If the active session was removed, switch to first available session
      const activeSessionStillExists = newSessions.some((s) => s.id === state.activeSessionId)
      const newActiveSessionId = activeSessionStillExists
        ? state.activeSessionId
        : newSessions.length > 0
          ? newSessions[0].id
          : 'neuro'

      return {
        roles: newRoles,
        sessions: newSessions,
        activeSessionId: newActiveSessionId
      }
    }),

  deleteRole: (id) =>
    set((state) => {
      const newRoles = state.roles.filter((role) => role.id !== id)

      if (state.workspacePath && window.api?.config) {
        // Save roles globally
        window.api.config.save({
          workspacePath: state.workspacePath,
          filename: 'roles.json',
          data: newRoles
        })
        // Save active status locally
        const roleSettings = newRoles.reduce(
          (acc, role) => ({
            ...acc,
            [role.id]: role.isActive
          }),
          {}
        )
        window.api.config.saveRoleSettings({
          workspacePath: state.workspacePath,
          data: roleSettings
        })
      }

      return {
        roles: newRoles,
        sessions: state.sessions.filter((session) => session.id !== id),
        activeSessionId: state.activeSessionId === id ? state.roles[0].id : state.activeSessionId
      }
    }),

  setActiveSession: (id) => set({ activeSessionId: id }),

  // Starred files management
  addStarredItem: (item) =>
    set((state) => {
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

  removeStarredItem: (id) =>
    set((state) => {
      const newItems = state.starredItems.filter((item) => item.id !== id)

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

  reorderStarredItems: (items) =>
    set((state) => {
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

  addChangedFile: (path) =>
    set((state) => {
      const newSet = new Set(state.changedFiles)
      newSet.add(path)
      return { changedFiles: newSet }
    }),

  clearChangedFiles: () => set({ changedFiles: new Set() }),

  // Enhanced file change tracking methods
  addFileChange: (info) =>
    set((state) => {
      const newMap = new Map(state.fileChanges)
      newMap.set(info.path, info)
      // Also update legacy changedFiles for backward compatibility
      const newSet = new Set(state.changedFiles)
      newSet.add(info.path)
      return { fileChanges: newMap, changedFiles: newSet }
    }),

  removeFileChange: (path) =>
    set((state) => {
      const newMap = new Map(state.fileChanges)
      newMap.delete(path)
      const newSet = new Set(state.changedFiles)
      newSet.delete(path)
      return { fileChanges: newMap, changedFiles: newSet }
    }),

  clearFileChanges: () =>
    set({
      fileChanges: new Map(),
      changedFiles: new Set()
    }),

  // Terminal activity tracking methods
  updateTerminalActivity: (terminalId, isActive) =>
    set((state) => {
      const newMap = new Map(state.terminalActivities)
      const existing = newMap.get(terminalId)

      newMap.set(terminalId, {
        terminalId,
        lastOutputTime: Date.now(),
        isActive,
        hasNotified: existing?.hasNotified || false
      })

      return { terminalActivities: newMap }
    }),

  markTerminalNotified: (terminalId) =>
    set((state) => {
      const newMap = new Map(state.terminalActivities)
      const existing = newMap.get(terminalId)

      if (existing) {
        newMap.set(terminalId, {
          ...existing,
          hasNotified: true
        })
      }

      return { terminalActivities: newMap }
    }),

  getInactiveTerminals: () => {
    const state = get()
    const now = Date.now()
    const threshold = state.terminalNotificationSettings.inactiveThreshold

    if (!state.terminalNotificationSettings.enabled) {
      return []
    }

    return Array.from(state.terminalActivities.values()).filter(
      (activity) =>
        !activity.isActive && !activity.hasNotified && now - activity.lastOutputTime >= threshold
    )
  },

  // Terminal notification settings methods
  setTerminalNotificationEnabled: (enabled) => {
    const currentSettings = get().terminalNotificationSettings
    const newSettings = { ...currentSettings, enabled }

    set({ terminalNotificationSettings: newSettings })

    const workspacePath = get().workspacePath
    if (workspacePath && window.api?.config) {
      window.api.config.save({
        workspacePath,
        filename: 'settings.json',
        data: { terminalNotification: newSettings }
      })
    }
  },

  setTerminalNotificationThreshold: (threshold) => {
    const currentSettings = get().terminalNotificationSettings
    const newSettings = { ...currentSettings, inactiveThreshold: threshold }

    set({ terminalNotificationSettings: newSettings })

    const workspacePath = get().workspacePath
    if (workspacePath && window.api?.config) {
      window.api.config.save({
        workspacePath,
        filename: 'settings.json',
        data: { terminalNotification: newSettings }
      })
    }
  },

  // File watcher settings methods
  setIgnoredDirectories: (dirs) => {
    const newSettings = { ignoredDirectories: dirs }

    set({ fileWatcherSettings: newSettings })

    // Notify main process to update ignored directories
    if (window.api?.fs?.setIgnoredDirectories) {
      window.api.fs.setIgnoredDirectories(dirs)
    }

    const workspacePath = get().workspacePath
    if (workspacePath && window.api?.config) {
      window.api.config.save({
        workspacePath,
        filename: 'settings.json',
        data: { fileWatcher: newSettings }
      })
    }
  },

  addIgnoredDirectory: (dir) => {
    const currentSettings = get().fileWatcherSettings
    if (currentSettings.ignoredDirectories.includes(dir)) return

    const newDirs = [...currentSettings.ignoredDirectories, dir]
    const newSettings = { ignoredDirectories: newDirs }

    set({ fileWatcherSettings: newSettings })

    // Notify main process to update ignored directories
    if (window.api?.fs?.setIgnoredDirectories) {
      window.api.fs.setIgnoredDirectories(newDirs)
    }

    const workspacePath = get().workspacePath
    if (workspacePath && window.api?.config) {
      window.api.config.save({
        workspacePath,
        filename: 'settings.json',
        data: { fileWatcher: newSettings }
      })
    }
  },

  removeIgnoredDirectory: (dir) => {
    const currentSettings = get().fileWatcherSettings
    const newDirs = currentSettings.ignoredDirectories.filter((d) => d !== dir)
    const newSettings = { ignoredDirectories: newDirs }

    set({ fileWatcherSettings: newSettings })

    // Notify main process to update ignored directories
    if (window.api?.fs?.setIgnoredDirectories) {
      window.api.fs.setIgnoredDirectories(newDirs)
    }

    const workspacePath = get().workspacePath
    if (workspacePath && window.api?.config) {
      window.api.config.save({
        workspacePath,
        filename: 'settings.json',
        data: { fileWatcher: newSettings }
      })
    }
  },

  setCurrentFile: (path) => set({ currentFile: path }),

  setCurrentFileContent: (content) => set({ currentFileContent: content }),

  setOriginalFileContent: (content) => set({ originalFileContent: content }),

  setEditorMode: (mode) => set({ editorMode: mode }),

  setStagePanelVisible: (visible) => set({ stagePanelVisible: visible }),

  toggleStagePanelVisible: () => set((state) => ({ stagePanelVisible: !state.stagePanelVisible })),

  setMarkdownViewMode: (mode) => set({ markdownViewMode: mode }),

  // Terminal layout mode methods
  setTerminalLayoutMode: (mode) => set({ terminalLayoutMode: mode }),

  toggleTerminalLayoutMode: () =>
    set((state) => ({
      terminalLayoutMode: state.terminalLayoutMode === 'tabs' ? 'grid' : 'tabs'
    })),

  setGridLayoutConfig: (config) => set({ gridLayoutConfig: config }),

  // Terminal instance management
  addTerminalToSession: (sessionId) =>
    set((state) => {
      const session = state.sessions.find((s) => s.id === sessionId)
      if (!session) return state

      const newTerminalIndex = session.terminals.length + 1
      const newTerminal = createTerminalInstance(sessionId, newTerminalIndex)

      const newSessions = state.sessions.map((s) =>
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

  removeTerminalFromSession: (sessionId, terminalId) =>
    set((state) => {
      const session = state.sessions.find((s) => s.id === sessionId)
      if (!session || session.terminals.length <= 1) return state // Keep at least one terminal

      const newTerminals = session.terminals.filter((t) => t.id !== terminalId)
      const newActiveTerminalId =
        session.activeTerminalId === terminalId ? newTerminals[0].id : session.activeTerminalId

      const newSessions = state.sessions.map((s) =>
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

  setActiveTerminal: (sessionId, terminalId) =>
    set((state) => {
      const newSessions = state.sessions.map((s) =>
        s.id === sessionId ? { ...s, activeTerminalId: terminalId } : s
      )
      return { sessions: newSessions }
    }),

  renameTerminal: (sessionId, terminalId, newName) =>
    set((state) => {
      const newSessions = state.sessions.map((s) => {
        if (s.id === sessionId) {
          return {
            ...s,
            terminals: s.terminals.map((t) => (t.id === terminalId ? { ...t, name: newName } : t))
          }
        }
        return s
      })
      return { sessions: newSessions }
    }),

  reorderTerminals: (sessionId, newOrder) =>
    set((state) => {
      const session = state.sessions.find((s) => s.id === sessionId)
      if (!session) return state

      // Reorder terminals based on the new order array
      const reorderedTerminals = newOrder
        .map((id) => session.terminals.find((t) => t.id === id))
        .filter((t): t is TerminalInstance => t !== undefined)

      // If some terminals are missing from newOrder, append them at the end
      const missingTerminals = session.terminals.filter((t) => !newOrder.includes(t.id))
      const finalTerminals = [...reorderedTerminals, ...missingTerminals]

      const newSessions = state.sessions.map((s) =>
        s.id === sessionId ? { ...s, terminals: finalTerminals } : s
      )

      return { sessions: newSessions }
    }),

  checkUnsavedChanges: null,
  setCheckUnsavedChanges: (check) => set({ checkUnsavedChanges: check }),

  // Claude History integration
  setClaudeProject: (project) => set({ claudeProject: project }),

  setClaudeSessions: (sessions) => set({ claudeSessions: sessions }),

  syncClaudeHistory: async () => {
    const workspacePath = get().workspacePath
    if (!workspacePath) return

    set({
      claudeSyncStatus: {
        syncing: true,
        lastSync: null,
        message: 'Syncing...'
      }
    })

    try {
      if (window.api?.claudeHistory) {
        // Find matching project
        const project = await window.api.claudeHistory.findProjectByPath(workspacePath)

        if (project) {
          set({ claudeProject: project })

          // Load deleted session IDs for this project
          const deletedIds = await window.api.claudeHistory.getDeletedSessionsForProject(
            project.encodedPath
          )
          set({ deletedSessionIds: deletedIds })

          // Load sessions - 支持多项目聚合
          const matchedProjects = (project as any)._matchedProjects as string[] | undefined
          let allSessions: any[] = []

          if (matchedProjects && matchedProjects.length > 0) {
            // 从所有匹配的项目获取会话
            for (const encodedPath of matchedProjects) {
              const sessions = await window.api.claudeHistory.getSessions(encodedPath)
              allSessions.push(...sessions)
            }
            // 按时间排序
            allSessions.sort((a, b) => {
              if (!a.lastModified) return 1
              if (!b.lastModified) return -1
              return b.lastModified.localeCompare(a.lastModified)
            })
          } else {
            // 单项目模式
            allSessions = await window.api.claudeHistory.getSessions(project.encodedPath)
          }

          // Filter out deleted sessions
          const filteredSessions = allSessions.filter((s) => !deletedIds.includes(s.id))

          set({
            claudeSessions: filteredSessions,
            claudeSyncStatus: {
              syncing: false,
              lastSync: Date.now(),
              message: `Found ${filteredSessions.length} conversations`
            }
          })

          // Copy to workspace - 在后台进行，不阻塞 UI
          window.api.claudeHistory
            .copyToWorkspace(workspacePath, project.encodedPath)
            .catch((err) => {
              console.warn('Background copy to workspace failed:', err)
            })
        } else {
          set({
            claudeProject: null,
            claudeSessions: [],
            deletedSessionIds: [],
            claudeSyncStatus: {
              syncing: false,
              lastSync: Date.now(),
              message: 'No Claude history found'
            }
          })
        }
      }
    } catch (error) {
      set({
        claudeSyncStatus: {
          syncing: false,
          lastSync: null,
          message: `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      })
    }
  },

  refreshClaudeHistory: async () => {
    const { claudeProject, workspacePath } = get()
    if (!claudeProject || !workspacePath) return

    set({
      claudeSyncStatus: {
        syncing: true,
        lastSync: null,
        message: 'Refreshing...'
      }
    })

    try {
      if (window.api?.claudeHistory) {
        // Load deleted session IDs
        const deletedIds = await window.api.claudeHistory.getDeletedSessionsForProject(
          claudeProject.encodedPath
        )
        set({ deletedSessionIds: deletedIds })

        const sessions = await window.api.claudeHistory.getSessions(claudeProject.encodedPath)

        // Filter out deleted sessions
        const filteredSessions = sessions.filter((s) => !deletedIds.includes(s.id))

        set({
          claudeSessions: filteredSessions,
          claudeSyncStatus: {
            syncing: false,
            lastSync: Date.now(),
            message: `Refreshed ${filteredSessions.length} conversations`
          }
        })

        // Copy to workspace - 在后台进行，不阻塞 UI
        window.api.claudeHistory
          .copyToWorkspace(workspacePath, claudeProject.encodedPath)
          .then((copyResult) => {
            if (copyResult) {
              set({
                claudeSyncStatus: {
                  syncing: false,
                  lastSync: Date.now(),
                  message: `Synced ${copyResult.copiedSessions} sessions`
                }
              })

              // Clear message after 3 seconds
              setTimeout(() => {
                set((state) => ({
                  claudeSyncStatus: {
                    ...state.claudeSyncStatus,
                    message: null
                  }
                }))
              }, 3000)
            }
          })
          .catch((err) => {
            console.warn('Background copy to workspace failed:', err)
          })
      }
    } catch (error) {
      set({
        claudeSyncStatus: {
          syncing: false,
          lastSync: null,
          message: `Refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      })
    }
  },

  markSessionDeleted: async (sessionId: string) => {
    const { claudeProject, claudeSessions, deletedSessionIds } = get()
    if (!claudeProject) return

    try {
      await window.api.claudeHistory.markSessionDeleted(claudeProject.encodedPath, sessionId)

      // Update local state
      const newDeletedIds = [...deletedSessionIds, sessionId]
      const filteredSessions = claudeSessions.filter((s) => s.id !== sessionId)

      set({
        deletedSessionIds: newDeletedIds,
        claudeSessions: filteredSessions
      })
    } catch (error) {
      console.error('Failed to mark session as deleted:', error)
    }
  },

  restoreSession: async (sessionId: string) => {
    const { claudeProject, deletedSessionIds } = get()
    if (!claudeProject) return

    try {
      await window.api.claudeHistory.restoreSession(claudeProject.encodedPath, sessionId)

      // Update local state
      const newDeletedIds = deletedSessionIds.filter((id) => id !== sessionId)
      set({ deletedSessionIds: newDeletedIds })

      // Reload sessions to include the restored one
      const sessions = await window.api.claudeHistory.getSessions(claudeProject.encodedPath)
      const filteredSessions = sessions.filter((s) => !newDeletedIds.includes(s.id))

      // Sort by lastModified
      filteredSessions.sort((a, b) => {
        if (!a.lastModified) return 1
        if (!b.lastModified) return -1
        return b.lastModified.localeCompare(a.lastModified)
      })

      set({ claudeSessions: filteredSessions })
    } catch (error) {
      console.error('Failed to restore session:', error)
    }
  },

  loadDeletedSessions: async () => {
    const { claudeProject } = get()
    if (!claudeProject) return

    try {
      const deletedIds = await window.api.claudeHistory.getDeletedSessionsForProject(
        claudeProject.encodedPath
      )
      set({ deletedSessionIds: deletedIds })
    } catch (error) {
      console.error('Failed to load deleted sessions:', error)
    }
  }
}))
