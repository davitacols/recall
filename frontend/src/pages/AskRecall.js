import React, { useState } from 'react';
import api from '../services/api';

function toDisplayDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function normalizeSources(sources) {
  const conversations = sources?.conversations || [];
  const decisions = sources?.decisions || [];
  return [
    ...conversations.map((item) => ({
      id: item.id,
      type: 'conversation',
      title: item.title || `Conversation #${item.id}`,
      date: toDisplayDate(item.created_at),
      href: `/conversations/${item.id}`,
    })),
    ...decisions.map((item) => ({
      id: item.id,
      type: 'decision',
      title: item.title || `Decision #${item.id}`,
      date: toDisplayDate(item.created_at),
      href: `/decisions/${item.id}`,
    })),
  ].slice(0, 8);
}

function AskRecall() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);

  const suggestedQuestions = [
    'Where is execution risk highest this week?',
    'What decisions are blocking delivery?',
    'Which high-priority tasks should we reassign now?',
    'What should leadership resolve in the next 24 hours?',
  ];

  const mapResponseToViewModel = (payload) => {
    const decisions = payload?.sources?.decisions || [];
    const linkedDecisions = decisions.slice(0, 3).map((item) => ({
      id: item.id,
      title: item.title || `Decision #${item.id}`,
      date: toDisplayDate(item.created_at),
    }));

    const nextActions = (payload?.recommended_interventions || []).map((item) => ({
      id: item.id,
      title: item.title,
      impact: item.impact,
      confidence: item.confidence,
      reason: item.reason,
      href: item.url,
    }));

    return {
      question: payload.query,
      answer: payload.answer,
      confidence: payload.confidence || 0,
      riskStatus: payload.risk_status || 'unknown',
      readinessScore: payload.readiness_score,
      counts: payload.counts || {},
      linkedDecisions,
      nextActions,
      sources: normalizeSources(payload.sources),
      execution: payload.execution || { performed: false, result: null },
    };
  };

  const queryCopilot = async ({ execute = false } = {}) => {
    const response = await api.post('/api/knowledge/ai/copilot/', {
      query,
      execute,
      max_actions: 3,
    });
    return mapResponseToViewModel(response.data);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const data = await queryCopilot({ execute: false });
      setResults(data);
    } catch (error) {
      console.error('Copilot query failed:', error);
      setResults({
        question: query,
        answer: 'AGI copilot is temporarily unavailable. Please try again.',
        confidence: 0,
        riskStatus: 'unknown',
        readinessScore: null,
        counts: {},
        linkedDecisions: [],
        nextActions: [],
        sources: [],
        execution: { performed: false, result: null },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!query.trim()) return;
    setExecuting(true);
    try {
      const data = await queryCopilot({ execute: true });
      setResults(data);
    } catch (error) {
      console.error('Copilot execution failed:', error);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-12">
        <h1 className="text-5xl font-bold text-gray-900 mb-3">Ask Knoledgr AGI</h1>
        <p className="text-xl text-gray-600">
          Diagnose risk, recommend interventions, and execute safe organizational fixes.
        </p>
      </div>

      <form onSubmit={handleSearch} className="mb-12">
        <div className="border border-gray-300 focus-within:border-gray-900 transition-colors">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Describe the organizational problem to solve..."
            className="w-full px-6 py-5 text-lg focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="mt-4 recall-btn-primary disabled:opacity-50"
        >
          {loading ? 'Analyzing...' : 'Analyze & Plan'}
        </button>
      </form>

      {!results && !loading && (
        <div className="mb-12">
          <p className="text-base font-bold text-gray-900 mb-4">Suggested prompts:</p>
          <div className="space-y-2">
            {suggestedQuestions.map((item, idx) => (
              <button
                key={idx}
                onClick={() => setQuery(item)}
                className="w-full text-left px-5 py-3 border border-gray-200 text-gray-700 hover:border-gray-900 transition-all text-base"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="py-20">
          <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-center text-base text-gray-600">Analyzing organization state...</p>
        </div>
      )}

      {results && !loading && (
        <div className="space-y-8">
          <div className="bg-gray-50 border border-gray-200 p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">AGI Diagnosis</h2>
            <p className="text-base text-gray-700 leading-relaxed mb-6">{results.answer}</p>
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Confidence</span>
                <span className="text-sm font-bold text-gray-900">{results.confidence}%</span>
              </div>
              <div className="w-full bg-gray-200 h-2">
                <div className="bg-gray-900 h-2" style={{ width: `${results.confidence}%` }}></div>
              </div>
            </div>
            <button
              onClick={handleExecute}
              disabled={executing || results.nextActions.length === 0}
              className="recall-btn-primary disabled:opacity-50"
            >
              {executing ? 'Executing...' : 'Run Autonomous Fixes'}
            </button>
          </div>

          <div className="bg-white border border-gray-200 p-5">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Operational Risk</h2>
            <p className="text-base text-gray-700 mb-2">
              Status: <span className="font-semibold capitalize">{results.riskStatus}</span>
            </p>
            {results.readinessScore !== null && (
              <p className="text-base text-gray-700 mb-2">
                Readiness Score: <span className="font-semibold">{results.readinessScore}</span>
              </p>
            )}
            <p className="text-sm text-gray-600">
              Unresolved decisions: {results.counts.unresolved_decisions || 0} | Active blockers:{' '}
              {results.counts.active_blockers || 0} | Unassigned high-priority tasks:{' '}
              {results.counts.high_priority_unassigned_tasks || 0}
            </p>
          </div>

          {results.execution?.performed && results.execution?.result && (
            <div className="bg-white border border-gray-200 p-5">
              <h2 className="text-lg font-bold text-gray-900 mb-3">Execution Result</h2>
              <p className="text-base text-gray-700">
                Executed: {results.execution.result.executed_count} | Skipped:{' '}
                {results.execution.result.skipped_count}
              </p>
            </div>
          )}

          {results.linkedDecisions.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">Related Decisions</h2>
              <div className="space-y-2">
                {results.linkedDecisions.map((decision) => (
                  <a
                    key={decision.id}
                    href={`/decisions/${decision.id}`}
                    className="block border border-gray-200 p-4 hover:border-gray-900 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base font-medium text-gray-900">{decision.title}</span>
                      <span className="text-sm text-gray-500">{decision.date}</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {results.nextActions.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">Planned Interventions</h2>
              <div className="space-y-2">
                {results.nextActions.map((action) => (
                  <a
                    key={action.id}
                    href={action.href || '#'}
                    className="block border border-gray-200 p-4 hover:border-gray-900 transition-all"
                  >
                    <p className="text-base font-medium text-gray-900">{action.title}</p>
                    <p className="text-sm text-gray-600 mt-1">{action.reason}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Impact: {action.impact} | Confidence: {action.confidence}%
                    </p>
                  </a>
                ))}
              </div>
            </div>
          )}

          {results.sources.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">Evidence Sources</h2>
              <div className="space-y-2">
                {results.sources.map((source) => (
                  <a
                    key={`${source.type}-${source.id}`}
                    href={source.href}
                    className="block border border-gray-200 p-4 hover:border-gray-900 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-base font-medium text-gray-900">{source.title}</span>
                        <span className="ml-3 text-xs px-2 py-1 bg-gray-100 text-gray-700 font-medium">
                          {source.type}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">{source.date}</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4">
            <button
              onClick={() => {
                setQuery('');
                setResults(null);
              }}
              className="recall-btn-secondary"
            >
              New Analysis
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AskRecall;
