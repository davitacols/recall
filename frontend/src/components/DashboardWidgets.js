import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../utils/ThemeAndAccessibility';
import { getProjectPalette } from '../utils/projectUi';
import { buildApiUrl } from '../utils/apiBase';
import { ClipboardDocumentCheckIcon, DocumentCheckIcon, CalendarIcon, ChatBubbleLeftIcon, FlagIcon } from '@heroicons/react/24/outline';

function authHeaders() {
  const token = localStorage.getItem('access_token') || localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function unwrapPayload(payload, fallback = {}) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    if (payload.data && typeof payload.data === 'object') return payload.data;
    return payload;
  }
  return fallback;
}

function panelStyle(palette) {
  return {
    borderRadius: 10,
    border: `1px solid ${palette.border}`,
    background: palette.card,
    padding: 10,
  };
}

function cellStyle(palette) {
  return {
    borderRadius: 8,
    border: `1px solid ${palette.border}`,
    background: palette.cardAlt,
    padding: 8,
  };
}

export default function DashboardWidgets() {
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const navigate = useNavigate();
  const [digest, setDigest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDigest = async () => {
      try {
        const res = await fetch(buildApiUrl('/api/knowledge/daily-digest/'), {
          headers: authHeaders(),
        });
        const raw = await res.json();
        setDigest(unwrapPayload(raw, {}));
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDigest();
  }, []);

  const quickActions = [
    { label: 'New Task', icon: ClipboardDocumentCheckIcon, path: '/business/tasks' },
    { label: 'New Conversation', icon: ChatBubbleLeftIcon, path: '/conversations/new' },
    { label: 'New Decision', icon: DocumentCheckIcon, path: '/decisions' },
    { label: 'New Goal', icon: FlagIcon, path: '/business/goals' },
  ];

  if (loading) {
    return <div style={panelStyle(palette)}>Loading...</div>;
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={panelStyle(palette)}>
        <h3 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: palette.text }}>Quick Actions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 8 }}>
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                style={{ ...cellStyle(palette), textAlign: 'left', cursor: 'pointer', color: palette.text }}
              >
                <Icon style={{ width: 16, height: 16, color: palette.info, marginBottom: 6 }} />
                <div style={{ fontSize: 11, fontWeight: 600 }}>{action.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {digest?.activity_summary && (
        <div style={panelStyle(palette)}>
          <h3 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: palette.text }}>Last 24 Hours</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 8 }}>
            <div style={cellStyle(palette)}>
              <div style={{ fontSize: 18, fontWeight: 800, color: palette.text }}>{digest.activity_summary.decisions}</div>
              <div style={{ fontSize: 11, color: palette.muted }}>Decisions</div>
            </div>
            <div style={cellStyle(palette)}>
              <div style={{ fontSize: 18, fontWeight: 800, color: palette.text }}>{digest.activity_summary.conversations}</div>
              <div style={{ fontSize: 11, color: palette.muted }}>Conversations</div>
            </div>
          </div>
        </div>
      )}

      {digest?.upcoming_meetings && digest.upcoming_meetings.length > 0 && (
        <div style={panelStyle(palette)}>
          <h3 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: palette.text, display: 'flex', alignItems: 'center', gap: 6 }}>
            <CalendarIcon style={{ width: 14, height: 14 }} /> Today's Meetings
          </h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {digest.upcoming_meetings.map((meeting) => (
              <div
                key={meeting.id}
                onClick={() => navigate(`/business/meetings/${meeting.id}`)}
                style={{ ...cellStyle(palette), cursor: 'pointer' }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: palette.text }}>{meeting.title}</div>
                <div style={{ fontSize: 11, color: palette.muted, marginTop: 2 }}>
                  {new Date(meeting.meeting_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} | {meeting.duration_minutes} min
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
