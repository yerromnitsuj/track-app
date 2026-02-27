import { useState, useCallback, useMemo } from 'react';
import { parseISO } from 'date-fns';
import useStore from '../store';
import DateNavigator from './DateNavigator';
import DaySection from './DaySection';
import NotesPanel from './NotesPanel';
import ResizeHandle from './ResizeHandle';
import PopulateModal from './PopulateModal';
import WeeklyReport from './WeeklyReport';
import type { DayEntry } from '../types';
import { isMonthInRange, isMonthUpcoming, monthName } from '../utils/monthUtils';

const NOTES_MIN = 120;
const NOTES_MAX = 500;
const NOTES_DEFAULT = 200;

function loadNotesHeight(): number {
  try {
    const saved = localStorage.getItem('track-notes-height');
    if (saved) {
      const n = parseInt(saved, 10);
      if (n >= NOTES_MIN && n <= NOTES_MAX) return n;
    }
  } catch {}
  return NOTES_DEFAULT;
}

interface DayViewProps {
  displayTodayEntries: DayEntry[];
  displayTodayIds: string[];
  displayOnDeckEntries: DayEntry[];
  displayOnDeckIds: string[];
}

export default function DayView({
  displayTodayEntries,
  displayTodayIds,
  displayOnDeckEntries,
  displayOnDeckIds,
}: DayViewProps) {
  const currentDate = useStore((s) => s.currentDate);
  const projects = useStore((s) => s.projects);
  const selectedNotesTarget = useStore((s) => s.selectedNotesTarget);

  const currentMonth = parseISO(currentDate).getMonth() + 1; // 1-12

  const { activeProjects, upcomingProjects } = useMemo(() => {
    const active: string[] = [];
    const upcoming: { name: string; startMonth: number }[] = [];

    for (const p of projects) {
      if (p.archived || p.startMonth == null || p.endMonth == null) continue;
      if (isMonthInRange(currentMonth, p.startMonth, p.endMonth)) {
        active.push(p.name);
      } else if (isMonthUpcoming(currentMonth, p.startMonth)) {
        upcoming.push({ name: p.name, startMonth: p.startMonth });
      }
    }
    return { activeProjects: active, upcomingProjects: upcoming };
  }, [projects, currentMonth]);

  const [showPopulate, setShowPopulate] = useState(false);
  const [showWeekly, setShowWeekly] = useState(false);

  // Notes panel resize
  const [notesHeight, setNotesHeight] = useState(loadNotesHeight);
  const handleNotesResize = useCallback((delta: number) => {
    // Dragging up (negative delta) should increase height
    setNotesHeight((h) => Math.min(NOTES_MAX, Math.max(NOTES_MIN, h - delta)));
  }, []);
  const handleNotesResizeEnd = useCallback(() => {
    setNotesHeight((h) => {
      try { localStorage.setItem('track-notes-height', String(h)); } catch {}
      return h;
    });
  }, []);

  const allEntries = [...displayTodayEntries, ...displayOnDeckEntries];
  const totalTime = allEntries.reduce((sum, e) => sum + e.timeSpent, 0);

  return (
    <div className="flex-1 flex flex-col min-w-0 titlebar-no-drag">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 flex-shrink-0">
        <DateNavigator />
        <div className="flex items-center gap-3">
          {totalTime > 0 && (
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Day total: <span className="text-slate-800 dark:text-slate-200">{Math.round(totalTime * 100) / 100} hrs</span>
            </span>
          )}
        </div>
      </div>

      {/* Active / Upcoming status bar */}
      {(activeProjects.length > 0 || upcomingProjects.length > 0) && (
        <div className="px-6 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-wrap gap-x-4 gap-y-1 text-xs flex-shrink-0">
          {activeProjects.length > 0 && (
            <span className="text-teal-600 dark:text-teal-400">
              <span className="font-medium">Active:</span> {activeProjects.join(', ')}
            </span>
          )}
          {upcomingProjects.length > 0 && (
            <span className="text-amber-600 dark:text-amber-400">
              <span className="font-medium">Upcoming:</span>{' '}
              {upcomingProjects.map((p) => `${p.name} (Begins in ${monthName(p.startMonth)})`).join(', ')}
            </span>
          )}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <DaySection
          title="Today"
          section="today"
          entries={displayTodayEntries}
          entryIds={displayTodayIds}
          date={currentDate}
        />
        <DaySection
          title="On Deck"
          section="onDeck"
          entries={displayOnDeckEntries}
          entryIds={displayOnDeckIds}
          date={currentDate}
        />

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
          <button
            onClick={() => setShowPopulate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="10" height="10" rx="2" />
              <path d="M5 7 L9 7" />
              <path d="M7 5 L9 7 L7 9" />
            </svg>
            Populate from Prior Day
          </button>

          <div className="flex-1" />

          <button
            onClick={() => setShowWeekly(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="12" height="9" rx="1.5" />
              <line x1="1" y1="6" x2="13" y2="6" />
              <line x1="4.5" y1="3" x2="4.5" y2="12" />
              <line x1="9.5" y1="3" x2="9.5" y2="12" />
            </svg>
            Weekly Report
          </button>
        </div>
      </div>

      {/* Notes panel with resize handle */}
      {selectedNotesTarget && (
        <>
          <ResizeHandle direction="vertical" onResize={handleNotesResize} onResizeEnd={handleNotesResizeEnd} />
          <NotesPanel height={notesHeight} />
        </>
      )}

      {/* Modals */}
      <PopulateModal
        isOpen={showPopulate}
        onClose={() => setShowPopulate(false)}
      />
      <WeeklyReport
        isOpen={showWeekly}
        onClose={() => setShowWeekly(false)}
      />
    </div>
  );
}
