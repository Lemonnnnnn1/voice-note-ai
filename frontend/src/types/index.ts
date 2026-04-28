// 项目和文件类型
export interface Project {
  id: string
  name: string
  createdAt: string
  parentId: string | null  // null means top-level project
  files: AudioFile[]
}

export interface AudioFile {
  id: string
  name: string
  type: 'recording' | 'uploaded'
  parentId: string | null  // which project this file belongs to
  duration?: number
  createdAt: string
  transcription?: Transcription
  analysis?: Analysis
}

export interface Transcription {
  id: string
  text: string
  segments: TranscriptionSegment[]
  language: string
}

export interface TranscriptionSegment {
  start: number
  end: number
  text: string
  speaker?: string
}

export interface Analysis {
  speakers: Speaker[]
  chapters: Chapter[]
  summary: string
  mindMap: MindMapNode
  keywords?: string[]
  sentiment?: string
  keyDecisions?: string[]
  actionItems?: Array<{ task: string; person?: string; deadline?: string }>
  riskPoints?: string[]
}

export interface Speaker {
  id: string
  name: string
  color: string
}

export interface Chapter {
  id: string
  title: string
  startTime: number
  endTime: number
  content: string
}

export interface MindMapNode {
  id: string
  text: string
  children?: MindMapNode[]
}

// 设置类型
export interface Settings {
  aiModel: 'faster-whisper'
  exportFormat: 'markdown' | 'pdf' | 'json' | 'txt' | null
  language: 'auto' | 'zh' | 'en' | null
  theme: 'light' | 'dark' | null
  speakerRecognition: boolean
  autoSummary: boolean
  storageType: 'local' | 'cloud' | null
  autoCleanDays: 7 | 30 | 'custom' | null
  customCleanDays?: number
}

// API 响应类型
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
}
