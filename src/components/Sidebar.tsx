import { useState, useRef, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { format } from 'date-fns';
import useStore from '../store';
import type { Project } from '../types';

export default function Sidebar({ width }: { width: number }) {
  const projects = useStore((s) =>
    s.projects.filter((p) => !p.archived).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
  );
  const addProject = useStore((s) => s.addProject);
  const renameProject = useStore((s) => s.renameProject);
  const deleteProject = useStore((s) => s.deleteProject);
  const updateProjectGlobalNotes = useStore((s) => s.updateProjectGlobalNotes);

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const addInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdding && addInputRef.current) {
      addInputRef.current.focus();
    }
  }, [isAdding]);

  const handleAddProject = () => {
    const trimmed = newName.trim();
    if (trimmed) {
      addProject(trimmed);
      setNewName('');
      setIsAdding(false);
    }
  };

  return (
    <div style={{ width }} className="flex-shrink-0 bg-white dark:bg-slate-900 flex flex-col titlebar-no-drag">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Projects
          </h2>
          <button
            onClick={() => setIsAdding(true)}
            className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-primary-500 hover:bg-primary-50 dark:text-slate-500 dark:hover:text-primary-400 dark:hover:bg-primary-900/20 transition-colors"
            title="Add project"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="7" y1="2" x2="7" y2="12" />
              <line x1="2" y1="7" x2="12" y2="7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Drag hint */}
      <div className="px-5 py-1.5 border-b border-slate-50 dark:border-slate-800">
        <p className="text-[10px] text-slate-400 dark:text-slate-600">
          Drag projects to Today or On Deck
        </p>
      </div>

      {/* Project list */}
      <div className="flex-1 overflow-y-auto py-2">
        {projects.length === 0 && !isAdding && (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-slate-400 dark:text-slate-500">No projects yet</p>
            <button
              onClick={() => setIsAdding(true)}
              className="mt-2 text-sm text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300"
            >
              Add your first project
            </button>
          </div>
        )}

        {projects.map((project) => (
          <ProjectItem
            key={project.id}
            project={project}
            onRename={renameProject}
            onDelete={deleteProject}
            onUpdateNotes={updateProjectGlobalNotes}
          />
        ))}

        {/* Add project input */}
        {isAdding && (
          <div className="px-3 py-1">
            <input
              ref={addInputRef}
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddProject();
                if (e.key === 'Escape') {
                  setIsAdding(false);
                  setNewName('');
                }
              }}
              onBlur={() => {
                if (newName.trim()) {
                  handleAddProject();
                } else {
                  setIsAdding(false);
                  setNewName('');
                }
              }}
              placeholder="Project name..."
              className="w-full px-3 py-2 text-sm border border-primary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 dark:bg-slate-800 dark:border-primary-700 dark:text-slate-200 dark:focus:ring-primary-800 dark:focus:border-primary-600 dark:placeholder:text-slate-500"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectItem({
  project,
  onRename,
  onDelete,
  onUpdateNotes,
}: {
  project: Project;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(project.name);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Make the project item draggable
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `project-${project.id}`,
    data: { type: 'project', projectId: project.id },
  });

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [isEditing]);

  const handleRename = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== project.name) {
      onRename(project.id, trimmed);
    } else {
      setEditName(project.name);
    }
    setIsEditing(false);
  };

  return (
    <div className="group" ref={setNodeRef} style={{ opacity: isDragging ? 0.4 : 1 }}>
      <div className="mx-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
        <div className="flex items-center px-1 py-2">
          {/* Drag handle */}
          <button
            className="drag-handle flex-shrink-0 w-6 h-6 flex items-center justify-center text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 rounded"
            {...attributes}
            {...listeners}
          >
            <svg width="8" height="14" viewBox="0 0 8 14" fill="currentColor">
              <circle cx="2" cy="2" r="1.2" />
              <circle cx="6" cy="2" r="1.2" />
              <circle cx="2" cy="7" r="1.2" />
              <circle cx="6" cy="7" r="1.2" />
              <circle cx="2" cy="12" r="1.2" />
              <circle cx="6" cy="12" r="1.2" />
            </svg>
          </button>

          {/* Expand arrow */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-5 h-5 flex items-center justify-center text-slate-400 dark:text-slate-500 flex-shrink-0"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="currentColor"
              className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            >
              <path d="M3 1 L8 5 L3 9 Z" />
            </svg>
          </button>

          {/* Project name */}
          {isEditing ? (
            <input
              ref={editInputRef}
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') {
                  setEditName(project.name);
                  setIsEditing(false);
                }
              }}
              onBlur={handleRename}
              className="flex-1 min-w-0 ml-1 px-1.5 py-0.5 text-sm border border-primary-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-200 dark:bg-slate-800 dark:border-primary-700 dark:text-slate-200"
            />
          ) : (
            <span
              className="flex-1 min-w-0 ml-1 text-sm text-slate-700 dark:text-slate-300 truncate cursor-pointer"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {project.name}
            </span>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
                setEditName(project.name);
              }}
              className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-700"
              title="Rename"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8.5 1.5 L10.5 3.5 L4 10 L1.5 10.5 L2 8 Z" />
              </svg>
            </button>
            {showConfirmDelete ? (
              <div className="flex items-center gap-0.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(project.id);
                    setShowConfirmDelete(false);
                  }}
                  className="px-1.5 py-0.5 text-xs rounded bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                >
                  Yes
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowConfirmDelete(false);
                  }}
                  className="px-1.5 py-0.5 text-xs rounded bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowConfirmDelete(true);
                }}
                className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:text-slate-500 dark:hover:text-red-400 dark:hover:bg-red-900/20"
                title="Delete"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="2" y1="2" x2="10" y2="10" />
                  <line x1="10" y1="2" x2="2" y2="10" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Expanded notes */}
        {isExpanded && (
          <SidebarNotesExpanded project={project} onUpdateNotes={onUpdateNotes} />
        )}
      </div>
    </div>
  );
}

function SidebarNotesExpanded({
  project,
  onUpdateNotes,
}: {
  project: Project;
  onUpdateNotes: (id: string, notes: string) => void;
}) {
  const saveProjectNote = useStore((s) => s.saveProjectNote);
  const loadProjectNote = useStore((s) => s.loadProjectNote);

  const [showSaveInput, setShowSaveInput] = useState(false);
  const [saveName, setSaveName] = useState('');
  const saveInputRef = useRef<HTMLInputElement>(null);

  const savedNotes = [...(project.savedNotes || [])].sort(
    (a, b) => b.savedAt.localeCompare(a.savedAt)
  );

  return (
    <div className="px-3 pb-3 pl-9">
      <textarea
        value={project.globalNotes}
        onChange={(e) => onUpdateNotes(project.id, e.target.value)}
        placeholder="Project notes..."
        className="notes-editor w-full h-24 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-700 placeholder:text-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:placeholder:text-slate-600"
      />

      {/* Save / saved notes */}
      <div className="mt-1.5">
        {showSaveInput ? (
          <div className="flex items-center gap-1.5">
            <input
              ref={saveInputRef}
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const trimmed = saveName.trim();
                  if (trimmed) {
                    saveProjectNote(project.id, trimmed);
                    setSaveName('');
                    setShowSaveInput(false);
                  }
                }
                if (e.key === 'Escape') {
                  setSaveName('');
                  setShowSaveInput(false);
                }
              }}
              onBlur={() => {
                const trimmed = saveName.trim();
                if (trimmed) {
                  saveProjectNote(project.id, trimmed);
                }
                setSaveName('');
                setShowSaveInput(false);
              }}
              placeholder="Name..."
              className="flex-1 min-w-0 px-2 py-1 text-xs border border-slate-200 rounded bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-200 focus:border-teal-400 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:placeholder:text-slate-500 dark:focus:ring-teal-700 dark:focus:border-teal-600"
            />
          </div>
        ) : (
          <button
            onClick={() => {
              setShowSaveInput(true);
              setTimeout(() => saveInputRef.current?.focus(), 0);
            }}
            disabled={!project.globalNotes.trim()}
            className="text-[11px] text-teal-600 hover:text-teal-700 disabled:text-slate-300 dark:text-teal-400 dark:hover:text-teal-300 dark:disabled:text-slate-600 transition-colors"
          >
            Save notes
          </button>
        )}

        {savedNotes.length > 0 && (
          <div className="mt-1.5 space-y-0.5">
            {savedNotes.map((note) => {
              let dateStr = '';
              try { dateStr = format(new Date(note.savedAt), 'MMM d'); } catch {}
              return (
                <button
                  key={note.id}
                  onClick={() => loadProjectNote(project.id, note.id)}
                  className="w-full text-left flex items-center justify-between px-2 py-1 rounded text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
                  title={`Load "${note.name}"`}
                >
                  <span className="truncate">{note.name}</span>
                  <span className="flex-shrink-0 ml-2 text-[10px] text-slate-400 dark:text-slate-500">{dateStr}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
