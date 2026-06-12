import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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

function unwrap(payload, fallback) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    return payload.data && typeof payload.data === "object" ? payload.data : payload;
  }
  return fallback;
}

function bandLabel(band) {
  if (!band) return "unknown";
  return band.replace("_", " ");
}

// ─── page ───────────────────────────────────────────────────────────────────

export default function UnifiedDashboard() {
  const { user } = useAuth();
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

  const recentRetros = useMemo(
    () => (Array.isArray(overview?.recent_retros) ? overview.recent_retros : []),
    [overview]
  );
  const pendingChecks = useMemo(
    () => (Array.isArray(overview?.pending_checks) ? overview.pending_checks : []),
    [overview]
  );
  const driftSignals = useMemo(() => {
    const fromOverview = Array.isArray(overview?.recent_drift_signals)
      ? overview.recent_drift_signals
      : [];
    if (fromOverview.length) return fromOverview;
    return Array.isArray(drift.items) ? drift.items : [];
  }, [overview, drift.items]);

  const offTrackCount = useMemo(
    () => driftSignals.filter((d) => d.drift_band === "off_track").length,
    [driftSignals]
  );
  const openRetrosCount = useMemo(
    () => recentRetros.filter((r) => !r.closed_at).length,
    [recentRetros]
  );
  const capturedLessonsCount = useMemo(
    () => recentRetros.filter((r) => (r.lesson || "").trim().length > 0).length,
    [recentRetros]
  );

  const stats = useMemo(
    () => [
      { key: "decisions", label: "Decisions", value: totals.decisions ?? "—", to: "/decisions" },
      {
        key: "predictions",
        label: "Predictions",
        value: totals.predictions ?? "—",
        to: "/decisions/intelligence",
      },
      {
        key: "outcomes",
        label: "Outcomes",
        value: totals.outcome_checks ?? "—",
        sub: pendingChecks.length ? `${pendingChecks.length} pending` : null,
        to: "/decisions/intelligence",
      },
      {
        key: "drift",
        label: "Off-track",
        value: offTrackCount,
        emphasized: offTrackCount > 0,
        to: "/decisions/intelligence",
      },
      {
        key: "retros",
        label: "Open retros",
        value: openRetrosCount,
        sub: totals.retrospectives ? `${totals.retrospectives} total` : null,
        to: "/decisions/intelligence",
      },
      {
        key: "lessons",
        label: "Lessons",
        value: capturedLessonsCount || totals.retrospectives || "—",
        to: "/decisions/intelligence",
      },
    ],
    [totals, pendingChecks.length, offTrackCount, openRetrosCount, capturedLessonsCount]
  );

  // Awaiting items — flat, no colored mark
  const awaiting = useMemo(() => {
    const out = [];
    pendingChecks.slice(0, 3).forEach((p) => {
      out.push({
        id: `pc-${p.prediction_id || p.id}`,
        kind: "prediction",
        title: p.statement || p.dimension || "Prediction needs an outcome check",
        meta: [p.dimension, p.check_at ? `due ${timeAgo(p.check_at)}` : null].filter(Boolean).join(" · "),
        href: p.decision_id ? `/decisions/${p.decision_id}` : "/decisions/intelligence",
      });
    });
    recentRetros
      .filter((r) => !r.closed_at && !(r.lesson || "").trim())
      .slice(0, 2)
      .forEach((r) => {
        out.push({
          id: `retro-${r.id}`,
          kind: "retrospective",
          title: r.summary || "Retrospective needs a lesson",
          meta: [r.triggered_by ? `triggered by ${r.triggered_by}` : null, timeAgo(r.created_at)]
            .filter(Boolean)
            .join(" · "),
          href: r.decision_id ? `/decisions/${r.decision_id}` : "/decisions/intelligence",
        });
      });
    const mentions = personal?.mentions || personal?.recent_conversations || [];
    mentions.slice(0, 2).forEach((m) => {
      out.push({
        id: `m-${m.id}`,
        kind: "conversation",
        title: m.title || m.headline || "Conversation tagged you",
        meta: [m.post_type || "conversation", timeAgo(m.updated_at || m.created_at)]
          .filter(Boolean)
          .join(" · "),
        href: m.id ? `/conversations/${m.id}` : "/conversations",
      });
    });
    return out.slice(0, 6);
  }, [pendingChecks, recentRetros, personal]);

  const pipeline = useMemo(() => {
    const b = workspace?.pipeline_buckets || {};
    return [
      {
        key: "ready",
        label: "Ready to decide",
        value:
          b.ready_to_decide ??
          (Array.isArray(workspace?.proposals_ready_to_decide)
            ? workspace.proposals_ready_to_decide.length
            : 0),
      },
      { key: "wip", label: "In progress", value: b.in_progress ?? 0 },
      {
        key: "stalled",
        label: "Stalled",
        value:
          b.stalled ??
          (Array.isArray(workspace?.stalled_threads) ? workspace.stalled_threads.length : 0),
      },
      { key: "awaiting", label: "Awaiting someone", value: b.awaiting_you ?? 0 },
    ];
  }, [workspace]);

  const driftRows = useMemo(() => driftSignals.slice(0, 5), [driftSignals]);
  const latestLesson = useMemo(
    () => recentRetros.find((r) => (r.lesson || "").trim().length > 0) || null,
    [recentRetros]
  );

  // ─── render ───────────────────────────────────────────────────────────────

  return (
    <div className="dash">
      <header className="dash-hero">
        <div className="dash-hero-left">
          <p className="dash-hero-date">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
          <h1 className="dash-hero-title">
            {firstName || "Welcome back"}
          </h1>
          {awaiting.length > 0 ? (
            <p className="dash-hero-summary">
              {awaiting.length} item{awaiting.length === 1 ? "" : "s"} waiting on you.
            </p>
          ) : (
            <p className="dash-hero-summary">No open items waiting on you.</p>
          )}
        </div>
        <div className="dash-hero-actions">
          <Link to="/decisions/new" className="dash-btn dash-btn-primary">
            Draft a decision
          </Link>
          <Link to="/ask" className="dash-btn">
            Ask Recall
          </Link>
          <Link to="/agent" className="dash-btn">
            Run agent
          </Link>
        </div>
      </header>

      {/* Stat strip — plain numbers, hairlines between. */}
      <section className="dash-stats">
        {stats.map((s, i) => (
          <Link
            key={s.key}
            to={s.to}
            className={`dash-stat${s.emphasized ? " is-emphasized" : ""}`}
          >
            <span className="dash-stat-value">{loading ? "—" : s.value}</span>
            <span className="dash-stat-label">{s.label}</span>
            {s.sub ? <span className="dash-stat-sub">{s.sub}</span> : null}
          </Link>
        ))}
      </section>

      <section className="dash-grid">
        {/* Needs your attention */}
        <article className="dash-card dash-card-tall">
          <header className="dash-card-head">
            <h2>Needs your attention</h2>
            <span className="dash-card-count">{awaiting.length}</span>
          </header>
          {loading ? (
            <DashSkeleton lines={4} />
          ) : awaiting.length === 0 ? (
            <div className="dash-empty">You're clear.</div>
          ) : (
            <ul className="dash-rows">
              {awaiting.map((item) => (
                <li key={item.id}>
                  <Link to={item.href} className="dash-row">
                    <span className="dash-row-kind">{item.kind}</span>
                    <span className="dash-row-main">
                      <span className="dash-row-title">{item.title}</span>
                      <span className="dash-row-meta">{item.meta}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </article>

        {/* Pipeline */}
        <article className="dash-card">
          <header className="dash-card-head">
            <h2>Pipeline</h2>
            <Link to="/conversations" className="dash-card-link">
              View all
            </Link>
          </header>
          <table className="dash-table">
            <tbody>
              {pipeline.map((p) => (
                <tr key={p.key}>
                  <td className="dash-table-num">{loading ? "—" : p.value}</td>
                  <td className="dash-table-label">{p.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        {/* Drift radar */}
        <article className="dash-card">
          <header className="dash-card-head">
            <h2>Drift</h2>
          </header>
          {loading ? (
            <DashSkeleton lines={3} />
          ) : driftRows.length === 0 ? (
            <div className="dash-empty">Nothing's drifted recently.</div>
          ) : (
            <table className="dash-table">
              <tbody>
                {driftRows.map((d, i) => (
                  <tr key={d.prediction_id || d.id || i}>
                    <td className="dash-table-main">
                      <Link
                        to={d.decision_id ? `/decisions/${d.decision_id}` : "/decisions/intelligence"}
                        className="dash-table-link"
                      >
                        {d.dimension || d.statement || d.decision_title || "Drift event"}
                      </Link>
                      {d.decision_title && (d.dimension || d.statement) ? (
                        <span className="dash-table-sub">{d.decision_title}</span>
                      ) : null}
                    </td>
                    <td className="dash-table-pct">
                      {typeof d.drift_pct === "number"
                        ? `${d.drift_pct > 0 ? "+" : ""}${Math.round(d.drift_pct)}%`
                        : "—"}
                    </td>
                    <td className={`dash-table-band dash-band-${d.drift_band || "unknown"}`}>
                      {bandLabel(d.drift_band)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </article>

        {/* Latest lesson — plain text, no quote treatment */}
        <article className="dash-card">
          <header className="dash-card-head">
            <h2>Latest lesson</h2>
          </header>
          {loading ? (
            <DashSkeleton lines={3} />
          ) : !latestLesson ? (
            <div className="dash-empty">No lessons captured yet.</div>
          ) : (
            <Link
              to={
                latestLesson.decision_id
                  ? `/decisions/${latestLesson.decision_id}`
                  : "/decisions/intelligence"
              }
              className="dash-lesson"
            >
              <p className="dash-lesson-text">{latestLesson.lesson}</p>
              <p className="dash-lesson-attrib">
                {latestLesson.decision_title ? (
                  <span>{latestLesson.decision_title}</span>
                ) : (
                  <span>Decision</span>
                )}
                <span className="dash-sep">·</span>
                <span>{timeAgo(latestLesson.created_at)}</span>
              </p>
            </Link>
          )}
        </article>

        {/* Sprint */}
        <article className="dash-card">
          <header className="dash-card-head">
            <h2>Sprint</h2>
            {sprint?.id ? (
              <Link to={`/sprint/${sprint.id}`} className="dash-card-link">
                Open
              </Link>
            ) : null}
          </header>
          {sprint?.id ? (
            <SprintSnapshot sprint={sprint} />
          ) : (
            <div className="dash-empty">No active sprint.</div>
          )}
        </article>

        {/* Activity */}
        <article className="dash-card dash-card-wide">
          <header className="dash-card-head">
            <h2>Activity</h2>
            <Link to="/activity" className="dash-card-link">
              View all
            </Link>
          </header>
          {loading ? (
            <DashSkeleton lines={5} />
          ) : !timeline.length ? (
            <div className="dash-empty">Nothing recent.</div>
          ) : (
            <ul className="dash-activity">
              {timeline.slice(0, 10).map((evt, i) => (
                <li key={evt.id || i} className="dash-activity-row">
                  <span className="dash-activity-body">
                    {evt.actor_name ? (
                      <span className="dash-activity-actor">{evt.actor_name}</span>
                    ) : null}{" "}
                    <span className="dash-activity-text">
                      {evt.action_label || evt.summary || evt.title || "activity"}
                    </span>
                    {evt.target_label || evt.subject ? (
                      <>
                        <span className="dash-sep">·</span>
                        <span className="dash-activity-target">
                          {evt.target_label || evt.subject}
                        </span>
                      </>
                    ) : null}
                  </span>
                  <span className="dash-activity-time">
                    {timeAgo(evt.created_at || evt.timestamp)}
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

function SprintSnapshot({ sprint }) {
  const done = sprint.completed_count ?? 0;
  const wip = sprint.in_progress_count ?? 0;
  const todo = sprint.todo_count ?? 0;
  const total = Math.max(1, done + wip + todo);
  const pct = Math.round((done / total) * 100);
  return (
    <div className="dash-sprint">
      <div className="dash-sprint-meta">
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
      <p className="dash-sprint-counts">
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
