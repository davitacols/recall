import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowRightIcon,
  CheckIcon,
  ChevronDownIcon,
  ClipboardIcon,
  CommandLineIcon,
  CpuChipIcon,
  ExclamationTriangleIcon,
  PaperAirplaneIcon,
  PlusIcon,
  ShieldCheckIcon,
  SparklesIcon,
  StopIcon,
  XMarkIcon,
  CheckCircleIcon,
  ClockIcon,
  EllipsisHorizontalIcon,
  PauseCircleIcon,
} from "@heroicons/react/24/outline";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import api from "../services/api";
import { useAuth } from "../hooks/useAuth";
import "./Agent.css";

// ---------- markdown ----------

const MARKDOWN_PLUGINS = [remarkGfm];
const MARKDOWN_COMPONENTS = {
  a: ({ node, children, ...props }) => (
    <a target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  ),
  code: ({ inline, className, children, ...props }) => {
    if (inline) {
      return (
        <code className="ag-inline-code" {...props}>
          {children}
        </code>
      );
    }
    return (
      <pre className="ag-code">
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    );
  },
};

function Markdown({ children, className = "" }) {
  return (
    <div className={`ag-md ${className}`}>
      <ReactMarkdown remarkPlugins={MARKDOWN_PLUGINS} components={MARKDOWN_COMPONENTS}>
        {String(children || "")}
      </ReactMarkdown>
    </div>
  );
}

// ---------- constants ----------

const STATUS_LABEL = {
  running: "running",
  awaiting_approval: "needs approval",
  completed: "complete",
  failed: "failed",
  cancelled: "cancelled",
};

const STATUS_TONE = {
  running: "running",
  awaiting_approval: "warn",
  completed: "ok",
  failed: "err",
  cancelled: "muted",
};

const FALLBACK_PROFILE = {
  slug: "general",
  name: "General",
  tagline: "Reasons across the whole workspace.",
  description: "Use this when you don't know which specialist applies — the general agent has access to every tool.",
  starter_goals: [
    "Summarize this week's decisions and flag any with drifted predictions.",
    "Audit open issues across all projects and suggest a triage order.",
    "Draft a status update from the last 7 days of activity.",
  ],
};

// ---------- helpers ----------

function timeAgo(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const sec = Math.max(1, Math.round((Date.now() - d.getTime()) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const m = Math.round(sec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function dayBucket(value) {
  if (!value) return "Earlier";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "Earlier";
  const now = new Date();
  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, now)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";
  if (now - d < 7 * 86400000) return "This week";
  return "Earlier";
}

function groupRuns(runs) {
  const map = new Map();
  for (const r of runs) {
    const k = dayBucket(r.created_at);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(r);
  }
  return [...map.entries()];
}

function safeStringify(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch (_) {
    return String(value);
  }
}

function truncate(value, max = 60) {
  const s = String(value ?? "");
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function summarizeOutput(name, out) {
  if (out == null) return "ok";
  if (typeof out === "string") return truncate(out, 80);
  if (Array.isArray(out)) return `${out.length} item${out.length === 1 ? "" : "s"}`;
  if (typeof out === "object") {
    const keys = Object.keys(out);
    if (keys.length === 1) return `${keys[0]}: ${truncate(JSON.stringify(out[keys[0]]), 40)}`;
    return `${keys.length} field${keys.length === 1 ? "" : "s"}`;
  }
  return String(out);
}

// ---------- page ----------

export default function Agent() {
  const { runId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [goal, setGoal] = useState("");
  const composerRef = useRef(null);

  const [run, setRun] = useState(null);
  const [runs, setRuns] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const traceEndRef = useRef(null);

  const [profiles, setProfiles] = useState([FALLBACK_PROFILE]);
  const [profileSlug, setProfileSlug] = useState(() => {
    try {
      return localStorage.getItem("agentProfileSlug") || "general";
    } catch (_) {
      return "general";
    }
  });
  const [profilePickerOpen, setProfilePickerOpen] = useState(false);

  const activeProfile = useMemo(
    () => profiles.find((p) => p.slug === profileSlug) || profiles[0] || FALLBACK_PROFILE,
    [profiles, profileSlug]
  );

  // ----- data -----

  const fetchRuns = useCallback(async () => {
    try {
      const { data } = await api.get("/api/knowledge/ai/agent/runs/");
      setRuns(Array.isArray(data?.results) ? data.results : []);
    } catch (_) {}
  }, []);

  const fetchRun = useCallback(async (id) => {
    if (!id) return;
    try {
      const { data } = await api.get(`/api/knowledge/ai/agent/runs/${id}/`);
      setRun(data);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Could not load run");
    }
  }, []);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  useEffect(() => {
    if (runId) fetchRun(runId);
    else setRun(null);
  }, [runId, fetchRun]);

  useEffect(() => {
    let mounted = true;
    api
      .get("/api/knowledge/ai/agent/profiles/")
      .then(({ data }) => {
        if (!mounted) return;
        const list = Array.isArray(data?.results) ? data.results : [];
        if (list.length) setProfiles(list);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    traceEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [run?.steps?.length, run?.status]);

  // WebSocket live trace
  useEffect(() => {
    if (!run?.id || run.status !== "running") return undefined;
    let socket = null;
    try {
      const token = localStorage.getItem("access_token") || "";
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const url = `${proto}//${window.location.host}/ws/agent/runs/${run.id}/${
        token ? `?token=${encodeURIComponent(token)}` : ""
      }`;
      socket = new WebSocket(url);
      socket.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data || "{}");
          if (msg.type === "step") {
            const { type: _t, ...step } = msg;
            setRun((prev) => (prev ? { ...prev, steps: [...(prev.steps || []), step] } : prev));
          } else if (msg.type === "status") {
            setRun((prev) =>
              prev
                ? {
                    ...prev,
                    status: msg.status || prev.status,
                    final_answer: msg.final_answer ?? prev.final_answer,
                    pending_tool_calls: msg.pending_tool_calls ?? prev.pending_tool_calls,
                  }
                : prev
            );
            if (msg.status && msg.status !== "running") fetchRuns();
          }
        } catch (_) {}
      };
      socket.onerror = () => {};
    } catch (_) {
      socket = null;
    }
    return () => {
      try {
        if (socket && socket.readyState <= 1) socket.close();
      } catch (_) {}
    };
  }, [run?.id, run?.status, fetchRuns]);

  // polling fallback
  useEffect(() => {
    if (!run?.id || run.status !== "running") return undefined;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      try {
        const { data } = await api.get(`/api/knowledge/ai/agent/runs/${run.id}/`);
        if (cancelled) return;
        setRun(data);
        if (data.status === "running") setTimeout(tick, 3000);
        else fetchRuns();
      } catch (_) {
        if (!cancelled) setTimeout(tick, 5000);
      }
    };
    const t = setTimeout(tick, 3000);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [run?.id, run?.status, fetchRuns]);

  // ----- actions -----

  const handlePickProfile = (slug) => {
    setProfileSlug(slug);
    setProfilePickerOpen(false);
    try {
      localStorage.setItem("agentProfileSlug", slug);
    } catch (_) {}
  };

  const handleStart = async (text) => {
    const goalText = (text || goal).trim();
    if (!goalText || busy) return;
    setError("");
    setBusy(true);
    setGoal("");
    if (composerRef.current) composerRef.current.style.height = "auto";
    try {
      const { data } = await api.post(
        "/api/knowledge/ai/agent/start/",
        { goal: goalText, profile_slug: profileSlug || "general" },
        { timeout: 180000 }
      );
      setRun(data);
      navigate(`/agent/${data.id}`, { replace: true });
      fetchRuns();
    } catch (err) {
      const timedOut = err?.code === "ECONNABORTED";
      setError(
        timedOut
          ? "Agent took too long. Try a more focused goal."
          : err?.response?.data?.error || err?.message || "Could not start agent."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleApprove = async (decisions) => {
    if (!run || !decisions?.length) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post(
        `/api/knowledge/ai/agent/runs/${run.id}/approve/`,
        { decisions },
        { timeout: 180000 }
      );
      setRun(data);
      fetchRuns();
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Could not resume agent.");
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!run) return;
    try {
      const { data } = await api.post(`/api/knowledge/ai/agent/runs/${run.id}/cancel/`);
      setRun(data);
      fetchRuns();
    } catch (_) {}
  };

  const handleNewRun = () => {
    setRun(null);
    navigate("/agent", { replace: true });
    setTimeout(() => composerRef.current?.focus(), 50);
  };

  return (
    <div className="ag">
      <header className="ag-header">
        <div className="ag-header-left">
          <span className="ag-monogram" aria-hidden="true">A</span>
          <div className="ag-header-text">
            <h1>Agent</h1>
            <p>Autonomous specialist for {user?.organization_name || "your workspace"}.</p>
          </div>
        </div>
        <div className="ag-header-right">
          <button
            type="button"
            className="ag-chip"
            onClick={() => setProfilePickerOpen(true)}
            title="Switch specialist"
          >
            <span>{activeProfile?.name || "General"}</span>
            <ChevronDownIcon />
          </button>
          <Link to="/agent/audit" className="ag-chip" title="Workspace audit log">
            <ShieldCheckIcon />
            <span>Audit</span>
          </Link>
          {run ? (
            <button type="button" className="ag-btn" onClick={handleNewRun}>
              <PlusIcon /> New run
            </button>
          ) : null}
        </div>
      </header>

      <div className="ag-grid">
        <RunRail runs={runs} activeId={run?.id} />

        <section className="ag-main">
          {error ? (
            <div className="ag-error">
              <ExclamationTriangleIcon />
              <span>{error}</span>
            </div>
          ) : null}

          {!run ? (
            <Empty
              profile={activeProfile}
              busy={busy}
              onPick={handleStart}
              onOpenProfilePicker={() => setProfilePickerOpen(true)}
            />
          ) : (
            <RunView run={run} busy={busy} onApprove={handleApprove} onCancel={handleCancel} />
          )}

          <div ref={traceEndRef} />
        </section>
      </div>

      <Composer
        ref={composerRef}
        value={goal}
        onChange={setGoal}
        onSubmit={() => handleStart()}
        busy={busy}
        profile={activeProfile}
        onOpenProfilePicker={() => setProfilePickerOpen(true)}
        hasRun={!!run}
      />

      {profilePickerOpen ? (
        <ProfilePicker
          profiles={profiles}
          activeSlug={profileSlug}
          onPick={handlePickProfile}
          onClose={() => setProfilePickerOpen(false)}
        />
      ) : null}
    </div>
  );
}

// ---------- run rail ----------

function RunRail({ runs, activeId }) {
  const groups = useMemo(() => groupRuns(runs), [runs]);
  return (
    <aside className="ag-rail">
      <div className="ag-rail-head">
        <span>Runs</span>
        <span className="ag-rail-count">{runs.length}</span>
      </div>
      {runs.length === 0 ? (
        <p className="ag-rail-empty">No runs yet.</p>
      ) : (
        groups.map(([label, list]) => (
          <div key={label} className="ag-rail-group">
            <p className="ag-rail-group-label">{label}</p>
            {list.map((r) => {
              const isActive = activeId === r.id;
              return (
                <Link
                  key={r.id}
                  to={`/agent/${r.id}`}
                  className={`ag-rail-row${isActive ? " is-active" : ""}`}
                >
                  <span className="ag-rail-goal">{r.goal}</span>
                  <span className="ag-rail-meta">
                    <span className={`ag-dot ag-dot-${STATUS_TONE[r.status] || "muted"}`} />
                    <span>{STATUS_LABEL[r.status] || r.status}</span>
                    <span aria-hidden="true">·</span>
                    <span>{timeAgo(r.created_at)}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        ))
      )}
    </aside>
  );
}

// ---------- empty state ----------

function Empty({ profile, busy, onPick, onOpenProfilePicker }) {
  const starters = profile?.starter_goals?.length ? profile.starter_goals : FALLBACK_PROFILE.starter_goals;
  return (
    <div className="ag-empty">
      <div className="ag-empty-head">
        <p className="ag-empty-eyebrow">Specialist</p>
        <h2>{profile?.name || "General"}</h2>
        <p className="ag-empty-tagline">{profile?.description || profile?.tagline}</p>
        <button type="button" className="ag-link" onClick={onOpenProfilePicker}>
          Switch specialist <ChevronDownIcon />
        </button>
      </div>
      <div className="ag-empty-divider">Start with</div>
      <ul className="ag-starters">
        {starters.map((s) => (
          <li key={s}>
            <button type="button" className="ag-starter" onClick={() => onPick(s)} disabled={busy}>
              <span>{s}</span>
              <ArrowRightIcon />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- run view ----------

function RunView({ run, busy, onApprove, onCancel }) {
  const tone = STATUS_TONE[run.status] || "running";
  const stepsCount = (run.steps || []).length;
  const profile = run.profile;

  return (
    <div className="ag-run">
      <div className="ag-run-head">
        <p className="ag-run-goal">{run.goal}</p>
        <div className="ag-run-meta">
          <span className={`ag-status ag-status-${tone}`}>
            <span className={`ag-dot ag-dot-${tone}`} />
            {STATUS_LABEL[run.status] || run.status}
          </span>
          {profile ? <span className="ag-run-meta-item">{profile.name}</span> : null}
          <span className="ag-run-meta-item">
            <ClockIcon /> {run.iterations} iteration{run.iterations === 1 ? "" : "s"}
          </span>
          <span className="ag-run-meta-item">{stepsCount} step{stepsCount === 1 ? "" : "s"}</span>
          <span className="ag-run-meta-item">{timeAgo(run.created_at)}</span>
          {run.status === "running" || run.status === "awaiting_approval" ? (
            <button type="button" className="ag-cancel" onClick={onCancel}>
              <StopIcon /> Cancel
            </button>
          ) : null}
        </div>
      </div>

      {run.status === "awaiting_approval" && run.pending_tool_calls?.length ? (
        <ApprovalSheet pending={run.pending_tool_calls} busy={busy} onSubmit={onApprove} />
      ) : null}

      <Trace steps={run.steps || []} status={run.status} />

      {run.final_answer ? <FinalAnswerCard text={run.final_answer} /> : null}

      {run.status === "failed" && run.error ? (
        <div className="ag-error ag-error-block">
          <ExclamationTriangleIcon />
          <span>{run.error}</span>
        </div>
      ) : null}
    </div>
  );
}

function FinalAnswerCard({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (_) {}
  };
  return (
    <div className="ag-final">
      <div className="ag-final-head">
        <span className="ag-final-label">Answer</span>
        <button type="button" className="ag-final-copy" onClick={copy}>
          {copied ? <CheckIcon /> : <ClipboardIcon />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <Markdown className="ag-final-body">{text}</Markdown>
    </div>
  );
}

// ---------- trace ----------

function Trace({ steps, status }) {
  const items = useMemo(() => {
    const list = steps || [];
    const paired = [];
    const byCall = new Map();
    for (let i = 0; i < list.length; i += 1) {
      const s = list[i];
      if (s.kind === "tool_call") {
        const call = { kind: "tool", call: s, result: null };
        byCall.set(s.payload?.id, call);
        paired.push(call);
      } else if (s.kind === "tool_result") {
        const callId = s.payload?.tool_call_id;
        const target = byCall.get(callId);
        if (target) target.result = s;
        else paired.push({ kind: "result_only", result: s });
      } else {
        paired.push({ kind: s.kind, payload: s.payload });
      }
    }
    return paired;
  }, [steps]);

  if (!items.length) return null;

  const running = status === "running";

  return (
    <ol className="ag-trace">
      {items.map((item, i) => (
        <TraceRow key={i} item={item} />
      ))}
      {running ? (
        <li className="ag-trace-row ag-trace-pulse">
          <span className="ag-trace-marker">…</span>
          <span className="ag-trace-pulse-text">Thinking</span>
        </li>
      ) : null}
    </ol>
  );
}

function TraceRow({ item }) {
  if (item.kind === "user_goal") {
    return (
      <li className="ag-trace-row ag-trace-row-goal">
        <span className="ag-trace-marker">you</span>
        <p className="ag-trace-text">{item.payload?.text}</p>
      </li>
    );
  }
  if (item.kind === "thought") {
    return (
      <li className="ag-trace-row ag-trace-row-thought">
        <span className="ag-trace-marker">think</span>
        <Markdown className="ag-trace-text">{item.payload?.text}</Markdown>
      </li>
    );
  }
  if (item.kind === "tool") {
    return <ToolRow call={item.call} result={item.result} />;
  }
  if (item.kind === "result_only") {
    return (
      <li className="ag-trace-row ag-trace-row-result">
        <span className="ag-trace-marker">out</span>
        <pre className="ag-pre">{safeStringify(item.result?.payload)}</pre>
      </li>
    );
  }
  if (item.kind === "final") return null;
  return null;
}

function ToolRow({ call, result }) {
  const [expanded, setExpanded] = useState(false);
  const payload = call?.payload || {};
  const resPayload = result?.payload || {};
  const isWrite = !!payload.is_write;
  const resultError = resPayload.error;
  const resultDenied = resPayload.denied;
  const resultOutput = resPayload.output;
  const resultPending = !result && !resPayload.output;

  let stateClass = "is-pending";
  let stateText = isWrite ? "awaiting approval" : "running";
  if (result) {
    if (resultError) {
      stateClass = "is-error";
      stateText = `error · ${truncate(resultError, 60)}`;
    } else if (resultDenied) {
      stateClass = "is-denied";
      stateText = `denied${resPayload.reason ? ` · ${resPayload.reason}` : ""}`;
    } else if (resPayload.executed) {
      stateClass = "is-ok";
      stateText = `executed · ${summarizeOutput(payload.name, resultOutput)}`;
    } else if (resultOutput !== undefined) {
      stateClass = "is-ok";
      stateText = summarizeOutput(payload.name, resultOutput);
    } else {
      stateText = isWrite ? "awaiting approval" : "done";
    }
  }

  return (
    <li className={`ag-trace-row ag-trace-row-tool${isWrite ? " is-write" : ""}`}>
      <span className="ag-trace-marker">
        <CommandLineIcon />
      </span>
      <div className="ag-tool">
        <button
          type="button"
          className="ag-tool-head"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          <code className="ag-tool-name">{payload.name}</code>
          {isWrite ? <span className="ag-tool-tag">write</span> : null}
          <ChevronDownIcon className={`ag-tool-chev${expanded ? " is-open" : ""}`} />
        </button>
        <p className={`ag-tool-state ${stateClass}`}>
          {resultPending ? <span className="ag-spinner" /> : null}
          <span>{stateText}</span>
        </p>
        {expanded ? (
          <div className="ag-tool-expand">
            <p className="ag-mini-label">Input</p>
            <pre className="ag-pre">{safeStringify(payload.input || {})}</pre>
            {result ? (
              <>
                <p className="ag-mini-label">{resultError ? "Error" : "Output"}</p>
                <pre className="ag-pre">{safeStringify(resultError || resultOutput || resPayload)}</pre>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}

// ---------- approval ----------

function ApprovalSheet({ pending, busy, onSubmit }) {
  const [overrides, setOverrides] = useState({});
  const [denied, setDenied] = useState({});
  const [reasons, setReasons] = useState({});

  const updateField = (id, field, value) => {
    setOverrides((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), [field]: value } }));
  };

  const submit = (approveAll) => {
    const decisions = pending.map((p) => {
      const approved = approveAll && !denied[p.id];
      const editedInput = overrides[p.id] ? { ...(p.input || {}), ...overrides[p.id] } : null;
      const decision = { id: p.id, approved };
      if (editedInput) decision.edited_input = editedInput;
      if (!approved && reasons[p.id]) decision.reason = reasons[p.id];
      return decision;
    });
    onSubmit(decisions);
  };

  return (
    <div className="ag-approval">
      <div className="ag-approval-head">
        <PauseCircleIcon />
        <div>
          <p className="ag-approval-title">
            {pending.length} write action{pending.length === 1 ? "" : "s"} need approval
          </p>
          <p className="ag-approval-sub">Edit inputs and approve, or deny individual ones with a reason.</p>
        </div>
      </div>
      <ul className="ag-approval-list">
        {pending.map((p) => {
          const input = { ...(p.input || {}), ...(overrides[p.id] || {}) };
          const isDenied = !!denied[p.id];
          return (
            <li key={p.id} className={`ag-approval-row${isDenied ? " is-denied" : ""}`}>
              <div className="ag-approval-row-head">
                <code className="ag-approval-name">{p.name}</code>
                <button
                  type="button"
                  className={`ag-approval-deny${isDenied ? " is-on" : ""}`}
                  aria-pressed={isDenied}
                  onClick={() => setDenied((d) => ({ ...d, [p.id]: !d[p.id] }))}
                >
                  {isDenied ? "Will deny" : "Deny"}
                </button>
              </div>
              {p.description ? <p className="ag-approval-desc">{p.description}</p> : null}
              <div className="ag-approval-fields">
                {Object.entries(input).map(([key, value]) => (
                  <label key={key} className="ag-approval-field">
                    <span>{key}</span>
                    <input
                      type="text"
                      value={value === null || value === undefined ? "" : String(value)}
                      onChange={(e) => updateField(p.id, key, e.target.value)}
                      disabled={isDenied}
                    />
                  </label>
                ))}
                {isDenied ? (
                  <label className="ag-approval-field">
                    <span>reason</span>
                    <input
                      type="text"
                      value={reasons[p.id] || ""}
                      onChange={(e) => setReasons((r) => ({ ...r, [p.id]: e.target.value }))}
                      placeholder="Why are you denying this"
                    />
                  </label>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="ag-approval-footer">
        <button type="button" className="ag-btn" onClick={() => submit(false)} disabled={busy}>
          <XMarkIcon /> Deny all
        </button>
        <button type="button" className="ag-btn ag-btn-primary" onClick={() => submit(true)} disabled={busy}>
          <CheckIcon /> {busy ? "Running…" : "Approve and run"}
        </button>
      </div>
    </div>
  );
}

// ---------- composer ----------

const Composer = React.forwardRef(function Composer(
  { value, onChange, onSubmit, busy, profile, onOpenProfilePicker, hasRun },
  ref
) {
  const autoGrow = (el) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };
  return (
    <form
      className="ag-composer"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <button
        type="button"
        className="ag-composer-profile"
        onClick={onOpenProfilePicker}
        title={`Specialist: ${profile?.name || "General"}`}
      >
        <span>{profile?.name || "General"}</span>
        <ChevronDownIcon />
      </button>
      <textarea
        ref={ref}
        value={value}
        rows={1}
        placeholder={
          hasRun
            ? "Start another run…"
            : "Give the agent a goal — it'll plan, search workspace memory, and propose actions."
        }
        onChange={(e) => {
          onChange(e.target.value);
          autoGrow(e.target);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey || !e.shiftKey)) {
            e.preventDefault();
            onSubmit();
          }
        }}
      />
      <button
        type="submit"
        className="ag-composer-send"
        disabled={busy || !value.trim()}
        aria-label="Run agent"
      >
        {busy ? <span className="ag-spinner" /> : <PaperAirplaneIcon />}
      </button>
    </form>
  );
});

// ---------- profile picker ----------

function ProfilePicker({ profiles, activeSlug, onPick, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className="ag-picker-back" onClick={onClose} />
      <div className="ag-picker" role="dialog" aria-modal="true">
        <div className="ag-picker-head">
          <p>Choose a specialist</p>
          <button type="button" onClick={onClose} aria-label="Close">
            <XMarkIcon />
          </button>
        </div>
        <ul className="ag-picker-list">
          {profiles.map((p) => {
            const isActive = p.slug === activeSlug;
            return (
              <li key={p.slug}>
                <button
                  type="button"
                  className={`ag-picker-row${isActive ? " is-active" : ""}`}
                  onClick={() => onPick(p.slug)}
                >
                  <div className="ag-picker-row-head">
                    <span className="ag-picker-name">{p.name}</span>
                    {isActive ? <CheckIcon className="ag-picker-check" /> : null}
                  </div>
                  <p className="ag-picker-tagline">{p.tagline}</p>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
