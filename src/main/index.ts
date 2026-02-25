import { app, shell, BrowserWindow, ipcMain, dialog, nativeTheme } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import * as pty from 'node-pty'
import os from 'os'
import chokidar from 'chokidar'
import fs from 'fs/promises'
import { ConfigManager } from './config'
import { RecentWorkspacesManager } from './recentWorkspaces'
import { WorkspacePickerWindow } from './workspacePicker'
import { claudeHistoryService } from './claudeHistory'

// Session Manager
class SessionManager {
  private sessions: Map<string, pty.IPty> = new Map()
  private shell: string
  private workingDirectory: string
  constructor(workingDirectory?: string) {
    // Detect platform and set appropriate shell
    if (process.platform === 'win32') {
      // On Windows, try PowerShell first, fallback to cmd.exe
      this.shell = process.env.SHELL || 'powershell.exe'
    } else {
      // On macOS/Linux, use bash or zsh
      this.shell = process.env.SHELL || '/bin/bash'
    }
    this.workingDirectory = workingDirectory || os.homedir()
    console.log(`SessionManager initialized with shell: ${this.shell}, cwd: ${this.workingDirectory}`)
  }

  setWorkingDirectory(dir: string): void {
    this.workingDirectory = dir
  }

  createSession(sessionId: string, mainWindow: BrowserWindow, customPrompt?: string): number | null {
    // Kill existing session if any
    if (this.sessions.has(sessionId)) {
      try {
        this.sessions.get(sessionId)?.kill()
      } catch (e) {
        console.error(`Failed to kill existing session ${sessionId}:`, e)
      }
    }

    try {
      // Platform-aware environment setup
      const isWindows = process.platform === 'win32'
      const env = Object.assign({}, process.env, {
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
        // Disable zsh's % marker at end of partial lines
        PROMPT_EOL_MARK: ''
      })

      // Set HOME/USERPROFILE based on platform
      if (isWindows) {
        env.USERPROFILE = process.env.USERPROFILE || os.homedir()
        if (!env.PATH) {
          env.PATH = 'C:\\Windows\\System32;C:\\Windows;C:\\Windows\\System32\\Wbem'
        }
      } else {
        env.HOME = process.env.HOME || os.homedir()
        if (!env.PATH) {
          env.PATH = '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin'
        }
      }

      // Add custom PS1 if provided (Unix only)
      if (customPrompt && !isWindows) {
        env.PS1 = customPrompt
      }

      const ptyProcess = pty.spawn(this.shell, [], {
        name: 'xterm-256color',
        cols: 80,
        rows: 30,
        cwd: this.workingDirectory,
        env: env as Record<string, string>
      })

      console.log(`✓ Session ${sessionId} created with PID:`, ptyProcess.pid, 'in', this.workingDirectory)

      ptyProcess.onData((data) => {
        if (!mainWindow.isDestroyed()) {
          // Temporary rollback of filtering logic to fix terminal output issues
          // const filteredData = this.filterOutput(data)
          // if (filteredData.trim().length > 0) {
          mainWindow.webContents.send('terminal:incoming', { sessionId, data: data })
          // }
        }
      })

      ptyProcess.onExit(({ exitCode, signal }) => {
        console.log(`Session ${sessionId} exited:`, { exitCode, signal })
        this.sessions.delete(sessionId)
        // Don't send exit message to avoid clutter
        // if (!mainWindow.isDestroyed()) {
        //   mainWindow.webContents.send('session:exited', { sessionId, exitCode, signal })
        // }
      })

      this.sessions.set(sessionId, ptyProcess)
      return ptyProcess.pid
    } catch (error) {
      console.error(`✗ Failed to create session ${sessionId}:`, error)
      return null
    }
  }

  writeToSession(sessionId: string, data: string): boolean {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.write(data)
      return true
    }
    return false
  }

  resizeSession(sessionId: string, cols: number, rows: number): boolean {
    const session = this.sessions.get(sessionId)
    if (session) {
      try {
        session.resize(cols, rows)
        return true
      } catch (e) {
        console.error(`Failed to resize session ${sessionId}:`, e)
        return false
      }
    }
    return false
  }

  killSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId)
    if (session) {
      try {
        session.kill()
        this.sessions.delete(sessionId)
        return true
      } catch (e) {
        console.error(`Failed to kill session ${sessionId}:`, e)
        return false
      }
    }
    return false
  }

  killAllSessions(): void {
    this.sessions.forEach((session, id) => {
      try {
        session.kill()
      } catch (e) {
        console.error(`Failed to kill session ${id}:`, e)
      }
    })
    this.sessions.clear()
  }
}

// File Watcher
class FileWatcher {
  private watcher: ReturnType<typeof chokidar.watch> | null = null
  private mainWindow: BrowserWindow | null = null
  private currentDirectory: string | null = null
  private ignoredDirectories: string[] = []

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window
  }

  setIgnoredDirectories(dirs: string[]): void {
    this.ignoredDirectories = dirs
    // Re-watch with new settings if currently watching
    if (this.currentDirectory) {
      this.watch(this.currentDirectory)
    }
  }

  watch(directory: string): void {
    if (this.watcher) {
      this.watcher.close()
    }

    this.currentDirectory = directory

    this.watcher = chokidar.watch(directory, {
      ignored: (path) => {
        // Explicitly ignore node_modules and other heavy/build directories
        if (path.includes('node_modules')) return true
        if (path.includes('.git')) return true
        if (path.includes(directory + '/dist')) return true
        if (path.includes(directory + '/out')) return true
        if (path.includes(directory + '/build')) return true

        // Check for hidden files/folders (starting with .)
        const basename = path.split(/[/\\]/).pop() || ''
        if (basename.startsWith('.')) return true

        // Check user-defined ignored directories (relative paths)
        for (const ignoredDir of this.ignoredDirectories) {
          // ignoredDir is now a relative path like "src/out" or just "out"
          if (path.includes(directory + '/' + ignoredDir)) {
            return true
          }
        }

        return false
      },
      persistent: true,
      ignoreInitial: true,
      ignorePermissionErrors: true
    })

    this.watcher
      .on('add', (path) => this.notify('add', path))
      .on('change', (path) => this.notify('change', path))
      .on('unlink', (path) => this.notify('unlink', path))
      .on('error', (error) => console.error('FileWatcher error:', error))

    console.log('Watching directory:', directory, 'with ignored dirs:', this.ignoredDirectories)
  }

  private notify(event: string, path: string): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('file:changed', {
        event,
        path,
        timestamp: Date.now()
      })
      console.log(`File ${event}:`, path)
    }
  }

  close(): void {
    if (this.watcher) {
      this.watcher.close()
      this.watcher = null
    }
  }
}

function createWindow(): BrowserWindow {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    autoHideMenuBar: true,
    title: 'Neuro',
    backgroundColor: '#1b1b1f', // Match the app's dark theme
    // Use default Windows title bar with dark theme
    ...(process.platform === 'win32' ? {
      titleBarStyle: 'default',
      frame: true
    } : {}),
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // Apply Windows dark mode to title bar
  if (process.platform === 'win32') {
    // This requires Windows 10 build 17763 or later
    nativeTheme.themeSource = 'dark'
  }

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    // Only open DevTools in development mode
    if (is.dev) {
      mainWindow.webContents.openDevTools()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

// Global references
let mainWindow: BrowserWindow | null = null
const sessionManager = new SessionManager()
const fileWatcher = new FileWatcher()
const homeDir = process.env.HOME || process.env.USERPROFILE || ''
const tempConfigManager = new ConfigManager(homeDir)
const recentWorkspacesManager = new RecentWorkspacesManager(tempConfigManager)

// Initialize workspace manager
async function initializeApp(): Promise<void> {
  await recentWorkspacesManager.initialize()

  // Set up callback for when a workspace is selected from the recent list
  recentWorkspacesManager.setWorkspaceSelectedCallback((workspacePath) => {
    console.log('[Workspace] Selected from menu:', workspacePath)

    // Check if window exists and is valid
    if (!mainWindow || mainWindow.isDestroyed()) {
      console.log('[Workspace] Creating new window')
      mainWindow = createWindow()
      fileWatcher.setMainWindow(mainWindow)

      // Wait for window to be ready before applying workspace
      mainWindow.webContents.once('did-finish-load', () => {
        console.log('[Workspace] Window ready, applying workspace')
        applyWorkspace(workspacePath)
      })
    } else {
      console.log('[Workspace] Using existing window')
      // Window already exists, apply immediately
      applyWorkspace(workspacePath)
    }
  })
}

// Apply workspace settings
function applyWorkspace(workspacePath: string): void {
  console.log('[Workspace] Applying workspace:', workspacePath)

  if (!mainWindow || mainWindow.isDestroyed()) {
    console.warn('[Workspace] Cannot apply workspace: window is destroyed')
    return
  }

  console.log('[Workspace] Setting working directory')
  sessionManager.setWorkingDirectory(workspacePath)

  console.log('[Workspace] Starting file watcher')
  fileWatcher.watch(workspacePath)

  console.log('[Workspace] Saving current workspace config')
  tempConfigManager.saveConfig('current-workspace.json', { path: workspacePath }, 'global')

  console.log('[Workspace] Sending workspace:opened event to renderer')
  mainWindow.webContents.send('workspace:opened', { path: workspacePath })

  console.log('[Workspace] Workspace applied successfully')
}

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.on('ping', () => console.log('pong'))

  // Initialize app
  await initializeApp()

  mainWindow = createWindow()
  fileWatcher.setMainWindow(mainWindow)
  claudeHistoryService.setMainWindow(mainWindow)
  claudeHistoryService.startWatching()

  // Workspace IPC handlers
  ipcMain.handle('workspace:select', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory']
    })

    if (!result.canceled && result.filePaths.length > 0) {
      const workspacePath = result.filePaths[0]
      sessionManager.setWorkingDirectory(workspacePath)
      fileWatcher.watch(workspacePath)
      // Add to recent workspaces
      await recentWorkspacesManager.addWorkspace(workspacePath)
      // Save current workspace
      await tempConfigManager.saveConfig('current-workspace.json', { path: workspacePath }, 'global')
      return { success: true, path: workspacePath }
    }

    return { success: false, path: null }
  })

  // Dialog IPC handler for workspace picker
  ipcMain.handle('dialog:openDirectory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    return result
  })

  // File system IPC handlers
  ipcMain.handle('fs:readDir', async (_, dirPath: string) => {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true })
      return entries.map(entry => ({
        name: entry.name,
        isDirectory: entry.isDirectory(),
        path: join(dirPath, entry.name)
      }))
    } catch (error) {
      console.error('Failed to read directory:', error)
      return []
    }
  })

  ipcMain.handle('fs:readFile', async (_, filePath: string) => {
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      return { success: true, content }
    } catch (error) {
      console.error('Failed to read file:', error)
      return { success: false, content: null }
    }
  })

  ipcMain.handle('fs:writeFile', async (_, filePath: string, content: string) => {
    try {
      await fs.writeFile(filePath, content, 'utf-8')
      return { success: true }
    } catch (error) {
      console.error('Failed to write file:', error)
      return { success: false }
    }
  })

  ipcMain.handle('fs:searchInWorkspace', async (_, { workspacePath, query }) => {
    if (!workspacePath || !query) return []

    const filenameMatches: any[] = []
    const contentMatches: any[] = []
    const MAX_RESULTS = 1000

    async function searchRecursively(dir: string) {
      if (filenameMatches.length + contentMatches.length >= MAX_RESULTS) return

      try {
        const files = await fs.readdir(dir, { withFileTypes: true })

        for (const file of files) {
          if (filenameMatches.length + contentMatches.length >= MAX_RESULTS) return
          const fullPath = join(dir, file.name)

          if (file.isDirectory()) {
            if (['node_modules', '.git', 'dist', 'out', 'build', '.idea', '.vscode'].includes(file.name)) continue
            await searchRecursively(fullPath)
          } else {
            // Check if filename matches (case-insensitive)
            const isFilenameMatch = file.name.toLowerCase().includes(query.toLowerCase())

            // Skip binary or large files check could go here
            // For now simply try to read as text
            if (['.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2', '.ttf', '.eot', '.mp4', '.webm', '.mp3', '.wav', '.zip', '.tar', '.gz', '.7z', '.pdf', '.exe', '.dll', '.so', '.dylib', '.class', '.pyc'].some(ext => file.name.endsWith(ext))) continue

            if (isFilenameMatch) {
              // Add filename match with special marker
              filenameMatches.push({
                file: file.name,
                path: fullPath,
                line: 0, // 0 indicates filename match
                content: `📄 文件名匹配: ${file.name}`,
                isFilenameMatch: true
              })
            }

            // Search in file content
            try {
              const content = await fs.readFile(fullPath, 'utf-8')
              const lines = content.split('\n')

              lines.forEach((line, index) => {
                if (filenameMatches.length + contentMatches.length >= MAX_RESULTS) return
                if (line.includes(query)) {
                  contentMatches.push({
                    file: file.name,
                    path: fullPath,
                    line: index + 1,
                    content: line.trim(),
                    isFilenameMatch: false
                  })
                }
              })
            } catch (err) {
              // Ignore read errors
            }
          }
        }
      } catch (err) {
        // Ignore dir read errors
      }
    }

    await searchRecursively(workspacePath)

    // Return filename matches first, then content matches
    return [...filenameMatches, ...contentMatches]
  })

  // Config IPC handlers
  ipcMain.handle('config:load', async (_, { workspacePath, filename, defaultValue }) => {
    if (!workspacePath) return defaultValue
    const configManager = new ConfigManager(workspacePath)
    return configManager.loadConfig(filename, defaultValue)
  })

  ipcMain.handle('config:save', async (_, { workspacePath, filename, data }) => {
    if (!workspacePath) return false
    const configManager = new ConfigManager(workspacePath)
    return configManager.saveConfig(filename, data)
  })

  ipcMain.handle('config:loadRoleSettings', async (_, { workspacePath, defaultValue }) => {
    if (!workspacePath) return defaultValue
    const configManager = new ConfigManager(workspacePath)
    return configManager.loadRoleSettings(defaultValue)
  })

  ipcMain.handle('config:saveRoleSettings', async (_, { workspacePath, data }) => {
    if (!workspacePath) return false
    const configManager = new ConfigManager(workspacePath)
    return configManager.saveRoleSettings(data)
  })

  // Update ignored directories for file watcher
  ipcMain.on('fileWatcher:setIgnoredDirectories', (_, { ignoredDirectories }: { ignoredDirectories: string[] }) => {
    fileWatcher.setIgnoredDirectories(ignoredDirectories)
  })

  // Session IPC handlers
  ipcMain.handle('session:create', (_, sessionId: string, customPrompt?: string) => {
    const pid = sessionManager.createSession(sessionId, mainWindow!, customPrompt)
    return { success: pid !== null, pid }
  })

  ipcMain.on('session:input', (_, { sessionId, data }) => {
    sessionManager.writeToSession(sessionId, data)
  })

  ipcMain.on('session:resize', (_, { sessionId, cols, rows }) => {
    sessionManager.resizeSession(sessionId, cols, rows)
  })

  ipcMain.handle('session:kill', (_, sessionId: string) => {
    return sessionManager.killSession(sessionId)
  })

  // Claude History IPC handlers
  ipcMain.handle('claude-history:detect', async () => {
    return claudeHistoryService.detect()
  })

  ipcMain.handle('claude-history:getProjects', async () => {
    return claudeHistoryService.getProjects()
  })

  ipcMain.handle('claude-history:getSessions', async (_, encodedProjectPath: string) => {
    return claudeHistoryService.getSessionsForProject(encodedProjectPath)
  })

  ipcMain.handle('claude-history:getMessages', async (_, sessionId: string, encodedProjectPath: string, offset?: number, limit?: number) => {
    return claudeHistoryService.getSessionMessages(sessionId, encodedProjectPath, offset, limit)
  })

  ipcMain.handle('claude-history:search', async (_, query: string, limit?: number) => {
    return claudeHistoryService.searchSessions(query, limit)
  })

  ipcMain.handle('claude-history:getSessionStats', async (_, sessionId: string, encodedProjectPath: string) => {
    return claudeHistoryService.getSessionStats(sessionId, encodedProjectPath)
  })

  ipcMain.handle('claude-history:getProjectStats', async (_, encodedProjectPath: string) => {
    return claudeHistoryService.getProjectStats(encodedProjectPath)
  })

  ipcMain.handle('claude-history:getGlobalStats', async () => {
    return claudeHistoryService.getGlobalStats()
  })

  ipcMain.handle('claude-history:getRecentEdits', async (_, encodedProjectPath: string, limit?: number, offset?: number) => {
    return claudeHistoryService.getRecentEdits(encodedProjectPath, limit, offset)
  })

  ipcMain.handle('claude-history:getSessionEdits', async (_, sessionId: string, encodedProjectPath: string) => {
    return claudeHistoryService.getSessionEdits(sessionId, encodedProjectPath)
  })

  // Auto-sync IPC handlers
  ipcMain.handle('claude-history:findProjectByPath', async (_, workspacePath: string) => {
    return claudeHistoryService.findProjectByPath(workspacePath)
  })

  ipcMain.handle('claude-history:getAllProjectSummaries', async () => {
    return claudeHistoryService.getAllProjectSummaries()
  })

  ipcMain.handle('claude-history:copyToWorkspace', async (_, workspacePath: string, encodedProjectPath: string) => {
    return claudeHistoryService.copyToWorkspace(workspacePath, encodedProjectPath)
  })

  ipcMain.handle('claude-history:getWorkspaceHistory', async (_, workspacePath: string) => {
    return claudeHistoryService.getWorkspaceHistory(workspacePath)
  })

  // Deleted sessions management
  ipcMain.handle('claude-history:getDeletedSessions', async () => {
    return claudeHistoryService.getDeletedSessions()
  })

  ipcMain.handle('claude-history:getDeletedSessionsForProject', async (_, encodedProjectPath: string) => {
    return claudeHistoryService.getDeletedSessionsForProject(encodedProjectPath)
  })

  ipcMain.handle('claude-history:markSessionDeleted', async (_, encodedProjectPath: string, sessionId: string) => {
    return claudeHistoryService.markSessionDeleted(encodedProjectPath, sessionId)
  })

  ipcMain.handle('claude-history:restoreSession', async (_, encodedProjectPath: string, sessionId: string) => {
    return claudeHistoryService.restoreSession(encodedProjectPath, sessionId)
  })

  ipcMain.handle('claude-history:clearDeletedSessionsForProject', async (_, encodedProjectPath: string) => {
    return claudeHistoryService.clearDeletedSessionsForProject(encodedProjectPath)
  })

  // Cleanup on app quit
  app.on('before-quit', () => {
    sessionManager.killAllSessions()
    fileWatcher.close()
    claudeHistoryService.stopWatching()
  })

  app.on('activate', async function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow()
      fileWatcher.setMainWindow(mainWindow)

      // Try to restore last workspace
      const lastWorkspace = await tempConfigManager.loadConfig<{ path: string }>(
        'current-workspace.json',
        { path: '' },
        'global'
      )

      if (lastWorkspace.path && lastWorkspace.path !== homeDir) {
        // Wait for window to be ready
        mainWindow.once('ready-to-show', () => {
          applyWorkspace(lastWorkspace.path)
        })
      }
    }
  })

  // Handle command line arguments (for Windows Jump List / macOS Dock menu)
  const workspaceFromArgs = recentWorkspacesManager.handleCommandLine(process.argv)
  if (workspaceFromArgs) {
    sessionManager.setWorkingDirectory(workspaceFromArgs)
    fileWatcher.watch(workspaceFromArgs)
    await tempConfigManager.saveConfig('current-workspace.json', { path: workspaceFromArgs }, 'global')
    mainWindow.webContents.send('workspace:opened', { path: workspaceFromArgs })
  } else {
    // Try to load last workspace
    const lastWorkspace = await tempConfigManager.loadConfig<{ path: string }>(
      'current-workspace.json',
      { path: '' },
      'global'
    )

    if (lastWorkspace.path && lastWorkspace.path !== homeDir) {
      // Restore last workspace
      sessionManager.setWorkingDirectory(lastWorkspace.path)
      fileWatcher.watch(lastWorkspace.path)
      mainWindow.webContents.send('workspace:opened', { path: lastWorkspace.path })
    } else {
      // Show workspace picker after main window is ready
      mainWindow.webContents.once('did-finish-load', async () => {
        const picker = new WorkspacePickerWindow()
        const recentWorkspaces = recentWorkspacesManager.getRecentWorkspaces()
        console.log('Showing workspace picker with recent workspaces:', recentWorkspaces)
        const selectedWorkspace = await picker.show(recentWorkspaces)

        if (selectedWorkspace) {
          sessionManager.setWorkingDirectory(selectedWorkspace)
          fileWatcher.watch(selectedWorkspace)
          await recentWorkspacesManager.addWorkspace(selectedWorkspace)
          await tempConfigManager.saveConfig('current-workspace.json', { path: selectedWorkspace }, 'global')
          mainWindow!.webContents.send('workspace:opened', { path: selectedWorkspace })
        }
      })
    }
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
