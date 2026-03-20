import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const PRESETS = [
  { label: 'Today',       days: 0 },
  { label: 'Last 7 Days', days: 7 },
  { label: 'Last 30 Days',days: 30 },
  { label: 'Last 90 Days',days: 90 },
];

/**
 * Shared date range bar used by Home3 and Bookings.
 * Props:
 *   from       {Date|null}
 *   to         {Date|null}
 *   onFromChange(date)
 *   onToChange(date)
 *   onClear()
 */
const DateRangeBar = ({ from, to, onFromChange, onToChange, onClear }) => {
  const [showPresets, setShowPresets] = useState(false);

  const setToday = () => {
    const t = new Date();
    onFromChange(t);
    onToChange(t);
  };

  const applyPreset = (days) => {
    const t = new Date();
    const f = new Date();
    f.setDate(f.getDate() - days);
    onFromChange(days === 0 ? t : f);
    onToChange(t);
    setShowPresets(false);
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={setToday}
        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 whitespace-nowrap"
      >
        Today
      </button>

      <DatePicker
        selected={from}
        onChange={onFromChange}
        placeholderText="From"
        dateFormat="MMM d, yyyy"
        className="w-36 px-3 py-2 text-sm text-gray-700 dark:text-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
      />

      <DatePicker
        selected={to}
        onChange={onToChange}
        placeholderText="To"
        dateFormat="MMM d, yyyy"
        minDate={from}
        className="w-36 px-3 py-2 text-sm text-gray-700 dark:text-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
      />

      <button
        onClick={onClear}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-50 whitespace-nowrap"
      >
        <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
        Clear
      </button>

      <div className="relative">
        <button
          onClick={() => setShowPresets(p => !p)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-50 whitespace-nowrap"
        >
          <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Date Range
        </button>

        {showPresets && (
          <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
            <div className="p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Presets</span>
                <button onClick={() => setShowPresets(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-1">
                {PRESETS.map(({ label, days }) => (
                  <button
                    key={label}
                    onClick={() => applyPreset(days)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DateRangeBar;
