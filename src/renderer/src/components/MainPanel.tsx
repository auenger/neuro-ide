import { Panel, PanelGroup, PanelResizeHandle, ImperativePanelHandle } from 'react-resizable-panels'
import { useState, useRef } from 'react'
import { useAppStore } from '../store/appStore'
import { terminalManager } from '../utils/terminalManager'
import MarkdownEditor from './MarkdownEditor'
import Terminal from './Terminal'
import TerminalGrid from './TerminalGrid'
import './MainPanel.css'

// Grid layout presets
const GRID_PRESETS = [
    { rows: 1, cols: 2, label: '1×2' },
    { rows: 2, cols: 1, label: '2×1' },
    { rows: 2, cols: 2, label: '2×2' },
    { rows: 2, cols: 3, label: '2×3' },
    { rows: 3, cols: 2, label: '3×2' },
    { rows: 3, cols: 3, label: '3×3' },
]

// Helper function to calculate optimal grid config
const calculateOptimalGrid = (count: number): { rows: number; cols: number } => {
    if (count <= 1) return { rows: 1, cols: 1 }
    if (count === 2) return { rows: 1, cols: 2 }
    if (count === 3) return { rows: 1, cols: 3 }
    if (count === 4) return { rows: 2, cols: 2 }
    if (count === 5 || count === 6) return { rows: 2, cols: 3 }
    if (count === 7 || count === 8) return { rows: 2, cols: 4 }
    if (count === 9) return { rows: 3, cols: 3 }
    return { rows: Math.ceil(count / 4), cols: 4 }
}

const MainPanel = () => {
    const { activeSessionId, sessions } = useAppStore()
    const terminalLayoutMode = useAppStore((state) => state.terminalLayoutMode)
    const gridLayoutConfig = useAppStore((state) => state.gridLayoutConfig)
    const toggleTerminalLayoutMode = useAppStore((state) => state.toggleTerminalLayoutMode)
    const setGridLayoutConfig = useAppStore((state) => state.setGridLayoutConfig)
    const addTerminalToSession = useAppStore((state) => state.addTerminalToSession)

    const [isMdCollapsed, setIsMdCollapsed] = useState(false)
    const [isTerminalMaximized, setIsTerminalMaximized] = useState(false)
    const [editingTerminalId, setEditingTerminalId] = useState<string | null>(null)
    const [editingName, setEditingName] = useState('')
    const [showGridDropdown, setShowGridDropdown] = useState(false)

    // Panel refs for programmatic resize
    const mdPanelRef = useRef<ImperativePanelHandle>(null)

    // Store previous size before collapse for restore
    const [mdPanelPrevSize, setMdPanelPrevSize] = useState(40)

    const activeSession = sessions.find(s => s.id === activeSessionId)
    const activeTerminalId = activeSession?.activeTerminalId

    const handleClearTerminal = () => {
        if (activeTerminalId) {
            const isWindows = navigator.platform.toLowerCase().includes('win')
            if (isWindows) {
                window.api.session.input(activeTerminalId, 'cls\r')
            } else {
                window.api.session.input(activeTerminalId, '\x0c')
            }
        }
    }

    const handleRestartTerminal = async () => {
        if (activeTerminalId && activeSession) {
            window.dispatchEvent(new CustomEvent('terminal-restart', {
                detail: {
                    terminalId: activeTerminalId,
                    customPrompt: activeSession.customPrompt
                }
            }))
        }
    }

    // Fit terminal - adjust size to container
    const handleFitTerminal = (terminalId?: string) => {
        const targetId = terminalId || activeTerminalId
        if (targetId) {
            const instance = terminalManager.getTerminal(targetId)
            if (instance) {
                try {
                    instance.fitAddon.fit()
                    window.api.session.resize(targetId, instance.xterm.cols, instance.xterm.rows)
                } catch (e) {
                    console.warn('Failed to fit terminal:', e)
                }
            }
        }
    }

    const toggleMdCollapse = () => {
        const newCollapsed = !isMdCollapsed
        setIsMdCollapsed(newCollapsed)

        if (newCollapsed) {
            // Collapsing: store current size and shrink
            const currentSize = mdPanelRef.current?.getSize()
            if (currentSize) {
                setMdPanelPrevSize(currentSize)
            }
            mdPanelRef.current?.resize(8)
        } else {
            // Expanding: restore previous size
            mdPanelRef.current?.resize(mdPanelPrevSize)
        }

        if (isTerminalMaximized) {
            setIsTerminalMaximized(false)
        }
    }

    const toggleTerminalMaximize = () => {
        const newMaximized = !isTerminalMaximized
        setIsTerminalMaximized(newMaximized)

        if (newMaximized) {
            // Maximizing terminal: collapse MD panel
            const currentSize = mdPanelRef.current?.getSize()
            if (currentSize && currentSize > 8) {
                setMdPanelPrevSize(currentSize)
            }
            setIsMdCollapsed(true)
            mdPanelRef.current?.resize(8)
        } else {
            // Restoring: expand MD panel
            setIsMdCollapsed(false)
            mdPanelRef.current?.resize(mdPanelPrevSize)
        }
    }

    const handleStartRename = (terminal: { id: string; name: string }) => {
        setEditingTerminalId(terminal.id)
        setEditingName(terminal.name)
    }

    const handleRenameSubmit = () => {
        if (editingTerminalId && editingName.trim()) {
            useAppStore.getState().renameTerminal(activeSessionId, editingTerminalId, editingName.trim())
        }
        setEditingTerminalId(null)
        setEditingName('')
    }

    const handleRenameCancel = () => {
        setEditingTerminalId(null)
        setEditingName('')
    }

    // Handle adding terminal with auto grid adjustment
    const handleAddTerminalWithAutoGrid = () => {
        const terminals = activeSession?.terminals || []
        const currentCount = terminals.length
        const newCount = currentCount + 1
        const maxSlots = gridLayoutConfig.rows * gridLayoutConfig.cols

        // If current grid is full, auto-adjust the grid
        if (newCount > maxSlots) {
            const newConfig = calculateOptimalGrid(newCount)
            setGridLayoutConfig(newConfig)
        }

        addTerminalToSession(activeSessionId)
    }

    const currentPresetLabel = GRID_PRESETS.find(
        p => p.rows === gridLayoutConfig.rows && p.cols === gridLayoutConfig.cols
    )?.label || `${gridLayoutConfig.rows}×${gridLayoutConfig.cols}`

    return (
        <div className="panel-base main-panel">
            <PanelGroup direction="vertical">
                {/* Top: Markdown Editor */}
                <Panel
                    ref={mdPanelRef}
                    defaultSize={18}
                    minSize={8}
                    maxSize={80}
                    collapsible={false}
                >
                    <MarkdownEditor
                        isCollapsed={isMdCollapsed}
                        onToggleCollapse={toggleMdCollapse}
                    />
                </Panel>

                <PanelResizeHandle className="resize-handle-horizontal" />

                {/* Bottom: Chat/Terminal */}
                <Panel defaultSize={82} minSize={20}>
                    <div className="chat-console">
                        <div className="chat-header">
                            <div className="header-left stage-title">
                                <h4>对话控制台</h4>
                            </div>
                            <div className="terminal-controls">
                                {/* Layout mode toggle button */}
                                <button
                                    className="control-btn layout-toggle-btn"
                                    onClick={toggleTerminalLayoutMode}
                                    title={terminalLayoutMode === 'tabs' ? '切换到网格布局' : '切换到标签布局'}
                                >
                                    {terminalLayoutMode === 'tabs' ? (
                                        <svg viewBox="0 0 16 16" fill="currentColor">
                                            <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3z"/>
                                        </svg>
                                    ) : (
                                        <svg viewBox="0 0 16 16" fill="currentColor">
                                            <path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h11A1.5 1.5 0 0 1 15 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5v-9zM2.5 3a.5.5 0 0 0-.5.5V5h3V3H2.5zm4 0v2h3V3h-3zm4 0v2h3V3.5a.5.5 0 0 0-.5-.5H10.5z"/>
                                        </svg>
                                    )}
                                </button>

                                {/* Grid config dropdown (only show in grid mode) */}
                                {terminalLayoutMode === 'grid' && (
                                    <div className="grid-config-wrapper">
                                        <button
                                            className="control-btn grid-config-btn"
                                            onClick={() => setShowGridDropdown(!showGridDropdown)}
                                            title="网格配置"
                                        >
                                            <span className="grid-config-label">{currentPresetLabel}</span>
                                            <svg viewBox="0 0 16 16" fill="currentColor" width="10" height="10">
                                                <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/>
                                            </svg>
                                        </button>
                                        {showGridDropdown && (
                                            <div className="grid-dropdown">
                                                {GRID_PRESETS.map((preset) => (
                                                    <button
                                                        key={preset.label}
                                                        className={`grid-dropdown-item ${
                                                            preset.rows === gridLayoutConfig.rows &&
                                                            preset.cols === gridLayoutConfig.cols ? 'active' : ''
                                                        }`}
                                                        onClick={() => {
                                                            setGridLayoutConfig({ rows: preset.rows, cols: preset.cols })
                                                            setShowGridDropdown(false)
                                                        }}
                                                    >
                                                        {preset.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Add terminal button for grid mode */}
                                {terminalLayoutMode === 'grid' && (
                                    <button
                                        className="control-btn add-terminal-grid-btn"
                                        onClick={handleAddTerminalWithAutoGrid}
                                        title="新建终端"
                                    >
                                        <svg viewBox="0 0 16 16" fill="currentColor">
                                            <path d="M8 0a.75.75 0 0 1 .75.75v6.5h6.5a.75.75 0 0 1 0 1.5h-6.5v6.5a.75.75 0 0 1-1.5 0v-6.5h-6.5a.75.75 0 0 1 0-1.5h6.5v-6.5A.75.75 0 0 1 8 0Z"></path>
                                        </svg>
                                    </button>
                                )}

                                <button
                                    className="control-btn"
                                    onClick={toggleTerminalMaximize}
                                    title={isTerminalMaximized ? "还原终端" : "最大化终端"}
                                >
                                    {isTerminalMaximized ? (
                                        <svg viewBox="0 0 16 16" fill="currentColor">
                                            <path d="M5.5 0a.5.5 0 0 1 .5.5v4A1.5 1.5 0 0 1 4.5 6h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5Zm5 0a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 10 4.5v-4a.5.5 0 0 1 .5-.5ZM0 10.5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 6 11.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5Zm10 1a1.5 1.5 0 0 1 1.5-1.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4Z"></path>
                                        </svg>
                                    ) : (
                                        <svg viewBox="0 0 16 16" fill="currentColor">
                                            <path d="M1.5 1a.5.5 0 0 0-.5.5v13a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5v-13a.5.5 0 0 0-.5-.5h-13ZM1 1.5A1.5 1.5 0 0 1 2.5 0h11A1.5 1.5 0 0 1 15 1.5v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5v-11Z"></path>
                                        </svg>
                                    )}
                                </button>

                                {/* Clear and restart buttons - only show in tabs mode */}
                                {terminalLayoutMode === 'tabs' && (
                                    <>
                                        <button
                                            className="control-btn"
                                            onClick={handleClearTerminal}
                                            title="清屏 (Ctrl+L)"
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M1 6h22M1 12h22M1 18h22"></path>
                                            </svg>
                                        </button>
                                        <button
                                            className="control-btn"
                                            onClick={handleRestartTerminal}
                                            title="重启终端"
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <polyline points="23 4 23 10 17 10"></polyline>
                                                <polyline points="1 20 1 14 7 14"></polyline>
                                                <path d="M3.51 9a9 9 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 20.49 15"></path>
                                            </svg>
                                        </button>
                                        <button
                                            className="control-btn"
                                            onClick={() => handleFitTerminal()}
                                            title="调整终端尺寸"
                                        >
                                            <svg viewBox="0 0 16 16" fill="currentColor">
                                                <path d="M1 1.75A.75.75 0 0 1 1.75 1h3.5a.75.75 0 0 1 0 1.5H2.5v2.75a.75.75 0 0 1-1.5 0v-3.5Zm14 0v3.5a.75.75 0 0 1-1.5 0V2.5h-2.75a.75.75 0 0 1 0-1.5h3.5a.75.75 0 0 1 .75.75ZM1.75 15h3.5a.75.75 0 0 0 0-1.5H2.5v-2.75a.75.75 0 0 0-1.5 0v3.5a.75.75 0 0 0 .75.75Zm12.5 0h-3.5a.75.75 0 0 1 0-1.5h2.75v-2.75a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-.75.75Z"/>
                                            </svg>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Terminal Tabs (only show in tabs mode) */}
                        {terminalLayoutMode === 'tabs' && activeSession && (
                            <div className="terminal-tabs">
                                <div className="tabs-list">
                                    {activeSession.terminals.map((terminal) => (
                                        <div
                                            key={terminal.id}
                                            className={`terminal-tab ${terminal.id === activeSession.activeTerminalId ? 'active' : ''}`}
                                            onClick={() => useAppStore.getState().setActiveTerminal(activeSessionId, terminal.id)}
                                        >
                                            {editingTerminalId === terminal.id ? (
                                                <input
                                                    className="tab-name-input"
                                                    type="text"
                                                    value={editingName}
                                                    onChange={(e) => setEditingName(e.target.value)}
                                                    onBlur={handleRenameSubmit}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleRenameSubmit()
                                                        } else if (e.key === 'Escape') {
                                                            handleRenameCancel()
                                                        }
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    autoFocus
                                                />
                                            ) : (
                                                <>
                                                    <span className="tab-name">{terminal.name}</span>
                                                    <button
                                                        className="tab-edit"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleStartRename(terminal)
                                                        }}
                                                        title="重命名终端"
                                                    >
                                                        <svg viewBox="0 0 16 16" fill="currentColor">
                                                            <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm.176 4.823L9.75 4.81l-6.286 6.287a.253.253 0 0 0-.064.108l-.558 1.953 1.953-.558a.253.253 0 0 0 .108-.064Zm1.238-3.763a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354Z"></path>
                                                        </svg>
                                                    </button>
                                                </>
                                            )}
                                            {activeSession.terminals.length > 1 && (
                                                <button
                                                    className="tab-close"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        useAppStore.getState().removeTerminalFromSession(activeSessionId, terminal.id)
                                                    }}
                                                    title="关闭终端"
                                                >
                                                    <svg viewBox="0 0 16 16" fill="currentColor">
                                                        <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"></path>
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <button
                                        className="add-terminal-btn"
                                        onClick={() => useAppStore.getState().addTerminalToSession(activeSessionId)}
                                        title="新建终端"
                                    >
                                        <svg viewBox="0 0 16 16" fill="currentColor">
                                            <path d="M8 0a.75.75 0 0 1 .75.75v6.5h6.5a.75.75 0 0 1 0 1.5h-6.5v6.5a.75.75 0 0 1-1.5 0v-6.5h-6.5a.75.75 0 0 1 0-1.5h6.5v-6.5A.75.75 0 0 1 8 0Z"></path>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Terminal content - switch between tabs and grid mode */}
                        {/* Terminal component always mounted to manage backend sessions */}
                        <Terminal mode={terminalLayoutMode} />
                        {terminalLayoutMode === 'grid' && (
                            <TerminalGrid sessionId={activeSessionId} />
                        )}
                    </div>
                </Panel>
            </PanelGroup>
        </div>
    )
}

export default MainPanel
