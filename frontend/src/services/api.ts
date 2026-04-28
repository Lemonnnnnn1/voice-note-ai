/**
 * VoiceNote AI - API Service
 * Handles all communication with the backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Token storage
const TOKEN_KEY = 'voicenote_token'
const USER_KEY = 'voicenote_user'

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function removeStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export function getStoredUser(): { user_id: string; email: string; project_id?: string } | null {
  const userStr = localStorage.getItem(USER_KEY)
  if (userStr) {
    try {
      return JSON.parse(userStr)
    } catch {
      return null
    }
  }
  return null
}

export function setStoredUser(user: { user_id: string; email: string; project_id?: string }): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function removeStoredUser(): void {
  localStorage.removeItem(USER_KEY)
}

// Types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
}

export interface Speaker {
  id: string
  name: string
  color: string
}

export interface TranscriptionResult {
  id: string
  text: string
  language: string
  segments: Array<{
    start: number
    end: number
    text: string
    speaker: string | null
  }>
  duration?: number
  speakers: Speaker[]
}

export interface AnalysisResult {
  speakers: Array<{ id: string; name: string; color: string }>
  chapters: Array<{
    id: string
    title: string
    start_time: number
    end_time: number
    content: string
  }>
  summary: string
  mind_map: {
    id: string
    text: string
    children?: Array<{ id: string; text: string; children?: any[] }>
  }
  keywords: string[]
  sentiment: string
  key_decisions: string[]
  action_items: Array<{ task: string; person?: string; deadline?: string }>
  risk_points: string[]
}

export interface ModelInfo {
  id: string
  name: string
  description: string
  type: 'local' | 'cloud'
}

export interface ModelStatus {
  available: boolean
  message: string
}

// Helper function for API calls
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(error.detail || `HTTP ${response.status}`)
  }

  return response.json()
}

// Health check
export async function healthCheck(): Promise<{ status: string }> {
  return apiCall('/api/health')
}

// Models API
export async function getAvailableModels(): Promise<{
  transcription: ModelInfo[]
  analysis: ModelInfo[]
}> {
  const response = await apiCall<ApiResponse<any>>('/api/models')
  return response.data!
}

export async function getModelsStatus(): Promise<Record<string, ModelStatus>> {
  const response = await apiCall<ApiResponse<Record<string, ModelStatus>>>('/api/models/status')
  return response.data!
}

// Transcription API
export interface TranscribeResponse {
  file_id: string
  status: 'processing' | 'completed' | 'error' | 'not_found'
  message?: string
}

export async function startTranscription(
  file: File,
  model: 'faster-whisper' = 'faster-whisper',
  enableSpeakerRecognition: boolean = false,
  autoAnalyze: boolean = false
): Promise<TranscribeResponse> {
  const token = getStoredToken()
  const formData = new FormData()
  formData.append('file', file)
  formData.append('model', model)
  formData.append('enable_speaker_recognition', String(enableSpeakerRecognition))
  formData.append('auto_analyze', String(autoAnalyze))

  const headers: HeadersInit = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}/api/transcribe`, {
    method: 'POST',
    body: formData,
    headers,
  })

  const result = await response.json()

  if (!response.ok || !result.success) {
    throw new Error(result.error?.detail || result.detail || `HTTP ${response.status}`)
  }

  return result.data
}

export async function getTranscriptionStatus(
  fileId: string
): Promise<TranscribeResponse & { result?: TranscriptionResult }> {
  const response = await fetch(`${API_BASE_URL}/api/transcribe/${fileId}/status`)
  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.detail || `HTTP ${response.status}`)
  }

  return result
}

export async function getTranscriptionResult(
  fileId: string
): Promise<TranscriptionResult> {
  const response = await apiCall<ApiResponse<TranscriptionResult>>(`/api/transcribe/${fileId}/result`)
  if (!response.success || !response.data) {
    throw new Error('Failed to get transcription result')
  }
  return response.data
}

// Analysis API
export interface AnalyzeResponse {
  file_id: string
  status: 'processing' | 'completed' | 'error' | 'not_found'
  message?: string
}

export async function startAnalysis(
  fileId: string
): Promise<AnalyzeResponse> {
  const token = getStoredToken()
  const formData = new FormData()
  formData.append('file_id', fileId)

  const headers: HeadersInit = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}/api/analyze`, {
    method: 'POST',
    body: formData,
    headers,
  })

  const result = await response.json()

  if (!response.ok || !result.success) {
    throw new Error(result.error?.detail || result.detail || `HTTP ${response.status}`)
  }

  return result.data
}

export async function getAnalysisStatus(
  fileId: string
): Promise<AnalyzeResponse & { result?: AnalysisResult }> {
  const response = await fetch(`${API_BASE_URL}/api/analyze/${fileId}/status`)
  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.detail || `HTTP ${response.status}`)
  }

  return result
}

export async function getAnalysisResult(
  fileId: string
): Promise<AnalysisResult> {
  const response = await apiCall<ApiResponse<AnalysisResult>>(`/api/analyze/${fileId}/result`)
  if (!response.success || !response.data) {
    throw new Error('Failed to get analysis result')
  }
  return response.data
}

// Full pipeline: transcribe -> analyze
export interface ProcessingProgress {
  stage: 'transcribing' | 'analyzing' | 'completed' | 'error'
  progress: number
  message: string
}

export async function processAudioFile(
  file: File | Blob,
  model: 'faster-whisper' = 'faster-whisper',
  enableSpeakerRecognition: boolean = false,
  autoAnalyze: boolean = false,
  onProgress?: (progress: ProcessingProgress) => void
): Promise<{ transcription: TranscriptionResult; analysis: AnalysisResult }> {
  // Step 1: Start transcription
  onProgress?.({
    stage: 'transcribing',
    progress: 10,
    message: '正在上传音频文件...'
  })

  const transcribeResponse = await startTranscription(file, model, enableSpeakerRecognition, autoAnalyze)

  if (transcribeResponse.status === 'error') {
    throw new Error(transcribeResponse.message || 'Transcription failed')
  }

  // Step 2: Poll for transcription completion
  onProgress?.({
    stage: 'transcribing',
    progress: 30,
    message: '正在转写音频...'
  })

  let transcriptionResult: TranscriptionResult | null = null
  const maxAttempts = 300 // 5 minutes timeout for medium model
  let attempts = 0

  while (attempts < maxAttempts) {
    const status = await getTranscriptionStatus(transcribeResponse.file_id)

    if (status.status === 'error') {
      throw new Error(status.message || 'Transcription failed')
    }

    if (status.status === 'completed' && status.result) {
      transcriptionResult = status.result
      break
    }

    // Wait 1 second before next poll
    await new Promise(resolve => setTimeout(resolve, 1000))
    attempts++

    // Update progress
    const progress = 30 + Math.min(40, attempts * 0.5)
    onProgress?.({
      stage: 'transcribing',
      progress,
      message: '正在转写音频...'
    })
  }

  if (!transcriptionResult) {
    throw new Error('Transcription timeout')
  }

  onProgress?.({
    stage: 'transcribing',
    progress: 70,
    message: '转写完成，正在分析...'
  })

  // Step 3: Start analysis
  const analyzeResponse = await startAnalysis(transcribeResponse.file_id)

  if (analyzeResponse.status === 'error') {
    throw new Error(analyzeResponse.message || 'Analysis failed')
  }

  // Step 4: Poll for analysis completion
  onProgress?.({
    stage: 'analyzing',
    progress: 80,
    message: '正在生成分析结果...'
  })

  let analysisResult: AnalysisResult | null = null
  attempts = 0

  while (attempts < maxAttempts) {
    const status = await getAnalysisStatus(transcribeResponse.file_id)

    if (status.status === 'error') {
      throw new Error(status.message || 'Analysis failed')
    }

    if (status.status === 'completed' && status.result) {
      analysisResult = status.result
      break
    }

    // Wait 1 second before next poll
    await new Promise(resolve => setTimeout(resolve, 1000))
    attempts++

    // Update progress
    const progress = 80 + Math.min(20, attempts * 0.3)
    onProgress?.({
      stage: 'analyzing',
      progress,
      message: '正在生成分析结果...'
    })
  }

  if (!analysisResult) {
    throw new Error('Analysis timeout')
  }

  // Re-fetch transcription result after analysis completes to get updated speakers
  // (analysis updates transcription with AI-detected speakers)
  onProgress?.({
    stage: 'analyzing',
    progress: 95,
    message: '正在更新转写结果...'
  })

  try {
    const updatedTranscription = await getTranscriptionResult(transcribeResponse.file_id)
    if (updatedTranscription && updatedTranscription.speakers && updatedTranscription.speakers.length > 0) {
      console.log('[DEBUG] Re-fetched transcription with speakers:', updatedTranscription.speakers)
      transcriptionResult = updatedTranscription
    } else if (analysisResult.speakers && analysisResult.speakers.length > 0) {
      // Fallback: use analysis speakers if transcription still has no speakers
      console.log('[DEBUG] Using analysis speakers for transcription fallback')
      transcriptionResult.speakers = analysisResult.speakers
    }
  } catch (e) {
    console.warn('[DEBUG] Failed to re-fetch transcription, using original:', e)
  }

  onProgress?.({
    stage: 'completed',
    progress: 100,
    message: '处理完成！'
  })

  return {
    transcription: transcriptionResult,
    analysis: analysisResult
  }
}

// Auth API
export interface AuthUser {
  user_id: string
  email: string
  username?: string
  project_id?: string
}

export async function register(email: string, password: string): Promise<AuthUser> {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  const result = await response.json()

  if (!response.ok || !result.success) {
    throw new Error(result.error?.message || 'Registration failed')
  }

  // Store token and user
  setStoredToken(result.data.token)
  setStoredUser({
    user_id: result.data.user_id,
    email: result.data.email,
    project_id: result.data.project_id
  })

  return result.data
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  const result = await response.json()

  if (!response.ok || !result.success) {
    throw new Error(result.error?.message || 'Login failed')
  }

  // Store token and user
  setStoredToken(result.data.token)
  setStoredUser({
    user_id: result.data.user_id,
    email: result.data.email,
    project_id: result.data.project_id
  })

  return result.data
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = getStoredToken()
  if (!token) return null

  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  const result = await response.json()

  if (!response.ok || !result.success) {
    return null
  }

  return result.data
}

export function logout(): void {
  removeStoredToken()
  removeStoredUser()
}

// Usage Stats API
export interface UsageStats {
  total_duration: number
  files_analyzed: number
  languages_used: string[]
  storage_used: number
}

export interface UsageTrendItem {
  date: string
  duration: number
  files_count: number
}

export async function getUsageStats(): Promise<UsageStats> {
  const token = getStoredToken()
  if (!token) throw new Error('Not authenticated')

  const response = await fetch(`${API_BASE_URL}/api/users/stats`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  const result = await response.json()

  if (!response.ok || !result.success) {
    throw new Error(result.error?.message || 'Failed to get usage stats')
  }

  return result.data
}

export async function getUsageTrend(days: number = 7): Promise<UsageTrendItem[]> {
  const token = getStoredToken()
  if (!token) throw new Error('Not authenticated')

  const response = await fetch(`${API_BASE_URL}/api/users/usage-trend?days=${days}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  const result = await response.json()

  if (!response.ok || !result.success) {
    throw new Error(result.error?.message || 'Failed to get usage trend')
  }

  return result.data
}

export async function updateProfile(data: {
  username?: string
  phone?: string
  current_password?: string
  new_password?: string
}): Promise<{ message: string; password_changed?: boolean }> {
  const token = getStoredToken()
  if (!token) throw new Error('Not authenticated')

  const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })

  const result = await response.json()

  if (!response.ok || !result.success) {
    throw new Error(result.error?.message || 'Failed to update profile')
  }

  return result.data
}

// Files API
export interface UserFile {
  id: string
  name: string
  type: string
  duration?: number
  language?: string
  created_at: string
  project_id?: string
  has_transcription: boolean
  has_analysis: boolean
}

export async function getUserFiles(): Promise<UserFile[]> {
  const token = getStoredToken()
  console.log('[DEBUG] getUserFiles - token exists:', !!token, token ? 'yes' : 'no')
  if (!token) return []

  const response = await fetch(`${API_BASE_URL}/api/files`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })
  console.log('[DEBUG] getUserFiles - response status:', response.status)

  const result = await response.json()
  console.log('[DEBUG] getUserFiles - result:', JSON.stringify(result))

  if (!response.ok || !result.success) {
    return []
  }

  return result.data.files || []
}

export async function getFileTranscription(fileId: string): Promise<TranscriptionResult> {
  const token = getStoredToken()
  if (!token) throw new Error('Not authenticated')

  const response = await fetch(`${API_BASE_URL}/api/files/${fileId}/transcription`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  const result = await response.json()

  if (!response.ok || !result.success) {
    throw new Error(result.error?.message || 'Failed to get transcription')
  }

  return result.data
}

export async function getFileAnalysis(fileId: string): Promise<AnalysisResult> {
  const token = getStoredToken()
  if (!token) throw new Error('Not authenticated')

  const response = await fetch(`${API_BASE_URL}/api/files/${fileId}/analysis`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  const result = await response.json()

  if (!response.ok || !result.success) {
    throw new Error(result.error?.message || 'Failed to get analysis')
  }

  return result.data
}

export async function deleteUserFile(fileId: string): Promise<void> {
  const token = getStoredToken()
  if (!token) throw new Error('Not authenticated')

  const response = await fetch(`${API_BASE_URL}/api/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  const result = await response.json()

  if (!response.ok || !result.success) {
    throw new Error(result.error?.message || 'Failed to delete file')
  }
}

export async function renameUserFile(fileId: string, newName: string): Promise<void> {
  const token = getStoredToken()
  if (!token) throw new Error('Not authenticated')

  const response = await fetch(`${API_BASE_URL}/api/files/${fileId}?name=${encodeURIComponent(newName)}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  const result = await response.json()

  if (!response.ok || !result.success) {
    throw new Error(result.error?.message || 'Failed to rename file')
  }
}
