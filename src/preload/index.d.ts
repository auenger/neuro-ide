import { ElectronAPI } from '@electron-toolkit/preload'

export interface FileChangeData {
  event: string
  path: string
  timestamp?: number
}

// Claude History Types
export interface ClaudeHistoryProviderInfo {
  id: string
  displayName: string
  basePath: string
  isAvailable: boolean
}

export interface ClaudeProject {
  encodedPath: string
  decodedPath: string
  projectName: string
  sessionCount: number
  lastActivity: string | null
}

export interface ClaudeSession {
  id: string
  projectPath: string
  projectName: string
  jsonlPath: string
  encodedProjectPath: string // 用于加载消息
  messageCount: number
  firstMessageTime: string | null
  lastMessageTime: string | null
  preview: string | null
}

export interface ClaudeMessage {
  type: 'user' | 'assistant' | 'file-history-snapshot' | 'summary'
  sessionId: string
  uuid: string
  parentUuid: string | null
  message?: {
    role: string
    content: string | any[]
  }
  timestamp: string
  cwd?: string
  gitBranch?: string
  isMeta?: boolean
  isSidechain?: boolean
  userType?: string
  version?: string
}

export interface ClaudeSearchResult {
  session: ClaudeSession
  matchingMessages: ClaudeMessage[]
}

// Statistics Types
export interface ToolUsageStats {
  tool_name: string
  usage_count: number
  success_rate: number
  avg_execution_time?: number
}

export interface SessionTokenStats {
  session_id: string
  project_name: string
  total_input_tokens: number
  total_output_tokens: number
  total_cache_creation_tokens: number
  total_cache_read_tokens: number
  total_tokens: number
  message_count: number
  first_message_time: string
  last_message_time: string
  summary?: string
  most_used_tools: ToolUsageStats[]
}

export interface DailyStats {
  date: string
  total_tokens: number
  input_tokens: number
  output_tokens: number
  message_count: number
  session_count: number
  active_hours: number
}

export interface ActivityHeatmap {
  hour: number
  day: number
  activity_count: number
  tokens_used: number
}

export interface TokenDistribution {
  input: number
  output: number
  cache_creation: number
  cache_read: number
}

export interface ProjectStatsSummary {
  project_name: string
  total_sessions: number
  total_messages: number
  total_tokens: number
  avg_tokens_per_session: number
  avg_session_duration: number
  total_session_duration: number
  most_active_hour: number
  most_used_tools: ToolUsageStats[]
  daily_stats: DailyStats[]
  activity_heatmap: ActivityHeatmap[]
  token_distribution: TokenDistribution
}

export interface GlobalStatsSummary {
  total_projects: number
  total_sessions: number
  total_messages: number
  total_tokens: number
  total_session_duration_minutes: number
  date_range: {
    first_message?: string
    last_message?: string
    days_span: number
  }
  token_distribution: TokenDistribution
  daily_stats: DailyStats[]
  activity_heatmap: ActivityHeatmap[]
  most_used_tools: ToolUsageStats[]
  top_projects: {
    project_name: string
    sessions: number
    messages: number
    tokens: number
  }[]
}

export interface RecentEditsResult {
  edits: Array<{
    path: string
    oldContent: string
    newContent: string
    timestamp: string
    sessionId: string
    projectName: string
  }>
  total_count: number
  has_more: boolean
}

export interface FileEdit {
  path: string
  oldContent: string
  newContent: string
  timestamp: string
  sessionId: string
  projectName: string
}

export interface API {
  workspace: {
    select: () => Promise<{ success: boolean; path: string | null }>
  }
  dialog: {
    openDirectory: () => Promise<{ canceled: boolean; filePaths: string[] }>
  }
  fs: {
    readDir: (dirPath: string) => Promise<any[]>
    readFile: (filePath: string) => Promise<{ success: boolean; content: string | null }>
    writeFile: (filePath: string, content: string) => Promise<{ success: boolean }>
    onFileChanged: (callback: (data: FileChangeData) => void) => () => void
    searchInWorkspace: (workspacePath: string, query: string) => Promise<any[]>
  }
  config: {
    load: (params: any) => Promise<any>
    save: (params: any) => Promise<boolean>
    loadRoleSettings: (params: any) => Promise<any>
    saveRoleSettings: (params: any) => Promise<boolean>
  }
  session: {
    create: (
      sessionId: string,
      customPrompt?: string
    ) => Promise<{ success: boolean; pid: number | null }>
    input: (sessionId: string, data: string) => void
    resize: (sessionId: string, cols: number, rows: number) => void
    kill: (sessionId: string) => Promise<boolean>
    onIncoming: (callback: (sessionId: string, data: string) => void) => () => void
    onExited: (
      callback: (sessionId: string, exitCode: number, signal: number) => void
    ) => () => void
  }

  claudeHistory: {
    detect: () => Promise<ClaudeHistoryProviderInfo>
    getProjects: () => Promise<ClaudeProject[]>
    getSessions: (encodedProjectPath: string) => Promise<ClaudeSession[]>
    getMessages: (
      sessionId: string,
      encodedProjectPath: string,
      offset?: number,
      limit?: number
    ) => Promise<{ messages: ClaudeMessage[]; total_count: number; has_more: boolean }>
    search: (query: string, limit?: number) => Promise<ClaudeSearchResult[]>
    getSessionStats: (
      sessionId: string,
      encodedProjectPath: string
    ) => Promise<SessionTokenStats | null>
    getProjectStats: (encodedProjectPath: string) => Promise<ProjectStatsSummary>
    getGlobalStats: () => Promise<GlobalStatsSummary>
    getRecentEdits: (
      encodedProjectPath: string,
      limit?: number,
      offset?: number
    ) => Promise<RecentEditsResult>
    getSessionEdits: (sessionId: string, encodedProjectPath: string) => Promise<FileEdit[]>
    onChanged: (
      callback: (data: { event: string; path: string; timestamp: number }) => void
    ) => () => void
    // Auto-sync methods
    findProjectByPath: (workspacePath: string) => Promise<ClaudeProject | null>
    getAllProjectSummaries: () => Promise<
      Array<{
        name: string
        encodedPath: string
        actualPath: string
        sessionCount: number
        lastModified: string
      }>
    >
    copyToWorkspace: (
      workspacePath: string,
      encodedProjectPath: string
    ) => Promise<{
      success: boolean
      message: string
      copiedSessions: number
    }>
    getWorkspaceHistory: (workspacePath: string) => Promise<{
      available: boolean
      metadata?: {
        sourcePath: string
        actualPath: string
        copiedAt: string
        sessionCount: number
      }
      sessions?: ClaudeSession[]
    }>
    // Deleted sessions management
    getDeletedSessions: () => Promise<Record<string, string[]>>
    getDeletedSessionsForProject: (encodedProjectPath: string) => Promise<string[]>
    markSessionDeleted: (encodedProjectPath: string, sessionId: string) => Promise<void>
    restoreSession: (encodedProjectPath: string, sessionId: string) => Promise<void>
    clearDeletedSessionsForProject: (encodedProjectPath: string) => Promise<void>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI & {
      process: any
      ipcRenderer: {
        send(channel: string, ...args: any[]): void
        on(channel: string, func: (...args: any[]) => void): () => void
        once(channel: string, func: (...args: any[]) => void): void
        removeListener(channel: string, func: (...args: any[]) => void): void
        removeAllListeners(channel: string): void
        invoke(channel: string, ...args: any[]): Promise<any>
      }
    }
    api: API
  }
}
