import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { colors, spacing, radius, shadows } from '../utils/designTokens';

function ActivityFeed() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivity();
    const interval = setInterval(fetchActivity, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchActivity = async () => {
    try {
      const res = await api.get('/api/conversations/activity-feed/');
      setActivities(res.data);
    } catch (error) {
      console.error('Failed to fetch activity:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: spacing.lg, color: colors.secondary }}>Loading activity...</div>;
  }

  return (
    <div style={{
      backgroundColor: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: radius.md,
      padding: spacing.lg
    }}>
      <h2 style={{ fontSize: '16px', fontWeight: 600, color: colors.primary, marginBottom: spacing.lg }}>
        Recent Activity
      </h2>

      {activities.length === 0 ? (
        <p style={{ fontSize: '14px', color: colors.secondary }}>No recent activity</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          {activities.map((activity, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                gap: spacing.md,
                padding: spacing.md,
                backgroundColor: colors.background,
                borderRadius: radius.md,
                borderLeft: `3px solid ${colors.accent}`
              }}
            >
              <div style={{ fontSize: '20px', minWidth: '24px' }}>
                {activity.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: colors.primary }}>
                  <strong>{activity.user}</strong>
                  {activity.type === 'conversation_created' && ' created a conversation'}
                  {activity.type === 'reply_added' && ' replied to'}
                </div>
                <Link
                  to={`/conversations/${activity.conversation_id}`}
                  style={{
                    fontSize: '13px',
                    color: colors.accent,
                    textDecoration: 'none',
                    fontWeight: 500
                  }}
                >
                  {activity.title || activity.conversation}
                </Link>
                <div style={{ fontSize: '11px', color: colors.secondary, marginTop: '4px' }}>
                  {new Date(activity.timestamp).toLocaleDateString()} at {new Date(activity.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ActivityFeed;
