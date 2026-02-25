import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDaysIcon,
  CameraIcon,
  ChatBubbleLeftRightIcon,
  CheckBadgeIcon,
  ClockIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../hooks/useAuth";
import api from "../services/api";
import { useToast } from "../components/Toast";
import { useTheme } from "../utils/ThemeAndAccessibility";

function Profile() {
  const { user, refreshUser } = useAuth();
  const { darkMode } = useTheme();
  const { addToast } = useToast();
  const [isCompact, setIsCompact] = useState(window.innerWidth < 960);

  const [profile, setProfile] = useState({
    full_name: "",
    bio: "",
    timezone: "UTC",
    avatar: null,
  });
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [passwords, setPasswords] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [stats, setStats] = useState({
    conversations: 0,
    replies: 0,
    decisions: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    fetchProfile();
    fetchStats();
    fetchRecentActivity();
    fetchBookmarks();
  }, []);

  useEffect(() => {
    const onResize = () => setIsCompact(window.innerWidth < 960);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const palette = useMemo(
    () =>
      darkMode
        ? {
            pageBg: "#0f0b0d",
            panelBg: "#171215",
            panelAlt: "#1e171b",
            border: "rgba(255,225,193,0.14)",
            text: "#f4ece0",
            muted: "#b7a691",
            accent: "#ffb476",
            softAccent: "rgba(255,180,118,0.15)",
            success: "#67d5a8",
            danger: "#ff8b8b",
          }
        : {
            pageBg: "#f6f1ea",
            panelBg: "#fffaf3",
            panelAlt: "#ffffff",
            border: "#eadfce",
            text: "#231814",
            muted: "#7d6d5a",
            accent: "#d9692e",
            softAccent: "rgba(217,105,46,0.11)",
            success: "#238a62",
            danger: "#c63838",
          },
    [darkMode]
  );

  const fetchProfile = async () => {
    try {
      const response = await api.get("/api/auth/profile/");
      setProfile({
        full_name: response.data.full_name || "",
        bio: response.data.bio || "",
        timezone: response.data.timezone || "UTC",
        avatar: null,
      });
      setAvatarPreview(response.data.avatar || null);
    } catch (error) {
      addToast("Failed to fetch profile", "error");
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get("/api/auth/profile/stats/");
      setStats(response.data || { conversations: 0, replies: 0, decisions: 0 });
    } catch (error) {
      setStats({ conversations: 0, replies: 0, decisions: 0 });
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const response = await api.get("/api/conversations/");
      const conversations = response.data.results || response.data || [];
      const userActivity = conversations
        .filter((item) => item.author_id === user?.id)
        .slice(0, 5);
      setRecentActivity(userActivity);
    } catch (error) {
      setRecentActivity([]);
    }
  };

  const fetchBookmarks = async () => {
    try {
      const response = await api.get("/api/conversations/bookmarks/");
      setBookmarks(Array.isArray(response.data) ? response.data.slice(0, 5) : []);
    } catch (error) {
      setBookmarks([]);
    }
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setProfile((prev) => ({ ...prev, avatar: file }));
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleUpdateProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    const formData = new FormData();
    formData.append("full_name", profile.full_name || "");
    formData.append("bio", profile.bio || "");
    formData.append("timezone", profile.timezone || "UTC");
    if (profile.avatar) formData.append("avatar", profile.avatar);

    try {
      await api.put("/api/auth/profile/update/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await refreshUser();
      await fetchProfile();
      addToast("Profile updated", "success");
    } catch (error) {
      addToast("Failed to update profile", "error");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    if (passwords.new_password !== passwords.confirm_password) {
      addToast("Passwords do not match", "error");
      return;
    }
    setSavingPassword(true);
    try {
      await api.post("/api/auth/profile/change-password/", {
        old_password: passwords.old_password,
        new_password: passwords.new_password,
      });
      setPasswords({ old_password: "", new_password: "", confirm_password: "" });
      addToast("Password changed", "success");
    } catch (error) {
      addToast(error.response?.data?.error || "Failed to change password", "error");
    } finally {
      setSavingPassword(false);
    }
  };

  const statItems = [
    {
      label: "Conversations",
      value: stats.conversations || 0,
      icon: ChatBubbleLeftRightIcon,
      color: palette.accent,
    },
    {
      label: "Replies",
      value: stats.replies || 0,
      icon: ClockIcon,
      color: palette.success,
    },
    {
      label: "Decisions",
      value: stats.decisions || 0,
      icon: CheckBadgeIcon,
      color: "#86c8ff",
    },
  ];

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <section
        style={{
          borderRadius: 18,
          padding: "clamp(16px, 3vw, 24px)",
          display: "grid",
          gap: 14,
          background: `linear-gradient(120deg, ${palette.softAccent}, transparent)`,
          border: `1px solid ${palette.border}`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            justifyContent: "space-between",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
            <div style={{ position: "relative", width: 72, height: 72 }}>
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt={user?.full_name || "User"}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: 16,
                    border: `1px solid ${palette.border}`,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: 16,
                    background: `linear-gradient(135deg, ${palette.accent}, #ffcf92)`,
                    display: "grid",
                    placeItems: "center",
                    color: "#1d140f",
                    fontWeight: 800,
                    fontSize: 24,
                  }}
                >
                  {(user?.full_name || user?.username || "U").charAt(0).toUpperCase()}
                </div>
              )}
              <label
                style={{
                  position: "absolute",
                  right: -6,
                  bottom: -6,
                  width: 28,
                  height: 28,
                  borderRadius: 10,
                  display: "grid",
                  placeItems: "center",
                  background: palette.panelAlt,
                  border: `1px solid ${palette.border}`,
                  cursor: "pointer",
                }}
                title="Change avatar"
              >
                <CameraIcon style={{ width: 14, height: 14, color: palette.text }} />
                <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: "none" }} />
              </label>
            </div>

            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, color: palette.muted, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Knoledgr Profile
              </p>
              <h1
                style={{
                  margin: "4px 0 2px",
                  color: palette.text,
                  fontSize: "clamp(1.3rem, 2.6vw, 1.9rem)",
                  lineHeight: 1.1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {user?.full_name || user?.username}
              </h1>
              <p style={{ margin: 0, color: palette.muted, fontSize: 13 }}>
                {user?.email} {user?.organization_name ? `  ·  ${user.organization_name}` : ""}
              </p>
            </div>
          </div>

          <div
            style={{
              padding: "8px 12px",
              borderRadius: 999,
              background: palette.panelAlt,
              border: `1px solid ${palette.border}`,
              color: palette.text,
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {user?.role || "member"}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gap: 10,
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          }}
        >
          {statItems.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.label}
                style={{
                  borderRadius: 14,
                  background: palette.panelAlt,
                  border: `1px solid ${palette.border}`,
                  padding: "12px 12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <p style={{ margin: 0, color: palette.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {item.label}
                  </p>
                  <Icon style={{ width: 16, height: 16, color: item.color }} />
                </div>
                <p style={{ margin: "8px 0 0", color: palette.text, fontSize: 28, fontWeight: 800 }}>{item.value}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gap: 14,
          gridTemplateColumns: isCompact ? "minmax(0,1fr)" : "minmax(0,1.4fr) minmax(300px,1fr)",
          alignItems: "start",
        }}
      >
        <article style={{ borderRadius: 16, background: palette.panelBg, border: `1px solid ${palette.border}`, padding: 16 }}>
          <h2 style={{ margin: 0, color: palette.text, fontSize: 18 }}>Personal Information</h2>
          <p style={{ margin: "5px 0 14px", color: palette.muted, fontSize: 13 }}>
            Update your profile details and preferred timezone.
          </p>
          <form onSubmit={handleUpdateProfile} style={{ display: "grid", gap: 10 }}>
            <Field
              label="Full Name"
              type="text"
              value={profile.full_name}
              onChange={(event) => setProfile((prev) => ({ ...prev, full_name: event.target.value }))}
              palette={palette}
            />
            <Field label="Email" type="email" value={user?.email || ""} disabled palette={palette} />
            <Field
              label="Timezone"
              as="select"
              value={profile.timezone}
              onChange={(event) => setProfile((prev) => ({ ...prev, timezone: event.target.value }))}
              palette={palette}
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="Europe/London">London (GMT)</option>
              <option value="Europe/Paris">Paris (CET)</option>
              <option value="Asia/Tokyo">Tokyo (JST)</option>
            </Field>
            <Field
              label="Bio"
              as="textarea"
              rows={4}
              value={profile.bio}
              onChange={(event) => setProfile((prev) => ({ ...prev, bio: event.target.value }))}
              palette={palette}
            />
            <button
              type="submit"
              disabled={savingProfile}
              style={{
                marginTop: 4,
                border: `1px solid ${palette.border}`,
                background: palette.accent,
                color: "#1d130f",
                padding: "10px 14px",
                borderRadius: 10,
                cursor: savingProfile ? "not-allowed" : "pointer",
                fontWeight: 700,
                opacity: savingProfile ? 0.7 : 1,
              }}
            >
              {savingProfile ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </article>

        <div style={{ display: "grid", gap: 14 }}>
          <article style={{ borderRadius: 16, background: palette.panelBg, border: `1px solid ${palette.border}`, padding: 16 }}>
            <h2 style={{ margin: 0, color: palette.text, fontSize: 18 }}>Security</h2>
            <p style={{ margin: "5px 0 14px", color: palette.muted, fontSize: 13 }}>
              Rotate your password regularly to keep your workspace secure.
            </p>
            <form onSubmit={handleChangePassword} style={{ display: "grid", gap: 10 }}>
              <Field
                label="Current Password"
                type="password"
                value={passwords.old_password}
                onChange={(event) => setPasswords((prev) => ({ ...prev, old_password: event.target.value }))}
                palette={palette}
              />
              <Field
                label="New Password"
                type="password"
                value={passwords.new_password}
                onChange={(event) => setPasswords((prev) => ({ ...prev, new_password: event.target.value }))}
                palette={palette}
              />
              <Field
                label="Confirm Password"
                type="password"
                value={passwords.confirm_password}
                onChange={(event) => setPasswords((prev) => ({ ...prev, confirm_password: event.target.value }))}
                palette={palette}
              />
              <button
                type="submit"
                disabled={savingPassword}
                style={{
                  marginTop: 4,
                  border: `1px solid ${palette.border}`,
                  background: "transparent",
                  color: palette.text,
                  padding: "10px 14px",
                  borderRadius: 10,
                  cursor: savingPassword ? "not-allowed" : "pointer",
                  fontWeight: 700,
                  opacity: savingPassword ? 0.7 : 1,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <ShieldCheckIcon style={{ width: 16, height: 16, color: palette.success }} />
                {savingPassword ? "Updating..." : "Change Password"}
              </button>
            </form>
          </article>

          <article style={{ borderRadius: 16, background: palette.panelBg, border: `1px solid ${palette.border}`, padding: 16 }}>
            <h2 style={{ margin: 0, color: palette.text, fontSize: 18 }}>Recent Activity</h2>
            <p style={{ margin: "5px 0 14px", color: palette.muted, fontSize: 13 }}>
              Latest discussions and bookmarks you touched.
            </p>
            <div style={{ display: "grid", gap: 8 }}>
              {recentActivity.length === 0 && bookmarks.length === 0 ? (
                <div style={emptyState(palette)}>No profile activity yet.</div>
              ) : (
                <>
                  {recentActivity.map((item, index) => (
                    <div key={`${item.id || index}-a`} style={activityRow(palette)}>
                      <CalendarDaysIcon style={{ width: 15, height: 15, color: palette.accent }} />
                      <p style={activityText(palette)}>{item.title || item.content || "Untitled conversation"}</p>
                    </div>
                  ))}
                  {bookmarks.map((item, index) => (
                    <div key={`${item.id || index}-b`} style={activityRow(palette)}>
                      <DocumentTextIcon style={{ width: 15, height: 15, color: palette.success }} />
                      <p style={activityText(palette)}>{item.title || "Bookmarked thread"}</p>
                    </div>
                  ))}
                </>
              )}
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}

function Field({ label, as = "input", palette, children, ...props }) {
  const shared = {
    width: "100%",
    borderRadius: 10,
    border: `1px solid ${palette.border}`,
    background: palette.panelAlt,
    color: palette.text,
    padding: "10px 12px",
    fontSize: 14,
    outline: "none",
  };

  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, color: palette.muted, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase" }}>
        {label}
      </span>
      {as === "textarea" ? (
        <textarea {...props} style={shared} />
      ) : as === "select" ? (
        <select {...props} style={shared}>
          {children}
        </select>
      ) : (
        <input {...props} style={shared} />
      )}
    </label>
  );
}

function emptyState(palette) {
  return {
    borderRadius: 12,
    border: `1px dashed ${palette.border}`,
    padding: "14px 12px",
    color: palette.muted,
    fontSize: 13,
    textAlign: "center",
    background: palette.pageBg,
  };
}

function activityRow(palette) {
  return {
    display: "grid",
    gridTemplateColumns: "15px minmax(0,1fr)",
    alignItems: "start",
    gap: 8,
    borderRadius: 10,
    border: `1px solid ${palette.border}`,
    padding: "10px 11px",
    background: palette.panelAlt,
  };
}

function activityText(palette) {
  return {
    margin: 0,
    color: palette.text,
    fontSize: 13,
    lineHeight: 1.35,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };
}

export default Profile;
