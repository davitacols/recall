import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const NotificationsList = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/api/notifications/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:8000/api/notifications/mark_all_read/', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'read') return n.is_read;
    return true;
  });

  const typeColors = {
    mention: 'bg-black',
    reply: 'bg-gray-800',
    decision: 'bg-gray-700',
    reminder: 'bg-gray-600',
    badge: 'bg-black',
    system: 'bg-gray-500'
  };

  const getType = (notification) => notification.type || notification.notification_type || 'system';

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-black text-sm font-['League_Spartan'] uppercase tracking-wider">LOADING...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8 border-b-2 border-black pb-6">
          <h1 className="text-5xl font-['League_Spartan'] uppercase tracking-wider text-black font-bold mb-4">
            NOTIFICATIONS
          </h1>
          <div className="flex justify-between items-center">
            <div className="flex gap-4">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 text-xs font-['League_Spartan'] uppercase tracking-wider border-2 border-black transition-colors ${
                  filter === 'all' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'
                }`}
              >
                ALL ({notifications.length})
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-4 py-2 text-xs font-['League_Spartan'] uppercase tracking-wider border-2 border-black transition-colors ${
                  filter === 'unread' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'
                }`}
              >
                UNREAD ({notifications.filter(n => !n.is_read).length})
              </button>
              <button
                onClick={() => setFilter('read')}
                className={`px-4 py-2 text-xs font-['League_Spartan'] uppercase tracking-wider border-2 border-black transition-colors ${
                  filter === 'read' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'
                }`}
              >
                READ ({notifications.filter(n => n.is_read).length})
              </button>
            </div>
            <button
              onClick={handleMarkAllRead}
              className="bg-white text-black px-4 py-2 text-xs font-['League_Spartan'] uppercase tracking-wider hover:bg-black hover:text-white transition-colors border-2 border-black"
            >
              MARK ALL READ
            </button>
          </div>
        </div>

        {/* Notifications Grid */}
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-16 border-2 border-gray-300">
            <div className="text-gray-400 text-sm font-['League_Spartan'] uppercase tracking-wider">
              NO NOTIFICATIONS
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredNotifications.map(notification => (
              <div
                key={notification.id}
                onClick={() => navigate(`/notifications/${notification.id}`)}
                className={`border-2 border-black p-6 cursor-pointer hover:bg-gray-50 transition-colors ${
                  !notification.is_read ? 'bg-gray-100' : 'bg-white'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`${typeColors[getType(notification)]} text-white px-3 py-1 text-xs font-['League_Spartan'] uppercase tracking-wider`}>
                        {getType(notification)}
                      </span>
                      {!notification.is_read && (
                        <span className="w-2 h-2 bg-black rounded-full"></span>
                      )}
                    </div>
                    <h3 className="text-xl font-['League_Spartan'] uppercase tracking-wider text-black font-bold mb-2">
                      {notification.title}
                    </h3>
                    <p className="text-gray-700 text-sm line-clamp-2 mb-3">
                      {notification.message}
                    </p>
                    <div className="text-xs text-gray-500 font-['League_Spartan'] uppercase tracking-wider">
                      {new Date(notification.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-black text-xl ml-4">→</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsList;
