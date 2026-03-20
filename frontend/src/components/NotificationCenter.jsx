import React, { useState, useEffect, useRef } from 'react';
import { BellIcon, ArchiveBoxIcon } from '@heroicons/react/24/outline';
import axios from '../utils/axios';

const getPriorityColor = (priority) => {
  switch (priority) {
    case 'urgent': return 'text-red-600';
    case 'high':   return 'text-orange-500';
    case 'medium': return 'text-yellow-500';
    default:       return 'text-gray-500';
  }
};

const getTypeIcon = (type) => {
  switch (type) {
    case 'success': return '✅';
    case 'warning': return '⚠️';
    case 'error':   return '❌';
    case 'urgent':  return '🚨';
    default:        return 'ℹ️';
  }
};

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('unread');
  const [expandedId, setExpandedId] = useState(null);
  const panelRef = useRef(null);

  // Fetch tab notifications
  const fetchNotifications = async (tab = activeTab) => {
    try {
      const { data } = await axios.get(`/notifications?status=${tab}`);
      setNotifications(data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  // Always keep unread count fresh (independent of active tab)
  const fetchUnreadCount = async () => {
    try {
      const { data } = await axios.get('/notifications?status=unread');
      setUnreadCount(data.length);
    } catch {}
  };

  // Initial load + polling every 30s
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Refetch when tab changes or panel opens
  useEffect(() => {
    if (isOpen) fetchNotifications(activeTab);
  }, [activeTab, isOpen]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const markAsRead = async (id) => {
    try {
      await axios.post(`/notifications/${id}/read`);
      fetchNotifications();
      fetchUnreadCount();
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const archiveNotification = async (id) => {
    try {
      await axios.post(`/notifications/${id}/archive`);
      fetchNotifications();
      fetchUnreadCount();
    } catch (err) {
      console.error('Error archiving notification:', err);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className="relative p-2 text-gray-600 hover:text-gray-800 focus:outline-none"
      >
        <BellIcon className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full translate-x-1/2 -translate-y-1/2">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-[9999]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-xs text-gray-400">{unreadCount} unread</span>
            )}
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100 dark:border-gray-700">
            {['unread', 'read', 'archived'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-xs font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
            {notifications.length === 0 ? (
              <p className="p-4 text-center text-xs text-gray-400">No {activeTab} notifications</p>
            ) : (
              notifications.map(n => {
                const isExpanded = expandedId === n.id;
                return (
                  <div
                    key={n.id}
                    className={`border-b border-gray-100 dark:border-gray-700 last:border-0 transition-colors ${
                      n.status === 'unread' ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''
                    } hover:bg-gray-50 dark:hover:bg-gray-750`}
                  >
                    {/* Clickable header row */}
                    <button
                      className="w-full text-left px-3 pt-3 pb-2 flex items-start gap-2"
                      onClick={() => {
                        setExpandedId(isExpanded ? null : n.id);
                        if (n.status === 'unread') markAsRead(n.id);
                      }}
                    >
                      <span className="text-sm leading-none mt-0.5 flex-shrink-0">{getTypeIcon(n.type)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-xs font-semibold ${getPriorityColor(n.priority)} ${!isExpanded ? 'truncate' : ''}`}>
                            {n.title}
                          </span>
                          <span className="text-gray-300 dark:text-gray-600 text-xs flex-shrink-0">
                            {isExpanded ? '▲' : '▼'}
                          </span>
                        </div>
                        {!isExpanded && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{n.message}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-0.5">{new Date(n.created_at).toLocaleString()}</p>
                      </div>
                    </button>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="px-3 pb-3 pl-9">
                        <p className="text-xs text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">{n.message}</p>
                        {n.requires_action && n.action_url && (
                          <a href={n.action_url} className="mt-2 inline-block text-xs text-blue-600 hover:underline font-medium">
                            Take Action →
                          </a>
                        )}
                        <div className="flex gap-2 mt-2">
                          {n.status !== 'archived' && (
                            <button
                              onClick={() => archiveNotification(n.id)}
                              className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              <ArchiveBoxIcon className="h-3.5 w-3.5" /> Archive
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
