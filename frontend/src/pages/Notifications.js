import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BellIcon, CheckIcon, TrashIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import { useToast } from '../components/Toast';

function Notifications() {
  const { addToast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/notifications/');
      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      addToast('Failed to load notifications', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await api.post(`/api/notifications/${id}/read/`);
      fetchNotifications();
    } catch (error) {
      addToast('Failed to mark as read', 'error');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.post('/api/notifications/read-all/');
      fetchNotifications();
      addToast('All notifications marked as read', 'success');
    } catch (error) {
      addToast('Failed to mark all as read', 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/notifications/${id}/`);
      fetchNotifications();
      addToast('Notification deleted', 'success');
    } catch (error) {
      addToast('Failed to delete notification', 'error');
    }
  };

  const getNotificationIcon = (type) => {
    return null;
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'read') return n.is_read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 md:mb-8">
        <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-2">Notifications</h1>
        <p className="text-base md:text-lg text-gray-600">
          {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white border-2 border-gray-900 p-4 md:p-6 mb-4 md:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex space-x-2 overflow-x-auto">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 font-bold uppercase text-xs whitespace-nowrap ${
                filter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 font-bold uppercase text-xs whitespace-nowrap ${
                filter === 'unread' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setFilter('read')}
              className={`px-4 py-2 font-bold uppercase text-xs whitespace-nowrap ${
                filter === 'read' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
              }`}
            >
              Read ({notifications.length - unreadCount})
            </button>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 font-bold uppercase text-xs whitespace-nowrap"
            >
              Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3 md:space-y-4">
        {filteredNotifications.length === 0 ? (
          <div className="bg-white border-2 border-gray-200 p-8 md:p-12 text-center">
            <BellIcon className="w-12 md:w-16 h-12 md:h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-base md:text-lg text-gray-500">
              {filter === 'unread' ? 'No unread notifications' : filter === 'read' ? 'No read notifications' : 'No notifications yet'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              className={`bg-white border-2 ${!notif.is_read ? 'border-gray-900' : 'border-gray-200'} p-4 md:p-6 hover:shadow-md transition-all`}
            >
              <div className="flex items-start gap-3 md:gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {!notif.is_read && (
                        <div className="w-2 h-2 bg-gray-900 rounded-full flex-shrink-0"></div>
                      )}
                      <h3 className="text-base md:text-lg font-bold text-gray-900">{notif.title}</h3>
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {new Date(notif.created_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                  
                  <p className="text-sm md:text-base text-gray-700 mb-3">{notif.message}</p>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    {notif.link && (
                      <Link
                        to={notif.link}
                        onClick={() => !notif.is_read && handleMarkAsRead(notif.id)}
                        className="px-3 py-1.5 bg-gray-900 text-white hover:bg-gray-800 font-bold uppercase text-xs"
                      >
                        View
                      </Link>
                    )}
                    {!notif.is_read && (
                      <button
                        onClick={() => handleMarkAsRead(notif.id)}
                        className="px-3 py-1.5 border-2 border-gray-900 text-gray-900 hover:bg-gray-100 font-bold uppercase text-xs flex items-center gap-1"
                      >
                        <CheckIcon className="w-3 h-3" />
                        Mark Read
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notif.id)}
                      className="px-3 py-1.5 border-2 border-red-600 text-red-600 hover:bg-red-50 font-bold uppercase text-xs flex items-center gap-1"
                    >
                      <TrashIcon className="w-3 h-3" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Notifications;
