import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClockIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../utils/ThemeAndAccessibility';
import api from '../services/api';

export default function ActivityFeed() {
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const [activities, setActivities] = useState([]);

  const bgColor = darkMode ? '#1c1917' : '#ffffff';
  const textColor = darkMode ? '#e7e5e4' : '#111827';
  const borderColor = darkMode ? '#292524' : '#e5e7eb';
  const secondaryText = darkMode ? '#a8a29e' : '#6b7280';

  useEffect(() => {
    loadActivities();
    const interval = setInterval(loadActivities, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadActivities = async () => {
    try {
      const [convs, decs, goals] = await Promise.all([
        api.get('/api/conversations/').catch(() => ({ data: [] })),
        api.get('/api/decisions/').catch(() => ({ data: [] })),
        api.get('/api/business/goals/').catch(() => ({ data: [] }))
      ]);
      
      const combined = [
        ...(convs.data.results || convs.data || []).map(c => ({ ...c, type: 'conversation', action: 'created' })),
        ...(decs.data.results || decs.data || []).map(d => ({ ...d, type: 'decision', action: 'created' })),
        ...(goals.data || []).map(g => ({ ...g, type: 'goal', action: 'created' }))
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 50);
      
      setActivities(combined);
    } catch (error) {
      console.error('Failed to load activities:', error);
    }
  };

  const getIcon = (type) => {
    const colors = { conversation: '#3b82f6', decision: '#10b981', goal: '#f59e0b' };
    return <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: colors[type] || '#6b7280' }} />;
  };

  return (
    <div style={{ maxWidth: '60rem', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 600, color: textColor, marginBottom: '24px' }}>Activity Feed</h1>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {activities.map((activity, i) => (
          <div key={i} style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            {getIcon(activity.type)}
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '14px', color: textColor }}>
                <strong>{activity.author || activity.created_by || 'Someone'}</strong> {activity.action} a <span style={{ textTransform: 'capitalize' }}>{activity.type}</span>: <strong>{activity.title || 'Untitled'}</strong>
              </p>
              <p style={{ fontSize: '12px', color: secondaryText, marginTop: '4px' }}>{new Date(activity.created_at).toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
