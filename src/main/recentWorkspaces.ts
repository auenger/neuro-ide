import { app, Menu } from 'electron'
import path from 'path'
import fs from 'fs'
import { ConfigManager } from './config'

/**
 * 最近工作空间管理器
 * 负责管理最近打开的工作空间列表，并在应用图标右键菜单中显示
 */
export class RecentWorkspacesManager {
    private static readonly MAX_RECENT_WORKSPACES = 8
    private static readonly CONFIG_FILENAME = 'recent-workspaces.json'
    private configManager: ConfigManager
    private recentWorkspaces: string[] = []
    private onWorkspaceSelected?: (workspacePath: string) => void

    constructor(configManager: ConfigManager) {
        this.configManager = configManager
        // 不在构造函数中调用异步方法
    }

    /**
     * 初始化管理器（异步）
     */
    async initialize(): Promise<void> {
        await this.loadRecentWorkspaces()
        this.updateAppMenu()
    }

    /**
     * 设置工作空间选择回调
     */
    setWorkspaceSelectedCallback(callback: (workspacePath: string) => void): void {
        this.onWorkspaceSelected = callback
    }

    /**
     * 从配置中加载最近的工作空间列表
     */
    private async loadRecentWorkspaces(): Promise<void> {
        const saved = await this.configManager.loadConfig<string[]>(
            RecentWorkspacesManager.CONFIG_FILENAME,
            [],
            'global'
        )
        if (Array.isArray(saved)) {
            // 过滤掉不存在的路径
            this.recentWorkspaces = saved.filter((wsPath) => {
                try {
                    return fs.existsSync(wsPath) && fs.statSync(wsPath).isDirectory()
                } catch {
                    return false
                }
            })
            // 如果过滤后列表发生变化，保存更新后的列表
            if (this.recentWorkspaces.length !== saved.length) {
                await this.saveRecentWorkspaces()
            }
        }
    }

    /**
     * 保存最近的工作空间列表到配置
     */
    private async saveRecentWorkspaces(): Promise<void> {
        await this.configManager.saveConfig(
            RecentWorkspacesManager.CONFIG_FILENAME,
            this.recentWorkspaces,
            'global'
        )
    }

    /**
     * 添加工作空间到最近列表
     * @param workspacePath 工作空间路径
     */
    async addWorkspace(workspacePath: string): Promise<void> {
        if (!workspacePath || !fs.existsSync(workspacePath)) {
            return
        }

        // 移除已存在的相同路径
        this.recentWorkspaces = this.recentWorkspaces.filter((ws) => ws !== workspacePath)

        // 添加到列表开头
        this.recentWorkspaces.unshift(workspacePath)

        // 限制列表长度
        if (this.recentWorkspaces.length > RecentWorkspacesManager.MAX_RECENT_WORKSPACES) {
            this.recentWorkspaces = this.recentWorkspaces.slice(
                0,
                RecentWorkspacesManager.MAX_RECENT_WORKSPACES
            )
        }

        await this.saveRecentWorkspaces()
        this.updateAppMenu()
    }

    /**
     * 清除所有最近的工作空间
     */
    async clearAll(): Promise<void> {
        this.recentWorkspaces = []
        await this.saveRecentWorkspaces()
        this.updateAppMenu()
    }

    /**
     * 从列表中移除指定的工作空间
     */
    async removeWorkspace(workspacePath: string): Promise<void> {
        this.recentWorkspaces = this.recentWorkspaces.filter((ws) => ws !== workspacePath)
        await this.saveRecentWorkspaces()
        this.updateAppMenu()
    }

    /**
     * 获取最近的工作空间列表
     */
    getRecentWorkspaces(): string[] {
        return [...this.recentWorkspaces]
    }

    /**
     * 更新应用图标右键菜单
     */
    updateAppMenu(): void {
        if (process.platform === 'darwin') {
            this.updateMacDockMenu()
        } else if (process.platform === 'win32') {
            this.updateWindowsJumpList()
        }
    }

    /**
     * 更新 macOS Dock 菜单
     */
    private updateMacDockMenu(): void {
        const menuItems = this.recentWorkspaces.map((wsPath) => ({
            label: `📁 ${this.getWorkspaceDisplayName(wsPath)}`,
            click: () => {
                this.onWorkspaceSelected?.(wsPath)
            }
        }))

        const dockMenu = Menu.buildFromTemplate([
            {
                label: '最近的工作空间',
                enabled: false
            },
            { type: 'separator' },
            ...(menuItems.length > 0
                ? menuItems
                : [
                    {
                        label: '暂无最近工作空间',
                        enabled: false
                    }
                ]),
            { type: 'separator' },
            {
                label: '清除列表',
                enabled: menuItems.length > 0,
                click: () => {
                    void this.clearAll()
                }
            }
        ])

        app.dock?.setMenu(dockMenu)
    }

    /**
     * 更新 Windows Jump List
     */
    private updateWindowsJumpList(): void {
        const tasks = this.recentWorkspaces.map((wsPath) => ({
            type: 'task' as const,
            program: process.execPath,
            arguments: `--workspace="${wsPath}"`,
            title: `📁 ${this.getWorkspaceDisplayName(wsPath)}`,
            description: wsPath,
            iconPath: process.execPath,
            iconIndex: 0
        }))

        app.setUserTasks([
            ...tasks,
            ...(tasks.length > 0
                ? [
                    {
                        type: 'task' as const,
                        program: process.execPath,
                        arguments: '--clear-recent-workspaces',
                        title: '清除最近工作空间',
                        description: '清除所有最近打开的工作空间',
                        iconPath: process.execPath,
                        iconIndex: 0
                    }
                ]
                : [])
        ])
    }

    /**
   * 获取工作空间的显示名称
   * 只返回最后一个文件夹名称
   */
    private getWorkspaceDisplayName(workspacePath: string): string {
        return path.basename(workspacePath)
    }

    /**
     * 处理命令行参数
     * @param argv 命令行参数
     * @returns 如果处理了工作空间参数，返回工作空间路径；否则返回 null
     */
    handleCommandLine(argv: string[]): string | null {
        // 查找 --workspace 参数
        const workspaceArg = argv.find((arg) => arg.startsWith('--workspace='))
        if (workspaceArg) {
            const workspacePath = workspaceArg.replace('--workspace=', '').replace(/"/g, '')
            if (fs.existsSync(workspacePath)) {
                return workspacePath
            }
        }

        // 查找 --clear-recent-workspaces 参数
        if (argv.includes('--clear-recent-workspaces')) {
            void this.clearAll()
            return null
        }

        return null
    }
}
