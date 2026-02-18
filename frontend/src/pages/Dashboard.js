import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../utils/ThemeAndAccessibility';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { CardSkeleton } from '../components/Skeleton';
import { 
  DocumentTextIcon,
  ChatBubbleLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  ListBulletIcon,
  SparklesIcon,
  TrendingUpIcon,
  UserGroupIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

function Dashboard() {
  const { user } = useAuth();
  const { darkMode } = useTheme();
  const [activities, setActivities] = useState([]);
  const [currentSprint, setCurrentSprint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalConversations: 0,
    totalDecisions: 0,
    activeIssues: 0,
    teamMembers: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [activityRes, sprintRes] = await Promise.all([
        api.get('/api/organizations/activity/feed/').catch(() => ({ data: { activities: [] } })),
        api.get('/api/agile/current-sprint/').catch(() => ({ data: null }))
      ]);
      
      const allActivities = activityRes.data.activities || [];
      const recentActivities = allActivities.slice(0, 15).map(activity => ({
        type: activity.content?.type || activity.action_type,
        title: activity.content?.title || activity.action_display,
        author: activity.actor?.name,
        time: new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: activity.content?.status || activity.content?.post_type,
        id: activity.content?.id
      }));
      
      setStats({
        totalConversations: allActivities.filter(a => a.content?.type === 'conversation').length,
        totalDecisions: allActivities.filter(a => a.content?.type === 'decision').length,
        activeIssues: sprintRes.data?.issue_count || 0,
        teamMembers: 0
      });
      
      setActivities(recentActivities);
      setCurrentSprint(sprintRes.data);
    } catch (error) {
      console.error('Failed to fetch:', error);
    } finally {
      setLoading(false);
    }
  };

  const bgColor = darkMode ? '#1c1917' : '#ffffff';
  const textColor = darkMode ? '#e7e5e4' : '#111827';
  const borderColor = darkMode ? '#292524' : '#e5e7eb';
  const hoverBg = darkMode ? '#292524' : '#f3f4f6';
  const secondaryText = darkMode ? '#a8a29e' : '#6b7280';

  if (loading) {
    return (
      <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ height: '32px', width: '300px', backgroundColor: '#292524', borderRadius: '5px', marginBottom: '8px', animation: 'pulse 2s infinite' }}></div>
          <div style={{ height: '20px', width: '200px', backgroundColor: '#292524', borderRadius: '5px', animation: 'pulse 2s infinite' }}></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {[1,2,3,4].map(i => <CardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 600, color: textColor, marginBottom: '4px', letterSpacing: '-0.01em' }}>Welcome back, {user?.full_name?.split(' ')[0]}</h1>
            <p style={{ fontSize: '14px', color: secondaryText }}>Your organizational memory at a glance</p>
          </div>
          <Link to="/conversations/new" style={{ padding: '8px 14px', backgroundColor: 'transparent', border: '2px solid #3b82f6', color: '#3b82f6', textDecoration: 'none', borderRadius: '5px', fontWeight: 500, fontSize: '13px', transition: 'all 0.15s', display: 'inline-block' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#3b82f6'; e.currentTarget.style.color = '#ffffff'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#3b82f6'; }}>
            New Conversation
          </Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: secondaryText, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Conversations</span>
            <ChatBubbleLeftIcon style={{ width: '16px', height: '16px', color: '#3b82f6' }} />
          </div>
          <p style={{ fontSize: '24px', fontWeight: 600, color: textColor }}>{stats.totalConversations}</p>
          <p style={{ fontSize: '11px', color: secondaryText, marginTop: '4px' }}>Organizational knowledge</p>
        </div>
        
        <div style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: secondaryText, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Decisions</span>
            <DocumentTextIcon style={{ width: '16px', height: '16px', color: '#a855f7' }} />
          </div>
          <p style={{ fontSize: '24px', fontWeight: 600, color: textColor }}>{stats.totalDecisions}</p>
          <p style={{ fontSize: '11px', color: secondaryText, marginTop: '4px' }}>Tracked & documented</p>
        </div>
        
        <div style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: secondaryText, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Active Issues</span>
            <ListBulletIcon style={{ width: '16px', height: '16px', color: '#ea580c' }} />
          </div>
          <p style={{ fontSize: '24px', fontWeight: 600, color: textColor }}>{currentSprint?.issue_count || 0}</p>
          <p style={{ fontSize: '11px', color: secondaryText, marginTop: '4px' }}>In current sprint</p>
        </div>
        
        <div style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: secondaryText, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Memory Health</span>
            <SparklesIcon style={{ width: '16px', height: '16px', color: '#10b981' }} />
          </div>
          <p style={{ fontSize: '24px', fontWeight: 600, color: textColor }}>85%</p>
          <p style={{ fontSize: '11px', color: secondaryText, marginTop: '4px' }}>Knowledge captured</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '20px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: textColor, marginBottom: '16px' }}>Organization Activity</h2>
            {activities.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <p style={{ color: secondaryText, fontSize: '13px' }}>No activity yet</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {activities.map((activity, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px', border: `1px solid ${borderColor}`, borderRadius: '5px', transition: 'all 0.15s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBg} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <div style={{ width: '6px', height: '6px', backgroundColor: '#3b82f6', borderRadius: '50%', marginTop: '6px', flexShrink: 0 }}></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <h3 style={{ fontSize: '13px', fontWeight: 600, color: textColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activity.title}</h3>
                        <span style={{ fontSize: '11px', color: secondaryText, flexShrink: 0, marginLeft: '8px' }}>{activity.time}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'capitalize', backgroundColor: hoverBg, color: secondaryText, padding: '2px 6px', borderRadius: '3px' }}>
                          {activity.status || activity.type}
                        </span>
                        <span style={{ fontSize: '11px', color: secondaryText }}>by {activity.author}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>

          {currentSprint && (
            <div style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 600, color: textColor }}>{currentSprint.name}</h2>
                  <p style={{ fontSize: '12px', color: secondaryText, marginTop: '2px' }}>{currentSprint.start_date} → {currentSprint.end_date}</p>
                </div>
                <Link to="/sprint" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#3b82f6', textDecoration: 'none', fontWeight: 500, fontSize: '12px' }}>
                  View <ArrowRightIcon style={{ width: '14px', height: '14px' }} />
                </Link>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                <div style={{ backgroundColor: '#065f46', border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '12px', textAlign: 'center' }}>
                  <p style={{ fontSize: '20px', fontWeight: 600, color: '#6ee7b7' }}>{currentSprint.completed_count || currentSprint.completed || 0}</p>
                  <p style={{ fontSize: '10px', color: '#6ee7b7', marginTop: '2px' }}>Completed</p>
                </div>
                <div style={{ backgroundColor: '#1e3a8a', border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '12px', textAlign: 'center' }}>
                  <p style={{ fontSize: '20px', fontWeight: 600, color: '#93c5fd' }}>{currentSprint.in_progress || 0}</p>
                  <p style={{ fontSize: '10px', color: '#93c5fd', marginTop: '2px' }}>In Progress</p>
                </div>
                <div style={{ backgroundColor: hoverBg, border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '12px', textAlign: 'center' }}>
                  <p style={{ fontSize: '20px', fontWeight: 600, color: secondaryText }}>{(currentSprint.issue_count || 0) - (currentSprint.completed_count || currentSprint.completed || 0) - (currentSprint.in_progress || 0) - (currentSprint.blocked_count || currentSprint.blocked || 0)}</p>
                  <p style={{ fontSize: '10px', color: secondaryText, marginTop: '2px' }}>To Do</p>
                </div>
                <div style={{ backgroundColor: '#78350f', border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '12px', textAlign: 'center' }}>
                  <p style={{ fontSize: '20px', fontWeight: 600, color: '#fcd34d' }}>{currentSprint.blocked_count || currentSprint.blocked || 0}</p>
                  <p style={{ fontSize: '10px', color: '#fcd34d', marginTop: '2px' }}>Blocked</p>
                </div>
              </div>
            </div>
          )}
          </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '20px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: textColor, marginBottom: '12px' }}>Quick Actions</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Link to="/conversations/new" style={{ display: 'block', padding: '10px 14px', backgroundColor: 'transparent', border: `2px solid #3b82f6`, color: '#3b82f6', textDecoration: 'none', borderRadius: '5px', fontWeight: 500, fontSize: '13px', textAlign: 'center', transition: 'all 0.15s' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#3b82f6'; e.currentTarget.style.color = '#ffffff'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#3b82f6'; }}>
                New Conversation
              </Link>
              <Link to="/decisions/new" style={{ display: 'block', padding: '10px 14px', border: `2px solid ${borderColor}`, borderRadius: '5px', backgroundColor: 'transparent', color: textColor, textDecoration: 'none', fontWeight: 500, fontSize: '13px', textAlign: 'center', transition: 'all 0.15s' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = hoverBg; e.currentTarget.style.borderColor = textColor; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = borderColor; }}>
                New Decision
              </Link>
              <Link to="/sprint" style={{ display: 'block', padding: '10px 14px', border: `2px solid ${borderColor}`, borderRadius: '5px', backgroundColor: 'transparent', color: textColor, textDecoration: 'none', fontWeight: 500, fontSize: '13px', textAlign: 'center', transition: 'all 0.15s' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = hoverBg; e.currentTarget.style.borderColor = textColor; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = borderColor; }}>
                View Sprint
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
