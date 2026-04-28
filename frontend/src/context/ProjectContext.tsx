import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { Project, AudioFile } from '../types'

interface ProjectContextType {
  projects: Project[]
  currentProject: Project | null
  currentFile: AudioFile | null
  setCurrentProject: (project: Project | null) => void
  setCurrentFile: (file: AudioFile | null) => void
  loadFileContent: (fileId: string) => Promise<void>
  loadUserFiles: () => Promise<void>
  addProject: (name: string, parentId?: string | null) => Project
  deleteProject: (id: string) => void
  renameProject: (id: string, newName: string) => void
  pinProject: (id: string) => void
  addFile: (projectId: string, file: Omit<AudioFile, 'id' | 'createdAt' | 'parentId'>) => AudioFile
  deleteFile: (projectId: string, fileId: string) => void
  renameFile: (projectId: string, fileId: string, newName: string) => void
  pinFile: (projectId: string, fileId: string) => void
  updateFileAnalysis: (projectId: string, fileId: string, analysis: AudioFile['analysis']) => void
  updateFile: (projectId: string, fileId: string, updates: Partial<AudioFile>) => void
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([
    {
      id: '1',
      name: '我的项目',
      parentId: null,
      createdAt: new Date().toISOString(),
      files: []
    }
  ])
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [currentFile, setCurrentFile] = useState<AudioFile | null>(null)

  const addProject = (name: string, parentId: string | null = null) => {
    const newProject: Project = {
      id: Date.now().toString(),
      name,
      parentId,
      createdAt: new Date().toISOString(),
      files: []
    }
    setProjects(prev => [...prev, newProject])
    return newProject
  }

  const deleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id))
    if (currentProject?.id === id) {
      setCurrentProject(null)
      setCurrentFile(null)
    }
  }

  const renameProject = (id: string, newName: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, name: newName }
      }
      return p
    }))
  }

  const pinProject = (id: string) => {
    setProjects(prev => {
      const project = prev.find(p => p.id === id)
      if (!project) return prev
      // Move to front
      return [project, ...prev.filter(p => p.id !== id)]
    })
  }

  const addFile = (projectId: string, file: Omit<AudioFile, 'id' | 'createdAt' | 'parentId'> & { id?: string }): AudioFile => {
    const newFile: AudioFile = {
      ...file,
      id: file.id || Date.now().toString(),
      parentId: projectId,
      createdAt: file.createdAt || new Date().toISOString()
    }
    console.log('[DEBUG] addFile called - projectId:', projectId, 'fileId:', newFile.id, 'fileName:', newFile.name)
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        console.log('[DEBUG] addFile - project found, current files count:', p.files.length, 'adding new file')
        return { ...p, files: [...p.files, newFile] }
      }
      return p
    }))
    return newFile
  }

  const deleteFile = async (projectId: string, fileId: string) => {
    console.log('[DEBUG] deleteFile called - projectId:', projectId, 'fileId:', fileId)
    // First remove from local state
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        console.log('[DEBUG] deleteFile - project found, files count before:', p.files.length)
        return { ...p, files: p.files.filter(f => f.id !== fileId) }
      }
      return p
    }))
    if (currentFile?.id === fileId) {
      setCurrentFile(null)
    }

    // Then delete from backend database
    try {
      const { deleteUserFile } = await import('../services/api')
      await deleteUserFile(fileId)
      console.log('[DEBUG] deleteFile - deleted from backend:', fileId)
    } catch (error) {
      console.error('[DEBUG] deleteFile - failed to delete from backend:', error)
      // File is already removed from local state, but backend deletion failed
      // The user can try again or the file will reappear on next load
    }
  }

  const renameFile = async (projectId: string, fileId: string, newName: string) => {
    // First update local state
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          files: p.files.map(f => {
            if (f.id === fileId) {
              return { ...f, name: newName }
            }
            return f
          })
        }
      }
      return p
    }))
    if (currentFile?.id === fileId) {
      setCurrentFile(prev => prev ? { ...prev, name: newName } : null)
    }

    // Then update in backend database
    try {
      const { renameUserFile } = await import('../services/api')
      await renameUserFile(fileId, newName)
      console.log('[DEBUG] renameFile - renamed in backend:', fileId, 'to', newName)
    } catch (error) {
      console.error('[DEBUG] renameFile - failed to rename in backend:', error)
    }
  }

  const pinFile = (projectId: string, fileId: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        const file = p.files.find(f => f.id === fileId)
        if (!file) return p
        return {
          ...p,
          files: [file, ...p.files.filter(f => f.id !== fileId)]
        }
      }
      return p
    }))
  }

  const updateFileAnalysis = (projectId: string, fileId: string, analysis: AudioFile['analysis']) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          files: p.files.map(f => {
            if (f.id === fileId) {
              return { ...f, analysis }
            }
            return f
          })
        }
      }
      return p
    }))
    if (currentFile?.id === fileId) {
      setCurrentFile(prev => prev ? { ...prev, analysis } : null)
    }
  }

  const updateFile = (projectId: string, fileId: string, updates: Partial<AudioFile>) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          files: p.files.map(f => {
            if (f.id === fileId) {
              return { ...f, ...updates }
            }
            return f
          })
        }
      }
      return p
    }))
    if (currentFile?.id === fileId) {
      setCurrentFile(prev => prev ? { ...prev, ...updates } : null)
    }
  }

  const loadFileContent = async (fileId: string) => {
    // Find the file and its project first
    let foundProject: Project | null = null
    let foundFile: AudioFile | null = null

    for (const p of projects) {
      const f = p.files.find(f => f.id === fileId)
      if (f) {
        foundProject = p
        foundFile = f
        break
      }
    }

    if (!foundProject || !foundFile) {
      console.log('[DEBUG] loadFileContent - file not found in projects:', fileId)
      return
    }

    // If file already has transcription and analysis, no need to load
    if (foundFile.transcription && foundFile.analysis) {
      console.log('[DEBUG] loadFileContent - file already has content:', fileId)
      return
    }

    console.log('[DEBUG] loadFileContent - fetching from backend:', fileId)

    // Import API functions
    const { getFileTranscription, getFileAnalysis } = await import('../services/api')

    try {
      // Try to get transcription
      try {
        const transcription = await getFileTranscription(fileId)
        const transcriptionData = {
          id: transcription.id,
          text: transcription.text,
          language: transcription.language,
          segments: transcription.segments || []
        }
        updateFile(foundProject.id, fileId, { transcription: transcriptionData })
        console.log('[DEBUG] loadFileContent - loaded transcription')
      } catch (e) {
        console.log('[DEBUG] loadFileContent - no transcription found:', e)
      }

      // Try to get analysis
      try {
        const analysis = await getFileAnalysis(fileId)
        updateFile(foundProject.id, fileId, { analysis })
        console.log('[DEBUG] loadFileContent - loaded analysis')
      } catch (e) {
        console.log('[DEBUG] loadFileContent - no analysis found:', e)
      }
    } catch (e) {
      console.error('[DEBUG] loadFileContent - failed:', e)
    }
  }

  const loadUserFiles = async () => {
    console.log('[DEBUG] loadUserFiles - fetching files from database')
    try {
      const { getUserFiles } = await import('../services/api')
      const userFiles = await getUserFiles()
      console.log('[DEBUG] loadUserFiles - got', userFiles.length, 'files from database')

      if (userFiles.length === 0) {
        console.log('[DEBUG] loadUserFiles - no files found')
        return
      }

      // Get the default project (id = '1') or create it
      let defaultProject = projects.find(p => p.id === '1')
      if (!defaultProject) {
        // Create default project
        const newProject: Project = {
          id: '1',
          name: '我的项目',
          parentId: null,
          createdAt: new Date().toISOString(),
          files: []
        }
        setProjects([newProject])
        defaultProject = newProject
      }

      // Convert userFiles to AudioFile format and add to project
      const audioFiles: AudioFile[] = userFiles.map(file => ({
        id: file.id,
        name: file.name,
        type: file.type as 'recording' | 'uploaded',
        parentId: file.project_id || '1',
        duration: file.duration || undefined,
        createdAt: file.created_at,
        // Note: transcription and analysis will be loaded on-demand when clicking the file
      }))

      // Add files to the default project (or create a project per file if needed)
      setProjects(prev => prev.map(p => {
        if (p.id === '1') {
          // Get IDs of files from database
          const dbFileIds = new Set(audioFiles.map(f => f.id))

          // Keep only files that exist in database (removes orphaned local temp files)
          const cleanFiles = p.files.filter(f => dbFileIds.has(f.id))
          console.log('[DEBUG] loadUserFiles - local files:', p.files.length, 'cleaned to:', cleanFiles.length)

          // Add new files from database that don't exist locally
          const existingIds = new Set(cleanFiles.map(f => f.id))
          const newFiles = audioFiles.filter(f => !existingIds.has(f.id))
          console.log('[DEBUG] loadUserFiles - adding', newFiles.length, 'new files to project')

          return { ...p, files: [...cleanFiles, ...newFiles] }
        }
        return p
      }))

      console.log('[DEBUG] loadUserFiles - completed')
    } catch (error) {
      console.error('[DEBUG] loadUserFiles - failed:', error)
    }
  }

  return (
    <ProjectContext.Provider value={{
      projects,
      currentProject,
      currentFile,
      setCurrentProject,
      setCurrentFile,
      loadFileContent,
      loadUserFiles,
      addProject,
      deleteProject,
      renameProject,
      pinProject,
      addFile,
      deleteFile,
      renameFile,
      pinFile,
      updateFileAnalysis,
      updateFile
    }}>
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  const context = useContext(ProjectContext)
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider')
  }
  return context
}
