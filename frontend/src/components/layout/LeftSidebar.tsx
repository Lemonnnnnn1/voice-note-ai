import React, { useState } from 'react'
import { Download, Moon, Sun, Mic, HelpCircle, BookOpen, MessageCircle, Info, ChevronRight, Settings, FileUp, FileSearch, X, Sparkles, Send } from 'lucide-react'
import { useSettings } from '../../context/SettingsContext'
import { useI18n } from '../../context/I18nContext'

type RightView = 'welcome' | 'analysis' | 'export-settings' | 'app-settings'

interface LeftSidebarProps {
  onNavigate: (view: RightView) => void
}

export default function LeftSidebar({ onNavigate }: LeftSidebarProps) {
  const { settings, updateSettings } = useSettings()
  const { t } = useI18n()
  const [showHelpMenu, setShowHelpMenu] = useState(false)
  const [showAIModelMenu, setShowAIModelMenu] = useState(false)
  const [showThemeMenu, setShowThemeMenu] = useState(false)
  const [showGuideModal, setShowGuideModal] = useState(false)
  const [showFaqModal, setShowFaqModal] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [showAboutModal, setShowAboutModal] = useState(false)
  const [contactType, setContactType] = useState('bug')
  const [contactContent, setContactContent] = useState('')

  const handleThemeChange = (theme: 'light' | 'dark') => {
    updateSettings({ theme })
  }

  const handleContactSubmit = async () => {
    if (!contactContent.trim()) {
      alert(t('enterQuestion'))
      return
    }
    console.log('Submit feedback:', { type: contactType, content: contactContent })
    alert(t('thankYouFeedback'))
    setContactContent('')
    setContactType('bug')
    setShowContactModal(false)
  }

  const helpMenuItems = [
    { icon: Settings, label: t('settings'), description: t('accountSettings') },
    { icon: BookOpen, label: t('usageGuide'), description: t('understandHowToUse') },
    { icon: MessageCircle, label: t('faq'), description: t('viewFAQ') },
    { icon: MessageCircle, label: t('contactUs'), description: t('getHelpSupport') },
    { icon: Info, label: t('about'), description: t('viewAppInfoVersion') }
  ]

  const guideSteps = [
    { icon: Mic, title: t('startRecordingGuide'), desc: t('startRecordingDesc') },
    { icon: FileUp, title: t('uploadFileGuide'), desc: t('uploadFileDesc') },
    { icon: FileSearch, title: t('viewExportGuide'), desc: t('viewExportDesc') }
  ]

  const faqItems = [
    { q: t('recordingNoResponse'), a: t('recordingNoResponseA') },
    { q: t('supportedFormats'), a: t('supportedFormatsA') },
    { q: t('transcriptionTime'), a: t('transcriptionTimeA') },
    { q: t('multilingualSupport'), a: t('multilingualSupportA') },
    { q: t('dataRetention'), a: t('dataRetentionA') }
  ]

  return (
    <aside className="w-16 bg-surface-sidebar border-r border-border dark:bg-dark-sidebar dark:border-dark-border flex flex-col h-full">
      {/* Header - Product Logo */}
      <div className="p-2 border-b border-border dark:border-dark-border">
        <button
          onClick={() => onNavigate('welcome')}
          className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center mx-auto cursor-pointer hover:bg-primary-dark transition-colors"
          title={t('appName')}
        >
          <span className="text-white font-bold text-xs">VN</span>
        </button>
      </div>

      {/* Icon Buttons */}
      <div className="flex-1 py-4 space-y-2">
        {/* AI Model - Click Triggered */}
        <div className="relative">
          <button
            onClick={() => {
              setShowAIModelMenu(!showAIModelMenu)
              setShowThemeMenu(false)
            }}
            className={`w-10 h-10 flex items-center justify-center mx-auto rounded-lg transition-colors ${
              showAIModelMenu ? 'bg-primary text-white' : 'hover:bg-surface-card dark:hover:bg-dark-card text-text-secondary dark:text-dark-text-secondary hover:text-primary'
            }`}
            title={t('aiTranscriptionModel')}
          >
            <Mic className="w-5 h-5" />
          </button>
          {/* AI Model Dropdown - Click Triggered */}
          {showAIModelMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowAIModelMenu(false)}
              />
              <div className="absolute left-full ml-2 top-0 bg-surface-card border border-border dark:bg-dark-card dark:border-dark-border rounded-lg shadow-xl z-50 p-3 min-w-[200px]">
                <p className="text-xs text-text-secondary dark:text-dark-text-secondary mb-2 font-medium">{t('aiTranscriptionModel')}</p>
                <select
                  value={settings.aiModel}
                  onChange={(e) => updateSettings({ aiModel: e.target.value as any })}
                  className="w-full px-3 py-2.5 bg-surface-bg border border-border dark:bg-dark-bg dark:border-dark-border rounded-lg text-text-primary dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="faster-whisper">Faster Whisper (Local)</option>
                </select>
                <p className="text-[10px] text-text-secondary dark:text-dark-text-secondary mt-2">
                  {t('localRunFreeUse')}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Export Settings - Navigate to full page */}
        <button
          onClick={() => onNavigate('export-settings')}
          className="w-10 h-10 flex items-center justify-center mx-auto rounded-lg hover:bg-surface-card dark:hover:bg-dark-card transition-colors text-text-secondary dark:text-dark-text-secondary hover:text-primary"
          title={t('sidebarExportSettings')}
        >
          <Download className="w-5 h-5" />
        </button>

        {/* Theme Toggle - Click Triggered */}
        <div className="relative">
          <button
            onClick={() => {
              setShowThemeMenu(!showThemeMenu)
              setShowAIModelMenu(false)
            }}
            className={`w-10 h-10 flex items-center justify-center mx-auto rounded-lg transition-colors ${
              showThemeMenu ? 'bg-primary text-white' : 'hover:bg-surface-card dark:hover:bg-dark-card text-text-secondary dark:text-dark-text-secondary hover:text-primary'
            }`}
            title={t('themeMode')}
          >
            {settings.theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
          {showThemeMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowThemeMenu(false)}
              />
              <div className="absolute left-full ml-2 top-0 bg-surface-card border border-border dark:bg-dark-card dark:border-dark-border rounded-lg shadow-xl z-50 p-3 min-w-[140px]">
                <p className="text-xs text-text-secondary dark:text-dark-text-secondary mb-2 font-medium">{t('themeSettings')}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleThemeChange('light')}
                    className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-medium transition-colors ${
                      settings.theme === 'light' || !settings.theme
                        ? 'bg-primary text-white'
                        : 'bg-surface-bg border border-border dark:bg-dark-bg dark:border-dark-border text-text-secondary dark:text-dark-text-secondary hover:border-primary'
                    }`}
                  >
                    <Sun className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleThemeChange('dark')}
                    className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-medium transition-colors ${
                      settings.theme === 'dark'
                        ? 'bg-primary text-white'
                        : 'bg-surface-bg border border-border dark:bg-dark-bg dark:border-dark-border text-text-secondary dark:text-dark-text-secondary hover:border-primary'
                    }`}
                  >
                    <Moon className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Settings & Help - Bottom */}
      <div className="p-2 border-t border-border dark:border-dark-border relative">
        <div className="relative">
          <button
            onClick={() => setShowHelpMenu(!showHelpMenu)}
            className={`w-10 h-10 flex items-center justify-center mx-auto rounded-lg transition-colors ${
              showHelpMenu ? 'bg-primary text-white' : 'hover:bg-surface-card dark:hover:bg-dark-card text-text-secondary dark:text-dark-text-secondary hover:text-primary'
            }`}
            title={t('settingsAndHelp')}
          >
            <HelpCircle className="w-5 h-5" />
          </button>

          {/* Help Menu Popup */}
          {showHelpMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowHelpMenu(false)}
              />
              <div className="absolute left-full ml-2 bottom-0 bg-surface-card border border-border dark:bg-dark-card dark:border-dark-border rounded-xl shadow-xl z-50 p-2 min-w-[240px]">
                <div className="px-3 py-2 border-b border-border dark:border-dark-border mb-1">
                  <span className="text-sm font-semibold text-text-primary dark:text-dark-text">{t('settingsAndHelp')}</span>
                </div>
                {helpMenuItems.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      if (item.label === t('settings')) {
                        onNavigate('app-settings')
                        setShowHelpMenu(false)
                      } else if (item.label === t('usageGuide')) {
                        setShowHelpMenu(false)
                        setShowGuideModal(true)
                      } else if (item.label === t('faq')) {
                        setShowHelpMenu(false)
                        setShowFaqModal(true)
                      } else if (item.label === t('contactUs')) {
                        setShowHelpMenu(false)
                        setShowContactModal(true)
                      } else if (item.label === t('about')) {
                        setShowHelpMenu(false)
                        setShowAboutModal(true)
                      }
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-sidebar transition-colors"
                  >
                    <item.icon className="w-4 h-4 text-text-secondary" />
                    <div className="flex-1 text-left">
                      <span className="text-sm text-text-primary dark:text-dark-text block">{item.label}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-text-secondary" />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-border">
        <p className="text-[10px] text-text-secondary text-center">{t('version')} v0.1</p>
      </div>

      {/* Usage Guide Modal */}
      {showGuideModal && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-[60]"
            onClick={() => setShowGuideModal(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface-card border border-border dark:bg-dark-card dark:border-dark-border rounded-2xl shadow-2xl z-[70] w-[400px] max-w-[90vw]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border dark:border-dark-border">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-text-primary dark:text-dark-text">{t('usageGuideTitle')}</h2>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="p-1 hover:bg-surface-sidebar dark:hover:bg-dark-sidebar rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-text-secondary" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5">
              <div className="space-y-4">
                {guideSteps.map((step, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                        <step.icon className="w-5 h-5 text-primary" />
                      </div>
                      {index < guideSteps.length - 1 && (
                        <div className="w-0.5 flex-1 bg-border my-1" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <h3 className="text-sm font-semibold text-text-primary dark:text-dark-text mb-1">{step.title}</h3>
                      <p className="text-xs text-text-secondary dark:text-dark-text-secondary leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tips */}
              <div className="mt-5 px-4 py-3 bg-primary/5 rounded-xl border border-primary/20">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-text-secondary dark:text-dark-text-secondary space-y-1">
                    <p>{t('supportBilingualRecognition')}</p>
                    <p>{t('autoGenerateSummaryAfterRecording')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* FAQ Modal */}
      {showFaqModal && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-[60]"
            onClick={() => setShowFaqModal(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface-card border border-border dark:bg-dark-card dark:border-dark-border rounded-2xl shadow-2xl z-[70] w-[400px] max-w-[90vw]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border dark:border-dark-border">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-text-primary dark:text-dark-text">{t('faqTitle')}</h2>
              </div>
              <button
                onClick={() => setShowFaqModal(false)}
                className="p-1 hover:bg-surface-sidebar dark:hover:bg-dark-sidebar rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-text-secondary" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              {faqItems.map((item, index) => (
                <div key={index} className="border-b border-border dark:border-dark-border pb-3 last:border-b-0 last:pb-0">
                  <p className="text-sm font-medium text-text-primary dark:text-dark-text mb-1">Q: {item.q}</p>
                  <p className="text-xs text-text-secondary dark:text-dark-text-secondary">A: {item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Contact Us Modal */}
      {showContactModal && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-[60]"
            onClick={() => setShowContactModal(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface-card border border-border dark:bg-dark-card dark:border-dark-border rounded-2xl shadow-2xl z-[70] w-[400px] max-w-[90vw]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border dark:border-dark-border">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-text-primary dark:text-dark-text">{t('feedbackContact')}</h2>
              </div>
              <button
                onClick={() => setShowContactModal(false)}
                className="p-1 hover:bg-surface-sidebar dark:hover:bg-dark-sidebar rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-text-secondary" />
              </button>
            </div>

            {/* Form */}
            <div className="p-5 space-y-4">
              {/* Issue Type */}
              <div>
                <label className="text-sm text-text-secondary dark:text-dark-text-secondary block mb-2">{t('issueType')}</label>
                <select
                  value={contactType}
                  onChange={(e) => setContactType(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-bg dark:bg-dark-bg border border-border dark:border-dark-border rounded-xl text-text-primary dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="bug">{t('bug')}</option>
                  <option value="suggestion">{t('suggestion')}</option>
                  <option value="other">{t('other')}</option>
                </select>
              </div>

              {/* Issue Description */}
              <div>
                <label className="text-sm text-text-secondary dark:text-dark-text-secondary block mb-2">{t('issueDescription')}</label>
                <textarea
                  value={contactContent}
                  onChange={(e) => setContactContent(e.target.value)}
                  placeholder={t('describeIssue')}
                  rows={4}
                  className="w-full px-4 py-3 bg-surface-bg dark:bg-dark-bg border border-border dark:border-dark-border rounded-xl text-text-primary dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none placeholder:text-text-secondary/50"
                />
              </div>

              {/* Submit Button */}
              <button
                onClick={handleContactSubmit}
                className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {t('submitFeedback')}
              </button>
            </div>
          </div>
        </>
      )}

      {/* About Modal */}
      {showAboutModal && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-[60]"
            onClick={() => setShowAboutModal(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface-card border border-border dark:bg-dark-card dark:border-dark-border rounded-2xl shadow-2xl z-[70] w-[400px] max-w-[90vw]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border dark:border-dark-border">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-text-primary dark:text-dark-text">{t('aboutVoiceNoteAI')}</h2>
              </div>
              <button
                onClick={() => setShowAboutModal(false)}
                className="p-1 hover:bg-surface-sidebar dark:hover:bg-dark-sidebar rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-text-secondary" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5">
              <p className="text-sm text-text-secondary dark:text-dark-text-secondary leading-relaxed mb-4">
                {t('aboutDesc')}
              </p>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between py-2 border-b border-border dark:border-dark-border">
                  <span className="text-sm text-text-secondary dark:text-dark-text-secondary">{t('currentVersion')}</span>
                  <span className="text-sm text-text-primary dark:text-dark-text font-medium">{t('versionNumber')}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border dark:border-dark-border">
                  <span className="text-sm text-text-secondary dark:text-dark-text-secondary">{t('usageScope')}</span>
                  <span className="text-sm text-text-primary dark:text-dark-text font-medium">{t('personalSmallScope')}</span>
                </div>
              </div>

              <p className="text-xs text-text-secondary dark:text-dark-text-secondary text-center">
                {t('underDevelopment')}
              </p>
            </div>
          </div>
        </>
      )}
    </aside>
  )
}