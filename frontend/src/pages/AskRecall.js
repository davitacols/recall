import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  BookmarkIcon,
  CheckIcon,
  ClipboardIcon,
  DocumentTextIcon,
  PaperAirplaneIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { Lozenge } from "../components/atlas";
import "./AskRecall.css";

const THREAD_KEY = "atlasAskRecallThreadV1";

const SUGGESTIONS = [
  "Summarize this week's key decisions and who owns them.",
  "What's blocking the current sprint?",
  "Draft a status update for our leadership review.",
  "What recently changed in the workspace I should know about?",
];

const MODES = [
  { id: "ground", label: "Ground", description: "Cite evidence from workspace memory." },
  { id: "draft", label: "Draft", description: "Produce a polished written artifact." },
  { id: "plan", label: "Plan", description: "Propose next steps and owners." },
];

function loadThread() {
  try {
    return JSON.parse(localStorage.getItem(THREAD_KEY) || "[]") || [];
  } catch (_) {
    return [];
  }
}

function persistThread(items) {
  try {
    localStorage.setItem(THREAD_KEY, JSON.stringify(items.slice(-20)));
  } catch (_) {}
}

function formatTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export default function AskRecall() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("ground");
  const [thread, setThread] = useState(() => loadThread());
  const [loading, setLoading] = useState(false);
  const [executingId, setExecutingId] = useState(null);
  const [focused, setFocused] = useState(false);
  const composerRef = useRef(null);
  const convoEndRef = useRef(null);
  const turnRefs = useRef({});

  const canExecute = useMemo(
    () => ["admin", "manager"].includes(user?.role),
    [user]
  );

  useEffect(() => {
    persistThread(thread);
  }, [thread]);

  useEffect(() => {
    convoEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [thread.length, loading]);

  const autoGrow = (el) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

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

    try {
      const response = await api.post(
        "/api/knowledge/ai/copilot/",
        {
          query: question,
          assistant_mode: useMode,
          execute: false,
          confirm_execute: false,
          max_actions: 3,
        },
        { timeout: 90000 }
      );
      const data = response.data || {};
      setThread((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                pending: false,
                answer: data.answer || data.summary || "",
                sources: data.sources || data.citations || [],
                nextActions: data.next_actions || data.nextActions || [],
                confidence: data.confidence ?? null,
                followUps: data.follow_up_questions || data.followUpQuestions || [],
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
            ? { ...t, executed: true, answer: data.answer || t.answer }
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
    setThread([]);
    setQuery("");
    composerRef.current?.focus();
  };

  const handleDeleteTurn = (id) => {
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
            <p>Grounded answers, drafts, and plans from your workspace memory.</p>
          </div>
        </div>
        <button type="button" className="ar-newbtn" onClick={handleNewChat}>
          <PlusIcon />
          New chat
        </button>
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
                <h2>Ground every answer in your workspace</h2>
                <p>
                  Ask a question, draft an artifact, or plan next steps.
                  Recall pulls from your pages, decisions, meetings, and tasks — and shows its sources.
                </p>
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
                <span className="ar-kbd">⌘ + ⏎ to send</span>
              </div>
              <div className={`ar-input ${focused ? "is-focused" : ""}`}>
                <textarea
                  ref={composerRef}
                  value={query}
                  rows={1}
                  placeholder="Ask anything about this workspace…"
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    autoGrow(e.target);
                  }}
                  onKeyDown={(e) => {
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
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function AssistantTurn({ turn, canExecute, executing, onExecute, onFollowUp, onRetry }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(turn.answer || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
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
              Confidence <b>{Math.round(turn.confidence * 100)}%</b>
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

            {actions.length ? (
              <div className="ar-actions-box">
                <p className="ar-mini-label">Suggested actions</p>
                {actions.map((a, i) => (
                  <div className="ar-action" key={i}>
                    <ArrowRightIcon />
                    <span>{a.description || a.label || a.action || JSON.stringify(a)}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {sources.length ? (
              <div className="ar-sources">
                <p className="ar-mini-label">Sources</p>
                <div className="ar-sources-grid">
                  {sources.map((src, i) => {
                    const Tag = src.url ? Link : "div";
                    const props = src.url ? { to: src.url } : {};
                    return (
                      <Tag key={src.id || i} className="ar-source" {...props}>
                        <div className="ar-source-top">
                          <DocumentTextIcon />
                          <span className="ar-source-title">{src.title || src.snippet || "Source"}</span>
                        </div>
                        {src.snippet ? <p className="ar-source-snippet">{src.snippet}</p> : null}
                        {src.kind || typeof src.relevance === "number" ? (
                          <div className="ar-source-meta">
                            {src.kind ? <Lozenge>{src.kind}</Lozenge> : null}
                            {typeof src.relevance === "number" ? (
                              <span style={{ fontSize: 11, color: "var(--app-muted)" }}>
                                {Math.round(src.relevance * 100)}% match
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </Tag>
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
              <button type="button" className="ar-tool">
                <BookmarkIcon />
                Save
              </button>
              {canExecute && actions.length && !turn.executed ? (
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
