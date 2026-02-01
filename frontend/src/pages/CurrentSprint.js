import React, { useState, useEffect } from 'react';
import api from '../services/api';

function CurrentSprint() {
  const [sprint, setSprint] = useState(null);
  const [blockers, setBlockers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBlockerModal, setShowBlockerModal] = useState(false);
  const [isReportingBlocker, setIsReportingBlocker] = useState(false);

  useEffect(() => {
    fetchSprint();
    
    // Auto-refresh every 5 seconds
    const interval = setInterval(() => {
      fetchSprint();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchSprint = async () => {
    try {
      const sprintRes = await api.get('/api/agile/current-sprint/');
      setSprint(sprintRes.data);
      
      if (sprintRes.data.id) {
        const blockersRes = await api.get(`/api/agile/blockers/?sprint_id=${sprintRes.data.id}`).catch(() => ({ data: [] }));
        setBlockers(blockersRes.data);
      }
    } catch (error) {
      console.error('Failed to fetch sprint:', error);
      setSprint(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (!sprint) {
    return (
      <div className="text-center py-20">
        <h2 className="text-4xl font-black text-gray-900 mb-4">No active sprint</h2>
        <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto font-light">Create a sprint in a project to start tracking progress, blockers, and team updates.</p>
        <a href="/projects" className="text-gray-900 font-bold hover:underline">Go to Projects →</a>
      </div>
    );
  }

  const completionPercentage = sprint.completed && sprint.issue_count ? Math.round((sprint.completed / sprint.issue_count) * 100) : 0;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-16">
        {/* Sprint Header */}
        <div className="p-8 bg-white border border-gray-200 mb-12">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-5xl font-black text-gray-900 mb-3 tracking-tight">{sprint.name}</h1>
              <p className="text-lg text-gray-600 font-light">{sprint.start_date} to {sprint.end_date}</p>
            </div>
            <div className="flex gap-2">
              <span className="px-4 py-2 bg-green-600 text-white text-xs font-bold uppercase tracking-wide">Active</span>
            </div>
          </div>

          {sprint.goal && (
            <p className="text-gray-600 font-light italic">Goal: {sprint.goal}</p>
          )}
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-3 gap-12">
          {/* Left: Issues Progress (2 columns) */}
          <div className="col-span-2 space-y-8">
            <h2 className="text-3xl font-black text-gray-900">Sprint Progress</h2>

            {/* Progress Bar */}
            <div className="p-8 bg-white border border-gray-200">
              <div className="flex justify-between mb-4">
                <span className="text-sm font-bold text-gray-900 uppercase tracking-wide">Completion</span>
                <span className="text-sm font-bold text-gray-900">{completionPercentage}%</span>
              </div>
              <div className="w-full h-3 bg-gray-200">
                <div
                  style={{ width: `${completionPercentage}%` }}
                  className="h-full bg-green-600 transition-all duration-300"
                />
              </div>
            </div>

            {/* Issue Stats */}
            <div className="grid grid-cols-3 gap-6">
              <div className="p-8 bg-white border border-gray-200 text-center">
                <p className="text-4xl font-black text-gray-900 mb-2">{sprint.completed || 0}</p>
                <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Completed</p>
              </div>

              <div className="p-8 bg-white border border-gray-200 text-center">
                <p className="text-4xl font-black text-amber-600 mb-2">{sprint.in_progress || 0}</p>
                <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">In Progress</p>
              </div>

              <div className="p-8 bg-white border border-gray-200 text-center">
                <p className="text-4xl font-black text-gray-600 mb-2">{sprint.todo || 0}</p>
                <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">To Do</p>
              </div>
            </div>

            {/* View Board Link */}
            {sprint.project_id && (
              <a href={`/projects/${sprint.project_id}`} className="inline-block px-8 py-4 bg-gray-900 text-white hover:bg-black font-bold uppercase text-sm transition-all">
                View Kanban Board →
              </a>
            )}
          </div>

          {/* Right: Sidebar */}
          <div className="space-y-8">
            {/* Blockers */}
            <div className="p-8 bg-white border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Active Blockers</h3>

              {blockers.length === 0 ? (
                <p className="text-sm text-gray-600 font-medium mb-6">No active blockers</p>
              ) : (
                <div className="space-y-3 mb-6">
                  {blockers.slice(0, 3).map(blocker => (
                    <div key={blocker.id} className="p-4 bg-white border-l-4 border-red-600">
                      <div className="text-sm font-bold text-gray-900 mb-1">{blocker.title}</div>
                      <div className="text-xs text-gray-600">{blocker.days_open} days open</div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setShowBlockerModal(true)}
                disabled={isReportingBlocker}
                className="w-full px-6 py-3 bg-gray-900 text-white hover:bg-black font-bold uppercase text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isReportingBlocker && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                Report Blocker
              </button>
            </div>

            {/* Sprint Info */}
            <div className="p-8 bg-white border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Sprint Info</h3>

              <div className="space-y-6">
                <div>
                  <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-2">Total Issues</p>
                  <p className="text-3xl font-black text-gray-900">{sprint.issue_count || 0}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {showBlockerModal && (
          <BlockerModal
            sprintId={sprint.id}
            onClose={() => setShowBlockerModal(false)}
            onSubmit={() => {
              setShowBlockerModal(false);
              fetchSprint();
            }}
          />
        )}
      </div>
    </div>
  );
}

function BlockerModal({ sprintId, onClose, onSubmit }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('technical');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/api/agile/blockers/', {
        sprint_id: sprintId,
        title,
        description,
        type
      });
      onSubmit();
    } catch (error) {
      console.error('Failed to create blocker:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Report Blocker</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's blocking progress?"
              className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
            >
              <option value="technical">Technical</option>
              <option value="dependency">Dependency</option>
              <option value="decision">Decision Needed</option>
              <option value="resource">Resource</option>
              <option value="external">External</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide context..."
              className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all min-h-24"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-6 py-3 border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white font-bold uppercase text-sm transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 bg-gray-900 text-white hover:bg-black font-bold uppercase text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {submitting ? 'Creating...' : 'Report Blocker'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CurrentSprint;
