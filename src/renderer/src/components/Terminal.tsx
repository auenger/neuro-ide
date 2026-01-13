import { useEffect, useRef } from 'react'
import { Terminal as XTerm } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { useAppStore, Session } from '../store/appStore'
import 'xterm/css/xterm.css'

const Terminal = () => {
    const containerRef = useRef<HTMLDivElement>(null)
    const terminalsRef = useRef<Map<string, { xterm: XTerm; fitAddon: FitAddon }>>(new Map())
    const exitedSessionsRef = useRef<Set<string>>(new Set())

    // We use a ref for listeners to clean them up properly on unmount
    const listenersCleanupRef = useRef<Array<() => void>>([])

    // Store access
    const activeSessionId = useAppStore((state) => state.activeSessionId)
    const sessions = useAppStore((state) => state.sessions)
    // Only used for full resets if needed, but we rely on sessions array now
    const workspaceChangeCounter = useAppStore((state) => state.workspaceChangeCounter)

    // Initial setup of global listeners
    useEffect(() => {
        // Handle incoming data from backend
        const removeIncomingListener = window.api.session.onIncoming((sessionId, data) => {
            const terminalInstance = terminalsRef.current.get(sessionId)
            if (terminalInstance) {
                terminalInstance.xterm.write(data)
            }
        })

        // Handle session exit
        const removeExitListener = window.api.session.onExited((sessionId, exitCode, signal) => {
            const terminalInstance = terminalsRef.current.get(sessionId)
            if (terminalInstance) {
                terminalInstance.xterm.write(`\r\n\r\n[Session exited: code=${exitCode}, signal=${signal}]\r\n`)
                terminalInstance.xterm.write(`[Press any key to restart session]\r\n`)
                exitedSessionsRef.current.add(sessionId)
            }
        })

        // Setup resize observer for container
        const resizeObserver = new ResizeObserver(() => {
            const activeSessionId = useAppStore.getState().activeSessionId
            const activeTerminal = terminalsRef.current.get(activeSessionId)
            if (activeTerminal) {
                try {
                    activeTerminal.fitAddon.fit()
                    window.api.session.resize(activeSessionId, activeTerminal.xterm.cols, activeTerminal.xterm.rows)
                } catch (e) {
                    console.warn('Failed to resize terminal:', e)
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

        return () => {
            // Cleanup listeners on unmount
            listenersCleanupRef.current.forEach(cb => cb())
            listenersCleanupRef.current = []
        }
    }, [])

    // Function to create a terminal instance
    const createTerminalInstance = (session: Session) => {
        if (!containerRef.current) return

        console.log(`Creating terminal for session: ${session.id}`)

        const sessionId = session.id
        const terminalDiv = document.createElement('div')
        terminalDiv.style.width = '100%'
        terminalDiv.style.height = '100%'
        terminalDiv.style.display = 'none' // Hidden by default
        terminalDiv.dataset.sessionId = sessionId
        containerRef.current.appendChild(terminalDiv)

        const terminal = new XTerm({
            cursorBlink: true,
            fontSize: 13,
            fontFamily: 'Consolas, Monaco, "Courier New", monospace',
            theme: {
                background: '#1e1e1e',
                foreground: '#d4d4d4',
                cursor: '#ffffff'
            }
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
            if (exitedSessionsRef.current.has(sessionId)) {
                // Restart session
                terminal.reset()
                exitedSessionsRef.current.delete(sessionId)

                // Get latest prompt from store just in case
                const currentSession = useAppStore.getState().sessions.find(s => s.id === sessionId)
                const prompt = currentSession?.customPrompt || session.customPrompt

                window.api.session.create(sessionId, prompt).then(({ success, pid }) => {
                    if (success) {
                        terminal.write(`\r\n[Session restarted with PID: ${pid}]\r\n`)
                    }
                })
            } else {
                window.api.session.input(sessionId, data)
            }
        })

        // Store instance
        terminalsRef.current.set(sessionId, { xterm: terminal, fitAddon })

        // Create backend session
        window.api.session.create(sessionId, session.customPrompt).then(({ success, pid }) => {
            if (success) {
                console.log(`Session ${sessionId} created with PID:`, pid)
            } else {
                terminal.write(`\r\nFailed to create session ${sessionId}\r\n`)
            }
        })
    }

    // Effect to manage terminal instances based on sessions array
    useEffect(() => {
        // 1. Create terminals for new sessions
        sessions.forEach(session => {
            if (!terminalsRef.current.has(session.id)) {
                createTerminalInstance(session)
            }
        })

        // 2. Remove terminals for deleted sessions
        const currentSessionIds = new Set(sessions.map(s => s.id))
        terminalsRef.current.forEach((term, sessionId) => {
            if (!currentSessionIds.has(sessionId)) {
                console.log(`Removing terminal for session: ${sessionId}`)
                term.xterm.dispose()
                terminalsRef.current.delete(sessionId)

                // Remove DOM element
                const el = containerRef.current?.querySelector(`[data-session-id="${sessionId}"]`)
                if (el) el.remove()

                // Kill backend session if possible (though deleteRole logic might not assume kill)
                window.api.session.kill(sessionId).catch(() => { })
            }
        })

    }, [sessions])

    // Effect working on active session switching
    useEffect(() => {
        if (!containerRef.current) return

        // Hide all
        Array.from(containerRef.current.children).forEach((el) => {
            (el as HTMLElement).style.display = 'none'
        })

        // Show active
        const activeEl = containerRef.current.querySelector(`[data-session-id="${activeSessionId}"]`) as HTMLElement
        if (activeEl) {
            activeEl.style.display = 'block'

            // Fit and Focus
            const instance = terminalsRef.current.get(activeSessionId)
            if (instance) {
                setTimeout(() => {
                    instance.fitAddon.fit()
                    instance.xterm.focus()
                }, 50)
            }
        }
    }, [activeSessionId, sessions]) // Also run when sessions change (e.g. newly created one becomes active)

    // Full cleanup on workspace change (hard reset)
    useEffect(() => {
        if (workspaceChangeCounter === 0) return

        // Cleanup all terminals
        terminalsRef.current.forEach((term) => term.xterm.dispose())
        terminalsRef.current.clear()
        if (containerRef.current) containerRef.current.innerHTML = ''

        // Trigger recreation by forcing update? 
        // Actually, since terminalsRef is empty, the [sessions] effect will recreate them if sessions didn't change.
        // But [sessions] effect depends on `sessions` ref. 
        // We might need to manually trigger recreation here.

        sessions.forEach(session => createTerminalInstance(session))
    }, [workspaceChangeCounter])

    return <div ref={containerRef} style={{ width: '100%', height: '100%', overflow: 'hidden', background: '#1e1e1e' }} />
}

export default Terminal
