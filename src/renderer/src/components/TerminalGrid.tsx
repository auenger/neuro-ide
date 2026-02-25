import { useEffect, useRef, useState, ReactNode } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    DragOverlay,
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAppStore } from '../store/appStore'
import { terminalManager } from '../utils/terminalManager'
import './TerminalGrid.css'

interface TerminalGridProps {
    sessionId: string
}

interface SimpleTerminal {
    id: string
    name: string
}

interface SortableTerminalCellProps {
    terminal: SimpleTerminal
    onRename: (terminalId: string, newName: string) => void
    onRemove: (terminalId: string) => void
    isOnlyOne: boolean
    isActive: boolean
    onSelect: (terminalId: string) => void
}

// Sortable terminal cell component
const SortableTerminalCell = ({ terminal, onRename, onRemove, isOnlyOne, isActive, onSelect }: SortableTerminalCellProps) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [editName, setEditName] = useState(terminal.name)

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: terminal.id })

    // Fit terminal handler
    const handleFit = (e: React.MouseEvent) => {
        e.stopPropagation()
        const instance = terminalManager.getTerminal(terminal.id)
        if (instance) {
            try {
                instance.fitAddon.fit()
                window.api.session.resize(terminal.id, instance.xterm.cols, instance.xterm.rows)
            } catch (err) {
                console.warn('Failed to fit terminal:', err)
            }
        }
    }

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    }

    // Mount xterm to this cell
    useEffect(() => {
        const instance = terminalManager.getTerminal(terminal.id)
        const container = containerRef.current

        if (instance && container) {
            const xtermElement = instance.xterm.element

            // xterm should already be opened by Terminal.tsx, just move it if needed
            if (xtermElement) {
                if (xtermElement.parentElement !== container) {
                    while (container.firstChild) {
                        container.removeChild(container.firstChild)
                    }
                    container.appendChild(xtermElement)
                }
            }
            // Note: We don't call open() here because Terminal.tsx already did that
            // If xterm.element is null, something went wrong in Terminal.tsx

            setTimeout(() => {
                try {
                    instance.fitAddon.fit()
                    window.api.session.resize(terminal.id, instance.xterm.cols, instance.xterm.rows)
                } catch (e) {
                    console.warn('Failed to fit terminal:', e)
                }
            }, 50)
        }
    }, [terminal.id])

    const handleRenameSubmit = () => {
        if (editName.trim() && editName !== terminal.name) {
            onRename(terminal.id, editName.trim())
        }
        setIsEditing(false)
    }

    const handleStartEdit = (e: React.MouseEvent) => {
        e.stopPropagation()
        setEditName(terminal.name)
        setIsEditing(true)
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`sortable-grid-cell ${isDragging ? 'is-dragging' : ''} ${isActive ? 'is-active' : ''}`}
            onClick={() => onSelect(terminal.id)}
        >
            <div className="terminal-cell-wrapper">
                <div className="terminal-cell-header">
                    {/* Drag handle area */}
                    <div className="terminal-drag-handle" {...attributes} {...listeners}>
                        <svg viewBox="0 0 16 16" fill="currentColor" className="drag-grip-icon">
                            <path d="M7 2a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0 4a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0 4a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0 4a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm5-12a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0 4a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0 4a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0 4a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
                        </svg>
                    </div>
                    {isEditing ? (
                        <input
                            className="terminal-name-input"
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onBlur={handleRenameSubmit}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleRenameSubmit()
                                } else if (e.key === 'Escape') {
                                    setEditName(terminal.name)
                                    setIsEditing(false)
                                }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                        />
                    ) : (
                        <>
                            <span className="terminal-name">{terminal.name}</span>
                            <div className="terminal-header-actions">
                                <button
                                    className="terminal-action-btn"
                                    onClick={handleFit}
                                    title="调整尺寸"
                                >
                                    <svg viewBox="0 0 16 16" fill="currentColor">
                                        <path d="M1 1.75A.75.75 0 0 1 1.75 1h3.5a.75.75 0 0 1 0 1.5H2.5v2.75a.75.75 0 0 1-1.5 0v-3.5Zm14 0v3.5a.75.75 0 0 1-1.5 0V2.5h-2.75a.75.75 0 0 1 0-1.5h3.5a.75.75 0 0 1 .75.75ZM1.75 15h3.5a.75.75 0 0 0 0-1.5H2.5v-2.75a.75.75 0 0 0-1.5 0v3.5a.75.75 0 0 0 .75.75Zm12.5 0h-3.5a.75.75 0 0 1 0-1.5h2.75v-2.75a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-.75.75Z"/>
                                    </svg>
                                </button>
                                <button
                                    className="terminal-action-btn"
                                    onClick={handleStartEdit}
                                    title="重命名"
                                >
                                    <svg viewBox="0 0 16 16" fill="currentColor">
                                        <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm.176 4.823L9.75 4.81l-6.286 6.287a.253.253 0 0 0-.064.108l-.558 1.953 1.953-.558a.253.253 0 0 0 .108-.064Zm1.238-3.763a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354Z"></path>
                                    </svg>
                                </button>
                                {!isOnlyOne && (
                                    <button
                                        className="terminal-action-btn close-btn"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onRemove(terminal.id)
                                        }}
                                        title="关闭终端"
                                    >
                                        <svg viewBox="0 0 16 16" fill="currentColor">
                                            <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"></path>
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
                <div
                    ref={containerRef}
                    className="terminal-cell-content"
                    data-terminal-grid-id={terminal.id}
                />
            </div>
        </div>
    )
}

// Drag overlay item for better visual feedback
const DragOverlayItem = ({ terminal }: { terminal: SimpleTerminal }) => {
    return (
        <div className="sortable-grid-cell drag-overlay">
            <div className="terminal-cell-wrapper">
                <div className="terminal-cell-header dragging">
                    <svg viewBox="0 0 16 16" fill="currentColor" className="drag-grip-icon">
                        <path d="M7 2a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0 4a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0 4a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0 4a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm5-12a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0 4a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0 4a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0 4a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
                    </svg>
                    <span className="terminal-name">{terminal.name}</span>
                </div>
                <div className="terminal-cell-content placeholder">
                    <span>拖拽中...</span>
                </div>
            </div>
        </div>
    )
}

const TerminalGrid = ({ sessionId }: TerminalGridProps) => {
    // Store access
    const sessions = useAppStore((state) => state.sessions)
    const gridLayoutConfig = useAppStore((state) => state.gridLayoutConfig)
    const reorderTerminals = useAppStore((state) => state.reorderTerminals)
    const setActiveTerminal = useAppStore((state) => state.setActiveTerminal)

    const session = sessions.find(s => s.id === sessionId)
    const activeTerminalId = session?.activeTerminalId
    const terminals: SimpleTerminal[] = (session?.terminals || []).map(t => ({
        id: t.id,
        name: t.name
    }))

    // Local state for drag and drop order
    const [terminalOrder, setTerminalOrder] = useState<string[]>(
        terminals.map(t => t.id)
    )

    // Drag state for overlay
    const [activeId, setActiveId] = useState<string | null>(null)
    const activeTerminal = activeId ? terminals.find(t => t.id === activeId) : null

    // Update local order when terminals change
    useEffect(() => {
        setTerminalOrder(terminals.map(t => t.id))
    }, [terminals.map(t => t.id).join(',')])

    // DnD sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    // Handle drag start
    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string)
    }

    // Handle drag end
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        setActiveId(null)

        if (over && active.id !== over.id) {
            const oldIndex = terminalOrder.indexOf(active.id as string)
            const newIndex = terminalOrder.indexOf(over.id as string)

            const newOrder = arrayMove(terminalOrder, oldIndex, newIndex)
            setTerminalOrder(newOrder)

            // Persist order to store
            reorderTerminals(sessionId, newOrder)
        }
    }

    // Handle rename
    const handleRename = (terminalId: string, newName: string) => {
        useAppStore.getState().renameTerminal(sessionId, terminalId, newName)
    }

    // Handle remove
    const handleRemove = (terminalId: string) => {
        useAppStore.getState().removeTerminalFromSession(sessionId, terminalId)
    }

    // Handle select terminal (set as active)
    const handleSelect = (terminalId: string) => {
        setActiveTerminal(sessionId, terminalId)
    }

    // Get terminals in current order
    const orderedTerminals: SimpleTerminal[] = terminalOrder
        .map(id => terminals.find(t => t.id === id))
        .filter((t): t is SimpleTerminal => t !== undefined)

    // Calculate grid dimensions based on terminal count
    const gridCols = Math.min(orderedTerminals.length, gridLayoutConfig.cols) || 1
    const gridRows = Math.ceil(orderedTerminals.length / gridCols) || 1

    // Render rows with panels
    const renderRows = (): ReactNode[] => {
        const rows: ReactNode[] = []
        for (let rowIndex = 0; rowIndex < gridRows; rowIndex++) {
            const startIndex = rowIndex * gridCols
            const rowTerminals = orderedTerminals.slice(startIndex, startIndex + gridCols)

            const cells: ReactNode[] = rowTerminals.map((terminal) => (
                <Panel key={terminal.id} minSize={10} defaultSize={100 / gridCols}>
                    <SortableTerminalCell
                        terminal={terminal}
                        onRename={handleRename}
                        onRemove={handleRemove}
                        isOnlyOne={orderedTerminals.length === 1}
                        isActive={terminal.id === activeTerminalId}
                        onSelect={handleSelect}
                    />
                </Panel>
            ))

            // Add resize handles between cells
            const cellsWithHandles: ReactNode[] = []
            cells.forEach((cell, idx) => {
                cellsWithHandles.push(cell)
                if (idx < cells.length - 1) {
                    cellsWithHandles.push(
                        <PanelResizeHandle key={`resize-${rowIndex}-${idx}`} className="grid-resize-handle-vertical" />
                    )
                }
            })

            rows.push(
                <Panel key={`row-${rowIndex}`} minSize={10} defaultSize={100 / gridRows}>
                    <PanelGroup direction="horizontal">
                        {cellsWithHandles}
                    </PanelGroup>
                </Panel>
            )

            if (rowIndex < gridRows - 1) {
                rows.push(
                    <PanelResizeHandle key={`resize-row-${rowIndex}`} className="grid-resize-handle-horizontal" />
                )
            }
        }
        return rows
    }

    // Fit all terminals when grid changes
    useEffect(() => {
        const timer = setTimeout(() => {
            orderedTerminals.forEach(terminal => {
                const instance = terminalManager.getTerminal(terminal.id)
                if (instance && instance.xterm.element) {
                    try {
                        instance.fitAddon.fit()
                        window.api.session.resize(terminal.id, instance.xterm.cols, instance.xterm.rows)
                    } catch (e) {
                        console.warn('Failed to fit terminal:', e)
                    }
                }
            })
        }, 100)

        return () => clearTimeout(timer)
    }, [gridLayoutConfig, orderedTerminals.length])

    return (
        <div className="terminal-grid-container">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={terminalOrder}
                    strategy={rectSortingStrategy}
                >
                    <PanelGroup direction="vertical">
                        {renderRows()}
                    </PanelGroup>
                </SortableContext>

                <DragOverlay>
                    {activeTerminal ? <DragOverlayItem terminal={activeTerminal} /> : null}
                </DragOverlay>
            </DndContext>
        </div>
    )
}

export default TerminalGrid
