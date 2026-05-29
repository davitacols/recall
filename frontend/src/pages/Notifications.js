import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BellIcon,
  CheckIcon,
  ChatBubbleLeftIcon,
  CubeIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  TrashIcon,
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

const TABS = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "mentions", label: "Mentions" },
  { id: "watching", label: "Watching" },
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

function notificationIcon(type) {
  const map = {
    mention:  { icon: ChatBubbleLeftIcon, color: "var(--b400)" },
    comment:  { icon: ChatBubbleLeftIcon, color: "var(--t400)" },
    decision: { icon: SparklesIcon, color: "var(--p400)" },
    issue:    { icon: ExclamationTriangleIcon, color: "var(--y400)" },
    document: { icon: DocumentTextIcon, color: "var(--n400)" },
    project:  { icon: CubeIcon, color: "var(--g400)" },
    system:   { icon: BellIcon, color: "var(--n300)" },
  };
  return map[type] || map.system;
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
    if (tab === "all") return items;
    if (tab === "unread") return items.filter((n) => !n.is_read);
    if (tab === "mentions") return items.filter((n) => n.type === "mention");
    if (tab === "watching") return items.filter((n) => ["watch", "issue", "document"].includes(n.type));
    return items;
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
    count: t.id === "unread" ? unread : t.id === "all" ? items.length : undefined,
  }));

  return (
    <div style={{ padding: "0 32px 32px" }}>
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
          title={tab === "unread" ? "No unread notifications" : "Nothing to show"}
          description="When things happen in your workspace, you'll see them here."
        />
      ) : (
        <div style={{ marginTop: 16 }}>
          {grouped.map(([key, group]) => (
            <section key={key}>
              <h3 style={dayHeading}>{dayLabel(key)}</h3>
              <ul style={list}>
                {group.map((n) => {
                  const meta = notificationIcon(n.type);
                  const Icon = meta.icon;
                  return (
                    <li key={n.id} style={{ ...item, background: n.is_read ? "var(--app-surface)" : "var(--b50)" }}>
                      <span style={{ ...iconBubble, color: meta.color }}>
                        <Icon style={{ width: 16, height: 16 }} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: n.is_read ? 500 : 600, color: "var(--app-text)" }}>
                          {n.link ? (
                            <Link to={n.link} style={{ color: "inherit", textDecoration: "none" }} onClick={() => handleRead(n.id)}>
                              {n.title}
                            </Link>
                          ) : n.title}
                        </p>
                        {n.message ? <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--app-muted)" }}>{n.message}</p> : null}
                        <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--app-muted)" }}>{timeAgo(n.created_at)}</p>
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
  margin: "16px 0 6px",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.04em",
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
  gap: 12,
  padding: "12px 16px",
  border: "1px solid var(--app-border)",
  borderRadius: 4,
  alignItems: "flex-start",
};

const iconBubble = {
  width: 32,
  height: 32,
  borderRadius: 4,
  background: "var(--app-surface-alt)",
  display: "inline-grid",
  placeItems: "center",
  flexShrink: 0,
};
