import React from 'react';

const colorMap = {
  blue: {
    bg: 'bg-blue-50/50',
    border: 'border-blue-100',
    hoverBg: 'hover:bg-blue-50',
    iconBg: 'bg-blue-100/50',
    text: 'text-blue-700'
  },
  green: {
    bg: 'bg-green-50/50',
    border: 'border-green-100',
    hoverBg: 'hover:bg-green-50',
    iconBg: 'bg-green-100/50',
    text: 'text-green-700'
  },
  yellow: {
    bg: 'bg-yellow-50/50',
    border: 'border-yellow-100',
    hoverBg: 'hover:bg-yellow-50',
    iconBg: 'bg-yellow-100/50',
    text: 'text-yellow-700'
  },
  red: {
    bg: 'bg-red-50/50',
    border: 'border-red-100',
    hoverBg: 'hover:bg-red-50',
    iconBg: 'bg-red-100/50',
    text: 'text-red-700'
  },
  purple: {
    bg: 'bg-purple-50/50',
    border: 'border-purple-100',
    hoverBg: 'hover:bg-purple-50',
    iconBg: 'bg-purple-100/50',
    text: 'text-purple-700'
  }
};

export const ActionCard = ({ icon, color, count, label, onClick }) => {
  const colors = colorMap[color];
  
  const getIcon = (icon) => {
    switch (icon) {
      case 'clock':
        return (
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
          />
        );
      case 'check':
        return (
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
          />
        );
      case 'dollar':
        return (
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
          />
        );
      case 'x':
        return (
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" 
          />
        );
      case 'exclamation':
        return (
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
          />
        );
      default:
        return null;
    }
  };

  return (
    <div 
      onClick={onClick}
      className={`p-3 rounded-lg border transition-all duration-200 cursor-pointer ${colors.bg} ${colors.border} ${colors.hoverBg}`}
    >
      <div className="flex justify-between items-center mb-1.5">
        <div className={`p-1.5 rounded-lg ${colors.iconBg}`}>
          <svg className={`w-4 h-4 ${colors.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {getIcon(icon)}
          </svg>
        </div>
        <span className={`text-lg font-bold ${colors.text}`}>{count}</span>
      </div>
      <p className={`text-xs font-medium ${colors.text} mt-1`}>{label}</p>
    </div>
  );
}; 