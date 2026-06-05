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
import { PageHeader } from "../components/atlas";
import "./Profile.css";

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
  const { addToast } = useToast();
  const { userId } = useParams();

  const requestedUserId = userId ? Number.parseInt(userId, 10) : null;
  const hasRequestedUserId = Number.isInteger(requestedUserId) && requestedUserId > 0;
  const isViewingTeammate = Boolean(hasRequestedUserId && requestedUserId !== user?.id);

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
        if (isActive) setLoadingProfile(false);
      }
    };

    load().catch(() => {
      if (isActive) setLoadingProfile(false);
    });

    return () => {
      isActive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, requestedUserId, isViewingTeammate]);

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
    { label: "Conversations", value: stats.conversations || 0, Icon: ChatBubbleLeftRightIcon, tone: "violet" },
    { label: "Replies", value: stats.replies || 0, Icon: ClockIcon, tone: "emerald" },
    { label: "Decisions", value: stats.decisions || 0, Icon: CheckBadgeIcon, tone: "blue" },
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

  return (
    <div className="profile-page">
      <PageHeader
        breadcrumb={[{ label: "Knoledgr", to: "/" }, { label: "Profile" }]}
        title={isViewingTeammate ? "Team member profile" : "Your profile"}
        subtitle={
          isViewingTeammate
            ? "How this teammate shows up across the workspace."
            : "Identity, security, and how your contributions appear to the team."
        }
        style={{ padding: "24px 0 0", background: "transparent" }}
      />

      {/* Hero */}
      <section className="profile-hero">
        <div className="profile-hero-id">
          <div className="profile-avatar">
            {avatarPreview ? (
              <img src={avatarPreview} alt={subjectName} />
            ) : (
              <div className="profile-avatar-fallback">
                {(subjectName || "U").charAt(0).toUpperCase()}
              </div>
            )}
            {!isViewingTeammate && (
              <label className="profile-avatar-edit" title="Change avatar">
                <CameraIcon />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ display: "none" }}
                />
              </label>
            )}
          </div>
          <div className="profile-id-meta">
            <p className="profile-eyebrow">
              {isViewingTeammate ? "Teammate" : "You"}
            </p>
            <h2 className="profile-name">{subjectName}</h2>
            <p className="profile-sub">
              {[subjectEmail, subjectOrg].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
        <div className="profile-hero-actions">
          {isViewingTeammate && (
            <Link to="/profile" className="profile-link-btn">
              <ArrowLeftIcon style={{ width: 14, height: 14 }} /> My profile
            </Link>
          )}
          <span className="profile-role-chip">{subjectRole}</span>
        </div>
      </section>

      {/* KPIs */}
      <div className="profile-kpis">
        {statItems.map(({ label, value, Icon, tone }) => (
          <div className="profile-kpi" key={label}>
            <span className={`profile-kpi-icon profile-kpi-icon-${tone}`}>
              <Icon />
            </span>
            <div className="profile-kpi-meta">
              <span className="profile-kpi-value">{loadingProfile ? "—" : value}</span>
              <span className="profile-kpi-label">{label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main two-column */}
      <div className="profile-cols">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {isViewingTeammate ? (
            <article className="profile-card">
              <div className="profile-card-head">
                <h3 className="profile-card-title">About</h3>
                <p className="profile-card-sub">Who this teammate is and how to reach them.</p>
              </div>
              <p className="profile-about">
                {profile.bio || `${subjectName} has not added a profile summary yet.`}
              </p>
              <div className="profile-info-grid" style={{ marginTop: 14 }}>
                <InfoStat label="Timezone" value={profile.timezone || "UTC"} />
                <InfoStat label="Joined" value={joinedLabel || "Unavailable"} />
                <InfoStat label="Last active" value={lastActiveLabel || "Unavailable"} />
              </div>
            </article>
          ) : (
            <article className="profile-card">
              <div className="profile-card-head">
                <h3 className="profile-card-title">Personal information</h3>
                <p className="profile-card-sub">
                  How the team sees you. Used in citations, mentions, and decision audit trails.
                </p>
              </div>
              <form className="profile-form" onSubmit={handleUpdateProfile}>
                <Field
                  label="Full name"
                  type="text"
                  value={profile.full_name}
                  onChange={(event) => setProfile((prev) => ({ ...prev, full_name: event.target.value }))}
                />
                <Field label="Email" type="email" value={subjectEmail} disabled />
                <Field
                  label="Timezone"
                  as="select"
                  value={profile.timezone}
                  onChange={(event) => setProfile((prev) => ({ ...prev, timezone: event.target.value }))}
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
                  placeholder="One sentence on what you own. Helps teammates find the right person."
                />
                <button type="submit" disabled={savingProfile} className="profile-btn profile-btn-primary">
                  {savingProfile ? "Saving…" : "Save changes"}
                </button>
              </form>
            </article>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {!isViewingTeammate && (
            <article className="profile-card">
              <div className="profile-card-head">
                <h3 className="profile-card-title">Security</h3>
                <p className="profile-card-sub">Rotate your password regularly to keep workspace memory safe.</p>
              </div>
              <form className="profile-form" onSubmit={handleChangePassword}>
                <Field
                  label="Current password"
                  type="password"
                  value={passwords.old_password}
                  onChange={(event) => setPasswords((prev) => ({ ...prev, old_password: event.target.value }))}
                />
                <Field
                  label="New password"
                  type="password"
                  value={passwords.new_password}
                  onChange={(event) => setPasswords((prev) => ({ ...prev, new_password: event.target.value }))}
                />
                <Field
                  label="Confirm new password"
                  type="password"
                  value={passwords.confirm_password}
                  onChange={(event) => setPasswords((prev) => ({ ...prev, confirm_password: event.target.value }))}
                />
                <button type="submit" disabled={savingPassword} className="profile-btn profile-btn-ghost">
                  <ShieldCheckIcon />
                  {savingPassword ? "Updating…" : "Change password"}
                </button>
              </form>
            </article>
          )}

          <article className="profile-card">
            <div className="profile-card-head">
              <h3 className="profile-card-title">Recent activity</h3>
              <p className="profile-card-sub">
                {isViewingTeammate
                  ? "Latest conversations, replies, and decisions this teammate touched."
                  : "Latest conversations and bookmarks tied to your record."}
              </p>
            </div>
            <div className="profile-activity">
              {activityItems.length === 0 ? (
                <div className="profile-empty">
                  {isViewingTeammate ? "No teammate activity is visible yet." : "No profile activity yet."}
                </div>
              ) : (
                activityItems.map((item, index) => (
                  <ActivityItem
                    key={`${item.type}-${item.id || index}`}
                    item={item}
                  />
                ))
              )}
            </div>
          </article>
        </div>
      </div>

      {/* Team directory */}
      <article className="profile-card">
        <div className="profile-directory-head">
          <div>
            <h3 className="profile-card-title">Team directory</h3>
            <p className="profile-card-sub">Open teammate profiles without going through admin screens.</p>
          </div>
          <span className="profile-directory-count">
            <UserGroupIcon />
            {directoryMembers.length} member{directoryMembers.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="profile-directory-grid">
          {directoryMembers.length === 0 ? (
            <div className="profile-empty">No team members are available in this workspace yet.</div>
          ) : (
            directoryMembers.map((member) => {
              const memberName = member.full_name || member.username || "Member";
              const isCurrent = member.id === subjectId;
              const isSelfMember = member.id === user?.id;
              return (
                <div key={member.id} className={`profile-directory-card${isCurrent ? " is-current" : ""}`}>
                  <div>
                    <p className="profile-member-name">{memberName}</p>
                    <p className="profile-member-email">{member.email || "—"}</p>
                  </div>
                  <div className="profile-member-foot">
                    <span className={`profile-chip${isCurrent ? " is-active" : ""}`}>
                      {member.role || "member"}
                    </span>
                    {isCurrent ? (
                      <span className="profile-chip is-active">Viewing</span>
                    ) : (
                      <Link
                        to={isSelfMember ? "/profile" : `/profile/${member.id}`}
                        className="profile-link-btn"
                      >
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

function Field({ label, as = "input", children, ...props }) {
  return (
    <label className="profile-field">
      <span className="profile-label">{label}</span>
      {as === "textarea" ? (
        <textarea className="profile-input" {...props} />
      ) : as === "select" ? (
        <select className="profile-input" {...props}>{children}</select>
      ) : (
        <input className="profile-input" {...props} />
      )}
    </label>
  );
}

function InfoStat({ label, value }) {
  return (
    <div className="profile-info-stat">
      <p className="profile-info-stat-label">{label}</p>
      <p className="profile-info-stat-value">{value}</p>
    </div>
  );
}

function ActivityItem({ item }) {
  const { Icon, color } = activityPresentation(item.type);
  const isLink = Boolean(item.href);
  const Wrapper = isLink ? Link : "div";
  const wrapperProps = isLink ? { to: item.href } : {};
  return (
    <Wrapper {...wrapperProps} className="profile-activity-row">
      <Icon style={{ color }} />
      <div style={{ minWidth: 0 }}>
        <p className="profile-activity-title">{item.title || "Untitled activity"}</p>
        <p className="profile-activity-meta">
          {[item.subtitle, formatDate(item.timestamp)].filter(Boolean).join(" · ")}
        </p>
      </div>
    </Wrapper>
  );
}

function activityPresentation(type) {
  if (type === "decision") return { Icon: CheckBadgeIcon, color: "#60a5fa" };
  if (type === "reply") return { Icon: ClockIcon, color: "#34d399" };
  if (type === "bookmark") return { Icon: DocumentTextIcon, color: "#34d399" };
  return { Icon: CalendarDaysIcon, color: "#b095ff" };
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function toTimestamp(value) {
  if (!value) return 0;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  return date.getTime();
}

export default Profile;
