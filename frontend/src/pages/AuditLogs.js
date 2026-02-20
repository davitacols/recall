import React, { useState, useEffect } from 'react';
import { useTheme } from '../utils/ThemeAndAccessibility';
import api from '../services/api';
import { ClockIcon, FunnelIcon } from '@heroicons/react/24/outline';

function AuditLogs() {
  const { darkMode } = useTheme();
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({ action: '', user_id: '', resource_type: '' });

  const bgColor = darkMode ? 'bg-stone-950' : 'bg-white';
  const cardBg = darkMode ? 'bg-stone-900' : 'bg-white';
  const borderColor = darkMode ? 'border-stone-800' : 'border-gray-200';
  const textColor = darkMode ? 'text-stone-100' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-stone-400' : 'text-gray-600';

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [page, filters]);

  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams({ page, ...filters });
      const response = await api.get(`/api/organizations/audit/?${params}`);
      setLogs(response.data.results);
      setTotalPages(response.data.total_pages);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/api/organizations/audit/stats/');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'create': return 'bg-green-100 text-green-800';
      case 'update': return 'bg-blue-100 text-blue-800';
      case 'delete': return 'bg-red-100 text-red-800';
      case 'login': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${bgColor} flex items-center justify-center`}>
        <div className={`w-8 h-8 border-2 ${darkMode ? 'border-stone-700 border-t-stone-400' : 'border-gray-300 border-t-gray-600'} rounded-full animate-spin`}></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bgColor}`}>
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        <div className="mb-8">
          <h1 className={`text-4xl font-bold ${textColor} mb-2`}>Audit Logs</h1>
          <p className={textSecondary}>View system activity and security logs</p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className={`${cardBg} border ${borderColor} rounded-lg p-4`}>
              <div className={`text-sm ${textSecondary} mb-1`}>Total Events</div>
              <div className={`text-2xl font-bold ${textColor}`}>{stats.total}</div>
            </div>
            <div className={`${cardBg} border ${borderColor} rounded-lg p-4`}>
              <div className={`text-sm ${textSecondary} mb-1`}>Most Active User</div>
              <div className={`text-lg font-semibold ${textColor}`}>
                {stats.by_user[0]?.user__full_name || 'N/A'}
              </div>
            </div>
            <div className={`${cardBg} border ${borderColor} rounded-lg p-4`}>
              <div className={`text-sm ${textSecondary} mb-1`}>Most Common Action</div>
              <div className={`text-lg font-semibold ${textColor}`}>
                {stats.by_action[0]?.action || 'N/A'}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className={`${cardBg} border ${borderColor} rounded-lg p-4 mb-6`}>
          <div className="flex items-center gap-2 mb-3">
            <FunnelIcon className={`w-5 h-5 ${textSecondary}`} />
            <span className={`font-semibold ${textColor}`}>Filters</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              className={`px-3 py-2 border ${borderColor} rounded-lg ${darkMode ? 'bg-stone-800 text-stone-100' : 'bg-white text-gray-900'}`}
            >
              <option value="">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
            </select>
            <select
              value={filters.resource_type}
              onChange={(e) => setFilters({ ...filters, resource_type: e.target.value })}
              className={`px-3 py-2 border ${borderColor} rounded-lg ${darkMode ? 'bg-stone-800 text-stone-100' : 'bg-white text-gray-900'}`}
            >
              <option value="">All Resources</option>
              <option value="conversation">Conversation</option>
              <option value="decision">Decision</option>
              <option value="issue">Issue</option>
              <option value="user">User</option>
            </select>
            <button
              onClick={() => setFilters({ action: '', user_id: '', resource_type: '' })}
              className={`px-4 py-2 border ${borderColor} rounded-lg ${textColor} hover:bg-gray-50 transition-all`}
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Logs */}
        <div className={`${cardBg} border ${borderColor} rounded-lg overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={`${darkMode ? 'bg-stone-800' : 'bg-gray-50'} border-b ${borderColor}`}>
                <tr>
                  <th className={`px-4 py-3 text-left text-xs font-semibold ${textSecondary} uppercase`}>Time</th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold ${textSecondary} uppercase`}>User</th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold ${textSecondary} uppercase`}>Action</th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold ${textSecondary} uppercase`}>Resource</th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold ${textSecondary} uppercase`}>IP Address</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${borderColor}`}>
                {logs.map(log => (
                  <tr key={log.id} className={`${darkMode ? 'hover:bg-stone-800' : 'hover:bg-gray-50'} transition-colors`}>
                    <td className={`px-4 py-3 text-sm ${textSecondary}`}>
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className={`px-4 py-3 text-sm ${textColor}`}>{log.user}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-sm ${textColor}`}>
                      {log.resource_type}
                      {log.resource_id && ` #${log.resource_id}`}
                    </td>
                    <td className={`px-4 py-3 text-sm ${textSecondary} font-mono`}>
                      {log.ip_address || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={`flex items-center justify-between px-4 py-3 border-t ${borderColor}`}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className={`px-4 py-2 border ${borderColor} rounded-lg ${textColor} disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-all`}
              >
                Previous
              </button>
              <span className={textSecondary}>Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className={`px-4 py-2 border ${borderColor} rounded-lg ${textColor} disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-all`}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuditLogs;
