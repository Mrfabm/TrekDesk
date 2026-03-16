import React from 'react';
import "react-datepicker/dist/react-datepicker.css";

const EnhancedFilters = ({ 
  selectedFilters, 
  onFilterChange,
  stats,
  savedPresets = [],
  onSavePreset,
  onClearFilters
}) => {
  return (
    <div>
      {/* Preset and Clear options */}
      <div className="flex justify-end gap-4 mb-3">
        <button
          onClick={() => onSavePreset(selectedFilters)}
          className="text-blue-600 hover:text-blue-700 text-sm"
        >
          Save Preset
        </button>
        <button
          onClick={onClearFilters}
          className="text-gray-600 hover:text-gray-700 text-sm"
        >
          Clear All
        </button>
      </div>

      {/* Main Filter Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Product Type</h3>
          <div className="flex gap-3">
            <button
              onClick={() => onFilterChange('product', '')}
              className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors
                ${selectedFilters.product === '' 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' 
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              All Products
            </button>
            <button
              onClick={() => onFilterChange('product', 'Mountain Gorillas')}
              className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors
                ${selectedFilters.product === 'Mountain Gorillas'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Mountain Gorillas
            </button>
            <button
              onClick={() => onFilterChange('product', 'Golden Monkeys')}
              className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors
                ${selectedFilters.product === 'Golden Monkeys'
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Golden Monkeys
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Advanced Filters</h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            {[
              { id: 'noSlots', label: 'No Slots Available', count: stats?.noSlots || 0 },
              { id: 'unpaid', label: 'Unpaid', count: stats?.unpaid || 1 },
              { id: 'topUpDue', label: 'Top-up Due', count: stats?.topUpDue || 2 },
              { id: 'cancelled', label: 'Cancelled', count: stats?.cancelled || 0 },
              { id: 'amended', label: 'Amended', count: stats?.amended || 0 }
            ].map(({ id, label, count }) => (
              <div key={id} className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id={id}
                    checked={selectedFilters[id]}
                    onChange={(e) => onFilterChange(id, e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor={id} className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                    {label}
                  </label>
                </div>
                <span className="text-sm text-gray-500">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedFilters; 