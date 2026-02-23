import React, { useState, useEffect } from 'react';
import { ChartBarIcon, LinkIcon, UserGroupIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline';

export default function KnowledgeAnalytics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch various stats
      const [timeline, graph] = await Promise.all([
        fetch('http://localhost:8000/api/knowledge/timeline/?days=30', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json()),
        fetch('http://localhost:8000/api/knowledge/graph/', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json())
      ]);

      // Calculate stats
      const activityByType = {};
      timeline.forEach(item => {
        activityByType[item.type] = (activityByType[item.type] || 0) + 1;
      });

      const nodesByType = {};
      graph.nodes.forEach(node => {
        nodesByType[node.type] = (nodesByType[node.type] || 0) + 1;
      });

      setStats({
        totalActivity: timeline.length,
        totalNodes: graph.nodes.length,
        totalLinks: graph.edges.length,
        activityByType,
        nodesByType,
        avgLinksPerNode: graph.nodes.length > 0 ? (graph.edges.length / graph.nodes.length).toFixed(1) : 0
      });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading analytics...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        Knowledge Analytics
      </h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <ChartBarIcon className="w-8 h-8 text-blue-500" />
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
              {stats.totalActivity}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Activity (30d)</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <UserGroupIcon className="w-8 h-8 text-green-500" />
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
              {stats.totalNodes}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Knowledge Items</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <LinkIcon className="w-8 h-8 text-purple-500" />
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
              {stats.totalLinks}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Connections</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <ArrowTrendingUpIcon className="w-8 h-8 text-amber-500" />
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
              {stats.avgLinksPerNode}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Avg Links/Item</p>
        </div>
      </div>

      {/* Activity Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Activity by Type
          </h2>
          <div className="space-y-3">
            {Object.entries(stats.activityByType).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                  {type.replace('_', ' ')}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500"
                      style={{ width: `${(count / stats.totalActivity) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white w-8 text-right">
                    {count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Content Distribution
          </h2>
          <div className="space-y-3">
            {Object.entries(stats.nodesByType).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                  {type}s
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-500"
                      style={{ width: `${(count / stats.totalNodes) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white w-8 text-right">
                    {count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
