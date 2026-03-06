// HTTP client for the Track sync server

const BASE_URL = process.env.TRACK_SYNC_URL || 'http://localhost:3002';

async function request(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
  return res.json();
}

export const api = {
  // State
  getState: () => request('/api/state'),
  putState: (data: any, version?: number) =>
    request('/api/state', { method: 'PUT', body: JSON.stringify({ data, version }) }),
  getVersion: () => request('/api/version'),

  // Projects
  listProjects: (includeArchived = false) =>
    request(`/api/projects?includeArchived=${includeArchived}`),
  getProject: (id: string) => request(`/api/projects/${id}`),
  createProject: (name: string, startMonth?: number, endMonth?: number) =>
    request('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name, startMonth, endMonth }),
    }),
  updateProject: (id: string, updates: Record<string, any>) =>
    request(`/api/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
  archiveProject: (id: string) =>
    request(`/api/projects/${id}/archive`, { method: 'POST' }),
  unarchiveProject: (id: string) =>
    request(`/api/projects/${id}/unarchive`, { method: 'POST' }),
  saveProjectNote: (id: string, name: string) =>
    request(`/api/projects/${id}/saved-notes`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  loadProjectNote: (projectId: string, noteId: string) =>
    request(`/api/projects/${projectId}/saved-notes/${noteId}/load`, { method: 'POST' }),
  deleteProjectNote: (projectId: string, noteId: string) =>
    request(`/api/projects/${projectId}/saved-notes/${noteId}`, { method: 'DELETE' }),

  // Days / Entries
  getDay: (date: string) => request(`/api/days/${date}`),
  addEntry: (date: string, projectId: string, section: 'today' | 'onDeck') =>
    request(`/api/days/${date}/entries`, {
      method: 'POST',
      body: JSON.stringify({ projectId, section }),
    }),
  updateEntry: (date: string, entryId: string, updates: Record<string, any>) =>
    request(`/api/days/${date}/entries/${entryId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
  removeEntry: (date: string, entryId: string) =>
    request(`/api/days/${date}/entries/${entryId}`, { method: 'DELETE' }),
  moveEntry: (date: string, entryId: string, section: 'today' | 'onDeck', index: number) =>
    request(`/api/days/${date}/entries/${entryId}/move`, {
      method: 'POST',
      body: JSON.stringify({ section, index }),
    }),

  // Todos
  addTodo: (date: string, entryId: string, text: string) =>
    request(`/api/days/${date}/entries/${entryId}/todos`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
  updateTodo: (date: string, entryId: string, todoId: string, updates: Record<string, any>) =>
    request(`/api/days/${date}/entries/${entryId}/todos/${todoId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
  removeTodo: (date: string, entryId: string, todoId: string) =>
    request(`/api/days/${date}/entries/${entryId}/todos/${todoId}`, { method: 'DELETE' }),

  // Populate
  populateDay: (date: string, sourceDate: string, importIncompleteTodos = false) =>
    request(`/api/days/${date}/populate`, {
      method: 'POST',
      body: JSON.stringify({ sourceDate, importIncompleteTodos }),
    }),

  // Summary
  getSummary: (start: string, end: string) =>
    request(`/api/summary?start=${start}&end=${end}`),

  // Backups
  listBackups: () => request('/api/backups'),
  restoreBackup: (filename: string) =>
    request('/api/backups/restore', {
      method: 'POST',
      body: JSON.stringify({ filename }),
    }),
};
