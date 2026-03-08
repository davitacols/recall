import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  ChatBubbleLeftIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { CardSkeleton } from "../components/Skeleton";
import { useAuth } from "../hooks/useAuth";
import api from "../services/api";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";

function Dashboard() {
  const { user } = useAuth();
  const { darkMode } = useTheme();
  const [isNarrow, setIsNarrow] = useState(window.innerWidth < 1100);

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
    const onResize = () => setIsNarrow(window.innerWidth < 1100);
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

  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const sprintCompleted =
    currentSprint?.completed_count || currentSprint?.completed || 0;
  const sprintInProgress = currentSprint?.in_progress || 0;
  const sprintBlocked = currentSprint?.blocked_count || currentSprint?.blocked || 0;
  const sprintTotal = currentSprint?.issue_count || 0;
  const sprintTodo = Math.max(
    sprintTotal - sprintCompleted - sprintInProgress - sprintBlocked,
    0
  );
  const sprintProgress = sprintTotal > 0 ? Math.round((sprintCompleted / sprintTotal) * 100) : 0;

  if (loading) {
    return (
      <div style={ui.container}>
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
    <div style={ui.container}>
      <section style={{ ...hero, background: palette.card, border: `1px solid ${palette.border}` }}>
        <div style={heroMain}>
          <p style={{ ...eyebrow, color: palette.muted }}>EXECUTION OVERVIEW</p>
          <h1 style={{ ...heroTitle, color: palette.text }}>
            Welcome back, {user?.full_name?.split(" ")[0] || "there"}
          </h1>
          <p style={{ ...heroSubtitle, color: palette.muted }}>
            Focused view of activity, sprint delivery, and next actions.
          </p>
          <div style={heroTags}>
            <span style={{ ...heroTag, border: `1px solid ${palette.border}`, background: "transparent", color: palette.text }}>{stats.totalConversations} conversations</span>
            <span style={{ ...heroTag, border: `1px solid ${palette.border}`, background: "transparent", color: palette.text }}>{stats.totalDecisions} decisions</span>
            <span style={{ ...heroTag, border: `1px solid ${palette.border}`, background: "transparent", color: palette.text }}>{sprintProgress}% sprint done</span>
          </div>
          <div style={heroActions}>
            <Link to="/conversations/new" style={{ ...primaryAction, background: palette.ctaGradient, color: palette.buttonText }}>
              New Conversation
            </Link>
            <Link to="/decisions/new" style={{ ...secondaryAction, border: `1px solid ${palette.border}`, color: palette.text, background: palette.cardAlt }}>
              New Decision
            </Link>
          </div>
        </div>
      </section>

      <section style={metricGrid}>
        <MetricPill
          label="Conversations"
          value={stats.totalConversations}
          icon={ChatBubbleLeftIcon}
          color={palette.accent}
          palette={palette}
        />
        <MetricPill
          label="Decisions"
          value={stats.totalDecisions}
          icon={DocumentTextIcon}
          color={palette.info}
          palette={palette}
        />
        <MetricPill
          label="Issues"
          value={stats.activeIssues}
          icon={ExclamationTriangleIcon}
          color={palette.warn}
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
            background: palette.card,
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
                    background: palette.cardAlt,
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
          <article style={{ ...panel, background: palette.card, border: `1px solid ${palette.border}` }}>
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
                <div style={{ ...progressTrack, background: palette.progressTrack }}>
                  <div style={{ ...progressFill, width: `${sprintProgress}%`, background: palette.ctaGradient }} />
                </div>

                <div style={sprintGrid}>
                  <SprintStat label="Done" value={sprintCompleted} tint={palette.success} />
                  <SprintStat label="In Progress" value={sprintInProgress} tint={palette.info} />
                  <SprintStat label="To Do" value={sprintTodo} tint={palette.muted} />
                  <SprintStat label="Blocked" value={sprintBlocked} tint={palette.warn} />
                </div>

                <div style={{ ...actionStack, marginTop: 12 }}>
                  <Link to="/conversations/new" style={{ ...railPrimaryAction, background: palette.ctaGradient, color: palette.buttonText }}>
                    Start Conversation
                  </Link>
                  <Link to="/decisions/new" style={{ ...railSecondaryAction, border: `1px solid ${palette.border}`, color: palette.text, background: "transparent" }}>
                    Capture Decision
                  </Link>
                  <Link to="/projects" style={{ ...railSecondaryAction, border: `1px solid ${palette.border}`, color: palette.text, background: "transparent" }}>
                    Open Projects
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p style={{ color: palette.muted, margin: 0 }}>No active sprint right now.</p>
                <div style={{ ...actionStack, marginTop: 12 }}>
                  <Link to="/conversations/new" style={{ ...railPrimaryAction, background: palette.ctaGradient, color: palette.buttonText }}>
                    Start Conversation
                  </Link>
                  <Link to="/decisions/new" style={{ ...railSecondaryAction, border: `1px solid ${palette.border}`, color: palette.text, background: "transparent" }}>
                    Capture Decision
                  </Link>
                </div>
              </>
            )}
          </article>
        </div>
      </section>
    </div>
  );
}

function MetricPill({ label, value, icon: Icon, color, palette }) {
  return (
    <div
      style={{
        ...metricPill,
        background: "transparent",
        border: `1px solid ${palette.border}`,
      }}
    >
      <div style={metricPillLeft}>
        <Icon style={{ ...icon16, color }} />
        <p style={{ ...metricLabel, color: palette.muted }}>{label}</p>
      </div>
      <p style={{ ...metricPillValue, color: palette.text }}>{value}</p>
    </div>
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

const hero = {
  borderRadius: 14,
  padding: "clamp(14px, 2vw, 20px)",
  gap: 16,
};

const heroMain = {
  minWidth: 0,
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
  maxWidth: 640,
  lineHeight: 1.5,
  fontSize: 13,
};

const heroActions = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 14,
};

const heroTags = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 12,
};

const heroTag = {
  borderRadius: 999,
  padding: "4px 9px",
  fontSize: 10,
  fontWeight: 700,
};

const sharedAction = {
  borderRadius: 9,
  padding: "8px 12px",
  textDecoration: "none",
  fontSize: 12,
  fontWeight: 700,
};

const primaryAction = {
  ...sharedAction,
};

const secondaryAction = {
  ...sharedAction,
};

const metricGrid = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};

const metricPill = {
  borderRadius: 999,
  padding: "6px 10px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  minWidth: 144,
};

const metricPillLeft = {
  display: "flex",
  alignItems: "center",
  gap: 6,
};

const metricLabel = {
  margin: 0,
  fontSize: 10,
  fontWeight: 700,
};

const metricPillValue = {
  margin: 0,
  fontSize: 14,
  lineHeight: 1,
  fontWeight: 700,
};

const contentGrid = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.8fr) minmax(260px, 1fr)",
  gap: 12,
};

const panel = {
  borderRadius: 12,
  padding: 12,
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
  gap: 10,
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

const progressTrack = {
  marginTop: 10,
  width: "100%",
  height: 8,
  borderRadius: 999,
  overflow: "hidden",
};

const progressFill = {
  height: "100%",
};

const sprintStat = {
  borderRadius: 9,
  borderWidth: 1,
  borderStyle: "solid",
  padding: "7px 9px",
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
  gap: 7,
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
  background: "var(--ui-border)",
};

const loadingSub = {
  marginTop: 8,
  height: 16,
  width: "min(220px, 50vw)",
  borderRadius: 8,
  background: "rgba(148,163,184,0.28)",
};

const icon16 = { width: 16, height: 16 };
const icon14 = { width: 14, height: 14 };

export default Dashboard;

