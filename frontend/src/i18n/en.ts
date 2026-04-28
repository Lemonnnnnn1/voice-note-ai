import { TranslationKey } from './zh'

export const en: Record<TranslationKey, string> = {
  // App
  appName: 'VoiceNote AI',

  // Navigation
  newProject: 'New Project',
  uploadAudio: 'Upload Audio',
  settings: 'Settings',
  personalCenter: 'Personal Center',
  noFilesAvailable: 'No files available for export',

  // Welcome Screen
  welcomeTitle: 'Smart Meeting Transcription & Analysis',
  welcomeSubtitle: 'Upload audio files or use microphone to record in real-time. AI will automatically generate meeting summaries, key topics, and action items',
  startRecording: 'Start Recording',
  uploadFile: 'Upload File',

  // Project Tree
  myProjects: 'My Projects',
  recentFiles: 'Recent Files',
  searchFiles: 'Search files...',
  noProjects: 'No projects yet',
  createProject: 'Create Project',

  // Analysis Tabs
  transcript: 'Transcript',
  speakers: 'Speakers',
  chapters: 'Chapters',
  summary: 'Summary',
  mindMap: 'Mind Map',
  insights: 'Insights',

  // Transcript
  fullTranscript: 'Full Transcript',
  noTranscript: 'No transcript available',
  generatingTranscript: 'Generating transcript...',

  // Speakers
  speakerList: 'Speaker List',
  noSpeakers: 'No speaker information',

  // Chapters
  chapterAnalysis: 'Chapter Analysis',
  noChapters: 'No chapter information',

  // Summary
  meetingSummary: 'Meeting Summary',
  noSummary: 'No summary available',

  // Mind Map
  mindMapTitle: 'Mind Map',
  noMindMap: 'No mind map available',

  // Insights
  keyInsights: 'Key Insights',
  noInsights: 'No insights available',

  // Recording
  recording: 'Recording...',
  stop: 'Stop',

  // Settings - General
  generalSettings: 'General Settings',
  interfaceLanguage: 'Interface Language',
  selectLanguage: 'Select display language',
  auto: 'Auto',
  followSystem: 'Follow System',
  chinese: '中文',
  simplifiedChinese: 'Simplified Chinese',
  english: 'English',
  englishLanguage: 'English',
  themeMode: 'Theme Mode',
  selectTheme: 'Select application display theme',
  lightMode: 'Light Mode',
  darkMode: 'Dark Mode',

  // Settings - Transcription
  transcriptionSettings: 'Transcription & Analysis',
  speakerRecognition: 'Speaker Recognition',
  enableSpeakerRecognition: 'Enable Speaker Recognition',
  speakerRecognitionDesc: 'Automatically identify and distinguish different speakers during transcription',
  autoGenerateSummary: 'Auto Generate Summary',
  enableAutoSummary: 'Enable Auto Summary',
  autoSummaryDesc: 'Automatically generate summary, chapters and keywords after analysis',

  // Settings - Export
  exportSettings: 'Export Format Settings',
  selectExportFormat: 'Select default export file format',
  markdown: 'Markdown',
  markdownDesc: 'Suitable for secondary editing and knowledge base organization',
  txt: 'Plain Text',
  txtDesc: 'Suitable for quick copy and lightweight viewing',
  pdf: 'PDF',
  pdfDesc: 'Suitable for formal archiving and sharing',
  json: 'JSON',
  jsonDesc: 'Suitable for program processing and data exchange',

  // Settings - Storage
  storagePrivacy: 'Storage & Privacy',
  storageMethod: 'Storage Method',
  selectStorageLocation: 'Select audio file storage location',
  localStorage: 'Local Storage',
  localStorageDesc: 'Files saved locally on device',
  cloudStorage: 'Cloud Storage',
  cloudStorageDesc: 'Files synced to cloud server',
  autoCleanup: 'Auto Cleanup Policy',
  selectCleanupInterval: 'Set auto cleanup interval for history',
  days: 'days',
  custom: 'Custom',

  // Export Settings Page
  exportSettingsTitle: 'Export Settings',
  exportSettingsDesc: 'Configure export file format and content',
  exportObject: 'Export Object',
  selectAnalyzedFile: 'Select analyzed file to export',
  selectFilePlaceholder: 'Please select an analyzed file',
  exportContent: 'Export Content',
  selectAnalysisResults: 'Select analysis results to include',
  fullTranscriptExport: 'Full Transcript',
  fullTranscriptExportDesc: 'Include all analysis content',
  meetingSummaryExport: 'Meeting Summary',
  meetingSummaryExportDesc: 'Export summary only',
  globalExport: 'Global Export',
  globalExportDesc: 'Include mind map and more',
  customExport: 'Custom',
  customExportDesc: 'Freely select content items',
  selectExportItems: 'Select analysis items to export:',
  exportFormat: 'Export Format',
  selectFileType: 'Select export file type',
  savePath: 'Save Path',
  doubleClickSelectDir: 'Double-click to select directory',
  browse: 'Browse',
  currentExportSummary: 'Current Export Summary',
  cancel: 'Cancel',
  exportCurrentContent: 'Export Current Content',

  // Personal Center
  personalCenterTitle: 'Personal Center',
  personalCenterDesc: 'Manage your account and view usage statistics',
  totalAnalysisDuration: 'Total Analysis Duration',
  thisWeek: 'This Week',
  analyzedFiles: 'Analyzed Files',
  recordings: 'Recordings',
  uploads: 'Uploads',
  supportedLanguages: 'Supported Languages',
  andMore: 'and more',
  storageUsed: 'Storage Used',
  usageRate: 'Usage Rate',
  usageTrend: 'Usage Trend',
  quickActions: 'Quick Actions',
  accountSettings: 'Account Settings',
  modifyPersonalInfo: 'Modify personal information',
  passwordSecurity: 'Password & Security',
  modifyPassword: 'Modify password and security settings',
  logout: 'Logout',
  logoutDesc: 'Logout from current account',

  // Common
  back: 'Back',
  export: 'Export',
  processing: 'Processing...',
  minutes: 'minutes',
  noData: 'No data',
  loading: 'Loading...',
  exporting: 'Exporting...',
  exportFailed: 'Export failed, please try again',

  // Left Sidebar
  aiTranscriptionModel: 'AI Transcription Model',
  localRunFreeUse: 'Run locally, free to use',
  sidebarExportSettings: 'Export Settings',
  themeSettings: 'Theme Settings',
  settingsAndHelp: 'Settings & Help',
  usageGuide: 'User Guide',
  understandHowToUse: 'Learn how to use VoiceNote AI',
  faq: 'FAQ',
  viewFAQ: 'View frequently asked questions',
  contactUs: 'Contact Us',
  getHelpSupport: 'Get help and support',
  about: 'About',
  viewAppInfoVersion: 'View app info and version',
  expandProjectBar: 'Expand project bar',
  closeProjectBar: 'Close project bar',
  version: 'Version',

  // Usage Guide Modal
  usageGuideTitle: 'User Guide',
  startRecordingGuide: 'Start Recording',
  startRecordingDesc: 'Click "Start Recording", allow microphone permission to begin transcription',
  uploadFileGuide: 'Upload File',
  uploadFileDesc: 'Supports MP3 / WAV / M4A formats, auto-analyzes after upload',
  viewExportGuide: 'View & Export',
  viewExportDesc: 'View results in the list, export as Markdown, txt or PDF',
  supportBilingualRecognition: 'Supports Chinese and English recognition',
  autoGenerateSummaryAfterRecording: 'Auto-generates summary after recording ends',

  // FAQ Modal
  faqTitle: 'FAQ',
  recordingNoResponse: 'Recording not responding?',
  recordingNoResponseA: 'Please check if browser allows microphone permission',
  supportedFormats: 'What file formats are supported?',
  supportedFormatsA: 'MP3, WAV, M4A, OGG, WEBM',
  transcriptionTime: 'How long does transcription take?',
  transcriptionTimeA: 'Usually 1-2x the audio duration',
  multilingualSupport: 'Can it recognize multiple languages?',
  multilingualSupportA: 'Supports Chinese, English and some common languages',
  dataRetention: 'How long is data stored?',
  dataRetentionA: 'Currently stored indefinitely by default, can be deleted manually',

  // Contact Modal
  feedbackContact: 'Feedback & Contact',
  issueType: 'Issue Type',
  issueDescription: 'Issue Description',
  describeIssue: 'Please briefly describe your issue or suggestion...',
  submitFeedback: 'Submit Feedback',
  thankYouFeedback: 'Thank you for your feedback!',
  bug: 'Bug',
  suggestion: 'Suggestion',
  other: 'Other',

  // About Modal
  aboutVoiceNoteAI: 'About VoiceNote AI',
  aboutDesc: 'VoiceNote AI is a tool for meeting recording transcription and analysis, supporting real-time recording, file upload and intelligent summary.',
  currentVersion: 'Current Version',
  versionNumber: 'v0.1',
  usageScope: 'Usage Scope',
  personalSmallScope: 'Personal and small-scale use',
  underDevelopment: 'Under continuous development',

  // Feedback/Contact
  enterQuestion: 'Please enter your question or suggestion',

  // Project Tree Context Menu
  newFolder: 'New Folder',
  newFile: 'New File',
  rename: 'Rename',
  pin: 'Pin',
  delete: 'Delete',
}