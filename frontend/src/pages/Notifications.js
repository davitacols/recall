import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BellIcon, CheckIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import {
  deleteNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/notifications";

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
            card: "#171215",
            border: "rgba(255,225,193,0.14)",
            text: "#f4ece0",
            muted: "#baa892",
            unread: "rgba(255,138,76,0.14)",
            attention: "#ff8a4c",
          }
        : {
            bg: "#f6f1ea",
            card: "#fffaf3",
            border: "#eadfce",
            text: "#231814",
            muted: "#7d6d5a",
            unread: "rgba(232,93,4,0.1)",
            attention: "#e85d04",
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
      setItems(notifications);
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
  const typeCounts = items.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {});

  const filtered = items.filter((item) => {
    if (filter === "all") return true;
    if (filter === "unread") return !item.is_read;
    if (filter === "read") return item.is_read;
    return item.type === filter;
  });

  const filters = ["all", "unread", "read", ...Object.keys(typeCounts).slice(0, 4)];

  return (
    <div style={{ minHeight: "100vh", background: palette.bg }}>
      <div style={container}>
        <header style={{ ...headerCard, background: palette.card, border: `1px solid ${palette.border}` }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <BellIcon style={{ width: 20, height: 20, color: palette.text }} />
              <h1 style={{ margin: 0, fontSize: 24, color: palette.text }}>Notifications</h1>
            </div>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: palette.muted }}>
              {unreadCount} unread out of {items.length}
            </p>
          </div>
          {unreadCount > 0 ? (
            <button onClick={onMarkAllRead} style={actionButton}>
              Mark all read
            </button>
          ) : null}
        </header>

        <div style={filtersWrap}>
          {filters.map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              style={{
                ...filterButton,
                border: `1px solid ${palette.border}`,
                background: filter === item ? palette.attention : palette.card,
                color: filter === item ? "#fff" : palette.text,
              }}
            >
              {item}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ ...empty, color: palette.muted, border: `1px solid ${palette.border}`, background: palette.card }}>
            Loading notifications...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ ...empty, color: palette.muted, border: `1px solid ${palette.border}`, background: palette.card }}>
            No notifications for this filter.
          </div>
        ) : (
          <div style={list}>
            {filtered.map((item) => (
              <article
                key={item.id}
                style={{
                  ...row,
                  border: `1px solid ${palette.border}`,
                  background: item.is_read ? palette.card : palette.unread,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ ...typeBadge, border: `1px solid ${palette.border}`, color: palette.muted }}>
                      {item.type}
                    </span>
                    {!item.is_read ? <span style={{ ...dot, background: palette.attention }} /> : null}
                  </div>
                  <h3 style={{ ...rowTitle, color: palette.text }}>{item.title}</h3>
                  <p style={{ ...rowMessage, color: palette.muted }}>{item.message}</p>
                  <p style={{ ...rowMeta, color: palette.muted }}>
                    {item.created_at ? new Date(item.created_at).toLocaleString() : ""}
                  </p>
                </div>

                <div style={rowActions}>
                  {item.link ? (
                    <Link
                      to={item.link}
                      onClick={() => onMarkRead(item)}
                      style={{ ...linkButton, border: `1px solid ${palette.border}` }}
                    >
                      Open
                    </Link>
                  ) : null}
                  {!item.is_read ? (
                    <button onClick={() => onMarkRead(item)} style={iconAction} title="Mark as read">
                      <CheckIcon style={{ width: 15, height: 15 }} />
                    </button>
                  ) : null}
                  <button onClick={() => onDelete(item)} style={{ ...iconAction, color: "#ef4444" }} title="Delete">
                    <TrashIcon style={{ width: 15, height: 15 }} />
                  </button>
                </div>
              </article>
            ))}
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
};

const headerCard = {
  borderRadius: 14,
  padding: "14px 16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const actionButton = {
  border: "none",
  borderRadius: 9,
  padding: "8px 12px",
  background: "linear-gradient(135deg,#ffd390,#ff9f62)",
  color: "#20140f",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};

const filtersWrap = {
  marginTop: 10,
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const filterButton = {
  borderRadius: 999,
  padding: "6px 11px",
  fontSize: 12,
  textTransform: "capitalize",
  cursor: "pointer",
};

const list = {
  marginTop: 12,
  display: "grid",
  gap: 8,
};

const row = {
  borderRadius: 12,
  padding: "12px 12px",
  display: "grid",
  gridTemplateColumns: "minmax(0,1fr) auto",
  gap: 10,
};

const typeBadge = {
  borderRadius: 999,
  fontSize: 10,
  padding: "2px 8px",
  fontWeight: 700,
  textTransform: "uppercase",
  width: "fit-content",
};

const dot = {
  width: 7,
  height: 7,
  borderRadius: "50%",
};

const rowTitle = {
  margin: "7px 0 4px",
  fontSize: 14,
  fontWeight: 700,
};

const rowMessage = {
  margin: 0,
  fontSize: 13,
  lineHeight: 1.4,
};

const rowMeta = {
  margin: "6px 0 0",
  fontSize: 11,
};

const rowActions = {
  display: "flex",
  alignItems: "flex-start",
  gap: 6,
};

const iconAction = {
  border: "none",
  background: "transparent",
  cursor: "pointer",
  color: "#60a5fa",
  display: "grid",
  placeItems: "center",
  padding: 2,
};

const linkButton = {
  textDecoration: "none",
  borderRadius: 8,
  padding: "6px 9px",
  fontSize: 12,
  fontWeight: 600,
  color: "#60a5fa",
};

const empty = {
  marginTop: 12,
  borderRadius: 12,
  textAlign: "center",
  padding: "28px 14px",
  fontSize: 13,
};

export default Notifications;
