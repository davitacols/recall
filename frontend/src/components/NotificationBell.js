import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BellIcon, CheckIcon } from "@heroicons/react/24/outline";
import { useNotifications } from "../hooks/useNotifications";
import { useToast } from "./Toast";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  normalizeNotification,
} from "../services/notifications";

const POLL_MS = 45000; // slow REST fallback; the WebSocket delivers in real time

function relativeTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const sec = Math.max(1, Math.round((Date.now() - d.getTime()) / 1000));
  if (sec < 60) return "just now";
  const m = Math.round(sec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const { addToast } = useToast() || {};
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const rootRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const { notifications, unreadCount } = await listNotifications();
      setItems(notifications);
      setUnread(unreadCount);
    } catch (_) {
      // keep last good state on transient failures
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + slow polling fallback (only while the tab is visible) + focus refetch.
  useEffect(() => {
    fetchNotifications();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") fetchNotifications();
    }, POLL_MS);
    const onFocus = () => fetchNotifications();
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(id); window.removeEventListener("focus", onFocus); };
  }, [fetchNotifications]);

  // Real-time delivery over the notifications WebSocket.
  const handleIncoming = useCallback((payload) => {
    const incoming = normalizeNotification(payload);
    if (!incoming) return;
    setItems((prev) => [incoming, ...prev.filter((n) => n.id !== incoming.id)].slice(0, 50));
    if (!incoming.is_read) setUnread((u) => u + 1);
    if (addToast) addToast(incoming.title || incoming.message || "New notification", "info");
  }, [addToast]);
  useNotifications(handleIncoming);

  // Refresh when opened.
  useEffect(() => { if (open) fetchNotifications(); }, [open, fetchNotifications]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const markRead = async (id) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    setUnread((u) => Math.max(0, u - 1));
    try { await markNotificationRead(id); } catch (_) {}
  };

  const markAll = async () => {
    if (!unread) return;
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnread(0);
    try { await markAllNotificationsRead(); } catch (_) {}
  };

  const onItem = (n) => {
    if (!n.is_read) markRead(n.id);
    setOpen(false);
    if (n.link) navigate(n.link.startsWith("/") ? n.link : `/${n.link}`);
  };

  const badge = unread > 9 ? "9+" : String(unread);

  return (
    <div className="nb" ref={rootRef}>
      <style>{NB_STYLES}</style>
      <button
        type="button"
        className={`nb-trigger ${open ? "is-open" : ""}`}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <BellIcon />
        {unread > 0 ? <span className="nb-badge">{badge}</span> : null}
      </button>

      {open ? (
        <div className="nb-panel" role="dialog" aria-label="Notifications">
          <header className="nb-head">
            <span className="nb-head-title">
              Notifications{unread ? <span className="nb-head-count">{unread}</span> : null}
            </span>
            <button type="button" className="nb-mark" disabled={!unread} onClick={markAll}>
              <CheckIcon /> Mark all read
            </button>
          </header>

          <div className="nb-list">
            {loading && items.length === 0 ? (
              <div className="nb-loading"><span className="nb-spinner" /></div>
            ) : items.length === 0 ? (
              <div className="nb-empty">
                <BellIcon />
                <p>You're all caught up.</p>
              </div>
            ) : (
              items.slice(0, 8).map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={`nb-item ${n.is_read ? "" : "is-unread"}`}
                  onClick={() => onItem(n)}
                >
                  <span className="nb-dot" aria-hidden="true" />
                  <span className="nb-item-body">
                    <span className="nb-item-title">{n.title}</span>
                    {n.message ? <span className="nb-item-msg">{n.message}</span> : null}
                    <span className="nb-item-time">{relativeTime(n.created_at)}</span>
                  </span>
                </button>
              ))
            )}
          </div>

          <footer className="nb-foot">
            <button type="button" className="nb-viewall" onClick={() => { setOpen(false); navigate("/notifications"); }}>
              View all notifications
            </button>
          </footer>
        </div>
      ) : null}
    </div>
  );
}

const NB_STYLES = `
.nb { position: relative; display: inline-flex; }
.nb-trigger {
  position: relative; display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border-radius: 8px; border: none; background: transparent;
  color: var(--app-text-subtle); cursor: pointer; transition: background 120ms ease, color 120ms ease;
}
.nb-trigger:hover, .nb-trigger.is-open { background: var(--app-surface-alt); color: var(--app-text); }
.nb-trigger svg { width: 18px; height: 18px; }
.nb-badge {
  position: absolute; top: 0; right: 0; min-width: 16px; height: 16px; padding: 0 4px;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--app-danger); color: #FFFFFF; font-size: 10px; font-weight: 700;
  border-radius: 999px; border: 2px solid var(--app-surface); line-height: 1;
}
.nb-panel {
  position: absolute; top: 42px; right: 0; width: 360px; max-width: calc(100vw - 24px);
  background: var(--app-surface-overlay, var(--app-surface));
  border: 1px solid var(--app-border); border-radius: 14px;
  box-shadow: var(--ui-shadow-lg); z-index: 130; overflow: hidden;
  animation: nbPop 140ms cubic-bezier(0.2,0,0,1);
}
@keyframes nbPop { from { transform: translateY(-6px); opacity: 0; } to { transform: none; opacity: 1; } }
.nb-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 14px; border-bottom: 1px solid var(--app-border-subtle);
}
.nb-head-title { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 620; color: var(--app-text); }
.nb-head-count {
  display: inline-flex; align-items: center; justify-content: center; min-width: 18px; height: 18px; padding: 0 5px;
  background: var(--app-accent-soft); color: var(--app-accent); font-size: 11px; font-weight: 700; border-radius: 999px;
}
.nb-mark {
  display: inline-flex; align-items: center; gap: 5px; border: none; background: transparent;
  color: var(--app-accent); font-family: inherit; font-size: 12.5px; font-weight: 560; cursor: pointer;
  padding: 4px 6px; border-radius: 6px; transition: background 110ms ease, color 110ms ease;
}
.nb-mark:hover:not(:disabled) { background: var(--app-surface-alt); }
.nb-mark:disabled { color: var(--app-text-disabled); cursor: default; }
.nb-mark svg { width: 13px; height: 13px; }
.nb-list { max-height: 380px; overflow-y: auto; padding: 4px; }
.nb-loading { display: grid; place-items: center; min-height: 120px; }
.nb-spinner { width: 22px; height: 22px; border: 2px solid var(--app-border-strong); border-top-color: var(--app-accent); border-radius: 999px; animation: nbSpin 0.8s linear infinite; }
@keyframes nbSpin { to { transform: rotate(360deg); } }
.nb-empty { display: grid; place-items: center; gap: 8px; padding: 34px 16px; color: var(--app-muted); }
.nb-empty svg { width: 26px; height: 26px; color: var(--app-text-disabled); }
.nb-empty p { margin: 0; font-size: 13.5px; }
.nb-item {
  display: flex; align-items: flex-start; gap: 10px; width: 100%; text-align: left;
  padding: 11px 12px; border: none; background: transparent; border-radius: 10px; cursor: pointer;
  transition: background 110ms ease;
}
.nb-item:hover { background: var(--app-surface-alt); }
.nb-dot { width: 7px; height: 7px; border-radius: 999px; background: transparent; margin-top: 6px; flex-shrink: 0; }
.nb-item.is-unread .nb-dot { background: var(--app-accent); }
.nb-item.is-unread { background: var(--app-accent-soft); }
.nb-item.is-unread:hover { background: var(--app-accent-soft); }
.nb-item-body { display: flex; flex-direction: column; min-width: 0; flex: 1; gap: 2px; }
.nb-item-title { font-size: 13.5px; font-weight: 600; color: var(--app-text); line-height: 1.35; }
.nb-item-msg {
  font-size: 12.5px; color: var(--app-muted); line-height: 1.45;
  overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
}
.nb-item-time { font-size: 11.5px; color: var(--app-text-disabled); margin-top: 2px; }
.nb-foot { padding: 8px; border-top: 1px solid var(--app-border-subtle); }
.nb-viewall {
  width: 100%; height: 36px; border: none; background: transparent; color: var(--app-accent);
  font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; border-radius: 8px;
  transition: background 110ms ease;
}
.nb-viewall:hover { background: var(--app-surface-alt); }
@media (max-width: 520px) {
  .nb-panel { position: fixed; top: 56px; right: 8px; left: 8px; width: auto; }
}
`;
