import React, { useState, useEffect } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: '',
    user_id: '',
    days: 30
  });
  const [expandedLog, setExpandedLog] = useState(null);

  useEffect(() => {
    fetchAuditLogs();
  }, [filters]);

  const fetchAuditLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.action) params.append('action', filters.action);
      if (filters.user_id) params.append('user_id', filters.user_id);
      params.append('days', filters.days);

      const response = await fetch(`/api/audit-logs/?${params}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });
      const data = await response.json();
      setLogs(data);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getActionColor = (action) => {
    const colors = {
      create: 'bg-green-100 text-green-800',
      update: 'bg-blue-100 text-blue-800',
      delete: 'bg-red-100 text-red-800',
      assign: 'bg-purple-100 text-purple-800',
      comment: 'bg-yellow-100 text-yellow-800',
      approve: 'bg-green-100 text-green-800',
      reject: 'bg-red-100 text-red-800',
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
  };

  if (loading) return <div className="p-4">Loading audit logs...</div>;

  return (
    <div className="p-6 max-w-6xl">
      <h2 className="text-2xl font-bold mb-6">Audit Log</h2>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Action</label>
          <select
            value={filters.action}
            onChange={(e) => setFilters({...filters, action: e.target.value})}
            className="border rounded px-3 py-2 w-full"
          >
            <option value="">All Actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="assign">Assign</option>
            <option value="comment">Comment</option>
            <option value="approve">Approve</option>
            <option value="reject">Reject</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Time Range</label>
          <select
            value={filters.days}
            onChange={(e) => setFilters({...filters, days: parseInt(e.target.value)})}
            className="border rounded px-3 py-2 w-full"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        {logs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No audit logs found</div>
        ) : (
          logs.map((log, idx) => (
            <div key={idx} className="border rounded-lg p-4">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedLog(expandedLog === idx ? null : idx)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                    <span className="font-semibold">{log.user}</span>
                    <span className="text-gray-600">{log.description}</span>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {formatDate(log.created_at)} • {log.object_type}
                  </div>
                </div>

                <ChevronDownIcon
                  className={`w-5 h-5 transition-transform ${expandedLog === idx ? 'rotate-180' : ''}`}
                />
              </div>

              {expandedLog === idx && log.changes && Object.keys(log.changes).length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="text-sm font-medium mb-2">Changes:</div>
                  <div className="space-y-2">
                    {Object.entries(log.changes).map(([field, change]) => (
                      <div key={field} className="bg-gray-50 p-2 rounded text-sm">
                        <div className="font-medium">{field}</div>
                        <div className="text-red-600">- {JSON.stringify(change.old)}</div>
                        <div className="text-green-600">+ {JSON.stringify(change.new)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
