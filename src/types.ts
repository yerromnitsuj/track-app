export interface SavedNote {
  id: string;
  name: string;
  content: string;
  savedAt: string;
}

export interface Project {
  id: string;
  name: string;
  globalNotes: string;
  savedNotes: SavedNote[];
  createdAt: string;
  archived: boolean;
  startMonth?: number; // 1-12
  endMonth?: number;   // 1-12
}

export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
}

export interface DayEntry {
  id: string;
  projectId: string;
  section: 'today' | 'onDeck';
  timeSpent: number;
  done: boolean;
  dailyTodos: TodoItem[];
  order: number;
}

export interface DayData {
  date: string;
  entries: DayEntry[];
}

export interface AppData {
  projects: Project[];
  days: Record<string, DayData>;
}

export type Section = 'today' | 'onDeck';
