import React from 'react'
import { Mic, Upload, FileAudio } from 'lucide-react'
import { useI18n } from '../../context/I18nContext'

interface WelcomeScreenProps {
  onStartRecording: () => void
  onUploadFile: () => void
}

export default function WelcomeScreen({ onStartRecording, onUploadFile }: WelcomeScreenProps) {
  const { t } = useI18n()

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-surface-bg dark:bg-dark-bg p-8">
      {/* Slogan - Above Title */}
      <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-4 tracking-wide">
        {t('welcomeTitle')}
      </p>

      {/* Product Title */}
      <h1 className="text-4xl font-bold text-text-primary dark:text-dark-text mb-6">
        VoiceNote AI
      </h1>

      {/* Product Description - Below Title */}
      <p className="text-sm text-text-secondary dark:text-dark-text-secondary text-center max-w-2xl leading-relaxed mb-10">
        {t('welcomeSubtitle')}
      </p>

      {/* Action Module - Together with smaller spacing */}
      <div className="flex flex-col items-center gap-3">
        {/* Call to Action */}
        <p className="text-lg text-text-primary dark:text-dark-text font-medium">
          {t('startRecording')}
        </p>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={onStartRecording}
            className="flex items-center gap-2 px-5 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors shadow-md text-base font-medium"
          >
            <Mic className="w-4 h-4" />
            {t('startRecording')}
          </button>
          <button
            onClick={onUploadFile}
            className="flex items-center gap-2 px-5 py-3 bg-surface-card dark:bg-dark-card border border-border dark:border-dark-border text-text-primary dark:text-dark-text rounded-xl hover:bg-surface-sidebar dark:hover:bg-dark-sidebar transition-colors shadow-md text-base font-medium"
          >
            <Upload className="w-4 h-4" />
            {t('uploadFile')}
          </button>
        </div>

        {/* Supported Formats */}
        <div className="flex items-center gap-2 text-text-secondary dark:text-dark-text-secondary text-sm">
          <FileAudio className="w-4 h-4" />
          <span>支持 MP3, WAV, M4A, OGG, WEBM 格式，最大 500MB</span>
        </div>
      </div>
    </div>
  )
}