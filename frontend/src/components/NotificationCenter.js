import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../utils/ThemeAndAccessibility';
import { BellIcon, CheckIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

export default function NotificationCenter() {
  const { user } = useAuth();
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const wsRef = useRef(null);

  const bgColor = darkMode ? '#1c1917' : '#ffffff';
  const textColor = darkMode ? '#e7e5e4' : '#111827';
  const borderColor = darkMode ? '#292524' : '#e5e7eb';
  const secondaryText = darkMode ? '#a8a29e' : '#6b7280';

  useEffect(() => {
    if (user) {
      fetchNotifications();
      connectWebSocket();
    }
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [user]);

  const connectWebSocket = () => {
    const token = localStorage.getItem('token');
    const wsUrl = `ws://localhost:8000/ws/notifications/?token=${token}`;
    
    wsRef.current = new WebSocket(wsUrl);
    
    wsRef.current.onopen = () => {
      console.log('WebSocket connected');
    };
    
    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'notification') {
        setNotifications(prev => [data.notification, ...prev]);
        setUnreadCount(prev => prev + 1);
      }
    };
    
    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    wsRef.current.onclose = () => {
      console.log('WebSocket disconnected');
      // Reconnect after 5 seconds
      setTimeout(connectWebSocket, 5000);
    };
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/api/notifications/');
      setNotifications(res.data);
      setUnreadCount(res.data.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.post(`/api/notifications/${id}/mark-read/`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/api/notifications/mark-all-read/');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);
    setShowDropdown(false);
    
    // Navigate based on notification type
    if (notification.conversation_id) {
      navigate(`/conversations/${notification.conversation_id}`);
    } else if (notification.decision_id) {
      navigate(`/decisions/${notification.decision_id}`);
    } else if (notification.document_id) {
      navigate(`/business/documents/${notification.document_id}`);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Bell Icon */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        style={{
          position: 'relative',
          padding: '8px',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: textColor
        }}
      >
        <BellIcon style={{ width: '24px', height: '24px' }} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            width: '18px',
            height: '18px',
            backgroundColor: '#ef4444',
            color: '#ffffff',
            borderRadius: '50%',
            fontSize: '11px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '8px',
          width: '400px',
          maxHeight: '500px',
          backgroundColor: bgColor,
          border: `1px solid ${borderColor}`,
          borderRadius: '12px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          zIndex: 1000,
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${borderColor}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: textColor }}>Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#3b82f6',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: secondaryText, fontSize: '14px' }}>
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  style={{
                    padding: '16px 20px',
                    borderBottom: `1px solid ${borderColor}`,
                    cursor: 'pointer',
                    backgroundColor: notification.is_read ? 'transparent' : (darkMode ? '#292524' : '#f9fafb'),
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = darkMode ? '#292524' : '#f3f4f6'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = notification.is_read ? 'transparent' : (darkMode ? '#292524' : '#f9fafb')}
                >
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {!notification.is_read && (
                      <div style={{ width: '8px', height: '8px', backgroundColor: '#3b82f6', borderRadius: '50%', marginTop: '6px', flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '14px', color: textColor, marginBottom: '4px', fontWeight: notification.is_read ? 400 : 600 }}>
                        {notification.message}
                      </p>
                      <p style={{ fontSize: '12px', color: secondaryText }}>
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '12px 20px', borderTop: `1px solid ${borderColor}`, textAlign: 'center' }}>
            <button
              onClick={() => {
                setShowDropdown(false);
                navigate('/notifications');
              }}
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#3b82f6',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
