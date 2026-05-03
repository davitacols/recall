import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import { useTheme } from '../utils/ThemeAndAccessibility';
import { useAuth } from '../hooks/useAuth';
import { WorkspaceHero, WorkspacePanel } from '../components/WorkspaceChrome';
import { getProjectPalette } from '../utils/projectUi';

const ASK_RECALL_THREAD_STORAGE_KEY = 'ask_recall_thread_v2';

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

function decodeHtmlEntities(text) {
  const value = String(text || '');
  if (!value) return '';

  if (typeof window !== 'undefined' && window.document) {
    const textarea = window.document.createElement('textarea');
    textarea.innerHTML = value;
    return textarea.value;
  }

  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function sanitizeNarrativeText(value) {
  const text = String(value || '');
  if (!text.trim()) return '';

  return decodeHtmlEntities(
    text
      .replace(/<\s*br\s*\/?>/gi, '\n')
      .replace(/<\s*\/(p|div|pre|li|ul|ol|blockquote|h[1-6])\s*>/gi, '\n')
      .replace(/<\s*li\b[^>]*>/gi, '- ')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function sanitizePreviewText(value) {
  return sanitizeNarrativeText(value).replace(/\s*\n+\s*/g, ' ').trim();
}

function truncateText(value, max = 240) {
  const text = sanitizePreviewText(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}...`;
}

function buildAnchorPrompt(source) {
  const title = String(source?.title || '').trim();
  if (!title) return '';

  switch (source?.type) {
    case 'project':
      return `What changed most recently in ${title}?`;
    case 'sprint':
      return `What is active in ${title} right now?`;
    case 'decision':
      return `Summarize ${title} and what is still unresolved.`;
    case 'document':
      return `Summarize the latest updates in ${title}.`;
    case 'issue':
      return `What is the current status of ${title}?`;
    case 'task':
      return `What is blocking ${title}?`;
    case 'person':
      return `What work is ${title} currently involved in?`;
    default:
      return `Tell me about ${title}.`;
  }
}

function readStoredThreadEntries() {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(ASK_RECALL_THREAD_STORAGE_KEY);
    const parsed = JSON.parse(raw || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && item.question && item.answer)
      .slice(-6);
  } catch {
    return [];
  }
}

function toThreadEntry(result) {
  if (!result?.question || !result?.answer) return null;

  return {
    id: result.analysisId || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    question: result.question,
    answer: result.answer,
    answerEngine: result.answerEngine || 'rules',
    confidence: Number(result.confidence || 0),
    confidenceBand: result.confidenceBand || getConfidenceLabel(result.confidence || 0).toLowerCase(),
    responseMode: result.responseMode || 'answer',
    assistantMode: result.assistantMode || 'answer',
    riskStatus: result.riskStatus || 'unknown',
    evidenceCount: Number(result.evidenceCount || 0),
    coverageScore: Number(result.coverageScore || 0),
    credibilitySummary: result.credibilitySummary || '',
    followUpQuestions: Array.isArray(result.followUpQuestions) ? result.followUpQuestions.slice(0, 4) : [],
    evidenceBreakdown: Array.isArray(result.evidenceBreakdown) ? result.evidenceBreakdown.slice(0, 4) : [],
    freshnessDays: result.freshnessDays ?? null,
    missingEvidence: Array.isArray(result.missingEvidence) ? result.missingEvidence.slice(0, 2) : [],
    sources: Array.isArray(result.sources) ? result.sources.slice(0, 6) : [],
    contextAnchor: result.contextAnchor || null,
    deliveryMode: result.deliveryMode || '',
    generatedAt: result.generatedAt || new Date().toISOString(),
  };
}

function buildAnchorSuggestions(entries) {
  const seen = new Set();
  const suggestions = [];

  [...entries].reverse().forEach((entry, entryIndex) => {
    (entry.sources || []).forEach((source, sourceIndex) => {
      const prompt = buildAnchorPrompt(source);
      const label = String(source?.title || '').trim();
      if (!prompt || !label) return;
      const key = `${label.toLowerCase()}::${prompt.toLowerCase()}`;
      if (seen.has(key)) return;
      seen.add(key);
      suggestions.push({
        id: `source-${entryIndex}-${sourceIndex}`,
        label,
        helper: titleCase(source.type || 'record'),
        prompt,
      });
    });
  });

  if (suggestions.length < 4) {
    [...entries]
      .reverse()
      .forEach((entry, entryIndex) => {
        const prompt = String(entry.question || '').trim();
        if (!prompt) return;
        const key = `question::${prompt.toLowerCase()}`;
        if (seen.has(key)) return;
        seen.add(key);
        suggestions.push({
          id: `question-${entryIndex}`,
          label: truncateText(prompt, 56),
          helper: 'Recent ask',
          prompt,
        });
      });
  }

  return suggestions.slice(0, 6);
}

function buildThreadContextPayload(entries) {
  if (!Array.isArray(entries) || entries.length === 0) return [];

  return entries.slice(-3).map((entry, entryIndex) => ({
    id: entry.id || `thread-entry-${entryIndex}`,
    question: String(entry.question || '').trim(),
    response_mode: entry.responseMode || 'answer',
    generated_at: entry.generatedAt || '',
    sources: [
      ...(entry.contextAnchor?.title ? [entry.contextAnchor] : []),
      ...(Array.isArray(entry.sources) ? entry.sources : []),
    ]
      .slice(0, 4)
      .map((source, sourceIndex) => ({
          id: source.id ?? `${entryIndex}-${sourceIndex}`,
          type: source.type || 'record',
          title: String(source.title || '').trim(),
          href: source.href || '',
        })),
  }));
}

function mergePromptChoices(primary = [], secondary = [], limit = 4) {
  const merged = [];
  const seen = new Set();

  [...primary, ...secondary].forEach((item) => {
    const text = String(item || '').trim();
    const key = text.toLowerCase();
    if (!text || seen.has(key)) return;
    seen.add(key);
    merged.push(text);
  });

  return merged.slice(0, limit);
}

function normalizeContextAnchor(anchor, fallbackSource = null) {
  const candidate = anchor && anchor.title ? anchor : fallbackSource;
  if (!candidate) return null;

  const title = String(candidate.title || '').trim();
  if (!title) return null;

  return {
    id: candidate.id ?? fallbackSource?.id ?? null,
    type: String(candidate.type || fallbackSource?.type || 'record').trim(),
    title,
    href: candidate.href || candidate.url || fallbackSource?.href || '',
  };
}

function buildScopedAnchorPrompts(anchor) {
  if (!anchor?.title) return [];

  const prompts = [];
  const add = (value) => {
    const text = String(value || '').trim();
    if (!text || prompts.includes(text)) return;
    prompts.push(text);
  };

  add(buildAnchorPrompt(anchor));

  switch (anchor.type) {
    case 'project':
      add(`What blockers are affecting ${anchor.title} right now?`);
      add(`Which decisions are still open for ${anchor.title}?`);
      add(`What is shipping next for ${anchor.title}?`);
      break;
    case 'sprint':
      add(`What tasks are active in ${anchor.title} right now?`);
      add(`What blockers are affecting ${anchor.title}?`);
      add(`What should we resolve before ${anchor.title} ends?`);
      break;
    case 'decision':
      add(`What tasks or conversations are linked to ${anchor.title}?`);
      add(`Who owns the follow-through for ${anchor.title}?`);
      add(`What changed most recently around ${anchor.title}?`);
      break;
    case 'document':
      add(`What decisions or tasks reference ${anchor.title}?`);
      add(`What changed most recently around ${anchor.title}?`);
      add(`Who updated ${anchor.title} most recently?`);
      break;
    case 'conversation':
      add(`Summarize ${anchor.title} and what needs a response next.`);
      add(`Which decisions or tasks came out of ${anchor.title}?`);
      add(`What changed most recently in ${anchor.title}?`);
      break;
    case 'release':
      add(`What should we watch before shipping ${anchor.title}?`);
      add(`Which issues or blockers are tied to ${anchor.title}?`);
      add(`What changed most recently around ${anchor.title}?`);
      break;
    case 'issue':
      add(`What is blocking ${anchor.title}?`);
      add(`Who owns the next action for ${anchor.title}?`);
      add(`What changed most recently around ${anchor.title}?`);
      break;
    case 'task':
      add(`Who owns ${anchor.title} and what is the next move?`);
      add(`What is blocking ${anchor.title}?`);
      break;
    case 'blocker':
      add(`How do we clear ${anchor.title}?`);
      add(`Which project or sprint is ${anchor.title} affecting?`);
      break;
    default:
      add(`What changed most recently around ${anchor.title}?`);
      add(`What decisions or tasks are linked to ${anchor.title}?`);
      break;
  }

  return prompts.slice(0, 4);
}

function buildScopedToolLinks(anchor) {
  if (!anchor?.title) return [];

  const links = [];
  const add = (id, label, href, reason) => {
    if (!href) return;
    if (links.some((item) => item.id === id || item.href === href)) return;
    links.push({ id, label, href, reason });
  };

  switch (anchor.type) {
    case 'project':
      add('open-project', 'Open Project', anchor.href || (anchor.id ? `/projects/${anchor.id}` : '/projects'), `Open ${anchor.title} in Projects.`);
      if (anchor.id) {
        add('project-backlog', 'Backlog', `/projects/${anchor.id}/backlog`, `Review backlog for ${anchor.title}.`);
        add('project-releases', 'Releases', `/projects/${anchor.id}/releases`, `Review releases for ${anchor.title}.`);
      }
      add('projects', 'Projects', '/projects', 'Browse the project portfolio.');
      break;
    case 'sprint':
      add('open-sprint', 'Open Sprint', anchor.href || (anchor.id ? `/sprints/${anchor.id}` : '/sprint-history'), `Open ${anchor.title}.`);
      add('current-sprint', 'Sprint Board', '/sprint', 'Open the active sprint board.');
      if (anchor.id) {
        add('sprint-retro', 'Retrospective', `/sprints/${anchor.id}/retrospective`, `Open the retrospective for ${anchor.title}.`);
      }
      add('blockers', 'Blockers', '/blockers', 'Review blockers affecting sprint flow.');
      break;
    case 'decision':
      add('open-decision', 'Open Decision', anchor.href || (anchor.id ? `/decisions/${anchor.id}` : '/decisions'), `Open ${anchor.title} in Decisions.`);
      add('decisions', 'Decisions', '/decisions', 'Browse the decision workspace.');
      add('conversations', 'Conversations', '/conversations', 'Open the discussion history.');
      add('tasks', 'Task Board', '/business/tasks', 'Review execution follow-through.');
      break;
    case 'document':
      add('open-document', 'Open Document', anchor.href || (anchor.id ? `/business/documents/${anchor.id}` : '/business/documents'), `Open ${anchor.title} in Documents.`);
      add('documents', 'Documents', '/business/documents', 'Browse the document library.');
      add('decisions', 'Decisions', '/decisions', 'Check linked decisions.');
      add('tasks', 'Task Board', '/business/tasks', 'Review related follow-through.');
      break;
    case 'conversation':
      add('open-conversation', 'Open Thread', anchor.href || (anchor.id ? `/conversations/${anchor.id}` : '/conversations'), `Open ${anchor.title} in Conversations.`);
      add('conversations', 'Conversations', '/conversations', 'Browse the conversation workspace.');
      add('decisions', 'Decisions', '/decisions', 'Check decisions related to the thread.');
      add('tasks', 'Task Board', '/business/tasks', 'Review execution follow-through.');
      break;
    case 'release':
      add('open-release', 'Open Releases', anchor.href || '/projects', `Open the release workspace for ${anchor.title}.`);
      add('projects', 'Projects', '/projects', 'Return to project workspaces.');
      add('tasks', 'Task Board', '/business/tasks', 'Review execution tasks before shipping.');
      add('sprint', 'Sprint Board', '/sprint', 'Open sprint delivery flow.');
      break;
    case 'issue':
      add('open-issue', 'Open Issue', anchor.href || (anchor.id ? `/issues/${anchor.id}` : '/projects'), `Open ${anchor.title}.`);
      add('projects', 'Projects', '/projects', 'Return to project workspaces.');
      add('sprint', 'Sprint Board', '/sprint', 'Open sprint delivery flow.');
      add('tasks', 'Task Board', '/business/tasks', 'Review related execution tasks.');
      break;
    case 'blocker':
      add('blockers', 'Blockers', anchor.href || '/blockers', `Open blocker tracking for ${anchor.title}.`);
      add('sprint', 'Sprint Board', '/sprint', 'Open sprint delivery flow.');
      add('tasks', 'Task Board', '/business/tasks', 'Review tasks around the blocker.');
      break;
    case 'task':
      add('tasks', 'Task Board', anchor.href || '/business/tasks', `Open task tracking for ${anchor.title}.`);
      add('projects', 'Projects', '/projects', 'Return to project workspaces.');
      add('decisions', 'Decisions', '/decisions', 'Check linked decisions.');
      break;
    default:
      add('knowledge', 'Knowledge', '/knowledge', 'Open the knowledge workspace.');
      add('projects', 'Projects', '/projects', 'Return to project workspaces.');
      add('decisions', 'Decisions', '/decisions', 'Browse the decision workspace.');
      break;
  }

  return links.slice(0, 4);
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
    { key: 'releases', type: 'release', fallbackHref: (item) => item.project_id ? `/projects/${item.project_id}/releases` : '/projects', dateKeys: ['release_date', 'created_at'] },
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
        const contextualPreview = sanitizePreviewText(
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
              .join(' | ')
        );
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
  const text = String(value || '')
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .trim();
  if (!text) return '';
  return text.replace(/\b\w/g, (letter) => letter.toUpperCase());
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

function usesClaudeEngine(value) {
  const engine = String(value || '').trim().toLowerCase();
  return engine === 'claude' || engine === 'anthropic';
}

function buildAgentStatus(result) {
  const mode = String(result?.deliveryMode || '').trim().toLowerCase();
  const responseMode = String(result?.responseMode || '').trim().toLowerCase();
  const evidenceCount = Number(result?.evidenceCount || 0);
  const coverageScore = Number(result?.coverageScore || 0);
  const sourceLabel = evidenceCount === 1 ? 'record' : 'records';

  if (mode === 'history_preview') {
    return {
      tone: 'info',
      badge: 'History preview',
      threadLabel: 'Recent answer',
      headline: 'Recent Ask Recall answer',
      summary: 'This thread loaded from recent history first and is refreshing against the latest workspace evidence.',
      requestState: 'info',
      requestMessage: 'Loaded your recent Ask Recall answer and refreshing it against the latest workspace evidence.',
    };
  }

  if (mode === 'legacy_fallback') {
    return {
      tone: 'warn',
      badge: 'Fallback mode',
      threadLabel: 'Fallback answer',
      headline: 'Ask Recall used its grounded fallback for this reply',
      summary:
        evidenceCount > 0
          ? `Ask Recall recovered with grounded workspace search and found ${evidenceCount} ${sourceLabel}, but this response came from the fallback path instead of the primary copilot flow.`
          : 'Ask Recall recovered with the legacy search path because the primary copilot flow was unavailable for this prompt.',
      requestState: 'warn',
      requestMessage: 'Ask Recall switched to grounded workspace search for this reply.',
    };
  }

  if (mode === 'unavailable') {
    return {
      tone: 'danger',
      badge: 'Unavailable',
      threadLabel: 'Unavailable',
      headline: 'Ask Recall could not complete a grounded answer',
      summary: 'Neither the primary copilot flow nor the grounded rescue path could finish this request right now.',
      requestState: 'error',
      requestMessage: 'Ask Recall could not complete this request right now.',
    };
  }

  if (usesClaudeEngine(result?.answerEngine)) {
    return {
      tone: 'success',
      badge: 'Agent live',
      threadLabel: 'Agent answer',
      headline: 'Ask Recall is reasoning over Knoledgr evidence',
      summary:
        evidenceCount > 0
          ? `This answer was generated by Ask Recall and grounded in ${evidenceCount} linked workspace ${sourceLabel}${coverageScore ? ` with ${coverageScore}% coverage` : ''}.`
          : 'This answer was generated by Ask Recall, but the workspace evidence set is still thin.',
      requestState: 'success',
      requestMessage: 'Grounded Ask Recall answer ready.',
    };
  }

  if (isNavigationLikeResponse(responseMode)) {
    return {
      tone: 'info',
      badge: 'Routing mode',
      threadLabel: 'Workspace route',
      headline: 'Ask Recall treated this as a route request',
      summary: 'This reply was handled as navigation, so Ask Recall pointed you to the right Knoledgr surfaces instead of running a full workspace synthesis.',
      requestState: 'info',
      requestMessage: 'Ask Recall mapped your request to the right Knoledgr route.',
    };
  }

  if (isConversationalResponse(responseMode)) {
    return {
      tone: 'info',
      badge: 'Preflight mode',
      threadLabel: 'Agent preflight',
      headline: 'Ask Recall is waiting for a workspace-specific follow-up',
      summary: 'Name a project, sprint, decision, document, teammate, or issue and Ask Recall will switch from opener mode into grounded analysis.',
      requestState: 'info',
      requestMessage: 'Ask Recall is ready. Name a concrete workspace record to start grounded analysis.',
    };
  }

  if (responseMode === 'task_priority') {
    return {
      tone: 'success',
      badge: 'Task ranking',
      threadLabel: 'Prioritized work',
      headline: 'Ask Recall ranked your current tasks',
      summary: `This answer ranked your assigned open tasks using priority, due date pressure, and current status.`,
      requestState: 'success',
      requestMessage: 'Ask Recall prioritized your assigned tasks.',
    };
  }

  if (responseMode === 'issue_priority') {
    return {
      tone: 'success',
      badge: 'Issue ranking',
      threadLabel: 'Prioritized issues',
      headline: 'Ask Recall ranked project issues',
      summary: 'This answer ranked project issues using priority, due date pressure, owner gaps, and stale in-flight work.',
      requestState: 'success',
      requestMessage: 'Ask Recall prioritized the project issue queue.',
    };
  }

  return {
    tone: 'warn',
    badge: 'Grounded mode',
    threadLabel: 'Grounded answer',
    headline: 'This reply stayed in rules-and-evidence mode',
    summary:
      evidenceCount > 0
        ? `Ask Recall answered from ${evidenceCount} linked workspace ${sourceLabel}, but the response stayed in the grounded rules-and-evidence path for this reply.`
        : 'Ask Recall answered without a full synthesis step because the evidence anchor was still weak.',
    requestState: 'warn',
    requestMessage: 'Ask Recall answered from workspace evidence in grounded mode.',
  };
}

function isNavigationLikeResponse(value) {
  return ['navigation', 'guidance'].includes(String(value || '').trim().toLowerCase());
}

function isConversationalResponse(value) {
  return String(value || '').trim().toLowerCase() === 'conversation';
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

function buildCachedResultFromHistory(snapshot) {
  const question = String(snapshot?.query || '').trim();
  if (!question) return null;

  return {
    question,
    analysisId: '',
    answerEngine: 'history',
    credibilitySummary: 'Loaded from your recent Ask Recall history while the workspace refreshes the latest grounded answer.',
    answer: sanitizeNarrativeText(snapshot?.answer_preview || 'Refreshing the last Ask Recall answer for this prompt...'),
    confidence: snapshot?.confidence_band === 'high' ? 82 : snapshot?.confidence_band === 'medium' ? 64 : snapshot?.confidence_band === 'low' ? 36 : 48,
    confidenceBand: String(snapshot?.confidence_band || 'medium').toLowerCase(),
    responseMode: String(snapshot?.response_mode || 'answer'),
    evidenceCount: Number(snapshot?.evidence_count || 0),
    sourceTypes: [],
    freshnessDays: null,
    coverageScore: Number(snapshot?.coverage_score || 0),
    missingEvidence: [],
    evidenceBreakdown: [],
    answerFoundation: ['This preview came from your recent Ask Recall history and will be refreshed automatically.'],
    followUpQuestions: [],
    toolLinks: [],
    riskStatus: 'watch',
    readinessScore: null,
    learningModel: {},
    counts: {},
    linkedDecisions: [],
    nextActions: [],
    citations: [],
    sources: [],
    execution: { performed: false, result: null },
    deliveryMode: 'history_preview',
    generatedAt: '',
  };
}

export default function AskRecall() {
  const { darkMode } = useTheme();
  const { user } = useAuth();
  const location = useLocation();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const lastAutoRunRef = useRef('');
  const lastSnapshotRef = useRef('');

  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [threadEntries, setThreadEntries] = useState(() => readStoredThreadEntries());
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [requestState, setRequestState] = useState('idle');
  const [requestMessage, setRequestMessage] = useState('');
  const [assistantActionState, setAssistantActionState] = useState({ busy: '', items: [] });
  const [assistantMode, setAssistantMode] = useState('answer');

  const assistantModes = [
    {
      id: 'answer',
      label: 'Answer',
      title: 'Ask a workspace question',
      helper: 'I will ground the answer in records, cite context, and suggest follow-ups.',
      placeholder: 'Example: What decisions are blocking the Justice App release?',
      prompts: [
        'Where is execution risk highest this week?',
        'What decisions are blocking delivery?',
        'What changed most recently across projects?',
      ],
    },
    {
      id: 'plan',
      label: 'Plan',
      title: 'Plan the next move',
      helper: 'I will turn workspace signals into a practical sequence of next actions.',
      placeholder: 'Example: Build a plan to unblock the current sprint.',
      prompts: [
        'Build a 24-hour plan to reduce delivery risk.',
        'What should leadership resolve next?',
        'Create a recovery plan for overdue work.',
      ],
    },
    {
      id: 'draft',
      label: 'Draft',
      title: 'Draft from context',
      helper: 'I will help turn records into summaries, updates, decisions, or briefs.',
      placeholder: 'Example: Draft a leadership update from recent project activity.',
      prompts: [
        'Draft a leadership update from recent decisions and blockers.',
        'Summarize recent decisions about API migration.',
        'Write a concise project status update.',
      ],
    },
    {
      id: 'route',
      label: 'Navigate',
      title: 'Find the right surface',
      helper: 'I will route you to the right Knoledgr page or record.',
      placeholder: 'Example: Take me to service desk requests that need attention.',
      prompts: [
        'Open the service desk queue.',
        'Show me team health.',
        'Where do I manage dashboards?',
      ],
    },
  ];
  const activeAssistantMode = assistantModes.find((mode) => mode.id === assistantMode) || assistantModes[0];

  const mapResponseToViewModel = (payload) => {
    const howTo = getContextualHowTo(payload?.query);
    const normalizedSources = normalizeSources(payload.sources);
    const contextAnchor = normalizeContextAnchor(payload?.context_anchor, normalizedSources[0] || null);
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
      deliveryMode: usesClaudeEngine(payload.answer_engine)
        ? 'claude'
        : isNavigationLikeResponse(payload.response_mode)
          ? 'routing'
          : isConversationalResponse(payload.response_mode)
            ? 'conversation_preflight'
            : 'grounded',
      credibilitySummary: sanitizeNarrativeText(payload.credibility_summary || ''),
      answer:
        howTo && (payload?.response_mode === 'navigation' || Number(payload?.evidence_count || 0) === 0)
          ? sanitizeNarrativeText(`${howTo.answer}\n\n${payload?.answer || ''}`.trim())
          : sanitizeNarrativeText(payload.answer),
      confidence: payload.confidence || 0,
      confidenceBand:
        payload.confidence_band || getConfidenceLabel(payload.confidence || 0).toLowerCase(),
      responseMode:
        howTo && payload?.response_mode === 'navigation' ? 'guidance' : (payload.response_mode || 'diagnosis'),
      assistantMode: payload.assistant_mode || 'answer',
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
      contextAnchor,
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
          preview: sanitizePreviewText(item.preview || ''),
          matchedTerms: item.matched_terms || [],
          directMatch: !!item.direct_match,
        })) || [],
      sources: normalizedSources,
      execution: payload.execution || { performed: false, result: null },
      generatedAt: payload.generated_at || '',
    };
  };

  const mapLegacyResponseToViewModel = (searchPayload, recommendationsPayload, missionPayload, q, options = {}) => {
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
      deliveryMode: options.deliveryMode || 'legacy_fallback',
      credibilitySummary: total > 0 ? `Grounded in ${total} matching record${total === 1 ? '' : 's'} from the legacy search path.` : '',
      answer:
        total > 0
          ? `I found ${total} related organization records, ${recCount} recommendation signals, and generated ${interventions.length} suggested interventions.`
          : 'No direct evidence found for this query in current indexed records.',
      confidence: total > 0 ? Math.min(90, 62 + recCount * 4) : 28,
      confidenceBand: getConfidenceLabel(total > 0 ? Math.min(90, 62 + recCount * 4) : 28).toLowerCase(),
      responseMode: total > 0 ? 'answer' : 'needs_evidence',
      assistantMode,
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
      contextAnchor: normalizedLegacySources[0] || null,
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

  const queryCopilot = async ({ execute = false, confirmExecute = false, question = query, mode = assistantMode } = {}) => {
    const activeQuestion = String(question || '').trim();
    const activeMode = mode || assistantMode;
    try {
      const contextualHowTo = getContextualHowTo(activeQuestion);
      const response = await api.post('/api/knowledge/ai/copilot/', {
        query: activeQuestion,
        assistant_mode: activeMode,
        thread_context: buildThreadContextPayload(threadEntries),
        execute,
        confirm_execute: execute ? confirmExecute : false,
        max_actions: 3,
        disable_navigation: !!contextualHowTo,
      });
      return mapResponseToViewModel(response.data);
    } catch (error) {
      const status = error?.response?.status;
      if (!status || status === 404 || status === 405 || status >= 500) {
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
        return mapLegacyResponseToViewModel(searchData, recsData, missionData, activeQuestion, {
          deliveryMode: 'legacy_fallback',
        });
      }
      throw error;
    }
  };

  const runAnalysis = async (question, options = {}) => {
    const activeQuestion = String(question || '').trim();
    if (!activeQuestion || loading || executing) return;
    const activeMode = options.mode || assistantMode;

    setQuery(activeQuestion);
    if (activeMode !== assistantMode) {
      setAssistantMode(activeMode);
    }
    setLoading(true);
    setRequestState('loading');
    setRequestMessage('Working through your workspace...');

    try {
      const data = await queryCopilot({ execute: false, question: activeQuestion, mode: activeMode });
      const agentStatus = buildAgentStatus(data);
      setResults(data);
      setAssistantActionState({ busy: '', items: [] });
      rememberThreadEntry(toThreadEntry(data));
      setRequestState(agentStatus.requestState);
      setRequestMessage(agentStatus.requestMessage);
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
        deliveryMode: 'unavailable',
      });
      rememberThreadEntry(
        toThreadEntry({
          question: activeQuestion,
          answer: detail,
          answerEngine: 'rules',
          confidence: 0,
          confidenceBand: 'low',
          responseMode: 'needs_evidence',
          riskStatus: 'unknown',
          credibilitySummary: '',
          followUpQuestions: ['Try the same question again in a moment.'],
          evidenceBreakdown: [],
          freshnessDays: null,
          missingEvidence: ['Unable to evaluate evidence right now.'],
          sources: [],
          deliveryMode: 'unavailable',
        })
      );
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
      const agentStatus = buildAgentStatus(data);
      setResults(data);
      setAssistantActionState({ busy: '', items: [] });
      rememberThreadEntry(toThreadEntry(data));
      setRequestState(agentStatus.requestState);
      setRequestMessage(
        data?.execution?.performed
          ? 'Ask Recall completed the approved action plan.'
          : agentStatus.requestMessage
      );
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

  const handleAssistantAction = async (action) => {
    if (!results || assistantActionState.busy) return;

    setAssistantActionState((current) => ({ ...current, busy: action }));
    setRequestState('loading');
    setRequestMessage(action === 'create_tasks' ? 'Creating tasks from the assistant plan...' : 'Saving the draft as a document...');

    try {
      const response = await api.post('/api/knowledge/ai/copilot/actions/', {
        action,
        assistant_mode: results.assistantMode || assistantMode,
        query: results.question || query,
        answer: results.answer || '',
        next_actions: results.nextActions || [],
      });
      const createdItems = response.data?.created_items || [];
      setAssistantActionState({ busy: '', items: createdItems });
      setRequestState('success');
      setRequestMessage(
        action === 'create_tasks'
          ? `Created ${createdItems.length} task${createdItems.length === 1 ? '' : 's'} from this plan.`
          : 'Saved this draft as a Knoledgr document.'
      );
    } catch (error) {
      const detail =
        error?.response?.data?.detail ||
        error?.response?.data?.error ||
        'Unable to create the assistant artifact right now.';
      setAssistantActionState((current) => ({ ...current, busy: '' }));
      setRequestState('error');
      setRequestMessage(detail);
    }
  };

  const rememberThreadEntry = (entry) => {
    if (!entry) return;

    setThreadEntries((current) => {
      const next = [...current];
      const last = next[next.length - 1];
      const normalizedQuestion = String(entry.question || '').trim().toLowerCase();
      const lastQuestion = String(last?.question || '').trim().toLowerCase();

      if (last && normalizedQuestion && lastQuestion === normalizedQuestion) {
        next[next.length - 1] = entry;
        return next.slice(-6);
      }

      return [...next, entry].slice(-6);
    });
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (threadEntries.length) {
      window.localStorage.setItem(ASK_RECALL_THREAD_STORAGE_KEY, JSON.stringify(threadEntries.slice(-6)));
      return;
    }

    window.localStorage.removeItem(ASK_RECALL_THREAD_STORAGE_KEY);
  }, [threadEntries]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const seededQuery = String(params.get('q') || '').trim();
    const shouldAutoRun = params.get('autorun') === '1';
    const snapshot = location.state?.askRecallSnapshot;
    if (!seededQuery) return;

    setQuery((current) => (current === seededQuery ? current : seededQuery));

    if (snapshot && snapshot.query === seededQuery && lastSnapshotRef.current !== location.key) {
      lastSnapshotRef.current = location.key;
      const cached = buildCachedResultFromHistory(snapshot);
      if (cached) {
        setResults((current) => {
          const currentQuestion = String(current?.question || '').trim();
          return currentQuestion === seededQuery ? current : cached;
        });
        rememberThreadEntry(toThreadEntry(cached));
        setRequestState('success');
        setRequestMessage('Loaded your recent Ask Recall answer. Refreshing with the latest workspace evidence...');
      }
    }

    if (shouldAutoRun && lastAutoRunRef.current !== location.search) {
      lastAutoRunRef.current = location.search;
      runAnalysis(seededQuery);
    }
  }, [location.search, location.key]);

  const normalizedQuery = query.trim().toLowerCase();
  const normalizedResultQuery = String(results?.question || '').trim().toLowerCase();
  const hasCurrentResults = !!results && normalizedQuery.length > 0 && normalizedQuery === normalizedResultQuery;
  const isNavigationIntent = isNavigationLikeResponse(results?.responseMode);
  const isConversationMode = isConversationalResponse(results?.responseMode);
  const isDiagnosisMode = results?.responseMode === 'diagnosis';
  const answerActionLinks = results?.toolLinks?.length ? results.toolLinks : [];

  const lowEvidence =
    !!results &&
    !['navigation', 'guidance', 'conversation'].includes(results.responseMode) &&
    (results.responseMode === 'needs_evidence' || Number(results.coverageScore || 0) < 45 || Number(results.evidenceCount || 0) === 0);

  const canManageAutonomousFixes = ['admin', 'manager'].includes(user?.role);
  const hasAutonomousPlan =
    hasCurrentResults &&
    results?.responseMode === 'diagnosis' &&
    (results?.nextActions?.length || 0) > 0 &&
    !lowEvidence &&
    !isNavigationIntent;
  const canRunAutonomousFixes = hasAutonomousPlan && canManageAutonomousFixes;
  const canCreatePlanTasks = hasAutonomousPlan && !loading && !executing && !assistantActionState.busy;
  const canSaveDraftDocument =
    hasCurrentResults &&
    !lowEvidence &&
    !isNavigationIntent &&
    (results?.assistantMode === 'draft' || results?.responseMode === 'draft') &&
    !loading &&
    !executing &&
    !assistantActionState.busy;
  const canSavePlanDocument =
    hasCurrentResults &&
    !lowEvidence &&
    !isNavigationIntent &&
    (results?.assistantMode === 'plan' || results?.responseMode === 'diagnosis' || results?.responseMode === 'task_priority' || results?.responseMode === 'issue_priority') &&
    !loading &&
    !executing &&
    !assistantActionState.busy;
  const canSubmit = !!query.trim() && !loading && !executing;
  const visibleThreadEntries = threadEntries.slice(-4);
  const agentStatus = results ? buildAgentStatus(results) : null;
  const anchorSuggestions = buildAnchorSuggestions(threadEntries.slice(0, -1));
  const scopedAnchorPrompts = buildScopedAnchorPrompts(results?.contextAnchor);
  const sharpeningPrompts =
    mergePromptChoices(
      results?.followUpQuestions || [],
      scopedAnchorPrompts.length
        ? scopedAnchorPrompts
        : [
          'What changed most recently around [project name]?',
          'Which decisions are still open for [project name]?',
          'What tasks are active in [sprint or project] right now?',
        ]
    );
  const lowEvidenceGuidance = lowEvidence
    ? isDiagnosisMode
      ? 'Ask Recall can see operating signals, but it still needs more linked workspace evidence before it can rank the best move confidently.'
        : 'Ask Recall needs a clearer workspace handle here. Mention a project, sprint, issue, decision, document, or teammate and it will pull the newest linked context.'
    : '';
  const starterPrompts = activeAssistantMode.prompts;

  const quickToolLinks =
    results?.toolLinks?.length
      ? results.toolLinks
      : [
          { label: 'Sprint Board', href: '/sprint' },
          { label: 'Projects', href: '/projects' },
          { label: 'Task Board', href: '/business/tasks' },
          { label: 'Decisions', href: '/decisions' },
        ];
  const scopedContextualLinks = !answerActionLinks.length && results?.contextAnchor ? buildScopedToolLinks(results.contextAnchor) : [];
  const contextualLinks = answerActionLinks.length ? answerActionLinks : scopedContextualLinks.length ? scopedContextualLinks : quickToolLinks;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <WorkspaceHero
        palette={palette}
        darkMode={darkMode}
        eyebrow="AI Assistant"
        title="Ask Recall"
        description="A workspace assistant that answers, plans, drafts, routes, and helps turn Knoledgr context into next moves."
        actions={
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults(null);
              setThreadEntries([]);
              setRequestState('idle');
              setRequestMessage('');
            }}
            style={buttonFilled(palette, !results)}
            disabled={!results}
          >
            New thread
          </button>
        }
      />

      <section style={splitSection()}>
        <div style={laneStyle('1 1 880px')}>
            <WorkspacePanel
              palette={palette}
              eyebrow="Assistant Thread"
              title={results ? (isConversationMode ? 'Start from the workspace' : 'Keep working in one thread') : activeAssistantMode.title}
              description={
              results
                ? isConversationMode
                  ? 'Ask about a specific project, sprint, decision, document, or teammate and Ask Recall will pull it into the thread.'
                  : 'Ask a follow-up, open the linked record, or run the next safe move from here.'
                : activeAssistantMode.helper
            }
            action={
              <span style={pillStyle(palette, loading ? 'info' : hasCurrentResults ? 'success' : 'default')}>
                {loading ? 'Thinking' : hasCurrentResults ? 'Updated' : 'Ready'}
              </span>
            }
            >
              <div style={noteStyle(palette, agentStatus ? agentStatus.tone : 'info')}>
                <strong style={{ display: 'block', marginBottom: 4, fontSize: 12, color: palette.text }}>
                  {agentStatus ? agentStatus.headline : 'Ask Recall is ready to assist'}
                </strong>
                <span>
                  {agentStatus
                    ? agentStatus.summary
                    : 'Ask a question, request a plan, draft an update, or ask where to go. I will use workspace evidence when it exists and guide you to the right surface when it does not.'}
                </span>
              </div>

              <div style={consoleSurfaceStyle(palette, darkMode)}>
                <div style={{ display: 'grid', gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: palette.muted }}>
                  Assistant Mode
                </span>
                <strong style={{ fontSize: 14, color: palette.text }}>{activeAssistantMode.title}</strong>
                <span style={{ fontSize: 12, color: palette.muted, lineHeight: 1.6 }}>
                  {activeAssistantMode.helper}
                </span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                  {assistantModes.map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setAssistantMode(mode.id)}
                      style={assistantModeButtonStyle(palette, assistantMode === mode.id)}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSearch} style={{ display: 'grid', gap: 12 }}>
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
                  placeholder={activeAssistantMode.placeholder}
                  rows={5}
                  style={{
                    ...inputStyle(palette),
                    minHeight: 140,
                    resize: 'vertical',
                    lineHeight: 1.7,
                    borderRadius: 22,
                    background: darkMode
                      ? 'linear-gradient(180deg, rgba(31, 27, 24, 0.96), rgba(22, 18, 16, 0.94))'
                      : 'linear-gradient(180deg, rgba(255, 253, 249, 0.98), rgba(246, 240, 231, 0.98))',
                  }}
                />

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button type="submit" disabled={!canSubmit} style={buttonFilled(palette, !canSubmit)}>
                      {loading ? 'Thinking...' : 'Ask Recall'}
                    </button>
                    {hasAutonomousPlan ? (
                      <button
                        type="button"
                        onClick={handleExecute}
                        disabled={executing || loading || !canRunAutonomousFixes}
                        style={buttonGhost(palette, executing || loading || !canRunAutonomousFixes)}
                      >
                        {executing ? 'Executing...' : 'Run fixes'}
                      </button>
                    ) : null}
                    {hasAutonomousPlan ? (
                      <button
                        type="button"
                        onClick={() => handleAssistantAction('create_tasks')}
                        disabled={!canCreatePlanTasks}
                        style={buttonGhost(palette, !canCreatePlanTasks)}
                      >
                        {assistantActionState.busy === 'create_tasks' ? 'Creating tasks...' : 'Create tasks'}
                      </button>
                    ) : null}
                    {canSaveDraftDocument ? (
                      <button
                        type="button"
                        onClick={() => handleAssistantAction('create_draft')}
                        disabled={!canSaveDraftDocument}
                        style={buttonGhost(palette, !canSaveDraftDocument)}
                      >
                        {assistantActionState.busy === 'create_draft' ? 'Saving draft...' : 'Save as document'}
                      </button>
                    ) : null}
                    {canSavePlanDocument ? (
                      <button
                        type="button"
                        onClick={() => handleAssistantAction('create_plan_document')}
                        disabled={!canSavePlanDocument}
                        style={buttonGhost(palette, !canSavePlanDocument)}
                      >
                        {assistantActionState.busy === 'create_plan_document' ? 'Saving memo...' : 'Save plan memo'}
                      </button>
                    ) : null}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span style={pillStyle(palette, 'default')}>Ctrl+Enter</span>
                    {hasAutonomousPlan ? (
                      <span style={pillStyle(palette, canManageAutonomousFixes ? 'success' : 'warn')}>
                        {canManageAutonomousFixes ? 'Fixes available' : 'Fixes need approval'}
                      </span>
                    ) : null}
                  </div>
                </div>

                {hasAutonomousPlan && !canManageAutonomousFixes ? (
                  <div style={noteStyle(palette, 'warn')}>
                    This answer includes executable fixes, but only admins and managers can run them.
                  </div>
                ) : null}

                {requestState !== 'idle' ? (
                  <div
                    style={noteStyle(
                      palette,
                      requestState === 'error'
                        ? 'danger'
                        : requestState === 'warn'
                          ? 'warn'
                          : requestState === 'success'
                            ? 'success'
                            : 'info'
                    )}
                  >
                    {requestMessage}
                  </div>
                ) : null}
              </form>
            </div>

            {!results && !loading ? (
              <div style={{ display: 'grid', gap: 8 }}>
                <strong style={{ fontSize: 13, color: palette.text }}>Try one of these</strong>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {starterPrompts.map((item) => (
                    <button key={item} type="button" onClick={() => runAnalysis(item)} style={buttonGhost(palette)}>
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {visibleThreadEntries.length ? (
              <div style={{ display: 'grid', gap: 12 }}>
                {visibleThreadEntries.length > 1 ? (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span style={pillStyle(palette, 'default')}>{threadEntries.length} messages in this thread</span>
                    {threadEntries.length > visibleThreadEntries.length ? (
                      <span style={pillStyle(palette, 'default')}>Showing latest {visibleThreadEntries.length}</span>
                    ) : null}
                  </div>
                ) : null}

                {visibleThreadEntries.map((entry, index) => {
                  const isLatestEntry = index === visibleThreadEntries.length - 1;
                  const entryAgentStatus = buildAgentStatus(entry);
                  const entryNavigationIntent = isNavigationLikeResponse(entry.responseMode);
                  const entryConversationMode = isConversationalResponse(entry.responseMode);
                  const entryContextAnchor = normalizeContextAnchor(entry.contextAnchor, entry.sources?.[0] || null);
                  const entryFollowUpIdeas = mergePromptChoices(entry.followUpQuestions || [], buildScopedAnchorPrompts(entryContextAnchor));
                  const entryDiagnosisMode = entry.responseMode === 'diagnosis';
                  const entryLowEvidence =
                    !['navigation', 'guidance', 'conversation'].includes(entry.responseMode) &&
                    (entry.responseMode === 'needs_evidence' || Number(entry.evidenceCount || 0) === 0 || Number(entry.coverageScore || 0) < 45);
                  const entryConfidenceLabel = titleCase(entry.confidenceBand || getConfidenceLabel(entry.confidence));
                  const entryConfidenceWidth = `${Math.max(8, Math.min(100, Number(entry.confidence || 0)))}%`;

                  return (
                    <React.Fragment key={entry.id || `${entry.question}-${index}`}>
                      <div style={messageBubbleStyle(palette, darkMode, 'user')}>
                        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: palette.muted }}>
                          You
                        </span>
                        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: palette.text }}>{entry.question}</p>
                      </div>

                      <div style={messageBubbleStyle(palette, darkMode, 'assistant')}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                          <div style={{ display: 'grid', gap: 2 }}>
                            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: palette.muted }}>
                              Ask Recall
                            </span>
                            <strong style={{ fontSize: 14, color: palette.text }}>
                              {entryNavigationIntent
                                ? 'Workspace route'
                                : entryConversationMode
                                  ? 'Agent preflight'
                                : entryLowEvidence
                                  ? 'Working answer'
                                  : entryAgentStatus.threadLabel || entryAgentStatus.headline}
                            </strong>
                          </div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <span style={pillStyle(palette, entryAgentStatus.tone)}>
                              {entryAgentStatus.badge}
                            </span>
                            {!entryConversationMode ? (
                              <span style={pillStyle(palette, entryLowEvidence ? 'warn' : 'default')}>
                                {entryLowEvidence ? 'Needs a clearer anchor' : `${entry.confidence}% confidence`}
                              </span>
                            ) : null}
                            {entryDiagnosisMode && !entryNavigationIntent ? (
                              <span style={pillStyle(palette, entry.riskStatus === 'critical' ? 'danger' : entry.riskStatus === 'watch' ? 'warn' : 'success')}>
                                {titleCase(entry.riskStatus || 'stable')}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <p style={{ margin: 0, fontSize: 14, color: palette.text, whiteSpace: 'pre-wrap', lineHeight: 1.85 }}>
                          {isLatestEntry ? entry.answer : truncateText(entry.answer, 280)}
                        </p>
                        {isLatestEntry && !entryLowEvidence && !entryConversationMode && !!entry.credibilitySummary ? (
                          <p style={{ margin: 0, fontSize: 12, color: palette.muted, lineHeight: 1.7 }}>{entry.credibilitySummary}</p>
                        ) : null}
                        {entry.generatedAt ? (
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <span style={pillStyle(palette, 'default')}>Updated {toDisplayDate(entry.generatedAt)}</span>
                          </div>
                        ) : null}
                      </div>

                      {isLatestEntry && entryLowEvidence ? <div style={noteStyle(palette, 'warn')}>{lowEvidenceGuidance}</div> : null}

                      {isLatestEntry && !entryNavigationIntent && ((entry.evidenceBreakdown || []).length > 0 || entry.freshnessDays !== null) ? (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {(entry.evidenceBreakdown || []).map((item) => (
                            <span key={`${item.type}-${item.count}`} style={pillStyle(palette, 'default')}>
                              {item.count} {item.label}
                            </span>
                          ))}
                          {entry.freshnessDays !== null ? <span style={pillStyle(palette, 'info')}>{describeFreshness(entry.freshnessDays)}</span> : null}
                        </div>
                      ) : null}

                      {isLatestEntry && !entryNavigationIntent && entryFollowUpIdeas.length ? (
                        <div style={{ display: 'grid', gap: 8 }}>
                          <strong style={{ fontSize: 12, color: palette.text }}>{entryConversationMode ? 'Try asking' : 'Follow-up ideas'}</strong>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {entryFollowUpIdeas.map((item) => (
                              <button key={item} type="button" onClick={() => runAnalysis(item)} style={buttonGhost(palette)}>
                                {item}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {isLatestEntry && !entryLowEvidence && !entryConversationMode ? (
                        <div style={{ display: 'grid', gap: 6 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                            <span style={{ fontSize: 12, color: palette.muted }}>Confidence</span>
                            <strong style={{ fontSize: 12, color: palette.text }}>
                              {entry.confidence}% ({entryConfidenceLabel})
                            </strong>
                          </div>
                          <div style={{ height: 10, borderRadius: 999, overflow: 'hidden', background: palette.progressTrack }}>
                            <div style={{ width: entryConfidenceWidth, height: '100%', background: palette.ctaGradient }} />
                          </div>
                        </div>
                      ) : null}
                    </React.Fragment>
                  );
                })}
              </div>
            ) : null}
          </WorkspacePanel>
        </div>

        <div style={laneStyle('0 1 320px')}>
          <WorkspacePanel
            palette={palette}
            eyebrow="Assistant Skills"
            title="What I can help with"
            description="Use Ask Recall like a teammate who knows the workspace, not just a search box."
          >
            <div style={{ display: 'grid', gap: 8 }}>
              {assistantModes.map((mode) => (
                <button
                  key={`skill-${mode.id}`}
                  type="button"
                  onClick={() => {
                    setAssistantMode(mode.id);
                    setQuery(mode.prompts[0]);
                  }}
                  style={assistantSkillCardStyle(palette, assistantMode === mode.id)}
                >
                  <strong style={{ color: palette.text, fontSize: 13 }}>{mode.label}</strong>
                  <span style={{ color: palette.muted, fontSize: 12, lineHeight: 1.5 }}>{mode.helper}</span>
                </button>
              ))}
            </div>
          </WorkspacePanel>

          <WorkspacePanel
            palette={palette}
            eyebrow="Fast Actions"
            title="Ask me to do this"
            description="These prompts turn the assistant toward execution."
          >
            <div style={{ display: 'grid', gap: 8 }}>
              {[
                { label: 'Prioritize my next three tasks.', mode: 'plan' },
                { label: 'Draft a status update for leadership.', mode: 'draft' },
                { label: 'Find stale decisions that need review.', mode: 'answer' },
                { label: 'What should we automate next?', mode: 'plan' },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => runAnalysis(item.label, { mode: item.mode })}
                  style={buttonGhost(palette)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </WorkspacePanel>
        </div>

      </section>

      {results && !loading ? (
        isConversationMode ? (
          <section
            style={{
              display: 'grid',
              gap: 12,
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            }}
          >
            <WorkspacePanel
              palette={palette}
              eyebrow="Good Starting Points"
              title="Ask from the workspace"
              description="Pick a question style or open a workspace surface, then keep the thread going from there."
            >
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(results.followUpQuestions.length ? results.followUpQuestions : starterPrompts.slice(0, 4)).map((item) => (
                    <button key={`conversation-starter-${item}`} type="button" onClick={() => runAnalysis(item)} style={buttonGhost(palette)}>
                      {item}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {quickToolLinks.slice(0, 4).map((item) => (
                    <a key={`conversation-link-${item.id || item.href}`} href={item.href} style={{ ...buttonGhost(palette), textDecoration: 'none' }}>
                      {item.label}
                    </a>
                  ))}
                </div>
              </div>
            </WorkspacePanel>
          </section>
        ) : (
        <section
          style={{
            display: 'grid',
            gap: 12,
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          }}
        >
          {lowEvidence ? (
            <WorkspacePanel
              palette={palette}
              eyebrow="Refine The Ask"
              title="Ask with a clearer workspace handle"
              description="A clearer workspace handle will make the next answer much stronger."
            >
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={noteStyle(palette, 'warn')}>
                  {results.missingEvidence?.[0] || lowEvidenceGuidance}
                </div>
                {anchorSuggestions.length ? (
                  <div style={{ display: 'grid', gap: 8 }}>
                    <strong style={{ fontSize: 12, color: palette.text }}>Recent anchors from this thread</strong>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {anchorSuggestions.map((item) => (
                        <button key={item.id} type="button" onClick={() => runAnalysis(item.prompt)} style={buttonGhost(palette)}>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {sharpeningPrompts.map((item) => (
                    <button key={`sharpen-${item}`} type="button" onClick={() => runAnalysis(item)} style={buttonGhost(palette)}>
                      {item}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(results?.contextAnchor ? contextualLinks : quickToolLinks).slice(0, 4).map((item) => (
                    <a key={`anchor-link-${item.id || item.href}`} href={item.href} style={{ ...buttonGhost(palette), textDecoration: 'none' }}>
                      {item.label}
                    </a>
                  ))}
                </div>
              </div>
            </WorkspacePanel>
          ) : null}

          {results.responseMode === 'diagnosis' && results.nextActions.length > 0 && !isNavigationIntent && !lowEvidence ? (
            <WorkspacePanel
              palette={palette}
              eyebrow="Recommended Moves"
              title="What to do next"
              description="The strongest moves Ask Recall can justify from this answer."
            >
              <div style={{ display: 'grid', gap: 8 }}>
                {results.nextActions.slice(0, 4).map((action) => (
                  <div key={action.id} style={{ ...microCardStyle(palette, 'default'), gap: 6 }}>
                    <a href={action.href || '#'} style={{ textDecoration: 'none', color: palette.text, fontWeight: 700, fontSize: 13 }}>
                      {action.title}
                    </a>
                    <p style={{ margin: 0, fontSize: 12, color: palette.muted, lineHeight: 1.55 }}>{action.reason}</p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span style={pillStyle(palette, 'default')}>Impact {action.impact}</span>
                      <span style={pillStyle(palette, 'default')}>Confidence {action.confidence}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </WorkspacePanel>
          ) : null}

          {!lowEvidence || isNavigationIntent ? (
            <WorkspacePanel
              palette={palette}
              eyebrow={isNavigationIntent ? 'Open In Knoledgr' : 'Next Step'}
              title={isNavigationIntent ? 'Relevant destinations' : 'Continue from this answer'}
              description={
                isNavigationIntent
                  ? 'Go straight to the surface behind this request.'
                  : 'Use the next surface or continue the thread from here.'
              }
            >
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {contextualLinks.slice(0, 4).map((item) => (
                  <a key={`next-${item.id || item.href}`} href={item.href} style={{ ...buttonGhost(palette), textDecoration: 'none' }}>
                    {item.label}
                  </a>
                ))}
              </div>
            </WorkspacePanel>
          ) : null}

          {assistantActionState.items.length > 0 ? (
            <WorkspacePanel
              palette={palette}
              eyebrow="Created"
              title="Assistant artifacts"
              description="Ask Recall created these workspace items from the current answer."
            >
              <div style={{ display: 'grid', gap: 8 }}>
                {assistantActionState.items.map((item) => (
                  <a
                    key={`${item.type}-${item.id}`}
                    href={item.url}
                    style={{ ...buttonGhost(palette), textDecoration: 'none', justifyContent: 'flex-start' }}
                  >
                    {titleCase(item.type)}: {item.title}
                  </a>
                ))}
              </div>
            </WorkspacePanel>
          ) : null}

          {results.sources.length > 0 ? (
            <WorkspacePanel
              palette={palette}
              eyebrow="Linked Records"
              title="Open the records behind this answer"
              description="Jump straight into the Knoledgr records Ask Recall pulled in."
            >
              <div style={{ display: 'grid', gap: 8 }}>
                {results.sources.slice(0, 6).map((source) => (
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
                      display: 'grid',
                      gap: 4,
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{source.title}</span>
                    <span style={{ fontSize: 11, color: palette.muted }}>
                      {titleCase(source.type)}
                      {source.date ? ` | ${source.date}` : ''}
                    </span>
                    {source.preview ? (
                      <span style={{ fontSize: 11, color: palette.muted, lineHeight: 1.5 }}>{source.preview}</span>
                    ) : null}
                  </a>
                ))}
              </div>
            </WorkspacePanel>
          ) : null}

          {!!results.execution?.performed && !!results.execution?.result ? (
            <WorkspacePanel
              palette={palette}
              eyebrow="Execution"
              title="Autonomous fix result"
              description="A quick summary of what Ask Recall executed."
            >
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={pillStyle(palette, 'success')}>Executed {results.execution.result.executed_count}</span>
                <span style={pillStyle(palette, 'default')}>Skipped {results.execution.result.skipped_count}</span>
              </div>
            </WorkspacePanel>
          ) : null}
        </section>
        )
      ) : null}
    </div>
  );
}

function inputStyle(palette) {
  return {
    width: '100%',
    border: `1px solid ${palette.border}`,
    borderRadius: 18,
    background: palette.cardAlt,
    color: palette.text,
    padding: '12px 14px',
    fontSize: 14,
    outline: 'none',
  };
}

function assistantModeButtonStyle(palette, active = false) {
  return {
    border: `1px solid ${active ? palette.info : palette.border}`,
    borderRadius: 999,
    background: active ? palette.accentSoft : palette.cardAlt,
    color: active ? palette.info : palette.text,
    padding: '7px 11px',
    fontSize: 12,
    fontWeight: 800,
    cursor: 'pointer',
  };
}

function assistantSkillCardStyle(palette, active = false) {
  return {
    border: `1px solid ${active ? palette.info : palette.border}`,
    borderRadius: 16,
    background: active ? palette.accentSoft : palette.cardAlt,
    padding: 12,
    textAlign: 'left',
    cursor: 'pointer',
    display: 'grid',
    gap: 5,
  };
}

function splitSection() {
  return {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'flex-start',
  };
}

function laneStyle(flex) {
  return {
    flex,
    minWidth: 0,
    display: 'grid',
    gap: 12,
  };
}

function toneColor(palette, tone = 'default') {
  if (tone === 'success') return palette.success;
  if (tone === 'warn') return palette.warn;
  if (tone === 'danger') return palette.danger;
  if (tone === 'info') return palette.info;
  return palette.text;
}

function pillStyle(palette, tone = 'default') {
  const accent = toneColor(palette, tone);
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    border: `1px solid ${tone === 'default' ? palette.border : `${accent}33`}`,
    borderRadius: 999,
    padding: '6px 11px',
    fontSize: 11,
    fontWeight: 700,
    lineHeight: 1.2,
    color: tone === 'default' ? palette.text : accent,
    background: tone === 'default' ? palette.cardAlt : `${accent}14`,
  };
}

function microCardStyle(palette, tone = 'default') {
  const accent = toneColor(palette, tone);
  return {
    border: `1px solid ${tone === 'default' ? palette.border : `${accent}2a`}`,
    borderRadius: 18,
    background:
      tone === 'default'
        ? palette.cardAlt
        : `linear-gradient(180deg, ${accent}14, ${accent}08)`,
    padding: 14,
    display: 'grid',
    gap: 8,
  };
}

function noteStyle(palette, tone = 'default') {
  const accent = toneColor(palette, tone);
  return {
    border: `1px solid ${tone === 'default' ? palette.border : `${accent}30`}`,
    borderRadius: 16,
    padding: '11px 13px',
    fontSize: 12,
    lineHeight: 1.6,
    color: tone === 'default' ? palette.muted : accent,
    background: tone === 'default' ? palette.cardAlt : `${accent}14`,
  };
}

function consoleSurfaceStyle(palette, darkMode) {
  return {
    border: `1px solid ${palette.border}`,
    borderRadius: 24,
    padding: 14,
    display: 'grid',
    gap: 12,
    background: darkMode
      ? 'linear-gradient(180deg, rgba(26, 22, 19, 0.95), rgba(20, 17, 14, 0.93))'
      : 'linear-gradient(180deg, rgba(255, 253, 249, 0.98), rgba(244, 238, 229, 0.98))',
  };
}

function messageBubbleStyle(palette, darkMode, role = 'assistant') {
  const isUser = role === 'user';
  return {
    border: `1px solid ${isUser ? `${palette.info}2f` : palette.border}`,
    borderRadius: isUser ? 20 : 24,
    padding: isUser ? '14px 16px' : '18px 18px 16px',
    display: 'grid',
    gap: isUser ? 6 : 12,
    background: isUser
      ? `${palette.info}10`
      : darkMode
        ? 'linear-gradient(180deg, rgba(34, 29, 25, 0.92), rgba(24, 20, 17, 0.9))'
        : 'linear-gradient(180deg, rgba(255, 252, 248, 0.98), rgba(245, 238, 228, 0.98))',
  };
}

function buttonFilled(palette, disabled = false) {
  return {
    border: 'none',
    borderRadius: 14,
    background: palette.ctaGradient,
    color: palette.buttonText,
    padding: '9px 14px',
    fontSize: 12,
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
  };
}

function buttonGhost(palette, disabled = false) {
  return {
    border: `1px solid ${palette.border}`,
    borderRadius: 14,
    background: palette.cardAlt,
    color: palette.text,
    padding: '9px 14px',
    fontSize: 12,
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
  };
}
