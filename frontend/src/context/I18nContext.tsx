import React, { createContext, useContext, useMemo } from 'react'
import { useSettings } from './SettingsContext'
import { zh, en, Language, getEffectiveLanguage, TranslationKey } from '../i18n'

interface I18nContextType {
  t: (key: TranslationKey) => string
  language: Language
  effectiveLanguage: 'zh' | 'en'
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings()
  const language = settings.language as Language || 'auto'
  const effectiveLanguage = getEffectiveLanguage(language)

  const translations = effectiveLanguage === 'en' ? en : zh

  const t = (key: TranslationKey): string => {
    return translations[key] || zh[key] || key
  }

  const value = useMemo(() => ({
    t,
    language,
    effectiveLanguage
  }), [language, effectiveLanguage, translations])

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}