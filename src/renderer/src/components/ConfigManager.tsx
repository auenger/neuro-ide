import { useState, useEffect, useRef } from 'react'
import { useAppStore, RoleConfig } from '../store/appStore'
import { getIcon } from '../utils/icons'
import './ConfigManager.css'

interface ConfigManagerProps {
  onClose: () => void
}

type TabType = 'system' | 'roles' | 'history'

const ICONS = [
  'home',
  'monitor',
  'server',
  'settings',
  'user',
  'code',
  'terminal',
  'database',
  'cloud'
]

// Directory tree node for ignore settings
interface DirTreeNode {
  name: string
  path: string
  isDirectory: boolean
  children?: DirTreeNode[]
  isExpanded?: boolean
}

const ConfigManager = ({ onClose }: ConfigManagerProps) => {
  const {
    roles,
    addRole,
    updateRole,
    deleteRole,
    terminalNotificationSettings,
    setTerminalNotificationEnabled,
    fileWatcherSettings,
    addIgnoredDirectory,
    removeIgnoredDirectory,
    workspacePath,
    claudeProject,
    refreshClaudeHistory
  } = useAppStore()

  const [activeTab, setActiveTab] = useState<TabType>('system')

  // Role management state
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(roles[0]?.id || null)
  const [editForm, setEditForm] = useState<RoleConfig | null>(null)
  const originalFormRef = useRef<RoleConfig | null>(null)

  // Directory tree state for ignore settings
  const [dirTree, setDirTree] = useState<DirTreeNode[]>([])

  // Deleted sessions state
  const [deletedSessions, setDeletedSessions] = useState<ClaudeSession[]>([])
  const [loadingDeleted, setLoadingDeleted] = useState(false)

  // Load role edit form
  useEffect(() => {
    if (selectedRoleId) {
      const role = roles.find((r) => r.id === selectedRoleId)
      if (role) {
        const formCopy = { ...role }
        setEditForm(formCopy)
        originalFormRef.current = formCopy
      }
    }
  }, [selectedRoleId, roles])

  // Check if form has changes
  const hasChanges = (): boolean => {
    if (!editForm || !originalFormRef.current) return false
    return JSON.stringify(editForm) !== JSON.stringify(originalFormRef.current)
  }

  // Save current form if has changes
  const saveFormIfNeeded = () => {
    if (editForm && hasChanges()) {
      updateRole(editForm.id, editForm)
      originalFormRef.current = { ...editForm }
    }
  }

  // Handle close with save
  const handleClose = () => {
    saveFormIfNeeded()
    onClose()
  }

  // Handle field change (just update local state)
  const handleFieldChange = (field: keyof RoleConfig, value: any) => {
    if (!editForm) return
    setEditForm({ ...editForm, [field]: value })
  }

  // Handle blur - save on blur
  const handleFieldBlur = () => {
    saveFormIfNeeded()
  }

  // Load directory tree when system tab is active
  useEffect(() => {
    if (activeTab === 'system' && workspacePath) {
      loadDirectoryTree(workspacePath)
    }
  }, [activeTab, workspacePath])

  // Load deleted sessions when history tab is active
  useEffect(() => {
    if (activeTab === 'history' && claudeProject) {
      loadDeletedSessions()
    }
  }, [activeTab, claudeProject])

  const loadDeletedSessions = async () => {
    if (!claudeProject) return
    setLoadingDeleted(true)
    try {
      // Get all matched projects (may be multiple for subdirectory matching)
      const matchedProjects = (claudeProject as any)._matchedProjects as string[] | undefined
      const projectPaths =
        matchedProjects && matchedProjects.length > 0
          ? matchedProjects
          : [claudeProject.encodedPath]

      // Collect all deleted session IDs from all matched projects
      const allDeletedIds: string[] = []
      for (const encodedPath of projectPaths) {
        const ids = await window.api.claudeHistory.getDeletedSessionsForProject(encodedPath)
        allDeletedIds.push(...ids)
      }

      if (allDeletedIds.length === 0) {
        setDeletedSessions([])
        return
      }

      // Load sessions from all projects and filter to get deleted ones
      const allDeletedSessions: any[] = []
      for (const encodedPath of projectPaths) {
        const sessions = await window.api.claudeHistory.getSessions(encodedPath)
        const deleted = sessions.filter((s) => allDeletedIds.includes(s.id))
        allDeletedSessions.push(...deleted)
      }

      // Sort by last modified time
      allDeletedSessions.sort((a, b) => {
        if (!a.lastModified) return 1
        if (!b.lastModified) return -1
        return b.lastModified.localeCompare(a.lastModified)
      })

      setDeletedSessions(allDeletedSessions)
    } catch (error) {
      console.error('Failed to load deleted sessions:', error)
      setDeletedSessions([])
    } finally {
      setLoadingDeleted(false)
    }
  }

  const handleRestoreSession = async (sessionId: string) => {
    if (!claudeProject) return

    // Find which project the session belongs to and restore it
    const matchedProjects = (claudeProject as any)._matchedProjects as string[] | undefined
    const projectPaths =
      matchedProjects && matchedProjects.length > 0 ? matchedProjects : [claudeProject.encodedPath]

    // Try to restore from each project (the backend will only restore if it exists there)
    for (const encodedPath of projectPaths) {
      await window.api.claudeHistory.restoreSession(encodedPath, sessionId)
    }

    await loadDeletedSessions()
    await refreshClaudeHistory()
  }

  const handleClearAllDeleted = async () => {
    if (!claudeProject) return
    if (!window.confirm('确定要清空所有已删除的对话记录吗？此操作不可撤销。')) return

    try {
      // Clear deleted sessions from all matched projects
      const matchedProjects = (claudeProject as any)._matchedProjects as string[] | undefined
      const projectPaths =
        matchedProjects && matchedProjects.length > 0
          ? matchedProjects
          : [claudeProject.encodedPath]

      for (const encodedPath of projectPaths) {
        await window.api.claudeHistory.clearDeletedSessionsForProject(encodedPath)
      }

      setDeletedSessions([])
      await refreshClaudeHistory()
    } catch (error) {
      console.error('Failed to clear deleted sessions:', error)
    }
  }

  const loadDirectoryTree = async (dirPath: string, nodePath?: number[]) => {
    // Don't block UI, load in background
    try {
      const files = await window.api.fs.readDir(dirPath)
      const nodes: DirTreeNode[] = files
        .filter((file) => file.isDirectory && !file.name.startsWith('.'))
        .map((file) => ({
          name: file.name,
          path: file.path,
          isDirectory: true,
          children: [],
          isExpanded: false
        }))
        .sort((a, b) => a.name.localeCompare(b.name))

      if (nodePath) {
        // Update specific node
        setDirTree((prev) => {
          const newTree = [...prev]
          let current: DirTreeNode[] = newTree
          for (let i = 0; i < nodePath.length - 1; i++) {
            current = current[nodePath[i]].children!
          }
          const targetNode = current[nodePath[nodePath.length - 1]]
          targetNode.children = nodes
          targetNode.isExpanded = true
          return newTree
        })
      } else {
        setDirTree(nodes)
      }
    } catch (err) {
      console.error('Failed to load directory tree:', err)
    }
  }

  const toggleDirNode = async (node: DirTreeNode, path: number[]) => {
    if (node.isExpanded) {
      // Collapse
      setDirTree((prev) => {
        const newTree = [...prev]
        let current: DirTreeNode[] = newTree
        for (let i = 0; i < path.length - 1; i++) {
          current = current[path[i]].children!
        }
        current[path[path.length - 1]].isExpanded = false
        return newTree
      })
    } else {
      // Expand - load children
      await loadDirectoryTree(node.path, path)
    }
  }

  // Get relative path from workspace root
  const getRelativePath = (absolutePath: string): string => {
    if (!workspacePath) return absolutePath
    return absolutePath.replace(workspacePath, '').replace(/^[\/\\]/, '')
  }

  const isIgnored = (relativePath: string): boolean => {
    return fileWatcherSettings.ignoredDirectories.includes(relativePath)
  }

  const toggleIgnore = (relativePath: string) => {
    if (isIgnored(relativePath)) {
      removeIgnoredDirectory(relativePath)
    } else {
      addIgnoredDirectory(relativePath)
    }
  }

  // Render directory tree recursively
  const renderDirTree = (nodes: DirTreeNode[], path: number[] = []): React.ReactNode => {
    return nodes.map((node, index) => {
      const currentPath = [...path, index]
      const relativePath = getRelativePath(node.path)
      const ignored = isIgnored(relativePath)

      return (
        <div key={node.path} className="dir-tree-node">
          <div className={`dir-tree-item ${ignored ? 'ignored' : ''}`}>
            <span className="dir-expand-btn" onClick={() => toggleDirNode(node, currentPath)}>
              {node.isExpanded ? (
                <svg viewBox="0 0 16 16" fill="currentColor" width="12px" height="12px">
                  <path d="M7.247 4.86l-4.796 5.481c-.566.646-.106 1.659.753 1.659h9.592a1 1 0 0 0 .753-1.659l-4.796-5.48a1 1 0 0 0-1.506 0z" />
                </svg>
              ) : (
                <svg viewBox="0 0 16 16" fill="currentColor" width="12px" height="12px">
                  <path d="M12.14 8.753l-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 0 1 1.659-.753l5.48 4.796a1 1 0 0 1 0 1.506z" />
                </svg>
              )}
            </span>
            <span className="dir-icon">
              <svg viewBox="0 0 16 16" fill="currentColor" width="14px" height="14px">
                <path d="M9.828 3h3.982a2 2 0 0 1 1.992 2.181l-.637 7A2 2 0 0 1 13.174 14H2.825a2 2 0 0 1-1.991-1.819l-.637-7a1.99 1.99 0 0 1 .342-1.31L.5 3a2 2 0 0 1 2-2h3.672a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 3zm-8.322.12C1.72 3.042 1.97 3 2.25 3h3.672c.29 0 .563.115.764.316l.828.828c.34.34.81.531 1.293.531h3.922c.414 0 .814.101 1.166.29l-.177-.177A1.99 1.99 0 0 0 12.81 3H9.828a2 2 0 0 1-1.414-.586l-.828-.828A1 1 0 0 0 6.922 1H2.25a1 1 0 0 0-1 1v.12z" />
              </svg>
            </span>
            <span className="dir-name">{node.name}</span>
            <span
              className={`dir-checkbox ${ignored ? 'checked' : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                toggleIgnore(relativePath)
              }}
              title={ignored ? '点击取消忽略' : '点击忽略此目录'}
            >
              {ignored && (
                <svg viewBox="0 0 16 16" fill="currentColor" width="10px" height="10px">
                  <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
                </svg>
              )}
            </span>
          </div>
          {node.isExpanded && node.children && node.children.length > 0 && (
            <div className="dir-tree-children">{renderDirTree(node.children, currentPath)}</div>
          )}
        </div>
      )
    })
  }

  const handleRoleDelete = () => {
    if (!editForm || editForm.isBuiltIn) return
    if (window.confirm(`确定要删除角色 "${editForm.name}" 吗？`)) {
      deleteRole(editForm.id)
      setSelectedRoleId(roles[0]?.id || null)
    }
  }

  const handleCreateNewRole = () => {
    const newRole: RoleConfig = {
      id: `role-${Date.now()}`,
      name: '新角色',
      icon: 'user',
      prompt: '# 新角色\n\n这是新角色的系统提示词。',
      customPrompt: '[新角色]$ ',
      isBuiltIn: false,
      isActive: true
    }
    addRole(newRole)
    setSelectedRoleId(newRole.id)
  }

  return (
    <div className="config-manager-overlay" onClick={handleClose}>
      <div className="config-manager-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>配置管理</h3>
          <button className="close-btn" onClick={handleClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button
            className={`tab-btn ${activeTab === 'system' ? 'active' : ''}`}
            onClick={() => setActiveTab('system')}
          >
            <svg viewBox="0 0 16 16" fill="currentColor" width="14px" height="14px">
              <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0ZM1.5 8a6.5 6.5 0 1 1 13 0 6.5 6.5 0 0 1-13 0Zm6.5-5a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm0 8a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm-4-4a1 1 0 1 0 2 0 1 1 0 0 0-2 0Zm8 0a1 1 0 1 0 2 0 1 1 0 0 0-2 0Z" />
            </svg>
            系统配置
          </button>
          <button
            className={`tab-btn ${activeTab === 'roles' ? 'active' : ''}`}
            onClick={() => setActiveTab('roles')}
          >
            <svg viewBox="0 0 16 16" fill="currentColor" width="14px" height="14px">
              <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
              <path
                fillRule="evenodd"
                d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1z"
              />
            </svg>
            角色配置
          </button>
          <button
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              width="14px"
              height="14px"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            历史记录
          </button>
        </div>

        <div className="modal-content">
          {activeTab === 'system' ? (
            <div className="system-config">
              {/* File Watcher Settings */}
              <div className="config-section">
                <div className="config-section-header">
                  <h4>文件监听</h4>
                  <span className="config-section-hint">选中的目录将不会被监听文件变更</span>
                </div>

                <div className="ignored-dirs-container">
                  {dirTree.length > 0 ? (
                    <div className="dir-tree">{renderDirTree(dirTree)}</div>
                  ) : (
                    <div className="empty-tree">
                      {workspacePath ? '加载中...' : '请先选择工作目录'}
                    </div>
                  )}
                </div>

                {fileWatcherSettings.ignoredDirectories.length > 0 && (
                  <div className="ignored-summary">
                    <span className="summary-label">已忽略的目录：</span>
                    <div className="ignored-tags">
                      {fileWatcherSettings.ignoredDirectories.map((dir) => (
                        <span key={dir} className="ignored-tag">
                          {dir}
                          <button
                            className="tag-remove"
                            onClick={() => removeIgnoredDirectory(dir)}
                          >
                            <svg viewBox="0 0 16 16" fill="currentColor" width="10px" height="10px">
                              <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Terminal Notification Settings */}
              <div className="config-section">
                <div className="config-section-header">
                  <h4>终端监控</h4>
                </div>

                <div className="toggle-option">
                  <div
                    className="toggle-switch-wrapper"
                    onClick={() =>
                      setTerminalNotificationEnabled(!terminalNotificationSettings.enabled)
                    }
                  >
                    <div
                      className={`toggle-switch ${terminalNotificationSettings.enabled ? 'checked' : ''}`}
                    >
                      <div className="toggle-knob"></div>
                    </div>
                    <div className="toggle-label">
                      <span className="toggle-title">启用终端活跃度监控</span>
                      <span className="toggle-hint">当终端长时间停止输出时显示通知</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'roles' ? (
            <div className="roles-config">
              <div className="role-list-sidebar">
                <button className="add-role-btn" onClick={handleCreateNewRole}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  新建角色
                </button>
                <div className="role-list-items">
                  {roles.map((role) => (
                    <div
                      key={role.id}
                      className={`role-list-item ${selectedRoleId === role.id ? 'active' : ''}`}
                      onClick={() => setSelectedRoleId(role.id)}
                    >
                      <span className="role-name">
                        <span className="role-icon">{getIcon(role.icon)}</span>
                        {role.name}
                      </span>
                      {role.isBuiltIn && <span className="builtin-badge">内置</span>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="role-editor">
                {editForm ? (
                  <div className="editor-form">
                    <div className="form-group">
                      <label>角色名称</label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => handleFieldChange('name', e.target.value)}
                        onBlur={handleFieldBlur}
                      />
                    </div>

                    <div className="form-group row">
                      <div
                        className="toggle-switch-wrapper"
                        onClick={() => {
                          handleFieldChange('isActive', !editForm.isActive)
                          handleFieldBlur()
                        }}
                      >
                        <div className={`toggle-switch ${editForm.isActive ? 'checked' : ''}`}>
                          <div className="toggle-knob"></div>
                        </div>
                        <span>在当前工作区启用</span>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>图标</label>
                      <div className="icon-selector">
                        {ICONS.map((iconName) => (
                          <div
                            key={iconName}
                            className={`icon-option ${editForm.icon === iconName ? 'selected' : ''}`}
                            onClick={() => {
                              handleFieldChange('icon', iconName)
                              handleFieldBlur()
                            }}
                          >
                            <span className="icon-preview">{getIcon(iconName)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="form-group">
                      <label>终端提示符 (PS1)</label>
                      <input
                        type="text"
                        value={editForm.customPrompt || ''}
                        onChange={(e) => handleFieldChange('customPrompt', e.target.value)}
                        onBlur={handleFieldBlur}
                        placeholder="例如: [Neuro]$ "
                      />
                    </div>

                    <div className="form-group full-height">
                      <label>系统提示词 (Markdown)</label>
                      <textarea
                        value={editForm.prompt}
                        onChange={(e) => handleFieldChange('prompt', e.target.value)}
                        onBlur={handleFieldBlur}
                      />
                    </div>

                    {!editForm.isBuiltIn && (
                      <div className="form-actions">
                        <button className="delete-btn" onClick={handleRoleDelete}>
                          删除角色
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="empty-state">请选择一个角色进行编辑</div>
                )}
              </div>
            </div>
          ) : activeTab === 'history' ? (
            <div className="history-config">
              <div className="config-section">
                <div className="config-section-header">
                  <h4>已删除的对话</h4>
                  <span className="config-section-hint">在此恢复已删除的对话记录</span>
                </div>

                {loadingDeleted ? (
                  <div className="history-loading">加载中...</div>
                ) : deletedSessions.length > 0 ? (
                  <>
                    <div className="deleted-sessions-list">
                      {deletedSessions.map((session) => (
                        <div key={session.id} className="deleted-session-item">
                          <div className="deleted-session-info">
                            <div className="deleted-session-preview">
                              {session.preview || '空对话'}
                            </div>
                            <div className="deleted-session-meta">
                              <span>{session.messageCount} 条消息</span>
                              <span>
                                {session.lastMessageTime
                                  ? new Date(session.lastMessageTime).toLocaleDateString()
                                  : '无日期'}
                              </span>
                            </div>
                          </div>
                          <button
                            className="restore-btn"
                            onClick={() => handleRestoreSession(session.id)}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              width="14px"
                              height="14px"
                            >
                              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                              <path d="M3 3v5h5" />
                            </svg>
                            恢复
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="history-actions">
                      <button className="clear-all-btn" onClick={handleClearAllDeleted}>
                        清空所有已删除记录
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="history-empty">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      width="48px"
                      height="48px"
                    >
                      <path d="M9 12l2 2 4-4" />
                      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                    </svg>
                    <p>暂无已删除的对话记录</p>
                  </div>
                )}
              </div>

              {!claudeProject && (
                <div className="history-no-project">
                  <p>请先选择一个工作区以管理对话历史记录</p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default ConfigManager
