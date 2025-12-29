import React, { useState, useEffect } from 'react';
import { ChartBarIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import { Link } from 'react-router-dom';

function Insights() {
  const [stats, setStats] = useState({
    totalConversations: 0,
    totalDecisions: 0,
    thisWeek: 0,
    activeUsers: 0
  });
  const [topContributors, setTopContributors] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      const [convRes, decRes] = await Promise.all([
        api.get('/api/conversations/'),
        api.get('/api/decisions/')
      ]);
      
      const conversations = convRes.data.results || convRes.data || [];
      const decisions = decRes.data.results || decRes.data || [];
      
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const thisWeekConv = conversations.filter(c => new Date(c.created_at) > oneWeekAgo);
      
      const contributors = {};
      conversations.forEach(c => {
        contributors[c.author] = (contributors[c.author] || 0) + 1;
      });
      
      const topContrib = Object.entries(contributors)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));
      
      setStats({
        totalConversations: conversations.length,
        totalDecisions: decisions.length,
        thisWeek: thisWeekConv.length,
        activeUsers: Object.keys(contributors).length
      });
      
      setTopContributors(topContrib);
      setRecentActivity(conversations.slice(0, 5));
    } catch (error) {
      console.error('Failed to fetch insights:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-12 animate-fadeIn">
        <h1 className="text-5xl font-bold text-gray-900 mb-3">Insights</h1>
        <p className="text-xl text-gray-600">Understanding your organization's knowledge</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-6 mb-12">
        <div className="border border-gray-200 p-8">
          <div className="text-4xl font-bold text-gray-900 mb-2">{stats.totalConversations}</div>
          <div className="text-sm text-gray-600 uppercase tracking-wide">Total Conversations</div>
        </div>
        <div className="border border-gray-200 p-8">
          <div className="text-4xl font-bold text-gray-900 mb-2">{stats.totalDecisions}</div>
          <div className="text-sm text-gray-600 uppercase tracking-wide">Decisions Made</div>
        </div>
        <div className="border border-gray-200 p-8">
          <div className="text-4xl font-bold text-gray-900 mb-2">{stats.thisWeek}</div>
          <div className="text-sm text-gray-600 uppercase tracking-wide">This Week</div>
        </div>
        <div className="border border-gray-200 p-8">
          <div className="text-4xl font-bold text-gray-900 mb-2">{stats.activeUsers}</div>
          <div className="text-sm text-gray-600 uppercase tracking-wide">Active Users</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Top Contributors */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Top Contributors</h2>
          <div className="border border-gray-200">
            {topContributors.map((contributor, idx) => (
              <div key={idx} className="p-6 border-b border-gray-200 last:border-b-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gray-900 flex items-center justify-center">
                      <span className="text-white font-bold">{contributor.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">{contributor.name}</span>
                  </div>
                  <span className="text-2xl font-bold text-gray-900">{contributor.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Activity</h2>
          <div className="space-y-4">
            {recentActivity.map((activity, idx) => (
              <Link key={idx} to={`/conversations/${activity.id}`} className="block border border-gray-200 p-6 hover:border-gray-900 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                    activity.post_type === 'decision' ? 'bg-gray-900 text-white' : 'border border-gray-900 text-gray-900'
                  }`}>
                    {activity.post_type}
                  </span>
                  <span className="text-sm text-gray-600">
                    {new Date(activity.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{activity.title}</h3>
                <p className="text-gray-600">{activity.author}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Insights;
