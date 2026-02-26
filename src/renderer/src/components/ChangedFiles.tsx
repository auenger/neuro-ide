import { useState } from 'react'
import { useAppStore, FileChangeInfo } from '../store/appStore'
import { getIcon } from 'material-file-icons'
import Toast from './Toast'
import './ChangedFiles.css'

const ChangedFiles = () => {
  const {
    fileChanges,
    removeFileChange,
    clearFileChanges,
    setCurrentFile,
    setCurrentFileContent,
    setOriginalFileContent,
    setEditorMode,
    addStarredItem,
    starredItems,
    stagePanelVisible,
    setStagePanelVisible
  } = useAppStore()

  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'info' | 'warning' | 'error'
  } | null>(null)

  // Convert Map to Array and sort by timestamp
  const allChanges = Array.from(fileChanges.values()).sort((a, b) => b.timestamp - a.timestamp)

  const handleFileClick = async (change: FileChangeInfo) => {
    if (change.changeType === 'unlink') {
      setToast({ message: '文件已被删除', type: 'warning' })
      return
    }

    try {
      const result = await window.api.fs.readFile(change.path)
      if (result.success && result.content !== null) {
        setCurrentFile(change.path)
        setCurrentFileContent(result.content)
        setOriginalFileContent(result.content)
        setEditorMode('editor')
        if (!stagePanelVisible) {
          setStagePanelVisible(true)
        }
      } else {
        setToast({ message: '无法读取文件', type: 'error' })
      }
    } catch (err) {
      setToast({ message: '读取文件失败', type: 'error' })
      console.error('Failed to read file:', err)
    }
  }

  const handleRemove = (e: React.MouseEvent, path: string) => {
    e.stopPropagation()
    removeFileChange(path)
    setToast({ message: '已移除标注', type: 'success' })
  }

  const handleClearAll = () => {
    if (allChanges.length === 0) return
    clearFileChanges()
    setToast({ message: `已清除所有 ${allChanges.length} 个变更标注`, type: 'success' })
  }

  const handleCopyFilename = async (e: React.MouseEvent, path: string) => {
    e.stopPropagation()
    const filename = path.split('/').pop() || path
    try {
      await navigator.clipboard.writeText(filename)
      setToast({ message: '已复制文件名', type: 'success' })
    } catch (err) {
      setToast({ message: '复制失败', type: 'error' })
      console.error('Failed to copy filename:', err)
    }
  }

  const handleAddToStarred = (e: React.MouseEvent, path: string, filename: string) => {
    e.stopPropagation()

    // Check if already starred
    const isAlreadyStarred = starredItems.some((item) => item.path === path)
    if (isAlreadyStarred) {
      setToast({ message: '文件已在星标列表中', type: 'info' })
      return
    }

    addStarredItem({
      path,
      name: filename,
      isDirectory: false
    })
    setToast({ message: '已添加到星标', type: 'success' })
  }

  const getChangeTypeIcon = (changeType: string) => {
    switch (changeType) {
      case 'add':
        return (
          <svg className="change-type-icon add" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm7.25-3.25v2.5h2.5a.75.75 0 0 1 0 1.5h-2.5v2.5a.75.75 0 0 1-1.5 0v-2.5h-2.5a.75.75 0 0 1 0-1.5h2.5v-2.5a.75.75 0 0 1 1.5 0Z"></path>
          </svg>
        )
      case 'change':
        return (
          <svg className="change-type-icon change" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm9.78-2.22-5.5 5.5a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734l5.5-5.5a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042Z"></path>
          </svg>
        )
      case 'unlink':
        return (
          <svg className="change-type-icon unlink" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm9.78-2.22-5.5 5.5a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734l5.5-5.5a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042Z"></path>
          </svg>
        )
      default:
        return null
    }
  }

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp

    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (allChanges.length === 0) {
    return null
  }

  return (
    <div className="changed-files">
      <div className="changed-files-header">
        <h4>
          <svg className="changes-icon" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1.5 8a6.5 6.5 0 0 1 13 0 .75.75 0 0 0 1.5 0 8 8 0 1 0-8 8 .75.75 0 0 0 0-1.5A6.5 6.5 0 0 1 1.5 8Z"></path>
            <path d="M8 12a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm0-1.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"></path>
          </svg>
          变更文件
          <span className="count-badge">{allChanges.length}</span>
        </h4>
        <button
          className="clear-all-btn"
          onClick={handleClearAll}
          disabled={allChanges.length === 0}
          title="清除所有标注"
        >
          <svg viewBox="0 0 16 16" fill="currentColor">
            <path d="M11 1.75V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75ZM4.496 6.675l.66 6.6a.25.25 0 0 0 .249.225h5.19a.25.25 0 0 0 .249-.225l.66-6.6a.75.75 0 0 1 1.492.149l-.66 6.6A1.748 1.748 0 0 1 10.595 15h-5.19a1.75 1.75 0 0 1-1.741-1.575l-.66-6.6a.75.75 0 1 1 1.492-.15ZM6.5 1.75V3h3V1.75a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25Z"></path>
          </svg>
          清除全部
        </button>
      </div>

      <div className="changed-list">
        {allChanges.map((change) => {
          const filename = change.path.split('/').pop() || change.path

          return (
            <div
              key={change.path}
              className={`changed-item ${change.changeType}`}
              onClick={() => handleFileClick(change)}
            >
              <div className="changed-item-main">
                {getChangeTypeIcon(change.changeType)}
                <div
                  className="file-icon"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  dangerouslySetInnerHTML={{ __html: (getIcon(filename) as any).svg }}
                />
                <div className="file-info">
                  <div className="file-name-row">
                    <span className="file-name">{filename}</span>
                  </div>
                  <div className="file-meta">
                    <span className="file-path" title={change.path}>
                      {change.path}
                    </span>
                    <span className="file-time">{formatTimestamp(change.timestamp)}</span>
                  </div>
                </div>
              </div>
              <div className="changed-item-actions">
                <button
                  className="action-btn"
                  onClick={(e) => handleCopyFilename(e, change.path)}
                  title="复制文件名"
                >
                  <svg viewBox="0 0 16 16" fill="currentColor">
                    <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"></path>
                    <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"></path>
                  </svg>
                </button>
                <button
                  className="action-btn"
                  onClick={(e) => handleAddToStarred(e, change.path, filename)}
                  title="添加到星标"
                >
                  <svg viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"></path>
                  </svg>
                </button>
                <button
                  className="remove-btn"
                  onClick={(e) => handleRemove(e, change.path)}
                  title="移除标注"
                >
                  <svg viewBox="0 0 16 16" fill="currentColor">
                    <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"></path>
                  </svg>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

export default ChangedFiles
