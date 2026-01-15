import { useState, useEffect } from 'react'
import { useAppStore } from '../store/appStore'
import StarredFiles from './StarredFiles'
import ChangedFiles from './ChangedFiles'
import RoleManager from './RoleManager'
import { getIcon as getRoleIcon } from '../utils/icons'
import { getIcon } from 'material-file-icons'
import './Sidebar.css'

interface FileTreeNode {
    name: string
    path: string
    isDirectory: boolean
    children?: FileTreeNode[]
    isExpanded?: boolean
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
        starredItems,
        addStarredItem,
        removeStarredItem,
        checkUnsavedChanges,
        addFileChange
    } = useAppStore()

    // Reload roles when workspace path changes or on mount if path exists
    useEffect(() => {
        if (workspacePath) {
            setWorkspacePath(workspacePath)
        }
    }, [])


    const [fileTree, setFileTree] = useState<FileTreeNode[]>([])
    const [showRoleManager, setShowRoleManager] = useState(false)
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
                        <span>{node.name}</span>
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
                        <h4>角色切换</h4>
                        <button className="icon-btn" onClick={() => setShowRoleManager(true)} title="管理角色">
                            <svg viewBox="0 0 16 16" fill="currentColor">
                                <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0ZM1.5 8a6.5 6.5 0 1 1 13 0 6.5 6.5 0 0 1-13 0Zm6.5-5a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm0 8a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm-4-4a1 1 0 1 0 2 0 1 1 0 0 0-2 0Zm8 0a1 1 0 1 0 2 0 1 1 0 0 0-2 0Z" />
                                <path d="M7.746.5c-.69 0-1.252.4-1.464 1.056l-.316 1.066a5.526 5.526 0 0 0-1.503.743l-1.025-.436c-.663-.257-1.396.06-1.748.67l-.75 1.3a1.505 1.505 0 0 0 .385 1.83l.898.756a5.556 5.556 0 0 0-.001 1.03l-.898.756a1.505 1.505 0 0 0-.385 1.83l.75 1.3c.351.61.996.942 1.748.67l1.025-.436c.462.33.966.592 1.503.743l.316 1.066c.212.656.774 1.056 1.464 1.056h1.5c.69 0 1.252-.4 1.464-1.056l.316-1.066a5.526 5.526 0 0 0 1.503-.743l1.025.436c.663.257 1.396-.06 1.748-.67l.75-1.3a1.505 1.505 0 0 0-.385-1.83l-.898-.756a5.556 5.556 0 0 0 .001-1.03l.898-.756a1.505 1.505 0 0 0 .385-1.83l-.75-1.3c-.351-.61-.996-.942-1.748-.67l-1.025.436a5.526 5.526 0 0 0-1.503-.743l-.316-1.066A1.523 1.523 0 0 0 9.246.5h-1.5Zm1.168 2.067l.317 1.066A.523.523 0 0 0 9.74 4h.022c.162 0 .318.067.433.178l.76.73a.523.523 0 0 0 .598.05l.933-.396.386.668-.768.646a.52.52 0 0 0-.17.587l.156.634c.04.161.162.29.318.334l.872.247-.193.744-.817.078a.525.525 0 0 0-.422.316l-.372.934-.73.208a.523.523 0 0 0-.374.453l-.117 1.036h-.772l-.117-1.036a.523.523 0 0 0-.374-.453l-.73-.208-.372-.934a.525.525 0 0 0-.422-.316l-.817-.078-.193-.744.872-.247c.156-.044.278-.173.318-.334l.156-.634a.52.52 0 0 0-.17-.587l-.768-.646.386-.668.933.396a.523.523 0 0 0 .598-.05l.76-.73a.527.527 0 0 0 .338-.204.53.53 0 0 0 .095-.296l.317-1.066h.772ZM8.5 6a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z" />
                            </svg>
                        </button>
                    </div>
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

            {/* Role Manager */}
            {
                showRoleManager && (
                    <RoleManager onClose={() => setShowRoleManager(false)} />
                )
            }
        </div >
    )
}

export default Sidebar
