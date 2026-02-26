/// <reference types="vite/client" />

interface FileEntry {
  name: string
  isDirectory: boolean
  path: string
}

// Claude History Types
interface ClaudeHistoryProviderInfo {
  id: string
  displayName: string
  basePath: string
  isAvailable: boolean
}

interface ClaudeProject {
  name: string
  path: string
  actualPath: string
  encodedPath: string
  sessionCount: number
  messageCount: number
  lastModified: string
}

interface ClaudeSession {
  id: string
  actualSessionId: string
  filePath: string
  projectPath: string
  projectName: string
  encodedProjectPath: string // 用于加载消息
  messageCount: number
  firstMessageTime: string | null
  lastMessageTime: string | null
  lastModified: string
  hasToolUse: boolean
  hasErrors: boolean
  summary: string | null
  preview: string | null
}

interface ClaudeMessage {
  uuid: string
  parentUuid: string | null
  sessionId: string
  timestamp: string
  type:
    | 'user'
    | 'assistant'
    | 'system'
    | 'summary'
    | 'progress'
    | 'file-history-snapshot'
    | 'queue-operation'
  message?: {
    role: string
    content?: string | any[]
    id?: string
    model?: string
    stop_reason?: string | null
    usage?: {
      input_tokens?: number
      output_tokens?: number
      cache_creation_input_tokens?: number
      cache_read_input_tokens?: number
    }
  }
  content?: string | any[]
  projectName?: string
  toolUse?: Record<string, any>
  toolUseResult?: Record<string, any>
  isSidechain?: boolean
  usage?: {
    input_tokens?: number
    output_tokens?: number
    cache_creation_input_tokens?: number
    cache_read_input_tokens?: number
  }
  role?: string
  model?: string
  stop_reason?: string
  costUSD?: number
  durationMs?: number
  cwd?: string
  gitBranch?: string
  isMeta?: boolean
}

interface ClaudeSearchResult {
  session: ClaudeSession
  matchingMessages: ClaudeMessage[]
}

// Statistics Types
interface ToolUsageStats {
  tool_name: string
  usage_count: number
  success_rate: number
  avg_execution_time?: number
}

interface SessionTokenStats {
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

interface DailyStats {
  date: string
  total_tokens: number
  input_tokens: number
  output_tokens: number
  message_count: number
  session_count: number
  active_hours: number
}

interface ActivityHeatmap {
  hour: number
  day: number
  activity_count: number
  tokens_used: number
}

interface TokenDistribution {
  input: number
  output: number
  cache_creation: number
  cache_read: number
}

interface ProjectStatsSummary {
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

interface GlobalStatsSummary {
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

interface FileEdit {
  path: string
  oldContent: string
  newContent: string
  timestamp: string
  sessionId: string
  projectName: string
}

interface RecentEditsResult {
  edits: FileEdit[]
  total_count: number
  has_more: boolean
}

interface Window {
  electron: {
    ipcRenderer: {
      send(channel: string, ...args: any[]): void
      on(channel: string, func: (...args: any[]) => void): () => void
      once(channel: string, func: (...args: any[]) => void): void
      removeListener(channel: string, func: (...args: any[]) => void): void
      removeAllListeners(channel: string): void
    }
    process: any
  }
  api: {
    workspace: {
      select: () => Promise<{ success: boolean; path: string | null }>
    }
    dialog: {
      openDirectory: () => Promise<{ canceled: boolean; filePaths: string[] }>
    }
    config: {
      load: <T>(params: { workspacePath: string; filename: string; defaultValue: T }) => Promise<T>
      save: <T>(params: { workspacePath: string; filename: string; data: T }) => Promise<boolean>
      loadRoleSettings: <T>(params: { workspacePath: string; defaultValue: T }) => Promise<T>
      saveRoleSettings: <T>(params: { workspacePath: string; data: T }) => Promise<boolean>
    }
    fs: {
      readDir: (dirPath: string) => Promise<FileEntry[]>
      readFile: (filePath: string) => Promise<{ success: boolean; content: string | null }>
      writeFile: (filePath: string, content: string) => Promise<{ success: boolean }>
      onFileChanged: (
        callback: (data: { event: string; path: string; timestamp?: number }) => void
      ) => () => void
      searchInWorkspace: (
        workspacePath: string,
        query: string
      ) => Promise<
        Array<{
          file: string
          path: string
          line: number
          content: string
        }>
      >
      setIgnoredDirectories: (dirs: string[]) => void
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
}
