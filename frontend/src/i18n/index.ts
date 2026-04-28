export { zh } from './zh'
export type { TranslationKey } from './zh'
export { en } from './en'

export type Language = 'auto' | 'zh' | 'en'

import { zh } from './zh'
import { en } from './en'

export function getTranslation(language: Language): Record<string, string> {
  switch (language) {
    case 'en':
      return en
    case 'zh':
    default:
      return zh
  }
}

export function detectSystemLanguage(): 'zh' | 'en' {
  const systemLang = navigator.language.toLowerCase()
  if (systemLang.startsWith('zh')) {
    return 'zh'
  }
  return 'en'
}

export function getEffectiveLanguage(setting: Language): 'zh' | 'en' {
  if (setting === 'auto') {
    return detectSystemLanguage()
  }
  return setting
}