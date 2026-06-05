import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowPathIcon,
  ArrowRightIcon,
  ArrowTrendingUpIcon,
  BoltIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  PlayCircleIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../components/Toast";
import {
  Avatar,
  Breadcrumb,
  Button,
  EmptyState,
  Lozenge,
  PageHeader,
  SectionMessage,
  Tabs,
} from "../components/atlas";
import { useAgentContextHint, useAgentDock } from "../components/AgentDock";
import "./DecisionsIntelligence.css";

const TABS = [
  { id: "attention", label: "What needs attention" },
  { id: "lessons", label: "Lessons feed" },
  { id: "drift", label: "Drift signals" },
];

const BAND_META = {
  exceeded: { label: "Exceeded", color: "#006644" },
  on_track: { label: "On track", color: "#00875A" },
  drifting: { label: "Drifting", color: "#FF8B00" },
  off_track: { label: "Off track", color: "#DE350B" },
  unknown: { label: "Pending", color: "#7A869A" },
};

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

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

export default function DecisionsIntelligence() {
  const { user } = useAuth();
  const toast = useToast?.() || { success: () => {}, error: () => {} };
  const agentDock = useAgentDock();
  const isAdmin = ["admin", "manager"].includes(user?.role || "");

  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("attention");
  const [running, setRunning] = useState(false);

  // Hint the agent dock toward decision-reviewer when on this page.
  useAgentContextHint({
    kind: "decision-intelligence",
    label: "Decision Intelligence",
    goalPrefix: "Audit the workspace's decision intelligence — surface drift, overdue checks, and what we should learn. ",
    profile_slug: "decision-reviewer",
  });

  const fetchOverview = useCallback(async () => {
    setError("");
    try {
      const { data } = await api.get("/api/decisions/intelligence/overview/");
      setOverview(data || null);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Could not load intelligence overview");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const handleRunSweep = async () => {
    if (running) return;
    setRunning(true);
    try {
      const { data } = await api.post("/api/decisions/intelligence/sweep/");
      const summary = data?.summary || {};
      toast.success?.(
        `Sweep complete — ${summary.overdue_nudges_sent || 0} nudges sent, ${summary.auto_retros_opened || 0} retros opened`
      );
      await fetchOverview();
    } catch (err) {
      toast.error?.(err?.response?.data?.error || "Sweep failed");
    } finally {
      setRunning(false);
    }
  };

  const totals = overview?.totals || {};
  const driftSignals = overview?.drift_signals || [];
  const pendingChecks = overview?.pending_checks || [];
  const recentRetros = overview?.recent_retros || [];

  // Decision quality score: rough heuristic from confidence_delta values.
  const qualityScore = useMemo(() => {
    if (!recentRetros.length) return null;
    const deltas = recentRetros
      .map((r) => r.confidence_delta)
      .filter((d) => typeof d === "number");
    if (!deltas.length) return null;
    const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    // Map -10..+10 to 0..100, where 0 delta = 50.
    return Math.round(((avg + 10) / 20) * 100);
  }, [recentRetros]);

  return (
    <div className="dii">
      <div style={{ padding: "24px 32px 0" }}>
        <Breadcrumb
          items={[
            { label: "Knoledgr", to: "/" },
            { label: "Decisions", to: "/decisions" },
            { label: "Intelligence" },
          ]}
        />
      </div>

      <div style={{ padding: "0 32px" }}>
        <PageHeader
          title={
            <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
              <span className="dii-title-mark">
                <ArrowTrendingUpIcon />
              </span>
              Decision Intelligence
            </span>
          }
          subtitle="Predicted outcomes vs. reality across every decision. Drift surfaces here automatically and compounds into lessons future decisions can use."
          actions={
            <>
              <Button
                appearance="subtle"
                iconBefore={<BoltIcon style={{ width: 14, height: 14 }} />}
                onClick={() => agentDock.open()}
                title="Ask the decision-reviewer agent (⌘J)"
              >
                Ask Agent
              </Button>
              <Button
                appearance="subtle"
                iconBefore={<ArrowPathIcon style={{ width: 14, height: 14 }} />}
                onClick={fetchOverview}
                isDisabled={loading}
              >
                Refresh
              </Button>
              {isAdmin ? (
                <Button
                  appearance="primary"
                  iconBefore={<PlayCircleIcon style={{ width: 14, height: 14 }} />}
                  onClick={handleRunSweep}
                  isDisabled={running}
                  title="Trigger the daily sweep right now"
                >
                  {running ? "Running…" : "Run sweep now"}
                </Button>
              ) : null}
            </>
          }
          style={{ padding: "0", marginTop: 12, background: "transparent" }}
        />
      </div>

      {error ? (
        <div style={{ padding: "16px 32px 0" }}>
          <SectionMessage tone="error">{error}</SectionMessage>
        </div>
      ) : null}

      {loading ? (
        <div style={{ padding: 32, color: "var(--app-muted)" }}>Loading intelligence overview…</div>
      ) : (
        <div style={{ padding: "16px 32px 32px" }}>
          {/* Scorecard tiles */}
          <section className="dii-tiles">
            <Tile
              label="Predictions"
              value={totals.predictions || 0}
              icon={<ChartBarIcon />}
              hint="Predicted outcomes tracked"
            />
            <Tile
              label="Outcome checks"
              value={totals.outcome_checks || 0}
              icon={<CheckCircleIcon />}
              hint="Reality observations logged"
            />
            <Tile
              label="Retrospectives"
              value={totals.retrospectives || 0}
              icon={<LightBulbIcon />}
              hint="Lessons compounding"
            />
            <Tile
              label="Twin runs"
              value={totals.twin_runs || 0}
              icon={<SparklesIcon />}
              hint="Counterfactual analyses"
            />
          </section>

          {/* Quality score + headline signals */}
          <section className="dii-headline">
            <QualityScoreCard score={qualityScore} retroCount={recentRetros.length} />
            <HeadlineSignals
              driftCount={driftSignals.length}
              pendingCount={pendingChecks.length}
              onJumpToDrift={() => setTab("drift")}
              onJumpToAttention={() => setTab("attention")}
            />
          </section>

          {/* Tabbed surfaces */}
          <div style={{ marginTop: 24 }}>
            <Tabs
              tabs={[
                { id: "attention", label: "What needs attention", count: pendingChecks.length },
                { id: "lessons", label: "Lessons feed", count: recentRetros.length },
                { id: "drift", label: "Drift signals", count: driftSignals.length },
              ]}
              value={tab}
              onChange={setTab}
            />
          </div>

          <div style={{ marginTop: 16 }}>
            {tab === "attention" ? <AttentionTab items={pendingChecks} /> : null}
            {tab === "lessons" ? <LessonsTab items={recentRetros} /> : null}
            {tab === "drift" ? <DriftTab items={driftSignals} /> : null}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── tiles ──────────────────────────────────────────────────────────────────

function Tile({ label, value, icon, hint }) {
  return (
    <div className="dii-tile">
      <span className="dii-tile-icon">{icon}</span>
      <div className="dii-tile-body">
        <p className="dii-tile-label">{label}</p>
        <p className="dii-tile-value">{value}</p>
        {hint ? <p className="dii-tile-hint">{hint}</p> : null}
      </div>
    </div>
  );
}

function QualityScoreCard({ score, retroCount }) {
  const hasData = typeof score === "number";
  const band =
    !hasData ? "no-data"
    : score >= 70 ? "good"
    : score >= 40 ? "watch"
    : "low";
  const tagText =
    !hasData ? "No data yet"
    : band === "good" ? "Healthy decisions"
    : band === "watch" ? "Watch closely"
    : "At risk";

  return (
    <div className={`dii-quality dii-quality--${band}`}>
      <div className="dii-quality-bar">
        <div
          className="dii-quality-fill"
          style={{ width: hasData ? `${score}%` : "0%" }}
        />
      </div>
      <div className="dii-quality-meta">
        <div>
          <p className="dii-quality-eyebrow">Decision Quality Score</p>
          <p className="dii-quality-value">
            {hasData ? score : "—"}
            <span>/100</span>
          </p>
        </div>
        <div className="dii-quality-detail">
          <Lozenge variant={
            band === "good" ? "success"
            : band === "watch" ? "moved"
            : band === "low" ? "removed"
            : "default"
          }>
            {tagText}
          </Lozenge>
          <p className="dii-quality-hint">
            {hasData
              ? `Derived from confidence deltas across ${retroCount} recent retrospective${retroCount === 1 ? "" : "s"}.`
              : "Open retrospectives with a confidence delta to start building this score."}
          </p>
        </div>
      </div>
    </div>
  );
}

function HeadlineSignals({ driftCount, pendingCount, onJumpToDrift, onJumpToAttention }) {
  const driftTone = driftCount > 0 ? "warning" : "info";
  const pendingTone = pendingCount > 0 ? "warning" : "info";
  return (
    <div className="dii-signals">
      <button
        type="button"
        className={`dii-signal dii-signal--${pendingTone}`}
        onClick={onJumpToAttention}
      >
        <span className="dii-signal-icon">
          <ClockIcon />
        </span>
        <span className="dii-signal-text">
          <span className="dii-signal-value">{pendingCount}</span>
          <span className="dii-signal-label">overdue check-in{pendingCount === 1 ? "" : "s"}</span>
        </span>
        <ChevronRightIcon className="dii-signal-arrow" />
      </button>
      <button
        type="button"
        className={`dii-signal dii-signal--${driftTone}`}
        onClick={onJumpToDrift}
      >
        <span className="dii-signal-icon">
          <ExclamationTriangleIcon />
        </span>
        <span className="dii-signal-text">
          <span className="dii-signal-value">{driftCount}</span>
          <span className="dii-signal-label">drift signal{driftCount === 1 ? "" : "s"}</span>
        </span>
        <ChevronRightIcon className="dii-signal-arrow" />
      </button>
    </div>
  );
}

// ─── tabs: attention ────────────────────────────────────────────────────────

function AttentionTab({ items }) {
  if (!items.length) {
    return (
      <EmptyState
        icon={<CheckCircleIcon style={{ width: "100%", height: "100%" }} />}
        title="No overdue check-ins"
        description="Every prediction with a passed check-in date has a recent observation. Reality is being logged."
      />
    );
  }
  return (
    <ul className="dii-list">
      {items.map((p) => (
        <li key={p.prediction_id} className="dii-list-row dii-list-row--attention">
          <span className="dii-list-icon dii-list-icon--warning">
            <ClockIcon />
          </span>
          <div className="dii-list-body">
            <Link to={`/decisions/${p.decision_id}`} className="dii-list-title">
              {p.decision_title}
            </Link>
            <p className="dii-list-statement">
              <strong>{p.dimension}:</strong> {p.statement}
            </p>
            <p className="dii-list-meta">
              Check date: {formatDate(p.check_at)} ·{" "}
              <span style={{ color: "#B45309", fontWeight: 600 }}>
                {p.overdue_days} day{p.overdue_days === 1 ? "" : "s"} overdue
              </span>
            </p>
          </div>
          <Link to={`/decisions/${p.decision_id}`} className="dii-list-cta">
            How did it go?
            <ArrowRightIcon />
          </Link>
        </li>
      ))}
    </ul>
  );
}

// ─── tabs: lessons ──────────────────────────────────────────────────────────

function LessonsTab({ items }) {
  if (!items.length) {
    return (
      <EmptyState
        icon={<LightBulbIcon style={{ width: "100%", height: "100%" }} />}
        title="No lessons yet"
        description="When a retrospective gets opened — by drift, by milestone, or manually — its lesson will compound here."
      />
    );
  }
  return (
    <ul className="dii-lessons">
      {items.map((r) => {
        const delta = r.confidence_delta;
        const deltaTone =
          typeof delta === "number"
            ? delta > 0 ? "positive" : delta < 0 ? "negative" : "neutral"
            : "neutral";
        return (
          <li key={r.id} className={`dii-lesson dii-lesson--${deltaTone}`}>
            <div className="dii-lesson-head">
              <Link to={`/decisions/${r.decision_id}`} className="dii-lesson-title">
                {r.decision_title}
              </Link>
              <span className="dii-lesson-time">{timeAgo(r.created_at)}</span>
            </div>
            {r.lesson ? <p className="dii-lesson-text">{r.lesson}</p> : <p className="dii-lesson-text dii-lesson-empty">No lesson text captured yet — open the retrospective to fill it in.</p>}
            <div className="dii-lesson-foot">
              {Array.isArray(r.tags) && r.tags.length ? (
                <div className="dii-lesson-tags">
                  {r.tags.slice(0, 5).map((t) => <Lozenge key={t}>{t}</Lozenge>)}
                </div>
              ) : <span />}
              {typeof delta === "number" ? (
                <span className={`dii-lesson-delta dii-lesson-delta--${deltaTone}`}>
                  Confidence delta: <strong>{delta > 0 ? "+" : ""}{delta}</strong>
                </span>
              ) : null}
              {r.author ? (
                <span className="dii-lesson-author">
                  <Avatar size="sm" name={r.author.name || ""} />
                  <span>{r.author.name}</span>
                </span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ─── tabs: drift ────────────────────────────────────────────────────────────

function DriftTab({ items }) {
  if (!items.length) {
    return (
      <EmptyState
        icon={<ArrowTrendingUpIcon style={{ width: "100%", height: "100%" }} />}
        title="No drift signals"
        description="Every prediction with a recent observation is on track. Drift will show here automatically."
      />
    );
  }
  return (
    <ul className="dii-list">
      {items.map((d, i) => {
        const meta = BAND_META[d.drift_band] || BAND_META.unknown;
        return (
          <li key={i} className={`dii-list-row dii-list-row--drift`}>
            <span className="dii-list-icon" style={{ background: `${meta.color}1f`, color: meta.color }}>
              <ExclamationTriangleIcon />
            </span>
            <div className="dii-list-body">
              <Link to={`/decisions/${d.decision_id}`} className="dii-list-title">
                {d.decision_title}
              </Link>
              <p className="dii-list-statement">
                <strong>{d.dimension}</strong> landed {meta.label.toLowerCase()}
                {typeof d.drift_pct === "number" ? (
                  <span style={{ color: meta.color, fontWeight: 700 }}>
                    {" "}({d.drift_pct > 0 ? "+" : ""}{d.drift_pct.toFixed(1)}% from target)
                  </span>
                ) : null}.
              </p>
              <p className="dii-list-meta">Observed {timeAgo(d.observed_at)}</p>
            </div>
            <Link to={`/decisions/${d.decision_id}`} className="dii-list-cta">
              Open
              <ArrowRightIcon />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
