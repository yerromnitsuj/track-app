import { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import useStore from '../store';

interface EntryRowProps {
  entryId: string;
  projectId: string;
  projectName: string;
  timeSpent: number;
  done: boolean;
  date: string;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}

export default function EntryRow({
  entryId,
  projectId,
  projectName,
  timeSpent,
  done,
  date,
  isSelected,
  onSelect,
  onRemove,
}: EntryRowProps) {
  const updateEntryTime = useStore((s) => s.updateEntryTime);
  const updateEntryDone = useStore((s) => s.updateEntryDone);

  const [timeValue, setTimeValue] = useState(timeSpent === 0 ? '' : String(timeSpent));
  const timeInputRef = useRef<HTMLInputElement>(null);

  // Sync external time changes
  useEffect(() => {
    setTimeValue(timeSpent === 0 ? '' : String(timeSpent));
  }, [timeSpent]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entryId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
  };

  const handleTimeChange = (val: string) => {
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setTimeValue(val);
    }
  };

  const handleTimeBlur = () => {
    const num = parseFloat(timeValue);
    if (isNaN(num) || num < 0) {
      setTimeValue(timeSpent === 0 ? '' : String(timeSpent));
      updateEntryTime(date, entryId, 0);
    } else {
      const capped = Math.min(num, 24);
      const rounded = Math.round(capped * 100) / 100;
      setTimeValue(rounded === 0 ? '' : String(rounded));
      updateEntryTime(date, entryId, rounded);
    }
  };

  const handleTimeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      timeInputRef.current?.blur();
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const current = parseFloat(timeValue) || 0;
      const step = e.shiftKey ? 1 : 0.25;
      const newVal = Math.round((current + step) * 100) / 100;
      setTimeValue(String(newVal));
      updateEntryTime(date, entryId, newVal);
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const current = parseFloat(timeValue) || 0;
      const step = e.shiftKey ? 1 : 0.25;
      const newVal = Math.max(0, Math.round((current - step) * 100) / 100);
      setTimeValue(newVal === 0 ? '' : String(newVal));
      updateEntryTime(date, entryId, newVal);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg ${
        isSelected
          ? 'bg-teal-50 ring-1 ring-teal-200 dark:bg-teal-900/20 dark:ring-teal-700'
          : 'hover:bg-slate-50 dark:hover:bg-slate-800'
      } ${done ? 'opacity-60' : ''}`}
    >
      {/* Drag handle */}
      <button
        className="drag-handle flex-shrink-0 w-5 h-8 flex items-center justify-center text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 rounded"
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

      {/* Project name */}
      <button
        onClick={onSelect}
        className={`flex-1 min-w-0 text-left text-sm truncate px-2 py-1 rounded-md transition-colors ${
          done
            ? 'line-through text-slate-400 dark:text-slate-500'
            : 'text-slate-700 hover:text-teal-700 dark:text-slate-300 dark:hover:text-teal-400'
        } ${isSelected ? 'font-medium text-teal-700 dark:text-teal-400' : ''}`}
      >
        {projectName}
      </button>

      {/* Time input */}
      <div className="flex-shrink-0 w-20">
        <input
          ref={timeInputRef}
          type="text"
          value={timeValue}
          onChange={(e) => handleTimeChange(e.target.value)}
          onBlur={handleTimeBlur}
          onKeyDown={handleTimeKeyDown}
          placeholder="0"
          className={`w-full px-2 py-1 text-sm text-right border rounded-md transition-colors focus:outline-none focus:ring-1 focus:ring-teal-200 focus:border-teal-400 dark:focus:ring-teal-700 dark:focus:border-teal-600 ${
            done
              ? 'bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-500'
              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300 dark:hover:border-slate-500'
          }`}
          title="Hours (use arrows to adjust by 0.25, Shift+arrows for 1.0)"
        />
      </div>

      {/* Hours label */}
      <span className="flex-shrink-0 text-xs text-slate-400 dark:text-slate-500 w-5">hr</span>

      {/* Done checkbox */}
      <button
        onClick={() => updateEntryDone(date, entryId, !done)}
        className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md border transition-colors ${
          done
            ? 'bg-emerald-500 border-emerald-500 text-white'
            : 'border-slate-300 text-transparent hover:border-slate-400 dark:border-slate-600 dark:hover:border-slate-500'
        }`}
        title={done ? 'Mark as incomplete' : 'Mark as done'}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 6 L5 9 L10 3" />
        </svg>
      </button>

      {/* Remove button */}
      <button
        onClick={onRemove}
        className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-slate-300 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 dark:text-slate-600 dark:hover:text-red-400 dark:hover:bg-red-900/20 transition-colors"
        title="Remove from day"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <line x1="2" y1="2" x2="8" y2="8" />
          <line x1="8" y1="2" x2="2" y2="8" />
        </svg>
      </button>
    </div>
  );
}
