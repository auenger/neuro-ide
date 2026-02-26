import { BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import os from 'os'

/**
 * 工作空间选择器窗口
 * 在应用启动时如果没有选择工作空间，显示此窗口让用户选择
 */
export class WorkspacePickerWindow {
  private window: BrowserWindow | null = null
  private resolvePromise: ((value: string | null) => void) | null = null
  private selectHandler: ((event: any, workspacePath: string) => void) | null = null
  private cancelHandler: (() => void) | null = null

  /**
   * 显示工作空间选择窗口
   * @param recentWorkspaces 最近的工作空间列表
   * @returns 用户选择的工作空间路径，如果取消则返回 null
   */
  async show(recentWorkspaces: string[]): Promise<string | null> {
    return new Promise((resolve) => {
      this.resolvePromise = resolve
      this.createWindow(recentWorkspaces)
    })
  }

  /**
   * 创建工作空间选择窗口
   */
  private createWindow(recentWorkspaces: string[]): void {
    this.window = new BrowserWindow({
      width: 600,
      height: 500,
      show: false,
      resizable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      title: '选择工作空间',
      backgroundColor: '#1b1b1f',
      center: true,
      frame: true,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        nodeIntegration: false,
        contextIsolation: true
      }
    })

    // 设置窗口关闭时的处理
    this.window.on('closed', () => {
      this.cleanup()
      if (this.resolvePromise) {
        this.resolvePromise(null)
        this.resolvePromise = null
      }
      this.window = null
    })

    // 窗口准备好后显示
    this.window.once('ready-to-show', () => {
      this.window?.show()
    })

    // 注册 IPC 处理器
    this.registerIpcHandlers()

    // 加载页面
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      // 开发模式：加载开发服务器的 URL，带上特殊路由参数
      this.window.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/workspace-picker`)
    } else {
      // 生产模式：加载打包后的 HTML
      this.window.loadFile(join(__dirname, '../renderer/index.html'), {
        hash: '/workspace-picker'
      })
    }

    // 发送最近工作空间数据到渲染进程
    this.window.webContents.once('did-finish-load', () => {
      console.log('Sending workspace picker data:', {
        recentWorkspaces,
        homeDir: os.homedir()
      })
      this.window?.webContents.send('workspace-picker:init', {
        recentWorkspaces,
        homeDir: os.homedir()
      })
    })
  }

  /**
   * 注册 IPC 处理器
   */
  private registerIpcHandlers(): void {
    // 用户选择了工作空间
    this.selectHandler = (_event: any, workspacePath: string) => {
      console.log('Workspace selected:', workspacePath)
      if (this.resolvePromise) {
        this.resolvePromise(workspacePath)
        this.resolvePromise = null
      }
      this.close()
    }
    ipcMain.on('workspace-picker:select', this.selectHandler)

    // 用户取消选择
    this.cancelHandler = () => {
      console.log('Workspace selection cancelled')
      if (this.resolvePromise) {
        this.resolvePromise(null)
        this.resolvePromise = null
      }
      this.close()
    }
    ipcMain.on('workspace-picker:cancel', this.cancelHandler)
  }

  /**
   * 清理 IPC 监听器
   */
  private cleanup(): void {
    if (this.selectHandler) {
      ipcMain.removeListener('workspace-picker:select', this.selectHandler)
      this.selectHandler = null
    }
    if (this.cancelHandler) {
      ipcMain.removeListener('workspace-picker:cancel', this.cancelHandler)
      this.cancelHandler = null
    }
  }

  /**
   * 关闭窗口
   */
  private close(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.close()
    }
  }
}
