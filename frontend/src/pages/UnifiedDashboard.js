import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRightIcon, BoltIcon, ExclamationTriangleIcon, QueueListIcon, SparklesIcon } from "@heroicons/react/24/outline";
import MissionControlPanel from "../components/MissionControlPanel";
import { WorkspaceEmptyState, WorkspacePanel } from "../components/WorkspaceChrome";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { buildApiUrl } from "../utils/apiBase";
import { getProjectPalette } from "../utils/projectUi";

function humanizeActivityType(activity) {
  const raw = activity?.content_type?.split(".").pop() || activity?.type || "activity";
  return raw.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDateLabel(value) {
  if (!value) return "Recently";
  try {
    return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch (_) {
    return "Recently";
  }
}

function getActivitySummary(activity) {
  return activity?.summary || activity?.description || `${humanizeActivityType(activity)} activity was added to the team memory stream.`;
}

function SummaryCard({ label, value, tone, palette }) {
  return (
    <article
      className="ui-card-lift ui-smooth"
      style={{
        borderRadius: 16,
        padding: 12,
        display: "grid",
        gap: 4,
        border: `1px solid ${palette.border}`,
        background: palette.cardAlt,
      }}
    >
      <p style={{ ...microLabel, color: palette.muted }}>{label}</p>
      <p style={{ ...summaryValue, color: tone }}>{value}</p>
    </article>
  );
}

function MetricStrip({ label, value, detail, tone, palette }) {
  return (
    <article
      className="ui-card-lift ui-smooth"
      style={{
        borderRadius: 18,
        padding: 14,
        display: "grid",
        gap: 6,
        border: `1px solid ${palette.border}`,
        background: palette.card,
      }}
    >
      <p style={{ ...microLabel, color: palette.muted }}>{label}</p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 10 }}>
        <p style={{ ...summaryValue, color: tone, fontSize: 28 }}>{value}</p>
        <p style={{ ...caption, color: palette.muted, textAlign: "right" }}>{detail}</p>
      </div>
    </article>
  );
}

function CommandCard({ title, description, metric, to, palette, darkMode, icon: Icon }) {
  return (
    <Link
      to={to}
      className="ui-card-lift ui-smooth ui-focus-ring"
      style={{
        ...commandCard,
        color: palette.text,
        border: `1px solid ${palette.border}`,
        background: darkMode
          ? `linear-gradient(180deg, ${palette.cardAlt}, rgba(20,18,16,0.92))`
          : "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248,244,238,0.92))",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ display: "grid", gap: 6 }}>
          <p style={{ ...microLabel, color: palette.muted }}>Action Atlas</p>
          <h3 style={{ margin: 0, fontSize: 18, lineHeight: 1.08 }}>{title}</h3>
        </div>
        <span
          style={{
            width: 38,
            height: 38,
            borderRadius: 14,
            display: "grid",
            placeItems: "center",
            border: `1px solid ${palette.border}`,
            background: palette.panel,
            color: palette.accent,
            flexShrink: 0,
          }}
        >
          <Icon style={{ width: 18, height: 18 }} />
        </span>
      </div>
      <p style={{ ...bodyCopy, color: palette.muted }}>{description}</p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <span style={{ ...commandMetric, color: palette.text }}>{metric}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 800 }}>
          Open <ArrowRightIcon style={icon14} />
        </span>
      </div>
    </Link>
  );
}

function PriorityCard({ title, value, helper, note, to, tone, palette, icon: Icon }) {
  return (
    <Link
      to={to}
      className="ui-card-lift ui-smooth ui-focus-ring"
      style={{
        ...priorityCard,
        color: palette.text,
        border: `1px solid ${palette.border}`,
        background: palette.cardAlt,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "grid", gap: 6 }}>
          <p style={{ ...microLabel, color: palette.muted }}>{title}</p>
          <p style={{ ...summaryValue, color: tone }}>{value}</p>
        </div>
        <span
          style={{
            width: 40,
            height: 40,
            borderRadius: 14,
            display: "grid",
            placeItems: "center",
            background: palette.panel,
            border: `1px solid ${palette.border}`,
            color: tone,
            flexShrink: 0,
          }}
        >
          <Icon style={{ width: 18, height: 18 }} />
        </span>
      </div>
      <p style={{ ...caption, color: palette.muted }}>{helper}</p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.5 }}>{note}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 800 }}>
          Review <ArrowRightIcon style={icon14} />
        </span>
      </div>
    </Link>
  );
}

export default function UnifiedDashboard() {
  const { darkMode } = useTheme();
  const [timeline, setTimeline] = useState([]);
  const [stats, setStats] = useState({ activity: 0, nodes: 0, links: 0, rate: 0 });
  const [outcomeStats, setOutcomeStats] = useState({
    reviewed_count: 0,
    success_count: 0,
    failure_count: 0,
    success_rate: 0,
    avg_reliability: 0,
  });
  const [pendingOutcomeReviews, setPendingOutcomeReviews] = useState([]);
  const [pendingOutcomeMeta, setPendingOutcomeMeta] = useState({ total: 0, overdue: 0 });
  const [notifyingOutcomes, setNotifyingOutcomes] = useState(false);
  const [orchestratingOutcomes, setOrchestratingOutcomes] = useState(false);
  const [driftAlerts, setDriftAlerts] = useState([]);
  const [driftMeta, setDriftMeta] = useState({ total: 0, critical: 0, high: 0 });
  const [currentSprint, setCurrentSprint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isNarrow, setIsNarrow] = useState(window.innerWidth < 1180);

  useEffect(() => {
    fetchDashboardData();
  }, [page]);

  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 1180);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const palette = useMemo(() => {
    const basePalette = getProjectPalette(darkMode);
    return {
      panel: "var(--ui-panel)",
      card: "var(--ui-panel)",
      panelAlt: "var(--ui-panel-alt)",
      cardAlt: "var(--ui-panel-alt)",
      border: "var(--ui-border)",
      text: "var(--ui-text)",
      muted: "var(--ui-muted)",
      accent: "var(--ui-accent)",
      accentSoft: basePalette.accentSoft,
      info: "var(--ui-info)",
      good: "var(--ui-good)",
      warn: "var(--ui-warn)",
      danger: "var(--ui-danger)",
      buttonText: "var(--app-button-text)",
      ctaGradient: "var(--app-gradient-primary)",
    };
  }, [darkMode]);

  const readJsonSafe = async (response, fallback = {}) => {
    try {
      const text = await response.text();
      return text ? JSON.parse(text) : fallback;
    } catch (_) {
      return fallback;
    }
  };

  const unwrapPayload = (payload, fallback = {}) => {
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === "object") return payload.data && typeof payload.data === "object" ? payload.data : payload;
    return fallback;
  };

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem("access_token") || localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const [timelineRes, statsRes, outcomesRes, pendingRes, driftRes, sprintRes] = await Promise.all([
        fetch(buildApiUrl(`/api/knowledge/timeline/?days=7&page=${page}&per_page=10`), { headers }),
        fetch(buildApiUrl("/api/knowledge/ai/success-rates/"), { headers }),
        fetch(buildApiUrl("/api/decisions/outcomes/stats/"), { headers }),
        fetch(buildApiUrl("/api/decisions/outcomes/pending/?overdue_only=false"), { headers }),
        fetch(buildApiUrl("/api/decisions/outcomes/drift-alerts/"), { headers }),
        fetch(buildApiUrl("/api/agile/current-sprint/"), { headers }),
      ]);

      const timelineData = unwrapPayload(await readJsonSafe(timelineRes, { results: [], pagination: { has_next: false } }), { results: [], pagination: { has_next: false } });
      const results = timelineData.results || timelineData;
      setTimeline((prev) => (page === 1 ? results : [...prev, ...results]));
      setHasMore(timelineData.pagination?.has_next || false);

      const statsData = unwrapPayload(await readJsonSafe(statsRes, {}), {});
      const outcomesData = unwrapPayload(await readJsonSafe(outcomesRes, {}), {});
      const pendingData = unwrapPayload(await readJsonSafe(pendingRes, { items: [] }), { items: [] });
      const driftData = unwrapPayload(await readJsonSafe(driftRes, { items: [] }), { items: [] });
      const sprintData = unwrapPayload(await readJsonSafe(sprintRes, null), null);

      setOutcomeStats({
        reviewed_count: outcomesData.reviewed_count || 0,
        success_count: outcomesData.success_count || 0,
        failure_count: outcomesData.failure_count || 0,
        success_rate: outcomesData.success_rate || 0,
        avg_reliability: outcomesData.avg_reliability || 0,
      });
      setPendingOutcomeReviews(pendingData.items || []);
      setPendingOutcomeMeta({ total: pendingData.total || 0, overdue: pendingData.overdue || 0 });
      setDriftAlerts(driftData.items || []);
      setDriftMeta({ total: driftData.total || 0, critical: driftData.critical || 0, high: driftData.high || 0 });
      setCurrentSprint(sprintData || null);
      setStats({
        activity: timelineData.pagination?.total || results.length,
        nodes: statsData.overall?.decisions?.total || 0,
        links: 0,
        rate: statsData.overall?.decisions?.rate || 0,
      });
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityUrl = (activity) => {
    const type = activity.content_type?.split(".")[1] || "conversation";
    return {
      conversation: `/conversations/${activity.object_id}`,
      decision: `/decisions/${activity.object_id}`,
      meeting: `/business/meetings/${activity.object_id}`,
      document: `/business/documents/${activity.object_id}`,
      task: "/business/tasks",
    }[type] || "/";
  };

  const sendOutcomeReminders = async () => {
    setNotifyingOutcomes(true);
    try {
      const token = localStorage.getItem("access_token") || localStorage.getItem("token");
      await fetch(buildApiUrl("/api/decisions/outcomes/pending/notify/"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ overdue_only: true }),
      });
      await fetchDashboardData();
    } catch (error) {
      console.error("Failed to send outcome reminders:", error);
    } finally {
      setNotifyingOutcomes(false);
    }
  };

  const runFollowUpOrchestrator = async () => {
    setOrchestratingOutcomes(true);
    try {
      const token = localStorage.getItem("access_token") || localStorage.getItem("token");
      await fetch(buildApiUrl("/api/decisions/outcomes/follow-up/run/"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 20 }),
      });
      await fetchDashboardData();
    } catch (error) {
      console.error("Failed to run follow-up orchestrator:", error);
    } finally {
      setOrchestratingOutcomes(false);
    }
  };

  const sprintBlocked = currentSprint?.blocked_count || currentSprint?.blocked || 0;
  const sprintInProgress = currentSprint?.in_progress || 0;
  const sprintTotal = currentSprint?.issue_count || 0;
  const sprintCompleted = currentSprint?.completed_count || currentSprint?.completed || 0;
  const sprintProgress = sprintTotal > 0 ? Math.round((sprintCompleted / sprintTotal) * 100) : 0;
  const todayLabel = new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  const featuredActivity = timeline[0] || null;
  const signalStream = featuredActivity ? timeline.slice(1, 7) : [];
  const successRate = Math.round(outcomeStats.success_rate || 0);
  const reliability = Math.round(outcomeStats.avg_reliability || 0);
  const note = pendingOutcomeMeta.overdue > 0
    ? `${pendingOutcomeMeta.overdue} overdue reviews are still the clearest risk on the board.`
    : driftMeta.critical > 0
      ? `${driftMeta.critical} critical drift alerts need attention before new work piles on.`
      : sprintBlocked > 0
        ? `${sprintBlocked} blocked sprint items are the main execution drag right now.`
        : "Nothing is spiking right now, so the dashboard can stay calm and scan-first.";

  const commandDeck = [
    {
      title: "Projects",
      description: "Shift from overview into the delivery map with active projects, briefs, and roadmaps.",
      metric: `${sprintTotal || 0} sprint items in view`,
      to: "/projects",
      icon: QueueListIcon,
    },
    {
      title: "Sprint Board",
      description: "Open the live execution lane with blockers, in-flight work, and completion progress.",
      metric: currentSprint ? `${sprintProgress}% complete` : "No active sprint",
      to: "/sprint",
      icon: BoltIcon,
    },
    {
      title: "Decision Hub",
      description: "Review proposals, follow-through, and drift before context starts slipping away.",
      metric: `${pendingOutcomeMeta.total} reviews pending`,
      to: "/decisions",
      icon: SparklesIcon,
    },
    {
      title: "Ask Recall",
      description: "Use grounded organizational memory to answer questions before the day branches out.",
      metric: `${stats.activity} signals this week`,
      to: "/ask",
      icon: ExclamationTriangleIcon,
    },
  ];

  const focusItems = [
    pendingOutcomeMeta.overdue > 0
      ? `${pendingOutcomeMeta.overdue} overdue outcome reviews need follow-through.`
      : "Outcome review queue is under control right now.",
    driftMeta.critical > 0
      ? `${driftMeta.critical} critical drift alerts need a decision owner today.`
      : "No critical decision drift is active.",
    currentSprint
      ? `${sprintBlocked} blocked and ${sprintInProgress} in progress in ${currentSprint.name}.`
      : "No active sprint is shaping delivery signals yet.",
  ];

  if (loading) {
    return (
      <div style={loadingWrap}>
        <div style={{ ...loadingCard, color: palette.text, border: `1px solid ${palette.border}`, background: `linear-gradient(180deg, ${palette.panel}, ${palette.cardAlt})` }}>
          <div style={loadingTop}>
            <div style={{ ...loadingOrb, background: palette.ctaGradient }}><span className="spinner" aria-hidden="true" /></div>
            <div>
              <p style={{ ...microLabel, color: palette.muted }}>Dashboard Sync</p>
              <p style={loadingTitle}>Hydrating your command center</p>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: palette.muted }}>Pulling activity, decisions, outcomes, and sprint signals</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <section
        className="ui-enter"
        style={{
          ...shellCard,
          "--ui-delay": "80ms",
          border: `1px solid ${palette.border}`,
          background: darkMode ? `linear-gradient(155deg, ${palette.panel}, ${palette.cardAlt})` : "linear-gradient(155deg, rgba(255,252,247,0.98), rgba(245,238,228,0.88))",
        }}
      >
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: isNarrow ? "1fr" : "minmax(0,1.18fr) minmax(320px,0.82fr)" }}>
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "grid", gap: 8 }}>
              <p style={{ ...microLabel, color: palette.muted }}>Dashboard briefing | {todayLabel}</p>
              <h1 style={{ ...heroTitle, color: palette.text }}>Run the day from one grounded operating board.</h1>
              <p style={{ ...bodyCopy, color: palette.muted, maxWidth: 620 }}>
                Decisions, sprint movement, and team memory are arranged here in the order an operator actually needs them: what needs attention, where to act, and what changed most recently.
              </p>
            </div>

            <article
              className="ui-card-lift ui-smooth"
              style={{
                ...briefingCard,
                border: `1px solid ${palette.border}`,
                background: darkMode
                  ? `linear-gradient(160deg, rgba(32,27,23,0.92), rgba(17,15,13,0.98))`
                  : "linear-gradient(160deg, rgba(255,255,255,0.98), rgba(248,242,233,0.96))",
              }}
            >
              <div style={{ display: "grid", gap: 8 }}>
                <p style={{ ...microLabel, color: palette.muted }}>Today&apos;s focus</p>
                <h2 style={{ ...sectionTitle, color: palette.text, fontSize: 30 }}>What deserves the first scan</h2>
                <p style={{ ...bodyCopy, color: palette.muted, maxWidth: 620 }}>{note}</p>
              </div>
              <div style={{ display: "grid", gap: 10, gridTemplateColumns: isNarrow ? "1fr" : "repeat(3, minmax(0, 1fr))" }}>
                {focusItems.map((item) => (
                  <div key={item} style={{ ...focusCard, border: `1px solid ${palette.border}`, background: palette.panel }}>
                    <span style={{ ...focusDot, background: palette.accent }} />
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: palette.text }}>{item}</p>
                  </div>
                ))}
              </div>
            </article>

            <div style={{ display: "grid", gap: 12, gridTemplateColumns: isNarrow ? "1fr" : "repeat(2, minmax(0, 1fr))" }}>
              {commandDeck.map((card) => (
                <CommandCard key={card.title} {...card} palette={palette} darkMode={darkMode} />
              ))}
            </div>

            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
              <MetricStrip label="Signals" value={stats.activity} detail="Weekly movement in the memory stream" tone={palette.accent} palette={palette} />
              <MetricStrip label="Reliability" value={`${reliability}%`} detail="Average outcome confidence from reviewed decisions" tone={palette.good} palette={palette} />
              <MetricStrip label="Success Rate" value={`${successRate}%`} detail={`${outcomeStats.reviewed_count || 0} reviewed outcomes so far`} tone={palette.info} palette={palette} />
              <MetricStrip label="Decision Coverage" value={stats.nodes} detail={`${pendingOutcomeMeta.total || 0} items still waiting on follow-through`} tone={palette.text} palette={palette} />
            </div>
          </div>

          <article
            className="ui-card-lift ui-smooth"
            style={{
              ...panelCard,
              border: `1px solid ${palette.border}`,
              background: darkMode
                ? `linear-gradient(180deg, ${palette.card}, rgba(19,17,15,0.95))`
                : "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(244,238,229,0.92))",
            }}
          >
            <div style={{ display: "grid", gap: 6 }}>
              <p style={{ ...microLabel, color: palette.muted }}>Execution lane</p>
              <h2 style={{ margin: 0, fontSize: 20, lineHeight: 1.05, color: palette.text }}>{currentSprint?.name || "No active sprint"}</h2>
              <p style={{ ...bodyCopy, color: palette.muted }}>
                {currentSprint
                  ? `${sprintCompleted} of ${sprintTotal} items are complete, with ${sprintBlocked} blocked and ${sprintInProgress} actively moving.`
                  : "Start or activate a sprint to surface delivery signals from this home screen."}
              </p>
            </div>

            {currentSprint ? (
              <>
                <div style={{ width: "100%", height: 10, borderRadius: 999, overflow: "hidden", background: palette.border }}>
                  <div style={{ width: `${sprintProgress}%`, height: "100%", borderRadius: 999, background: palette.ctaGradient }} />
                </div>
                <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                  <SummaryCard label="Progress" value={`${sprintProgress}%`} tone={palette.text} palette={palette} />
                  <SummaryCard label="Blocked" value={sprintBlocked} tone={sprintBlocked > 0 ? palette.warn : palette.good} palette={palette} />
                </div>
                <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                  <SummaryCard label="In Progress" value={sprintInProgress} tone={palette.accent} palette={palette} />
                  <SummaryCard label="Completed" value={sprintCompleted} tone={palette.good} palette={palette} />
                </div>
              </>
            ) : (
              <Link className="ui-btn-polish ui-focus-ring" to="/sprint" style={secondaryButton(palette)}>Open Sprint Board</Link>
            )}

            <div style={{ ...railDivider, borderTop: `1px solid ${palette.border}` }} />

            <div style={{ display: "grid", gap: 10 }}>
              <p style={{ ...microLabel, color: palette.muted }}>Operator pulse</p>
              <div style={{ display: "grid", gap: 10 }}>
                {[
                  { label: "Decision reliability", value: `${reliability}%`, tone: palette.good },
                  { label: "Follow-through pressure", value: `${pendingOutcomeMeta.overdue} overdue`, tone: pendingOutcomeMeta.overdue ? palette.warn : palette.good },
                  { label: "Critical drift", value: `${driftMeta.critical}`, tone: driftMeta.critical ? palette.accent : palette.info },
                ].map((item) => (
                  <div key={item.label} style={{ ...pulseRow, border: `1px solid ${palette.border}`, background: palette.panel }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: palette.text }}>{item.label}</p>
                    <span style={{ fontSize: 12, fontWeight: 800, color: item.tone }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="ui-enter" style={{ ...shellCard, "--ui-delay": "120ms", border: `1px solid ${palette.border}`, background: palette.card }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "grid", gap: 6 }}>
            <p style={{ ...microLabel, color: palette.muted }}>Priority queues</p>
            <h2 style={{ ...sectionTitle, color: palette.text }}>What should move before new work starts.</h2>
          </div>
          <p style={{ ...caption, color: palette.muted, maxWidth: 440 }}>{note}</p>
        </div>

        <div style={{ display: "grid", gap: 12, gridTemplateColumns: isNarrow ? "1fr" : "repeat(3, minmax(0, 1fr))" }}>
          <PriorityCard
            title="Outcome Reviews"
            value={`${pendingOutcomeMeta.overdue} overdue`}
            helper={`${pendingOutcomeMeta.total} reviews are still open in the queue.`}
            note={pendingOutcomeMeta.overdue > 0 ? "Nudge owners before this slips another day." : "Follow-through looks stable right now."}
            to="/decisions?outcome=pending"
            tone={pendingOutcomeMeta.overdue > 0 ? palette.warn : palette.good}
            palette={palette}
            icon={QueueListIcon}
          />
          <PriorityCard
            title="Decision Drift"
            value={`${driftMeta.critical} critical`}
            helper={`${driftMeta.high} additional high-severity alerts are in the stack.`}
            note={driftMeta.critical > 0 ? "Revisit assumptions before more execution compounds." : "Decision set is currently stable."}
            to="/decisions"
            tone={driftMeta.critical > 0 ? palette.accent : palette.info}
            palette={palette}
            icon={SparklesIcon}
          />
          <PriorityCard
            title="Sprint Risk"
            value={`${sprintBlocked} blocked`}
            helper={`${sprintInProgress} work items are actively moving through delivery.`}
            note={sprintBlocked > 0 ? "Clear blockers before planning more scope." : "Delivery lane is moving without visible blockage."}
            to="/sprint"
            tone={sprintBlocked > 0 ? palette.warn : palette.good}
            palette={palette}
            icon={BoltIcon}
          />
        </div>
      </section>

      <section className="ui-enter" style={{ "--ui-delay": "170ms", display: "grid", gap: 14, gridTemplateColumns: isNarrow ? "1fr" : "minmax(0,1.18fr) minmax(320px,0.82fr)" }}>
        <WorkspacePanel
          palette={palette}
          eyebrow="Signals"
          title="Weekly signal digest"
          description="A lighter reading view for the latest activity moving through Knoledgr."
          action={<Link className="ui-btn-polish ui-focus-ring" to="/activity" style={secondaryButton(palette)}>Activity Feed</Link>}
        >
          {timeline.length === 0 ? (
            <WorkspaceEmptyState
              palette={palette}
              title="Signal queue is quiet"
              description="Decisions, documents, and sprint moves will appear here as the team creates new context."
              action={<Link className="ui-btn-polish ui-focus-ring" to="/activity" style={primaryButton(palette)}>Open Activity Feed</Link>}
            />
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {featuredActivity ? (
                <Link
                  className="ui-card-lift ui-smooth ui-focus-ring"
                  to={getActivityUrl(featuredActivity)}
                  style={{ ...featureCard, border: `1px solid ${palette.border}`, background: darkMode ? `linear-gradient(180deg, ${palette.cardAlt}, rgba(26,22,19,0.92))` : "linear-gradient(180deg, rgba(255,252,247,0.96), rgba(247,242,235,0.92))" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ ...typeChip, border: `1px solid ${palette.border}`, color: palette.accent }}>{humanizeActivityType(featuredActivity)}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: palette.muted }}>{formatDateLabel(featuredActivity.created_at)}</span>
                  </div>
                  <h3 style={{ ...sectionTitle, margin: 0, fontSize: 30, color: palette.text }}>{featuredActivity.title}</h3>
                  <p style={{ ...bodyCopy, color: palette.muted }}>{getActivitySummary(featuredActivity)}</p>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 800, color: palette.text }}>Open signal <ArrowRightIcon style={icon14} /></span>
                </Link>
              ) : null}

              {signalStream.length ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {signalStream.map((activity) => (
                    <Link
                      key={activity.id}
                      className="ui-card-lift ui-smooth ui-focus-ring"
                      to={getActivityUrl(activity)}
                      style={{ ...listCard, border: `1px solid ${palette.border}`, background: palette.cardAlt }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                          <span style={{ ...microLabel, color: palette.accent }}>{humanizeActivityType(activity)}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: palette.muted }}>{formatDateLabel(activity.created_at)}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, lineHeight: 1.45, color: palette.text }}>{activity.title}</p>
                      </div>
                      <ArrowRightIcon style={{ ...icon14, flexShrink: 0, color: palette.muted }} />
                    </Link>
                  ))}
                </div>
              ) : null}

              {hasMore ? (
                <button className="ui-btn-polish ui-focus-ring" onClick={() => setPage((current) => current + 1)} style={{ ...primaryButton(palette), border: "none", width: "fit-content", cursor: "pointer" }}>
                  Load more signals
                </button>
              ) : null}
            </div>
          )}
        </WorkspacePanel>

        <aside style={{ display: "grid", gap: 14, alignContent: "start" }}>
          <WorkspacePanel
            palette={palette}
            eyebrow="Follow-through"
            title="Outcome review queue"
            description="Keep review promises visible so decisions do not disappear after they are made."
            action={<Link className="ui-btn-polish ui-focus-ring" to="/decisions?outcome=pending" style={secondaryButton(palette)}>Open Queue</Link>}
          >
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))" }}>
              <SummaryCard label="Pending" value={pendingOutcomeMeta.total} tone={palette.info} palette={palette} />
              <SummaryCard label="Overdue" value={pendingOutcomeMeta.overdue} tone={pendingOutcomeMeta.overdue ? palette.warn : palette.good} palette={palette} />
            </div>

            {pendingOutcomeReviews.length ? (
              <div style={{ display: "grid", gap: 10 }}>
                {pendingOutcomeReviews.slice(0, 4).map((item) => (
                  <Link key={item.id} className="ui-card-lift ui-smooth ui-focus-ring" to={`/decisions/${item.id}`} style={{ ...listCard, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, lineHeight: 1.45 }}>{item.title}</p>
                      <p style={{ margin: "4px 0 0", fontSize: 11, lineHeight: 1.5, color: palette.muted }}>{item.is_overdue ? `${item.days_overdue} days overdue` : "Scheduled review pending"}</p>
                    </div>
                    <ArrowRightIcon style={{ ...icon14, flexShrink: 0, color: palette.muted }} />
                  </Link>
                ))}
              </div>
            ) : (
              <WorkspaceEmptyState palette={palette} title="Outcome reviews are under control" description="Nothing is waiting in the review queue right now." />
            )}

            <div style={chipRow}>
              <button
                className="ui-btn-polish ui-focus-ring"
                onClick={sendOutcomeReminders}
                disabled={notifyingOutcomes || pendingOutcomeMeta.overdue === 0}
                style={{ ...secondaryButton(palette), cursor: notifyingOutcomes || pendingOutcomeMeta.overdue === 0 ? "not-allowed" : "pointer", opacity: notifyingOutcomes || pendingOutcomeMeta.overdue === 0 ? 0.6 : 1 }}
              >
                {notifyingOutcomes ? "Sending..." : "Send Reminders"}
              </button>
              <button
                className="ui-btn-polish ui-focus-ring"
                onClick={runFollowUpOrchestrator}
                disabled={orchestratingOutcomes}
                style={{ ...primaryButton(palette), border: "none", cursor: orchestratingOutcomes ? "not-allowed" : "pointer", opacity: orchestratingOutcomes ? 0.6 : 1 }}
              >
                {orchestratingOutcomes ? "Running..." : "Create Follow-ups"}
              </button>
            </div>
          </WorkspacePanel>

          <WorkspacePanel
            palette={palette}
            eyebrow="Stability"
            title="Decision drift alerts"
            description="Watch for decisions drifting away from outcomes, confidence, or context."
            action={<Link className="ui-btn-polish ui-focus-ring" to="/decisions" style={secondaryButton(palette)}>Decision Hub</Link>}
          >
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))" }}>
              <SummaryCard label="Alerts" value={driftMeta.total} tone={palette.info} palette={palette} />
              <SummaryCard label="Critical" value={driftMeta.critical} tone={driftMeta.critical ? palette.warn : palette.good} palette={palette} />
              <SummaryCard label="High" value={driftMeta.high} tone={driftMeta.high ? palette.accent : palette.info} palette={palette} />
            </div>

            {driftAlerts.length ? (
              <div style={{ display: "grid", gap: 10 }}>
                {driftAlerts.slice(0, 4).map((item) => (
                  <Link key={item.decision_id} className="ui-card-lift ui-smooth ui-focus-ring" to={`/decisions/${item.decision_id}`} style={{ ...listCard, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, lineHeight: 1.45 }}>{item.title}</p>
                      <p style={{ margin: "4px 0 0", fontSize: 11, lineHeight: 1.5, color: palette.muted }}>{item.severity} severity with drift score {item.drift_score}</p>
                    </div>
                    <ArrowRightIcon style={{ ...icon14, flexShrink: 0, color: palette.muted }} />
                  </Link>
                ))}
              </div>
            ) : (
              <WorkspaceEmptyState palette={palette} title="No drift alerts are active" description="The decision set looks stable right now." />
            )}
          </WorkspacePanel>
        </aside>
      </section>

      <section className="ui-enter" style={{ "--ui-delay": "220ms" }}>
        <article className="ui-card-lift ui-smooth" style={{ ...panelCard, border: `1px solid ${palette.border}`, background: palette.panel, padding: 14 }}>
          <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
            <p style={{ ...microLabel, color: palette.muted }}>Mission Control</p>
            <h2 style={{ ...sectionTitle, color: palette.text, fontSize: 26 }}>Scenario view for the next operating move.</h2>
            <p style={{ ...caption, color: palette.muted, maxWidth: 720 }}>
              Use the simulation layer to see how backlog, blockers, and operating pressure could shift before you move the team.
            </p>
          </div>
          <MissionControlPanel />
        </article>
      </section>
    </div>
  );
}

function primaryButton(palette) {
  return {
    textDecoration: "none",
    borderRadius: 999,
    padding: "10px 14px",
    minHeight: 40,
    fontSize: 12,
    fontWeight: 800,
    lineHeight: 1.2,
    background: palette.ctaGradient,
    color: palette.buttonText,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    whiteSpace: "nowrap",
  };
}

function secondaryButton(palette) {
  return {
    textDecoration: "none",
    borderRadius: 999,
    padding: "10px 14px",
    minHeight: 40,
    fontSize: 12,
    fontWeight: 800,
    lineHeight: 1.2,
    border: `1px solid ${palette.border}`,
    background: palette.cardAlt,
    color: palette.text,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    whiteSpace: "nowrap",
  };
}

const pageStyle = { position: "relative", padding: "clamp(14px, 2.4vw, 26px)", display: "grid", gap: 14 };
const shellCard = { borderRadius: 26, padding: 18, display: "grid", gap: 16, boxShadow: "var(--ui-shadow-sm)" };
const panelCard = { borderRadius: 22, padding: 16, display: "grid", gap: 12, boxShadow: "var(--ui-shadow-sm)" };
const briefingCard = { borderRadius: 24, padding: 18, display: "grid", gap: 14, boxShadow: "var(--ui-shadow-sm)" };
const heroTitle = { margin: 0, fontFamily: 'var(--font-display, "Fraunces"), Georgia, serif', fontSize: "clamp(1.9rem, 2.8vw, 3.15rem)", lineHeight: 0.98, letterSpacing: "-0.05em", maxWidth: "14ch" };
const sectionTitle = { margin: 0, fontFamily: 'var(--font-display, "Fraunces"), Georgia, serif', fontSize: 28, lineHeight: 1.02, letterSpacing: "-0.05em" };
const bodyCopy = { margin: 0, fontSize: 13, lineHeight: 1.65 };
const caption = { margin: 0, fontSize: 12, lineHeight: 1.6 };
const microLabel = { margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" };
const summaryValue = { margin: 0, fontFamily: 'var(--font-display, "Fraunces"), Georgia, serif', fontSize: 24, lineHeight: 1, letterSpacing: "-0.05em" };
const chipRow = { display: "flex", gap: 10, flexWrap: "wrap" };
const featureCard = { borderRadius: 22, padding: 18, display: "grid", gap: 10, textDecoration: "none", boxShadow: "var(--ui-shadow-sm)" };
const commandCard = { borderRadius: 22, padding: 16, display: "grid", gap: 12, textDecoration: "none", boxShadow: "var(--ui-shadow-sm)" };
const priorityCard = { borderRadius: 22, padding: 16, display: "grid", gap: 10, textDecoration: "none", boxShadow: "var(--ui-shadow-sm)" };
const listCard = { borderRadius: 16, padding: "13px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, textDecoration: "none" };
const typeChip = { display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "5px 9px", fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", background: "var(--ui-panel)" };
const commandMetric = { margin: 0, fontSize: 12, fontWeight: 700, lineHeight: 1.45 };
const focusCard = { borderRadius: 18, padding: 14, display: "flex", alignItems: "flex-start", gap: 10 };
const focusDot = { width: 8, height: 8, borderRadius: 999, marginTop: 6, flexShrink: 0 };
const railDivider = { width: "100%", margin: "4px 0" };
const pulseRow = { borderRadius: 16, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 };
const loadingWrap = { padding: "clamp(16px, 3vw, 28px)", minHeight: "50vh", display: "grid", placeItems: "center" };
const loadingCard = { width: "min(520px, 100%)", borderRadius: 22, padding: 18, boxShadow: "0 18px 40px rgba(0,0,0,0.16)" };
const loadingTop = { display: "flex", alignItems: "center", gap: 12 };
const loadingOrb = { width: 40, height: 40, borderRadius: 14, display: "grid", placeItems: "center", color: "var(--app-button-text)", flexShrink: 0 };
const loadingTitle = { margin: 0, fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em" };
const icon14 = { width: 14, height: 14 };
