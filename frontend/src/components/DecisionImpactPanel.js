import React, { useState, useEffect } from 'react';
import { LinkIcon, TrashIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

export function DecisionImpactPanel({ issueId, issueTitle }) {
  const [impacts, setImpacts] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLinkModal, setShowLinkModal] = useState(false);

  useEffect(() => {
    fetchImpacts();
  }, [issueId]);

  const fetchImpacts = async () => {
    try {
      const response = await api.get(`/api/agile/issues/${issueId}/decision-impacts/`);
      setImpacts(response.data.impacts || []);
      setHistory(response.data.history || []);
    } catch (error) {
      console.error('Failed to fetch impacts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-gray-600">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Decision Impacts */}
      <div className="p-6 bg-white border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">Decision Impacts</h3>
          <button
            onClick={() => setShowLinkModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white hover:bg-black font-bold text-sm transition-all"
          >
            <LinkIcon className="w-4 h-4" />
            Link Decision
          </button>
        </div>

        {impacts.length === 0 ? (
          <p className="text-gray-600 text-sm">No decisions linked to this issue</p>
        ) : (
          <div className="space-y-3">
            {impacts.map(impact => (
              <div key={impact.id} className="p-4 bg-gray-50 border border-gray-200">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-bold text-gray-900">{impact.decision_title}</div>
                    <div className={`text-xs font-semibold mt-1 ${getImpactColor(impact.impact_type)}`}>
                      {impact.impact_type.toUpperCase()}
                    </div>
                  </div>
                  <span className="text-xs text-gray-600">{impact.created_by_name}</span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{impact.description}</p>
                <div className="flex gap-4 text-xs text-gray-600">
                  {impact.estimated_effort_change !== 0 && (
                    <div className={impact.estimated_effort_change > 0 ? 'text-red-600' : 'text-green-600'}>
                      {impact.estimated_effort_change > 0 ? '+' : ''}{impact.estimated_effort_change} pts
                    </div>
                  )}
                  {impact.estimated_delay_days > 0 && (
                    <div className="text-orange-600">{impact.estimated_delay_days} days delay</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Change History */}
      {history.length > 0 && (
        <div className="p-6 bg-white border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Decision-Driven Changes</h3>
          <div className="space-y-3">
            {history.map(entry => (
              <div key={entry.id} className="p-3 bg-gray-50 border-l-4 border-blue-500">
                <div className="flex justify-between items-start mb-1">
                  <div className="font-semibold text-gray-900 text-sm">{entry.change_type.replace('_', ' ')}</div>
                  <span className="text-xs text-gray-600">{new Date(entry.created_at).toLocaleDateString()}</span>
                </div>
                <div className="text-xs text-gray-600 mb-1">
                  Decision: <span className="font-semibold">{entry.decision_title}</span>
                </div>
                {entry.old_value && entry.new_value && (
                  <div className="text-xs text-gray-600">
                    {entry.old_value} → {entry.new_value}
                  </div>
                )}
                <p className="text-xs text-gray-600 italic mt-1">{entry.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {showLinkModal && (
        <LinkDecisionModal
          issueId={issueId}
          onClose={() => setShowLinkModal(false)}
          onSuccess={() => {
            setShowLinkModal(false);
            fetchImpacts();
          }}
        />
      )}
    </div>
  );
}

function getImpactColor(type) {
  switch (type) {
    case 'blocks':
      return 'text-red-600';
    case 'enables':
      return 'text-green-600';
    case 'changes':
      return 'text-orange-600';
    case 'accelerates':
      return 'text-blue-600';
    case 'delays':
      return 'text-yellow-600';
    default:
      return 'text-gray-600';
  }
}

function LinkDecisionModal({ issueId, onClose, onSuccess }) {
  const [decisions, setDecisions] = useState([]);
  const [selectedDecision, setSelectedDecision] = useState('');
  const [impactType, setImpactType] = useState('enables');
  const [description, setDescription] = useState('');
  const [effortChange, setEffortChange] = useState(0);
  const [delayDays, setDelayDays] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDecisions();
  }, []);

  const fetchDecisions = async () => {
    try {
      const response = await api.get('/api/decisions/');
      setDecisions(response.data);
    } catch (error) {
      console.error('Failed to fetch decisions:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(`/api/agile/issues/${issueId}/link-decision/`, {
        decision_id: selectedDecision,
        impact_type: impactType,
        description,
        estimated_effort_change: parseInt(effortChange),
        estimated_delay_days: parseInt(delayDays)
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to link decision:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Link Decision to Issue</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">Decision</label>
            <select
              value={selectedDecision}
              onChange={(e) => setSelectedDecision(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
              required
            >
              <option value="">Select a decision...</option>
              {decisions.map(d => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">Impact Type</label>
            <select
              value={impactType}
              onChange={(e) => setImpactType(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
            >
              <option value="enables">Enables</option>
              <option value="blocks">Blocks</option>
              <option value="changes">Changes Requirements</option>
              <option value="accelerates">Accelerates</option>
              <option value="delays">Delays</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="How does this decision impact the issue?"
              className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all min-h-20"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">Effort Change (pts)</label>
              <input
                type="number"
                value={effortChange}
                onChange={(e) => setEffortChange(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">Delay (days)</label>
              <input
                type="number"
                value={delayDays}
                onChange={(e) => setDelayDays(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
              />
            </div>
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
              disabled={submitting || !selectedDecision}
              className="px-6 py-3 bg-gray-900 text-white hover:bg-black font-bold uppercase text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Linking...' : 'Link Decision'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DecisionImpactPanel;
