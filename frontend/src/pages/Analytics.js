import React, { useState, useEffect } from 'react';
import api from '../services/api';

function Analytics() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    fetchMetrics();
  }, [timeRange]);

  const fetchMetrics = async () => {
    try {
      const response = await api.get(`/api/organizations/analytics/?range=${timeRange}`);
      setMetrics(response.data);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-600">Failed to load analytics data</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-5xl font-bold text-gray-900 mb-3">Analytics</h1>
          <p className="text-xl text-gray-600">Usage metrics and trends</p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-4 py-2 border border-gray-900 focus:outline-none"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="border border-gray-200 p-6">
          <div className="text-4xl font-bold text-gray-900 mb-2">{metrics.total_users}</div>
          <div className="text-sm text-gray-600 font-medium">Active Users</div>
          <div className="text-xs text-green-600 mt-2">+{metrics.user_growth}% growth</div>
        </div>
        <div className="border border-gray-200 p-6">
          <div className="text-4xl font-bold text-gray-900 mb-2">{metrics.total_decisions}</div>
          <div className="text-sm text-gray-600 font-medium">Decisions Made</div>
          <div className="text-xs text-green-600 mt-2">+{metrics.decision_growth}% growth</div>
        </div>
        <div className="border border-gray-200 p-6">
          <div className="text-4xl font-bold text-gray-900 mb-2">{metrics.avg_response_time}h</div>
          <div className="text-sm text-gray-600 font-medium">Avg Response Time</div>
          <div className="text-xs text-green-600 mt-2">-{metrics.response_improvement}% faster</div>
        </div>
        <div className="border border-gray-200 p-6">
          <div className="text-4xl font-bold text-gray-900 mb-2">{metrics.knowledge_score}</div>
          <div className="text-sm text-gray-600 font-medium">Knowledge Score</div>
          <div className="text-xs text-green-600 mt-2">+{metrics.score_improvement} points</div>
        </div>
      </div>

      {/* Usage Trends */}
      <div className="border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-6">Usage Trends</h2>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-900">Daily Active Users</span>
              <span className="text-sm font-bold text-gray-900">{metrics.dau}</span>
            </div>
            <div className="w-full bg-gray-200 h-2">
              <div className="bg-gray-900 h-2" style={{ width: `${(metrics.dau / metrics.total_users) * 100}%` }} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-900">Decisions per User</span>
              <span className="text-sm font-bold text-gray-900">{metrics.decisions_per_user}</span>
            </div>
            <div className="w-full bg-gray-200 h-2">
              <div className="bg-gray-900 h-2" style={{ width: `${Math.min(metrics.decisions_per_user * 10, 100)}%` }} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-900">Engagement Rate</span>
              <span className="text-sm font-bold text-gray-900">{metrics.engagement_rate}%</span>
            </div>
            <div className="w-full bg-gray-200 h-2">
              <div className="bg-gray-900 h-2" style={{ width: `${metrics.engagement_rate}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Top Contributors */}
      <div className="border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-6">Top Contributors</h2>
        <div className="space-y-3">
          {metrics.top_contributors.map((user, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-gray-500">#{idx + 1}</span>
                <span className="text-base text-gray-900">{user.name}</span>
              </div>
              <span className="text-sm text-gray-600">{user.contributions} contributions</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Analytics;
