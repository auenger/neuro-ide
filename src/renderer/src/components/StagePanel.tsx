import { useEffect, useRef } from 'react'
import { loader } from '@monaco-editor/react'
import Editor, { DiffEditor } from '@monaco-editor/react'
import { useAppStore } from '../store/appStore'
import * as monaco from 'monaco-editor'
import './StagePanel.css'

// Configure Monaco to use local files instead of CDN
loader.config({ monaco })

const StagePanel = () => {
    const {
        editorMode,
        setEditorMode,
        currentFile,
        currentFileContent,
        setCurrentFileContent,
        originalFileContent,
        changedFiles
    } = useAppStore()

    const editorRef = useRef<any>(null)

    const handleEditorDidMount = (editor: any) => {
        editorRef.current = editor
        editor.updateOptions({
            minimap: { enabled: true },
            fontSize: 13,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            readOnly: false,
            theme: 'vs-dark'
        })
    }

    const handleEditorChange = (value: string | undefined) => {
        if (value !== undefined) {
            setCurrentFileContent(value)
        }
    }

    const handleSaveFile = async () => {
        if (currentFile && currentFileContent !== null) {
            const result = await window.api.fs.writeFile(currentFile, currentFileContent)
            if (result.success) {
                console.log('File saved:', currentFile)
            }
        }
    }

    // Auto-switch to diff mode when file changes detected
    useEffect(() => {
        if (currentFile && changedFiles.has(currentFile)) {
            setEditorMode('diff')
        }
    }, [changedFiles, currentFile])

    const getLanguageFromFilename = (filename: string | null): string => {
        if (!filename) return 'typescript'
        const ext = filename.split('.').pop()?.toLowerCase()
        const langMap: Record<string, string> = {
            'ts': 'typescript',
            'tsx': 'typescript',
            'js': 'javascript',
            'jsx': 'javascript',
            'json': 'json',
            'html': 'html',
            'css': 'css',
            'md': 'markdown',
            'py': 'python',
            'go': 'go',
            'rs': 'rust',
            'java': 'java'
        }
        return langMap[ext || ''] || 'plaintext'
    }

    return (
        <div className="panel-base stage-panel">
            <div className="stage-header">
                <div className="stage-title">
                    <h4>编辑器 / Diff 视图</h4>
                    {currentFile && (
                        <div className="file-info">
                            <span className="current-file">{currentFile.split(/[/\\]/).pop()}</span>
                            {changedFiles.has(currentFile) && <span className="file-modified">●</span>}
                        </div>
                    )}
                </div>
                <div className="stage-actions">
                    {currentFile && editorMode === 'editor' && (
                        <button className="save-btn" onClick={handleSaveFile} title="保存文件 (Cmd+S)">
                            <svg viewBox="0 0 16 16" fill="currentColor">
                                <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"></path>
                            </svg>
                            保存
                        </button>
                    )}
                    <div className="stage-tabs">
                        <button
                            className={`tab ${editorMode === 'editor' ? 'active' : ''}`}
                            onClick={() => setEditorMode('editor')}
                        >
                            <svg viewBox="0 0 16 16" fill="currentColor">
                                <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm.176 4.823L9.75 4.81l-6.286 6.287a.253.253 0 0 0-.064.108l-.558 1.953 1.953-.558a.253.253 0 0 0 .108-.064Zm1.238-3.763a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354Z"></path>
                            </svg>
                            编辑器
                        </button>
                        <button
                            className={`tab ${editorMode === 'diff' ? 'active' : ''}`}
                            onClick={() => setEditorMode('diff')}
                        >
                            <svg viewBox="0 0 16 16" fill="currentColor">
                                <path d="M8.75 1.75V5h3.25a.75.75 0 0 1 0 1.5H8.75v3.25a.75.75 0 0 1-1.5 0V6.5H3.5a.75.75 0 0 1 0-1.5h3.75V1.75a.75.75 0 0 1 1.5 0ZM3.5 9.5a.75.75 0 0 0 0 1.5h8.25a.75.75 0 0 0 0-1.5H3.5Z"></path>
                            </svg>
                            Diff
                        </button>
                    </div>
                </div>
            </div>
            <div className="stage-content">
                {editorMode === 'editor' && (
                    <Editor
                        height="100%"
                        language={getLanguageFromFilename(currentFile)}
                        value={currentFileContent}
                        theme="vs-dark"
                        onMount={handleEditorDidMount}
                        onChange={handleEditorChange}
                        options={{
                            minimap: { enabled: true },
                            fontSize: 13,
                            lineNumbers: 'on',
                            scrollBeyondLastLine: false,
                            automaticLayout: true
                        }}
                    />
                )}
                {editorMode === 'diff' && currentFile && (
                    <DiffEditor
                        height="100%"
                        language={getLanguageFromFilename(currentFile)}
                        original={originalFileContent}
                        modified={currentFileContent}
                        theme="vs-dark"
                        options={{
                            readOnly: false,
                            renderSideBySide: true,
                            fontSize: 13,
                            automaticLayout: true
                        }}
                    />
                )}
                {editorMode === 'diff' && !currentFile && (
                    <div className="placeholder">
                        <svg className="placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                        </svg>
                        <p>Diff 视图</p>
                        <p className="placeholder-hint">打开文件后可查看变更对比</p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default StagePanel
