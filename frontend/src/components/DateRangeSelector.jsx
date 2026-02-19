import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

export const DateRangeSelector = ({ fromDate, toDate, onDateChange }) => {
  const [showPresets, setShowPresets] = useState(false);
  
  const presets = [
    { label: 'Today', value: 'today' },
    { label: 'Last 7 days', value: '7days' },
    { label: 'Last 30 days', value: '30days' },
    { label: 'This Month', value: 'thisMonth' },
    { label: 'Last Month', value: 'lastMonth' },
    { label: 'Custom Range', value: 'custom' }
  ];

  const handlePresetSelect = (preset) => {
    const today = new Date();
    let from = new Date();

    switch (preset) {
      case 'today':
        from = new Date();
        break;
      case '7days':
        from.setDate(today.getDate() - 7);
        break;
      case '30days':
        from.setDate(today.getDate() - 30);
        break;
      case 'thisMonth':
        from = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'lastMonth':
        from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        onDateChange({ from, to: lastDayOfLastMonth });
        setShowPresets(false);
        return;
      default:
        break;
    }

    onDateChange({ from, to: today });
    setShowPresets(false);
  };

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">From:</label>
            <DatePicker
              selected={fromDate}
              onChange={(date) => onDateChange({ from: date, to: toDate })}
              className="px-3 py-2 border border-gray-300 rounded-md"
              dateFormat="MMM d, yyyy"
              maxDate={toDate || new Date()}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">To:</label>
            <DatePicker
              selected={toDate}
              onChange={(date) => onDateChange({ from: fromDate, to: date })}
              className="px-3 py-2 border border-gray-300 rounded-md"
              dateFormat="MMM d, yyyy"
              minDate={fromDate}
              maxDate={new Date()}
            />
          </div>
          <div className="relative">
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
            >
              <span>Quick Ranges</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showPresets && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                {presets.map(preset => (
                  <button
                    key={preset.value}
                    onClick={() => handlePresetSelect(preset.value)}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-50"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">
            <span className="font-medium">Current Range:</span> {fromDate ? (
              <>
                {fromDate.toLocaleDateString()} - {toDate?.toLocaleDateString() || 'Present'}
              </>
            ) : (
              'All time'
            )}
          </div>
          <button
            onClick={() => onDateChange({ from: null, to: null })}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}; 