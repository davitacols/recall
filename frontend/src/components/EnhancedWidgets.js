import React, { useState, useEffect } from 'react';
import { useTheme } from '../utils/ThemeAndAccessibility';
import { UserGroupIcon, ChartBarIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline';
import { buildApiUrl } from '../utils/apiBase';

export function TeamExpertiseMap() {
  const { darkMode } = useTheme();
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);

  const bgSecondary = darkMode ? 'bg-stone-900' : 'bg-white';
  const borderColor = darkMode ? 'border-stone-800' : 'border-gray-200';
  const textPrimary = darkMode ? 'text-stone-100' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-stone-500' : 'text-gray-600';

  useEffect(() => {
    fetchTeamExpertise();
  }, []);

  const fetchTeamExpertise = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(buildApiUrl('/api/knowledge/team-expertise/'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setTeam(data.team || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className={`${bgSecondary} border ${borderColor} rounded-lg p-6`}>Loading...</div>;

  return (
    <div className={`${bgSecondary} border ${borderColor} rounded-lg p-6`}>
      <div className="flex items-center gap-2 mb-4">
        <UserGroupIcon className={`w-5 h-5 ${textSecondary}`} />
        <h3 className={`text-lg font-semibold ${textPrimary}`}>Team Expertise</h3>
      </div>
      <div className="space-y-3">
        {team.slice(0, 10).map((member, idx) => (
          <div key={idx} className={`p-4 border ${borderColor} rounded-lg`}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className={`text-sm font-semibold ${textPrimary}`}>{member.user.name}</div>
                <div className={`text-xs ${textSecondary}`}>{member.user.email}</div>
              </div>
              <div className={`text-lg font-bold ${textPrimary}`}>{member.score}</div>
            </div>
            <div className="flex gap-2 flex-wrap mt-2">
              {member.expertise_areas.map((area, i) => (
                <span key={i} className={`px-2 py-1 text-xs rounded ${darkMode ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-50 text-blue-700'}`}>
                  {area}
                </span>
              ))}
            </div>
            <div className={`text-xs ${textSecondary} mt-2`}>
              {member.activity.decisions} decisions • {member.activity.conversations} conversations • {member.activity.completed_tasks} tasks
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TrendAnalysis() {
  const { darkMode } = useTheme();
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(true);

  const bgSecondary = darkMode ? 'bg-stone-900' : 'bg-white';
  const borderColor = darkMode ? 'border-stone-800' : 'border-gray-200';
  const textPrimary = darkMode ? 'text-stone-100' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-stone-500' : 'text-gray-600';

  useEffect(() => {
    fetchTrends();
  }, []);

  const fetchTrends = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(buildApiUrl('/api/knowledge/trends/?days=30'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setTrends(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className={`${bgSecondary} border ${borderColor} rounded-lg p-6`}>Loading...</div>;

  return (
    <div className={`${bgSecondary} border ${borderColor} rounded-lg p-6`}>
      <div className="flex items-center gap-2 mb-4">
        <ArrowTrendingUpIcon className={`w-5 h-5 ${textSecondary}`} />
        <h3 className={`text-lg font-semibold ${textPrimary}`}>Trends (Last 30 Days)</h3>
      </div>

      {/* Status Distribution */}
      {trends?.status_distribution && (
        <div className="mb-6">
          <h4 className={`text-sm font-semibold ${textPrimary} mb-3`}>Decision Status</h4>
          <div className="space-y-2">
            {Object.entries(trends.status_distribution).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className={`text-sm ${textSecondary} capitalize`}>{status.replace('_', ' ')}</span>
                <span className={`text-sm font-semibold ${textPrimary}`}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trending Topics */}
      {trends?.trending_topics && trends.trending_topics.length > 0 && (
        <div>
          <h4 className={`text-sm font-semibold ${textPrimary} mb-3`}>Trending Topics</h4>
          <div className="flex flex-wrap gap-2">
            {trends.trending_topics.slice(0, 10).map((topic, idx) => (
              <span key={idx} className={`px-3 py-1 text-xs rounded ${darkMode ? 'bg-purple-900/20 text-purple-400 border border-purple-800' : 'bg-purple-50 text-purple-700 border border-purple-200'}`}>
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
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const bgSecondary = darkMode ? 'bg-stone-900' : 'bg-white';
  const borderColor = darkMode ? 'border-stone-800' : 'border-gray-200';
  const textPrimary = darkMode ? 'text-stone-100' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-stone-500' : 'text-gray-600';

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(buildApiUrl('/api/knowledge/metrics/'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setMetrics(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className={`${bgSecondary} border ${borderColor} rounded-lg p-6`}>Loading...</div>;

  return (
    <div className={`${bgSecondary} border ${borderColor} rounded-lg p-6`}>
      <div className="flex items-center gap-2 mb-4">
        <ChartBarIcon className={`w-5 h-5 ${textSecondary}`} />
        <h3 className={`text-lg font-semibold ${textPrimary}`}>Platform Metrics</h3>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className={`text-2xl font-bold ${textPrimary}`}>{metrics?.avg_search_time}s</div>
          <div className={`text-xs ${textSecondary}`}>Avg Search Time</div>
        </div>
        <div>
          <div className={`text-2xl font-bold ${textPrimary}`}>{metrics?.knowledge_reuse_rate}%</div>
          <div className={`text-xs ${textSecondary}`}>Reuse Rate</div>
        </div>
        <div>
          <div className={`text-2xl font-bold ${textPrimary}`}>{metrics?.user_activity?.decisions}</div>
          <div className={`text-xs ${textSecondary}`}>Your Decisions</div>
        </div>
        <div>
          <div className={`text-2xl font-bold ${textPrimary}`}>{metrics?.user_activity?.conversations}</div>
          <div className={`text-xs ${textSecondary}`}>Your Conversations</div>
        </div>
      </div>
    </div>
  );
}
