import React, { useState, useRef } from 'react'
import { Settings, Globe, Moon, Sun, Mic, FileCheck, Download, HardDrive, LogOut, ChevronRight, Shield, Trash2, User, FileAudio, ChevronDown, Check, FileText, Network, FolderOpen, File, List } from 'lucide-react'
import { useSettings } from '../../context/SettingsContext'
import { useProject } from '../../context/ProjectContext'
import { useI18n } from '../../context/I18nContext'

type SettingsTab = 'general' | 'transcription' | 'export' | 'storage'
type ExportPreset = 'full' | 'summary' | 'all' | 'custom'

export default function AppSettingsPage({ onBack }: { onBack: () => void }) {
  const { settings, updateSettings } = useSettings()
  const { projects } = useProject()
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')
  const contentRef = useRef<HTMLDivElement>(null)
  const directoryInputRef = useRef<HTMLInputElement>(null)

  const [selectedFile, setSelectedFile] = useState<string>('')
  const [showFileDropdown, setShowFileDropdown] = useState(false)
  const [outputDir, setOutputDir] = useState('C:\\Users\\lenovo\\Documents\\VoiceNote AI')
  const [exportPreset, setExportPreset] = useState<ExportPreset | null>(null)
  const [localStoragePath, setLocalStoragePath] = useState('')
  const [customCleanupDays, setCustomCleanupDays] = useState<number>(30)
  const [showCustomDaysInput, setShowCustomDaysInput] = useState(false)
  const [customContents, setCustomContents] = useState({
    transcript: false,
    speakers: false,
    chapters: false,
    summary: false,
    mindMap: false
  })
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null)

  const allFiles = projects.flatMap(p => p.files.filter(f => f.analysis))
  const selectedFileObj = allFiles.find(f => f.id === selectedFile)

  const handleFileSelect = (fileId: string) => {
    setSelectedFile(fileId)
    setShowFileDropdown(false)
  }

  const toggleCustomContent = (key: keyof typeof customContents) => {
    setCustomContents(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handlePresetChange = (preset: ExportPreset) => {
    setExportPreset(preset)
    if (preset === 'full') {
      setCustomContents({ transcript: true, speakers: true, chapters: true, summary: true, mindMap: false })
    } else if (preset === 'summary') {
      setCustomContents({ transcript: false, speakers: false, chapters: false, summary: true, mindMap: false })
    } else if (preset === 'all') {
      setCustomContents({ transcript: true, speakers: true, chapters: true, summary: true, mindMap: true })
    }
  }

  const handleFormatChange = (format: string) => {
    setSelectedFormat(format)
    updateSettings({ exportFormat: format as any })
  }

  const handleExport = () => {
    console.log('Exporting:', {
      file: selectedFileObj,
      format: selectedFormat,
      contents: exportPreset === 'custom' ? customContents : exportPreset
    })
    alert('Export feature is under development...')
  }

  const handleDirectorySelect = async () => {
    try {
      if ('showDirectoryPicker' in window) {
        const directoryHandle = await window.showDirectoryPicker()
        const path = directoryHandle.name
        setOutputDir(path)
        setLocalStoragePath(path)
        // Save to backend
        saveStorageSettings('local', path)
      } else {
        directoryInputRef.current?.click()
      }
    } catch (error) {
      console.log('Directory selection cancelled')
    }
  }

  const handleDirectoryInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const file = files[0]
      const path = file.webkitRelativePath.split('/')[0]
      setOutputDir(path)
      setLocalStoragePath(path)
      saveStorageSettings('local', path)
    }
  }

  const saveStorageSettings = async (storageType: 'local' | 'cloud', path?: string) => {
    try {
      const response = await fetch('/api/settings/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storage_type: storageType,
          storage_path: path || null
        })
      })
      const result = await response.json()
      if (!result.success) {
        console.error('Failed to save storage settings:', result.error)
      }
    } catch (error) {
      console.error('Error saving storage settings:', error)
    }
  }

  const saveCleanupSettings = async (enabled: boolean, days: number) => {
    try {
      const response = await fetch('/api/settings/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          days
        })
      })
      const result = await response.json()
      if (!result.success) {
        console.error('Failed to save cleanup settings:', result.error)
      }
    } catch (error) {
      console.error('Error saving cleanup settings:', error)
    }
  }

  const getExportSummary = () => {
    const parts: string[] = []

    if (selectedFileObj) {
      parts.push(`${t('exportObject')}: ${selectedFileObj.name}`)
    }

    if (exportPreset === 'full') {
      parts.push(`${t('exportContent')}: ${t('fullTranscriptExport')}`)
    } else if (exportPreset === 'summary') {
      parts.push(`${t('exportContent')}: ${t('meetingSummaryExport')}`)
    } else if (exportPreset === 'all') {
      parts.push(`${t('exportContent')}: ${t('globalExport')}`)
    } else if (exportPreset === 'custom') {
      const selectedItems = Object.entries(customContents)
        .filter(([_, v]) => v)
        .map(([k]) => {
          const map: Record<string, string> = {
            transcript: t('transcript'),
            speakers: t('speakers'),
            chapters: t('chapters'),
            summary: t('summary'),
            mindMap: t('mindMap')
          }
          return map[k]
        })
      if (selectedItems.length > 0) {
        parts.push(`${t('exportContent')}: ${selectedItems.join(' + ')}`)
      } else {
        parts.push(`${t('exportContent')}: ${t('noData')}`)
      }
    } else {
      parts.push(`${t('exportContent')}: ${t('noData')}`)
    }

    const formatMap: Record<string, string> = {
      markdown: t('markdown'),
      txt: t('txt'),
      pdf: t('pdf')
    }
    parts.push(`${t('exportFormat')}: ${selectedFormat ? formatMap[selectedFormat] || selectedFormat : t('noData')}`)
    parts.push(`${t('savePath')}: ${outputDir}`)

    return parts.join('; ')
  }

  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab)
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const tabs = [
    { id: 'general' as const, label: t('generalSettings'), icon: Globe },
    { id: 'transcription' as const, label: t('transcriptionSettings'), icon: Mic },
    { id: 'export' as const, label: t('exportSettings'), icon: Download },
    { id: 'storage' as const, label: t('storagePrivacy'), icon: HardDrive },
  ]

  const renderToggle = (checked: boolean, onChange: (v: boolean) => void) => (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-6 rounded-full transition-colors ${
        checked ? 'bg-primary' : 'bg-surface-sidebar'
      }`}
    >
      <div
        className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-7' : 'translate-x-1'
        }`}
      />
    </button>
  )

  const renderContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-6">
            <div className="bg-surface-card dark:bg-dark-card rounded-xl border border-border dark:border-dark-border p-5">
              <h3 className="text-base font-semibold text-text-primary dark:text-dark-text mb-4">{t('interfaceLanguage')}</h3>
              <p className="text-xs text-text-secondary dark:text-dark-text-secondary mb-3">{t('selectLanguage')}</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'auto', label: t('auto'), desc: t('followSystem') },
                  { value: 'zh', label: t('chinese'), desc: t('simplifiedChinese') },
                  { value: 'en', label: t('english'), desc: t('englishLanguage') }
                ].map(item => (
                  <button
                    key={item.value}
                    onClick={() => updateSettings({ language: item.value as any })}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      settings.language === item.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border dark:border-dark-border hover:border-primary/30'
                    }`}
                  >
                    <span className="text-sm font-medium text-text-primary dark:text-dark-text block">{item.label}</span>
                    <span className="text-xs text-text-secondary dark:text-dark-text-secondary">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-surface-card dark:bg-dark-card rounded-xl border border-border dark:border-dark-border p-5">
              <h3 className="text-base font-semibold text-text-primary dark:text-dark-text mb-4">{t('themeMode')}</h3>
              <p className="text-xs text-text-secondary dark:text-dark-text-secondary mb-3">{t('selectTheme')}</p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => updateSettings({ theme: 'light' })}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    settings.theme === 'light' || !settings.theme
                      ? 'border-primary bg-primary/5'
                      : 'border-border dark:border-dark-border hover:border-primary/30'
                  }`}
                >
                  <div className="w-full h-20 bg-white border border-gray-200 dark:bg-gray-700 dark:border-gray-600 rounded-lg mb-3 flex items-center justify-center">
                    <div className="w-8 h-8 bg-gray-800 dark:bg-gray-200 rounded" />
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    {(settings.theme === 'light' || !settings.theme) && <div className="w-2 h-2 bg-primary rounded-full" />}
                    <span className="text-sm font-medium text-text-primary dark:text-dark-text">{t('lightMode')}</span>
                  </div>
                </button>

                <button
                  onClick={() => updateSettings({ theme: 'dark' })}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    settings.theme === 'dark'
                      ? 'border-primary bg-primary/5'
                      : 'border-border dark:border-dark-border hover:border-primary/30'
                  }`}
                >
                  <div className="w-full h-20 bg-gray-800 border border-gray-700 dark:bg-gray-200 dark:border-gray-300 rounded-lg mb-3 flex items-center justify-center">
                    <div className="w-8 h-8 bg-white dark:bg-gray-800 rounded" />
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    {settings.theme === 'dark' && <div className="w-2 h-2 bg-primary rounded-full" />}
                    <span className="text-sm font-medium text-text-primary dark:text-dark-text">{t('darkMode')}</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )

      case 'transcription':
        return (
          <div className="space-y-6">
            <div className="bg-surface-card dark:bg-dark-card rounded-xl border border-border dark:border-dark-border p-5">
              <h3 className="text-base font-semibold text-text-primary dark:text-dark-text mb-4">{t('speakerRecognition')}</h3>
              <p className="text-xs text-text-secondary dark:text-dark-text-secondary mb-3">{t('speakerRecognitionDesc')}</p>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-text-primary dark:text-dark-text">{t('enableSpeakerRecognition')}</span>
                  <p className="text-xs text-text-secondary dark:text-dark-text-secondary">{t('speakerRecognitionDesc')}</p>
                </div>
                {renderToggle(settings.speakerRecognition, (v) => updateSettings({ speakerRecognition: v }))}
              </div>
            </div>

            <div className="bg-surface-card dark:bg-dark-card rounded-xl border border-border dark:border-dark-border p-5">
              <h3 className="text-base font-semibold text-text-primary dark:text-dark-text mb-4">{t('autoGenerateSummary')}</h3>
              <p className="text-xs text-text-secondary dark:text-dark-text-secondary mb-3">{t('autoSummaryDesc')}</p>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-text-primary dark:text-dark-text">{t('enableAutoSummary')}</span>
                  <p className="text-xs text-text-secondary dark:text-dark-text-secondary">{t('autoSummaryDesc')}</p>
                </div>
                {renderToggle(settings.autoSummary, (v) => updateSettings({ autoSummary: v }))}
              </div>
            </div>
          </div>
        )

      case 'export':
        return (
          <div className="space-y-4">
            {/* Export Object Selection */}
            <div className="bg-surface-card dark:bg-dark-card rounded-xl border border-border dark:border-dark-border p-5">
              <h2 className="text-base font-semibold text-text-primary dark:text-dark-text mb-0.5">{t('exportObject')}</h2>
              <p className="text-xs text-text-secondary dark:text-dark-text-secondary mb-3">{t('selectAnalyzedFile')}</p>

              {/* Dropdown Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowFileDropdown(!showFileDropdown)}
                  className={`w-full flex items-center justify-between px-4 py-3 bg-surface-bg dark:bg-dark-bg border rounded-xl transition-all ${
                    selectedFile ? 'border-primary/50' : 'border-border dark:border-dark-border'
                  } hover:border-primary/30`}
                >
                  <div className="flex items-center gap-3">
                    <FileAudio className="w-5 h-5 text-text-secondary dark:text-dark-text-secondary" />
                    {selectedFileObj ? (
                      <div className="text-left">
                        <span className="text-sm text-text-primary dark:text-dark-text block">{selectedFileObj.name}</span>
                        <span className="text-xs text-text-secondary dark:text-dark-text-secondary">
                          {new Date(selectedFileObj.createdAt).toLocaleDateString()}
                          {selectedFileObj.duration && ` · ${Math.floor(selectedFileObj.duration / 60)}:${String(selectedFileObj.duration % 60).padStart(2, '0')}`}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-text-secondary dark:text-dark-text-secondary">{t('selectFilePlaceholder')}</span>
                    )}
                  </div>
                  <ChevronDown className={`w-5 h-5 text-text-secondary dark:text-dark-text-secondary transition-transform ${showFileDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showFileDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowFileDropdown(false)} />
                    <div className="absolute top-full left-0 right-0 mt-2 bg-surface-card dark:bg-dark-card border border-border dark:border-dark-border rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto">
                      {allFiles.length === 0 ? (
                        <div className="p-4 text-center text-sm text-text-secondary dark:text-dark-text-secondary">
                          {t('noFilesAvailable')}
                        </div>
                      ) : (
                        allFiles.map(file => (
                          <button
                            key={file.id}
                            onClick={() => handleFileSelect(file.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-sidebar dark:hover:bg-dark-sidebar transition-colors ${
                              selectedFile === file.id ? 'bg-primary/5' : ''
                            }`}
                          >
                            <FileAudio className="w-5 h-5 text-text-secondary dark:text-dark-text-secondary" />
                            <div className="flex-1 text-left">
                              <span className="text-sm text-text-primary dark:text-dark-text block">{file.name}</span>
                              <span className="text-xs text-text-secondary dark:text-dark-text-secondary">
                                {new Date(file.createdAt).toLocaleDateString('zh-CN')}
                              </span>
                            </div>
                            {selectedFile === file.id && <Check className="w-4 h-4 text-primary" />}
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Export Content Selection */}
            <div className="bg-surface-card dark:bg-dark-card rounded-xl border border-border dark:border-dark-border p-5">
              <h2 className="text-base font-semibold text-text-primary dark:text-dark-text mb-0.5">{t('exportContent')}</h2>
              <p className="text-xs text-text-secondary dark:text-dark-text-secondary mb-3">{t('selectAnalysisResults')}</p>

              {/* Preset Buttons */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <button
                  onClick={() => handlePresetChange('full')}
                  className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${
                    exportPreset === 'full' ? 'border-primary bg-primary/5' : 'border-border dark:border-dark-border hover:border-primary/30'
                  }`}
                >
                  <FileText className={`w-6 h-6 mb-2 ${exportPreset === 'full' ? 'text-primary' : 'text-text-secondary dark:text-dark-text-secondary'}`} />
                  <span className="text-sm text-text-primary dark:text-dark-text font-medium">{t('fullTranscriptExport')}</span>
                  <span className="text-xs text-text-secondary dark:text-dark-text-secondary">{t('fullTranscriptExportDesc')}</span>
                </button>

                <button
                  onClick={() => handlePresetChange('summary')}
                  className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${
                    exportPreset === 'summary' ? 'border-primary bg-primary/5' : 'border-border dark:border-dark-border hover:border-primary/30'
                  }`}
                >
                  <FileCheck className={`w-6 h-6 mb-2 ${exportPreset === 'summary' ? 'text-primary' : 'text-text-secondary dark:text-dark-text-secondary'}`} />
                  <span className="text-sm text-text-primary dark:text-dark-text font-medium">{t('meetingSummaryExport')}</span>
                  <span className="text-xs text-text-secondary dark:text-dark-text-secondary">{t('meetingSummaryExportDesc')}</span>
                </button>

                <button
                  onClick={() => handlePresetChange('all')}
                  className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${
                    exportPreset === 'all' ? 'border-primary bg-primary/5' : 'border-border dark:border-dark-border hover:border-primary/30'
                  }`}
                >
                  <Network className={`w-6 h-6 mb-2 ${exportPreset === 'all' ? 'text-primary' : 'text-text-secondary dark:text-dark-text-secondary'}`} />
                  <span className="text-sm text-text-primary dark:text-dark-text font-medium">{t('globalExport')}</span>
                  <span className="text-xs text-text-secondary dark:text-dark-text-secondary">{t('globalExportDesc')}</span>
                </button>

                <button
                  onClick={() => handlePresetChange('custom')}
                  className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${
                    exportPreset === 'custom' ? 'border-primary bg-primary/5' : 'border-border dark:border-dark-border hover:border-primary/30'
                  }`}
                >
                  <Settings className={`w-6 h-6 mb-2 ${exportPreset === 'custom' ? 'text-primary' : 'text-text-secondary dark:text-dark-text-secondary'}`} />
                  <span className="text-sm text-text-primary dark:text-dark-text font-medium">{t('customExport')}</span>
                  <span className="text-xs text-text-secondary dark:text-dark-text-secondary">{t('customExportDesc')}</span>
                </button>
              </div>

              {/* Custom Content Options - only show when custom is selected */}
              {exportPreset === 'custom' && (
                <div className="border-t border-border dark:border-dark-border pt-4 mt-4">
                  <p className="text-xs text-text-secondary dark:text-dark-text-secondary mb-3">{t('selectExportItems')}</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { key: 'transcript', label: t('transcript'), icon: FileText },
                      { key: 'speakers', label: t('speakers'), icon: Mic },
                      { key: 'chapters', label: t('chapters'), icon: List },
                      { key: 'summary', label: t('summary'), icon: FileCheck },
                      { key: 'mindMap', label: t('mindMap'), icon: Network }
                    ].map(item => (
                      <button
                        key={item.key}
                        onClick={() => toggleCustomContent(item.key as keyof typeof customContents)}
                        className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                          customContents[item.key as keyof typeof customContents]
                            ? 'border-primary/50 bg-primary/5'
                            : 'border-border dark:border-dark-border hover:border-primary/30'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          customContents[item.key as keyof typeof customContents]
                            ? 'border-primary bg-primary'
                            : 'border-border dark:border-dark-border'
                        }`}>
                          {customContents[item.key as keyof typeof customContents] && (
                            <div className="w-2 h-2 rounded-full bg-white" />
                          )}
                        </div>
                        <item.icon className={`w-4 h-4 ${customContents[item.key as keyof typeof customContents] ? 'text-primary' : 'text-text-secondary dark:text-dark-text-secondary'}`} />
                        <span className="text-xs text-text-primary dark:text-dark-text">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Export Format Selection */}
            <div className="bg-surface-card dark:bg-dark-card rounded-xl border border-border dark:border-dark-border p-5">
              <h2 className="text-base font-semibold text-text-primary dark:text-dark-text mb-0.5">{t('exportFormat')}</h2>
              <p className="text-xs text-text-secondary dark:text-dark-text-secondary mb-3">{t('selectFileType')}</p>

              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleFormatChange('markdown')}
                  className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${
                    selectedFormat === 'markdown'
                      ? 'border-primary bg-primary/5'
                      : 'border-border dark:border-dark-border hover:border-primary/30 bg-surface-bg dark:bg-dark-bg'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                    selectedFormat === 'markdown' ? 'bg-primary/10' : 'bg-surface-sidebar dark:bg-dark-sidebar'
                  }`}>
                    <File className={`w-6 h-6 ${selectedFormat === 'markdown' ? 'text-primary' : 'text-text-secondary dark:text-dark-text-secondary'}`} />
                  </div>
                  <span className="font-medium text-text-primary dark:text-dark-text mb-1">Markdown</span>
                  <span className="text-xs text-text-secondary dark:text-dark-text-secondary text-center leading-tight">适合二次编辑和知识库整理</span>
                </button>

                <button
                  onClick={() => handleFormatChange('txt')}
                  className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${
                    selectedFormat === 'txt'
                      ? 'border-primary bg-primary/5'
                      : 'border-border dark:border-dark-border hover:border-primary/30 bg-surface-bg dark:bg-dark-bg'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                    selectedFormat === 'txt' ? 'bg-primary/10' : 'bg-surface-sidebar dark:bg-dark-sidebar'
                  }`}>
                    <File className={`w-6 h-6 ${selectedFormat === 'txt' ? 'text-primary' : 'text-text-secondary dark:text-dark-text-secondary'}`} />
                  </div>
                  <span className="font-medium text-text-primary dark:text-dark-text mb-1">纯文本</span>
                  <span className="text-xs text-text-secondary dark:text-dark-text-secondary text-center leading-tight">适合快速复制和轻量查看</span>
                </button>

                <button
                  onClick={() => handleFormatChange('pdf')}
                  className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${
                    selectedFormat === 'pdf'
                      ? 'border-primary bg-primary/5'
                      : 'border-border dark:border-dark-border hover:border-primary/30 bg-surface-bg dark:bg-dark-bg'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                    selectedFormat === 'pdf' ? 'bg-primary/10' : 'bg-surface-sidebar dark:bg-dark-sidebar'
                  }`}>
                    <File className={`w-6 h-6 ${selectedFormat === 'pdf' ? 'text-primary' : 'text-text-secondary dark:text-dark-text-secondary'}`} />
                  </div>
                  <span className="font-medium text-text-primary dark:text-dark-text mb-1">PDF</span>
                  <span className="text-xs text-text-secondary dark:text-dark-text-secondary text-center leading-tight">适合正式归档和分享</span>
                </button>
              </div>

              {/* Default Output Directory */}
              <div className="border-t border-border dark:border-dark-border pt-4 mt-4">
                <div className="flex items-center gap-3">
                  <FolderOpen className="w-5 h-5 text-text-secondary dark:text-dark-text-secondary" />
                  <span className="text-sm text-text-primary dark:text-dark-text font-medium flex-shrink-0">{t('savePath')}</span>
                  <div
                    onDoubleClick={handleDirectorySelect}
                    className="flex-1 px-3 py-2 bg-surface-bg dark:bg-dark-bg border border-border dark:border-dark-border rounded-lg text-text-secondary dark:text-dark-text-secondary text-sm cursor-pointer hover:bg-surface-sidebar dark:hover:bg-dark-sidebar transition-colors truncate"
                    title={t('doubleClickSelectDir')}
                  >
                    {outputDir}
                  </div>
                  <button
                    onClick={handleDirectorySelect}
                    className="px-4 py-2 bg-surface-sidebar dark:bg-dark-sidebar border border-border dark:border-dark-border text-text-primary dark:text-dark-text rounded-lg hover:bg-surface-card dark:hover:bg-dark-card transition-colors text-sm"
                  >
                    {t('browse')}
                  </button>
                </div>
              </div>
            </div>

            {/* Export Summary */}
            <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 dark:border-primary/30 rounded-xl p-4">
              <h3 className="text-sm font-medium text-text-primary dark:text-dark-text mb-2">{t('currentExportSummary')}</h3>
              <p className="text-xs text-text-secondary dark:text-dark-text-secondary leading-relaxed">{getExportSummary()}</p>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={onBack}
                className="px-6 py-2.5 bg-surface-card dark:bg-dark-card border border-border dark:border-dark-border text-text-primary dark:text-dark-text rounded-lg hover:bg-surface-sidebar dark:hover:bg-dark-sidebar transition-colors text-sm"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleExport}
                disabled={!selectedFile}
                className={`px-6 py-2.5 rounded-lg transition-colors text-sm flex items-center gap-2 ${
                  selectedFile
                    ? 'bg-primary text-white hover:bg-primary-dark'
                    : 'bg-surface-sidebar dark:bg-dark-sidebar text-text-secondary dark:text-dark-text-secondary cursor-not-allowed'
                }`}
              >
                <Download className="w-4 h-4" />
                {t('exportCurrentContent')}
              </button>
            </div>
          </div>
        )

      case 'storage':
        return (
          <div className="space-y-6">
            {/* Storage Method Selection */}
            <div className="bg-surface-card dark:bg-dark-card rounded-xl border border-border dark:border-dark-border p-5">
              <h3 className="text-base font-semibold text-text-primary dark:text-dark-text mb-4">{t('storageMethod')}</h3>
              <p className="text-xs text-text-secondary dark:text-dark-text-secondary mb-3">{t('selectStorageLocation')}</p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => updateSettings({ storageType: 'local' })}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    settings.storageType === 'local'
                      ? 'border-primary bg-primary/5'
                      : 'border-border dark:border-dark-border hover:border-primary/30'
                  }`}
                >
                  <HardDrive className={`w-6 h-6 mb-2 ${settings.storageType === 'local' ? 'text-primary' : 'text-text-secondary dark:text-dark-text-secondary'}`} />
                  <span className="text-sm font-medium text-text-primary dark:text-dark-text block">{t('localStorage')}</span>
                  <span className="text-xs text-text-secondary dark:text-dark-text-secondary">{t('localStorageDesc')}</span>
                </button>

                <button
                  onClick={() => updateSettings({ storageType: 'cloud' })}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    settings.storageType === 'cloud'
                      ? 'border-primary bg-primary/5'
                      : 'border-border dark:border-dark-border hover:border-primary/30'
                  }`}
                >
                  <Shield className={`w-6 h-6 mb-2 ${settings.storageType === 'cloud' ? 'text-primary' : 'text-text-secondary dark:text-dark-text-secondary'}`} />
                  <span className="text-sm font-medium text-text-primary dark:text-dark-text block">{t('cloudStorage')}</span>
                  <span className="text-xs text-text-secondary dark:text-dark-text-secondary">{t('cloudStorageDesc')}</span>
                </button>
              </div>
            </div>

            {/* Local Storage Path Selection */}
            {settings.storageType === 'local' && (
              <div className="bg-surface-card dark:bg-dark-card rounded-xl border border-border dark:border-dark-border p-5">
                <h3 className="text-base font-semibold text-text-primary dark:text-dark-text mb-4">{t('localStoragePath')}</h3>
                <p className="text-xs text-text-secondary dark:text-dark-text-secondary mb-3">{t('selectStoragePath')}</p>
                <div className="flex items-center gap-3">
                  <FolderOpen className="w-5 h-5 text-text-secondary dark:text-dark-text-secondary flex-shrink-0" />
                  <div
                    onDoubleClick={handleDirectorySelect}
                    className="flex-1 px-3 py-2.5 bg-surface-bg dark:bg-dark-bg border border-border dark:border-dark-border rounded-lg text-text-secondary dark:text-dark-text-secondary text-sm cursor-pointer hover:bg-surface-sidebar dark:hover:bg-dark-sidebar transition-colors truncate"
                    title={t('doubleClickSelectDir')}
                  >
                    {localStoragePath || t('defaultStoragePath')}
                  </div>
                  <button
                    onClick={handleDirectorySelect}
                    className="px-4 py-2.5 bg-surface-sidebar dark:bg-dark-sidebar border border-border dark:border-dark-border text-text-primary dark:text-dark-text rounded-lg hover:bg-surface-card dark:hover:bg-dark-card transition-colors text-sm flex items-center gap-2"
                  >
                    <FolderOpen className="w-4 h-4" />
                    {t('browse')}
                  </button>
                </div>
              </div>
            )}

            {/* Auto Cleanup Settings */}
            <div className="bg-surface-card dark:bg-dark-card rounded-xl border border-border dark:border-dark-border p-5">
              <h3 className="text-base font-semibold text-text-primary dark:text-dark-text mb-4">{t('autoCleanup')}</h3>
              <p className="text-xs text-text-secondary dark:text-dark-text-secondary mb-3">{t('selectCleanupInterval')}</p>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => {
                    updateSettings({ autoCleanDays: 7 })
                    saveCleanupSettings(true, 7)
                  }}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    settings.autoCleanDays === 7
                      ? 'border-primary bg-primary/5'
                      : 'border-border dark:border-dark-border hover:border-primary/30'
                  }`}
                >
                  <Trash2 className={`w-5 h-5 mx-auto mb-2 ${settings.autoCleanDays === 7 ? 'text-primary' : 'text-text-secondary dark:text-dark-text-secondary'}`} />
                  <span className="text-sm font-medium text-text-primary dark:text-dark-text block">7 {t('days')}</span>
                </button>

                <button
                  onClick={() => {
                    updateSettings({ autoCleanDays: 30 })
                    saveCleanupSettings(true, 30)
                  }}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    settings.autoCleanDays === 30
                      ? 'border-primary bg-primary/5'
                      : 'border-border dark:border-dark-border hover:border-primary/30'
                  }`}
                >
                  <Trash2 className={`w-5 h-5 mx-auto mb-2 ${settings.autoCleanDays === 30 ? 'text-primary' : 'text-text-secondary dark:text-dark-text-secondary'}`} />
                  <span className="text-sm font-medium text-text-primary dark:text-dark-text block">30 {t('days')}</span>
                </button>

                <button
                  onClick={() => {
                    updateSettings({ autoCleanDays: 'custom' })
                    setShowCustomDaysInput(true)
                    saveCleanupSettings(true, customCleanupDays)
                  }}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    settings.autoCleanDays === 'custom'
                      ? 'border-primary bg-primary/5'
                      : 'border-border dark:border-dark-border hover:border-primary/30'
                  }`}
                >
                  <Trash2 className={`w-5 h-5 mx-auto mb-2 ${settings.autoCleanDays === 'custom' ? 'text-primary' : 'text-text-secondary dark:text-dark-text-secondary'}`} />
                  <span className="text-sm font-medium text-text-primary dark:text-dark-text block">{t('custom')}</span>
                </button>
              </div>

              {/* Custom Days Input */}
              {showCustomDaysInput && (
                <div className="mt-4 flex items-center gap-3">
                  <span className="text-sm text-text-secondary dark:text-dark-text-secondary">{t('customDays')}</span>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={customCleanupDays}
                    onChange={(e) => {
                      const days = parseInt(e.target.value) || 30
                      setCustomCleanupDays(days)
                      if (settings.autoCleanDays === 'custom') {
                        saveCleanupSettings(true, days)
                      }
                    }}
                    onBlur={() => {
                      if (settings.autoCleanDays === 'custom') {
                        saveCleanupSettings(true, customCleanupDays)
                      }
                    }}
                    className="w-24 px-3 py-2 bg-surface-bg dark:bg-dark-bg border border-border dark:border-dark-border rounded-lg text-text-primary dark:text-dark-text text-sm focus:outline-none focus:border-primary"
                  />
                  <span className="text-sm text-text-secondary dark:text-dark-text-secondary">{t('days')}</span>
                </div>
              )}
            </div>
          </div>
        )
    }
  }

  return (
    <div className="flex-1 flex bg-surface-bg dark:bg-dark-bg overflow-hidden">
      {/* Hidden input for directory selection */}
      <input
        ref={directoryInputRef}
        type="file"
        webkitdirectory="webkitdirectory"
        onChange={handleDirectoryInputChange}
        className="hidden"
      />

      {/* Left Sidebar - Settings Navigation */}
      <div className="w-64 bg-surface-card dark:bg-dark-card border-r border-border dark:border-dark-border flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-border dark:border-dark-border">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-text-secondary dark:text-dark-text-secondary hover:text-text-primary dark:hover:text-dark-text transition-colors mb-3"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            <span className="text-sm">{t('back')}</span>
          </button>
          <h1 className="text-lg font-semibold text-text-primary dark:text-dark-text">{t('settings')}</h1>
          <p className="text-xs text-text-secondary dark:text-dark-text-secondary">{t('selectLanguage')}</p>
        </div>

        {/* Settings Tabs */}
        <div className="flex-1 p-3 space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === tab.id
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-surface-sidebar dark:hover:bg-dark-sidebar text-text-secondary dark:text-dark-text-secondary hover:text-text-primary dark:hover:text-dark-text'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Logout Button */}
        <div className="p-3 border-t border-border dark:border-dark-border">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 transition-colors text-text-secondary dark:text-dark-text-secondary hover:text-red-500">
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">{t('logout')}</span>
          </button>
        </div>
      </div>

      {/* Right Content Area */}
      <div ref={contentRef} className="flex-1 overflow-y-auto p-6 bg-surface-bg dark:bg-dark-bg">
        <div className="max-w-3xl mx-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}