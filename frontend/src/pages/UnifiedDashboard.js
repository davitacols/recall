import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AIRecommendations from "../components/AIRecommendations";
import AdvancedAIInsights from "../components/AdvancedAIInsights";
import DashboardWidgets from "../components/DashboardWidgets";
import MissionControlPanel from "../components/MissionControlPanel";
import ChiefOfStaffPanel from "../components/ChiefOfStaffPanel";
import {
  MetricsTracker,
  TeamExpertiseMap,
  TrendAnalysis,
} from "../components/EnhancedWidgets";
import { WorkspaceHero, WorkspaceToolbar } from "../components/WorkspaceChrome";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { buildApiUrl } from "../utils/apiBase";
import { getProjectPalette } from "../utils/projectUi";

const DASHBOARD_CARD_ORDER_KEY = "unifiedDashboardCardOrderV2";
const LEFT_CARD_IDS = [
  "mission-control",
  "chief-of-staff",
  "daily-digest",
  "health-snapshot",
  "copilot-feedback",
  "trends-metrics",
  "team-expertise",
];
const RIGHT_CARD_IDS = [
  "pending-outcomes",
  "decision-drift",
  "decision-twin",
  "decision-debt",
  "decision-outcomes",
  "team-calibration",
  "ai-recommendations",
  "advanced-insights",
];

function normalizeOrder(columnOrder, defaults) {
  const seen = new Set();
  const cleaned = [];
  for (const id of columnOrder || []) {
    if (defaults.includes(id) && !seen.has(id)) {
      seen.add(id);
      cleaned.push(id);
    }
  }
  for (const id of defaults) {
    if (!seen.has(id)) cleaned.push(id);
  }
  return cleaned;
}

function humanizeActivityType(activity) {
  const raw = activity?.content_type?.split(".").pop() || activity?.type || "activity";
  return raw
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function loadCardOrder() {
  try {
    const raw = window.localStorage.getItem(DASHBOARD_CARD_ORDER_KEY);
    if (!raw) {
      return { left: LEFT_CARD_IDS, right: RIGHT_CARD_IDS };
    }
    const parsed = JSON.parse(raw);
    return {
      left: normalizeOrder(parsed?.left, LEFT_CARD_IDS),
      right: normalizeOrder(parsed?.right, RIGHT_CARD_IDS),
    };
  } catch {
    return { left: LEFT_CARD_IDS, right: RIGHT_CARD_IDS };
  }
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
  const [calibrationRows, setCalibrationRows] = useState([]);
  const [currentSprint, setCurrentSprint] = useState(null);
  const [decisionTwinSummary, setDecisionTwinSummary] = useState(null);
  const [decisionTwinError, setDecisionTwinError] = useState("");
  const [decisionTwinUpgrade, setDecisionTwinUpgrade] = useState(null);
  const [decisionDebt, setDecisionDebt] = useState(null);
  const [decisionDebtError, setDecisionDebtError] = useState("");
  const [decisionDebtUpgrade, setDecisionDebtUpgrade] = useState(null);
  const [copilotFeedback, setCopilotFeedback] = useState(null);
  const [copilotFeedbackTrend, setCopilotFeedbackTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isNarrow, setIsNarrow] = useState(window.innerWidth < 1160);
  const [cardOrder, setCardOrder] = useState(loadCardOrder);

  useEffect(() => {
    fetchDashboardData();
  }, [page]);

  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 1160);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(DASHBOARD_CARD_ORDER_KEY, JSON.stringify(cardOrder));
  }, [cardOrder]);

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

      const timelineRes = await fetch(
        buildApiUrl(`/api/knowledge/timeline/?days=7&page=${page}&per_page=10`),
        { headers: authHeaders }
      );
      const timelineRaw = await readJsonSafe(timelineRes, { results: [], pagination: { has_next: false } });
      const timelineData = unwrapPayload(timelineRaw, { results: [], pagination: { has_next: false } });
      const results = timelineData.results || timelineData;
      setTimeline((prev) => (page === 1 ? results : [...prev, ...results]));
      setHasMore(timelineData.pagination?.has_next || false);

      const statsRes = await fetch(buildApiUrl("/api/knowledge/ai/success-rates/"), {
        headers: authHeaders,
      });
      const statsRaw = await readJsonSafe(statsRes, {});
      const statsData = unwrapPayload(statsRaw, {});

      const outcomesRes = await fetch(buildApiUrl("/api/decisions/outcomes/stats/"), {
        headers: authHeaders,
      });
      const outcomesRaw = await readJsonSafe(outcomesRes, {});
      const outcomesData = unwrapPayload(outcomesRaw, {});
      setOutcomeStats({
        reviewed_count: outcomesData.reviewed_count || 0,
        success_count: outcomesData.success_count || 0,
        failure_count: outcomesData.failure_count || 0,
        success_rate: outcomesData.success_rate || 0,
        avg_reliability: outcomesData.avg_reliability || 0,
      });

      const pendingRes = await fetch(buildApiUrl("/api/decisions/outcomes/pending/?overdue_only=false"), {
        headers: authHeaders,
      });
      const pendingRaw = await readJsonSafe(pendingRes, { items: [] });
      const pendingData = unwrapPayload(pendingRaw, { items: [] });
      setPendingOutcomeReviews(pendingData.items || []);
      setPendingOutcomeMeta({
        total: pendingData.total || 0,
        overdue: pendingData.overdue || 0,
      });

      const driftRes = await fetch(buildApiUrl("/api/decisions/outcomes/drift-alerts/"), {
        headers: authHeaders,
      });
      const driftRaw = await readJsonSafe(driftRes, { items: [] });
      const driftData = unwrapPayload(driftRaw, { items: [] });
      setDriftAlerts(driftData.items || []);
      setDriftMeta({
        total: driftData.total || 0,
        critical: driftData.critical || 0,
        high: driftData.high || 0,
      });

      const calibrationRes = await fetch(buildApiUrl("/api/decisions/outcomes/calibration/?days=120"), {
        headers: authHeaders,
      });
      const calibrationRaw = await readJsonSafe(calibrationRes, { reviewers: [] });
      const calibrationData = unwrapPayload(calibrationRaw, { reviewers: [] });
      setCalibrationRows(calibrationData.reviewers || []);

      const sprintRes = await fetch(buildApiUrl("/api/agile/current-sprint/"), {
        headers: authHeaders,
      });
      const sprintRaw = await readJsonSafe(sprintRes, null);
      const sprintData = unwrapPayload(sprintRaw, null);
      setCurrentSprint(sprintData || null);

      if (sprintData?.id) {
        const twinRes = await fetch(
          buildApiUrl(`/api/agile/sprints/${sprintData.id}/decision-twin/?min_confidence_band=medium&min_probability_delta=1&max_scope_changes=4&allow_backlog_adds=true&enforce_policy=true`),
          { headers: authHeaders }
        );
        if (twinRes.ok) {
          const twinRaw = await readJsonSafe(twinRes, {});
          const twinData = unwrapPayload(twinRaw, {});
          const scenarios = twinData.scenarios || [];
          const recommended = scenarios.find((item) => item.id === twinData.recommended_scenario_id) || scenarios[0] || null;
          setDecisionTwinSummary({
            sprintId: sprintData.id,
            objective: twinData.objective,
            recommendedScenario: recommended,
            autoApplyScenarioId: twinData.recommended_auto_apply_scenario_id || null,
          });
          setDecisionTwinError("");
          setDecisionTwinUpgrade(null);
        } else {
          const twinErrorData = await readJsonSafe(twinRes, null);
          setDecisionTwinSummary(null);
          if (twinRes.status === 402) {
            setDecisionTwinError(twinErrorData?.error || "Decision Twin is available on paid plans.");
            setDecisionTwinUpgrade({
              required_plan: twinErrorData?.required_plan || "professional",
              current_plan: twinErrorData?.current_plan || "free",
            });
          } else {
            setDecisionTwinError("Decision Twin not available on this backend deployment.");
            setDecisionTwinUpgrade(null);
          }
        }
      } else {
        setDecisionTwinSummary(null);
        setDecisionTwinError("");
        setDecisionTwinUpgrade(null);
      }

      const debtRes = await fetch(buildApiUrl("/api/agile/decisions/debt-ledger/?days=14"), {
        headers: authHeaders,
      });
      if (debtRes.ok) {
        const debtRaw = await readJsonSafe(debtRes, {});
        const debtData = unwrapPayload(debtRaw, {});
        setDecisionDebt(debtData);
        setDecisionDebtError("");
        setDecisionDebtUpgrade(null);
      } else {
        const debtErrorData = await readJsonSafe(debtRes, null);
        setDecisionDebt(null);
        if (debtRes.status === 402) {
          setDecisionDebtError(debtErrorData?.error || "Decision Debt Ledger is available on paid plans.");
          setDecisionDebtUpgrade({
            required_plan: debtErrorData?.required_plan || "professional",
            current_plan: debtErrorData?.current_plan || "free",
          });
        } else {
          setDecisionDebtError("Decision Debt Ledger unavailable on this backend deployment.");
          setDecisionDebtUpgrade(null);
        }
      }

      const [copilotFeedbackRes, copilotFeedbackTrendRes] = await Promise.all([
        fetch(buildApiUrl("/api/knowledge/ai/copilot/feedback-summary/"), {
          headers: authHeaders,
        }),
        fetch(buildApiUrl("/api/knowledge/ai/copilot/feedback-trend/?days=7"), {
          headers: authHeaders,
        }),
      ]);
      if (copilotFeedbackRes.ok) {
        const feedbackRaw = await readJsonSafe(copilotFeedbackRes, null);
        const feedbackData = unwrapPayload(feedbackRaw, null);
        setCopilotFeedback(feedbackData);
      } else {
        setCopilotFeedback(null);
      }
      if (copilotFeedbackTrendRes.ok) {
        const trendRaw = await readJsonSafe(copilotFeedbackTrendRes, { points: [] });
        const trendData = unwrapPayload(trendRaw, { points: [] });
        setCopilotFeedbackTrend((trendData.points || []).slice(-7));
      } else {
        setCopilotFeedbackTrend([]);
      }

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

  const getCardOrder = (column, cardId) => {
    const index = cardOrder[column]?.indexOf(cardId);
    return index < 0 ? 999 : index;
  };

  const moveCard = (column, cardId, direction) => {
    setCardOrder((prev) => {
      const nextColumn = [...(prev[column] || [])];
      const index = nextColumn.indexOf(cardId);
      if (index < 0) return prev;
      const target = index + direction;
      if (target < 0 || target >= nextColumn.length) return prev;
      const temp = nextColumn[target];
      nextColumn[target] = nextColumn[index];
      nextColumn[index] = temp;
      return { ...prev, [column]: nextColumn };
    });
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
        description="Scan delivery health, decision follow-through, and live team signals without the visual noise of the older dashboard shell."
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
          gridTemplateColumns: isNarrow ? "minmax(0,1fr)" : "repeat(2, minmax(0, 1fr))",
        }}
      >
        <div style={leftCol}>
          <div style={{ order: getCardOrder("left", "mission-control"), width: "100%" }}>
            <article className="ui-card-lift ui-smooth" style={{ ...embeddedPanelShell, border: `1px solid ${palette.border}`, background: palette.panel }}>
              <MissionControlPanel />
            </article>
          </div>

          <div style={{ order: getCardOrder("left", "chief-of-staff"), width: "100%" }}>
            <article className="ui-card-lift ui-smooth" style={{ ...embeddedPanelShell, border: `1px solid ${palette.border}`, background: palette.panel }}>
              <ChiefOfStaffPanel />
            </article>
          </div>

          <CollapsibleCard
            title="Health Snapshot"
            palette={palette}
            defaultExpanded={false}
            cardId="health-snapshot"
            column="left"
            order={getCardOrder("left", "health-snapshot")}
            onMoveUp={() => moveCard("left", "health-snapshot", -1)}
            onMoveDown={() => moveCard("left", "health-snapshot", 1)}
          >
            <div style={healthList}>
              <HealthRow label="Knowledge freshness" value="High" tint={palette.good} />
              <HealthRow label="Decision throughput" value={`${stats.nodes}`} tint={palette.info} />
              <HealthRow label="Pending links" value={`${stats.links}`} tint={palette.accent} />
            </div>
          </CollapsibleCard>

          <section
            style={{
              order: getCardOrder("left", "trends-metrics"),
              width: "100%",
              padding: 0,
            }}
          >
            <h3 style={{ margin: "0 0 10px", fontSize: 14, color: palette.text }}>Trends And Metrics</h3>
            <div style={analyticsRow}>
              <TrendAnalysis />
              <MetricsTracker />
            </div>
          </section>

          <CollapsibleCard
            title="Copilot Feedback"
            palette={palette}
            defaultExpanded={false}
            cardId="copilot-feedback"
            column="left"
            order={getCardOrder("left", "copilot-feedback")}
            onMoveUp={() => moveCard("left", "copilot-feedback", -1)}
            onMoveDown={() => moveCard("left", "copilot-feedback", 1)}
          >
            <div style={healthList}>
              {copilotFeedback ? (
                <>
                  <HealthRow
                    label={`Total (${copilotFeedback.window_days || 30}d)`}
                    value={`${copilotFeedback.total_feedback || 0}`}
                    tint={palette.info}
                  />
                  <HealthRow
                    label="Positive rate"
                    value={
                      copilotFeedback.positive_rate !== null && copilotFeedback.positive_rate !== undefined
                        ? `${copilotFeedback.positive_rate}%`
                        : "--"
                    }
                    tint={palette.good}
                  />
                  <HealthRow label="Upvotes" value={`${copilotFeedback.upvotes || 0}`} tint={palette.good} />
                  <HealthRow label="Downvotes" value={`${copilotFeedback.downvotes || 0}`} tint={palette.warn} />
                  <HealthRow
                    label="Outcomes"
                    value={`${copilotFeedback.outcomes?.improved || 0}/${copilotFeedback.outcomes?.neutral || 0}/${copilotFeedback.outcomes?.worse || 0}`}
                    tint={palette.accent}
                  />
                  {copilotFeedbackTrend.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <p style={{ margin: "0 0 6px", fontSize: 11, color: palette.muted }}>7-day trend (up/down)</p>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0,1fr))", gap: 6 }}>
                        {copilotFeedbackTrend.map((point) => {
                          const total = Number(point.total || 0);
                          const up = Number(point.upvotes || 0);
                          const ratio = total > 0 ? Math.max(0.1, up / total) : 0.5;
                          return (
                            <div
                              key={point.date}
                              title={`${point.date}: ${up}/${total}`}
                              style={{
                                height: 26,
                                border: `1px solid ${palette.border}`,
                                borderRadius: 6,
                                background: `linear-gradient(180deg, ${palette.good} ${Math.round(ratio * 100)}%, ${palette.warn} ${Math.round(ratio * 100)}%)`,
                                opacity: total > 0 ? 1 : 0.35,
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>
                  No copilot feedback data yet.
                </p>
              )}
            </div>
          </CollapsibleCard>

          <section
            style={{
              order: getCardOrder("left", "team-expertise"),
              width: "100%",
              padding: 0,
            }}
          >
            <h3 style={{ margin: "0 0 10px", fontSize: 14, color: palette.text }}>Team Expertise</h3>
            <TeamExpertiseMap />
          </section>

          <section
            style={{
              order: getCardOrder("left", "daily-digest"),
              width: "100%",
              padding: 0,
            }}
          >
            <h3 style={{ margin: "0 0 10px", fontSize: 14, color: palette.text }}>Daily Digest</h3>
            <DashboardWidgets />
          </section>
        </div>

        <aside style={rightCol}>
          <CollapsibleCard
            title="Autonomous Decision Twin"
            palette={palette}
            defaultExpanded={false}
            cardId="decision-twin"
            column="right"
            order={getCardOrder("right", "decision-twin")}
            onMoveUp={() => moveCard("right", "decision-twin", -1)}
            onMoveDown={() => moveCard("right", "decision-twin", 1)}
          >
            <div style={healthList}>
              {currentSprint ? (
                <>
                  <HealthRow label="Current sprint" value={`${currentSprint.name || `#${currentSprint.id}`}`} tint={palette.info} />
                  {decisionTwinSummary?.recommendedScenario ? (
                    <>
                      <HealthRow
                        label="Recommended"
                        value={`${decisionTwinSummary.recommendedScenario.name} (${decisionTwinSummary.recommendedScenario.projected_goal_probability}%)`}
                        tint={palette.good}
                      />
                      <HealthRow
                        label="Delta"
                        value={`${decisionTwinSummary.recommendedScenario.delta_vs_baseline >= 0 ? "+" : ""}${decisionTwinSummary.recommendedScenario.delta_vs_baseline}`}
                        tint={palette.accent}
                      />
                      <Link
                        className="ui-card-lift ui-smooth"
                        to={`/sprints/${decisionTwinSummary.sprintId}`}
                        style={{
                          textDecoration: "none",
                          border: `1px solid ${palette.border}`,
                          borderRadius: 10,
                          padding: "8px 10px",
                          display: "block",
                          color: palette.text,
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        Open Sprint Twin
                      </Link>
                    </>
                  ) : (
                    <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>
                      {decisionTwinError || "Refresh backend deployment to enable Decision Twin recommendations."}
                      {decisionTwinUpgrade ? ` Upgrade from ${decisionTwinUpgrade.current_plan} to ${decisionTwinUpgrade.required_plan}.` : ""}
                    </p>
                  )}
                </>
              ) : (
                <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>
                  No active sprint right now.
                </p>
              )}
            </div>
          </CollapsibleCard>

          <CollapsibleCard
            title="Decision Debt Ledger"
            palette={palette}
            defaultExpanded={false}
            cardId="decision-debt"
            column="right"
            order={getCardOrder("right", "decision-debt")}
            onMoveUp={() => moveCard("right", "decision-debt", -1)}
            onMoveDown={() => moveCard("right", "decision-debt", 1)}
          >
            <div style={healthList}>
              {decisionDebt?.summary ? (
                <>
                  <HealthRow label="Debt score" value={`${decisionDebt.summary.decision_debt_score}`} tint={palette.accent} />
                  <HealthRow label="Interest / week" value={`${decisionDebt.summary.interest_per_week}`} tint={palette.warn || palette.accent} />
                  <HealthRow label="Unresolved" value={`${decisionDebt.summary.unresolved_count}`} tint={palette.info} />
                  <HealthRow
                    label={`Trend (${decisionDebt.summary.trend_window_days}d)`}
                    value={`${decisionDebt.summary.trend_delta > 0 ? "+" : ""}${decisionDebt.summary.trend_delta}`}
                    tint={decisionDebt.summary.trend_delta <= 0 ? palette.good : palette.accent}
                  />
                  {(decisionDebt.top_items || []).slice(0, 3).map((item) => (
                    <Link
                      className="ui-card-lift ui-smooth"
                      key={item.decision_id}
                      to={item.link || `/decisions/${item.decision_id}`}
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
                        score {item.debt_score} | age {item.age_days}d | {item.status}
                      </div>
                    </Link>
                  ))}
                </>
              ) : (
                <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>
                  {decisionDebtError || "No decision debt data yet."}
                  {decisionDebtUpgrade ? ` Upgrade from ${decisionDebtUpgrade.current_plan} to ${decisionDebtUpgrade.required_plan}.` : ""}
                </p>
              )}
            </div>
          </CollapsibleCard>

          <CollapsibleCard
            title="Decision Outcomes (Month)"
            palette={palette}
            defaultExpanded={false}
            cardId="decision-outcomes"
            column="right"
            order={getCardOrder("right", "decision-outcomes")}
            onMoveUp={() => moveCard("right", "decision-outcomes", -1)}
            onMoveDown={() => moveCard("right", "decision-outcomes", 1)}
          >
            <div style={healthList}>
              <HealthRow label="Reviewed" value={`${outcomeStats.reviewed_count}`} tint={palette.info} />
              <HealthRow label="Successful" value={`${outcomeStats.success_count}`} tint={palette.good} />
              <HealthRow label="Unsuccessful" value={`${outcomeStats.failure_count}`} tint={palette.accent} />
              <HealthRow label="Success rate" value={`${outcomeStats.success_rate}%`} tint={palette.good} />
              <HealthRow label="Avg reliability" value={`${outcomeStats.avg_reliability}%`} tint={palette.info} />
            </div>
          </CollapsibleCard>

          <CollapsibleCard
            title="Pending Outcome Reviews"
            palette={palette}
            defaultExpanded
            cardId="pending-outcomes"
            column="right"
            order={getCardOrder("right", "pending-outcomes")}
            onMoveUp={() => moveCard("right", "pending-outcomes", -1)}
            onMoveDown={() => moveCard("right", "pending-outcomes", 1)}
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
            cardId="decision-drift"
            column="right"
            order={getCardOrder("right", "decision-drift")}
            onMoveUp={() => moveCard("right", "decision-drift", -1)}
            onMoveDown={() => moveCard("right", "decision-drift", 1)}
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

          <CollapsibleCard
            title="Team Calibration"
            palette={palette}
            defaultExpanded={false}
            cardId="team-calibration"
            column="right"
            order={getCardOrder("right", "team-calibration")}
            onMoveUp={() => moveCard("right", "team-calibration", -1)}
            onMoveDown={() => moveCard("right", "team-calibration", 1)}
          >
            <div style={healthList}>
              {calibrationRows.slice(0, 4).map((row) => (
                <div key={`${row.reviewer_id}-${row.reviewer_name}`} style={{ border: `1px solid ${palette.border}`, borderRadius: 10, padding: "8px 10px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: palette.text }}>{row.reviewer_name}</div>
                  <div style={{ fontSize: 11, color: palette.muted }}>
                    Gap {row.calibration_gap}% | {row.reviews} reviews | {row.quality_band}
                  </div>
                </div>
              ))}
              {calibrationRows.length === 0 && (
                <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>No calibration data yet.</p>
              )}
            </div>
          </CollapsibleCard>

          <div style={{ order: getCardOrder("right", "advanced-insights"), width: "100%" }}>
            <AdvancedAIInsights />
          </div>
          <div style={{ order: getCardOrder("right", "ai-recommendations"), width: "100%" }}>
            <AIRecommendations darkMode={darkMode} />
          </div>
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
  order = 0,
  onMoveUp,
  onMoveDown,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <article
      className="ui-card-lift ui-smooth"
      style={{
        ...panel,
        order,
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
        <div style={moveControls}>
          <button
            className="ui-btn-polish ui-focus-ring"
            onClick={onMoveUp}
            style={{ ...moveButton, color: palette.muted, border: `1px solid ${palette.border}`, background: palette.cardAlt }}
            aria-label={`Move ${title} up`}
            title="Move up"
          >
            <ChevronUpIcon style={icon14} />
          </button>
          <button
            className="ui-btn-polish ui-focus-ring"
            onClick={onMoveDown}
            style={{ ...moveButton, color: palette.muted, border: `1px solid ${palette.border}`, background: palette.cardAlt }}
            aria-label={`Move ${title} down`}
            title="Move down"
          >
            <ChevronDownIcon style={icon14} />
          </button>
        </div>
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
const moveControls = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  paddingRight: 12,
};
const moveButton = {
  width: 28,
  height: 28,
  border: "none",
  borderRadius: 10,
  background: "transparent",
  display: "grid",
  placeItems: "center",
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

const analyticsRow = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 12,
  alignItems: "start",
};

const railTitle = { margin: 0, padding: "14px 14px 4px", fontSize: 14, fontWeight: 700 };
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
