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
import { WorkspaceEmptyState, WorkspacePanel } from "../components/WorkspaceChrome";
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

function FlowRow({ item, palette, tone = "var(--ui-accent)" }) {
  const body = (
    <>
      <div style={{ minWidth: 0, display: "grid", gap: 5 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          {item.key ? <span style={{ ...typeChip, border: `1px solid ${palette.border}`, color: tone }}>{item.key}</span> : null}
          {item.status ? <span style={{ ...typeChip, border: `1px solid ${palette.border}`, color: palette.muted }}>{item.status}</span> : null}
        </div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 750, lineHeight: 1.38, color: palette.text }}>{item.title}</p>
        {item.meta ? <p style={{ margin: 0, fontSize: 11, lineHeight: 1.45, color: palette.muted }}>{item.meta}</p> : null}
      </div>
      <ArrowRightIcon style={{ ...icon14, color: palette.muted, flexShrink: 0 }} />
    </>
  );

  if (item.to) {
    return (
      <Link className="ui-card-lift ui-smooth ui-focus-ring" to={item.to} style={{ ...flowRow, border: `1px solid ${palette.border}`, background: palette.panel, color: palette.text }}>
        {body}
      </Link>
    );
  }

  return (
    <div className="ui-card-lift ui-smooth" style={{ ...flowRow, border: `1px solid ${palette.border}`, background: palette.panel }}>
      {body}
    </div>
  );
}

function FlowLaneCard({ lane, palette }) {
  const Icon = lane.icon;
  return (
    <article style={{ ...flowLaneCard, border: `1px solid ${palette.border}`, background: palette.card }}>
      <header style={flowLaneHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
          <span style={{ ...laneIcon, width: 30, height: 30, border: `1px solid ${palette.border}`, background: lane.bg, color: lane.tone }}>
            <Icon style={{ width: 16, height: 16 }} />
          </span>
          <div style={{ minWidth: 0 }}>
            <p style={{ ...microLabel, color: palette.muted }}>{lane.label}</p>
            <h3 style={{ margin: "3px 0 0", fontSize: 15, lineHeight: 1.16, color: palette.text }}>{lane.title}</h3>
          </div>
        </div>
        <span style={{ ...flowCount, border: `1px solid ${palette.border}`, color: lane.tone, background: palette.panelAlt }}>
          {lane.count}
        </span>
      </header>
      <div style={{ display: "grid", gap: 8 }}>
        {lane.items.length ? (
          lane.items.map((item) => <FlowRow key={`${lane.title}-${item.id || item.title}`} item={item} palette={palette} tone={lane.tone} />)
        ) : (
          <div style={{ ...flowEmpty, border: `1px dashed ${palette.border}`, color: palette.muted }}>
            {lane.empty}
          </div>
        )}
      </div>
    </article>
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
      panelGlass: darkMode
        ? "linear-gradient(180deg, rgba(29, 24, 21, 0.96), rgba(18, 24, 38, 0.9))"
        : "linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(239, 246, 255, 0.78))",
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

  const recentSignalItems = timeline.slice(0, 5).map((activity) => ({
    id: activity.id,
    key: humanizeActivityType(activity),
    title: activity.title || getActivitySummary(activity),
    meta: `${formatDateLabel(activity.created_at)} | ${getActivitySummary(activity)}`,
    to: getActivityUrl(activity),
  }));

  const assignedFlowItems = assignedTasks.slice(0, 4).map((task) => ({
    id: task.id,
    key: task.key || "Task",
    status: formatStatusLabel(task.status),
    title: task.title,
    meta: task.decision_title || task.goal_title || task.conversation_title || (task.due_date ? `Due ${formatDateLabel(task.due_date)}` : "Assigned to your lane"),
    to: "/business/tasks",
  }));

  const activeFlowItems = watchedIssues.slice(0, 4).map((issue) => ({
    id: issue.id,
    key: issue.key || "Issue",
    status: formatStatusLabel(issue.status),
    title: issue.title,
    meta: issue.project_name || issue.sprint_name || `Updated ${formatDateLabel(issue.updated_at)}`,
    to: `/issues/${issue.id}`,
  }));

  const reviewFlowItems = pendingOutcomeReviews.slice(0, 4).map((item) => ({
    id: item.id,
    key: item.is_overdue ? "Overdue" : "Review",
    status: item.is_overdue ? `${item.days_overdue}d late` : "Scheduled",
    title: item.title,
    meta: "Decision outcome review",
    to: `/decisions/${item.id}`,
  }));

  const learnedFlowItems = [
    ...relevantDecisions.slice(0, 2).map((decision) => ({
      id: `decision-${decision.id}`,
      key: "Decision",
      status: formatStatusLabel(decision.status),
      title: decision.title,
      meta: decision.conversation_title || decision.decision_maker_name || `Created ${formatDateLabel(decision.created_at)}`,
      to: `/decisions/${decision.id}`,
    })),
    ...recentAskRecallQueries.slice(0, 2).map((queryItem) => ({
      id: `recall-${queryItem.id}`,
      key: "Recall",
      status: `${Math.round(queryItem.coverage_score || 0)}% coverage`,
      title: queryItem.query,
      meta: `${queryItem.evidence_count} evidence item${queryItem.evidence_count === 1 ? "" : "s"}`,
      to: `/ask?q=${encodeURIComponent(queryItem.query)}&autorun=1`,
    })),
  ].slice(0, 4);

  const flowLanes = [
    {
      label: "Queue",
      title: "To pick up",
      count: assignedFlowItems.length || personalCounts.assigned_open_tasks || 0,
      items: assignedFlowItems,
      empty: "No assigned work is waiting in your lane.",
      icon: QueueListIcon,
      tone: palette.accent,
      bg: palette.accentSoft,
    },
    {
      label: "Flow",
      title: "In motion",
      count: activeFlowItems.length || sprintInProgress || 0,
      items: activeFlowItems,
      empty: "No watched issues are moving right now.",
      icon: BoltIcon,
      tone: palette.info,
      bg: "rgba(22,154,166,0.12)",
    },
    {
      label: "Review",
      title: "Needs decision",
      count: reviewFlowItems.length || pendingOutcomeMeta.total || 0,
      items: reviewFlowItems,
      empty: "No decision reviews are waiting.",
      icon: ExclamationTriangleIcon,
      tone: pendingOutcomeMeta.overdue ? palette.warn : palette.good,
      bg: "rgba(221,176,93,0.12)",
    },
    {
      label: "Memory",
      title: "Learned lately",
      count: learnedFlowItems.length || personalCounts.relevant_decisions || 0,
      items: learnedFlowItems,
      empty: "Recent decisions and Recall answers will collect here.",
      icon: SparklesIcon,
      tone: palette.good,
      bg: "rgba(67,193,142,0.12)",
    },
  ];

  const operatingMetrics = [
    { label: "Workspace signals", value: stats.activity || 0, helper: "7-day activity", tone: palette.accent },
    { label: "Sprint progress", value: currentSprint ? `${sprintProgress}%` : "No sprint", helper: currentSprint?.name || "No active sprint", tone: sprintBlocked ? palette.warn : palette.good },
    { label: "Blocked", value: sprintBlocked, helper: `${sprintInProgress} in progress`, tone: sprintBlocked ? palette.warn : palette.good },
    { label: "Open reviews", value: pendingOutcomeMeta.total, helper: `${pendingOutcomeMeta.overdue} overdue`, tone: pendingOutcomeMeta.overdue ? palette.warn : palette.info },
    { label: "Decision drift", value: driftMeta.total, helper: `${driftMeta.critical} critical`, tone: driftMeta.critical ? palette.warn : palette.info },
  ];

  if (loading) {
    return (
      <div style={loadingWrap}>
        <div style={{ ...loadingCard, color: palette.text, border: `1px solid ${palette.border}`, background: `linear-gradient(180deg, ${palette.panel}, ${palette.cardAlt})` }}>
          <div style={loadingTop}>
            <div style={{ ...loadingOrb, background: palette.ctaGradient }}><span className="spinner" aria-hidden="true" /></div>
            <div>
              <p style={{ ...microLabel, color: palette.muted }}>Dashboard Sync</p>
              <p style={loadingTitle}>Hydrating your AI workspace</p>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: palette.muted }}>Pulling activity, decisions, outcomes, and grounded AI signals</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={dynamicPage}>
      <section className="ui-enter" style={{ ...dynamicHero, gridTemplateColumns: isNarrow ? "1fr" : dynamicHero.gridTemplateColumns, border: `1px solid ${palette.border}`, background: palette.panelGlass }}>
        <div style={dynamicHeroCopy}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ ...roleChip, border: `1px solid ${palette.border}`, color: palette.accent, background: palette.accentSoft }}>
              {roleProfile.badge}
            </span>
            <span style={{ ...roleChip, border: `1px solid ${palette.border}`, color: palette.text }}>
              {workspaceName}
            </span>
            <span style={{ ...roleChip, border: `1px solid ${palette.border}`, color: palette.muted }}>
              {todayLabel}
            </span>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <h2 style={{ ...dynamicHeroTitle, color: palette.text }}>Today&apos;s AI work system</h2>
            <p style={{ ...bodyCopy, maxWidth: 760, color: palette.muted }}>
              {workspaceBriefingSummary.headline || "Knoledgr turns team memory, decisions, and execution into an AI workspace that knows what changed and what should happen next."}
            </p>
          </div>
          <div style={chipRow}>
            <Link className="ui-btn-polish ui-focus-ring" to="/sprint" style={primaryButton(palette)}>
              Open board
            </Link>
            <Link className="ui-btn-polish ui-focus-ring" to="/ask" style={secondaryButton(palette)}>
              Ask Recall
            </Link>
            <button className="ui-btn-polish ui-focus-ring" onClick={fetchDashboardData} style={{ ...secondaryButton(palette), cursor: "pointer" }}>
              Refresh
            </button>
          </div>
        </div>

        <aside style={{ ...dynamicHeroAside, border: `1px solid ${palette.border}`, background: palette.card }}>
          <p style={{ ...microLabel, color: palette.muted }}>Live pressure</p>
          <p style={{ ...spotlightNote, color: palette.text }}>{note}</p>
          <div style={spotlightProgressTrack}>
            <div style={{ ...spotlightProgressFill, width: `${currentSprint ? sprintProgress : Math.min(100, stats.activity * 8)}%`, background: palette.ctaGradient }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
            <SummaryCard label="Done" value={sprintCompleted} tone={palette.good} palette={palette} />
            <SummaryCard label="Moving" value={sprintInProgress} tone={palette.info} palette={palette} />
            <SummaryCard label="Blocked" value={sprintBlocked} tone={sprintBlocked ? palette.warn : palette.good} palette={palette} />
          </div>
        </aside>
      </section>

      <section className="ui-enter" style={{ "--ui-delay": "80ms", ...metricStrip }}>
        {operatingMetrics.map((metric) => (
          <article key={metric.label} className="ui-card-lift ui-smooth" style={{ ...metricCard, border: `1px solid ${palette.border}`, background: palette.card }}>
            <p style={{ ...microLabel, color: palette.muted }}>{metric.label}</p>
            <p style={{ ...summaryValue, color: metric.tone }}>{metric.value}</p>
            <p style={{ ...caption, color: palette.muted }}>{metric.helper}</p>
          </article>
        ))}
      </section>

      <section className="ui-enter" style={{ "--ui-delay": "120ms", display: "grid", gap: 12 }}>
        <div style={sectionHeaderRow}>
          <div>
            <p style={{ ...microLabel, color: palette.muted }}>Workflow board</p>
            <h2 style={{ ...sectionTitle, color: palette.text }}>Move work from queue to memory</h2>
          </div>
          <Link className="ui-btn-polish ui-focus-ring" to="/business/tasks" style={secondaryButton(palette)}>
            View all work
          </Link>
        </div>
        <div style={{ ...flowBoardGrid, gridTemplateColumns: isNarrow ? "1fr" : "repeat(4, minmax(220px, 1fr))" }}>
          {flowLanes.map((lane) => (
            <FlowLaneCard key={lane.title} lane={lane} palette={palette} />
          ))}
        </div>
      </section>

      <section className="ui-enter" style={{ "--ui-delay": "155ms", display: "grid", gap: 12, gridTemplateColumns: isNarrow ? "1fr" : "minmax(0, 1.15fr) minmax(340px, 0.85fr)" }}>
        <WorkspacePanel
          palette={palette}
          darkMode={darkMode}
          variant="memory"
          eyebrow="Workspace stream"
          title="What changed and what to do next"
          description={workspaceBriefingSummary.scan_note || "A compact live stream of workspace changes, pressure points, and recommended next moves."}
        >
          {workspaceBriefingQuiet ? (
            <WorkspaceEmptyState
              palette={palette}
              darkMode={darkMode}
              variant="memory"
              title="The workspace stream is quiet."
              description="New decisions, documents, conversations, and delivery changes will fill this stream automatically."
            />
          ) : (
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: isNarrow ? "1fr" : "repeat(3, minmax(0, 1fr))" }}>
              <BriefingLane title="Changed" description="New context worth absorbing." items={workspaceChangedItems.slice(0, 3)} emptyMessage="No changes yet." palette={palette} icon={EyeIcon} />
              <BriefingLane title="Attention" description="Risk, ambiguity, or stalled flow." items={workspaceAttentionItems.slice(0, 3)} emptyMessage="No pressure points." palette={palette} icon={ExclamationTriangleIcon} />
              <BriefingLane title="Next" description="The shortest grounded moves." items={workspaceActionItems.slice(0, 3)} emptyMessage="No next move surfaced." palette={palette} icon={CpuChipIcon} />
            </div>
          )}
        </WorkspacePanel>

        <aside style={{ display: "grid", gap: 12, alignContent: "start" }}>
          <WorkspacePanel
            palette={palette}
            darkMode={darkMode}
            variant="execution"
            eyebrow="Automation"
            title="Follow-through controls"
            description="Run the next operational move without digging through the decision hub."
            action={<Link className="ui-btn-polish ui-focus-ring" to="/decisions?outcome=pending" style={secondaryButton(palette)}>Open reviews</Link>}
          >
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
              <SummaryCard label="Pending" value={pendingOutcomeMeta.total} tone={palette.info} palette={palette} />
              <SummaryCard label="Overdue" value={pendingOutcomeMeta.overdue} tone={pendingOutcomeMeta.overdue ? palette.warn : palette.good} palette={palette} />
            </div>
            {canManageOutcomeFlow ? (
              <div style={chipRow}>
                <button className="ui-btn-polish ui-focus-ring" onClick={sendOutcomeReminders} disabled={notifyingOutcomes || pendingOutcomeMeta.overdue === 0} style={{ ...secondaryButton(palette), cursor: notifyingOutcomes || pendingOutcomeMeta.overdue === 0 ? "not-allowed" : "pointer", opacity: notifyingOutcomes || pendingOutcomeMeta.overdue === 0 ? 0.6 : 1 }}>
                  {notifyingOutcomes ? "Sending..." : "Send reminders"}
                </button>
                <button className="ui-btn-polish ui-focus-ring" onClick={runFollowUpOrchestrator} disabled={orchestratingOutcomes} style={{ ...primaryButton(palette), border: "none", cursor: orchestratingOutcomes ? "not-allowed" : "pointer", opacity: orchestratingOutcomes ? 0.6 : 1 }}>
                  {orchestratingOutcomes ? "Running..." : "Create follow-ups"}
                </button>
              </div>
            ) : (
              <p style={{ ...caption, color: palette.muted }}>Admins and managers can run reminders and follow-up generation from here.</p>
            )}
          </WorkspacePanel>

          <WorkspacePanel
            palette={palette}
            darkMode={darkMode}
            variant="memory"
            eyebrow="Command"
            title="Fast paths"
            description="Jump into the work surface that matches the live signal."
          >
            <div style={{ display: "grid", gap: 9 }}>
              {roleProfile.commandDeck.map((card) => (
                <CommandCard key={card.title} {...card} palette={palette} />
              ))}
            </div>
          </WorkspacePanel>
        </aside>
      </section>

      <section className="ui-enter" style={{ "--ui-delay": "190ms", display: "grid", gap: 12, gridTemplateColumns: isNarrow ? "1fr" : "minmax(0, 0.9fr) minmax(0, 1.1fr)" }}>
        <WorkspacePanel
          palette={palette}
          darkMode={darkMode}
          variant="memory"
          eyebrow="Personal lane"
          title={roleProfile.personalPanel.title}
          description={roleProfile.personalPanel.description}
          action={<Link className="ui-btn-polish ui-focus-ring" to="/business/tasks" style={secondaryButton(palette)}>{roleProfile.personalPanel.actionLabel}</Link>}
        >
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))" }}>
            {personalSummaryCards.map((item) => (
              <SummaryCard key={item.label} label={item.label} value={item.value} tone={item.tone} palette={palette} />
            ))}
          </div>
          {personalLaneQuiet ? (
            <WorkspaceEmptyState palette={palette} darkMode={darkMode} variant="memory" title={roleProfile.personalPanel.emptyTitle} description={roleProfile.personalPanel.emptyDescription} />
          ) : (
            <div style={{ display: "grid", gap: 9 }}>
              {[...assignedFlowItems, ...activeFlowItems, ...learnedFlowItems].slice(0, 6).map((item) => (
                <FlowRow key={`personal-${item.id || item.title}`} item={item} palette={palette} />
              ))}
            </div>
          )}
        </WorkspacePanel>

        <WorkspacePanel
          palette={palette}
          darkMode={darkMode}
          variant="memory"
          eyebrow={roleProfile.signalPanel.eyebrow}
          title="Live activity stream"
          description="Fresh context stays readable and linked instead of becoming a static report."
          action={<Link className="ui-btn-polish ui-focus-ring" to="/activity" style={secondaryButton(palette)}>{roleProfile.signalPanel.actionLabel}</Link>}
        >
          {recentSignalItems.length ? (
            <div style={{ display: "grid", gap: 9 }}>
              {recentSignalItems.map((item) => (
                <FlowRow key={`signal-${item.id || item.title}`} item={item} palette={palette} tone={palette.info} />
              ))}
              {hasMore ? (
                <button className="ui-btn-polish ui-focus-ring" onClick={() => setPage((current) => current + 1)} style={{ ...primaryButton(palette), border: "none", width: "fit-content", cursor: "pointer" }}>
                  Load more
                </button>
              ) : null}
            </div>
          ) : (
            <WorkspaceEmptyState palette={palette} darkMode={darkMode} variant="memory" title={roleProfile.signalPanel.emptyTitle} description={roleProfile.signalPanel.emptyDescription} />
          )}
        </WorkspacePanel>
      </section>

      <section className="ui-enter" style={{ "--ui-delay": "220ms" }}>
        <WorkspacePanel palette={palette} darkMode={darkMode} variant="execution" eyebrow={roleProfile.missionPanel.eyebrow} title={roleProfile.missionPanel.title} description={roleProfile.missionPanel.description}>
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
const dynamicPage = { position: "relative", padding: "clamp(10px, 1.5vw, 18px)", display: "grid", gap: 12 };
const dynamicHero = { borderRadius: 18, padding: "clamp(16px, 2.4vw, 26px)", display: "grid", gap: 16, gridTemplateColumns: "minmax(0, 1.25fr) minmax(300px, 0.75fr)", alignItems: "stretch", overflow: "hidden" };
const dynamicHeroCopy = { display: "grid", gap: 14, alignContent: "center", minWidth: 0 };
const dynamicHeroTitle = { margin: 0, fontFamily: 'var(--font-display, "League Spartan"), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', fontSize: "clamp(2rem, 4vw, 4.6rem)", lineHeight: 0.92, letterSpacing: "-0.055em" };
const dynamicHeroAside = { borderRadius: 16, padding: 14, display: "grid", gap: 12, alignContent: "start", minWidth: 0 };
const metricStrip = { display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" };
const metricCard = { borderRadius: 14, padding: 12, display: "grid", gap: 5, minHeight: 104 };
const sectionHeaderRow = { display: "flex", justifyContent: "space-between", alignItems: "end", gap: 12, flexWrap: "wrap" };
const flowBoardGrid = { display: "grid", gap: 10, alignItems: "stretch" };
const flowLaneCard = { borderRadius: 14, padding: 10, display: "grid", gap: 10, alignContent: "start", minHeight: 280 };
const flowLaneHeader = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 };
const flowCount = { minWidth: 30, height: 30, borderRadius: 999, display: "grid", placeItems: "center", fontSize: 12, fontWeight: 800, flexShrink: 0 };
const flowRow = { borderRadius: 10, padding: 10, minHeight: 86, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, textDecoration: "none" };
const flowEmpty = { borderRadius: 10, padding: 12, fontSize: 12, lineHeight: 1.55, minHeight: 86, display: "grid", alignItems: "center" };
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
