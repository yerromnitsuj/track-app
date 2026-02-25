import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import type { Project, DayEntry, AppData, Section, TodoItem, SavedNote } from './types';

// Debounce utility for persistence
let persistTimer: ReturnType<typeof setTimeout> | null = null;
function debouncedPersist(fn: () => void) {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(fn, 150);
}

// IndexedDB helpers for more durable browser storage
const IDB_NAME = 'track-db';
const IDB_STORE = 'app-data';
const IDB_KEY = 'data';

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbLoad(): Promise<AppData | null> {
  try {
    const db = await openIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(IDB_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function idbSave(data: AppData): Promise<void> {
  try {
    const db = await openIDB();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(data, IDB_KEY);
  } catch {}
}

declare global {
  interface Window {
    electronAPI?: {
      loadData: () => Promise<AppData>;
      saveData: (data: AppData) => Promise<boolean>;
      getDataPath: () => Promise<string>;
    };
  }
}

interface NotesTarget {
  entryId: string;
  projectId: string;
}

interface AppState {
  // Data
  projects: Project[];
  days: Record<string, { date: string; entries: DayEntry[] }>;

  // UI state
  currentDate: string;
  selectedNotesTarget: NotesTarget | null;
  isLoaded: boolean;
  darkMode: boolean;

  // Initialization
  initialize: () => Promise<void>;

  // Persistence
  persist: () => Promise<void>;

  // Theme
  toggleDarkMode: () => void;

  // Project actions
  addProject: (name: string) => void;
  renameProject: (id: string, name: string) => void;
  deleteProject: (id: string) => void;
  updateProjectGlobalNotes: (id: string, notes: string) => void;
  saveProjectNote: (projectId: string, name: string) => void;
  loadProjectNote: (projectId: string, noteId: string) => void;
  renameProjectNote: (projectId: string, noteId: string, name: string) => void;
  deleteProjectNote: (projectId: string, noteId: string) => void;

  // Date navigation
  setCurrentDate: (date: string) => void;

  // Entry actions
  addEntry: (projectId: string, section: Section) => void;
  removeEntry: (date: string, entryId: string) => void;
  updateEntryTime: (date: string, entryId: string, time: number) => void;
  updateEntryDone: (date: string, entryId: string, done: boolean) => void;
  addDailyTodo: (date: string, entryId: string, text: string) => void;
  updateDailyTodo: (date: string, entryId: string, todoId: string, updates: { text?: string; done?: boolean }) => void;
  removeDailyTodo: (date: string, entryId: string, todoId: string) => void;
  moveEntry: (date: string, entryId: string, toSection: Section, newIndex: number) => void;
  reorderEntries: (date: string, section: Section, entryIds: string[]) => void;

  // Notes panel
  setSelectedNotesTarget: (target: NotesTarget | null) => void;

  // Populate
  populateFromDay: (sourceDate: string, importIncompleteTodos?: boolean) => void;

  // Export / Import
  exportData: () => void;
  importData: (data: AppData) => void;

  // Helpers
  getEntriesForDate: (date: string) => DayEntry[];
  getTodayEntries: () => DayEntry[];
  getOnDeckEntries: () => DayEntry[];
  getProjectById: (id: string) => Project | undefined;
  getDatesWithEntries: () => string[];
}

const useStore = create<AppState>((set, get) => ({
  projects: [],
  days: {},
  currentDate: format(new Date(), 'yyyy-MM-dd'),
  selectedNotesTarget: null,
  isLoaded: false,
  darkMode: false,

  toggleDarkMode: () => {
    set((state) => {
      const newMode = !state.darkMode;
      // Apply to document
      if (newMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      // Save preference
      try {
        localStorage.setItem('track-dark-mode', String(newMode));
      } catch {}
      return { darkMode: newMode };
    });
  },

  initialize: async () => {
    // Restore dark mode preference
    try {
      const savedDark = localStorage.getItem('track-dark-mode');
      if (savedDark === 'true') {
        document.documentElement.classList.add('dark');
        set({ darkMode: true });
      }
    } catch {}

    // Migrate loaded data to ensure new fields exist on old records
    const migrateData = (data: { projects?: Project[]; days?: Record<string, { date: string; entries: DayEntry[] }> }) => {
      const projects = (data.projects || []).map((p: Project) => ({
        ...p,
        savedNotes: p.savedNotes || [],
      }));
      const rawDays = data.days || {};
      const days: Record<string, { date: string; entries: DayEntry[] }> = {};
      for (const [date, dayData] of Object.entries(rawDays)) {
        days[date] = {
          ...dayData,
          entries: (dayData.entries || []).map((e: DayEntry) => ({
            ...e,
            dailyTodos: Array.isArray(e.dailyTodos) ? e.dailyTodos : [],
          })),
        };
      }
      return { projects, days };
    };

    if (window.electronAPI) {
      try {
        const data = await window.electronAPI.loadData();
        const { projects, days } = migrateData(data);
        set({ projects, days, isLoaded: true });
      } catch (err) {
        console.error('Failed to load data:', err);
        set({ isLoaded: true });
      }
    } else {
      // Browser: try IndexedDB first, then localStorage fallback
      try {
        let data = await idbLoad();
        if (!data) {
          // Migrate from localStorage if exists
          const raw = localStorage.getItem('track-data');
          if (raw) {
            data = JSON.parse(raw);
          }
        }
        if (data) {
          const { projects, days } = migrateData(data);
          set({ projects, days, isLoaded: true });
          // Ensure IndexedDB has the data
          idbSave({ projects, days });
        } else {
          set({ isLoaded: true });
        }
      } catch {
        set({ isLoaded: true });
      }
    }
  },

  persist: async () => {
    debouncedPersist(async () => {
      const { projects, days } = get();
      const data: AppData = { projects, days };
      if (window.electronAPI) {
        await window.electronAPI.saveData(data);
      } else {
        // Write to both IndexedDB (primary) and localStorage (backup)
        idbSave(data);
        try { localStorage.setItem('track-data', JSON.stringify(data)); } catch {}
      }
    });
  },

  // Project actions
  addProject: (name: string) => {
    const project: Project = {
      id: uuidv4(),
      name,
      globalNotes: '',
      savedNotes: [],
      createdAt: new Date().toISOString(),
      archived: false,
    };
    set((state) => ({ projects: [...state.projects, project] }));
    get().persist();
  },

  renameProject: (id: string, name: string) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, name } : p
      ),
    }));
    get().persist();
  },

  deleteProject: (id: string) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, archived: true } : p
      ),
    }));
    get().persist();
  },

  updateProjectGlobalNotes: (id: string, notes: string) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, globalNotes: notes } : p
      ),
    }));
    get().persist();
  },

  saveProjectNote: (projectId: string, name: string) => {
    set((state) => ({
      projects: state.projects.map((p) => {
        if (p.id !== projectId) return p;
        const saved: SavedNote = {
          id: uuidv4(),
          name,
          content: p.globalNotes,
          savedAt: new Date().toISOString(),
        };
        return { ...p, savedNotes: [...(p.savedNotes || []), saved] };
      }),
    }));
    get().persist();
  },

  loadProjectNote: (projectId: string, noteId: string) => {
    set((state) => ({
      projects: state.projects.map((p) => {
        if (p.id !== projectId) return p;
        const note = (p.savedNotes || []).find((n) => n.id === noteId);
        if (!note) return p;
        return { ...p, globalNotes: note.content };
      }),
    }));
    get().persist();
  },

  renameProjectNote: (projectId: string, noteId: string, name: string) => {
    set((state) => ({
      projects: state.projects.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          savedNotes: (p.savedNotes || []).map((n) =>
            n.id === noteId ? { ...n, name } : n
          ),
        };
      }),
    }));
    get().persist();
  },

  deleteProjectNote: (projectId: string, noteId: string) => {
    set((state) => ({
      projects: state.projects.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          savedNotes: (p.savedNotes || []).filter((n) => n.id !== noteId),
        };
      }),
    }));
    get().persist();
  },

  // Date navigation
  setCurrentDate: (date: string) => {
    set({ currentDate: date, selectedNotesTarget: null });
  },

  // Entry actions
  addEntry: (projectId: string, section: Section) => {
    const { currentDate, days } = get();
    const dayData = days[currentDate] || { date: currentDate, entries: [] };
    const sectionEntries = dayData.entries.filter((e) => e.section === section);
    const newEntry: DayEntry = {
      id: uuidv4(),
      projectId,
      section,
      timeSpent: 0,
      done: false,
      dailyTodos: [],
      order: sectionEntries.length,
    };
    set((state) => ({
      days: {
        ...state.days,
        [currentDate]: {
          date: currentDate,
          entries: [...(state.days[currentDate]?.entries || []), newEntry],
        },
      },
    }));
    get().persist();
  },

  removeEntry: (date: string, entryId: string) => {
    set((state) => {
      const dayData = state.days[date];
      if (!dayData) return state;
      const updatedEntries = dayData.entries.filter((e) => e.id !== entryId);
      return {
        days: {
          ...state.days,
          [date]: { ...dayData, entries: updatedEntries },
        },
        selectedNotesTarget:
          state.selectedNotesTarget?.entryId === entryId
            ? null
            : state.selectedNotesTarget,
      };
    });
    get().persist();
  },

  updateEntryTime: (date: string, entryId: string, time: number) => {
    set((state) => {
      const dayData = state.days[date];
      if (!dayData) return state;
      return {
        days: {
          ...state.days,
          [date]: {
            ...dayData,
            entries: dayData.entries.map((e) =>
              e.id === entryId ? { ...e, timeSpent: time } : e
            ),
          },
        },
      };
    });
    get().persist();
  },

  updateEntryDone: (date: string, entryId: string, done: boolean) => {
    set((state) => {
      const dayData = state.days[date];
      if (!dayData) return state;
      return {
        days: {
          ...state.days,
          [date]: {
            ...dayData,
            entries: dayData.entries.map((e) =>
              e.id === entryId ? { ...e, done } : e
            ),
          },
        },
      };
    });
    get().persist();
  },

  addDailyTodo: (date: string, entryId: string, text: string) => {
    const todo: TodoItem = { id: uuidv4(), text, done: false };
    set((state) => {
      const dayData = state.days[date];
      if (!dayData) return state;
      return {
        days: {
          ...state.days,
          [date]: {
            ...dayData,
            entries: dayData.entries.map((e) =>
              e.id === entryId
                ? { ...e, dailyTodos: [...(e.dailyTodos || []), todo] }
                : e
            ),
          },
        },
      };
    });
    get().persist();
  },

  updateDailyTodo: (date: string, entryId: string, todoId: string, updates: { text?: string; done?: boolean }) => {
    set((state) => {
      const dayData = state.days[date];
      if (!dayData) return state;
      return {
        days: {
          ...state.days,
          [date]: {
            ...dayData,
            entries: dayData.entries.map((e) =>
              e.id === entryId
                ? {
                    ...e,
                    dailyTodos: (e.dailyTodos || []).map((t) =>
                      t.id === todoId ? { ...t, ...updates } : t
                    ),
                  }
                : e
            ),
          },
        },
      };
    });
    get().persist();
  },

  removeDailyTodo: (date: string, entryId: string, todoId: string) => {
    set((state) => {
      const dayData = state.days[date];
      if (!dayData) return state;
      return {
        days: {
          ...state.days,
          [date]: {
            ...dayData,
            entries: dayData.entries.map((e) =>
              e.id === entryId
                ? { ...e, dailyTodos: (e.dailyTodos || []).filter((t) => t.id !== todoId) }
                : e
            ),
          },
        },
      };
    });
    get().persist();
  },

  moveEntry: (date: string, entryId: string, toSection: Section, newIndex: number) => {
    set((state) => {
      const dayData = state.days[date];
      if (!dayData) return state;

      const entry = dayData.entries.find((e) => e.id === entryId);
      if (!entry) return state;

      // Remove entry from current position
      const withoutEntry = dayData.entries.filter((e) => e.id !== entryId);

      // Get entries in the target section
      const targetSectionEntries = withoutEntry.filter((e) => e.section === toSection);
      const otherEntries = withoutEntry.filter((e) => e.section !== toSection);

      // Insert at new position
      const updatedEntry = { ...entry, section: toSection };
      targetSectionEntries.splice(newIndex, 0, updatedEntry);

      // Reorder
      const reorderedTarget = targetSectionEntries.map((e, i) => ({
        ...e,
        order: i,
      }));

      return {
        days: {
          ...state.days,
          [date]: {
            ...dayData,
            entries: [...otherEntries, ...reorderedTarget],
          },
        },
      };
    });
    get().persist();
  },

  reorderEntries: (date: string, section: Section, entryIds: string[]) => {
    set((state) => {
      const dayData = state.days[date];
      if (!dayData) return state;

      const otherEntries = dayData.entries.filter((e) => e.section !== section);
      const reordered = entryIds
        .map((id, index) => {
          const entry = dayData.entries.find((e) => e.id === id);
          if (!entry) return null;
          return { ...entry, order: index, section };
        })
        .filter(Boolean) as DayEntry[];

      return {
        days: {
          ...state.days,
          [date]: {
            ...dayData,
            entries: [...otherEntries, ...reordered],
          },
        },
      };
    });
    get().persist();
  },

  // Notes panel
  setSelectedNotesTarget: (target: NotesTarget | null) => {
    set({ selectedNotesTarget: target });
  },

  // Populate from prior day
  populateFromDay: (sourceDate: string, importIncompleteTodos?: boolean) => {
    const { currentDate, days } = get();
    const sourceDayData = days[sourceDate];
    if (!sourceDayData) return;

    const currentEntries = days[currentDate]?.entries || [];

    // Count existing entries per section so new ones get appended in order
    const existingTodayCount = currentEntries.filter((e) => e.section === 'today').length;
    const existingOnDeckCount = currentEntries.filter((e) => e.section === 'onDeck').length;
    let todayIdx = 0;
    let onDeckIdx = 0;

    const newEntries: DayEntry[] = sourceDayData.entries.map((entry) => {
      // Carry over incomplete todos if requested
      const carriedTodos: TodoItem[] = importIncompleteTodos
        ? (entry.dailyTodos || [])
            .filter((t) => !t.done)
            .map((t) => ({ id: uuidv4(), text: t.text, done: false }))
        : [];

      return {
        id: uuidv4(),
        projectId: entry.projectId,
        section: entry.section,
        timeSpent: 0,
        done: false,
        dailyTodos: carriedTodos,
        order: entry.section === 'today'
          ? existingTodayCount + todayIdx++
          : existingOnDeckCount + onDeckIdx++,
      };
    });

    set((state) => ({
      days: {
        ...state.days,
        [currentDate]: {
          date: currentDate,
          entries: [...currentEntries, ...newEntries],
        },
      },
    }));
    get().persist();
  },

  // Export / Import
  exportData: () => {
    const { projects, days } = get();
    const data: AppData = { projects, days };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `track-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importData: (data: AppData) => {
    // Reuse the same migration logic
    const projects = (data.projects || []).map((p: Project) => ({
      ...p,
      savedNotes: p.savedNotes || [],
    }));
    const rawDays = data.days || {};
    const days: Record<string, { date: string; entries: DayEntry[] }> = {};
    for (const [date, dayData] of Object.entries(rawDays)) {
      days[date] = {
        ...dayData,
        entries: (dayData.entries || []).map((e: DayEntry) => ({
          ...e,
          dailyTodos: Array.isArray(e.dailyTodos) ? e.dailyTodos : [],
        })),
      };
    }
    set({ projects, days });
    get().persist();
  },

  // Helpers
  getEntriesForDate: (date: string) => {
    const { days } = get();
    return days[date]?.entries || [];
  },

  getTodayEntries: () => {
    const { currentDate, days } = get();
    const entries = days[currentDate]?.entries || [];
    return entries
      .filter((e) => e.section === 'today')
      .sort((a, b) => a.order - b.order);
  },

  getOnDeckEntries: () => {
    const { currentDate, days } = get();
    const entries = days[currentDate]?.entries || [];
    return entries
      .filter((e) => e.section === 'onDeck')
      .sort((a, b) => a.order - b.order);
  },

  getProjectById: (id: string) => {
    return get().projects.find((p) => p.id === id);
  },

  getDatesWithEntries: () => {
    const { days } = get();
    return Object.keys(days)
      .filter((d) => days[d].entries.length > 0)
      .sort()
      .reverse();
  },
}));

export default useStore;
