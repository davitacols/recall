import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AIRecommendations from "../components/AIRecommendations";
import AdvancedAIInsights from "../components/AdvancedAIInsights";
import DashboardWidgets from "../components/DashboardWidgets";
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

export default function UnifiedDashboard() {
  const { darkMode } = useTheme();
  const [timeline, setTimeline] = useState([]);
  const [stats, setStats] = useState({ activity: 0, nodes: 0, links: 0, rate: 0 });
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
        `http://localhost:8000/api/knowledge/timeline/?days=7&page=${page}&per_page=10`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const timelineData = await timelineRes.json();
      const results = timelineData.results || timelineData;
      setTimeline((prev) => (page === 1 ? results : [...prev, ...results]));
      setHasMore(timelineData.pagination?.has_next || false);

      const statsRes = await fetch("http://localhost:8000/api/knowledge/ai/success-rates/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const statsData = await statsRes.json();

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
    return `/${type}s/${activity.object_id}`;
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
          <article style={{ ...panel, background: palette.panel, border: `1px solid ${palette.border}` }}>
            <h3 style={{ ...railTitle, color: palette.text }}>Health Snapshot</h3>
            <div style={healthList}>
              <HealthRow label="Knowledge freshness" value="High" tint={palette.good} />
              <HealthRow label="Decision throughput" value={`${stats.nodes}`} tint={palette.info} />
              <HealthRow label="Pending links" value={`${stats.links}`} tint={palette.accent} />
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
