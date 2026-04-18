import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  CameraIcon,
  ChatBubbleLeftRightIcon,
  CheckBadgeIcon,
  ClockIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../hooks/useAuth";
import api from "../services/api";
import { useToast } from "../components/Toast";
import { useTheme } from "../utils/ThemeAndAccessibility";

function createEmptyIdentity() {
  return {
    id: null,
    username: "",
    email: "",
    full_name: "",
    bio: "",
    role: "contributor",
    timezone: "UTC",
    avatar: null,
    organization_name: "",
    organization_slug: "",
    date_joined: null,
    last_active: null,
  };
}

function Profile() {
  const { user, refreshUser } = useAuth();
  const { darkMode } = useTheme();
  const { addToast } = useToast();
  const { userId } = useParams();

  const requestedUserId = userId ? Number.parseInt(userId, 10) : null;
  const hasRequestedUserId = Number.isInteger(requestedUserId) && requestedUserId > 0;
  const isViewingTeammate = Boolean(hasRequestedUserId && requestedUserId !== user?.id);

  const [isCompact, setIsCompact] = useState(() => (typeof window !== "undefined" ? window.innerWidth < 960 : false));
  const [profile, setProfile] = useState({
    full_name: "",
    bio: "",
    timezone: "UTC",
    avatar: null,
  });
  const [profileIdentity, setProfileIdentity] = useState(createEmptyIdentity());
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
  const [activityItems, setActivityItems] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    const onResize = () => setIsCompact(window.innerWidth < 960);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!user) return;

    let isActive = true;

    const load = async () => {
      setLoadingProfile(true);
      setActivityItems([]);

      try {
        await fetchTeamMembers(isActive);

        if (isViewingTeammate) {
          await Promise.all([
            fetchTeamMemberProfile(requestedUserId, isActive),
            fetchTeamMemberActivity(requestedUserId, isActive),
          ]);
        } else {
          await Promise.all([
            fetchOwnProfile(isActive),
            fetchOwnStats(isActive),
            fetchOwnActivity(isActive),
          ]);
        }
      } finally {
        if (isActive) {
          setLoadingProfile(false);
        }
      }
    };

    load().catch(() => {
      if (isActive) {
        setLoadingProfile(false);
      }
    });

    return () => {
      isActive = false;
    };
  }, [user, requestedUserId, isViewingTeammate]);

  const palette = useMemo(
    () =>
      darkMode
        ? {
            pageBg: "#0f0b0d",
            panelBg: "var(--app-surface)",
            panelAlt: "var(--app-surface-alt)",
            border: "var(--app-border)",
            text: "var(--app-text)",
            muted: "#b7a691",
            accent: "var(--app-accent)",
            softAccent: "rgba(255,180,118,0.15)",
            success: "var(--app-success)",
            danger: "var(--app-danger)",
          }
        : {
            pageBg: "var(--app-bg)",
            panelBg: "var(--app-surface)",
            panelAlt: "var(--app-surface-alt)",
            border: "var(--app-border)",
            text: "var(--app-text)",
            muted: "var(--app-muted)",
            accent: "var(--app-accent)",
            softAccent: "rgba(217,105,46,0.11)",
            success: "#238a62",
            danger: "#c63838",
          },
    [darkMode]
  );

  const directoryMembers = useMemo(
    () =>
      [...teamMembers].sort((left, right) =>
        (left.full_name || left.username || "").localeCompare(right.full_name || right.username || "")
      ),
    [teamMembers]
  );

  const subjectId = isViewingTeammate ? profileIdentity.id : user?.id;
  const subjectName = profileIdentity.full_name || profileIdentity.username || user?.full_name || user?.username || "Profile";
  const subjectEmail = profileIdentity.email || user?.email || "";
  const subjectRole = profileIdentity.role || user?.role || "contributor";
  const subjectOrg = profileIdentity.organization_name || user?.organization_name || "";
  const joinedLabel = formatDate(profileIdentity.date_joined);
  const lastActiveLabel = formatDate(profileIdentity.last_active);

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

  async function fetchOwnProfile(isActive) {
    try {
      const response = await api.get("/api/auth/profile/");
      if (!isActive) return;

      const identity = {
        id: response.data.id ?? user?.id,
        username: response.data.username ?? user?.username ?? "",
        email: response.data.email ?? user?.email ?? "",
        full_name: response.data.full_name || user?.full_name || user?.username || "",
        bio: response.data.bio || "",
        role: response.data.role || user?.role || "contributor",
        timezone: response.data.timezone || "UTC",
        avatar: response.data.avatar || null,
        organization_name: response.data.organization_name || user?.organization_name || "",
        organization_slug: response.data.organization_slug || user?.organization_slug || "",
        date_joined: user?.date_joined || null,
        last_active: user?.last_active || null,
      };

      setProfile({
        full_name: identity.full_name,
        bio: identity.bio,
        timezone: identity.timezone,
        avatar: null,
      });
      setProfileIdentity(identity);
      setAvatarPreview(identity.avatar);
    } catch (error) {
      addToast("Failed to fetch profile", "error");
    }
  }

  async function fetchOwnStats(isActive) {
    try {
      const response = await api.get("/api/auth/profile/stats/");
      if (!isActive) return;
      setStats(response.data || { conversations: 0, replies: 0, decisions: 0 });
    } catch (error) {
      if (!isActive) return;
      setStats({ conversations: 0, replies: 0, decisions: 0 });
    }
  }

  async function fetchOwnActivity(isActive) {
    try {
      const [conversationsResponse, bookmarksResponse] = await Promise.all([
        api.get("/api/conversations/"),
        api.get("/api/conversations/bookmarks/"),
      ]);
      if (!isActive) return;

      const conversations = conversationsResponse.data.results || conversationsResponse.data || [];
      const bookmarks = Array.isArray(bookmarksResponse.data) ? bookmarksResponse.data : [];

      const conversationItems = conversations
        .filter((item) => item.author_id === user?.id)
        .slice(0, 4)
        .map((item) => ({
          id: item.id,
          type: "conversation",
          title: item.title || item.content || "Untitled conversation",
          subtitle: "Conversation you opened",
          href: item.id ? `/conversations/${item.id}` : null,
          timestamp: item.updated_at || item.created_at || null,
        }));

      const bookmarkItems = bookmarks.slice(0, 4).map((item) => ({
        id: item.id,
        type: "bookmark",
        title: item.conversation_title || "Bookmarked thread",
        subtitle: "Bookmarked conversation",
        href: item.conversation_id ? `/conversations/${item.conversation_id}` : null,
        timestamp: item.created_at || null,
      }));

      const items = [...conversationItems, ...bookmarkItems]
        .sort((left, right) => toTimestamp(right.timestamp) - toTimestamp(left.timestamp))
        .slice(0, 6);

      setActivityItems(items);
    } catch (error) {
      if (!isActive) return;
      setActivityItems([]);
    }
  }

  async function fetchTeamMembers(isActive) {
    try {
      const response = await api.get("/api/organizations/team/members/");
      if (!isActive) return;
      setTeamMembers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      if (!isActive) return;
      setTeamMembers([]);
    }
  }

  async function fetchTeamMemberProfile(memberId, isActive) {
    try {
      const response = await api.get(`/api/organizations/team/members/${memberId}/profile/`);
      if (!isActive) return;

      const identity = {
        id: response.data.id,
        username: response.data.username || "",
        email: response.data.email || "",
        full_name: response.data.full_name || response.data.username || "",
        bio: response.data.bio || "",
        role: response.data.role || "contributor",
        timezone: response.data.timezone || "UTC",
        avatar: response.data.avatar || null,
        organization_name: response.data.organization_name || "",
        organization_slug: response.data.organization_slug || "",
        date_joined: response.data.date_joined || null,
        last_active: response.data.last_active || null,
      };

      setProfile({
        full_name: identity.full_name,
        bio: identity.bio,
        timezone: identity.timezone,
        avatar: null,
      });
      setProfileIdentity(identity);
      setStats(response.data.stats || { conversations: 0, replies: 0, decisions: 0 });
      setAvatarPreview(identity.avatar);
    } catch (error) {
      if (!isActive) return;
      addToast("Failed to load teammate profile", "error");
      setProfileIdentity(createEmptyIdentity());
      setStats({ conversations: 0, replies: 0, decisions: 0 });
    }
  }

  async function fetchTeamMemberActivity(memberId, isActive) {
    try {
      const response = await api.get(`/api/organizations/team/activity/${memberId}/`);
      if (!isActive) return;
      setActivityItems(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      if (!isActive) return;
      setActivityItems([]);
    }
  }

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
      await fetchOwnProfile(true);
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

  if (loadingProfile) {
    return (
      <div style={{ display: "grid", gap: 14 }}>
        <section
          style={{
            borderRadius: 18,
            padding: "clamp(16px, 3vw, 24px)",
            display: "grid",
            gap: 10,
            background: `linear-gradient(120deg, ${palette.softAccent}, transparent)`,
            border: `1px solid ${palette.border}`,
          }}
        >
          <p style={{ margin: 0, color: palette.muted, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Profile
          </p>
          <h1 style={{ margin: 0, color: palette.text, fontSize: "clamp(1.25rem, 2.5vw, 1.85rem)" }}>Loading workspace profile...</h1>
          <p style={{ margin: 0, color: palette.muted, fontSize: 13 }}>
            Pulling identity, stats, and team context into one place.
          </p>
        </section>
      </div>
    );
  }

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
            alignItems: "flex-start",
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
                  alt={subjectName}
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
                    color: "var(--app-button-text)",
                    fontWeight: 800,
                    fontSize: 24,
                  }}
                >
                  {(subjectName || "U").charAt(0).toUpperCase()}
                </div>
              )}
              {!isViewingTeammate && (
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
              )}
            </div>

            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, color: palette.muted, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {isViewingTeammate ? "Team member profile" : "Knoledgr profile"}
              </p>
              <h1
                style={{
                  margin: "4px 0 2px",
                  color: palette.text,
                  fontSize: "clamp(1.3rem, 2.6vw, 1.9rem)",
                  lineHeight: 1.1,
                }}
              >
                {subjectName}
              </h1>
              <p style={{ margin: 0, color: palette.muted, fontSize: 13 }}>
                {[subjectEmail, subjectOrg].filter(Boolean).join(" | ")}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {isViewingTeammate && (
              <Link to="/profile" style={actionLinkStyle(palette, "ghost")}>
                <ArrowLeftIcon style={{ width: 15, height: 15 }} />
                My profile
              </Link>
            )}
            <span style={statusChip(palette)}>{subjectRole}</span>
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
          gridTemplateColumns: isCompact ? "minmax(0,1fr)" : "minmax(0,1.35fr) minmax(320px,0.95fr)",
          alignItems: "start",
        }}
      >
        <div style={{ display: "grid", gap: 14 }}>
          {isViewingTeammate ? (
            <article style={panelStyle(palette)}>
              <h2 style={{ margin: 0, color: palette.text, fontSize: 18 }}>Workspace Overview</h2>
              <p style={{ margin: "5px 0 14px", color: palette.muted, fontSize: 13 }}>
                Review who this teammate is, what they own, and how they show up in the workspace.
              </p>
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "grid", gap: 6 }}>
                  <p style={eyebrowStyle(palette)}>About</p>
                  <p style={{ margin: 0, color: palette.text, fontSize: 14, lineHeight: 1.5 }}>
                    {profile.bio || `${subjectName} has not added a profile summary yet.`}
                  </p>
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: 10,
                    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                  }}
                >
                  <InfoStat label="Timezone" value={profile.timezone || "UTC"} palette={palette} />
                  <InfoStat label="Joined" value={joinedLabel || "Unavailable"} palette={palette} />
                  <InfoStat label="Last active" value={lastActiveLabel || "Unavailable"} palette={palette} />
                </div>
              </div>
            </article>
          ) : (
            <article style={panelStyle(palette)}>
              <h2 style={{ margin: 0, color: palette.text, fontSize: 18 }}>Personal Information</h2>
              <p style={{ margin: "5px 0 14px", color: palette.muted, fontSize: 13 }}>
                Update your profile details so teammates can understand who owns context and execution.
              </p>
              <form onSubmit={handleUpdateProfile} style={{ display: "grid", gap: 10 }}>
                <Field
                  label="Full Name"
                  type="text"
                  value={profile.full_name}
                  onChange={(event) => setProfile((prev) => ({ ...prev, full_name: event.target.value }))}
                  palette={palette}
                />
                <Field label="Email" type="email" value={subjectEmail} disabled palette={palette} />
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
                <button type="submit" disabled={savingProfile} style={actionButtonStyle(palette, "primary", savingProfile)}>
                  {savingProfile ? "Saving..." : "Save changes"}
                </button>
              </form>
            </article>
          )}
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          {!isViewingTeammate && (
            <article style={panelStyle(palette)}>
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
                <button type="submit" disabled={savingPassword} style={actionButtonStyle(palette, "ghost", savingPassword)}>
                  <ShieldCheckIcon style={{ width: 16, height: 16, color: palette.success }} />
                  {savingPassword ? "Updating..." : "Change password"}
                </button>
              </form>
            </article>
          )}

          <article style={panelStyle(palette)}>
            <h2 style={{ margin: 0, color: palette.text, fontSize: 18 }}>Recent Activity</h2>
            <p style={{ margin: "5px 0 14px", color: palette.muted, fontSize: 13 }}>
              {isViewingTeammate
                ? "The newest conversation, reply, and decision signals for this teammate."
                : "The latest conversations and bookmarks tied to your workspace record."}
            </p>
            <div style={{ display: "grid", gap: 8 }}>
              {activityItems.length === 0 ? (
                <div style={emptyState(palette)}>
                  {isViewingTeammate ? "No teammate activity is visible yet." : "No profile activity yet."}
                </div>
              ) : (
                activityItems.map((item, index) => (
                  <ActivityItem
                    key={`${item.type}-${item.id || index}`}
                    item={item}
                    palette={palette}
                  />
                ))
              )}
            </div>
          </article>
        </div>
      </section>

      <article style={panelStyle(palette)}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ margin: 0, color: palette.text, fontSize: 18 }}>Team Directory</h2>
            <p style={{ margin: "5px 0 0", color: palette.muted, fontSize: 13 }}>
              Open teammate profiles directly from the workspace instead of relying on admin-only screens.
            </p>
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: palette.muted, fontSize: 13 }}>
            <UserGroupIcon style={{ width: 16, height: 16 }} />
            {directoryMembers.length} team member{directoryMembers.length === 1 ? "" : "s"}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gap: 10,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            marginTop: 14,
          }}
        >
          {directoryMembers.length === 0 ? (
            <div style={emptyState(palette)}>No team members are available in this workspace yet.</div>
          ) : (
            directoryMembers.map((member) => {
              const memberName = member.full_name || member.username || "Member";
              const isCurrent = member.id === subjectId;
              const isSelfMember = member.id === user?.id;

              return (
                <div key={member.id} style={directoryCardStyle(palette, isCurrent)}>
                  <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
                    <p style={{ margin: 0, color: palette.text, fontSize: 14, fontWeight: 700 }}>{memberName}</p>
                    <p style={{ margin: 0, color: palette.muted, fontSize: 12 }}>{member.email}</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <span style={miniChip(palette)}>{member.role}</span>
                    {isCurrent ? (
                      <span style={miniChip(palette, true)}>Viewing</span>
                    ) : (
                      <Link to={isSelfMember ? "/profile" : `/profile/${member.id}`} style={actionLinkStyle(palette, "ghost")}>
                        {isSelfMember ? "My profile" : "Open profile"}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </article>
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

function InfoStat({ label, value, palette }) {
  return (
    <div
      style={{
        borderRadius: 12,
        border: `1px solid ${palette.border}`,
        background: palette.panelAlt,
        padding: "12px 12px",
      }}
    >
      <p style={eyebrowStyle(palette)}>{label}</p>
      <p style={{ margin: "6px 0 0", color: palette.text, fontSize: 14, fontWeight: 700 }}>{value}</p>
    </div>
  );
}

function ActivityItem({ item, palette }) {
  const { icon: Icon, color } = activityPresentation(item.type, palette);
  const isLink = Boolean(item.href);
  const Wrapper = isLink ? Link : "div";
  const wrapperProps = isLink ? { to: item.href } : {};

  return (
    <Wrapper
      {...wrapperProps}
      style={{
        ...activityRow(palette),
        textDecoration: "none",
      }}
    >
      <Icon style={{ width: 15, height: 15, color }} />
      <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
        <p style={activityText(palette)}>{item.title || "Untitled activity"}</p>
        <p style={{ margin: 0, color: palette.muted, fontSize: 12 }}>
          {[item.subtitle, formatDate(item.timestamp)].filter(Boolean).join(" | ")}
        </p>
      </div>
    </Wrapper>
  );
}

function activityPresentation(type, palette) {
  if (type === "decision") {
    return { icon: CheckBadgeIcon, color: "#86c8ff" };
  }
  if (type === "reply") {
    return { icon: ClockIcon, color: palette.success };
  }
  if (type === "bookmark") {
    return { icon: DocumentTextIcon, color: palette.success };
  }
  return { icon: CalendarDaysIcon, color: palette.accent };
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function toTimestamp(value) {
  if (!value) return 0;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  return date.getTime();
}

function panelStyle(palette) {
  return {
    borderRadius: 16,
    background: palette.panelBg,
    border: `1px solid ${palette.border}`,
    padding: 16,
  };
}

function eyebrowStyle(palette) {
  return {
    margin: 0,
    color: palette.muted,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  };
}

function actionButtonStyle(palette, variant, disabled) {
  const isPrimary = variant === "primary";
  return {
    marginTop: 4,
    border: `1px solid ${palette.border}`,
    background: isPrimary ? palette.accent : "transparent",
    color: isPrimary ? "var(--app-button-text)" : palette.text,
    padding: "10px 14px",
    borderRadius: 10,
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 700,
    opacity: disabled ? 0.7 : 1,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
  };
}

function actionLinkStyle(palette, variant) {
  const isGhost = variant === "ghost";
  return {
    border: `1px solid ${palette.border}`,
    background: isGhost ? "transparent" : palette.accent,
    color: isGhost ? palette.text : "var(--app-button-text)",
    padding: "9px 12px",
    borderRadius: 10,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    fontWeight: 700,
    textDecoration: "none",
  };
}

function statusChip(palette) {
  return {
    padding: "8px 12px",
    borderRadius: 999,
    background: palette.panelAlt,
    border: `1px solid ${palette.border}`,
    color: palette.text,
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  };
}

function miniChip(palette, active = false) {
  return {
    padding: "5px 9px",
    borderRadius: 999,
    background: active ? palette.softAccent : palette.panelAlt,
    border: `1px solid ${palette.border}`,
    color: palette.text,
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  };
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

function directoryCardStyle(palette, active) {
  return {
    display: "grid",
    gap: 10,
    borderRadius: 12,
    border: `1px solid ${palette.border}`,
    padding: "12px 12px",
    background: active ? palette.softAccent : palette.panelAlt,
  };
}

export default Profile;
