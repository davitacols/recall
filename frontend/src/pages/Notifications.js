import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BellIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/api/notifications/');
      setNotifications(response.data.results || response.data || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await api.patch(`/api/notifications/${notificationId}/`, { read: true });
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await api.delete(`/api/notifications/${notificationId}/`);
      setNotifications(notifications.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const filteredNotifications = filter === 'all' 
    ? notifications 
    : filter === 'unread' 
    ? notifications.filter(n => !n.read)
    : notifications.filter(n => n.type === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-12 md:py-16">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-6">
            <BellIcon className="w-8 h-8 text-gray-900" />
            <h1 className="text-5xl font-black text-gray-900">Notifications</h1>
          </div>
          <p className="text-lg text-gray-600 font-light">Stay updated on sprints, blockers, and team activity</p>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-12 flex-wrap">
          {['all', 'unread', 'sprint', 'blocker', 'decision'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-3 font-bold uppercase text-sm transition-all ${
                filter === f
                  ? 'bg-gray-900 text-white'
                  : 'bg-white border border-gray-300 text-gray-900 hover:border-gray-900'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-24 bg-white border border-gray-200">
            <BellIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-3xl font-black text-gray-900 mb-3">No notifications</h3>
            <p className="text-lg text-gray-600 font-light">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredNotifications.map(notification => (
              <div
                key={notification.id}
                className={`p-6 border-l-4 transition-all ${
                  notification.read
                    ? 'bg-gray-50 border-gray-300'
                    : 'bg-blue-50 border-blue-600'
                }`}
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                        notification.type === 'sprint' ? 'bg-green-100 text-green-700' :
                        notification.type === 'blocker' ? 'bg-red-100 text-red-700' :
                        notification.type === 'decision' ? 'bg-purple-100 text-purple-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {notification.type}
                      </span>
                      {!notification.read && (
                        <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{notification.title}</h3>
                    <p className="text-gray-600 mb-3">{notification.message}</p>
                    <p className="text-xs text-gray-500">{new Date(notification.created_at).toLocaleString()}</p>
                  </div>

                  <div className="flex gap-2">
                    {notification.related_url && (
                      <Link
                        to={notification.related_url}
                        className="px-4 py-2 bg-gray-900 text-white hover:bg-black font-bold uppercase text-xs transition-all"
                      >
                        View
                      </Link>
                    )}
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="p-2 hover:bg-gray-200 transition-all"
                        title="Mark as read"
                      >
                        <CheckIcon className="w-5 h-5 text-gray-600" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="p-2 hover:bg-gray-200 transition-all"
                      title="Delete"
                    >
                      <XMarkIcon className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Notifications;
