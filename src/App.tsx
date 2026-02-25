import { useEffect, useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import useStore from './store';
import Sidebar from './components/Sidebar';
import DayView from './components/DayView';
import DarkModeToggle from './components/DarkModeToggle';
import ResizeHandle from './components/ResizeHandle';
import Onboarding from './components/Onboarding';
import DataMenu from './components/DataMenu';
import type { Section, DayEntry } from './types';

const SIDEBAR_MIN = 200;
const SIDEBAR_MAX = 500;
const SIDEBAR_DEFAULT = 288; // 72 * 4 (w-72)

function loadSidebarWidth(): number {
  try {
    const saved = localStorage.getItem('track-sidebar-width');
    if (saved) {
      const n = parseInt(saved, 10);
      if (n >= SIDEBAR_MIN && n <= SIDEBAR_MAX) return n;
    }
  } catch {}
  return SIDEBAR_DEFAULT;
}

// Prefix used for project drags from sidebar
const PROJECT_PREFIX = 'project-';

export default function App() {
  const initialize = useStore((s) => s.initialize);
  const isLoaded = useStore((s) => s.isLoaded);
  const projects = useStore((s) => s.projects);
  const todayEntries = useStore((s) => s.getTodayEntries());
  const onDeckEntries = useStore((s) => s.getOnDeckEntries());
  const addEntry = useStore((s) => s.addEntry);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [localTodayIds, setLocalTodayIds] = useState<string[] | null>(null);
  const [localOnDeckIds, setLocalOnDeckIds] = useState<string[] | null>(null);

  // Sidebar resize
  const [sidebarWidth, setSidebarWidth] = useState(loadSidebarWidth);
  const handleSidebarResize = useCallback((delta: number) => {
    setSidebarWidth((w) => Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, w + delta)));
  }, []);
  const handleSidebarResizeEnd = useCallback(() => {
    setSidebarWidth((w) => {
      try { localStorage.setItem('track-sidebar-width', String(w)); } catch {}
      return w;
    });
  }, []);

  useEffect(() => {
    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const isProjectDrag = activeId?.startsWith(PROJECT_PREFIX) ?? false;

  // ── Drag handlers ──

  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.id as string;
    setActiveId(id);

    // Only initialize local ID arrays for entry drags (not project drags)
    if (!id.startsWith(PROJECT_PREFIX)) {
      setLocalTodayIds(todayEntries.map((e) => e.id));
      setLocalOnDeckIds(onDeckEntries.map((e) => e.id));
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeEntryId = active.id as string;

    // Skip reorder logic for project drags — those just need the drop target
    if (activeEntryId.startsWith(PROJECT_PREFIX)) return;

    const overId = over.id as string;

    const currentTodayIds = localTodayIds ?? todayEntries.map((e) => e.id);
    const currentOnDeckIds = localOnDeckIds ?? onDeckEntries.map((e) => e.id);

    const activeSection = currentTodayIds.includes(activeEntryId)
      ? 'today'
      : currentOnDeckIds.includes(activeEntryId)
        ? 'onDeck'
        : null;
    if (!activeSection) return;

    let targetSection: Section | null = null;
    if (overId === 'section-today') targetSection = 'today';
    else if (overId === 'section-onDeck') targetSection = 'onDeck';
    else if (currentTodayIds.includes(overId)) targetSection = 'today';
    else if (currentOnDeckIds.includes(overId)) targetSection = 'onDeck';

    if (!targetSection) return;

    if (activeSection !== targetSection) {
      const fromIds = activeSection === 'today' ? [...currentTodayIds] : [...currentOnDeckIds];
      const toIds = targetSection === 'today' ? [...currentTodayIds] : [...currentOnDeckIds];

      const idx = fromIds.indexOf(activeEntryId);
      if (idx === -1) return;
      fromIds.splice(idx, 1);

      if (overId.startsWith('section-')) {
        toIds.push(activeEntryId);
      } else {
        const overIdx = toIds.indexOf(overId);
        if (overIdx >= 0) {
          toIds.splice(overIdx, 0, activeEntryId);
        } else {
          toIds.push(activeEntryId);
        }
      }

      if (activeSection === 'today') {
        setLocalTodayIds(fromIds);
        setLocalOnDeckIds(toIds);
      } else {
        setLocalOnDeckIds(fromIds);
        setLocalTodayIds(toIds);
      }
    } else if (!overId.startsWith('section-') && overId !== activeEntryId) {
      const ids = activeSection === 'today' ? [...currentTodayIds] : [...currentOnDeckIds];
      const oldIndex = ids.indexOf(activeEntryId);
      const newIndex = ids.indexOf(overId);
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const reordered = arrayMove(ids, oldIndex, newIndex);
        if (activeSection === 'today') {
          setLocalTodayIds(reordered);
        } else {
          setLocalOnDeckIds(reordered);
        }
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const draggedId = active.id as string;

    setActiveId(null);

    // ── Project drag from sidebar ──
    if (draggedId.startsWith(PROJECT_PREFIX)) {
      setLocalTodayIds(null);
      setLocalOnDeckIds(null);

      if (!over) return;

      const overId = over.id as string;
      const projectId = draggedId.slice(PROJECT_PREFIX.length);

      // Determine which section it was dropped on
      let targetSection: Section | null = null;
      if (overId === 'section-today') targetSection = 'today';
      else if (overId === 'section-onDeck') targetSection = 'onDeck';
      else {
        // Dropped on an existing entry — figure out which section that entry is in
        const state = useStore.getState();
        const date = state.currentDate;
        const dayEntries = state.days[date]?.entries || [];
        const overEntry = dayEntries.find((e) => e.id === overId);
        if (overEntry) targetSection = overEntry.section;
      }

      if (targetSection) {
        addEntry(projectId, targetSection);
      }
      return;
    }

    // ── Entry drag (reorder / cross-section) ──
    const finalTodayIds = localTodayIds;
    const finalOnDeckIds = localOnDeckIds;

    setLocalTodayIds(null);
    setLocalOnDeckIds(null);

    if (!finalTodayIds || !finalOnDeckIds) return;

    const date = useStore.getState().currentDate;
    const state = useStore.getState();
    const dayData = state.days[date];
    if (!dayData) return;

    const newEntries: DayEntry[] = [];
    finalTodayIds.forEach((id, i) => {
      const entry = dayData.entries.find((e) => e.id === id);
      if (entry) newEntries.push({ ...entry, section: 'today', order: i });
    });
    finalOnDeckIds.forEach((id, i) => {
      const entry = dayData.entries.find((e) => e.id === id);
      if (entry) newEntries.push({ ...entry, section: 'onDeck', order: i });
    });

    useStore.setState({
      days: {
        ...state.days,
        [date]: { ...dayData, entries: newEntries },
      },
    });
    useStore.getState().persist();
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setLocalTodayIds(null);
    setLocalOnDeckIds(null);
  };

  // ── Overlay content ──
  const allEntries = [...todayEntries, ...onDeckEntries];

  let overlayContent: React.ReactNode = null;
  if (activeId) {
    if (isProjectDrag) {
      const projectId = activeId.slice(PROJECT_PREFIX.length);
      const project = projects.find((p) => p.id === projectId);
      if (project) {
        overlayContent = (
          <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 opacity-95 cursor-grabbing">
            <svg width="8" height="14" viewBox="0 0 8 14" fill="#94a3b8">
              <circle cx="2" cy="2" r="1.2" />
              <circle cx="6" cy="2" r="1.2" />
              <circle cx="2" cy="7" r="1.2" />
              <circle cx="6" cy="7" r="1.2" />
              <circle cx="2" cy="12" r="1.2" />
              <circle cx="6" cy="12" r="1.2" />
            </svg>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {project.name}
            </span>
          </div>
        );
      }
    } else {
      const entry = allEntries.find((e) => e.id === activeId);
      const project = entry ? projects.find((p) => p.id === entry.projectId) : null;
      if (entry && project) {
        overlayContent = (
          <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 opacity-95 cursor-grabbing">
            <svg width="8" height="14" viewBox="0 0 8 14" fill="#94a3b8">
              <circle cx="2" cy="2" r="1.2" />
              <circle cx="6" cy="2" r="1.2" />
              <circle cx="2" cy="7" r="1.2" />
              <circle cx="6" cy="7" r="1.2" />
              <circle cx="2" cy="12" r="1.2" />
              <circle cx="6" cy="12" r="1.2" />
            </svg>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {project.name}
            </span>
            {entry.timeSpent > 0 && (
              <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                {entry.timeSpent} hr
              </span>
            )}
          </div>
        );
      }
    }
  }

  // ── Compute display entries for DayView ──
  const displayTodayIds = localTodayIds ?? todayEntries.map((e) => e.id);
  const displayOnDeckIds = localOnDeckIds ?? onDeckEntries.map((e) => e.id);

  const displayTodayEntries = displayTodayIds
    .map((id) => allEntries.find((e) => e.id === id))
    .filter(Boolean) as DayEntry[];
  const displayOnDeckEntries = displayOnDeckIds
    .map((id) => allEntries.find((e) => e.id === id))
    .filter(Boolean) as DayEntry[];

  if (!isLoaded) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-slate-400 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      {/* Titlebar drag region */}
      <div className="titlebar-drag h-14 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex-shrink-0 flex items-center justify-between px-20">
        <div />
        <div className="flex items-center gap-4 select-none">
          <svg width="48" height="16" viewBox="0 0 24 8" className="text-slate-300 dark:text-slate-600">
            <circle cx="4" cy="4" r="1.5" fill="currentColor" />
            <circle cx="12" cy="4" r="2.5" fill="currentColor" />
            <circle cx="21" cy="4" r="3.5" fill="currentColor" />
          </svg>
          <span className="text-2xl font-bold text-slate-400 dark:text-slate-500 tracking-[0.3em] uppercase">Track</span>
          <svg width="48" height="16" viewBox="0 0 24 8" className="text-slate-300 dark:text-slate-600">
            <circle cx="3" cy="4" r="3.5" fill="currentColor" />
            <circle cx="12" cy="4" r="2.5" fill="currentColor" />
            <circle cx="20" cy="4" r="1.5" fill="currentColor" />
          </svg>
        </div>
        <div className="titlebar-no-drag flex items-center gap-1">
          <DataMenu />
          <DarkModeToggle />
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex flex-1 min-h-0">
          <Sidebar width={sidebarWidth} />
          <ResizeHandle direction="horizontal" onResize={handleSidebarResize} onResizeEnd={handleSidebarResizeEnd} />
          <DayView
            displayTodayEntries={displayTodayEntries}
            displayTodayIds={displayTodayIds}
            displayOnDeckEntries={displayOnDeckEntries}
            displayOnDeckIds={displayOnDeckIds}
          />
        </div>

        <DragOverlay dropAnimation={null}>
          {overlayContent}
        </DragOverlay>
      </DndContext>

      <Onboarding />
    </div>
  );
}
