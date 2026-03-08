import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useTheme } from '../utils/ThemeAndAccessibility';
import { getProjectPalette } from '../utils/projectUi';

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
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [requestState, setRequestState] = useState('idle');
  const [requestMessage, setRequestMessage] = useState('');

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
        evidence: [],
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

  const handleSearch = async (event) => {
    event.preventDefault();
    if (!query.trim() || loading || executing) return;

    setLoading(true);
    setRequestState('loading');
    setRequestMessage('Analyzing organization state...');

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
        toolLinks: [],
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
    } catch (_error) {
      // Non-critical
    }
  };

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

  useEffect(() => {
    loadFeedbackSummary();
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const normalizedResultQuery = String(results?.question || '').trim().toLowerCase();
  const hasCurrentResults = !!results && normalizedQuery.length > 0 && normalizedQuery === normalizedResultQuery;
  const queryLower = query.toLowerCase();
  const isNavigationIntent =
    results?.responseMode === 'navigation' ||
    queryLower.includes('where') ||
    queryLower.includes('find') ||
    queryLower.includes('tool') ||
    queryLower.includes('navigate');

  const lowEvidence =
    !!results &&
    results.responseMode !== 'navigation' &&
    (results.responseMode === 'needs_evidence' || Number(results.coverageScore || 0) < 45 || Number(results.evidenceCount || 0) === 0);

  const canRunAutonomousFixes = hasCurrentResults && (results?.nextActions?.length || 0) > 0 && !lowEvidence && !isNavigationIntent;
  const canSubmit = !!query.trim() && !loading && !executing;
  const statusTone =
    requestState === 'error' ? palette.danger : requestState === 'success' ? palette.success : palette.muted;
  const confidenceWidth = `${Math.max(0, Math.min(100, Number(results?.confidence || 0)))}%`;
  const confidenceLabel = titleCase(results?.confidenceBand || getConfidenceLabel(results?.confidence));

  const quickToolLinks =
    results?.toolLinks?.length
      ? results.toolLinks
      : [
          { label: 'Sprint Board', href: '/sprint' },
          { label: 'Projects', href: '/projects' },
          { label: 'Task Board', href: '/business/tasks' },
          { label: 'Decisions', href: '/decisions' },
        ];

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <section style={{ ...panel(palette), padding: 14 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: palette.muted }}>ORGANIZATIONAL COPILOT</p>
        <h1 style={{ margin: '6px 0 2px', fontSize: 'clamp(1.3rem,2.4vw,1.9rem)', color: palette.text }}>Ask Recall</h1>
        <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>Diagnose risk, recommend interventions, and run safe autonomous fixes.</p>
      </section>

      <form onSubmit={handleSearch} style={{ ...panel(palette), padding: 12 }}>
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
              if (canSubmit) e.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="Describe the organizational problem to solve..."
          rows={3}
          style={{ ...inputStyle(palette), minHeight: 90, resize: 'vertical' }}
        />

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          <button type="submit" disabled={!canSubmit} style={buttonFilled(palette, !canSubmit)}>
            {loading ? 'Thinking...' : 'Ask Recall'}
          </button>
          <button type="button" onClick={handleExecute} disabled={executing || loading || !canRunAutonomousFixes} style={buttonGhost(palette, executing || loading || !canRunAutonomousFixes)}>
            {executing ? 'Executing...' : 'Run Autonomous Fixes'}
          </button>
        </div>

        <p style={{ margin: '8px 0 0', fontSize: 12, color: palette.muted }}>
          Press <strong style={{ color: palette.text }}>Ctrl+Enter</strong> to submit.
        </p>

        {requestState !== 'idle' && <p style={{ margin: '6px 0 0', fontSize: 12, color: statusTone }}>{requestMessage}</p>}
      </form>

      {!results && !loading && (
        <section style={{ ...panel(palette), padding: 12 }}>
          <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: palette.text }}>Suggested Prompts</p>
          <div style={{ display: 'grid', gap: 8 }}>
            {suggestedQuestions.map((item) => (
              <button key={item} type="button" onClick={() => setQuery(item)} style={{ ...buttonGhost(palette), textAlign: 'left' }}>
                {item}
              </button>
            ))}
          </div>
        </section>
      )}

      <section style={{ ...panel(palette), padding: 12 }}>
        <p style={{ margin: '0 0 8px', fontSize: 13, color: palette.muted }}>What-if Simulation</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={whatIfAction} onChange={(e) => setWhatIfAction(e.target.value)} style={inputCompact(palette)}>
            <option value="resolve_decisions">Resolve decisions</option>
            <option value="clear_blockers">Clear blockers</option>
            <option value="assign_high_priority_tasks">Assign high-priority tasks</option>
          </select>
          <input type="number" min={1} max={10} value={whatIfUnits} onChange={(e) => setWhatIfUnits(e.target.value)} style={{ ...inputCompact(palette), width: 70 }} />
          <input type="number" min={1} max={120} value={whatIfHorizon} onChange={(e) => setWhatIfHorizon(e.target.value)} style={{ ...inputCompact(palette), width: 80 }} />
          <button type="button" onClick={runWhatIf} disabled={whatIfLoading} style={buttonGhost(palette, whatIfLoading)}>
            {whatIfLoading ? 'Simulating...' : 'Run'}
          </button>
        </div>
        {!!whatIfError && <p style={{ margin: '8px 0 0', fontSize: 12, color: palette.warning }}>{whatIfError}</p>}
        {whatIfResult && (
          <p style={{ margin: '8px 0 0', fontSize: 12, color: palette.muted }}>
            Baseline {whatIfResult.baseline?.readiness_score} ({whatIfResult.baseline?.status}) -> Projected <strong style={{ color: palette.text }}>{whatIfResult.projected?.readiness_score}</strong> ({whatIfResult.projected?.status}), delta <strong style={{ color: (whatIfResult.projected?.delta || 0) >= 0 ? palette.success : palette.danger }}>{(whatIfResult.projected?.delta || 0) >= 0 ? '+' : ''}{whatIfResult.projected?.delta}</strong>.
          </p>
        )}
      </section>

      {feedbackSummary && (
        <section style={{ ...panel(palette), padding: 12 }}>
          <p style={{ margin: '0 0 6px', fontSize: 12, color: palette.muted }}>Copilot Feedback (Last {feedbackSummary.window_days || 30} Days)</p>
          <p style={{ margin: 0, fontSize: 12, color: palette.text }}>
            Total {feedbackSummary.total_feedback || 0} | Positive {feedbackSummary.positive_rate ?? '--'}% | Up {feedbackSummary.upvotes || 0} | Down {feedbackSummary.downvotes || 0}
          </p>
          {feedbackTrend.length > 0 && (
            <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0,1fr))', gap: 6 }}>
              {feedbackTrend.map((point) => {
                const total = Number(point.total || 0);
                const up = Number(point.upvotes || 0);
                const ratio = total > 0 ? Math.max(0.1, up / total) : 0.5;
                return <div key={point.date} title={`${point.date}: ${up}/${total}`} style={{ height: 20, border: `1px solid ${palette.border}`, borderRadius: 6, background: `linear-gradient(180deg, ${palette.success} ${Math.round(ratio * 100)}%, ${palette.warning} ${Math.round(ratio * 100)}%)`, opacity: total > 0 ? 1 : 0.35 }} />;
              })}
            </div>
          )}
        </section>
      )}

      {loading && <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>Analyzing organization state...</p>}

      {results && !loading && (
        <div style={{ display: 'grid', gap: 10 }}>
          {isNavigationIntent && (
            <section style={{ ...panel(palette), padding: 12 }}>
              <h3 style={{ margin: '0 0 8px', color: palette.text }}>Quick Links</h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {quickToolLinks.map((item) => (
                  <a key={item.id || item.href} href={item.href} style={{ ...buttonGhost(palette), textDecoration: 'none' }}>
                    {item.label}
                  </a>
                ))}
              </div>
            </section>
          )}

          <section style={{ ...panel(palette), padding: 12 }}>
            <h3 style={{ margin: '0 0 6px', color: palette.text }}>Answer</h3>
            {lowEvidence && <p style={{ margin: '0 0 8px', fontSize: 12, color: palette.warning }}>Low evidence: this answer may be incomplete.</p>}
            <p style={{ margin: 0, fontSize: 13, color: palette.muted }}>{results.answer}</p>
            {!isNavigationIntent && (
              <p style={{ margin: '8px 0 0', fontSize: 12, color: palette.muted }}>
                Coverage <strong style={{ color: palette.text }}>{results.coverageScore}</strong> | Evidence <strong style={{ color: palette.text }}>{results.evidenceCount}</strong> | Types <strong style={{ color: palette.text }}>{results.sourceTypes.join(', ') || 'none'}</strong>
              </p>
            )}

            <div style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: palette.muted }}>Confidence</span>
                <strong style={{ fontSize: 12, color: palette.text }}>{results.confidence}% ({confidenceLabel})</strong>
              </div>
              <div style={{ height: 8, borderRadius: 999, overflow: 'hidden', background: palette.cardAlt }}>
                <div style={{ width: confidenceWidth, height: '100%', background: palette.ctaGradient }} />
              </div>
            </div>

            <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <button type="button" onClick={() => setFeedbackVote('up')} style={feedbackVote === 'up' ? buttonFilled(palette) : buttonGhost(palette)}>Helpful</button>
              <button type="button" onClick={() => setFeedbackVote('down')} style={feedbackVote === 'down' ? buttonFilled(palette) : buttonGhost(palette)}>Not Helpful</button>
              <select value={feedbackOutcome} onChange={(e) => setFeedbackOutcome(e.target.value)} style={inputCompact(palette)}>
                <option value="">Outcome</option>
                <option value="improved">Improved</option>
                <option value="neutral">Neutral</option>
                <option value="worse">Worse</option>
              </select>
              <button type="button" onClick={submitFeedback} disabled={!feedbackVote || feedbackSubmitting} style={buttonGhost(palette, !feedbackVote || feedbackSubmitting)}>
                {feedbackSubmitting ? 'Saving...' : 'Submit Feedback'}
              </button>
            </div>
            {!!feedbackMessage && <p style={{ margin: '8px 0 0', fontSize: 12, color: feedbackMessage.includes('Thanks') ? palette.success : palette.warning }}>{feedbackMessage}</p>}
          </section>

          {!isNavigationIntent && (
            <section style={{ ...panel(palette), padding: 12 }}>
              <h3 style={{ margin: '0 0 6px', color: palette.text }}>Current Status</h3>
              <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>
                Status <strong style={{ color: results.riskStatus === 'critical' ? palette.danger : results.riskStatus === 'watch' ? palette.warning : palette.success }}>{results.riskStatus}</strong>
                {results.readinessScore !== null ? ` | Readiness ${results.readinessScore}` : ''}
              </p>
            </section>
          )}

          {!!results.execution?.performed && !!results.execution?.result && (
            <section style={{ ...panel(palette), padding: 12 }}>
              <h3 style={{ margin: '0 0 6px', color: palette.text }}>Execution Result</h3>
              <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>
                Executed: {results.execution.result.executed_count} | Skipped: {results.execution.result.skipped_count}
              </p>
            </section>
          )}

          {results.nextActions.length > 0 && !isNavigationIntent && !lowEvidence && (
            <section style={{ ...panel(palette), padding: 12 }}>
              <h3 style={{ margin: '0 0 8px', color: palette.text }}>Suggested Next Actions</h3>
              <div style={{ display: 'grid', gap: 8 }}>
                {results.nextActions.map((action) => (
                  <div key={action.id} style={{ border: `1px solid ${palette.border}`, borderRadius: 10, background: palette.cardAlt, padding: 10 }}>
                    <a href={action.href || '#'} style={{ textDecoration: 'none', color: palette.text, fontWeight: 700, fontSize: 13 }}>{action.title}</a>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: palette.muted }}>{action.reason}</p>
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: palette.muted }}>Impact {action.impact} | Confidence {action.confidence}%</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {results.sources.length > 0 && (
            <section style={{ ...panel(palette), padding: 12 }}>
              <h3 style={{ margin: '0 0 8px', color: palette.text }}>Evidence Sources</h3>
              <div style={{ display: 'grid', gap: 8 }}>
                {results.sources.map((source) => (
                  <a key={`${source.type}-${source.id}`} href={source.href} style={{ textDecoration: 'none', color: palette.text, border: `1px solid ${palette.border}`, borderRadius: 10, background: palette.cardAlt, padding: 10, display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12 }}>{source.title}</span>
                    <span style={{ fontSize: 11, color: palette.muted }}>{source.type} | {source.date}</span>
                  </a>
                ))}
              </div>
            </section>
          )}

          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults(null);
              setRequestState('idle');
              setRequestMessage('');
            }}
            style={buttonGhost(palette)}
          >
            New Analysis
          </button>
        </div>
      )}
    </div>
  );
}

function panel(palette) {
  return {
    border: `1px solid ${palette.border}`,
    borderRadius: 12,
    background: palette.card,
  };
}

function inputStyle(palette) {
  return {
    width: '100%',
    border: `1px solid ${palette.border}`,
    borderRadius: 10,
    background: palette.cardAlt,
    color: palette.text,
    padding: '10px 12px',
    fontSize: 14,
    outline: 'none',
  };
}

function inputCompact(palette) {
  return {
    border: `1px solid ${palette.border}`,
    borderRadius: 10,
    background: palette.cardAlt,
    color: palette.text,
    padding: '7px 10px',
    fontSize: 12,
    outline: 'none',
  };
}

function buttonFilled(palette, disabled = false) {
  return {
    border: 'none',
    borderRadius: 10,
    background: palette.ctaGradient,
    color: palette.buttonText,
    padding: '8px 12px',
    fontSize: 12,
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
  };
}

function buttonGhost(palette, disabled = false) {
  return {
    border: `1px solid ${palette.border}`,
    borderRadius: 10,
    background: palette.cardAlt,
    color: palette.text,
    padding: '8px 12px',
    fontSize: 12,
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
  };
}
