import React, { useEffect, useMemo, useState } from 'react';
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

function getConfidenceLabel(value) {
  const score = Number(value || 0);
  if (score >= 75) return 'High';
  if (score >= 50) return 'Medium';
  return 'Low';
}

function titleCase(value) {
  const text = String(value || '').toLowerCase();
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function AskRecall() {
  const { darkMode } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [requestState, setRequestState] = useState('idle');
  const [requestMessage, setRequestMessage] = useState('');
  const [openEvidenceByActionId, setOpenEvidenceByActionId] = useState({});
  const [feedbackVote, setFeedbackVote] = useState('');
  const [feedbackOutcome, setFeedbackOutcome] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackSummary, setFeedbackSummary] = useState(null);
  const [feedbackTrend, setFeedbackTrend] = useState([]);
  const [whatIfAction, setWhatIfAction] = useState('resolve_decisions');
  const [whatIfUnits, setWhatIfUnits] = useState(1);
  const [whatIfHorizon, setWhatIfHorizon] = useState(14);
  const [whatIfLoading, setWhatIfLoading] = useState(false);
  const [whatIfResult, setWhatIfResult] = useState(null);
  const [whatIfError, setWhatIfError] = useState('');

  const theme = useMemo(
    () =>
      darkMode
        ? {
            bg: '#0f0b0d',
            panel: 'var(--app-surface)',
            panelAlt: 'var(--app-surface-alt)',
            border: 'var(--app-border)',
            text: 'var(--app-text)',
            muted: 'var(--app-muted)',
            accent: 'var(--app-accent)',
            accentSoft: 'rgba(255,180,118,0.2)',
            success: 'var(--app-success)',
            warning: 'var(--app-warning)',
            danger: 'var(--app-danger)',
          }
        : {
            bg: 'var(--app-bg)',
            panel: 'var(--app-surface)',
            panelAlt: 'var(--app-surface-alt)',
            border: 'var(--app-border)',
            text: 'var(--app-text)',
            muted: 'var(--app-muted)',
            accent: 'var(--app-accent)',
            accentSoft: 'rgba(217,105,46,0.12)',
            success: 'var(--app-success)',
            warning: 'var(--app-warning)',
            danger: 'var(--app-danger)',
          },
    [darkMode]
  );

  const suggestedQuestions = [
    'Where is execution risk highest this week?',
    'What decisions are blocking delivery?',
    'Which high-priority tasks should we reassign now?',
    'What should leadership resolve in the next 24 hours?',
  ];

  const capabilityList = [
    'Answer organizational questions using your conversations and decisions.',
    'Show confidence, risk status, and readiness signals.',
    'Suggest next actions and link to relevant records.',
    'Provide quick navigation links when your intent is tool-finding.',
    'Optionally run autonomous fixes when safe actions are available.',
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
      expectedRiskReduction: item.expected_risk_reduction,
      effortHours: item.effort_hours,
      priorityScore: item.priority_score,
      reason: item.reason,
      href: item.url,
      evidence: (item.evidence_links || []).map((source) => ({
        id: source.id,
        type: source.type,
        title: source.title,
        date: toDisplayDate(source.created_at),
        href: source.url,
      })),
    }));

    return {
      question: payload.query,
      analysisId: payload.analysis_id || '',
      answer: payload.answer,
      confidence: payload.confidence || 0,
      confidenceBand: payload.confidence_band || getConfidenceLabel(payload.confidence || 0).toLowerCase(),
      responseMode: payload.response_mode || 'diagnosis',
      evidenceCount: payload.evidence_count ?? 0,
      sourceTypes: payload.source_types || [],
      freshnessDays: payload.freshness_days ?? null,
      coverageScore: payload.coverage_score ?? 0,
      missingEvidence: payload.missing_evidence || [],
      toolLinks: (payload.tool_links || []).map((item) => ({
        id: item.id,
        label: item.label,
        href: item.url,
        reason: item.reason,
      })),
      riskStatus: payload.risk_status || 'unknown',
      readinessScore: payload.readiness_score,
      learningModel: payload.learning_model || {},
      counts: payload.counts || {},
      linkedDecisions,
      nextActions,
      sources: normalizeSources(payload.sources),
      execution: payload.execution || { performed: false, result: null },
      generatedAt: payload.generated_at || '',
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
        expectedRiskReduction: null,
        effortHours: item.time_to_value_hours || null,
        priorityScore: null,
        reason: item.suggested_path || 'Suggested by mission control',
        href: item.url || '/dashboard',
      })) || [];

    return {
      question: q,
      analysisId: '',
      answer:
        total > 0
          ? `I found ${total} related records, ${recCount} recommendation signals, and generated ${interventions.length} suggested interventions.`
          : 'No direct evidence found for this query in current indexed records.',
      confidence: total > 0 ? Math.min(90, 62 + recCount * 4) : 28,
      confidenceBand: getConfidenceLabel(total > 0 ? Math.min(90, 62 + recCount * 4) : 28).toLowerCase(),
      responseMode: total > 0 ? 'diagnosis' : 'needs_evidence',
      evidenceCount: total,
      sourceTypes: [
        ...(conversations.length > 0 ? ['conversation'] : []),
        ...(decisions.length > 0 ? ['decision'] : []),
      ],
      freshnessDays: null,
      coverageScore: total > 0 ? Math.min(85, 35 + total * 10) : 0,
      missingEvidence: total > 0 ? [] : ['No linked conversations or decisions matched this query.'],
      toolLinks: [],
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
      generatedAt: '',
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
    if (!query.trim() || loading || executing) return;
    setLoading(true);
    setRequestState('loading');
    setRequestMessage('Analyzing organization state...');
    setOpenEvidenceByActionId({});
    try {
      const data = await queryCopilot({ execute: false });
      setResults(data);
      setFeedbackVote('');
      setFeedbackOutcome('');
      setFeedbackMessage('');
      setRequestState('success');
      setRequestMessage('Analysis complete.');
    } catch (error) {
      const detail =
        error?.response?.data?.detail ||
        error?.response?.data?.error ||
        'AGI copilot is temporarily unavailable. Please try again.';
      setResults({
        question: query,
        answer: detail,
        confidence: 0,
        confidenceBand: 'low',
        responseMode: 'needs_evidence',
        evidenceCount: 0,
        sourceTypes: [],
        freshnessDays: null,
        coverageScore: 0,
        missingEvidence: ['Unable to evaluate evidence right now.'],
        riskStatus: 'unknown',
        readinessScore: null,
        learningModel: {},
        counts: {},
        linkedDecisions: [],
        nextActions: [],
        sources: [],
        execution: { performed: false, result: null },
      });
      setRequestState('error');
      setRequestMessage(detail);
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!query.trim() || loading || executing) return;
    setExecuting(true);
    setRequestState('loading');
    setRequestMessage('Executing approved interventions...');
    setOpenEvidenceByActionId({});
    try {
      const data = await queryCopilot({ execute: true });
      setResults(data);
      setFeedbackVote('');
      setFeedbackOutcome('');
      setFeedbackMessage('');
      setRequestState('success');
      setRequestMessage('Execution completed.');
    } catch (error) {
      const detail =
        error?.response?.data?.detail ||
        error?.response?.data?.error ||
        'Unable to execute interventions right now.';
      setRequestState('error');
      setRequestMessage(detail);
    } finally {
      setExecuting(false);
    }
  };

  const normalizedQuery = query.trim().toLowerCase();
  const normalizedResultQuery = String(results?.question || '').trim().toLowerCase();
  const hasCurrentResults = !!results && normalizedQuery.length > 0 && normalizedQuery === normalizedResultQuery;
  const confidenceWidth = `${Math.max(0, Math.min(100, Number(results?.confidence || 0)))}%`;
  const confidenceLabel = titleCase(results?.confidenceBand || getConfidenceLabel(results?.confidence));
  const queryLower = query.toLowerCase();
  const isNavigationIntent =
    results?.responseMode === 'navigation' ||
    queryLower.includes('where') ||
    queryLower.includes('find') ||
    queryLower.includes('tool') ||
    queryLower.includes('navigate') ||
    queryLower.includes('agile') ||
    queryLower.includes('sprint') ||
    queryLower.includes('task');
  const lowEvidence =
    !!results &&
    results.responseMode !== 'navigation' &&
    (
      results.responseMode === 'needs_evidence' ||
      Number(results.coverageScore || 0) < 45 ||
      Number(results.evidenceCount || 0) === 0
    );
  const canRunAutonomousFixes =
    hasCurrentResults && results.nextActions.length > 0 && !lowEvidence && !isNavigationIntent;
  const canSubmit = !!query.trim() && !loading && !executing;
  const statusTone =
    requestState === 'error'
      ? theme.danger
      : requestState === 'success'
      ? theme.success
      : theme.muted;

  const quickToolLinks = (results?.toolLinks?.length ? results.toolLinks : [
    { label: 'Sprint Board', href: '/sprint' },
    { label: 'Projects', href: '/projects' },
    { label: 'Task Board', href: '/business/tasks' },
    { label: 'Decisions', href: '/decisions' },
  ]);

  const submitFeedback = async () => {
    if (!results || !feedbackVote || feedbackSubmitting) return;
    setFeedbackSubmitting(true);
    setFeedbackMessage('');
    try {
      await api.post('/api/knowledge/ai/copilot/feedback/', {
        analysis_id: results.analysisId || undefined,
        query: results.question,
        feedback: feedbackVote,
        outcome: feedbackOutcome || undefined,
        response_mode: results.responseMode,
        confidence_band: results.confidenceBand,
        evidence_count: results.evidenceCount,
        coverage_score: results.coverageScore,
        has_actions: (results.nextActions || []).length > 0,
      });
      setFeedbackMessage('Thanks. Feedback recorded.');
      loadFeedbackSummary();
    } catch (error) {
      const detail =
        error?.response?.data?.detail ||
        error?.response?.data?.error ||
        'Unable to record feedback right now.';
      setFeedbackMessage(detail);
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const runWhatIf = async () => {
    if (whatIfLoading) return;
    setWhatIfLoading(true);
    setWhatIfError('');
    try {
      const response = await api.post('/api/knowledge/ai/copilot/what-if/', {
        action_type: whatIfAction,
        units: Number(whatIfUnits || 1),
        horizon_days: Number(whatIfHorizon || 14),
      });
      setWhatIfResult(response.data || null);
    } catch (error) {
      const detail =
        error?.response?.data?.detail ||
        error?.response?.data?.error ||
        'Unable to run simulation right now.';
      setWhatIfError(detail);
      setWhatIfResult(null);
    } finally {
      setWhatIfLoading(false);
    }
  };

  const loadFeedbackSummary = async () => {
    try {
      const [summaryRes, trendRes] = await Promise.all([
        api.get('/api/knowledge/ai/copilot/feedback-summary/'),
        api.get('/api/knowledge/ai/copilot/feedback-trend/?days=7'),
      ]);
      setFeedbackSummary(summaryRes.data || null);
      setFeedbackTrend((trendRes.data?.points || []).slice(-7));
    } catch (error) {
      // Summary is non-critical for Ask Recall flow.
    }
  };

  useEffect(() => {
    loadFeedbackSummary();
  }, []);

  return (
    <div
      style={{
        maxWidth: 1040,
        margin: '0 auto',
        padding: '28px 18px 48px',
        color: theme.text,
        background: theme.bg,
        borderRadius: 18,
      }}
    >
      <section
        style={{
          border: `1px solid ${theme.border}`,
          borderRadius: 20,
          padding: 24,
          background: darkMode
            ? 'linear-gradient(135deg, var(--app-info-soft) 0%, rgba(249,115,22,0.15) 52%, rgba(34,197,94,0.12) 100%)'
            : 'linear-gradient(135deg, rgba(191,219,254,0.52) 0%, rgba(255,220,182,0.58) 52%, rgba(187,247,208,0.44) 100%)',
          boxShadow: darkMode ? '0 16px 44px rgba(8,6,7,0.38)' : '0 14px 30px rgba(110,84,58,0.12)',
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

      <section
        style={{
          border: `1px solid ${theme.border}`,
          borderRadius: 16,
          background: theme.panel,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>How Ask Recall Works</h2>
        <div style={{ display: 'grid', gap: 8 }}>
          {capabilityList.map((item) => (
            <p key={item} style={{ margin: 0, color: theme.muted, fontSize: 14 }}>
              - {item}
            </p>
          ))}
        </div>
        <p style={{ margin: '10px 0 0', color: theme.muted, fontSize: 12 }}>
          Confidence guide: <strong style={{ color: theme.text }}>75%+ High</strong>,{' '}
          <strong style={{ color: theme.text }}>50-74% Medium</strong>,{' '}
          <strong style={{ color: theme.text }}>below 50% Low</strong>.
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
            onChange={(e) => {
              setQuery(e.target.value);
              if (!loading && !executing) {
                setRequestState('idle');
                setRequestMessage('');
              }
            }}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                if (canSubmit) {
                  e.currentTarget.form?.requestSubmit();
                }
              }
            }}
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
              disabled={!canSubmit}
              style={{
                border: 'none',
                borderRadius: 0,
                padding: '10px 14px',
                background: theme.accent,
                color: 'var(--app-surface-alt)',
                fontWeight: 700,
                cursor: !canSubmit ? 'not-allowed' : 'pointer',
                opacity: !canSubmit ? 0.6 : 1,
              }}
            >
              {loading ? 'Thinking...' : 'Ask Recall'}
            </button>
            <button
              type="button"
              onClick={handleExecute}
              disabled={executing || loading || !canRunAutonomousFixes}
              style={{
                borderRadius: 0,
                padding: '10px 14px',
                border: `1px solid ${theme.border}`,
                background: theme.panelAlt,
                color: theme.text,
                fontWeight: 700,
                cursor: executing || loading || !canRunAutonomousFixes ? 'not-allowed' : 'pointer',
                opacity: executing || loading || !canRunAutonomousFixes ? 0.6 : 1,
              }}
            >
              {executing ? 'Executing...' : 'Run Autonomous Fixes'}
            </button>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 12, color: theme.muted }}>
            Type a question, then click <strong style={{ color: theme.text }}>Ask Recall</strong> or press{' '}
            <strong style={{ color: theme.text }}>Ctrl+Enter</strong>.
          </p>
          {requestState !== 'idle' && (
            <p style={{ margin: '8px 0 0', fontSize: 12, color: statusTone }}>{requestMessage}</p>
          )}
          {results && !canRunAutonomousFixes && (
            <p style={{ margin: '8px 0 0', fontSize: 12, color: theme.warning }}>
              Autonomous fixes are disabled until confidence and evidence are strong.
            </p>
          )}
        </div>
      </form>

      <section
        style={{
          border: `1px solid ${theme.border}`,
          borderRadius: 16,
          background: theme.panel,
          padding: 14,
          marginBottom: 16,
        }}
      >
        <p style={{ margin: '0 0 8px', fontSize: 13, color: theme.muted }}>What-if Simulation</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <select
            value={whatIfAction}
            onChange={(e) => setWhatIfAction(e.target.value)}
            style={{ borderRadius: 0, border: `1px solid ${theme.border}`, background: theme.panelAlt, color: theme.text, padding: '6px 10px' }}
          >
            <option value="resolve_decisions">Resolve decisions</option>
            <option value="clear_blockers">Clear blockers</option>
            <option value="assign_high_priority_tasks">Assign high-priority tasks</option>
          </select>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: theme.muted, fontSize: 12 }}>
            Units
            <input
              type="number"
              min={1}
              max={10}
              value={whatIfUnits}
              onChange={(e) => setWhatIfUnits(e.target.value)}
               style={{ width: 68, borderRadius: 0, border: `1px solid ${theme.border}`, background: theme.panelAlt, color: theme.text, padding: '6px 8px' }}
            />
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: theme.muted, fontSize: 12 }}>
            Horizon (days)
            <input
              type="number"
              min={1}
              max={120}
              value={whatIfHorizon}
              onChange={(e) => setWhatIfHorizon(e.target.value)}
               style={{ width: 80, borderRadius: 0, border: `1px solid ${theme.border}`, background: theme.panelAlt, color: theme.text, padding: '6px 8px' }}
            />
          </label>
          <button
            type="button"
            onClick={runWhatIf}
            disabled={whatIfLoading}
            style={{
              borderRadius: 0,
              border: `1px solid ${theme.border}`,
              background: theme.panelAlt,
              color: theme.text,
              padding: '6px 10px',
              cursor: whatIfLoading ? 'not-allowed' : 'pointer',
              opacity: whatIfLoading ? 0.6 : 1,
              fontWeight: 700,
            }}
          >
            {whatIfLoading ? 'Simulating...' : 'Run Simulation'}
          </button>
        </div>
        {!!whatIfError && <p style={{ margin: 0, color: theme.warning, fontSize: 12 }}>{whatIfError}</p>}
        {whatIfResult && (
          <p style={{ margin: 0, color: theme.muted, fontSize: 13 }}>
            Baseline {whatIfResult.baseline?.readiness_score} ({whatIfResult.baseline?.status}) -> Projected{' '}
            <strong style={{ color: theme.text }}>{whatIfResult.projected?.readiness_score}</strong> ({whatIfResult.projected?.status}), delta{' '}
            <strong style={{ color: (whatIfResult.projected?.delta || 0) >= 0 ? theme.success : theme.danger }}>
              {(whatIfResult.projected?.delta || 0) >= 0 ? '+' : ''}{whatIfResult.projected?.delta}
            </strong>. Interval {whatIfResult.projected?.uncertainty_interval?.low} - {whatIfResult.projected?.uncertainty_interval?.high}.
          </p>
        )}
      </section>

      {feedbackSummary && (
        <section
          style={{
            border: `1px solid ${theme.border}`,
            borderRadius: 16,
            background: theme.panel,
            padding: 14,
            marginBottom: 16,
          }}
        >
          <p style={{ margin: '0 0 8px', fontSize: 13, color: theme.muted }}>
            Copilot Feedback (Last {feedbackSummary.window_days || 30} Days)
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', color: theme.text, fontSize: 13 }}>
            <span>Total: <strong>{feedbackSummary.total_feedback || 0}</strong></span>
            <span>Positive Rate: <strong>{feedbackSummary.positive_rate !== null && feedbackSummary.positive_rate !== undefined ? `${feedbackSummary.positive_rate}%` : '--'}</strong></span>
            <span>Upvotes: <strong>{feedbackSummary.upvotes || 0}</strong></span>
            <span>Downvotes: <strong>{feedbackSummary.downvotes || 0}</strong></span>
            <span>
              Outcomes: <strong>
                {(feedbackSummary.outcomes?.improved || 0)}/
                {(feedbackSummary.outcomes?.neutral || 0)}/
                {(feedbackSummary.outcomes?.worse || 0)}
              </strong>{' '}
              (improved/neutral/worse)
            </span>
          </div>
          {feedbackTrend.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <p style={{ margin: "0 0 6px", color: theme.muted, fontSize: 12 }}>7-day trend (up/down)</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0,1fr))", gap: 6 }}>
                {feedbackTrend.map((point) => {
                  const total = Number(point.total || 0);
                  const up = Number(point.upvotes || 0);
                  const ratio = total > 0 ? Math.max(0.1, up / total) : 0.5;
                  return (
                    <div
                      key={point.date}
                      title={`${point.date}: ${up}/${total}`}
                      style={{
                        height: 32,
                        border: `1px solid ${theme.border}`,
                        borderRadius: 6,
                        background: `linear-gradient(180deg, ${theme.success} ${Math.round(ratio * 100)}%, ${theme.warning} ${Math.round(ratio * 100)}%)`,
                        opacity: total > 0 ? 1 : 0.35,
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

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
                  borderRadius: 0,
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
          {isNavigationIntent && (
            <section style={{ border: `1px solid ${theme.border}`, borderRadius: 16, background: theme.panel, padding: 18 }}>
              <h2 style={{ marginTop: 0 }}>Quick Links</h2>
              <p style={{ margin: '0 0 10px', color: theme.muted }}>
                It looks like you are trying to find a tool. Start here:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {quickToolLinks.map((item) => (
                  <a
                    key={item.id || item.href}
                    href={item.href}
                    style={{
                      border: `1px solid ${theme.border}`,
                      borderRadius: 0,
                      padding: '8px 12px',
                      background: theme.panelAlt,
                      textDecoration: 'none',
                      color: theme.text,
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                  >
                    <span>{item.label}</span>
                    {item.reason ? (
                      <span style={{ display: 'block', marginTop: 4, color: theme.muted, fontSize: 11, fontWeight: 500 }}>
                        {item.reason}
                      </span>
                    ) : null}
                  </a>
                ))}
              </div>
            </section>
          )}

          <section style={{ border: `1px solid ${theme.border}`, borderRadius: 16, background: theme.panel, padding: 18 }}>
            <h2 style={{ marginTop: 0 }}>Answer</h2>
            {lowEvidence && (
              <div
                style={{
                  marginBottom: 10,
                  border: `1px solid ${theme.warning}`,
                  borderRadius: 10,
                  background: theme.accentSoft,
                  padding: '8px 10px',
                  color: theme.warning,
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                Low evidence: this answer may be incomplete. Please use the links below and ask a more specific question.
              </div>
            )}
            <p style={{ color: theme.muted }}>{results.answer}</p>
            {!isNavigationIntent && (
              <p style={{ margin: '6px 0 0', color: theme.muted, fontSize: 13 }}>
                Evidence Coverage: <strong style={{ color: theme.text }}>{results.coverageScore}</strong> | Evidence Count:{' '}
                <strong style={{ color: theme.text }}>{results.evidenceCount}</strong> | Source Types:{' '}
                <strong style={{ color: theme.text }}>{results.sourceTypes.join(', ') || 'none'}</strong>
              </p>
            )}
            {!isNavigationIntent && results.freshnessDays !== null && (
              <p style={{ margin: '6px 0 0', color: theme.muted, fontSize: 13 }}>
                Freshness: <strong style={{ color: theme.text }}>{results.freshnessDays}</strong> day(s) since newest linked evidence.
              </p>
            )}
            {lowEvidence && results.missingEvidence.length > 0 && (
              <ul style={{ margin: '10px 0 0', paddingLeft: 18, color: theme.warning }}>
                {results.missingEvidence.slice(0, 3).map((item) => (
                  <li key={item} style={{ marginBottom: 4 }}>
                    {item}
                  </li>
                ))}
              </ul>
            )}
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: theme.muted }}>Confidence</span>
                <strong>
                  {results.confidence}% ({confidenceLabel})
                </strong>
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
            <div style={{ marginTop: 14, borderTop: `1px solid ${theme.border}`, paddingTop: 12 }}>
              <p style={{ margin: '0 0 8px', fontSize: 13, color: theme.muted }}>Was this answer helpful?</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                <button
                  type="button"
                  onClick={() => setFeedbackVote('up')}
                  style={{
                    borderRadius: 0,
                    border: `1px solid ${feedbackVote === 'up' ? theme.success : theme.border}`,
                    background: feedbackVote === 'up' ? theme.accentSoft : theme.panelAlt,
                    color: theme.text,
                    padding: '6px 10px',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  Helpful
                </button>
                <button
                  type="button"
                  onClick={() => setFeedbackVote('down')}
                  style={{
                    borderRadius: 0,
                    border: `1px solid ${feedbackVote === 'down' ? theme.danger : theme.border}`,
                    background: feedbackVote === 'down' ? theme.accentSoft : theme.panelAlt,
                    color: theme.text,
                    padding: '6px 10px',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  Not Helpful
                </button>
                <select
                  value={feedbackOutcome}
                  onChange={(e) => setFeedbackOutcome(e.target.value)}
                  style={{
                    borderRadius: 0,
                    border: `1px solid ${theme.border}`,
                    background: theme.panelAlt,
                    color: theme.text,
                    padding: '6px 10px',
                  }}
                >
                  <option value="">Outcome (optional)</option>
                  <option value="improved">Improved</option>
                  <option value="neutral">Neutral</option>
                  <option value="worse">Worse</option>
                </select>
                <button
                  type="button"
                  onClick={submitFeedback}
                  disabled={!feedbackVote || feedbackSubmitting}
                  style={{
                    borderRadius: 0,
                    border: `1px solid ${theme.border}`,
                    background: theme.panelAlt,
                    color: theme.text,
                    padding: '6px 10px',
                    cursor: !feedbackVote || feedbackSubmitting ? 'not-allowed' : 'pointer',
                    opacity: !feedbackVote || feedbackSubmitting ? 0.6 : 1,
                    fontWeight: 700,
                  }}
                >
                  {feedbackSubmitting ? 'Saving...' : 'Submit Feedback'}
                </button>
              </div>
              {!!feedbackMessage && (
                <p style={{ margin: 0, fontSize: 12, color: feedbackMessage.includes('Thanks') ? theme.success : theme.warning }}>
                  {feedbackMessage}
                </p>
              )}
            </div>
          </section>

          {!isNavigationIntent && (
            <section style={{ border: `1px solid ${theme.border}`, borderRadius: 16, background: theme.panel, padding: 18 }}>
              <h3 style={{ marginTop: 0 }}>Current Status</h3>
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
          )}

          {results.execution?.performed && results.execution?.result && (
            <section style={{ border: `1px solid ${theme.border}`, borderRadius: 16, background: theme.panel, padding: 18 }}>
              <h3 style={{ marginTop: 0 }}>Execution Result</h3>
              <p style={{ margin: 0, color: theme.muted }}>
                Executed: {results.execution.result.executed_count} | Skipped: {results.execution.result.skipped_count}
              </p>
            </section>
          )}

          {!isNavigationIntent && !!results.learningModel && Object.keys(results.learningModel).length > 0 && (
            <section style={{ border: `1px solid ${theme.border}`, borderRadius: 16, background: theme.panel, padding: 18 }}>
              <h3 style={{ marginTop: 0 }}>Why This Answer</h3>
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

          {results.nextActions.length > 0 && !isNavigationIntent && !lowEvidence && (
            <section style={{ border: `1px solid ${theme.border}`, borderRadius: 16, background: theme.panel, padding: 18 }}>
              <h3 style={{ marginTop: 0 }}>Suggested Next Actions</h3>
              <div style={{ display: 'grid', gap: 10 }}>
                {results.nextActions.map((action) => (
                  <div
                    key={action.id}
                    style={{
                      border: `1px solid ${theme.border}`,
                      borderRadius: 12,
                      padding: 12,
                      background: theme.panelAlt,
                      color: theme.text,
                    }}
                  >
                    <a
                      href={action.href || '#'}
                      style={{ display: 'block', textDecoration: 'none', color: theme.text }}
                    >
                      <p style={{ margin: '0 0 4px', fontWeight: 700 }}>{action.title}</p>
                    </a>
                    <p style={{ margin: '0 0 4px', color: theme.muted }}>{action.reason}</p>
                    <p style={{ margin: 0, color: theme.muted, fontSize: 12 }}>
                      Impact: {action.impact} | Confidence: {action.confidence}%
                    </p>
                    {(action.expectedRiskReduction !== null && action.expectedRiskReduction !== undefined) && (
                      <p style={{ margin: '4px 0 0', color: theme.muted, fontSize: 12 }}>
                        Expected risk reduction: {action.expectedRiskReduction} | Effort: {action.effortHours}h | Priority score: {action.priorityScore}
                      </p>
                    )}
                    {action.evidence?.length > 0 && (
                      <div style={{ marginTop: 10 }}>
                        <button
                          type="button"
                          onClick={() =>
                            setOpenEvidenceByActionId((prev) => ({
                              ...prev,
                              [action.id]: !prev[action.id],
                            }))
                          }
                          style={{
                            border: `1px solid ${theme.border}`,
                            background: theme.panel,
                            color: theme.text,
                            padding: '6px 10px',
                            borderRadius: 0,
                            fontSize: 12,
                            cursor: 'pointer',
                          }}
                        >
                          {openEvidenceByActionId[action.id] ? 'Hide Evidence' : 'View Evidence'}
                        </button>
                        {openEvidenceByActionId[action.id] && (
                          <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
                            {action.evidence.map((ev) => (
                              <a
                                key={`${action.id}-${ev.type}-${ev.id}`}
                                href={ev.href}
                                style={{
                                  textDecoration: 'none',
                                  color: theme.text,
                                  border: `1px solid ${theme.border}`,
                                  borderRadius: 8,
                                  padding: '8px 10px',
                                  background: theme.panel,
                                  fontSize: 12,
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  gap: 8,
                                  flexWrap: 'wrap',
                                }}
                              >
                                <span>{ev.title}</span>
                                <span style={{ color: theme.muted }}>
                                  {ev.type}{ev.date ? ` | ${ev.date}` : ''}
                                </span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
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
              setRequestState('idle');
              setRequestMessage('');
            }}
            style={{
              borderRadius: 0,
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

