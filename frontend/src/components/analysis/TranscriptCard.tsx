import React from 'react'
import { FileText } from 'lucide-react'
import { Transcription } from '../../types'
import ExportButton from '../common/ExportButton'

interface TranscriptCardProps {
  transcription: Transcription | null
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export default function TranscriptCard({ transcription }: TranscriptCardProps) {
  // No transcription data
  if (!transcription) {
    return (
      <div className="bg-surface-card dark:bg-dark-card rounded-xl border border-border dark:border-dark-border overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border dark:border-dark-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-text-primary dark:text-dark-text">完整录音文字稿</h3>
          </div>
        </div>
        {/* Content - Empty State */}
        <div className="p-8 text-center text-text-secondary dark:text-dark-text-secondary">
          暂无文字稿数据
        </div>
      </div>
    )
  }

  // Format the text with timestamps for each segment
  const formatTranscriptWithTime = () => {
    if (!transcription.segments || transcription.segments.length === 0) {
      return transcription.text || "无文字内容"
    }

    // Group consecutive segments with same speaker
    const lines: string[] = []
    let currentSpeaker = ""
    let currentTextParts: string[] = []
    let currentStart = 0

    for (const segment of transcription.segments) {
      const speaker = segment.speaker || "未知"
      const text = segment.text

      if (speaker !== currentSpeaker) {
        // Save previous speaker's text
        if (currentTextParts.length > 0) {
          lines.push(`[${formatTime(currentStart)}] ${currentSpeaker}：${currentTextParts.join("")}`)
        }
        currentSpeaker = speaker
        currentTextParts = [text]
        currentStart = segment.start
      } else {
        // Continue with same speaker
        currentTextParts.push(text)
      }
    }

    // Don't forget the last speaker
    if (currentTextParts.length > 0) {
      lines.push(`[${formatTime(currentStart)}] ${currentSpeaker}：${currentTextParts.join("")}`)
    }

    return lines.join("\n")
  }

  const displayText = formatTranscriptWithTime()

  return (
    <div className="bg-surface-card dark:bg-dark-card rounded-xl border border-border dark:border-dark-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border dark:border-dark-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-text-primary dark:text-dark-text">完整录音文字稿</h3>
        </div>
        <ExportButton
          content={displayText}
          filename="transcript"
          className="mr-2"
        />
      </div>

      {/* Content */}
      <div className="p-4 max-h-96 overflow-y-auto">
        <pre className="text-sm text-text-primary dark:text-dark-text whitespace-pre-wrap font-sans leading-relaxed">
          {displayText}
        </pre>
      </div>
    </div>
  )
}
