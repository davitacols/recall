import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BellIcon } from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import {
  deleteNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/notifications";

const ATTENTION_TYPES = new Set(["mention", "decision", "task", "goal", "meeting"]);

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

function Notifications() {
  const { darkMode } = useTheme();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const palette = useMemo(
    () =>
      darkMode
        ? {
            bg: "#0f0b0d",
            panel: "var(--app-surface)",
            panelSoft: "#1d171b",
            border: "var(--app-border)",
            borderStrong: "rgba(255,225,193,0.24)",
            text: "var(--app-text)",
            muted: "var(--app-muted)",
            accent: "var(--app-accent)",
            accentText: "#20120d",
            unreadBg: "rgba(255,180,118,0.14)",
          }
        : {
            bg: "var(--app-bg)",
            panel: "var(--app-surface)",
            panelSoft: "var(--app-surface-alt)",
            border: "var(--app-border)",
            borderStrong: "#d8cab6",
            text: "var(--app-text)",
            muted: "var(--app-muted)",
            accent: "var(--app-accent)",
            accentText: "var(--app-surface-alt)7ee",
            unreadBg: "rgba(217,105,46,0.1)",
          },
    [darkMode]
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { notifications } = await listNotifications();
      setItems(Array.isArray(notifications) ? notifications : []);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      setItems([]);
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
  const fyiCount = items.length - attentionCount;

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

  const filterPills = [
    { key: "all", label: `All (${items.length})` },
    { key: "unread", label: `Unread (${unreadCount})` },
    { key: "read", label: `Read (${readCount})` },
    { key: "attention", label: `Attention (${attentionCount})` },
    { key: "fyi", label: `FYI (${fyiCount})` },
  ];

  const renderRow = (item) => (
    <article
      key={item.id}
      style={{
        ...rowCard,
        border: `1px solid ${item.is_read ? palette.border : palette.borderStrong}`,
        background: item.is_read ? palette.panelSoft : palette.unreadBg,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ ...typeBadge, border: `1px solid ${palette.border}`, color: palette.muted }}>
            {item.type || "system"}
          </span>
          {!item.is_read ? <span style={{ ...unreadDot, background: palette.accent }} /> : null}
          <span style={{ ...timestamp, color: palette.muted }}>{toRelativeTime(item.created_at)}</span>
        </div>
        <h3 style={{ ...rowTitle, color: palette.text }}>{item.title}</h3>
        <p style={{ ...rowMessage, color: palette.muted }}>{item.message}</p>
      </div>

      <div style={rowActions}>
        {item.link ? (
          <Link
            to={item.link}
            onClick={() => onMarkRead(item)}
            className="ui-btn-polish ui-focus-ring"
            style={{
              ...actionPill,
              border: `1px solid ${palette.border}`,
              color: palette.text,
            }}
          >
            Open
          </Link>
        ) : null}
        {!item.is_read ? (
          <button
            onClick={() => onMarkRead(item)}
            className="ui-btn-polish ui-focus-ring"
            style={{
              ...actionPill,
              border: `1px solid ${palette.border}`,
              color: palette.text,
              background: "transparent",
            }}
          >
            Mark read
          </button>
        ) : null}
        <button
          onClick={() => onDelete(item)}
          className="ui-btn-polish ui-focus-ring"
          style={{
            ...actionPill,
            border: "1px solid var(--app-danger-border)",
            color: "var(--app-danger)",
            background: "transparent",
          }}
        >
          Delete
        </button>
      </div>
    </article>
  );

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={container}>
        <header style={{ ...hero, background: palette.panel, border: `1px solid ${palette.border}` }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <BellIcon style={{ width: 22, height: 22, color: palette.text }} />
              <h1 style={{ margin: 0, fontSize: "clamp(1rem,1.35vw,1.25rem)", color: palette.text }}>Notifications</h1>
            </div>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: palette.muted }}>
              {unreadCount} unread of {items.length} total
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={fetchData}
              className="ui-btn-polish ui-focus-ring"
              style={{ ...heroAction, border: `1px solid ${palette.border}`, color: palette.text, background: "transparent" }}
            >
              Refresh
            </button>
            {unreadCount > 0 ? (
              <button
                onClick={onMarkAllRead}
                className="ui-btn-polish ui-focus-ring"
                style={{
                  ...heroAction,
                  border: `1px solid ${darkMode ? "rgba(255,180,118,0.5)" : "#b95322"}`,
                  background: palette.accent,
                  color: palette.accentText,
                }}
              >
                Mark all read
              </button>
            ) : null}
          </div>
        </header>

        <section style={filtersWrap}>
          {filterPills.map((pill) => (
            <button
              key={pill.key}
              onClick={() => setFilter(pill.key)}
              className="ui-btn-polish ui-focus-ring"
              style={{
                ...filterPill,
                border: `1px solid ${palette.border}`,
                background: filter === pill.key ? palette.unreadBg : palette.panel,
                color: palette.text,
              }}
            >
              {pill.label}
            </button>
          ))}
        </section>

        {loading ? (
          <div style={{ ...emptyCard, border: `1px solid ${palette.border}`, background: palette.panel, color: palette.muted }}>
            Loading notifications...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ ...emptyCard, border: `1px solid ${palette.border}`, background: palette.panel, color: palette.muted }}>
            Nothing to show for this filter.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {visibleAttention.length > 0 ? <p style={{ ...sectionTitle, color: palette.muted }}>Attention</p> : null}
            {visibleAttention.map(renderRow)}
            {visibleFYI.length > 0 ? <p style={{ ...sectionTitle, color: palette.muted }}>FYI</p> : null}
            {visibleFYI.map(renderRow)}
          </div>
        )}
      </div>
    </div>
  );
}

const container = {
  width: "min(1100px, 100%)",
  margin: "0 auto",
  padding: "clamp(12px,2.2vw,24px)",
  display: "grid",
  gap: 12,
};

const hero = {
  borderRadius: 16,
  padding: "14px 16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
};

const heroAction = {
  borderRadius: 999,
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};

const filtersWrap = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const filterPill = {
  borderRadius: 999,
  padding: "7px 12px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};

const sectionTitle = {
  margin: "4px 2px 0",
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  fontWeight: 800,
};

const rowCard = {
  borderRadius: 14,
  padding: "12px 12px",
  display: "grid",
  gridTemplateColumns: "minmax(0,1fr)",
  gap: 12,
};

const typeBadge = {
  borderRadius: 999,
  fontSize: 10,
  padding: "3px 8px",
  fontWeight: 700,
  textTransform: "uppercase",
  width: "fit-content",
};

const unreadDot = {
  width: 7,
  height: 7,
  borderRadius: "50%",
};

const timestamp = {
  fontSize: 12,
};

const rowTitle = {
  margin: "8px 0 4px",
  fontSize: 15,
  fontWeight: 700,
  lineHeight: 1.35,
};

const rowMessage = {
  margin: 0,
  fontSize: 13,
  lineHeight: 1.45,
};

const rowActions = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

const actionPill = {
  textDecoration: "none",
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};

const emptyCard = {
  borderRadius: 14,
  textAlign: "center",
  padding: "30px 14px",
  fontSize: 13,
};

export default Notifications;

