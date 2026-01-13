import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import * as pty from 'node-pty'
import os from 'os'
import chokidar from 'chokidar'
import fs from 'fs/promises'
import { ConfigManager } from './config'

// Session Manager
class SessionManager {
  private sessions: Map<string, pty.IPty> = new Map()
  private shell: string
  private workingDirectory: string
  private outputFilters: RegExp[] = [
    /The default interactive shell is now zsh\./,
    /To update your account to use zsh, please run `chsh -s \/bin\/zsh`\./,
    /For more details, please visit https:\/\/support\.apple\.com\/kb\/HT208050\./,
    /\[Session exited: code=\d+, signal=\d+\]/,
    /\[Press any key to restart session\]/
  ]

  constructor(workingDirectory?: string) {
    this.shell = '/bin/bash'
    this.workingDirectory = workingDirectory || os.homedir()
  }

  setWorkingDirectory(dir: string): void {
    this.workingDirectory = dir
  }

  private filterOutput(data: string): string {
    let filtered = data
    for (const filter of this.outputFilters) {
      filtered = filtered.replace(filter, '')
    }
    // Remove empty lines that result from filtering
    filtered = filtered.replace(/\n\s*\n/g, '\n')
    return filtered
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
      const env = Object.assign({}, process.env, {
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
        HOME: process.env.HOME || os.homedir(),
        PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin'
      })

      // Add custom PS1 if provided
      if (customPrompt) {
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
  private watcher: chokidar.FSWatcher | null = null
  private mainWindow: BrowserWindow | null = null

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window
  }

  watch(directory: string): void {
    if (this.watcher) {
      this.watcher.close()
    }

    this.watcher = chokidar.watch(directory, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true
    })

    this.watcher
      .on('add', (path) => this.notify('add', path))
      .on('change', (path) => this.notify('change', path))
      .on('unlink', (path) => this.notify('unlink', path))

    console.log('Watching directory:', directory)
  }

  private notify(event: string, path: string): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('file:changed', { event, path })
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
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    mainWindow.webContents.openDevTools()
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

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.on('ping', () => console.log('pong'))

  const mainWindow = createWindow()
  const sessionManager = new SessionManager()
  const fileWatcher = new FileWatcher()
  fileWatcher.setMainWindow(mainWindow)

  // Workspace IPC handlers
  ipcMain.handle('workspace:select', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    })

    if (!result.canceled && result.filePaths.length > 0) {
      const workspacePath = result.filePaths[0]
      sessionManager.setWorkingDirectory(workspacePath)
      fileWatcher.watch(workspacePath)
      return { success: true, path: workspacePath }
    }

    return { success: false, path: null }
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

    const results: any[] = []
    const MAX_RESULTS = 1000

    async function searchRecursively(dir: string) {
      if (results.length >= MAX_RESULTS) return

      try {
        const files = await fs.readdir(dir, { withFileTypes: true })

        for (const file of files) {
          if (results.length >= MAX_RESULTS) return
          const fullPath = join(dir, file.name)

          if (file.isDirectory()) {
            if (['node_modules', '.git', 'dist', 'out', 'build', '.idea', '.vscode'].includes(file.name)) continue
            await searchRecursively(fullPath)
          } else {
            // Skip binary or large files check could go here
            // For now simply try to read as text
            if (['.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2', '.ttf', '.eot', '.mp4', '.webm', '.mp3', '.wav', '.zip', '.tar', '.gz', '.7z', '.pdf', '.exe', '.dll', '.so', '.dylib', '.class', '.pyc'].some(ext => file.name.endsWith(ext))) continue

            try {
              const content = await fs.readFile(fullPath, 'utf-8')
              const lines = content.split('\n')

              lines.forEach((line, index) => {
                if (results.length >= MAX_RESULTS) return
                if (line.includes(query)) {
                  results.push({
                    file: file.name,
                    path: fullPath,
                    line: index + 1,
                    content: line.trim()
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
    return results
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

  // Session IPC handlers
  ipcMain.handle('session:create', (_, sessionId: string, customPrompt?: string) => {
    const pid = sessionManager.createSession(sessionId, mainWindow, customPrompt)
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

  // Cleanup on app quit
  app.on('before-quit', () => {
    sessionManager.killAllSessions()
    fileWatcher.close()
  })

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
