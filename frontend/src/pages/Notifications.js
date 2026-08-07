import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUturnLeftIcon,
  AtSymbolIcon,
  BellIcon,
  BoltIcon,
  CalendarIcon,
  CheckCircleIcon,
  CheckIcon,
  ChatBubbleLeftIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  FaceSmileIcon,
  FlagIcon,
  SparklesIcon,
  TrashIcon,
  TrophyIcon,
} from "@heroicons/react/24/outline";
import {
  Button,
  EmptyState,
  IconButton,
  PageHeader,
  SectionMessage,
  Tabs,
} from "../components/atlas";
import {
  deleteNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/notifications";

// The backend's notification_type values, verbatim. Every one of these is a
// choice on the Notification model; nothing here is invented.
//
// The previous version of this table listed comment/issue/document/project,
// none of which the backend has ever sent, and omitted task, reminder,
// issue_assigned, reply, reaction, goal, meeting, badge, automation and
// message — which is everything it does send. 88 of 93 live notifications fell
// through to the generic bell, so the icon column carried no information at
// all while looking as though it did.
//
// `group` drives the filter tabs, so a type cannot appear in the list with an
// icon and still be invisible to every tab.
const NOTIFICATION_TYPES = {
  mention:        { Icon: AtSymbolIcon,             group: "direct" },
  reply:          { Icon: ArrowUturnLeftIcon,       group: "direct" },
  reaction:       { Icon: FaceSmileIcon,            group: "direct" },
  message:        { Icon: ChatBubbleLeftIcon,       group: "direct" },
  task:           { Icon: CheckCircleIcon,          group: "action" },
  issue_assigned: { Icon: ExclamationTriangleIcon,  group: "action" },
  reminder:       { Icon: ClockIcon,                group: "action" },
  goal:           { Icon: FlagIcon,                 group: "action" },
  meeting:        { Icon: CalendarIcon,             group: "action" },
  decision:       { Icon: SparklesIcon,             group: "activity" },
  badge:          { Icon: TrophyIcon,               group: "activity" },
  automation:     { Icon: BoltIcon,                 group: "activity" },
  system:         { Icon: BellIcon,                 group: "activity" },
};

const FALLBACK_TYPE = { Icon: BellIcon, group: "activity" };

function typeMeta(type) {
  return NOTIFICATION_TYPES[String(type || "")] || FALLBACK_TYPE;
}

function typesInGroup(group) {
  return Object.keys(NOTIFICATION_TYPES).filter((t) => NOTIFICATION_TYPES[t].group === group);
}

// "Watching" used to filter on watch/issue/document. None of those are real
// types, so the tab matched nothing and always would have — an empty tab reads
// as "nothing is happening" rather than "this filter is broken".
const TABS = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "direct", label: "Direct", group: "direct" },
  { id: "action", label: "Needs action", group: "action" },
];

function timeAgo(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  const sec = Math.max(1, Math.round((Date.now() - d.getTime()) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const m = Math.round(sec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function startOfDay(value) {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function dayLabel(ts) {
  const today = startOfDay(new Date());
  const yest = today - 86400000;
  if (ts === today) return "Today";
  if (ts === yest) return "Yesterday";
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}


export default function Notifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");

  useEffect(() => {
    let mounted = true;
    listNotifications()
      .then((data) => {
        if (mounted) setItems(data.notifications);
      })
      .catch((err) => mounted && setError(err?.message || "Failed to load notifications"))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const visible = useMemo(() => {
    if (tab === "unread") return items.filter((n) => !n.is_read);
    const group = TABS.find((t) => t.id === tab)?.group;
    if (!group) return items;
    // Derived from the same table that supplies the icons, so a type can never
    // be displayable but unreachable by every filter.
    return items.filter((n) => typeMeta(n.type).group === group);
  }, [items, tab]);

  const grouped = useMemo(() => {
    const groups = new Map();
    for (const n of visible) {
      const key = startOfDay(n.created_at || Date.now());
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(n);
    }
    return Array.from(groups.entries()).sort((a, b) => b[0] - a[0]);
  }, [visible]);

  const unread = items.filter((n) => !n.is_read).length;

  const handleMarkAll = async () => {
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      setError(err?.message || "Failed to mark all as read");
    }
  };

  const handleRead = async (id) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    try {
      await markNotificationRead(id);
    } catch (_) {}
  };

  const handleDelete = async (id) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    try {
      await deleteNotification(id);
    } catch (_) {}
  };

  const tabs = TABS.map((t) => ({
    id: t.id,
    label: t.label,
    // Every tab carries its own count. Without one, a filter that matches
    // nothing is indistinguishable from a quiet workspace — which is how a
    // permanently-empty tab went unnoticed.
    count: t.id === "unread"
      ? unread
      : t.id === "all"
      ? items.length
      : items.filter((n) => typeMeta(n.type).group === t.group).length,
  }));

  return (
    <div style={{ padding: "0 var(--page-x) 32px" }}>
      <PageHeader
        breadcrumb={[{ label: "Knoledgr", to: "/" }, { label: "Notifications" }]}
        title="Notifications"
        subtitle={unread ? `${unread} unread` : "You're all caught up."}
        actions={
          unread > 0 ? (
            <Button appearance="subtle" iconBefore={<CheckIcon style={{ width: 14, height: 14 }} />} onClick={handleMarkAll}>
              Mark all as read
            </Button>
          ) : null
        }
        tabs={<Tabs tabs={tabs} value={tab} onChange={setTab} />}
        style={{ padding: "24px 0 0", background: "transparent" }}
      />

      {error ? <SectionMessage tone="error" style={{ marginTop: 16 }}>{error}</SectionMessage> : null}

      {loading ? (
        <div style={{ marginTop: 16 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ height: 56, background: "var(--n20)", borderRadius: 4, marginBottom: 6 }} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<BellIcon style={{ width: "100%", height: "100%" }} />}
          title={
            tab === "unread" ? "You're all caught up"
              : tab === "direct" ? "Nobody has mentioned you"
              : tab === "action" ? "Nothing is waiting on you"
              : "No notifications yet"
          }
          description={
            tab === "direct"
              ? "Mentions, replies and reactions aimed at you appear here."
              : tab === "action"
              ? "Assigned tasks, issues and overdue outcome checks appear here."
              : "When things happen in your workspace, you'll see them here."
          }
        />
      ) : (
        <div style={{ marginTop: 16 }}>
          {grouped.map(([key, group]) => (
            <section key={key}>
              <h3 style={dayHeading}>{dayLabel(key)}</h3>
              <ul style={list}>
                {group.map((n) => {
                  const { Icon } = typeMeta(n.type);
                  return (
                    <li key={n.id} style={{ ...item, background: n.is_read ? "var(--app-surface)" : "var(--b50)" }}>
                      <span style={iconBubble}>
                        <Icon style={{ width: 18, height: 18 }} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.4, fontWeight: n.is_read ? 500 : 640, color: "var(--app-text)" }}>
                          {n.link ? (
                            <Link to={n.link} style={{ color: "inherit", textDecoration: "none" }} onClick={() => handleRead(n.id)}>
                              {n.title}
                            </Link>
                          ) : n.title}
                        </p>
                        {n.message ? <p style={{ margin: "3px 0 0", fontSize: 15, lineHeight: 1.5, color: "var(--app-muted)" }}>{n.message}</p> : null}
                        <p style={{ margin: "6px 0 0", fontSize: 13.5, color: "var(--app-muted)" }}>{timeAgo(n.created_at)}</p>
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        {!n.is_read ? (
                          <IconButton icon={<CheckIcon style={{ width: 14, height: 14 }} />} label="Mark read" size={28} onClick={() => handleRead(n.id)} />
                        ) : null}
                        <IconButton icon={<TrashIcon style={{ width: 14, height: 14 }} />} label="Delete" size={28} onClick={() => handleDelete(n.id)} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

const dayHeading = {
  margin: "20px 0 8px",
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  color: "var(--app-muted)",
};

const list = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const item = {
  display: "flex",
  gap: 14,
  padding: "14px 18px",
  border: "1px solid var(--app-border)",
  borderRadius: 10,
  alignItems: "flex-start",
};

const iconBubble = {
  width: 36,
  height: 36,
  borderRadius: 9,
  background: "var(--app-surface-alt)",
  border: "1px solid var(--app-border)",
  color: "var(--app-text-subtle)",
  display: "inline-grid",
  placeItems: "center",
  flexShrink: 0,
};
