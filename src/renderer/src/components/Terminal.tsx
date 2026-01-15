import { useEffect, useRef } from 'react'
import { Terminal as XTerm } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { useAppStore, Session, TerminalInstance } from '../store/appStore'
import 'xterm/css/xterm.css'

const Terminal = () => {
    const containerRef = useRef<HTMLDivElement>(null)
    const terminalsRef = useRef<Map<string, { xterm: XTerm; fitAddon: FitAddon }>>(new Map())
    const exitedTerminalsRef = useRef<Set<string>>(new Set())

    // We use a ref for listeners to clean them up properly on unmount
    const listenersCleanupRef = useRef<Array<() => void>>([])

    // Store access
    const activeSessionId = useAppStore((state) => state.activeSessionId)
    const sessions = useAppStore((state) => state.sessions)
    const workspaceChangeCounter = useAppStore((state) => state.workspaceChangeCounter)
    const updateTerminalActivity = useAppStore((state) => state.updateTerminalActivity)

    // Get active session and its active terminal
    const activeSession = sessions.find(s => s.id === activeSessionId)
    const activeTerminalId = activeSession?.activeTerminalId

    // Initial setup of global listeners
    useEffect(() => {
        // Handle incoming data from backend - now using terminalId
        const removeIncomingListener = window.api.session.onIncoming((terminalId, data) => {
            const terminalInstance = terminalsRef.current.get(terminalId)
            if (terminalInstance) {
                terminalInstance.xterm.write(data)
                // Update terminal activity
                updateTerminalActivity(terminalId, true)

                // Mark as inactive after a short delay
                setTimeout(() => {
                    updateTerminalActivity(terminalId, false)
                }, 500)
            }
        })

        // Handle session exit - now using terminalId
        const removeExitListener = window.api.session.onExited((terminalId, exitCode, signal) => {
            const terminalInstance = terminalsRef.current.get(terminalId)
            if (terminalInstance) {
                terminalInstance.xterm.write(`\r\n\r\n[Session exited: code=${exitCode}, signal=${signal}]\r\n`)
                terminalInstance.xterm.write(`[Press any key to restart session]\r\n`)
                exitedTerminalsRef.current.add(terminalId)
            }
        })

        // Setup resize observer for container
        const resizeObserver = new ResizeObserver(() => {
            const state = useAppStore.getState()
            const activeSession = state.sessions.find(s => s.id === state.activeSessionId)
            const activeTerminalId = activeSession?.activeTerminalId

            if (activeTerminalId) {
                const activeTerminal = terminalsRef.current.get(activeTerminalId)
                if (activeTerminal) {
                    try {
                        activeTerminal.fitAddon.fit()
                        window.api.session.resize(activeTerminalId, activeTerminal.xterm.cols, activeTerminal.xterm.rows)
                    } catch (e) {
                        console.warn('Failed to resize terminal:', e)
                    }
                }
            }
        })

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current)
        }

        // Add to cleanup
        listenersCleanupRef.current.push(removeIncomingListener)
        listenersCleanupRef.current.push(removeExitListener)
        listenersCleanupRef.current.push(() => resizeObserver.disconnect())

        // Listen for restart events from UI
        const handleRestart = async (e: Event) => {
            const event = e as CustomEvent
            const { terminalId, customPrompt } = event.detail

            const terminalInstance = terminalsRef.current.get(terminalId)
            if (terminalInstance) {
                // Kill the process
                await window.api.session.kill(terminalId)

                // Reset the terminal display
                terminalInstance.xterm.reset()

                // Remove from exited set if it was there
                exitedTerminalsRef.current.delete(terminalId)

                // Wait a bit
                await new Promise(resolve => setTimeout(resolve, 100))

                // Create new session
                const { success, pid } = await window.api.session.create(terminalId, customPrompt)
                if (success) {
                    terminalInstance.xterm.write(`\r\n[Terminal restarted with PID: ${pid}]\r\n`)
                }
            }
        }

        window.addEventListener('terminal-restart', handleRestart)
        listenersCleanupRef.current.push(() => window.removeEventListener('terminal-restart', handleRestart))

        return () => {
            // Cleanup listeners on unmount
            listenersCleanupRef.current.forEach(cb => cb())
            listenersCleanupRef.current = []
        }
    }, [])

    // Function to create a terminal instance for a TerminalInstance
    const createTerminalInstance = (session: Session, terminalInstance: TerminalInstance) => {
        if (!containerRef.current) return

        console.log(`Creating terminal for: ${terminalInstance.id}`)

        const terminalId = terminalInstance.id
        const terminalDiv = document.createElement('div')
        terminalDiv.style.width = '100%'
        terminalDiv.style.height = '100%'
        terminalDiv.style.display = 'none' // Hidden by default
        terminalDiv.dataset.terminalId = terminalId
        containerRef.current.appendChild(terminalDiv)

        const terminal = new XTerm({
            cursorBlink: true,
            fontSize: 13,
            fontFamily: 'Consolas, Monaco, "Courier New", monospace',
            theme: {
                background: '#1e1e1e',
                foreground: '#d4d4d4',
                cursor: '#ffffff'
            },
            // Enable copy/paste functionality
            rightClickSelectsWord: false, // Allow right-click for context menu
            allowTransparency: false,
            // Enable selection and clipboard
            convertEol: true
        })

        const fitAddon = new FitAddon()
        terminal.loadAddon(fitAddon)
        terminal.open(terminalDiv)

        // Delay initial fit
        setTimeout(() => {
            try { fitAddon.fit() } catch (e) { }
        }, 100)

        // Handle input
        terminal.onData((data) => {
            if (exitedTerminalsRef.current.has(terminalId)) {
                // Restart session
                terminal.reset()
                exitedTerminalsRef.current.delete(terminalId)

                // Get latest prompt from store just in case
                const currentSession = useAppStore.getState().sessions.find(s => s.id === session.id)
                const prompt = currentSession?.customPrompt || session.customPrompt

                window.api.session.create(terminalId, prompt).then(({ success, pid }) => {
                    if (success) {
                        terminal.write(`\r\n[Session restarted with PID: ${pid}]\r\n`)
                    }
                })
            } else {
                window.api.session.input(terminalId, data)
            }
        })

        // Add right-click paste support
        terminalDiv.addEventListener('contextmenu', async (e) => {
            e.preventDefault()
            try {
                const text = await navigator.clipboard.readText()
                if (text) {
                    terminal.paste(text)
                }
            } catch (err) {
                console.warn('Failed to read clipboard:', err)
            }
        })

        // Add keyboard shortcuts for copy/paste
        terminalDiv.addEventListener('keydown', async (e) => {
            // Ctrl+V or Cmd+V for paste
            if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                e.preventDefault()
                try {
                    const text = await navigator.clipboard.readText()
                    if (text) {
                        terminal.paste(text)
                    }
                } catch (err) {
                    console.warn('Failed to read clipboard:', err)
                }
            }
            // Ctrl+C or Cmd+C for copy (only if text is selected)
            else if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                const selection = terminal.getSelection()
                if (selection) {
                    e.preventDefault()
                    try {
                        await navigator.clipboard.writeText(selection)
                    } catch (err) {
                        console.warn('Failed to write to clipboard:', err)
                    }
                }
                // If no selection, let the default Ctrl+C behavior (send interrupt signal) proceed
            }
        })

        // Store instance
        terminalsRef.current.set(terminalId, { xterm: terminal, fitAddon })

        // Create backend session
        window.api.session.create(terminalId, session.customPrompt).then(({ success, pid }) => {
            if (success) {
                console.log(`Terminal ${terminalId} created with PID:`, pid)
            } else {
                terminal.write(`\r\nFailed to create terminal ${terminalId}\r\n`)
            }
        })
    }

    // Effect to manage terminal instances based on sessions array
    useEffect(() => {
        // 1. Create terminals for new terminal instances
        sessions.forEach(session => {
            session.terminals.forEach(terminalInstance => {
                if (!terminalsRef.current.has(terminalInstance.id)) {
                    createTerminalInstance(session, terminalInstance)
                }
            })
        })

        // 2. Remove terminals for deleted terminal instances
        const currentTerminalIds = new Set(
            sessions.flatMap(s => s.terminals.map(t => t.id))
        )
        terminalsRef.current.forEach((term, terminalId) => {
            if (!currentTerminalIds.has(terminalId)) {
                console.log(`Removing terminal: ${terminalId}`)
                term.xterm.dispose()
                terminalsRef.current.delete(terminalId)

                // Remove DOM element
                const el = containerRef.current?.querySelector(`[data-terminal-id="${terminalId}"]`)
                if (el) el.remove()

                // Kill backend session
                window.api.session.kill(terminalId).catch(() => { })
            }
        })

    }, [sessions])

    // Effect working on active terminal switching
    useEffect(() => {
        if (!containerRef.current || !activeTerminalId) return

        // Hide all
        Array.from(containerRef.current.children).forEach((el) => {
            (el as HTMLElement).style.display = 'none'
        })

        // Show active
        const activeEl = containerRef.current.querySelector(`[data-terminal-id="${activeTerminalId}"]`) as HTMLElement
        if (activeEl) {
            activeEl.style.display = 'block'

            // Fit and Focus
            const instance = terminalsRef.current.get(activeTerminalId)
            if (instance) {
                setTimeout(() => {
                    instance.fitAddon.fit()
                    instance.xterm.focus()
                }, 50)
            }
        }
    }, [activeTerminalId, sessions]) // Also run when sessions change (e.g. newly created one becomes active)

    // Full cleanup on workspace change (hard reset)
    useEffect(() => {
        if (workspaceChangeCounter === 0) return

        // Cleanup all terminals
        terminalsRef.current.forEach((term) => term.xterm.dispose())
        terminalsRef.current.clear()
        if (containerRef.current) containerRef.current.innerHTML = ''

        // Trigger recreation
        sessions.forEach(session => {
            session.terminals.forEach(terminalInstance => {
                createTerminalInstance(session, terminalInstance)
            })
        })
    }, [workspaceChangeCounter])

    return <div ref={containerRef} style={{ width: '100%', height: '100%', overflow: 'hidden', background: '#1e1e1e' }} />
}

export default Terminal
