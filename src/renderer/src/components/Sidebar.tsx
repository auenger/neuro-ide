import { useState, useEffect, useRef, useMemo } from 'react'
import { useAppStore } from '../store/appStore'
import StarredFiles from './StarredFiles'
import ChangedFiles from './ChangedFiles'
import ConfigManager from './ConfigManager'
import { getIcon as getRoleIcon } from '../utils/icons'
import { getIcon } from 'material-file-icons'
import Toast from './Toast'
import './Sidebar.css'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface FileTreeNode {
    name: string
    path: string
    isDirectory: boolean
    children?: FileTreeNode[]
    isExpanded?: boolean
}

interface ConversationSlidePanelProps {
    session: ClaudeSession | null
    onClose: () => void
}

// ============================================================================
// Content Item Type (from env.d.ts)
// ============================================================================

interface ContentItem {
    type: string
    text?: string
    thinking?: string
    name?: string
    input?: Record<string, any>
    id?: string
    tool_use_id?: string
    content?: string | any[]
    is_error?: boolean
    server_name?: string
    tool_name?: string
    stdout?: string
    stderr?: string
    exit_code?: number
}

// ============================================================================
// SVG Icon Components
// ============================================================================

const ConversationIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16px" height="16px">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
)

const RefreshIcon = () => (
    <svg viewBox="0 0 16 16" fill="currentColor" width="14px" height="14px">
        <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
        <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
    </svg>
)

const CheckIcon = () => (
    <svg viewBox="0 0 16 16" fill="currentColor" width="14px" height="14px">
        <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
    </svg>
)

const WarningIcon = () => (
    <svg viewBox="0 0 16 16" fill="currentColor" width="14px" height="14px">
        <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
    </svg>
)

const CloseIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16px" height="16px">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
)

const ResizeIcon = () => (
    <svg viewBox="0 0 16 16" fill="currentColor" width="12px" height="12px">
        <path fillRule="evenodd" d="M2.5 13.5A.5.5 0 0 1 3 13h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zM2 2h12v12H2V2z"/>
    </svg>
)

// Robot Icon
const RobotIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect x="5" y="3" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 3V1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="12" cy="1" r="0.75" fill="currentColor" />
        <circle cx="9" cy="9" r="1.5" fill="currentColor" />
        <circle cx="15" cy="9" r="1.5" fill="currentColor" />
        <rect x="9" y="13" width="6" height="1.5" rx="0.75" fill="currentColor" />
        <rect x="7" y="17" width="10" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="3" y="18" width="4" height="2" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="17" y="18" width="4" height="2" rx="1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
)

// Tool Icons
const ReadIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
)

const WriteIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
)

const EditIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
)

const BashIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6 8l4 4-4 4M10 16h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
)

const GlobIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
        <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
)

const GrepIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M21 21l-4.35-4.35M14 10a4 4 0 1 1-8 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M4 6h16M4 12h16M4 18h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
)

const TaskIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M9 9h6M9 12h6M9 15h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
)

const SuccessIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
)

const ErrorIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
        <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
)

const PendingIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25"/>
        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
        </path>
    </svg>
)

// 思考过程图标 - 灯泡风格
const ThinkingIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 21h6M10 17v4M14 17v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)

// Analytics Icon - 仪表板风格
const AnalyticsIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
)

// Token Icon - 令牌风格
const TokenIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
)

// ============================================================================
// Utility Functions (从 ClaudeHistory.tsx 复制)
// ============================================================================

const formatTime = (timestamp: string | null | undefined): string => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return '刚刚'
    if (diffMins < 60) return `${diffMins} 分钟前`
    if (diffHours < 24) return `${diffHours} 小时前`
    if (diffDays < 7) return `${diffDays} 天前`

    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

const getLanguageFromPath = (filePath: string): string => {
    const ext = filePath.split('.').pop()?.toLowerCase() || ''
    const langMap: Record<string, string> = {
        ts: 'typescript',
        tsx: 'typescript',
        js: 'javascript',
        jsx: 'javascript',
        py: 'python',
        rs: 'rust',
        go: 'go',
        java: 'java',
        cpp: 'cpp',
        c: 'c',
        json: 'json',
        md: 'markdown',
        css: 'css',
        scss: 'scss',
        html: 'html',
        yaml: 'yaml',
        yml: 'yaml',
        sh: 'bash',
        sql: 'sql',
    }
    return langMap[ext] || 'text'
}

// Format large numbers with K, M suffixes
const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
}

// Calculate session metrics
const calculateSessionMetrics = (stats: SessionTokenStats | null) => {
    if (!stats) return null
    const avgTokensPerMessage = stats.message_count > 0
        ? Math.round(stats.total_tokens / stats.message_count)
        : 0
    const durationMs = stats.last_message_time && stats.first_message_time
        ? new Date(stats.last_message_time).getTime() - new Date(stats.first_message_time).getTime()
        : 0
    const durationMinutes = Math.round(durationMs / (1000 * 60))
    return {
        avgTokensPerMessage,
        durationMs,
        durationMinutes,
        distribution: {
            input: stats.total_input_tokens,
            output: stats.total_output_tokens,
            cache_creation: stats.total_cache_creation_tokens,
            cache_read: stats.total_cache_read_tokens
        }
    }
}

const formatDateTime = (timestamp: string | null | undefined): string => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()

    const timeStr = date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    })

    if (isToday) {
        return timeStr
    }

    const dateStr = date.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric'
    })

    return `${dateStr} ${timeStr}`
}

const MarkdownRenderer = ({ content }: { content: string }) => {
    return (
        <div className="ch-markdown-content">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    code({ className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || '')
                        const isInline = !match
                        return !isInline ? (
                            <SyntaxHighlighter
                                style={vscDarkPlus}
                                language={match[1]}
                                PreTag="div"
                                {...props}
                            >
                                {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                        ) : (
                            <code className={className} {...props}>
                                {children}
                            </code>
                        )
                    }
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    )
}

const isUserConfirmationOnly = (content: any): boolean => {
    if (!content) return false

    if (typeof content === 'string') {
        const cleaned = content.trim().toLowerCase()
        const confirmations = ['yes', 'y', 'ok', 'okay', '好的', '继续', '确认', '是的', '对', '可以', '没问题']
        return confirmations.includes(cleaned)
    }

    if (Array.isArray(content)) {
        const hasOnlyToolResults = content.every(item => !item || item.type === 'tool_result' || !item.type)
        if (hasOnlyToolResults) {
            const toolResults = content.filter(item => item?.type === 'tool_result')
            if (toolResults.length > 0) {
                const hasError = toolResults.some(item => item.is_error)
                if (hasError) return false
                return toolResults.every(item => {
                    if (!item.content) return true
                    const contentStr = typeof item.content === 'string' ? item.content.trim() : JSON.stringify(item.content).trim()
                    return contentStr.length < 10 || contentStr.toLowerCase() === 'success' || contentStr.toLowerCase() === 'ok' || contentStr.toLowerCase() === 'done'
                })
            }
        }
    }

    return false
}

const getToolIcon = (name: string) => {
    const iconClass = "ch-tool-svg-icon"
    switch (name) {
        case 'Read': return <ReadIcon className={iconClass} />
        case 'Write': return <WriteIcon className={iconClass} />
        case 'Edit': return <EditIcon className={iconClass} />
        case 'Bash': return <BashIcon className={iconClass} />
        case 'Glob': return <GlobIcon className={iconClass} />
        case 'Grep': return <GrepIcon className={iconClass} />
        case 'Task': return <TaskIcon className={iconClass} />
        default: return (
            <svg className={iconClass} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
        )
    }
}

// ============================================================================
// Renderers (从 ClaudeHistory.tsx 复制)
// ============================================================================

const ThinkingRenderer = ({ content }: { content: ContentItem }) => {
    const [expanded, setExpanded] = useState(false)
    const thinkingText = content.thinking || ''
    const lineCount = thinkingText.split('\n').length

    return (
        <div className="ch-thinking-block">
            <div className="ch-thinking-header" onClick={() => setExpanded(!expanded)}>
                <ThinkingIcon className="ch-thinking-svg-icon" />
                <span className="ch-thinking-title">思考过程</span>
                <span className="ch-thinking-meta">{lineCount} 行</span>
                <svg className={`ch-tool-chevron ${expanded ? 'expanded' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </div>
            {expanded ? (
                <div className="ch-thinking-content">
                    <MarkdownRenderer content={thinkingText} />
                </div>
            ) : (
                <div className="ch-thinking-preview">
                    {thinkingText.slice(0, 300)}{thinkingText.length > 300 ? '...' : ''}
                </div>
            )}
        </div>
    )
}

const normalizeToolExecutionEntries = (contents: ContentItem[]) => {
    const entries: any[] = []
    const pendingByToolId = new Map<string, number>()

    for (let index = 0; index < contents.length; index += 1) {
        const item = contents[index]
        if (!item || typeof item !== 'object') {
            entries.push({ kind: 'item', key: `item-${index}`, item, index })
            continue
        }
        if (item.type === 'tool_use' && item.id) {
            entries.push({ kind: 'toolExecution', key: `tool-${index}`, toolUse: item, toolResults: [] })
            pendingByToolId.set(item.id, entries.length - 1)
            continue
        }
        if (item.tool_use_id) {
            const targetEntryIndex = pendingByToolId.get(item.tool_use_id)
            if (targetEntryIndex !== undefined) {
                const targetEntry = entries[targetEntryIndex]
                if (targetEntry?.kind === 'toolExecution') {
                    targetEntry.toolResults.push(item)
                    continue
                }
            }
        }
        entries.push({ kind: 'item', key: `item-${index}`, item, index })
    }
    return entries
}

const UnifiedToolExecutionRenderer = ({ toolUse, toolResults }: { toolUse: ContentItem; toolResults: ContentItem[] }) => {
    const [expanded, setExpanded] = useState(false)
    const toolName = toolUse.name || ''
    const toolInput = toolUse.input || {}
    const hasResult = toolResults.length > 0
    const hasError = hasResult && toolResults.some(r => r.is_error)
    const isPending = !hasResult

    const getPrimaryPreview = () => {
        if (typeof toolInput.command === 'string') return toolInput.command
        if (typeof toolInput.file_path === 'string') return toolInput.file_path
        if (typeof toolInput.path === 'string') return toolInput.path
        if (typeof toolInput.pattern === 'string') return toolInput.pattern
        if (typeof toolInput.query === 'string') return toolInput.query
        return ''
    }

    const primaryPreview = getPrimaryPreview()

    return (
        <div className={`ch-tool-use ${toolName === 'Bash' ? 'bash-command' : ''}`}>
            <div className="ch-tool-header" onClick={() => setExpanded(!expanded)}>
                <span className="ch-tool-icon">{getToolIcon(toolName)}</span>
                <span className="ch-tool-name">{toolName || 'Tool'}</span>
                {primaryPreview && !expanded && (
                    <span className="ch-tool-preview">{primaryPreview}</span>
                )}
                {hasError ? (
                    <span className="ch-tool-status error"><ErrorIcon className="ch-status-icon" /></span>
                ) : isPending ? (
                    <span className="ch-tool-status" style={{ color: 'var(--ch-warning)' }}><PendingIcon className="ch-status-icon" /></span>
                ) : (
                    <span className="ch-tool-status success"><SuccessIcon className="ch-status-icon" /></span>
                )}
                <svg className={`ch-tool-chevron ${expanded ? 'expanded' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </div>
            {expanded && (
                <>
                    <div className="ch-tool-input">
                        <div className="ch-tool-section-label">参数</div>
                        {toolName === 'Bash' && toolInput.command ? (
                            <div className="ch-bash-command">
                                <span className="ch-bash-prompt">$</span>
                                <code>{toolInput.command}</code>
                            </div>
                        ) : (
                            <pre>{JSON.stringify(toolInput, null, 2)}</pre>
                        )}
                    </div>
                    {toolResults.length > 0 ? (
                        <div className="ch-tool-results-container">
                            <div className="ch-tool-results-header">
                                <span>工具执行结果 ({toolResults.length})</span>
                            </div>
                            <div className="ch-tool-results-list">
                                {toolResults.map((result, idx) => {
                                    const resultContent = result.content
                                    const isError = result.is_error
                                    return (
                                        <div key={idx} className={`ch-tool-result ${isError ? 'error' : 'success'}`}>
                                            <div className="ch-tool-result-header">
                                                <span className="ch-tool-result-icon">{isError ? <ErrorIcon className="ch-result-icon" /> : <SuccessIcon className="ch-result-icon" />}</span>
                                                <span className="ch-tool-result-label">结果 #{idx + 1} {isError ? '(错误)' : '(完成)'}</span>
                                            </div>
                                            <div className="ch-tool-result-content">
                                                {typeof resultContent === 'string' ? (
                                                    <MarkdownRenderer content={resultContent.slice(0, 5000) + (resultContent.length > 5000 ? '\n\n...(内容已截断)' : '')} />
                                                ) : resultContent != null ? (
                                                    <pre>{JSON.stringify(resultContent, null, 2).slice(0, 5000)}</pre>
                                                ) : (
                                                    <span className="ch-empty-result">无返回内容</span>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="ch-tool-pending">等待执行结果...</div>
                    )}
                </>
            )}
        </div>
    )
}

const ContentArrayRenderer = ({ contents }: { contents: ContentItem[] }) => {
    const normalizedContent = useMemo(() => normalizeToolExecutionEntries(contents), [contents])

    return (
        <div className="ch-content-array">
            {normalizedContent.map((entry) => {
                if (entry.kind === 'toolExecution') {
                    return <UnifiedToolExecutionRenderer key={entry.key} toolUse={entry.toolUse} toolResults={entry.toolResults} />
                }
                const { item, index } = entry
                if (!item || typeof item !== 'object') return null
                switch (item.type) {
                    case 'text': return <MarkdownRenderer key={index} content={item.text || ''} />
                    case 'thinking': return <ThinkingRenderer key={index} content={item} />
                    case 'tool_result': return null
                    default: return null
                }
            })}
        </div>
    )
}

const associateToolResultsAcrossMessages = (messages: any[]) => {
    // 为没有 uuid 的消息生成临时 uuid
    const messagesWithUuid = messages.map((msg, idx) => ({
        ...msg,
        uuid: msg.uuid || `temp-uuid-${idx}`
    }))

    const pendingToolUses = new Map<string, string>()
    const messagesToRemove = new Set<string>()
    const toolResultsToAdd = new Map<string, ContentItem[]>()

    for (const message of messagesWithUuid) {
        const content = message.content || message.message?.content
        if (!content || !Array.isArray(content)) continue

        const modifiedItems: ContentItem[] = []
        let hasNonToolResultContent = false

        for (const item of content) {
            if (!item || typeof item !== 'object') {
                hasNonToolResultContent = true
                modifiedItems.push(item)
                continue
            }
            if (item.type === 'tool_use' && item.id) {
                pendingToolUses.set(item.id, message.uuid)
                hasNonToolResultContent = true
                modifiedItems.push(item)
                continue
            }
            if (item.type === 'tool_result' && item.tool_use_id) {
                const targetMessageUuid = pendingToolUses.get(item.tool_use_id)
                if (targetMessageUuid) {
                    const existingResults = toolResultsToAdd.get(targetMessageUuid) || []
                    existingResults.push({ type: 'tool_result', tool_use_id: item.tool_use_id, content: item.content, is_error: item.is_error })
                    toolResultsToAdd.set(targetMessageUuid, existingResults)
                    continue
                }
            }
            hasNonToolResultContent = true
            modifiedItems.push(item)
        }

        if (message.type === 'user' && !hasNonToolResultContent) {
            messagesToRemove.add(message.uuid)
        }
    }

    return messagesWithUuid
        .filter(msg => !messagesToRemove.has(msg.uuid))
        .map(msg => {
            const additionalResults = toolResultsToAdd.get(msg.uuid)
            if (additionalResults && additionalResults.length > 0) {
                const originalContent = msg.content || msg.message?.content
                if (Array.isArray(originalContent)) {
                    const newContent = [...originalContent, ...additionalResults]
                    if (msg.content) return { ...msg, content: newContent }
                    if (msg.message?.content) return { ...msg, message: { ...msg.message, content: newContent } }
                }
            }
            return msg
        })
}

const MessageRenderer = ({ message }: { message: any }) => {
    const role = message.message?.role || message.type
    const content = message.content || message.message?.content
    const isUser = role === 'user'

    const isUserConfirmation = useMemo(() => { if (!isUser) return false; return isUserConfirmationOnly(content) }, [isUser, content])

    const hasContent = useMemo(() => {
        if (!content) return false
        if (typeof content === 'string') return content.trim().length > 0
        if (Array.isArray(content)) {
            const nonToolResultItems = content.filter((item: any) => { if (!item) return false; if (item.type === 'tool_result') return false; return true })
            if (nonToolResultItems.length === 0) return false
            const nonEmptyItems = nonToolResultItems.filter((item: any) => { if (item.text?.trim()) return true; if (item.thinking?.trim()) return true; if (item.type === 'tool_use') return true; return false })
            return nonEmptyItems.length > 0
        }
        return false
    }, [content])

    const isSimpleText = useMemo(() => {
        if (!content) return false
        if (typeof content === 'string') return true
        if (Array.isArray(content)) return content.every((item: any) => !item || item.type === 'text' || !item.type)
        return false
    }, [content])

    if (!hasContent) return null
    if (isUserConfirmation) return null

    if (isSimpleText) {
        return (
            <div className={`ch-bubble-message ${isUser ? 'user' : 'assistant'}`}>
                <div className="ch-bubble-content">
                    {typeof content === 'string' ? (
                        <MarkdownRenderer content={content} />
                    ) : Array.isArray(content) ? (
                        <>
                            {content.map((item: any, idx: number) => item.text ? <MarkdownRenderer key={idx} content={item.text} /> : null)}
                        </>
                    ) : null}
                </div>
                <div className="ch-bubble-time">{formatDateTime(message.timestamp)}</div>
            </div>
        )
    }

    return (
        <div className={`ch-complex-message ${isUser ? 'user' : 'assistant'}`}>
            <div className="ch-message-row">
                <div className="ch-message-role-badge">
                    {isUser ? '👤' : <RobotIcon className="ch-robot-icon" />}
                </div>
                <div className="ch-message-body">
                    <div className="ch-message-content">
                        {typeof content === 'string' ? (
                            <MarkdownRenderer content={content} />
                        ) : Array.isArray(content) ? (
                            <ContentArrayRenderer contents={content} />
                        ) : null}
                    </div>
                </div>
                <div className="ch-message-time">{formatDateTime(message.timestamp)}</div>
            </div>
        </div>
    )
}

// ============================================================================
// File Edit Item Component (从 ClaudeHistory.tsx 复制)
// ============================================================================

interface FileEdit {
    path: string
    oldContent: string
    newContent: string
    timestamp: string
    sessionId: string
    projectName: string
}

// ============================================================================
// Session Stats Types (from backend)
// ============================================================================

interface ToolUsageStats {
    tool_name: string
    usage_count: number
    success_rate: number
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
    most_used_tools: ToolUsageStats[]
}

// ============================================================================
// Conversation Item Component - with inline delete confirmation
// ============================================================================

interface ConversationItemProps {
    session: ClaudeSession
    onSelect: (session: ClaudeSession) => void
    onDelete: (sessionId: string) => Promise<void>
}

const ConversationItem = ({ session, onSelect, onDelete }: ConversationItemProps) => {
    const [isDeleting, setIsDeleting] = useState(false)
    const [confirmTimer, setConfirmTimer] = useState<NodeJS.Timeout | null>(null)

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (isDeleting) {
            // Second click - confirm delete
            if (confirmTimer) {
                clearTimeout(confirmTimer)
                setConfirmTimer(null)
            }
            setIsDeleting(false)
            onDelete(session.id)
        } else {
            // First click - enter confirm state
            setIsDeleting(true)
            // Auto-cancel after 3 seconds
            const timer = setTimeout(() => {
                setIsDeleting(false)
                setConfirmTimer(null)
            }, 3000)
            setConfirmTimer(timer)
        }
    }

    const handleCancelDelete = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (confirmTimer) {
            clearTimeout(confirmTimer)
            setConfirmTimer(null)
        }
        setIsDeleting(false)
    }

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (confirmTimer) {
                clearTimeout(confirmTimer)
            }
        }
    }, [confirmTimer])

    return (
        <div
            className={`ch-conversation-item ${isDeleting ? 'deleting' : ''}`}
            title={!isDeleting ? session.preview || 'No preview' : undefined}
        >
            <div
                className="ch-conversation-content"
                onClick={() => !isDeleting && onSelect(session)}
            >
                <div className="ch-conversation-preview">
                    {session.preview || 'Empty conversation'}
                </div>
                <div className="ch-conversation-meta">
                    <span className="ch-message-count">
                        {session.messageCount} msgs
                    </span>
                    <span className="ch-time-ago">
                        {session.lastMessageTime
                            ? new Date(session.lastMessageTime).toLocaleDateString()
                            : 'No date'}
                    </span>
                </div>
            </div>
            {isDeleting ? (
                <div className="ch-delete-confirm">
                    <button
                        className="ch-confirm-yes"
                        onClick={handleDeleteClick}
                        title="确认删除"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14px" height="14px">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    </button>
                    <button
                        className="ch-confirm-no"
                        onClick={handleCancelDelete}
                        title="取消"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14px" height="14px">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
            ) : (
                <button
                    className="ch-conversation-delete-btn"
                    onClick={handleDeleteClick}
                    title="删除后可在配置管理中恢复"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14px" height="14px">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                </button>
            )}
        </div>
    )
}

const FileEditItem = ({ edit }: { edit: FileEdit }) => {
    const [expanded, setExpanded] = useState(false)
    const [copied, setCopied] = useState(false)

    const fileName = edit.path.split('/').pop() || edit.path
    const lines = edit.newContent.split('\n')
    const linesAdded = edit.newContent.split('\n').length
    const linesRemoved = edit.oldContent ? edit.oldContent.split('\n').length : 0
    const isNewFile = !edit.oldContent || edit.oldContent.length === 0

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(edit.newContent)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy:', err)
        }
    }

    return (
        <div className="ch-edit-item">
            {/* Header */}
            <div className="ch-edit-header" onClick={() => setExpanded(!expanded)}>
                <div className="ch-edit-icon">
                    {isNewFile ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="12" y1="18" x2="12" y2="12" />
                            <line x1="9" y1="15" x2="15" y2="15" />
                        </svg>
                    ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                    )}
                </div>

                <div className="ch-edit-info">
                    <div className="ch-edit-filename">{fileName}</div>
                    <div className="ch-edit-path">{edit.path}</div>
                </div>

                <div className="ch-edit-stats">
                    {linesAdded > 0 && (
                        <span className="ch-stat-added">+{linesAdded}</span>
                    )}
                    {linesRemoved > 0 && !isNewFile && (
                        <span className="ch-stat-removed">-{linesRemoved}</span>
                    )}
                </div>

                <span className={`ch-edit-type ${isNewFile ? 'create' : 'edit'}`}>
                    {isNewFile ? '新建' : '编辑'}
                </span>

                <span className="ch-edit-time">{formatTime(edit.timestamp)}</span>

                <button
                    className="ch-edit-copy"
                    onClick={(e) => {
                        e.stopPropagation()
                        handleCopy()
                    }}
                    title="复制内容"
                >
                    {copied ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                    )}
                </button>

                <svg
                    className={`ch-edit-chevron ${expanded ? 'expanded' : ''}`}
                    width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                >
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </div>

            {/* Expanded Content */}
            {expanded && (
                <div className="ch-edit-content">
                    <div className="ch-code-preview">
                        <pre>
                            <code>
                                {edit.newContent.split('\n').map((line, i) => (
                                    <div key={i} className="ch-code-line">
                                        <span className="ch-line-number">{i + 1}</span>
                                        <span className="ch-line-content">{line}</span>
                                    </div>
                                ))}
                            </code>
                        </pre>
                    </div>
                    <div className="ch-edit-footer">
                        <span>{lines.length} 行</span>
                        <span>{getLanguageFromPath(edit.path)}</span>
                    </div>
                </div>
            )}
        </div>
    )
}

// ============================================================================
// Conversation Slide Panel Component - 可拖动侧滑面板
// ============================================================================

// Token Distribution Chart Component
const TokenDistributionChart = ({ distribution, total }: { distribution: { input: number; output: number; cache_creation: number; cache_read: number }; total: number }) => {
    const items = [
        { label: '输入', value: distribution.input, color: '#10b981' },
        { label: '输出', value: distribution.output, color: '#8b5cf6' },
        { label: '缓存创建', value: distribution.cache_creation, color: '#3b82f6' },
        { label: '缓存读取', value: distribution.cache_read, color: '#f59e0b' },
    ]

    const safeTotal = Math.max(total, 1)

    // Calculate SVG arc paths for donut chart
    const arcs = useMemo(() => {
        const sorted = [...items].filter(i => i.value > 0).sort((a, b) => b.value - a.value)
        const radius = 80
        const cx = 100
        const cy = 100
        let startAngle = -90

        return sorted.map((item) => {
            const percentage = item.value / safeTotal
            const angle = percentage * 360
            const endAngle = startAngle + angle

            const startRad = (startAngle * Math.PI) / 180
            const endRad = (endAngle * Math.PI) / 180
            const x1 = cx + radius * Math.cos(startRad)
            const y1 = cy + radius * Math.sin(startRad)
            const x2 = cx + radius * Math.cos(endRad)
            const y2 = cy + radius * Math.sin(endRad)
            const largeArc = angle > 180 ? 1 : 0

            const path = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`
            startAngle = endAngle

            return { ...item, path, percentage }
        })
    }, [items, safeTotal])

    const sortedItems = useMemo(() => {
        return [...items].filter(i => i.value > 0).sort((a, b) => b.value - a.value)
    }, [items])

    return (
        <div className="ch-token-chart">
            {/* Donut Chart */}
            <div className="ch-donut-container">
                <svg viewBox="0 0 200 200" className="ch-donut-svg">
                    {/* Background ring */}
                    <circle
                        cx="100"
                        cy="100"
                        r="80"
                        fill="none"
                        stroke="var(--cc-border-secondary)"
                        strokeWidth="20"
                        opacity="0.3"
                    />
                    {/* Data arcs */}
                    {arcs.map((arc, idx) => (
                        <path
                            key={idx}
                            d={arc.path}
                            fill="none"
                            stroke={arc.color}
                            strokeWidth="20"
                            strokeLinecap="butt"
                            className="ch-arc-path"
                        />
                    ))}
                </svg>
                {/* Center content */}
                <div className="ch-donut-center">
                    <div className="ch-donut-total">{formatNumber(total)}</div>
                    <div className="ch-donut-label">Token</div>
                </div>
            </div>

            {/* Legend */}
            <div className="ch-token-legend">
                {sortedItems.map((item, idx) => {
                    const percentage = (item.value / safeTotal) * 100
                    return (
                        <div key={idx} className="ch-legend-item">
                            <div className="ch-legend-icon" style={{ background: item.color }} />
                            <div className="ch-legend-info">
                                <div className="ch-legend-label">
                                    <span>{item.label}</span>
                                    <span className="ch-legend-percent">{percentage.toFixed(1)}%</span>
                                </div>
                                <div className="ch-legend-bar">
                                    <div
                                        className="ch-legend-bar-fill"
                                        style={{ width: `${percentage}%`, background: item.color }}
                                    />
                                </div>
                            </div>
                            <div className="ch-legend-value" style={{ color: item.color }}>
                                {formatNumber(item.value)}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// Analytics View Component
const AnalyticsView = ({ stats, metrics }: { stats: SessionTokenStats | null; metrics: ReturnType<typeof calculateSessionMetrics> }) => {
    if (!stats || !metrics) {
        return (
            <div className="ch-analytics-empty">
                <div className="ch-empty-icon">📊</div>
                <div>暂无分析数据</div>
            </div>
        )
    }

    return (
        <div className="ch-analytics-view">
            {/* Metrics Grid */}
            <div className="ch-metrics-grid">
                <div className="ch-metric-card">
                    <div className="ch-metric-icon green">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                        </svg>
                    </div>
                    <div className="ch-metric-value">{formatNumber(stats.total_tokens)}</div>
                    <div className="ch-metric-label">总 Token</div>
                </div>

                <div className="ch-metric-card">
                    <div className="ch-metric-icon purple">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                    </div>
                    <div className="ch-metric-value">{stats.message_count}</div>
                    <div className="ch-metric-label">消息数</div>
                </div>

                <div className="ch-metric-card">
                    <div className="ch-metric-icon blue">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                    </div>
                    <div className="ch-metric-value">{metrics.durationMinutes}<span className="ch-metric-unit">m</span></div>
                    <div className="ch-metric-label">持续时间</div>
                </div>

                <div className="ch-metric-card">
                    <div className="ch-metric-icon amber">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                        </svg>
                    </div>
                    <div className="ch-metric-value">{formatNumber(metrics.avgTokensPerMessage)}</div>
                    <div className="ch-metric-label">平均/消息</div>
                </div>
            </div>

            {/* Session Timeline */}
            <div className="ch-section-card">
                <div className="ch-section-header">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ch-section-icon">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>时间线</span>
                </div>
                <div className="ch-timeline">
                    <div className="ch-timeline-start">
                        <div className="ch-timeline-dot green" />
                        <div className="ch-timeline-label">开始</div>
                        <div className="ch-timeline-time">
                            {stats.first_message_time ? new Date(stats.first_message_time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </div>
                    </div>
                    <div className="ch-timeline-line">
                        <div className="ch-timeline-duration">{metrics.durationMinutes} 分钟</div>
                    </div>
                    <div className="ch-timeline-end">
                        <div className="ch-timeline-dot amber" />
                        <div className="ch-timeline-label">结束</div>
                        <div className="ch-timeline-time">
                            {stats.last_message_time ? new Date(stats.last_message_time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tool Usage */}
            {stats.most_used_tools.length > 0 && (
                <div className="ch-section-card">
                    <div className="ch-section-header">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ch-section-icon">
                            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                        </svg>
                        <span>工具使用</span>
                        <span className="ch-tool-total">{stats.most_used_tools.reduce((sum, t) => sum + t.usage_count, 0)} 次</span>
                    </div>
                    <div className="ch-tool-usage-list">
                        {(() => {
                            const maxCount = Math.max(...stats.most_used_tools.map(t => t.usage_count), 1)
                            return stats.most_used_tools.slice(0, 6).map((tool, idx) => {
                                const percentage = (tool.usage_count / maxCount) * 100
                                return (
                                    <div key={idx} className="ch-tool-usage-item">
                                        <div className="ch-tool-info">
                                            <div className="ch-tool-rank">{idx + 1}</div>
                                            <div className="ch-tool-name">{tool.tool_name}</div>
                                            <div className="ch-tool-count">{tool.usage_count}</div>
                                        </div>
                                        <div className="ch-tool-bar-container">
                                            <div
                                                className="ch-tool-bar-fill"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                )
                            })
                        })()}
                    </div>
                </div>
            )}
        </div>
    )
}

// Token Stats View Component
const TokenStatsView = ({ stats, metrics }: { stats: SessionTokenStats | null; metrics: ReturnType<typeof calculateSessionMetrics> }) => {
    if (!stats || !metrics) {
        return (
            <div className="ch-analytics-empty">
                <div className="ch-empty-icon">🪙</div>
                <div>暂无 Token 统计</div>
            </div>
        )
    }

    return (
        <div className="ch-token-stats-view">
            {/* Token Distribution Chart */}
            <div className="ch-section-card">
                <div className="ch-section-header">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ch-section-icon">
                        <circle cx="12" cy="12" r="9" />
                        <circle cx="12" cy="12" r="5" />
                        <circle cx="12" cy="12" r="1" />
                    </svg>
                    <span>Token 分布</span>
                </div>
                <TokenDistributionChart distribution={metrics.distribution} total={stats.total_tokens} />
            </div>

            {/* Token Details */}
            <div className="ch-section-card">
                <div className="ch-section-header">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ch-section-icon">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    <span>详细统计</span>
                </div>
                <div className="ch-token-details">
                    <div className="ch-detail-row">
                        <span className="ch-detail-label">输入 Token</span>
                        <span className="ch-detail-value green">{formatNumber(stats.total_input_tokens)}</span>
                    </div>
                    <div className="ch-detail-row">
                        <span className="ch-detail-label">输出 Token</span>
                        <span className="ch-detail-value purple">{formatNumber(stats.total_output_tokens)}</span>
                    </div>
                    <div className="ch-detail-row">
                        <span className="ch-detail-label">缓存创建</span>
                        <span className="ch-detail-value blue">{formatNumber(stats.total_cache_creation_tokens)}</span>
                    </div>
                    <div className="ch-detail-row">
                        <span className="ch-detail-label">缓存读取</span>
                        <span className="ch-detail-value amber">{formatNumber(stats.total_cache_read_tokens)}</span>
                    </div>
                    <div className="ch-detail-divider" />
                    <div className="ch-detail-row total">
                        <span className="ch-detail-label">总计</span>
                        <span className="ch-detail-value">{formatNumber(stats.total_tokens)}</span>
                    </div>
                </div>
            </div>

            {/* Session Info */}
            <div className="ch-section-card">
                <div className="ch-section-header">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ch-section-icon">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <span>会话信息</span>
                </div>
                <div className="ch-session-info">
                    <div className="ch-info-row">
                        <span className="ch-info-label">项目</span>
                        <span className="ch-info-value">{stats.project_name}</span>
                    </div>
                    <div className="ch-info-row">
                        <span className="ch-info-label">消息数</span>
                        <span className="ch-info-value">{stats.message_count}</span>
                    </div>
                    <div className="ch-info-row">
                        <span className="ch-info-label">平均/消息</span>
                        <span className="ch-info-value">{formatNumber(metrics.avgTokensPerMessage)} tokens</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

const ConversationSlidePanel = ({ session, onClose }: ConversationSlidePanelProps) => {
    const [messages, setMessages] = useState<any[]>([])
    const [edits, setEdits] = useState<FileEdit[]>([])
    const [stats, setStats] = useState<SessionTokenStats | null>(null)
    const [loading, setLoading] = useState(false)
    const [editsLoading, setEditsLoading] = useState(false)
    const [statsLoading, setStatsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [viewMode, setViewMode] = useState<'messages' | 'edits' | 'analytics' | 'tokens'>('messages')
    const panelRef = useRef<HTMLDivElement>(null)
    const [panelWidth, setPanelWidth] = useState(500)
    const isResizingRef = useRef(false)

    // 获取 encodedPath
    const getEncodedPath = () => {
        if (!session) return null
        let encodedPath = session.encodedProjectPath
        if (!encodedPath && session.filePath) {
            const match = session.filePath.match(/\/projects\/([^/]+)\//)
            if (match) {
                encodedPath = match[1]
            }
        }
        return encodedPath
    }

    // 加载对话消息
    useEffect(() => {
        if (!session) {
            setMessages([])
            return
        }

        const loadMessages = async () => {
            setLoading(true)
            setError(null)
            try {
                const encodedPath = getEncodedPath()
                if (!encodedPath) {
                    setError('Cannot determine project path for this session')
                    setLoading(false)
                    return
                }

                const result = await window.api.claudeHistory.getMessages(session.id, encodedPath, 0, 100)
                if (result && result.messages) {
                    setMessages(result.messages)
                } else {
                    setError('Failed to load messages')
                }
            } catch (err) {
                setError('Error loading messages')
            } finally {
                setLoading(false)
            }
        }

        loadMessages()
    }, [session])

    // 加载文件编辑记录
    useEffect(() => {
        if (!session || viewMode !== 'edits') return

        const loadEdits = async () => {
            setEditsLoading(true)
            try {
                const encodedPath = getEncodedPath()
                if (!encodedPath) return

                const sessionEdits = await window.api.claudeHistory.getSessionEdits(session.id, encodedPath)
                setEdits(sessionEdits || [])
            } catch (err) {
                console.error('Failed to load session edits:', err)
                setEdits([])
            } finally {
                setEditsLoading(false)
            }
        }

        loadEdits()
    }, [session, viewMode])

    // 加载会话统计
    useEffect(() => {
        if (!session || (viewMode !== 'analytics' && viewMode !== 'tokens')) return

        const loadStats = async () => {
            setStatsLoading(true)
            try {
                const encodedPath = getEncodedPath()
                if (!encodedPath) return

                const sessionStats = await window.api.claudeHistory.getSessionStats(session.id, encodedPath)
                setStats(sessionStats)
            } catch (err) {
                console.error('Failed to load session stats:', err)
                setStats(null)
            } finally {
                setStatsLoading(false)
            }
        }

        loadStats()
    }, [session, viewMode])

    // 拖动调整宽度 - 使用 React 事件
    const handleResizeMouseDown = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        isResizingRef.current = true
        document.body.style.cursor = 'ew-resize'
        document.body.style.userSelect = 'none'
    }

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizingRef.current) return
            const newWidth = window.innerWidth - e.clientX
            if (newWidth >= 300 && newWidth <= 1200) {
                setPanelWidth(newWidth)
            }
        }

        const handleMouseUp = () => {
            if (!isResizingRef.current) return
            isResizingRef.current = false
            document.body.style.cursor = ''
            document.body.style.userSelect = ''
        }

        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)

        return () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
        }
    }, [])

    // ESC 关闭
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', handleEscape)
        return () => document.removeEventListener('keydown', handleEscape)
    }, [onClose])

    // 关联工具结果跨消息 - 必须在条件返回之前调用 useMemo
    const processedMessages = useMemo(() => associateToolResultsAcrossMessages(messages), [messages])

    // 计算会话指标
    const metrics = useMemo(() => calculateSessionMetrics(stats), [stats])

    // 获取标题
    const getTitle = () => {
        switch (viewMode) {
            case 'messages': return '对话详情'
            case 'edits': return '文件变更'
            case 'analytics': return '分析仪表板'
            case 'tokens': return '令牌统计'
            default: return '对话详情'
        }
    }

    // 如果没有 session，不渲染任何内容
    if (!session) return null

    return (
        <div ref={panelRef} className="conversation-slide-panel" style={{ width: `${panelWidth}px` }}>
            {/* 拖动手柄 */}
            <div
                className="conversation-resize-handle"
                title="拖动调整宽度"
                onMouseDown={handleResizeMouseDown}
            >
                <ResizeIcon />
            </div>

            {/* 头部 */}
            <div className="conversation-panel-header">
                <button className="conversation-close-btn" onClick={onClose} title="关闭 (ESC)">
                    <CloseIcon />
                </button>
                <div className="conversation-panel-title">{getTitle()}</div>
                {/* 切换按钮 */}
                <div className="conversation-view-toggle">
                    <button
                        className={`toggle-btn ${viewMode === 'messages' ? 'active' : ''}`}
                        onClick={() => setViewMode('messages')}
                        title="对话详情"
                    >
                        <ConversationIcon />
                    </button>
                    <button
                        className={`toggle-btn ${viewMode === 'edits' ? 'active' : ''}`}
                        onClick={() => setViewMode('edits')}
                        title="文件变更记录"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16px" height="16px">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                    </button>
                    <button
                        className={`toggle-btn ${viewMode === 'analytics' ? 'active' : ''}`}
                        onClick={() => setViewMode('analytics')}
                        title="分析仪表板"
                    >
                        <AnalyticsIcon className="ch-toggle-icon" />
                    </button>
                    <button
                        className={`toggle-btn ${viewMode === 'tokens' ? 'active' : ''}`}
                        onClick={() => setViewMode('tokens')}
                        title="令牌统计"
                    >
                        <TokenIcon className="ch-toggle-icon" />
                    </button>
                </div>
            </div>

            {/* 内容 */}
            <div className="conversation-panel-content">
                {viewMode === 'messages' ? (
                    loading ? (
                        <div className="conversation-loading">
                            <div className="conversation-spinner"></div>
                            <span>加载中...</span>
                        </div>
                    ) : error ? (
                        <div className="conversation-error">{error}</div>
                    ) : processedMessages.length === 0 ? (
                        <div className="conversation-empty">暂无消息</div>
                    ) : (
                        <div className="conversation-messages">
                            {processedMessages.map((msg, idx) => (
                                <MessageRenderer key={msg.uuid || idx} message={msg} />
                            ))}
                        </div>
                    )
                ) : viewMode === 'edits' ? (
                    // 文件编辑记录视图
                    editsLoading ? (
                        <div className="conversation-loading">
                            <div className="conversation-spinner"></div>
                            <span>加载中...</span>
                        </div>
                    ) : edits.length === 0 ? (
                        <div className="conversation-empty">
                            <div className="ch-empty-icon">📝</div>
                            <div>当前对话无文件变更记录</div>
                        </div>
                    ) : (
                        <div className="conversation-edits">
                            <div className="ch-edits-header-inline">
                                <span className="ch-edits-count">{edits.length} 个文件变更</span>
                            </div>
                            <div className="ch-edits-list">
                                {edits.map((edit, index) => (
                                    <FileEditItem key={`${edit.path}-${index}`} edit={edit} />
                                ))}
                            </div>
                        </div>
                    )
                ) : viewMode === 'analytics' ? (
                    // 分析仪表板视图
                    statsLoading ? (
                        <div className="conversation-loading">
                            <div className="conversation-spinner"></div>
                            <span>加载中...</span>
                        </div>
                    ) : (
                        <AnalyticsView stats={stats} metrics={metrics} />
                    )
                ) : (
                    // Token 统计视图
                    statsLoading ? (
                        <div className="conversation-loading">
                            <div className="conversation-spinner"></div>
                            <span>加载中...</span>
                        </div>
                    ) : (
                        <TokenStatsView stats={stats} metrics={metrics} />
                    )
                )}
            </div>
        </div>
    )
}

const Sidebar = () => {
    const {
        sessions,
        activeSessionId,
        setActiveSession,
        workspacePath,
        setWorkspacePath,
        incrementWorkspaceChangeCounter,
        setCurrentFile,
        setCurrentFileContent,
        setOriginalFileContent,
        setEditorMode,
        stagePanelVisible,
        setStagePanelVisible,
        starredItems,
        addStarredItem,
        removeStarredItem,
        checkUnsavedChanges,
        addFileChange,
        claudeProject,
        claudeSessions,
        claudeSyncStatus,
        syncClaudeHistory,
        refreshClaudeHistory,
        markSessionDeleted
    } = useAppStore()

    // Claude History UI state
    const [conversationsExpanded, setConversationsExpanded] = useState(true)
    const [showAllConversations, setShowAllConversations] = useState(false)
    const [selectedSession, setSelectedSession] = useState<ClaudeSession | null>(null)

    // Reload roles when workspace path changes or on mount if path exists
    useEffect(() => {
        if (workspacePath) {
            setWorkspacePath(workspacePath)
        }
    }, [])

    // Auto-sync Claude history when workspace changes (non-blocking)
    useEffect(() => {
        if (!workspacePath) return
        // 使用 setTimeout 将同步推迟到下一个事件循环，避免阻塞 UI
        const timer = setTimeout(() => {
            syncClaudeHistory()
        }, 0)
        return () => clearTimeout(timer)
    }, [workspacePath])


    const [fileTree, setFileTree] = useState<FileTreeNode[]>([])
    const [showConfigManager, setShowConfigManager] = useState(false)
    const [contextMenu, setContextMenu] = useState<{
        x: number
        y: number
        node: FileTreeNode
    } | null>(null)

    // Search state
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<Array<{
        file: string
        path: string
        line: number
        content: string
    }>>([])
    const [isSearching, setIsSearching] = useState(false)

    // Toast state
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' | 'error' } | null>(null)

    const handleRoleSwitch = async (sessionId: string) => {
        if (sessionId === activeSessionId) return

        // Check for unsaved changes
        if (checkUnsavedChanges) {
            const canSwitch = await checkUnsavedChanges()
            if (!canSwitch) return
        }

        setActiveSession(sessionId)
    }

    const handleSelectWorkspace = async () => {
        const result = await window.api.workspace.select()
        if (result.success && result.path) {
            setWorkspacePath(result.path)
            // Load file tree
            loadDirectory(result.path)

            // Increment counter to trigger terminal recreation
            incrementWorkspaceChangeCounter()
        }
    }

    const loadDirectory = async (dirPath: string) => {
        const files = await window.api.fs.readDir(dirPath)
        const nodes: FileTreeNode[] = files
            .filter(file => !file.name.startsWith('.')) // Hide hidden files
            .map(file => ({
                name: file.name,
                path: file.path,
                isDirectory: file.isDirectory,
                children: file.isDirectory ? [] : undefined,
                isExpanded: false
            }))
        // Sort: directories first, then files
        nodes.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1
            if (!a.isDirectory && b.isDirectory) return 1
            return a.name.localeCompare(b.name)
        })
        setFileTree(nodes)
    }

    const toggleDirectory = async (node: FileTreeNode, path: number[]) => {
        if (!node.isDirectory) return

        const newTree = [...fileTree]
        let current: FileTreeNode[] = newTree

        // Navigate to the node
        for (let i = 0; i < path.length - 1; i++) {
            const index = path[i]
            current = current[index].children!
        }

        const nodeIndex = path[path.length - 1]
        const targetNode = current[nodeIndex]

        if (!targetNode.isExpanded) {
            // Load children
            const files = await window.api.fs.readDir(targetNode.path)
            targetNode.children = files
                .filter(file => !file.name.startsWith('.'))
                .map(file => ({
                    name: file.name,
                    path: file.path,
                    isDirectory: file.isDirectory,
                    children: file.isDirectory ? [] : undefined,
                    isExpanded: false
                }))
            // Sort
            targetNode.children.sort((a, b) => {
                if (a.isDirectory && !b.isDirectory) return -1
                if (!a.isDirectory && b.isDirectory) return 1
                return a.name.localeCompare(b.name)
            })
            targetNode.isExpanded = true
        } else {
            targetNode.isExpanded = false
        }

        setFileTree(newTree)
    }

    const handleFileClick = async (node: FileTreeNode, path: number[]) => {
        if (node.isDirectory) {
            toggleDirectory(node, path)
        } else {
            const result = await window.api.fs.readFile(node.path)
            if (result.success && result.content !== null) {
                setCurrentFile(node.path)
                setCurrentFileContent(result.content)
                setOriginalFileContent(result.content)
                setEditorMode('editor')
                if (!stagePanelVisible) {
                    setStagePanelVisible(true)
                }
            }
        }
    }



    const handleSearch = async (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && workspacePath) {
            if (!searchQuery.trim()) {
                setSearchResults([])
                return
            }
            setIsSearching(true)
            try {
                const results = await window.api.fs.searchInWorkspace(workspacePath, searchQuery)
                setSearchResults(results)
            } finally {
                setIsSearching(false)
            }
        }
    }

    const handleSearchResultClick = async (filePath: string) => {
        const result = await window.api.fs.readFile(filePath)
        if (result.success && result.content !== null) {
            setCurrentFile(filePath)
            setCurrentFileContent(result.content)
            setOriginalFileContent(result.content)
            setEditorMode('editor')
            if (!stagePanelVisible) {
                setStagePanelVisible(true)
            }
        }
    }

    const handleContextMenu = (e: React.MouseEvent, node: FileTreeNode) => {
        e.preventDefault()
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            node
        })
    }

    const handleAddToStarred = () => {
        if (contextMenu) {
            addStarredItem({
                path: contextMenu.node.path,
                name: contextMenu.node.name,
                isDirectory: contextMenu.node.isDirectory
            })
        }
        setContextMenu(null)
    }

    const handleRemoveFromStarred = () => {
        if (contextMenu) {
            const starredItem = starredItems.find(item => item.path === contextMenu.node.path)
            if (starredItem) {
                removeStarredItem(starredItem.id)
            }
        }
        setContextMenu(null)
    }

    const isStarred = (path: string) => {
        return starredItems.some(item => item.path === path)
    }

    const handleCopyFilename = async (e: React.MouseEvent, filename: string) => {
        e.stopPropagation()
        try {
            await navigator.clipboard.writeText(filename)
            setToast({ message: '已复制文件名', type: 'success' })
        } catch (err) {
            setToast({ message: '复制失败', type: 'error' })
            console.error('Failed to copy filename:', err)
        }
    }

    // Close context menu on click outside
    useEffect(() => {
        const handleClick = () => setContextMenu(null)
        if (contextMenu) {
            document.addEventListener('click', handleClick)
            return () => document.removeEventListener('click', handleClick)
        }
        return undefined
    }, [contextMenu])

    const renderTree = (nodes: FileTreeNode[], path: number[] = [], depth: number = 0): React.ReactNode[] => {
        return nodes.map((node, index) => {
            const currentPath = [...path, index]
            const starred = isStarred(node.path)
            return (
                <div key={node.path}>
                    <div
                        className={`tree-item ${starred ? 'starred' : ''}`}
                        style={{ paddingLeft: `${8 + depth * 16}px` }}
                        onClick={() => handleFileClick(node, currentPath)}
                        onContextMenu={(e) => handleContextMenu(e, node)}
                    >
                        {node.isDirectory && (
                            <svg className="tree-chevron" viewBox="0 0 16 16" fill="currentColor" style={{
                                transform: node.isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s'
                            }}>
                                <path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z"></path>
                            </svg>
                        )}
                        {!node.isDirectory && <div style={{ width: '12px' }} />}
                        {node.isDirectory ? (
                            <svg className="tree-icon" viewBox="0 0 24 24" fill="#ffca28" style={{ width: '16px', height: '16px' }}>
                                <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                            </svg>
                        ) : (
                            <div
                                className="tree-icon"
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                dangerouslySetInnerHTML={{ __html: (getIcon(node.name) as any).svg }}
                            />
                        )}
                        <span className="tree-item-name">{node.name}</span>
                        <button
                            className="tree-copy-btn"
                            onClick={(e) => handleCopyFilename(e, node.name)}
                            title="复制文件名"
                        >
                            <svg viewBox="0 0 16 16" fill="currentColor">
                                <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"></path>
                                <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"></path>
                            </svg>
                        </button>
                        {starred && (
                            <svg className="star-badge" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
                            </svg>
                        )}
                    </div>
                    {node.isDirectory && node.isExpanded && node.children && (
                        <div>
                            {renderTree(node.children, currentPath, depth + 1)}
                        </div>
                    )}
                </div>
            )
        })
    }

    // Listen for file changes
    useEffect(() => {
        const removeListener = window.api.fs.onFileChanged((data: {
            event: string;
            path: string;
            timestamp?: number
        }) => {
            console.log(`File ${data.event}:`, data.path)

            // Add to file changes tracking
            addFileChange({
                path: data.path,
                changeType: data.event as 'add' | 'change' | 'unlink',
                timestamp: data.timestamp || Date.now()
            })

            // Reload file tree if workspace is set
            if (workspacePath) {
                loadDirectory(workspacePath)
            }
        })

        return removeListener
    }, [workspacePath, addFileChange])

    // Listen for workspace opened event (from dock menu / jump list)
    useEffect(() => {
        const handleWorkspaceOpened = (_event: any, data: { path: string }) => {
            console.log('[Renderer] Workspace opened event received:', data.path)
            setWorkspacePath(data.path)
            loadDirectory(data.path)
            incrementWorkspaceChangeCounter()
        }

        window.electron.ipcRenderer.on('workspace:opened', handleWorkspaceOpened)

        return () => {
            window.electron.ipcRenderer.removeListener('workspace:opened', handleWorkspaceOpened)
        }
    }, [])



    return (
        <div className="panel-base sidebar">
            <div className="sidebar-header">
                <h3>
                    资源管理器
                    {workspacePath && (
                        <span className="workspace-path"> - {workspacePath.split(/[/\\]/).pop()}</span>
                    )}
                </h3>
                <button className="workspace-btn" onClick={handleSelectWorkspace} title="选择工作目录">
                    <svg viewBox="0 0 16 16" fill="currentColor">
                        <path d="M1.75 1A1.75 1.75 0 0 0 0 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0 0 16 13.25v-8.5A1.75 1.75 0 0 0 14.25 3H7.5a.25.25 0 0 1-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75Z"></path>
                    </svg>
                </button>
            </div>
            <div className="sidebar-content">
                <div className="role-switcher">
                    <div className="section-header">
                        <h4>配置管理</h4>
                        <button className="icon-btn" onClick={() => setShowConfigManager(true)} title="打开配置管理">
                            <svg viewBox="0 0 16 16" fill="currentColor">
                                <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0ZM1.5 8a6.5 6.5 0 1 1 13 0 6.5 6.5 0 0 1-13 0Zm6.5-5a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm0 8a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm-4-4a1 1 0 1 0 2 0 1 1 0 0 0-2 0Zm8 0a1 1 0 1 0 2 0 1 1 0 0 0-2 0Z" />
                                <path d="M7.746.5c-.69 0-1.252.4-1.464 1.056l-.316 1.066a5.526 5.526 0 0 0-1.503.743l-1.025-.436c-.663-.257-1.396.06-1.748.67l-.75 1.3a1.505 1.505 0 0 0 .385 1.83l.898.756a5.556 5.556 0 0 0-.001 1.03l-.898.756a1.505 1.505 0 0 0-.385 1.83l.75 1.3c.351.61.996.942 1.748.67l1.025-.436c.462.33.966.592 1.503.743l.316 1.066c.212.656.774 1.056 1.464 1.056h1.5c.69 0 1.252-.4 1.464-1.056l.316-1.066a5.526 5.526 0 0 0 1.503-.743l1.025.436c.663.257 1.396-.06 1.748-.67l.75-1.3a1.505 1.505 0 0 0-.385-1.83l-.898-.756a5.556 5.556 0 0 0 .001-1.03l.898-.756a1.505 1.505 0 0 0 .385-1.83l-.75-1.3c-.351-.61-.996-.942-1.748-.67l-1.025.436a5.526 5.526 0 0 0-1.503-.743l-.316-1.066A1.523 1.523 0 0 0 9.246.5h-1.5Zm1.168 2.067l.317 1.066A.523.523 0 0 0 9.74 4h.022c.162 0 .318.067.433.178l.76.73a.523.523 0 0 0 .598.05l.933-.396.386.668-.768.646a.52.52 0 0 0-.17.587l.156.634c.04.161.162.29.318.334l.872.247-.193.744-.817.078a.525.525 0 0 0-.422.316l-.372.934-.73.208a.523.523 0 0 0-.374.453l-.117 1.036h-.772l-.117-1.036a.523.523 0 0 0-.374-.453l-.73-.208-.372-.934a.525.525 0 0 0-.422-.316l-.817-.078-.193-.744.872-.247c.156-.044.278-.173.318-.334l.156-.634a.52.52 0 0 0-.17-.587l-.768-.646.386-.668.933.396a.523.523 0 0 0 .598-.05l.76-.73a.527.527 0 0 0 .338-.204.53.53 0 0 0 .095-.296l.317-1.066h.772ZM8.5 6a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z" />
                            </svg>
                        </button>
                    </div>

                    {/* Role List */}
                    <div className="role-list">
                        {sessions.map((session) => (
                            <div
                                key={session.id}
                                className={`role-item ${activeSessionId === session.id ? 'active' : ''}`}
                                onClick={() => handleRoleSwitch(session.id)}
                            >
                                <span className="role-icon" style={{ display: 'flex', width: '16px', height: '16px' }}>
                                    {getRoleIcon(session.icon)}
                                </span>
                                <span>{session.name}</span>
                                {session.ptyPid && <span className="session-indicator">●</span>}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Claude History Conversations Section */}
                <div className="ch-conversations-section">
                    <div
                        className="section-header ch-section-header"
                        onClick={() => setConversationsExpanded(!conversationsExpanded)}
                    >
                        <span className="ch-section-icon"><ConversationIcon /></span>
                        <span className="section-title">Conversations</span>
                        {claudeProject && (
                            <span className="ch-session-count">{claudeProject.sessionCount}</span>
                        )}
                    </div>

                    {conversationsExpanded && (
                        <div className="ch-conversations-content">
                            {/* Sync status and action */}
                            {claudeSyncStatus && (
                                <div className="ch-sync-status">
                                    <span className="ch-sync-icon">
                                        {claudeSyncStatus.syncing ? (
                                            <RefreshIcon />
                                        ) : claudeProject ? (
                                            <CheckIcon />
                                        ) : (
                                            <WarningIcon />
                                        )}
                                    </span>
                                    <span className="ch-sync-text">
                                        {claudeSyncStatus.message || (claudeProject ? 'Synced' : 'No history')}
                                    </span>
                                    {claudeProject && (
                                        <button
                                            className="ch-sync-btn"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                refreshClaudeHistory()
                                            }}
                                            disabled={claudeSyncStatus.syncing}
                                            title="Incremental Sync"
                                        >
                                            <RefreshIcon />
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Conversation list */}
                            <div className={`ch-conversation-list ${showAllConversations ? 'expanded' : ''}`}>
                                {claudeSessions.length > 0 ? (
                                    (showAllConversations ? claudeSessions : claudeSessions.slice(0, 6)).map((session) => (
                                        <ConversationItem
                                            key={session.id}
                                            session={session}
                                            onSelect={setSelectedSession}
                                            onDelete={markSessionDeleted}
                                        />
                                    ))
                                ) : (
                                    <div className="ch-empty-state">
                                        {claudeSyncStatus?.syncing
                                            ? 'Loading conversations...'
                                            : 'No conversations found'}
                                    </div>
                                )}
                            </div>

                            {/* View all / Show less toggle */}
                            {claudeProject && claudeSessions.length > 6 && (
                                <div className="ch-view-all">
                                    <button onClick={() => setShowAllConversations(!showAllConversations)}>
                                        {showAllConversations ? (
                                            <>收起 ↑</>
                                        ) : (
                                            <>查看全部 ({claudeSessions.length}) ↓</>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Starred Files */}
                <StarredFiles />

                {/* Changed Files */}
                <ChangedFiles />

                <div className="file-tree">
                    <div className="search-container">
                        <div className="search-input-wrapper">
                            <svg className="search-icon-input" viewBox="0 0 16 16" fill="currentColor">
                                <path fillRule="evenodd" d="M11.5 7a4.499 4.499 0 1 1-8.998 0A4.499 4.499 0 0 1 11.5 7Zm-.82 4.74a6 6 0 1 1 1.06-1.06l3.04 3.04a.75.75 0 1 1-1.06 1.06l-3.04-3.04Z" />
                            </svg>
                            <input
                                className="search-input"
                                placeholder="搜索... (按回车)"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleSearch}
                            />
                            {searchQuery && (
                                <button
                                    className="search-clear-btn"
                                    onClick={() => {
                                        setSearchQuery('')
                                        setSearchResults([])
                                    }}
                                >
                                    <svg viewBox="0 0 16 16" fill="currentColor">
                                        <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="section-header">
                        {/* <h4>{searchQuery ? '搜索结果' : '文件树'}</h4> */}
                    </div>

                    {searchQuery ? (
                        <div className="search-results">
                            {isSearching ? (
                                <div className="search-loading">
                                    <span>搜索中...</span>
                                </div>
                            ) : searchResults.length > 0 ? (
                                searchResults.map((result, index) => (
                                    <div
                                        key={`${result.path}-${result.line}-${index}`}
                                        className="search-result-item"
                                        onClick={() => handleSearchResultClick(result.path)}
                                        onContextMenu={(e) => handleContextMenu(e, {
                                            name: result.file,
                                            path: result.path,
                                            isDirectory: false
                                        })}
                                    >
                                        <div className="search-result-info">
                                            <div
                                                style={{ width: '16px', height: '16px', marginRight: '6px', display: 'flex', alignItems: 'center' }}
                                                dangerouslySetInnerHTML={{ __html: (getIcon(result.file) as any).svg }}
                                            />
                                            <span className="search-result-file" title={result.path}>
                                                {result.file}
                                            </span>
                                            <span className="search-result-location">
                                                :{result.line}
                                            </span>
                                        </div>
                                        <div className="search-result-preview">
                                            {result.content}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="search-empty">
                                    未找到匹配项
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="tree-content">
                            {fileTree.length === 0 && !workspacePath && (
                                <div className="tree-empty">点击上方文件夹图标选择工作目录</div>
                            )}
                            {renderTree(fileTree)}
                        </div>
                    )}
                </div>
            </div>

            {/* Context Menu */}
            {
                contextMenu && (
                    <div
                        className="context-menu"
                        style={{
                            position: 'fixed',
                            left: `${contextMenu.x}px`,
                            top: `${contextMenu.y}px`,
                            zIndex: 1000
                        }}
                    >
                        {isStarred(contextMenu.node.path) ? (
                            <div className="context-menu-item" onClick={handleRemoveFromStarred}>
                                <svg viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
                                </svg>
                                取消星标
                            </div>
                        ) : (
                            <div className="context-menu-item" onClick={handleAddToStarred}>
                                <svg viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
                                </svg>
                                添加到星标
                            </div>
                        )}
                    </div>
                )
            }

            {/* Config Manager */}
            {
                showConfigManager && (
                    <ConfigManager onClose={() => setShowConfigManager(false)} />
                )
            }

            {/* Conversation Slide Panel */}
            {selectedSession && (
                <ConversationSlidePanel
                    session={selectedSession}
                    onClose={() => setSelectedSession(null)}
                />
            )}

            {/* Toast */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div >
    )
}

export default Sidebar
