import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Types mirrored from Track's src/types.ts
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
  startMonth?: number;
  endMonth?: number;
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

export interface StoredData {
  data: AppData;
  version: number;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const DATA_FILE = join(DATA_DIR, 'track-data.json');
const BACKUP_DIR = join(DATA_DIR, 'backups');
const MAX_BACKUPS = 10;

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function migrateData(data: AppData): AppData {
  const projects = (data.projects || []).map((p) => ({
    ...p,
    savedNotes: p.savedNotes || [],
  }));
  const rawDays = data.days || {};
  const days: Record<string, DayData> = {};
  for (const [date, dayData] of Object.entries(rawDays)) {
    days[date] = {
      ...dayData,
      entries: (dayData.entries || []).map((e) => ({
        ...e,
        dailyTodos: Array.isArray(e.dailyTodos) ? e.dailyTodos : [],
      })),
    };
  }
  return { projects, days };
}

let cached: StoredData | null = null;

export function load(): StoredData {
  if (cached) return cached;
  ensureDataDir();
  if (existsSync(DATA_FILE)) {
    try {
      const raw = readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as StoredData;
      parsed.data = migrateData(parsed.data);
      cached = parsed;
      return cached;
    } catch {
      // Corrupted file, start fresh
    }
  }
  cached = { data: { projects: [], days: {} }, version: 0 };
  return cached;
}

function createBackup(): string | null {
  if (!existsSync(DATA_FILE)) return null;
  ensureDataDir();
  if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = join(BACKUP_DIR, `track-data-${timestamp}.json`);
  const content = readFileSync(DATA_FILE, 'utf-8');
  writeFileSync(backupFile, content, 'utf-8');

  // Prune old backups beyond MAX_BACKUPS
  const backups = readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith('track-data-') && f.endsWith('.json'))
    .sort();
  while (backups.length > MAX_BACKUPS) {
    const oldest = backups.shift()!;
    try { unlinkSync(join(BACKUP_DIR, oldest)); } catch {}
  }

  return backupFile;
}

export function listBackups(): string[] {
  if (!existsSync(BACKUP_DIR)) return [];
  return readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith('track-data-') && f.endsWith('.json'))
    .sort()
    .reverse();
}

export function restoreBackup(filename: string): StoredData {
  if (filename.includes('/') || filename.includes('..')) throw new Error('INVALID_FILENAME');
  const backupFile = join(BACKUP_DIR, filename);
  if (!existsSync(backupFile)) throw new Error('BACKUP_NOT_FOUND');

  const raw = readFileSync(backupFile, 'utf-8');
  const parsed = JSON.parse(raw) as StoredData;
  const migrated = migrateData(parsed.data);
  const current = load();
  cached = { data: migrated, version: current.version + 1 };
  ensureDataDir();
  writeFileSync(DATA_FILE, JSON.stringify(cached, null, 2), 'utf-8');
  return cached;
}

export function save(data: AppData, expectedVersion?: number): StoredData {
  const current = load();
  if (expectedVersion !== undefined && expectedVersion !== current.version) {
    throw new Error('VERSION_CONFLICT');
  }
  // Auto-backup before full state replacement
  createBackup();
  const migrated = migrateData(data);
  cached = { data: migrated, version: current.version + 1 };
  ensureDataDir();
  writeFileSync(DATA_FILE, JSON.stringify(cached, null, 2), 'utf-8');
  return cached;
}

export function update(fn: (data: AppData) => AppData): StoredData {
  const current = load();
  const updated = fn(current.data);
  cached = { data: updated, version: current.version + 1 };
  ensureDataDir();
  writeFileSync(DATA_FILE, JSON.stringify(cached, null, 2), 'utf-8');
  return cached;
}

export function getVersion(): number {
  return load().version;
}
