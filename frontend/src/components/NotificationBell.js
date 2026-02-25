import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BellIcon } from "@heroicons/react/24/outline";
import { useNotifications } from "../hooks/useNotifications";
import { useToast } from "./Toast";
import {
  deleteNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  normalizeNotification,
} from "../services/notifications";
import { useTheme } from "../utils/ThemeAndAccessibility";

function NotificationBell() {
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const { addToast } = useToast();
  const { darkMode } = useTheme();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const palette = useMemo(
    () =>
      darkMode
        ? {
            panel: "#1d171b",
            border: "rgba(255,225,193,0.14)",
            text: "#f4ece0",
            muted: "#baa892",
            rowHover: "rgba(255,255,255,0.06)",
            unreadDot: "#ff8a4c",
          }
        : {
            panel: "#fffaf3",
            border: "#eadfce",
            text: "#231814",
            muted: "#7d6d5a",
            rowHover: "rgba(35,24,20,0.06)",
            unreadDot: "#e85d04",
          },
    [darkMode]
  );

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 12000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onOutsideClick = (event) => {
      if (!dropdownRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, []);

  const handleIncomingNotification = (payload) => {
    const incoming = normalizeNotification(payload);
    if (!incoming) return;

    setNotifications((prev) => {
      const next = [incoming, ...prev.filter((n) => n.id !== incoming.id)];
      return next.slice(0, 50);
    });

    if (!incoming.is_read) {
      setUnreadCount((count) => count + 1);
    }

    if (addToast) {
      addToast(incoming.message || incoming.title, "info");
    }
  };

  useNotifications(handleIncomingNotification);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { notifications: items, unreadCount: unread } = await listNotifications();
      setNotifications(items);
      setUnreadCount(unread);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const onMarkAsRead = async (notification) => {
    if (!notification || notification.is_read) return;
    try {
      await markNotificationRead(notification.id);
      setNotifications((prev) =>
        prev.map((item) => (item.id === notification.id ? { ...item, is_read: true } : item))
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const onMarkAllAsRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const onDelete = async (notification) => {
    try {
      await deleteNotification(notification.id);
      setNotifications((prev) => prev.filter((item) => item.id !== notification.id));
      if (!notification.is_read) {
        setUnreadCount((count) => Math.max(0, count - 1));
      }
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  const attention = notifications.filter((n) => ["mention", "decision", "task", "goal", "meeting"].includes(n.type));
  const fyi = notifications.filter((n) => !["mention", "decision", "task", "goal", "meeting"].includes(n.type));

  const renderItem = (item) => (
    <article key={item.id} style={{ ...row, borderBottom: `1px solid ${palette.border}` }}>
      <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <p style={{ ...title, color: palette.text }}>{item.title}</p>
          {!item.is_read && <span style={{ ...unreadDot, background: palette.unreadDot }} />}
        </div>
        <p style={{ ...message, color: palette.muted }}>{item.message}</p>
        <p style={{ ...timestamp, color: palette.muted }}>
          {item.created_at ? new Date(item.created_at).toLocaleString() : ""}
        </p>
        <div style={actionsRow}>
          {item.link ? (
            <Link
              to={item.link}
              onClick={() => {
                onMarkAsRead(item);
                setIsOpen(false);
              }}
              style={actionLink}
            >
              Open
            </Link>
          ) : null}
          {!item.is_read ? (
            <button onClick={() => onMarkAsRead(item)} style={actionButton}>
              Mark read
            </button>
          ) : null}
          <button onClick={() => onDelete(item)} style={{ ...actionButton, color: "#ef4444" }}>
            Delete
          </button>
        </div>
      </div>
    </article>
  );

  return (
    <div style={{ position: "relative" }} ref={dropdownRef}>
      <button onClick={() => setIsOpen((open) => !open)} style={bellButton} aria-label="Notifications">
        <BellIcon style={{ width: 20, height: 20 }} />
        {unreadCount > 0 && <span style={badge}>{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </button>

      {isOpen && (
        <div style={{ ...dropdown, background: palette.panel, border: `1px solid ${palette.border}` }}>
          <div style={{ ...header, borderBottom: `1px solid ${palette.border}` }}>
            <h3 style={{ margin: 0, fontSize: 14, color: palette.text }}>Notifications</h3>
            <div style={{ display: "flex", gap: 8 }}>
              {unreadCount > 0 ? (
                <button onClick={onMarkAllAsRead} style={actionButton}>
                  Mark all read
                </button>
              ) : null}
              <button
                onClick={() => {
                  navigate("/notifications");
                  setIsOpen(false);
                }}
                style={actionButton}
              >
                View all
              </button>
            </div>
          </div>

          <div style={{ maxHeight: 420, overflowY: "auto" }}>
            {loading ? (
              <div style={{ ...empty, color: palette.muted }}>Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div style={{ ...empty, color: palette.muted }}>You are all caught up.</div>
            ) : (
              <>
                {attention.length > 0 ? <div style={sectionTag}>Attention</div> : null}
                {attention.slice(0, 4).map(renderItem)}
                {fyi.length > 0 ? <div style={sectionTag}>FYI</div> : null}
                {fyi.slice(0, 3).map(renderItem)}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const bellButton = {
  position: "relative",
  display: "grid",
  placeItems: "center",
  width: 32,
  height: 32,
  border: "none",
  borderRadius: 9,
  background: "transparent",
  cursor: "pointer",
};

const badge = {
  position: "absolute",
  top: -4,
  right: -4,
  minWidth: 17,
  height: 17,
  borderRadius: 999,
  background: "#ef4444",
  color: "#fff",
  fontSize: 10,
  fontWeight: 700,
  display: "grid",
  placeItems: "center",
  padding: "0 4px",
};

const dropdown = {
  position: "absolute",
  top: "calc(100% + 8px)",
  right: 0,
  width: 390,
  borderRadius: 12,
  overflow: "hidden",
  boxShadow: "0 20px 40px rgba(0,0,0,0.24)",
  zIndex: 100,
};

const header = {
  padding: "10px 12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const sectionTag = {
  padding: "8px 12px",
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#9ca3af",
};

const row = {
  padding: "10px 12px",
};

const title = {
  margin: 0,
  fontSize: 13,
  fontWeight: 700,
  lineHeight: 1.35,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const message = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.45,
};

const timestamp = {
  margin: "2px 0 0",
  fontSize: 11,
};

const unreadDot = {
  width: 7,
  height: 7,
  borderRadius: "50%",
  flexShrink: 0,
};

const actionsRow = {
  display: "flex",
  gap: 8,
  marginTop: 4,
  alignItems: "center",
};

const actionButton = {
  border: "none",
  background: "transparent",
  padding: 0,
  fontSize: 11,
  fontWeight: 600,
  color: "#60a5fa",
  cursor: "pointer",
};

const actionLink = {
  fontSize: 11,
  fontWeight: 600,
  color: "#60a5fa",
  textDecoration: "none",
};

const empty = {
  textAlign: "center",
  padding: "24px 12px",
  fontSize: 13,
};

export default NotificationBell;
