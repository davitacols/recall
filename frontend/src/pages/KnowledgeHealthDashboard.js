import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

function KnowledgeHealthDashboard() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHealth();
  }, []);

  const fetchHealth = async () => {
    try {
      console.log('[KnowledgeHealth] Fetching health data...');
      const response = await api.get('/api/knowledge/health/');
      console.log('[KnowledgeHealth] Response:', response.data);
      setHealth(response.data);
    } catch (error) {
      console.error('[KnowledgeHealth] Failed to fetch health:', error);
      console.error('[KnowledgeHealth] Error response:', error.response?.data);
      console.error('[KnowledgeHealth] Error status:', error.response?.status);
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

  if (!health) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-600">Failed to load health data</div>
      </div>
    );
  }

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-5xl font-bold text-gray-900 mb-3">Knowledge Health</h1>
        <p className="text-xl text-gray-600">How well is your team documenting decisions</p>
      </div>

      {/* Overall Score */}
      <div className="border-2 border-gray-900 bg-white p-8 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-2">
              Overall Health Score
            </div>
            <div className={`text-6xl font-bold ${getScoreColor(health.overall_score)}`}>
              {health.overall_score}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600 mb-2">
              {health.overall_score >= 80 ? 'Excellent' :
               health.overall_score >= 60 ? 'Good' :
               health.overall_score >= 40 ? 'Needs Work' : 'Critical'}
            </div>
            <div className="text-xs text-gray-500">
              Based on {health.total_decisions} decisions
            </div>
          </div>
        </div>
      </div>

      {/* Issues Grid */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="border border-gray-200 p-6">
          <div className="text-4xl font-bold text-red-600 mb-2">
            {health.decisions_without_owners}
          </div>
          <div className="text-sm text-gray-900 font-medium mb-3">Decisions without owners</div>
          <p className="text-sm text-gray-600 mb-4">
            Every decision needs someone accountable
          </p>
          {health.decisions_without_owners > 0 && (
            <Link to="/decisions?filter=no_owner" className="text-sm text-gray-900 hover:underline font-medium">
              View decisions →
            </Link>
          )}
        </div>

        <div className="border border-gray-200 p-6">
          <div className="text-4xl font-bold text-amber-600 mb-2">
            {health.old_unresolved}
          </div>
          <div className="text-sm text-gray-900 font-medium mb-3">Old unresolved questions</div>
          <p className="text-sm text-gray-600 mb-4">
            Questions older than 30 days without answers
          </p>
          {health.old_unresolved > 0 && (
            <Link to="/conversations?type=question&status=unanswered" className="text-sm text-gray-900 hover:underline font-medium">
              View questions →
            </Link>
          )}
        </div>

        <div className="border border-gray-200 p-6">
          <div className="text-4xl font-bold text-blue-600 mb-2">
            {health.repeated_topics}
          </div>
          <div className="text-sm text-gray-900 font-medium mb-3">Repeated topics</div>
          <p className="text-sm text-gray-600 mb-4">
            Same conversations happening multiple times
          </p>
          {health.repeated_topics > 0 && (
            <Link to="/insights/repeated" className="text-sm text-gray-900 hover:underline font-medium">
              View topics →
            </Link>
          )}
        </div>

        <div className="border border-gray-200 p-6">
          <div className="text-4xl font-bold text-gray-600 mb-2">
            {health.orphaned_conversations}
          </div>
          <div className="text-sm text-gray-900 font-medium mb-3">Orphaned conversations</div>
          <p className="text-sm text-gray-600 mb-4">
            Conversations with no replies or follow-up
          </p>
          {health.orphaned_conversations > 0 && (
            <Link to="/conversations?filter=orphaned" className="text-sm text-gray-900 hover:underline font-medium">
              View conversations →
            </Link>
          )}
        </div>
      </div>

      {/* Quality Metrics */}
      <div className="border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-6">Documentation Quality</h2>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-900">Decisions with context</span>
              <span className="text-sm font-bold text-gray-900">
                {health.decisions_with_context}%
              </span>
            </div>
            <div className="w-full bg-gray-200 h-2">
              <div
                className="bg-gray-900 h-2 transition-all"
                style={{ width: `${health.decisions_with_context}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-900">Decisions with alternatives</span>
              <span className="text-sm font-bold text-gray-900">
                {health.decisions_with_alternatives}%
              </span>
            </div>
            <div className="w-full bg-gray-200 h-2">
              <div
                className="bg-gray-900 h-2 transition-all"
                style={{ width: `${health.decisions_with_alternatives}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-900">Decisions with tradeoffs</span>
              <span className="text-sm font-bold text-gray-900">
                {health.decisions_with_tradeoffs}%
              </span>
            </div>
            <div className="w-full bg-gray-200 h-2">
              <div
                className="bg-gray-900 h-2 transition-all"
                style={{ width: `${health.decisions_with_tradeoffs}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-900">Decisions reviewed</span>
              <span className="text-sm font-bold text-gray-900">
                {health.decisions_reviewed}%
              </span>
            </div>
            <div className="w-full bg-gray-200 h-2">
              <div
                className="bg-gray-900 h-2 transition-all"
                style={{ width: `${health.decisions_reviewed}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {health.recommendations && health.recommendations.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 p-6">
          <h3 className="text-lg font-bold text-blue-900 mb-4">Recommendations</h3>
          <ul className="space-y-2">
            {health.recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span className="text-blue-600 font-bold">•</span>
                <span className="text-sm text-blue-900">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default KnowledgeHealthDashboard;
