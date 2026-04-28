import React, { useState, useEffect } from 'react'
import { User, Clock, FileAudio, Languages, HardDrive, ArrowLeft, LogOut, Settings, BarChart3, Loader2 } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useI18n } from '../../context/I18nContext'
import { useAuth } from '../../context/AuthContext'
import { getUsageStats, getUsageTrend, UsageStats, UsageTrendItem } from '../../services/api'
import AccountSettingsModal from './AccountSettingsModal'

interface StatCard {
  icon: React.ElementType
  label: string
  value: string
  subValue?: string
  progress?: number
}

export default function PersonalCenter({ onBack }: { onBack: () => void }) {
  const { t } = useI18n()
  const { user, isAuthenticated, logout } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState<UsageStats | null>(null)
  const [trendData, setTrendData] = useState<UsageTrendItem[]>([])
  const [showAccountSettings, setShowAccountSettings] = useState(false)

  const quickActions = [
    { icon: Settings, label: t('accountSettings'), desc: t('accountSettingsDesc'), color: 'hover:border-primary/50 hover:bg-primary/5', onClick: () => setShowAccountSettings(true) },
  ]

  // Fetch real stats when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchData()
    }
  }, [isAuthenticated])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [statsData, trendDataResult] = await Promise.all([
        getUsageStats(),
        getUsageTrend(7)
      ])
      console.log('[DEBUG] fetchData - stats:', statsData)
      console.log('[DEBUG] fetchData - trendData:', trendDataResult)
      setStats(statsData)
      setTrendData(trendDataResult)
    } catch (error) {
      console.error('Failed to fetch usage data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    onBack()
  }

  const formatDuration = (seconds: number): string => {
    if (!seconds || seconds === 0) return '0分钟'
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.round(seconds % 60)
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    if (mins > 0) {
      return `${mins}分${secs}秒`
    }
    return `${secs}秒`
  }

  const formatStorage = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 MB'
    const mb = bytes / (1024 * 1024)
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`
    }
    return `${mb.toFixed(1)} MB`
  }

  // Format trend data for chart
  const chartData = trendData.map(item => ({
    name: new Date(item.date).toLocaleDateString('zh-CN', { weekday: 'short' }),
    duration: Math.round(item.duration / 60) // Convert to minutes
  })).reverse()
  console.log('[DEBUG] chartData:', chartData)

  const statCards: StatCard[] = stats ? [
    { icon: Clock, label: t('totalAnalysisDuration'), value: formatDuration(stats.total_duration), subValue: `${t('thisWeek')}: ${formatDuration(trendData.reduce((sum, d) => sum + d.duration, 0))}` },
    { icon: FileAudio, label: t('analyzedFiles'), value: String(stats.files_analyzed), subValue: `${t('recordings')}: - | ${t('uploads')}: -` },
    { icon: Languages, label: t('supportedLanguages'), value: '2个', subValue: '简体中文、English' },
    { icon: HardDrive, label: t('storageUsed'), value: formatStorage(stats.storage_used), subValue: `${t('usageRate')} ${stats.storage_used > 0 ? Math.round((stats.storage_used / (500 * 1024 * 1024)) * 100) : 0}%`, progress: stats.storage_used > 0 ? Math.min((stats.storage_used / (500 * 1024 * 1024)) * 100, 100) : 0 }
  ] : []

  // Not logged in state
  if (!isAuthenticated) {
    return (
      <div className="flex-1 bg-surface-bg dark:bg-dark-bg overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-surface-bg/95 dark:bg-dark-bg/95 backdrop-blur-sm border-b border-border dark:border-dark-border px-8 py-5">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-surface-sidebar dark:hover:bg-dark-sidebar rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-text-secondary dark:text-dark-text-secondary" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-text-primary dark:text-dark-text">{t('personalCenterTitle')}</h1>
                <p className="text-sm text-text-secondary dark:text-dark-text-secondary">{t('personalCenterDesc')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Not logged in content */}
        <div className="p-8 flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-surface-card dark:bg-dark-card rounded-full flex items-center justify-center mx-auto mb-6">
              <User className="w-10 h-10 text-text-secondary dark:text-dark-text-secondary" />
            </div>
            <h2 className="text-xl font-semibold text-text-primary dark:text-dark-text mb-2">
              {t('loginRequired')}
            </h2>
            <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-6">
              {t('loginRequiredDesc')}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('showAuthModal', { detail: 'login' }))}
                className="px-6 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors"
              >
                {t('login')}
              </button>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('showAuthModal', { detail: 'register' }))}
                className="px-6 py-2.5 bg-surface-card dark:bg-dark-card border border-border dark:border-dark-border text-text-primary dark:text-dark-text rounded-xl font-medium hover:bg-surface-sidebar dark:hover:bg-dark-sidebar transition-colors"
              >
                {t('register')}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-surface-bg dark:bg-dark-bg overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface-bg/95 dark:bg-dark-bg/95 backdrop-blur-sm border-b border-border dark:border-dark-border px-8 py-5">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-surface-sidebar dark:hover:bg-dark-sidebar rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-text-secondary dark:text-dark-text-secondary" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-text-primary dark:text-dark-text">{t('personalCenterTitle')}</h1>
              <p className="text-sm text-text-secondary dark:text-dark-text-secondary">{t('personalCenterDesc')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {/* User Info Card */}
        <div className="bg-surface-card dark:bg-dark-card rounded-xl border border-border dark:border-dark-border p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-text-primary dark:text-dark-text">{user?.username || user?.email?.split('@')[0] || '用户'}</h2>
                <p className="text-sm text-text-secondary dark:text-dark-text-secondary">{user?.email}</p>
                <span className="inline-block mt-2 px-3 py-1 bg-primary/10 text-primary text-xs rounded-full">
                  免费版
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              {t('logout')}
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-text-primary dark:text-dark-text mb-4">使用统计</h2>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {statCards.map((stat, index) => (
                <div key={index} className="bg-surface-card dark:bg-dark-card rounded-xl border border-border dark:border-dark-border p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                      <stat.icon className="w-6 h-6 text-primary" />
                    </div>
                    <span className="text-sm text-text-secondary dark:text-dark-text-secondary">{stat.label}</span>
                  </div>
                  {stat.progress !== undefined ? (
                    <>
                      <p className="text-2xl font-bold text-text-primary dark:text-dark-text mb-2">{stat.value}</p>
                      <div className="w-full bg-surface-sidebar dark:bg-dark-sidebar rounded-full h-2 mb-1">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${stat.progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-text-secondary dark:text-dark-text-secondary">{stat.subValue}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-text-primary dark:text-dark-text">{stat.value}</p>
                      {stat.subValue && (
                        <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-1">{stat.subValue}</p>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Usage Trend Chart */}
        <div className="bg-surface-card dark:bg-dark-card rounded-xl border border-border dark:border-dark-border p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-text-primary dark:text-dark-text">使用趋势</h2>
          </div>
          {isLoading ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : chartData.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorDuration" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6165f7" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6165f7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    tickFormatter={(value) => `${value}分钟`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value: number) => [`${value} ${t('minutes')}`, t('totalAnalysisDuration')]}
                  />
                  <Area
                    type="monotone"
                    dataKey="duration"
                    stroke="#6165f7"
                    strokeWidth={2}
                    fill="url(#colorDuration)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-text-secondary dark:text-dark-text-secondary">
              {t('noData')}
            </div>
          )}
        </div>

        {/* Quick Actions - Not implemented yet */}
        <div className="bg-surface-card dark:bg-dark-card rounded-xl border border-border dark:border-dark-border p-6">
          <h2 className="text-lg font-semibold text-text-primary dark:text-dark-text mb-4">{t('quickActions')}</h2>
          <div className="grid grid-cols-2 gap-4">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                className={`flex items-center gap-3 p-4 rounded-xl border border-border dark:border-dark-border ${action.color} transition-all text-left`}
              >
                <action.icon className="w-5 h-5 text-text-secondary dark:text-dark-text-secondary" />
                <div>
                  <span className="text-text-primary dark:text-dark-text block font-medium">{action.label}</span>
                  <span className="text-xs text-text-secondary dark:text-dark-text-secondary">{action.desc}</span>
                </div>
              </button>
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 p-4 rounded-xl border border-border dark:border-dark-border hover:border-red-500/50 hover:bg-red-50 dark:hover:bg-red-50 transition-all text-left"
            >
              <LogOut className="w-5 h-5 text-text-secondary dark:text-dark-text-secondary" />
              <div>
                <span className="text-text-primary dark:text-dark-text block font-medium">{t('logout')}</span>
                <span className="text-xs text-text-secondary dark:text-dark-text-secondary">{t('logoutDesc')}</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <AccountSettingsModal
        isOpen={showAccountSettings}
        onClose={() => setShowAccountSettings(false)}
      />
    </div>
  )
}