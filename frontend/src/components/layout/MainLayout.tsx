import React, { useState } from 'react'
import { User } from 'lucide-react'
import LeftSidebar from './LeftSidebar'
import ProjectTree from './ProjectTree'
import ContentArea from './ContentArea'
import WelcomeScreen from '../common/WelcomeScreen'
import ExportSettingsPage from '../common/ExportSettingsPage'
import AppSettingsPage from '../common/AppSettingsPage'
import PersonalCenter from '../common/PersonalCenter'
import { useProject } from '../../context/ProjectContext'
import { useAuth } from '../../context/AuthContext'

type RightView = 'welcome' | 'analysis' | 'export-settings' | 'app-settings' | 'personal-center'

interface MainLayoutProps {
  onStartRecording: () => void
  onUploadFile: () => void
  setPendingProjectId: (id: string | null) => void
  rightView: RightView
  onNavigate: (view: RightView) => void
  onShowAuthModal: (mode: 'login' | 'register') => void
}

export default function MainLayout({ onStartRecording, onUploadFile, setPendingProjectId, rightView, onNavigate, onShowAuthModal }: MainLayoutProps) {
  const { currentFile } = useProject()
  const { isAuthenticated, user } = useAuth()
  const [isProjectTreeCollapsed, setIsProjectTreeCollapsed] = useState(false)

  const handleBack = () => {
    onNavigate(currentFile ? 'analysis' : 'welcome')
  }

  const handlePersonalCenterClick = () => {
    if (isAuthenticated) {
      onNavigate('personal-center')
    } else {
      onShowAuthModal('login')
    }
  }

  const renderRightContent = () => {
    // If we have a file, always show analysis
    if (currentFile && rightView === 'analysis') {
      return <ContentArea file={currentFile} />
    }

    switch (rightView) {
      case 'export-settings':
        return <ExportSettingsPage onBack={handleBack} />
      case 'app-settings':
        return <AppSettingsPage onBack={handleBack} />
      case 'personal-center':
        return <PersonalCenter onBack={handleBack} />
      case 'analysis':
        return currentFile ? <ContentArea file={currentFile} /> : <WelcomeScreen onStartRecording={onStartRecording} onUploadFile={onUploadFile} />
      default:
        return <WelcomeScreen onStartRecording={onStartRecording} onUploadFile={onUploadFile} />
    }
  }

  return (
    <div className="h-full flex flex-col bg-surface-bg dark:bg-dark-bg">
      {/* Top Right Personal Center Button - Fixed Position */}
      {rightView !== 'personal-center' && (
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={handlePersonalCenterClick}
            className="flex items-center gap-2 px-3 py-2 bg-surface-card border border-border dark:bg-dark-card dark:border-dark-border rounded-xl hover:bg-surface-sidebar dark:hover:bg-dark-sidebar transition-colors shadow-sm"
          >
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm text-text-primary dark:text-dark-text font-medium">
              {isAuthenticated ? (user?.username || user?.email?.split('@')[0] || '个人中心') : '登录'}
            </span>
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Sidebar - Icons */}
        <LeftSidebar onNavigate={onNavigate} />

        {/* Middle - Project Tree */}
        <ProjectTree
          isCollapsed={isProjectTreeCollapsed}
          onToggleCollapse={() => setIsProjectTreeCollapsed(!isProjectTreeCollapsed)}
          onNewFile={onUploadFile}
          setPendingProjectId={setPendingProjectId}
        />

        {/* Right - Content Area */}
        {renderRightContent()}
      </div>
    </div>
  )
}
