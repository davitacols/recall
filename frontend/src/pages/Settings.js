import React, { useEffect, useMemo, useState } from "react";
import {
  BellIcon,
  BuildingOffice2Icon,
  Cog6ToothIcon,
  MoonIcon,
  ShieldCheckIcon,
  SunIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../utils/ThemeAndAccessibility";
import api from "../services/api";
import { useToast } from "../components/Toast";

async function requestWithFallback(requests) {
  let lastError = null;
  for (let i = 0; i < requests.length; i += 1) {
    try {
      return await requests[i]();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

function Settings() {
  const { user } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const { addToast } = useToast();
  const [isCompact, setIsCompact] = useState(window.innerWidth < 980);

  const [activeSection, setActiveSection] = useState("notifications");
  const [notifications, setNotifications] = useState({
    mention_notifications: true,
    reply_notifications: true,
    decision_notifications: true,
    digest_frequency: "daily",
  });
  const [organization, setOrganization] = useState(null);
  const [members, setMembers] = useState([]);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("contributor");
  const [generatedLink, setGeneratedLink] = useState(null);
  const [orgName, setOrgName] = useState("");
  const [orgDescription, setOrgDescription] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
    if (user?.role === "admin") {
      fetchOrganization();
      fetchMembers();
      fetchPendingInvitations();
    }
  }, [user?.role]);

  useEffect(() => {
    const onResize = () => setIsCompact(window.innerWidth < 980);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const palette = useMemo(
    () =>
      darkMode
        ? {
            pageBg: "#0f0b0d",
            panelBg: "#171215",
            panelAlt: "#1f171c",
            border: "rgba(255,225,193,0.14)",
            text: "#f4ece0",
            muted: "#b8a994",
            accent: "#ffb476",
            softAccent: "rgba(255,180,118,0.13)",
            danger: "#ff8e8e",
          }
        : {
            pageBg: "#f6f1ea",
            panelBg: "#fffaf3",
            panelAlt: "#ffffff",
            border: "#eadfce",
            text: "#231814",
            muted: "#7c6d5a",
            accent: "#d9692e",
            softAccent: "rgba(217,105,46,0.11)",
            danger: "#d14343",
          },
    [darkMode]
  );

  const sections = [
    { id: "notifications", label: "Notifications", icon: BellIcon },
    { id: "appearance", label: "Appearance", icon: Cog6ToothIcon },
    ...(user?.role === "admin"
      ? [
          { id: "organization", label: "Organization", icon: BuildingOffice2Icon },
          { id: "team", label: "Team", icon: UserGroupIcon },
        ]
      : []),
    { id: "privacy", label: "Privacy", icon: ShieldCheckIcon },
  ];

  const fetchSettings = async () => {
    try {
      const response = await requestWithFallback([
        () => api.get("/api/organizations/settings/notifications/"),
        () => api.get("/api/auth/profile/"),
      ]);
      setNotifications({
        mention_notifications: response.data.mention_notifications ?? true,
        reply_notifications: response.data.reply_notifications ?? true,
        decision_notifications: response.data.decision_notifications ?? true,
        digest_frequency: response.data.digest_frequency || "daily",
      });
    } catch (error) {
      addToast("Failed to fetch settings", "error");
    }
  };

  const saveNotificationSettings = async (updated) => {
    setNotifications(updated);
    try {
      await requestWithFallback([
        () => api.put("/api/organizations/settings/notifications/", updated),
        () => api.put("/api/auth/profile/update/", updated),
      ]);
    } catch (error) {
      addToast("Failed to save settings", "error");
      fetchSettings();
    }
  };

  const fetchOrganization = async () => {
    try {
      const response = await api.get("/api/organizations/me/");
      setOrganization(response.data || null);
      setOrgName(response.data?.name || "");
      setOrgDescription(response.data?.description || "");
    } catch (error) {
      addToast("Failed to fetch organization", "error");
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await api.get("/api/organizations/members/");
      setMembers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      addToast("Failed to fetch members", "error");
    }
  };

  const fetchPendingInvitations = async () => {
    try {
      const response = await api.get("/api/organizations/settings/invitation-links/");
      setPendingInvitations(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setPendingInvitations([]);
    }
  };

  const saveOrganization = async () => {
    setLoading(true);
    try {
      await api.put("/api/organizations/me/", {
        name: orgName,
        description: orgDescription,
      });
      addToast("Organization updated", "success");
      await fetchOrganization();
    } catch (error) {
      addToast("Failed to update organization", "error");
    } finally {
      setLoading(false);
    }
  };

  const inviteMember = async () => {
    if (!inviteEmail.trim()) return;
    setLoading(true);
    try {
      const response = await api.post("/api/organizations/invitations/send/", {
        email: inviteEmail,
        role: inviteRole,
      });
      setGeneratedLink(response.data?.invite_link || null);
      setInviteEmail("");
      setInviteRole("contributor");
      addToast("Invitation sent", "success");
      fetchPendingInvitations();
    } catch (error) {
      addToast("Failed to invite member", "error");
    } finally {
      setLoading(false);
    }
  };

  const cancelInvitation = async (invitationId) => {
    try {
      await api.delete(`/api/organizations/invitations/${invitationId}/revoke/`);
      addToast("Invitation canceled", "success");
      setConfirmDelete(null);
      fetchPendingInvitations();
    } catch (error) {
      addToast("Failed to cancel invitation", "error");
    }
  };

  const removeMember = async (memberId) => {
    try {
      await api.delete(`/api/organizations/members/${memberId}/`);
      addToast("Member removed", "success");
      setConfirmDelete(null);
      fetchMembers();
    } catch (error) {
      addToast("Failed to remove member", "error");
    }
  };

  const toggleNotification = (key) => {
    saveNotificationSettings({ ...notifications, [key]: !notifications[key] });
  };

  const changeDigest = (value) => {
    saveNotificationSettings({ ...notifications, digest_frequency: value });
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <section
        style={{
          borderRadius: 18,
          padding: "clamp(16px, 3vw, 24px)",
          background: `linear-gradient(120deg, ${palette.softAccent}, transparent)`,
          border: `1px solid ${palette.border}`,
          display: "grid",
          gap: 12,
        }}
      >
        <p style={{ margin: 0, color: palette.muted, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Knoledgr Controls
        </p>
        <h1 style={{ margin: 0, color: palette.text, fontSize: "clamp(1.35rem, 2.8vw, 2rem)", lineHeight: 1.1 }}>
          Settings
        </h1>
        <p style={{ margin: 0, color: palette.muted, maxWidth: 760, fontSize: 14 }}>
          Manage notifications, appearance, organization, and team operations from one place.
        </p>
      </section>

      <section style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {sections.map((section) => {
            const Icon = section.icon;
            const active = section.id === activeSection;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                style={{
                  borderRadius: 999,
                  border: `1px solid ${palette.border}`,
                  background: active ? palette.panelAlt : "transparent",
                  color: active ? palette.text : palette.muted,
                  padding: "9px 12px",
                  fontSize: 13,
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  cursor: "pointer",
                }}
              >
                <Icon style={{ width: 15, height: 15 }} />
                {section.label}
              </button>
            );
          })}
        </div>

        {activeSection === "notifications" && (
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: isCompact ? "minmax(0,1fr)" : "minmax(0,1.2fr) minmax(300px,1fr)" }}>
            <article style={panel(palette)}>
              <h2 style={title(palette)}>In-App Alerts</h2>
              <p style={subtitle(palette)}>Choose what should trigger an in-app and email notification.</p>
              <div style={{ display: "grid", gap: 8 }}>
                {[
                  { key: "mention_notifications", label: "Mentions", desc: "When someone mentions your name." },
                  { key: "reply_notifications", label: "Replies", desc: "When someone responds to your threads." },
                  { key: "decision_notifications", label: "Decisions", desc: "When decisions are created or updated." },
                ].map((item) => (
                  <div key={item.key} style={row(palette)}>
                    <div>
                      <p style={rowLabel(palette)}>{item.label}</p>
                      <p style={rowDesc(palette)}>{item.desc}</p>
                    </div>
                    <button
                      onClick={() => toggleNotification(item.key)}
                      style={toggleButton(notifications[item.key], palette)}
                      aria-label={`Toggle ${item.label}`}
                    >
                      <span style={toggleKnob(notifications[item.key])} />
                    </button>
                  </div>
                ))}
              </div>
            </article>

            <article style={panel(palette)}>
              <h2 style={title(palette)}>Email Digest</h2>
              <p style={subtitle(palette)}>Control how often you get email summaries.</p>
              <div style={{ display: "grid", gap: 7 }}>
                {["realtime", "hourly", "daily", "weekly", "never"].map((value) => (
                  <button
                    key={value}
                    onClick={() => changeDigest(value)}
                    style={{
                      borderRadius: 10,
                      border: `1px solid ${palette.border}`,
                      padding: "10px 11px",
                      textAlign: "left",
                      background: notifications.digest_frequency === value ? palette.panelAlt : "transparent",
                      color: notifications.digest_frequency === value ? palette.text : palette.muted,
                      fontWeight: 700,
                      textTransform: "capitalize",
                      cursor: "pointer",
                    }}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </article>
          </div>
        )}

        {activeSection === "appearance" && (
          <article style={panel(palette)}>
            <h2 style={title(palette)}>Theme</h2>
            <p style={subtitle(palette)}>Use one-click theme switching across all pages.</p>
            <div style={{ display: "grid", gap: 8, gridTemplateColumns: isCompact ? "minmax(0,1fr)" : "repeat(2,minmax(0,1fr))" }}>
              <button onClick={() => darkMode && toggleDarkMode()} style={themeCard(!darkMode, palette)}>
                <SunIcon style={{ width: 18, height: 18 }} />
                <span>Light Mode</span>
              </button>
              <button onClick={() => !darkMode && toggleDarkMode()} style={themeCard(darkMode, palette)}>
                <MoonIcon style={{ width: 18, height: 18 }} />
                <span>Dark Mode</span>
              </button>
            </div>
          </article>
        )}

        {activeSection === "organization" && user?.role === "admin" && (
          <article style={panel(palette)}>
            <h2 style={title(palette)}>Organization Profile</h2>
            <p style={subtitle(palette)}>Update your workspace identity and description.</p>
            <div style={{ display: "grid", gap: 10 }}>
              <Input label="Organization Name" value={orgName} onChange={(event) => setOrgName(event.target.value)} palette={palette} />
              <Input
                label="Description"
                as="textarea"
                rows={4}
                value={orgDescription}
                onChange={(event) => setOrgDescription(event.target.value)}
                palette={palette}
              />
              <button
                onClick={saveOrganization}
                disabled={loading}
                style={{
                  width: "fit-content",
                  borderRadius: 10,
                  border: `1px solid ${palette.border}`,
                  background: palette.accent,
                  color: "#1d130f",
                  padding: "10px 14px",
                  fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? "Saving..." : "Save Organization"}
              </button>
            </div>
            {organization && (
              <p style={{ margin: "10px 0 0", color: palette.muted, fontSize: 12 }}>
                Workspace slug: {organization.slug || "n/a"}
              </p>
            )}
          </article>
        )}

        {activeSection === "team" && user?.role === "admin" && (
          <div style={{ display: "grid", gap: 12 }}>
            <article style={panel(palette)}>
              <h2 style={title(palette)}>Invite Team Member</h2>
              <p style={subtitle(palette)}>Create an invite by email and role.</p>
              <div style={{ display: "grid", gap: 10, gridTemplateColumns: isCompact ? "minmax(0,1fr)" : "minmax(0,1.4fr) minmax(160px,1fr) auto" }}>
                <Input label="Email" type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} palette={palette} />
                <Input as="select" label="Role" value={inviteRole} onChange={(event) => setInviteRole(event.target.value)} palette={palette}>
                  <option value="contributor">Contributor</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </Input>
                <button
                  onClick={inviteMember}
                  disabled={loading}
                  style={{
                    marginTop: isCompact ? 0 : 26,
                    height: 40,
                    borderRadius: 10,
                    border: `1px solid ${palette.border}`,
                    background: palette.accent,
                    color: "#1d130f",
                    padding: "0 14px",
                    fontWeight: 700,
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  Send Invite
                </button>
              </div>
              {generatedLink && (
                <div style={{ marginTop: 12, borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.panelAlt, padding: 10 }}>
                  <p style={{ margin: "0 0 6px", color: palette.text, fontWeight: 700 }}>Invitation Link</p>
                  <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8 }}>
                    <input readOnly value={generatedLink} style={linkInput(palette)} />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedLink);
                        addToast("Link copied", "success");
                      }}
                      style={{ ...copyButton(palette), cursor: "pointer" }}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </article>

            {pendingInvitations.length > 0 && (
              <article style={panel(palette)}>
                <h2 style={title(palette)}>Pending Invitations ({pendingInvitations.length})</h2>
                <div style={{ display: "grid", gap: 8 }}>
                  {pendingInvitations.map((invitation) => (
                    <div key={invitation.id} style={memberRow(palette)}>
                      <div>
                        <p style={rowLabel(palette)}>{invitation.email}</p>
                        <p style={rowDesc(palette)}>Role: {invitation.role}</p>
                      </div>
                      <button
                        onClick={() => setConfirmDelete({ type: "invitation", id: invitation.id })}
                        style={dangerButton(palette)}
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              </article>
            )}

            <article style={panel(palette)}>
              <h2 style={title(palette)}>Team Members ({members.length})</h2>
              <div style={{ display: "grid", gap: 8 }}>
                {members.map((member) => (
                  <div key={member.id} style={memberRow(palette)}>
                    <div style={{ minWidth: 0 }}>
                      <p style={rowLabel(palette)}>{member.full_name || member.username || "Member"}</p>
                      <p style={rowDesc(palette)}>{member.email}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={chip(palette)}>{member.role}</span>
                      {member.id !== user?.id && (
                        <button onClick={() => setConfirmDelete({ type: "member", id: member.id })} style={dangerButton(palette)}>
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </div>
        )}

        {activeSection === "privacy" && (
          <article style={panel(palette)}>
            <h2 style={title(palette)}>Privacy & Data</h2>
            <p style={subtitle(palette)}>Your data is scoped to your workspace. Contact support for data export and deletion requests.</p>
          </article>
        )}
      </section>

      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.52)", display: "grid", placeItems: "center", zIndex: 90, padding: 16 }}>
          <div style={{ width: "min(460px,100%)", borderRadius: 16, background: palette.panelBg, border: `1px solid ${palette.border}`, padding: 16 }}>
            <h3 style={{ margin: 0, color: palette.text, fontSize: 20 }}>
              {confirmDelete.type === "invitation" ? "Cancel Invitation?" : "Remove Member?"}
            </h3>
            <p style={{ margin: "6px 0 14px", color: palette.muted, fontSize: 13 }}>
              {confirmDelete.type === "invitation"
                ? "This invitation can no longer be used."
                : "This user will lose access to your workspace."}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                onClick={() => setConfirmDelete(null)}
                style={{ borderRadius: 9, border: `1px solid ${palette.border}`, background: "transparent", color: palette.text, padding: "8px 12px", cursor: "pointer" }}
              >
                Keep
              </button>
              <button
                onClick={() => {
                  if (confirmDelete.type === "invitation") {
                    cancelInvitation(confirmDelete.id);
                  } else {
                    removeMember(confirmDelete.id);
                  }
                }}
                style={{ ...dangerButton(palette), padding: "8px 12px" }}
              >
                {confirmDelete.type === "invitation" ? "Cancel Invite" : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function panel(palette) {
  return {
    borderRadius: 16,
    background: palette.panelBg,
    border: `1px solid ${palette.border}`,
    padding: 16,
    display: "grid",
    gap: 10,
  };
}

function title(palette) {
  return { margin: 0, color: palette.text, fontSize: 19 };
}

function subtitle(palette) {
  return { margin: "0 0 2px", color: palette.muted, fontSize: 13 };
}

function row(palette) {
  return {
    borderRadius: 11,
    border: `1px solid ${palette.border}`,
    background: palette.panelAlt,
    padding: "10px 11px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  };
}

function rowLabel(palette) {
  return { margin: 0, color: palette.text, fontSize: 14, fontWeight: 700 };
}

function rowDesc(palette) {
  return { margin: "2px 0 0", color: palette.muted, fontSize: 12 };
}

function toggleButton(active, palette) {
  return {
    width: 44,
    height: 24,
    borderRadius: 999,
    border: `1px solid ${palette.border}`,
    background: active ? palette.accent : palette.pageBg,
    cursor: "pointer",
    padding: 2,
    display: "flex",
    alignItems: "center",
    justifyContent: active ? "flex-end" : "flex-start",
  };
}

function toggleKnob(active) {
  return {
    width: 18,
    height: 18,
    borderRadius: "50%",
    background: active ? "#1d130f" : "#ffffff",
    boxShadow: "0 1px 2px rgba(0,0,0,0.22)",
  };
}

function themeCard(active, palette) {
  return {
    borderRadius: 12,
    border: `1px solid ${palette.border}`,
    background: active ? palette.panelAlt : "transparent",
    color: active ? palette.text : palette.muted,
    padding: "12px 14px",
    fontWeight: 700,
    fontSize: 14,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    cursor: "pointer",
    justifyContent: "center",
  };
}

function memberRow(palette) {
  return {
    borderRadius: 11,
    border: `1px solid ${palette.border}`,
    background: palette.panelAlt,
    padding: "10px 11px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  };
}

function chip(palette) {
  return {
    borderRadius: 999,
    border: `1px solid ${palette.border}`,
    color: palette.muted,
    padding: "4px 8px",
    fontSize: 11,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  };
}

function dangerButton(palette) {
  return {
    borderRadius: 9,
    border: `1px solid ${palette.danger}`,
    background: "transparent",
    color: palette.danger,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  };
}

function linkInput(palette) {
  return {
    borderRadius: 9,
    border: `1px solid ${palette.border}`,
    background: palette.pageBg,
    color: palette.text,
    padding: "8px 9px",
    fontSize: 12,
    width: "100%",
  };
}

function copyButton(palette) {
  return {
    borderRadius: 9,
    border: `1px solid ${palette.border}`,
    background: palette.accent,
    color: "#1d130f",
    padding: "8px 11px",
    fontWeight: 700,
  };
}

function Input({ label, as = "input", palette, children, ...props }) {
  const style = {
    width: "100%",
    borderRadius: 10,
    border: `1px solid ${palette.border}`,
    background: palette.panelAlt,
    color: palette.text,
    padding: "10px 11px",
    fontSize: 14,
    outline: "none",
  };

  return (
    <label style={{ display: "grid", gap: 6 }}>
      {label && (
        <span style={{ color: palette.muted, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {label}
        </span>
      )}
      {as === "textarea" ? (
        <textarea {...props} style={style} />
      ) : as === "select" ? (
        <select {...props} style={style}>
          {children}
        </select>
      ) : (
        <input {...props} style={style} />
      )}
    </label>
  );
}

export default Settings;
