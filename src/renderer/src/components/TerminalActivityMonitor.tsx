import { useEffect, useState } from 'react'
import { useAppStore } from '../store/appStore'
import './TerminalActivityMonitor.css'

const TerminalActivityMonitor = () => {
    const {
        sessions,
        getInactiveTerminals,
        markTerminalNotified
    } = useAppStore()

    const [notifications, setNotifications] = useState<string[]>([])

    // Check for inactive terminals every 2 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            const inactiveTerminals = getInactiveTerminals()

            inactiveTerminals.forEach(activity => {
                // Find the terminal name
                const session = sessions.find(s =>
                    s.terminals.some(t => t.id === activity.terminalId)
                )

                if (session) {
                    const terminal = session.terminals.find(t => t.id === activity.terminalId)
                    if (terminal) {
                        const notificationId = `${session.name}-${terminal.name}`

                        // Add notification
                        setNotifications(prev => {
                            if (!prev.includes(notificationId)) {
                                return [...prev, notificationId]
                            }
                            return prev
                        })

                        // Mark as notified
                        markTerminalNotified(activity.terminalId)

                        // Auto-remove notification after 5 seconds
                        setTimeout(() => {
                            setNotifications(prev => prev.filter(id => id !== notificationId))
                        }, 5000)
                    }
                }
            })
        }, 2000)

        return () => clearInterval(interval)
    }, [sessions, getInactiveTerminals, markTerminalNotified])

    const handleDismiss = (notificationId: string) => {
        setNotifications(prev => prev.filter(id => id !== notificationId))
    }

    if (notifications.length === 0) {
        return null
    }

    return (
        <div className="terminal-activity-monitor">
            {notifications.map((notificationId) => (
                <div key={notificationId} className="terminal-notification">
                    <div className="notification-content">
                        <svg className="notification-icon" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16Zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"></path>
                        </svg>
                        <div className="notification-text">
                            <strong>{notificationId}</strong>
                            <span>终端已停止输出</span>
                        </div>
                    </div>
                    <button
                        className="notification-close"
                        onClick={() => handleDismiss(notificationId)}
                        title="关闭"
                    >
                        <svg viewBox="0 0 16 16" fill="currentColor">
                            <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"></path>
                        </svg>
                    </button>
                </div>
            ))}
        </div>
    )
}

export default TerminalActivityMonitor
