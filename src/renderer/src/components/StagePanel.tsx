import { useRef } from 'react'
import { loader } from '@monaco-editor/react'
import { DiffEditor } from '@monaco-editor/react'
import { useAppStore } from '../store/appStore'
import * as monaco from 'monaco-editor'
import './StagePanel.css'

// Configure Monaco to use local files instead of CDN
loader.config({ monaco })

const StagePanel = () => {
    const {
        currentFile,
        currentFileContent,
        setCurrentFileContent,
        originalFileContent,
        changedFiles
    } = useAppStore()

    const editorRef = useRef<monaco.editor.IStandaloneDiffEditor | null>(null)

    const handleEditorDidMount = (editor: monaco.editor.IStandaloneDiffEditor) => {
        editorRef.current = editor

        // Get the modified editor and listen for content changes
        const modifiedEditor = editor.getModifiedEditor()
        modifiedEditor.onDidChangeModelContent(() => {
            const value = modifiedEditor.getValue()
            setCurrentFileContent(value)
        })
    }

    const handleSaveFile = async () => {
        if (currentFile && currentFileContent !== null) {
            const result = await window.api.fs.writeFile(currentFile, currentFileContent)
            if (result.success) {
                console.log('File saved:', currentFile)
            }
        }
    }

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

    // Check if there are unsaved changes
    const hasUnsavedChanges = currentFile && currentFileContent !== originalFileContent

    return (
        <div className="panel-base stage-panel">
            <div className="stage-header">
                <div className="stage-title">
                    <h4>编辑器</h4>
                    {currentFile && (
                        <div className="file-info">
                            {changedFiles.has(currentFile) && <span className="file-modified">●</span>}
                            <span className="current-file">{currentFile.split(/[/\\]/).pop()}</span>
                        </div>
                    )}
                </div>
                <div className="stage-actions">
                    {currentFile && (
                        <button
                            className={`save-btn ${hasUnsavedChanges ? 'has-changes' : ''}`}
                            onClick={handleSaveFile}
                            title="保存文件 (Cmd+S)"
                        >
                            <svg viewBox="0 0 16 16" fill="currentColor">
                                <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"></path>
                            </svg>
                            <span>保存</span>
                        </button>
                    )}
                </div>
            </div>
            <div className="stage-content">
                {currentFile && (
                    <DiffEditor
                        height="100%"
                        language={getLanguageFromFilename(currentFile)}
                        original={originalFileContent}
                        modified={currentFileContent}
                        theme="vs-dark"
                        onMount={handleEditorDidMount}
                        options={{
                            readOnly: false,
                            renderSideBySide: false,
                            fontSize: 13,
                            automaticLayout: true,
                            minimap: { enabled: false },
                            lineNumbers: 'on',
                            scrollBeyondLastLine: false,
                            glyphMargin: false,
                            folding: false,
                            lineDecorationsWidth: 0,
                            lineNumbersMinChars: 3,
                            renderOverviewRuler: false,
                            hideUnchangedRegions: { enabled: true }
                        }}
                    />
                )}
                {!currentFile && (
                    <div className="placeholder">
                        <svg className="placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                        </svg>
                        <p>编辑器</p>
                        <p className="placeholder-hint">点击文件树中的文件开始编辑</p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default StagePanel
