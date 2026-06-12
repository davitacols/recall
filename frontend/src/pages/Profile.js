import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  CameraIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../hooks/useAuth";
import api from "../services/api";
import { useToast } from "../components/Toast";
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
    { label: "Conversations", value: stats.conversations || 0 },
    { label: "Replies", value: stats.replies || 0 },
    { label: "Decisions", value: stats.decisions || 0 },
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
    <div className="pf">
      <header className="pf-header">
        <div className="pf-header-left">
          <div className="pf-avatar">
            {avatarPreview ? (
              <img src={avatarPreview} alt={subjectName} />
            ) : (
              <div className="pf-avatar-fallback">{(subjectName || "U").charAt(0).toUpperCase()}</div>
            )}
            {!isViewingTeammate && (
              <label className="pf-avatar-edit" title="Change avatar">
                <CameraIcon />
                <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: "none" }} />
              </label>
            )}
          </div>
          <div className="pf-header-id">
            <h1 className="pf-name">{subjectName}</h1>
            <p className="pf-sub">{[subjectEmail, subjectOrg].filter(Boolean).join(" · ")}</p>
            <p className="pf-meta">
              <span className="pf-role">{subjectRole}</span>
              {joinedLabel ? <span>· Joined {joinedLabel}</span> : null}
              {lastActiveLabel ? <span>· Last active {lastActiveLabel}</span> : null}
            </p>
          </div>
        </div>
        {isViewingTeammate ? (
          <div className="pf-header-actions">
            <Link to="/profile" className="pf-btn">
              <ArrowLeftIcon /> My profile
            </Link>
          </div>
        ) : null}
      </header>

      {/* Stat strip */}
      <section className="pf-stats">
        {statItems.map(({ label, value }, i) => (
          <div className="pf-stat" key={label}>
            <span className="pf-stat-value">{loadingProfile ? "—" : value}</span>
            <span className="pf-stat-label">{label}</span>
          </div>
        ))}
      </section>

      {/* Two-column grid */}
      <div className="pf-grid">
        <section className="pf-card">
          <header className="pf-card-head">
            <h2>{isViewingTeammate ? "About" : "Personal information"}</h2>
            <p>
              {isViewingTeammate
                ? "Who this teammate is and how to reach them."
                : "How the team sees you. Used in citations, mentions, and decision audit trails."}
            </p>
          </header>
          {isViewingTeammate ? (
            <>
              <p className="pf-bio">
                {profile.bio || `${subjectName} has not added a profile summary yet.`}
              </p>
              <dl className="pf-defs">
                <Def label="Timezone" value={profile.timezone || "UTC"} />
                <Def label="Joined" value={joinedLabel || "—"} />
                <Def label="Last active" value={lastActiveLabel || "—"} />
              </dl>
            </>
          ) : (
            <form className="pf-form" onSubmit={handleUpdateProfile}>
              <Field
                label="Full name"
                type="text"
                value={profile.full_name}
                onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
              />
              <Field label="Email" type="email" value={subjectEmail} disabled />
              <Field
                label="Timezone"
                as="select"
                value={profile.timezone}
                onChange={(e) => setProfile((p) => ({ ...p, timezone: e.target.value }))}
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern (ET)</option>
                <option value="America/Chicago">Central (CT)</option>
                <option value="America/Denver">Mountain (MT)</option>
                <option value="America/Los_Angeles">Pacific (PT)</option>
                <option value="Europe/London">London (GMT)</option>
                <option value="Europe/Paris">Paris (CET)</option>
                <option value="Asia/Tokyo">Tokyo (JST)</option>
              </Field>
              <Field
                label="Bio"
                as="textarea"
                rows={4}
                value={profile.bio}
                onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                placeholder="One sentence on what you own. Helps teammates find the right person."
              />
              <div className="pf-form-actions">
                <button type="submit" disabled={savingProfile} className="pf-btn pf-btn-primary">
                  {savingProfile ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          )}
        </section>

        <div className="pf-col">
          {!isViewingTeammate && (
            <section className="pf-card">
              <header className="pf-card-head">
                <h2>Security</h2>
                <p>Rotate your password regularly.</p>
              </header>
              <form className="pf-form" onSubmit={handleChangePassword}>
                <Field
                  label="Current password"
                  type="password"
                  value={passwords.old_password}
                  onChange={(e) => setPasswords((p) => ({ ...p, old_password: e.target.value }))}
                />
                <Field
                  label="New password"
                  type="password"
                  value={passwords.new_password}
                  onChange={(e) => setPasswords((p) => ({ ...p, new_password: e.target.value }))}
                />
                <Field
                  label="Confirm new password"
                  type="password"
                  value={passwords.confirm_password}
                  onChange={(e) => setPasswords((p) => ({ ...p, confirm_password: e.target.value }))}
                />
                <div className="pf-form-actions">
                  <button type="submit" disabled={savingPassword} className="pf-btn">
                    <ShieldCheckIcon />
                    {savingPassword ? "Updating…" : "Change password"}
                  </button>
                </div>
              </form>
            </section>
          )}

          <section className="pf-card">
            <header className="pf-card-head">
              <h2>Recent activity</h2>
              <p>
                {isViewingTeammate
                  ? "Latest conversations, replies, and decisions."
                  : "Latest conversations and bookmarks tied to your record."}
              </p>
            </header>
            {activityItems.length === 0 ? (
              <p className="pf-empty">
                {isViewingTeammate ? "No teammate activity is visible yet." : "No profile activity yet."}
              </p>
            ) : (
              <ul className="pf-activity">
                {activityItems.map((item, i) => (
                  <ActivityItem key={`${item.type}-${item.id || i}`} item={item} />
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {/* Team directory */}
      <section className="pf-card">
        <header className="pf-card-head pf-card-head-row">
          <div>
            <h2>Team directory</h2>
            <p>Open teammate profiles without going through admin screens.</p>
          </div>
          <span className="pf-count">
            {directoryMembers.length} member{directoryMembers.length === 1 ? "" : "s"}
          </span>
        </header>
        {directoryMembers.length === 0 ? (
          <p className="pf-empty">No team members are available in this workspace yet.</p>
        ) : (
          <table className="pf-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th aria-label="actions" />
              </tr>
            </thead>
            <tbody>
              {directoryMembers.map((member) => {
                const memberName = member.full_name || member.username || "Member";
                const isCurrent = member.id === subjectId;
                const isSelfMember = member.id === user?.id;
                return (
                  <tr key={member.id} className={isCurrent ? "is-current" : ""}>
                    <td>{memberName}</td>
                    <td className="pf-table-muted">{member.email || "—"}</td>
                    <td className="pf-table-muted">{member.role || "member"}</td>
                    <td className="pf-table-right">
                      {isCurrent ? (
                        <span className="pf-table-muted">Viewing</span>
                      ) : (
                        <Link
                          to={isSelfMember ? "/profile" : `/profile/${member.id}`}
                          className="pf-table-link"
                        >
                          {isSelfMember ? "My profile" : "Open profile →"}
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function Def({ label, value }) {
  return (
    <div className="pf-def">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function Field({ label, as = "input", children, ...props }) {
  return (
    <label className="pf-field">
      <span className="pf-label">{label}</span>
      {as === "textarea" ? (
        <textarea className="pf-input" {...props} />
      ) : as === "select" ? (
        <select className="pf-input" {...props}>
          {children}
        </select>
      ) : (
        <input className="pf-input" {...props} />
      )}
    </label>
  );
}

function ActivityItem({ item }) {
  const isLink = Boolean(item.href);
  const Wrapper = isLink ? Link : "li";
  const wrapperProps = isLink ? { to: item.href, className: "pf-activity-row is-link" } : { className: "pf-activity-row" };
  const inner = (
    <>
      <span className="pf-activity-kind">{item.type || "activity"}</span>
      <span className="pf-activity-body">
        <span className="pf-activity-title">{item.title || "Untitled activity"}</span>
        <span className="pf-activity-meta">
          {[item.subtitle, formatDate(item.timestamp)].filter(Boolean).join(" · ")}
        </span>
      </span>
    </>
  );
  if (isLink) {
    return (
      <li className="pf-activity-li">
        <Wrapper {...wrapperProps}>{inner}</Wrapper>
      </li>
    );
  }
  return <Wrapper {...wrapperProps}>{inner}</Wrapper>;
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
