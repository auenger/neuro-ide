import React, { useState, useEffect, useCallback, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import './ClaudeHistory.css'

// ============================================================================
// Types - Use global types from env.d.ts
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

interface Props {
  onClose?: () => void
}

type ViewMode =
  | 'projects'
  | 'sessions'
  | 'messages'
  | 'analytics'
  | 'search'
  | 'recentEdits'
  | 'sessionBoard'
type MainTab = 'history' | 'analytics'

// ============================================================================
// Utility Functions
// ============================================================================

// ============================================================================
// SVG Icon Components
// ============================================================================

// 机器人头像 SVG 图标
const RobotIcon: React.FC<{ className?: string }> = ({ className }) => (
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

// Read 图标 (文档)
const ReadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14 2v6h6M16 13H8M16 17H8M10 9H8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

// Write 图标 (编辑/铅笔)
const WriteIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

// Edit 图标 (修改)
const EditIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

// Bash 图标 (终端)
const BashIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M6 8l4 4-4 4M10 16h6"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

// Glob 图标 (搜索)
const GlobIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
    <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

// Grep 图标 (文件搜索)
const GrepIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M21 21l-4.35-4.35M14 10a4 4 0 1 1-8 0"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M4 6h16M4 12h16M4 18h10"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
)

// Task 图标
const TaskIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M9 9h6M9 12h6M9 15h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

// TodoWrite 图标 (复选框)
const TodoWriteIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M9 12l2 2 4-4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

// WebSearch 图标 (地球)
const WebSearchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </svg>
)

// WebFetch 图标 (下载)
const WebFetchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <polyline
      points="7 10 12 15 17 10"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <line
      x1="12"
      y1="15"
      x2="12"
      y2="3"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

// NotebookEdit 图标 (笔记本)
const NotebookEditIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path d="M12 4v16M8 4v16M16 4v16" stroke="currentColor" strokeWidth="1" />
  </svg>
)

// Skill 图标 (靶心)
const SkillIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
  </svg>
)

// AskUserQuestion 图标 (问号)
const AskUserQuestionIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="17" r="1" fill="currentColor" />
  </svg>
)

// EnterPlanMode 图标 (规划)
const EnterPlanModeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M9 3v18M15 3v18M3 9h18M3 15h18" stroke="currentColor" strokeWidth="1" />
  </svg>
)

// TaskOutput 图标 (上传/输出)
const TaskOutputIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <polyline
      points="17 8 12 3 7 8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <line
      x1="12"
      y1="3"
      x2="12"
      y2="15"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

// TaskStop 图标 (停止)
const TaskStopIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <rect x="8" y="8" width="8" height="8" fill="currentColor" />
  </svg>
)

// TaskGet 图标 (下载/获取)
const TaskGetIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <polyline
      points="7 10 12 15 17 10"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <line
      x1="12"
      y1="15"
      x2="12"
      y2="3"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

// AnalyzeImage 图标 (图像分析)
const AnalyzeImageIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
    <path
      d="M21 15l-5-5L5 21"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

// WebReader 图标 (阅读/文档)
const WebReaderIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9 7h1M9 11h1M14 7h1M14 11h1"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

// AnalyzeDataVisualization 图标 (图表分析)
const AnalyzeDataVisualizationIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <line
      x1="18"
      y1="20"
      x2="18"
      y2="10"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <line
      x1="12"
      y1="20"
      x2="12"
      y2="4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <line
      x1="6"
      y1="20"
      x2="6"
      y2="14"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

// AnalyzeVideo 图标 (视频分析)
const AnalyzeVideoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <polygon
      points="5 3 19 12 5 21 5 3"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
)

// DiagnoseErrorScreenshot 图标 (错误诊断)
const DiagnoseErrorScreenshotIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
    <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M8 8l8 8M16 8l-8 8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
  </svg>
)

// ExtractTextFromScreenshot 图标 (文本提取)
const ExtractTextFromScreenshotIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14 2v6h6M16 13H8M16 17H8M10 9H8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M18 9l-2 2M18 13l-2-2"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

// UiDiffCheck 图标 (差异检查)
const UiDiffCheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M21 21l-4.35-4.35M11 8v6M8 11h6"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

// UiToArtifact 图标 (UI 转换)
const UiToArtifactIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M12 2L2 7l10 5 10-5-10-5z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M2 17l10 5 10-5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M2 12l10 5 10-5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14 2l6 3.5M14 12l6 3.5"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

// UnderstandTechnicalDiagram 图标 (技术图理解)
const UnderstandTechnicalDiagramIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="3" y="3" width="7" height="7" stroke="currentColor" strokeWidth="1.5" />
    <rect x="14" y="3" width="7" height="7" stroke="currentColor" strokeWidth="1.5" />
    <rect x="14" y="14" width="7" height="7" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M6.5 10v4M6.5 17.5L10 14M10 17.5L6.5 14"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path d="M14 6.5h4M17.5 6.5v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M6.5 6.5h2M6.5 3v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

// 状态图标 - 成功
const SuccessIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M20 6L9 17l-5-5"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

// 状态图标 - 错误
const ErrorIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

// 状态图标 - 等待中
const PendingIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" />
    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <animateTransform
        attributeName="transform"
        type="rotate"
        from="0 12 12"
        to="360 12 12"
        dur="1s"
        repeatCount="indefinite"
      />
    </path>
  </svg>
)

// 思考过程图标 - 大脑风格
const ThinkingIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M9.5 3C6.5 3 4 5 3 8c-.5 1.5 0 3 1 4-.5 1-.5 2 0 3 .5 1 1.5 1.5 2.5 1.5.5 0 1 0 1.5-.5.5.5 0 0 0 0-1c-.5 0-1-.5-1.5-1-.5-.5-.5-1 0-1.5.5-.5.5-1 .5-1.5 0-1.5.5-3 1.5-4 1-1 2.5-1.5 4-1.5 1.5 0 3 .5 4 1.5 1 1 1.5 2.5 1.5 4 0 .5 0 1-.5 1.5-.5.5-.5 1 0 1.5.5.5 1 .5 1.5 1 2 0 .5-.5 1-1 1.5-.5.5-1 .5-1.5.5-.5 0-1-.5-1.5-1-.5-.5-.5-1 0-1.5.5-.5.5-1 .5-1.5 0-1-.5-2.5-1.5-3.5-1-1-2.5-1.5-4-1.5z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8 9c.5-.5 1-.5 1.5 0M11 7.5c.5 0 1 .5 1 1M13 10.5c-.5.5-1 .5-1.5 0"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="8.5" cy="8" r="0.75" fill="currentColor" />
    <circle cx="12.5" cy="7" r="0.75" fill="currentColor" />
    <circle cx="10" cy="11" r="0.75" fill="currentColor" />
  </svg>
)

// 格式化日期时间（用于消息气泡）
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

// 相对时间（用于列表等）
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

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

// ============================================================================
// Markdown Renderer with Syntax Highlighting
// ============================================================================

const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  // 过滤空行
  const filterEmptyLines = (text: string): string => {
    return text
      .split('\n')
      .filter((line, index, arr) => {
        if (line.trim() === '') {
          const prevLine = arr[index - 1]
          const nextLine = arr[index + 1]
          return prevLine?.trim() !== '' && nextLine?.trim() !== ''
        }
        return true
      })
      .join('\n')
  }

  const filteredContent = useMemo(() => filterEmptyLines(content), [content])

  return (
    <div className="ch-markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            const isInline = !match
            return !isInline ? (
              <SyntaxHighlighter
                style={vscDarkPlus}
                language={match[1]}
                PreTag="div"
                customStyle={{
                  margin: '8px 0',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}
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
        {filteredContent}
      </ReactMarkdown>
    </div>
  )
}

// ============================================================================
// Message Preview Generator
// ============================================================================

// 检查用户消息是否只是确认执行结果（需要过滤掉）
const isUserConfirmationOnly = (content: any): boolean => {
  if (!content) return false

  // 字符串内容检查
  if (typeof content === 'string') {
    const cleaned = content.trim().toLowerCase()
    // 检查是否是简单的确认词
    const confirmations = [
      'yes',
      'y',
      'ok',
      'okay',
      '好的',
      '继续',
      '确认',
      '是的',
      '对',
      '可以',
      '没问题'
    ]
    return confirmations.includes(cleaned)
  }

  // 数组内容检查
  if (Array.isArray(content)) {
    // 检查是否只有 tool_result 且都是成功的
    const hasOnlyToolResults = content.every(
      (item) => !item || item.type === 'tool_result' || !item.type
    )

    if (hasOnlyToolResults) {
      // 检查是否所有 tool_result 都是成功的确认
      const toolResults = content.filter((item) => item?.type === 'tool_result')
      if (toolResults.length > 0) {
        // 如果有错误结果，不认为是确认
        const hasError = toolResults.some((item) => item.is_error)
        if (hasError) return false

        // 检查内容是否是简单的确认
        return toolResults.every((item) => {
          if (!item.content) return true
          const contentStr =
            typeof item.content === 'string'
              ? item.content.trim()
              : JSON.stringify(item.content).trim()
          // 空内容或简短的成功消息
          return (
            contentStr.length < 10 ||
            contentStr.toLowerCase() === 'success' ||
            contentStr.toLowerCase() === 'ok' ||
            contentStr.toLowerCase() === 'done'
          )
        })
      }
    }
  }

  return false
}

const generatePreview = (content: any): string => {
  // 空内容
  if (content === null || content === undefined) {
    return ''
  }

  // 字符串内容
  if (typeof content === 'string') {
    const cleaned = content.replace(/\n\s*\n/g, '\n').trim()
    if (!cleaned) return ''
    // 检测用户命令（以 / 开头）
    if (cleaned.startsWith('/')) {
      const cmdMatch = cleaned.match(/^\/(\w+)/)
      if (cmdMatch) {
        return `⚡ /${cmdMatch[1]}`
      }
    }
    return cleaned.length > 120 ? cleaned.slice(0, 120) + '...' : cleaned
  }

  // 数组内容
  if (Array.isArray(content)) {
    const previews: string[] = []

    for (const item of content) {
      if (!item || !item.type) continue

      switch (item.type) {
        case 'text':
          if (item.text?.trim()) {
            const text = item.text.trim()
            // 检测用户命令
            if (text.startsWith('/')) {
              const cmdMatch = text.match(/^\/(\w+)/)
              if (cmdMatch) {
                previews.push(`⚡ /${cmdMatch[1]}`)
                break
              }
            }
            previews.push(text.length > 80 ? text.slice(0, 80) + '...' : text)
          }
          break

        case 'thinking':
          if (item.thinking?.trim()) {
            const cleaned = item.thinking.replace(/\n+/g, ' ').trim()
            previews.push('💭 ' + (cleaned.length > 60 ? cleaned.slice(0, 60) + '...' : cleaned))
          }
          break

        case 'tool_use':
          if (item.name) {
            const inputPreview = getInputPreview(item.input)
            const icon = item.name === 'Bash' ? '💻' : '🔧'
            previews.push(`${icon} ${item.name}${inputPreview ? ': ' + inputPreview : ''}`)
          }
          break

        case 'tool_result':
          // 用户消息中的 tool_result 不显示预览（会在 hasContent 检查时过滤）
          // Claude 消息中的 tool_result 显示状态
          if (item.content) {
            const resultText =
              typeof item.content === 'string' ? item.content : JSON.stringify(item.content)
            const cleaned = resultText.replace(/\n+/g, ' ').trim()
            // 只显示错误结果
            if (item.is_error && cleaned.length > 5) {
              previews.push('❌')
            }
          }
          break

        case 'mcp_tool_use':
          if (item.tool_name) {
            previews.push(`🔌 ${item.tool_name}`)
          }
          break
      }

      // 最多取前 3 个有意义的内容
      if (previews.length >= 3) break
    }

    return previews.join(' ')
  }

  // 对象内容
  if (typeof content === 'object') {
    const keys = Object.keys(content)
    if (keys.length === 0) return ''
    return JSON.stringify(content).slice(0, 100) + '...'
  }

  return ''
}

// 获取工具输入的预览
const getInputPreview = (input: any): string => {
  if (!input) return ''
  if (input.file_path) return input.file_path.split('/').pop() || ''
  if (input.command) return input.command.slice(0, 40)
  if (input.pattern) return input.pattern
  if (input.query) return input.query.slice(0, 40)
  if (input.prompt) return input.prompt.slice(0, 40)
  return ''
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
    sql: 'sql'
  }
  return langMap[ext] || 'text'
}

// ============================================================================
// Content Renderers
// ============================================================================

// 获取工具图标函数 (提取为独立函数，供多个组件使用)
const getToolIcon = (name: string) => {
  const iconClass = 'ch-tool-svg-icon'
  switch (name) {
    case 'Read':
      return <ReadIcon className={iconClass} />
    case 'Write':
      return <WriteIcon className={iconClass} />
    case 'Edit':
      return <EditIcon className={iconClass} />
    case 'Bash':
      return <BashIcon className={iconClass} />
    case 'Glob':
      return <GlobIcon className={iconClass} />
    case 'Grep':
      return <GrepIcon className={iconClass} />
    case 'Task':
    case 'TaskCreate':
    case 'TaskUpdate':
    case 'TaskList':
      return <TaskIcon className={iconClass} />
    case 'TodoWrite':
      return <TodoWriteIcon className={iconClass} />
    case 'WebSearch':
      return <WebSearchIcon className={iconClass} />
    case 'WebFetch':
      return <WebFetchIcon className={iconClass} />
    case 'NotebookEdit':
      return <NotebookEditIcon className={iconClass} />
    case 'Skill':
      return <SkillIcon className={iconClass} />
    case 'AskUserQuestion':
      return <AskUserQuestionIcon className={iconClass} />
    case 'EnterPlanMode':
      return <EnterPlanModeIcon className={iconClass} />
    case 'TaskOutput':
      return <TaskOutputIcon className={iconClass} />
    case 'TaskStop':
      return <TaskStopIcon className={iconClass} />
    case 'TaskGet':
      return <TaskGetIcon className={iconClass} />
    case 'mcp__4_5v_mcp__analyze_image':
      return <AnalyzeImageIcon className={iconClass} />
    case 'mcp__web_reader__webReader':
      return <WebReaderIcon className={iconClass} />
    case 'mcp__zai_mcp_server__analyze_data_visualization':
      return <AnalyzeDataVisualizationIcon className={iconClass} />
    case 'mcp__zai_mcp_server__analyze_image':
      return <AnalyzeImageIcon className={iconClass} />
    case 'mcp__zai_mcp_server__analyze_video':
      return <AnalyzeVideoIcon className={iconClass} />
    case 'mcp__zai_mcp_server__diagnose_error_screenshot':
      return <DiagnoseErrorScreenshotIcon className={iconClass} />
    case 'mcp__zai_mcp_server__extract_text_from_screenshot':
      return <ExtractTextFromScreenshotIcon className={iconClass} />
    case 'mcp__zai_mcp_server__ui_diff_check':
      return <UiDiffCheckIcon className={iconClass} />
    case 'mcp__zai_mcp_server__ui_to_artifact':
      return <UiToArtifactIcon className={iconClass} />
    case 'mcp__zai_mcp_server__understand_technical_diagram':
      return <UnderstandTechnicalDiagramIcon className={iconClass} />
    default:
      // 未知工具使用默认扳手图标
      return (
        <svg
          className={iconClass}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
  }
}

const ThinkingRenderer: React.FC<{ content: ContentItem }> = ({ content }) => {
  const [expanded, setExpanded] = useState(false)

  // 生成思考内容预览
  const thinkingText = content.thinking || ''

  // 计算思考内容行数
  const lineCount = thinkingText.split('\n').length

  return (
    <div className="ch-thinking-block">
      <div className="ch-thinking-header" onClick={() => setExpanded(!expanded)}>
        <ThinkingIcon className="ch-thinking-svg-icon" />
        <span className="ch-thinking-title">思考过程</span>
        <span className="ch-thinking-meta">{lineCount} 行</span>
        <svg
          className={`ch-tool-chevron ${expanded ? 'expanded' : ''}`}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {/* 完整内容（折叠时也显示预览，展开显示全部） */}
      {expanded ? (
        <div className="ch-thinking-content">
          <MarkdownRenderer content={thinkingText} />
        </div>
      ) : (
        <div className="ch-thinking-preview">
          {thinkingText.slice(0, 300)}
          {thinkingText.length > 300 ? '...' : ''}
        </div>
      )}
    </div>
  )
}

// 备用工具渲染器（已被 UnifiedToolExecutionRenderer 取代，保留作为参考）
// @ts-ignore - 未使用的备用组件
const ToolUseRenderer: React.FC<{ content: ContentItem; result?: ContentItem }> = ({
  content,
  result
}) => {
  const [expanded, setExpanded] = useState(false)

  // 生成预览文本
  const getInputPreview = () => {
    if (!content.input) return ''
    const input = content.input
    if (input.file_path) return input.file_path.split('/').pop()
    if (input.command) return input.command.slice(0, 50)
    if (input.pattern) return input.pattern
    if (input.query) return input.query.slice(0, 50)
    if (input.prompt) return input.prompt.slice(0, 50)
    return ''
  }

  const inputPreview = getInputPreview()

  // 是否是 Bash 命令
  const isBashCommand = content.name === 'Bash'

  // 渲染工具结果
  const renderResult = () => {
    if (!result) return null

    const resultContent = result.content
    const isError = result.is_error

    // Bash 命令结果特殊处理
    if (isBashCommand && typeof resultContent === 'string') {
      return (
        <div className={`ch-tool-result ${isError ? 'error' : 'success'}`}>
          <div className="ch-tool-result-header">
            <span className="ch-tool-result-icon">{isError ? '❌' : '✓'}</span>
            <span className="ch-tool-result-label">{isError ? '执行失败' : '执行完成'}</span>
          </div>
          <div className="ch-bash-output">
            <pre>{resultContent}</pre>
          </div>
        </div>
      )
    }

    // 普通工具结果
    return (
      <div className={`ch-tool-result ${isError ? 'error' : 'success'}`}>
        <div className="ch-tool-result-header">
          <span className="ch-tool-result-icon">{isError ? '❌' : '✓'}</span>
          <span className="ch-tool-result-label">{isError ? '错误' : '完成'}</span>
        </div>
        <div className="ch-tool-result-content">
          {typeof resultContent === 'string' ? (
            <MarkdownRenderer
              content={
                resultContent.slice(0, 2000) +
                (resultContent.length > 2000 ? '\n\n...(内容已截断)' : '')
              }
            />
          ) : (
            <pre>{JSON.stringify(resultContent, null, 2).slice(0, 2000)}</pre>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`ch-tool-use ${isBashCommand ? 'bash-command' : ''}`}>
      <div className="ch-tool-header" onClick={() => setExpanded(!expanded)}>
        <span className="ch-tool-icon">{getToolIcon(content.name || '')}</span>
        <span className="ch-tool-name">{content.name || 'Tool'}</span>
        {inputPreview && !expanded && <span className="ch-tool-preview">{inputPreview}</span>}
        {/* 显示结果状态 */}
        {result && !expanded && (
          <span className={`ch-tool-status ${result.is_error ? 'error' : 'success'}`}>
            {result.is_error ? '❌' : '✓'}
          </span>
        )}
        <svg
          className={`ch-tool-chevron ${expanded ? 'expanded' : ''}`}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      {expanded && (
        <>
          {/* 工具输入参数 */}
          <div className="ch-tool-input">
            <div className="ch-tool-section-label">{isBashCommand ? '命令' : '参数'}</div>
            {isBashCommand && content.input?.command ? (
              <div className="ch-bash-command">
                <span className="ch-bash-prompt">$</span>
                <code>{content.input.command}</code>
              </div>
            ) : (
              <pre>{JSON.stringify(content.input, null, 2)}</pre>
            )}
          </div>
          {/* 工具结果 */}
          {renderResult()}
        </>
      )}
    </div>
  )
}

const McpToolRenderer: React.FC<{ content: ContentItem }> = ({ content }) => {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="ch-mcp-tool">
      <div className="ch-mcp-header" onClick={() => setExpanded(!expanded)}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
        <span>MCP: {content.tool_name}</span>
        <span className="ch-mcp-server">{content.server_name}</span>
      </div>
      {expanded && (
        <div className="ch-tool-input">
          <pre>{JSON.stringify(content.input, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Unified Tool Execution Renderer
// ============================================================================

interface ToolExecutionEntry {
  kind: 'toolExecution'
  key: string
  toolUse: ContentItem
  toolResults: ContentItem[]
}

interface ContentEntry {
  kind: 'item'
  key: string
  item: ContentItem
  index: number
}

// 标准化工具执行条目，关联 tool_use 和 tool_result
const normalizeToolExecutionEntries = (
  contents: ContentItem[]
): (ToolExecutionEntry | ContentEntry)[] => {
  const entries: (ToolExecutionEntry | ContentEntry)[] = []
  const pendingByToolId = new Map<string, number>()

  for (let index = 0; index < contents.length; index += 1) {
    const item = contents[index]

    if (!item || typeof item !== 'object') {
      entries.push({
        kind: 'item',
        key: `item-${index}`,
        item,
        index
      })
      continue
    }

    if (item.type === 'tool_use' && item.id) {
      entries.push({
        kind: 'toolExecution',
        key: `tool-${index}`,
        toolUse: item,
        toolResults: []
      })
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

    entries.push({
      kind: 'item',
      key: `item-${index}`,
      item,
      index
    })
  }

  return entries
}

// 统一工具执行渲染器
const UnifiedToolExecutionRenderer: React.FC<{
  toolUse: ContentItem
  toolResults: ContentItem[]
}> = ({ toolUse, toolResults }) => {
  const [expanded, setExpanded] = useState(false)

  const toolName = toolUse.name || ''
  const toolInput = toolUse.input || {}

  const hasResult = toolResults.length > 0
  const hasError = hasResult && toolResults.some((r) => r.is_error)
  const isPending = !hasResult

  // 获取主要预览
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
        {primaryPreview && !expanded && <span className="ch-tool-preview">{primaryPreview}</span>}
        {/* 状态指示器 */}
        {hasError ? (
          <span className="ch-tool-status error">
            <ErrorIcon className="ch-status-icon" />
          </span>
        ) : isPending ? (
          <span className="ch-tool-status" style={{ color: 'var(--ch-warning)' }}>
            <PendingIcon className="ch-status-icon" />
          </span>
        ) : (
          <span className="ch-tool-status success">
            <SuccessIcon className="ch-status-icon" />
          </span>
        )}
        <svg
          className={`ch-tool-chevron ${expanded ? 'expanded' : ''}`}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {expanded && (
        <>
          {/* 工具输入参数 */}
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

          {/* 工具执行结果 - 跟随展开状态 */}
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
                        <span className="ch-tool-result-icon">
                          {isError ? (
                            <ErrorIcon className="ch-result-icon" />
                          ) : (
                            <SuccessIcon className="ch-result-icon" />
                          )}
                        </span>
                        <span className="ch-tool-result-label">
                          结果 #{idx + 1} {isError ? '(错误)' : '(完成)'}
                        </span>
                      </div>
                      <div className="ch-tool-result-content">
                        {typeof resultContent === 'string' ? (
                          <MarkdownRenderer
                            content={
                              resultContent.slice(0, 5000) +
                              (resultContent.length > 5000 ? '\n\n...(内容已截断)' : '')
                            }
                          />
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

const ContentArrayRenderer: React.FC<{ contents: ContentItem[] }> = ({ contents }) => {
  const normalizedContent = useMemo(() => normalizeToolExecutionEntries(contents), [contents])

  return (
    <div className="ch-content-array">
      {normalizedContent.map((entry) => {
        if (entry.kind === 'toolExecution') {
          return (
            <UnifiedToolExecutionRenderer
              key={entry.key}
              toolUse={entry.toolUse}
              toolResults={entry.toolResults}
            />
          )
        }

        const { item, index } = entry
        if (!item || typeof item !== 'object') {
          return null
        }

        switch (item.type) {
          case 'text':
            return <MarkdownRenderer key={index} content={item.text || ''} />
          case 'thinking':
            return <ThinkingRenderer key={index} content={item} />
          case 'tool_result':
            return null // Results are shown with tool_use
          case 'mcp_tool_use':
            return <McpToolRenderer key={index} content={item} />
          default:
            return null
        }
      })}
    </div>
  )
}

// ============================================================================
// Message List Renderer - 处理跨消息的工具结果关联
// ============================================================================

// 关联跨消息的 tool_use 和 tool_result
const associateToolResultsAcrossMessages = (messages: ClaudeMessage[]): ClaudeMessage[] => {
  // 存储 tool_use 的映射：toolUseId -> { messageUuid }
  const pendingToolUses = new Map<string, string>()
  // 存储需要移除的消息 uuid（只有 tool_result 的用户消息）
  const messagesToRemove = new Set<string>()
  // 存储 tool_use 消息需要额外添加的 tool_result
  const toolResultsToAdd = new Map<string, ContentItem[]>()

  for (const message of messages) {
    const content = message.content || message.message?.content

    if (!content || !Array.isArray(content)) {
      continue
    }

    const modifiedItems: ContentItem[] = []
    let hasNonToolResultContent = false

    for (const item of content) {
      if (!item || typeof item !== 'object') {
        hasNonToolResultContent = true
        modifiedItems.push(item)
        continue
      }

      // Assistant 消息中的 tool_use - 记录并保留
      if (item.type === 'tool_use' && item.id) {
        pendingToolUses.set(item.id, message.uuid)
        hasNonToolResultContent = true
        modifiedItems.push(item)
        continue
      }

      // User 消息中的 tool_result
      if (item.type === 'tool_result' && item.tool_use_id) {
        const targetMessageUuid = pendingToolUses.get(item.tool_use_id)
        if (targetMessageUuid) {
          // 将 tool_result 添加到对应的 tool_use 消息中
          const existingResults = toolResultsToAdd.get(targetMessageUuid) || []
          existingResults.push({
            type: 'tool_result',
            tool_use_id: item.tool_use_id,
            content: item.content,
            is_error: item.is_error
          })
          toolResultsToAdd.set(targetMessageUuid, existingResults)
          // 不将这个 tool_result 添加到当前用户消息
          continue
        }
      }

      // 其他内容类型
      hasNonToolResultContent = true
      modifiedItems.push(item)
    }

    // 如果用户消息没有任何非 tool_result 内容，标记为移除
    if (message.type === 'user' && !hasNonToolResultContent) {
      messagesToRemove.add(message.uuid)
    }
  }

  // 应用修改并过滤消息
  return messages
    .filter((msg) => !messagesToRemove.has(msg.uuid))
    .map((msg) => {
      const additionalResults = toolResultsToAdd.get(msg.uuid)
      if (additionalResults && additionalResults.length > 0) {
        // 需要将 tool_result 添加到消息的 content 中
        const originalContent = msg.content || msg.message?.content
        if (Array.isArray(originalContent)) {
          const newContent = [...originalContent, ...additionalResults]
          if (msg.content) {
            return { ...msg, content: newContent }
          }
          if (msg.message?.content) {
            return { ...msg, message: { ...msg.message, content: newContent } }
          }
        }
      }
      return msg
    })
}

// ============================================================================
// Message Renderer - 气泡样式
// ============================================================================

const MessageRenderer: React.FC<{ message: ClaudeMessage }> = ({ message }) => {
  const [expanded, setExpanded] = useState(false)
  const role = message.message?.role || message.type
  const content = message.content || message.message?.content
  const isUser = role === 'user'

  const preview = useMemo(() => generatePreview(content), [content])

  // 优化1: 检查是否是用户确认消息（如 "✔ 执行结果"），如果是则跳过显示
  const isUserConfirmation = useMemo(() => {
    if (!isUser) return false
    return isUserConfirmationOnly(content)
  }, [isUser, content])

  // 检查是否有实际内容
  const hasContent = useMemo(() => {
    if (!content) return false

    // 字符串内容：必须有实际文本
    if (typeof content === 'string') {
      return content.trim().length > 0
    }

    // 数组内容：必须有实际内容项
    if (Array.isArray(content)) {
      // 先过滤掉 tool_result（它们应该在 tool_use 旁边显示，不应该作为独立消息）
      const nonToolResultItems = content.filter((item) => {
        if (!item) return false
        if (item.type === 'tool_result') return false
        return true
      })

      // 如果过滤后没有任何项，说明只有 tool_result，对于用户消息来说这是空消息
      if (nonToolResultItems.length === 0) {
        return false
      }

      // 检查剩余项是否有实际内容
      const nonEmptyItems = nonToolResultItems.filter((item) => {
        if (item.text?.trim()) return true
        if (item.thinking?.trim()) return true
        if (item.type === 'tool_use') return true
        return false
      })
      return nonEmptyItems.length > 0
    }

    return false
  }, [content])

  // 检查是否是纯文本消息（没有工具调用）
  const isSimpleText = useMemo(() => {
    if (!content) return false
    if (typeof content === 'string') return true
    if (Array.isArray(content)) {
      return content.every((item) => !item || item.type === 'text' || !item.type)
    }
    return false
  }, [content])

  // 计算内容长度，用于自动折叠
  const contentLength = useMemo(() => {
    if (typeof content === 'string') return content.length
    if (Array.isArray(content)) {
      return content.reduce((sum, item) => {
        if (item.text) return sum + item.text.length
        if (item.thinking) return sum + item.thinking.length
        return sum
      }, 0)
    }
    return 0
  }, [content])

  // 长内容默认折叠
  const shouldAutoCollapse = contentLength > 500

  // 如果没有内容，不渲染消息
  if (!hasContent) {
    return null
  }

  // 优化1: 如果是用户确认消息，不渲染（如 "✔ 执行结果"）
  if (isUserConfirmation) {
    return null
  }

  // 简单文本消息使用气泡样式
  if (isSimpleText) {
    return (
      <div className={`ch-bubble-message ${isUser ? 'user' : 'assistant'}`}>
        <div className="ch-bubble-content">
          {typeof content === 'string' ? (
            <MarkdownRenderer content={content} />
          ) : Array.isArray(content) ? (
            <>
              {content.map((item, idx) =>
                item.text ? <MarkdownRenderer key={idx} content={item.text} /> : null
              )}
            </>
          ) : null}
        </div>
        <div className="ch-bubble-time">{formatDateTime(message.timestamp)}</div>
      </div>
    )
  }

  // 复杂消息（包含工具调用等）
  const isExpanded = expanded || !shouldAutoCollapse

  return (
    <div className={`ch-complex-message ${isUser ? 'user' : 'assistant'}`}>
      <div className="ch-message-row">
        <div className="ch-message-role-badge">
          {isUser ? '👤' : <RobotIcon className="ch-robot-icon" />}
        </div>
        <div className="ch-message-body">
          {/* 预览（折叠时显示） */}
          {!isExpanded && preview && (
            <div
              className="ch-message-preview"
              onClick={() => setExpanded(true)}
              style={{ cursor: 'pointer' }}
            >
              {preview}
            </div>
          )}

          {/* 完整内容（展开时显示） */}
          {isExpanded && (
            <div className="ch-message-content">
              {typeof content === 'string' ? (
                <MarkdownRenderer content={content} />
              ) : Array.isArray(content) ? (
                <ContentArrayRenderer contents={content} />
              ) : null}
            </div>
          )}

          {/* 折叠控制 */}
          {shouldAutoCollapse && (
            <div className="ch-message-toggle" onClick={() => setExpanded(!expanded)}>
              <svg
                className={`ch-tool-chevron ${isExpanded ? 'expanded' : ''}`}
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
              <span>{isExpanded ? '收起' : '展开'}</span>
            </div>
          )}
        </div>
        <div className="ch-message-time">{formatDateTime(message.timestamp)}</div>
      </div>
    </div>
  )
}

// ============================================================================
// File Edit Item Component
// ============================================================================

const FileEditItem: React.FC<{ edit: FileEdit }> = ({ edit }) => {
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
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
          ) : (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
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
          {linesAdded > 0 && <span className="ch-stat-added">+{linesAdded}</span>}
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
          {copied ? '✓' : '📋'}
        </button>

        <svg
          className={`ch-edit-chevron ${expanded ? 'expanded' : ''}`}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
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
// Recent Edits Viewer
// ============================================================================

const RecentEditsViewer: React.FC<{ project: ClaudeProject }> = ({ project }) => {
  const [edits, setEdits] = useState<FileEdit[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    const loadEdits = async () => {
      setLoading(true)
      try {
        const result = await window.api.claudeHistory.getRecentEdits(project.encodedPath, 50, 0)
        setEdits(result.edits)
        setTotalCount(result.total_count)
        setHasMore(result.has_more)
      } catch (e) {
        console.error('Failed to load recent edits:', e)
      } finally {
        setLoading(false)
      }
    }
    loadEdits()
  }, [project.encodedPath])

  const filteredEdits = searchQuery
    ? edits.filter(
        (edit) =>
          edit.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
          edit.newContent.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : edits

  if (loading) {
    return (
      <div className="ch-loading">
        <div className="ch-spinner"></div>
      </div>
    )
  }

  return (
    <div className="ch-recent-edits">
      {/* Header */}
      <div className="ch-edits-header">
        <div className="ch-edits-title">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <h2>最近编辑</h2>
        </div>
        <div className="ch-edits-stats">
          <span>{totalCount} 个文件</span>
          <span className="ch-edits-badge">{edits.length} 次编辑</span>
        </div>
      </div>

      {/* Search */}
      <div className="ch-edits-search">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="搜索文件..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Edits List */}
      <div className="ch-edits-list">
        {filteredEdits.length === 0 ? (
          <div className="ch-empty">
            <div className="ch-empty-icon">📝</div>
            <div className="ch-empty-text">暂无编辑记录</div>
          </div>
        ) : (
          filteredEdits.map((edit, index) => (
            <FileEditItem key={`${edit.path}-${index}`} edit={edit} />
          ))
        )}
      </div>

      {hasMore && (
        <div className="ch-edits-more">
          <span>还有更多编辑记录...</span>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Session Board (Timeline View)
// ============================================================================

const SessionBoard: React.FC<{
  project: ClaudeProject
  onSessionClick: (session: ClaudeSession) => void
}> = ({ project, onSessionClick }) => {
  const [sessions, setSessions] = useState<ClaudeSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadSessions = async () => {
      setLoading(true)
      try {
        const data = await window.api.claudeHistory.getSessions(project.encodedPath)
        setSessions(data)
      } catch (e) {
        console.error('Failed to load sessions:', e)
      } finally {
        setLoading(false)
      }
    }
    loadSessions()
  }, [project.encodedPath])

  if (loading) {
    return (
      <div className="ch-loading">
        <div className="ch-spinner"></div>
      </div>
    )
  }

  // Group sessions by date
  const sessionsByDate: Record<string, ClaudeSession[]> = {}
  sessions.forEach((session) => {
    const date = session.lastMessageTime ? session.lastMessageTime.split('T')[0] : '未知日期'
    if (!sessionsByDate[date]) {
      sessionsByDate[date] = []
    }
    sessionsByDate[date].push(session)
  })

  const sortedDates = Object.keys(sessionsByDate).sort((a, b) => b.localeCompare(a))

  return (
    <div className="ch-session-board">
      {/* Header */}
      <div className="ch-board-header">
        <div className="ch-board-title">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <h2>会话面板</h2>
        </div>
        <div className="ch-board-stats">
          <span>{sessions.length} 个会话</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="ch-timeline">
        {sortedDates.map((date) => (
          <div key={date} className="ch-timeline-group">
            <div className="ch-timeline-date">
              <span className="ch-date-label">{date}</span>
              <span className="ch-date-count">{sessionsByDate[date].length} 会话</span>
            </div>
            <div className="ch-timeline-sessions">
              {sessionsByDate[date].map((session) => (
                <div key={session.id} className="ch-timeline-session">
                  <div className="ch-session-dot"></div>
                  <div
                    className="ch-session-card"
                    onClick={() => onSessionClick(session)}
                    title="点击查看会话详情"
                  >
                    <div className="ch-session-title">{session.preview || '空会话'}</div>
                    <div className="ch-session-details">
                      <span>{session.messageCount} 条消息</span>
                      <span>{formatTime(session.lastModified)}</span>
                      {session.hasToolUse && <span className="ch-badge tool">工具</span>}
                      {session.hasErrors && <span className="ch-badge error">错误</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {sessions.length === 0 && (
          <div className="ch-empty">
            <div className="ch-empty-icon">💬</div>
            <div className="ch-empty-text">暂无会话记录</div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Analytics Dashboard - 增强版
// ============================================================================

// 指标卡片组件
const MetricCard: React.FC<{
  icon: string
  label: string
  value: string
  trend?: number
  colorVariant: 'purple' | 'blue' | 'green' | 'amber'
}> = ({ icon, label, value, trend, colorVariant }) => {
  return (
    <div className={`ch-metric-card ch-metric-${colorVariant}`}>
      <div className="ch-metric-icon">{icon}</div>
      <div className="ch-metric-content">
        <div className="ch-metric-value">{value}</div>
        <div className="ch-metric-label">{label}</div>
        {trend !== undefined && (
          <div className={`ch-metric-trend ${trend >= 0 ? 'positive' : 'negative'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
    </div>
  )
}

// Token 分布环形图
const TokenDistributionChart: React.FC<{ distribution: TokenDistribution }> = ({
  distribution
}) => {
  const total =
    distribution.input + distribution.output + distribution.cache_creation + distribution.cache_read

  if (total === 0) {
    return <div className="ch-empty-chart">暂无数据</div>
  }

  const segments = [
    { key: 'input', label: '输入', value: distribution.input, color: '#007acc' },
    { key: 'output', label: '输出', value: distribution.output, color: '#89d185' },
    {
      key: 'cache_creation',
      label: '缓存创建',
      value: distribution.cache_creation,
      color: '#cca700'
    },
    { key: 'cache_read', label: '缓存读取', value: distribution.cache_read, color: '#b180d7' }
  ].filter((s) => s.value > 0)

  const radius = 70
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className="ch-token-distribution">
      <div className="ch-donut-chart">
        <svg viewBox="0 0 200 200">
          {segments.map((segment) => {
            const percentage = (segment.value / total) * 100
            const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`
            const strokeDashoffset = -offset
            offset += (percentage / 100) * circumference

            return (
              <circle
                key={segment.key}
                cx="100"
                cy="100"
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth="20"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                transform="rotate(-90 100 100)"
              />
            )
          })}
        </svg>
        <div className="ch-donut-center">
          <div className="ch-donut-total">{formatNumber(total)}</div>
          <div className="ch-donut-label">Total Tokens</div>
        </div>
      </div>
      <div className="ch-chart-legend">
        {segments.map((segment) => (
          <div key={segment.key} className="ch-legend-item">
            <span className="ch-legend-color" style={{ backgroundColor: segment.color }} />
            <span className="ch-legend-label">{segment.label}</span>
            <span className="ch-legend-value">
              {formatNumber(segment.value)} ({((segment.value / total) * 100).toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// 活动热力图
const ActivityHeatmapChart: React.FC<{ data: ActivityHeatmap[] }> = ({ data }) => {
  const DAYS = ['日', '一', '二', '三', '四', '五', '六']
  const HOURS = Array.from({ length: 24 }, (_, i) => i)
  const maxActivity = Math.max(...data.map((d) => d.activity_count), 1)

  const getHeatColor = (intensity: number): string => {
    if (intensity === 0) return '#1e1e1e'
    const hue = 200 - intensity * 160
    const lightness = 30 + intensity * 20
    return `hsl(${hue}, 70%, ${lightness}%)`
  }

  return (
    <div className="ch-activity-heatmap">
      <div className="ch-heatmap-days">
        {DAYS.map((day) => (
          <div key={day} className="ch-heatmap-day-label">
            {day}
          </div>
        ))}
      </div>
      <div className="ch-heatmap-grid">
        {DAYS.map((_, dayIndex) => (
          <div key={dayIndex} className="ch-heatmap-row">
            {HOURS.map((hour) => {
              const activity = data.find((d) => d.day === dayIndex && d.hour === hour)
              const count = activity?.activity_count || 0
              const intensity = count / maxActivity

              return (
                <div
                  key={`${dayIndex}-${hour}`}
                  className="ch-heatmap-cell"
                  style={{ backgroundColor: getHeatColor(intensity) }}
                  title={`${DAYS[dayIndex]} ${hour}:00 - ${count} 条消息`}
                />
              )
            })}
          </div>
        ))}
      </div>
      <div className="ch-heatmap-hours">
        {HOURS.filter((h) => h % 6 === 0).map((hour) => (
          <div key={hour} className="ch-heatmap-hour-label">
            {hour}:00
          </div>
        ))}
      </div>
      <div className="ch-heatmap-legend">
        <span>少</span>
        <div className="ch-legend-scale">
          {[0, 0.25, 0.5, 0.75, 1].map((i, idx) => (
            <div
              key={idx}
              className="ch-legend-block"
              style={{ backgroundColor: getHeatColor(i) }}
            />
          ))}
        </div>
        <span>多</span>
      </div>
    </div>
  )
}

// 每日趋势图
const DailyTrendChart: React.FC<{ data: DailyStats[] }> = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="ch-empty-chart">暂无趋势数据</div>
  }

  const maxTokens = Math.max(...data.map((d) => d.total_tokens), 1)
  const chartWidth = Math.max(data.length * 30, 300)

  return (
    <div className="ch-daily-trend">
      <svg
        viewBox={`0 0 ${chartWidth} 150`}
        className="ch-trend-chart"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* 折线 */}
        <polyline
          fill="none"
          stroke="#007acc"
          strokeWidth="2"
          points={data
            .map((d, i) => {
              const x = (i / Math.max(data.length - 1, 1)) * (chartWidth - 40) + 20
              const y = 130 - (d.total_tokens / maxTokens) * 100
              return `${x},${y}`
            })
            .join(' ')}
        />
        {/* 数据点 */}
        {data.map((d, i) => {
          const x = (i / Math.max(data.length - 1, 1)) * (chartWidth - 40) + 20
          const y = 130 - (d.total_tokens / maxTokens) * 100

          return (
            <g key={d.date}>
              <circle cx={x} cy={y} r="4" fill="#007acc" />
              <text x={x} y="145" textAnchor="middle" className="ch-chart-label" fontSize="10">
                {new Date(d.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="ch-trend-legend">
        <span>🔵 Token 数量</span>
      </div>
    </div>
  )
}

const AnalyticsDashboard: React.FC = () => {
  const [stats, setStats] = useState<GlobalStatsSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await window.api.claudeHistory.getGlobalStats()
        setStats(data)
      } catch (e) {
        console.error('Failed to load global stats:', e)
      } finally {
        setLoading(false)
      }
    }
    loadStats()
  }, [])

  if (loading) {
    return (
      <div className="ch-loading">
        <div className="ch-spinner"></div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="ch-empty">
        <div className="ch-empty-icon">📊</div>
        <div className="ch-empty-text">暂无统计数据</div>
      </div>
    )
  }

  const maxToolCount = Math.max(...stats.most_used_tools.map((t) => t.usage_count), 1)

  return (
    <div className="ch-dashboard-content">
      {/* 顶部指标卡片行 */}
      <div className="ch-metrics-row">
        <MetricCard
          icon="💬"
          label="总消息数"
          value={formatNumber(stats.total_messages)}
          colorVariant="purple"
        />
        <MetricCard
          icon="🎯"
          label="总 Tokens"
          value={formatNumber(stats.total_tokens)}
          colorVariant="blue"
        />
        <MetricCard
          icon="📁"
          label="总项目数"
          value={formatNumber(stats.total_projects)}
          colorVariant="green"
        />
        <MetricCard
          icon="📋"
          label="总会话数"
          value={formatNumber(stats.total_sessions)}
          colorVariant="amber"
        />
      </div>

      {/* 时间跨度 */}
      {stats.date_range.first_message && (
        <div className="ch-chart-container">
          <div className="ch-chart-title">📅 时间跨度</div>
          <div style={{ color: 'var(--ch-text-secondary)', fontSize: '13px' }}>
            {new Date(stats.date_range.first_message).toLocaleDateString('zh-CN')} -{' '}
            {stats.date_range.last_message
              ? new Date(stats.date_range.last_message).toLocaleDateString('zh-CN')
              : '现在'}
            <span style={{ marginLeft: '12px', color: 'var(--ch-text-tertiary)' }}>
              ({stats.date_range.days_span} 天)
            </span>
          </div>
        </div>
      )}

      {/* 双列布局 */}
      <div className="ch-stats-grid-2col">
        {/* 左列：Token 分布 */}
        <div className="ch-chart-card">
          <h4>Token 分布</h4>
          <TokenDistributionChart distribution={stats.token_distribution} />
        </div>

        {/* 右列：工具使用排行 */}
        <div className="ch-chart-card">
          <h4>常用工具</h4>
          <div className="ch-tool-list">
            {stats.most_used_tools.slice(0, 8).map((tool) => (
              <div key={tool.tool_name} className="ch-tool-item">
                <span className="ch-tool-name">{tool.tool_name}</span>
                <div className="ch-tool-bar">
                  <div
                    className="ch-tool-bar-fill"
                    style={{ width: `${(tool.usage_count / maxToolCount) * 100}%` }}
                  />
                </div>
                <span className="ch-tool-count">{formatNumber(tool.usage_count)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 活动热力图 */}
      {stats.activity_heatmap.length > 0 && (
        <div className="ch-chart-card">
          <h4>活动热力图</h4>
          <ActivityHeatmapChart data={stats.activity_heatmap} />
        </div>
      )}

      {/* 每日趋势 */}
      {stats.daily_stats.length > 0 && (
        <div className="ch-chart-card">
          <h4>每日趋势</h4>
          <DailyTrendChart data={stats.daily_stats} />
        </div>
      )}

      {/* 活跃项目 */}
      <div className="ch-chart-container">
        <div className="ch-chart-title">🏆 活跃项目</div>
        <div className="ch-tool-list">
          {stats.top_projects.slice(0, 5).map((project, index) => (
            <div key={project.project_name} className="ch-tool-item">
              <span className="ch-tool-name" style={{ width: '200px' }}>
                {index + 1}. {project.project_name}
              </span>
              <span style={{ color: 'var(--ch-text-tertiary)', fontSize: '12px' }}>
                {project.sessions} 会话
              </span>
              <span className="ch-tool-count">{formatNumber(project.tokens)} tokens</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Full Screen Modal (优化后：全屏覆盖，移除拖拽调整)
// ============================================================================

const FullScreenModal: React.FC<{
  children: React.ReactNode
  onClose: () => void
  title: string
}> = ({ children, onClose, title }) => {
  // 按 ESC 键关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="ch-sidebar-overlay-container">
      <div className="ch-overlay-backdrop" onClick={onClose} />
      <div className="ch-overlay-content" onClick={(e) => e.stopPropagation()}>
        <div className="ch-modal-header">
          <h2>{title}</h2>
          <div className="ch-modal-actions">
            <span className="ch-modal-hint">按 ESC 关闭</span>
            <button className="ch-modal-close" onClick={onClose}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {children}
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

const ClaudeHistory: React.FC<Props> = ({ onClose: _onClose }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('projects')
  const [projects, setProjects] = useState<ClaudeProject[]>([])
  const [sessions, setSessions] = useState<ClaudeSession[]>([])
  const [messages, setMessages] = useState<ClaudeMessage[]>([])
  const [selectedProject, setSelectedProject] = useState<ClaudeProject | null>(null)
  const [selectedSession, setSelectedSession] = useState<ClaudeSession | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<
    {
      session: ClaudeSession
      matchingMessages: ClaudeMessage[]
    }[]
  >([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAvailable, setIsAvailable] = useState(false)
  const [activeTab, setActiveTab] = useState<MainTab>('history')

  // Check availability
  useEffect(() => {
    const checkAvailability = async () => {
      try {
        const info = await window.api.claudeHistory.detect()
        setIsAvailable(info.isAvailable)
        if (info.isAvailable) {
          loadProjects()
        }
      } catch (e) {
        console.error('Failed to detect Claude history:', e)
      }
    }
    checkAvailability()
  }, [])

  // Listen for changes
  useEffect(() => {
    const unsubscribe = window.api.claudeHistory.onChanged(() => {
      if (activeTab === 'history') {
        if (viewMode === 'projects') loadProjects()
        else if (viewMode === 'sessions' && selectedProject)
          loadSessions(selectedProject.encodedPath)
      }
    })
    return unsubscribe
  }, [activeTab, viewMode, selectedProject])

  const loadProjects = async () => {
    setIsLoading(true)
    try {
      const data = await window.api.claudeHistory.getProjects()
      setProjects(data)
    } catch (e) {
      console.error('Failed to load projects:', e)
    } finally {
      setIsLoading(false)
    }
  }

  const loadSessions = async (encodedPath: string) => {
    setIsLoading(true)
    try {
      const data = await window.api.claudeHistory.getSessions(encodedPath)
      setSessions(data)
    } catch (e) {
      console.error('Failed to load sessions:', e)
    } finally {
      setIsLoading(false)
    }
  }

  const loadMessages = async (sessionId: string, encodedPath: string) => {
    setIsLoading(true)
    try {
      const data = await window.api.claudeHistory.getMessages(sessionId, encodedPath, 0, 1000)
      setMessages(data.messages)
    } catch (e) {
      console.error('Failed to load messages:', e)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return

    setIsLoading(true)
    setViewMode('search')
    try {
      const results = await window.api.claudeHistory.search(searchQuery, 20)
      setSearchResults(results)
    } catch (e) {
      console.error('Search failed:', e)
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery])

  const handleProjectClick = (project: ClaudeProject) => {
    setSelectedProject(project)
    loadSessions(project.encodedPath)
    setViewMode('sessions')
  }

  const handleSessionClick = (session: ClaudeSession) => {
    setSelectedSession(session)
    if (selectedProject) {
      loadMessages(session.id, selectedProject.encodedPath)
    }
    setViewMode('messages')
  }

  const handleBack = () => {
    if (viewMode === 'messages') {
      setViewMode('sessions')
      setMessages([])
      setSelectedSession(null)
    } else if (
      viewMode === 'sessions' ||
      viewMode === 'recentEdits' ||
      viewMode === 'sessionBoard'
    ) {
      setViewMode('projects')
      setSessions([])
      setSelectedProject(null)
    } else if (viewMode === 'search') {
      setViewMode('projects')
      setSearchResults([])
      setSearchQuery('')
    }
  }

  if (!isAvailable) {
    return (
      <div className="ch-empty">
        <div className="ch-empty-icon">📁</div>
        <div className="ch-empty-text">未检测到 Claude Code 历史记录</div>
        <div style={{ fontSize: '12px', marginTop: '8px', color: 'var(--ch-text-tertiary)' }}>
          请先使用 Claude Code CLI 进行对话
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Tabs */}
      <div className="ch-tabs">
        <button
          className={`ch-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('history')
            setViewMode('projects')
          }}
        >
          对话历史
        </button>
        <button
          className={`ch-tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          分析仪表板
        </button>
      </div>

      {activeTab === 'analytics' ? (
        <AnalyticsDashboard />
      ) : (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Sidebar - Projects/Sessions */}
          <div className="ch-sidebar">
            <div className="ch-sidebar-header">
              <h3>
                {viewMode === 'projects'
                  ? '项目列表'
                  : viewMode === 'sessions'
                    ? '会话列表'
                    : viewMode === 'recentEdits'
                      ? '最近编辑'
                      : viewMode === 'sessionBoard'
                        ? '会话面板'
                        : '搜索结果'}
              </h3>
              {viewMode !== 'projects' && (
                <button
                  onClick={handleBack}
                  style={{
                    background: 'var(--ch-bg-tertiary)',
                    border: 'none',
                    color: 'var(--ch-text-secondary)',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    marginTop: '8px'
                  }}
                >
                  ← 返回
                </button>
              )}
              {viewMode === 'projects' && selectedProject && (
                <div className="ch-project-actions">
                  <button
                    className="ch-action-btn"
                    onClick={() => setViewMode('recentEdits')}
                    title="查看最近编辑"
                  >
                    📝 编辑
                  </button>
                  <button
                    className="ch-action-btn"
                    onClick={() => setViewMode('sessionBoard')}
                    title="查看会话面板"
                  >
                    📋 面板
                  </button>
                </div>
              )}
              {viewMode === 'projects' && (
                <input
                  type="text"
                  className="ch-search-input"
                  placeholder="搜索对话..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  style={{ marginTop: '8px' }}
                />
              )}
            </div>

            {isLoading ? (
              <div className="ch-loading">
                <div className="ch-spinner"></div>
              </div>
            ) : (
              <>
                {viewMode === 'projects' && (
                  <div className="ch-project-list">
                    {projects.map((project) => (
                      <div
                        key={project.encodedPath}
                        className={`ch-project-item ${selectedProject?.encodedPath === project.encodedPath ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedProject(project)
                        }}
                        onDoubleClick={() => handleProjectClick(project)}
                      >
                        <div className="ch-project-icon">
                          {project.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="ch-project-info">
                          <div className="ch-project-name">{project.name}</div>
                          <div className="ch-project-meta">
                            {project.sessionCount} 会话 · {formatTime(project.lastModified)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {viewMode === 'sessions' && (
                  <div className="ch-session-list">
                    {sessions.map((session) => (
                      <div
                        key={session.id}
                        className={`ch-session-item ${selectedSession?.id === session.id ? 'active' : ''}`}
                        onClick={() => handleSessionClick(session)}
                      >
                        <div className="ch-session-preview">{session.preview || '空会话'}</div>
                        <div className="ch-session-meta">
                          <span>{session.messageCount} 条消息</span>
                          <span>{formatTime(session.lastModified)}</span>
                          {session.hasToolUse && (
                            <span className="ch-session-badge tool-use">工具</span>
                          )}
                          {session.hasErrors && (
                            <span className="ch-session-badge errors">错误</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {viewMode === 'search' && (
                  <div className="ch-session-list">
                    {searchResults.map((result) => (
                      <div
                        key={result.session.id}
                        className="ch-session-item"
                        onClick={() => {
                          setSelectedSession(result.session)
                          setMessages(result.matchingMessages as ClaudeMessage[])
                          setViewMode('messages')
                        }}
                      >
                        <div className="ch-session-preview">
                          {result.session.preview || '搜索结果'}
                        </div>
                        <div className="ch-session-meta">
                          <span>{result.session.projectName}</span>
                          <span>{result.matchingMessages.length} 条匹配</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Main Content */}
          <div className="ch-message-viewer">
            {viewMode === 'messages' ? (
              isLoading ? (
                <div className="ch-loading">
                  <div className="ch-spinner"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="ch-empty">
                  <div className="ch-empty-icon">💬</div>
                  <div className="ch-empty-text">暂无消息</div>
                </div>
              ) : (
                <div className="ch-message-list ch-fade-in">
                  {associateToolResultsAcrossMessages(messages).map((msg) => (
                    <MessageRenderer key={msg.uuid} message={msg} />
                  ))}
                </div>
              )
            ) : viewMode === 'recentEdits' && selectedProject ? (
              <RecentEditsViewer project={selectedProject} />
            ) : viewMode === 'sessionBoard' && selectedProject ? (
              <SessionBoard project={selectedProject} onSessionClick={handleSessionClick} />
            ) : (
              <div className="ch-empty">
                <div className="ch-empty-icon">👈</div>
                <div className="ch-empty-text">选择一个项目开始浏览</div>
                <div className="ch-empty-hint">单击选择项目，双击进入会话列表</div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

// ============================================================================
// Export Wrapper
// ============================================================================

export const ClaudeHistoryModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <FullScreenModal onClose={onClose} title="Claude Code 历史记录">
      <ClaudeHistory onClose={onClose} />
    </FullScreenModal>
  )
}

export default ClaudeHistory
