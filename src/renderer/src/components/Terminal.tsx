import { useEffect, useRef } from 'react'
import { Terminal as XTerm } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { useAppStore, Session, TerminalInstance } from '../store/appStore'
import { terminalManager } from '../utils/terminalManager'
import 'xterm/css/xterm.css'

interface TerminalProps {
  mode?: 'tabs' | 'grid'
}

const Terminal = ({ mode = 'tabs' }: TerminalProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const listenersCleanupRef = useRef<Array<() => void>>([])

  // Store access
  const activeSessionId = useAppStore((state) => state.activeSessionId)
  const sessions = useAppStore((state) => state.sessions)
  const workspaceChangeCounter = useAppStore((state) => state.workspaceChangeCounter)
  const updateTerminalActivity = useAppStore((state) => state.updateTerminalActivity)

  // Get active session and its active terminal
  const activeSession = sessions.find((s) => s.id === activeSessionId)
  const activeTerminalId = activeSession?.activeTerminalId

  // Function to create a terminal instance for a TerminalInstance
  const createTerminalInstance = (session: Session, terminalInstance: TerminalInstance) => {
    // Skip if terminal already exists
    if (terminalManager.hasTerminal(terminalInstance.id)) {
      return
    }

    console.log(`Creating terminal for: ${terminalInstance.id}`)

    const terminalId = terminalInstance.id
    const terminal = new XTerm({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'Consolas, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#ffffff'
      },
      rightClickSelectsWord: false,
      allowTransparency: false,
      convertEol: true
    })

    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)

    // Store instance in global manager
    terminalManager.setTerminal(terminalId, { xterm: terminal, fitAddon })

    // Always create DOM element and open terminal
    // In tabs mode, it goes to the visible container
    // In grid mode, it goes to a hidden container (TerminalGrid will move it)
    if (containerRef.current) {
      const terminalDiv = document.createElement('div')
      terminalDiv.style.width = '100%'
      terminalDiv.style.height = '100%'
      terminalDiv.style.display = mode === 'tabs' ? 'none' : 'block'
      terminalDiv.dataset.terminalId = terminalId
      // In grid mode, hide the container
      if (mode === 'grid') {
        terminalDiv.style.position = 'absolute'
        terminalDiv.style.left = '-9999px'
      }
      containerRef.current.appendChild(terminalDiv)
      terminal.open(terminalDiv)

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
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
          const selection = terminal.getSelection()
          if (selection) {
            e.preventDefault()
            try {
              await navigator.clipboard.writeText(selection)
            } catch (err) {
              console.warn('Failed to write to clipboard:', err)
            }
          }
        }
      })
    }

    // Delay initial fit
    setTimeout(() => {
      try {
        fitAddon.fit()
      } catch (e) {}
    }, 100)

    // Handle input
    terminal.onData((data) => {
      if (terminalManager.isExited(terminalId)) {
        // Restart session
        terminal.reset()
        terminalManager.clearExited(terminalId)

        // Get latest prompt from store just in case
        const currentSession = useAppStore.getState().sessions.find((s) => s.id === session.id)
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

    // Create backend session
    window.api.session.create(terminalId, session.customPrompt).then(({ success, pid }) => {
      if (success) {
        console.log(`Terminal ${terminalId} created with PID:`, pid)
      } else {
        terminal.write(`\r\nFailed to create terminal ${terminalId}\r\n`)
      }
    })
  }

  // Initial setup of global listeners
  useEffect(() => {
    // Handle incoming data from backend
    const removeIncomingListener = window.api.session.onIncoming((terminalId, data) => {
      const terminalInstance = terminalManager.getTerminal(terminalId)
      if (terminalInstance) {
        terminalInstance.xterm.write(data)
        updateTerminalActivity(terminalId, true)

        setTimeout(() => {
          updateTerminalActivity(terminalId, false)
        }, 500)
      }
    })

    // Handle session exit
    const removeExitListener = window.api.session.onExited((terminalId, exitCode, signal) => {
      const terminalInstance = terminalManager.getTerminal(terminalId)
      if (terminalInstance) {
        terminalInstance.xterm.write(
          `\r\n\r\n[Session exited: code=${exitCode}, signal=${signal}]\r\n`
        )
        terminalInstance.xterm.write(`[Press any key to restart session]\r\n`)
        terminalManager.setExited(terminalId)
      }
    })

    // Setup resize observer for container (tabs mode only)
    let resizeObserver: ResizeObserver | null = null
    if (mode === 'tabs' && containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        const state = useAppStore.getState()
        const activeSession = state.sessions.find((s) => s.id === state.activeSessionId)
        const activeTerminalId = activeSession?.activeTerminalId

        if (activeTerminalId) {
          const activeTerminal = terminalManager.getTerminal(activeTerminalId)
          if (activeTerminal) {
            try {
              activeTerminal.fitAddon.fit()
              window.api.session.resize(
                activeTerminalId,
                activeTerminal.xterm.cols,
                activeTerminal.xterm.rows
              )
            } catch (e) {
              console.warn('Failed to resize terminal:', e)
            }
          }
        }
      })
      resizeObserver.observe(containerRef.current)
    }

    // Listen for restart events from UI
    const handleRestart = async (e: Event) => {
      const event = e as CustomEvent
      const { terminalId, customPrompt } = event.detail

      const terminalInstance = terminalManager.getTerminal(terminalId)
      if (terminalInstance) {
        await window.api.session.kill(terminalId)
        terminalInstance.xterm.reset()
        terminalManager.clearExited(terminalId)

        await new Promise((resolve) => setTimeout(resolve, 100))

        const { success, pid } = await window.api.session.create(terminalId, customPrompt)
        if (success) {
          terminalInstance.xterm.write(`\r\n[Terminal restarted with PID: ${pid}]\r\n`)
        }
      }
    }

    window.addEventListener('terminal-restart', handleRestart)

    // Cleanup
    listenersCleanupRef.current.push(removeIncomingListener)
    listenersCleanupRef.current.push(removeExitListener)
    if (resizeObserver) {
      listenersCleanupRef.current.push(() => resizeObserver.disconnect())
    }
    listenersCleanupRef.current.push(() =>
      window.removeEventListener('terminal-restart', handleRestart)
    )

    return () => {
      listenersCleanupRef.current.forEach((cb) => cb())
      listenersCleanupRef.current = []
    }
  }, [mode, updateTerminalActivity])

  // Effect to manage terminal instances based on sessions array
  useEffect(() => {
    // Create terminals for new terminal instances
    sessions.forEach((session) => {
      session.terminals.forEach((terminalInstance) => {
        if (!terminalManager.hasTerminal(terminalInstance.id)) {
          createTerminalInstance(session, terminalInstance)
        }
      })
    })

    // Remove terminals for deleted terminal instances
    const currentTerminalIds = new Set(sessions.flatMap((s) => s.terminals.map((t) => t.id)))
    terminalManager.getTerminals().forEach((term, terminalId) => {
      if (!currentTerminalIds.has(terminalId)) {
        console.log(`Removing terminal: ${terminalId}`)
        term.xterm.dispose()
        terminalManager.deleteTerminal(terminalId)

        // Remove DOM element (tabs mode)
        const el = containerRef.current?.querySelector(`[data-terminal-id="${terminalId}"]`)
        if (el) el.remove()

        // Kill backend session
        window.api.session.kill(terminalId).catch(() => {})
      }
    })
  }, [sessions])

  // Helper function to move xterm element to target container
  const moveXtermToContainer = (terminalId: string, targetContainer: HTMLElement | null) => {
    if (!targetContainer) return false

    const instance = terminalManager.getTerminal(terminalId)
    if (!instance || !instance.xterm.element) return false

    // Check if xterm element is already in the target container
    let isInContainer = false
    let parent = instance.xterm.element.parentElement
    while (parent) {
      if (parent === targetContainer) {
        isInContainer = true
        break
      }
      parent = parent.parentElement
    }

    if (!isInContainer) {
      // Clear the target container first
      while (targetContainer.firstChild) {
        targetContainer.removeChild(targetContainer.firstChild)
      }
      // Move xterm element to target
      targetContainer.appendChild(instance.xterm.element)
    }

    // Reset container styles (remove grid mode hiding styles)
    targetContainer.style.position = ''
    targetContainer.style.left = ''

    return !isInContainer
  }

  // Effect for active terminal switching (tabs mode only) - handles visibility only
  useEffect(() => {
    if (mode !== 'tabs' || !containerRef.current || !activeTerminalId) return

    // Hide all
    Array.from(containerRef.current.children).forEach((el) => {
      ;(el as HTMLElement).style.display = 'none'
    })

    // Show active
    const activeEl = containerRef.current.querySelector(
      `[data-terminal-id="${activeTerminalId}"]`
    ) as HTMLElement
    if (activeEl) {
      activeEl.style.display = 'block'

      // Fit and Focus - use requestAnimationFrame for better timing
      const instance = terminalManager.getTerminal(activeTerminalId)
      if (instance) {
        requestAnimationFrame(() => {
          try {
            instance.fitAddon.fit()
            window.api.session.resize(activeTerminalId, instance.xterm.cols, instance.xterm.rows)
            instance.xterm.focus()
          } catch (e) {
            console.warn('Failed to fit terminal:', e)
          }
        })
      }
    }
  }, [activeTerminalId, sessions, mode])

  // Effect to handle mode change - ensure terminals are properly moved
  useEffect(() => {
    if (mode !== 'tabs' || !containerRef.current) return

    // When switching back to tabs mode, ensure all xterm elements are in their containers
    const timer = setTimeout(() => {
      // Move all xterm elements to their containers and reset styles
      sessions.forEach((session) => {
        session.terminals.forEach((terminalInstance) => {
          const targetContainer = containerRef.current?.querySelector(
            `[data-terminal-id="${terminalInstance.id}"]`
          ) as HTMLElement

          moveXtermToContainer(terminalInstance.id, targetContainer)
        })
      })

      // Fit ALL terminals after mode switch (not just moved ones)
      // Use requestAnimationFrame to ensure DOM is fully updated
      requestAnimationFrame(() => {
        sessions.forEach((session) => {
          session.terminals.forEach((terminalInstance) => {
            const instance = terminalManager.getTerminal(terminalInstance.id)
            if (instance) {
              try {
                instance.fitAddon.fit()
                window.api.session.resize(
                  terminalInstance.id,
                  instance.xterm.cols,
                  instance.xterm.rows
                )
              } catch (e) {
                console.warn('Failed to fit terminal:', e)
              }
            }
          })
        })
      })
    }, 50)

    return () => clearTimeout(timer)
  }, [mode, sessions])

  // Full cleanup on workspace change (hard reset)
  useEffect(() => {
    if (workspaceChangeCounter === 0) return

    // Cleanup all terminals
    terminalManager.getTerminals().forEach((term) => term.xterm.dispose())
    terminalManager.getTerminals().clear()
    if (containerRef.current) containerRef.current.innerHTML = ''

    // Trigger recreation
    sessions.forEach((session) => {
      session.terminals.forEach((terminalInstance) => {
        createTerminalInstance(session, terminalInstance)
      })
    })
  }, [workspaceChangeCounter])

  // In grid mode, render a hidden container for terminal management
  // In tabs mode, render the visible container
  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: '#1e1e1e',
        display: mode === 'grid' ? 'none' : 'block'
      }}
    />
  )
}

export default Terminal
