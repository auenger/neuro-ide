/// <reference types="vite/client" />

interface FileEntry {
    name: string
    isDirectory: boolean
    path: string
}

interface Window {
    electron: {
        ipcRenderer: {
            send(channel: string, ...args: any[]): void
            on(channel: string, func: (...args: any[]) => void): () => void
            once(channel: string, func: (...args: any[]) => void): void
            removeListener(channel: string, func: (...args: any[]) => void): void
            removeAllListeners(channel: string): void
        }
    }
    api: {
        workspace: {
            select: () => Promise<{ success: boolean; path: string | null }>
        }
        config: {
            load: <T>(params: { workspacePath: string; filename: string; defaultValue: T }) => Promise<T>
            save: <T>(params: { workspacePath: string; filename: string; data: T }) => Promise<boolean>
            loadRoleSettings: <T>(params: { workspacePath: string; defaultValue: T }) => Promise<T>
            saveRoleSettings: <T>(params: { workspacePath: string; data: T }) => Promise<boolean>
        }
        fs: {
            readDir: (dirPath: string) => Promise<FileEntry[]>
            readFile: (filePath: string) => Promise<{ success: boolean; content: string | null }>
            writeFile: (filePath: string, content: string) => Promise<{ success: boolean }>
            onFileChanged: (callback: (event: string, path: string) => void) => () => void
            searchInWorkspace: (workspacePath: string, query: string) => Promise<Array<{
                file: string
                path: string
                line: number
                content: string
            }>>
        }
        session: {
            create: (sessionId: string, customPrompt?: string) => Promise<{ success: boolean; pid: number | null }>
            input: (sessionId: string, data: string) => void
            resize: (sessionId: string, cols: number, rows: number) => void
            kill: (sessionId: string) => Promise<boolean>
            onIncoming: (callback: (sessionId: string, data: string) => void) => () => void
            onExited: (callback: (sessionId: string, exitCode: number, signal: number) => void) => () => void
        }
    }
}
