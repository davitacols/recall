import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

function SprintHistory() {
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSprints();
  }, []);

  const fetchSprints = async () => {
    try {
      const response = await api.get('/api/agile/sprint-history/');
      setSprints(response.data);
    } catch (error) {
      console.error('Failed to fetch sprints:', error);
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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-5xl font-bold text-gray-900 mb-3">Sprint History</h1>
        <p className="text-xl text-gray-600">Institutional memory for dev teams</p>
      </div>

      {sprints.length === 0 ? (
        <div className="text-center py-20 border border-gray-200 bg-gray-50">
          <h3 className="text-2xl font-bold text-gray-900 mb-3">No past sprints</h3>
          <p className="text-lg text-gray-600">Sprint history will appear here</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sprints.map(sprint => (
            <div key={sprint.id} className="border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{sprint.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>{sprint.start_date} — {sprint.end_date}</span>
                    <span className={`px-2 py-1 text-xs font-medium ${
                      sprint.outcome === 'on_track' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {sprint.outcome === 'on_track' ? 'On Track' : 'Slipped'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6 mb-4">
                <div>
                  <div className="text-3xl font-bold text-gray-900">{sprint.completed}</div>
                  <div className="text-sm text-gray-600">Completed</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-gray-900">{sprint.blocked}</div>
                  <div className="text-sm text-gray-600">Blocked</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-gray-900">{sprint.decisions}</div>
                  <div className="text-sm text-gray-600">Decisions</div>
                </div>
              </div>

              {sprint.ai_summary && (
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="text-sm text-gray-600 bg-gray-50 p-4">
                    {sprint.ai_summary}
                  </div>
                </div>
              )}

              <div className="mt-4">
                <Link
                  to={`/sprints/${sprint.id}`}
                  className="text-sm text-gray-900 hover:underline font-medium"
                >
                  View sprint details →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SprintHistory;
