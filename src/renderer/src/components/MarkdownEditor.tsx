import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAppStore, InitCommand } from '../store/appStore'
import Toast from './Toast'
import './MarkdownEditor.css'

type EditorTab = 'prompt' | 'init'

// Generate unique ID for init commands
const generateCommandId = () => `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

// Create default empty command
const createEmptyCommand = (): InitCommand => ({
  id: generateCommandId(),
  command: '',
  delay: 1,
  groupWithNext: false
})

// Convert legacy string[] format to new InitCommand[] format
const normalizeInitCommands = (commands: any): InitCommand[] => {
  if (!commands || !Array.isArray(commands)) return []

  // Check if it's the new format (array of objects with 'command' property)
  if (commands.length > 0 && typeof commands[0] === 'object' && 'command' in commands[0]) {
    return commands as InitCommand[]
  }

  // Convert legacy string[] format to new format
  return (commands as string[])
    .filter((cmd) => typeof cmd === 'string' && cmd.trim().length > 0)
    .map((cmd) => ({
      id: generateCommandId(),
      command: cmd,
      delay: 1,
      groupWithNext: false
    }))
}

// Sortable Command Item Component
const SortableCommandItem = ({
  cmd,
  index,
  executingIndex,
  initCommands,
  onUpdate,
  onRemove,
  isDragging
}: {
  cmd: InitCommand
  index: number
  executingIndex: number | null
  initCommands: InitCommand[]
  onUpdate: (id: string, field: keyof InitCommand, value: any) => void
  onRemove: (id: string) => void
  isDragging: boolean
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition
  } = useSortable({ id: cmd.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  const isExecutingThis =
    executingIndex !== null &&
    index >= executingIndex &&
    (index === executingIndex || initCommands.slice(executingIndex, index).every((c) => c.groupWithNext))

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`init-command-item ${isExecutingThis ? 'executing' : ''} ${isDragging ? 'dragging' : ''}`}
    >
      {/* Drag handle */}
      <div className="col-drag" {...attributes} {...listeners}>
        <svg viewBox="0 0 24 24" fill="currentColor" className="drag-handle">
          <circle cx="9" cy="6" r="1.5" />
          <circle cx="15" cy="6" r="1.5" />
          <circle cx="9" cy="12" r="1.5" />
          <circle cx="15" cy="12" r="1.5" />
          <circle cx="9" cy="18" r="1.5" />
          <circle cx="15" cy="18" r="1.5" />
        </svg>
      </div>

      <div className="col-command">
        <input
          type="text"
          value={cmd.command}
          onChange={(e) => onUpdate(cmd.id, 'command', e.target.value)}
          placeholder="输入命令..."
          spellCheck={false}
        />
      </div>

      <div className="col-delay">
        <input
          type="number"
          value={cmd.delay}
          onChange={(e) => onUpdate(cmd.id, 'delay', parseFloat(e.target.value) || 0)}
          min="0"
          max="60"
          step="0.5"
        />
        <button
          className={`btn-instant ${cmd.delay === 0 ? 'active' : ''}`}
          onClick={() => onUpdate(cmd.id, 'delay', 0)}
          title="无延迟"
        >
          0s
        </button>
      </div>

      <div className="col-group">
        <div
          className={`toggle-switch-small ${cmd.groupWithNext ? 'checked' : ''}`}
          onClick={() => onUpdate(cmd.id, 'groupWithNext', !cmd.groupWithNext)}
          title="与下一条命令连续执行 (用 && 连接)"
        >
          <div className="toggle-knob-small"></div>
        </div>
      </div>

      <div className="col-actions">
        <button
          className="btn-small btn-danger"
          onClick={() => onRemove(cmd.id)}
          title="删除"
        >
          ×
        </button>
      </div>
    </div>
  )
}

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

  // Init commands editor state - normalize legacy format
  const [initCommands, setInitCommands] = useState<InitCommand[]>(
    normalizeInitCommands(activeSession?.initCommands)
  )
  const [isInitSaved, setIsInitSaved] = useState(true)

  // Combined unsaved state
  const isSaved = isPromptSaved && isInitSaved

  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'info' | 'warning'
  } | null>(null)

  // Execution state
  const [isExecuting, setIsExecuting] = useState(false)
  const [executingIndex, setExecutingIndex] = useState<number | null>(null)

  // Dragging state
  const [draggingId, setDraggingId] = useState<string | null>(null)

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

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
      setInitCommands(normalizeInitCommands(activeSession.initCommands))
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
  const handleAddCommand = () => {
    setInitCommands([...initCommands, createEmptyCommand()])
    setIsInitSaved(false)
  }

  const handleRemoveCommand = (id: string) => {
    setInitCommands(initCommands.filter((cmd) => cmd.id !== id))
    setIsInitSaved(false)
  }

  const handleUpdateCommand = (id: string, field: keyof InitCommand, value: any) => {
    setInitCommands(
      initCommands.map((cmd) => (cmd.id === id ? { ...cmd, [field]: value } : cmd))
    )
    setIsInitSaved(false)
  }

  // DnD handlers
  const handleDragStart = (event: DragStartEvent) => {
    setDraggingId(String(event.active.id))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setDraggingId(null)

    if (over && active.id !== over.id) {
      const oldIndex = initCommands.findIndex((cmd) => cmd.id === String(active.id))
      const newIndex = initCommands.findIndex((cmd) => cmd.id === String(over.id))
      setInitCommands(arrayMove(initCommands, oldIndex, newIndex))
      setIsInitSaved(false)
    }
  }

  // Save handler
  const handleSave = () => {
    if (activeSession) {
      const updates: any = {}

      if (!isPromptSaved) {
        updates.prompt = markdown
      }

      if (!isInitSaved) {
        // Filter out empty commands before saving
        updates.initCommands = initCommands.filter((cmd) => cmd?.command?.trim()?.length > 0)
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
        const script = generateExecutionScript()
        await navigator.clipboard.writeText(script)
      }
      setToast({ message: '已复制到剪贴板', type: 'success' })
    } catch (err) {
      console.error('Failed to copy:', err)
      setToast({ message: '复制失败', type: 'warning' })
    }
  }

  // Generate execution script for display - with line breaks for delays
  const generateExecutionScript = (): string => {
    const validCommands = initCommands.filter((cmd) => cmd?.command?.trim()?.length > 0)
    if (validCommands.length === 0) return ''

    const lines: string[] = []
    let currentGroup: string[] = []

    validCommands.forEach((cmd, index) => {
      currentGroup.push(cmd.command)
      if (!cmd.groupWithNext || index === validCommands.length - 1) {
        // Join group with &&, add delay annotation if needed
        const groupScript = currentGroup.join(' && ')
        const delayAnnotation = cmd.delay > 0 ? `  # wait ${cmd.delay}s` : ''
        lines.push(groupScript + delayAnnotation)
        currentGroup = []
      }
    })

    return lines.join('\n')
  }

  // Execute commands with delays
  const handleInit = async () => {
    const validCommands = initCommands.filter((cmd) => cmd?.command?.trim()?.length > 0)

    if (validCommands.length === 0) {
      setToast({ message: '没有配置初始化命令', type: 'warning' })
      return
    }

    const activeTerminalId = activeSession?.activeTerminalId
    if (!activeTerminalId) {
      setToast({ message: '未找到活跃终端', type: 'warning' })
      return
    }

    setIsExecuting(true)

    // Group commands: consecutive commands with groupWithNext=true are executed together
    const groups: { commands: string[]; delay: number; originalIndex: number }[] = []
    let currentGroup: string[] = []
    let groupStartIndex = 0

    validCommands.forEach((cmd, index) => {
      if (currentGroup.length === 0) {
        groupStartIndex = index
      }
      currentGroup.push(cmd.command)

      if (!cmd.groupWithNext || index === validCommands.length - 1) {
        // Get the delay from the last command in the group
        const lastCmd = validCommands[index]
        groups.push({
          commands: currentGroup,
          delay: lastCmd.delay || 0,
          originalIndex: groupStartIndex
        })
        currentGroup = []
      }
    })

    try {
      for (let i = 0; i < groups.length; i++) {
        const group = groups[i]
        setExecutingIndex(group.originalIndex)

        // Join commands in group with &&
        const script = group.commands.join(' && ')

        // Send to terminal
        window.api.session.input(activeTerminalId, script + '\r')

        // Wait for delay (if not the last group)
        if (group.delay > 0 && i < groups.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, group.delay * 1000))
        }
      }

      setToast({ message: '初始化命令执行完成', type: 'success' })
    } catch (err) {
      console.error('Failed to execute init commands:', err)
      setToast({ message: '执行失败', type: 'warning' })
    } finally {
      setIsExecuting(false)
      setExecutingIndex(null)
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
              <button
                className={`btn-icon ${isExecuting ? 'executing' : ''}`}
                onClick={handleInit}
                title="执行初始化"
                disabled={isExecuting}
              >
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
            // Init Commands Editor - New List-based UI with DnD
            <div className="init-commands-editor-v2">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <div className="init-commands-list">
                  {/* Header */}
                  <div className="init-commands-header">
                    <div className="col-drag"></div>
                    <div className="col-command">命令</div>
                    <div className="col-delay">延迟</div>
                    <div className="col-group">连续</div>
                    <div className="col-actions">操作</div>
                  </div>

                  {/* Command items with DnD */}
                  <SortableContext
                    items={initCommands.map((cmd) => cmd.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="init-commands-items">
                      {initCommands.map((cmd, index) => (
                        <SortableCommandItem
                          key={cmd.id}
                          cmd={cmd}
                          index={index}
                          executingIndex={executingIndex}
                          initCommands={initCommands}
                          onUpdate={handleUpdateCommand}
                          onRemove={handleRemoveCommand}
                          isDragging={draggingId === cmd.id}
                        />
                      ))}
                    </div>
                  </SortableContext>

                  {/* Add button */}
                  <button className="btn-add-command" onClick={handleAddCommand}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    添加命令
                  </button>
                </div>
              </DndContext>

              {/* Preview panel */}
              <div className="init-commands-preview">
                <div className="preview-label">执行预览:</div>
                <div className="preview-content">
                  {initCommands.filter((c) => c?.command?.trim()).length > 0 ? (
                    <pre>{generateExecutionScript()}</pre>
                  ) : (
                    <span className="preview-empty">暂无命令</span>
                  )}
                </div>
                <div className="preview-help">
                  <p>
                    <strong>拖拽</strong>: 拖动左侧手柄调整顺序
                  </p>
                  <p>
                    <strong>0s</strong>: 快速设置为无延迟
                  </p>
                  <p>
                    <strong>连续</strong>: 与下一条命令用 <code>&&</code> 连接
                  </p>
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
