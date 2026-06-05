import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowRightIcon,
  ArrowsPointingOutIcon,
  ArrowUpRightIcon,
  CheckCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  ClockIcon,
  CommandLineIcon,
  CpuChipIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  PaperAirplaneIcon,
  PauseCircleIcon,
  PlusIcon,
  RocketLaunchIcon,
  SparklesIcon,
  StopIcon,
  XMarkIcon,
  BoltIcon,
} from "@heroicons/react/24/outline";
import api from "../../services/api";
import { useAgentDock } from "./AgentDockContext";
import "./AgentDock.css";

const PROFILE_ICON = {
  cpu: CpuChipIcon,
  rocket: RocketLaunchIcon,
  check: CheckCircleIcon,
  document: DocumentTextIcon,
  bolt: BoltIcon,
};

const FALLBACK_PROFILE = {
  slug: "general",
  name: "General agent",
  tagline: "All tools, broadest scope.",
  icon: "cpu",
};

const STATUS_META = {
  running: { label: "Thinking", tone: "running" },
  awaiting_approval: { label: "Needs approval", tone: "approval" },
  completed: { label: "Complete", tone: "complete" },
  failed: { label: "Failed", tone: "failed" },
  cancelled: { label: "Cancelled", tone: "cancelled" },
};

const MARKDOWN_PLUGINS = [remarkGfm];

function truncate(value, max = 60) {
  const s = String(value ?? "");
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function safeStringify(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch (_) {
    return String(value);
  }
}

function summarizeOutput(out) {
  if (out === null || out === undefined) return "No output";
  if (Array.isArray(out)) {
    if (!out.length) return "0 results";
    const first = out[0] || {};
    const sample = first.title || first.name || first.key || first.email || "";
    return `${out.length} result${out.length === 1 ? "" : "s"}${sample ? ` · ${truncate(sample, 50)}` : ""}`;
  }
  if (typeof out === "object") {
    if (out.error) return `Error: ${out.error}`;
    if (typeof out.total === "number") return `${out.total} matches`;
    if (out.key || out.title) return out.key ? `${out.key}` : truncate(out.title, 50);
    if (out.id && out.status) return `#${out.id} · ${out.status}`;
  }
  return truncate(String(out), 50);
}

export default function AgentDock() {
  const navigate = useNavigate();
  const dock = useAgentDock();
  const { isOpen, close, seedGoal, seedProfile, activeRunId, setActiveRunId, activeHint } = dock;

  const [profiles, setProfiles] = useState([FALLBACK_PROFILE]);
  const [profileSlug, setProfileSlug] = useState(() => {
    try {
      return localStorage.getItem("agentProfileSlug") || "general";
    } catch (_) {
      return "general";
    }
  });
  const [profilePickerOpen, setProfilePickerOpen] = useState(false);

  const [goal, setGoal] = useState("");
  const [run, setRun] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const composerRef = useRef(null);
  const traceEndRef = useRef(null);

  // Load profiles once.
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

  // When the dock opens, seed the composer/profile/active-run from context.
  useEffect(() => {
    if (!isOpen) return;
    if (seedGoal !== undefined) setGoal(seedGoal || "");
    if (seedProfile) setProfileSlug(seedProfile);
    if (activeRunId) {
      api
        .get(`/api/knowledge/ai/agent/runs/${activeRunId}/`)
        .then(({ data }) => setRun(data))
        .catch(() => {});
    } else {
      setRun(null);
    }
    setTimeout(() => composerRef.current?.focus(), 80);
  }, [isOpen, seedGoal, seedProfile, activeRunId]);

  // Auto-scroll trace as it grows.
  useEffect(() => {
    traceEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [run?.steps?.length, run?.status]);

  // Poll while running.
  useEffect(() => {
    if (!isOpen || !run?.id || run.status !== "running") return undefined;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      try {
        const { data } = await api.get(`/api/knowledge/ai/agent/runs/${run.id}/`);
        if (cancelled) return;
        setRun(data);
        if (data.status === "running") setTimeout(tick, 1500);
      } catch (_) {
        if (!cancelled) setTimeout(tick, 3000);
      }
    };
    const t = setTimeout(tick, 1200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [isOpen, run?.id, run?.status]);

  const activeProfile = useMemo(
    () => profiles.find((p) => p.slug === profileSlug) || profiles[0] || FALLBACK_PROFILE,
    [profiles, profileSlug]
  );

  const handlePickProfile = (slug) => {
    setProfileSlug(slug);
    setProfilePickerOpen(false);
    try {
      localStorage.setItem("agentProfileSlug", slug);
    } catch (_) {}
  };

  const handleStart = async (text) => {
    const goalText = (text ?? goal).trim();
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
      setActiveRunId(data.id);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Could not start agent.");
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
    } catch (_) {}
  };

  const handleNewRun = () => {
    setRun(null);
    setActiveRunId(null);
    setGoal("");
    setTimeout(() => composerRef.current?.focus(), 50);
  };

  const handleOpenFull = () => {
    close();
    if (run?.id) navigate(`/agent/${run.id}`);
    else navigate("/agent");
  };

  if (!isOpen) return null;

  const ProfileIcon = PROFILE_ICON[activeProfile?.icon] || CpuChipIcon;
  const placeholder = activeHint?.goalPrefix
    ? `Continue: ${activeHint.goalPrefix.trim().slice(0, 60)}…`
    : "Ask the agent to do something — it'll plan, search, and propose actions.";

  return (
    <>
      <div className="ad-backdrop" onClick={close} aria-hidden="true" />
      <aside className="ad" role="dialog" aria-modal="true" aria-label="Workspace agent">
        <header className="ad-head">
          <div className="ad-head-title">
            <span className="ad-head-mark"><CpuChipIcon /></span>
            <div>
              <p className="ad-head-name">Workspace Agent</p>
              {activeHint?.label ? (
                <p className="ad-head-context">
                  Context: <strong>{activeHint.label}</strong>
                </p>
              ) : (
                <p className="ad-head-context">Press <kbd>⌘J</kbd> to toggle anywhere</p>
              )}
            </div>
          </div>
          <div className="ad-head-actions">
            <button
              type="button"
              className="ad-iconbtn"
              onClick={handleOpenFull}
              title="Open full view"
              aria-label="Open in full page"
            >
              <ArrowsPointingOutIcon />
            </button>
            {run ? (
              <button
                type="button"
                className="ad-iconbtn"
                onClick={handleNewRun}
                title="New run"
                aria-label="New run"
              >
                <PlusIcon />
              </button>
            ) : null}
            <button type="button" className="ad-iconbtn" onClick={close} title="Close" aria-label="Close">
              <XMarkIcon />
            </button>
          </div>
        </header>

        {error ? (
          <div className="ad-error">
            <ExclamationTriangleIcon />
            <span>{error}</span>
          </div>
        ) : null}

        <div className="ad-body">
          {!run ? (
            <Empty
              profile={activeProfile}
              hint={activeHint}
              onPick={(s) => handleStart(s)}
              onOpenProfilePicker={() => setProfilePickerOpen(true)}
              busy={busy}
            />
          ) : (
            <RunView
              run={run}
              busy={busy}
              onApprove={handleApprove}
              onCancel={handleCancel}
              onOpenFull={handleOpenFull}
            />
          )}
          <div ref={traceEndRef} />
        </div>

        <form
          className="ad-composer"
          onSubmit={(e) => {
            e.preventDefault();
            handleStart();
          }}
        >
          <button
            type="button"
            className="ad-composer-profile"
            onClick={() => setProfilePickerOpen(true)}
            title={`Specialist: ${activeProfile?.name}`}
          >
            <span className="ad-composer-profile-icon">
              <ProfileIcon />
            </span>
            <ChevronDownIcon />
          </button>
          <textarea
            ref={composerRef}
            value={goal}
            rows={1}
            placeholder={placeholder}
            onChange={(e) => {
              setGoal(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey || !e.shiftKey)) {
                e.preventDefault();
                handleStart();
              }
            }}
          />
          <button
            type="submit"
            className="ad-send"
            disabled={busy || !goal.trim()}
            aria-label="Run agent"
          >
            {busy ? <span className="ad-spinner" /> : <PaperAirplaneIcon />}
          </button>
        </form>

        {profilePickerOpen ? (
          <ProfilePicker
            profiles={profiles}
            activeSlug={profileSlug}
            onPick={handlePickProfile}
            onClose={() => setProfilePickerOpen(false)}
          />
        ) : null}
      </aside>
    </>
  );
}

function Empty({ profile, hint, onPick, onOpenProfilePicker, busy }) {
  const Icon = PROFILE_ICON[profile?.icon] || CpuChipIcon;
  const starters = profile?.starter_goals?.slice(0, 4) || [];
  return (
    <div className="ad-empty">
      <div className="ad-empty-hero">
        <span className="ad-empty-icon">
          <Icon />
        </span>
        <h3>{profile?.name || "General agent"}</h3>
        <p>{profile?.tagline}</p>
        <button type="button" className="ad-empty-switch" onClick={onOpenProfilePicker}>
          Switch specialist
          <ChevronDownIcon />
        </button>
      </div>
      {hint?.label ? (
        <div className="ad-empty-context">
          <SparklesIcon />
          <span>
            I'll frame the goal around <strong>{hint.label}</strong>.
          </span>
        </div>
      ) : null}
      {starters.length ? (
        <>
          <div className="ad-empty-divider">Start with…</div>
          <div className="ad-empty-starters">
            {starters.map((s) => (
              <button
                key={s}
                type="button"
                className="ad-starter"
                onClick={() => onPick(s)}
                disabled={busy}
              >
                <SparklesIcon />
                <span>{s}</span>
                <ArrowRightIcon className="ad-starter-go" />
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function RunView({ run, busy, onApprove, onCancel, onOpenFull }) {
  const meta = STATUS_META[run.status] || STATUS_META.running;
  return (
    <div className="ad-run">
      <div className={`ad-run-head ad-run-head--${meta.tone}`}>
        <span className={`ad-status-tag ad-status-tag--${meta.tone}`}>
          <span className={`ad-status-dot ad-status-dot--${meta.tone}`} />
          {meta.label}
        </span>
        <span className="ad-run-meta">
          <ClockIcon /> {run.iterations} step{run.iterations === 1 ? "" : "s"}
        </span>
        {run.status === "running" || run.status === "awaiting_approval" ? (
          <button type="button" className="ad-cancel" onClick={onCancel}>
            <StopIcon /> Cancel
          </button>
        ) : null}
        <button type="button" className="ad-cancel" onClick={onOpenFull}>
          <ArrowUpRightIcon /> Full view
        </button>
      </div>

      <p className="ad-run-goal">{run.goal}</p>

      {run.status === "awaiting_approval" && run.pending_tool_calls?.length ? (
        <ApprovalSheet pending={run.pending_tool_calls} busy={busy} onSubmit={onApprove} />
      ) : null}

      <Trace steps={run.steps || []} status={run.status} />

      {run.final_answer ? (
        <div className="ad-final">
          <div className="ad-final-head">
            <CheckCircleIcon />
            <span>Final answer</span>
          </div>
          <div className="ad-md">
            <ReactMarkdown remarkPlugins={MARKDOWN_PLUGINS}>{run.final_answer}</ReactMarkdown>
          </div>
        </div>
      ) : null}

      {run.status === "failed" && run.error ? (
        <div className="ad-error">
          <ExclamationTriangleIcon />
          <span>{run.error}</span>
        </div>
      ) : null}
    </div>
  );
}

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
        const target = byCall.get(s.payload?.tool_call_id);
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
    <ol className="ad-trace">
      {items.map((it, i) => (
        <TraceRow key={i} item={it} />
      ))}
      {running ? (
        <li className="ad-trace-row ad-trace-row--thinking">
          <span className="ad-trace-marker ad-trace-marker--thinking">
            <SparklesIcon />
          </span>
          <span className="ad-trace-thinking">
            Thinking<span className="ad-dots"><span /><span /><span /></span>
          </span>
        </li>
      ) : null}
    </ol>
  );
}

function TraceRow({ item }) {
  if (item.kind === "user_goal") return null; // shown above as ad-run-goal
  if (item.kind === "final") return null;
  if (item.kind === "thought") {
    return (
      <li className="ad-trace-row ad-trace-row--thought">
        <span className="ad-trace-marker ad-trace-marker--thought">
          <SparklesIcon />
        </span>
        <div className="ad-trace-body">
          <div className="ad-md ad-md--inline">
            <ReactMarkdown remarkPlugins={MARKDOWN_PLUGINS}>{item.payload?.text || ""}</ReactMarkdown>
          </div>
        </div>
      </li>
    );
  }
  if (item.kind === "tool") {
    const payload = item.call?.payload || {};
    const resPayload = item.result?.payload || {};
    const isWrite = !!payload.is_write;
    let state = "pending";
    let text = isWrite ? "Awaiting approval" : "Running…";
    if (item.result) {
      if (resPayload.error) { state = "error"; text = truncate(resPayload.error, 80); }
      else if (resPayload.denied) { state = "denied"; text = "Denied"; }
      else if (resPayload.executed) { state = "executed"; text = `Executed · ${summarizeOutput(resPayload.output)}`; }
      else if (resPayload.output !== undefined) { state = "ok"; text = summarizeOutput(resPayload.output); }
    }
    return (
      <li className={`ad-trace-row ad-trace-row--tool ${isWrite ? "is-write" : ""}`}>
        <span className={`ad-trace-marker ad-trace-marker--tool ${isWrite ? "is-write" : ""}`}>
          <CommandLineIcon />
        </span>
        <div className="ad-trace-body">
          <div className="ad-tool">
            <code className="ad-tool-name">{payload.name}</code>
            <div className={`ad-tool-state ad-tool-state--${state}`}>
              {state === "pending" && !isWrite ? <span className="ad-tool-spinner" /> : null}
              <span>{text}</span>
            </div>
          </div>
        </div>
      </li>
    );
  }
  return null;
}

function ApprovalSheet({ pending, busy, onSubmit }) {
  const [overrides, setOverrides] = useState({});
  const [denied, setDenied] = useState({});

  const updateField = (id, field, value) => {
    setOverrides((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), [field]: value } }));
  };

  const submit = (approveAll) => {
    const decisions = pending.map((p) => {
      const approved = approveAll && !denied[p.id];
      const editedInput = overrides[p.id] ? { ...(p.input || {}), ...overrides[p.id] } : null;
      const d = { id: p.id, approved };
      if (editedInput) d.edited_input = editedInput;
      return d;
    });
    onSubmit(decisions);
  };

  return (
    <div className="ad-approval">
      <div className="ad-approval-head">
        <PauseCircleIcon />
        <span>{pending.length} write action{pending.length === 1 ? "" : "s"} need approval</span>
      </div>
      <ul className="ad-approval-list">
        {pending.map((p) => {
          const input = { ...(p.input || {}), ...(overrides[p.id] || {}) };
          const isDenied = !!denied[p.id];
          return (
            <li key={p.id} className={`ad-approval-row ${isDenied ? "is-denied" : ""}`}>
              <div className="ad-approval-row-head">
                <code className="ad-approval-name">{p.name}</code>
                <button
                  type="button"
                  className={`ad-approval-deny ${isDenied ? "is-on" : ""}`}
                  onClick={() => setDenied((d) => ({ ...d, [p.id]: !d[p.id] }))}
                >
                  {isDenied ? "Will deny" : "Deny"}
                </button>
              </div>
              <div className="ad-approval-fields">
                {Object.entries(input).map(([key, value]) => (
                  <label key={key} className="ad-approval-field">
                    <span>{key}</span>
                    <input
                      type="text"
                      value={value === null || value === undefined ? "" : String(value)}
                      onChange={(e) => updateField(p.id, key, e.target.value)}
                      disabled={isDenied}
                    />
                  </label>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="ad-approval-footer">
        <button type="button" className="ad-approval-secondary" onClick={() => submit(false)} disabled={busy}>
          <XMarkIcon /> Deny all
        </button>
        <button type="button" className="ad-approval-primary" onClick={() => submit(true)} disabled={busy}>
          <CheckIcon /> {busy ? "Running…" : "Approve & run"}
        </button>
      </div>
    </div>
  );
}

function ProfilePicker({ profiles, activeSlug, onPick, onClose }) {
  return (
    <div className="ad-picker">
      <div className="ad-picker-head">
        <p>Choose a specialist</p>
        <button type="button" onClick={onClose} aria-label="Close picker">
          <XMarkIcon />
        </button>
      </div>
      <div className="ad-picker-list">
        {profiles.map((p) => {
          const Icon = PROFILE_ICON[p.icon] || CpuChipIcon;
          const isActive = p.slug === activeSlug;
          return (
            <button
              key={p.slug}
              type="button"
              className={`ad-picker-row ${isActive ? "is-active" : ""}`}
              onClick={() => onPick(p.slug)}
            >
              <span className="ad-picker-row-icon">
                <Icon />
              </span>
              <span className="ad-picker-row-text">
                <span>{p.name}</span>
                <span>{p.tagline}</span>
              </span>
              {isActive ? <CheckIcon className="ad-picker-row-check" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   FAB launcher — sits in the bottom-right corner of every
   authenticated page, opens the dock on click.
   ───────────────────────────────────────────────────────────── */

export function AgentDockFab() {
  const { isOpen, toggle, activeHint } = useAgentDock();
  if (isOpen) return null;
  return (
    <button
      type="button"
      className="ad-fab"
      onClick={() => toggle()}
      title={activeHint?.label ? `Ask Agent about ${activeHint.label} · ⌘J` : "Ask Agent · ⌘J"}
      aria-label="Open workspace agent"
    >
      <span className="ad-fab-mark">
        <BoltIcon />
      </span>
      <span className="ad-fab-text">
        Ask Agent
        {activeHint?.label ? <span className="ad-fab-context">{activeHint.label}</span> : null}
      </span>
      <span className="ad-fab-kbd">⌘J</span>
    </button>
  );
}
