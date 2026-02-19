import React, { useState, useEffect } from 'react';
import { BellIcon, CheckCircleIcon, ArchiveBoxIcon } from '@heroicons/react/24/outline';
import axios from '../utils/axios';

const NotificationCenter = () => {
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('unread');

    useEffect(() => {
        fetchNotifications();
    }, [activeTab]);

    // Fetch notifications based on status
    const fetchNotifications = async () => {
        try {
            const { data } = await axios.get(`/notifications?status=${activeTab}`);
            setNotifications(data);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

    // Mark notification as read
    const markAsRead = async (notificationId) => {
        try {
            await axios.post(`/notifications/${notificationId}/read`);
            fetchNotifications();
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    // Archive notification
    const archiveNotification = async (notificationId) => {
        try {
            await axios.post(`/notifications/${notificationId}/archive`);
            fetchNotifications();
        } catch (error) {
            console.error('Error archiving notification:', error);
        }
    };

    // Get priority color
    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'URGENT':
                return 'text-red-600';
            case 'HIGH':
                return 'text-orange-500';
            case 'MEDIUM':
                return 'text-yellow-500';
            default:
                return 'text-gray-500';
        }
    };

    // Get notification type icon
    const getTypeIcon = (type) => {
        switch (type) {
            case 'SUCCESS':
                return '✅';
            case 'WARNING':
                return '⚠️';
            case 'ERROR':
                return '❌';
            case 'URGENT':
                return '🚨';
            default:
                return 'ℹ️';
        }
    };

    const unreadCount = notifications.filter(n => n.status === 'UNREAD').length;

    return (
        <div className="relative">
            {/* Notification Bell */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-600 hover:text-gray-800 focus:outline-none"
            >
                <BellIcon className="h-6 w-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                        {unreadCount}
                    </span>
                )}
            </button>

            {/* Notification Panel */}
            <div className={`
                absolute right-0 w-80 bg-white rounded-lg shadow-xl 
                transition-all duration-200 ease-in-out
                ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}
                mt-2
                z-[9999]
            `}>
                {/* Tabs */}
                <div className="flex border-b">
                    <button
                        className={`flex-1 py-2 px-4 text-sm font-medium ${
                            activeTab === 'unread' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'
                        }`}
                        onClick={() => setActiveTab('unread')}
                    >
                        Unread
                    </button>
                    <button
                        className={`flex-1 py-2 px-4 text-sm font-medium ${
                            activeTab === 'read' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'
                        }`}
                        onClick={() => setActiveTab('read')}
                    >
                        Read
                    </button>
                    <button
                        className={`flex-1 py-2 px-4 text-sm font-medium ${
                            activeTab === 'archived' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'
                        }`}
                        onClick={() => setActiveTab('archived')}
                    >
                        Archived
                    </button>
                </div>

                {/* Notification List */}
                <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                            No notifications
                        </div>
                    ) : (
                        notifications.map(notification => (
                            <div
                                key={notification.id}
                                className="p-4 border-b hover:bg-gray-50"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center">
                                            <span className="mr-2">
                                                {getTypeIcon(notification.type)}
                                            </span>
                                            <h4 className={`font-medium ${getPriorityColor(notification.priority)}`}>
                                                {notification.title}
                                            </h4>
                                        </div>
                                        <p className="mt-1 text-sm text-gray-600">
                                            {notification.message}
                                        </p>
                                        {notification.requires_action && notification.action_url && (
                                            <a
                                                href={notification.action_url}
                                                className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-800"
                                            >
                                                Take Action →
                                            </a>
                                        )}
                                        <div className="mt-2 text-xs text-gray-400">
                                            {new Date(notification.created_at).toLocaleString()}
                                        </div>
                                    </div>
                                    <div className="ml-4 flex-shrink-0 flex space-x-2">
                                        {notification.status === 'UNREAD' && (
                                            <button
                                                onClick={() => markAsRead(notification.id)}
                                                className="text-gray-400 hover:text-gray-600"
                                                title="Mark as read"
                                            >
                                                <CheckCircleIcon className="h-5 w-5" />
                                            </button>
                                        )}
                                        {notification.status !== 'ARCHIVED' && (
                                            <button
                                                onClick={() => archiveNotification(notification.id)}
                                                className="text-gray-400 hover:text-gray-600"
                                                title="Archive"
                                            >
                                                <ArchiveBoxIcon className="h-5 w-5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationCenter; 