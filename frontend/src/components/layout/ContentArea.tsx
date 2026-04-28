import React, { useState, useEffect } from 'react'
import { FileAudio, Clock, Calendar, FileText, Users, List, FileCheck, Network, Lightbulb, ChevronRight, Loader2 } from 'lucide-react'
import { AudioFile } from '../../types'
import { useI18n } from '../../context/I18nContext'
import { useAnalysis } from '../../context/AnalysisContext'
import { useProject } from '../../context/ProjectContext'
import TranscriptCard from '../analysis/TranscriptCard'
import SpeakersCard from '../analysis/SpeakersCard'
import ChaptersCard from '../analysis/ChaptersCard'
import SummaryCard from '../analysis/SummaryCard'
import MindMapCard from '../analysis/MindMapCard'

interface ContentAreaProps {
  file: AudioFile | null
}

type AnalysisTab = 'transcript' | 'speakers' | 'chapters' | 'summary' | 'mindmap' | 'insights'

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const tabConfig = [
  { id: 'transcript' as const, label: 'transcript', icon: FileText },
  { id: 'speakers' as const, label: 'speakers', icon: Users },
  { id: 'chapters' as const, label: 'chapters', icon: List },
  { id: 'summary' as const, label: 'summary', icon: FileCheck },
  { id: 'mindmap' as const, label: 'mindMap', icon: Network },
  { id: 'insights' as const, label: 'insights', icon: Lightbulb },
]

export default function ContentArea({ file }: ContentAreaProps) {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<AnalysisTab>('transcript')
  const { isProcessing, progress, processingStep } = useAnalysis()
  const { loadFileContent } = useProject()
  const [isLoadingContent, setIsLoadingContent] = useState(false)

  // Load file content when file changes
  useEffect(() => {
    if (!file) return

    // Check if content is already loaded
    if (file.transcription && file.analysis) {
      console.log('[DEBUG] ContentArea - file has content already')
      return
    }

    console.log('[DEBUG] ContentArea - file selected but no content, loading:', file.id)
    setIsLoadingContent(true)
    loadFileContent(file.id).finally(() => {
      setIsLoadingContent(false)
    })
  }, [file?.id, file?.transcription, file?.analysis, loadFileContent])

  // Show loading state when content is being loaded
  if (file && isLoadingContent) {
    return (
      <div className="flex-1 bg-surface-bg dark:bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text mb-2">加载内容...</h3>
          <p className="text-sm text-text-secondary dark:text-dark-text-secondary">正在从数据库读取转写和分析结果</p>
        </div>
      </div>
    )
  }

  // Show processing state when file exists but is being analyzed
  if (file && isProcessing) {
    return (
      <div className="flex-1 bg-surface-bg dark:bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text mb-2">正在分析...</h3>
          <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-4">{processingStep || '处理中...'}</p>
          <div className="w-48 h-2 bg-surface-card dark:bg-dark-card rounded-full mx-auto overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-2">{progress}%</p>
        </div>
      </div>
    )
  }

  if (!file) {
    return (
      <div className="flex-1 bg-surface-bg dark:bg-dark-bg flex items-center justify-center">
        <p className="text-text-secondary dark:text-dark-text-secondary">{t('noData')}</p>
      </div>
    )
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'transcript':
        return <TranscriptCard transcription={file.transcription} />
      case 'speakers':
        return <SpeakersCard analysis={file.analysis} />
      case 'chapters':
        return <ChaptersCard analysis={file.analysis} />
      case 'summary':
        return <SummaryCard analysis={file.analysis} />
      case 'mindmap':
        return <MindMapCard analysis={file.analysis} />
      case 'insights':
        const insights = file?.analysis
        return (
          <div className="bg-surface-card dark:bg-dark-card rounded-xl border border-border dark:border-dark-border overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-border dark:border-dark-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-text-primary dark:text-dark-text">深度洞察</h3>
              </div>
            </div>

            {/* Content */}
            <div className="p-5 space-y-5">
              {/* 关键词 */}
              <div>
                <h4 className="text-sm font-medium text-text-primary dark:text-dark-text mb-2">关键词</h4>
                <div className="flex flex-wrap gap-2">
                  {(insights?.keywords || []).length > 0 ? (
                    insights.keywords.map((keyword, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-primary/10 text-primary text-xs rounded-full"
                      >
                        {keyword}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-text-secondary dark:text-dark-text-secondary">暂无关键词</span>
                  )}
                </div>
              </div>

              {/* 情感分析 */}
              <div>
                <h4 className="text-sm font-medium text-text-primary dark:text-dark-text mb-2">情感分析</h4>
                {insights?.sentiment ? (
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                    {insights.sentiment}
                  </span>
                ) : (
                  <span className="text-sm text-text-secondary dark:text-dark-text-secondary">暂无情感分析</span>
                )}
              </div>

              {/* 关键决策 */}
              <div>
                <h4 className="text-sm font-medium text-text-primary dark:text-dark-text mb-2">关键决策</h4>
                {(insights?.keyDecisions || []).length > 0 ? (
                  <ul className="space-y-2">
                    {insights.keyDecisions.map((decision, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-text-secondary dark:text-dark-text-secondary">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                        {decision}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-sm text-text-secondary dark:text-dark-text-secondary">暂无关键决策</span>
                )}
              </div>

              {/* 行动项 */}
              <div>
                <h4 className="text-sm font-medium text-text-primary dark:text-dark-text mb-2">行动项</h4>
                {(insights?.actionItems || []).length > 0 ? (
                  <div className="space-y-2">
                    {insights.actionItems.map((item, index) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b border-border dark:border-dark-border last:border-b-0">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-primary/10 rounded flex items-center justify-center">
                            <span className="text-xs font-medium text-primary">{index + 1}</span>
                          </div>
                          <span className="text-sm text-text-primary dark:text-dark-text">{item.task}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-text-secondary dark:text-dark-text-secondary">
                          {item.person && <span>{item.person}</span>}
                          {item.deadline && <span>{item.deadline}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-text-secondary dark:text-dark-text-secondary">暂无行动项</span>
                )}
              </div>

              {/* 风险点 */}
              <div>
                <h4 className="text-sm font-medium text-text-primary dark:text-dark-text mb-2">风险点</h4>
                {(insights?.riskPoints || []).length > 0 ? (
                  <ul className="space-y-2">
                    {insights.riskPoints.map((risk, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-text-secondary dark:text-dark-text-secondary">
                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1.5 flex-shrink-0" />
                        {risk}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-sm text-text-secondary dark:text-dark-text-secondary">暂无风险点</span>
                )}
              </div>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="flex-1 flex bg-surface-bg dark:bg-dark-bg overflow-hidden">
      {/* Left Sidebar - Tab Navigation */}
      <div className="w-56 bg-surface-card dark:bg-dark-card border-r border-border dark:border-dark-border flex flex-col">
        {/* File Info */}
        <div className="p-4 border-b border-border dark:border-dark-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <FileAudio className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-text-primary dark:text-dark-text truncate">{file.name}</h2>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-text-secondary dark:text-dark-text-secondary">
                {file.duration && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDuration(file.duration)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-text-secondary dark:text-dark-text-secondary">
            <Calendar className="w-3 h-3" />
            {formatDate(file.createdAt)}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex-1 p-3 space-y-1 overflow-y-auto">
          {tabConfig.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-surface-sidebar dark:hover:bg-dark-sidebar text-text-secondary dark:text-dark-text-secondary hover:text-text-primary dark:hover:text-dark-text'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-sm font-medium flex-1 text-left">{t(tab.label as any)}</span>
              {activeTab === tab.id && (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Right Content Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-surface-bg dark:bg-dark-bg">
        {renderContent()}
      </div>
    </div>
  )
}