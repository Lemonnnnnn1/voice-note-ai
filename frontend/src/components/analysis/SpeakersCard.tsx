import React from 'react'
import { Users } from 'lucide-react'
import { Analysis } from '../../types'
import ExportButton from '../common/ExportButton'

interface SpeakersCardProps {
  analysis: Analysis | null
}

// Mock data for demonstration
const mockSpeakers = [
  { id: '1', name: '张三', color: '#4F46E5' },
  { id: '2', name: '李四', color: '#10B981' },
  { id: '3', name: '王五', color: '#F59E0B' },
  { id: '4', name: '赵六', color: '#EF4444' }
]

export default function SpeakersCard({ analysis }: SpeakersCardProps) {
  const speakers = analysis?.speakers || mockSpeakers

  const content = speakers.map(s => `- ${s.name}`).join('\n')

  return (
    <div className="bg-surface-card dark:bg-dark-card rounded-xl border border-border dark:border-dark-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border dark:border-dark-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-text-primary dark:text-dark-text">人物名称</h3>
        </div>
        <ExportButton
          content={content}
          filename="speakers"
          className="mr-2"
        />
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex flex-wrap gap-3">
          {speakers.map(speaker => (
            <div
              key={speaker.id}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-white font-medium"
              style={{ backgroundColor: speaker.color }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: 'rgba(255,255,255,0.8)' }}
              />
              {speaker.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
