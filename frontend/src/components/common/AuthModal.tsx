import React, { useState } from 'react'
import { X, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useI18n } from '../../context/I18nContext'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  initialMode?: 'login' | 'register'
}

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const { login, register } = useAuth()
  const { t } = useI18n()
  const [mode, setMode] = useState<'login' | 'register'>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)

    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register(email, password)
      }
      onClose()
      // Reset form
      setEmail('')
      setPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login')
    setError('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-surface-card dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8 border border-border dark:border-dark-border">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-surface-sidebar dark:hover:bg-dark-sidebar transition-colors"
        >
          <X className="w-5 h-5 text-text-secondary dark:text-dark-text-secondary" />
        </button>

        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-text-primary dark:text-dark-text">
            {mode === 'login' ? t('login') : t('register')}
          </h2>
          <p className="text-sm text-text-secondary dark:text-dark-text-secondary mt-2">
            {mode === 'login'
              ? 'Welcome back! Please login to continue'
              : 'Create an account to get started'}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-text-primary dark:text-dark-text mb-2">
              {t('email')}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary dark:text-dark-text-secondary" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-11 pr-4 py-3 bg-surface-bg dark:bg-dark-bg border border-border dark:border-dark-border rounded-xl text-text-primary dark:text-dark-text placeholder-text-secondary dark:placeholder-dark-text-secondary focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-text-primary dark:text-dark-text mb-2">
              {t('password')}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary dark:text-dark-text-secondary" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-12 py-3 bg-surface-bg dark:bg-dark-bg border border-border dark:border-dark-border rounded-xl text-text-primary dark:text-dark-text placeholder-text-secondary dark:placeholder-dark-text-secondary focus:outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5 text-text-secondary dark:text-dark-text-secondary" />
                ) : (
                  <Eye className="w-5 h-5 text-text-secondary dark:text-dark-text-secondary" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password (register only) */}
          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-dark-text mb-2">
                {t('confirmPassword')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary dark:text-dark-text-secondary" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3 bg-surface-bg dark:bg-dark-bg border border-border dark:border-dark-border rounded-xl text-text-primary dark:text-dark-text placeholder-text-secondary dark:placeholder-dark-text-secondary focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {mode === 'login' ? t('loggingIn') : t('registering')}
              </>
            ) : (
              mode === 'login' ? t('login') : t('register')
            )}
          </button>
        </form>

        {/* Switch mode */}
        <div className="mt-6 text-center">
          <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={switchMode}
              className="text-primary hover:underline font-medium"
            >
              {mode === 'login' ? t('register') : t('login')}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}