import React, { useEffect, useState } from 'react'
import './WorkspacePicker.css'

interface WorkspacePickerData {
    recentWorkspaces: string[]
    homeDir: string
}

const WorkspacePicker: React.FC = () => {
    const [data, setData] = useState<WorkspacePickerData | null>(null)
    const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null)

    useEffect(() => {
        // 监听来自主进程的初始化数据
        const handleInit = (_event: any, initData: WorkspacePickerData) => {
            setData(initData)
        }

        window.electron.ipcRenderer.on('workspace-picker:init', handleInit)

        return () => {
            window.electron.ipcRenderer.removeListener('workspace-picker:init', handleInit)
        }
    }, [])

    const handleSelectWorkspace = (workspacePath: string) => {
        setSelectedWorkspace(workspacePath)
    }

    const handleConfirm = () => {
        if (selectedWorkspace) {
            window.electron.ipcRenderer.send('workspace-picker:select', selectedWorkspace)
        }
    }

    const handleBrowse = async () => {
        const result = await window.api.dialog.openDirectory()
        if (result && !result.canceled && result.filePaths && result.filePaths.length > 0) {
            const workspacePath = result.filePaths[0]
            window.electron.ipcRenderer.send('workspace-picker:select', workspacePath)
        }
    }

    const handleCancel = () => {
        window.electron.ipcRenderer.send('workspace-picker:cancel')
    }

    const getWorkspaceName = (path: string): string => {
        return path.split(/[/\\]/).pop() || path
    }

    if (!data) {
        return (
            <div className="workspace-picker-container">
                <div className="loading">加载中...</div>
            </div>
        )
    }

    return (
        <div className="workspace-picker-container">
            <div className="workspace-picker-content">
                <div className="header">
                    <div className="icon">📁</div>
                    <h1>选择工作空间</h1>
                    <p>选择一个文件夹作为你的工作目录</p>
                </div>

                {data.recentWorkspaces.length > 0 && (
                    <div className="recent-section">
                        <h2>最近的工作空间</h2>
                        <div className="workspace-list">
                            {data.recentWorkspaces.map((workspace) => (
                                <div
                                    key={workspace}
                                    className={`workspace-item ${selectedWorkspace === workspace ? 'selected' : ''}`}
                                    onClick={() => handleSelectWorkspace(workspace)}
                                    onDoubleClick={handleConfirm}
                                >
                                    <div className="workspace-icon">📁</div>
                                    <div className="workspace-info">
                                        <div className="workspace-name">{getWorkspaceName(workspace)}</div>
                                        <div className="workspace-path">{workspace}</div>
                                    </div>
                                    {selectedWorkspace === workspace && (
                                        <div className="check-icon">✓</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="actions">
                    <button className="btn btn-secondary" onClick={handleBrowse}>
                        <span className="btn-icon">📁</span>
                        重新选择工作空间
                    </button>

                    <div className="button-group">
                        <button className="btn btn-ghost" onClick={handleCancel}>
                            取消
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleConfirm}
                            disabled={!selectedWorkspace}
                        >
                            打开工作空间
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default WorkspacePicker
