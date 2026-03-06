import type { AppData } from './types';

const SYNC_URL = '/api';
const POLL_INTERVAL = 3000;

let lastVersion = -1;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let onExternalChange: ((data: AppData) => void) | null = null;
let polling = false;
// Track whether the last save was from us, so we can skip the next poll
let lastSaveVersion = -1;

async function tryFetch(path: string, options?: RequestInit): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${SYNC_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...options?.headers },
    });
    clearTimeout(timeout);
    return res.ok ? res : null;
  } catch {
    return null;
  }
}

export async function syncLoad(): Promise<AppData | null> {
  const res = await tryFetch('/state');
  if (!res) return null;
  const { data, version } = await res.json();
  lastVersion = version;
  return data;
}

export async function syncSave(data: AppData): Promise<boolean> {
  const res = await tryFetch('/state', {
    method: 'PUT',
    body: JSON.stringify({ data }),
  });
  if (!res) return false;
  const { version } = await res.json();
  lastVersion = version;
  lastSaveVersion = version;
  return true;
}

async function pollForChanges() {
  if (polling) return; // Prevent overlapping polls
  polling = true;
  try {
    const res = await tryFetch('/version');
    if (!res) return;
    const { version } = await res.json();
    if (version > lastVersion && version !== lastSaveVersion) {
      lastVersion = version;
      const stateRes = await tryFetch('/state');
      if (!stateRes) return;
      const { data } = await stateRes.json();
      onExternalChange?.(data);
    } else {
      lastVersion = version;
    }
  } finally {
    polling = false;
  }
}

export function startPolling(onChange: (data: AppData) => void) {
  onExternalChange = onChange;
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(pollForChanges, POLL_INTERVAL);
}

export function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  onExternalChange = null;
}
