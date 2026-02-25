import { useState, useRef, useEffect } from 'react';
import useStore from '../store';
import type { AppData } from '../types';

export default function DataMenu() {
  const exportData = useStore((s) => s.exportData);
  const importData = useStore((s) => s.importData);

  const [isOpen, setIsOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingData = useRef<AppData | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowConfirm(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleImportClick = () => {
    fileRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string) as AppData;
        if (!data.projects && !data.days) {
          alert('Invalid backup file.');
          return;
        }
        pendingData.current = data;
        setShowConfirm(true);
      } catch {
        alert('Could not read file. Make sure it\'s a valid Track backup.');
      }
    };
    reader.readAsText(file);
    // Reset so the same file can be selected again
    e.target.value = '';
  };

  const handleConfirmImport = () => {
    if (pendingData.current) {
      importData(pendingData.current);
      pendingData.current = null;
    }
    setShowConfirm(false);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => { setIsOpen(!isOpen); setShowConfirm(false); }}
        className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-700 transition-colors"
        title="Data"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 1v10M4 7l4 4 4-4" />
          <path d="M2 13h12" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-50 overflow-hidden py-1">
          {showConfirm ? (
            <div className="px-3 py-3">
              <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
                This will replace all current data. Continue?
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleConfirmImport}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
                >
                  Replace
                </button>
                <button
                  onClick={() => { setShowConfirm(false); pendingData.current = null; }}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 dark:text-slate-400 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={() => { exportData(); setIsOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2.5"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 11V1M4 5l4-4 4 4" />
                  <path d="M2 13h12" />
                </svg>
                Export backup
              </button>
              <button
                onClick={handleImportClick}
                className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2.5"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 1v10M4 7l4 4 4-4" />
                  <path d="M2 13h12" />
                </svg>
                Import backup
              </button>
            </>
          )}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
