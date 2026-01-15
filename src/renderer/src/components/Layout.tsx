import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import Sidebar from './Sidebar'
import MainPanel from './MainPanel'
import StagePanel from './StagePanel'
import TerminalActivityMonitor from './TerminalActivityMonitor'
import './Layout.css'

const Layout = () => {
    return (
        <div className="layout-container">
            <PanelGroup direction="horizontal">
                {/* Left Panel - Sidebar */}
                <Panel
                    id="sidebar"
                    order={1}
                    defaultSize={20}
                    minSize={15}
                    maxSize={50}
                >
                    <Sidebar />
                </Panel>

                <PanelResizeHandle className="resize-handle" />

                {/* Middle Panel - Markdown + Chat */}
                <Panel
                    id="main"
                    order={2}
                    defaultSize={45}
                    minSize={20}
                >
                    <MainPanel />
                </Panel>

                <PanelResizeHandle className="resize-handle" />

                {/* Right Panel - Editor/Diff */}
                <Panel
                    id="stage"
                    order={3}
                    defaultSize={35}
                    minSize={20}
                >
                    <StagePanel />
                </Panel>
            </PanelGroup>

            {/* Terminal Activity Monitor - Floating notifications */}
            <TerminalActivityMonitor />
        </div>
    )
}

export default Layout
