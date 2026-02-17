import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BellIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const bgColor = '#1c1917';
  const textColor = '#e7e5e4';
  const borderColor = '#292524';
  const hoverBg = '#292524';
  const secondaryText = '#a8a29e';

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/api/notifications/');
      const data = response.data.results || response.data || [];
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await api.patch(`/api/notifications/${notificationId}/`, { read: true });
      if (Array.isArray(notifications)) {
        setNotifications(notifications.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        ));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await api.delete(`/api/notifications/${notificationId}/`);
      if (Array.isArray(notifications)) {
        setNotifications(notifications.filter(n => n.id !== notificationId));
      }
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
        <div style={{ width: '24px', height: '24px', border: '2px solid #292524', borderTop: '2px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '64rem', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <BellIcon style={{ width: '20px', height: '20px', color: textColor }} />
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: textColor, letterSpacing: '-0.01em' }}>Notifications</h1>
        </div>
        <p style={{ fontSize: '14px', color: secondaryText }}>Stay updated on sprints, blockers, and team activity</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {['all', 'unread', 'sprint', 'blocker', 'decision'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '7px 12px',
              fontSize: '13px',
              fontWeight: 500,
              textTransform: 'capitalize',
              backgroundColor: filter === f ? '#3b82f6' : bgColor,
              color: filter === f ? '#ffffff' : textColor,
              border: `1px solid ${filter === f ? '#3b82f6' : borderColor}`,
              borderRadius: '5px',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            onMouseEnter={(e) => {
              if (filter !== f) {
                e.currentTarget.style.backgroundColor = hoverBg;
              }
            }}
            onMouseLeave={(e) => {
              if (filter !== f) {
                e.currentTarget.style.backgroundColor = bgColor;
              }
            }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px' }}>
          <BellIcon style={{ width: '48px', height: '48px', color: borderColor, margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: textColor, marginBottom: '6px' }}>No notifications</h3>
          <p style={{ fontSize: '13px', color: secondaryText }}>You're all caught up!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredNotifications.map(notification => (
            <div
              key={notification.id}
              style={{
                padding: '14px',
                borderLeft: `3px solid ${notification.read ? borderColor : '#3b82f6'}`,
                backgroundColor: notification.read ? bgColor : '#1e3a5f',
                border: `1px solid ${borderColor}`,
                borderRadius: '5px',
                transition: 'all 0.15s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '10px', flex: 1 }}>
                  {/* Avatar */}
                  <div style={{ flexShrink: 0 }}>
                    {notification.user_avatar ? (
                      <img src={notification.user_avatar} alt={notification.user_name || 'User'} style={{ width: '32px', height: '32px', borderRadius: '5px', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '32px', height: '32px', borderRadius: '5px', backgroundColor: '#292524', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: '#e7e5e4', fontSize: '13px', fontWeight: 600 }}>
                          {(notification.user_name || notification.title)?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{
                        padding: '3px 8px',
                        fontSize: '11px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        borderRadius: '3px',
                        backgroundColor:
                          notification.type === 'sprint' ? '#065f46' :
                          notification.type === 'blocker' ? '#7f1d1d' :
                          notification.type === 'decision' ? '#581c87' :
                          hoverBg,
                        color:
                          notification.type === 'sprint' ? '#6ee7b7' :
                          notification.type === 'blocker' ? '#fca5a5' :
                          notification.type === 'decision' ? '#e9d5ff' :
                          secondaryText
                      }}>
                        {notification.type}
                      </span>
                      {!notification.read && (
                        <span style={{ width: '6px', height: '6px', backgroundColor: '#3b82f6', borderRadius: '50%' }}></span>
                      )}
                    </div>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: textColor, marginBottom: '6px' }}>{notification.title}</h3>
                    <p style={{ fontSize: '13px', color: secondaryText, marginBottom: '8px' }}>{notification.message}</p>
                    <p style={{ fontSize: '11px', color: secondaryText }}>{new Date(notification.created_at).toLocaleString()}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  {notification.related_url && (
                    <Link
                      to={notification.related_url}
                      style={{ padding: '6px 10px', backgroundColor: '#3b82f6', color: '#ffffff', borderRadius: '4px', fontSize: '11px', fontWeight: 500, textDecoration: 'none', transition: 'all 0.15s' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
                    >
                      View
                    </Link>
                  )}
                  {!notification.read && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      style={{ padding: '6px', backgroundColor: 'transparent', border: `1px solid ${borderColor}`, borderRadius: '4px', cursor: 'pointer', transition: 'all 0.15s' }}
                      title="Mark as read"
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBg}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <CheckIcon style={{ width: '16px', height: '16px', color: secondaryText }} />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    style={{ padding: '6px', backgroundColor: 'transparent', border: `1px solid ${borderColor}`, borderRadius: '4px', cursor: 'pointer', transition: 'all 0.15s' }}
                    title="Delete"
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBg}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <XMarkIcon style={{ width: '16px', height: '16px', color: secondaryText }} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Notifications;
