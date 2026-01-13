import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { useAppStore } from '../store/appStore'
import MarkdownEditor from './MarkdownEditor'
import Terminal from './Terminal'
import './MainPanel.css'

const MainPanel = () => {
    const { activeSessionId } = useAppStore()

    const handleClearTerminal = () => {
        // Send clear command (Ctrl+L)
        window.api.session.input(activeSessionId, '\x0c')
    }

    const handleRestartTerminal = async () => {
        // Restart the current session
        await window.api.session.create(activeSessionId)
    }

    return (
        <div className="panel-base main-panel">
            <PanelGroup direction="vertical">
                {/* Top: Markdown Editor */}
                <Panel defaultSize={60} minSize={30}>
                    <MarkdownEditor />
                </Panel>

                <PanelResizeHandle className="resize-handle-horizontal" />

                {/* Bottom: Chat/Terminal */}
                <Panel defaultSize={40} minSize={20}>
                    <div className="chat-console">
                        <div className="chat-header">
                            <h4>对话控制台</h4>
                            <div className="terminal-controls">
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
                        <Terminal />
                    </div>
                </Panel>
            </PanelGroup>
        </div>
    )
}

export default MainPanel

