import React, { useState, useRef, useEffect } from 'react'
import { Download, FileText, Mic, List, FileCheck, Network, ArrowLeft, FileAudio, FolderOpen, ChevronDown, Check, File, Settings, Loader2 } from 'lucide-react'
import { useI18n } from '../../context/I18nContext'
import { getUserFiles, getFileTranscription, getFileAnalysis, UserFile } from '../../services/api'
import { exportContent } from '../../services/exportUtils'

type ExportPreset = 'full' | 'summary' | 'all' | 'custom'

export default function ExportSettingsPage({ onBack }: { onBack: () => void }) {
  const { t } = useI18n()
  const directoryInputRef = useRef<HTMLInputElement>(null)

  const [files, setFiles] = useState<UserFile[]>([])
  const [selectedFile, setSelectedFile] = useState<string>('')
  const [showFileDropdown, setShowFileDropdown] = useState(false)
  const [outputDir, setOutputDir] = useState('C:\\Users\\lenovo\\Documents\\VoiceNote AI')
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null)
  const [exportPreset, setExportPreset] = useState<ExportPreset | null>(null)
  const [customContents, setCustomContents] = useState({
    transcript: false,
    speakers: false,
    chapters: false,
    summary: false,
    mindMap: false
  })
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null)
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Fetch files on mount
  useEffect(() => {
    const fetchFiles = async () => {
      setIsLoadingFiles(true)
      try {
        const userFiles = await getUserFiles()
        console.log('[DEBUG] getUserFiles returned:', userFiles.length, 'files')
        console.log('[DEBUG] Full userFiles:', JSON.stringify(userFiles, null, 2))
        // Filter to only files that have analysis
        const analyzedFiles = userFiles.filter(f => f.has_analysis)
        console.log('[DEBUG] analyzedFiles:', analyzedFiles.length, 'files')
        setFiles(analyzedFiles)
      } catch (error) {
        console.error('Failed to fetch files:', error)
      } finally {
        setIsLoadingFiles(false)
      }
    }
    fetchFiles()
  }, [])

  const selectedFileObj = files.find(f => f.id === selectedFile)

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
    // 'custom' 模式下不改变 customContents，保持当前选择状态
  }

  const handleFormatChange = (format: string) => {
    setSelectedFormat(format)
  }

  const handleExport = async () => {
    if (!selectedFileObj || !selectedFormat) return

    setIsExporting(true)
    try {
      // Fetch transcription and analysis data
      const [transcription, analysis] = await Promise.all([
        selectedFileObj.has_transcription ? getFileTranscription(selectedFileObj.id) : null,
        selectedFileObj.has_analysis ? getFileAnalysis(selectedFileObj.id) : null
      ])

      // Build export options based on preset
      const options = {
        includeTranscript: exportPreset === 'full' || exportPreset === 'all' || (exportPreset === 'custom' && customContents.transcript),
        includeSpeakers: exportPreset === 'full' || exportPreset === 'all' || (exportPreset === 'custom' && customContents.speakers),
        includeChapters: exportPreset === 'full' || exportPreset === 'all' || (exportPreset === 'custom' && customContents.chapters),
        includeSummary: exportPreset === 'summary' || exportPreset === 'all' || (exportPreset === 'custom' && customContents.summary),
        includeMindMap: exportPreset === 'all' || (exportPreset === 'custom' && customContents.mindMap),
        format: selectedFormat as 'markdown' | 'txt' | 'pdf'
      }

      const result = await exportContent(selectedFileObj.name, transcription, analysis, options, fileHandle || undefined)

      if (result.success) {
        // Show success message
        const savedFileName = result.filePath || selectedFileObj.name
        alert('导出成功！\n\n文件名：' + savedFileName + '\n\n请到您选择保存的位置查看文件。')
      } else {
        alert(t('exportFailed') || '导出失败，请重试')
      }
    } catch (error) {
      console.error('Export failed:', error)
      alert(t('exportFailed') || '导出失败，请重试')
    } finally {
      setIsExporting(false)
    }
  }

  const handleDirectorySelect = async () => {
    console.log('[DEBUG] handleDirectorySelect called')

    // Use showSaveFilePicker - this opens a "Save As" dialog where user can choose location AND filename
    if ('showSaveFilePicker' in window) {
      try {
        // Determine file extension based on selected format
        const formatExt = selectedFormat === 'txt' ? '.txt' : selectedFormat === 'pdf' ? '.pdf' : '.md'
        const defaultName = `VoiceNote_Export_${Date.now()}${formatExt}`

        // @ts-ignore
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: defaultName,
          types: [
            {
              description: 'All Files',
              accept: {}
            }
          ]
        })
        console.log('[DEBUG] Save location selected:', fileHandle.name)
        setFileHandle(fileHandle)
        setOutputDir(fileHandle.name)
      } catch (err: any) {
        console.log('[DEBUG] showSaveFilePicker error:', err?.name)
        if (err?.name !== 'AbortError') {
          // Fallback to file input
          directoryInputRef.current?.click()
        }
      }
    } else {
      // Fallback to hidden input
      directoryInputRef.current?.click()
    }
  }

  const handleDirectoryInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const file = files[0]
      const path = file.webkitRelativePath.split('/')[0]
      setOutputDir(path)
    }
  }

  // Generate export content summary
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

  return (
    <div className="flex-1 bg-surface-bg dark:bg-dark-bg overflow-y-auto">
      {/* Hidden input for directory selection */}
      <input
        ref={directoryInputRef}
        type="file"
        webkitdirectory="webkitdirectory"
        onChange={handleDirectoryInputChange}
        className="hidden"
      />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface-bg/95 dark:bg-dark-bg/95 backdrop-blur-sm border-b border-border dark:border-dark-border px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-surface-sidebar dark:hover:bg-dark-sidebar rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-text-secondary dark:text-dark-text-secondary" />
          </button>
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Download className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-text-primary dark:text-dark-text">{t('exportSettingsTitle')}</h1>
            <p className="text-xs text-text-secondary dark:text-dark-text-secondary">{t('exportSettingsDesc')}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
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
                      {new Date(selectedFileObj.created_at).toLocaleDateString()}
                      {selectedFileObj.duration && ` · ${Math.floor(selectedFileObj.duration / 60)}:${String(Math.floor(selectedFileObj.duration % 60)).padStart(2, '0')}`}
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
                  {isLoadingFiles ? (
                    <div className="p-4 text-center text-sm text-text-secondary dark:text-dark-text-secondary flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t('loading') || '加载中...'}
                    </div>
                  ) : files.length === 0 ? (
                    <div className="p-4 text-center text-sm text-text-secondary dark:text-dark-text-secondary">
                      {t('noFilesAvailable')}
                    </div>
                  ) : (
                    files.map(file => (
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
                            {new Date(file.created_at).toLocaleDateString('zh-CN')}
                            {file.duration && ` · ${Math.floor(file.duration / 60)}:${String(Math.floor(file.duration % 60)).padStart(2, '0')}`}
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
            disabled={!selectedFile || !selectedFormat || isExporting}
            className={`px-6 py-2.5 rounded-lg transition-colors text-sm flex items-center gap-2 ${
              selectedFile && selectedFormat && !isExporting
                ? 'bg-primary text-white hover:bg-primary-dark'
                : 'bg-surface-sidebar dark:bg-dark-sidebar text-text-secondary dark:text-dark-text-secondary cursor-not-allowed'
            }`}
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('exporting') || '导出中...'}
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                {t('exportCurrentContent')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}