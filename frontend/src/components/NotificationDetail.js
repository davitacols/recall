import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const NotificationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotification();
  }, [id]);

  const fetchNotification = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/api/notifications/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const notif = response.data.notifications?.find(n => n.id === parseInt(id));
      setNotification(notif);
      
      if (notif && !notif.is_read) {
        await axios.post(`${API_BASE}/api/notifications/${id}/read/`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (error) {
      console.error('Error fetching notification:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE}/api/notifications/${id}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate('/notifications');
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleNavigate = () => {
    if (notification?.link) {
      navigate(notification.link);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-black text-sm font-['League_Spartan'] uppercase tracking-wider">LOADING...</div>
      </div>
    );
  }

  if (!notification) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-black text-sm font-['League_Spartan'] uppercase tracking-wider">NOTIFICATION NOT FOUND</div>
      </div>
    );
  }

  const typeColors = {
    mention: 'bg-black',
    reply: 'bg-gray-800',
    decision: 'bg-gray-700',
    reminder: 'bg-gray-600',
    badge: 'bg-black',
    system: 'bg-gray-500'
  };

  const notifType = notification?.type || notification?.notification_type || 'system';

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8 border-b-2 border-black pb-4">
          <button
            onClick={() => navigate('/notifications')}
            className="text-black text-sm font-['League_Spartan'] uppercase tracking-wider hover:bg-black hover:text-white px-4 py-2 border-2 border-black transition-colors mb-4"
          >
            â† BACK TO NOTIFICATIONS
          </button>
          <h1 className="text-4xl font-['League_Spartan'] uppercase tracking-wider text-black font-bold">
            NOTIFICATION DETAIL
          </h1>
        </div>

        {/* Notification Card */}
        <div className="border-2 border-black p-8 bg-white">
          {/* Type Badge */}
          <div className="mb-6">
            <span className={`${typeColors[notifType]} text-white px-4 py-2 text-xs font-['League_Spartan'] uppercase tracking-wider`}>
              {notifType}
            </span>
          </div>

          {/* Title */}
          <h2 className="text-3xl font-['League_Spartan'] uppercase tracking-wider text-black font-bold mb-6">
            {notification.title}
          </h2>

          {/* Message */}
          <div className="mb-8 text-gray-800 text-base leading-relaxed whitespace-pre-wrap">
            {notification.message}
          </div>

          {/* Metadata */}
          <div className="border-t-2 border-gray-300 pt-6 mb-8">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-['League_Spartan'] uppercase tracking-wider text-gray-600 text-xs">RECEIVED</span>
                <div className="text-black mt-1">{new Date(notification.created_at).toLocaleString()}</div>
              </div>
              <div>
                <span className="font-['League_Spartan'] uppercase tracking-wider text-gray-600 text-xs">STATUS</span>
                <div className="text-black mt-1">{notification.is_read ? 'READ' : 'UNREAD'}</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            {notification.link && (
              <button
                onClick={handleNavigate}
                className="bg-black text-white px-6 py-3 text-sm font-['League_Spartan'] uppercase tracking-wider hover:bg-gray-800 transition-colors border-2 border-black"
              >
                VIEW RELATED CONTENT
              </button>
            )}
            <button
              onClick={handleDelete}
              className="bg-white text-black px-6 py-3 text-sm font-['League_Spartan'] uppercase tracking-wider hover:bg-black hover:text-white transition-colors border-2 border-black"
            >
              DELETE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationDetail;



