import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react'
import { Analysis, Transcription } from '../types'

interface AnalysisContextType {
  isProcessing: boolean
  processingStep: string
  progress: number
  transcription: Transcription | null
  analysis: Analysis | null
  setTranscription: (t: Transcription | null) => void
  setAnalysis: (a: Analysis | null) => void
  startProcessing: (step: string) => void
  stopProcessing: () => void
  setProgress: (progress: number, step?: string) => void
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined)

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState('')
  const [progress, setProgressState] = useState(0)
  const [transcription, setTranscription] = useState<Transcription | null>(null)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)

  const startProcessing = useCallback((step: string) => {
    setIsProcessing(true)
    setProcessingStep(step)
    setProgressState(0)
  }, [])

  const stopProcessing = useCallback(() => {
    setIsProcessing(false)
    setProcessingStep('')
    setProgressState(0)
  }, [])

  const setProgress = useCallback((p: number, step?: string) => {
    setProgressState(p)
    if (step) setProcessingStep(step)
  }, [])

  return (
    <AnalysisContext.Provider value={{
      isProcessing,
      processingStep,
      progress,
      transcription,
      analysis,
      setTranscription,
      setAnalysis,
      startProcessing,
      stopProcessing,
      setProgress
    }}>
      {children}
    </AnalysisContext.Provider>
  )
}

export function useAnalysis() {
  const context = useContext(AnalysisContext)
  if (!context) {
    throw new Error('useAnalysis must be used within an AnalysisProvider')
  }
  return context
}
