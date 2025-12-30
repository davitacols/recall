import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

function SprintDetail() {
  const { id } = useParams();
  const [sprint, setSprint] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSprint();
  }, [id]);

  const fetchSprint = async () => {
    try {
      const response = await api.get(`/api/agile/sprints/${id}/`);
      setSprint(response.data);
    } catch (error) {
      console.error('Failed to fetch sprint:', error);
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

  if (!sprint) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-900">Sprint not found</h2>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-5xl font-bold text-gray-900 mb-3">{sprint.name}</h1>
        <div className="flex items-center gap-4 text-lg text-gray-600">
          <span>{sprint.start_date} — {sprint.end_date}</span>
          <span className="px-2 py-1 bg-gray-100 text-gray-800 text-sm font-medium">
            Completed
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="border border-gray-200 p-6">
          <div className="text-4xl font-bold text-gray-900 mb-2">{sprint.completed || 0}</div>
          <div className="text-sm text-gray-600">Completed</div>
        </div>
        <div className="border border-gray-200 p-6">
          <div className="text-4xl font-bold text-gray-900 mb-2">{sprint.blocked || 0}</div>
          <div className="text-sm text-gray-600">Blocked</div>
        </div>
        <div className="border border-gray-200 p-6">
          <div className="text-4xl font-bold text-gray-900 mb-2">{sprint.decisions || 0}</div>
          <div className="text-sm text-gray-600">Decisions</div>
        </div>
      </div>

      {sprint.ai_summary && (
        <div className="border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">AI Summary</h2>
          <p className="text-base text-gray-700">{sprint.ai_summary}</p>
        </div>
      )}

      <div className="border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Sprint Feed</h2>
        <p className="text-sm text-gray-600">Read-only sprint feed</p>
      </div>
    </div>
  );
}

export default SprintDetail;
