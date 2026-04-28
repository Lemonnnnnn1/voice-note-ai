import React, { useRef, useState, useEffect } from 'react'
import MainLayout from './components/layout/MainLayout'
import { ProjectProvider, useProject } from './context/ProjectContext'
import { SettingsProvider, useSettings } from './context/SettingsContext'
import { AnalysisProvider, useAnalysis } from './context/AnalysisContext'
import { I18nProvider } from './context/I18nContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import AuthModal from './components/common/AuthModal'
import { Transcription, Analysis } from './types'
import { processAudioFile, ProcessingProgress } from './services/api'

// View type for right panel
type RightView = 'welcome' | 'analysis' | 'export-settings' | 'app-settings' | 'personal-center'

function AppContent() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingProjectIdRef = useRef<string | null>(null)
  const { projects, currentFile, loadUserFiles, addFile, deleteFile, setCurrentFile, setCurrentProject } = useProject()
  const { settings } = useSettings()
  const { isAuthenticated } = useAuth()
  const { setTranscription, setAnalysis, startProcessing, stopProcessing, setProgress } = useAnalysis()
  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])
  const [rightView, setRightView] = useState<RightView>('welcome')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login')

  // Apply theme to HTML element
  useEffect(() => {
    const html = document.documentElement
    if (settings.theme === 'dark') {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
  }, [settings.theme])

  // Load user files when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      console.log('[DEBUG] App - user authenticated, loading files from database')
      loadUserFiles()
    }
  }, [isAuthenticated])

  // Listen for auth modal events from other components
  useEffect(() => {
    const handleShowAuthModal = (e: CustomEvent) => {
      setAuthModalMode(e.detail)
      setShowAuthModal(true)
    }
    window.addEventListener('showAuthModal', handleShowAuthModal as EventListener)
    return () => {
      window.removeEventListener('showAuthModal', handleShowAuthModal as EventListener)
    }
  }, [])

  // When currentFile changes (user clicks a file in project tree), switch to analysis view
  useEffect(() => {
    if (currentFile) {
      console.log('[DEBUG] File selected from tree, switching to analysis view:', currentFile.name)
      setRightView('analysis')
    }
  }, [currentFile])

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      setMediaRecorder(recorder)
      setAudioChunks([])

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks(prev => [...prev, event.data])
        }
      }

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
        await processAudioBlob(audioBlob, '录音_' + new Date().toLocaleTimeString())
        stream.getTracks().forEach(track => track.stop())
      }

      recorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Failed to start recording:', error)
      alert('无法访问麦克风，请检查权限设置')
    }
  }

  const handleStopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop()
      setIsRecording(false)
    }
  }

  const handleUploadFile = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    console.log('[DEBUG] handleFileChange, file:', file?.name)
    if (file) {
      await processAudioBlob(file, file.name)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const processAudioBlob = async (blob: Blob, filename: string) => {
    // Use pending project ID if set (from context menu "new file"), otherwise use currentProject
    const projectId = pendingProjectIdRef.current || currentProject?.id || projects[0]?.id || '1'
    console.log('[DEBUG] processAudioBlob called, projectId:', projectId, 'pendingProjectIdRef:', pendingProjectIdRef.current)
    // Clear the pending project ID after use
    pendingProjectIdRef.current = null

    // Get selected AI model from settings
    const aiModel = 'faster-whisper'

    // Immediately add file to project tree (before API call) to show user their file is being processed
    console.log('[DEBUG] processAudioBlob - creating temp file')
    const tempFile = addFile(projectId, {
      name: filename,
      type: blob.type.includes('webm') ? 'recording' : 'uploaded',
      duration: undefined
    })
    console.log('[DEBUG] processAudioBlob - temp file created with id:', tempFile.id)
    const tempFileId = tempFile.id

    // Set as current file for display
    setCurrentFile(tempFile)
    setCurrentProject(projects.find(p => p.id === projectId) || null)

    startProcessing('正在处理音频...')
    // Switch to analysis view immediately to show processing state
    setRightView('analysis')

    try {
      // Call real API for transcription and analysis
      console.log('[DEBUG] Calling processAudioFile API...')
      const result = await processAudioFile(
        blob,
        aiModel,
        settings.speakerRecognition,
        settings.autoSummary,
        (progress: ProcessingProgress) => {
          console.log('[DEBUG] Progress:', progress)
          setProgress(progress.progress, progress.message)
        }
      )
      console.log('[DEBUG] processAudioFile returned:', result)
      const { transcription: transResult, analysis: analysisResult } = result

      // Convert API response to local types
      const transcription: Transcription = {
        id: transResult.id,
        text: transResult.text,
        segments: transResult.segments.map(seg => ({
          start: seg.start,
          end: seg.end,
          text: seg.text,
          speaker: seg.speaker || undefined
        })),
        language: transResult.language
      }

      // Convert mind_map to mindMap (camelCase)
      const convertMindMap = (node: any): any => ({
        id: node.id,
        text: node.text,
        children: node.children?.map((child: any) => convertMindMap(child))
      })

      // Determine speakers: use transcription speakers if available (from pyannote), otherwise use analysis speakers
      const speakers = transResult.speakers && transResult.speakers.length > 0
        ? transResult.speakers.map(s => ({
            id: s.id,
            name: s.name,
            color: s.color
          }))
        : analysisResult.speakers.map(s => ({
            id: s.id,
            name: s.name,
            color: s.color
          }))

      const analysis: Analysis = {
        speakers,
        chapters: analysisResult.chapters.map(c => ({
          id: c.id,
          title: c.title,
          startTime: c.start_time,
          endTime: c.end_time,
          content: c.content
        })),
        summary: analysisResult.summary,
        mindMap: convertMindMap(analysisResult.mind_map),
        keywords: analysisResult.keywords || [],
        sentiment: analysisResult.sentiment || '未知',
        keyDecisions: analysisResult.key_decisions || [],
        actionItems: analysisResult.action_items || [],
        riskPoints: analysisResult.risk_points || []
      }

      // Update state with real data
      setTranscription(transcription)
      setAnalysis(analysis)

      // Remove temp file and add file with correct ID from API
      console.log('[DEBUG] processAudioBlob - deleting temp file:', tempFileId, 'and adding final file with id:', transResult.id)
      deleteFile(projectId, tempFileId)
      const finalFile = addFile(projectId, {
        id: transResult.id,
        name: filename,
        type: blob.type.includes('webm') ? 'recording' : 'uploaded',
        duration: transResult.duration || undefined,
        createdAt: new Date().toISOString(),
        transcription,
        analysis
      })
      console.log('[DEBUG] processAudioBlob - final file added with id:', finalFile.id)

      // Set current file
      setCurrentFile(finalFile)
      setCurrentProject(projects.find(p => p.id === projectId) || null)

      // Now switch to analysis view since we have real data
      setRightView('analysis')
      stopProcessing()
    } catch (error) {
      console.error('[DEBUG] Processing error:', error)
      alert(`处理失败: ${error instanceof Error ? error.message : '未知错误'}`)
      stopProcessing()
      setRightView('welcome')
    }
  }

  const handleNavigate = (view: RightView) => {
    setRightView(view)
    if (view !== 'analysis') {
      setCurrentFile(null)
    }
  }

  return (
    <div className="h-screen">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="audio/*"
        className="hidden"
      />

      <MainLayout
        onStartRecording={isRecording ? handleStopRecording : handleStartRecording}
        onUploadFile={handleUploadFile}
        setPendingProjectId={(id) => { pendingProjectIdRef.current = id }}
        rightView={rightView}
        onNavigate={handleNavigate}
        onShowAuthModal={(mode) => {
          setAuthModalMode(mode)
          setShowAuthModal(true)
        }}
      />

      {isRecording && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3 animate-pulse">
          <div className="w-3 h-3 bg-white rounded-full" />
          <span>正在录音...</span>
          <button
            onClick={handleStopRecording}
            className="px-3 py-1 bg-white/20 rounded-full text-sm hover:bg-white/30"
          >
            停止
          </button>
        </div>
      )}

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authModalMode}
      />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <ProjectProvider>
          <AnalysisProvider>
            <I18nProvider>
              <AppContent />
            </I18nProvider>
          </AnalysisProvider>
        </ProjectProvider>
      </SettingsProvider>
    </AuthProvider>
  )
}
