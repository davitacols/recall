import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowRightIcon,
  BoltIcon,
  CheckCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  ClipboardIcon,
  ClockIcon,
  CommandLineIcon,
  CpuChipIcon,
  DocumentTextIcon,
  EllipsisHorizontalIcon,
  ExclamationTriangleIcon,
  PaperAirplaneIcon,
  PauseCircleIcon,
  PencilSquareIcon,
  PlusIcon,
  RocketLaunchIcon,
  ShieldCheckIcon,
  SparklesIcon,
  StopIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import api from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { Lozenge } from "../components/atlas";
import "./Agent.css";

// Shared markdown config — GFM (tables, strikethrough, autolinks, task lists)
// and a small allowlist of components so the renderer matches the Aurora look.
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
        <code className="ag-md-inline-code" {...props}>
          {children}
        </code>
      );
    }
    return (
      <pre className="ag-md-code">
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

const STATUS_META = {
  running: { label: "Thinking", tone: "running", accent: "var(--b400)" },
  awaiting_approval: { label: "Needs your approval", tone: "approval", accent: "var(--y400)" },
  completed: { label: "Complete", tone: "complete", accent: "var(--g400)" },
  failed: { label: "Failed", tone: "failed", accent: "var(--r400)" },
  cancelled: { label: "Cancelled", tone: "cancelled", accent: "var(--n100)" },
};

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
  description: "The default workspace agent.",
  icon: "cpu",
  starter_goals: [
    "Find the 5 highest-priority open issues without an assignee.",
    "Summarize this week's approved decisions.",
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
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function dayBucket(value) {
  if (!value) return "earlier";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "earlier";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 6 * 86400000);
  if (d >= today) return "today";
  if (d >= yesterday) return "yesterday";
  if (d >= weekAgo) return "this week";
  return "earlier";
}

function groupRuns(runs) {
  const buckets = { today: [], yesterday: [], "this week": [], earlier: [] };
  runs.forEach((r) => buckets[dayBucket(r.created_at)].push(r));
  return Object.entries(buckets).filter(([, list]) => list.length > 0);
}

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

// Friendly one-liner for a tool result so the user can scan without expanding.
function summarizeOutput(name, out) {
  if (out === null || out === undefined) return "No output";
  if (Array.isArray(out)) {
    if (!out.length) return "0 results";
    const first = out[0] || {};
    const sample = first.title || first.name || first.key || first.email || "";
    return `${out.length} result${out.length === 1 ? "" : "s"}${sample ? ` · ${truncate(sample, 60)}` : ""}`;
  }
  if (typeof out === "object") {
    if (out.error) return `Error: ${out.error}`;
    if (typeof out.total === "number") {
      const types = Object.keys(out.buckets || {}).filter((k) => (out.buckets[k] || []).length > 0);
      return `${out.total} matches across ${types.length} source${types.length === 1 ? "" : "s"}`;
    }
    if (typeof out.total_issues === "number") return `${out.total_issues} issues across the sprint`;
    if (out.key || out.title || out.name) return out.key ? `${out.key} · ${truncate(out.title || out.name || "", 60)}` : truncate(out.title || out.name, 80);
    if (out.id && out.status) return `#${out.id} · ${out.status}`;
    if (out.created) return "Created";
  }
  return truncate(String(out), 80);
}

// Compact arg renderer for tool calls.
function ArgChips({ input }) {
  const entries = Object.entries(input || {});
  if (!entries.length) return null;
  return (
    <span className="ag-args">
      {entries.map(([k, v]) => (
        <span key={k} className="ag-arg">
          <em>{k}</em>
          <code>{typeof v === "string" ? truncate(v, 32) : truncate(JSON.stringify(v), 32)}</code>
        </span>
      ))}
    </span>
  );
}

// ---------- page ----------

export default function Agent() {
  const { runId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // composer
  const [goal, setGoal] = useState("");
  const composerRef = useRef(null);

  // run + run list
  const [run, setRun] = useState(null);
  const [runs, setRuns] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const traceEndRef = useRef(null);

  // profile catalog + selection
  const [profiles, setProfiles] = useState([FALLBACK_PROFILE]);
  const [profileSlug, setProfileSlug] = useState(() => {
    try {
      return localStorage.getItem("agentProfileSlug") || "general";
    } catch (_) {
      return "general";
    }
  });
  const [profilePickerOpen, setProfilePickerOpen] = useState(false);
  const [showToolPanel, setShowToolPanel] = useState(false);

  const activeProfile = useMemo(
    () => profiles.find((p) => p.slug === profileSlug) || profiles[0] || FALLBACK_PROFILE,
    [profiles, profileSlug]
  );

  // ----- data fetches -----

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

  // Live websocket feed — every step / status change pushes to all viewers.
  // Falls back gracefully to the polling tick below if the socket can't open.
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
            setRun((prev) =>
              prev ? { ...prev, steps: [...(prev.steps || []), step] } : prev
            );
          } else if (msg.type === "status") {
            setRun((prev) =>
              prev
                ? {
                    ...prev,
                    status: msg.status || prev.status,
                    final_answer: msg.final_answer ?? prev.final_answer,
                    pending_tool_calls:
                      msg.pending_tool_calls ?? prev.pending_tool_calls,
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

  // Poll while the run is running so the trace grows in front of the user.
  // Kept as a fallback for environments without working websockets.
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

  const tools = run?.tools_available || [];

  return (
    <div className="ag">
      <PageHeader
        profile={activeProfile}
        onOpenProfilePicker={() => setProfilePickerOpen(true)}
        toolCount={tools.length}
        onToggleTools={() => setShowToolPanel((v) => !v)}
        toolsVisible={showToolPanel}
        run={run}
        onNewRun={handleNewRun}
        userOrg={user?.organization_name}
      />

      {showToolPanel && tools.length ? <ToolPanel tools={tools} /> : null}

      <div className="ag-grid">
        <RunRail
          runs={runs}
          profiles={profiles}
          activeId={run?.id}
        />

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
            <RunView
              run={run}
              busy={busy}
              onApprove={handleApprove}
              onCancel={handleCancel}
            />
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

// ---------- header ----------

function PageHeader({ profile, onOpenProfilePicker, toolCount, onToggleTools, toolsVisible, run, onNewRun, userOrg }) {
  const Icon = PROFILE_ICON[profile?.icon] || CpuChipIcon;
  return (
    <header className="ag-header">
      <div className="ag-header-left">
        <div className="ag-brand">
          <span className="ag-brand-mark">
            <CpuChipIcon />
          </span>
          <div className="ag-brand-text">
            <h1>Workspace Agent</h1>
            <p>Autonomous specialists for {userOrg || "your team"}</p>
          </div>
        </div>
      </div>

      <div className="ag-header-right">
        <button
          type="button"
          className="ag-profile-pill"
          onClick={onOpenProfilePicker}
          title="Switch profile"
        >
          <span className="ag-profile-pill-icon">
            <Icon />
          </span>
          <span className="ag-profile-pill-name">{profile?.name || "General agent"}</span>
          <ChevronDownIcon />
        </button>

        {toolCount ? (
          <button
            type="button"
            className={`ag-tools-pill ${toolsVisible ? "is-active" : ""}`}
            onClick={onToggleTools}
            title="Available tools for this run"
          >
            <CommandLineIcon />
            <span>{toolCount}</span>
          </button>
        ) : null}

        <Link to="/agent/audit" className="ag-tools-pill" title="Workspace audit log (admin)">
          <ShieldCheckIcon />
          <span>Audit</span>
        </Link>

        {run ? (
          <button type="button" className="ag-newrun" onClick={onNewRun}>
            <PlusIcon /> New run
          </button>
        ) : null}
      </div>
    </header>
  );
}

function ToolPanel({ tools }) {
  return (
    <div className="ag-toolpanel">
      <div className="ag-toolpanel-head">
        <span>{tools.length} tools available to this profile</span>
      </div>
      <div className="ag-toolpanel-grid">
        {tools.map((t) => (
          <div key={t.name} className={`ag-tool ${t.is_write ? "is-write" : "is-read"}`}>
            <code>{t.name}</code>
            <span>{t.description}</span>
            <Lozenge variant={t.is_write ? "moved" : "default"}>{t.is_write ? "write" : "read"}</Lozenge>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- run rail ----------

function RunRail({ runs, profiles, activeId }) {
  const groups = useMemo(() => groupRuns(runs), [runs]);
  return (
    <aside className="ag-rail">
      <div className="ag-rail-head">
        <span>Recent runs</span>
        <span className="ag-rail-count">{runs.length}</span>
      </div>
      {runs.length === 0 ? (
        <p className="ag-rail-empty">No runs yet. Start one below.</p>
      ) : (
        groups.map(([label, list]) => (
          <div key={label} className="ag-rail-group">
            <p className="ag-rail-group-label">{label}</p>
            {list.map((r) => {
              const meta = STATUS_META[r.status] || STATUS_META.running;
              const isActive = activeId === r.id;
              const prof = profiles.find((p) => p.slug === r.profile_slug);
              const Icon = PROFILE_ICON[prof?.icon] || CpuChipIcon;
              return (
                <Link
                  key={r.id}
                  to={`/agent/${r.id}`}
                  className={`ag-rail-row ag-rail-row--${meta.tone} ${isActive ? "is-active" : ""}`}
                >
                  <span className="ag-rail-icon">
                    <Icon />
                  </span>
                  <span className="ag-rail-body">
                    <span className="ag-rail-goal">{r.goal}</span>
                    <span className="ag-rail-meta">
                      <span className={`ag-status-dot ag-status-dot--${meta.tone}`} />
                      <span>{meta.label}</span>
                      <span aria-hidden="true">·</span>
                      <span>{timeAgo(r.created_at)}</span>
                    </span>
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
  const Icon = PROFILE_ICON[profile?.icon] || CpuChipIcon;
  const starters = profile?.starter_goals?.length ? profile.starter_goals : FALLBACK_PROFILE.starter_goals;
  return (
    <div className="ag-empty">
      <div className="ag-empty-hero">
        <span className="ag-empty-icon">
          <Icon />
        </span>
        <h2>{profile?.name || "General agent"}</h2>
        <p>{profile?.description || profile?.tagline}</p>
        <button type="button" className="ag-empty-switch" onClick={onOpenProfilePicker}>
          Switch specialist
          <ChevronDownIcon />
        </button>
      </div>
      <div className="ag-empty-divider">Start with…</div>
      <div className="ag-empty-starters">
        {starters.map((s) => (
          <button
            key={s}
            type="button"
            className="ag-starter"
            onClick={() => onPick(s)}
            disabled={busy}
          >
            <SparklesIcon />
            <span>{s}</span>
            <ArrowRightIcon className="ag-starter-go" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------- run view ----------

function RunView({ run, busy, onApprove, onCancel }) {
  const meta = STATUS_META[run.status] || STATUS_META.running;
  const profile = run.profile;
  const ProfileIcon = profile ? PROFILE_ICON[profile.icon] || CpuChipIcon : CpuChipIcon;
  const stepsCount = (run.steps || []).length;

  return (
    <div className="ag-run">
      <div className={`ag-run-card ag-run-card--${meta.tone}`}>
        <div className="ag-run-card-bar" />
        <div className="ag-run-head">
          {profile ? (
            <div className="ag-run-profile">
              <span className="ag-run-profile-icon">
                <ProfileIcon />
              </span>
              <div>
                <p className="ag-run-profile-name">{profile.name}</p>
                <p className="ag-run-profile-tagline">{profile.tagline}</p>
              </div>
            </div>
          ) : null}
          <p className="ag-run-goal">{run.goal}</p>
          <div className="ag-run-meta">
            <span className={`ag-status-tag ag-status-tag--${meta.tone}`}>
              <span className={`ag-status-dot ag-status-dot--${meta.tone}`} />
              {meta.label}
            </span>
            <span className="ag-run-meta-item">
              <ClockIcon /> {run.iterations} iteration{run.iterations === 1 ? "" : "s"}
            </span>
            <span className="ag-run-meta-item">
              {stepsCount} step{stepsCount === 1 ? "" : "s"}
            </span>
            <span className="ag-run-meta-item">{timeAgo(run.created_at)}</span>
            {run.status === "running" || run.status === "awaiting_approval" ? (
              <button type="button" className="ag-cancel" onClick={onCancel}>
                <StopIcon /> Cancel
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {run.status === "awaiting_approval" && run.pending_tool_calls?.length ? (
        <ApprovalSheet
          pending={run.pending_tool_calls}
          busy={busy}
          onSubmit={onApprove}
        />
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
        <CheckCircleIcon />
        <span>Final answer</span>
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
  // Pair tool_call → tool_result for cleaner rendering.
  // Hook must run unconditionally — bail out below if there are no steps.
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
  const lastIdx = items.length - 1;

  return (
    <ol className="ag-trace">
      {items.map((item, i) => (
        <TraceRow
          key={i}
          item={item}
          isLast={i === lastIdx}
          running={running && i === lastIdx}
        />
      ))}
      {running ? (
        <li className="ag-trace-row ag-trace-row--pulse">
          <span className="ag-trace-marker ag-trace-marker--thinking">
            <SparklesIcon />
          </span>
          <span className="ag-trace-thinking">
            Thinking
            <span className="ag-dots"><span /><span /><span /></span>
          </span>
        </li>
      ) : null}
    </ol>
  );
}

function TraceRow({ item }) {
  if (item.kind === "user_goal") {
    return (
      <li className="ag-trace-row ag-trace-row--goal">
        <span className="ag-trace-marker ag-trace-marker--user">You</span>
        <div className="ag-trace-body">
          <p className="ag-trace-goal">{item.payload?.text}</p>
        </div>
      </li>
    );
  }
  if (item.kind === "thought") {
    return (
      <li className="ag-trace-row ag-trace-row--thought">
        <span className="ag-trace-marker ag-trace-marker--thought">
          <SparklesIcon />
        </span>
        <div className="ag-trace-body">
          <Markdown className="ag-trace-thought">{item.payload?.text}</Markdown>
        </div>
      </li>
    );
  }
  if (item.kind === "tool") {
    return <ToolRow call={item.call} result={item.result} />;
  }
  if (item.kind === "result_only") {
    return (
      <li className="ag-trace-row ag-trace-row--result">
        <span className="ag-trace-marker ag-trace-marker--result">
          <EllipsisHorizontalIcon />
        </span>
        <div className="ag-trace-body">
          <pre className="ag-trace-pre">{safeStringify(item.result?.payload)}</pre>
        </div>
      </li>
    );
  }
  if (item.kind === "final") {
    return null; // rendered separately as FinalAnswerCard
  }
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

  let stateClass = "ag-tool-state--pending";
  let stateText = isWrite ? "Awaiting your approval" : "Running…";
  if (result) {
    if (resultError) {
      stateClass = "ag-tool-state--error";
      stateText = `Error: ${truncate(resultError, 60)}`;
    } else if (resultDenied) {
      stateClass = "ag-tool-state--denied";
      stateText = `Denied${resPayload.reason ? ` · ${resPayload.reason}` : ""}`;
    } else if (resPayload.executed) {
      stateClass = "ag-tool-state--executed";
      stateText = `Executed · ${summarizeOutput(payload.name, resultOutput)}`;
    } else if (resultOutput !== undefined) {
      stateClass = "ag-tool-state--ok";
      stateText = summarizeOutput(payload.name, resultOutput);
    } else {
      stateClass = "ag-tool-state--pending";
      stateText = isWrite ? "Awaiting your approval" : "Done";
    }
  }

  return (
    <li className={`ag-trace-row ag-trace-row--tool ${isWrite ? "is-write" : "is-read"}`}>
      <span className={`ag-trace-marker ag-trace-marker--tool ${isWrite ? "is-write" : ""}`}>
        <CommandLineIcon />
      </span>
      <div className="ag-trace-body">
        <button
          type="button"
          className="ag-tool-card"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          <div className="ag-tool-headline">
            <code className="ag-tool-name">{payload.name}</code>
            <ArgChips input={payload.input} />
            <ChevronDownIcon className={`ag-tool-caret ${expanded ? "is-open" : ""}`} />
          </div>
          <div className={`ag-tool-state ${stateClass}`}>
            {resultPending ? <span className="ag-tool-state-spinner" /> : null}
            <span>{stateText}</span>
          </div>
        </button>
        {expanded ? (
          <div className="ag-tool-expand">
            <div className="ag-tool-expand-block">
              <p className="ag-mini-label">Input</p>
              <pre className="ag-trace-pre">{safeStringify(payload.input || {})}</pre>
            </div>
            {result ? (
              <div className="ag-tool-expand-block">
                <p className="ag-mini-label">{resultError ? "Error" : "Output"}</p>
                <pre className="ag-trace-pre">{safeStringify(resultError || resultOutput || resPayload)}</pre>
              </div>
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
        <span className="ag-approval-mark">
          <PauseCircleIcon />
        </span>
        <div>
          <p className="ag-approval-title">
            {pending.length} write action{pending.length === 1 ? "" : "s"} need approval
          </p>
          <p className="ag-approval-sub">
            Edit the inputs below and approve, or deny individual ones with a reason.
          </p>
        </div>
      </div>
      <ul className="ag-approval-list">
        {pending.map((p) => {
          const input = { ...(p.input || {}), ...(overrides[p.id] || {}) };
          const isDenied = !!denied[p.id];
          return (
            <li key={p.id} className={`ag-approval-row ${isDenied ? "is-denied" : ""}`}>
              <div className="ag-approval-row-head">
                <code className="ag-approval-name">{p.name}</code>
                <button
                  type="button"
                  className={`ag-approval-deny ${isDenied ? "is-on" : ""}`}
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
        <button type="button" className="ag-approval-secondary" onClick={() => submit(false)} disabled={busy}>
          <XMarkIcon /> Deny all
        </button>
        <button type="button" className="ag-approval-primary" onClick={() => submit(true)} disabled={busy}>
          <CheckIcon /> {busy ? "Running…" : "Approve & run"}
        </button>
      </div>
    </div>
  );
}

// ---------- composer ----------

const Composer = React.forwardRef(function Composer({ value, onChange, onSubmit, busy, profile, onOpenProfilePicker, hasRun }, ref) {
  const Icon = PROFILE_ICON[profile?.icon] || CpuChipIcon;
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
        title={`Specialist: ${profile?.name || "General agent"}`}
      >
        <span className="ag-composer-profile-icon">
          <Icon />
        </span>
        <span className="ag-composer-profile-text">{profile?.name || "General"}</span>
        <ChevronDownIcon />
      </button>
      <textarea
        ref={ref}
        value={value}
        rows={1}
        placeholder={hasRun ? "Start another run…" : "Give the agent a goal — it'll plan, search workspace memory, and propose actions."}
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

// ---------- profile picker overlay ----------

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
      <div className="ag-picker-backdrop" onClick={onClose} />
      <div className="ag-picker" role="dialog" aria-modal="true">
        <div className="ag-picker-head">
          <p>Choose a specialist</p>
          <button type="button" onClick={onClose} aria-label="Close">
            <XMarkIcon />
          </button>
        </div>
        <div className="ag-picker-grid">
          {profiles.map((p) => {
            const Icon = PROFILE_ICON[p.icon] || CpuChipIcon;
            const isActive = p.slug === activeSlug;
            return (
              <button
                key={p.slug}
                type="button"
                className={`ag-picker-card ${isActive ? "is-active" : ""}`}
                onClick={() => onPick(p.slug)}
              >
                <span className="ag-picker-card-top">
                  <span className="ag-picker-card-icon">
                    <Icon />
                  </span>
                  {isActive ? (
                    <span className="ag-picker-card-check">
                      <CheckIcon />
                    </span>
                  ) : null}
                </span>
                <span className="ag-picker-card-name">{p.name}</span>
                <span className="ag-picker-card-tagline">{p.tagline}</span>
                {p.starter_goals?.length ? (
                  <span className="ag-picker-card-starters">
                    {p.starter_goals.slice(0, 2).map((s) => (
                      <span key={s} className="ag-picker-card-starter">
                        <PencilSquareIcon />
                        {truncate(s, 64)}
                      </span>
                    ))}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
