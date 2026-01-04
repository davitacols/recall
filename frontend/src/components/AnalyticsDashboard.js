import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, PlusIcon, BarChart3Icon, LineChartIcon } from '@heroicons/react/24/outline';

export default function AnalyticsDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [reports, setReports] = useState([]);
  const [dashboards, setDashboards] = useState([]);
  const [selectedDashboard, setSelectedDashboard] = useState(null);
  const [showCreateReport, setShowCreateReport] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
    fetchReports();
    fetchDashboards();
  }, []);

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/analytics/dashboard/', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    try {
      const response = await fetch('/api/analytics/reports/', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });
      const data = await response.json();
      setReports(data);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    }
  };

  const fetchDashboards = async () => {
    try {
      const response = await fetch('/api/analytics/dashboards/', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });
      const data = await response.json();
      setDashboards(data);
    } catch (error) {
      console.error('Failed to fetch dashboards:', error);
    }
  };

  const createReport = async (reportType) => {
    try {
      const response = await fetch('/api/analytics/reports/create/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: `${reportType} Report`,
          report_type: reportType,
          filters: {},
          sections: []
        })
      });

      if (response.ok) {
        fetchReports();
        setShowCreateReport(false);
      }
    } catch (error) {
      console.error('Failed to create report:', error);
    }
  };

  if (loading) return <div className="p-4">Loading analytics...</div>;

  return (
    <div className="p-6 max-w-7xl">
      <h2 className="text-2xl font-bold mb-6">Analytics & Reports</h2>

      {/* Key Metrics */}
      {metrics && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-600">Issues Created</div>
            <div className="text-3xl font-bold">{metrics.issue_count}</div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-600">Decisions Made</div>
            <div className="text-3xl font-bold">{metrics.decision_count}</div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-600">Completion Rate</div>
            <div className="text-3xl font-bold">{metrics.completion_rate}%</div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-600">Sprint Velocity</div>
            <div className="text-3xl font-bold">{metrics.sprint_velocity}</div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-600">Avg Resolution Time</div>
            <div className="text-3xl font-bold">{metrics.resolution_time}h</div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-600">Team Members</div>
            <div className="text-3xl font-bold">{metrics.team_capacity.total_users}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Reports */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Reports</h3>
            <button
              onClick={() => setShowCreateReport(!showCreateReport)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              <PlusIcon className="w-4 h-4" />
              New Report
            </button>
          </div>

          {showCreateReport && (
            <div className="border rounded-lg p-4 mb-4 bg-gray-50 space-y-2">
              <button
                onClick={() => createReport('sprint_summary')}
                className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                Sprint Summary
              </button>
              <button
                onClick={() => createReport('team_performance')}
                className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                Team Performance
              </button>
              <button
                onClick={() => createReport('decision_analysis')}
                className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                Decision Analysis
              </button>
            </div>
          )}

          <div className="space-y-2">
            {reports.map(report => (
              <div key={report.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{report.name}</div>
                    <div className="text-sm text-gray-600">{report.report_type}</div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    report.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {report.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dashboards */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Dashboards</h3>
            <button
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              <PlusIcon className="w-4 h-4" />
              New Dashboard
            </button>
          </div>

          <div className="space-y-2">
            {dashboards.map(dashboard => (
              <div
                key={dashboard.id}
                onClick={() => setSelectedDashboard(dashboard.id)}
                className={`border rounded-lg p-4 cursor-pointer ${
                  selectedDashboard === dashboard.id ? 'bg-blue-50 border-blue-500' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{dashboard.name}</div>
                    <div className="text-sm text-gray-600">{dashboard.layout} layout</div>
                  </div>
                  {dashboard.is_default && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                      Default
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
