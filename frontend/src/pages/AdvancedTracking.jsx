import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { useTheme } from '../context/ThemeContext';

const mockTrendData = [
  { day: 'Mon', bookings: 12, revenue: 18000, amendments: 3 },
  { day: 'Tue', bookings: 15, revenue: 22500, amendments: 2 },
  { day: 'Wed', bookings: 18, revenue: 27000, amendments: 4 },
  { day: 'Thu', bookings: 14, revenue: 21000, amendments: 1 },
  { day: 'Fri', bookings: 20, revenue: 30000, amendments: 3 },
  { day: 'Sat', bookings: 25, revenue: 37500, amendments: 5 },
  { day: 'Sun', bookings: 22, revenue: 33000, amendments: 2 },
];

const CustomTooltip = ({ children, text }) => {
  return (
    <div className="group relative inline-block">
      {children}
      <div className="opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg whitespace-nowrap">
        {text}
      </div>
    </div>
  );
};

const AdvancedTracking = () => {
  const { darkMode } = useTheme();
  const [selectedMetric, setSelectedMetric] = useState('bookings');
  const [dateRange, setDateRange] = useState('week');

  return (
    <div className={`p-4 max-w-[1920px] mx-auto ${darkMode ? 'bg-gray-900' : 'bg-gray-50/50'} space-y-5`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className={`text-2xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Advanced Tracking
          </h1>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
            Detailed analytics and trends
          </p>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm border border-gray-200 p-1">
            <button
              onClick={() => setDateRange('week')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                dateRange === 'week'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setDateRange('month')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                dateRange === 'month'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setDateRange('year')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                dateRange === 'year'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Year
            </button>
          </div>
        </div>
      </div>

      {/* Metric Selection */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <button
          onClick={() => setSelectedMetric('bookings')}
          className={`p-4 rounded-lg border transition-all ${
            selectedMetric === 'bookings'
              ? 'border-blue-200 bg-blue-50 shadow-sm'
              : 'border-gray-200 bg-white hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Bookings</span>
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">126</div>
          <div className="text-sm text-gray-500 mt-1">This {dateRange}</div>
        </button>

        <button
          onClick={() => setSelectedMetric('revenue')}
          className={`p-4 rounded-lg border transition-all ${
            selectedMetric === 'revenue'
              ? 'border-green-200 bg-green-50 shadow-sm'
              : 'border-gray-200 bg-white hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Revenue</span>
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">$189,000</div>
          <div className="text-sm text-gray-500 mt-1">This {dateRange}</div>
        </button>

        <button
          onClick={() => setSelectedMetric('amendments')}
          className={`p-4 rounded-lg border transition-all ${
            selectedMetric === 'amendments'
              ? 'border-purple-200 bg-purple-50 shadow-sm'
              : 'border-gray-200 bg-white hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Amendments</span>
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">20</div>
          <div className="text-sm text-gray-500 mt-1">This {dateRange}</div>
        </button>
      </div>

      {/* Trend Chart */}
      <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white'} rounded-lg shadow-sm border border-gray-200 p-4`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className={`text-base font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
            {selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} Trend
          </h3>
          <CustomTooltip text={`Shows ${selectedMetric} trend over time`}>
            <svg className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </CustomTooltip>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mockTrendData}>
              <XAxis 
                dataKey="day" 
                stroke={darkMode ? '#9CA3AF' : '#6B7280'}
                tick={{ fill: darkMode ? '#9CA3AF' : '#6B7280' }}
              />
              <YAxis 
                stroke={darkMode ? '#9CA3AF' : '#6B7280'}
                tick={{ fill: darkMode ? '#9CA3AF' : '#6B7280' }}
              />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: darkMode ? '#1F2937' : 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  color: darkMode ? '#D1D5DB' : '#374151'
                }}
              />
              <Line
                type="monotone"
                dataKey={selectedMetric}
                stroke={
                  selectedMetric === 'bookings' ? '#3B82F6' :
                  selectedMetric === 'revenue' ? '#10B981' :
                  '#8B5CF6'
                }
                strokeWidth={2}
                dot={{ 
                  fill: selectedMetric === 'bookings' ? '#3B82F6' :
                        selectedMetric === 'revenue' ? '#10B981' :
                        '#8B5CF6',
                  strokeWidth: 2 
                }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AdvancedTracking; 