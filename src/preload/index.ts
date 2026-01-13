import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // Workspace management
  workspace: {
    select: () => ipcRenderer.invoke('workspace:select')
  },

  // File system operations
  fs: {
    readDir: (dirPath: string) => ipcRenderer.invoke('fs:readDir', dirPath),
    readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
    writeFile: (filePath: string, content: string) => ipcRenderer.invoke('fs:writeFile', filePath, content),
    onFileChanged: (callback: (event: string, path: string) => void) => {
      const handler = (_: any, payload: { event: string; path: string }) => {
        callback(payload.event, payload.path)
      }
      ipcRenderer.on('file:changed', handler)

      return () => ipcRenderer.removeListener('file:changed', handler)
    },
    searchInWorkspace: (workspacePath: string, query: string) =>
      ipcRenderer.invoke('fs:searchInWorkspace', { workspacePath, query })
  },

  // Config management
  config: {
    load: (params: any) => ipcRenderer.invoke('config:load', params),
    save: (params: any) => ipcRenderer.invoke('config:save', params),
    loadRoleSettings: (params: any) => ipcRenderer.invoke('config:loadRoleSettings', params),
    saveRoleSettings: (params: any) => ipcRenderer.invoke('config:saveRoleSettings', params)
  },

  // Session management
  session: {
    create: (sessionId: string) => ipcRenderer.invoke('session:create', sessionId),
    input: (sessionId: string, data: string) => ipcRenderer.send('session:input', { sessionId, data }),
    resize: (sessionId: string, cols: number, rows: number) =>
      ipcRenderer.send('session:resize', { sessionId, cols, rows }),
    kill: (sessionId: string) => ipcRenderer.invoke('session:kill', sessionId),
    onIncoming: (callback: (sessionId: string, data: string) => void) => {
      const handler = (_: any, payload: { sessionId: string; data: string }) => {
        callback(payload.sessionId, payload.data)
      }
      ipcRenderer.on('terminal:incoming', handler)
      return () => ipcRenderer.removeListener('terminal:incoming', handler)
    },
    onExited: (callback: (sessionId: string, exitCode: number, signal: number) => void) => {
      const handler = (_: any, payload: { sessionId: string; exitCode: number; signal: number }) => {
        callback(payload.sessionId, payload.exitCode, payload.signal)
      }
      ipcRenderer.on('session:exited', handler)
      return () => ipcRenderer.removeListener('session:exited', handler)
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to renderer
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
