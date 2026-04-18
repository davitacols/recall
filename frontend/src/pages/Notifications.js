import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowPathIcon,
  BellAlertIcon,
  BookmarkIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  LinkIcon,
  QueueListIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import {
  WorkspaceEmptyState,
  WorkspaceHero,
  WorkspacePanel,
} from "../components/WorkspaceChrome";
import { safeStyle } from "../utils/safeStyle";
import api from "../services/api";
import {
  deleteNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/notifications";

const ATTENTION_TYPES = new Set(["mention", "decision", "task", "goal", "meeting"]);
const EMPTY_WORKSPACE_BRIEFING = {
  generated_at: null,
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

function toRelativeTime(value) {
  if (!value) return "";
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function formatNotificationType(value) {
  const raw = String(value || "system").replace(/[_-]+/g, " ").trim();
  if (!raw) return "System";
  return raw.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDestination(link) {
  if (!link) return "";
  const clean = String(link).replace(/^\/+/, "");
  if (!clean) return "Open destination";
  const formatted = clean
    .split("/")
    .filter(Boolean)
    .map((segment) => (segment.length > 18 ? `${segment.slice(0, 18)}…` : segment))
    .join(" / ");
  return formatted.replace(/\u00e2\u20ac\u00a6/g, "...");
}

function toCalendarLabel(value) {
  if (!value) return "Recently refreshed";
  try {
    return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch (_) {
    return "Recently refreshed";
  }
}

function normalizeWorkspaceBriefing(payload) {
  const data = payload && typeof payload === "object" ? payload : EMPTY_WORKSPACE_BRIEFING;
  return {
    generated_at: data.generated_at || null,
    summary: {
      headline: data.summary?.headline || "",
      scan_note: data.summary?.scan_note || "",
      changed_count: data.summary?.changed_count || 0,
      attention_count: data.summary?.attention_count || 0,
      action_count: data.summary?.action_count || 0,
    },
    what_changed: Array.isArray(data.what_changed) ? data.what_changed : [],
    needs_attention: Array.isArray(data.needs_attention) ? data.needs_attention : [],
    suggested_next_moves: Array.isArray(data.suggested_next_moves) ? data.suggested_next_moves : [],
  };
}

function getBriefingIcon(kind) {
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
      return LinkIcon;
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

function getFilterMeta(filter, counts) {
  const config = {
    all: {
      label: "All activity",
      description: "Use the full inbox when you need the complete thread across action-needed alerts and quieter updates.",
    },
    unread: {
      label: "Unread only",
      description: "Focus on what has not been acknowledged yet, then clear it in batches.",
    },
    read: {
      label: "Read archive",
      description: "Review previously seen alerts without re-mixing them into the active queue.",
    },
    attention: {
      label: "Attention queue",
      description: "High-signal alerts that are more likely to need an answer, decision, or next step.",
    },
    fyi: {
      label: "FYI stream",
      description: "Lower-pressure updates that still matter for awareness and timeline context.",
    },
  };

  const current = config[filter] || config.all;

  return {
    ...current,
    summary:
      filter === "all"
        ? `${counts.unread} unread, ${counts.attention} attention alerts, ${counts.linked} with linked destinations.`
        : filter === "unread"
          ? `${counts.unread} unread items are still waiting to be seen.`
          : filter === "read"
            ? `${counts.read} items are already acknowledged.`
            : filter === "attention"
              ? `${counts.attention} high-signal alerts are in scope for this view.`
              : `${counts.fyi} lower-pressure updates are in scope for this view.`,
  };
}

function Notifications() {
  const { darkMode } = useTheme();
  const [items, setItems] = useState([]);
  const [workspaceBriefing, setWorkspaceBriefing] = useState(EMPTY_WORKSPACE_BRIEFING);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const palette = useMemo(
    () =>
      darkMode
        ? {
            bg: "#14110f",
            card: "rgba(29, 24, 21, 0.92)",
            cardAlt: "#221d19",
            cardSoft: "rgba(37, 31, 27, 0.84)",
            border: "var(--app-border)",
            borderStrong: "rgba(154, 185, 255, 0.24)",
            text: "var(--app-text)",
            muted: "var(--app-muted)",
            accent: "var(--app-accent)",
            accentText: "var(--app-button-text)",
            link: "var(--app-link)",
            info: "var(--app-info)",
            success: "var(--app-success)",
            warn: "var(--app-warning)",
            danger: "var(--app-danger)",
            unreadBg: "rgba(154, 185, 255, 0.12)",
            priorityBg: "rgba(210, 168, 106, 0.12)",
            track: "rgba(238, 229, 216, 0.14)",
          }
        : {
            bg: "var(--app-bg)",
            card: "var(--app-surface)",
            cardAlt: "var(--app-surface-alt)",
            cardSoft: "rgba(255, 252, 248, 0.78)",
            border: "var(--app-border)",
            borderStrong: "rgba(46, 99, 208, 0.2)",
            text: "var(--app-text)",
            muted: "var(--app-muted)",
            accent: "var(--app-accent)",
            accentText: "var(--app-button-text)",
            link: "var(--app-link)",
            info: "var(--app-info)",
            success: "var(--app-success)",
            warn: "var(--app-warning)",
            danger: "var(--app-danger)",
            unreadBg: "rgba(46, 99, 208, 0.09)",
            priorityBg: "rgba(168, 116, 57, 0.1)",
            track: "rgba(58, 47, 38, 0.12)",
          },
    [darkMode]
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [notificationsResult, briefingResult] = await Promise.allSettled([
        listNotifications(),
        api.get("/api/knowledge/dashboard/workspace-briefing/"),
      ]);

      if (notificationsResult.status === "fulfilled") {
        setItems(Array.isArray(notificationsResult.value.notifications) ? notificationsResult.value.notifications : []);
      } else {
        console.error("Failed to fetch notifications:", notificationsResult.reason);
        setItems([]);
      }

      if (briefingResult.status === "fulfilled") {
        setWorkspaceBriefing(normalizeWorkspaceBriefing(briefingResult.value.data));
      } else {
        console.error("Failed to fetch workspace briefing:", briefingResult.reason);
        setWorkspaceBriefing(EMPTY_WORKSPACE_BRIEFING);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      setItems([]);
      setWorkspaceBriefing(EMPTY_WORKSPACE_BRIEFING);
    } finally {
      setLoading(false);
    }
  };

  const onMarkRead = async (item) => {
    if (!item || item.is_read) return;
    try {
      await markNotificationRead(item.id);
      setItems((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, is_read: true } : entry)));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const onMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((entry) => ({ ...entry, is_read: true })));
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  const onDelete = async (item) => {
    try {
      await deleteNotification(item.id);
      setItems((prev) => prev.filter((entry) => entry.id !== item.id));
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  const unreadCount = items.filter((item) => !item.is_read).length;
  const readCount = items.length - unreadCount;
  const attentionCount = items.filter((item) => ATTENTION_TYPES.has(item.type)).length;
  const attentionUnread = items.filter((item) => ATTENTION_TYPES.has(item.type) && !item.is_read).length;
  const fyiCount = items.length - attentionCount;
  const linkedCount = items.filter((item) => Boolean(item.link)).length;
  const readCoverage = items.length ? Math.round((readCount / items.length) * 100) : 0;
  const attentionCoverage = attentionCount ? Math.round(((attentionCount - attentionUnread) / attentionCount) * 100) : 100;

  const filtered = items.filter((item) => {
    if (filter === "all") return true;
    if (filter === "unread") return !item.is_read;
    if (filter === "read") return item.is_read;
    if (filter === "attention") return ATTENTION_TYPES.has(item.type);
    if (filter === "fyi") return !ATTENTION_TYPES.has(item.type);
    return true;
  });

  const visibleAttention = filtered.filter((item) => ATTENTION_TYPES.has(item.type));
  const visibleFYI = filtered.filter((item) => !ATTENTION_TYPES.has(item.type));
  const filterMeta = getFilterMeta(filter, {
    unread: unreadCount,
    read: readCount,
    attention: attentionCount,
    fyi: fyiCount,
    linked: linkedCount,
  });

  const filterPills = [
    { key: "all", label: `All (${items.length})` },
    { key: "unread", label: `Unread (${unreadCount})` },
    { key: "read", label: `Read (${readCount})` },
    { key: "attention", label: `Attention (${attentionCount})` },
    { key: "fyi", label: `FYI (${fyiCount})` },
  ];
  const briefingSummary = workspaceBriefing.summary || EMPTY_WORKSPACE_BRIEFING.summary;
  const briefingQuiet =
    (workspaceBriefing.what_changed || []).length === 0 &&
    (workspaceBriefing.needs_attention || []).length === 0 &&
    (workspaceBriefing.suggested_next_moves || []).length === 0;

  const inboxAside = (
    <article
      className="ui-card-lift ui-smooth"
      style={{
        ...asideCard,
        border: `1px solid ${palette.border}`,
        background: palette.cardAlt,
      }}
    >
      <div style={{ display: "grid", gap: 8 }}>
        <p style={{ ...microLabel, color: palette.muted }}>Inbox posture</p>
        <h2 style={{ ...asideTitle, color: palette.text }}>
          {attentionUnread > 0
            ? `${attentionUnread} unread alerts still need an answer or quick review.`
            : unreadCount > 0
              ? "Unread updates are mostly low-pressure right now."
              : "The inbox is caught up and ready for the next signal."}
        </h2>
        <p style={{ ...asideCopy, color: palette.muted }}>
          Open the highest-signal items first, mark the rest cleanly, and use linked destinations to jump back into the work without losing context.
        </p>
      </div>
      <div style={safeStyle(asideMetricGrid)}>
        <MetricTile palette={palette} label="Unread" value={unreadCount} tone={palette.accent} />
        <MetricTile palette={palette} label="Response now" value={attentionUnread} tone={palette.warn} />
      </div>
      <div style={safeStyle(coverageStack)}>
        <CoverageMeter palette={palette} label="Read coverage" value={readCoverage} tone={palette.accent} />
        <CoverageMeter palette={palette} label="Attention cleared" value={attentionCoverage} tone={palette.success} />
      </div>
    </article>
  );

  return (
    <div style={safeStyle(page)}>
      <WorkspaceHero
        palette={palette}
        darkMode={darkMode}
        variant="memory"
        eyebrow="Notification center"
        title="Notifications"
        description="Separate what needs a response from what just needs awareness, then clear the inbox without losing the important threads."
        aside={inboxAside}
        stats={[
          { label: "All activity", value: items.length, helper: "Everything in the inbox." },
          { label: "Unread", value: unreadCount, helper: "Still waiting to be seen." },
          { label: "Attention", value: attentionCount, helper: "High-signal alerts in the mix." },
          { label: "Linked routes", value: linkedCount, helper: "Items that jump back into work." },
        ]}
        actions={
          <>
            <button className="ui-btn-polish ui-focus-ring" onClick={fetchData} style={secondaryButton(palette)}>
              <ArrowPathIcon style={icon14} /> Refresh
            </button>
            {unreadCount > 0 ? (
              <button className="ui-btn-polish ui-focus-ring" onClick={onMarkAllRead} style={primaryButton(palette)}>
                <CheckCircleIcon style={icon14} /> Mark all read
              </button>
            ) : null}
          </>
        }
      />

      <WorkspacePanel
        palette={palette}
        darkMode={darkMode}
        variant="memory"
        eyebrow="Workspace digest"
        title="Carry the workspace briefing into the inbox."
        description={
          briefingSummary.headline ||
          "See the shared briefing signal before you start triaging individual alerts."
        }
      >
        <div style={{ display: "grid", gap: 12 }}>
          <div
            style={{
              ...focusBand,
              border: `1px solid ${palette.border}`,
              background: palette.cardAlt,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ display: "grid", gap: 4 }}>
                <p style={{ ...microLabel, color: palette.muted }}>Briefing posture</p>
                <p style={{ ...focusCopy, color: palette.muted }}>
                  {briefingSummary.scan_note || "Use the digest to decide what deserves direct notification handling and what should stay as workspace context."}
                </p>
              </div>
              <span
                style={{
                  ...destinationPill,
                  border: `1px solid ${palette.border}`,
                  background: palette.cardSoft,
                  color: palette.text,
                }}
              >
                Refreshed {toCalendarLabel(workspaceBriefing.generated_at)}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
              <MetricTile palette={palette} label="What changed" value={briefingSummary.changed_count || 0} tone={palette.info} />
              <MetricTile palette={palette} label="Needs attention" value={briefingSummary.attention_count || 0} tone={palette.warn} />
              <MetricTile palette={palette} label="Next moves" value={briefingSummary.action_count || 0} tone={palette.accent} />
            </div>
          </div>

          {briefingQuiet ? (
            <div
              style={{
                ...sectionEmpty,
                border: `1px dashed ${palette.border}`,
                background: palette.cardAlt,
              }}
            >
              <p style={{ ...sectionEmptyTitle, color: palette.text }}>No fresh workspace digest yet</p>
              <p style={{ ...sectionEmptyCopy, color: palette.muted }}>
                The inbox is running without a briefing layer right now. As new linked work lands, this digest will surface shared context above the raw notification stream.
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
              <BriefingColumn
                palette={palette}
                title="What changed"
                description="Fresh records worth knowing before you react to the inbox."
                items={(workspaceBriefing.what_changed || []).slice(0, 2)}
              />
              <BriefingColumn
                palette={palette}
                title="Needs attention"
                description="Pressure points that should shape how you triage alerts."
                items={(workspaceBriefing.needs_attention || []).slice(0, 2)}
              />
              <BriefingColumn
                palette={palette}
                title="Suggested next moves"
                description="The clearest routes back into work from this inbox session."
                items={(workspaceBriefing.suggested_next_moves || []).slice(0, 2)}
              />
            </div>
          )}
        </div>
      </WorkspacePanel>

      <section style={safeStyle(controlGrid)}>
        <WorkspacePanel
          palette={palette}
          darkMode={darkMode}
          variant="memory"
          eyebrow="Inbox controls"
          title="Filter the queue by response pressure"
          description={filterMeta.description}
        >
          <div style={safeStyle(filterRail)}>
            {filterPills.map((pill) => {
              const active = filter === pill.key;
              return (
                <button
                  key={pill.key}
                  onClick={() => setFilter(pill.key)}
                  className="ui-btn-polish ui-focus-ring"
                  style={{
                    ...filterPill,
                    border: `1px solid ${active ? palette.borderStrong : palette.border}`,
                    background: active ? palette.unreadBg : palette.cardAlt,
                    color: palette.text,
                  }}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>

          <div
            style={{
              ...focusBand,
              border: `1px solid ${palette.border}`,
              background: palette.cardAlt,
            }}
          >
            <div style={{ display: "grid", gap: 4 }}>
              <p style={{ ...microLabel, color: palette.muted }}>Current focus</p>
              <h3 style={{ ...focusTitle, color: palette.text }}>{filterMeta.label}</h3>
              <p style={{ ...focusCopy, color: palette.muted }}>{filterMeta.summary}</p>
            </div>
          </div>
        </WorkspacePanel>

        <WorkspacePanel
          palette={palette}
          darkMode={darkMode}
          variant="memory"
          eyebrow="Workflow guide"
          title="Keep the inbox useful instead of noisy"
          description="High-signal alerts should become an open route, an acknowledged update, or a deletion instead of sitting unread."
        >
          <div style={safeStyle(guideStack)}>
            <GuideRow
              palette={palette}
              icon={BellAlertIcon}
              label="Handle attention alerts first"
              text="Mentions, task nudges, decisions, goals, and meetings usually deserve the first scan."
            />
            <GuideRow
              palette={palette}
              icon={LinkIcon}
              label="Use linked destinations"
              text="Open the routed context directly from the inbox so you do not lose the thread while triaging."
            />
            <GuideRow
              palette={palette}
              icon={CheckCircleIcon}
              label="Batch clear low-signal updates"
              text="Once the urgent items are covered, mark the rest cleanly so unread counts stay meaningful."
            />
          </div>
        </WorkspacePanel>
      </section>

      {loading ? (
        <WorkspaceEmptyState
          palette={palette}
          darkMode={darkMode}
          variant="memory"
          title="Loading notifications"
          description="Pulling the latest inbox activity and unread state."
        />
      ) : filtered.length === 0 ? (
        <WorkspaceEmptyState
          palette={palette}
          darkMode={darkMode}
          variant="memory"
          title="Nothing matches this filter"
          description="Switch the view or return to the full inbox to see everything again."
          action={
            <button className="ui-btn-polish ui-focus-ring" onClick={() => setFilter("all")} style={primaryButton(palette)}>
              Show all notifications
            </button>
          }
        />
      ) : (
        <section style={safeStyle(feedGrid)}>
          {filter !== "fyi" ? (
            <NotificationSection
              palette={palette}
              darkMode={darkMode}
              variant="memory"
              eyebrow={filter === "attention" ? "Attention queue" : "Needs response"}
              title={filter === "attention" ? "Action-needed alerts" : "What deserves a first look"}
              description="These are the alerts most likely to need an answer, open route, or next step."
              items={visibleAttention}
              emptyTitle="No attention alerts in this view"
              emptyDescription="The current filter is not surfacing any high-signal notifications right now."
              onMarkRead={onMarkRead}
              onDelete={onDelete}
            />
          ) : null}

          {filter !== "attention" ? (
            <NotificationSection
              palette={palette}
              darkMode={darkMode}
              variant="memory"
              eyebrow={filter === "fyi" ? "FYI stream" : "Keep in view"}
              title={filter === "fyi" ? "Awareness updates" : "Lower-pressure updates"}
              description="Useful context that is worth seeing, but usually does not need the first response."
              items={visibleFYI}
              emptyTitle="No FYI updates in this view"
              emptyDescription="The current filter is only surfacing action-needed notifications."
              onMarkRead={onMarkRead}
              onDelete={onDelete}
            />
          ) : null}
        </section>
      )}
    </div>
  );
}

function NotificationSection({
  palette,
  darkMode,
  variant,
  eyebrow,
  title,
  description,
  items,
  emptyTitle,
  emptyDescription,
  onMarkRead,
  onDelete,
}) {
  return (
    <WorkspacePanel
      palette={palette}
      darkMode={darkMode}
      variant={variant}
      eyebrow={eyebrow}
      title={title}
      description={description}
      action={
        <span
          style={{
            ...countBadge,
            border: `1px solid ${palette.border}`,
            background: palette.cardAlt,
            color: palette.text,
          }}
        >
          {items.length} {items.length === 1 ? "item" : "items"}
        </span>
      }
    >
      {items.length ? (
        <div style={safeStyle(rowStack)}>
          {items.map((item) => (
            <NotificationRow
              key={item.id}
              item={item}
              palette={palette}
              darkMode={darkMode}
              onMarkRead={onMarkRead}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : (
        <div
          style={{
            ...sectionEmpty,
            border: `1px dashed ${palette.border}`,
            background: palette.cardAlt,
          }}
        >
          <p style={{ ...sectionEmptyTitle, color: palette.text }}>{emptyTitle}</p>
          <p style={{ ...sectionEmptyCopy, color: palette.muted }}>{emptyDescription}</p>
        </div>
      )}
    </WorkspacePanel>
  );
}

function BriefingColumn({ palette, title, description, items }) {
  return (
    <article
      className="ui-card-lift ui-smooth"
      style={{
        borderRadius: 18,
        padding: 14,
        display: "grid",
        gap: 10,
        alignContent: "start",
        border: `1px solid ${palette.border}`,
        background: palette.cardAlt,
      }}
    >
      <div style={{ display: "grid", gap: 4 }}>
        <p style={{ ...microLabel, color: palette.muted }}>{title}</p>
        <p style={{ ...guideCopy, color: palette.muted }}>{description}</p>
      </div>

      {items.length ? (
        <div style={{ display: "grid", gap: 10 }}>
          {items.map((item) => (
            <BriefingCard key={item.id} item={item} palette={palette} />
          ))}
        </div>
      ) : (
        <div
          style={{
            ...sectionEmpty,
            border: `1px dashed ${palette.border}`,
            background: palette.cardSoft,
            padding: "14px 12px",
          }}
        >
          <p style={{ ...sectionEmptyCopy, color: palette.muted }}>No items are active in this lane right now.</p>
        </div>
      )}
    </article>
  );
}

function BriefingCard({ item, palette }) {
  const Icon = getBriefingIcon(item.kind);
  const tone = getBriefingTone(item.priority, palette);
  const destination = item.suggested_action_url || item.source_url;

  return (
    <Link
      to={destination || "/notifications"}
      className="ui-card-lift ui-smooth ui-focus-ring"
      style={{
        borderRadius: 14,
        padding: 12,
        display: "grid",
        gap: 10,
        textDecoration: "none",
        border: `1px solid ${palette.border}`,
        background: palette.cardSoft,
        color: palette.text,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ display: "flex", gap: 10, minWidth: 0 }}>
          <span
            style={{
              ...guideIcon,
              width: 30,
              height: 30,
              borderRadius: 10,
              background: palette.unreadBg,
              color: tone,
            }}
          >
            <Icon style={icon14} />
          </span>
          <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
            <div style={safeStyle(rowMeta)}>
              <span
                style={{
                  ...typeBadge,
                  border: `1px solid ${palette.border}`,
                  background: palette.card,
                  color: tone,
                }}
              >
                {formatNotificationType(item.kind)}
              </span>
              <span
                style={{
                  ...statusPill,
                  border: `1px solid ${palette.border}`,
                  background: palette.card,
                  color: palette.text,
                }}
              >
                {item.priority_label || formatNotificationType(item.priority)}
              </span>
            </div>
            <p style={{ ...guideLabel, color: palette.text }}>{item.title}</p>
          </div>
        </div>
        <span style={{ ...timestamp, color: palette.muted }}>{toRelativeTime(item.timestamp)}</span>
      </div>

      <p style={{ ...rowMessage, color: palette.muted }}>{item.summary}</p>
      <p style={{ ...guideCopy, color: palette.text }}>{item.why_it_matters}</p>
      <span style={{ fontSize: 12, fontWeight: 800, color: tone }}>
        {item.suggested_action || "Open record"}
      </span>
    </Link>
  );
}

function NotificationRow({ item, palette, darkMode, onMarkRead, onDelete }) {
  const isAttention = ATTENTION_TYPES.has(item.type);
  const background = item.is_read ? palette.cardAlt : isAttention ? palette.priorityBg : palette.unreadBg;
  const borderColor = item.is_read ? palette.border : isAttention ? palette.warn : palette.borderStrong;
  const tone = item.is_read ? palette.muted : isAttention ? palette.warn : palette.accent;

  return (
    <article
      className="ui-card-lift ui-smooth"
      style={{
        ...rowCard,
        border: `1px solid ${borderColor}`,
        background,
      }}
    >
      <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
        <div style={safeStyle(rowMeta)}>
          <span
            style={{
              ...typeBadge,
              border: `1px solid ${item.is_read ? palette.border : borderColor}`,
              background: palette.cardSoft,
              color: tone,
            }}
          >
            {formatNotificationType(item.type)}
          </span>
          {!item.is_read ? (
            <span
              style={{
                ...statusPill,
                border: `1px solid ${borderColor}`,
                background: palette.cardSoft,
                color: tone,
              }}
            >
              Unread
            </span>
          ) : null}
          <span style={{ ...timestamp, color: palette.muted }}>{toRelativeTime(item.created_at)}</span>
          {item.link ? (
            <span
              style={{
                ...destinationPill,
                border: `1px solid ${palette.border}`,
                background: palette.cardSoft,
                color: palette.text,
              }}
            >
              <LinkIcon style={icon12} />
              {formatDestination(item.link)}
            </span>
          ) : null}
        </div>

        <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
          <h3 style={{ ...rowTitle, color: palette.text }}>{item.title || "Notification"}</h3>
          <p style={{ ...rowMessage, color: palette.muted }}>{item.message}</p>
        </div>
      </div>

      <div style={safeStyle(rowActions)}>
        {item.link ? (
          <Link
            to={item.link}
            onClick={() => onMarkRead(item)}
            className="ui-btn-polish ui-focus-ring"
            style={primaryButton(palette)}
          >
            Open
          </Link>
        ) : null}
        {!item.is_read ? (
          <button className="ui-btn-polish ui-focus-ring" onClick={() => onMarkRead(item)} style={secondaryButton(palette)}>
            Mark read
          </button>
        ) : null}
        <button
          className="ui-btn-polish ui-focus-ring"
          onClick={() => onDelete(item)}
          style={{
            ...dangerButton,
            border: `1px solid ${darkMode ? "rgba(238, 146, 153, 0.3)" : "rgba(200, 86, 93, 0.26)"}`,
            color: palette.danger,
            background: "transparent",
          }}
        >
          Delete
        </button>
      </div>
    </article>
  );
}

function MetricTile({ palette, label, value, tone }) {
  return (
    <div
      style={{
        ...metricTile,
        border: `1px solid ${palette.border}`,
        background: palette.cardSoft,
      }}
    >
      <p style={{ ...metricLabel, color: palette.muted }}>{label}</p>
      <p style={{ ...metricValue, color: tone }}>{value}</p>
    </div>
  );
}

function CoverageMeter({ palette, label, value, tone }) {
  return (
    <div style={safeStyle(coverageMeter)}>
      <div style={safeStyle(coverageHead)}>
        <p style={{ ...coverageLabel, color: palette.muted }}>{label}</p>
        <p style={{ ...coverageValue, color: tone }}>{value}%</p>
      </div>
      <div style={{ ...coverageTrack, background: palette.track }}>
        <div
          style={{
            ...coverageFill,
            width: `${Math.max(0, Math.min(100, value))}%`,
            background: tone,
          }}
        />
      </div>
    </div>
  );
}

function GuideRow({ palette, icon: Icon, label, text }) {
  return (
    <article
      style={{
        ...guideRow,
        border: `1px solid ${palette.border}`,
        background: palette.cardAlt,
      }}
    >
      <span
        style={{
          ...guideIcon,
          background: palette.unreadBg,
          color: palette.accent,
        }}
      >
        <Icon style={icon14} />
      </span>
      <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
        <p style={{ ...guideLabel, color: palette.text }}>{label}</p>
        <p style={{ ...guideCopy, color: palette.muted }}>{text}</p>
      </div>
    </article>
  );
}

function primaryButton(palette) {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    border: "none",
    borderRadius: 999,
    padding: "9px 13px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    textDecoration: "none",
    background: palette.accent,
    color: palette.accentText,
    boxShadow: "var(--ui-shadow-sm)",
  };
}

function secondaryButton(palette) {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    padding: "9px 13px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    textDecoration: "none",
    background: palette.cardAlt,
    color: palette.text,
    border: `1px solid ${palette.border}`,
  };
}

const dangerButton = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  borderRadius: 999,
  padding: "9px 13px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  textDecoration: "none",
};

const page = {
  display: "grid",
  gap: 14,
};

const asideCard = {
  borderRadius: 18,
  padding: 16,
  display: "grid",
  gap: 12,
};

const microLabel = {
  margin: 0,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const asideTitle = {
  margin: 0,
  fontSize: 22,
  lineHeight: 1.08,
  letterSpacing: "-0.03em",
};

const asideCopy = {
  margin: 0,
  fontSize: 13,
  lineHeight: 1.6,
};

const asideMetricGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 8,
};

const metricTile = {
  borderRadius: 16,
  padding: "10px 12px",
  display: "grid",
  gap: 4,
};

const metricLabel = {
  margin: 0,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const metricValue = {
  margin: 0,
  fontSize: 20,
  lineHeight: 1,
  fontWeight: 800,
};

const coverageStack = {
  display: "grid",
  gap: 8,
};

const coverageMeter = {
  display: "grid",
  gap: 6,
};

const coverageHead = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "center",
};

const coverageLabel = {
  margin: 0,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const coverageValue = {
  margin: 0,
  fontSize: 12,
  fontWeight: 800,
};

const coverageTrack = {
  width: "100%",
  height: 10,
  borderRadius: 999,
  overflow: "hidden",
};

const coverageFill = {
  height: "100%",
  borderRadius: 999,
};

const controlGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  gap: 14,
};

const filterRail = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const filterPill = {
  borderRadius: 999,
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};

const focusBand = {
  borderRadius: 16,
  padding: 14,
  display: "grid",
  gap: 6,
};

const focusTitle = {
  margin: 0,
  fontSize: 20,
  lineHeight: 1.08,
  letterSpacing: "-0.03em",
};

const focusCopy = {
  margin: 0,
  fontSize: 13,
  lineHeight: 1.6,
};

const guideStack = {
  display: "grid",
  gap: 10,
};

const guideRow = {
  borderRadius: 16,
  padding: 12,
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr)",
  gap: 10,
  alignItems: "start",
};

const guideIcon = {
  width: 34,
  height: 34,
  borderRadius: 12,
  display: "grid",
  placeItems: "center",
  flexShrink: 0,
};

const guideLabel = {
  margin: 0,
  fontSize: 13,
  fontWeight: 700,
  lineHeight: 1.3,
};

const guideCopy = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.55,
};

const feedGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 14,
};

const countBadge = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "7px 10px",
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const rowStack = {
  display: "grid",
  gap: 10,
};

const rowCard = {
  borderRadius: 16,
  padding: 14,
  display: "grid",
  gap: 12,
};

const rowMeta = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

const typeBadge = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "5px 9px",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const statusPill = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "5px 9px",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const destinationPill = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  borderRadius: 999,
  padding: "5px 9px",
  fontSize: 11,
  fontWeight: 700,
  minWidth: 0,
};

const timestamp = {
  fontSize: 12,
};

const rowTitle = {
  margin: 0,
  fontSize: 17,
  fontWeight: 700,
  lineHeight: 1.25,
  letterSpacing: "-0.02em",
};

const rowMessage = {
  margin: 0,
  fontSize: 13,
  lineHeight: 1.55,
};

const rowActions = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

const sectionEmpty = {
  borderRadius: 16,
  padding: "20px 16px",
  display: "grid",
  gap: 6,
  textAlign: "center",
};

const sectionEmptyTitle = {
  margin: 0,
  fontSize: 16,
  fontWeight: 700,
  letterSpacing: "-0.02em",
};

const sectionEmptyCopy = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.55,
};

const icon14 = { width: 14, height: 14 };
const icon12 = { width: 12, height: 12 };

export default Notifications;
