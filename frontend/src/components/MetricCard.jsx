import React from 'react';

const CustomTooltip = React.memo(({ children, text }) => (
  <div className="group relative inline-block">
    {children}
    <div className="opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg whitespace-nowrap z-50">
      {text}
    </div>
  </div>
));

const InfoIcon = React.memo(() => (
  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
));

export const MetricCard = React.memo(({ title, total, items = [], onItemClick, tooltip, priority = 'normal' }) => {
  const cardStyle = React.useMemo(() => {
    switch (priority) {
      case 'critical':
        return 'border-red-200 bg-red-50/50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50/50';
      case 'success':
        return 'border-green-200 bg-green-50/50';
      default:
        return 'border-gray-200';
    }
  }, [priority]);

  const titleColor = React.useMemo(() => {
    switch (priority) {
      case 'critical':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      case 'success':
        return 'text-green-600';
      default:
        return 'text-gray-800';
    }
  }, [priority]);

  return (
    <div className={`bg-white rounded-lg border ${cardStyle} transition-colors duration-200`}>
      <div className="p-3 border-b border-gray-100">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-gray-600">{title}</h3>
            {tooltip && (
              <CustomTooltip text={tooltip}>
                <InfoIcon />
              </CustomTooltip>
            )}
          </div>
          <span className={`text-lg font-bold ${titleColor}`}>{total}</span>
        </div>
      </div>
      <div className="p-3 space-y-2">
        {items.map((item, index) => (
          <div 
            key={`${item.label}-${index}`}
            onClick={() => onItemClick?.(item.label.toLowerCase().replace(/\s+/g, '_'))}
            className={`flex justify-between items-center ${onItemClick ? 'cursor-pointer' : ''} 
              hover:bg-gray-50 rounded px-2 py-1 transition-colors`}
          >
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">{item.label}</span>
              {item.tooltip && (
                <CustomTooltip text={item.tooltip}>
                  <InfoIcon />
                </CustomTooltip>
              )}
            </div>
            <span className={`text-sm font-medium ${
              item.status === 'critical' ? 'text-red-600' :
              item.status === 'warning' ? 'text-yellow-600' :
              item.status === 'success' ? 'text-green-600' :
              'text-gray-700'
            }`}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}); 