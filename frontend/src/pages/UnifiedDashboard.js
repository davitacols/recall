import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AIRecommendations from "../components/AIRecommendations";
import AdvancedAIInsights from "../components/AdvancedAIInsights";
import DashboardWidgets from "../components/DashboardWidgets";
import MissionControlPanel from "../components/MissionControlPanel";
import ChiefOfStaffPanel from "../components/ChiefOfStaffPanel";
import BrandedDashboardIllustration from "../components/BrandedDashboardIllustration";
import {
  MetricsTracker,
  TeamExpertiseMap,
  TrendAnalysis,
} from "../components/EnhancedWidgets";
import {
  ArrowTrendingUpIcon,
  ChatBubbleLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClipboardDocumentListIcon,
  DocumentCheckIcon,
  LinkIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { buildApiUrl } from "../utils/apiBase";

const DASHBOARD_CARD_ORDER_KEY = "unifiedDashboardCardOrderV1";
const LEFT_CARD_IDS = [
  "mission-control",
  "chief-of-staff",
  "health-snapshot",
  "copilot-feedback",
  "trends-metrics",
  "team-expertise",
  "daily-digest",
];
const RIGHT_CARD_IDS = [
  "decision-twin",
  "decision-debt",
  "decision-outcomes",
  "pending-outcomes",
  "decision-drift",
  "team-calibration",
  "advanced-insights",
  "ai-recommendations",
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

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem("token");

      const timelineRes = await fetch(
        buildApiUrl(`/api/knowledge/timeline/?days=7&page=${page}&per_page=10`),
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const timelineData = await readJsonSafe(timelineRes, { results: [], pagination: { has_next: false } });
      const results = timelineData.results || timelineData;
      setTimeline((prev) => (page === 1 ? results : [...prev, ...results]));
      setHasMore(timelineData.pagination?.has_next || false);

      const statsRes = await fetch(buildApiUrl("/api/knowledge/ai/success-rates/"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const statsData = await readJsonSafe(statsRes, {});

      const outcomesRes = await fetch(buildApiUrl("/api/decisions/outcomes/stats/"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const outcomesData = await readJsonSafe(outcomesRes, {});
      setOutcomeStats({
        reviewed_count: outcomesData.reviewed_count || 0,
        success_count: outcomesData.success_count || 0,
        failure_count: outcomesData.failure_count || 0,
        success_rate: outcomesData.success_rate || 0,
        avg_reliability: outcomesData.avg_reliability || 0,
      });

      const pendingRes = await fetch(buildApiUrl("/api/decisions/outcomes/pending/?overdue_only=false"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const pendingData = await readJsonSafe(pendingRes, { items: [] });
      setPendingOutcomeReviews(pendingData.items || []);
      setPendingOutcomeMeta({
        total: pendingData.total || 0,
        overdue: pendingData.overdue || 0,
      });

      const driftRes = await fetch(buildApiUrl("/api/decisions/outcomes/drift-alerts/"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const driftData = await readJsonSafe(driftRes, { items: [] });
      setDriftAlerts(driftData.items || []);
      setDriftMeta({
        total: driftData.total || 0,
        critical: driftData.critical || 0,
        high: driftData.high || 0,
      });

      const calibrationRes = await fetch(buildApiUrl("/api/decisions/outcomes/calibration/?days=120"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const calibrationData = await readJsonSafe(calibrationRes, { reviewers: [] });
      setCalibrationRows(calibrationData.reviewers || []);

      const sprintRes = await fetch(buildApiUrl("/api/agile/current-sprint/"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const sprintData = await readJsonSafe(sprintRes, null);
      setCurrentSprint(sprintData || null);

      if (sprintData?.id) {
        const twinRes = await fetch(
          buildApiUrl(`/api/agile/sprints/${sprintData.id}/decision-twin/?min_confidence_band=medium&min_probability_delta=1&max_scope_changes=4&allow_backlog_adds=true&enforce_policy=true`),
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (twinRes.ok) {
          const twinData = await readJsonSafe(twinRes, {});
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
        headers: { Authorization: `Bearer ${token}` },
      });
      if (debtRes.ok) {
        const debtData = await readJsonSafe(debtRes, {});
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
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(buildApiUrl("/api/knowledge/ai/copilot/feedback-trend/?days=7"), {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (copilotFeedbackRes.ok) {
        const feedbackData = await readJsonSafe(copilotFeedbackRes, null);
        setCopilotFeedback(feedbackData);
      } else {
        setCopilotFeedback(null);
      }
      if (copilotFeedbackTrendRes.ok) {
        const trendData = await readJsonSafe(copilotFeedbackTrendRes, { points: [] });
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

  const palette = useMemo(
    () => ({
      panel: "var(--ui-panel)",
      panelAlt: "var(--ui-panel-alt)",
      border: "var(--ui-border)",
      text: "var(--ui-text)",
      muted: "var(--ui-muted)",
      dim: "var(--ui-muted)",
      accent: "var(--ui-accent)",
      info: "var(--ui-info)",
      good: "var(--ui-good)",
      warn: "var(--ui-warn)",
      shadow: "none",
    }),
    []
  );

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
      const token = localStorage.getItem("token");
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
      const token = localStorage.getItem("token");
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

  if (loading) {
    return (
      <div style={{ ...loadingWrap, color: palette.text }}>
        <div
          style={{
            ...loadingCard,
            background: palette.panel,
            border: `1px solid ${palette.border}`,
          }}
        >
          <div style={loadingTop}>
            <span className="spinner" aria-hidden="true" />
            <div style={{ minWidth: 0 }}>
              <p style={loadingTitle}>Hydrating your command center</p>
              <p style={{ ...loadingSubtitle, color: palette.muted }}>
                Pulling activity, decisions, outcomes, and sprint signals
              </p>
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
      <section className="ui-enter" style={{ ...controlStrip, border: `1px solid ${palette.border}`, background: palette.panelAlt, "--ui-delay": "10ms" }}>
        <Link to="/projects" style={{ ...controlPill, border: `1px solid ${palette.border}`, color: palette.text }}>Projects</Link>
        <Link to="/sprint" style={{ ...controlPill, border: `1px solid ${palette.border}`, color: palette.text }}>Sprint Board</Link>
        <Link to="/decisions" style={{ ...controlPill, border: `1px solid ${palette.border}`, color: palette.text }}>Decision Hub</Link>
        <Link to="/ask" style={{ ...controlPill, border: `1px solid ${palette.border}`, color: palette.text }}>Ask Recall</Link>
      </section>

      <section
        className="ui-enter"
        style={{
          ...hero,
          border: `1px solid ${palette.border}`,
          "--ui-delay": "70ms",
          background: palette.panel,
          boxShadow: palette.shadow,
          borderRadius: 14,
          padding: "16px 16px 14px",
        }}
      >
        <div style={heroMainWrap}>
          <p style={{ ...eyebrow, color: palette.muted }}>UNIFIED DASHBOARD</p>
          <h1 style={{ ...title, color: palette.text }}>Unified Operations Command Center</h1>
          <p style={{ ...subtitle, color: palette.muted }}>
            Understand what needs attention now, what is healthy, and where to act next across decisions, outcomes, and sprint execution.
          </p>

          <div style={heroBadges}>
            <div style={{ ...heroBadge, border: `1px solid ${palette.border}`, color: palette.text }}>
              <SparklesIcon style={icon16} /> AI rate {stats.rate}%
            </div>
            <div style={{ ...heroBadge, border: `1px solid ${palette.border}`, color: palette.text }}>
              {stats.activity} signals this week
            </div>
          </div>
        </div>

        {!isNarrow && (
          <div style={heroArtWrap}>
            <BrandedDashboardIllustration darkMode={darkMode} />
          </div>
        )}
      </section>

      <section className="ui-enter" style={{ ...kpiGrid, "--ui-delay": "130ms" }}>
        <StatCard label="Activities" value={stats.activity} icon={ChatBubbleLeftIcon} color={palette.accent} tone={palette} />
        <StatCard label="Decisions" value={stats.nodes} icon={DocumentCheckIcon} color={palette.info} tone={palette} />
        <StatCard label="Links" value={stats.links} icon={LinkIcon} color={palette.dim} tone={palette} />
        <StatCard label="Success Rate" value={`${stats.rate}%`} icon={ArrowTrendingUpIcon} color={palette.good} tone={palette} />
      </section>

      <section className="ui-enter" style={{ ...focusSection, "--ui-delay": "160ms" }}>
        <div style={sectionHeader}>
          <p style={{ ...sectionEyebrow, color: palette.muted }}>Immediate Focus</p>
          <p style={{ ...sectionHelper, color: palette.muted }}>
            Start here to resolve the biggest blockers before scanning detailed widgets.
          </p>
        </div>
        <div style={focusGrid}>
          {topFocusCards.map((card) => (
            <article
              key={card.title}
              className="ui-card-lift ui-smooth"
              style={{ ...focusCard, border: `1px solid ${palette.border}`, background: palette.panel }}
            >
              <p style={{ ...focusLabel, color: palette.muted }}>{card.title}</p>
              <p style={{ ...focusValue, color: card.tone }}>{card.value}</p>
              <p style={{ ...focusHelper, color: palette.dim }}>{card.helper}</p>
              <Link
                to={card.ctaTo}
                style={{ ...focusLink, border: `1px solid ${palette.border}`, color: palette.text, background: palette.panelAlt }}
              >
                {card.ctaLabel}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section
        className="ui-enter"
        style={{
          ...mainGrid,
          "--ui-delay": "190ms",
          gridTemplateColumns: "minmax(0,1fr)",
        }}
      >
        <div style={leftCol}>
          <CollapsibleCard title="Latest Signals (last 7 days)" palette={palette} defaultExpanded>
            {timeline.length === 0 ? (
              <div style={{ ...emptyState, color: palette.dim }}>No activity</div>
            ) : (
              <>
                <div style={activityList}>
                  {timeline.slice(0, 10).map((activity) => (
                    <Link
                      className="ui-card-lift ui-smooth"
                      key={activity.id}
                      to={getActivityUrl(activity)}
                      style={{ ...activityRow, borderBottom: `1px solid ${palette.border}` }}
                    >
                      <div style={activityMain}>
                        <p style={{ ...activityTitle, color: palette.text }}>{activity.title}</p>
                        <p style={{ ...activityDate, color: palette.muted }}>
                          {new Date(activity.created_at).toLocaleDateString()}
                        </p>
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
                      style={{ ...loadMoreButton, border: `1px solid ${palette.border}`, color: palette.text, background: palette.panelAlt }}
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
          "--ui-delay": "240ms",
          gridTemplateColumns: isNarrow ? "minmax(0,1fr)" : "repeat(2, minmax(0, 1fr))",
        }}
      >
        <div style={leftCol}>
          <div style={{ order: getCardOrder("left", "mission-control"), width: "100%" }}>
            <MissionControlPanel />
          </div>

          <div style={{ order: getCardOrder("left", "chief-of-staff"), width: "100%" }}>
            <ChiefOfStaffPanel />
          </div>

          <CollapsibleCard
            title="Health Snapshot"
            palette={palette}
            defaultExpanded
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
            defaultExpanded
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
            defaultExpanded
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
            defaultExpanded
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
            defaultExpanded
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
                    border: `1px solid ${palette.border}`,
                    borderRadius: 10,
                    padding: "7px 10px",
                    fontSize: 12,
                    fontWeight: 700,
                    color: palette.text,
                  }}
                >
                  Open Queue
                </Link>
                <button
                  className="ui-btn-polish ui-focus-ring"
                  onClick={sendOutcomeReminders}
                  disabled={notifyingOutcomes || pendingOutcomeMeta.overdue === 0}
                  style={{
                    border: `1px solid ${palette.border}`,
                    borderRadius: 10,
                    padding: "7px 10px",
                    fontSize: 12,
                    fontWeight: 700,
                    background: palette.panelAlt,
                    color: palette.text,
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
                    border: `1px solid ${palette.border}`,
                    borderRadius: 10,
                    padding: "7px 10px",
                    fontSize: 12,
                    fontWeight: 700,
                    background: palette.panelAlt,
                    color: palette.text,
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
            defaultExpanded
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

function StatCard({ label, value, icon: Icon, color, tone }) {
  return (
    <article style={{ ...statCard, border: `1px solid ${tone.border}`, background: tone.panel }}>
      <div style={statHead}>
        <p style={{ ...statLabel, color: tone.muted }}>{label}</p>
        <Icon style={{ ...icon16, color }} />
      </div>
      <p style={{ ...statValue, color: tone.text }}>{value}</p>
    </article>
  );
}

function HealthRow({ label, value, tint, muted = "#9a8a78" }) {
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
      style={{ ...panel, order }}
    >
      <div style={{ ...collapseHeaderRow, borderBottom: expanded ? `1px solid ${palette.border}` : "none" }}>
        <button
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
            onClick={onMoveUp}
            style={{ ...moveButton, color: palette.muted, border: `1px solid ${palette.border}` }}
            aria-label={`Move ${title} up`}
            title="Move up"
          >
            <ChevronUpIcon style={icon14} />
          </button>
          <button
            onClick={onMoveDown}
            style={{ ...moveButton, color: palette.muted, border: `1px solid ${palette.border}` }}
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
  gap: 12,
};

const controlStrip = {
  position: "relative",
  zIndex: 1,
  borderRadius: 10,
  padding: "8px",
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

const controlPill = {
  textDecoration: "none",
  borderRadius: 999,
  padding: "7px 12px",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.01em",
  background: "transparent",
};

const hero = {
  position: "relative",
  zIndex: 1,
  borderRadius: 0,
  padding: "2px 0 2px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: 12,
  flexWrap: "wrap",
};

const eyebrow = { margin: 0, fontSize: 10, letterSpacing: "0.14em", fontWeight: 700 };

const title = {
  margin: "10px 0 8px",
  fontSize: "clamp(1.4rem, 3vw, 2.15rem)",
  lineHeight: 1.08,
  letterSpacing: "-0.02em",
};

const subtitle = { margin: 0, fontSize: 14, lineHeight: 1.48, maxWidth: 700 };
const heroMainWrap = { minWidth: 0, flex: 1 };

const heroBadges = { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" };
const heroArtWrap = { width: "min(360px, 100%)", display: "grid", placeItems: "stretch" };

const heroBadge = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 700,
  background: "var(--app-info-soft)",
};

const kpiGrid = {
  position: "relative",
  zIndex: 1,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 10,
};

const focusSection = {
  position: "relative",
  zIndex: 1,
  display: "grid",
  gap: 10,
};

const sectionHeader = { display: "grid", gap: 4 };
const sectionEyebrow = {
  margin: 0,
  fontSize: 10,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.2em",
};
const sectionHelper = { margin: 0, fontSize: 13 };

const focusGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: 12,
};

const focusCard = {
  borderRadius: 16,
  padding: "12px 12px 11px",
  display: "grid",
  gap: 6,
  boxShadow: "none",
};

const focusLabel = { margin: 0, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" };
const focusValue = { margin: 0, fontSize: 22, fontWeight: 800, lineHeight: 1.1 };
const focusHelper = { margin: 0, fontSize: 12 };
const focusLink = {
  marginTop: 4,
  textDecoration: "none",
  borderRadius: 12,
  padding: "8px 10px",
  fontSize: 12,
  fontWeight: 800,
  textAlign: "center",
};

const statCard = {
  borderRadius: 16,
  padding: "12px 12px 11px",
  boxShadow: "none",
};
const statHead = { display: "flex", justifyContent: "space-between", alignItems: "center" };
const statLabel = { margin: 0, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 };
const statValue = { margin: "9px 0 0", fontSize: 30, lineHeight: 1, fontWeight: 800 };

const mainGrid = { position: "relative", zIndex: 1, display: "grid", gap: 12, alignItems: "start" };
const leftCol = { display: "grid", gap: 12, alignContent: "start", alignItems: "start", gridAutoRows: "max-content" };
const rightCol = { display: "grid", gap: 12, alignContent: "start" };

const panel = {
  borderRadius: 0,
  overflow: "hidden",
  boxShadow: "none",
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
  padding: "12px 14px",
  textAlign: "left",
  cursor: "pointer",
};
const moveControls = {
  display: "flex",
  alignItems: "center",
  gap: 2,
  paddingRight: 8,
};
const moveButton = {
  width: 24,
  height: 24,
  border: "none",
  borderRadius: 6,
  background: "transparent",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
};

const activityList = { display: "grid" };
const activityRow = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  justifyContent: "space-between",
  padding: "13px 14px",
  textDecoration: "none",
};

const activityMain = { minWidth: 0 };
const activityTitle = {
  margin: 0,
  fontSize: 14,
  fontWeight: 600,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
const activityDate = { margin: "4px 0 0", fontSize: 12 };

const loadMoreWrap = { padding: 12, textAlign: "center" };
const loadMoreButton = { borderRadius: 12, padding: "9px 13px", fontSize: 13, fontWeight: 800, cursor: "pointer" };

const analyticsRow = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 12,
  alignItems: "start",
};

const railTitle = { margin: 0, padding: "14px 14px 4px", fontSize: 14, fontWeight: 700 };
const healthList = { padding: "10px 14px 14px", display: "grid", gap: 9 };
const healthRow = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 };
const healthLabel = { margin: 0, fontSize: 12, color: "#9a8a78" };
const healthValue = { margin: 0, fontSize: 12, fontWeight: 700 };

const emptyState = { padding: "26px 14px", textAlign: "center" };
const loadingWrap = {
  padding: "clamp(16px, 3vw, 28px)",
  minHeight: "50vh",
  display: "grid",
  placeItems: "center",
};
const loadingCard = {
  width: "min(560px, 100%)",
  borderRadius: 16,
  padding: "16px 16px 14px",
  boxShadow: "0 18px 40px rgba(0,0,0,0.16)",
};
const loadingTop = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginBottom: 12,
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
