import React, { useState } from 'react'
import { FolderPlus, FileAudio, Trash2, ChevronRight, ChevronDown, PanelLeftClose, PanelLeft, Edit3, Pin, FolderPlus as NewFolderIcon } from 'lucide-react'
import { useProject } from '../../context/ProjectContext'
import { useI18n } from '../../context/I18nContext'
import { Project, AudioFile } from '../../types'

interface ProjectTreeProps {
  isCollapsed: boolean
  onToggleCollapse: () => void
  onNewFile?: () => void
  setPendingProjectId?: (id: string | null) => void
}

export default function ProjectTree({ isCollapsed, onToggleCollapse, onNewFile, setPendingProjectId }: ProjectTreeProps) {
  const { projects, currentFile, setCurrentProject, setCurrentFile, addProject, deleteProject, renameProject, pinProject, addFile, deleteFile, renameFile, pinFile } = useProject()
  const { t } = useI18n()
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set(['1']))
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: 'project' | 'file'; id: string } | null>(null)

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev)
      if (next.has(projectId)) {
        next.delete(projectId)
      } else {
        next.add(projectId)
      }
      return next
    })
  }

  const handleNewProject = () => {
    const name = prompt(t('createProject'))
    if (name) {
      const newProject = addProject(name)  // top-level, parentId = null
      setExpandedProjects(prev => new Set([...prev, newProject.id]))
    }
  }

  const handleContextMenu = (e: React.MouseEvent, type: 'project' | 'file', id: string) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, type, id })
  }

  const closeContextMenu = () => {
    setContextMenu(null)
  }

  const handleRename = async () => {
    if (!contextMenu) return
    const currentName = contextMenu.type === 'project'
      ? projects.find(p => p.id === contextMenu.id)?.name
      : projects.flatMap(p => p.files).find(f => f.id === contextMenu.id)?.name

    const newName = prompt('New name:', currentName)
    if (newName && newName !== currentName) {
      if (contextMenu.type === 'project') {
        renameProject(contextMenu.id, newName)
      } else {
        const project = projects.find(p => p.files.some(f => f.id === contextMenu.id))
        if (project) {
          await renameFile(project.id, contextMenu.id, newName)
        }
      }
    }
    closeContextMenu()
  }

  const handleDelete = async () => {
    if (!contextMenu) return
    if (contextMenu.type === 'project') {
      deleteProject(contextMenu.id)
    } else {
      const project = projects.find(p => p.files.some(f => f.id === contextMenu.id))
      if (project) {
        await deleteFile(project.id, contextMenu.id)
      }
    }
    closeContextMenu()
  }

  const handlePin = () => {
    if (!contextMenu) return
    if (contextMenu.type === 'project') {
      pinProject(contextMenu.id)
    } else {
      const project = projects.find(p => p.files.some(f => f.id === contextMenu.id))
      if (project) {
        pinFile(project.id, contextMenu.id)
      }
    }
    closeContextMenu()
  }

  const handleNewSubProject = () => {
    if (!contextMenu || contextMenu.type !== 'project') return
    const name = prompt(t('createProject'))
    if (name) {
      // Create as child of the current project
      const newProject = addProject(name, contextMenu.id)
      setExpandedProjects(prev => new Set([...prev, newProject.id]))
    }
    closeContextMenu()
  }

  const handleNewFileInProject = () => {
    if (!contextMenu || contextMenu.type !== 'project') return
    // Set pending project ID for file upload (bypasses async state issue)
    console.log('[DEBUG] handleNewFileInProject, projectId:', contextMenu.id)
    if (setPendingProjectId) {
      setPendingProjectId(contextMenu.id)
    }
    closeContextMenu()
    if (onNewFile) {
      onNewFile()
    }
  }

  const renderFile = (file: AudioFile, projectId: string, indent: number = 2.5) => (
    <div
      key={file.id}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
        currentFile?.id === file.id ? 'bg-primary/10 text-primary' : 'text-text-primary dark:text-dark-text hover:bg-surface-card dark:hover:bg-dark-card'
      }`}
      onClick={() => {
        setCurrentProject(projects.find(p => p.id === projectId) || null)
        setCurrentFile(file)
      }}
      onContextMenu={(e) => handleContextMenu(e, 'file', file.id)}
      style={{ paddingLeft: `${indent}rem` }}
    >
      <FileAudio className="w-4 h-4 text-text-secondary dark:text-dark-text-secondary" />
      <span className="text-sm truncate flex-1">{file.name}</span>
    </div>
  )

  const renderProject = (project: Project, level: number = 0) => {
    const childProjects = projects.filter(p => p.parentId === project.id)
    const isExpanded = expandedProjects.has(project.id)
    const indent = level * 1.5

    return (
      <div key={project.id} className="mb-1">
        {/* Project Header */}
        <div
          className="flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer hover:bg-surface-card dark:hover:bg-dark-card transition-colors"
          onClick={() => toggleProject(project.id)}
          onContextMenu={(e) => handleContextMenu(e, 'project', project.id)}
          style={{ paddingLeft: `${indent + 0.5}rem` }}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-text-secondary dark:text-dark-text-secondary" />
          ) : (
            <ChevronRight className="w-4 h-4 text-text-secondary dark:text-dark-text-secondary" />
          )}
          <FolderPlus className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-text-primary dark:text-dark-text flex-1 truncate">
            {project.name}
          </span>
          <span className="text-xs text-text-secondary dark:text-dark-text-secondary">{project.files.length}</span>
        </div>

        {/* Children - Files and Sub-projects */}
        {isExpanded && (
          <div className="mt-1">
            {childProjects.length === 0 && project.files.length === 0 && (
              <p className="text-xs text-text-secondary dark:text-dark-text-secondary italic pl-10 py-1">
                {t('noData')}
              </p>
            )}
            {/* Render child projects first */}
            {childProjects.map(child => renderProject(child, level + 1))}
            {/* Then render files */}
            {project.files.map(file => renderFile(file, project.id, indent + 2))}
          </div>
        )}
      </div>
    )
  }

  if (isCollapsed) {
    return (
      <aside className="w-12 bg-surface-sidebar dark:bg-dark-sidebar border-r border-border dark:border-dark-border flex flex-col h-full items-center py-4">
        <button
          onClick={onToggleCollapse}
          className="p-2 hover:bg-surface-card dark:hover:bg-dark-card rounded-lg transition-colors text-text-secondary dark:text-dark-text-secondary hover:text-primary"
          title={t('expandProjectBar')}
        >
          <PanelLeft className="w-5 h-5" />
        </button>
      </aside>
    )
  }

  // Only show top-level projects (parentId === null)
  const topLevelProjects = projects.filter(p => p.parentId === null)

  return (
    <aside className="w-72 bg-surface-sidebar dark:bg-dark-sidebar border-r border-border dark:border-dark-border flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border dark:border-dark-border">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-text-primary dark:text-dark-text">{t('myProjects')}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={handleNewProject}
              className="p-1.5 hover:bg-surface-card dark:hover:bg-dark-card rounded-lg transition-colors"
              title={t('createProject')}
            >
              <FolderPlus className="w-5 h-5 text-text-secondary dark:text-dark-text-secondary" />
            </button>
            <button
              onClick={onToggleCollapse}
              className="p-1.5 hover:bg-surface-card dark:hover:bg-dark-card rounded-lg transition-colors"
              title={t('closeProjectBar')}
            >
              <PanelLeftClose className="w-5 h-5 text-text-secondary dark:text-dark-text-secondary" />
            </button>
          </div>
        </div>
      </div>

      {/* Project Tree */}
      <div className="flex-1 p-2 overflow-y-auto dark:bg-dark-sidebar">
        {topLevelProjects.map(project => renderProject(project))}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={closeContextMenu}
          />
          <div
            className="fixed z-50 bg-surface-card dark:bg-dark-card border border-border dark:border-dark-border rounded-lg shadow-lg py-1 min-w-[140px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {contextMenu.type === 'project' && (
              <>
                <button
                  onClick={handleNewSubProject}
                  className="w-full px-4 py-2 text-left text-sm text-text-primary dark:text-dark-text hover:bg-surface-sidebar dark:hover:bg-dark-sidebar flex items-center gap-2"
                >
                  <NewFolderIcon className="w-4 h-4" />
                  {t('newFolder')}
                </button>
                <button
                  onClick={handleNewFileInProject}
                  className="w-full px-4 py-2 text-left text-sm text-text-primary dark:text-dark-text hover:bg-surface-sidebar dark:hover:bg-dark-sidebar flex items-center gap-2"
                >
                  <FileAudio className="w-4 h-4" />
                  {t('newFile')}
                </button>
                <div className="border-t border-border dark:border-dark-border my-1" />
              </>
            )}
            <button
              onClick={handleRename}
              className="w-full px-4 py-2 text-left text-sm text-text-primary dark:text-dark-text hover:bg-surface-sidebar dark:hover:bg-dark-sidebar flex items-center gap-2"
            >
              <Edit3 className="w-4 h-4" />
              {t('rename')}
            </button>
            <button
              onClick={handlePin}
              className="w-full px-4 py-2 text-left text-sm text-text-primary dark:text-dark-text hover:bg-surface-sidebar dark:hover:bg-dark-sidebar flex items-center gap-2"
            >
              <Pin className="w-4 h-4" />
              {t('pin')}
            </button>
            <button
              onClick={handleDelete}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-surface-sidebar dark:hover:bg-dark-sidebar flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {t('delete')}
            </button>
          </div>
        </>
      )}
    </aside>
  )
}
