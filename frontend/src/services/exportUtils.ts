/**
 * Export Utilities
 * Handles formatting and downloading of transcription and analysis results
 */

import { TranscriptionResult, AnalysisResult } from './api'

export interface ExportOptions {
  includeTranscript: boolean
  includeSpeakers: boolean
  includeChapters: boolean
  includeSummary: boolean
  includeMindMap: boolean
  format: 'markdown' | 'txt' | 'pdf'
}

// Format seconds to MM:SS or HH:MM:SS
function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// Generate Markdown export
function generateMarkdown(
  fileName: string,
  transcription: TranscriptionResult | null,
  analysis: AnalysisResult | null,
  options: ExportOptions
): string {
  const parts: string[] = []
  const date = new Date().toLocaleDateString('zh-CN')

  // Title
  parts.push(`# ${fileName}\n`)
  parts.push(`> 导出日期: ${date}\n`)

  // Full Transcript
  if (options.includeTranscript && transcription) {
    parts.push('---\n')
    parts.push('## 完整文稿\n')

    if (transcription.segments && transcription.segments.length > 0) {
      // Build speaker mapping from analysis speakers
      const analysisSpeakerNames: string[] = []
      if (analysis && analysis.speakers && analysis.speakers.length > 0) {
        analysis.speakers.forEach(speaker => {
          analysisSpeakerNames.push(speaker.name)
        })
      }

      // Output segments in chronological order (NOT grouped by speaker)
      transcription.segments.forEach((segment) => {
        const speakerName = segment.speaker && segment.speaker !== '未知说话人' && segment.speaker !== 'unknown'
          ? segment.speaker
          : (analysisSpeakerNames.length > 0 ? analysisSpeakerNames[0] : '未知说话人')
        const startTime = formatTime(segment.start)
        parts.push(`**[${startTime}]** ${speakerName}：${segment.text}\n`)
      })
    } else {
      parts.push(`${transcription.text}\n`)
    }
  }

  // Speakers
  if (options.includeSpeakers && analysis && analysis.speakers && analysis.speakers.length > 0) {
    parts.push('\n---\n')
    parts.push('## 说话人\n')
    analysis.speakers.forEach(speaker => {
      parts.push(`- **${speaker.name}** ${speaker.color ? `(标记颜色: ${speaker.color})` : ''}\n`)
    })
  }

  // Chapters
  if (options.includeChapters && analysis && analysis.chapters && analysis.chapters.length > 0) {
    parts.push('\n---\n')
    parts.push('## 章节\n')
    analysis.chapters.forEach((chapter, index) => {
      const startTime = formatTime(chapter.start_time)
      const endTime = formatTime(chapter.end_time)
      parts.push(`### ${index + 1}. ${chapter.title}\n`)
      parts.push(`> ${startTime} - ${endTime}\n`)
      parts.push(`${chapter.content}\n`)
    })
  }

  // Summary
  if (options.includeSummary && analysis && analysis.summary) {
    parts.push('\n---\n')
    parts.push('## 会议总结\n')
    parts.push(`${analysis.summary}\n`)
  }

  // Keywords
  if (analysis && analysis.keywords && analysis.keywords.length > 0) {
    parts.push('\n---\n')
    parts.push('## 关键词\n')
    parts.push(analysis.keywords.join('、') + '\n')
  }

  // Key Decisions
  if (analysis && analysis.key_decisions && analysis.key_decisions.length > 0) {
    parts.push('\n---\n')
    parts.push('## 关键决策\n')
    analysis.key_decisions.forEach(decision => {
      parts.push(`- ${decision}\n`)
    })
  }

  // Action Items
  if (analysis && analysis.action_items && analysis.action_items.length > 0) {
    parts.push('\n---\n')
    parts.push('## 行动项\n')
    analysis.action_items.forEach(item => {
      const person = item.person ? ` @${item.person}` : ''
      const deadline = item.deadline ? ` (截止: ${item.deadline})` : ''
      parts.push(`- [ ] ${item.task}${person}${deadline}\n`)
    })
  }

  // Mind Map (as text outline)
  if (options.includeMindMap && analysis && analysis.mind_map) {
    parts.push('\n---\n')
    parts.push('## 思维导图\n')
    parts.push('```\n')
    const renderMindMapNode = (node: any, level: number = 0) => {
      const indent = '  '.repeat(level)
      parts.push(`${indent}- ${node.text}\n`)
      if (node.children) {
        node.children.forEach((child: any) => renderMindMapNode(child, level + 1))
      }
    }
    renderMindMapNode(analysis.mind_map)
    parts.push('```\n')
  }

  parts.push('\n---\n')
  parts.push('*由 VoiceNote AI 生成*')

  return parts.join('\n')
}

// Generate plain text export
function generateTxt(
  fileName: string,
  transcription: TranscriptionResult | null,
  analysis: AnalysisResult | null,
  options: ExportOptions
): string {
  const parts: string[] = []
  const date = new Date().toLocaleDateString('zh-CN')

  // Title
  parts.push('='.repeat(50))
  parts.push(fileName)
  parts.push(`导出日期: ${date}`)
  parts.push('='.repeat(50))
  parts.push('')

  // Full Transcript
  if (options.includeTranscript && transcription) {
    parts.push('')
    parts.push('【完整文稿】')
    parts.push('-'.repeat(30))

    if (transcription.segments && transcription.segments.length > 0) {
      // Build speaker list from analysis speakers
      const analysisSpeakerNames: string[] = []
      if (analysis && analysis.speakers && analysis.speakers.length > 0) {
        analysis.speakers.forEach(speaker => {
          analysisSpeakerNames.push(speaker.name)
        })
      }

      // Output segments in chronological order (NOT grouped by speaker)
      transcription.segments.forEach((segment) => {
        const speakerName = segment.speaker && segment.speaker !== '未知说话人' && segment.speaker !== 'unknown'
          ? segment.speaker
          : (analysisSpeakerNames.length > 0 ? analysisSpeakerNames[0] : '未知说话人')
        const startTime = formatTime(segment.start)
        parts.push(`[${startTime}] ${speakerName}：${segment.text}`)
        parts.push('')
      })
    } else {
      parts.push(transcription.text)
    }
  }

  // Speakers
  if (options.includeSpeakers && analysis && analysis.speakers && analysis.speakers.length > 0) {
    parts.push('')
    parts.push('【说话人】')
    parts.push('-'.repeat(30))
    analysis.speakers.forEach(speaker => {
      parts.push(`- ${speaker.name}`)
    })
  }

  // Chapters
  if (options.includeChapters && analysis && analysis.chapters && analysis.chapters.length > 0) {
    parts.push('')
    parts.push('【章节】')
    parts.push('-'.repeat(30))
    analysis.chapters.forEach((chapter, index) => {
      const startTime = formatTime(chapter.start_time)
      const endTime = formatTime(chapter.end_time)
      parts.push(`${index + 1}. ${chapter.title} (${startTime} - ${endTime})`)
      parts.push(chapter.content)
      parts.push('')
    })
  }

  // Summary
  if (options.includeSummary && analysis && analysis.summary) {
    parts.push('')
    parts.push('【会议总结】')
    parts.push('-'.repeat(30))
    parts.push(analysis.summary)
  }

  // Keywords
  if (analysis && analysis.keywords && analysis.keywords.length > 0) {
    parts.push('')
    parts.push('【关键词】')
    parts.push('-'.repeat(30))
    parts.push(analysis.keywords.join('、'))
  }

  // Key Decisions
  if (analysis && analysis.key_decisions && analysis.key_decisions.length > 0) {
    parts.push('')
    parts.push('【关键决策】')
    parts.push('-'.repeat(30))
    analysis.key_decisions.forEach(decision => {
      parts.push(`- ${decision}`)
    })
  }

  // Action Items
  if (analysis && analysis.action_items && analysis.action_items.length > 0) {
    parts.push('')
    parts.push('【行动项】')
    parts.push('-'.repeat(30))
    analysis.action_items.forEach(item => {
      const person = item.person ? ` @${item.person}` : ''
      const deadline = item.deadline ? ` (截止: ${item.deadline})` : ''
      parts.push(`[ ] ${item.task}${person}${deadline}`)
    })
  }

  // Mind Map
  if (options.includeMindMap && analysis && analysis.mind_map) {
    parts.push('')
    parts.push('【思维导图】')
    parts.push('-'.repeat(30))
    const renderMindMapNode = (node: any, level: number = 0) => {
      const indent = '  '.repeat(level)
      parts.push(`${indent}- ${node.text}`)
      if (node.children) {
        node.children.forEach((child: any) => renderMindMapNode(child, level + 1))
      }
    }
    renderMindMapNode(analysis.mind_map)
  }

  parts.push('')
  parts.push('='.repeat(50))
  parts.push('由 VoiceNote AI 生成')

  return parts.join('\n')
}

// Generate PDF-ready HTML content
function generatePdfHtml(
  fileName: string,
  transcription: TranscriptionResult | null,
  analysis: AnalysisResult | null,
  options: ExportOptions
): string {
  const markdown = generateMarkdown(fileName, transcription, analysis, options)

  // Simple markdown to HTML conversion
  let html = markdown
    .replace(/^# (.*)$/gm, '<h1 style="color:#333;border-bottom:2px solid #ddd;padding-bottom:10px;">$1</h1>')
    .replace(/^## (.*)$/gm, '<h2 style="color:#555;margin-top:20px;">$1</h2>')
    .replace(/^### (.*)$/gm, '<h3 style="color:#666;">$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.*)$/gm, '<li style="margin:5px 0;">$1</li>')
    .replace(/\n/g, '<br/>')
    .replace(/^>(.*)$/gm, '<blockquote style="color:#666;font-style:italic;border-left:3px solid #ccc;padding-left:10px;margin:10px 0;">$1</blockquote>')
    .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #eee;margin:20px 0;"/>')
    .replace(/```([\s\S]*?)```/g, '<pre style="background:#f5f5f5;padding:10px;border-radius:5px;overflow-x:auto;"><code>$1</code></pre>')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${fileName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; color: #333; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
${html}
<p style="text-align:center;color:#999;font-size:12px;margin-top:40px;">由 VoiceNote AI 生成</p>
</body>
</html>
  `
}

// Main export function
export async function exportContent(
  fileName: string,
  transcription: TranscriptionResult | null,
  analysis: AnalysisResult | null,
  options: ExportOptions,
  fileHandle?: FileSystemFileHandle
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  let content: string
  let mimeType: string
  let extension: string

  switch (options.format) {
    case 'txt':
      content = generateTxt(fileName, transcription, analysis, options)
      mimeType = 'text/plain;charset=utf-8'
      extension = 'txt'
      break
    case 'pdf':
      // For PDF, we generate HTML and open print dialog for user to save as PDF
      content = generatePdfHtml(fileName, transcription, analysis, options)
      mimeType = 'text/html;charset=utf-8'
      extension = 'html'
      // Open print dialog for PDF save
      printContent(fileName, transcription, analysis, options)
      // Still download HTML as fallback
      break
    case 'markdown':
    default:
      content = generateMarkdown(fileName, transcription, analysis, options)
      mimeType = 'text/markdown;charset=utf-8'
      extension = 'md'
      break
  }

  // If we have a FileSystemFileHandle from the File System Access API, use it
  if (fileHandle) {
    try {
      const writable = await fileHandle.createWritable()
      await writable.write(content)
      await writable.close()
      console.log('[DEBUG] File saved to:', fileHandle.name)
      // Return success with the file path
      return { success: true, filePath: fileHandle.name }
    } catch (error) {
      console.error('[DEBUG] Failed to write to file handle, falling back to download:', error)
      // Fall through to download approach
    }
  }

  // Create blob and download (fallback or when no file handle available)
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)

  const downloadName = `${fileName.replace(/[^a-zA-Z0-9一-龥]/g, '_')}_${Date.now()}.${extension}`
  const link = document.createElement('a')
  link.href = url
  link.download = downloadName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)

  // Return success with suggested path for notification
  return { success: true, filePath: downloadName }
}

// Print PDF (opens print dialog)
export function printContent(
  fileName: string,
  transcription: TranscriptionResult | null,
  analysis: AnalysisResult | null,
  options: ExportOptions
): void {
  const html = generatePdfHtml(fileName, transcription, analysis, options)

  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.onload = () => {
      printWindow.print()
    }
  }
}