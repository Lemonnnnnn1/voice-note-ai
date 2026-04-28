import React from 'react'
import { Download } from 'lucide-react'
import { useSettings } from '../../context/SettingsContext'
import { useI18n } from '../../context/I18nContext'

interface ExportButtonProps {
  content: string
  filename: string
  className?: string
}

export default function ExportButton({ content, filename, className = '' }: ExportButtonProps) {
  const { settings } = useSettings()
  const { t } = useI18n()

  const handleExport = () => {
    let blob: Blob
    let extension: string

    switch (settings.exportFormat) {
      case 'json':
        try {
          const jsonData = JSON.parse(content)
          blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' })
        } catch {
          blob = new Blob([content], { type: 'application/json' })
        }
        extension = 'json'
        break
      case 'txt':
        blob = new Blob([content], { type: 'text/plain' })
        extension = 'txt'
        break
      case 'markdown':
      default:
        blob = new Blob([content], { type: 'text/markdown' })
        extension = 'md'
        break
    }

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.${extension}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={handleExport}
      className={`p-1.5 hover:bg-surface-sidebar dark:hover:bg-dark-sidebar rounded-lg transition-colors text-text-secondary dark:text-dark-text-secondary hover:text-primary ${className}`}
      title={t('export')}
    >
      <Download className="w-4 h-4" />
    </button>
  )
}
