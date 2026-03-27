import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import { useTheme } from '../utils/ThemeAndAccessibility';
import { useAuth } from '../hooks/useAuth';
import BrandedTechnicalIllustration from '../components/BrandedTechnicalIllustration';
import { WorkspaceHero, WorkspacePanel } from '../components/WorkspaceChrome';
import { getProjectPalette } from '../utils/projectUi';

function toDisplayDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function toTimestamp(value) {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function normalizeSources(sources) {
  const configs = [
    { key: 'conversations', type: 'conversation', fallbackHref: (item) => `/conversations/${item.id}`, dateKeys: ['created_at'] },
    { key: 'replies', type: 'reply', fallbackHref: (item) => item.url || '/conversations', dateKeys: ['updated_at', 'created_at'] },
    { key: 'action_items', type: 'action_item', fallbackHref: (item) => item.url || '/conversations', dateKeys: ['due_date', 'created_at'] },
    { key: 'decisions', type: 'decision', fallbackHref: (item) => `/decisions/${item.id}`, dateKeys: ['created_at'] },
    { key: 'goals', type: 'goal', fallbackHref: (item) => `/business/goals/${item.id}`, dateKeys: ['created_at'] },
    { key: 'milestones', type: 'milestone', fallbackHref: (item) => item.url || '/business/goals', dateKeys: ['due_date', 'completed_at', 'created_at'] },
    { key: 'tasks', type: 'task', fallbackHref: () => '/business/tasks', dateKeys: ['created_at'] },
    { key: 'meetings', type: 'meeting', fallbackHref: (item) => `/business/meetings/${item.id}`, dateKeys: ['meeting_date', 'created_at'] },
    { key: 'documents', type: 'document', fallbackHref: (item) => `/business/documents/${item.id}`, dateKeys: ['updated_at', 'created_at'] },
    { key: 'projects', type: 'project', fallbackHref: (item) => `/projects/${item.id}`, dateKeys: ['updated_at', 'created_at'] },
    { key: 'sprints', type: 'sprint', fallbackHref: (item) => `/sprints/${item.id}`, dateKeys: ['start_date', 'created_at'] },
    { key: 'sprint_updates', type: 'sprint_update', fallbackHref: (item) => item.url || '/sprint', dateKeys: ['created_at'] },
    { key: 'issues', type: 'issue', fallbackHref: (item) => `/issues/${item.id}`, dateKeys: ['updated_at', 'created_at'] },
    { key: 'blockers', type: 'blocker', fallbackHref: (item) => item.url || '/blockers', dateKeys: ['resolved_at', 'created_at'] },
    { key: 'people', type: 'person', fallbackHref: (item) => item.url || '/team', dateKeys: ['last_active', 'created_at'] },
    { key: 'github_integrations', type: 'github_integration', fallbackHref: (item) => item.url || '/integrations', dateKeys: ['created_at'] },
    { key: 'jira_integrations', type: 'jira_integration', fallbackHref: (item) => item.url || '/integrations', dateKeys: ['created_at'] },
    { key: 'slack_integrations', type: 'slack_integration', fallbackHref: (item) => item.url || '/integrations', dateKeys: ['created_at'] },
    { key: 'calendar_connections', type: 'calendar_connection', fallbackHref: (item) => item.url || '/business/calendar', dateKeys: ['last_synced_at', 'updated_at', 'created_at'] },
    { key: 'pull_requests', type: 'pull_request', fallbackHref: (item) => item.url || '/integrations', dateKeys: ['merged_at', 'closed_at', 'created_at'] },
    { key: 'commits', type: 'commit', fallbackHref: (item) => item.url || '/integrations', dateKeys: ['committed_at', 'created_at'] },
  ];

  return configs
    .flatMap((config) =>
      (sources?.[config.key] || []).map((item) => {
        const rawDate = config.dateKeys.map((key) => item?.[key]).find(Boolean);
          const contextualPreview =
            item.content_preview ||
            [
              item.role,
              item.status,
              item.key,
              item.project_name,
              item.sprint_name,
              item.conversation_title,
              item.goal_title,
              item.repo_name,
              item.repo_owner,
              item.channel,
              item.provider,
              item.author,
            ]
              .filter(Boolean)
              .join(' | ');
        return {
          id: item.id,
          type: config.type,
          title: item.title || `${config.type.charAt(0).toUpperCase()}${config.type.slice(1)} #${item.id}`,
          preview: contextualPreview,
          date: toDisplayDate(rawDate),
          href: item.url || config.fallbackHref(item),
          _sortDate: toTimestamp(rawDate),
        };
      })
    )
    .sort((left, right) => right._sortDate - left._sortDate)
    .slice(0, 8)
    .map(({ _sortDate, ...item }) => item);
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

function formatEvidenceTypeLabel(value, count = 1) {
  const base = String(value || '')
    .replace(/_/g, ' ')
    .trim();
  if (!base) return 'records';
  if (count === 1) return base;
  if (base === 'reply') return 'replies';
  if (base === 'person') return 'people';
  if (base.endsWith('s')) return base;
  return `${base}s`;
}

function describeFreshness(days) {
  const value = Number(days);
  if (!Number.isFinite(value)) return '';
  if (value <= 0) return 'Updated today';
  if (value === 1) return 'Newest evidence is 1 day old';
  return `Newest evidence is ${value} days old`;
}

function getContextualHowTo(query) {
  const q = String(query || '').toLowerCase().trim();
  if (!q) return null;

  const projectCreateIntent =
    (q.includes('project') && (q.includes('create') || q.includes('new') || q.includes('set up') || q.includes('setup'))) ||
    q.includes('how can i create a project') ||
    q.includes('how do i create a project');

  if (projectCreateIntent) {
    return {
      answer:
        'To create a project: 1) open Projects, 2) click New Project, 3) enter project name/details, 4) save, then 5) open the project to add issues and sprints.',
      links: [
        { id: 'projects', label: 'Projects', href: '/projects', reason: 'Open the project list and use New Project.' },
      ],
    };
  }

  return null;
}

export default function AskRecall() {
  const { darkMode } = useTheme();
  const { user } = useAuth();
  const location = useLocation();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const lastAutoRunRef = useRef('');

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
    'What active goals are related to onboarding?',
    'Summarize recent decisions about API migration.',
    'Tell me about the Talking Stage sprint in the Justice App project.',
    'Which integrations are connected to this workspace?',
  ];

  const mapResponseToViewModel = (payload) => {
    const howTo = getContextualHowTo(payload?.query);
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
      answerEngine: payload.answer_engine || 'rules',
      credibilitySummary: payload.credibility_summary || '',
      answer:
        howTo && (payload?.response_mode === 'navigation' || Number(payload?.evidence_count || 0) === 0)
          ? `${howTo.answer}\n\n${payload?.answer || ''}`.trim()
          : payload.answer,
      confidence: payload.confidence || 0,
      confidenceBand:
        payload.confidence_band || getConfidenceLabel(payload.confidence || 0).toLowerCase(),
      responseMode:
        howTo && payload?.response_mode === 'navigation' ? 'guidance' : (payload.response_mode || 'diagnosis'),
      evidenceCount: payload.evidence_count ?? 0,
      sourceTypes: payload.source_types || [],
      freshnessDays: payload.freshness_days ?? null,
      coverageScore: payload.coverage_score ?? 0,
      missingEvidence: payload.missing_evidence || [],
      evidenceBreakdown:
        (payload.evidence_breakdown || []).map((item) => ({
          type: item.type,
          label: item.label || formatEvidenceTypeLabel(item.type, item.count),
          count: Number(item.count || 0),
        })) || [],
      answerFoundation: payload.answer_foundation || [],
      followUpQuestions: payload.follow_up_questions || [],
      toolLinks: [
        ...((payload.tool_links || []).map((item) => ({
          id: item.id,
          label: item.label,
          href: item.url,
          reason: item.reason,
        })) || []),
        ...((howTo?.links || []).filter((item) => !(payload.tool_links || []).some((link) => link?.id === item.id))),
      ],
      riskStatus: payload.risk_status || 'unknown',
      readinessScore: payload.readiness_score,
      learningModel: payload.learning_model || {},
      counts: payload.counts || {},
      linkedDecisions,
      nextActions,
      citations:
        (payload.citations || []).map((item) => ({
          id: item.id,
          type: item.type,
          title: item.title,
          href: item.url,
          date: toDisplayDate(item.created_at),
          preview: item.preview || '',
          matchedTerms: item.matched_terms || [],
          directMatch: !!item.direct_match,
        })) || [],
      sources: normalizeSources(payload.sources),
      execution: payload.execution || { performed: false, result: null },
      generatedAt: payload.generated_at || '',
    };
  };

  const mapLegacyResponseToViewModel = (searchPayload, recommendationsPayload, missionPayload, q) => {
    const legacySources = searchPayload?.results || {};
    const conversations = legacySources?.conversations || [];
    const decisions = legacySources?.decisions || [];
    const total = Number(legacySources?.total || 0);
    const recCount = (recommendationsPayload?.recommendations || []).length;
    const normalizedLegacySources = normalizeSources(legacySources);
    const primaryLegacySubject = normalizedLegacySources[0]?.title || 'this topic';
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
      answerEngine: 'rules',
      credibilitySummary: total > 0 ? `Grounded in ${total} matching record${total === 1 ? '' : 's'} from the legacy search path.` : '',
      answer:
        total > 0
          ? `I found ${total} related organization records, ${recCount} recommendation signals, and generated ${interventions.length} suggested interventions.`
          : 'No direct evidence found for this query in current indexed records.',
      confidence: total > 0 ? Math.min(90, 62 + recCount * 4) : 28,
      confidenceBand: getConfidenceLabel(total > 0 ? Math.min(90, 62 + recCount * 4) : 28).toLowerCase(),
      responseMode: total > 0 ? 'answer' : 'needs_evidence',
      evidenceCount: total,
      sourceTypes: [
        ...(conversations.length > 0 ? ['conversation'] : []),
        ...((legacySources?.replies || []).length > 0 ? ['reply'] : []),
        ...((legacySources?.action_items || []).length > 0 ? ['action_item'] : []),
        ...(decisions.length > 0 ? ['decision'] : []),
        ...((legacySources?.goals || []).length > 0 ? ['goal'] : []),
        ...((legacySources?.milestones || []).length > 0 ? ['milestone'] : []),
        ...((legacySources?.tasks || []).length > 0 ? ['task'] : []),
        ...((legacySources?.meetings || []).length > 0 ? ['meeting'] : []),
        ...((legacySources?.documents || []).length > 0 ? ['document'] : []),
        ...((legacySources?.projects || []).length > 0 ? ['project'] : []),
        ...((legacySources?.sprints || []).length > 0 ? ['sprint'] : []),
        ...((legacySources?.sprint_updates || []).length > 0 ? ['sprint_update'] : []),
        ...((legacySources?.issues || []).length > 0 ? ['issue'] : []),
        ...((legacySources?.blockers || []).length > 0 ? ['blocker'] : []),
        ...((legacySources?.people || []).length > 0 ? ['person'] : []),
        ...((legacySources?.github_integrations || []).length > 0 ? ['github_integration'] : []),
        ...((legacySources?.jira_integrations || []).length > 0 ? ['jira_integration'] : []),
        ...((legacySources?.slack_integrations || []).length > 0 ? ['slack_integration'] : []),
        ...((legacySources?.calendar_connections || []).length > 0 ? ['calendar_connection'] : []),
        ...((legacySources?.pull_requests || []).length > 0 ? ['pull_request'] : []),
        ...((legacySources?.commits || []).length > 0 ? ['commit'] : []),
      ],
      freshnessDays: null,
      coverageScore: total > 0 ? Math.min(85, 35 + total * 10) : 0,
      missingEvidence: total > 0 ? [] : ['No linked organization records matched this query.'],
      evidenceBreakdown: [
        { type: 'conversation', count: conversations.length },
        { type: 'reply', count: (legacySources?.replies || []).length },
        { type: 'action_item', count: (legacySources?.action_items || []).length },
        { type: 'decision', count: decisions.length },
        { type: 'goal', count: (legacySources?.goals || []).length },
        { type: 'milestone', count: (legacySources?.milestones || []).length },
        { type: 'task', count: (legacySources?.tasks || []).length },
        { type: 'meeting', count: (legacySources?.meetings || []).length },
        { type: 'document', count: (legacySources?.documents || []).length },
        { type: 'project', count: (legacySources?.projects || []).length },
        { type: 'sprint', count: (legacySources?.sprints || []).length },
        { type: 'sprint_update', count: (legacySources?.sprint_updates || []).length },
        { type: 'issue', count: (legacySources?.issues || []).length },
        { type: 'blocker', count: (legacySources?.blockers || []).length },
        { type: 'person', count: (legacySources?.people || []).length },
        { type: 'github_integration', count: (legacySources?.github_integrations || []).length },
        { type: 'jira_integration', count: (legacySources?.jira_integrations || []).length },
        { type: 'slack_integration', count: (legacySources?.slack_integrations || []).length },
        { type: 'calendar_connection', count: (legacySources?.calendar_connections || []).length },
        { type: 'pull_request', count: (legacySources?.pull_requests || []).length },
        { type: 'commit', count: (legacySources?.commits || []).length },
      ]
        .filter((item) => item.count > 0)
        .sort((left, right) => right.count - left.count)
        .slice(0, 4)
        .map((item) => ({
          ...item,
          label: formatEvidenceTypeLabel(item.type, item.count),
        })),
      answerFoundation:
        total > 0
          ? [
              `Ask Recall found ${total} matching record${total === 1 ? '' : 's'} through the legacy search path.`,
              `Strongest legacy evidence centers on ${primaryLegacySubject}.`,
            ]
          : ['Ask Recall could not find matching indexed records through the legacy search path.'],
      followUpQuestions:
        total > 0
          ? [
              `What changed most recently around ${primaryLegacySubject}?`,
              `What decisions or tasks are linked to ${primaryLegacySubject}?`,
            ]
          : [
              'Which project, sprint, issue, document, or decision name should I search for?',
              'What recent conversation or document should be linked to answer this question?',
            ],
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
      nextActions: [],
      citations: [],
      sources: normalizedLegacySources,
      execution: { performed: false, result: null },
      generatedAt: '',
    };
  };

  const resetFeedbackControls = () => {
    setFeedbackVote('');
    setFeedbackOutcome('');
    setFeedbackMessage('');
  };

  const queryCopilot = async ({ execute = false, confirmExecute = false, question = query } = {}) => {
    const activeQuestion = String(question || '').trim();
    try {
      const contextualHowTo = getContextualHowTo(activeQuestion);
      const response = await api.post('/api/knowledge/ai/copilot/', {
        query: activeQuestion,
        execute,
        confirm_execute: execute ? confirmExecute : false,
        max_actions: 3,
        disable_navigation: !!contextualHowTo,
      });
      return mapResponseToViewModel(response.data);
    } catch (error) {
      const status = error?.response?.status;
      if (status === 404 || status === 405 || status === 500) {
        const [searchRes, recsRes, missionRes] = await Promise.allSettled([
          api.post('/api/knowledge/search/', { query: activeQuestion }),
          api.get('/api/knowledge/ai/recommendations/'),
          api.get('/api/knowledge/ai/mission-control/'),
        ]);

        const searchData =
          searchRes.status === 'fulfilled'
            ? searchRes.value.data
            : { results: { conversations: [], decisions: [], total: 0 } };
        const recsData = recsRes.status === 'fulfilled' ? recsRes.value.data : { recommendations: [] };
        const missionData = missionRes.status === 'fulfilled' ? missionRes.value.data : {};
        return mapLegacyResponseToViewModel(searchData, recsData, missionData, activeQuestion);
      }
      throw error;
    }
  };

  const runAnalysis = async (question) => {
    const activeQuestion = String(question || '').trim();
    if (!activeQuestion || loading || executing) return;

    setQuery(activeQuestion);
    setLoading(true);
    setRequestState('loading');
    setRequestMessage('Analyzing organization state...');

    try {
      const data = await queryCopilot({ execute: false, question: activeQuestion });
      setResults(data);
      resetFeedbackControls();
      setRequestState('success');
      setRequestMessage('Analysis complete.');
    } catch (error) {
      const detail =
        error?.response?.data?.detail ||
        error?.response?.data?.error ||
        'AGI copilot is temporarily unavailable. Please try again.';
      setResults({
        question: activeQuestion,
        answer: detail,
        answerEngine: 'rules',
        confidence: 0,
        confidenceBand: 'low',
        credibilitySummary: '',
        responseMode: 'needs_evidence',
        evidenceCount: 0,
        sourceTypes: [],
        freshnessDays: null,
        coverageScore: 0,
        missingEvidence: ['Unable to evaluate evidence right now.'],
        evidenceBreakdown: [],
        answerFoundation: ['Ask Recall could not complete this request right now.'],
        followUpQuestions: ['Try the same question again in a moment.'],
        riskStatus: 'unknown',
        readinessScore: null,
        learningModel: {},
        counts: {},
        linkedDecisions: [],
        nextActions: [],
        citations: [],
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

  const handleSearch = async (event) => {
    event.preventDefault();
    await runAnalysis(query);
  };

  const handleExecute = async () => {
    if (!query.trim() || loading || executing) return;
    if (!['admin', 'manager'].includes(user?.role)) {
      setRequestState('error');
      setRequestMessage('Only admins and managers can run autonomous fixes.');
      return;
    }
    const confirmed = window.confirm(
      `Run ${results?.nextActions?.length || 0} autonomous fix${(results?.nextActions?.length || 0) === 1 ? '' : 'es'} for this analysis?`
    );
    if (!confirmed) return;

    setExecuting(true);
    setRequestState('loading');
    setRequestMessage('Executing approved interventions...');
    try {
      const data = await queryCopilot({ execute: true, confirmExecute: true });
      setResults(data);
      resetFeedbackControls();
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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const seededQuery = String(params.get('q') || '').trim();
    const shouldAutoRun = params.get('autorun') === '1';
    if (!seededQuery) return;

    setQuery((current) => (current === seededQuery ? current : seededQuery));

    if (shouldAutoRun && lastAutoRunRef.current !== location.search) {
      lastAutoRunRef.current = location.search;
      runAnalysis(seededQuery);
    }
  }, [location.search]);

  const normalizedQuery = query.trim().toLowerCase();
  const normalizedResultQuery = String(results?.question || '').trim().toLowerCase();
  const hasCurrentResults = !!results && normalizedQuery.length > 0 && normalizedQuery === normalizedResultQuery;
  const isNavigationIntent =
    results?.responseMode === 'navigation' || results?.responseMode === 'guidance';

  const lowEvidence =
    !!results &&
    !['navigation', 'guidance'].includes(results.responseMode) &&
    (results.responseMode === 'needs_evidence' || Number(results.coverageScore || 0) < 45 || Number(results.evidenceCount || 0) === 0);

  const canManageAutonomousFixes = ['admin', 'manager'].includes(user?.role);
  const hasAutonomousPlan =
    hasCurrentResults &&
    results?.responseMode === 'diagnosis' &&
    (results?.nextActions?.length || 0) > 0 &&
    !lowEvidence &&
    !isNavigationIntent;
  const canRunAutonomousFixes = hasAutonomousPlan && canManageAutonomousFixes;
  const canSubmit = !!query.trim() && !loading && !executing;
  const statusTone =
    requestState === 'error' ? palette.danger : requestState === 'success' ? palette.success : palette.muted;
  const confidenceWidth = `${Math.max(0, Math.min(100, Number(results?.confidence || 0)))}%`;
  const confidenceLabel = titleCase(results?.confidenceBand || getConfidenceLabel(results?.confidence));
  const sourceTypeSummary =
    (results?.sourceTypes || []).map((item) => formatEvidenceTypeLabel(item)).join(', ') || 'none';

  const quickToolLinks =
    results?.toolLinks?.length
      ? results.toolLinks
      : [
          { label: 'Sprint Board', href: '/sprint' },
          { label: 'Projects', href: '/projects' },
          { label: 'Task Board', href: '/business/tasks' },
          { label: 'Decisions', href: '/decisions' },
        ];

  const heroStats = [
    {
      label: 'Readiness',
      value: results?.readinessScore ?? '--',
      helper: results ? 'Current readiness signal from the latest answer' : 'Run a question to generate readiness guidance',
      tone: results?.riskStatus === 'critical' ? palette.danger : results?.riskStatus === 'watch' ? palette.warn : palette.good,
    },
    {
      label: 'Evidence',
      value: results?.evidenceCount ?? 0,
      helper: results ? sourceTypeSummary || 'No source types' : 'No evidence sources yet',
      tone: lowEvidence ? palette.warn : palette.info,
    },
    {
      label: 'Actions',
      value: results?.nextActions?.length ?? 0,
      helper: hasAutonomousPlan
        ? canManageAutonomousFixes
          ? 'Autonomous fixes are available'
          : 'Autonomous fixes need admin or manager approval'
        : 'Guidance only until confidence improves',
      tone: hasAutonomousPlan ? (canManageAutonomousFixes ? palette.good : palette.warn) : palette.accent,
    },
  ];

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <WorkspaceHero
        palette={palette}
        darkMode={darkMode}
        eyebrow="Organizational Copilot"
        title="Ask Recall"
        description="Diagnose risk, recommend interventions, and run safe autonomous fixes grounded in your team's actual history."
        stats={heroStats}
        actions={
          <>
            <button type="button" onClick={() => runAnalysis('Where is execution risk highest this week?')} style={buttonGhost(palette)}>
              Use sample prompt
            </button>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults(null);
                setRequestState('idle');
                setRequestMessage('');
              }}
              style={buttonFilled(palette, !results)}
              disabled={!results}
            >
              New Analysis
            </button>
          </>
        }
        aside={<BrandedTechnicalIllustration darkMode={darkMode} compact />}
      />

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
        <WorkspacePanel
          palette={palette}
          eyebrow="Query"
          title="Ask a grounded question"
          description="Describe the organizational problem and submit with Ctrl+Enter."
        >
          <form onSubmit={handleSearch} style={{ display: 'grid', gap: 10 }}>
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
              rows={4}
              style={{ ...inputStyle(palette), minHeight: 108, resize: 'vertical' }}
            />

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="submit" disabled={!canSubmit} style={buttonFilled(palette, !canSubmit)}>
                {loading ? 'Thinking...' : 'Ask Recall'}
              </button>
              <button
                type="button"
                onClick={handleExecute}
                disabled={executing || loading || !canRunAutonomousFixes}
                style={buttonGhost(palette, executing || loading || !canRunAutonomousFixes)}
              >
                {executing ? 'Executing...' : 'Run Autonomous Fixes'}
              </button>
            </div>

            <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>
              Press <strong style={{ color: palette.text }}>Ctrl+Enter</strong> to submit.
            </p>
            {hasAutonomousPlan && !canManageAutonomousFixes ? (
              <p style={{ margin: 0, fontSize: 12, color: palette.warn }}>
                Autonomous fixes are available for this analysis, but only admins and managers can run them.
              </p>
            ) : null}

            {requestState !== 'idle' ? <p style={{ margin: 0, fontSize: 12, color: statusTone }}>{requestMessage}</p> : null}
          </form>
        </WorkspacePanel>

        <WorkspacePanel
          palette={palette}
          eyebrow="What-if"
          title="Simulation Controls"
          description="Model the effect of resolving decisions, clearing blockers, or assigning high-priority work."
        >
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select value={whatIfAction} onChange={(e) => setWhatIfAction(e.target.value)} style={inputCompact(palette)}>
              <option value="resolve_decisions">Resolve decisions</option>
              <option value="clear_blockers">Clear blockers</option>
              <option value="assign_high_priority_tasks">Assign high-priority tasks</option>
            </select>
            <input type="number" min={1} max={10} value={whatIfUnits} onChange={(e) => setWhatIfUnits(e.target.value)} style={{ ...inputCompact(palette), width: 78 }} />
            <input type="number" min={1} max={120} value={whatIfHorizon} onChange={(e) => setWhatIfHorizon(e.target.value)} style={{ ...inputCompact(palette), width: 88 }} />
            <button type="button" onClick={runWhatIf} disabled={whatIfLoading} style={buttonGhost(palette, whatIfLoading)}>
              {whatIfLoading ? 'Simulating...' : 'Run'}
            </button>
          </div>
          {!!whatIfError ? <p style={{ margin: 0, fontSize: 12, color: palette.warn }}>{whatIfError}</p> : null}
          {whatIfResult ? (
            <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>
              Baseline {whatIfResult.baseline?.readiness_score} ({whatIfResult.baseline?.status}) -> Projected{' '}
              <strong style={{ color: palette.text }}>{whatIfResult.projected?.readiness_score}</strong> ({whatIfResult.projected?.status}), delta{' '}
              <strong style={{ color: (whatIfResult.projected?.delta || 0) >= 0 ? palette.success : palette.danger }}>
                {(whatIfResult.projected?.delta || 0) >= 0 ? '+' : ''}
                {whatIfResult.projected?.delta}
              </strong>
              .
            </p>
          ) : null}
        </WorkspacePanel>
      </section>

      {!results && !loading ? (
        <WorkspacePanel
          palette={palette}
          eyebrow="Suggestions"
          title="Suggested Prompts"
          description="Start with one of these questions to explore the copilot."
        >
          <div style={{ display: 'grid', gap: 8 }}>
            {suggestedQuestions.map((item) => (
              <button key={item} type="button" onClick={() => runAnalysis(item)} style={{ ...buttonGhost(palette), textAlign: 'left' }}>
                {item}
              </button>
            ))}
          </div>
        </WorkspacePanel>
      ) : null}

      {feedbackSummary ? (
        <WorkspacePanel
          palette={palette}
          eyebrow="Feedback Loop"
          title={`Copilot Feedback (${feedbackSummary.window_days || 30} days)`}
          description="Track how people are responding to Ask Recall guidance."
        >
          <p style={{ margin: 0, fontSize: 12, color: palette.text }}>
            Total {feedbackSummary.total_feedback || 0} | Positive {feedbackSummary.positive_rate ?? '--'}% | Up {feedbackSummary.upvotes || 0} | Down {feedbackSummary.downvotes || 0}
          </p>
          {feedbackTrend.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0,1fr))', gap: 6 }}>
              {feedbackTrend.map((point) => {
                const total = Number(point.total || 0);
                const up = Number(point.upvotes || 0);
                const ratio = total > 0 ? Math.max(0.1, up / total) : 0.5;
                return (
                  <div
                    key={point.date}
                    title={`${point.date}: ${up}/${total}`}
                    style={{
                      height: 24,
                      border: `1px solid ${palette.border}`,
                      borderRadius: 8,
                      background: `linear-gradient(180deg, ${palette.success} ${Math.round(ratio * 100)}%, ${palette.warn} ${Math.round(ratio * 100)}%)`,
                      opacity: total > 0 ? 1 : 0.35,
                    }}
                  />
                );
              })}
            </div>
          ) : null}
        </WorkspacePanel>
      ) : null}

      {loading ? <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>Analyzing organization state...</p> : null}

      {results && !loading ? (
        <div style={{ display: 'grid', gap: 14 }}>
          {isNavigationIntent ? (
            <WorkspacePanel
              palette={palette}
              eyebrow="Quick Links"
              title="Relevant destinations"
              description="Jump straight to the likely tool or route behind the request."
            >
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {quickToolLinks.map((item) => (
                  <a key={item.id || item.href} href={item.href} style={{ ...buttonGhost(palette), textDecoration: 'none' }}>
                    {item.label}
                  </a>
                ))}
              </div>
            </WorkspacePanel>
          ) : null}

          <WorkspacePanel
            palette={palette}
            eyebrow="Answer"
            title={results.answerEngine === 'anthropic' ? 'LLM-grounded response' : 'Grounded response'}
            description={
              results.answerEngine === 'anthropic'
                ? 'Review the synthesized answer, supporting evidence, and confidence before acting.'
                : 'Review the answer, evidence coverage, and confidence before acting.'
            }
          >
            {lowEvidence ? <p style={{ margin: 0, fontSize: 12, color: palette.warn }}>Low evidence: this answer may be incomplete.</p> : null}
            <p style={{ margin: 0, fontSize: 13, color: palette.muted, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{results.answer}</p>
            {!isNavigationIntent ? (
              <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>
                Engine <strong style={{ color: palette.text }}>{results.answerEngine === 'anthropic' ? 'LLM' : 'Rules'}</strong> | Coverage <strong style={{ color: palette.text }}>{results.coverageScore}</strong> | Evidence{' '}
                <strong style={{ color: palette.text }}>{results.evidenceCount}</strong> | Types{' '}
                <strong style={{ color: palette.text }}>{sourceTypeSummary}</strong>
              </p>
            ) : null}
            {!!results.credibilitySummary ? (
              <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>
                {results.credibilitySummary}
              </p>
            ) : null}
            {!isNavigationIntent && ((results.evidenceBreakdown || []).length > 0 || results.freshnessDays !== null) ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(results.evidenceBreakdown || []).map((item) => (
                  <span
                    key={`${item.type}-${item.count}`}
                    style={{
                      border: `1px solid ${palette.border}`,
                      borderRadius: 999,
                      padding: '5px 10px',
                      fontSize: 11,
                      color: palette.text,
                      background: palette.cardAlt,
                    }}
                  >
                    {item.count} {item.label}
                  </span>
                ))}
                {results.freshnessDays !== null ? (
                  <span
                    style={{
                      border: `1px solid ${palette.border}`,
                      borderRadius: 999,
                      padding: '5px 10px',
                      fontSize: 11,
                      color: palette.muted,
                      background: palette.cardAlt,
                    }}
                  >
                    {describeFreshness(results.freshnessDays)}
                  </span>
                ) : null}
              </div>
            ) : null}
            {results.citations?.length ? (
              <div style={{ display: 'grid', gap: 8 }}>
                {results.citations.slice(0, 3).map((citation) => (
                  <a
                    key={`${citation.type}-${citation.id}`}
                    href={citation.href}
                    style={{
                      textDecoration: 'none',
                      color: palette.text,
                      border: `1px solid ${palette.border}`,
                      borderRadius: 12,
                      background: palette.cardAlt,
                      padding: 10,
                      display: 'grid',
                      gap: 4,
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 700 }}>
                      {citation.title}
                    </span>
                    <span style={{ fontSize: 11, color: palette.muted }}>
                      {citation.type} {citation.date ? `| ${citation.date}` : ''}{citation.directMatch ? ' | direct match' : ''}
                    </span>
                    {citation.matchedTerms?.length ? (
                      <span style={{ fontSize: 11, color: palette.muted }}>
                        Matched terms: {citation.matchedTerms.join(', ')}
                      </span>
                    ) : null}
                    {citation.preview ? (
                      <span style={{ fontSize: 11, color: palette.muted, lineHeight: 1.5 }}>
                        {citation.preview}
                      </span>
                    ) : null}
                  </a>
                ))}
              </div>
            ) : null}

            <div style={{ display: 'grid', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontSize: 12, color: palette.muted }}>Confidence</span>
                <strong style={{ fontSize: 12, color: palette.text }}>
                  {results.confidence}% ({confidenceLabel})
                </strong>
              </div>
              <div style={{ height: 8, borderRadius: 999, overflow: 'hidden', background: palette.cardAlt }}>
                <div style={{ width: confidenceWidth, height: '100%', background: palette.ctaGradient }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
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
            {!!feedbackMessage ? (
              <p style={{ margin: 0, fontSize: 12, color: feedbackMessage.includes('Thanks') ? palette.success : palette.warn }}>
                {feedbackMessage}
              </p>
            ) : null}
          </WorkspacePanel>

          {!isNavigationIntent && (results.answerFoundation?.length > 0 || results.missingEvidence?.length > 0) ? (
            <WorkspacePanel
              palette={palette}
              eyebrow="Trust"
              title="Why this answer"
              description="See what Ask Recall relied on and what still limits confidence."
            >
              {results.answerFoundation?.length ? (
                <div style={{ display: 'grid', gap: 8 }}>
                  {results.answerFoundation.map((item) => (
                    <div
                      key={item}
                      style={{
                        border: `1px solid ${palette.border}`,
                        borderRadius: 14,
                        background: palette.cardAlt,
                        padding: 12,
                        fontSize: 12,
                        color: palette.text,
                        lineHeight: 1.6,
                      }}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              ) : null}
              {results.missingEvidence?.length ? (
                <div style={{ display: 'grid', gap: 6 }}>
                  {results.missingEvidence.map((item) => (
                    <p key={item} style={{ margin: 0, fontSize: 12, color: palette.warn }}>
                      {item}
                    </p>
                  ))}
                </div>
              ) : null}
            </WorkspacePanel>
          ) : null}

          {!isNavigationIntent ? (
            <WorkspacePanel
              palette={palette}
              eyebrow="Current Status"
              title="Risk posture"
              description="Track the latest status and readiness signal for the situation."
            >
              <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>
                Status{' '}
                <strong style={{ color: results.riskStatus === 'critical' ? palette.danger : results.riskStatus === 'watch' ? palette.warn : palette.success }}>
                  {results.riskStatus}
                </strong>
                {results.readinessScore !== null ? ` | Readiness ${results.readinessScore}` : ''}
              </p>
            </WorkspacePanel>
          ) : null}

          {!isNavigationIntent && results.followUpQuestions?.length ? (
            <WorkspacePanel
              palette={palette}
              eyebrow="Ask Next"
              title="Suggested follow-ups"
              description="Use these next questions to deepen the answer or close evidence gaps."
            >
              <div style={{ display: 'grid', gap: 8 }}>
                {results.followUpQuestions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => runAnalysis(item)}
                    style={{ ...buttonGhost(palette), textAlign: 'left' }}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </WorkspacePanel>
          ) : null}

          {!!results.execution?.performed && !!results.execution?.result ? (
            <WorkspacePanel
              palette={palette}
              eyebrow="Execution"
              title="Autonomous fix result"
              description="Review what Ask Recall executed and what it skipped."
            >
              <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>
                Executed: {results.execution.result.executed_count} | Skipped: {results.execution.result.skipped_count}
              </p>
            </WorkspacePanel>
          ) : null}

          {results.responseMode === 'diagnosis' && results.nextActions.length > 0 && !isNavigationIntent && !lowEvidence ? (
            <WorkspacePanel
              palette={palette}
              eyebrow="Next Actions"
              title="Suggested interventions"
              description="These recommendations are grounded in the current evidence trail."
            >
              <div style={{ display: 'grid', gap: 8 }}>
                {results.nextActions.map((action) => (
                  <div key={action.id} style={{ border: `1px solid ${palette.border}`, borderRadius: 14, background: palette.cardAlt, padding: 12 }}>
                    <a href={action.href || '#'} style={{ textDecoration: 'none', color: palette.text, fontWeight: 700, fontSize: 13 }}>{action.title}</a>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: palette.muted }}>{action.reason}</p>
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: palette.muted }}>Impact {action.impact} | Confidence {action.confidence}%</p>
                  </div>
                ))}
              </div>
            </WorkspacePanel>
          ) : null}

          {results.sources.length > 0 ? (
            <WorkspacePanel
              palette={palette}
              eyebrow="Evidence"
              title="Supporting sources"
              description="Open the records Ask Recall grounded this answer on."
            >
              <div style={{ display: 'grid', gap: 8 }}>
                {results.sources.map((source) => (
                  <a
                    key={`${source.type}-${source.id}`}
                    href={source.href}
                    style={{
                      textDecoration: 'none',
                      color: palette.text,
                      border: `1px solid ${palette.border}`,
                      borderRadius: 14,
                      background: palette.cardAlt,
                      padding: 12,
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 8,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
                      <span style={{ fontSize: 12 }}>{source.title}</span>
                      {source.preview ? (
                        <span style={{ fontSize: 11, color: palette.muted, lineHeight: 1.5 }}>
                          {source.preview}
                        </span>
                      ) : null}
                    </div>
                    <span style={{ fontSize: 11, color: palette.muted }}>{source.type} | {source.date}</span>
                  </a>
                ))}
              </div>
            </WorkspacePanel>
          ) : null}
        </div>
      ) : null}
    </div>
  );
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
