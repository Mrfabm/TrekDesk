import React from 'react';
import { Tooltip } from 'react-tooltip';

const EnhancedStatsCard = ({ 
  title, 
  value, 
  icon, 
  trend, 
  color, 
  onClick,
  tooltipContent 
}) => {
  return (
    <button
      onClick={onClick}
      className="group relative w-full transform transition-all duration-300 hover:scale-102 hover:-translate-y-0.5"
      data-tooltip-id={`stats-tooltip-${title}`}
    >
      <div className={`absolute inset-0 bg-gradient-to-r ${color} rounded-lg blur opacity-25 group-hover:opacity-35 transition-opacity`}></div>
      <div className="relative bg-white dark:bg-gray-800 rounded-lg p-5 shadow-md border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className={`bg-${color.split('from-')[1].split('-')[0]}-100 dark:bg-${color.split('from-')[1].split('-')[0]}-900/50 rounded-lg p-2.5`}>
            <div className="w-5 h-5">
              {icon}
            </div>
          </div>
          {trend !== undefined && (
            <span className={`text-sm font-semibold ${trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-600'}`}>
              {trend > 0 ? '↑' : trend < 0 ? '↓' : '–'}{Math.abs(trend)}%
            </span>
          )}
        </div>
        <div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {value}
          </p>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-1">
            {title}
          </p>
        </div>
      </div>

      <Tooltip id={`stats-tooltip-${title}`} place="top">
        <div className="p-2 max-w-xs">
          <p className="text-sm">{tooltipContent}</p>
        </div>
      </Tooltip>
    </button>
  );
};

export default EnhancedStatsCard; 