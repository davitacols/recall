import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

function NotificationBell({ openDirection = "down", align = "right" }) {
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const { addToast } = useToast();
  const { darkMode } = useTheme();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [filter, setFilter] = useState("all");
  const hasFetchedRef = useRef(false);

  const palette = useMemo(
    () =>
      darkMode
        ? {
            panel: "#1d171b",
            border: "var(--app-border)",
            borderStrong: "rgba(255,225,193,0.24)",
            text: "var(--app-text)",
            muted: "var(--app-muted)",
            rowHover: "var(--app-info-soft)",
            unreadDot: "#ff8a4c",
            accent: "var(--app-accent)",
            accentText: "#20120d",
            badgeBg: "rgba(255,180,118,0.18)",
          }
        : {
            panel: "var(--app-surface)",
            border: "var(--app-border)",
            borderStrong: "#d8cab6",
            text: "var(--app-text)",
            muted: "var(--app-muted)",
            rowHover: "rgba(35,24,20,0.045)",
            unreadDot: "#e85d04",
            accent: "var(--app-accent)",
            accentText: "var(--app-surface-alt)7ee",
            badgeBg: "rgba(217,105,46,0.14)",
          },
    [darkMode]
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      if (!hasFetchedRef.current) {
        setLoading(true);
      }
      const { notifications: items, unreadCount: unread } = await listNotifications();
      setNotifications(items);
      setUnreadCount(unread);
      hasFetchedRef.current = true;
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 4000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    const onFocus = () => {
      fetchNotifications();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchNotifications();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchNotifications]);

  useEffect(() => {
    const onOutsideClick = (event) => {
      if (!dropdownRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const onEscape = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("pointerdown", onOutsideClick, true);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerdown", onOutsideClick, true);
      document.removeEventListener("keydown", onEscape);
    };
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

  const visible = filter === "unread" ? notifications.filter((n) => !n.is_read) : notifications;
  const visibleAttention = visible.filter((n) => ["mention", "decision", "task", "goal", "meeting"].includes(n.type));
  const visibleFYI = visible.filter((n) => !["mention", "decision", "task", "goal", "meeting"].includes(n.type));

  const formatTime = (value) => {
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
  };

  const renderItem = (item) => (
    <article
      key={item.id}
      style={{
        ...row,
        border: `1px solid ${item.is_read ? palette.border : palette.borderStrong}`,
        background: item.is_read ? "transparent" : palette.badgeBg,
      }}
    >
      <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <p style={{ ...title, color: palette.text }}>{item.title}</p>
          {!item.is_read && <span style={{ ...unreadDot, background: palette.unreadDot }} />}
        </div>
        <p style={{ ...message, color: palette.muted }}>{item.message}</p>
        <p style={{ ...timestamp, color: palette.muted }}>{formatTime(item.created_at)}</p>
        <div style={actionsRow}>
          {item.link ? (
            <Link
              to={item.link}
              onClick={() => {
                onMarkAsRead(item);
                setIsOpen(false);
              }}
              className="ui-btn-polish ui-focus-ring"
              style={{ ...actionLink, borderColor: palette.border, color: palette.text }}
            >
              Open
            </Link>
          ) : null}
          {!item.is_read ? (
            <button
              onClick={() => onMarkAsRead(item)}
              className="ui-btn-polish ui-focus-ring"
              style={{ ...actionButton, borderColor: palette.border, color: palette.text }}
            >
              Mark read
            </button>
          ) : null}
          <button
            onClick={() => onDelete(item)}
            className="ui-btn-polish ui-focus-ring"
            style={{ ...actionButton, borderColor: "var(--app-danger-border)", color: "var(--app-danger)" }}
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  );

  return (
    <div style={{ position: "relative" }} ref={dropdownRef}>
      <button
        onClick={() =>
          setIsOpen((open) => {
            const next = !open;
            if (next) fetchNotifications();
            return next;
          })
        }
        className="ui-btn-polish ui-focus-ring"
        style={bellButton}
        aria-label="Notifications"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <BellIcon style={{ width: 20, height: 20 }} />
        {unreadCount > 0 && <span style={badge}>{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </button>

      {isOpen && (
        <div
          style={{
            ...dropdown,
            ...(openDirection === "up"
              ? { top: "auto", bottom: "calc(100% + 8px)" }
              : { top: "calc(100% + 8px)", bottom: "auto" }),
            ...(align === "left"
              ? { left: isMobile ? -12 : 0, right: "auto" }
              : { right: isMobile ? -12 : 0, left: "auto" }),
            width: isMobile ? "min(94vw, 430px)" : dropdown.width,
            background: palette.panel,
            border: `1px solid ${palette.border}`,
          }}
        >
          <div style={{ ...header, borderBottom: `1px solid ${palette.border}` }}>
            <div style={{ display: "grid", gap: 6 }}>
              <h3 style={{ margin: 0, fontSize: 16, color: palette.text }}>Notifications</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  onClick={() => setFilter("all")}
                  className="ui-btn-polish ui-focus-ring"
                  style={{
                    ...filterPill,
                    border: `1px solid ${palette.border}`,
                    background: filter === "all" ? palette.badgeBg : "transparent",
                    color: palette.text,
                  }}
                >
                  All ({notifications.length})
                </button>
                <button
                  onClick={() => setFilter("unread")}
                  className="ui-btn-polish ui-focus-ring"
                  style={{
                    ...filterPill,
                    border: `1px solid ${palette.border}`,
                    background: filter === "unread" ? palette.badgeBg : "transparent",
                    color: palette.text,
                  }}
                >
                  Unread ({unreadCount})
                </button>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {unreadCount > 0 ? (
                <button
                  onClick={onMarkAllAsRead}
                  className="ui-btn-polish ui-focus-ring"
                  style={{ ...headerAction, border: `1px solid ${palette.border}`, color: palette.text }}
                >
                  Mark all read
                </button>
              ) : null}
              <button
                onClick={() => {
                  navigate("/notifications");
                  setIsOpen(false);
                }}
                className="ui-btn-polish ui-focus-ring"
                style={{ ...headerAction, border: `1px solid ${palette.border}`, color: palette.text }}
              >
                View all
              </button>
            </div>
          </div>

          <div style={{ maxHeight: 480, overflowY: "auto", padding: "10px 12px 12px", display: "grid", gap: 10 }}>
            {loading ? (
              <div style={{ ...empty, color: palette.muted }}>Loading notifications...</div>
            ) : visible.length === 0 ? (
              <div style={{ ...empty, color: palette.muted }}>You are all caught up.</div>
            ) : (
              <>
                {visibleAttention.length > 0 ? <div style={{ ...sectionTag, color: palette.muted }}>Attention</div> : null}
                {visibleAttention.slice(0, 5).map(renderItem)}
                {visibleFYI.length > 0 ? <div style={{ ...sectionTag, color: palette.muted }}>FYI</div> : null}
                {visibleFYI.slice(0, 5).map(renderItem)}
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
  background: "var(--app-danger)",
  color: "var(--app-surface-alt)",
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
  width: 430,
  borderRadius: 16,
  overflow: "hidden",
  boxShadow: "0 20px 40px rgba(0,0,0,0.24)",
  zIndex: 100,
};

const header = {
  padding: "12px 14px",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 10,
};

const sectionTag = {
  padding: "2px 2px 0",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const row = {
  borderRadius: 14,
  padding: "11px 12px",
};

const title = {
  margin: 0,
  fontSize: 14,
  fontWeight: 700,
  lineHeight: 1.35,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const message = {
  margin: 0,
  fontSize: 13,
  lineHeight: 1.45,
};

const timestamp = {
  margin: "3px 0 0",
  fontSize: 12,
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
  marginTop: 6,
  alignItems: "center",
  flexWrap: "wrap",
};

const actionButton = {
  border: "1px solid",
  background: "transparent",
  padding: "5px 9px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};

const actionLink = {
  border: "1px solid",
  background: "transparent",
  padding: "5px 9px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  textDecoration: "none",
};

const headerAction = {
  border: "1px solid",
  background: "transparent",
  borderRadius: 999,
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};

const filterPill = {
  border: "1px solid",
  borderRadius: 999,
  padding: "7px 12px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};

const empty = {
  textAlign: "center",
  padding: "24px 12px",
  fontSize: 13,
};

export default NotificationBell;
