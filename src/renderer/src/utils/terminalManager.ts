import { Terminal as XTerm } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'

export interface TerminalInstance {
    xterm: XTerm
    fitAddon: FitAddon
}

// Global terminal manager singleton
class TerminalManager {
    private terminals: Map<string, TerminalInstance> = new Map()
    private exitedTerminals: Set<string> = new Set()
    private listeners: Set<() => void> = new Set()

    getTerminals(): Map<string, TerminalInstance> {
        return this.terminals
    }

    getExitedTerminals(): Set<string> {
        return this.exitedTerminals
    }

    getTerminal(id: string): TerminalInstance | undefined {
        return this.terminals.get(id)
    }

    setTerminal(id: string, instance: TerminalInstance): void {
        this.terminals.set(id, instance)
        this.notifyListeners()
    }

    deleteTerminal(id: string): void {
        this.terminals.delete(id)
        this.exitedTerminals.delete(id)
        this.notifyListeners()
    }

    isExited(id: string): boolean {
        return this.exitedTerminals.has(id)
    }

    setExited(id: string): void {
        this.exitedTerminals.add(id)
    }

    clearExited(id: string): void {
        this.exitedTerminals.delete(id)
    }

    hasTerminal(id: string): boolean {
        return this.terminals.has(id)
    }

    subscribe(listener: () => void): () => void {
        this.listeners.add(listener)
        return () => this.listeners.delete(listener)
    }

    private notifyListeners(): void {
        this.listeners.forEach(listener => listener())
    }

    // Fit all terminals
    fitAll(): void {
        this.terminals.forEach((instance, id) => {
            try {
                instance.fitAddon.fit()
                window.api.session.resize(id, instance.xterm.cols, instance.xterm.rows)
            } catch (e) {
                console.warn('Failed to fit terminal:', e)
            }
        })
    }
}

// Export singleton instance
export const terminalManager = new TerminalManager()
