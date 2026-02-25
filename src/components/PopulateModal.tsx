import { useState, useEffect, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import useStore from '../store';

interface PopulateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PopulateModal({ isOpen, onClose }: PopulateModalProps) {
  const currentDate = useStore((s) => s.currentDate);
  const datesWithEntries = useStore((s) => s.getDatesWithEntries());
  const days = useStore((s) => s.days);
  const projects = useStore((s) => s.projects);
  const populateFromDay = useStore((s) => s.populateFromDay);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [importTodos, setImportTodos] = useState(true);
  const modalRef = useRef<HTMLDivElement>(null);

  const availableDates = datesWithEntries.filter((d) => d !== currentDate);

  useEffect(() => {
    if (isOpen) {
      setSelectedDate(null);
      setImportTodos(true);
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePopulate = () => {
    if (selectedDate) {
      populateFromDay(selectedDate, importTodos);
      onClose();
    }
  };

  // Count incomplete todos for the selected date
  const incompleteTodoCount = (() => {
    if (!selectedDate) return 0;
    const dayData = days[selectedDate];
    if (!dayData) return 0;
    return dayData.entries.reduce((count, entry) => {
      return count + (entry.dailyTodos || []).filter((t) => !t.done).length;
    }, 0);
  })();

  const getProjectNamesForDate = (date: string): string[] => {
    const dayData = days[date];
    if (!dayData) return [];
    const uniqueProjectIds = [...new Set(dayData.entries.map((e) => e.projectId))];
    return uniqueProjectIds.map((id) => {
      const project = projects.find((p) => p.id === id);
      return project ? project.name : '(Deleted)';
    });
  };

  return (
    <div className="fixed inset-0 bg-black/30 dark:bg-black/50 flex items-center justify-center z-50">
      <div
        ref={modalRef}
        className="w-[440px] max-h-[500px] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            Populate from Prior Day
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Copy project entries to {format(parseISO(currentDate), 'MMM d, yyyy')}. Time and status will not be copied.
          </p>
        </div>

        {/* Date list */}
        <div className="max-h-[300px] overflow-y-auto p-3">
          {availableDates.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
              No other days with entries found.
            </div>
          ) : (
            availableDates.map((date) => {
              const projectNames = getProjectNamesForDate(date);
              const isSelected = selectedDate === date;
              return (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`w-full text-left px-4 py-3 rounded-xl mb-1 transition-colors ${
                    isSelected
                      ? 'bg-primary-50 ring-2 ring-primary-300 dark:bg-primary-900/20 dark:ring-primary-600'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {projectNames.join(', ')}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Incomplete todos option */}
        {selectedDate && incompleteTodoCount > 0 && (
          <div className="px-6 py-2.5 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <button
                type="button"
                onClick={() => setImportTodos(!importTodos)}
                className={`flex-shrink-0 w-4 h-4 flex items-center justify-center rounded border transition-colors ${
                  importTodos
                    ? 'bg-teal-500 border-teal-500 text-white'
                    : 'border-slate-300 dark:border-slate-600 text-transparent hover:border-slate-400 dark:hover:border-slate-500'
                }`}
              >
                <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1.5 5 L4 7.5 L8.5 2.5" />
                </svg>
              </button>
              <span className="text-sm text-slate-600 dark:text-slate-300">
                Import {incompleteTodoCount} incomplete to-do{incompleteTodoCount !== 1 ? 's' : ''}
              </span>
            </label>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePopulate}
            disabled={!selectedDate}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              selectedDate
                ? 'bg-primary-500 text-white hover:bg-primary-600 shadow-sm'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500'
            }`}
          >
            Populate
          </button>
        </div>
      </div>
    </div>
  );
}
