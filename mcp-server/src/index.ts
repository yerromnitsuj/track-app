#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { api } from './client.js';

const server = new McpServer({
  name: 'track',
  version: '1.0.0',
});

// --- Project tools ---

server.tool(
  'list_projects',
  'List all projects in Track. Returns project names, IDs, active months, and archive status.',
  { include_archived: z.boolean().optional().describe('Include archived projects (default: false)') },
  async ({ include_archived }) => {
    const projects = await api.listProjects(include_archived ?? false);
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(projects, null, 2),
      }],
    };
  }
);

server.tool(
  'get_project',
  'Get full details for a project including global notes and saved note versions.',
  { project_id: z.string().describe('The project ID') },
  async ({ project_id }) => {
    const project = await api.getProject(project_id);
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(project, null, 2),
      }],
    };
  }
);

server.tool(
  'create_project',
  'Create a new project for time tracking.',
  {
    name: z.string().describe('Project name'),
    start_month: z.number().min(1).max(12).optional().describe('Start month (1-12)'),
    end_month: z.number().min(1).max(12).optional().describe('End month (1-12)'),
  },
  async ({ name, start_month, end_month }) => {
    const project = await api.createProject(name, start_month, end_month);
    return {
      content: [{
        type: 'text' as const,
        text: `Created project "${project.name}" (ID: ${project.id})`,
      }],
    };
  }
);

server.tool(
  'update_project',
  'Update a project\'s name, global notes, or active months.',
  {
    project_id: z.string().describe('The project ID'),
    name: z.string().optional().describe('New project name'),
    global_notes: z.string().optional().describe('Updated global notes (rich text/markdown)'),
    start_month: z.number().min(1).max(12).nullable().optional().describe('Start month (1-12, null to clear)'),
    end_month: z.number().min(1).max(12).nullable().optional().describe('End month (1-12, null to clear)'),
  },
  async ({ project_id, name, global_notes, start_month, end_month }) => {
    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name;
    if (global_notes !== undefined) updates.globalNotes = global_notes;
    if (start_month !== undefined) updates.startMonth = start_month;
    if (end_month !== undefined) updates.endMonth = end_month;
    const project = await api.updateProject(project_id, updates);
    return {
      content: [{
        type: 'text' as const,
        text: `Updated project "${project.name}"\n${JSON.stringify(project, null, 2)}`,
      }],
    };
  }
);

server.tool(
  'archive_project',
  'Archive (soft-delete) a project. It will be hidden from the active project list.',
  { project_id: z.string().describe('The project ID') },
  async ({ project_id }) => {
    await api.archiveProject(project_id);
    return { content: [{ type: 'text' as const, text: 'Project archived.' }] };
  }
);

server.tool(
  'unarchive_project',
  'Restore an archived project back to active.',
  { project_id: z.string().describe('The project ID') },
  async ({ project_id }) => {
    await api.unarchiveProject(project_id);
    return { content: [{ type: 'text' as const, text: 'Project unarchived.' }] };
  }
);

// --- Day / Entry tools ---

server.tool(
  'get_day',
  'Get all time tracking entries for a specific date, including project names, time spent, completion status, and todos.',
  { date: z.string().describe('Date in YYYY-MM-DD format') },
  async ({ date }) => {
    const dayData = await api.getDay(date);
    const todayEntries = dayData.entries
      .filter((e: any) => e.section === 'today')
      .sort((a: any, b: any) => a.order - b.order);
    const onDeckEntries = dayData.entries
      .filter((e: any) => e.section === 'onDeck')
      .sort((a: any, b: any) => a.order - b.order);

    let text = `# ${date}\n\n`;

    text += `## Today (${todayEntries.length} entries)\n`;
    if (todayEntries.length === 0) text += '_No entries_\n';
    for (const e of todayEntries) {
      const status = e.done ? '[x]' : '[ ]';
      text += `${status} ${e.projectName} — ${e.timeSpent}h (entry: ${e.id})\n`;
      for (const t of e.dailyTodos || []) {
        const todoStatus = t.done ? '[x]' : '[ ]';
        text += `  ${todoStatus} ${t.text} (todo: ${t.id})\n`;
      }
    }

    text += `\n## On Deck (${onDeckEntries.length} entries)\n`;
    if (onDeckEntries.length === 0) text += '_No entries_\n';
    for (const e of onDeckEntries) {
      const status = e.done ? '[x]' : '[ ]';
      text += `${status} ${e.projectName} — ${e.timeSpent}h (entry: ${e.id})\n`;
      for (const t of e.dailyTodos || []) {
        const todoStatus = t.done ? '[x]' : '[ ]';
        text += `  ${todoStatus} ${t.text} (todo: ${t.id})\n`;
      }
    }

    return { content: [{ type: 'text' as const, text }] };
  }
);

server.tool(
  'add_entry',
  'Add a project entry to a specific day and section (today or onDeck).',
  {
    date: z.string().describe('Date in YYYY-MM-DD format'),
    project_id: z.string().describe('The project ID to add an entry for'),
    section: z.enum(['today', 'onDeck']).describe('Section: "today" for active work, "onDeck" for planned/upcoming'),
  },
  async ({ date, project_id, section }) => {
    const entry = await api.addEntry(date, project_id, section);
    return {
      content: [{
        type: 'text' as const,
        text: `Added entry for project in "${section}" section (entry ID: ${entry.id})`,
      }],
    };
  }
);

server.tool(
  'update_entry',
  'Update a day entry\'s time spent or completion status.',
  {
    date: z.string().describe('Date in YYYY-MM-DD format'),
    entry_id: z.string().describe('The entry ID'),
    time_spent: z.number().min(0).max(24).optional().describe('Hours spent (0-24)'),
    done: z.boolean().optional().describe('Whether the entry is marked complete'),
  },
  async ({ date, entry_id, time_spent, done }) => {
    const updates: Record<string, any> = {};
    if (time_spent !== undefined) updates.timeSpent = time_spent;
    if (done !== undefined) updates.done = done;
    const entry = await api.updateEntry(date, entry_id, updates);
    return {
      content: [{
        type: 'text' as const,
        text: `Updated entry: ${entry.timeSpent}h, done=${entry.done}`,
      }],
    };
  }
);

server.tool(
  'remove_entry',
  'Remove a day entry.',
  {
    date: z.string().describe('Date in YYYY-MM-DD format'),
    entry_id: z.string().describe('The entry ID to remove'),
  },
  async ({ date, entry_id }) => {
    await api.removeEntry(date, entry_id);
    return { content: [{ type: 'text' as const, text: 'Entry removed.' }] };
  }
);

server.tool(
  'move_entry',
  'Move an entry between sections (today/onDeck) or reorder within a section.',
  {
    date: z.string().describe('Date in YYYY-MM-DD format'),
    entry_id: z.string().describe('The entry ID'),
    section: z.enum(['today', 'onDeck']).describe('Target section'),
    index: z.number().min(0).optional().describe('Position in the target section (0-based). Omit to append at end.'),
  },
  async ({ date, entry_id, section, index }) => {
    await api.moveEntry(date, entry_id, section, index ?? 999);
    return { content: [{ type: 'text' as const, text: `Entry moved to "${section}".` }] };
  }
);

// --- Todo tools ---

server.tool(
  'add_todo',
  'Add a to-do item to a day entry. Todos are sub-tasks within an entry.',
  {
    date: z.string().describe('Date in YYYY-MM-DD format'),
    entry_id: z.string().describe('The entry ID to add the todo to'),
    text: z.string().describe('The todo text'),
  },
  async ({ date, entry_id, text }) => {
    const todo = await api.addTodo(date, entry_id, text);
    return {
      content: [{
        type: 'text' as const,
        text: `Added todo "${text}" (todo ID: ${todo.id})`,
      }],
    };
  }
);

server.tool(
  'update_todo',
  'Update a todo\'s text or completion status.',
  {
    date: z.string().describe('Date in YYYY-MM-DD format'),
    entry_id: z.string().describe('The entry ID containing the todo'),
    todo_id: z.string().describe('The todo ID'),
    text: z.string().optional().describe('Updated todo text'),
    done: z.boolean().optional().describe('Whether the todo is complete'),
  },
  async ({ date, entry_id, todo_id, text, done }) => {
    const updates: Record<string, any> = {};
    if (text !== undefined) updates.text = text;
    if (done !== undefined) updates.done = done;
    await api.updateTodo(date, entry_id, todo_id, updates);
    return { content: [{ type: 'text' as const, text: 'Todo updated.' }] };
  }
);

server.tool(
  'remove_todo',
  'Remove a todo from an entry.',
  {
    date: z.string().describe('Date in YYYY-MM-DD format'),
    entry_id: z.string().describe('The entry ID'),
    todo_id: z.string().describe('The todo ID to remove'),
  },
  async ({ date, entry_id, todo_id }) => {
    await api.removeTodo(date, entry_id, todo_id);
    return { content: [{ type: 'text' as const, text: 'Todo removed.' }] };
  }
);

// --- High-level planning tools ---

server.tool(
  'plan_day',
  'Plan a full day by creating entries and todos in one operation. Creates entries for specified projects and optionally adds todos to each.',
  {
    date: z.string().describe('Date in YYYY-MM-DD format'),
    entries: z.array(z.object({
      project_id: z.string().describe('Project ID'),
      section: z.enum(['today', 'onDeck']).describe('Section to place the entry'),
      todos: z.array(z.string()).optional().describe('List of todo texts to add to this entry'),
    })).describe('List of entries to create'),
  },
  async ({ date, entries }) => {
    const results: string[] = [];
    for (const entry of entries) {
      const created = await api.addEntry(date, entry.project_id, entry.section);
      let line = `Entry for project ${entry.project_id} in "${entry.section}" (ID: ${created.id})`;
      if (entry.todos && entry.todos.length > 0) {
        for (const todoText of entry.todos) {
          await api.addTodo(date, created.id, todoText);
        }
        line += ` with ${entry.todos.length} todos`;
      }
      results.push(line);
    }
    return {
      content: [{
        type: 'text' as const,
        text: `Planned ${entries.length} entries for ${date}:\n${results.join('\n')}`,
      }],
    };
  }
);

server.tool(
  'populate_day',
  'Copy entries from a previous day to a target day. Optionally carries over incomplete todos.',
  {
    date: z.string().describe('Target date in YYYY-MM-DD format'),
    source_date: z.string().describe('Source date to copy entries from'),
    import_incomplete_todos: z.boolean().optional().describe('Carry over incomplete todos (default: false)'),
  },
  async ({ date, source_date, import_incomplete_todos }) => {
    await api.populateDay(date, source_date, import_incomplete_todos ?? false);
    return {
      content: [{
        type: 'text' as const,
        text: `Populated ${date} from ${source_date}${import_incomplete_todos ? ' (with incomplete todos)' : ''}.`,
      }],
    };
  }
);

server.tool(
  'get_weekly_summary',
  'Get a time tracking summary for a date range, showing hours per project per day and totals.',
  {
    start_date: z.string().describe('Start date in YYYY-MM-DD format'),
    end_date: z.string().describe('End date in YYYY-MM-DD format'),
  },
  async ({ start_date, end_date }) => {
    const summary = await api.getSummary(start_date, end_date);
    let text = `# Time Summary: ${start_date} to ${end_date}\n\n`;
    text += `**Total: ${summary.grandTotal}h**\n\n`;
    for (const proj of summary.projects) {
      text += `## ${proj.projectName} — ${proj.totalHours}h\n`;
      for (const [date, hours] of Object.entries(proj.dailyHours)) {
        text += `  ${date}: ${hours}h\n`;
      }
    }
    return { content: [{ type: 'text' as const, text }] };
  }
);

// --- Full state access ---

server.tool(
  'get_full_state',
  'Get the complete Track app state including all projects and all days. Use sparingly — prefer get_day or list_projects for targeted queries.',
  {},
  async () => {
    const state = await api.getState();
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(state.data, null, 2),
      }],
    };
  }
);

server.tool(
  'import_state',
  'Replace the entire Track app state. Use with extreme caution — this overwrites all data.',
  {
    data: z.object({
      projects: z.array(z.any()),
      days: z.record(z.string(), z.any()),
    }).describe('Complete AppData object'),
  },
  async ({ data }) => {
    const result = await api.putState(data);
    return {
      content: [{
        type: 'text' as const,
        text: `State imported. New version: ${result.version}`,
      }],
    };
  }
);

// Start the server
const transport = new StdioServerTransport(process.stdin, process.stdout);
server.connect(transport).catch((err) => {
  console.error('Failed to start MCP server:', err);
  process.exit(1);
});
