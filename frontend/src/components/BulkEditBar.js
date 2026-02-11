import React, { useState } from 'react';
import api from '../services/api';

function BulkEditBar({ selectedIssues, onUpdate, onClear }) {
  const [updates, setUpdates] = useState({});
  const [loading, setLoading] = useState(false);

  const handleBulkUpdate = async () => {
    if (Object.keys(updates).length === 0) {
      alert('Please select at least one field to update');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/agile/issues/bulk-update/', {
        issue_ids: selectedIssues,
        updates: updates
      });
      onUpdate();
      onClear();
      setUpdates({});
    } catch (error) {
      console.error('Failed to bulk update:', error);
      alert('Failed to update issues');
    } finally {
      setLoading(false);
    }
  };

  if (selectedIssues.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 shadow-lg z-50">
      <div className="max-w-7xl mx-auto flex items-center gap-4">
        <span className="font-bold">{selectedIssues.length} selected</span>
        
        <select
          onChange={(e) => setUpdates({ ...updates, status: e.target.value })}
          className="px-3 py-2 bg-white text-gray-900 border-0 text-sm font-medium"
          defaultValue=""
        >
          <option value="" disabled>Change Status</option>
          <option value="backlog">Backlog</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="in_review">In Review</option>
          <option value="testing">Testing</option>
          <option value="done">Done</option>
        </select>

        <select
          onChange={(e) => setUpdates({ ...updates, priority: e.target.value })}
          className="px-3 py-2 bg-white text-gray-900 border-0 text-sm font-medium"
          defaultValue=""
        >
          <option value="" disabled>Change Priority</option>
          <option value="lowest">Lowest</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="highest">Highest</option>
        </select>

        <div className="flex-1"></div>

        <button
          onClick={onClear}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-sm font-bold"
        >
          Cancel
        </button>

        <button
          onClick={handleBulkUpdate}
          disabled={loading || Object.keys(updates).length === 0}
          className="px-6 py-2 bg-white text-gray-900 hover:bg-gray-100 text-sm font-bold disabled:opacity-50"
        >
          {loading ? 'Updating...' : 'Apply Changes'}
        </button>
      </div>
    </div>
  );
}

export default BulkEditBar;
