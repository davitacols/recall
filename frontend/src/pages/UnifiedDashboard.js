import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../utils/ThemeAndAccessibility';
import AIRecommendations from '../components/AIRecommendations';
import AdvancedAIInsights from '../components/AdvancedAIInsights';
import DashboardWidgets from '../components/DashboardWidgets';
import { TeamExpertiseMap, TrendAnalysis, MetricsTracker } from '../components/EnhancedWidgets';
import {
  ChatBubbleLeftIcon,
  DocumentCheckIcon,
  ClipboardDocumentListIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  UserGroupIcon,
  LinkIcon
} from '@heroicons/react/24/outline';

export default function UnifiedDashboard() {
  const { darkMode } = useTheme();
  const [timeline, setTimeline] = useState([]);
  const [stats, setStats] = useState({ activity: 0, nodes: 0, links: 0, rate: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const bgPrimary = darkMode ? '#0c0a09' : '#f9fafb';
  const bgSecondary = darkMode ? '#1c1917' : '#ffffff';
  const borderColor = darkMode ? '#292524' : '#e5e7eb';
  const textPrimary = darkMode ? '#e7e5e4' : '#111827';
  const textSecondary = darkMode ? '#a8a29e' : '#6b7280';
  const textTertiary = darkMode ? '#78716c' : '#9ca3af';

  useEffect(() => {
    fetchDashboardData();
  }, [page]);;

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const timelineRes = await fetch(
        `http://localhost:8000/api/knowledge/timeline/?days=7&page=${page}&per_page=10`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const timelineData = await timelineRes.json();
      const results = timelineData.results || timelineData;
      setTimeline(prev => page === 1 ? results : [...prev, ...results]);
      setHasMore(timelineData.pagination?.has_next || false);
      
      const statsRes = await fetch(
        'http://localhost:8000/api/knowledge/ai/success-rates/',
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const statsData = await statsRes.json();
      setStats({
        activity: timelineData.pagination?.total || results.length,
        nodes: statsData.overall?.decisions?.total || 0,
        links: 0,
        rate: statsData.overall?.decisions?.rate || 0
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    }
  };

  const getActivityIcon = (type) => {
    return ChatBubbleLeftIcon;
  };

  const getActivityUrl = (activity) => {
    const type = activity.content_type?.split('.')[1] || 'conversation';
    return `/${type}s/${activity.object_id}`;
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: textPrimary }}>Loading...</div>;
  }

  return (
    <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '32px', marginBottom: '48px' }}>
        <div>
          <div style={{ fontSize: '13px', color: textSecondary, fontWeight: 500, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Activities</div>
          <div style={{ fontSize: '40px', fontWeight: 700, color: textPrimary, letterSpacing: '-0.03em' }}>{stats.activity}</div>
        </div>
        <div>
          <div style={{ fontSize: '13px', color: textSecondary, fontWeight: 500, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Decisions</div>
          <div style={{ fontSize: '40px', fontWeight: 700, color: textPrimary, letterSpacing: '-0.03em' }}>{stats.nodes}</div>
        </div>
        <div>
          <div style={{ fontSize: '13px', color: textSecondary, fontWeight: 500, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Links</div>
          <div style={{ fontSize: '40px', fontWeight: 700, color: textPrimary, letterSpacing: '-0.03em' }}>{stats.links}</div>
        </div>
        <div>
          <div style={{ fontSize: '13px', color: textSecondary, fontWeight: 500, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Success Rate</div>
          <div style={{ fontSize: '40px', fontWeight: 700, color: '#3b82f6', letterSpacing: '-0.03em' }}>{stats.rate}%</div>
        </div>
      </div>

      {/* Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px' }}>
        {/* Activity */}
        <div>
          <div style={{ backgroundColor: bgSecondary, borderRadius: '8px', border: `1px solid ${borderColor}`, marginBottom: '24px' }}>
            <div style={{ padding: '20px', borderBottom: `1px solid ${borderColor}` }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: textPrimary, margin: 0 }}>Recent Activity</h2>
            </div>
            <div>
              {timeline.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: textTertiary }}>No activity</div>
              ) : (
                <>
                  {timeline.slice(0, 10).map((activity) => (
                    <Link key={activity.id} to={getActivityUrl(activity)} style={{ display: 'block', padding: '16px 20px', borderBottom: `1px solid ${borderColor}`, textDecoration: 'none' }}>
                      <div style={{ fontSize: '14px', fontWeight: 500, color: textPrimary, marginBottom: '4px' }}>{activity.title}</div>
                      <div style={{ fontSize: '13px', color: textSecondary }}>{new Date(activity.created_at).toLocaleDateString()}</div>
                    </Link>
                  ))}
                  {hasMore && (
                    <div style={{ padding: '16px', textAlign: 'center' }}>
                      <button
                        onClick={() => setPage(page + 1)}
                        style={{ fontSize: '14px', color: textSecondary, cursor: 'pointer', background: 'none', border: 'none' }}
                      >
                        Load more
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          
          {/* Additional Widgets */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            <TrendAnalysis />
            <MetricsTracker />
          </div>
          
          <TeamExpertiseMap />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <DashboardWidgets />
          <AdvancedAIInsights />
          <AIRecommendations darkMode={darkMode} />
        </div>
      </div>
    </div>
  );
}
