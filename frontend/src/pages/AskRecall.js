import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  BoltIcon,
  BookmarkIcon,
  BuildingOffice2Icon,
  CheckIcon,
  ClipboardIcon,
  DocumentTextIcon,
  PaperAirplaneIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { Avatar, Lozenge } from "../components/atlas";
import "./AskRecall.css";

const THREAD_KEY_PREFIX = "knoledgr.askRecall.threadV2";
const SAVED_KEY = "knoledgr.askRecall.savedV1";

const SUGGESTIONS = [
  "Summarize this week's key decisions and who owns them.",
  "What's blocking the current sprint?",
  "Who is overloaded right now and what should we reshuffle?",
  "Draft a status update for our leadership review.",
  "What recently changed in the workspace I should know about?",
  "What did the design team decide this week?",
];

// `id` values must match the backend whitelist in _normalize_assistant_mode
// ({ "answer", "plan", "draft", "route" }). The UI label can differ from the
// id — "Ground" reads more naturally than "Answer" for a grounded RAG mode.
const MODES = [
  { id: "answer", label: "Ground", description: "Cite evidence from workspace memory." },
  { id: "draft", label: "Draft", description: "Produce a polished written artifact." },
  { id: "plan", label: "Plan", description: "Propose next steps and owners." },
];

const IS_APPLE = typeof navigator !== "undefined"
  && /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent || "");
const SEND_HINT = IS_APPLE ? "⌘ + ↵ to send" : "Ctrl + Enter to send";

// Scope the thread by user+org so two people sharing a browser, or one
// person switching workspaces, never see another tenant's conversation.
function threadKey(user) {
  const u = user?.id || "anon";
  const o = user?.organization_id || user?.organization_slug || "noorg";
  return `${THREAD_KEY_PREFIX}.${o}.${u}`;
}

function loadThread(user) {
  try {
    return JSON.parse(localStorage.getItem(threadKey(user)) || "[]") || [];
  } catch (_) {
    return [];
  }
}

function persistThread(user, items) {
  try {
    localStorage.setItem(threadKey(user), JSON.stringify(items.slice(-20)));
  } catch (_) {}
}

function saveTurn(user, turn) {
  if (!turn) return;
  const key = `${SAVED_KEY}.${user?.organization_id || user?.organization_slug || "noorg"}.${user?.id || "anon"}`;
  try {
    const list = JSON.parse(localStorage.getItem(key) || "[]") || [];
    list.unshift({
      id: turn.id,
      question: turn.question,
      answer: turn.answer,
      mode: turn.mode,
      sources: turn.sources || [],
      savedAt: new Date().toISOString(),
    });
    localStorage.setItem(key, JSON.stringify(list.slice(0, 50)));
  } catch (_) {}
}

function formatTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

// Backend returns `confidence` as a 0-100 integer. Older mocks used 0-1 floats.
// Normalize to a 0-100 number we can render directly.
function normalizeConfidence(value) {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  if (num <= 1) return Math.round(num * 100);
  return Math.round(num);
}

// Backend's `sources` is a bucketed object ({decisions: [], conversations: [], total}).
// The flat array we actually want to render is `citations`. Fall back to flattening
// `sources` so older payloads still display.
function normalizeSources(data) {
  if (Array.isArray(data?.citations) && data.citations.length) {
    return data.citations.map((c) => ({
      id: c.id,
      title: c.title || c.preview || "Source",
      snippet: c.preview || c.snippet || "",
      url: c.url || "",
      kind: c.type || c.kind || "",
      relevance:
        typeof c.score === "number"
          ? Math.min(1, c.score / 60)
          : typeof c.relevance === "number"
          ? c.relevance
          : null,
      direct: !!c.direct_match,
    }));
  }
  if (Array.isArray(data?.sources)) return data.sources;
  if (data?.sources && typeof data.sources === "object") {
    const out = [];
    Object.entries(data.sources).forEach(([bucket, list]) => {
      if (!Array.isArray(list)) return;
      list.forEach((item) =>
        out.push({
          id: item.id || `${bucket}-${item.title || ""}`,
          title: item.title || "Source",
          snippet: item.preview || item.snippet || "",
          url: item.url || "",
          kind: bucket.replace(/s$/, ""),
        })
      );
    });
    return out;
  }
  return [];
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function uniquePeople(list) {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    if (!item || !item.id) continue;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

// Backend uses `recommended_interventions` ({id, title, reason, impact, url}).
// Some mocks used `next_actions`. Normalize to `{title, description, impact, url}`.
function normalizeActions(data) {
  const source =
    (Array.isArray(data?.recommended_interventions) && data.recommended_interventions) ||
    (Array.isArray(data?.next_actions) && data.next_actions) ||
    (Array.isArray(data?.nextActions) && data.nextActions) ||
    [];
  return source
    .map((a) => ({
      id: a.id || a.key || null,
      title: a.title || a.label || a.action || a.description || "",
      description: a.reason || a.description || a.summary || "",
      impact: a.impact || null,
      url: a.url || a.suggested_action_url || "",
    }))
    .filter((a) => a.title);
}

export default function AskRecall() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("answer");
  const [thread, setThread] = useState(() => loadThread(user));
  const [loading, setLoading] = useState(false);
  const [executingId, setExecutingId] = useState(null);
  const [focused, setFocused] = useState(false);
  const [members, setMembers] = useState([]);
  const [mention, setMention] = useState(null); // {start, end, query}
  const [mentionIndex, setMentionIndex] = useState(0);
  const composerRef = useRef(null);
  const convoEndRef = useRef(null);
  const turnRefs = useRef({});

  const canExecute = useMemo(
    () => ["admin", "manager"].includes(user?.role),
    [user]
  );

  // Pull the org's members so the copilot can scope by person and so we can
  // detect who's involved in any given answer.
  useEffect(() => {
    let mounted = true;
    api
      .get("/api/auth/team/")
      .then((r) => {
        if (!mounted) return;
        const list = Array.isArray(r.data) ? r.data : r.data?.results || [];
        setMembers(
          list.map((m) => ({
            id: m.id || m.user_id,
            name: m.full_name || m.name || m.email || "",
            email: m.email || "",
            role: m.role || "",
            avatar: m.avatar || m.avatar_url || "",
          })).filter((m) => m.name)
        );
      })
      .catch(() => setMembers([]));
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    persistThread(user, thread);
  }, [user, thread]);

  // If the active workspace changes (workspace switch), drop the previous
  // thread from local state so we don't briefly render another tenant's
  // conversation while the per-user-org key resolves.
  const orgKey = `${user?.organization_id || user?.organization_slug || ""}|${user?.id || ""}`;
  const lastOrgKey = useRef(orgKey);
  useEffect(() => {
    if (lastOrgKey.current !== orgKey) {
      lastOrgKey.current = orgKey;
      setThread(loadThread(user));
    }
  }, [orgKey, user]);

  useEffect(() => {
    convoEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [thread.length, loading]);

  const autoGrow = (el) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  // Find an @-mention being typed at the current caret position.
  const detectMention = useCallback((value, caret) => {
    const before = value.slice(0, caret);
    const at = before.lastIndexOf("@");
    if (at < 0) return null;
    const between = before.slice(at + 1);
    if (/\s/.test(between)) return null;
    if (at > 0 && /[A-Za-z0-9]/.test(before[at - 1])) return null;
    return { start: at, end: caret, query: between };
  }, []);

  const mentionSuggestions = useMemo(() => {
    if (!mention) return [];
    const q = mention.query.toLowerCase();
    return members
      .filter((m) => !q || m.name.toLowerCase().includes(q) || (m.email || "").toLowerCase().includes(q))
      .slice(0, 6);
  }, [members, mention]);

  const applyMention = (member) => {
    if (!mention || !composerRef.current) return;
    const ta = composerRef.current;
    const before = query.slice(0, mention.start);
    const after = query.slice(mention.end);
    const inserted = `@${member.name} `;
    const next = `${before}${inserted}${after}`;
    setQuery(next);
    setMention(null);
    setMentionIndex(0);
    queueMicrotask(() => {
      const caret = before.length + inserted.length;
      ta.focus();
      ta.setSelectionRange(caret, caret);
      autoGrow(ta);
    });
  };

  // Pick out members referenced in a string (e.g. the question or an answer).
  const detectInvolved = useCallback((text) => {
    if (!text || !members.length) return [];
    const seen = new Set();
    const hits = [];
    members.forEach((m) => {
      if (!m.name) return;
      const re = new RegExp(`(?<![A-Za-z0-9])${escapeRegExp(m.name)}(?![A-Za-z0-9])`, "i");
      if (re.test(text) && !seen.has(m.id)) {
        seen.add(m.id);
        hits.push(m);
      }
    });
    return hits.slice(0, 6);
  }, [members]);

  const runQuery = async (text, opts = {}) => {
    const question = String(text || "").trim();
    if (!question || loading) return;
    const useMode = opts.mode || mode;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const turn = {
      id,
      question,
      mode: useMode,
      pending: true,
      createdAt: new Date().toISOString(),
    };
    setThread((prev) => [...prev, turn]);
    setQuery("");
    if (composerRef.current) composerRef.current.style.height = "auto";
    setLoading(true);

    // Send the last few turns so the copilot can carry context across
    // follow-ups without re-stating the original question. We trim aggressively
    // to keep payload small and avoid leaking unbounded history.
    const thread_context = thread
      .filter((t) => !t.pending && !t.errorMsg && (t.question || t.answer))
      .slice(-4)
      .map((t) => ({
        question: t.question,
        answer: (t.answer || "").slice(0, 1200),
      }));

    try {
      const response = await api.post(
        "/api/knowledge/ai/copilot/",
        {
          query: question,
          assistant_mode: useMode,
          execute: false,
          confirm_execute: false,
          max_actions: 3,
          thread_context,
        },
        { timeout: 90000 }
      );
      const data = response.data || {};
      const answer = data.answer || data.summary || "";
      const sources = normalizeSources(data);
      const involved = uniquePeople([
        ...detectInvolved(question),
        ...detectInvolved(answer),
      ]);
      setThread((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                pending: false,
                answer,
                sources,
                nextActions: normalizeActions(data),
                confidence: normalizeConfidence(data.confidence),
                followUps: data.follow_up_questions || data.followUpQuestions || [],
                requiresApproval: !!data.requires_approval_for_execution,
                involved,
                errorMsg: null,
              }
            : t
        )
      );
    } catch (err) {
      const timedOut = err?.code === "ECONNABORTED" || /timeout/i.test(err?.message || "");
      const detail = timedOut
        ? "Ask Recall took too long to respond. The model may be busy — try again."
        : err?.response?.data?.detail ||
          err?.response?.data?.error ||
          err?.message ||
          "Ask Recall is temporarily unavailable.";
      setThread((prev) =>
        prev.map((t) => (t.id === id ? { ...t, pending: false, errorMsg: detail } : t))
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    runQuery(query);
  };

  const handleExecute = async (turn) => {
    if (!canExecute || !turn?.nextActions?.length) return;
    const count = turn.nextActions.length;
    if (!window.confirm(`Run ${count} autonomous action${count === 1 ? "" : "s"}?`)) return;
    setExecutingId(turn.id);
    try {
      const response = await api.post(
        "/api/knowledge/ai/copilot/",
        {
          query: turn.question,
          assistant_mode: turn.mode,
          execute: true,
          confirm_execute: true,
        },
        { timeout: 90000 }
      );
      const data = response.data || {};
      setThread((prev) =>
        prev.map((t) =>
          t.id === turn.id
            ? {
                ...t,
                executed: !!(data.execution && data.execution.performed),
                answer: data.answer || t.answer,
                executionResult: data.execution || null,
                errorMsg: null,
              }
            : t
        )
      );
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.message || "Could not execute actions.";
      setThread((prev) =>
        prev.map((t) => (t.id === turn.id ? { ...t, errorMsg: detail } : t))
      );
    } finally {
      setExecutingId(null);
    }
  };

  const handleNewChat = () => {
    if (thread.length && !window.confirm("Clear this conversation?")) return;
    turnRefs.current = {};
    setThread([]);
    setQuery("");
    composerRef.current?.focus();
  };

  const handleDeleteTurn = (id) => {
    delete turnRefs.current[id];
    setThread((prev) => prev.filter((t) => t.id !== id));
  };

  const scrollToTurn = (id) => {
    turnRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const isEmpty = thread.length === 0;

  return (
    <div className="ar">
      <header className="ar-head">
        <div className="ar-head-title">
          <span className="ar-head-mark"><SparklesIcon /></span>
          <div>
            <h1>Ask Recall</h1>
            <p>
              Workspace copilot for {user?.organization_name || "your team"} — ask about anyone, any project, any decision.
            </p>
          </div>
        </div>
        <div className="ar-head-meta">
          {members.length ? (
            <span className="ar-head-people" title={`${members.length} teammates in this workspace`}>
              <UserGroupIcon />
              <span>{members.length} teammates</span>
            </span>
          ) : null}
          <button
            type="button"
            className="ar-agentbtn"
            onClick={() => navigate("/agent")}
            title="Switch to autonomous agent"
          >
            <BoltIcon />
            Run agent
          </button>
          <button type="button" className="ar-newbtn" onClick={handleNewChat}>
            <PlusIcon />
            New chat
          </button>
        </div>
      </header>

      <div className="ar-layout">
        <aside className="ar-rail">
          <span className="ar-rail-label">History</span>
          {isEmpty ? (
            <p className="ar-rail-empty">Your questions will show up here once you start asking.</p>
          ) : (
            [...thread].reverse().map((t) => (
              <div className="ar-rail-item" key={t.id}>
                <button type="button" className="ar-rail-btn" onClick={() => scrollToTurn(t.id)}>
                  <SparklesIcon />
                  <span style={{ minWidth: 0 }}>
                    <span className="ar-rail-q">{t.question}</span>
                    <span className="ar-rail-meta">{formatTime(t.createdAt)} · {t.mode}</span>
                  </span>
                </button>
                <button
                  type="button"
                  className="ar-rail-del"
                  aria-label="Remove"
                  onClick={() => handleDeleteTurn(t.id)}
                >
                  <TrashIcon />
                </button>
              </div>
            ))
          )}
        </aside>

        <div className="ar-main">
          {isEmpty ? (
            <div className="ar-convo">
              <div className="ar-empty">
                <span className="ar-empty-mark"><SparklesIcon /></span>
                <h2>Your workspace copilot</h2>
                <p>
                  Ask about anyone in {user?.organization_name || "your workspace"} — what they're working on, what decisions they own,
                  what's blocked. Recall pulls from pages, decisions, sprints, and tasks across the whole organization,
                  and shows its sources. Type <kbd className="ar-kbd-inline">@</kbd> to scope by person.
                </p>
                {members.length ? (
                  <div className="ar-team-strip">
                    {members.slice(0, 8).map((m) => (
                      <span key={m.id} title={m.name}>
                        <Avatar size="sm" name={m.name} src={m.avatar} />
                      </span>
                    ))}
                    {members.length > 8 ? (
                      <span className="ar-team-more">+{members.length - 8}</span>
                    ) : null}
                  </div>
                ) : null}
                <div className="ar-starters">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} type="button" className="ar-starter" onClick={() => runQuery(s)}>
                      <SparklesIcon />
                      <span>{s}</span>
                      <ArrowUpRightIcon className="ar-starter-go" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="ar-convo">
              <div className="ar-convo-inner">
                {thread.map((t) => (
                  <React.Fragment key={t.id}>
                    <div className="ar-user" ref={(el) => (turnRefs.current[t.id] = el)}>
                      {t.question}
                    </div>
                    <AssistantTurn
                      turn={t}
                      canExecute={canExecute}
                      executing={executingId === t.id}
                      onExecute={() => handleExecute(t)}
                      onFollowUp={(q) => runQuery(q)}
                      onRetry={() => runQuery(t.question, { mode: t.mode })}
                      onSave={() => saveTurn(user, t)}
                    />
                  </React.Fragment>
                ))}
                <div ref={convoEndRef} />
              </div>
            </div>
          )}

          <div className="ar-composer-wrap">
            <form className="ar-composer" onSubmit={handleSubmit}>
              <div className="ar-modes">
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    title={m.description}
                    className={`ar-mode ${mode === m.id ? "is-active" : ""}`}
                    onClick={() => setMode(m.id)}
                  >
                    {m.label}
                  </button>
                ))}
                <span className="ar-kbd">{SEND_HINT}</span>
              </div>
              <div className={`ar-input ${focused ? "is-focused" : ""}`}>
                <textarea
                  ref={composerRef}
                  value={query}
                  rows={1}
                  placeholder="Ask about anyone — type @ to mention a teammate"
                  onFocus={() => setFocused(true)}
                  onBlur={() => {
                    setFocused(false);
                    // Small delay so a click on the mention popup still registers.
                    setTimeout(() => setMention(null), 120);
                  }}
                  onChange={(e) => {
                    const value = e.target.value;
                    setQuery(value);
                    autoGrow(e.target);
                    const caret = e.target.selectionStart || 0;
                    const next = detectMention(value, caret);
                    setMention(next);
                    setMentionIndex(0);
                  }}
                  onKeyUp={(e) => {
                    const ta = e.target;
                    const caret = ta.selectionStart || 0;
                    setMention(detectMention(ta.value, caret));
                  }}
                  onKeyDown={(e) => {
                    if (mention && mentionSuggestions.length) {
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setMentionIndex((i) => Math.min(i + 1, mentionSuggestions.length - 1));
                        return;
                      }
                      if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setMentionIndex((i) => Math.max(i - 1, 0));
                        return;
                      }
                      if (e.key === "Enter" || e.key === "Tab") {
                        e.preventDefault();
                        applyMention(mentionSuggestions[mentionIndex]);
                        return;
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        setMention(null);
                        return;
                      }
                    }
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey || !e.shiftKey)) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
                <button
                  type="submit"
                  className="ar-send"
                  disabled={loading || !query.trim()}
                  aria-label="Ask"
                >
                  {loading ? <span className="ar-spinner" /> : <PaperAirplaneIcon />}
                </button>
                {mention && mentionSuggestions.length ? (
                  <div className="ar-mention-pop" role="listbox">
                    <p className="ar-mention-label">People</p>
                    {mentionSuggestions.map((m, i) => (
                      <button
                        key={m.id}
                        type="button"
                        role="option"
                        aria-selected={i === mentionIndex}
                        className={`ar-mention-row ${i === mentionIndex ? "is-active" : ""}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => applyMention(m)}
                      >
                        <Avatar size="sm" name={m.name} src={m.avatar} />
                        <span className="ar-mention-text">
                          <span>{m.name}</span>
                          {m.role ? <span className="ar-mention-meta">{m.role}</span> : null}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function AssistantTurn({ turn, canExecute, executing, onExecute, onFollowUp, onRetry, onSave }) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(turn.answer || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (_) {}
  };

  const handleSave = () => {
    if (!turn.answer || saved) return;
    try {
      onSave?.();
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (_) {}
  };

  const sources = (turn.sources || []).slice(0, 6);
  const actions = turn.nextActions || [];

  return (
    <div className="ar-bot">
      <span className="ar-bot-avatar"><SparklesIcon /></span>
      <div className="ar-bot-body">
        <div className="ar-bot-head">
          <span className="ar-bot-name">Ask Recall</span>
          <span className="ar-bot-mode">{turn.mode}</span>
          {typeof turn.confidence === "number" ? (
            <span className="ar-confidence">
              Confidence <b>{turn.confidence}%</b>
            </span>
          ) : null}
        </div>

        {turn.pending ? (
          <div className="ar-thinking" aria-label="Thinking">
            <span /><span /><span />
          </div>
        ) : turn.errorMsg ? (
          <div className="ar-turn-error">
            <span>{turn.errorMsg}</span>
            {onRetry ? (
              <button type="button" className="ar-retry" onClick={onRetry}>Try again</button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="ar-answer">{turn.answer || "No answer was returned."}</div>

            {turn.involved && turn.involved.length ? (
              <div className="ar-involved">
                <BuildingOffice2Icon />
                <span className="ar-involved-label">People involved</span>
                <span className="ar-involved-list">
                  {turn.involved.map((p) => (
                    <span key={p.id} className="ar-involved-row" title={p.name}>
                      <Avatar size="sm" name={p.name} src={p.avatar} />
                      <span>{p.name}</span>
                    </span>
                  ))}
                </span>
              </div>
            ) : null}

            {actions.length ? (
              <div className="ar-actions-box">
                <p className="ar-mini-label">Suggested actions</p>
                {actions.map((a, i) => {
                  const inner = (
                    <>
                      <ArrowRightIcon />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block", fontWeight: 600 }}>{a.title}</span>
                        {a.description ? (
                          <span style={{ display: "block", fontSize: 12, color: "var(--app-muted)", marginTop: 2 }}>
                            {a.description}
                          </span>
                        ) : null}
                      </span>
                      {a.impact ? (
                        <Lozenge variant={a.impact === "high" || a.impact === "critical" ? "removed" : a.impact === "medium" ? "moved" : "default"}>
                          {a.impact}
                        </Lozenge>
                      ) : null}
                    </>
                  );
                  if (a.url) {
                    const isExternal = /^https?:\/\//i.test(a.url);
                    if (isExternal) {
                      return (
                        <a
                          key={a.id || i}
                          className="ar-action"
                          href={a.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {inner}
                        </a>
                      );
                    }
                    return (
                      <Link key={a.id || i} className="ar-action" to={a.url}>
                        {inner}
                      </Link>
                    );
                  }
                  return (
                    <div className="ar-action" key={a.id || i}>
                      {inner}
                    </div>
                  );
                })}
              </div>
            ) : null}

            {sources.length ? (
              <div className="ar-sources">
                <p className="ar-mini-label">Sources</p>
                <div className="ar-sources-grid">
                  {sources.map((src, i) => {
                    const isExternal = src.url && /^https?:\/\//i.test(src.url);
                    const body = (
                      <>
                        <div className="ar-source-top">
                          <DocumentTextIcon />
                          <span className="ar-source-title">{src.title || src.snippet || "Source"}</span>
                        </div>
                        {src.snippet ? <p className="ar-source-snippet">{src.snippet}</p> : null}
                        {src.kind || typeof src.relevance === "number" || src.direct ? (
                          <div className="ar-source-meta">
                            {src.kind ? <Lozenge>{src.kind}</Lozenge> : null}
                            {src.direct ? <Lozenge variant="success">Direct match</Lozenge> : null}
                            {typeof src.relevance === "number" ? (
                              <span style={{ fontSize: 11, color: "var(--app-muted)" }}>
                                {Math.round(src.relevance * 100)}% match
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </>
                    );
                    if (!src.url) {
                      return <div key={src.id || i} className="ar-source">{body}</div>;
                    }
                    if (isExternal) {
                      return (
                        <a
                          key={src.id || i}
                          className="ar-source"
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {body}
                        </a>
                      );
                    }
                    return (
                      <Link key={src.id || i} className="ar-source" to={src.url}>
                        {body}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="ar-tools">
              <button type="button" className="ar-tool" onClick={handleCopy}>
                {copied ? <CheckIcon /> : <ClipboardIcon />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                type="button"
                className="ar-tool"
                onClick={handleSave}
                disabled={!turn.answer || saved}
                aria-label="Save answer"
                title={saved ? "Saved" : "Save this answer to your bookmarks"}
              >
                {saved ? <CheckIcon /> : <BookmarkIcon />}
                {saved ? "Saved" : "Save"}
              </button>
              {canExecute && actions.length && turn.requiresApproval && !turn.executed ? (
                <button
                  type="button"
                  className="ar-tool is-primary"
                  onClick={onExecute}
                  disabled={executing}
                >
                  {executing ? "Running…" : `Run ${actions.length} action${actions.length === 1 ? "" : "s"}`}
                </button>
              ) : null}
              {turn.executed ? (
                <span className="ar-tool" style={{ color: "var(--app-success)" }}>
                  <CheckIcon />
                  Actions run
                </span>
              ) : null}
            </div>

            {(turn.followUps || []).length ? (
              <div className="ar-followups">
                <span className="ar-followups-label">Try next:</span>
                {turn.followUps.slice(0, 4).map((q, i) => (
                  <button key={i} type="button" className="ar-chip" onClick={() => onFollowUp(q)}>
                    {q}
                  </button>
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
