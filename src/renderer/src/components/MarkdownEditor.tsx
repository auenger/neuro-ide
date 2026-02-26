import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAppStore } from '../store/appStore'
import Toast from './Toast'
import './MarkdownEditor.css'

type EditorTab = 'prompt' | 'init'

const MarkdownEditor = ({
  isCollapsed,
  onToggleCollapse
}: {
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}) => {
  const {
    sessions,
    activeSessionId,
    markdownViewMode,
    setMarkdownViewMode,
    updateRole,
    setCheckUnsavedChanges
  } = useAppStore()

  const activeSession = sessions.find((s) => s.id === activeSessionId)

  // Editor tab state
  const [editorTab, setEditorTab] = useState<EditorTab>('prompt')

  // Prompt editor state
  const [markdown, setMarkdown] = useState(activeSession?.prompt || '')
  const [isPromptSaved, setIsPromptSaved] = useState(true)

  // Init commands editor state
  const [initCommands, setInitCommands] = useState<string>(
    activeSession?.initCommands?.join('\n') || ''
  )
  const [stopOnFailure, setStopOnFailure] = useState(activeSession?.stopOnFailure ?? true)
  const [isInitSaved, setIsInitSaved] = useState(true)

  // Combined unsaved state
  const isSaved = isPromptSaved && isInitSaved

  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'info' | 'warning'
  } | null>(null)

  // Register unsaved changes check
  useEffect(() => {
    const checkUnsaved = async () => {
      if (!isSaved) {
        return window.confirm('有未保存的更改，是否放弃更改并切换角色？')
      }
      return true
    }
    setCheckUnsavedChanges(checkUnsaved)
    return () => setCheckUnsavedChanges(null)
  }, [isSaved, setCheckUnsavedChanges])

  // Update state when session changes
  useEffect(() => {
    if (activeSession) {
      setMarkdown(activeSession.prompt)
      setInitCommands(activeSession.initCommands?.join('\n') || '')
      setStopOnFailure(activeSession.stopOnFailure ?? true)
      setIsPromptSaved(true)
      setIsInitSaved(true)
    }
  }, [activeSessionId, activeSession])

  // Prompt handlers
  const handleMarkdownChange = (value: string) => {
    setMarkdown(value)
    setIsPromptSaved(false)
  }

  // Init commands handlers
  const handleInitCommandsChange = (value: string) => {
    setInitCommands(value)
    setIsInitSaved(false)
  }

  const handleStopOnFailureChange = (value: boolean) => {
    setStopOnFailure(value)
    setIsInitSaved(false)
  }

  // Save handler
  const handleSave = () => {
    if (activeSession) {
      const updates: any = {}

      if (!isPromptSaved) {
        updates.prompt = markdown
      }

      if (!isInitSaved) {
        updates.initCommands = initCommands
          .split('\n')
          .map((cmd) => cmd.trim())
          .filter((cmd) => cmd.length > 0)
        updates.stopOnFailure = stopOnFailure
      }

      if (Object.keys(updates).length > 0) {
        updateRole(activeSession.id, updates)
        setIsPromptSaved(true)
        setIsInitSaved(true)
        setToast({ message: '保存成功', type: 'success' })
      }
    }
  }

  const handleCopy = async () => {
    try {
      if (editorTab === 'prompt') {
        await navigator.clipboard.writeText(markdown)
      } else {
        // For init tab, copy the generated script
        const commands = initCommands
          .split('\n')
          .map((cmd) => cmd.trim())
          .filter((cmd) => cmd.length > 0)
        const connector = stopOnFailure ? ' && ' : ' ; '
        const script = commands.join(connector)
        await navigator.clipboard.writeText(script)
      }
      setToast({ message: '已复制到剪贴板', type: 'success' })
    } catch (err) {
      console.error('Failed to copy:', err)
      setToast({ message: '复制失败', type: 'warning' })
    }
  }

  const handleInit = async () => {
    try {
      // Generate init script
      const commands = initCommands
        .split('\n')
        .map((cmd) => cmd.trim())
        .filter((cmd) => cmd.length > 0)

      if (commands.length === 0) {
        setToast({ message: '没有配置初始化命令', type: 'warning' })
        return
      }

      const connector = stopOnFailure ? ' && ' : ' ; '
      const initScript = commands.join(connector)

      // Copy to clipboard
      await navigator.clipboard.writeText(initScript)

      // Get active terminal ID
      const activeTerminalId = activeSession?.activeTerminalId

      if (activeTerminalId) {
        // Send to terminal with auto enter
        window.api.session.input(activeTerminalId, initScript + '\r')
        setToast({ message: '已发送到终端', type: 'success' })
      } else {
        setToast({ message: '已复制，但未找到活跃终端', type: 'warning' })
      }
    } catch (err) {
      console.error('Failed to init:', err)
      setToast({ message: '发送失败', type: 'warning' })
    }
  }

  return (
    <div className="markdown-editor">
      <div className="editor-header">
        <div className="editor-title stage-title">
          <h4>ROLE</h4>
          {activeSession && <span className="role-badge">{activeSession.name}</span>}
          {!isSaved && <span className="unsaved-indicator">●</span>}
        </div>
        <div className="editor-actions">
          {/* Editor tab switcher */}
          <div className="editor-tab-switcher">
            <button
              className={`tab ${editorTab === 'prompt' ? 'active' : ''}`}
              onClick={() => setEditorTab('prompt')}
              title="系统提示词"
            >
              Prompt
            </button>
            <button
              className={`tab ${editorTab === 'init' ? 'active' : ''}`}
              onClick={() => setEditorTab('init')}
              title="终端初始化"
            >
              初始化
            </button>
          </div>

          {/* Prompt view mode tabs - only show when on prompt tab */}
          {editorTab === 'prompt' && (
            <div className="view-mode-tabs">
              <button
                className={`tab ${markdownViewMode === 'source' ? 'active' : ''}`}
                onClick={() => setMarkdownViewMode('source')}
                title="源码模式"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="16 18 22 12 16 6"></polyline>
                  <polyline points="8 6 2 12 8 18"></polyline>
                </svg>
                源码
              </button>
              <button
                className={`tab ${markdownViewMode === 'preview' ? 'active' : ''}`}
                onClick={() => setMarkdownViewMode('preview')}
                title="预览模式"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                预览
              </button>
              <button
                className={`tab ${markdownViewMode === 'split' ? 'active' : ''}`}
                onClick={() => setMarkdownViewMode('split')}
                title="分栏模式"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="12" y1="3" x2="12" y2="21"></line>
                </svg>
                分栏
              </button>
            </div>
          )}

          <div className="action-buttons">
            <button
              className="btn-icon"
              onClick={handleCopy}
              title={editorTab === 'prompt' ? '复制 Markdown' : '复制脚本'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
            {editorTab === 'init' && (
              <button className="btn-icon" onClick={handleInit} title="执行初始化">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
              </button>
            )}
            <button
              className={`btn-icon ${!isSaved ? 'unsaved' : ''}`}
              onClick={handleSave}
              title="保存"
              disabled={isSaved}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
              </svg>
            </button>
            {onToggleCollapse && (
              <button
                className="btn-icon"
                onClick={onToggleCollapse}
                title={isCollapsed ? '展开编辑器' : '折叠编辑器'}
              >
                {isCollapsed ? (
                  <svg viewBox="0 0 16 16" fill="currentColor">
                    <path d="M3.72 7.47a.75.75 0 0 1 1.06 0L8 10.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-3.75 3.75a.75.75 0 0 1-1.06 0L3.72 8.53a.75.75 0 0 1 0-1.06Z"></path>
                  </svg>
                ) : (
                  <svg viewBox="0 0 16 16" fill="currentColor">
                    <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"></path>
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {!isCollapsed && (
        <div className="editor-content">
          {editorTab === 'prompt' ? (
            // Prompt Editor
            <>
              {(markdownViewMode === 'source' || markdownViewMode === 'split') && (
                <div className="editor-pane">
                  <textarea
                    value={markdown}
                    onChange={(e) => handleMarkdownChange(e.target.value)}
                    placeholder="在此编写 Markdown..."
                    spellCheck={false}
                  />
                </div>
              )}
              {(markdownViewMode === 'preview' || markdownViewMode === 'split') && (
                <div className="preview-pane">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
                </div>
              )}
            </>
          ) : (
            // Init Commands Editor
            <div className="init-commands-editor">
              <div className="init-commands-textarea-wrapper">
                <textarea
                  value={initCommands}
                  onChange={(e) => handleInitCommandsChange(e.target.value)}
                  placeholder="每行一条命令，例如：&#10;nvm use 20&#10;claude --dangerously-skip-permissions"
                  spellCheck={false}
                />
              </div>
              <div className="init-commands-sidebar">
                <div className="sidebar-section">
                  <div className="sidebar-label">执行选项</div>
                  <div
                    className="toggle-switch-wrapper"
                    onClick={() => handleStopOnFailureChange(!stopOnFailure)}
                  >
                    <div className={`toggle-switch ${stopOnFailure ? 'checked' : ''}`}>
                      <div className="toggle-knob"></div>
                    </div>
                    <span>失败后停止</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Toast Notification */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

export default MarkdownEditor
