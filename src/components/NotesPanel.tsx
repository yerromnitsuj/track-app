import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import useStore from '../store';

interface NotesPanelProps {
  height: number;
}

export default function NotesPanel({ height }: NotesPanelProps) {
  const selectedNotesTarget = useStore((s) => s.selectedNotesTarget);
  const setSelectedNotesTarget = useStore((s) => s.setSelectedNotesTarget);
  const currentDate = useStore((s) => s.currentDate);
  const days = useStore((s) => s.days);
  const projects = useStore((s) => s.projects);
  const updateProjectGlobalNotes = useStore((s) => s.updateProjectGlobalNotes);
  const saveProjectNote = useStore((s) => s.saveProjectNote);
  const loadProjectNote = useStore((s) => s.loadProjectNote);
  const renameProjectNote = useStore((s) => s.renameProjectNote);
  const deleteProjectNote = useStore((s) => s.deleteProjectNote);
  const addDailyTodo = useStore((s) => s.addDailyTodo);
  const updateDailyTodo = useStore((s) => s.updateDailyTodo);
  const removeDailyTodo = useStore((s) => s.removeDailyTodo);

  const [activeTab, setActiveTab] = useState<'daily' | 'global'>('daily');
  const [newTodoText, setNewTodoText] = useState('');
  const newTodoRef = useRef<HTMLInputElement>(null);

  // Saved notes state
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [saveName, setSaveName] = useState('');
  const saveInputRef = useRef<HTMLInputElement>(null);

  if (!selectedNotesTarget) return null;

  const project = projects.find((p) => p.id === selectedNotesTarget.projectId);
  const entry = days[currentDate]?.entries.find(
    (e) => e.id === selectedNotesTarget.entryId
  );

  if (!project || !entry) return null;

  const todos = entry.dailyTodos || [];

  const handleAddTodo = () => {
    const trimmed = newTodoText.trim();
    if (trimmed) {
      addDailyTodo(currentDate, entry.id, trimmed);
      setNewTodoText('');
      // Keep focus on input for rapid entry
      newTodoRef.current?.focus();
    }
  };

  return (
    <div style={{ height }} className="flex flex-col bg-white dark:bg-slate-900 flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {project.name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-md p-0.5">
            <button
              onClick={() => setActiveTab('daily')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                activeTab === 'daily'
                  ? 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              Daily To-Do
            </button>
            <button
              onClick={() => setActiveTab('global')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                activeTab === 'global'
                  ? 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              Global Notes
            </button>
          </div>

          {/* Close button */}
          <button
            onClick={() => setSelectedNotesTarget(null)}
            className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="2" y1="2" x2="8" y2="8" />
              <line x1="8" y1="2" x2="2" y2="8" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTab === 'daily' ? (
          <div className="p-4">
            {/* Todo list */}
            <div className="space-y-1 mb-3">
              {todos.map((todo) => (
                <TodoRow
                  key={todo.id}
                  todoId={todo.id}
                  text={todo.text}
                  done={todo.done}
                  onToggle={() =>
                    updateDailyTodo(currentDate, entry.id, todo.id, { done: !todo.done })
                  }
                  onUpdateText={(text) =>
                    updateDailyTodo(currentDate, entry.id, todo.id, { text })
                  }
                  onRemove={() => removeDailyTodo(currentDate, entry.id, todo.id)}
                />
              ))}
              {todos.length === 0 && (
                <p className="text-xs text-slate-400 dark:text-slate-500 py-1">
                  No to-do items yet
                </p>
              )}
            </div>

            {/* Add todo input */}
            <div className="flex items-center gap-2">
              <input
                ref={newTodoRef}
                type="text"
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTodo();
                }}
                placeholder="Add a to-do..."
                className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-200 focus:border-teal-400 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:placeholder:text-slate-500 dark:focus:ring-teal-700 dark:focus:border-teal-600"
              />
              <button
                onClick={handleAddTodo}
                disabled={!newTodoText.trim()}
                className="px-3 py-1.5 text-sm font-medium text-white bg-teal-500 hover:bg-teal-600 disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-700 dark:disabled:text-slate-500 rounded-lg transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 flex flex-col gap-3">
            {/* Active notes textarea */}
            <textarea
              value={project.globalNotes}
              onChange={(e) =>
                updateProjectGlobalNotes(project.id, e.target.value)
              }
              placeholder={`Global notes for ${project.name}...`}
              className="notes-editor w-full min-h-[80px] px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-700 placeholder:text-slate-400 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:placeholder:text-slate-500"
            />

            {/* Save current notes */}
            {showSaveInput ? (
              <div className="flex items-center gap-2">
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
                  placeholder="Name for saved notes..."
                  className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-200 focus:border-teal-400 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:placeholder:text-slate-500 dark:focus:ring-teal-700 dark:focus:border-teal-600"
                />
              </div>
            ) : (
              <button
                onClick={() => {
                  setShowSaveInput(true);
                  setTimeout(() => saveInputRef.current?.focus(), 0);
                }}
                disabled={!project.globalNotes.trim()}
                className="self-start flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-600 hover:text-teal-700 hover:bg-teal-50 disabled:text-slate-300 disabled:hover:bg-transparent dark:text-teal-400 dark:hover:text-teal-300 dark:hover:bg-teal-900/20 dark:disabled:text-slate-600 dark:disabled:hover:bg-transparent rounded-md transition-colors"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 9H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h4.5L9 3.5V8a1 1 0 0 1-1 1Z" />
                  <path d="M7 9V6H3v3" />
                  <path d="M3 1v2h3" />
                </svg>
                Save current notes
              </button>
            )}

            {/* Saved notes list */}
            {(project.savedNotes || []).length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Saved Notes
                </h4>
                <div className="space-y-1">
                  {[...(project.savedNotes || [])]
                    .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
                    .map((note) => (
                      <SavedNoteRow
                        key={note.id}
                        noteId={note.id}
                        name={note.name}
                        savedAt={note.savedAt}
                        onLoad={() => loadProjectNote(project.id, note.id)}
                        onRename={(name) => renameProjectNote(project.id, note.id, name)}
                        onDelete={() => deleteProjectNote(project.id, note.id)}
                      />
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TodoRow({
  todoId,
  text,
  done,
  onToggle,
  onUpdateText,
  onRemove,
}: {
  todoId: string;
  text: string;
  done: boolean;
  onToggle: () => void;
  onUpdateText: (text: string) => void;
  onRemove: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(text);
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && editRef.current) {
      editRef.current.focus();
      editRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== text) {
      onUpdateText(trimmed);
    } else {
      setEditText(text);
    }
    setIsEditing(false);
  };

  return (
    <div className="group flex items-center gap-2 py-1 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 px-1 -mx-1">
      {/* Checkbox */}
      <button
        onClick={onToggle}
        className={`flex-shrink-0 w-5 h-5 flex items-center justify-center rounded border transition-colors ${
          done
            ? 'bg-emerald-500 border-emerald-500 text-white'
            : 'border-slate-300 dark:border-slate-600 text-transparent hover:border-slate-400 dark:hover:border-slate-500'
        }`}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1.5 5 L4 7.5 L8.5 2.5" />
        </svg>
      </button>

      {/* Text */}
      {isEditing ? (
        <input
          ref={editRef}
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') {
              setEditText(text);
              setIsEditing(false);
            }
          }}
          onBlur={handleSave}
          className="flex-1 min-w-0 px-1.5 py-0.5 text-sm border border-teal-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-200 dark:bg-slate-800 dark:border-teal-700 dark:text-slate-200"
        />
      ) : (
        <span
          className={`flex-1 min-w-0 text-sm truncate cursor-pointer ${
            done
              ? 'line-through text-slate-400 dark:text-slate-500'
              : 'text-slate-700 dark:text-slate-300'
          }`}
          onDoubleClick={() => {
            setIsEditing(true);
            setEditText(text);
          }}
        >
          {text}
        </span>
      )}

      {/* Edit */}
      <button
        onClick={() => { setIsEditing(true); setEditText(text); }}
        className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded text-slate-300 opacity-0 group-hover:opacity-100 hover:text-slate-600 dark:text-slate-600 dark:hover:text-slate-300 transition-colors"
        title="Edit"
      >
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8.5 1.5 L10.5 3.5 L4 10 L1.5 10.5 L2 8 Z" />
        </svg>
      </button>

      {/* Remove */}
      <button
        onClick={onRemove}
        className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded text-slate-300 opacity-0 group-hover:opacity-100 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 transition-colors"
        title="Remove"
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <line x1="1" y1="1" x2="7" y2="7" />
          <line x1="7" y1="1" x2="1" y2="7" />
        </svg>
      </button>
    </div>
  );
}

function SavedNoteRow({
  noteId,
  name,
  savedAt,
  onLoad,
  onRename,
  onDelete,
}: {
  noteId: string;
  name: string;
  savedAt: string;
  onLoad: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && editRef.current) {
      editRef.current.focus();
      editRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== name) {
      onRename(trimmed);
    } else {
      setEditName(name);
    }
    setIsEditing(false);
  };

  const dateStr = (() => {
    try {
      return format(new Date(savedAt), 'MMM d, yyyy');
    } catch {
      return '';
    }
  })();

  return (
    <div className="group flex items-center gap-2 py-1.5 px-2 -mx-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800">
      {/* Name & date */}
      {isEditing ? (
        <input
          ref={editRef}
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') {
              setEditName(name);
              setIsEditing(false);
            }
          }}
          onBlur={handleSave}
          className="flex-1 min-w-0 px-1.5 py-0.5 text-sm border border-teal-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-200 dark:bg-slate-800 dark:border-teal-700 dark:text-slate-200"
        />
      ) : (
        <div className="flex-1 min-w-0">
          <span className="text-sm text-slate-700 dark:text-slate-300 truncate block">{name}</span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">{dateStr}</span>
        </div>
      )}

      {/* Actions */}
      {confirmDelete ? (
        <div className="flex items-center gap-1">
          <button
            onClick={() => { onDelete(); setConfirmDelete(false); }}
            className="px-1.5 py-0.5 text-xs rounded bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
          >
            Yes
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="px-1.5 py-0.5 text-xs rounded bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600"
          >
            No
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onLoad}
            className="px-2 py-0.5 text-xs font-medium rounded text-teal-600 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-900/20 transition-colors"
            title="Load these notes"
          >
            Load
          </button>
          <button
            onClick={() => { setIsEditing(true); setEditName(name); }}
            className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-700"
            title="Rename"
          >
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8.5 1.5 L10.5 3.5 L4 10 L1.5 10.5 L2 8 Z" />
            </svg>
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:text-slate-500 dark:hover:text-red-400 dark:hover:bg-red-900/20"
            title="Delete"
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="1" y1="1" x2="7" y2="7" />
              <line x1="7" y1="1" x2="1" y2="7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
