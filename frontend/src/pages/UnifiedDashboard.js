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
import {
  ArrowTrendingUpIcon,
  ChatBubbleLeftIcon,
  ClipboardDocumentListIcon,
  DocumentCheckIcon,
  LinkIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { buildApiUrl } from "../utils/apiBase";

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
    () =>
      darkMode
        ? {
            panel: "#171215",
            panelAlt: "#1e171b",
            border: "rgba(255,225,193,0.14)",
            text: "#f4ece0",
            muted: "#baa892",
            dim: "#8b7b69",
            accent: "#ffb476",
            info: "#86c8ff",
            good: "#66d5ab",
            warn: "#f59e0b",
            bg: "#0f0b0d",
          }
        : {
            panel: "#fffaf3",
            panelAlt: "#ffffff",
            border: "#eadfce",
            text: "#231814",
            muted: "#7d6d5a",
            dim: "#9e8d7b",
            accent: "#d9692e",
            info: "#2563eb",
            good: "#1f8f66",
            warn: "#a16207",
            bg: "#f5eee3",
          },
    [darkMode]
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

  if (loading) {
    return (
      <div style={loadingWrap}>
        <p style={{ color: palette.text }}>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div style={{ ...pageStyle, background: palette.bg, fontFamily: "'Sora', 'Space Grotesk', 'Segoe UI', sans-serif" }}>
      <div style={{ ...ambientLayer, background: darkMode ? "radial-gradient(circle at 8% 2%, rgba(249,115,22,0.2), transparent 34%), radial-gradient(circle at 92% 6%, rgba(34,197,94,0.14), transparent 28%)" : "radial-gradient(circle at 8% 2%, rgba(249,115,22,0.14), transparent 34%), radial-gradient(circle at 92% 6%, rgba(34,197,94,0.1), transparent 28%)" }} />
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
          background: `linear-gradient(135deg, ${
            darkMode ? "rgba(59,130,246,0.16)" : "rgba(191,219,254,0.52)"
          } 0%, ${darkMode ? "rgba(249,115,22,0.15)" : "rgba(255,220,182,0.58)"} 52%, ${
            darkMode ? "rgba(34,197,94,0.12)" : "rgba(187,247,208,0.44)"
          } 100%)`,
        }}
      >
        <div>
          <p style={{ ...eyebrow, color: palette.muted }}>UNIFIED DASHBOARD</p>
          <h1 style={{ ...title, color: palette.text }}>Launch Command Center</h1>
          <p style={{ ...subtitle, color: palette.muted }}>
            Run sprint risk, decision debt, outcome quality, and team execution from one operating surface.
          </p>
        </div>

        <div style={heroBadges}>
          <div style={{ ...heroBadge, border: `1px solid ${palette.border}`, color: palette.text }}>
            <SparklesIcon style={icon16} /> AI rate {stats.rate}%
          </div>
          <div style={{ ...heroBadge, border: `1px solid ${palette.border}`, color: palette.text }}>
            {stats.activity} signals this week
          </div>
        </div>
      </section>

      <section className="ui-enter" style={{ ...kpiGrid, "--ui-delay": "130ms" }}>
        <StatCard label="Activities" value={stats.activity} icon={ChatBubbleLeftIcon} color={palette.accent} tone={palette} />
        <StatCard label="Decisions" value={stats.nodes} icon={DocumentCheckIcon} color={palette.info} tone={palette} />
        <StatCard label="Links" value={stats.links} icon={LinkIcon} color={palette.dim} tone={palette} />
        <StatCard label="Success Rate" value={`${stats.rate}%`} icon={ArrowTrendingUpIcon} color={palette.good} tone={palette} />
      </section>

      <section
        className="ui-enter"
        style={{
          ...mainGrid,
          "--ui-delay": "190ms",
          gridTemplateColumns: isNarrow ? "minmax(0,1fr)" : "minmax(0, 1fr) 340px",
        }}
      >
        <div style={leftCol}>
          <article className="ui-card-lift ui-smooth" style={{ ...panel, background: palette.panel, border: `1px solid ${palette.border}` }}>
            <div style={panelHeader}>
              <h2 style={{ ...panelTitle, color: palette.text }}>Recent Activity</h2>
            </div>

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
          </article>

          <div style={analyticsRow}>
            <TrendAnalysis />
            <MetricsTracker />
          </div>

          <TeamExpertiseMap />
        </div>

        <aside style={rightCol}>
          <MissionControlPanel darkMode={darkMode} />
          <ChiefOfStaffPanel darkMode={darkMode} />

          <article className="ui-card-lift ui-smooth" style={{ ...panel, background: palette.panel, border: `1px solid ${palette.border}` }}>
            <h3 style={{ ...railTitle, color: palette.text }}>Autonomous Decision Twin</h3>
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
          </article>

          <article className="ui-card-lift ui-smooth" style={{ ...panel, background: palette.panel, border: `1px solid ${palette.border}` }}>
            <h3 style={{ ...railTitle, color: palette.text }}>Decision Debt Ledger</h3>
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
          </article>

          <article className="ui-card-lift ui-smooth" style={{ ...panel, background: palette.panel, border: `1px solid ${palette.border}` }}>
            <h3 style={{ ...railTitle, color: palette.text }}>Health Snapshot</h3>
            <div style={healthList}>
              <HealthRow label="Knowledge freshness" value="High" tint={palette.good} />
              <HealthRow label="Decision throughput" value={`${stats.nodes}`} tint={palette.info} />
              <HealthRow label="Pending links" value={`${stats.links}`} tint={palette.accent} />
            </div>
          </article>

          <article className="ui-card-lift ui-smooth" style={{ ...panel, background: palette.panel, border: `1px solid ${palette.border}` }}>
            <h3 style={{ ...railTitle, color: palette.text }}>Decision Outcomes (Month)</h3>
            <div style={healthList}>
              <HealthRow label="Reviewed" value={`${outcomeStats.reviewed_count}`} tint={palette.info} />
              <HealthRow label="Successful" value={`${outcomeStats.success_count}`} tint={palette.good} />
              <HealthRow label="Unsuccessful" value={`${outcomeStats.failure_count}`} tint={palette.accent} />
              <HealthRow label="Success rate" value={`${outcomeStats.success_rate}%`} tint={palette.good} />
              <HealthRow label="Avg reliability" value={`${outcomeStats.avg_reliability}%`} tint={palette.info} />
            </div>
          </article>

          <article className="ui-card-lift ui-smooth" style={{ ...panel, background: palette.panel, border: `1px solid ${palette.border}` }}>
            <h3 style={{ ...railTitle, color: palette.text }}>Pending Outcome Reviews</h3>
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
          </article>

          <article className="ui-card-lift ui-smooth" style={{ ...panel, background: palette.panel, border: `1px solid ${palette.border}` }}>
            <h3 style={{ ...railTitle, color: palette.text }}>Decision Drift Alerts</h3>
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
          </article>

          <article className="ui-card-lift ui-smooth" style={{ ...panel, background: palette.panel, border: `1px solid ${palette.border}` }}>
            <h3 style={{ ...railTitle, color: palette.text }}>Team Calibration</h3>
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
          </article>

          <DashboardWidgets />
          <AdvancedAIInsights />
          <AIRecommendations darkMode={darkMode} />
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

const pageStyle = {
  position: "relative",
  padding: "clamp(14px, 2.6vw, 24px)",
  display: "grid",
  gap: 12,
};

const ambientLayer = {
  position: "fixed",
  inset: 0,
  pointerEvents: "none",
  zIndex: 0,
};

const controlStrip = {
  position: "relative",
  zIndex: 1,
  borderRadius: 14,
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
};

const hero = {
  position: "relative",
  zIndex: 1,
  borderRadius: 18,
  padding: "clamp(18px, 3vw, 30px)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: 12,
  flexWrap: "wrap",
};

const eyebrow = { margin: 0, fontSize: 11, letterSpacing: "0.15em" };

const title = {
  margin: "8px 0 7px",
  fontSize: "clamp(1.45rem, 3.4vw, 2.35rem)",
  lineHeight: 1.08,
  letterSpacing: "-0.02em",
};

const subtitle = { margin: 0, fontSize: 14, lineHeight: 1.5, maxWidth: 720 };

const heroBadges = { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" };

const heroBadge = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 700,
};

const kpiGrid = {
  position: "relative",
  zIndex: 1,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 10,
};

const statCard = { borderRadius: 13, padding: "12px 12px 11px" };
const statHead = { display: "flex", justifyContent: "space-between", alignItems: "center" };
const statLabel = { margin: 0, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 };
const statValue = { margin: "9px 0 0", fontSize: 30, lineHeight: 1, fontWeight: 800 };

const mainGrid = { position: "relative", zIndex: 1, display: "grid", gap: 12 };
const leftCol = { display: "grid", gap: 12 };
const rightCol = { display: "grid", gap: 12, alignContent: "start" };

const panel = { borderRadius: 14, overflow: "hidden" };
const panelHeader = { padding: "14px 14px 12px" };
const panelTitle = { margin: 0, fontSize: 16 };

const activityList = { display: "grid" };
const activityRow = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  justifyContent: "space-between",
  padding: "12px 14px",
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
const loadMoreButton = { borderRadius: 10, padding: "8px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer" };

const analyticsRow = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 };

const railTitle = { margin: 0, padding: "14px 14px 4px", fontSize: 14, fontWeight: 700 };
const healthList = { padding: "8px 14px 14px", display: "grid", gap: 8 };
const healthRow = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 };
const healthLabel = { margin: 0, fontSize: 12, color: "#9a8a78" };
const healthValue = { margin: 0, fontSize: 12, fontWeight: 700 };

const emptyState = { padding: "26px 14px", textAlign: "center" };
const loadingWrap = { padding: 40, textAlign: "center" };
const icon16 = { width: 16, height: 16 };
