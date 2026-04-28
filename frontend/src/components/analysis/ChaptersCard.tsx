import React from 'react'
import { List, Clock } from 'lucide-react'
import { Analysis } from '../../types'
import ExportButton from '../common/ExportButton'

interface ChaptersCardProps {
  analysis: Analysis | null
}

// Mock data for demonstration
const mockChapters = [
  {
    id: '1',
    title: '开场介绍',
    startTime: 0,
    endTime: 150,
    content: '参会人员自我介绍，明确会议目标'
  },
  {
    id: '2',
    title: '产品规划讨论',
    startTime: 150,
    endTime: 900,
    content: '讨论用户调研结果、产品优先级和技术方案'
  },
  {
    id: '3',
    title: '行动计划制定',
    startTime: 900,
    endTime: 1200,
    content: '确定时间节点和负责人分工'
  }
]

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function ChaptersCard({ analysis }: ChaptersCardProps) {
  const chapters = analysis?.chapters || mockChapters

  const content = chapters.map(c =>
    `## ${c.title} (${formatTime(c.startTime)} - ${formatTime(c.endTime)})\n\n${c.content}`
  ).join('\n\n')

  return (
    <div className="bg-surface-card dark:bg-dark-card rounded-xl border border-border dark:border-dark-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border dark:border-dark-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <List className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-text-primary dark:text-dark-text">章节主题分析</h3>
        </div>
        <ExportButton
          content={content}
          filename="chapters"
          className="mr-2"
        />
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {chapters.map((chapter, index) => (
          <div key={chapter.id} className="flex gap-4">
            {/* Timeline indicator */}
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">{index + 1}</span>
              </div>
              {index < chapters.length - 1 && (
                <div className="w-0.5 flex-1 bg-border dark:bg-dark-border mt-2 min-h-[40px]" />
              )}
            </div>

            {/* Chapter content */}
            <div className="flex-1 pb-6">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-text-primary dark:text-dark-text">{chapter.title}</h4>
                <span className="flex items-center gap-1 text-xs text-text-secondary dark:text-dark-text-secondary">
                  <Clock className="w-3 h-3" />
                  {formatTime(chapter.startTime)} - {formatTime(chapter.endTime)}
                </span>
              </div>
              <p className="text-sm text-text-secondary dark:text-dark-text-secondary">{chapter.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
