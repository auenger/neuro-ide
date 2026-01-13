import { join, dirname } from 'path'
import fs from 'fs/promises'
import { existsSync, mkdirSync } from 'fs'

interface ConfigManagerOptions {
    workspacePath: string
}

export class ConfigManager {
    private workspacePath: string
    private configDir: string
    private globalConfigDir: string

    constructor(workspacePath: string) {
        this.workspacePath = workspacePath
        this.configDir = join(workspacePath, '.neuro')
        // Use a fixed location for global settings, independent of workspace
        const homeDir = process.env.HOME || process.env.USERPROFILE || ''
        this.globalConfigDir = join(homeDir, '.neuro-ide-global')
    }

    private async ensureDir(dir: string): Promise<void> {
        if (!existsSync(dir)) {
            await fs.mkdir(dir, { recursive: true })
        }
    }

    // Helper to determine which directory to use
    private getDir(scope: 'global' | 'local'): string {
        return scope === 'global' ? this.globalConfigDir : this.configDir
    }

    async loadConfig<T>(filename: string, defaultValue: T, scope: 'global' | 'local' = 'local'): Promise<T> {
        try {
            const dir = this.getDir(scope)
            const filePath = join(dir, filename)
            if (!existsSync(filePath)) {
                return defaultValue
            }
            const content = await fs.readFile(filePath, 'utf-8')
            return JSON.parse(content) as T
        } catch (error) {
            console.error(`Failed to load config ${filename} (${scope}):`, error)
            return defaultValue
        }
    }

    async saveConfig<T>(filename: string, data: T, scope: 'global' | 'local' = 'local'): Promise<boolean> {
        try {
            const dir = this.getDir(scope)
            await this.ensureDir(dir)
            const filePath = join(dir, filename)
            await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
            return true
        } catch (error) {
            console.error(`Failed to save config ${filename} (${scope}):`, error)
            return false
        }
    }

    // Specific config helpers
    async loadRoles(defaultRoles: any[]): Promise<any[]> {
        // Roles are now global
        return this.loadConfig('roles.json', defaultRoles, 'global')
    }

    async saveRoles(roles: any[]): Promise<boolean> {
        // Roles are now global
        return this.saveConfig('roles.json', roles, 'global')
    }

    async loadRoleSettings(defaultSettings: any): Promise<any> {
        // Active status is local to workspace
        return this.loadConfig('role-settings.json', defaultSettings, 'local')
    }

    async saveRoleSettings(settings: any): Promise<boolean> {
        // Active status is local to workspace
        return this.saveConfig('role-settings.json', settings, 'local')
    }

    async loadStarredItems(defaultItems: any[]): Promise<any[]> {
        return this.loadConfig('starred.json', defaultItems, 'local')
    }

    async saveStarredItems(items: any[]): Promise<boolean> {
        return this.saveConfig('starred.json', items, 'local')
    }
}
