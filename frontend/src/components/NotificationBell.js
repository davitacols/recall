import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BellIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import { useNotifications } from '../hooks/useNotifications';
import { useToast } from './Toast';

function NotificationBell() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotification = (notification) => {
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
    if (addToast) {
      addToast(notification.message, 'info');
    }
  };

  useNotifications(handleNotification);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/notifications/');
      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unread_count || 0);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await api.post(`/api/notifications/${id}/read/`);
      fetchNotifications();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.post('/api/notifications/read-all/');
      fetchNotifications();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const groupNotificationsByType = (notifications) => {
    const grouped = {
      attention: [],
      fyi: []
    };
    
    notifications.forEach(notif => {
      if (['mention', 'decision', 'organization_update'].includes(notif.type)) {
        grouped.attention.push(notif);
      } else {
        grouped.fyi.push(notif);
      }
    });
    
    return grouped;
  };

  const groupedNotifications = groupNotificationsByType(notifications);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <BellIcon className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white border border-gray-200 shadow-lg z-50">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900">Notifications</h3>
            <button
              onClick={() => {
                navigate('/notifications');
                setIsOpen(false);
              }}
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              View All
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p className="text-sm">You're all caught up!</p>
                <p className="text-xs text-gray-400 mt-1">New mentions and updates will appear here.</p>
              </div>
            ) : (
              <>
                {groupedNotifications.attention.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                      <span className="text-xs font-bold text-gray-700 uppercase">Requires Attention</span>
                    </div>
                    {groupedNotifications.attention.slice(0, 3).map((notif) => (
                      <div
                        key={notif.id}
                        className="p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-sm font-bold text-gray-900 flex-1">{notif.title}</p>
                          {!notif.is_read && (
                            <div className="w-2 h-2 bg-red-600 rounded-full ml-2 mt-1.5 flex-shrink-0"></div>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mb-2">{notif.message}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {new Date(notif.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {notif.link && (
                            <Link
                              to={notif.link}
                              onClick={() => {
                                handleMarkAsRead(notif.id);
                                setIsOpen(false);
                              }}
                              className="text-xs font-bold text-gray-900 hover:underline"
                            >
                              View →
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {groupedNotifications.fyi.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                      <span className="text-xs font-bold text-gray-700 uppercase">FYI</span>
                    </div>
                    {groupedNotifications.fyi.slice(0, 2).map((notif) => (
                      <div
                        key={notif.id}
                        className="p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-sm font-medium text-gray-900 flex-1">{notif.title}</p>
                          {!notif.is_read && (
                            <div className="w-2 h-2 bg-gray-400 rounded-full ml-2 mt-1.5 flex-shrink-0"></div>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mb-2">{notif.message}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {new Date(notif.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          {notif.link && (
                            <Link
                              to={notif.link}
                              onClick={() => {
                                handleMarkAsRead(notif.id);
                                setIsOpen(false);
                              }}
                              className="text-xs font-medium text-gray-600 hover:text-gray-900"
                            >
                              View
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
