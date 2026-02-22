import React, { useState, useEffect } from 'react';
import { ChartBarIcon, CalendarIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../utils/ThemeAndAccessibility';
import api from '../services/api';
import { useToast } from '../components/Toast';

export default function Analytics() {
  const { darkMode } = useTheme();
  const { addToast } = useToast();
  const [analytics, setAnalytics] = useState(null);

  const bgColor = darkMode ? '#1c1917' : '#ffffff';
  const textColor = darkMode ? '#e7e5e4' : '#111827';
  const borderColor = darkMode ? '#292524' : '#e5e7eb';
  const secondaryText = darkMode ? '#a8a29e' : '#6b7280';

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const res = await api.get('/api/business/analytics/');
      setAnalytics(res.data);
    } catch (error) {
      addToast('Failed to load analytics', 'error');
    }
  };

  if (!analytics) return <div style={{ color: textColor }}>Loading...</div>;

  const statusColors = {
    not_started: '#6b7280',
    in_progress: '#3b82f6',
    completed: '#10b981',
    on_hold: '#f59e0b'
  };

  const priorityColors = {
    low: '#6b7280',
    medium: '#3b82f6',
    high: '#f59e0b',
    critical: '#ef4444'
  };

  return (
    <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: textColor, marginBottom: '4px' }}>Business Analytics</h1>
        <p style={{ fontSize: '14px', color: secondaryText }}>Overview of goals, meetings, and tasks</p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircleIcon style={{ width: '20px', height: '20px', color: '#ffffff' }} />
            </div>
            <div>
              <p style={{ fontSize: '11px', color: secondaryText, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Goals</p>
              <p style={{ fontSize: '24px', fontWeight: 600, color: textColor }}>{analytics.goals.total}</p>
            </div>
          </div>
          <p style={{ fontSize: '12px', color: secondaryText }}>+{analytics.goals.recent} this week</p>
        </div>

        <div style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CalendarIcon style={{ width: '20px', height: '20px', color: '#ffffff' }} />
            </div>
            <div>
              <p style={{ fontSize: '11px', color: secondaryText, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Meetings</p>
              <p style={{ fontSize: '24px', fontWeight: 600, color: textColor }}>{analytics.meetings.total}</p>
            </div>
          </div>
          <p style={{ fontSize: '12px', color: secondaryText }}>{analytics.meetings.upcoming} upcoming</p>
        </div>

        <div style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChartBarIcon style={{ width: '20px', height: '20px', color: '#ffffff' }} />
            </div>
            <div>
              <p style={{ fontSize: '11px', color: secondaryText, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Tasks</p>
              <p style={{ fontSize: '24px', fontWeight: 600, color: textColor }}>{analytics.tasks.total}</p>
            </div>
          </div>
          <p style={{ fontSize: '12px', color: secondaryText }}>+{analytics.tasks.recent} this week</p>
        </div>
      </div>

      {/* Goals by Status */}
      <div style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '20px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: textColor, marginBottom: '16px' }}>Goals by Status</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {Object.entries(analytics.goals.by_status || {}).map(([status, count]) => (
            <div key={status} style={{ textAlign: 'center', padding: '12px', backgroundColor: darkMode ? '#292524' : '#f9fafb', borderRadius: '5px' }}>
              <div style={{ width: '48px', height: '48px', margin: '0 auto 8px', borderRadius: '50%', backgroundColor: statusColors[status], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff' }}>{count}</span>
              </div>
              <p style={{ fontSize: '12px', color: textColor, fontWeight: 500, textTransform: 'capitalize' }}>{status.replace('_', ' ')}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tasks by Status */}
      <div style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '20px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: textColor, marginBottom: '16px' }}>Tasks by Status</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {Object.entries(analytics.tasks.by_status || {}).map(([status, count]) => (
            <div key={status} style={{ textAlign: 'center', padding: '12px', backgroundColor: darkMode ? '#292524' : '#f9fafb', borderRadius: '5px' }}>
              <div style={{ width: '48px', height: '48px', margin: '0 auto 8px', borderRadius: '50%', backgroundColor: statusColors[status] || '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff' }}>{count}</span>
              </div>
              <p style={{ fontSize: '12px', color: textColor, fontWeight: 500, textTransform: 'capitalize' }}>{status.replace('_', ' ')}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tasks by Priority */}
      <div style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '20px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: textColor, marginBottom: '16px' }}>Tasks by Priority</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {Object.entries(analytics.tasks.by_priority || {}).map(([priority, count]) => (
            <div key={priority} style={{ textAlign: 'center', padding: '12px', backgroundColor: darkMode ? '#292524' : '#f9fafb', borderRadius: '5px' }}>
              <div style={{ width: '48px', height: '48px', margin: '0 auto 8px', borderRadius: '50%', backgroundColor: priorityColors[priority], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff' }}>{count}</span>
              </div>
              <p style={{ fontSize: '12px', color: textColor, fontWeight: 500, textTransform: 'capitalize' }}>{priority}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
