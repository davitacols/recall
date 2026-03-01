import React, { useMemo, useState } from 'react';
import api from '../services/api';
import { useTheme } from '../utils/ThemeAndAccessibility';

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

export default function AskRecall() {
  const { darkMode } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);

  const theme = useMemo(
    () =>
      darkMode
        ? {
            bg: '#0d1217',
            panel: '#151d25',
            panelAlt: '#1b2631',
            border: 'rgba(145, 181, 214, 0.24)',
            text: '#e8f0f8',
            muted: '#9ab0c7',
            accent: '#58b5ff',
            accentSoft: 'rgba(88, 181, 255, 0.2)',
            success: '#34d399',
            warning: '#f59e0b',
            danger: '#fb7185',
          }
        : {
            bg: '#f4f8fc',
            panel: '#ffffff',
            panelAlt: '#f8fbff',
            border: '#d5e4f1',
            text: '#102233',
            muted: '#567089',
            accent: '#0a84d8',
            accentSoft: 'rgba(10, 132, 216, 0.12)',
            success: '#1d9a66',
            warning: '#b7791f',
            danger: '#dc4c64',
          },
    [darkMode]
  );

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
      learningModel: payload.learning_model || {},
      counts: payload.counts || {},
      linkedDecisions,
      nextActions,
      sources: normalizeSources(payload.sources),
      execution: payload.execution || { performed: false, result: null },
    };
  };

  const mapLegacyResponseToViewModel = (searchPayload, recommendationsPayload, missionPayload, q) => {
    const conversations = searchPayload?.results?.conversations || [];
    const decisions = searchPayload?.results?.decisions || [];
    const total = Number(searchPayload?.results?.total || 0);
    const recCount = (recommendationsPayload?.recommendations || []).length;
    const interventions =
      (missionPayload?.autonomous_actions || []).map((item, idx) => ({
        id: item.id || `legacy-${idx}`,
        title: item.title || 'Review intervention',
        impact: item.impact_estimate || 'medium',
        confidence: item.confidence || 60,
        reason: item.suggested_path || 'Suggested by mission control',
        href: item.url || '/dashboard',
      })) || [];

    return {
      question: q,
      answer:
        total > 0
          ? `I found ${total} related records, ${recCount} recommendation signals, and generated ${interventions.length} suggested interventions.`
          : 'No direct evidence found for this query in current indexed records.',
      confidence: total > 0 ? Math.min(90, 62 + recCount * 4) : 28,
      riskStatus: missionPayload?.north_star?.status || 'watch',
      readinessScore: missionPayload?.north_star?.critical_path_score ?? null,
      learningModel: {},
      counts: {
        unresolved_decisions: decisions.length,
        active_blockers: 0,
        high_priority_unassigned_tasks: 0,
      },
      linkedDecisions: decisions.slice(0, 3).map((item) => ({
        id: item.id,
        title: item.title || `Decision #${item.id}`,
        date: toDisplayDate(item.created_at),
      })),
      nextActions: interventions.slice(0, 3),
      sources: normalizeSources({ conversations, decisions }),
      execution: { performed: false, result: null },
    };
  };

  const queryCopilot = async ({ execute = false } = {}) => {
    try {
      const response = await api.post('/api/knowledge/ai/copilot/', {
        query,
        execute,
        max_actions: 3,
      });
      return mapResponseToViewModel(response.data);
    } catch (error) {
      const status = error?.response?.status;
      if (status === 404 || status === 405 || status === 500) {
        const [searchRes, recsRes, missionRes] = await Promise.allSettled([
          api.post('/api/knowledge/search/', { query }),
          api.get('/api/knowledge/ai/recommendations/'),
          api.get('/api/knowledge/ai/mission-control/'),
        ]);

        const searchData =
          searchRes.status === 'fulfilled'
            ? searchRes.value.data
            : { results: { conversations: [], decisions: [], total: 0 } };
        const recsData = recsRes.status === 'fulfilled' ? recsRes.value.data : { recommendations: [] };
        const missionData = missionRes.status === 'fulfilled' ? missionRes.value.data : {};
        return mapLegacyResponseToViewModel(searchData, recsData, missionData, query);
      }
      throw error;
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await queryCopilot({ execute: false });
      setResults(data);
    } catch (error) {
      const detail =
        error?.response?.data?.detail ||
        error?.response?.data?.error ||
        'AGI copilot is temporarily unavailable. Please try again.';
      setResults({
        question: query,
        answer: detail,
        confidence: 0,
        riskStatus: 'unknown',
        readinessScore: null,
        learningModel: {},
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
    } finally {
      setExecuting(false);
    }
  };

  const confidenceWidth = `${Math.max(0, Math.min(100, Number(results?.confidence || 0)))}%`;

  return (
    <div
      style={{
        maxWidth: 1040,
        margin: '0 auto',
        padding: '28px 18px 48px',
        color: theme.text,
      }}
    >
      <section
        style={{
          border: `1px solid ${theme.border}`,
          borderRadius: 20,
          padding: 24,
          background: darkMode
            ? 'linear-gradient(145deg, rgba(24,39,54,0.96), rgba(17,27,35,0.96))'
            : 'linear-gradient(145deg, rgba(255,255,255,0.98), rgba(241,248,255,0.98))',
          boxShadow: darkMode ? '0 16px 48px rgba(3,9,14,0.34)' : '0 14px 36px rgba(12,67,112,0.09)',
          marginBottom: 22,
        }}
      >
        <p style={{ fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: theme.muted, margin: 0 }}>
          Organizational Copilot
        </p>
        <h1 style={{ margin: '8px 0 8px', fontSize: 'clamp(1.6rem, 3vw, 2.35rem)' }}>Ask Recall</h1>
        <p style={{ margin: 0, color: theme.muted }}>
          Diagnose risk, recommend interventions, and run safe autonomous fixes.
        </p>
      </section>

      <form onSubmit={handleSearch} style={{ marginBottom: 16 }}>
        <div
          style={{
            border: `1px solid ${theme.border}`,
            borderRadius: 16,
            background: theme.panel,
            padding: 14,
          }}
        >
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Describe the organizational problem to solve..."
            rows={3}
            style={{
              width: '100%',
              resize: 'vertical',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: theme.text,
              fontSize: 16,
              lineHeight: 1.5,
              minHeight: 84,
            }}
          />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              style={{
                border: 'none',
                borderRadius: 12,
                padding: '10px 14px',
                background: theme.accent,
                color: '#fff',
                fontWeight: 700,
                cursor: loading || !query.trim() ? 'not-allowed' : 'pointer',
                opacity: loading || !query.trim() ? 0.6 : 1,
              }}
            >
              {loading ? 'Analyzing...' : 'Analyze & Plan'}
            </button>
            <button
              type="button"
              onClick={handleExecute}
              disabled={executing || !results || results.nextActions.length === 0}
              style={{
                borderRadius: 12,
                padding: '10px 14px',
                border: `1px solid ${theme.border}`,
                background: theme.panelAlt,
                color: theme.text,
                fontWeight: 700,
                cursor: executing || !results || results.nextActions.length === 0 ? 'not-allowed' : 'pointer',
                opacity: executing || !results || results.nextActions.length === 0 ? 0.6 : 1,
              }}
            >
              {executing ? 'Executing...' : 'Run Autonomous Fixes'}
            </button>
          </div>
        </div>
      </form>

      {!results && !loading && (
        <section
          style={{
            border: `1px solid ${theme.border}`,
            borderRadius: 16,
            background: theme.panel,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <p style={{ marginTop: 0, marginBottom: 10, fontWeight: 700 }}>Suggested Prompts</p>
          <div style={{ display: 'grid', gap: 8 }}>
            {suggestedQuestions.map((item) => (
              <button
                key={item}
                onClick={() => setQuery(item)}
                style={{
                  textAlign: 'left',
                  border: `1px solid ${theme.border}`,
                  borderRadius: 10,
                  background: theme.panelAlt,
                  color: theme.text,
                  padding: '10px 12px',
                  cursor: 'pointer',
                }}
              >
                {item}
              </button>
            ))}
          </div>
        </section>
      )}

      {loading && (
        <section style={{ padding: 24, textAlign: 'center', color: theme.muted }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              border: `2px solid ${theme.border}`,
              borderTopColor: theme.accent,
              margin: '0 auto 12px',
              animation: 'spin 1s linear infinite',
            }}
          />
          <p style={{ margin: 0 }}>Analyzing organization state...</p>
        </section>
      )}

      {results && !loading && (
        <div style={{ display: 'grid', gap: 14 }}>
          <section style={{ border: `1px solid ${theme.border}`, borderRadius: 16, background: theme.panel, padding: 18 }}>
            <h2 style={{ marginTop: 0 }}>AGI Diagnosis</h2>
            <p style={{ color: theme.muted }}>{results.answer}</p>
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: theme.muted }}>Confidence</span>
                <strong>{results.confidence}%</strong>
              </div>
              <div style={{ background: theme.panelAlt, borderRadius: 999, height: 10, overflow: 'hidden' }}>
                <div
                  style={{
                    width: confidenceWidth,
                    height: '100%',
                    background: `linear-gradient(90deg, ${theme.accent}, ${theme.success})`,
                  }}
                />
              </div>
            </div>
          </section>

          <section style={{ border: `1px solid ${theme.border}`, borderRadius: 16, background: theme.panel, padding: 18 }}>
            <h3 style={{ marginTop: 0 }}>Operational Risk</h3>
            <p style={{ margin: '4px 0', color: theme.muted }}>
              Status:{' '}
              <strong style={{ color: results.riskStatus === 'critical' ? theme.danger : results.riskStatus === 'watch' ? theme.warning : theme.success }}>
                {results.riskStatus}
              </strong>
            </p>
            {results.readinessScore !== null && (
              <p style={{ margin: '4px 0', color: theme.muted }}>
                Readiness Score: <strong style={{ color: theme.text }}>{results.readinessScore}</strong>
              </p>
            )}
            <p style={{ margin: '4px 0', color: theme.muted }}>
              Unresolved decisions: {results.counts.unresolved_decisions || 0} | Active blockers: {results.counts.active_blockers || 0} | Unassigned high-priority tasks:{' '}
              {results.counts.high_priority_unassigned_tasks || 0}
            </p>
          </section>

          {results.execution?.performed && results.execution?.result && (
            <section style={{ border: `1px solid ${theme.border}`, borderRadius: 16, background: theme.panel, padding: 18 }}>
              <h3 style={{ marginTop: 0 }}>Execution Result</h3>
              <p style={{ margin: 0, color: theme.muted }}>
                Executed: {results.execution.result.executed_count} | Skipped: {results.execution.result.skipped_count}
              </p>
            </section>
          )}

          {!!results.learningModel && Object.keys(results.learningModel).length > 0 && (
            <section style={{ border: `1px solid ${theme.border}`, borderRadius: 16, background: theme.panel, padding: 18 }}>
              <h3 style={{ marginTop: 0 }}>Learning Model Signals</h3>
              <p style={{ margin: '0 0 8px', color: theme.muted }}>
                Horizon: {results.learningModel.horizon_days || 0} days
              </p>
              <p style={{ margin: '0 0 8px', color: theme.muted }}>
                Scope: {results.learningModel.scope || 'org_plus_user'}
              </p>
              <p style={{ margin: '0 0 8px', color: theme.muted }}>
                Bias (decision/blocker/task): {(results.learningModel.action_bias?.decision_resolution ?? 1).toFixed(2)} /{' '}
                {(results.learningModel.action_bias?.blocker_escalation ?? 1).toFixed(2)} /{' '}
                {(results.learningModel.action_bias?.task_ownership ?? 1).toFixed(2)}
              </p>
              {Array.isArray(results.learningModel.top_keywords) && results.learningModel.top_keywords.length > 0 && (
                <p style={{ margin: 0, color: theme.muted }}>
                  Top keywords: {results.learningModel.top_keywords.slice(0, 4).map((k) => k.keyword).join(', ')}
                </p>
              )}
              {Array.isArray(results.learningModel.focus_keywords) && results.learningModel.focus_keywords.length > 0 && (
                <p style={{ margin: '8px 0 0', color: theme.muted }}>
                  User focus: {results.learningModel.focus_keywords.slice(0, 4).map((k) => k.keyword).join(', ')}
                </p>
              )}
            </section>
          )}

          {results.linkedDecisions.length > 0 && (
            <section style={{ border: `1px solid ${theme.border}`, borderRadius: 16, background: theme.panel, padding: 18 }}>
              <h3 style={{ marginTop: 0 }}>Related Decisions</h3>
              <div style={{ display: 'grid', gap: 10 }}>
                {results.linkedDecisions.map((decision) => (
                  <a
                    key={decision.id}
                    href={`/decisions/${decision.id}`}
                    style={{
                      border: `1px solid ${theme.border}`,
                      borderRadius: 12,
                      padding: 12,
                      background: theme.panelAlt,
                      textDecoration: 'none',
                      color: theme.text,
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 8,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span>{decision.title}</span>
                    <span style={{ color: theme.muted, fontSize: 12 }}>{decision.date}</span>
                  </a>
                ))}
              </div>
            </section>
          )}

          {results.nextActions.length > 0 && (
            <section style={{ border: `1px solid ${theme.border}`, borderRadius: 16, background: theme.panel, padding: 18 }}>
              <h3 style={{ marginTop: 0 }}>Planned Interventions</h3>
              <div style={{ display: 'grid', gap: 10 }}>
                {results.nextActions.map((action) => (
                  <a
                    key={action.id}
                    href={action.href || '#'}
                    style={{
                      border: `1px solid ${theme.border}`,
                      borderRadius: 12,
                      padding: 12,
                      background: theme.panelAlt,
                      textDecoration: 'none',
                      color: theme.text,
                    }}
                  >
                    <p style={{ margin: '0 0 4px', fontWeight: 700 }}>{action.title}</p>
                    <p style={{ margin: '0 0 4px', color: theme.muted }}>{action.reason}</p>
                    <p style={{ margin: 0, color: theme.muted, fontSize: 12 }}>
                      Impact: {action.impact} | Confidence: {action.confidence}%
                    </p>
                  </a>
                ))}
              </div>
            </section>
          )}

          {results.sources.length > 0 && (
            <section style={{ border: `1px solid ${theme.border}`, borderRadius: 16, background: theme.panel, padding: 18 }}>
              <h3 style={{ marginTop: 0 }}>Evidence Sources</h3>
              <div style={{ display: 'grid', gap: 10 }}>
                {results.sources.map((source) => (
                  <a
                    key={`${source.type}-${source.id}`}
                    href={source.href}
                    style={{
                      border: `1px solid ${theme.border}`,
                      borderRadius: 12,
                      padding: 12,
                      background: theme.panelAlt,
                      textDecoration: 'none',
                      color: theme.text,
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 8,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span>{source.title}</span>
                    <span style={{ color: theme.muted, fontSize: 12 }}>
                      {source.type} | {source.date}
                    </span>
                  </a>
                ))}
              </div>
            </section>
          )}

          <button
            onClick={() => {
              setQuery('');
              setResults(null);
            }}
            style={{
              borderRadius: 12,
              border: `1px solid ${theme.border}`,
              background: theme.panelAlt,
              color: theme.text,
              padding: '10px 12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            New Analysis
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }
      `}</style>
    </div>
  );
}
