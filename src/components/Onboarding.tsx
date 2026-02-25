import { useState } from 'react';

const STORAGE_KEY = 'track-onboarding-done';

function hasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function markOnboardingDone() {
  try {
    localStorage.setItem(STORAGE_KEY, 'true');
  } catch {}
}

interface Step {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const steps: Step[] = [
  {
    title: 'Welcome to Track',
    description:
      'A simple tool to track your time across projects. Let\'s walk through the key features.',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="24" cy="24" r="20" className="stroke-teal-500" />
        <path d="M24 14v10l6 4" className="stroke-teal-500" />
      </svg>
    ),
  },
  {
    title: 'Projects',
    description:
      'The left sidebar shows your projects. Click the + button to add a new project. You can rename or delete projects by hovering over them.',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="6" width="16" height="36" rx="3" className="stroke-slate-400 fill-slate-50 dark:fill-slate-800" />
        <line x1="8" y1="14" x2="16" y2="14" className="stroke-slate-400" />
        <line x1="8" y1="20" x2="16" y2="20" className="stroke-slate-400" />
        <line x1="8" y1="26" x2="16" y2="26" className="stroke-slate-400" />
        <circle cx="36" cy="12" r="8" className="stroke-teal-500" />
        <line x1="36" y1="9" x2="36" y2="15" className="stroke-teal-500" strokeWidth="2" />
        <line x1="33" y1="12" x2="39" y2="12" className="stroke-teal-500" strokeWidth="2" />
      </svg>
    ),
  },
  {
    title: 'Global Notes',
    description:
      'Click the arrow next to a project to expand it and see its global notes. You can save multiple sets of notes per project — useful when one client has several engagements over time.',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="8" y="4" width="32" height="40" rx="3" className="stroke-slate-400 fill-slate-50 dark:fill-slate-800" />
        <line x1="14" y1="14" x2="34" y2="14" className="stroke-slate-400" />
        <line x1="14" y1="20" x2="34" y2="20" className="stroke-slate-400" />
        <line x1="14" y1="26" x2="28" y2="26" className="stroke-slate-400" />
        <path d="M30 32 L36 32 L36 38" className="stroke-teal-500" strokeWidth="2" />
        <path d="M36 32 L30 38" className="stroke-teal-500" strokeWidth="2" />
      </svg>
    ),
  },
  {
    title: 'Drag & Drop',
    description:
      'Drag projects from the sidebar into Today or On Deck to add them to your day. You can also drag entries between sections or reorder them.',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="8" width="14" height="32" rx="2" className="stroke-slate-400 fill-slate-50 dark:fill-slate-800" />
        <rect x="28" y="8" width="14" height="14" rx="2" className="stroke-teal-500 fill-teal-50 dark:fill-teal-900/30" />
        <rect x="28" y="26" width="14" height="14" rx="2" className="stroke-slate-400 fill-slate-50 dark:fill-slate-800" />
        <text x="31" y="18" className="fill-teal-600 dark:fill-teal-400" fontSize="8" fontWeight="600">T</text>
        <text x="30" y="36" className="fill-slate-400" fontSize="7" fontWeight="600">OD</text>
        <path d="M18 20 C22 20 24 16 28 16" className="stroke-teal-500" strokeWidth="2" strokeDasharray="3 2" />
        <path d="M26 13 L28 16 L26 19" className="stroke-teal-500" strokeWidth="2" />
      </svg>
    ),
  },
  {
    title: 'Daily To-Dos',
    description:
      'Click a project name on any entry to open the notes panel. The Daily To-Do tab lets you add checkable tasks for each project entry. Great for tracking what you worked on.',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="10" y="6" width="28" height="36" rx="3" className="stroke-slate-400 fill-slate-50 dark:fill-slate-800" />
        <rect x="15" y="14" width="6" height="6" rx="1" className="stroke-emerald-500 fill-emerald-500" />
        <path d="M16.5 17 L18.5 19 L20 15.5" className="stroke-white" strokeWidth="1.5" />
        <line x1="25" y1="17" x2="33" y2="17" className="stroke-slate-400" />
        <rect x="15" y="24" width="6" height="6" rx="1" className="stroke-slate-300 dark:stroke-slate-600" />
        <line x1="25" y1="27" x2="33" y2="27" className="stroke-slate-400" />
        <rect x="15" y="34" width="6" height="6" rx="1" className="stroke-slate-300 dark:stroke-slate-600" />
        <line x1="25" y1="37" x2="30" y2="37" className="stroke-slate-400" />
      </svg>
    ),
  },
  {
    title: 'Weekly Report',
    description:
      'Click the "Weekly Report" button to see a summary table of your time across all projects for the week. You can copy it as text or export as CSV.',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="8" width="36" height="32" rx="3" className="stroke-slate-400 fill-slate-50 dark:fill-slate-800" />
        <line x1="6" y1="16" x2="42" y2="16" className="stroke-slate-300 dark:stroke-slate-600" />
        <line x1="6" y1="24" x2="42" y2="24" className="stroke-slate-300 dark:stroke-slate-600" />
        <line x1="6" y1="32" x2="42" y2="32" className="stroke-slate-300 dark:stroke-slate-600" />
        <line x1="18" y1="8" x2="18" y2="40" className="stroke-slate-300 dark:stroke-slate-600" />
        <line x1="30" y1="8" x2="30" y2="40" className="stroke-slate-300 dark:stroke-slate-600" />
        <text x="22" y="23" className="fill-teal-500" fontSize="7" fontWeight="600">2.5</text>
        <text x="33" y="23" className="fill-teal-500" fontSize="7" fontWeight="600">1.0</text>
        <text x="10" y="23" className="fill-teal-500" fontSize="7" fontWeight="600">3.0</text>
      </svg>
    ),
  },
  {
    title: 'Dark Mode',
    description:
      'Toggle dark mode using the sun/moon icon in the top-right corner of the title bar. Your preference is saved automatically.',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="20" cy="24" r="10" className="stroke-amber-400 fill-amber-50 dark:fill-amber-900/30" />
        <line x1="20" y1="10" x2="20" y2="6" className="stroke-amber-400" strokeWidth="2" />
        <line x1="20" y1="42" x2="20" y2="38" className="stroke-amber-400" strokeWidth="2" />
        <line x1="6" y1="24" x2="10" y2="24" className="stroke-amber-400" strokeWidth="2" />
        <line x1="30" y1="24" x2="34" y2="24" className="stroke-amber-400" strokeWidth="2" />
        <path d="M34 18 A12 12 0 1 1 34 30" className="stroke-slate-500 dark:stroke-slate-400" strokeWidth="2" />
        <path d="M34 18 A8 8 0 0 0 34 30" className="stroke-slate-500 dark:stroke-slate-400 fill-slate-200 dark:fill-slate-700" strokeWidth="1" />
      </svg>
    ),
  },
];

export default function Onboarding() {
  const [visible, setVisible] = useState(() => !hasSeenOnboarding());
  const [step, setStep] = useState(0);

  if (!visible) return null;

  const current = steps[step];
  const isFirst = step === 0;
  const isLast = step === steps.length - 1;

  const handleDone = () => {
    markOnboardingDone();
    setVisible(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-[100]">
      <div className="w-[420px] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 pt-5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step
                  ? 'w-6 bg-teal-500'
                  : i < step
                    ? 'w-1.5 bg-teal-300 dark:bg-teal-700'
                    : 'w-1.5 bg-slate-200 dark:bg-slate-600'
              }`}
            />
          ))}
        </div>

        {/* Icon */}
        <div className="flex justify-center pt-6 pb-2">
          <div className="w-20 h-20 flex items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-700/50">
            {current.icon}
          </div>
        </div>

        {/* Content */}
        <div className="px-8 pb-2 text-center">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">
            {current.title}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            {current.description}
          </p>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 flex items-center justify-between">
          <button
            onClick={handleDone}
            className="text-sm text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
          >
            Skip
          </button>
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={isLast ? handleDone : () => setStep(step + 1)}
              className="px-5 py-2 text-sm font-medium text-white bg-teal-500 hover:bg-teal-600 rounded-lg shadow-sm transition-colors"
            >
              {isLast ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
