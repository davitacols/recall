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
      const response = await api.get('/api/agile/sprint/current/');
      setSprint(response.data);
    } catch (error) {
      console.error('Failed to fetch sprint:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;
  if (!sprint || sprint.message) return null;

  return (
    <div className="border border-gray-200 bg-white p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{sprint.sprint_name}</h2>
          <p className="text-sm text-gray-600">{sprint.days_remaining} days remaining</p>
        </div>
        <Link to="/sprints" className="text-sm text-gray-900 hover:underline font-medium">
          View all →
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-green-600">{sprint.completed}</div>
          <div className="text-xs text-gray-600 mt-1">Completed</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-600">{sprint.in_progress}</div>
          <div className="text-xs text-gray-600 mt-1">In Progress</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-red-600">{sprint.blocked}</div>
          <div className="text-xs text-gray-600 mt-1">Blocked</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900">{sprint.decisions_made}</div>
          <div className="text-xs text-gray-600 mt-1">Decisions</div>
        </div>
      </div>

      {sprint.blockers && sprint.blockers.length > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Active Blockers</h3>
          <div className="space-y-2">
            {sprint.blockers.map((blocker) => (
              <div key={blocker.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-900">{blocker.title}</span>
                <span className="text-xs text-gray-500">{blocker.days_open}d open</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default SprintSummary;
