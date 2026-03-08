import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../utils/ThemeAndAccessibility';
import { getProjectPalette } from '../utils/projectUi';
import { UserGroupIcon, ChartBarIcon, ArrowTrendingUpIcon, ClipboardDocumentCheckIcon, DocumentCheckIcon, CalendarIcon, ChatBubbleLeftIcon, FlagIcon } from '@heroicons/react/24/outline';
import { buildApiUrl } from '../utils/apiBase';

function getAuthHeaders() {
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

function tagStyle(palette) {
  return {
    padding: '3px 8px',
    fontSize: 11,
    borderRadius: 999,
    border: `1px solid ${palette.border}`,
    background: palette.cardAlt,
    color: palette.text,
  };
}

function metricCellStyle(palette) {
  return {
    borderRadius: 8,
    border: `1px solid ${palette.border}`,
    background: palette.cardAlt,
    padding: 8,
  };
}

export function TeamExpertiseMap() {
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeamExpertise = async () => {
      try {
        const res = await fetch(buildApiUrl('/api/knowledge/team-expertise/'), {
          headers: getAuthHeaders(),
        });
        const raw = await res.json();
        const data = unwrapPayload(raw, {});
        setTeam(data.team || []);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeamExpertise();
  }, []);

  if (loading) return <div style={panelStyle(palette)}>Loading...</div>;

  return (
    <div style={panelStyle(palette)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <UserGroupIcon style={{ width: 18, height: 18, color: palette.muted }} />
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: palette.text }}>Team Expertise</h3>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        {team.slice(0, 10).map((member, idx) => (
          <div key={idx} style={{ padding: 10, border: `1px solid ${palette.border}`, borderRadius: 10, background: palette.cardAlt }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: palette.text }}>{member.user.name}</div>
                <div style={{ fontSize: 11, color: palette.muted }}>{member.user.email}</div>
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: palette.text }}>{member.score}</div>
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {(member.expertise_areas || []).map((area, i) => (
                <span key={i} style={tagStyle(palette)}>
                  {area}
                </span>
              ))}
            </div>

            <div style={{ fontSize: 11, color: palette.muted, marginTop: 6 }}>
              {member.activity.decisions} decisions | {member.activity.conversations} conversations | {member.activity.completed_tasks} tasks
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TrendAnalysis() {
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        const res = await fetch(buildApiUrl('/api/knowledge/trends/?days=30'), {
          headers: getAuthHeaders(),
        });
        const raw = await res.json();
        setTrends(unwrapPayload(raw, {}));
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrends();
  }, []);

  if (loading) return <div style={panelStyle(palette)}>Loading...</div>;

  return (
    <div style={panelStyle(palette)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <ArrowTrendingUpIcon style={{ width: 18, height: 18, color: palette.muted }} />
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: palette.text }}>Trends (Last 30 Days)</h3>
      </div>

      {trends?.status_distribution && (
        <div style={{ marginBottom: 10 }}>
          <h4 style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: palette.text }}>Decision Status</h4>
          <div style={{ display: 'grid', gap: 4 }}>
            {Object.entries(trends.status_distribution).map(([status, count]) => (
              <div key={status} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: palette.muted, textTransform: 'capitalize' }}>{status.replace('_', ' ')}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: palette.text }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {trends?.trending_topics && trends.trending_topics.length > 0 && (
        <div>
          <h4 style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: palette.text }}>Trending Topics</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {trends.trending_topics.slice(0, 10).map((topic, idx) => (
              <span key={idx} style={tagStyle(palette)}>
                {topic.topic} ({topic.count})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function MetricsTracker() {
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch(buildApiUrl('/api/knowledge/metrics/'), {
          headers: getAuthHeaders(),
        });
        const raw = await res.json();
        setMetrics(unwrapPayload(raw, {}));
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  if (loading) return <div style={panelStyle(palette)}>Loading...</div>;

  return (
    <div style={panelStyle(palette)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <ChartBarIcon style={{ width: 18, height: 18, color: palette.muted }} />
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: palette.text }}>Platform Metrics</h3>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 8 }}>
        <div style={metricCellStyle(palette)}>
          <div style={{ fontSize: 18, fontWeight: 800, color: palette.text }}>{metrics?.avg_search_time}s</div>
          <div style={{ fontSize: 11, color: palette.muted }}>Avg Search Time</div>
        </div>
        <div style={metricCellStyle(palette)}>
          <div style={{ fontSize: 18, fontWeight: 800, color: palette.text }}>{metrics?.knowledge_reuse_rate}%</div>
          <div style={{ fontSize: 11, color: palette.muted }}>Reuse Rate</div>
        </div>
        <div style={metricCellStyle(palette)}>
          <div style={{ fontSize: 18, fontWeight: 800, color: palette.text }}>{metrics?.user_activity?.decisions}</div>
          <div style={{ fontSize: 11, color: palette.muted }}>Your Decisions</div>
        </div>
        <div style={metricCellStyle(palette)}>
          <div style={{ fontSize: 18, fontWeight: 800, color: palette.text }}>{metrics?.user_activity?.conversations}</div>
          <div style={{ fontSize: 11, color: palette.muted }}>Your Conversations</div>
        </div>
      </div>
    </div>
  );
}

export function DailyDigestPanel() {
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const navigate = useNavigate();
  const [digest, setDigest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDigest = async () => {
      try {
        const res = await fetch(buildApiUrl('/api/knowledge/daily-digest/'), {
          headers: getAuthHeaders(),
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

  if (loading) return <div style={panelStyle(palette)}>Loading...</div>;

  const quickActions = [
    { label: 'New Task', icon: ClipboardDocumentCheckIcon, path: '/business/tasks' },
    { label: 'New Conversation', icon: ChatBubbleLeftIcon, path: '/conversations/new' },
    { label: 'New Decision', icon: DocumentCheckIcon, path: '/decisions' },
    { label: 'New Goal', icon: FlagIcon, path: '/business/goals' },
  ];

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
                style={{ borderRadius: 8, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text, padding: 8, textAlign: 'left', cursor: 'pointer' }}
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
            <div style={metricCellStyle(palette)}>
              <div style={{ fontSize: 18, fontWeight: 800, color: palette.text }}>{digest.activity_summary.decisions}</div>
              <div style={{ fontSize: 11, color: palette.muted }}>Decisions</div>
            </div>
            <div style={metricCellStyle(palette)}>
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
                style={{ borderRadius: 8, border: `1px solid ${palette.border}`, background: palette.cardAlt, padding: 8, cursor: 'pointer' }}
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
