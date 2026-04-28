import React, { useState } from 'react'
import { X, User, Phone, Lock, Eye, EyeOff, Loader2, Check, Camera, ChevronRight, ChevronLeft } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useI18n } from '../../context/I18nContext'
import { updateProfile } from '../../services/api'

interface AccountSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

type EditType = 'username' | 'phone' | 'password' | null

export default function AccountSettingsModal({ isOpen, onClose }: AccountSettingsModalProps) {
  const { user, updateUser, logout } = useAuth()
  const { t } = useI18n()
  const [editType, setEditType] = useState<EditType>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Form states
  const [username, setUsername] = useState(user?.email?.split('@')[0] || '')
  const [phone, setPhone] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  if (!isOpen) return null

  const handleBack = () => {
    setEditType(null)
    setMessage(null)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  const handleSaveUsername = async () => {
    if (!username.trim()) {
      setMessage({ type: 'error', text: '用户名不能为空' })
      return
    }

    setIsLoading(true)
    try {
      await updateProfile({ username })
      // Update local user state
      updateUser({ username })
      setMessage({ type: 'success', text: '用户名修改成功' })
      setTimeout(() => {
        handleBack()
      }, 1500)
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '修改失败' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSavePhone = async () => {
    if (!phone.trim()) {
      setMessage({ type: 'error', text: '手机号不能为空' })
      return
    }
    if (!/^1\d{10}$/.test(phone)) {
      setMessage({ type: 'error', text: '请输入正确的手机号' })
      return
    }

    setIsLoading(true)
    try {
      await updateProfile({ phone })
      setMessage({ type: 'success', text: '手机号修改成功' })
      setTimeout(() => {
        handleBack()
      }, 1500)
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '修改失败' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSavePassword = async () => {
    if (!currentPassword) {
      setMessage({ type: 'error', text: '请输入当前密码' })
      return
    }
    if (!newPassword) {
      setMessage({ type: 'error', text: '请输入新密码' })
      return
    }
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: '新密码至少6位' })
      return
    }
    if (!confirmPassword) {
      setMessage({ type: 'error', text: '请确认新密码' })
      return
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: '两次输入的新密码不一致' })
      return
    }

    setIsLoading(true)
    try {
      const result = await updateProfile({
        current_password: currentPassword,
        new_password: newPassword,
      })
      setMessage({ type: 'success', text: '密码修改成功，请重新登录' })
      setTimeout(() => {
        handleBack()
        onClose()
        // Force logout and redirect to login
        logout()
        window.dispatchEvent(new CustomEvent('showAuthModal', { detail: 'login' }))
      }, 1500)
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '修改失败' })
    } finally {
      setIsLoading(false)
    }
  }

  const renderContent = () => {
    // Selection screen
    if (!editType) {
      return (
        <>
          <div className="p-6 space-y-3">
            <button
              onClick={() => setEditType('username')}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-border dark:border-dark-border hover:border-primary/50 hover:bg-primary/5 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <span className="text-text-primary dark:text-dark-text block font-medium">修改用户名</span>
                  <span className="text-xs text-text-secondary dark:text-dark-text-secondary">当前：{user?.email?.split('@')[0] || '未设置'}</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-text-secondary dark:text-dark-text-secondary" />
            </button>

            <button
              onClick={() => setEditType('phone')}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-border dark:border-dark-border hover:border-primary/50 hover:bg-primary/5 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <span className="text-text-primary dark:text-dark-text block font-medium">绑定手机号</span>
                  <span className="text-xs text-text-secondary dark:text-dark-text-secondary">用于账号安全验证</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-text-secondary dark:text-dark-text-secondary" />
            </button>

            <button
              onClick={() => setEditType('password')}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-border dark:border-dark-border hover:border-primary/50 hover:bg-primary/5 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Lock className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <span className="text-text-primary dark:text-dark-text block font-medium">修改密码</span>
                  <span className="text-xs text-text-secondary dark:text-dark-text-secondary">定期修改密码保护账号安全</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-text-secondary dark:text-dark-text-secondary" />
            </button>
          </div>

          <div className="px-6 py-4 border-t border-border dark:border-dark-border">
            <p className="text-xs text-text-secondary dark:text-dark-text-secondary text-center">
              选择要修改的内容
            </p>
          </div>
        </>
      )
    }

    // Username form
    if (editType === 'username') {
      return (
        <>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-dark-text mb-2">
                用户名
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary dark:text-dark-text-secondary" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="输入新用户名"
                  className="w-full pl-11 pr-4 py-3 bg-surface-bg dark:bg-dark-bg border border-border dark:border-dark-border rounded-xl text-text-primary dark:text-dark-text placeholder-text-secondary dark:placeholder-dark-text-secondary focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          {message && (
            <div className={`mx-6 p-3 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
            }`}>
              {message.text}
            </div>
          )}

          <div className="flex justify-between px-6 py-4 border-t border-border dark:border-dark-border">
            <button
              onClick={handleBack}
              className="px-4 py-2 text-text-secondary dark:text-dark-text-secondary hover:text-text-primary dark:hover:text-dark-text transition-colors"
            >
              返回
            </button>
            <button
              onClick={handleSaveUsername}
              disabled={isLoading}
              className="px-6 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              保存
            </button>
          </div>
        </>
      )
    }

    // Phone form
    if (editType === 'phone') {
      return (
        <>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-dark-text mb-2">
                手机号码
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary dark:text-dark-text-secondary" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="输入手机号码"
                  className="w-full pl-11 pr-4 py-3 bg-surface-bg dark:bg-dark-bg border border-border dark:border-dark-border rounded-xl text-text-primary dark:text-dark-text placeholder-text-secondary dark:placeholder-dark-text-secondary focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          {message && (
            <div className={`mx-6 p-3 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
            }`}>
              {message.text}
            </div>
          )}

          <div className="flex justify-between px-6 py-4 border-t border-border dark:border-dark-border">
            <button
              onClick={handleBack}
              className="px-4 py-2 text-text-secondary dark:text-dark-text-secondary hover:text-text-primary dark:hover:text-dark-text transition-colors"
            >
              返回
            </button>
            <button
              onClick={handleSavePhone}
              disabled={isLoading}
              className="px-6 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              保存
            </button>
          </div>
        </>
      )
    }

    // Password form
    if (editType === 'password') {
      return (
        <>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs text-text-secondary dark:text-dark-text-secondary mb-1.5">
                当前密码
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary dark:text-dark-text-secondary" />
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="输入当前密码"
                  className="w-full pl-11 pr-12 py-3 bg-surface-bg dark:bg-dark-bg border border-border dark:border-dark-border rounded-xl text-text-primary dark:text-dark-text placeholder-text-secondary dark:placeholder-dark-text-secondary focus:outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="w-5 h-5 text-text-secondary dark:text-dark-text-secondary" />
                  ) : (
                    <Eye className="w-5 h-5 text-text-secondary dark:text-dark-text-secondary" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs text-text-secondary dark:text-dark-text-secondary mb-1.5">
                新密码
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary dark:text-dark-text-secondary" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="输入新密码"
                  className="w-full pl-11 pr-12 py-3 bg-surface-bg dark:bg-dark-bg border border-border dark:border-dark-border rounded-xl text-text-primary dark:text-dark-text placeholder-text-secondary dark:placeholder-dark-text-secondary focus:outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                >
                  {showNewPassword ? (
                    <EyeOff className="w-5 h-5 text-text-secondary dark:text-dark-text-secondary" />
                  ) : (
                    <Eye className="w-5 h-5 text-text-secondary dark:text-dark-text-secondary" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs text-text-secondary dark:text-dark-text-secondary mb-1.5">
                确认新密码
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary dark:text-dark-text-secondary" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入新密码"
                  className="w-full pl-11 pr-12 py-3 bg-surface-bg dark:bg-dark-bg border border-border dark:border-dark-border rounded-xl text-text-primary dark:text-dark-text placeholder-text-secondary dark:placeholder-dark-text-secondary focus:outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5 text-text-secondary dark:text-dark-text-secondary" />
                  ) : (
                    <Eye className="w-5 h-5 text-text-secondary dark:text-dark-text-secondary" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {message && (
            <div className={`mx-6 p-3 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
            }`}>
              {message.text}
            </div>
          )}

          <div className="flex justify-between px-6 py-4 border-t border-border dark:border-dark-border">
            <button
              onClick={handleBack}
              className="px-4 py-2 text-text-secondary dark:text-dark-text-secondary hover:text-text-primary dark:hover:text-dark-text transition-colors"
            >
              返回
            </button>
            <button
              onClick={handleSavePassword}
              disabled={isLoading}
              className="px-6 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              保存
            </button>
          </div>
        </>
      )
    }
  }

  const getTitle = () => {
    switch (editType) {
      case 'username': return '修改用户名'
      case 'phone': return '绑定手机号'
      case 'password': return '修改密码'
      default: return '账户设置'
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-surface-card dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-md mx-4 border border-border dark:border-dark-border">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border dark:border-dark-border">
          {editType && (
            <button
              onClick={handleBack}
              className="p-1.5 rounded-lg hover:bg-surface-sidebar dark:hover:bg-dark-sidebar transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-text-secondary dark:text-dark-text-secondary" />
            </button>
          )}
          <h2 className={`text-lg font-semibold text-text-primary dark:text-dark-text ${editType ? 'flex-1 text-center pr-8' : ''}`}>{getTitle()}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-sidebar dark:hover:bg-dark-sidebar transition-colors"
          >
            <X className="w-5 h-5 text-text-secondary dark:text-dark-text-secondary" />
          </button>
        </div>

        {/* Content */}
        {renderContent()}
      </div>
    </div>
  )
}