import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

function SprintSummary() {
  const [sprint, setSprint] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSprint();
  }, []);

  const fetchSprint = async () => {
    try {
      const response = await api.get('/api/agile/current-sprint/');
      setSprint(response.data);
    } catch (error) {
      console.error('Failed to fetch sprint:', error);
      setSprint(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !sprint) return null;

  return (
    <div className="border border-gray-200 bg-white p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{sprint.name}</h2>
          <p className="text-sm text-gray-600">{sprint.status}</p>
        </div>
        <Link to="/sprint-history" className="text-sm text-gray-900 hover:underline font-medium">
          View all →
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-green-600">{sprint.completed || 0}</div>
          <div className="text-xs text-gray-600 mt-1">Completed</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-600">{sprint.in_progress || 0}</div>
          <div className="text-xs text-gray-600 mt-1">In Progress</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-red-600">{sprint.todo || 0}</div>
          <div className="text-xs text-gray-600 mt-1">To Do</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900">{sprint.issue_count || 0}</div>
          <div className="text-xs text-gray-600 mt-1">Total</div>
        </div>
      </div>
    </div>
  );
}

export default SprintSummary;
