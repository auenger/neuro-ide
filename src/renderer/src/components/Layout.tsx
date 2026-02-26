import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import Sidebar from './Sidebar'
import MainPanel from './MainPanel'
import StagePanel from './StagePanel'
import TerminalActivityMonitor from './TerminalActivityMonitor'
import { useAppStore } from '../store/appStore'
import './Layout.css'

const Layout = () => {
  const { stagePanelVisible, toggleStagePanelVisible } = useAppStore()

  return (
    <div className="layout-container">
      <PanelGroup direction="horizontal">
        {/* Left Panel - Sidebar */}
        <Panel id="sidebar" order={1} defaultSize={20} minSize={15} maxSize={50}>
          <Sidebar />
        </Panel>

        <PanelResizeHandle className="resize-handle" />

        {/* Middle Panel - Markdown + Chat */}
        <Panel id="main" order={2} defaultSize={stagePanelVisible ? 45 : 80} minSize={30}>
          <MainPanel />
        </Panel>

        {/* Toggle Button for Stage Panel */}
        {stagePanelVisible && <PanelResizeHandle className="resize-handle" />}

        {/* Right Panel - Editor/Diff */}
        {stagePanelVisible && (
          <Panel id="stage" order={3} defaultSize={35} minSize={20}>
            <StagePanel />
          </Panel>
        )}
      </PanelGroup>

      {/* Toggle Stage Panel Button - Middle Right */}
      <button
        className={`stage-toggle-btn ${stagePanelVisible ? 'active' : ''}`}
        onClick={toggleStagePanelVisible}
        title={stagePanelVisible ? '隐藏编辑器' : '显示编辑器'}
      >
        {stagePanelVisible ? (
          <svg viewBox="0 0 16 16" fill="currentColor">
            <path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z"></path>
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" fill="currentColor">
            <path d="M9.78 3.22a.75.75 0 0 1 0 1.06L6.06 8l3.72 3.72a.75.75 0 1 1-1.06 1.06L4.47 8.53a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"></path>
          </svg>
        )}
      </button>

      {/* Terminal Activity Monitor - Floating notifications */}
      <TerminalActivityMonitor />
    </div>
  )
}

export default Layout
