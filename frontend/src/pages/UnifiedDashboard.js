import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRightIcon,
  BoltIcon,
  BookmarkIcon,
  ChatBubbleLeftRightIcon,
  CpuChipIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  QueueListIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import MissionControlPanel from "../components/MissionControlPanel";
import { WorkspaceEmptyState, WorkspaceHero, WorkspacePanel } from "../components/WorkspaceChrome";
import { useAuth } from "../hooks/useAuth";
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

function formatStatusLabel(value) {
  if (!value) return "Unspecified";
  return String(value).replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const emptyWorkspaceBriefing = {
  generated_at: null,
  scope: "workspace",
  role: "contributor",
  summary: {
    headline: "",
    scan_note: "",
    changed_count: 0,
    attention_count: 0,
    action_count: 0,
  },
  what_changed: [],
  needs_attention: [],
  suggested_next_moves: [],
};

function getBriefingItemIcon(kind) {
  switch (kind) {
    case "conversation":
      return ChatBubbleLeftRightIcon;
    case "decision":
      return SparklesIcon;
    case "task":
      return QueueListIcon;
    case "issue":
      return ExclamationTriangleIcon;
    case "document":
      return BookmarkIcon;
    default:
      return ArrowRightIcon;
  }
}

function getBriefingTone(priority, palette) {
  switch (priority) {
    case "critical":
    case "urgent":
    case "highest":
      return palette.accent;
    case "high":
      return palette.warn;
    case "medium":
      return palette.info;
    default:
      return palette.text;
  }
}

function BriefingItemCard({ item, palette }) {
  const Icon = getBriefingItemIcon(item.kind);
  const tone = getBriefingTone(item.priority, palette);
  const to = item.suggested_action_url || item.source_url;
  const content = (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ display: "flex", gap: 10, minWidth: 0 }}>
          <span style={{ ...laneIcon, border: `1px solid ${palette.border}`, background: palette.panel, color: tone }}>
            <Icon style={icon14} />
          </span>
          <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ ...typeChip, border: `1px solid ${palette.border}`, color: palette.muted }}>{formatStatusLabel(item.kind)}</span>
              <span style={{ ...typeChip, border: `1px solid ${palette.border}`, color: tone }}>{item.priority_label || formatStatusLabel(item.priority)}</span>
            </div>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.45, fontWeight: 700 }}>{item.title}</p>
          </div>
        </div>
        <ArrowRightIcon style={{ ...icon14, flexShrink: 0, color: palette.muted }} />
      </div>

      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: palette.muted }}>{item.summary}</p>
      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: palette.text }}>{item.why_it_matters}</p>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ ...caption, color: palette.muted }}>{formatDateLabel(item.timestamp)}</span>
        <span style={{ fontSize: 12, fontWeight: 800, color: tone }}>{item.suggested_action || "Open record"}</span>
      </div>
    </>
  );

  if (!to) {
    return (
      <article className="ui-card-lift ui-smooth" style={{ ...briefingItemCard, border: `1px solid ${palette.border}`, background: palette.card }}>
        {content}
      </article>
    );
  }

  return (
    <Link
      to={to}
      className="ui-card-lift ui-smooth ui-focus-ring"
      style={{ ...briefingItemCard, border: `1px solid ${palette.border}`, background: palette.card, color: palette.text }}
    >
      {content}
    </Link>
  );
}

function BriefingLane({ title, description, items, emptyMessage, palette, icon: Icon }) {
  return (
    <article className="ui-card-lift ui-smooth" style={{ ...briefingLaneCard, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span style={{ ...laneIcon, border: `1px solid ${palette.border}`, background: palette.panel, color: palette.accent }}>
            <Icon style={icon14} />
          </span>
          <p style={{ ...microLabel, color: palette.muted }}>{title}</p>
        </div>
        <p style={{ ...caption, color: palette.muted }}>{description}</p>
      </div>

      {items.length ? (
        <div style={{ display: "grid", gap: 10 }}>
          {items.map((item) => (
            <BriefingItemCard key={item.id} item={item} palette={palette} />
          ))}
        </div>
      ) : (
        <div style={{ ...briefingEmptyCard, border: `1px dashed ${palette.border}`, color: palette.muted }}>
          {emptyMessage}
        </div>
      )}
    </article>
  );
}

function SummaryCard({ label, value, tone, palette }) {
  return (
    <article
      className="ui-card-lift ui-smooth"
      style={{
        borderRadius: 16,
        padding: 10,
        display: "grid",
        gap: 3,
        border: `1px solid ${palette.border}`,
        background: palette.card,
      }}
    >
      <p style={{ ...microLabel, color: palette.muted }}>{label}</p>
      <p style={{ ...summaryValue, color: tone }}>{value}</p>
    </article>
  );
}

function CommandCard({ title, description, metric, to, palette, icon: Icon }) {
  return (
    <Link
      to={to}
      className="ui-card-lift ui-smooth ui-focus-ring"
        style={{
          ...commandCard,
          color: palette.text,
          border: `1px solid ${palette.border}`,
          background: palette.card,
        }}
      >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ display: "grid", gap: 4 }}>
          <h3 style={{ margin: 0, fontSize: 16, lineHeight: 1.1 }}>{title}</h3>
          <p style={{ ...commandMetric, color: palette.text }}>{metric}</p>
        </div>
        <span
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            display: "grid",
            placeItems: "center",
            border: `1px solid ${palette.border}`,
            background: palette.cardAlt,
            color: palette.accent,
            flexShrink: 0,
          }}
        >
          <Icon style={{ width: 18, height: 18 }} />
        </span>
      </div>
      <p style={{ ...caption, color: palette.muted }}>{description}</p>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 800 }}>
        Open <ArrowRightIcon style={icon14} />
      </span>
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
          background: palette.card,
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
            borderRadius: 10,
            display: "grid",
            placeItems: "center",
            background: palette.cardAlt,
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
  const { user } = useAuth();
  const [timeline, setTimeline] = useState([]);
  const [stats, setStats] = useState({ activity: 0, nodes: 0, links: 0, rate: 0 });
  const [pendingOutcomeReviews, setPendingOutcomeReviews] = useState([]);
  const [pendingOutcomeMeta, setPendingOutcomeMeta] = useState({ total: 0, overdue: 0 });
  const [notifyingOutcomes, setNotifyingOutcomes] = useState(false);
  const [orchestratingOutcomes, setOrchestratingOutcomes] = useState(false);
  const [driftAlerts, setDriftAlerts] = useState([]);
  const [driftMeta, setDriftMeta] = useState({ total: 0, critical: 0, high: 0 });
  const [workspaceBriefing, setWorkspaceBriefing] = useState(emptyWorkspaceBriefing);
  const [personalBriefing, setPersonalBriefing] = useState({
    assigned_tasks: [],
    bookmarked_conversations: [],
    relevant_decisions: [],
    watched_issues: [],
    recent_conversations: [],
    recent_ask_recall_queries: [],
    counts: {
      assigned_tasks: 0,
      assigned_open_tasks: 0,
      bookmarked_conversations: 0,
      relevant_decisions: 0,
      watched_issues: 0,
      recent_conversations: 0,
      recent_ask_recall_queries: 0,
    },
  });
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
      const [timelineRes, statsRes, pendingRes, driftRes, sprintRes, personalRes, workspaceRes] = await Promise.all([
        fetch(buildApiUrl(`/api/knowledge/timeline/?days=7&page=${page}&per_page=10`), { headers }),
        fetch(buildApiUrl("/api/knowledge/ai/success-rates/"), { headers }),
        fetch(buildApiUrl("/api/decisions/outcomes/pending/?overdue_only=false"), { headers }),
        fetch(buildApiUrl("/api/decisions/outcomes/drift-alerts/"), { headers }),
        fetch(buildApiUrl("/api/agile/current-sprint/"), { headers }),
        fetch(buildApiUrl("/api/knowledge/dashboard/personal-briefing/"), { headers }),
        fetch(buildApiUrl("/api/knowledge/dashboard/workspace-briefing/"), { headers }),
      ]);

      const timelineData = unwrapPayload(await readJsonSafe(timelineRes, { results: [], pagination: { has_next: false } }), { results: [], pagination: { has_next: false } });
      const results = timelineData.results || timelineData;
      setTimeline((prev) => (page === 1 ? results : [...prev, ...results]));
      setHasMore(timelineData.pagination?.has_next || false);

      const statsData = unwrapPayload(await readJsonSafe(statsRes, {}), {});
      const pendingData = unwrapPayload(await readJsonSafe(pendingRes, { items: [] }), { items: [] });
      const driftData = unwrapPayload(await readJsonSafe(driftRes, { items: [] }), { items: [] });
      const sprintData = unwrapPayload(await readJsonSafe(sprintRes, null), null);
      const personalData = unwrapPayload(await readJsonSafe(personalRes, {}), {});
      const workspaceData = unwrapPayload(await readJsonSafe(workspaceRes, emptyWorkspaceBriefing), emptyWorkspaceBriefing);

      setPendingOutcomeReviews(pendingData.items || []);
      setPendingOutcomeMeta({ total: pendingData.total || 0, overdue: pendingData.overdue || 0 });
      setDriftAlerts(driftData.items || []);
      setDriftMeta({ total: driftData.total || 0, critical: driftData.critical || 0, high: driftData.high || 0 });
      setWorkspaceBriefing({
        generated_at: workspaceData.generated_at || null,
        scope: workspaceData.scope || "workspace",
        role: workspaceData.role || user?.role || "contributor",
        summary: {
          headline: workspaceData.summary?.headline || "",
          scan_note: workspaceData.summary?.scan_note || "",
          changed_count: workspaceData.summary?.changed_count || 0,
          attention_count: workspaceData.summary?.attention_count || 0,
          action_count: workspaceData.summary?.action_count || 0,
        },
        what_changed: workspaceData.what_changed || [],
        needs_attention: workspaceData.needs_attention || [],
        suggested_next_moves: workspaceData.suggested_next_moves || [],
      });
      setPersonalBriefing({
        assigned_tasks: personalData.assigned_tasks || [],
        bookmarked_conversations: personalData.bookmarked_conversations || [],
        relevant_decisions: personalData.relevant_decisions || [],
        watched_issues: personalData.watched_issues || [],
        recent_conversations: personalData.recent_conversations || [],
        recent_ask_recall_queries: personalData.recent_ask_recall_queries || [],
        counts: {
          assigned_tasks: personalData.counts?.assigned_tasks || 0,
          assigned_open_tasks: personalData.counts?.assigned_open_tasks || 0,
          bookmarked_conversations: personalData.counts?.bookmarked_conversations || 0,
          relevant_decisions: personalData.counts?.relevant_decisions || 0,
          watched_issues: personalData.counts?.watched_issues || 0,
          recent_conversations: personalData.counts?.recent_conversations || 0,
          recent_ask_recall_queries: personalData.counts?.recent_ask_recall_queries || 0,
        },
      });
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
  const workspaceBriefingSummary = workspaceBriefing.summary || emptyWorkspaceBriefing.summary;
  const workspaceChangedItems = workspaceBriefing.what_changed || [];
  const workspaceAttentionItems = workspaceBriefing.needs_attention || [];
  const workspaceActionItems = workspaceBriefing.suggested_next_moves || [];
  const workspaceBriefingQuiet =
    workspaceChangedItems.length === 0 &&
    workspaceAttentionItems.length === 0 &&
    workspaceActionItems.length === 0;
  const assignedTasks = personalBriefing.assigned_tasks || [];
  const bookmarkedConversations = personalBriefing.bookmarked_conversations || [];
  const relevantDecisions = personalBriefing.relevant_decisions || [];
  const watchedIssues = personalBriefing.watched_issues || [];
  const recentConversations = personalBriefing.recent_conversations || [];
  const recentAskRecallQueries = personalBriefing.recent_ask_recall_queries || [];
  const personalCounts = personalBriefing.counts || {};
  const personalLaneQuiet =
    assignedTasks.length === 0 &&
    bookmarkedConversations.length === 0 &&
    relevantDecisions.length === 0 &&
    watchedIssues.length === 0 &&
    recentConversations.length === 0 &&
    recentAskRecallQueries.length === 0;
  const dashboardRole = user?.role || "contributor";
  const workspaceName = user?.organization_slug || "workspace";
  const experienceMode = user?.experience_mode || "standard";
  const canManageOutcomeFlow = ["admin", "manager"].includes(dashboardRole);
  const note = pendingOutcomeMeta.overdue > 0
    ? `${pendingOutcomeMeta.overdue} overdue reviews are still the clearest risk on the board.`
    : driftMeta.critical > 0
      ? `${driftMeta.critical} critical drift alerts need attention before new work piles on.`
      : sprintBlocked > 0
        ? `${sprintBlocked} blocked sprint items are the main execution drag right now.`
        : "Nothing is spiking right now, so the dashboard can stay calm and scan-first.";
  const roleProfile = useMemo(() => {
    const profileMap = {
      admin: {
        badge: "Leadership lens",
        title: "Run the workspace from one grounded operating board.",
        description: "Leadership should see delivery risk, decision follow-through, and team memory in the same first scan so priorities stay aligned.",
        focusTitle: "What leadership should scan first",
        focusItems: [
          pendingOutcomeMeta.overdue > 0
            ? `${pendingOutcomeMeta.overdue} overdue outcome reviews need follow-through.`
            : "Outcome review queue is under control right now.",
          driftMeta.critical > 0
            ? `${driftMeta.critical} critical drift alerts need a decision owner today.`
            : "No critical decision drift is active.",
          currentSprint
            ? `${sprintBlocked} blocked and ${sprintInProgress} in progress in ${currentSprint.name}.`
            : "No active sprint is shaping delivery signals yet.",
        ],
        commandDeck: [
          {
            title: "Decision Hub",
            description: "Review proposals, follow-through, and drift before context starts slipping away.",
            metric: `${pendingOutcomeMeta.total} reviews pending`,
            to: "/decisions",
            icon: SparklesIcon,
          },
          {
            title: "Ask Recall",
            description: "Use grounded organizational memory to answer strategic questions before the day branches out.",
            metric: `${stats.activity} signals this week`,
            to: "/ask",
            icon: ExclamationTriangleIcon,
          },
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
        ],
        personalPanel: {
          eyebrow: "Your lane",
          title: "Personal operating lane",
          description: "Your assigned work, watched execution, and saved conversations in one calmer lane before you zoom back out to the whole workspace.",
          actionLabel: "Open Tasks",
          emptyTitle: "Your personal lane is quiet",
          emptyDescription: "Assigned work, watched issues, and saved conversation context will show up here once you start using the workspace more actively.",
        },
        signalPanel: {
          eyebrow: "Leadership signals",
          title: "Strategic signal digest",
          description: "A reading view of the newest context, optimized for direction changes and decision visibility.",
          actionLabel: "Activity Feed",
          emptyTitle: "Leadership feed is quiet",
          emptyDescription: "New decisions, documents, and sprint movement will surface here once the workspace creates fresh context.",
          emptyActionLabel: "Open Activity Feed",
        },
        outcomePanel: {
          eyebrow: "Follow-through",
          title: "Outcome review queue",
          description: "Keep review promises visible so important decisions do not disappear after they are made.",
          actionLabel: "Open Queue",
          emptyTitle: "Outcome reviews are under control",
          emptyDescription: "Nothing is waiting in the review queue right now.",
        },
        driftPanel: {
          eyebrow: "Stability",
          title: "Decision drift alerts",
          description: "Watch for decisions drifting away from outcomes, confidence, or context.",
          actionLabel: "Decision Hub",
          emptyTitle: "No drift alerts are active",
          emptyDescription: "The decision set looks stable right now.",
        },
        missionPanel: {
          eyebrow: "Mission Control",
          title: "Scenario view for the next operating move.",
          description: "Use the simulation layer to see how backlog, blockers, and operating pressure could shift before you move the team.",
        },
      },
      manager: {
        badge: "Delivery lens",
        title: "Keep execution, drift, and follow-through in one command view.",
        description: "Delivery managers need the day arranged around movement, bottlenecks, and decisions that can still change the outcome.",
        focusTitle: "What delivery should scan first",
        focusItems: [
          currentSprint
            ? `${sprintBlocked} blocked and ${sprintInProgress} in progress in ${currentSprint.name}.`
            : "No active sprint is shaping delivery signals yet.",
          pendingOutcomeMeta.overdue > 0
            ? `${pendingOutcomeMeta.overdue} overdue outcome reviews could leave implementation unclosed.`
            : "Outcome follow-through is not the main risk today.",
          driftMeta.high > 0
            ? `${driftMeta.high} high-severity drift alerts could affect delivery assumptions.`
            : "No high-severity drift is competing with delivery right now.",
        ],
        commandDeck: [
          {
            title: "Sprint Board",
            description: "Open the live execution lane with blockers, in-flight work, and completion progress.",
            metric: currentSprint ? `${sprintProgress}% complete` : "No active sprint",
            to: "/sprint",
            icon: BoltIcon,
          },
          {
            title: "Projects",
            description: "Shift from overview into the delivery map with active projects, briefs, and roadmaps.",
            metric: `${sprintTotal || 0} sprint items in view`,
            to: "/projects",
            icon: QueueListIcon,
          },
          {
            title: "Decision Hub",
            description: "Review decision follow-through and implementation pressure before teams diverge.",
            metric: `${driftMeta.total} drift alerts`,
            to: "/decisions",
            icon: SparklesIcon,
          },
          {
            title: "Ask Recall",
            description: "Use grounded organizational memory to clarify ownership, reasoning, and current context.",
            metric: `${stats.activity} signals this week`,
            to: "/ask",
            icon: ExclamationTriangleIcon,
          },
        ],
        personalPanel: {
          eyebrow: "Your lane",
          title: "Delivery lane for your own work",
          description: "Keep your assigned tasks, watched issues, and saved context in view so the execution picture stays grounded in your actual responsibilities.",
          actionLabel: "Open Tasks",
          emptyTitle: "Your delivery lane is quiet",
          emptyDescription: "As tasks get assigned and execution threads get watched, they will show up here.",
        },
        signalPanel: {
          eyebrow: "Delivery signals",
          title: "Execution signal digest",
          description: "A lighter reading view of the newest context moving through planning, implementation, and review.",
          actionLabel: "Open Activity Feed",
          emptyTitle: "Execution feed is quiet",
          emptyDescription: "Sprint moves, decision changes, and working notes will surface here as teams update the workspace.",
          emptyActionLabel: "Open Activity Feed",
        },
        outcomePanel: {
          eyebrow: "Follow-through",
          title: "Operational review queue",
          description: "Watch which decisions still need review so delivery does not outrun learning.",
          actionLabel: "Review Queue",
          emptyTitle: "No review backlog is competing right now",
          emptyDescription: "The follow-through queue is clear enough for delivery to stay focused.",
        },
        driftPanel: {
          eyebrow: "Execution stability",
          title: "Decision drift alerts",
          description: "Spot assumption drift before it starts pulling execution away from the original plan.",
          actionLabel: "Decision Hub",
          emptyTitle: "No execution drift is active",
          emptyDescription: "Decision assumptions are not the main pressure on delivery right now.",
        },
        missionPanel: {
          eyebrow: "Mission Control",
          title: "Delivery simulation for the next move.",
          description: "Use the simulation layer to test blockers, load, and timing changes before you reshuffle work.",
        },
      },
      contributor: {
        badge: "Operator lens",
        title: "See the work, the context, and the next move in one place.",
        description: "Individual contributors should get a calmer view of what changed, where the work is moving, and which decisions matter around them.",
        focusTitle: "What to scan before you dive in",
        focusItems: [
          currentSprint
            ? `${sprintInProgress} items are moving in ${currentSprint.name}, with ${sprintBlocked} blocked.`
            : "No sprint lane is active, so project and decision context matter most.",
          featuredActivity
            ? `${featuredActivity.title} is the freshest signal in the workspace.`
            : "The signal stream is calm right now.",
          pendingOutcomeMeta.total > 0
            ? `${pendingOutcomeMeta.total} decisions are still waiting on follow-through.`
            : "No follow-through backlog is competing for attention right now.",
        ],
        commandDeck: [
          {
            title: "Sprint Board",
            description: "Open the live execution lane with blockers, in-flight work, and completion progress.",
            metric: currentSprint ? `${sprintProgress}% complete` : "No active sprint",
            to: "/sprint",
            icon: BoltIcon,
          },
          {
            title: "Ask Recall",
            description: "Use grounded organizational memory to answer what happened, why it matters, and what is linked.",
            metric: `${stats.activity} signals this week`,
            to: "/ask",
            icon: ExclamationTriangleIcon,
          },
          {
            title: "Projects",
            description: "Shift from overview into the delivery map with active projects, briefs, and roadmaps.",
            metric: `${sprintTotal || 0} sprint items in view`,
            to: "/projects",
            icon: QueueListIcon,
          },
          {
            title: "Decision Hub",
            description: "Review the decisions that shape implementation and learn what changed recently.",
            metric: `${pendingOutcomeMeta.total} reviews pending`,
            to: "/decisions",
            icon: SparklesIcon,
          },
        ],
        personalPanel: {
          eyebrow: "Your lane",
          title: "What is directly tied to your work",
          description: "Start with your own tasks, watched issues, and saved conversations, then branch into the wider workspace only when you need more context.",
          actionLabel: "My Work",
          emptyTitle: "Nothing personal is waiting right now",
          emptyDescription: "Once work is assigned or conversations are saved for later, this lane will become the quickest path back in.",
        },
        signalPanel: {
          eyebrow: "Recent context",
          title: "What changed across the workspace",
          description: "A lighter reading view of the signals, documents, and decisions that may affect your work today.",
          actionLabel: "Open Activity Feed",
          emptyTitle: "Recent context is quiet",
          emptyDescription: "When the team creates new decisions, documents, or sprint movement, they will surface here.",
          emptyActionLabel: "Open Activity Feed",
        },
        outcomePanel: {
          eyebrow: "Follow-through",
          title: "Decisions waiting on review",
          description: "See which decisions still need outcome follow-through so implementation stays traceable.",
          actionLabel: "Review Decisions",
          emptyTitle: "No follow-through queue is visible right now",
          emptyDescription: "There is no visible review backlog competing with your work at the moment.",
        },
        driftPanel: {
          eyebrow: "Context stability",
          title: "Decision drift alerts",
          description: "See when a decision starts drifting so the surrounding implementation context still makes sense.",
          actionLabel: "Inspect Drift",
          emptyTitle: "No drift alerts are visible",
          emptyDescription: "The current decision context looks stable enough to work from.",
        },
        missionPanel: {
          eyebrow: "Mission Control",
          title: "Scenario view for the work around you.",
          description: "Use the simulation layer to understand how blockers and pressure could affect the work you depend on.",
        },
      },
    };
    return profileMap[dashboardRole] || profileMap.contributor;
  }, [
    currentSprint,
    dashboardRole,
    driftMeta.high,
    driftMeta.total,
    featuredActivity,
    pendingOutcomeMeta.overdue,
    pendingOutcomeMeta.total,
    sprintBlocked,
    sprintInProgress,
    sprintProgress,
    sprintTotal,
    stats.activity,
  ]);

  const heroStats = [
    {
      label: "Signals",
      value: stats.activity || 0,
      helper: featuredActivity
        ? `${humanizeActivityType(featuredActivity)} is the freshest workspace signal`
        : "No new activity is competing for attention yet",
      tone: palette.accent,
    },
    {
      label: "Sprint lane",
      value: currentSprint ? `${sprintProgress}%` : "Idle",
      helper: currentSprint
        ? `${sprintBlocked} blocked and ${sprintInProgress} active in ${currentSprint.name}`
        : "Activate a sprint to surface live delivery signals",
      tone: sprintBlocked > 0 ? palette.warn : palette.good,
    },
    {
      label: "Follow-through",
      value: pendingOutcomeMeta.total,
      helper: pendingOutcomeMeta.overdue > 0
        ? `${pendingOutcomeMeta.overdue} reviews are overdue`
        : "No overdue reviews are stacking up",
      tone: pendingOutcomeMeta.overdue > 0 ? palette.warn : palette.good,
    },
    {
      label: "Drift",
      value: driftMeta.total,
      helper: driftMeta.critical > 0
        ? `${driftMeta.critical} critical alerts need a decision owner`
        : "No critical drift is active right now",
      tone: driftMeta.critical > 0 ? palette.accent : palette.info,
    },
  ];

  const dashboardActions = roleProfile.commandDeck.slice(0, 3).map((card, index) => ({
    label: card.title,
    to: card.to,
    primary: index === 0,
  }));

  const personalSummaryCards = [
    {
      label: "Open tasks",
      value: personalCounts.assigned_open_tasks || 0,
      tone: palette.accent,
    },
    {
      label: "Watchlist",
      value: personalCounts.watched_issues || 0,
      tone: palette.info,
    },
    {
      label: "Decisions",
      value: personalCounts.relevant_decisions || 0,
      tone: palette.warn,
    },
    {
      label: "Saved context",
      value: personalCounts.bookmarked_conversations || 0,
      tone: palette.good,
    },
    {
      label: "Ask Recall",
      value: personalCounts.recent_ask_recall_queries || 0,
      tone: palette.accent,
    },
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
      <WorkspaceHero
        palette={palette}
        darkMode={darkMode}
        variant="execution"
        eyebrow={`${workspaceName} | ${todayLabel}`}
        title={roleProfile.title}
        description={roleProfile.description}
        stats={heroStats}
        actions={dashboardActions.map((action) => (
          <Link
            key={action.label}
            className="ui-btn-polish ui-focus-ring"
            to={action.to}
            style={action.primary ? primaryButton(palette) : secondaryButton(palette)}
          >
            {action.label}
          </Link>
        ))}
        aside={(
          <article
            className="ui-card-lift ui-smooth"
            style={{
              ...spotlightCard,
              border: `1px solid ${palette.border}`,
              background: `linear-gradient(180deg, ${palette.card}, ${palette.cardAlt})`,
            }}
          >
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                <div style={{ display: "grid", gap: 6 }}>
                  <p style={{ ...microLabel, color: palette.muted }}>Operating snapshot</p>
                  <h2 style={{ ...spotlightTitle, color: palette.text }}>
                    {currentSprint?.name || "Workspace status"}
                  </h2>
                </div>
                <span style={{ ...roleChip, border: `1px solid ${palette.border}`, color: palette.accent }}>
                  {roleProfile.badge}
                </span>
              </div>
              <p style={{ ...bodyCopy, color: palette.muted }}>
                {currentSprint
                  ? `${sprintCompleted} of ${sprintTotal} sprint items are done. The snapshot below keeps the active delivery pressure visible without leaving the dashboard.`
                  : "No sprint is active yet, so this card stays focused on workspace pressure instead of delivery cadence."}
              </p>
            </div>

            <div style={snapshotMetricGrid}>
              {currentSprint ? (
                <>
                  <div style={{ ...snapshotMetricCard, border: `1px solid ${palette.border}`, background: palette.panel }}>
                    <p style={{ ...snapshotMetricLabel, color: palette.muted }}>Completion</p>
                    <p style={{ ...snapshotMetricValue, color: palette.accent }}>{sprintProgress}%</p>
                  </div>
                  <div style={{ ...snapshotMetricCard, border: `1px solid ${palette.border}`, background: palette.panel }}>
                    <p style={{ ...snapshotMetricLabel, color: palette.muted }}>Blocked</p>
                    <p style={{ ...snapshotMetricValue, color: sprintBlocked > 0 ? palette.warn : palette.good }}>{sprintBlocked}</p>
                  </div>
                  <div style={{ ...snapshotMetricCard, border: `1px solid ${palette.border}`, background: palette.panel }}>
                    <p style={{ ...snapshotMetricLabel, color: palette.muted }}>In progress</p>
                    <p style={{ ...snapshotMetricValue, color: palette.text }}>{sprintInProgress}</p>
                  </div>
                  <div style={{ ...snapshotMetricCard, border: `1px solid ${palette.border}`, background: palette.panel }}>
                    <p style={{ ...snapshotMetricLabel, color: palette.muted }}>Sprint items</p>
                    <p style={{ ...snapshotMetricValue, color: palette.text }}>{sprintTotal}</p>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ ...snapshotMetricCard, border: `1px solid ${palette.border}`, background: palette.panel }}>
                    <p style={{ ...snapshotMetricLabel, color: palette.muted }}>Signals</p>
                    <p style={{ ...snapshotMetricValue, color: palette.accent }}>{stats.activity}</p>
                  </div>
                  <div style={{ ...snapshotMetricCard, border: `1px solid ${palette.border}`, background: palette.panel }}>
                    <p style={{ ...snapshotMetricLabel, color: palette.muted }}>Reviews</p>
                    <p style={{ ...snapshotMetricValue, color: pendingOutcomeMeta.overdue > 0 ? palette.warn : palette.text }}>{pendingOutcomeMeta.total}</p>
                  </div>
                </>
              )}
            </div>

            <p style={{ ...spotlightNote, color: palette.text }}>{note}</p>

            {currentSprint ? (
              <>
                <div style={spotlightProgressTrack}>
                  <div
                    style={{
                      ...spotlightProgressFill,
                      width: `${sprintProgress}%`,
                      background: palette.ctaGradient,
                    }}
                  />
                </div>
                <Link className="ui-btn-polish ui-focus-ring" to="/sprint" style={secondaryButton(palette)}>
                  Open Sprint Board
                </Link>
              </>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                <div style={chipRow}>
                  <span style={{ ...roleChip, border: `1px solid ${palette.border}`, color: palette.text }}>
                    Mode | {experienceMode}
                  </span>
                  <span style={{ ...roleChip, border: `1px solid ${palette.border}`, color: palette.text }}>
                    {stats.activity} signals this week
                  </span>
                </div>
                <Link className="ui-btn-polish ui-focus-ring" to="/sprint" style={secondaryButton(palette)}>
                  Plan Sprint Work
                </Link>
              </div>
            )}
          </article>
        )}
      />

      <section
        className="ui-enter"
        style={{
          "--ui-delay": "120ms",
          display: "grid",
          gap: 14,
          gridTemplateColumns: isNarrow ? "1fr" : "minmax(0,1.12fr) minmax(320px,0.88fr)",
        }}
      >
        <WorkspacePanel
          palette={palette}
          darkMode={darkMode}
          variant="execution"
          eyebrow="Today"
          title={roleProfile.focusTitle}
          description="Start with the live risk picture, then move into the next decision or lane without opening half the product."
        >
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ ...briefingBand, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ ...roleChip, border: `1px solid ${palette.border}`, color: palette.accent }}>
                    {roleProfile.badge}
                  </span>
                  <span style={{ ...roleChip, border: `1px solid ${palette.border}`, color: palette.text }}>
                    {workspaceName}
                  </span>
                  <span style={{ ...roleChip, border: `1px solid ${palette.border}`, color: palette.text }}>
                    Mode | {experienceMode}
                  </span>
                </div>
                <p style={{ ...caption, color: palette.muted, maxWidth: 380 }}>{note}</p>
              </div>

              <div style={{ display: "grid", gap: 10, gridTemplateColumns: isNarrow ? "1fr" : "repeat(3, minmax(0, 1fr))" }}>
                {roleProfile.focusItems.map((item) => (
                  <div key={item} style={{ ...focusCard, border: `1px solid ${palette.border}`, background: palette.panel }}>
                    <span style={{ ...focusDot, background: palette.accent }} />
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: palette.text }}>{item}</p>
                  </div>
                ))}
              </div>
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
          </div>
        </WorkspacePanel>

        <WorkspacePanel
          palette={palette}
          darkMode={darkMode}
          variant="memory"
          eyebrow="Command deck"
          title="Re-enter the workspace with less scanning"
          description="The fastest doors back into the most useful parts of the product right now."
        >
          <div style={{ display: "grid", gap: 10 }}>
            {roleProfile.commandDeck.map((card) => (
              <CommandCard key={card.title} {...card} palette={palette} />
            ))}
          </div>
        </WorkspacePanel>
      </section>

      <section className="ui-enter" style={{ "--ui-delay": "135ms" }}>
        <WorkspacePanel
          palette={palette}
          darkMode={darkMode}
          variant="memory"
          eyebrow="Workspace briefing"
          title="See what shifted, what needs attention, and where to move next."
          description={
            workspaceBriefingSummary.headline ||
            "Get one grounded scan of fresh signals, active pressure, and the shortest next moves across the workspace."
          }
          action={(
            <button
              className="ui-btn-polish ui-focus-ring"
              onClick={fetchDashboardData}
              style={{ ...secondaryButton(palette), cursor: "pointer" }}
            >
              Refresh briefing
            </button>
          )}
        >
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ ...briefingSummaryBand, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <p style={{ ...microLabel, color: palette.muted }}>Briefing summary</p>
                  <span style={{ ...roleChip, border: `1px solid ${palette.border}`, color: palette.text }}>
                    {formatDateLabel(workspaceBriefing.generated_at)}
                  </span>
                </div>
                <p style={{ ...bodyCopy, color: palette.text }}>
                  {workspaceBriefingSummary.scan_note || "Read the change layer first, then step into the most useful next move."}
                </p>
              </div>

              <div style={{ display: "grid", gap: 10, gridTemplateColumns: isNarrow ? "1fr" : "repeat(3, minmax(0, 1fr))" }}>
                <SummaryCard label="What changed" value={workspaceBriefingSummary.changed_count || 0} tone={palette.info} palette={palette} />
                <SummaryCard label="Needs attention" value={workspaceBriefingSummary.attention_count || 0} tone={palette.warn} palette={palette} />
                <SummaryCard label="Next moves" value={workspaceBriefingSummary.action_count || 0} tone={palette.accent} palette={palette} />
              </div>
            </div>

            {workspaceBriefingQuiet ? (
              <WorkspaceEmptyState
                palette={palette}
                darkMode={darkMode}
                variant="memory"
                title="The workspace is quiet right now."
                description="No fresh briefing items are active yet. New documents, decisions, conversations, or delivery changes will show up here automatically."
              />
            ) : (
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: isNarrow ? "1fr" : "repeat(3, minmax(0, 1fr))" }}>
                <BriefingLane
                  title="What changed"
                  description="The newest records and shifts worth absorbing before you go deeper."
                  items={workspaceChangedItems.slice(0, 3)}
                  emptyMessage="Nothing new has landed in the workspace yet."
                  palette={palette}
                  icon={EyeIcon}
                />
                <BriefingLane
                  title="Needs attention"
                  description="Pressure points where ambiguity, risk, or stalled delivery are starting to matter."
                  items={workspaceAttentionItems.slice(0, 3)}
                  emptyMessage="No immediate pressure points are surfacing right now."
                  palette={palette}
                  icon={ExclamationTriangleIcon}
                />
                <BriefingLane
                  title="Suggested next moves"
                  description="The fastest grounded actions back into the workspace without opening every surface."
                  items={workspaceActionItems.slice(0, 3)}
                  emptyMessage="There is no obvious next move to surface yet."
                  palette={palette}
                  icon={CpuChipIcon}
                />
              </div>
            )}
          </div>
        </WorkspacePanel>
      </section>

      <section className="ui-enter" style={{ "--ui-delay": "145ms" }}>
        <WorkspacePanel
          palette={palette}
          darkMode={darkMode}
          variant="memory"
          eyebrow={roleProfile.personalPanel.eyebrow}
          title={roleProfile.personalPanel.title}
          description={roleProfile.personalPanel.description}
          action={<Link className="ui-btn-polish ui-focus-ring" to="/business/tasks" style={secondaryButton(palette)}>{roleProfile.personalPanel.actionLabel}</Link>}
        >
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))" }}>
            <SummaryCard label="Open tasks" value={personalCounts.assigned_open_tasks || 0} tone={palette.accent} palette={palette} />
            <SummaryCard label="Watchlist" value={personalCounts.watched_issues || 0} tone={palette.info} palette={palette} />
            <SummaryCard label="Saved" value={personalCounts.bookmarked_conversations || 0} tone={palette.good} palette={palette} />
            <SummaryCard label="Decisions" value={personalCounts.relevant_decisions || 0} tone={palette.warn} palette={palette} />
            <SummaryCard label="Recent threads" value={personalCounts.recent_conversations || 0} tone={palette.text} palette={palette} />
            <SummaryCard label="Ask Recall" value={personalCounts.recent_ask_recall_queries || 0} tone={palette.accent} palette={palette} />
          </div>

          {personalLaneQuiet ? (
            <WorkspaceEmptyState
              palette={palette}
              darkMode={darkMode}
              variant="memory"
              title={roleProfile.personalPanel.emptyTitle}
              description={roleProfile.personalPanel.emptyDescription}
              action={<Link className="ui-btn-polish ui-focus-ring" to="/business/tasks" style={primaryButton(palette)}>{roleProfile.personalPanel.actionLabel}</Link>}
            />
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(112px, 1fr))" }}>
                {personalSummaryCards.map((item) => (
                  <SummaryCard
                    key={item.label}
                    label={item.label}
                    value={item.value}
                    tone={item.tone}
                    palette={palette}
                  />
                ))}
              </div>

              <div style={{ display: "grid", gap: 14, gridTemplateColumns: isNarrow ? "1fr" : "minmax(0,1fr) minmax(0,1fr)" }}>
                <article className="ui-card-lift ui-smooth" style={{ ...laneCard, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
                  <div style={{ display: "grid", gap: 6 }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <span style={{ ...laneIcon, border: `1px solid ${palette.border}`, background: palette.panel, color: palette.accent }}>
                        <QueueListIcon style={icon14} />
                      </span>
                      <p style={{ ...microLabel, color: palette.muted }}>Execution lane</p>
                    </div>
                    <p style={{ ...caption, color: palette.muted }}>
                      The assigned tasks and watched issues closest to your actual delivery lane.
                    </p>
                  </div>

                  <div style={laneSectionBlock}>
                    <div style={laneSectionHeader}>
                      <span style={{ ...microLabel, color: palette.muted }}>Assigned work</span>
                      <span style={{ ...typeChip, border: `1px solid ${palette.border}`, color: palette.text }}>
                        {personalCounts.assigned_tasks || 0}
                      </span>
                    </div>
                    {assignedTasks.length ? (
                      <div style={{ display: "grid", gap: 10 }}>
                        {assignedTasks.slice(0, 3).map((task) => (
                          <Link key={task.id} className="ui-card-lift ui-smooth ui-focus-ring" to="/business/tasks" style={{ ...listCard, border: `1px solid ${palette.border}`, background: palette.panel, color: palette.text, alignItems: "flex-start" }}>
                            <div style={{ minWidth: 0, display: "grid", gap: 6 }}>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, lineHeight: 1.45 }}>{task.title}</p>
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                <span style={{ ...typeChip, border: `1px solid ${palette.border}`, color: palette.accent }}>{formatStatusLabel(task.status)}</span>
                                <span style={{ ...typeChip, border: `1px solid ${palette.border}`, color: palette.text }}>{formatStatusLabel(task.priority)}</span>
                              </div>
                              <p style={{ margin: 0, fontSize: 11, lineHeight: 1.55, color: palette.muted }}>
                                {task.decision_title || task.goal_title || task.conversation_title || (task.due_date ? `Due ${formatDateLabel(task.due_date)}` : "Open task in your work queue")}
                              </p>
                            </div>
                            <ArrowRightIcon style={{ ...icon14, flexShrink: 0, color: palette.muted }} />
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p style={{ ...caption, color: palette.muted, margin: 0 }}>
                        No tasks are directly assigned to you right now.
                      </p>
                    )}
                  </div>

                  <div style={{ ...railDivider, borderTop: `1px solid ${palette.border}` }} />

                  <div style={laneSectionBlock}>
                    <div style={laneSectionHeader}>
                      <span style={{ ...microLabel, color: palette.muted }}>Watched issues</span>
                      <span style={{ ...typeChip, border: `1px solid ${palette.border}`, color: palette.text }}>
                        {personalCounts.watched_issues || 0}
                      </span>
                    </div>
                    {watchedIssues.length ? (
                      <div style={{ display: "grid", gap: 10 }}>
                        {watchedIssues.slice(0, 3).map((issue) => (
                          <Link key={issue.id} className="ui-card-lift ui-smooth ui-focus-ring" to={`/issues/${issue.id}`} style={{ ...listCard, border: `1px solid ${palette.border}`, background: palette.panel, color: palette.text, alignItems: "flex-start" }}>
                            <div style={{ minWidth: 0, display: "grid", gap: 6 }}>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, lineHeight: 1.45 }}>{issue.key ? `${issue.key} | ${issue.title}` : issue.title}</p>
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                <span style={{ ...typeChip, border: `1px solid ${palette.border}`, color: palette.info }}>{formatStatusLabel(issue.status)}</span>
                                {issue.project_name ? <span style={{ ...typeChip, border: `1px solid ${palette.border}`, color: palette.text }}>{issue.project_name}</span> : null}
                              </div>
                              <p style={{ margin: 0, fontSize: 11, lineHeight: 1.55, color: palette.muted }}>
                                {issue.sprint_name || `Updated ${formatDateLabel(issue.updated_at)}`}
                              </p>
                            </div>
                            <ArrowRightIcon style={{ ...icon14, flexShrink: 0, color: palette.muted }} />
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p style={{ ...caption, color: palette.muted, margin: 0 }}>
                        No watched issues are in your lane yet.
                      </p>
                    )}
                  </div>
                </article>

                <article className="ui-card-lift ui-smooth" style={{ ...laneCard, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
                  <div style={{ display: "grid", gap: 6 }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <span style={{ ...laneIcon, border: `1px solid ${palette.border}`, background: palette.panel, color: palette.warn }}>
                        <SparklesIcon style={icon14} />
                      </span>
                      <p style={{ ...microLabel, color: palette.muted }}>Context memory</p>
                    </div>
                    <p style={{ ...caption, color: palette.muted }}>
                      Decisions, saved conversations, and recent Recall prompts that help you regain context quickly.
                    </p>
                  </div>

                  <div style={laneSectionBlock}>
                    <div style={laneSectionHeader}>
                      <span style={{ ...microLabel, color: palette.muted }}>Decision memory</span>
                      <span style={{ ...typeChip, border: `1px solid ${palette.border}`, color: palette.text }}>
                        {personalCounts.relevant_decisions || 0}
                      </span>
                    </div>
                    {relevantDecisions.length ? (
                      <div style={{ display: "grid", gap: 10 }}>
                        {relevantDecisions.slice(0, 3).map((decision) => (
                          <Link key={decision.id} className="ui-card-lift ui-smooth ui-focus-ring" to={`/decisions/${decision.id}`} style={{ ...listCard, border: `1px solid ${palette.border}`, background: palette.panel, color: palette.text, alignItems: "flex-start" }}>
                            <div style={{ minWidth: 0, display: "grid", gap: 6 }}>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, lineHeight: 1.45 }}>{decision.title}</p>
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                <span style={{ ...typeChip, border: `1px solid ${palette.border}`, color: palette.warn }}>{formatStatusLabel(decision.status)}</span>
                                {decision.impact_level ? <span style={{ ...typeChip, border: `1px solid ${palette.border}`, color: palette.text }}>{formatStatusLabel(decision.impact_level)}</span> : null}
                              </div>
                              <p style={{ margin: 0, fontSize: 11, lineHeight: 1.55, color: palette.muted }}>
                                {decision.conversation_title || decision.decision_maker_name || `Created ${formatDateLabel(decision.created_at)}`}
                              </p>
                            </div>
                            <ArrowRightIcon style={{ ...icon14, flexShrink: 0, color: palette.muted }} />
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p style={{ ...caption, color: palette.muted, margin: 0 }}>
                        No directly relevant decisions are in your lane yet.
                      </p>
                    )}
                  </div>

                  <div style={{ ...railDivider, borderTop: `1px solid ${palette.border}` }} />

                  <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                    <div style={laneSectionBlock}>
                      <div style={laneSectionHeader}>
                        <span style={{ ...microLabel, color: palette.muted }}>Saved context</span>
                        <span style={{ ...typeChip, border: `1px solid ${palette.border}`, color: palette.text }}>
                          {personalCounts.bookmarked_conversations || 0}
                        </span>
                      </div>
                      {bookmarkedConversations.length ? (
                        <div style={{ display: "grid", gap: 10 }}>
                          {bookmarkedConversations.slice(0, 2).map((bookmark) => (
                            <Link key={bookmark.id} className="ui-card-lift ui-smooth ui-focus-ring" to={`/conversations/${bookmark.conversation_id}`} style={{ ...listCard, border: `1px solid ${palette.border}`, background: palette.panel, color: palette.text, alignItems: "flex-start" }}>
                              <div style={{ minWidth: 0, display: "grid", gap: 4 }}>
                                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, lineHeight: 1.45 }}>{bookmark.conversation_title || "Saved conversation"}</p>
                                <p style={{ margin: 0, fontSize: 11, lineHeight: 1.5, color: palette.muted }}>
                                  {bookmark.note || `Saved ${formatDateLabel(bookmark.created_at)}`}
                                </p>
                              </div>
                              <ArrowRightIcon style={{ ...icon14, flexShrink: 0, color: palette.muted }} />
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <p style={{ ...caption, color: palette.muted, margin: 0 }}>
                          No saved conversations are pinned in your lane yet.
                        </p>
                      )}
                    </div>

                    <div style={laneSectionBlock}>
                      <div style={laneSectionHeader}>
                        <span style={{ ...microLabel, color: palette.muted }}>Recent threads</span>
                        <span style={{ ...typeChip, border: `1px solid ${palette.border}`, color: palette.text }}>
                          {personalCounts.recent_conversations || 0}
                        </span>
                      </div>
                      {recentConversations.length ? (
                        <div style={{ display: "grid", gap: 10 }}>
                          {recentConversations.slice(0, 2).map((conversation) => (
                            <Link key={conversation.id} className="ui-card-lift ui-smooth ui-focus-ring" to={`/conversations/${conversation.id}`} style={{ ...listCard, border: `1px solid ${palette.border}`, background: palette.panel, color: palette.text, alignItems: "flex-start" }}>
                              <div style={{ minWidth: 0, display: "grid", gap: 4 }}>
                                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, lineHeight: 1.45 }}>{conversation.title}</p>
                                <p style={{ margin: 0, fontSize: 11, lineHeight: 1.5, color: palette.muted }}>
                                  {formatDateLabel(conversation.created_at)}
                                </p>
                              </div>
                              <ArrowRightIcon style={{ ...icon14, flexShrink: 0, color: palette.muted }} />
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <p style={{ ...caption, color: palette.muted, margin: 0 }}>
                          No recent conversation threads are linked to you yet.
                        </p>
                      )}
                    </div>
                  </div>

                  <div style={{ ...railDivider, borderTop: `1px solid ${palette.border}` }} />

                  <div style={laneSectionBlock}>
                    <div style={laneSectionHeader}>
                      <span style={{ ...microLabel, color: palette.muted }}>Ask Recall memory</span>
                      <span style={{ ...typeChip, border: `1px solid ${palette.border}`, color: palette.text }}>
                        {personalCounts.recent_ask_recall_queries || 0}
                      </span>
                    </div>
                    {recentAskRecallQueries.length ? (
                      <div style={{ display: "grid", gap: 10 }}>
                        {recentAskRecallQueries.slice(0, 2).map((queryItem) => (
                          <Link
                            key={queryItem.id}
                            className="ui-card-lift ui-smooth ui-focus-ring"
                            to={`/ask?q=${encodeURIComponent(queryItem.query)}&autorun=1`}
                            state={{ askRecallSnapshot: queryItem }}
                            style={{ ...listCard, border: `1px solid ${palette.border}`, background: palette.panel, color: palette.text, alignItems: "flex-start" }}
                          >
                            <div style={{ minWidth: 0, display: "grid", gap: 6 }}>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, lineHeight: 1.45 }}>{queryItem.query}</p>
                              {queryItem.answer_preview ? (
                                <p style={{ margin: 0, fontSize: 11, lineHeight: 1.5, color: palette.muted }}>
                                  {queryItem.answer_preview}
                                </p>
                              ) : null}
                              <p style={{ margin: 0, fontSize: 11, lineHeight: 1.5, color: palette.muted }}>
                                {queryItem.evidence_count} evidence item{queryItem.evidence_count === 1 ? "" : "s"} | {Math.round(queryItem.coverage_score || 0)}% coverage
                              </p>
                            </div>
                            <ArrowRightIcon style={{ ...icon14, flexShrink: 0, color: palette.muted }} />
                          </Link>
                        ))}
                        <Link className="ui-btn-polish ui-focus-ring" to="/ask" style={secondaryButton(palette)}>
                          Open Ask Recall
                        </Link>
                      </div>
                    ) : (
                      <div style={{ display: "grid", gap: 10 }}>
                        <p style={{ ...caption, color: palette.muted, margin: 0 }}>
                          Your recent Ask Recall prompts will appear here after you use the copilot.
                        </p>
                        <Link className="ui-btn-polish ui-focus-ring" to="/ask" style={secondaryButton(palette)}>
                          Open Ask Recall
                        </Link>
                      </div>
                    )}
                  </div>
                </article>
              </div>
            </div>
          )}
        </WorkspacePanel>
      </section>

      <section className="ui-enter" style={{ "--ui-delay": "170ms", display: "grid", gap: 14, gridTemplateColumns: isNarrow ? "1fr" : "minmax(0,1.18fr) minmax(320px,0.82fr)" }}>
        <WorkspacePanel
          palette={palette}
          darkMode={darkMode}
          variant="memory"
          eyebrow={roleProfile.signalPanel.eyebrow}
          title={roleProfile.signalPanel.title}
          description={roleProfile.signalPanel.description}
          action={<Link className="ui-btn-polish ui-focus-ring" to="/activity" style={secondaryButton(palette)}>{roleProfile.signalPanel.actionLabel}</Link>}
        >
          {timeline.length === 0 ? (
            <WorkspaceEmptyState
              palette={palette}
              darkMode={darkMode}
              variant="memory"
              title={roleProfile.signalPanel.emptyTitle}
              description={roleProfile.signalPanel.emptyDescription}
              action={<Link className="ui-btn-polish ui-focus-ring" to="/activity" style={primaryButton(palette)}>{roleProfile.signalPanel.emptyActionLabel}</Link>}
            />
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {featuredActivity ? (
                <Link
                  className="ui-card-lift ui-smooth ui-focus-ring"
                  to={getActivityUrl(featuredActivity)}
                  style={{ ...featureCard, border: `1px solid ${palette.border}`, background: palette.card }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ ...typeChip, border: `1px solid ${palette.border}`, color: palette.accent }}>{humanizeActivityType(featuredActivity)}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: palette.muted }}>{formatDateLabel(featuredActivity.created_at)}</span>
                  </div>
                  <h3 style={{ ...sectionTitle, margin: 0, fontSize: 26, color: palette.text }}>{featuredActivity.title}</h3>
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
            darkMode={darkMode}
            variant="execution"
            eyebrow={roleProfile.outcomePanel.eyebrow}
            title={roleProfile.outcomePanel.title}
            description={roleProfile.outcomePanel.description}
            action={<Link className="ui-btn-polish ui-focus-ring" to="/decisions?outcome=pending" style={secondaryButton(palette)}>{roleProfile.outcomePanel.actionLabel}</Link>}
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
              <WorkspaceEmptyState palette={palette} darkMode={darkMode} variant="execution" title={roleProfile.outcomePanel.emptyTitle} description={roleProfile.outcomePanel.emptyDescription} />
            )}

            {canManageOutcomeFlow ? (
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
            ) : (
              <p style={{ ...caption, color: palette.muted }}>
                Outcome reminder automation is available to workspace admins and managers. Contributors can still inspect the queue and follow the linked decisions.
              </p>
            )}
          </WorkspacePanel>

          <WorkspacePanel
            palette={palette}
            darkMode={darkMode}
            variant="execution"
            eyebrow={roleProfile.driftPanel.eyebrow}
            title={roleProfile.driftPanel.title}
            description={roleProfile.driftPanel.description}
            action={<Link className="ui-btn-polish ui-focus-ring" to="/decisions" style={secondaryButton(palette)}>{roleProfile.driftPanel.actionLabel}</Link>}
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
              <WorkspaceEmptyState palette={palette} darkMode={darkMode} variant="execution" title={roleProfile.driftPanel.emptyTitle} description={roleProfile.driftPanel.emptyDescription} />
            )}
          </WorkspacePanel>
        </aside>
      </section>

      <section className="ui-enter" style={{ "--ui-delay": "220ms" }}>
        <WorkspacePanel
          palette={palette}
          darkMode={darkMode}
          variant="execution"
          eyebrow={roleProfile.missionPanel.eyebrow}
          title={roleProfile.missionPanel.title}
          description={roleProfile.missionPanel.description}
        >
          <MissionControlPanel />
        </WorkspacePanel>
      </section>
    </div>
  );
}

function primaryButton(palette) {
  return {
    textDecoration: "none",
    borderRadius: 10,
    padding: "9px 12px",
    minHeight: 36,
    fontSize: 12,
    fontWeight: 700,
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
    borderRadius: 10,
    padding: "9px 12px",
    minHeight: 36,
    fontSize: 12,
    fontWeight: 700,
    lineHeight: 1.2,
    border: `1px solid ${palette.border}`,
    background: palette.card,
    color: palette.text,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    whiteSpace: "nowrap",
  };
}

const pageStyle = { position: "relative", padding: "clamp(10px, 1.8vw, 18px)", display: "grid", gap: 12 };
const sectionTitle = { margin: 0, fontFamily: 'var(--font-display, "League Spartan"), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', fontSize: 22, lineHeight: 1.08, letterSpacing: "-0.035em" };
const bodyCopy = { margin: 0, fontSize: 13, lineHeight: 1.65 };
const caption = { margin: 0, fontSize: 12, lineHeight: 1.6 };
const microLabel = { margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" };
const summaryValue = { margin: 0, fontFamily: 'var(--font-display, "League Spartan"), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', fontSize: 22, lineHeight: 1.02, letterSpacing: "-0.04em" };
const chipRow = { display: "flex", gap: 10, flexWrap: "wrap" };
const spotlightCard = { borderRadius: 18, padding: 16, display: "grid", gap: 12, alignContent: "start" };
const spotlightTitle = { margin: 0, fontFamily: 'var(--font-display, "League Spartan"), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', fontSize: 24, lineHeight: 1.04, letterSpacing: "-0.04em" };
const spotlightNote = { margin: 0, fontSize: 13, lineHeight: 1.6, fontWeight: 600 };
const snapshotMetricGrid = { display: "grid", gap: 10, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" };
const snapshotMetricCard = { borderRadius: 14, padding: "10px 12px", display: "grid", gap: 4 };
const snapshotMetricLabel = { margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" };
const snapshotMetricValue = { margin: 0, fontFamily: 'var(--font-display, "League Spartan"), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', fontSize: 20, lineHeight: 1.02, letterSpacing: "-0.03em" };
const spotlightProgressTrack = { width: "100%", height: 10, borderRadius: 999, overflow: "hidden", background: "var(--ui-border)" };
const spotlightProgressFill = { height: "100%", borderRadius: 999 };
const briefingBand = { borderRadius: 16, padding: 14, display: "grid", gap: 12 };
const briefingSummaryBand = { borderRadius: 16, padding: 14, display: "grid", gap: 12 };
const briefingLaneCard = { borderRadius: 16, padding: 14, display: "grid", gap: 12, alignContent: "start" };
const briefingItemCard = { borderRadius: 14, padding: 12, display: "grid", gap: 10, textDecoration: "none" };
const briefingEmptyCard = { borderRadius: 14, padding: 12, fontSize: 12, lineHeight: 1.6 };
const featureCard = { borderRadius: 16, padding: 14, display: "grid", gap: 8, textDecoration: "none" };
const commandCard = { borderRadius: 14, padding: 12, display: "grid", gap: 10, textDecoration: "none" };
const priorityCard = { borderRadius: 14, padding: 12, display: "grid", gap: 10, textDecoration: "none" };
const listCard = { borderRadius: 12, padding: "11px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, textDecoration: "none" };
const laneCard = { borderRadius: 14, padding: 12, display: "grid", gap: 10 };
const laneSectionBlock = { display: "grid", gap: 10, alignContent: "start" };
const laneSectionHeader = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" };
const laneIcon = { width: 26, height: 26, borderRadius: 8, display: "grid", placeItems: "center", flexShrink: 0 };
const typeChip = { display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "4px 8px", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", background: "var(--ui-panel)" };
const commandMetric = { margin: 0, fontSize: 12, fontWeight: 700, lineHeight: 1.45 };
const focusCard = { borderRadius: 12, padding: 12, display: "flex", alignItems: "flex-start", gap: 10 };
const focusDot = { width: 8, height: 8, borderRadius: 999, marginTop: 6, flexShrink: 0 };
const roleChip = { display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "5px 9px", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", background: "var(--ui-panel)" };
const railDivider = { width: "100%", margin: "4px 0" };
const loadingWrap = { padding: "clamp(16px, 3vw, 28px)", minHeight: "50vh", display: "grid", placeItems: "center" };
const loadingCard = { width: "min(520px, 100%)", borderRadius: 16, padding: 16, boxShadow: "0 12px 28px rgba(0,0,0,0.12)" };
const loadingTop = { display: "flex", alignItems: "center", gap: 12 };
const loadingOrb = { width: 38, height: 38, borderRadius: 10, display: "grid", placeItems: "center", color: "var(--app-button-text)", flexShrink: 0 };
const loadingTitle = { margin: 0, fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em" };
const icon14 = { width: 14, height: 14 };
