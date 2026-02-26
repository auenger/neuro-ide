import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // Workspace management
  workspace: {
    select: () => ipcRenderer.invoke('workspace:select')
  },

  // Dialog operations
  dialog: {
    openDirectory: () => ipcRenderer.invoke('dialog:openDirectory')
  },

  // File system operations
  fs: {
    readDir: (dirPath: string) => ipcRenderer.invoke('fs:readDir', dirPath),
    readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
    writeFile: (filePath: string, content: string) =>
      ipcRenderer.invoke('fs:writeFile', filePath, content),
    onFileChanged: (
      callback: (data: { event: string; path: string; timestamp?: number }) => void
    ) => {
      const handler = (
        _: any,
        payload: {
          event: string
          path: string
          timestamp?: number
        }
      ) => {
        callback(payload)
      }
      ipcRenderer.on('file:changed', handler)

      return () => ipcRenderer.removeListener('file:changed', handler)
    },
    searchInWorkspace: (workspacePath: string, query: string) =>
      ipcRenderer.invoke('fs:searchInWorkspace', { workspacePath, query }),
    setIgnoredDirectories: (ignoredDirectories: string[]) =>
      ipcRenderer.send('fileWatcher:setIgnoredDirectories', { ignoredDirectories })
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
    create: (sessionId: string, customPrompt?: string) =>
      ipcRenderer.invoke('session:create', sessionId, customPrompt),
    input: (sessionId: string, data: string) =>
      ipcRenderer.send('session:input', { sessionId, data }),
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
      const handler = (
        _: any,
        payload: { sessionId: string; exitCode: number; signal: number }
      ) => {
        callback(payload.sessionId, payload.exitCode, payload.signal)
      }
      ipcRenderer.on('session:exited', handler)
      return () => ipcRenderer.removeListener('session:exited', handler)
    }
  },

  // Claude Code History
  claudeHistory: {
    detect: () => ipcRenderer.invoke('claude-history:detect'),
    getProjects: () => ipcRenderer.invoke('claude-history:getProjects'),
    getSessions: (encodedProjectPath: string) =>
      ipcRenderer.invoke('claude-history:getSessions', encodedProjectPath),
    getMessages: (sessionId: string, encodedProjectPath: string, offset?: number, limit?: number) =>
      ipcRenderer.invoke(
        'claude-history:getMessages',
        sessionId,
        encodedProjectPath,
        offset,
        limit
      ),
    search: (query: string, limit?: number) =>
      ipcRenderer.invoke('claude-history:search', query, limit),
    getSessionStats: (sessionId: string, encodedProjectPath: string) =>
      ipcRenderer.invoke('claude-history:getSessionStats', sessionId, encodedProjectPath),
    getProjectStats: (encodedProjectPath: string) =>
      ipcRenderer.invoke('claude-history:getProjectStats', encodedProjectPath),
    getGlobalStats: () => ipcRenderer.invoke('claude-history:getGlobalStats'),
    getRecentEdits: (encodedProjectPath: string, limit?: number, offset?: number) =>
      ipcRenderer.invoke('claude-history:getRecentEdits', encodedProjectPath, limit, offset),
    getSessionEdits: (sessionId: string, encodedProjectPath: string) =>
      ipcRenderer.invoke('claude-history:getSessionEdits', sessionId, encodedProjectPath),
    onChanged: (callback: (data: { event: string; path: string; timestamp: number }) => void) => {
      const handler = (_: any, payload: { event: string; path: string; timestamp: number }) => {
        callback(payload)
      }
      ipcRenderer.on('claude-history:changed', handler)
      return () => ipcRenderer.removeListener('claude-history:changed', handler)
    },
    // Auto-sync methods
    findProjectByPath: (workspacePath: string) =>
      ipcRenderer.invoke('claude-history:findProjectByPath', workspacePath),
    getAllProjectSummaries: () => ipcRenderer.invoke('claude-history:getAllProjectSummaries'),
    copyToWorkspace: (workspacePath: string, encodedProjectPath: string) =>
      ipcRenderer.invoke('claude-history:copyToWorkspace', workspacePath, encodedProjectPath),
    getWorkspaceHistory: (workspacePath: string) =>
      ipcRenderer.invoke('claude-history:getWorkspaceHistory', workspacePath),
    // Deleted sessions management
    getDeletedSessions: () => ipcRenderer.invoke('claude-history:getDeletedSessions'),
    getDeletedSessionsForProject: (encodedProjectPath: string) =>
      ipcRenderer.invoke('claude-history:getDeletedSessionsForProject', encodedProjectPath),
    markSessionDeleted: (encodedProjectPath: string, sessionId: string) =>
      ipcRenderer.invoke('claude-history:markSessionDeleted', encodedProjectPath, sessionId),
    restoreSession: (encodedProjectPath: string, sessionId: string) =>
      ipcRenderer.invoke('claude-history:restoreSession', encodedProjectPath, sessionId),
    clearDeletedSessionsForProject: (encodedProjectPath: string) =>
      ipcRenderer.invoke('claude-history:clearDeletedSessionsForProject', encodedProjectPath)
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
