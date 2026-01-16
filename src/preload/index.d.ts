import { ElectronAPI } from '@electron-toolkit/preload'

export interface FileChangeData {
  event: string
  path: string
  timestamp?: number
}

export interface API {
  workspace: {
    select: () => Promise<{ success: boolean; path: string | null }>
  }
  dialog: {
    openDirectory: () => Promise<{ canceled: boolean; filePaths: string[] }>
  }
  fs: {
    readDir: (dirPath: string) => Promise<any[]>
    readFile: (filePath: string) => Promise<{ success: boolean; content: string | null }>
    writeFile: (filePath: string, content: string) => Promise<{ success: boolean }>
    onFileChanged: (callback: (data: FileChangeData) => void) => () => void
    searchInWorkspace: (workspacePath: string, query: string) => Promise<any[]>
  }
  config: {
    load: (params: any) => Promise<any>
    save: (params: any) => Promise<boolean>
    loadRoleSettings: (params: any) => Promise<any>
    saveRoleSettings: (params: any) => Promise<boolean>
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

declare global {
  interface Window {
    electron: ElectronAPI & {
      process: any
      ipcRenderer: {
        send(channel: string, ...args: any[]): void
        on(channel: string, func: (...args: any[]) => void): () => void
        once(channel: string, func: (...args: any[]) => void): void
        removeListener(channel: string, func: (...args: any[]) => void): void
        removeAllListeners(channel: string): void
        invoke(channel: string, ...args: any[]): Promise<any>
      }
    }
    api: API
  }
}
