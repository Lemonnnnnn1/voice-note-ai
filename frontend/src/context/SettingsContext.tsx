import React, { createContext, useContext, useState, ReactNode } from 'react'
import { Settings } from '../types'

interface SettingsContextType {
  settings: Settings
  updateSettings: (settings: Partial<Settings>) => void
}

const defaultSettings: Settings = {
  aiModel: 'faster-whisper',
  exportFormat: null,
  language: null,
  theme: null,
  speakerRecognition: true,
  autoSummary: false,
  storageType: null,
  autoCleanDays: null
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings)

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }))
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}
