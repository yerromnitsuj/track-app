import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import useStore from '../store';
import EntryRow from './EntryRow';
import AddEntryDropdown from './AddEntryDropdown';
import type { DayEntry, Section } from '../types';

interface DaySectionProps {
  title: string;
  section: Section;
  entries: DayEntry[];
  entryIds: string[];
  date: string;
}

export default function DaySection({ title, section, entries, entryIds, date }: DaySectionProps) {
  const projects = useStore((s) => s.projects);
  const removeEntry = useStore((s) => s.removeEntry);
  const selectedNotesTarget = useStore((s) => s.selectedNotesTarget);
  const setSelectedNotesTarget = useStore((s) => s.setSelectedNotesTarget);

  const { setNodeRef, isOver } = useDroppable({
    id: `section-${section}`,
    data: { section },
  });

  const totalTime = entries.reduce((sum, e) => sum + e.timeSpent, 0);
  const doneCount = entries.filter((e) => e.done).length;

  return (
    <div className="mb-4">
      {/* Section header */}
      <div className="flex items-center justify-between px-3 mb-2">
        <div className="flex items-center gap-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {title}
          </h3>
          {entries.length > 0 && (
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {doneCount}/{entries.length}
            </span>
          )}
          <AddEntryDropdown section={section} />
        </div>
        {totalTime > 0 && (
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {Math.round(totalTime * 100) / 100} hr{totalTime !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Entries */}
      <div
        ref={setNodeRef}
        className={`min-h-[44px] rounded-lg border-2 border-dashed px-1 py-0.5 transition-colors ${
          isOver
            ? 'border-primary-300 bg-primary-50/30 dark:border-primary-500/40 dark:bg-primary-900/10'
            : entries.length === 0
              ? 'border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-800/30'
              : 'border-transparent'
        }`}
      >
        <SortableContext items={entryIds} strategy={verticalListSortingStrategy}>
          {entries.map((entry) => {
            const project = projects.find((p) => p.id === entry.projectId);
            const projectName = project
              ? project.name
              : '(Deleted project)';

            return (
              <EntryRow
                key={entry.id}
                entryId={entry.id}
                projectId={entry.projectId}
                projectName={projectName}
                timeSpent={entry.timeSpent}
                done={entry.done}
                date={date}
                isSelected={selectedNotesTarget?.entryId === entry.id}
                onSelect={() =>
                  setSelectedNotesTarget(
                    selectedNotesTarget?.entryId === entry.id
                      ? null
                      : { entryId: entry.id, projectId: entry.projectId }
                  )
                }
                onRemove={() => removeEntry(date, entry.id)}
              />
            );
          })}
        </SortableContext>

        {entries.length === 0 && !isOver && (
          <div className="flex items-center justify-center h-9 text-xs text-slate-400 dark:text-slate-500">
            {section === 'today' ? 'Add projects to track time' : 'Queue upcoming projects here'}
          </div>
        )}
      </div>
    </div>
  );
}
