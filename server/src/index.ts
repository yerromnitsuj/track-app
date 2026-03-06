import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { v4 as uuidv4 } from 'uuid';
import { load, save, update } from './store.js';
import type { AppData, DayEntry, Project, TodoItem, DayData } from './store.js';

const app = new Hono();

app.use('*', cors());

// --- Validation helpers ---

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(s: string): boolean {
  return DATE_RE.test(s) && !isNaN(Date.parse(s));
}

function isValidMonth(n: unknown): boolean {
  return typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 12;
}

function isValidSection(s: unknown): s is 'today' | 'onDeck' {
  return s === 'today' || s === 'onDeck';
}

// --- State endpoints ---

app.get('/api/state', (c) => {
  const stored = load();
  return c.json({ data: stored.data, version: stored.version });
});

app.put('/api/state', async (c) => {
  const body = await c.req.json<{ data: AppData; version?: number }>();
  if (!body.data || !Array.isArray(body.data.projects) || typeof body.data.days !== 'object') {
    return c.json({ error: 'Invalid data shape: requires { projects: [], days: {} }' }, 400);
  }
  try {
    const stored = save(body.data, body.version);
    return c.json({ version: stored.version });
  } catch (e: any) {
    if (e.message === 'VERSION_CONFLICT') {
      return c.json({ error: 'Version conflict. Fetch latest state and retry.' }, 409);
    }
    throw e;
  }
});

app.get('/api/version', (c) => {
  const stored = load();
  return c.json({ version: stored.version });
});

// --- Project endpoints ---

app.get('/api/projects', (c) => {
  const { data } = load();
  const includeArchived = c.req.query('includeArchived') === 'true';
  const projects = includeArchived
    ? data.projects
    : data.projects.filter((p) => !p.archived);
  return c.json(projects);
});

app.get('/api/projects/:id', (c) => {
  const { data } = load();
  const project = data.projects.find((p) => p.id === c.req.param('id'));
  if (!project) return c.json({ error: 'Project not found' }, 404);
  return c.json(project);
});

app.post('/api/projects', async (c) => {
  const body = await c.req.json<{ name: string; startMonth?: number; endMonth?: number }>();
  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    return c.json({ error: 'name is required and must be a non-empty string' }, 400);
  }
  if (body.startMonth !== undefined && !isValidMonth(body.startMonth)) {
    return c.json({ error: 'startMonth must be 1-12' }, 400);
  }
  if (body.endMonth !== undefined && !isValidMonth(body.endMonth)) {
    return c.json({ error: 'endMonth must be 1-12' }, 400);
  }
  const project: Project = {
    id: uuidv4(),
    name: body.name.trim(),
    globalNotes: '',
    savedNotes: [],
    createdAt: new Date().toISOString(),
    archived: false,
    startMonth: body.startMonth,
    endMonth: body.endMonth,
  };
  update((data) => ({
    ...data,
    projects: [...data.projects, project],
  }));
  return c.json(project, 201);
});

app.patch('/api/projects/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{
    name?: string;
    globalNotes?: string;
    startMonth?: number | null;
    endMonth?: number | null;
  }>();
  if (body.name !== undefined && (typeof body.name !== 'string' || !body.name.trim())) {
    return c.json({ error: 'name must be a non-empty string' }, 400);
  }
  if (body.startMonth !== undefined && body.startMonth !== null && !isValidMonth(body.startMonth)) {
    return c.json({ error: 'startMonth must be 1-12 or null' }, 400);
  }
  if (body.endMonth !== undefined && body.endMonth !== null && !isValidMonth(body.endMonth)) {
    return c.json({ error: 'endMonth must be 1-12 or null' }, 400);
  }
  let updated: Project | null = null;
  update((data) => ({
    ...data,
    projects: data.projects.map((p) => {
      if (p.id !== id) return p;
      updated = {
        ...p,
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.globalNotes !== undefined && { globalNotes: body.globalNotes }),
        ...(body.startMonth !== undefined && { startMonth: body.startMonth ?? undefined }),
        ...(body.endMonth !== undefined && { endMonth: body.endMonth ?? undefined }),
      };
      return updated;
    }),
  }));
  if (!updated) return c.json({ error: 'Project not found' }, 404);
  return c.json(updated);
});

app.post('/api/projects/:id/archive', (c) => {
  const id = c.req.param('id');
  let found = false;
  update((data) => ({
    ...data,
    projects: data.projects.map((p) => {
      if (p.id !== id) return p;
      found = true;
      return { ...p, archived: true };
    }),
  }));
  if (!found) return c.json({ error: 'Project not found' }, 404);
  return c.json({ success: true });
});

app.post('/api/projects/:id/unarchive', (c) => {
  const id = c.req.param('id');
  let found = false;
  update((data) => ({
    ...data,
    projects: data.projects.map((p) => {
      if (p.id !== id) return p;
      found = true;
      return { ...p, archived: false };
    }),
  }));
  if (!found) return c.json({ error: 'Project not found' }, 404);
  return c.json({ success: true });
});

app.post('/api/projects/:id/saved-notes', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{ name: string }>();
  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    return c.json({ error: 'name is required' }, 400);
  }
  let savedNote: any = null;
  update((data) => ({
    ...data,
    projects: data.projects.map((p) => {
      if (p.id !== id) return p;
      savedNote = {
        id: uuidv4(),
        name: body.name.trim(),
        content: p.globalNotes,
        savedAt: new Date().toISOString(),
      };
      return { ...p, savedNotes: [...(p.savedNotes || []), savedNote] };
    }),
  }));
  if (!savedNote) return c.json({ error: 'Project not found' }, 404);
  return c.json(savedNote, 201);
});

app.post('/api/projects/:id/saved-notes/:noteId/load', (c) => {
  const id = c.req.param('id');
  const noteId = c.req.param('noteId');
  let found = false;
  update((data) => ({
    ...data,
    projects: data.projects.map((p) => {
      if (p.id !== id) return p;
      const note = (p.savedNotes || []).find((n) => n.id === noteId);
      if (!note) return p;
      found = true;
      return { ...p, globalNotes: note.content };
    }),
  }));
  if (!found) return c.json({ error: 'Note not found' }, 404);
  return c.json({ success: true });
});

app.delete('/api/projects/:id/saved-notes/:noteId', (c) => {
  const id = c.req.param('id');
  const noteId = c.req.param('noteId');
  update((data) => ({
    ...data,
    projects: data.projects.map((p) => {
      if (p.id !== id) return p;
      return { ...p, savedNotes: (p.savedNotes || []).filter((n) => n.id !== noteId) };
    }),
  }));
  return c.json({ success: true });
});

// --- Day / Entry endpoints ---

app.get('/api/days/:date', (c) => {
  const date = c.req.param('date');
  if (!isValidDate(date)) return c.json({ error: 'Invalid date format. Use YYYY-MM-DD.' }, 400);
  const { data } = load();
  const dayData = data.days[date] || { date, entries: [] };
  const enriched = {
    ...dayData,
    entries: dayData.entries.map((e) => {
      const project = data.projects.find((p) => p.id === e.projectId);
      return { ...e, projectName: project?.name || 'Unknown' };
    }),
  };
  return c.json(enriched);
});

app.post('/api/days/:date/entries', async (c) => {
  const date = c.req.param('date');
  if (!isValidDate(date)) return c.json({ error: 'Invalid date format. Use YYYY-MM-DD.' }, 400);
  const body = await c.req.json<{ projectId: string; section: 'today' | 'onDeck' }>();
  if (!body.projectId || typeof body.projectId !== 'string') {
    return c.json({ error: 'projectId is required' }, 400);
  }
  if (!isValidSection(body.section)) {
    return c.json({ error: 'section must be "today" or "onDeck"' }, 400);
  }

  let newEntry: DayEntry | null = null;
  update((data) => {
    const project = data.projects.find((p) => p.id === body.projectId && !p.archived);
    if (!project) return data;

    const dayData = data.days[date] || { date, entries: [] };
    const sectionEntries = dayData.entries.filter((e) => e.section === body.section);
    newEntry = {
      id: uuidv4(),
      projectId: body.projectId,
      section: body.section,
      timeSpent: 0,
      done: false,
      dailyTodos: [],
      order: sectionEntries.length,
    };
    return {
      ...data,
      days: {
        ...data.days,
        [date]: {
          date,
          entries: [...dayData.entries, newEntry],
        },
      },
    };
  });
  if (!newEntry) return c.json({ error: 'Project not found or archived' }, 404);
  return c.json(newEntry, 201);
});

app.patch('/api/days/:date/entries/:entryId', async (c) => {
  const date = c.req.param('date');
  const entryId = c.req.param('entryId');
  const body = await c.req.json<{ timeSpent?: number; done?: boolean }>();

  if (body.timeSpent !== undefined) {
    if (typeof body.timeSpent !== 'number' || body.timeSpent < 0 || body.timeSpent > 24) {
      return c.json({ error: 'timeSpent must be 0-24' }, 400);
    }
  }

  let updated: DayEntry | null = null;
  update((data) => {
    const dayData = data.days[date];
    if (!dayData) return data;
    return {
      ...data,
      days: {
        ...data.days,
        [date]: {
          ...dayData,
          entries: dayData.entries.map((e) => {
            if (e.id !== entryId) return e;
            updated = {
              ...e,
              ...(body.timeSpent !== undefined && { timeSpent: body.timeSpent }),
              ...(body.done !== undefined && { done: body.done }),
            };
            return updated;
          }),
        },
      },
    };
  });
  if (!updated) return c.json({ error: 'Entry not found' }, 404);
  return c.json(updated);
});

app.delete('/api/days/:date/entries/:entryId', (c) => {
  const date = c.req.param('date');
  const entryId = c.req.param('entryId');
  update((data) => {
    const dayData = data.days[date];
    if (!dayData) return data;
    return {
      ...data,
      days: {
        ...data.days,
        [date]: {
          ...dayData,
          entries: dayData.entries.filter((e) => e.id !== entryId),
        },
      },
    };
  });
  return c.json({ success: true });
});

app.post('/api/days/:date/entries/:entryId/move', async (c) => {
  const date = c.req.param('date');
  const entryId = c.req.param('entryId');
  const body = await c.req.json<{ section: 'today' | 'onDeck'; index: number }>();

  if (!isValidSection(body.section)) {
    return c.json({ error: 'section must be "today" or "onDeck"' }, 400);
  }

  update((data) => {
    const dayData = data.days[date];
    if (!dayData) return data;

    const entry = dayData.entries.find((e) => e.id === entryId);
    if (!entry) return data;

    const withoutEntry = dayData.entries.filter((e) => e.id !== entryId);
    const targetSectionEntries = withoutEntry.filter((e) => e.section === body.section);
    const otherEntries = withoutEntry.filter((e) => e.section !== body.section);

    // Clamp index to valid range
    const clampedIndex = Math.max(0, Math.min(body.index ?? targetSectionEntries.length, targetSectionEntries.length));
    const updatedEntry = { ...entry, section: body.section };
    targetSectionEntries.splice(clampedIndex, 0, updatedEntry);

    const reorderedTarget = targetSectionEntries.map((e, i) => ({ ...e, order: i }));

    return {
      ...data,
      days: {
        ...data.days,
        [date]: { ...dayData, entries: [...otherEntries, ...reorderedTarget] },
      },
    };
  });
  return c.json({ success: true });
});

// --- Todo endpoints ---

app.post('/api/days/:date/entries/:entryId/todos', async (c) => {
  const date = c.req.param('date');
  const entryId = c.req.param('entryId');
  const body = await c.req.json<{ text: string }>();

  if (!body.text || typeof body.text !== 'string' || !body.text.trim()) {
    return c.json({ error: 'text is required' }, 400);
  }

  const todo: TodoItem = { id: uuidv4(), text: body.text.trim(), done: false };
  let found = false;

  update((data) => {
    const dayData = data.days[date];
    if (!dayData) return data;
    return {
      ...data,
      days: {
        ...data.days,
        [date]: {
          ...dayData,
          entries: dayData.entries.map((e) => {
            if (e.id !== entryId) return e;
            found = true;
            return { ...e, dailyTodos: [...(e.dailyTodos || []), todo] };
          }),
        },
      },
    };
  });
  if (!found) return c.json({ error: 'Entry not found' }, 404);
  return c.json(todo, 201);
});

app.patch('/api/days/:date/entries/:entryId/todos/:todoId', async (c) => {
  const date = c.req.param('date');
  const entryId = c.req.param('entryId');
  const todoId = c.req.param('todoId');
  const body = await c.req.json<{ text?: string; done?: boolean }>();

  let found = false;
  update((data) => {
    const dayData = data.days[date];
    if (!dayData) return data;
    return {
      ...data,
      days: {
        ...data.days,
        [date]: {
          ...dayData,
          entries: dayData.entries.map((e) => {
            if (e.id !== entryId) return e;
            return {
              ...e,
              dailyTodos: (e.dailyTodos || []).map((t) => {
                if (t.id !== todoId) return t;
                found = true;
                return { ...t, ...body };
              }),
            };
          }),
        },
      },
    };
  });
  if (!found) return c.json({ error: 'Todo not found' }, 404);
  return c.json({ success: true });
});

app.delete('/api/days/:date/entries/:entryId/todos/:todoId', (c) => {
  const date = c.req.param('date');
  const entryId = c.req.param('entryId');
  const todoId = c.req.param('todoId');

  update((data) => {
    const dayData = data.days[date];
    if (!dayData) return data;
    return {
      ...data,
      days: {
        ...data.days,
        [date]: {
          ...dayData,
          entries: dayData.entries.map((e) => {
            if (e.id !== entryId) return e;
            return {
              ...e,
              dailyTodos: (e.dailyTodos || []).filter((t) => t.id !== todoId),
            };
          }),
        },
      },
    };
  });
  return c.json({ success: true });
});

// --- Populate endpoint ---

app.post('/api/days/:date/populate', async (c) => {
  const date = c.req.param('date');
  if (!isValidDate(date)) return c.json({ error: 'Invalid date format. Use YYYY-MM-DD.' }, 400);
  const body = await c.req.json<{ sourceDate: string; importIncompleteTodos?: boolean }>();
  if (!body.sourceDate || !isValidDate(body.sourceDate)) {
    return c.json({ error: 'sourceDate must be a valid YYYY-MM-DD date' }, 400);
  }

  update((data) => {
    const sourceDayData = data.days[body.sourceDate];
    if (!sourceDayData) return data;

    const currentEntries = data.days[date]?.entries || [];
    const existingTodayCount = currentEntries.filter((e) => e.section === 'today').length;
    const existingOnDeckCount = currentEntries.filter((e) => e.section === 'onDeck').length;
    let todayIdx = 0;
    let onDeckIdx = 0;

    const newEntries: DayEntry[] = sourceDayData.entries.map((entry) => {
      const carriedTodos: TodoItem[] = body.importIncompleteTodos
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
        order:
          entry.section === 'today'
            ? existingTodayCount + todayIdx++
            : existingOnDeckCount + onDeckIdx++,
      };
    });

    return {
      ...data,
      days: {
        ...data.days,
        [date]: {
          date,
          entries: [...currentEntries, ...newEntries],
        },
      },
    };
  });
  return c.json({ success: true });
});

// --- Summary endpoint ---

app.get('/api/summary', (c) => {
  const start = c.req.query('start');
  const end = c.req.query('end');
  if (!start || !end) return c.json({ error: 'start and end query params required' }, 400);
  if (!isValidDate(start) || !isValidDate(end)) {
    return c.json({ error: 'start and end must be valid YYYY-MM-DD dates' }, 400);
  }

  const { data } = load();
  const summary: Record<string, { projectId: string; projectName: string; totalHours: number; dailyHours: Record<string, number> }> = {};

  for (const [date, dayData] of Object.entries(data.days)) {
    if (date < start || date > end) continue;
    for (const entry of dayData.entries) {
      if (!summary[entry.projectId]) {
        const project = data.projects.find((p) => p.id === entry.projectId);
        summary[entry.projectId] = {
          projectId: entry.projectId,
          projectName: project?.name || 'Unknown',
          totalHours: 0,
          dailyHours: {},
        };
      }
      summary[entry.projectId].totalHours += entry.timeSpent;
      summary[entry.projectId].dailyHours[date] =
        (summary[entry.projectId].dailyHours[date] || 0) + entry.timeSpent;
    }
  }

  return c.json({
    startDate: start,
    endDate: end,
    projects: Object.values(summary),
    grandTotal: Object.values(summary).reduce((sum, p) => sum + p.totalHours, 0),
  });
});

// --- Health check ---

app.get('/api/health', (c) => c.json({ status: 'ok' }));

const PORT = parseInt(process.env.PORT || '3002', 10);
serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`Track sync server running on http://localhost:${PORT}`);
});
