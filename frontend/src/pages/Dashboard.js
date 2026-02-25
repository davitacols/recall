import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  ChatBubbleLeftIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { CardSkeleton } from "../components/Skeleton";
import { useAuth } from "../hooks/useAuth";
import api from "../services/api";
import { useTheme } from "../utils/ThemeAndAccessibility";

function Dashboard() {
  const { user } = useAuth();
  const { darkMode } = useTheme();
  const [isNarrow, setIsNarrow] = useState(window.innerWidth < 1040);

  const [activities, setActivities] = useState([]);
  const [currentSprint, setCurrentSprint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalConversations: 0,
    totalDecisions: 0,
    activeIssues: 0,
    teamMembers: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 1040);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const fetchData = async () => {
    try {
      const [activityRes, sprintRes] = await Promise.all([
        api
          .get("/api/organizations/activity/feed/")
          .catch(() => ({ data: { activities: [] } })),
        api.get("/api/agile/current-sprint/").catch(() => ({ data: null })),
      ]);

      const allActivities = activityRes.data.activities || [];
      const recentActivities = allActivities.slice(0, 12).map((activity) => ({
        type: activity.content?.type || activity.action_type,
        title: activity.content?.title || activity.action_display,
        author: activity.actor?.name || "Unknown",
        time: new Date(activity.created_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        status: activity.content?.status || activity.content?.post_type,
        id: activity.content?.id,
      }));

      setStats({
        totalConversations: allActivities.filter(
          (item) => item.content?.type === "conversation"
        ).length,
        totalDecisions: allActivities.filter(
          (item) => item.content?.type === "decision"
        ).length,
        activeIssues: sprintRes.data?.issue_count || 0,
        teamMembers: 0,
      });

      setActivities(recentActivities);
      setCurrentSprint(sprintRes.data);
    } catch (error) {
      console.error("Failed to fetch:", error);
    } finally {
      setLoading(false);
    }
  };

  const palette = useMemo(
    () =>
      darkMode
        ? {
            cardBg: "#171215",
            cardBgAlt: "#1d171b",
            border: "rgba(255,225,193,0.14)",
            text: "#f4ece0",
            muted: "#baa892",
            accent: "#ffb476",
            good: "#61d4a4",
            warn: "#ffca7d",
            info: "#86c8ff",
          }
        : {
            cardBg: "#fffaf3",
            cardBgAlt: "#ffffff",
            border: "#eadfce",
            text: "#231814",
            muted: "#7d6d5a",
            accent: "#d9692e",
            good: "#1f8f66",
            warn: "#a15a1b",
            info: "#2563eb",
          },
    [darkMode]
  );

  const sprintCompleted =
    currentSprint?.completed_count || currentSprint?.completed || 0;
  const sprintInProgress = currentSprint?.in_progress || 0;
  const sprintBlocked = currentSprint?.blocked_count || currentSprint?.blocked || 0;
  const sprintTotal = currentSprint?.issue_count || 0;
  const sprintTodo = Math.max(
    sprintTotal - sprintCompleted - sprintInProgress - sprintBlocked,
    0
  );

  if (loading) {
    return (
      <div style={container}>
        <div style={{ marginBottom: 22 }}>
          <div style={loadingTitle} />
          <div style={loadingSub} />
        </div>
        <div style={metricGrid}>
          {[1, 2, 3, 4].map((item) => (
            <CardSkeleton key={item} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={container}>
      <section
        style={{
          ...hero,
          background: `linear-gradient(135deg, ${darkMode ? "rgba(255,164,95,0.2)" : "rgba(255,184,128,0.46)"}, ${
            darkMode ? "rgba(72,161,145,0.18)" : "rgba(144,236,217,0.42)"
          })`,
          border: `1px solid ${palette.border}`,
        }}
      >
        <div>
          <p style={{ ...eyebrow, color: palette.muted }}>KNOLEDGR DASHBOARD</p>
          <h1 style={{ ...heroTitle, color: palette.text }}>
            Welcome back, {user?.full_name?.split(" ")[0] || "there"}
          </h1>
          <p style={{ ...heroSubtitle, color: palette.muted }}>
            Track decision velocity, sprint health, and recent organizational
            memory updates in one place.
          </p>
        </div>
        <div style={heroActions}>
          <Link to="/conversations/new" style={primaryAction}>
            New Conversation
          </Link>
          <Link to="/decisions/new" style={secondaryAction}>
            New Decision
          </Link>
        </div>
      </section>

      <section style={metricGrid}>
        <MetricCard
          title="Conversations"
          value={stats.totalConversations}
          subtitle="Knowledge threads"
          icon={ChatBubbleLeftIcon}
          color={palette.accent}
          palette={palette}
        />
        <MetricCard
          title="Decisions"
          value={stats.totalDecisions}
          subtitle="Documented choices"
          icon={DocumentTextIcon}
          color={palette.info}
          palette={palette}
        />
        <MetricCard
          title="Active Issues"
          value={stats.activeIssues}
          subtitle="Current sprint"
          icon={ExclamationTriangleIcon}
          color={palette.warn}
          palette={palette}
        />
        <MetricCard
          title="Memory Health"
          value="85%"
          subtitle="Capture quality"
          icon={SparklesIcon}
          color={palette.good}
          palette={palette}
        />
      </section>

      <section
        style={{
          ...contentGrid,
          gridTemplateColumns: isNarrow
            ? "minmax(0, 1fr)"
            : "minmax(0, 1.8fr) minmax(260px, 1fr)",
        }}
      >
        <article
          style={{
            ...panel,
            background: palette.cardBg,
            border: `1px solid ${palette.border}`,
          }}
        >
          <div style={panelHeader}>
            <h2 style={{ ...panelTitle, color: palette.text }}>Recent Activity</h2>
            <Link to="/activity" style={{ ...panelLink, color: palette.accent }}>
              View all <ArrowRightIcon style={icon14} />
            </Link>
          </div>

          {activities.length === 0 ? (
            <div style={emptyState}>
              <ClockIcon style={{ ...icon16, color: palette.muted }} />
              <p style={{ margin: 0, color: palette.muted }}>No activity yet</p>
            </div>
          ) : (
            <div style={activityList}>
              {activities.map((activity, index) => (
                <div
                  key={`${activity.id || index}-${activity.time}`}
                  style={{
                    ...activityCard,
                    background: palette.cardBgAlt,
                    border: `1px solid ${palette.border}`,
                  }}
                >
                  <span style={{ ...activityDot, background: palette.accent }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ ...activityTitle, color: palette.text }}>
                      {activity.title || "Untitled"}
                    </p>
                    <p style={{ ...activityMeta, color: palette.muted }}>
                      {activity.status || activity.type || "update"} by {activity.author}
                    </p>
                  </div>
                  <p style={{ ...activityTime, color: palette.muted }}>{activity.time}</p>
                </div>
              ))}
            </div>
          )}
        </article>

        <div style={rightRail}>
          <article
            style={{
              ...panel,
              background: palette.cardBg,
              border: `1px solid ${palette.border}`,
            }}
          >
            <div style={panelHeader}>
              <h2 style={{ ...panelTitle, color: palette.text }}>Current Sprint</h2>
              <Link to="/sprint" style={{ ...panelLink, color: palette.accent }}>
                Open <ArrowRightIcon style={icon14} />
              </Link>
            </div>

            {currentSprint ? (
              <>
                <p style={{ ...sprintName, color: palette.text }}>{currentSprint.name}</p>
                <p style={{ ...sprintDate, color: palette.muted }}>
                  <CalendarDaysIcon style={icon14} /> {currentSprint.start_date} to {currentSprint.end_date}
                </p>

                <div style={sprintGrid}>
                  <SprintStat label="Done" value={sprintCompleted} tint={palette.good} />
                  <SprintStat label="In Progress" value={sprintInProgress} tint={palette.info} />
                  <SprintStat label="To Do" value={sprintTodo} tint={palette.muted} />
                  <SprintStat label="Blocked" value={sprintBlocked} tint={palette.warn} />
                </div>
              </>
            ) : (
              <p style={{ color: palette.muted, margin: 0 }}>No active sprint right now.</p>
            )}
          </article>

          <article
            style={{
              ...panel,
              background: palette.cardBg,
              border: `1px solid ${palette.border}`,
            }}
          >
            <h2 style={{ ...panelTitle, color: palette.text, marginBottom: 12 }}>
              Quick Actions
            </h2>
            <div style={actionStack}>
              <Link to="/conversations/new" style={railPrimaryAction}>
                Start Conversation
              </Link>
              <Link to="/decisions/new" style={railSecondaryAction}>
                Capture Decision
              </Link>
              <Link to="/sprint" style={railSecondaryAction}>
                View Sprint Board
              </Link>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ title, value, subtitle, icon: Icon, color, palette }) {
  return (
    <article
      style={{
        ...metricCard,
        background: palette.cardBg,
        border: `1px solid ${palette.border}`,
      }}
    >
      <div style={metricHeader}>
        <p style={{ ...metricTitle, color: palette.muted }}>{title}</p>
        <Icon style={{ ...icon16, color }} />
      </div>
      <p style={{ ...metricValue, color: palette.text }}>{value}</p>
      <p style={{ ...metricSubtitle, color: palette.muted }}>{subtitle}</p>
    </article>
  );
}

function SprintStat({ label, value, tint }) {
  return (
    <div style={{ ...sprintStat, borderColor: `${tint}55`, background: `${tint}1A` }}>
      <p style={{ ...sprintValue, color: tint }}>{value}</p>
      <p style={{ ...sprintLabel, color: tint }}>{label}</p>
    </div>
  );
}

const container = {
  display: "grid",
  gap: 16,
};

const hero = {
  borderRadius: 18,
  padding: "clamp(18px, 3vw, 28px)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  flexWrap: "wrap",
  gap: 16,
};

const eyebrow = {
  margin: 0,
  fontSize: 11,
  letterSpacing: "0.15em",
};

const heroTitle = {
  margin: "8px 0 6px",
  fontSize: "clamp(1.5rem, 3.2vw, 2.3rem)",
  lineHeight: 1.08,
  letterSpacing: "-0.02em",
};

const heroSubtitle = {
  margin: 0,
  maxWidth: 680,
  lineHeight: 1.5,
  fontSize: 14,
};

const heroActions = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const sharedAction = {
  borderRadius: 10,
  padding: "10px 14px",
  textDecoration: "none",
  fontSize: 13,
  fontWeight: 700,
};

const primaryAction = {
  ...sharedAction,
  background: "linear-gradient(135deg, #ffd190, #ff9f62)",
  color: "#22150f",
};

const secondaryAction = {
  ...sharedAction,
  background: "rgba(0,0,0,0.18)",
  color: "#f5ece0",
  border: "1px solid rgba(255,230,196,0.25)",
};

const metricGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
};

const metricCard = {
  borderRadius: 14,
  padding: 14,
};

const metricHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const metricTitle = {
  margin: 0,
  textTransform: "uppercase",
  letterSpacing: "0.07em",
  fontSize: 11,
  fontWeight: 700,
};

const metricValue = {
  margin: "10px 0 0",
  fontSize: 30,
  lineHeight: 1,
  fontWeight: 800,
};

const metricSubtitle = {
  margin: "5px 0 0",
  fontSize: 12,
};

const contentGrid = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.8fr) minmax(260px, 1fr)",
  gap: 12,
};

const panel = {
  borderRadius: 14,
  padding: 14,
};

const panelHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  marginBottom: 12,
};

const panelTitle = {
  margin: 0,
  fontSize: 16,
};

const panelLink = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  textDecoration: "none",
  fontSize: 12,
  fontWeight: 700,
};

const emptyState = {
  minHeight: 110,
  borderRadius: 12,
  display: "grid",
  placeItems: "center",
  textAlign: "center",
  gap: 8,
};

const activityList = {
  display: "grid",
  gap: 8,
};

const activityCard = {
  borderRadius: 12,
  padding: 10,
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
};

const activityDot = {
  width: 8,
  height: 8,
  borderRadius: "50%",
  marginTop: 6,
  flexShrink: 0,
};

const activityTitle = {
  margin: 0,
  fontSize: 13,
  fontWeight: 700,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const activityMeta = {
  margin: "3px 0 0",
  fontSize: 12,
};

const activityTime = {
  margin: 0,
  fontSize: 11,
  flexShrink: 0,
};

const rightRail = {
  display: "grid",
  gap: 12,
  alignContent: "start",
};

const sprintName = {
  margin: 0,
  fontSize: 15,
  fontWeight: 700,
};

const sprintDate = {
  margin: "8px 0 0",
  fontSize: 12,
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
};

const sprintGrid = {
  marginTop: 12,
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: 8,
};

const sprintStat = {
  borderRadius: 10,
  borderWidth: 1,
  borderStyle: "solid",
  padding: "8px 10px",
};

const sprintValue = {
  margin: 0,
  fontSize: 20,
  fontWeight: 800,
};

const sprintLabel = {
  margin: "2px 0 0",
  fontSize: 11,
  fontWeight: 600,
};

const actionStack = {
  display: "grid",
  gap: 8,
};

const railPrimaryAction = {
  ...primaryAction,
  textAlign: "center",
};

const railSecondaryAction = {
  ...secondaryAction,
  textAlign: "center",
};

const loadingTitle = {
  height: 28,
  width: "min(380px, 70vw)",
  borderRadius: 8,
  background: "rgba(120,120,120,0.25)",
};

const loadingSub = {
  marginTop: 8,
  height: 16,
  width: "min(220px, 50vw)",
  borderRadius: 8,
  background: "rgba(120,120,120,0.18)",
};

const icon16 = { width: 16, height: 16 };
const icon14 = { width: 14, height: 14 };

export default Dashboard;

