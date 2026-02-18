import React, { useState, useEffect } from 'react';
import { ClockIcon, PlusIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

export const TimeTracker = ({ issueId }) => {
  const [workLogs, setWorkLogs] = useState([]);
  const [showLogForm, setShowLogForm] = useState(false);
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadWorkLogs();
  }, [issueId]);

  const loadWorkLogs = async () => {
    try {
      const response = await api.get(`/api/agile/issues/${issueId}/work-logs/`);
      setWorkLogs(response.data);
    } catch (error) {
      console.error('Failed to load work logs:', error);
    }
  };

  const handleLogWork = async (e) => {
    e.preventDefault();
    const totalMinutes = (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0);
    
    if (totalMinutes <= 0) return;

    setLoading(true);
    try {
      await api.post(`/api/agile/issues/${issueId}/log-work/`, {
        time_spent_minutes: totalMinutes,
        description,
        started_at: new Date().toISOString()
      });
      setHours('');
      setMinutes('');
      setDescription('');
      setShowLogForm(false);
      loadWorkLogs();
    } catch (error) {
      console.error('Failed to log work:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (minutes) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const totalLogged = workLogs.reduce((sum, log) => sum + log.time_spent_minutes, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClockIcon className="w-5 h-5 text-gray-500" />
          <span className="font-medium">Time Tracking</span>
          <span className="text-sm text-gray-500">({formatTime(totalLogged)} logged)</span>
        </div>
        <button
          onClick={() => setShowLogForm(!showLogForm)}
          className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-1"
        >
          <PlusIcon className="w-4 h-4" />
          Log Work
        </button>
      </div>

      {showLogForm && (
        <form onSubmit={handleLogWork} className="p-4 border border-gray-200 rounded-lg space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs text-gray-600 mb-1">Hours</label>
              <input
                type="number"
                min="0"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="0"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-600 mb-1">Minutes</label>
              <input
                type="number"
                min="0"
                max="59"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="0"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              rows="2"
              placeholder="What did you work on?"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? 'Logging...' : 'Log Time'}
            </button>
            <button
              type="button"
              onClick={() => setShowLogForm(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {workLogs.length > 0 && (
        <div className="space-y-2">
          {workLogs.map((log) => (
            <div key={log.id} className="p-3 border border-gray-200 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-purple-600">{formatTime(log.time_spent_minutes)}</span>
                    <span className="text-sm text-gray-500">by {log.user}</span>
                  </div>
                  {log.description && (
                    <p className="text-sm text-gray-600 mt-1">{log.description}</p>
                  )}
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(log.started_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const TimeEstimate = ({ issueId, estimate, onUpdate }) => {
  const [showForm, setShowForm] = useState(false);
  const [original, setOriginal] = useState('');
  const [remaining, setRemaining] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (estimate) {
      setOriginal(estimate.original_estimate_minutes ? Math.floor(estimate.original_estimate_minutes / 60) : '');
      setRemaining(estimate.remaining_estimate_minutes ? Math.floor(estimate.remaining_estimate_minutes / 60) : '');
    }
  }, [estimate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/api/agile/issues/${issueId}/time-estimate/`, {
        original_estimate_minutes: original ? parseInt(original) * 60 : null,
        remaining_estimate_minutes: remaining ? parseInt(remaining) * 60 : null
      });
      setShowForm(false);
      onUpdate?.();
    } catch (error) {
      console.error('Failed to set estimate:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Time Estimate</span>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-sm text-purple-600 hover:text-purple-700"
        >
          {estimate ? 'Edit' : 'Set Estimate'}
        </button>
      </div>

      {estimate && !showForm && (
        <div className="text-sm text-gray-600 space-y-1">
          <div>Original: {Math.floor(estimate.original_estimate_minutes / 60)}h</div>
          <div>Remaining: {Math.floor(estimate.remaining_estimate_minutes / 60)}h</div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-2">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Original (hours)</label>
            <input
              type="number"
              min="0"
              value={original}
              onChange={(e) => setOriginal(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Remaining (hours)</label>
            <input
              type="number"
              min="0"
              value={remaining}
              onChange={(e) => setRemaining(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
