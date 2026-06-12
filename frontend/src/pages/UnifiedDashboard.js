import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
  ArrowTrendingDownIcon,
  ArrowUturnRightIcon,
  BoltIcon,
  ChartBarSquareIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ClockIcon,
  CursorArrowRaysIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  FireIcon,
  HandRaisedIcon,
  LightBulbIcon,
  PlusIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../hooks/useAuth";
import api from "../services/api";
import "./UnifiedDashboard.css";

// ─── utilities ──────────────────────────────────────────────────────────────

function timeAgo(input) {
  if (!input) return "";
  const d = typeof input === "string" || typeof input === "number" ? new Date(input) : input;
  if (!d || isNaN(d.getTime())) return "";
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

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Up late";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 22) return "Good evening";
  return "Up late";
}

function unwrap(payload, fallback) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    return payload.data && typeof payload.data === "object" ? payload.data : payload;
  }
  return fallback;
}

const driftToneClass = (band) => {
  switch (band) {
    case "off_track":
      return "rose";
    case "drifting":
      return "amber";
    case "exceeded":
      return "violet";
    case "on_track":
      return "emerald";
    default:
      return "slate";
  }
};

// ─── page ───────────────────────────────────────────────────────────────────

export default function UnifiedDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [personal, setPersonal] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [drift, setDrift] = useState({ items: [], total: 0 });
  const [sprint, setSprint] = useState(null);

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([
      api.get("/api/decisions/intelligence/overview/"),
      api.get("/api/knowledge/dashboard/personal-briefing/"),
      api.get("/api/knowledge/dashboard/workspace-briefing/"),
      api.get("/api/knowledge/timeline/?days=7&page=1&per_page=15"),
      api.get("/api/decisions/outcomes/drift-alerts/"),
      api.get("/api/agile/current-sprint/"),
    ])
      .then(([ovRes, pRes, wRes, tRes, dRes, sRes]) => {
        if (!mounted) return;
        if (ovRes.status === "fulfilled") setOverview(unwrap(ovRes.value?.data, {}));
        if (pRes.status === "fulfilled") setPersonal(unwrap(pRes.value?.data, {}));
        if (wRes.status === "fulfilled") setWorkspace(unwrap(wRes.value?.data, {}));
        if (tRes.status === "fulfilled") {
          const t = unwrap(tRes.value?.data, { results: [] });
          setTimeline(Array.isArray(t.results) ? t.results : Array.isArray(t) ? t : []);
        }
        if (dRes.status === "fulfilled") {
          const d = unwrap(dRes.value?.data, { items: [] });
          setDrift({ items: d.items || [], total: d.total || 0 });
        }
        if (sRes.status === "fulfilled") setSprint(unwrap(sRes.value?.data, null));
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  // ─── derived ──────────────────────────────────────────────────────────────

  const firstName = user?.full_name?.split(" ")[0] || "";
  const totals = overview?.totals || {};

  // Loop metrics — the canonical KPI strip. Pull from intelligence/overview;
  // gracefully degrade to 0 when the workspace is brand new.
  const loopTiles = useMemo(() => {
    const recentRetros = Array.isArray(overview?.recent_retros) ? overview.recent_retros : [];
    const pendingChecks = Array.isArray(overview?.pending_checks) ? overview.pending_checks : [];
    const driftSignals = Array.isArray(overview?.recent_drift_signals)
      ? overview.recent_drift_signals
      : [];
    const openRetros = recentRetros.filter((r) => !r.closed_at).length;
    const offTrack = driftSignals.filter((d) => d.drift_band === "off_track").length;
    return [
      {
        key: "decisions",
        label: "Decisions",
        Icon: CheckCircleIcon,
        value: totals.decisions ?? "—",
        sub: "all-time",
        tone: "blue",
        to: "/decisions",
      },
      {
        key: "predictions",
        label: "Predictions",
        Icon: ChartBarSquareIcon,
        value: totals.predictions ?? "—",
        sub: "logged",
        tone: "violet",
        to: "/decisions/intelligence",
      },
      {
        key: "checks",
        label: "Outcomes checked",
        Icon: CursorArrowRaysIcon,
        value: totals.outcome_checks ?? "—",
        sub: `${pendingChecks.length} pending`,
        tone: "emerald",
        to: "/decisions/intelligence",
      },
      {
        key: "drift",
        label: "Drift signals",
        Icon: ArrowTrendingDownIcon,
        value: offTrack || "0",
        sub: "off-track",
        tone: offTrack ? "rose" : "slate",
        to: "/decisions/intelligence",
      },
      {
        key: "retros",
        label: "Open retros",
        Icon: ArrowUturnRightIcon,
        value: openRetros,
        sub: `${totals.retrospectives ?? 0} all-time`,
        tone: openRetros ? "amber" : "slate",
        to: "/decisions/intelligence",
      },
      {
        key: "lessons",
        label: "Lessons captured",
        Icon: LightBulbIcon,
        value:
          recentRetros.filter((r) => (r.lesson || "").trim().length > 0).length ||
          totals.retrospectives ||
          "—",
        sub: "compounding",
        tone: "teal",
        to: "/decisions/intelligence",
      },
    ];
  }, [overview, totals]);

  // Awaiting-you items: union of high-signal personal items.
  const awaiting = useMemo(() => {
    const out = [];
    // Pending predictions assigned to user (best-effort — backend may not
    // include user attribution; we show all pending in that case).
    const pendingChecks = Array.isArray(overview?.pending_checks)
      ? overview.pending_checks
      : [];
    pendingChecks.slice(0, 3).forEach((p) => {
      out.push({
        id: `pc-${p.prediction_id || p.id}`,
        kind: "prediction",
        Icon: CursorArrowRaysIcon,
        tone: "violet",
        title: p.statement || p.dimension || "Prediction needs an outcome check",
        meta: `${p.dimension || ""}${p.check_at ? ` · due ${timeAgo(p.check_at)}` : ""}`,
        href: p.decision_id ? `/decisions/${p.decision_id}` : "/decisions/intelligence",
      });
    });
    // Open retros without a lesson written yet
    const recentRetros = Array.isArray(overview?.recent_retros) ? overview.recent_retros : [];
    recentRetros
      .filter((r) => !r.closed_at && !(r.lesson || "").trim())
      .slice(0, 2)
      .forEach((r) => {
        out.push({
          id: `retro-${r.id}`,
          kind: "retro",
          Icon: ArrowUturnRightIcon,
          tone: "amber",
          title: r.summary || "Retrospective needs a lesson",
          meta: `${r.triggered_by ? `triggered by ${r.triggered_by}` : "open"} · ${timeAgo(r.created_at)}`,
          href: r.decision_id ? `/decisions/${r.decision_id}` : "/decisions/intelligence",
        });
      });
    // Mentioned conversations from the personal briefing
    const mentions = personal?.mentions || personal?.recent_conversations || [];
    mentions.slice(0, 2).forEach((m) => {
      out.push({
        id: `m-${m.id}`,
        kind: "conversation",
        Icon: ChatBubbleLeftRightIcon,
        tone: "blue",
        title: m.title || m.headline || "Conversation tagged you",
        meta: `${m.post_type || "conversation"} · ${timeAgo(m.updated_at || m.created_at)}`,
        href: m.id ? `/conversations/${m.id}` : "/conversations",
      });
    });
    return out.slice(0, 6);
  }, [overview, personal]);

  // Pipeline counts pulled from the workspace briefing or fallback to
  // overview totals. These map to the Conversations buckets we ship.
  const pipeline = useMemo(() => {
    const buckets = workspace?.pipeline_buckets || {};
    return {
      readyToDecide:
        buckets.ready_to_decide ??
        (Array.isArray(workspace?.proposals_ready_to_decide)
          ? workspace.proposals_ready_to_decide.length
          : 0),
      stalled:
        buckets.stalled ??
        (Array.isArray(workspace?.stalled_threads)
          ? workspace.stalled_threads.length
          : 0),
      inProgress: buckets.in_progress ?? 0,
      awaitingYou: buckets.awaiting_you ?? awaiting.length,
    };
  }, [workspace, awaiting.length]);

  const driftRows = useMemo(() => {
    const signals = Array.isArray(overview?.recent_drift_signals)
      ? overview.recent_drift_signals
      : drift.items || [];
    return signals.slice(0, 4);
  }, [overview, drift.items]);

  const latestLesson = useMemo(() => {
    const retros = Array.isArray(overview?.recent_retros) ? overview.recent_retros : [];
    return retros.find((r) => (r.lesson || "").trim().length > 0) || null;
  }, [overview]);

  return (
    <div className="dash">
      {/* ─── hero ─────────────────────────────────────────────────── */}
      <section className="dash-hero">
        <div>
          <p className="dash-eyebrow">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
          <h1 className="dash-h1">
            {greeting()}{firstName ? `, ${firstName}` : ""}.
          </h1>
          <p className="dash-sub">
            {awaiting.length
              ? `${awaiting.length} thing${awaiting.length === 1 ? "" : "s"} waiting on you across the decision loop.`
              : "Nothing's blocking you. Good time to push the next decision forward."}
          </p>
        </div>
        <div className="dash-hero-actions">
          <Link to="/decisions/new" className="dash-btn dash-btn-primary">
            <PlusIcon /> Draft a decision
          </Link>
          <Link to="/ask" className="dash-btn">
            <SparklesIcon /> Ask Recall
          </Link>
          <Link to="/agent" className="dash-btn">
            <BoltIcon /> Run agent
          </Link>
        </div>
      </section>

      {/* ─── the loop: KPI strip ─────────────────────────────────── */}
      <section className="dash-section">
        <div className="dash-section-head">
          <div>
            <h2 className="dash-h2">The decision loop</h2>
            <p className="dash-h2-sub">
              Every decision logged, every prediction checked, every lesson surfaced. The moat.
            </p>
          </div>
          <Link to="/decisions/intelligence" className="dash-section-link">
            Full scorecard <ArrowRightIcon />
          </Link>
        </div>
        <div className="dash-loop">
          {loopTiles.map(({ key, label, Icon, value, sub, tone, to }) => (
            <Link key={key} to={to} className={`dash-tile dash-tile-${tone}`}>
              <span className="dash-tile-icon">
                <Icon />
              </span>
              <span className="dash-tile-meta">
                <span className="dash-tile-value">{loading ? "—" : value}</span>
                <span className="dash-tile-label">{label}</span>
                <span className="dash-tile-sub">{sub}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── awaiting + pipeline ─────────────────────────────────── */}
      <section className="dash-grid">
        {/* Awaiting you */}
        <article className="dash-card dash-card-tall">
          <div className="dash-card-head">
            <div>
              <h3 className="dash-card-title">
                <HandRaisedIcon /> Needs your attention
              </h3>
              <p className="dash-card-sub">
                Predictions due, retros without a lesson, threads where you're tagged.
              </p>
            </div>
            <span className="dash-card-count">{awaiting.length}</span>
          </div>
          {loading ? (
            <DashSkeleton lines={4} />
          ) : awaiting.length === 0 ? (
            <div className="dash-empty">
              <CheckCircleIcon />
              <p>You're clear. Move something forward.</p>
            </div>
          ) : (
            <ul className="dash-list">
              {awaiting.map((item) => {
                const { Icon } = item;
                return (
                  <li key={item.id}>
                    <Link to={item.href} className="dash-list-row">
                      <span className={`dash-list-mark dash-mark-${item.tone}`}>
                        <Icon />
                      </span>
                      <span className="dash-list-body">
                        <span className="dash-list-title">{item.title}</span>
                        <span className="dash-list-meta">{item.meta}</span>
                      </span>
                      <ArrowRightIcon className="dash-list-arrow" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </article>

        {/* Pipeline */}
        <article className="dash-card">
          <div className="dash-card-head">
            <div>
              <h3 className="dash-card-title">
                <ChatBubbleLeftRightIcon /> Pipeline
              </h3>
              <p className="dash-card-sub">Where ideas are this morning.</p>
            </div>
            <Link to="/conversations" className="dash-link">
              Open pipeline <ArrowRightIcon />
            </Link>
          </div>
          <div className="dash-pipeline">
            <PipelineRow
              label="Ready to decide"
              value={pipeline.readyToDecide}
              tone="emerald"
              hint="Proposals with consensus."
            />
            <PipelineRow
              label="In progress"
              value={pipeline.inProgress}
              tone="blue"
              hint="Active threads this week."
            />
            <PipelineRow
              label="Stalled"
              value={pipeline.stalled}
              tone="amber"
              hint="Open but quiet for over a week."
            />
            <PipelineRow
              label="Awaiting someone"
              value={pipeline.awaitingYou}
              tone="violet"
              hint="Blocked on a human, not a decision."
            />
          </div>
        </article>

        {/* Drift radar */}
        <article className="dash-card">
          <div className="dash-card-head">
            <div>
              <h3 className="dash-card-title">
                <ArrowTrendingDownIcon /> Drift radar
              </h3>
              <p className="dash-card-sub">Predictions reality has answered.</p>
            </div>
          </div>
          {loading ? (
            <DashSkeleton lines={3} />
          ) : driftRows.length === 0 ? (
            <div className="dash-empty">
              <CheckCircleIcon />
              <p>Nothing's drifted lately. Predictions are on track.</p>
            </div>
          ) : (
            <ul className="dash-drift">
              {driftRows.map((d, i) => (
                <li
                  key={d.prediction_id || d.id || i}
                  className={`dash-drift-row dash-drift-${driftToneClass(d.drift_band)}`}
                >
                  <Link
                    to={d.decision_id ? `/decisions/${d.decision_id}` : "/decisions/intelligence"}
                    className="dash-drift-link"
                  >
                    <span className="dash-drift-headline">
                      <span className="dash-drift-dimension">
                        {d.dimension || d.statement || d.decision_title || "Drift event"}
                      </span>
                      <span className="dash-drift-pct">
                        {typeof d.drift_pct === "number"
                          ? `${d.drift_pct > 0 ? "+" : ""}${Math.round(d.drift_pct)}%`
                          : ""}
                      </span>
                    </span>
                    <span className="dash-drift-meta">
                      <span className="dash-drift-band">{(d.drift_band || "unknown").replace("_", " ")}</span>
                      {d.decision_title ? <span>{d.decision_title}</span> : null}
                      <span>{timeAgo(d.observed_at || d.created_at)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </article>

        {/* Latest lesson */}
        <article className="dash-card dash-card-lesson">
          <div className="dash-card-head">
            <div>
              <h3 className="dash-card-title">
                <LightBulbIcon /> Latest lesson
              </h3>
              <p className="dash-card-sub">A retrospective the workspace just captured.</p>
            </div>
          </div>
          {loading ? (
            <DashSkeleton lines={3} />
          ) : !latestLesson ? (
            <div className="dash-empty">
              <LightBulbIcon />
              <p>No lessons captured yet. They show up here as soon as a retrospective lands.</p>
            </div>
          ) : (
            <Link
              to={latestLesson.decision_id ? `/decisions/${latestLesson.decision_id}` : "/decisions/intelligence"}
              className="dash-lesson"
            >
              <p className="dash-lesson-quote">"{latestLesson.lesson}"</p>
              <p className="dash-lesson-attrib">
                {latestLesson.decision_title ? (
                  <span>From <strong>{latestLesson.decision_title}</strong></span>
                ) : (
                  <span>From a recent decision</span>
                )}
                <span className="dash-dot" />
                <span>{timeAgo(latestLesson.created_at)}</span>
              </p>
            </Link>
          )}
        </article>

        {/* Sprint snapshot */}
        <article className="dash-card">
          <div className="dash-card-head">
            <div>
              <h3 className="dash-card-title">
                <FireIcon /> Current sprint
              </h3>
              <p className="dash-card-sub">Where the team's execution sits.</p>
            </div>
            {sprint?.id ? (
              <Link to={`/sprint/${sprint.id}`} className="dash-link">
                Open <ArrowRightIcon />
              </Link>
            ) : null}
          </div>
          {sprint?.id ? (
            <SprintSnapshot sprint={sprint} />
          ) : (
            <div className="dash-empty">
              <FireIcon />
              <p>No active sprint. Start one from the Sprints board.</p>
            </div>
          )}
        </article>

        {/* Activity */}
        <article className="dash-card dash-card-wide">
          <div className="dash-card-head">
            <div>
              <h3 className="dash-card-title">
                <ClockIcon /> Recent activity
              </h3>
              <p className="dash-card-sub">Last 7 days across the workspace.</p>
            </div>
            <Link to="/activity" className="dash-link">
              Open activity <ArrowRightIcon />
            </Link>
          </div>
          {loading ? (
            <DashSkeleton lines={5} />
          ) : !timeline.length ? (
            <div className="dash-empty">
              <ClockIcon />
              <p>It's been quiet. New events will appear here.</p>
            </div>
          ) : (
            <ul className="dash-activity">
              {timeline.slice(0, 8).map((evt, i) => (
                <li key={evt.id || i} className="dash-activity-row">
                  <span className="dash-activity-bullet" />
                  <span className="dash-activity-body">
                    <span>
                      {evt.actor_name ? <strong>{evt.actor_name} </strong> : null}
                      {evt.action_label || evt.summary || evt.title || "did something"}
                    </span>
                    <span className="dash-activity-meta">
                      {evt.target_label || evt.subject || ""}
                      {evt.target_label || evt.subject ? <span className="dash-dot" /> : null}
                      <span>{timeAgo(evt.created_at || evt.timestamp)}</span>
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </div>
  );
}

// ─── small bits ─────────────────────────────────────────────────────────────

function PipelineRow({ label, value, tone, hint }) {
  return (
    <div className={`dash-pipe-row dash-pipe-${tone}`}>
      <span className="dash-pipe-value">{value || 0}</span>
      <span className="dash-pipe-body">
        <span className="dash-pipe-label">{label}</span>
        <span className="dash-pipe-hint">{hint}</span>
      </span>
    </div>
  );
}

function SprintSnapshot({ sprint }) {
  const done = sprint.completed_count ?? 0;
  const wip = sprint.in_progress_count ?? 0;
  const todo = sprint.todo_count ?? 0;
  const total = Math.max(1, done + wip + todo);
  const pct = Math.round((done / total) * 100);
  return (
    <div className="dash-sprint">
      <div className="dash-sprint-head">
        <span className="dash-sprint-name">{sprint.name || "Active sprint"}</span>
        {sprint.end_date ? (
          <span className="dash-sprint-end">
            ends{" "}
            {new Date(sprint.end_date).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </span>
        ) : null}
      </div>
      <div className="dash-sprint-bar">
        <span style={{ width: `${pct}%` }} />
      </div>
      <p className="dash-sprint-meta">
        {done} done · {wip} in progress · {todo} to do
      </p>
    </div>
  );
}

function DashSkeleton({ lines = 3 }) {
  return (
    <div className="dash-skel">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="dash-skel-row" />
      ))}
    </div>
  );
}
