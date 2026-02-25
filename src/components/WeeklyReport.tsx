import { useState, useRef, useEffect, useMemo } from 'react';
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  isSameDay,
} from 'date-fns';
import useStore from '../store';

interface WeeklyReportProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WeeklyReport({ isOpen, onClose }: WeeklyReportProps) {
  const currentDate = useStore((s) => s.currentDate);
  const days = useStore((s) => s.days);
  const projects = useStore((s) => s.projects);

  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(parseISO(currentDate), { weekStartsOn: 1 })
  );

  const modalRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setWeekStart(startOfWeek(parseISO(currentDate), { weekStartsOn: 1 }));
      setCopied(false);
    }
  }, [isOpen, currentDate]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const reportData = useMemo(() => {
    const projectTimeMap: Record<string, Record<string, number>> = {};

    weekDays.forEach((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayData = days[dateStr];
      if (!dayData) return;

      dayData.entries.forEach((entry) => {
        if (entry.timeSpent > 0) {
          if (!projectTimeMap[entry.projectId]) {
            projectTimeMap[entry.projectId] = {};
          }
          const existing = projectTimeMap[entry.projectId][dateStr] || 0;
          projectTimeMap[entry.projectId][dateStr] = existing + entry.timeSpent;
        }
      });
    });

    const rows = Object.entries(projectTimeMap).map(([projectId, dayTimes]) => {
      const project = projects.find((p) => p.id === projectId);
      const name = project ? project.name : '(Deleted)';
      const dailyTotals = weekDays.map((day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        return dayTimes[dateStr] || 0;
      });
      const total = dailyTotals.reduce((sum, t) => sum + t, 0);
      return { projectId, name, dailyTotals, total };
    });

    rows.sort((a, b) => b.total - a.total);

    const columnTotals = weekDays.map((_, i) =>
      rows.reduce((sum, row) => sum + row.dailyTotals[i], 0)
    );
    const grandTotal = columnTotals.reduce((sum, t) => sum + t, 0);

    return { rows, columnTotals, grandTotal };
  }, [weekDays, days, projects]);

  if (!isOpen) return null;

  const handleExportCSV = () => {
    const header = ['Project', ...weekDays.map((d) => format(d, 'EEE M/d')), 'Total'];
    const dataRows = reportData.rows.map((row) => [
      row.name,
      ...row.dailyTotals.map(String),
      String(row.total),
    ]);
    const totalRow = ['TOTAL', ...reportData.columnTotals.map(String), String(reportData.grandTotal)];

    const csv = [header, ...dataRows, totalRow]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `time-report-${format(weekStart, 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyText = () => {
    const lines: string[] = [];
    lines.push(`Week of ${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`);
    lines.push('');

    weekDays.forEach((day) => {
      const dayLabel = format(day, 'EEEE, MMM d');
      const entriesForDay = reportData.rows
        .map((row) => {
          const idx = weekDays.findIndex((d) => isSameDay(d, day));
          const time = row.dailyTotals[idx];
          return time > 0 ? `  ${row.name}: ${time} hr${time !== 1 ? 's' : ''}` : null;
        })
        .filter(Boolean);

      if (entriesForDay.length > 0) {
        const dayTotal = reportData.columnTotals[weekDays.findIndex((d) => isSameDay(d, day))];
        lines.push(`${dayLabel} (${dayTotal} hrs)`);
        entriesForDay.forEach((e) => lines.push(e!));
        lines.push('');
      }
    });

    lines.push(`Total: ${reportData.grandTotal} hrs`);

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 bg-black/30 dark:bg-black/50 flex items-center justify-center z-50">
      <div
        ref={modalRef}
        className="w-[780px] max-h-[600px] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between flex-shrink-0">
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            Weekly Report
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="2" y1="2" x2="10" y2="10" />
              <line x1="10" y1="2" x2="2" y2="10" />
            </svg>
          </button>
        </div>

        {/* Week nav */}
        <div className="px-6 py-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
          <button
            onClick={() => setWeekStart(subWeeks(weekStart, 1))}
            className="px-2.5 py-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 3 L5 7 L9 11" />
            </svg>
          </button>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {format(weekStart, 'MMM d')} — {format(weekEnd, 'MMM d, yyyy')}
          </span>
          <button
            onClick={() => setWeekStart(addWeeks(weekStart, 1))}
            className="px-2.5 py-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 3 L9 7 L5 11" />
            </svg>
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {reportData.rows.length === 0 ? (
            <div className="text-center py-12 text-sm text-slate-400 dark:text-slate-500">
              No time entries for this week.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-600">
                  <th className="text-left py-2 pr-4 font-medium text-slate-500 dark:text-slate-400">
                    Project
                  </th>
                  {weekDays.map((day) => (
                    <th
                      key={day.toISOString()}
                      className="text-center py-2 px-2 font-medium text-slate-500 dark:text-slate-400 w-16"
                    >
                      {format(day, 'EEE')}
                      <br />
                      <span className="font-normal text-xs text-slate-400 dark:text-slate-500">
                        {format(day, 'M/d')}
                      </span>
                    </th>
                  ))}
                  <th className="text-center py-2 pl-2 font-semibold text-slate-700 dark:text-slate-300 w-16">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {reportData.rows.map((row) => (
                  <tr
                    key={row.projectId}
                    className="border-b border-slate-100 dark:border-slate-700"
                  >
                    <td className="py-2 pr-4 text-slate-700 dark:text-slate-300">{row.name}</td>
                    {row.dailyTotals.map((time, i) => (
                      <td
                        key={i}
                        className={`text-center py-2 px-2 ${
                          time > 0 ? 'text-slate-700 dark:text-slate-300' : 'text-slate-300 dark:text-slate-600'
                        }`}
                      >
                        {time > 0 ? time : '-'}
                      </td>
                    ))}
                    <td className="text-center py-2 pl-2 font-medium text-slate-800 dark:text-slate-200">
                      {row.total}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 dark:border-slate-500">
                  <td className="py-2 pr-4 font-semibold text-slate-700 dark:text-slate-300">
                    Total
                  </td>
                  {reportData.columnTotals.map((total, i) => (
                    <td
                      key={i}
                      className={`text-center py-2 px-2 font-medium ${
                        total > 0 ? 'text-slate-700 dark:text-slate-300' : 'text-slate-300 dark:text-slate-600'
                      }`}
                    >
                      {total > 0 ? total : '-'}
                    </td>
                  ))}
                  <td className="text-center py-2 pl-2 font-bold text-slate-900 dark:text-white">
                    {reportData.grandTotal}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end gap-2 flex-shrink-0">
          <button
            onClick={handleCopyText}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 border border-slate-200 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            {copied ? 'Copied!' : 'Copy as Text'}
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg shadow-sm transition-colors"
          >
            Export CSV
          </button>
        </div>
      </div>
    </div>
  );
}
