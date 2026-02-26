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

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem("token");

      const timelineRes = await fetch(
        buildApiUrl(`/api/knowledge/timeline/?days=7&page=${page}&per_page=10`),
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const timelineData = await timelineRes.json();
      const results = timelineData.results || timelineData;
      setTimeline((prev) => (page === 1 ? results : [...prev, ...results]));
      setHasMore(timelineData.pagination?.has_next || false);

      const statsRes = await fetch(buildApiUrl("/api/knowledge/ai/success-rates/"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const statsData = await statsRes.json();

      const outcomesRes = await fetch(buildApiUrl("/api/decisions/outcomes/stats/"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const outcomesData = await outcomesRes.json();
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
      const pendingData = await pendingRes.json();
      setPendingOutcomeReviews(pendingData.items || []);
      setPendingOutcomeMeta({
        total: pendingData.total || 0,
        overdue: pendingData.overdue || 0,
      });

      const driftRes = await fetch(buildApiUrl("/api/decisions/outcomes/drift-alerts/"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const driftData = await driftRes.json();
      setDriftAlerts(driftData.items || []);
      setDriftMeta({
        total: driftData.total || 0,
        critical: driftData.critical || 0,
        high: driftData.high || 0,
      });

      const calibrationRes = await fetch(buildApiUrl("/api/decisions/outcomes/calibration/?days=120"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const calibrationData = await calibrationRes.json();
      setCalibrationRows(calibrationData.reviewers || []);

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
    <div style={pageStyle}>
      <section
        style={{
          ...hero,
          border: `1px solid ${palette.border}`,
          background: `linear-gradient(140deg, ${
            darkMode ? "rgba(255,167,97,0.15)" : "rgba(255,196,146,0.42)"
          }, ${darkMode ? "rgba(87,205,184,0.13)" : "rgba(152,243,223,0.38)"})`,
        }}
      >
        <div>
          <p style={{ ...eyebrow, color: palette.muted }}>UNIFIED DASHBOARD</p>
          <h1 style={{ ...title, color: palette.text }}>Organization pulse, in one glance</h1>
          <p style={{ ...subtitle, color: palette.muted }}>
            Monitor knowledge activity, decision throughput, and insight quality from one command surface.
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

      <section style={kpiGrid}>
        <StatCard label="Activities" value={stats.activity} icon={ChatBubbleLeftIcon} color={palette.accent} tone={palette} />
        <StatCard label="Decisions" value={stats.nodes} icon={DocumentCheckIcon} color={palette.info} tone={palette} />
        <StatCard label="Links" value={stats.links} icon={LinkIcon} color={palette.dim} tone={palette} />
        <StatCard label="Success Rate" value={`${stats.rate}%`} icon={ArrowTrendingUpIcon} color={palette.good} tone={palette} />
      </section>

      <section
        style={{
          ...mainGrid,
          gridTemplateColumns: isNarrow ? "minmax(0,1fr)" : "minmax(0, 1fr) 340px",
        }}
      >
        <div style={leftCol}>
          <article style={{ ...panel, background: palette.panel, border: `1px solid ${palette.border}` }}>
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

          <article style={{ ...panel, background: palette.panel, border: `1px solid ${palette.border}` }}>
            <h3 style={{ ...railTitle, color: palette.text }}>Health Snapshot</h3>
            <div style={healthList}>
              <HealthRow label="Knowledge freshness" value="High" tint={palette.good} />
              <HealthRow label="Decision throughput" value={`${stats.nodes}`} tint={palette.info} />
              <HealthRow label="Pending links" value={`${stats.links}`} tint={palette.accent} />
            </div>
          </article>

          <article style={{ ...panel, background: palette.panel, border: `1px solid ${palette.border}` }}>
            <h3 style={{ ...railTitle, color: palette.text }}>Decision Outcomes (Month)</h3>
            <div style={healthList}>
              <HealthRow label="Reviewed" value={`${outcomeStats.reviewed_count}`} tint={palette.info} />
              <HealthRow label="Successful" value={`${outcomeStats.success_count}`} tint={palette.good} />
              <HealthRow label="Unsuccessful" value={`${outcomeStats.failure_count}`} tint={palette.accent} />
              <HealthRow label="Success rate" value={`${outcomeStats.success_rate}%`} tint={palette.good} />
              <HealthRow label="Avg reliability" value={`${outcomeStats.avg_reliability}%`} tint={palette.info} />
            </div>
          </article>

          <article style={{ ...panel, background: palette.panel, border: `1px solid ${palette.border}` }}>
            <h3 style={{ ...railTitle, color: palette.text }}>Pending Outcome Reviews</h3>
            <div style={healthList}>
              <HealthRow label="Total pending" value={`${pendingOutcomeMeta.total}`} tint={palette.info} />
              <HealthRow label="Overdue" value={`${pendingOutcomeMeta.overdue}`} tint={palette.accent} />
              {pendingOutcomeReviews.slice(0, 3).map((item) => (
                <Link
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

          <article style={{ ...panel, background: palette.panel, border: `1px solid ${palette.border}` }}>
            <h3 style={{ ...railTitle, color: palette.text }}>Decision Drift Alerts</h3>
            <div style={healthList}>
              <HealthRow label="Total alerts" value={`${driftMeta.total}`} tint={palette.info} />
              <HealthRow label="Critical" value={`${driftMeta.critical}`} tint={palette.accent} />
              <HealthRow label="High" value={`${driftMeta.high}`} tint={palette.accent} />
              {driftAlerts.slice(0, 3).map((item) => (
                <Link
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

          <article style={{ ...panel, background: palette.panel, border: `1px solid ${palette.border}` }}>
            <h3 style={{ ...railTitle, color: palette.text }}>Team Calibration</h3>
            <div style={healthList}>
              {calibrationRows.slice(0, 4).map((row) => (
                <div key={`${row.reviewer_id}-${row.reviewer_name}`} style={{ border: `1px solid ${palette.border}`, borderRadius: 10, padding: "8px 10px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: palette.text }}>{row.reviewer_name}</div>
                  <div style={{ fontSize: 11, color: palette.muted }}>
                    Gap {row.calibration_gap}% • {row.reviews} reviews • {row.quality_band}
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

function HealthRow({ label, value, tint }) {
  return (
    <div style={healthRow}>
      <p style={healthLabel}>{label}</p>
      <p style={{ ...healthValue, color: tint }}>{value}</p>
    </div>
  );
}

const pageStyle = {
  padding: "clamp(14px, 2.6vw, 24px)",
  display: "grid",
  gap: 12,
};

const hero = {
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
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 10,
};

const statCard = { borderRadius: 13, padding: "12px 12px 11px" };
const statHead = { display: "flex", justifyContent: "space-between", alignItems: "center" };
const statLabel = { margin: 0, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 };
const statValue = { margin: "9px 0 0", fontSize: 30, lineHeight: 1, fontWeight: 800 };

const mainGrid = { display: "grid", gap: 12 };
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
