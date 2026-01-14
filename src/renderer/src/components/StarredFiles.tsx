import { useState, useEffect } from 'react'
import { useAppStore } from '../store/appStore'
import { getIcon } from 'material-file-icons'
import './StarredFiles.css'

interface FileNode {
    name: string
    path: string
    isDirectory: boolean
    children?: FileNode[]
    isExpanded?: boolean
}

const StarredFiles = () => {
    const {
        starredItems,
        removeStarredItem,
        reorderStarredItems,
        setCurrentFile,
        setCurrentFileContent,
        setOriginalFileContent,
        setEditorMode
    } = useAppStore()

    const [draggedItem, setDraggedItem] = useState<string | null>(null)
    const [dragOverItem, setDragOverItem] = useState<string | null>(null)
    const [expandedFolders, setExpandedFolders] = useState<Map<string, FileNode[]>>(new Map())
    const [contextMenu, setContextMenu] = useState<{
        x: number
        y: number
        node: FileNode
    } | null>(null)

    // Load folder contents when starred
    useEffect(() => {
        const loadFolderContents = async (path: string) => {
            const result = await window.api.fs.readDir(path)
            const nodes: FileNode[] = result
                .filter(file => !file.name.startsWith('.'))
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
            return nodes
        }

        // Load contents for all starred folders
        starredItems.forEach(async (item) => {
            if (item.isDirectory && !expandedFolders.has(item.path)) {
                const children = await loadFolderContents(item.path)
                setExpandedFolders(prev => new Map(prev).set(item.path, children))
            }
        })
    }, [starredItems])

    const toggleFolder = async (path: string, currentChildren?: FileNode[]) => {
        if (!currentChildren) {
            // Load children if not loaded
            const result = await window.api.fs.readDir(path)
            const nodes: FileNode[] = result
                .filter(file => !file.name.startsWith('.'))
                .map(file => ({
                    name: file.name,
                    path: file.path,
                    isDirectory: file.isDirectory,
                    children: file.isDirectory ? [] : undefined,
                    isExpanded: false
                }))
            nodes.sort((a, b) => {
                if (a.isDirectory && !b.isDirectory) return -1
                if (!a.isDirectory && b.isDirectory) return 1
                return a.name.localeCompare(b.name)
            })

            setExpandedFolders(prev => {
                const newMap = new Map(prev)
                newMap.set(path, nodes)
                return newMap
            })
        } else {
            // Toggle expansion
            setExpandedFolders(prev => {
                const newMap = new Map(prev)
                if (newMap.has(path)) {
                    newMap.delete(path)
                } else {
                    newMap.set(path, currentChildren)
                }
                return newMap
            })
        }
    }

    const handleDragStart = (e: React.DragEvent, itemId: string) => {
        setDraggedItem(itemId)
        e.dataTransfer.effectAllowed = 'move'
    }

    const handleDragOver = (e: React.DragEvent, itemId: string) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setDragOverItem(itemId)
    }

    const handleDragLeave = () => {
        setDragOverItem(null)
    }

    const handleDrop = (e: React.DragEvent, targetItemId: string) => {
        e.preventDefault()

        if (!draggedItem || draggedItem === targetItemId) {
            setDraggedItem(null)
            setDragOverItem(null)
            return
        }

        const draggedIndex = starredItems.findIndex(item => item.id === draggedItem)
        const targetIndex = starredItems.findIndex(item => item.id === targetItemId)

        if (draggedIndex === -1 || targetIndex === -1) return

        const newItems = [...starredItems]
        const [removed] = newItems.splice(draggedIndex, 1)
        newItems.splice(targetIndex, 0, removed)

        // Update order
        const reorderedItems = newItems.map((item, index) => ({
            ...item,
            order: index
        }))

        reorderStarredItems(reorderedItems)
        setDraggedItem(null)
        setDragOverItem(null)
    }

    const handleDragEnd = () => {
        setDraggedItem(null)
        setDragOverItem(null)
    }

    const handleFileClick = async (node: FileNode) => {
        if (node.isDirectory) {
            toggleFolder(node.path, expandedFolders.get(node.path))
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

    const handleRemove = (e: React.MouseEvent, itemId: string) => {
        e.stopPropagation()
        removeStarredItem(itemId)
    }

    const handleContextMenu = (e: React.MouseEvent, node: FileNode) => {
        e.preventDefault()
        e.stopPropagation()
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            node
        })
    }

    const handleCopyFilename = async () => {
        if (contextMenu) {
            try {
                await navigator.clipboard.writeText(contextMenu.node.name)
                console.log('Copied filename:', contextMenu.node.name)
            } catch (err) {
                console.error('Failed to copy filename:', err)
            }
        }
        setContextMenu(null)
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

    const renderFileTree = (nodes: FileNode[], depth: number = 0): React.ReactNode => {
        return nodes.map((node) => {
            const isExpanded = expandedFolders.has(node.path)
            const children = expandedFolders.get(node.path)

            return (
                <div key={node.path}>
                    <div
                        className="starred-file-item"
                        style={{ paddingLeft: `${12 + depth * 16}px` }}
                        onClick={() => handleFileClick(node)}
                        onContextMenu={(e) => handleContextMenu(e, node)}
                    >
                        {node.isDirectory && (
                            <svg
                                className="tree-chevron"
                                viewBox="0 0 16 16"
                                fill="currentColor"
                                style={{
                                    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.2s'
                                }}
                            >
                                <path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z"></path>
                            </svg>
                        )}
                        {!node.isDirectory && <div style={{ width: '12px' }} />}
                        {node.isDirectory ? (
                            <svg className="file-icon" viewBox="0 0 24 24" fill="#ffca28">
                                <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                            </svg>
                        ) : (
                            <div
                                className="file-icon"
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                dangerouslySetInnerHTML={{ __html: (getIcon(node.name) as any).svg }}
                            />
                        )}
                        <span className="file-name">{node.name}</span>
                    </div>
                    {node.isDirectory && isExpanded && children && (
                        <div>{renderFileTree(children, depth + 1)}</div>
                    )}
                </div>
            )
        })
    }

    if (starredItems.length === 0) {
        return null
    }

    return (
        <div className="starred-files">
            <h4>
                <svg className="star-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                星标文件
            </h4>
            <div className="starred-list">
                {starredItems
                    .sort((a, b) => a.order - b.order)
                    .map((item) => {
                        const isExpanded = expandedFolders.has(item.path)
                        const children = expandedFolders.get(item.path)

                        return (
                            <div key={item.id}>
                                <div
                                    className={`starred-item ${dragOverItem === item.id ? 'drag-over' : ''} ${draggedItem === item.id ? 'dragging' : ''
                                        }`}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, item.id)}
                                    onDragOver={(e) => handleDragOver(e, item.id)}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => handleDrop(e, item.id)}
                                    onDragEnd={handleDragEnd}
                                    onClick={() => item.isDirectory ? toggleFolder(item.path, children) : handleFileClick(item)}
                                    onContextMenu={(e) => handleContextMenu(e, item)}
                                >
                                    {item.isDirectory && (
                                        <svg
                                            className="tree-chevron"
                                            viewBox="0 0 16 16"
                                            fill="currentColor"
                                            style={{
                                                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                                transition: 'transform 0.2s'
                                            }}
                                        >
                                            <path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z"></path>
                                        </svg>
                                    )}
                                    {!item.isDirectory && <div style={{ width: '12px' }} />}
                                    {item.isDirectory ? (
                                        <svg className="file-icon" viewBox="0 0 24 24" fill="#ffca28">
                                            <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                                        </svg>
                                    ) : (
                                        <div
                                            className="file-icon"
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            dangerouslySetInnerHTML={{ __html: (getIcon(item.name) as any).svg }}
                                        />
                                    )}
                                    <span className="file-name">{item.name}</span>
                                    <button
                                        className="remove-btn"
                                        onClick={(e) => handleRemove(e, item.id)}
                                        title="取消星标"
                                    >
                                        <svg viewBox="0 0 16 16" fill="currentColor">
                                            <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"></path>
                                        </svg>
                                    </button>
                                </div>
                                {item.isDirectory && isExpanded && children && (
                                    <div className="starred-folder-content">
                                        {renderFileTree(children, 0)}
                                    </div>
                                )}
                            </div>
                        )
                    })}
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <div
                    className="context-menu"
                    style={{
                        position: 'fixed',
                        left: `${contextMenu.x}px`,
                        top: `${contextMenu.y}px`,
                        zIndex: 1000
                    }}
                >
                    <div className="context-menu-item" onClick={handleCopyFilename}>
                        <svg viewBox="0 0 16 16" fill="currentColor">
                            <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"></path>
                            <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"></path>
                        </svg>
                        复制文件名
                    </div>
                </div>
            )}
        </div>
    )
}

export default StarredFiles
