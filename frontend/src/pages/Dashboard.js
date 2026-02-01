import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import api from '../services/api';
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

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '384px' }}>
        <div style={{ width: '32px', height: '32px', border: '2px solid #111827', borderTop: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ borderBottom: '1px solid var(--border-color)', paddingLeft: '32px', paddingRight: '32px', paddingTop: '32px', paddingBottom: '32px' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: '36px', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '4px' }}>Welcome back, {user?.full_name?.split(' ')[0]}</h1>
              <p style={{ color: 'var(--text-secondary)' }}>Your organizational memory at a glance</p>
            </div>
            <Link to="/conversations/new" style={{ paddingLeft: '24px', paddingRight: '24px', paddingTop: '12px', paddingBottom: '12px', backgroundColor: '#111827', color: '#ffffff', textDecoration: 'none', fontWeight: 700, textTransform: 'uppercase', fontSize: '14px', transition: 'all 0.2s', display: 'inline-block' }}>
              + New Conversation
            </Link>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '80rem', margin: '0 auto', paddingLeft: '32px', paddingRight: '32px', paddingTop: '32px', paddingBottom: '32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          <div style={{ backgroundColor: 'var(--bg-primary)', border: '2px solid #111827', padding: '24px', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Conversations</span>
              <ChatBubbleLeftIcon style={{ width: '20px', height: '20px', color: '#2563eb' }} />
            </div>
            <p style={{ fontSize: '30px', fontWeight: 900, color: 'var(--text-primary)' }}>{stats.totalConversations}</p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>Organizational knowledge</p>
          </div>
          
          <div style={{ backgroundColor: 'var(--bg-primary)', border: '2px solid #111827', padding: '24px', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Decisions</span>
              <DocumentTextIcon style={{ width: '20px', height: '20px', color: '#a855f7' }} />
            </div>
            <p style={{ fontSize: '30px', fontWeight: 900, color: 'var(--text-primary)' }}>{stats.totalDecisions}</p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>Tracked & documented</p>
          </div>
          
          <div style={{ backgroundColor: 'var(--bg-primary)', border: '2px solid #111827', padding: '24px', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Issues</span>
              <ListBulletIcon style={{ width: '20px', height: '20px', color: '#ea580c' }} />
            </div>
            <p style={{ fontSize: '30px', fontWeight: 900, color: 'var(--text-primary)' }}>{currentSprint?.issue_count || 0}</p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>In current sprint</p>
          </div>
          
          <div style={{ backgroundColor: 'var(--bg-primary)', border: '2px solid #111827', padding: '24px', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Memory Health</span>
              <SparklesIcon style={{ width: '20px', height: '20px', color: '#16a34a' }} />
            </div>
            <p style={{ fontSize: '30px', fontWeight: 900, color: 'var(--text-primary)' }}>85%</p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>Knowledge captured</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div style={{ backgroundColor: 'var(--bg-primary)', border: '2px solid #111827', padding: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '24px' }}>Organization Activity</h2>
              {activities.length === 0 ? (
                <div style={{ textAlign: 'center', paddingTop: '32px', paddingBottom: '32px' }}>
                  <p style={{ color: 'var(--text-secondary)' }}>No activity yet</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {activities.map((activity, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '16px', border: '1px solid var(--border-color)', transition: 'all 0.2s' }}>
                      <div style={{ width: '8px', height: '8px', backgroundColor: '#111827', borderRadius: '50%', marginTop: '8px', flexShrink: 0 }}></div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activity.title}</h3>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', flexShrink: 0 }}>{activity.time}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', backgroundColor: 'var(--hover-bg)', color: 'var(--text-primary)', paddingLeft: '8px', paddingRight: '8px', paddingTop: '4px', paddingBottom: '4px' }}>
                            {activity.status || activity.type}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>by {activity.author}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {currentSprint && (
              <div style={{ backgroundColor: 'var(--bg-primary)', border: '2px solid #111827', padding: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                  <div>
                    <h2 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-primary)' }}>{currentSprint.name}</h2>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>{currentSprint.start_date} → {currentSprint.end_date}</p>
                  </div>
                  <Link to="/sprint" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#111827', textDecoration: 'none', fontWeight: 700, fontSize: '14px' }}>
                    View <ArrowRightIcon style={{ width: '16px', height: '16px' }} />
                  </Link>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                  <div style={{ backgroundColor: '#dcfce7', border: '1px solid #86efac', padding: '16px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <p style={{ fontSize: '24px', fontWeight: 900, color: '#16a34a' }}>{currentSprint.completed_count || currentSprint.completed || 0}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Completed</p>
                  </div>
                  <div style={{ backgroundColor: '#dbeafe', border: '1px solid #93c5fd', padding: '16px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <p style={{ fontSize: '24px', fontWeight: 900, color: '#2563eb' }}>{currentSprint.in_progress || 0}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>In Progress</p>
                  </div>
                  <div style={{ backgroundColor: 'var(--hover-bg)', border: '1px solid var(--border-color)', padding: '16px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <p style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-secondary)' }}>{(currentSprint.issue_count || 0) - (currentSprint.completed_count || currentSprint.completed || 0) - (currentSprint.in_progress || 0) - (currentSprint.blocked_count || currentSprint.blocked || 0)}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>To Do</p>
                  </div>
                  <div style={{ backgroundColor: '#fef3c7', border: '1px solid #fcd34d', padding: '16px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <p style={{ fontSize: '24px', fontWeight: 900, color: '#d97706' }}>{currentSprint.blocked_count || currentSprint.blocked || 0}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Blocked</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div style={{ backgroundColor: 'var(--bg-primary)', border: '2px solid #111827', padding: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '16px' }}>Quick Actions</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Link to="/conversations/new" style={{ display: 'block', paddingLeft: '16px', paddingRight: '16px', paddingTop: '12px', paddingBottom: '12px', backgroundColor: '#111827', color: '#ffffff', textDecoration: 'none', fontWeight: 700, fontSize: '14px', textAlign: 'center', transition: 'all 0.2s' }}>
                  New Conversation
                </Link>
                <Link to="/decisions/new" style={{ display: 'block', paddingLeft: '16px', paddingRight: '16px', paddingTop: '12px', paddingBottom: '12px', border: '1px solid #111827', color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 700, fontSize: '14px', textAlign: 'center', transition: 'all 0.2s', backgroundColor: 'transparent' }}>
                  New Decision
                </Link>
                <Link to="/sprint" style={{ display: 'block', paddingLeft: '16px', paddingRight: '16px', paddingTop: '12px', paddingBottom: '12px', border: '1px solid var(--border-color)', color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 700, fontSize: '14px', textAlign: 'center', transition: 'all 0.2s', backgroundColor: 'transparent' }}>
                  View Sprint
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
