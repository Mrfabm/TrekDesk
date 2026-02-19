import React, { useState } from 'react';

export const Collapsible = ({ title, children, defaultOpen = false, className = '', expandUpward = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between p-4 rounded-lg ${className}`}
      >
        <span className="text-base font-semibold">{title}</span>
        <svg
          className={`w-5 h-5 transition-transform duration-500 ease-in-out ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {/* Backdrop overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 transition-opacity duration-500 ease-in-out ${
          isOpen && expandUpward ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
        style={{ zIndex: 40 }}
        onClick={() => setIsOpen(false)}
      />
      
      {/* Content container */}
      <div 
        className={`
          absolute w-full transform transition-all duration-500 ease-in-out
          ${expandUpward ? 'bottom-full mb-2' : 'top-full mt-2'}
          ${isOpen 
            ? 'translate-y-0 opacity-100 visible' 
            : `${expandUpward ? 'translate-y-8' : '-translate-y-8'} opacity-0 invisible`
          }
        `}
        style={{ zIndex: 50 }}
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center">
            <span className="text-base font-semibold">{title}</span>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors duration-300"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Content */}
          <div className="max-h-[80vh] overflow-y-auto p-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}; 