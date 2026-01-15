import { useState, useEffect } from 'react'
import { useAppStore, RoleConfig } from '../store/appStore'
import { getIcon } from '../utils/icons'
import './RoleManager.css'

interface RoleManagerProps {
    onClose: () => void
}

const ICONS = ['home', 'monitor', 'server', 'settings', 'user', 'code', 'terminal', 'database', 'cloud']

const RoleManager = ({ onClose }: RoleManagerProps) => {
    const {
        roles,
        addRole,
        updateRole,
        deleteRole,
        terminalNotificationSettings,
        setTerminalNotificationEnabled
    } = useAppStore()
    const [selectedRoleId, setSelectedRoleId] = useState<string | null>(roles[0]?.id || null)
    const [editForm, setEditForm] = useState<RoleConfig | null>(null)

    useEffect(() => {
        if (selectedRoleId && selectedRoleId !== 'settings') {
            const role = roles.find(r => r.id === selectedRoleId)
            if (role) {
                setEditForm({ ...role })
            }
        }
    }, [selectedRoleId, roles])

    const handleSave = () => {
        if (!editForm) return

        if (roles.some(r => r.id === editForm.id)) {
            updateRole(editForm.id, editForm)
        } else {
            addRole(editForm)
        }
        // Show success toast?
    }

    const handleDelete = () => {
        if (!editForm || editForm.isBuiltIn) return
        if (window.confirm(`确定要删除角色 "${editForm.name}" 吗？`)) {
            deleteRole(editForm.id)
            setSelectedRoleId(roles[0]?.id || null)
        }
    }

    const handleCreateNew = () => {
        const newRole: RoleConfig = {
            id: `role-${Date.now()}`,
            name: '新角色',
            icon: 'user',
            prompt: '# 新角色\n\n这是新角色的系统提示词。',
            customPrompt: '[新角色]$ ',
            isBuiltIn: false,
            isActive: true
        }
        addRole(newRole)
        setSelectedRoleId(newRole.id)
    }

    return (
        <div className="role-manager-overlay">
            <div className="role-manager-modal">
                <div className="modal-header">
                    <h3>角色管理</h3>
                    <button className="close-btn" onClick={onClose}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div className="modal-content">
                    <div className="role-list-sidebar">
                        <button className="add-role-btn" onClick={handleCreateNew}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            新建角色
                        </button>
                        <div className="role-list-items">
                            {roles.map(role => (
                                <div
                                    key={role.id}
                                    className={`role-list-item ${selectedRoleId === role.id ? 'active' : ''}`}
                                    onClick={() => setSelectedRoleId(role.id)}
                                >
                                    <span className="role-name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ width: '14px', height: '14px' }}>{getIcon(role.icon)}</span>
                                        {role.name}
                                    </span>
                                    {role.isBuiltIn && <span className="builtin-badge">内置</span>}
                                </div>
                            ))}
                        </div>
                        <div className="settings-divider" style={{
                            height: '1px',
                            background: 'var(--cc-border-primary)',
                            margin: '8px 0'
                        }} />
                        <div
                            className={`role-list-item ${selectedRoleId === 'settings' ? 'active' : ''}`}
                            onClick={() => setSelectedRoleId('settings')}
                        >
                            <span className="role-name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '14px', height: '14px' }}>{getIcon('settings')}</span>
                                全局设置
                            </span>
                        </div>
                    </div>

                    <div className="role-editor">
                        {editForm ? (
                            <div className="editor-form">
                                <div className="form-group">
                                    <label>角色名称</label>
                                    <input
                                        type="text"
                                        value={editForm.name}
                                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                    />
                                </div>

                                <div className="form-group row">
                                    <div
                                        className="toggle-switch-wrapper"
                                        onClick={() => setEditForm({ ...editForm, isActive: !editForm.isActive })}
                                    >
                                        <div className={`toggle-switch ${editForm.isActive ? 'checked' : ''}`}>
                                            <div className="toggle-knob"></div>
                                        </div>
                                        <span>在当前工作区启用</span>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>图标</label>
                                    <div className="icon-selector">
                                        {ICONS.map(iconName => (
                                            <div
                                                key={iconName}
                                                className={`icon-option ${editForm.icon === iconName ? 'selected' : ''}`}
                                                onClick={() => setEditForm({ ...editForm, icon: iconName })}
                                            >
                                                <span className="icon-preview" style={{ display: 'flex' }}>
                                                    {getIcon(iconName)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>终端提示符 (PS1)</label>
                                    <input
                                        type="text"
                                        value={editForm.customPrompt || ''}
                                        onChange={e => setEditForm({ ...editForm, customPrompt: e.target.value })}
                                        placeholder="例如: [架构师]$ "
                                    />
                                </div>

                                <div className="form-group full-height">
                                    <label>系统提示词 (Markdown)</label>
                                    <textarea
                                        value={editForm.prompt}
                                        onChange={e => setEditForm({ ...editForm, prompt: e.target.value })}
                                    />
                                </div>

                                <div className="form-actions">
                                    {!editForm.isBuiltIn && (
                                        <button className="delete-btn" onClick={handleDelete}>删除角色</button>
                                    )}
                                    <button className="save-btn" onClick={handleSave}>保存更改</button>
                                </div>
                            </div>
                        ) : selectedRoleId === 'settings' ? (
                            <div className="editor-form">
                                <div className="form-section-title" style={{
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    color: 'var(--cc-text-primary)',
                                    marginBottom: '16px',
                                    borderBottom: '1px solid var(--cc-border-primary)',
                                    paddingBottom: '8px'
                                }}>
                                    终端监控设置
                                </div>

                                <div className="form-group row">
                                    <div
                                        className="toggle-switch-wrapper"
                                        onClick={() => setTerminalNotificationEnabled(!terminalNotificationSettings.enabled)}
                                    >
                                        <div className={`toggle-switch ${terminalNotificationSettings.enabled ? 'checked' : ''}`}>
                                            <div className="toggle-knob"></div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <span>启用终端活跃度监控</span>
                                            <span style={{ fontSize: '11px', color: 'var(--cc-text-muted)', fontWeight: 'normal' }}>
                                                当终端长时间停止输出时显示通知
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="empty-state">请选择一个角色进行编辑</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default RoleManager
