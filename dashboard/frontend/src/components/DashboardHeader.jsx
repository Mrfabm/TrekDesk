import React from 'react';
import { format } from 'date-fns';
import NotificationsCenter from './NotificationsCenter';

const DashboardHeader = ({ stats, onRefresh, lastRefresh }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Welcome Back, Admin
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Last updated: {lastRefresh ? format(new Date(lastRefresh), 'HH:mm:ss') : '--:--:--'}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <NotificationsCenter notifications={[
            {
              title: 'New Booking Request',
              message: 'A new booking requires your attention',
              time: '5 minutes ago',
              read: false
            },
            {
              title: 'Payment Received',
              message: 'Payment confirmed for booking #1234',
              time: '1 hour ago',
              read: false
            }
          ]} />
          <button 
            onClick={onRefresh}
            className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
            title="Refresh Dashboard"
          >
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mt-3">
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Bookings</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">{stats.totalBookings || 0}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">Today's Bookings</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">{stats.todayBookings || 0}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">Pending Actions</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">{stats.pendingActions || 0}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">Success Rate</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {Math.round((stats.okToPurchaseFull + stats.okToPurchaseDeposit) / (stats.totalBookings || 1) * 100)}%
          </p>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader; 