import { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

/**
 * actions: { label, onClick, variant?: 'default' | 'primary' | 'danger', show?: boolean }
 * Items with show === false are hidden.
 */
export default function RowActionsDropdown({ actions, label = 'Actions' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const visible = actions.filter((a) => a && a.show !== false);
  if (visible.length === 0) return <span className="text-xs text-gray-300">—</span>;

  const standard = visible.filter((a) => a.variant !== 'danger');
  const danger   = visible.filter((a) => a.variant === 'danger');

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors
          ${open
            ? 'bg-gray-100 border-gray-300 text-gray-800 dark:bg-gray-700 dark:border-gray-500 dark:text-white'
            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-800 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
      >
        {label}
        <ChevronDownIcon className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-48 rounded-lg bg-white dark:bg-gray-800 shadow-lg ring-1 ring-gray-200 dark:ring-gray-700 overflow-hidden">
          {standard.length > 0 && (
            <div className="py-1">
              {standard.map((action, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setOpen(false); action.onClick(); }}
                  className={`w-full text-left px-4 py-2 text-xs transition-colors
                    ${action.variant === 'primary'
                      ? 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}

          {danger.length > 0 && (
            <>
              {standard.length > 0 && <div className="border-t border-gray-100 dark:border-gray-700" />}
              <div className="py-1">
                {danger.map((action, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); setOpen(false); action.onClick(); }}
                    className="w-full text-left px-4 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
