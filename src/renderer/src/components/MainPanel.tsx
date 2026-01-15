import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { useState } from 'react'
import { useAppStore } from '../store/appStore'
import MarkdownEditor from './MarkdownEditor'
import Terminal from './Terminal'
import './MainPanel.css'

const MainPanel = () => {
    const { activeSessionId, sessions } = useAppStore()
    const [isMdCollapsed, setIsMdCollapsed] = useState(false)
    const [isTerminalMaximized, setIsTerminalMaximized] = useState(false)
    const [editingTerminalId, setEditingTerminalId] = useState<string | null>(null)
    const [editingName, setEditingName] = useState('')

    const activeSession = sessions.find(s => s.id === activeSessionId)
    const activeTerminalId = activeSession?.activeTerminalId

    const handleClearTerminal = () => {
        // Send clear command to active terminal
        if (activeTerminalId) {
            // Cross-platform clear: use 'cls' on Windows, Ctrl+L on Unix
            const isWindows = navigator.platform.toLowerCase().includes('win')
            if (isWindows) {
                // Windows: send 'cls' command
                window.api.session.input(activeTerminalId, 'cls\r')
            } else {
                // Unix/Linux/macOS: send Ctrl+L
                window.api.session.input(activeTerminalId, '\x0c')
            }
        }
    }

    const handleRestartTerminal = async () => {
        // Restart the active terminal
        if (activeTerminalId && activeSession) {
            // Emit custom restart event
            window.dispatchEvent(new CustomEvent('terminal-restart', {
                detail: {
                    terminalId: activeTerminalId,
                    customPrompt: activeSession.customPrompt
                }
            }))
        }
    }

    const toggleMdCollapse = () => {
        setIsMdCollapsed(!isMdCollapsed)
        if (isTerminalMaximized) {
            setIsTerminalMaximized(false)
        }
    }

    const toggleTerminalMaximize = () => {
        setIsTerminalMaximized(!isTerminalMaximized)
        if (!isTerminalMaximized) {
            setIsMdCollapsed(true)
        } else {
            setIsMdCollapsed(false)
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

    return (
        <div className="panel-base main-panel">
            <PanelGroup direction="vertical">
                {/* Top: Markdown Editor */}
                <Panel
                    defaultSize={isMdCollapsed ? 5 : 60}
                    minSize={isMdCollapsed ? 5 : 30}
                    maxSize={isMdCollapsed ? 5 : 80}
                    collapsible={false}
                >
                    <MarkdownEditor
                        isCollapsed={isMdCollapsed}
                        onToggleCollapse={toggleMdCollapse}
                    />
                </Panel>

                <PanelResizeHandle className="resize-handle-horizontal" />

                {/* Bottom: Chat/Terminal */}
                <Panel defaultSize={isMdCollapsed ? 95 : 40} minSize={20}>
                    <div className="chat-console">
                        <div className="chat-header">
                            <div className="header-left stage-title">
                                <h4>对话控制台</h4>
                            </div>
                            <div className="terminal-controls">
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
                                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Terminal Tabs */}
                        {activeSession && (
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

                        <Terminal />
                    </div>
                </Panel>
            </PanelGroup>
        </div>
    )
}

export default MainPanel

