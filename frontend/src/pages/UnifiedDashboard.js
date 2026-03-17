import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import MissionControlPanel from "../components/MissionControlPanel";
import { WorkspaceHero, WorkspaceToolbar } from "../components/WorkspaceChrome";
import {
  ChevronDownIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { buildApiUrl } from "../utils/apiBase";
import { getProjectPalette } from "../utils/projectUi";

function humanizeActivityType(activity) {
  const raw = activity?.content_type?.split(".").pop() || activity?.type || "activity";
  return raw
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
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
  const [isNarrow, setIsNarrow] = useState(window.innerWidth < 1160);

  useEffect(() => {
    fetchDashboardData();
  }, [page]);

  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 1160);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const readJsonSafe = async (response, fallback = {}) => {
    try {
      const text = await response.text();
      if (!text) return fallback;
      return JSON.parse(text);
    } catch (_) {
      return fallback;
    }
  };

  const unwrapPayload = (payload, fallback = {}) => {
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      if (payload.data && typeof payload.data === "object") return payload.data;
      return payload;
    }
    return fallback;
  };

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem("access_token") || localStorage.getItem("token");
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

      const [timelineRes, statsRes, outcomesRes, pendingRes, driftRes, sprintRes] = await Promise.all([
        fetch(buildApiUrl(`/api/knowledge/timeline/?days=7&page=${page}&per_page=10`), {
          headers: authHeaders,
        }),
        fetch(buildApiUrl("/api/knowledge/ai/success-rates/"), {
          headers: authHeaders,
        }),
        fetch(buildApiUrl("/api/decisions/outcomes/stats/"), {
          headers: authHeaders,
        }),
        fetch(buildApiUrl("/api/decisions/outcomes/pending/?overdue_only=false"), {
          headers: authHeaders,
        }),
        fetch(buildApiUrl("/api/decisions/outcomes/drift-alerts/"), {
          headers: authHeaders,
        }),
        fetch(buildApiUrl("/api/agile/current-sprint/"), {
          headers: authHeaders,
        }),
      ]);

      const timelineRaw = await readJsonSafe(timelineRes, {
        results: [],
        pagination: { has_next: false },
      });
      const timelineData = unwrapPayload(timelineRaw, {
        results: [],
        pagination: { has_next: false },
      });
      const results = timelineData.results || timelineData;
      setTimeline((prev) => (page === 1 ? results : [...prev, ...results]));
      setHasMore(timelineData.pagination?.has_next || false);

      const statsRaw = await readJsonSafe(statsRes, {});
      const statsData = unwrapPayload(statsRaw, {});

      const outcomesRaw = await readJsonSafe(outcomesRes, {});
      const outcomesData = unwrapPayload(outcomesRaw, {});
      setOutcomeStats({
        reviewed_count: outcomesData.reviewed_count || 0,
        success_count: outcomesData.success_count || 0,
        failure_count: outcomesData.failure_count || 0,
        success_rate: outcomesData.success_rate || 0,
        avg_reliability: outcomesData.avg_reliability || 0,
      });

      const pendingRaw = await readJsonSafe(pendingRes, { items: [] });
      const pendingData = unwrapPayload(pendingRaw, { items: [] });
      setPendingOutcomeReviews(pendingData.items || []);
      setPendingOutcomeMeta({
        total: pendingData.total || 0,
        overdue: pendingData.overdue || 0,
      });

      const driftRaw = await readJsonSafe(driftRes, { items: [] });
      const driftData = unwrapPayload(driftRaw, { items: [] });
      setDriftAlerts(driftData.items || []);
      setDriftMeta({
        total: driftData.total || 0,
        critical: driftData.critical || 0,
        high: driftData.high || 0,
      });

      const sprintRaw = await readJsonSafe(sprintRes, null);
      const sprintData = unwrapPayload(sprintRaw, null);
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
      dim: "var(--ui-muted)",
      accent: "var(--ui-accent)",
      accentSoft: basePalette.accentSoft,
      info: "var(--ui-info)",
      good: "var(--ui-good)",
      success: "var(--ui-good)",
      warn: "var(--ui-warn)",
      danger: "var(--ui-danger)",
      buttonText: "var(--app-button-text)",
      ctaGradient: "var(--app-gradient-primary)",
      shadow: "none",
    };
  }, [darkMode]);

  const getActivityUrl = (activity) => {
    const type = activity.content_type?.split(".")[1] || "conversation";
    const routes = {
      conversation: `/conversations/${activity.object_id}`,
      decision: `/decisions/${activity.object_id}`,
      meeting: `/business/meetings/${activity.object_id}`,
      document: `/business/documents/${activity.object_id}`,
      task: "/business/tasks",
    };
    return routes[type] || "/";
  };

  const sendOutcomeReminders = async () => {
    setNotifyingOutcomes(true);
    try {
      const token = localStorage.getItem("access_token") || localStorage.getItem("token");
      await fetch(buildApiUrl("/api/decisions/outcomes/pending/notify/"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
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
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
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
  const topFocusCards = [
    {
      title: "Outcome Reviews",
      value: `${pendingOutcomeMeta.overdue} overdue`,
      helper: `${pendingOutcomeMeta.total} pending total`,
      ctaLabel: "Open Queue",
      ctaTo: "/decisions?outcome=pending",
      tone: pendingOutcomeMeta.overdue > 0 ? palette.accent : palette.good,
    },
    {
      title: "Decision Drift",
      value: `${driftMeta.critical} critical`,
      helper: `${driftMeta.high} high severity`,
      ctaLabel: "Review Decisions",
      ctaTo: "/decisions",
      tone: driftMeta.critical > 0 ? palette.accent : palette.info,
    },
    {
      title: "Sprint Risk",
      value: `${sprintBlocked} blocked`,
      helper: `${sprintInProgress} in progress now`,
      ctaLabel: "Open Sprint",
      ctaTo: "/sprint",
      tone: sprintBlocked > 0 ? palette.warn : palette.good,
    },
  ];
  const overviewStats = [
    {
      label: "Signals",
      value: stats.activity,
      helper: "Events captured this week",
      tone: palette.accent,
    },
    {
      label: "Reliability",
      value: `${outcomeStats.avg_reliability || 0}%`,
      helper: "Average decision confidence",
      tone: palette.good,
    },
    {
      label: "Pending Reviews",
      value: pendingOutcomeMeta.total,
      helper: pendingOutcomeMeta.overdue ? `${pendingOutcomeMeta.overdue} overdue right now` : "Outcome review queue is under control",
      tone: pendingOutcomeMeta.overdue ? palette.warn : palette.info,
    },
    {
      label: "Sprint Risk",
      value: `${sprintBlocked}`,
      helper: `${sprintInProgress} items moving right now`,
      tone: sprintBlocked > 0 ? palette.warn : palette.good,
    },
  ];
  const quickLinks = [
    { label: "Projects", to: "/projects", primary: true },
    { label: "Sprint Board", to: "/sprint", primary: true },
    { label: "Decision Hub", to: "/decisions", primary: false },
    { label: "Ask Recall", to: "/ask", primary: false },
  ];

  if (loading) {
    return (
      <div style={{ ...loadingWrap, color: palette.text }}>
        <div
          style={{
            ...loadingCard,
            background: `linear-gradient(180deg, ${palette.panel}, ${palette.cardAlt})`,
            border: `1px solid ${palette.border}`,
          }}
        >
          <div style={loadingTop}>
            <div style={{ ...loadingOrb, background: palette.ctaGradient }}>
              <span className="spinner" aria-hidden="true" />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ ...loadingEyebrow, color: palette.muted }}>Dashboard Sync</p>
              <p style={loadingTitle}>Hydrating your command center</p>
              <p style={{ ...loadingSubtitle, color: palette.muted }}>
                Pulling activity, decisions, outcomes, and sprint signals
              </p>
            </div>
          </div>

          <div style={loadingMetricRail}>
            <div style={{ ...loadingMetricCard, border: `1px solid ${palette.border}`, background: palette.panel }}>
              <div style={{ ...loadingMetricValue, background: palette.panelAlt }} />
              <div style={{ ...loadingMetricLabel, background: palette.panelAlt }} />
            </div>
            <div style={{ ...loadingMetricCard, border: `1px solid ${palette.border}`, background: palette.panel }}>
              <div style={{ ...loadingMetricValue, background: palette.panelAlt }} />
              <div style={{ ...loadingMetricLabel, background: palette.panelAlt }} />
            </div>
          </div>

          <div style={loadingSkeletonGrid}>
            <div style={{ ...loadingSkeletonBar, width: "78%", background: palette.panelAlt }} />
            <div style={{ ...loadingSkeletonBar, width: "92%", background: palette.panelAlt }} />
            <div style={{ ...loadingSkeletonBar, width: "66%", background: palette.panelAlt }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <WorkspaceHero
        palette={palette}
        darkMode={darkMode}
        eyebrow="Dashboard"
        title="Command Center"
        description="Scan delivery health, decision follow-through, and live team signals in one calm command surface."
        stats={overviewStats}
        actions={
          <>
            {quickLinks.map((item) => (
              <Link
                key={item.to}
                className="ui-btn-polish ui-focus-ring"
                to={item.to}
                style={item.primary ? commandPrimaryLink(palette) : commandSecondaryLink(palette)}
              >
                {item.label}
              </Link>
            ))}
          </>
        }
        aside={
          <article
            className="ui-card-lift ui-smooth"
            style={{
              ...dashboardAsideCard,
              border: `1px solid ${palette.border}`,
              background: palette.cardAlt,
            }}
          >
            <p style={{ ...dashboardAsideEyebrow, color: palette.muted }}>Current Sprint</p>
            {currentSprint ? (
              <>
                <h3 style={{ ...dashboardAsideTitle, color: palette.text }}>{currentSprint.name}</h3>
                <p style={{ ...dashboardAsideBody, color: palette.muted }}>
                  {sprintProgress}% complete with {sprintBlocked} blocked items and {sprintInProgress} active right now.
                </p>
                <div style={{ ...dashboardProgressTrack, background: palette.border }}>
                  <div style={{ ...dashboardProgressFill, width: `${sprintProgress}%`, background: palette.ctaGradient }} />
                </div>
                <div style={dashboardAsideGrid}>
                  <div style={{ ...dashboardAsideMetric, border: `1px solid ${palette.border}`, background: palette.card }}>
                    <p style={{ ...dashboardAsideMetricLabel, color: palette.muted }}>Done</p>
                    <p style={{ ...dashboardAsideMetricValue, color: palette.good }}>{sprintCompleted}</p>
                  </div>
                  <div style={{ ...dashboardAsideMetric, border: `1px solid ${palette.border}`, background: palette.card }}>
                    <p style={{ ...dashboardAsideMetricLabel, color: palette.muted }}>Total</p>
                    <p style={{ ...dashboardAsideMetricValue, color: palette.text }}>{sprintTotal}</p>
                  </div>
                </div>
              </>
            ) : (
              <p style={{ ...dashboardAsideBody, color: palette.muted }}>
                No active sprint is running right now. Open the sprint board or projects view to start planning the next execution cycle.
              </p>
            )}
          </article>
        }
      />

      <WorkspaceToolbar palette={palette}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {topFocusCards.map((card) => (
            <Link
              key={card.title}
              to={card.ctaTo}
              className="ui-btn-polish ui-focus-ring"
              style={{
                ...toolbarFocusLink,
                border: `1px solid ${palette.border}`,
                background: palette.cardAlt,
                color: palette.text,
              }}
            >
              <span style={{ ...toolbarFocusLabel, color: palette.muted }}>{card.title}</span>
              <span style={{ ...toolbarFocusValue, color: card.tone }}>{card.value}</span>
            </Link>
          ))}
        </div>
        <p style={{ ...toolbarNote, color: palette.muted }}>
          {pendingOutcomeMeta.overdue > 0
            ? `${pendingOutcomeMeta.overdue} outcome reviews are overdue, so that queue should be cleared before lower-priority dashboard work.`
            : "The dashboard is stable enough to use as a quick scan instead of a firefighting queue."}
        </p>
      </WorkspaceToolbar>

      <section
        className="ui-enter"
        style={{
          ...mainGrid,
          "--ui-delay": "160ms",
          gridTemplateColumns: "minmax(0,1fr)",
        }}
      >
        <div style={leftCol}>
          <CollapsibleCard title="Latest Signals (last 7 days)" palette={palette} defaultExpanded>
            {timeline.length === 0 ? (
              <div
                style={{
                  ...emptyState,
                  border: `1px dashed ${palette.border}`,
                  background: palette.cardAlt,
                  color: palette.dim,
                }}
              >
                <ClipboardDocumentListIcon style={{ ...emptyIcon, color: palette.accent }} />
                <p style={{ ...emptyTitle, color: palette.text }}>Signal queue is quiet</p>
                <p style={{ ...emptyDescription, color: palette.muted }}>
                  Recent decisions, documents, and sprint moves will appear here as the team creates new context.
                </p>
                <Link
                  className="ui-btn-polish ui-focus-ring"
                  to="/activity"
                  style={{ ...emptyLink, color: palette.buttonText, background: palette.ctaGradient }}
                >
                  Open Activity Feed
                </Link>
              </div>
            ) : (
              <>
                <div style={activityList}>
                  {timeline.slice(0, 10).map((activity) => (
                    <Link
                      className="ui-card-lift ui-smooth"
                      key={activity.id}
                      to={getActivityUrl(activity)}
                      style={{ ...activityRow, border: `1px solid ${palette.border}`, background: palette.cardAlt }}
                    >
                      <div style={activityMain}>
                        <div style={activityMeta}>
                          <span style={{ ...activityBadge, border: `1px solid ${palette.border}`, color: palette.accent }}>
                            {humanizeActivityType(activity)}
                          </span>
                          <span style={{ ...activityDateChip, color: palette.muted }}>
                            {new Date(activity.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </span>
                        </div>
                        <p style={{ ...activityTitle, color: palette.text }}>{activity.title}</p>
                      </div>
                      <ClipboardDocumentListIcon style={{ ...icon16, color: palette.dim }} />
                    </Link>
                  ))}
                </div>

                {hasMore && (
                  <div style={loadMoreWrap}>
                    <button
                      className="ui-btn-polish ui-focus-ring"
                      onClick={() => setPage((current) => current + 1)}
                      style={{ ...loadMoreButton, color: palette.buttonText, background: palette.ctaGradient }}
                    >
                      Load more
                    </button>
                  </div>
                )}
              </>
            )}
          </CollapsibleCard>
        </div>

      </section>

      <section
        className="ui-enter"
        style={{
          ...mainGrid,
          "--ui-delay": "210ms",
          gridTemplateColumns: isNarrow ? "minmax(0,1fr)" : "minmax(0, 1.28fr) minmax(320px, 0.92fr)",
        }}
      >
        <div style={leftCol}>
          <div style={{ width: "100%" }}>
            <article className="ui-card-lift ui-smooth" style={{ ...embeddedPanelShell, border: `1px solid ${palette.border}`, background: palette.panel }}>
              <MissionControlPanel />
            </article>
          </div>
        </div>

        <aside style={rightCol}>
          <CollapsibleCard
            title="Pending Outcome Reviews"
            palette={palette}
            defaultExpanded
          >
            <div style={healthList}>
              <HealthRow label="Total pending" value={`${pendingOutcomeMeta.total}`} tint={palette.info} />
              <HealthRow label="Overdue" value={`${pendingOutcomeMeta.overdue}`} tint={palette.accent} />
              {pendingOutcomeReviews.slice(0, 3).map((item) => (
                <Link
                  className="ui-card-lift ui-smooth"
                  key={item.id}
                  to={`/decisions/${item.id}`}
                  style={{
                    textDecoration: "none",
                    border: `1px solid ${palette.border}`,
                    borderRadius: 10,
                    padding: "8px 10px",
                    display: "block",
                    color: palette.text,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: palette.muted }}>
                    {item.is_overdue ? `${item.days_overdue} days overdue` : "Not overdue yet"}
                  </div>
                </Link>
              ))}
              <div style={{ display: "flex", gap: 8 }}>
                <Link
                  className="ui-btn-polish ui-focus-ring"
                  to="/decisions?outcome=pending"
                  style={{
                    textDecoration: "none",
                    borderRadius: 10,
                    padding: "7px 10px",
                    fontSize: 12,
                    fontWeight: 700,
                    color: palette.buttonText,
                    background: palette.ctaGradient,
                  }}
                >
                  Open Queue
                </Link>
                <button
                  className="ui-btn-polish ui-focus-ring"
                  onClick={sendOutcomeReminders}
                  disabled={notifyingOutcomes || pendingOutcomeMeta.overdue === 0}
                  style={{
                    borderRadius: 10,
                    padding: "7px 10px",
                    fontSize: 12,
                    fontWeight: 700,
                    background: palette.ctaGradient,
                    color: palette.buttonText,
                    cursor: "pointer",
                    opacity: notifyingOutcomes || pendingOutcomeMeta.overdue === 0 ? 0.6 : 1,
                  }}
                >
                  {notifyingOutcomes ? "Sending..." : "Send Reminders"}
                </button>
                <button
                  className="ui-btn-polish ui-focus-ring"
                  onClick={runFollowUpOrchestrator}
                  disabled={orchestratingOutcomes}
                  style={{
                    borderRadius: 10,
                    padding: "7px 10px",
                    fontSize: 12,
                    fontWeight: 700,
                    background: palette.ctaGradient,
                    color: palette.buttonText,
                    cursor: "pointer",
                    opacity: orchestratingOutcomes ? 0.6 : 1,
                  }}
                >
                  {orchestratingOutcomes ? "Running..." : "Create Follow-ups"}
                </button>
              </div>
            </div>
          </CollapsibleCard>

          <CollapsibleCard
            title="Decision Drift Alerts"
            palette={palette}
            defaultExpanded
          >
            <div style={healthList}>
              <HealthRow label="Total alerts" value={`${driftMeta.total}`} tint={palette.info} />
              <HealthRow label="Critical" value={`${driftMeta.critical}`} tint={palette.accent} />
              <HealthRow label="High" value={`${driftMeta.high}`} tint={palette.accent} />
              {driftAlerts.slice(0, 3).map((item) => (
                <Link
                  className="ui-card-lift ui-smooth"
                  key={item.decision_id}
                  to={`/decisions/${item.decision_id}`}
                  style={{
                    textDecoration: "none",
                    border: `1px solid ${palette.border}`,
                    borderRadius: 10,
                    padding: "8px 10px",
                    display: "block",
                    color: palette.text,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: palette.muted }}>
                    {item.severity} drift score {item.drift_score}
                  </div>
                </Link>
              ))}
            </div>
          </CollapsibleCard>

        </aside>
      </section>
    </div>
  );
}

function HealthRow({ label, value, tint, muted = "var(--ui-muted)" }) {
  return (
    <div style={healthRow}>
      <p style={{ ...healthLabel, color: muted }}>{label}</p>
      <p style={{ ...healthValue, color: tint }}>{value}</p>
    </div>
  );
}

function CollapsibleCard({
  title,
  children,
  palette,
  defaultExpanded = true,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <article
      className="ui-card-lift ui-smooth"
      style={{
        ...panel,
        background: `linear-gradient(180deg, ${palette.panel}, ${palette.cardAlt})`,
        border: `1px solid ${palette.border}`,
      }}
    >
      <div
        style={{
          ...collapseHeaderRow,
          borderBottom: expanded ? `1px solid ${palette.border}` : "none",
          background: expanded ? palette.cardAlt : "transparent",
        }}
      >
        <button
          className="ui-btn-polish ui-focus-ring"
          onClick={() => setExpanded((v) => !v)}
          style={collapseHeaderMain}
          aria-expanded={expanded}
        >
          <span style={{ ...panelTitle, margin: 0, color: palette.text }}>{title}</span>
          <ChevronDownIcon
            style={{
              ...icon16,
              color: palette.muted,
              transform: expanded ? "rotate(0deg)" : "rotate(-90deg)",
              transition: "transform 0.18s ease",
            }}
          />
        </button>
      </div>
      {expanded ? <div>{children}</div> : null}
    </article>
  );
}

const pageStyle = {
  position: "relative",
  padding: "clamp(14px, 2.4vw, 24px)",
  display: "grid",
  gap: 14,
};

function commandPrimaryLink(palette) {
  return {
    textDecoration: "none",
    borderRadius: 999,
    padding: "10px 14px",
    fontSize: 12,
    fontWeight: 800,
    background: palette.ctaGradient,
    color: palette.buttonText,
  };
}

function commandSecondaryLink(palette) {
  return {
    textDecoration: "none",
    borderRadius: 999,
    padding: "10px 14px",
    fontSize: 12,
    fontWeight: 800,
    border: `1px solid ${palette.border}`,
    background: palette.cardAlt,
    color: palette.text,
  };
}

const dashboardAsideCard = {
  minWidth: 224,
  borderRadius: 20,
  padding: 14,
  display: "grid",
  gap: 8,
  boxShadow: "var(--ui-shadow-sm)",
};

const dashboardAsideEyebrow = {
  margin: 0,
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};

const dashboardAsideTitle = {
  margin: 0,
  fontSize: 16,
  lineHeight: 1.1,
  letterSpacing: "-0.03em",
};

const dashboardAsideBody = {
  margin: 0,
  fontSize: 11,
  lineHeight: 1.55,
};

const dashboardProgressTrack = {
  width: "100%",
  height: 9,
  borderRadius: 999,
  overflow: "hidden",
};

const dashboardProgressFill = {
  height: "100%",
  borderRadius: 999,
};

const dashboardAsideGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 8,
};

const dashboardAsideMetric = {
  borderRadius: 14,
  padding: "9px 11px",
  display: "grid",
  gap: 4,
};

const dashboardAsideMetricLabel = {
  margin: 0,
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const dashboardAsideMetricValue = {
  margin: 0,
  fontSize: 16,
  fontWeight: 800,
  lineHeight: 1,
};

const toolbarFocusLink = {
  textDecoration: "none",
  borderRadius: 14,
  padding: "9px 11px",
  display: "grid",
  gap: 4,
  minWidth: 136,
};

const toolbarFocusLabel = {
  margin: 0,
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const toolbarFocusValue = {
  margin: 0,
  fontSize: 16,
  fontWeight: 800,
  lineHeight: 1.1,
};

const toolbarNote = {
  margin: 0,
  fontSize: 11,
  lineHeight: 1.55,
};

const mainGrid = { position: "relative", zIndex: 1, display: "grid", gap: 12, alignItems: "start" };
const leftCol = { display: "grid", gap: 12, alignContent: "start", alignItems: "start", gridAutoRows: "max-content" };
const rightCol = { display: "grid", gap: 12, alignContent: "start" };
const embeddedPanelShell = {
  borderRadius: 22,
  padding: "14px 14px 12px",
  boxShadow: "var(--ui-shadow-sm)",
};

const panel = {
  borderRadius: 22,
  overflow: "hidden",
  boxShadow: "var(--ui-shadow-sm)",
};
const panelTitle = { margin: 0, fontSize: 16 };
const collapseHeaderRow = {
  display: "flex",
  alignItems: "stretch",
};
const collapseHeaderMain = {
  flex: 1,
  minWidth: 0,
  width: "100%",
  border: "none",
  background: "transparent",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  padding: "16px 16px 14px",
  textAlign: "left",
  cursor: "pointer",
};

const activityList = { display: "grid", gap: 10 };
const activityRow = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  justifyContent: "space-between",
  padding: "14px 16px",
  textDecoration: "none",
  borderRadius: 16,
};

const activityMain = { minWidth: 0 };
const activityMeta = { display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" };
const activityBadge = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "4px 8px",
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  background: "var(--ui-panel)",
};
const activityDateChip = {
  display: "inline-flex",
  alignItems: "center",
  fontSize: 11,
  fontWeight: 700,
};
const activityTitle = {
  margin: 0,
  fontSize: 14,
  fontWeight: 600,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "normal",
  lineHeight: 1.4,
};

const loadMoreWrap = { padding: 12, textAlign: "center" };
const loadMoreButton = { borderRadius: 14, padding: "10px 14px", fontSize: 13, fontWeight: 800, cursor: "pointer" };
const healthList = { padding: "14px 16px 16px", display: "grid", gap: 10 };
const healthRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  padding: "10px 12px",
  borderRadius: 14,
  border: "1px solid var(--ui-border)",
  background: "var(--ui-panel-alt)",
};
const healthLabel = { margin: 0, fontSize: 12, color: "var(--ui-muted)" };
const healthValue = { margin: 0, fontSize: 13, fontWeight: 800 };

const emptyState = { padding: "30px 18px", textAlign: "center", borderRadius: 20, display: "grid", gap: 10, placeItems: "center" };
const emptyIcon = { width: 24, height: 24 };
const emptyTitle = { margin: 0, fontSize: 15, fontWeight: 800 };
const emptyDescription = { margin: 0, fontSize: 12, lineHeight: 1.6, maxWidth: 360 };
const emptyLink = {
  textDecoration: "none",
  borderRadius: 999,
  padding: "10px 14px",
  fontSize: 12,
  fontWeight: 800,
};
const loadingWrap = {
  padding: "clamp(16px, 3vw, 28px)",
  minHeight: "50vh",
  display: "grid",
  placeItems: "center",
};
const loadingCard = {
  width: "min(560px, 100%)",
  borderRadius: 22,
  padding: "18px 18px 16px",
  boxShadow: "0 18px 40px rgba(0,0,0,0.16)",
};
const loadingTop = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginBottom: 16,
};
const loadingOrb = {
  width: 40,
  height: 40,
  borderRadius: 14,
  display: "grid",
  placeItems: "center",
  color: "var(--app-button-text)",
  flexShrink: 0,
};
const loadingEyebrow = {
  margin: "0 0 4px",
  fontSize: 10,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
};
const loadingTitle = {
  margin: 0,
  fontSize: 15,
  fontWeight: 800,
  letterSpacing: "-0.01em",
};
const loadingSubtitle = {
  margin: "4px 0 0",
  fontSize: 12,
};
const loadingMetricRail = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
  marginBottom: 14,
};
const loadingMetricCard = {
  borderRadius: 16,
  padding: "12px 12px 10px",
  display: "grid",
  gap: 8,
};
const loadingMetricValue = {
  width: "56%",
  height: 18,
  borderRadius: 999,
};
const loadingMetricLabel = {
  width: "72%",
  height: 10,
  borderRadius: 999,
};
const loadingSkeletonGrid = {
  display: "grid",
  gap: 8,
};
const loadingSkeletonBar = {
  height: 10,
  borderRadius: 999,
  opacity: 0.85,
  animation: "glow 1.8s ease-in-out infinite",
};
const icon14 = { width: 14, height: 14 };
const icon16 = { width: 16, height: 16 };
