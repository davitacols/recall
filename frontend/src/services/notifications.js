import api from "./api";

export function normalizeNotification(item) {
  if (!item) return null;
  return {
    id: item.id,
    type: item.type || item.notification_type || "system",
    title: item.title || "Notification",
    message: item.message || "",
    link: item.link || item.related_url || "",
    is_read: Boolean(item.is_read ?? item.read),
    created_at: item.created_at,
  };
}

export async function listNotifications() {
  const response = await api.get("/api/notifications/");
  const payload = response.data || {};
  const notifications = Array.isArray(payload.notifications)
    ? payload.notifications.map(normalizeNotification).filter(Boolean)
    : Array.isArray(payload)
      ? payload.map(normalizeNotification).filter(Boolean)
      : [];
  const unreadCount =
    typeof payload.unread_count === "number"
      ? payload.unread_count
      : notifications.filter((n) => !n.is_read).length;

  return { notifications, unreadCount };
}

export async function markNotificationRead(notificationId) {
  await api.post(`/api/notifications/${notificationId}/read/`);
}

export async function markAllNotificationsRead() {
  await api.post("/api/notifications/read-all/");
}

export async function deleteNotification(notificationId) {
  await api.delete(`/api/notifications/${notificationId}/delete/`);
}
