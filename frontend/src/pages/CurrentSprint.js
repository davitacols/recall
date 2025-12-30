import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Button from '../components/Button';

function CurrentSprint() {
  const [sprint, setSprint] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showLearnModal, setShowLearnModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    fetchSprint();
  }, []);

  const fetchSprint = async () => {
    try {
      const [sprintRes, updatesRes] = await Promise.all([
        api.get('/api/agile/current-sprint/'),
        api.get('/api/agile/sprint-updates/')
      ]);
      
      if (sprintRes.data.message === 'No active sprint') {
        setSprint(null);
        setSummary(null);
        setUpdates([]);
      } else {
        setSprint(sprintRes.data);
        setSummary(sprintRes.data);
        setUpdates(updatesRes.data);
      }
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch sprint:', error);
      setLoading(false);
    }
  };

  const handleEndSprint = async () => {
    setEnding(true);
    try {
      await api.post(`/api/agile/sprints/${sprint.id}/end/`);
      fetchSprint();
      setShowEndModal(false);
    } catch (error) {
      console.error('Failed to end sprint:', error);
    } finally {
      setEnding(false);
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
      <div className="text-center py-32">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">No active sprint</h2>
        <p className="text-xl text-gray-600 mb-8 max-w-lg mx-auto">
          Start a sprint to capture progress, blockers, and decisions in one place.
        </p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setShowStartModal(true)}
            className="px-6 py-3 bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors"
          >
            Start sprint
          </button>
          <button
            onClick={() => setShowLearnModal(true)}
            className="px-6 py-3 border border-gray-900 text-gray-900 font-medium hover:bg-gray-50 transition-colors"
          >
            Learn how sprints work
          </button>
        </div>
        {showStartModal && <StartSprintModal onClose={() => setShowStartModal(false)} onSubmit={fetchSprint} />}
        {showLearnModal && <LearnSprintsModal onClose={() => setShowLearnModal(false)} onStart={() => { setShowLearnModal(false); setShowStartModal(true); }} />}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Top Sprint Bar (Sticky) */}
      <div className="sticky top-16 bg-white border-b border-gray-200 -mx-8 px-8 py-4 mb-8 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">{sprint.name}</h1>
            <span className="text-base text-gray-600">{sprint.start_date} — {sprint.end_date}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium">Active</span>
            <button
              onClick={() => setShowEndModal(true)}
              className="px-4 py-2 border border-gray-900 font-medium hover:bg-gray-50 transition-colors"
            >
              End sprint
            </button>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-[65%_35%] gap-8">
        {/* Left: Sprint Feed */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-6">Sprint Feed</h2>

          {updates.length === 0 ? (
            <div className="border border-gray-200 p-12 text-center">
              <p className="text-gray-600 mb-4">No updates yet. Post your first sprint update.</p>
              <button
                onClick={() => setShowModal(true)}
                className="px-4 py-2 bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors"
              >
                Post update
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {updates.map(update => (
                <UpdateCard key={update.id} update={update} />
              ))}
            </div>
          )}
        </div>

        {/* Right: Sprint Overview (AI) */}
        {summary && (
          <div className="sticky top-32 h-fit">
            <div className="border border-gray-200 bg-white p-6">
              <h3 className="text-base font-bold text-gray-900 mb-6">
                Sprint overview
              </h3>

              <div className="space-y-6">
                <div>
                  <div className="text-sm text-gray-600 mb-2">Completed updates</div>
                  <div className="text-3xl font-bold text-gray-900">{summary.completed}</div>
                </div>

                {summary.blocked > 0 && (
                  <div className="border-t border-gray-200 pt-4">
                    <div className="text-sm text-gray-600 mb-2">Open blockers</div>
                    <div className="text-3xl font-bold text-red-600 mb-2">{summary.blocked}</div>
                    <Link to="/blockers" className="text-sm text-gray-900 hover:underline">
                      View all blockers →
                    </Link>
                  </div>
                )}

                {summary.decisions_made > 0 && (
                  <div className="border-t border-gray-200 pt-4">
                    <div className="text-sm text-gray-600 mb-2">Scope changes</div>
                    <div className="text-3xl font-bold text-blue-600 mb-2">{summary.decisions_made}</div>
                    <Link to="/decisions" className="text-sm text-gray-900 hover:underline">
                      Review decisions →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-gray-900 text-white rounded-full shadow-lg hover:bg-gray-800 transition-colors flex items-center justify-center text-2xl font-light z-50"
      >
        +
      </button>

      {showModal && <NewUpdateModal onClose={() => setShowModal(false)} onSubmit={fetchSprint} />}
      {showEndModal && <EndSprintModal sprint={sprint} onClose={() => setShowEndModal(false)} onConfirm={handleEndSprint} loading={ending} />}
    </div>
  );
}

function UpdateCard({ update }) {
  const [expanded, setExpanded] = useState(false);
  const authorInitial = update.author ? update.author.charAt(0).toUpperCase() : 'U';

  return (
    <div className={`border border-gray-200 p-6 ${update.type === 'blocker' ? 'border-l-4 border-red-600' : ''}`}>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center text-white text-sm font-bold">
          {authorInitial}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-900">{update.author || 'Unknown'}</span>
            <span className="text-sm text-gray-500">{update.timestamp}</span>
            {update.type === 'blocker' && (
              <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs font-medium">Blocker</span>
            )}
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-2">{update.title}</h3>
          <p className="text-base text-gray-700">{update.content}</p>
        </div>
      </div>

      {update.ai_summary && (
        <div className="border-t border-gray-100 pt-3 mt-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            {expanded ? '− Hide' : '+ Show'} AI summary
          </button>
          {expanded && (
            <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-3">
              {update.ai_summary}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NewUpdateModal({ onClose, onSubmit }) {
  const [type, setType] = useState('sprint_update');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await api.post('/api/agile/sprint-updates/', {
        type,
        title,
        content
      });
      console.log('Update posted:', response.data);
      onSubmit();
      onClose();
    } catch (error) {
      console.error('Failed to post update:', error);
      alert('Failed to post update. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-2xl">
        <div className="border-b border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-900">Create update</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setType('sprint_update')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  type === 'sprint_update' ? 'bg-gray-900 text-white' : 'border border-gray-900 text-gray-900 hover:bg-gray-50'
                }`}
              >
                Sprint Update
              </button>
              <button
                type="button"
                onClick={() => setType('blocker')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  type === 'blocker' ? 'bg-gray-900 text-white' : 'border border-gray-900 text-gray-900 hover:bg-gray-50'
                }`}
              >
                Blocker
              </button>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              What's the update?
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-900 focus:outline-none"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Share progress, context, or concerns. Keep it simple.
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-900 focus:outline-none resize-none"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Link decision (optional)
            </label>
            <input
              type="text"
              placeholder="Decision ID or URL"
              className="w-full px-3 py-2 border border-gray-900 focus:outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">Link a decision to track scope changes</p>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button type="button" onClick={onClose} variant="secondary">
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Post update
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StartSprintModal({ onClose, onSubmit }) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const twoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(twoWeeks);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/api/agile/sprints/', {
        name,
        start_date: startDate,
        end_date: endDate
      });
      onSubmit();
      onClose();
    } catch (error) {
      console.error('Failed to start sprint:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-md">
        <div className="border-b border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-900">Start a sprint</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-900 mb-2">Sprint name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sprint 14"
              className="w-full px-3 py-2 border border-gray-900 focus:outline-none"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-900 mb-2">Start date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-900 focus:outline-none"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-900 mb-2">End date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-900 focus:outline-none"
              required
            />
            <p className="text-xs text-gray-500 mt-2">You can change these later.</p>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button type="button" onClick={onClose} variant="secondary">
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Start sprint
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CurrentSprint;

function LearnSprintsModal({ onClose, onStart }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="border-b border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-900">How sprints work in Recall</h2>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Async-first sprint memory</h3>
            <p className="text-base text-gray-700">
              Sprints in Recall capture progress, blockers, and decisions in one place. No meetings required.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">What you can do</h3>
            <ul className="space-y-2 text-base text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-gray-900 font-bold">•</span>
                <span>Post sprint updates to share progress and context</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-900 font-bold">•</span>
                <span>Flag blockers to make them visible early</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-900 font-bold">•</span>
                <span>Link decisions to track what changed and why</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-900 font-bold">•</span>
                <span>Get AI-generated summaries automatically</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">What we don't do</h3>
            <p className="text-base text-gray-700 mb-2">
              Recall is not a task tracker. We focus on memory and context:
            </p>
            <ul className="space-y-2 text-base text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-gray-400">✗</span>
                <span>No story points or task assignments</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400">✗</span>
                <span>No burndown charts or velocity tracking</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400">✗</span>
                <span>No live chat or real-time collaboration</span>
              </li>
            </ul>
          </div>

          <div className="bg-gray-50 p-4 border-l-4 border-gray-900">
            <p className="text-base text-gray-900">
              Teams don't "manage" sprints in Recall — they remember them.
            </p>
          </div>
        </div>

        <div className="border-t border-gray-200 p-6 flex items-center justify-end gap-3">
          <Button type="button" onClick={onClose} variant="secondary">
            Close
          </Button>
          <Button type="button" onClick={onStart}>
            Start your first sprint
          </Button>
        </div>
      </div>
    </div>
  );
}

function EndSprintModal({ sprint, onClose, onConfirm, loading }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-md">
        <div className="border-b border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-900">End sprint?</h2>
        </div>

        <div className="p-6">
          <p className="text-base text-gray-700 mb-6">
            This will mark {sprint.name} as complete and generate an AI retrospective summary.
          </p>

          <div className="bg-gray-50 p-4 space-y-2 text-sm text-gray-700">
            <div>✓ Sprint updates will be preserved</div>
            <div>✓ Blockers will remain visible</div>
            <div>✓ AI summary will be generated</div>
          </div>
        </div>

        <div className="border-t border-gray-200 p-6 flex items-center justify-end gap-3">
          <Button type="button" onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm} loading={loading}>
            End sprint
          </Button>
        </div>
      </div>
    </div>
  );
}
