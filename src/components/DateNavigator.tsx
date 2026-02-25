import { format, addDays, subDays, isToday, parseISO } from 'date-fns';
import useStore from '../store';

export default function DateNavigator() {
  const currentDate = useStore((s) => s.currentDate);
  const setCurrentDate = useStore((s) => s.setCurrentDate);

  const dateObj = parseISO(currentDate);
  const isCurrentDay = isToday(dateObj);

  const goBack = () => {
    setCurrentDate(format(subDays(dateObj, 1), 'yyyy-MM-dd'));
  };

  const goForward = () => {
    setCurrentDate(format(addDays(dateObj, 1), 'yyyy-MM-dd'));
  };

  const goToToday = () => {
    setCurrentDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const displayDate = format(dateObj, 'EEEE, MMMM d, yyyy');

  return (
    <div className="flex items-center gap-3">
      {/* Navigation */}
      <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
        <button
          onClick={goBack}
          className="px-2.5 py-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700 rounded-l-lg transition-colors"
          title="Previous day"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 3 L5 7 L9 11" />
          </svg>
        </button>
        <span className="px-4 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 border-x border-slate-200 dark:border-slate-700 select-none min-w-[220px] text-center">
          {displayDate}
        </span>
        <button
          onClick={goForward}
          className="px-2.5 py-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700 rounded-r-lg transition-colors"
          title="Next day"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 3 L9 7 L5 11" />
          </svg>
        </button>
      </div>

      {/* Today button */}
      {!isCurrentDay && (
        <button
          onClick={goToToday}
          className="px-3 py-1.5 text-sm font-medium text-primary-500 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 dark:text-primary-400 dark:bg-primary-900/20 dark:border-primary-800 dark:hover:bg-primary-900/30 transition-colors"
        >
          Today
        </button>
      )}
    </div>
  );
}
