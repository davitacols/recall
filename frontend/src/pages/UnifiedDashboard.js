import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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

// One concrete example beats a placeholder. Phrased the way someone actually
// asks — a question about a choice, not a search term.
const EXAMPLE_QUESTION = "Why are we using a two-stage pipeline?";

export default function UnifiedDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [aiState, setAiState] = useState(null);
  const [overview, setOverview] = useState(null);
  const [personal, setPersonal] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [drift, setDrift] = useState({ items: [], total: 0 });

  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([
      api.get("/api/decisions/intelligence/overview/"),
      api.get("/api/knowledge/dashboard/personal-briefing/"),
      api.get("/api/knowledge/dashboard/workspace-briefing/"),
      api.get("/api/knowledge/timeline/?days=7&page=1&per_page=15"),
      api.get("/api/decisions/outcomes/drift-alerts/"),
      // Pipeline buckets come from conversations — same source the
      // Conversations page buckets so the dashboard counts agree.
      api.get("/api/conversations/?page=1&per_page=80"),
      // Whether the model API is actually answering, so the question box does
      // not promise something that will fail the moment it is used.
      api.get("/api/decisions/memory-health/"),
    ])
      .then(([ovRes, pRes, wRes, tRes, dRes, cRes, mRes]) => {
        if (mRes?.status === "fulfilled") {
          setAiState(unwrap(mRes.value?.data, {})?.ai || null);
        }
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
        if (cRes.status === "fulfilled") {
          const data = cRes.value?.data;
          const list = Array.isArray(data?.results)
            ? data.results
            : Array.isArray(data)
            ? data
            : [];
          setConversations(list.filter((c) => c && c.id));
        }
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
    // Backend returns drift_signals; older deployments may return
    // recent_drift_signals; the legacy outcomes/drift-alerts shape is
    // the last fallback.
    const fromOverview = Array.isArray(overview?.drift_signals)
      ? overview.drift_signals
      : Array.isArray(overview?.recent_drift_signals)
      ? overview.recent_drift_signals
      : [];
    if (fromOverview.length) return fromOverview;
    return Array.isArray(drift.items) ? drift.items : [];
  }, [overview, drift.items]);

  const offTrackCount = useMemo(
    () => driftSignals.filter((d) => d.drift_band === "off_track").length,
    [driftSignals]
  );
  // workspace-briefing was being fetched on every load and thrown away. It
  // computes what changed, what needs attention and the shortest next move,
  // each with a reason and a link — a request paid for and discarded.
  const nextMoves = useMemo(
    () => (Array.isArray(workspace?.suggested_next_moves) ? workspace.suggested_next_moves : []),
    [workspace]
  );

  // The scorecard used to be six numbers about the intelligence layer —
  // predictions, outcome checks, off-track, open retros, lessons. Those only
  // mean something after months of history, and together they crowded out the
  // question the product exists to answer: is the memory any good?
  //
  // A decision without its reasoning is a row in a list; six months later it is
  // exactly as useless as the ticket that prompted it. So the share of
  // decisions carrying a why leads, and the share reaching the code that
  // implemented them comes second. The intelligence numbers are not lost —
  // they moved to where they are actionable: pending checks are already in
  // "Needs your attention", and off-track sits on the Drift panel it describes.
  const memory = useMemo(() => {
    const decisions = totals.decisions ?? 0;
    const withWhy = totals.decisions_with_rationale ?? 0;
    const linked = totals.decisions_linked_to_code ?? 0;
    const convos = totals.conversations ?? 0;
    const captured = totals.conversations_captured ?? 0;
    const pct = (n, d) => (d > 0 ? Math.round((n / d) * 100) : null);
    return {
      decisions,
      withWhy,
      linked,
      convos,
      captured,
      whyPct: pct(withWhy, decisions),
      linkedPct: pct(linked, decisions),
    };
  }, [totals]);

  const [askQuery, setAskQuery] = useState("");

  const askSubmit = (e) => {
    e.preventDefault();
    const q = askQuery.trim();
    if (!q) return;
    navigate(`/ask?q=${encodeURIComponent(q)}`);
  };

  // Decisions that record no reasoning. The percentage is already on the stat
  // strip; this is the same fact phrased as something to do about it.
  const missingWhy = Math.max(0, (memory.decisions || 0) - (memory.withWhy || 0));

  const stats = useMemo(
    () => [
      {
        key: "decisions",
        label: "Decisions recorded",
        value: memory.decisions,
        to: "/decisions",
      },
      {
        key: "why",
        label: "Carry their why",
        value: memory.whyPct === null ? "—" : `${memory.whyPct}%`,
        sub: memory.decisions ? `${memory.withWhy} of ${memory.decisions}` : null,
        // The one number worth reacting to: below half means the record is
        // filling up with decisions nobody will be able to explain.
        emphasized: memory.whyPct !== null && memory.whyPct < 50,
        bar: memory.whyPct,
        to: "/decisions",
      },
      {
        key: "linked",
        label: "Linked to code",
        value: memory.linkedPct === null ? "—" : `${memory.linkedPct}%`,
        sub: memory.decisions ? `${memory.linked} of ${memory.decisions}` : null,
        bar: memory.linkedPct,
        to: "/decisions",
      },
      {
        key: "captured",
        label: "Captured for you",
        value: memory.captured,
        sub: memory.convos ? `of ${memory.convos} conversations` : null,
        to: "/conversations",
      },
    ],
    [memory]
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

  // Pipeline counts derived from the conversations list — same rules the
  // Conversations page uses, so the dashboard matches what users see there.
  const pipeline = useMemo(() => {
    const now = Date.now();
    const daysSince = (v) => {
      const t = v ? new Date(v).getTime() : 0;
      if (!t) return Infinity;
      return (now - t) / 86400000;
    };
    const open = (c) => !c.is_closed && c.status_label !== "resolved";
    let ready = 0;
    let inProgress = 0;
    let stalled = 0;
    let awaiting = 0;
    for (const c of conversations) {
      const age = daysSince(c.updated_at || c.created_at);
      if (
        open(c) &&
        c.post_type === "proposal" &&
        (c.reply_count || 0) >= 3 &&
        (c.emotional_context === "consensus" || (c.reply_count || 0) >= 6)
      ) {
        ready += 1;
        continue;
      }
      if (c.status_label === "in_progress" || (open(c) && age <= 3 && (c.reply_count || 0) > 0)) {
        inProgress += 1;
        continue;
      }
      if (open(c) && age > 7) {
        stalled += 1;
        continue;
      }
      if (open(c) && c.status_label === "needs_followup") {
        awaiting += 1;
      }
    }
    return [
      { key: "ready", label: "Ready to decide", value: ready },
      { key: "wip", label: "In progress", value: inProgress },
      { key: "stalled", label: "Stalled", value: stalled },
      { key: "awaiting", label: "Needs follow-up", value: awaiting },
    ];
  }, [conversations]);

  const driftRows = useMemo(() => driftSignals.slice(0, 5), [driftSignals]);
  const latestLesson = useMemo(
    () => recentRetros.find((r) => (r.lesson || "").trim().length > 0) || null,
    [recentRetros]
  );

  // A brand-new workspace has nothing in it, and the panels below each render
  // their own reassuring empty state — "You're clear", "Nothing's drifted".
  // Those are right for a returning user with a quiet week and exactly wrong
  // for someone thirty seconds past signup, who reads them as "this is empty
  // and there is nothing to do". Detect the zero state and say what to do next.
  const isNewWorkspace = useMemo(
    () =>
      !loading &&
      conversations.length === 0 &&
      timeline.length === 0 &&
      awaiting.length === 0,
    [loading, conversations, timeline, awaiting]
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
            {isNewWorkspace ? `Welcome, ${firstName || "there"}` : "What did we decide, and why?"}
          </h1>
          {isNewWorkspace ? (
            <p className="dash-hero-summary">
              Your workspace is empty, which is the right place to start. Connect a
              repository and Knoledgr begins recording decisions against the pull
              requests that implement them.
            </p>
          ) : (
            <>
              {/* The product's output, on landing. The largest thing on this
                  page used to be the reader's own first name, which tells
                  them they have an account rather than what this holds. */}
              {aiState && aiState.available === false ? (
                /* Do not offer a box that cannot answer. Letting someone type
                   a question, wait, and receive an error reads as the product
                   being broken rather than the balance being empty. */
                <p className="dash-ask-down">
                  {aiState.reason || "The AI service is not responding."}{" "}
                  Answering questions is unavailable until it is restored. The
                  record below is unaffected.
                </p>
              ) : (
                <>
                  <form className="dash-ask" onSubmit={askSubmit}>
                    <input
                      className="dash-ask-input"
                      value={askQuery}
                      onChange={(e) => setAskQuery(e.target.value)}
                      placeholder="Why did we…"
                      aria-label="Ask why"
                    />
                    <button
                      type="submit"
                      className="dash-btn dash-btn-primary"
                      disabled={!askQuery.trim()}
                    >
                      Ask
                    </button>
                  </form>
                  {/* An empty box under an imperative gives no clue what a
                      good question looks like, and this is the one feature
                      nobody has used before. */}
                  <p className="dash-ask-hint">
                    try:{" "}
                    <button
                      type="button"
                      className="dash-ask-example"
                      onClick={() => setAskQuery(EXAMPLE_QUESTION)}
                    >
                      {EXAMPLE_QUESTION}
                    </button>
                  </p>
                </>
              )}
              {missingWhy > 0 ? (
                <p className="dash-hero-gap">
                  {missingWhy} of {memory.decisions} decision
                  {memory.decisions === 1 ? "" : "s"} cannot answer anything —
                  no why recorded.{" "}
                  <Link to="/decisions">Fix them</Link>
                </p>
              ) : awaiting.length > 0 ? (
                <p className="dash-hero-summary">
                  {awaiting.length} item{awaiting.length === 1 ? "" : "s"} waiting on you.
                </p>
              ) : (
                <p className="dash-hero-summary">No open items waiting on you.</p>
              )}
            </>
          )}
        </div>
        <div className="dash-hero-actions">
          {isNewWorkspace ? (
            <>
              <Link to="/integrations/github" className="dash-btn dash-btn-primary">
                Connect GitHub
              </Link>
              <Link to="/decisions/new" className="dash-btn">
                Record a decision
              </Link>
            </>
          ) : (
            <>
              <Link to="/decisions/new" className="dash-btn dash-btn-primary">
                Draft a decision
              </Link>
              <Link to="/agent" className="dash-btn">
                Run agent
              </Link>
            </>
          )}
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
            {!loading && typeof s.bar === "number" ? (
              <span className="dash-stat-bar" aria-hidden="true">
                <span style={{ width: `${Math.max(2, Math.min(100, s.bar))}%` }} />
              </span>
            ) : null}
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
            {/* Off-track used to be a headline stat. It belongs here, beside
                the rows it describes, where the number is actionable rather
                than decorative. */}
            {offTrackCount > 0 ? (
              <span className="dash-card-count is-alert">{offTrackCount} off-track</span>
            ) : null}
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

        {/* Next moves — from the briefing that was previously discarded. */}
        <article className="dash-card">
          <header className="dash-card-head">
            <h2>Next moves</h2>
            {nextMoves.length ? (
              <span className="dash-card-count">{nextMoves.length}</span>
            ) : null}
          </header>
          {loading ? (
            <DashSkeleton lines={3} />
          ) : nextMoves.length === 0 ? (
            <div className="dash-empty">Nothing suggested right now.</div>
          ) : (
            <ul className="dash-rows">
              {nextMoves.slice(0, 4).map((m) => (
                <li key={m.id}>
                  <Link to={m.suggested_action_url || m.source_url || "/"} className="dash-row">
                    <span className="dash-row-kind">{m.kind}</span>
                    <span className="dash-row-main">
                      <span className="dash-row-title">{m.title}</span>
                      {m.why_it_matters ? (
                        <span className="dash-row-meta">{m.why_it_matters}</span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
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


function DashSkeleton({ lines = 3 }) {
  return (
    <div className="dash-skel">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="dash-skel-row" />
      ))}
    </div>
  );
}
