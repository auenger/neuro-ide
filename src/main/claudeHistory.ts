import { app, BrowserWindow } from 'electron'
import fs from 'fs/promises'
import { join } from 'path'
import { existsSync, statSync, readFileSync } from 'fs'
import chokidar from 'chokidar'

// ============================================================================
// Token Usage Types
// ============================================================================

export interface TokenUsage {
  input_tokens?: number
  output_tokens?: number
  cache_creation_input_tokens?: number
  cache_read_input_tokens?: number
  service_tier?: string
}

// ============================================================================
// Message Content Types (Matching Claude API)
// ============================================================================

export interface TextContent {
  type: 'text'
  text: string
}

export interface ThinkingContent {
  type: 'thinking'
  thinking: string
  signature?: string
}

export interface RedactedThinkingContent {
  type: 'redacted_thinking'
  data: string
}

export interface ToolUseContent {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, any>
}

export interface ToolResultContent {
  type: 'tool_result'
  tool_use_id: string
  content?: string | any[]
  is_error?: boolean
}

export interface McpToolUseContent {
  type: 'mcp_tool_use'
  id: string
  server_name: string
  tool_name: string
  input: Record<string, any>
}

export interface McpToolResultContent {
  type: 'mcp_tool_result'
  tool_use_id: string
  content?: string | any[]
  is_error?: boolean
}

export interface ServerToolUseContent {
  type: 'server_tool_use'
  id: string
  name: string
  input: Record<string, any>
}

export interface WebSearchToolResultContent {
  type: 'web_search_tool_result'
  tool_use_id: string
  content: any
  is_error?: boolean
}

export interface WebFetchToolResultContent {
  type: 'web_fetch_tool_result'
  tool_use_id: string
  content?: string
  url?: string
  status_code?: number
  is_error?: boolean
}

export interface CodeExecutionToolResultContent {
  type: 'code_execution_tool_result'
  tool_use_id: string
  content?: string
  exit_code?: number
  stdout?: string
  stderr?: string
  is_error?: boolean
}

export interface ImageContent {
  type: 'image'
  source: {
    type: 'base64' | 'url'
    media_type?: string
    data?: string
    url?: string
  }
}

export interface DocumentContent {
  type: 'document'
  source: {
    type: 'base64' | 'url' | 'text'
    media_type?: string
    data?: string
    url?: string
    text?: string
  }
}

export interface SearchContent {
  type: 'search_result'
  query: string
  results: any[]
}

export type ContentItem =
  | TextContent
  | ThinkingContent
  | RedactedThinkingContent
  | ToolUseContent
  | ToolResultContent
  | McpToolUseContent
  | McpToolResultContent
  | ServerToolUseContent
  | WebSearchToolResultContent
  | WebFetchToolResultContent
  | CodeExecutionToolResultContent
  | ImageContent
  | DocumentContent
  | SearchContent
  | Record<string, any>

// ============================================================================
// Message Types
// ============================================================================

export interface MessageContent {
  role: string
  content?: string | ContentItem[]
  id?: string
  model?: string
  stop_reason?: string | null
  usage?: TokenUsage
}

export interface ClaudeMessage {
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
  message?: MessageContent
  content?: string | ContentItem[]
  projectName?: string
  toolUse?: Record<string, any>
  toolUseResult?: Record<string, any>
  isSidechain?: boolean
  usage?: TokenUsage
  role?: string
  model?: string
  stop_reason?: string
  costUSD?: number
  durationMs?: number
  messageId?: string
  snapshot?: Record<string, any>
  isSnapshotUpdate?: boolean
  data?: Record<string, any>
  toolUseID?: string
  parentToolUseID?: string
  operation?: string
  subtype?: string
  level?: string
  hookCount?: number
  hookInfos?: Record<string, any>[]
  stopReasonSystem?: string
  preventedContinuation?: boolean
  compactMetadata?: Record<string, any>
  microcompactMetadata?: Record<string, any>
  provider?: string
  cwd?: string
  gitBranch?: string
  isMeta?: boolean
}

// ============================================================================
// Session & Project Types
// ============================================================================

export interface ClaudeSession {
  id: string
  actualSessionId: string
  filePath: string
  projectPath: string
  projectName: string
  encodedProjectPath: string // 添加此字段，用于加载消息
  messageCount: number
  firstMessageTime: string | null
  lastMessageTime: string | null
  lastModified: string
  hasToolUse: boolean
  hasErrors: boolean
  summary: string | null
  preview: string | null
}

export interface ClaudeProject {
  name: string
  path: string
  actualPath: string
  encodedPath: string
  sessionCount: number
  messageCount: number
  lastModified: string
}

export interface ClaudeHistoryProviderInfo {
  id: string
  displayName: string
  basePath: string
  isAvailable: boolean
}

// ============================================================================
// Statistics Types
// ============================================================================

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

// ============================================================================
// Recent Edits Types
// ============================================================================

export interface FileEdit {
  path: string
  oldContent: string
  newContent: string
  timestamp: string
  sessionId: string
  projectName: string
}

export interface RecentEditsResult {
  edits: FileEdit[]
  total_count: number
  has_more: boolean
}

// ============================================================================
// Claude History Service
// ============================================================================

export class ClaudeHistoryService {
  private claudeBasePath: string
  private projectsPath: string
  private watcher: ReturnType<typeof chokidar.watch> | null = null
  private mainWindow: BrowserWindow | null = null

  constructor() {
    const homeDir = app.getPath('home') || process.env.HOME || process.env.USERPROFILE || ''
    this.claudeBasePath = join(homeDir, '.claude')
    this.projectsPath = join(this.claudeBasePath, 'projects')
  }

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window
  }

  // ============================================================================
  // Auto-sync with workspace
  // ============================================================================

  /**
   * Find a Claude project by matching the workspace path
   * Supports exact match, subdirectory match, and parent directory match
   * Aggregates sessions from all matching projects
   */
  async findProjectByPath(workspacePath: string): Promise<ClaudeProject | null> {
    if (!existsSync(this.projectsPath)) return null

    const entries = await fs.readdir(this.projectsPath, { withFileTypes: true })
    const normalizedWorkspace = workspacePath.replace(/\\/g, '/').replace(/\/$/, '')

    // 收集所有匹配的项目和它们的会话
    const matchedData: Array<{
      encodedPath: string
      decodedPath: string
      priority: number
      sessions: ClaudeSession[]
    }> = []

    for (const entry of entries) {
      if (!entry.isDirectory()) continue

      const encodedPath = entry.name
      const decodedPath = this.decodeProjectPath(encodedPath)
      const normalizedProject = decodedPath.replace(/\\/g, '/').replace(/\/$/, '')

      // 计算匹配优先级
      let priority = 0

      // 1. 完全匹配 - 最高优先级
      if (normalizedProject === normalizedWorkspace) {
        priority = 3
      }
      // 2. 项目路径是工作目录的子目录（工作目录包含项目）
      else if (normalizedProject.startsWith(normalizedWorkspace + '/')) {
        priority = 2
      }
      // 3. 工作目录是项目路径的子目录（项目包含工作目录）
      else if (normalizedWorkspace.startsWith(normalizedProject + '/')) {
        priority = 1
      }

      if (priority > 0) {
        const sessions = await this.getSessionsForProject(encodedPath)
        matchedData.push({ encodedPath, decodedPath, priority, sessions })
      }
    }

    if (matchedData.length === 0) return null

    // 按优先级排序，完全匹配的排在前面
    matchedData.sort((a, b) => b.priority - a.priority)

    // 聚合所有会话
    const allSessions: ClaudeSession[] = []
    let latestActivity: string | null = null
    let primaryProject = matchedData[0]

    for (const data of matchedData) {
      allSessions.push(...data.sessions)
      for (const session of data.sessions) {
        if (session.lastModified && (!latestActivity || session.lastModified > latestActivity)) {
          latestActivity = session.lastModified
        }
      }
    }

    // 按时间排序会话
    allSessions.sort((a, b) => {
      if (!a.lastModified) return 1
      if (!b.lastModified) return -1
      return b.lastModified.localeCompare(a.lastModified)
    })

    const totalMessages = allSessions.reduce((sum, s) => sum + s.messageCount, 0)
    const projectName = this.extractProjectName(primaryProject.decodedPath)

    return {
      name: projectName,
      path: join(this.projectsPath, primaryProject.encodedPath),
      actualPath: primaryProject.decodedPath,
      encodedPath: primaryProject.encodedPath,
      sessionCount: allSessions.length,
      messageCount: totalMessages,
      lastModified: latestActivity || new Date().toISOString(),
      // 保存所有匹配的项目信息，以便后续获取会话时使用
      _matchedProjects: matchedData.map((d) => d.encodedPath)
    } as ClaudeProject & { _matchedProjects: string[] }
  }

  /**
   * Get project summary for quick display (without parsing all sessions)
   */
  async getProjectSummary(encodedProjectPath: string): Promise<{
    name: string
    encodedPath: string
    actualPath: string
    sessionCount: number
    lastModified: string
  } | null> {
    const projectDir = join(this.projectsPath, encodedProjectPath)
    if (!existsSync(projectDir)) return null

    const entries = await fs.readdir(projectDir, { withFileTypes: true })
    const sessionFiles = entries.filter((e) => e.isFile() && e.name.endsWith('.jsonl'))

    if (sessionFiles.length === 0) {
      return null
    }

    // Get the latest modified time
    let latestMtime = 0
    for (const entry of sessionFiles) {
      const filePath = join(projectDir, entry.name)
      const stats = await fs.stat(filePath)
      if (stats.mtimeMs > latestMtime) {
        latestMtime = stats.mtimeMs
      }
    }

    const decodedPath = this.decodeProjectPath(encodedProjectPath)
    const projectName = this.extractProjectName(decodedPath)

    return {
      name: projectName,
      encodedPath: encodedProjectPath,
      actualPath: decodedPath,
      sessionCount: sessionFiles.length,
      lastModified: new Date(latestMtime).toISOString()
    }
  }

  /**
   * Get all available projects as summaries for quick loading
   */
  async getAllProjectSummaries(): Promise<
    Array<{
      name: string
      encodedPath: string
      actualPath: string
      sessionCount: number
      lastModified: string
    }>
  > {
    if (!existsSync(this.projectsPath)) return []

    const entries = await fs.readdir(this.projectsPath, { withFileTypes: true })
    const summaries: Array<{
      name: string
      encodedPath: string
      actualPath: string
      sessionCount: number
      lastModified: string
    }> = []

    for (const entry of entries) {
      if (!entry.isDirectory()) continue

      const encodedPath = entry.name
      const summary = await this.getProjectSummary(encodedPath)
      if (summary) {
        summaries.push(summary)
      }
    }

    return summaries.sort((a, b) => b.lastModified.localeCompare(a.lastModified))
  }

  /**
   * Copy project history to workspace .neuro folder
   */
  async copyToWorkspace(
    workspacePath: string,
    encodedProjectPath: string
  ): Promise<{
    success: boolean
    message: string
    copiedSessions: number
  }> {
    try {
      const neuroDir = join(workspacePath, '.neuro')
      const claudeHistoryDir = join(neuroDir, 'claude-history')

      // Create .neuro/claude-history directory
      if (!existsSync(neuroDir)) {
        await fs.mkdir(neuroDir, { recursive: true })
      }
      if (!existsSync(claudeHistoryDir)) {
        await fs.mkdir(claudeHistoryDir, { recursive: true })
      }

      const sourceDir = join(this.projectsPath, encodedProjectPath)
      if (!existsSync(sourceDir)) {
        return {
          success: false,
          message: 'Source project not found',
          copiedSessions: 0
        }
      }

      // Copy all session files
      const entries = await fs.readdir(sourceDir, { withFileTypes: true })
      let copiedCount = 0

      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.jsonl')) continue

        const sourcePath = join(sourceDir, entry.name)
        const destPath = join(claudeHistoryDir, entry.name)

        await fs.copyFile(sourcePath, destPath)
        copiedCount++
      }

      // Write metadata file
      const metadata = {
        sourcePath: sourceDir,
        actualPath: this.decodeProjectPath(encodedProjectPath),
        copiedAt: new Date().toISOString(),
        sessionCount: copiedCount
      }

      await fs.writeFile(join(claudeHistoryDir, 'metadata.json'), JSON.stringify(metadata, null, 2))

      return {
        success: true,
        message: `Copied ${copiedCount} sessions to workspace`,
        copiedSessions: copiedCount
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to copy: ${error instanceof Error ? error.message : 'Unknown error'}`,
        copiedSessions: 0
      }
    }
  }

  /**
   * Get cached history from workspace .neuro folder
   */
  async getWorkspaceHistory(workspacePath: string): Promise<{
    available: boolean
    metadata?: {
      sourcePath: string
      actualPath: string
      copiedAt: string
      sessionCount: number
    }
    sessions?: ClaudeSession[]
  }> {
    try {
      const claudeHistoryDir = join(workspacePath, '.neuro', 'claude-history')
      const metadataPath = join(claudeHistoryDir, 'metadata.json')

      if (!existsSync(metadataPath)) {
        return { available: false }
      }

      const metadataContent = await fs.readFile(metadataPath, 'utf-8')
      const metadata = JSON.parse(metadataContent)

      // Read session files
      const entries = await fs.readdir(claudeHistoryDir, { withFileTypes: true })
      const sessions: ClaudeSession[] = []

      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.jsonl')) continue

        const sessionId = entry.name.replace('.jsonl', '')
        const filePath = join(claudeHistoryDir, entry.name)

        try {
          const session = await this.parseSession(filePath, sessionId, metadata.actualPath)
          if (session) {
            sessions.push(session)
          }
        } catch (error) {
          console.error(`Failed to parse session ${sessionId}:`, error)
        }
      }

      return {
        available: true,
        metadata,
        sessions: sessions.sort((a, b) => {
          if (!a.lastModified) return 1
          if (!b.lastModified) return -1
          return b.lastModified.localeCompare(a.lastModified)
        })
      }
    } catch (error) {
      console.error('Failed to get workspace history:', error)
      return { available: false }
    }
  }

  async detect(): Promise<ClaudeHistoryProviderInfo> {
    const isAvailable =
      existsSync(this.projectsPath) && (await fs.stat(this.projectsPath)).isDirectory()

    return {
      id: 'claude',
      displayName: 'Claude Code',
      basePath: this.claudeBasePath,
      isAvailable
    }
  }

  /**
   * Decode Claude session storage path to actual project path
   * Uses filesystem existence checks to correctly decode paths
   * where the project name itself contains hyphens.
   */
  decodeProjectPath(encodedPath: string): string {
    // 1. Try reading originalPath from sessions-index.json (most reliable)
    const projectDir = join(this.projectsPath, encodedPath)
    const indexPath = join(projectDir, 'sessions-index.json')
    if (existsSync(indexPath)) {
      try {
        const content = readFileSync(indexPath, 'utf-8')
        const parsed = JSON.parse(content)
        if (parsed.originalPath && parsed.originalPath.length > 0) {
          const original = parsed.originalPath as string
          // Validate it's an absolute path
          if (original.startsWith('/')) {
            return original
          }
        }
      } catch {
        // Ignore parse errors
      }
    }

    // 2. Fallback: decode from encoded directory name
    let decoded = encodedPath.startsWith('-') ? encodedPath.slice(1) : encodedPath

    // Try filesystem-based recursive decoding
    const result = this.decodeWithFilesystemCheck(decoded)
    if (result) {
      return result
    }

    // Final fallback: simple replacement
    return '/' + decoded.replace(/-/g, '/')
  }

  /**
   * Decode path by checking filesystem existence at each possible split point
   */
  private decodeWithFilesystemCheck(encoded: string): string | null {
    return this.decodeRecursive(encoded, '', 0)
  }

  /**
   * Recursively decode hyphen-separated path segments by checking filesystem existence
   */
  private decodeRecursive(encoded: string, basePath: string, depth: number): string | null {
    // Prevent infinite recursion
    if (depth > 20) {
      return null
    }

    // Empty encoded string - check if base path exists
    if (encoded.length === 0) {
      if (basePath.length > 0 && existsSync(basePath)) {
        return basePath
      }
      return null
    }

    // Find all hyphen positions
    const hyphenPositions: number[] = []
    for (let i = 0; i < encoded.length; i++) {
      if (encoded[i] === '-') {
        hyphenPositions.push(i)
      }
    }

    // Try each hyphen as a potential path separator
    for (const pos of hyphenPositions) {
      const segment = encoded.substring(0, pos)
      if (segment.length === 0) {
        continue
      }

      const candidate = basePath.length === 0 ? '/' + segment : basePath + '/' + segment

      // Check if this path exists and is a directory
      try {
        const stats = statSync(candidate)
        if (stats.isDirectory()) {
          const remaining = encoded.substring(pos + 1)

          // If no remaining, we found it
          if (remaining.length === 0) {
            return candidate
          }

          // First try: remaining as a single leaf (no more splitting needed)
          const fullPath = candidate + '/' + remaining
          if (existsSync(fullPath)) {
            try {
              const fullStats = statSync(fullPath)
              if (fullStats.isDirectory() && !fullStats.isSymbolicLink()) {
                return fullPath
              }
            } catch {
              // Ignore stat errors
            }
          }

          // Recurse: remaining may itself contain hyphens that are path separators
          const result = this.decodeRecursive(remaining, candidate, depth + 1)
          if (result) {
            return result
          }
        }
      } catch {
        // Path doesn't exist, try next hyphen
      }
    }

    // No hyphen worked as separator - treat entire encoded as a single segment
    if (basePath.length > 0) {
      const fullPath = basePath + '/' + encoded
      if (existsSync(fullPath)) {
        return fullPath
      }
    }

    return null
  }

  extractProjectName(path: string): string {
    const parts = path.split('/')
    return parts[parts.length - 1] || path
  }

  async getProjects(): Promise<ClaudeProject[]> {
    if (!existsSync(this.projectsPath)) return []

    const entries = await fs.readdir(this.projectsPath, { withFileTypes: true })
    const projects: ClaudeProject[] = []

    for (const entry of entries) {
      if (!entry.isDirectory()) continue

      const encodedPath = entry.name
      const decodedPath = this.decodeProjectPath(encodedPath)
      const projectName = this.extractProjectName(decodedPath)

      const sessions = await this.getSessionsForProject(encodedPath)
      const lastActivity =
        sessions.length > 0
          ? sessions.reduce(
              (latest, s) =>
                s.lastModified && (!latest || s.lastModified > latest) ? s.lastModified : latest,
              null as string | null
            )
          : null

      const totalMessages = sessions.reduce((sum, s) => sum + s.messageCount, 0)

      projects.push({
        name: projectName,
        path: join(this.projectsPath, encodedPath),
        actualPath: decodedPath,
        encodedPath,
        sessionCount: sessions.length,
        messageCount: totalMessages,
        lastModified: lastActivity || new Date().toISOString()
      })
    }

    return projects.sort((a, b) => b.lastModified.localeCompare(a.lastModified))
  }

  async getSessionsForProject(encodedProjectPath: string): Promise<ClaudeSession[]> {
    const projectDir = join(this.projectsPath, encodedProjectPath)
    if (!existsSync(projectDir)) return []

    const entries = await fs.readdir(projectDir, { withFileTypes: true })
    const sessions: ClaudeSession[] = []

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.jsonl')) continue

      const filePath = join(projectDir, entry.name)
      const sessionId = entry.name.replace('.jsonl', '')

      try {
        const session = await this.parseSession(filePath, sessionId, encodedProjectPath)
        if (session) sessions.push(session)
      } catch (error) {
        console.error(`Failed to parse session ${sessionId}:`, error)
      }
    }

    return sessions.sort((a, b) => {
      if (!a.lastModified) return 1
      if (!b.lastModified) return -1
      return b.lastModified.localeCompare(a.lastModified)
    })
  }

  private async parseSession(
    filePath: string,
    sessionId: string,
    encodedProjectPath: string
  ): Promise<ClaudeSession | null> {
    const stats = await fs.stat(filePath)
    const content = await fs.readFile(filePath, 'utf-8')
    const lines = content.trim().split('\n')

    if (lines.length === 0) return null

    let messageCount = 0
    let firstMessageTime: string | null = null
    let lastMessageTime: string | null = null
    let preview: string | null = null
    let actualSessionId = sessionId
    let hasToolUse = false
    let hasErrors = false
    let summary: string | null = null

    for (const line of lines) {
      if (!line.trim()) continue

      try {
        const raw: Record<string, any> = JSON.parse(line)
        const msgType = raw.type

        if (msgType === 'file-history-snapshot') continue
        if (raw.isMeta) continue

        if (raw.sessionId) actualSessionId = raw.sessionId

        messageCount++

        if (raw.timestamp) {
          if (!firstMessageTime || raw.timestamp < firstMessageTime) {
            firstMessageTime = raw.timestamp
          }
          if (!lastMessageTime || raw.timestamp > lastMessageTime) {
            lastMessageTime = raw.timestamp
          }
        }

        if (!preview && msgType === 'user' && raw.message?.content) {
          const content =
            typeof raw.message.content === 'string'
              ? raw.message.content
              : Array.isArray(raw.message.content)
                ? raw.message.content
                    .map((c: any) => (typeof c === 'string' ? c : c.text || ''))
                    .join(' ')
                : ''
          preview = content.slice(0, 100) + (content.length > 100 ? '...' : '')
        }

        if (msgType === 'summary' && raw.summary) {
          summary = raw.summary
        }

        // Check for tool use
        if (raw.toolUse || raw.message?.content?.some?.((c: any) => c.type === 'tool_use')) {
          hasToolUse = true
        }

        // Check for errors
        if (raw.toolUseResult?.is_error || raw.message?.content?.some?.((c: any) => c.is_error)) {
          hasErrors = true
        }
      } catch (e) {
        // Skip malformed lines
      }
    }

    return {
      id: sessionId,
      actualSessionId,
      filePath,
      projectPath: this.decodeProjectPath(encodedProjectPath),
      projectName: this.extractProjectName(this.decodeProjectPath(encodedProjectPath)),
      encodedProjectPath,
      messageCount,
      firstMessageTime,
      lastMessageTime,
      lastModified: stats.mtime.toISOString(),
      hasToolUse,
      hasErrors,
      summary,
      preview
    }
  }

  async getSessionMessages(
    sessionId: string,
    encodedProjectPath: string,
    offset: number = 0,
    limit: number = 100
  ): Promise<{ messages: ClaudeMessage[]; total_count: number; has_more: boolean }> {
    const filePath = join(this.projectsPath, encodedProjectPath, `${sessionId}.jsonl`)
    if (!existsSync(filePath)) {
      return { messages: [], total_count: 0, has_more: false }
    }

    const content = await fs.readFile(filePath, 'utf-8')
    const lines = content
      .trim()
      .split('\n')
      .filter((l) => l.trim())

    const allMessages: ClaudeMessage[] = []

    for (const line of lines) {
      try {
        const raw: Record<string, any> = JSON.parse(line)

        if (raw.type === 'file-history-snapshot') continue
        if (raw.isMeta) continue

        const msg: ClaudeMessage = {
          uuid: raw.uuid || '',
          parentUuid: raw.parentUuid || null,
          sessionId: raw.sessionId || sessionId,
          timestamp: raw.timestamp || '',
          type: raw.type || 'user',
          message: raw.message,
          content: raw.message?.content,
          toolUse: raw.toolUse,
          toolUseResult: raw.toolUseResult,
          isSidechain: raw.isSidechain,
          usage: raw.message?.usage,
          role: raw.message?.role,
          model: raw.message?.model,
          stop_reason: raw.message?.stop_reason,
          costUSD: raw.costUSD,
          durationMs: raw.durationMs,
          subtype: raw.subtype,
          level: raw.level,
          cwd: raw.cwd,
          gitBranch: raw.gitBranch,
          isMeta: raw.isMeta
        }

        allMessages.push(msg)
      } catch (e) {
        // Skip malformed lines
      }
    }

    const paginatedMessages = allMessages.slice(offset, offset + limit)

    return {
      messages: paginatedMessages,
      total_count: allMessages.length,
      has_more: offset + limit < allMessages.length
    }
  }

  async getSessionStats(
    sessionId: string,
    encodedProjectPath: string
  ): Promise<SessionTokenStats | null> {
    const { messages } = await this.getSessionMessages(sessionId, encodedProjectPath, 0, 10000)

    if (messages.length === 0) return null

    let totalInput = 0
    let totalOutput = 0
    let totalCacheCreation = 0
    let totalCacheRead = 0
    const toolUsage: Record<string, { count: number; errors: number }> = {}

    for (const msg of messages) {
      const usage = msg.usage || msg.message?.usage
      if (usage) {
        totalInput += usage.input_tokens || 0
        totalOutput += usage.output_tokens || 0
        totalCacheCreation += usage.cache_creation_input_tokens || 0
        totalCacheRead += usage.cache_read_input_tokens || 0
      }

      // Track tool usage
      const content = msg.content || msg.message?.content
      if (Array.isArray(content)) {
        for (const item of content) {
          if (item.type === 'tool_use' && item.name) {
            if (!toolUsage[item.name]) {
              toolUsage[item.name] = { count: 0, errors: 0 }
            }
            toolUsage[item.name].count++
          }
          if (item.type === 'tool_result' && item.is_error) {
            // Find corresponding tool
            const toolId = item.tool_use_id
            for (const c of content) {
              if (c.type === 'tool_use' && c.id === toolId && c.name) {
                if (toolUsage[c.name]) {
                  toolUsage[c.name].errors++
                }
              }
            }
          }
        }
      }
    }

    const mostUsedTools: ToolUsageStats[] = Object.entries(toolUsage)
      .map(([name, data]) => ({
        tool_name: name,
        usage_count: data.count,
        success_rate: data.count > 0 ? ((data.count - data.errors) / data.count) * 100 : 100
      }))
      .sort((a, b) => b.usage_count - a.usage_count)
      .slice(0, 10)

    const sortedMessages = [...messages].sort((a, b) => a.timestamp.localeCompare(b.timestamp))

    return {
      session_id: sessionId,
      project_name: this.extractProjectName(this.decodeProjectPath(encodedProjectPath)),
      total_input_tokens: totalInput,
      total_output_tokens: totalOutput,
      total_cache_creation_tokens: totalCacheCreation,
      total_cache_read_tokens: totalCacheRead,
      total_tokens: totalInput + totalOutput + totalCacheCreation + totalCacheRead,
      message_count: messages.length,
      first_message_time: sortedMessages[0]?.timestamp || '',
      last_message_time: sortedMessages[sortedMessages.length - 1]?.timestamp || '',
      most_used_tools: mostUsedTools
    }
  }

  async getProjectStats(encodedProjectPath: string): Promise<ProjectStatsSummary> {
    const sessions = await this.getSessionsForProject(encodedProjectPath)
    const projectName = this.extractProjectName(this.decodeProjectPath(encodedProjectPath))

    let totalMessages = 0
    let totalTokens = 0
    const dailyStatsMap: Record<string, DailyStats> = {}
    const heatmapMap: Record<string, ActivityHeatmap> = {}
    const toolUsage: Record<string, { count: number; errors: number }> = {}

    for (const session of sessions) {
      const stats = await this.getSessionStats(session.id, encodedProjectPath)
      if (stats) {
        totalMessages += stats.message_count
        totalTokens += stats.total_tokens

        // Aggregate daily stats
        if (stats.first_message_time) {
          const date = stats.first_message_time.split('T')[0]
          if (!dailyStatsMap[date]) {
            dailyStatsMap[date] = {
              date,
              total_tokens: 0,
              input_tokens: 0,
              output_tokens: 0,
              message_count: 0,
              session_count: 0,
              active_hours: 0
            }
          }
          dailyStatsMap[date].total_tokens += stats.total_tokens
          dailyStatsMap[date].input_tokens += stats.total_input_tokens
          dailyStatsMap[date].output_tokens += stats.total_output_tokens
          dailyStatsMap[date].message_count += stats.message_count
          dailyStatsMap[date].session_count++
        }

        // Aggregate tool usage
        for (const tool of stats.most_used_tools) {
          if (!toolUsage[tool.tool_name]) {
            toolUsage[tool.tool_name] = { count: 0, errors: 0 }
          }
          toolUsage[tool.tool_name].count += tool.usage_count
        }
      }
    }

    const daily_stats = Object.values(dailyStatsMap).sort((a, b) => a.date.localeCompare(b.date))
    const activity_heatmap = Object.values(heatmapMap)

    const most_used_tools: ToolUsageStats[] = Object.entries(toolUsage)
      .map(([name, data]) => ({
        tool_name: name,
        usage_count: data.count,
        success_rate: 100
      }))
      .sort((a, b) => b.usage_count - a.usage_count)
      .slice(0, 10)

    return {
      project_name: projectName,
      total_sessions: sessions.length,
      total_messages: totalMessages,
      total_tokens: totalTokens,
      avg_tokens_per_session: sessions.length > 0 ? Math.round(totalTokens / sessions.length) : 0,
      avg_session_duration: 0,
      total_session_duration: 0,
      most_active_hour: 0,
      most_used_tools,
      daily_stats,
      activity_heatmap,
      token_distribution: {
        input: 0,
        output: 0,
        cache_creation: 0,
        cache_read: 0
      }
    }
  }

  async getGlobalStats(): Promise<GlobalStatsSummary> {
    const projects = await this.getProjects()

    let totalSessions = 0
    let totalMessages = 0
    let totalTokens = 0
    const allDailyStats: Record<string, DailyStats> = {}
    const allToolUsage: Record<string, number> = {}
    const projectRankings: {
      project_name: string
      sessions: number
      messages: number
      tokens: number
    }[] = []

    let firstMessage: string | undefined
    let lastMessage: string | undefined

    for (const project of projects) {
      const projectStats = await this.getProjectStats(project.encodedPath)

      totalSessions += projectStats.total_sessions
      totalMessages += projectStats.total_messages
      totalTokens += projectStats.total_tokens

      // Aggregate daily stats
      for (const daily of projectStats.daily_stats) {
        if (!allDailyStats[daily.date]) {
          allDailyStats[daily.date] = { ...daily }
        } else {
          allDailyStats[daily.date].total_tokens += daily.total_tokens
          allDailyStats[daily.date].message_count += daily.message_count
          allDailyStats[daily.date].session_count += daily.session_count
        }
      }

      // Aggregate tool usage
      for (const tool of projectStats.most_used_tools) {
        allToolUsage[tool.tool_name] = (allToolUsage[tool.tool_name] || 0) + tool.usage_count
      }

      projectRankings.push({
        project_name: project.name,
        sessions: projectStats.total_sessions,
        messages: projectStats.total_messages,
        tokens: projectStats.total_tokens
      })

      // Track date range
      if (projectStats.daily_stats.length > 0) {
        const first = projectStats.daily_stats[0].date
        const last = projectStats.daily_stats[projectStats.daily_stats.length - 1].date
        if (!firstMessage || first < firstMessage) firstMessage = first
        if (!lastMessage || last > lastMessage) lastMessage = last
      }
    }

    const top_projects = projectRankings.sort((a, b) => b.tokens - a.tokens).slice(0, 10)

    const most_used_tools: ToolUsageStats[] = Object.entries(allToolUsage)
      .map(([name, count]) => ({
        tool_name: name,
        usage_count: count,
        success_rate: 100
      }))
      .sort((a, b) => b.usage_count - a.usage_count)
      .slice(0, 10)

    const firstDate = firstMessage ? new Date(firstMessage) : null
    const lastDate = lastMessage ? new Date(lastMessage) : null
    const days_span =
      firstDate && lastDate
        ? Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0

    return {
      total_projects: projects.length,
      total_sessions: totalSessions,
      total_messages: totalMessages,
      total_tokens: totalTokens,
      total_session_duration_minutes: 0,
      date_range: {
        first_message: firstMessage,
        last_message: lastMessage,
        days_span
      },
      token_distribution: {
        input: 0,
        output: 0,
        cache_creation: 0,
        cache_read: 0
      },
      daily_stats: Object.values(allDailyStats).sort((a, b) => a.date.localeCompare(b.date)),
      activity_heatmap: [],
      most_used_tools,
      top_projects
    }
  }

  async getSessionEdits(sessionId: string, encodedProjectPath: string): Promise<FileEdit[]> {
    const projectPath = this.decodeProjectPath(encodedProjectPath)
    const edits: FileEdit[] = []
    const projectName = this.extractProjectName(projectPath)

    const { messages } = await this.getSessionMessages(sessionId, encodedProjectPath, 0, 10000)

    for (const msg of messages) {
      // Extract edits from tool_use content
      const content = msg.content || msg.message?.content
      if (Array.isArray(content)) {
        for (const item of content) {
          if (
            item.type === 'tool_use' &&
            (item.name === 'Write' || item.name === 'Edit' || item.name === 'MultiEdit')
          ) {
            const input = item.input || {}
            const filePath = input.file_path || input.path || ''

            if (filePath && input.content !== undefined) {
              edits.push({
                path: filePath,
                oldContent: input.old_string || '',
                newContent:
                  typeof input.content === 'string' ? input.content : JSON.stringify(input.content),
                timestamp: msg.timestamp,
                sessionId: msg.sessionId,
                projectName
              })
            } else if (filePath && input.new_string !== undefined) {
              // Edit operation
              const oldContent = input.old_string || ''
              const newContent = input.new_string || ''
              edits.push({
                path: filePath,
                oldContent,
                newContent,
                timestamp: msg.timestamp,
                sessionId: msg.sessionId,
                projectName
              })
            } else if (item.name === 'MultiEdit' && Array.isArray(input.edits)) {
              // MultiEdit with multiple edits
              const filePath = input.file_path || input.path || ''
              if (filePath) {
                const combinedNewContent = input.edits
                  .map((e: any) => e.new_string || '')
                  .join('\n')
                const combinedOldContent = input.edits
                  .map((e: any) => e.old_string || '')
                  .join('\n')
                edits.push({
                  path: filePath,
                  oldContent: combinedOldContent,
                  newContent: combinedNewContent,
                  timestamp: msg.timestamp,
                  sessionId: msg.sessionId,
                  projectName
                })
              }
            }
          }
        }
      }

      // Also check toolUse field
      if (msg.toolUse) {
        const toolName = msg.toolUse.name
        const input = msg.toolUse.input || {}
        const filePath = input.file_path || input.path || ''

        if ((toolName === 'Write' || toolName === 'Edit') && filePath) {
          const content = input.content || input.new_string || ''
          const oldContent = input.old_string || ''
          edits.push({
            path: filePath,
            oldContent,
            newContent: typeof content === 'string' ? content : JSON.stringify(content),
            timestamp: msg.timestamp,
            sessionId: msg.sessionId,
            projectName
          })
        }
      }

      // Check toolUseResult for file edits
      if (msg.toolUseResult) {
        const result = msg.toolUseResult
        const filePath = result.filePath || result.file_path || ''

        if (filePath && (result.originalFile || result.content)) {
          const originalContent = result.originalFile || ''
          const newContent = result.content || ''

          if (Array.isArray(result.edits)) {
            let content = originalContent
            for (const edit of result.edits) {
              if (edit.old_string && edit.new_string !== undefined) {
                content = content.replace(edit.old_string, edit.new_string)
              }
            }
            edits.push({
              path: filePath,
              oldContent: originalContent,
              newContent: content,
              timestamp: msg.timestamp,
              sessionId: msg.sessionId,
              projectName
            })
          } else if (result.oldString !== undefined && result.newString !== undefined) {
            const newContent = originalContent.replace(result.oldString, result.newString)
            edits.push({
              path: filePath,
              oldContent: originalContent,
              newContent,
              timestamp: msg.timestamp,
              sessionId: msg.sessionId,
              projectName
            })
          } else if (newContent) {
            edits.push({
              path: filePath,
              oldContent: originalContent,
              newContent,
              timestamp: msg.timestamp,
              sessionId: msg.sessionId,
              projectName
            })
          }
        }
      }
    }

    // Sort by timestamp descending
    edits.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    return edits
  }

  async getRecentEdits(
    encodedProjectPath: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<RecentEditsResult> {
    const sessions = await this.getSessionsForProject(encodedProjectPath)
    const projectPath = this.decodeProjectPath(encodedProjectPath)
    const allEdits: FileEdit[] = []

    for (const session of sessions) {
      const { messages } = await this.getSessionMessages(session.id, encodedProjectPath, 0, 10000)

      for (const msg of messages) {
        // Extract edits from tool_use content
        const content = msg.content || msg.message?.content
        if (Array.isArray(content)) {
          for (const item of content) {
            if (
              item.type === 'tool_use' &&
              (item.name === 'Write' || item.name === 'Edit' || item.name === 'MultiEdit')
            ) {
              const input = item.input || {}
              const filePath = input.file_path || input.path || ''

              if (filePath && input.content !== undefined) {
                allEdits.push({
                  path: filePath,
                  oldContent: input.old_string || '',
                  newContent:
                    typeof input.content === 'string'
                      ? input.content
                      : JSON.stringify(input.content),
                  timestamp: msg.timestamp,
                  sessionId: msg.sessionId,
                  projectName: session.projectName
                })
              } else if (filePath && input.new_string !== undefined) {
                // Edit operation
                const oldContent = input.old_string || ''
                const newContent = input.new_string || ''
                allEdits.push({
                  path: filePath,
                  oldContent,
                  newContent,
                  timestamp: msg.timestamp,
                  sessionId: msg.sessionId,
                  projectName: session.projectName
                })
              } else if (item.name === 'MultiEdit' && Array.isArray(input.edits)) {
                // MultiEdit with multiple edits
                const filePath = input.file_path || input.path || ''
                if (filePath) {
                  const combinedNewContent = input.edits
                    .map((e: any) => e.new_string || '')
                    .join('\n')
                  const combinedOldContent = input.edits
                    .map((e: any) => e.old_string || '')
                    .join('\n')
                  allEdits.push({
                    path: filePath,
                    oldContent: combinedOldContent,
                    newContent: combinedNewContent,
                    timestamp: msg.timestamp,
                    sessionId: msg.sessionId,
                    projectName: session.projectName
                  })
                }
              }
            }
          }
        }

        // Also check toolUse field
        if (msg.toolUse) {
          const toolName = msg.toolUse.name
          const input = msg.toolUse.input || {}
          const filePath = input.file_path || input.path || ''

          if ((toolName === 'Write' || toolName === 'Edit') && filePath) {
            const content = input.content || input.new_string || ''
            const oldContent = input.old_string || ''
            allEdits.push({
              path: filePath,
              oldContent,
              newContent: typeof content === 'string' ? content : JSON.stringify(content),
              timestamp: msg.timestamp,
              sessionId: msg.sessionId,
              projectName: session.projectName
            })
          }
        }

        // Check toolUseResult for file edits
        if (msg.toolUseResult) {
          const result = msg.toolUseResult
          const filePath = result.filePath || result.file_path || ''

          if (filePath && (result.originalFile || result.content)) {
            const originalContent = result.originalFile || ''
            const newContent = result.content || ''

            // Apply edits if present
            if (Array.isArray(result.edits)) {
              let content = originalContent
              for (const edit of result.edits) {
                if (edit.old_string && edit.new_string !== undefined) {
                  content = content.replace(edit.old_string, edit.new_string)
                }
              }
              allEdits.push({
                path: filePath,
                oldContent: originalContent,
                newContent: content,
                timestamp: msg.timestamp,
                sessionId: msg.sessionId,
                projectName: session.projectName
              })
            } else if (result.oldString !== undefined && result.newString !== undefined) {
              const newContent = originalContent.replace(result.oldString, result.newString)
              allEdits.push({
                path: filePath,
                oldContent: originalContent,
                newContent,
                timestamp: msg.timestamp,
                sessionId: msg.sessionId,
                projectName: session.projectName
              })
            } else if (newContent) {
              allEdits.push({
                path: filePath,
                oldContent: originalContent,
                newContent,
                timestamp: msg.timestamp,
                sessionId: msg.sessionId,
                projectName: session.projectName
              })
            }
          }
        }
      }
    }

    // Filter edits to only include files within the project directory
    const filteredEdits = allEdits.filter(
      (edit) => edit.path.startsWith(projectPath) || edit.path.startsWith('/')
    )

    // Sort by timestamp descending
    filteredEdits.sort((a, b) => b.timestamp.localeCompare(a.timestamp))

    // Group by file path and keep only the latest edit for each file
    const latestByFile = new Map<string, FileEdit>()
    for (const edit of filteredEdits) {
      if (!latestByFile.has(edit.path)) {
        latestByFile.set(edit.path, edit)
      }
    }

    const uniqueEdits = Array.from(latestByFile.values())
    uniqueEdits.sort((a, b) => b.timestamp.localeCompare(a.timestamp))

    const total = uniqueEdits.length
    const paginatedEdits = uniqueEdits.slice(offset, offset + limit)

    return {
      edits: paginatedEdits,
      total_count: total,
      has_more: offset + limit < total
    }
  }

  async searchSessions(
    query: string,
    limit: number = 50
  ): Promise<
    {
      session: ClaudeSession
      matchingMessages: ClaudeMessage[]
    }[]
  > {
    const projects = await this.getProjects()
    const results: { session: ClaudeSession; matchingMessages: ClaudeMessage[] }[] = []
    const queryLower = query.toLowerCase()

    for (const project of projects) {
      const sessions = await this.getSessionsForProject(project.encodedPath)

      for (const session of sessions) {
        const { messages } = await this.getSessionMessages(session.id, project.encodedPath, 0, 1000)
        const matchingMessages: ClaudeMessage[] = []

        for (const msg of messages) {
          const content = this.getMessageContent(msg)
          if (content.toLowerCase().includes(queryLower)) {
            matchingMessages.push(msg)
          }
        }

        if (matchingMessages.length > 0) {
          results.push({ session, matchingMessages })
        }

        if (results.length >= limit) {
          return results
        }
      }
    }

    return results
  }

  private getMessageContent(msg: ClaudeMessage): string {
    const content = msg.content || msg.message?.content
    if (!content) return ''

    if (typeof content === 'string') return content

    if (Array.isArray(content)) {
      return content
        .map((c) => {
          if (typeof c === 'string') return c
          if (c.type === 'text') return c.text || ''
          if (c.type === 'thinking') return c.thinking || ''
          if (c.type === 'tool_use') return `${c.name}: ${JSON.stringify(c.input)}`
          if (c.type === 'tool_result') return c.content || ''
          return ''
        })
        .join(' ')
    }

    return ''
  }

  startWatching(): void {
    if (this.watcher) this.watcher.close()
    if (!existsSync(this.projectsPath)) return

    this.watcher = chokidar.watch(this.projectsPath, {
      persistent: true,
      ignoreInitial: true,
      depth: 2,
      awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 }
    })

    this.watcher
      .on('add', (path) => this.notifyChange('add', path))
      .on('change', (path) => this.notifyChange('change', path))
      .on('unlink', (path) => this.notifyChange('unlink', path))
      .on('error', (error) => console.error('ClaudeHistory watcher error:', error))

    console.log('[ClaudeHistory] Started watching:', this.projectsPath)
  }

  stopWatching(): void {
    if (this.watcher) {
      this.watcher.close()
      this.watcher = null
    }
  }

  private notifyChange(event: string, path: string): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('claude-history:changed', {
        event,
        path,
        timestamp: Date.now()
      })
    }
  }

  // ============================================================================
  // Deleted Sessions Management (Marked Deletion)
  // ============================================================================

  private getDeletedSessionsConfigPath(): string {
    const homeDir = app.getPath('home') || process.env.HOME || process.env.USERPROFILE || ''
    const globalConfigDir = join(homeDir, '.neuro-ide-global')
    if (!existsSync(globalConfigDir)) {
      fs.mkdir(globalConfigDir, { recursive: true }).catch(() => {})
    }
    return join(globalConfigDir, 'deleted-sessions.json')
  }

  async getDeletedSessions(): Promise<Record<string, string[]>> {
    const configPath = this.getDeletedSessionsConfigPath()
    if (!existsSync(configPath)) {
      return {}
    }
    try {
      const content = await fs.readFile(configPath, 'utf-8')
      return JSON.parse(content)
    } catch {
      return {}
    }
  }

  private async saveDeletedSessions(deletedSessions: Record<string, string[]>): Promise<void> {
    const configPath = this.getDeletedSessionsConfigPath()
    await fs.writeFile(configPath, JSON.stringify(deletedSessions, null, 2), 'utf-8')
  }

  async markSessionDeleted(encodedProjectPath: string, sessionId: string): Promise<void> {
    const deletedSessions = await this.getDeletedSessions()
    if (!deletedSessions[encodedProjectPath]) {
      deletedSessions[encodedProjectPath] = []
    }
    if (!deletedSessions[encodedProjectPath].includes(sessionId)) {
      deletedSessions[encodedProjectPath].push(sessionId)
      await this.saveDeletedSessions(deletedSessions)
    }
  }

  async restoreSession(encodedProjectPath: string, sessionId: string): Promise<void> {
    const deletedSessions = await this.getDeletedSessions()
    if (deletedSessions[encodedProjectPath]) {
      const index = deletedSessions[encodedProjectPath].indexOf(sessionId)
      if (index > -1) {
        deletedSessions[encodedProjectPath].splice(index, 1)
        if (deletedSessions[encodedProjectPath].length === 0) {
          delete deletedSessions[encodedProjectPath]
        }
        await this.saveDeletedSessions(deletedSessions)
      }
    }
  }

  async getDeletedSessionsForProject(encodedProjectPath: string): Promise<string[]> {
    const deletedSessions = await this.getDeletedSessions()
    return deletedSessions[encodedProjectPath] || []
  }

  async clearDeletedSessionsForProject(encodedProjectPath: string): Promise<void> {
    const deletedSessions = await this.getDeletedSessions()
    if (deletedSessions[encodedProjectPath]) {
      delete deletedSessions[encodedProjectPath]
      await this.saveDeletedSessions(deletedSessions)
    }
  }
}

export const claudeHistoryService = new ClaudeHistoryService()
