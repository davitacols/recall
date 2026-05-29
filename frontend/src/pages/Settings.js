import React, { useEffect, useMemo, useState } from "react";
import {
  BellIcon,
  BuildingOffice2Icon,
  Cog6ToothIcon,
  PlusIcon,
  ShieldCheckIcon,
  TrashIcon,
  UserGroupIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { useToast } from "../components/Toast";
import {
  Avatar,
  Button,
  EmptyState,
  Field,
  IconButton,
  Lozenge,
  PageHeader,
  SectionMessage,
} from "../components/atlas";

const ROLES = ["admin", "manager", "contributor", "viewer"];

async function requestWithFallback(requests) {
  let lastError = null;
  for (const fn of requests) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

export default function Settings() {
  const { user } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const { addToast } = useToast?.() || { addToast: () => {} };
  const [section, setSection] = useState("notifications");
  const [notifications, setNotifications] = useState({
    mention_notifications: true,
    reply_notifications: true,
    decision_notifications: true,
    digest_frequency: "daily",
  });
  const [experienceMode, setExperienceMode] = useState(
    typeof window !== "undefined" ? localStorage.getItem("ui_experience_mode") || "standard" : "standard"
  );
  const [organization, setOrganization] = useState(null);
  const [orgName, setOrgName] = useState("");
  const [orgDescription, setOrgDescription] = useState("");
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("contributor");
  const [showInvite, setShowInvite] = useState(false);
  const [busy, setBusy] = useState(false);

  const isAdmin = user?.role === "admin";

  const sections = useMemo(
    () =>
      [
        { id: "notifications", label: "Notifications", icon: BellIcon },
        { id: "appearance", label: "Appearance", icon: Cog6ToothIcon },
        isAdmin ? { id: "organization", label: "Organization", icon: BuildingOffice2Icon } : null,
        isAdmin ? { id: "team", label: "Team", icon: UserGroupIcon } : null,
        { id: "privacy", label: "Privacy", icon: ShieldCheckIcon },
      ].filter(Boolean),
    [isAdmin]
  );

  useEffect(() => {
    fetchSettings();
    if (isAdmin) {
      fetchOrganization();
      fetchMembers();
      fetchInvitations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const fetchSettings = async () => {
    try {
      const res = await requestWithFallback([
        () => api.get("/api/organizations/settings/notifications/"),
        () => api.get("/api/auth/profile/"),
      ]);
      setNotifications({
        mention_notifications: res.data.mention_notifications ?? true,
        reply_notifications: res.data.reply_notifications ?? true,
        decision_notifications: res.data.decision_notifications ?? true,
        digest_frequency: res.data.digest_frequency || "daily",
      });
      setExperienceMode(res.data.experience_mode || "standard");
    } catch (_) {}
  };

  const saveNotifications = async (next) => {
    setNotifications(next);
    try {
      await requestWithFallback([
        () => api.put("/api/organizations/settings/notifications/", next),
        () => api.put("/api/auth/profile/update/", next),
      ]);
      addToast?.("Notification settings saved", "success");
    } catch (_) {
      addToast?.("Failed to save settings", "error");
    }
  };

  const saveExperience = async (mode) => {
    setExperienceMode(mode);
    try {
      localStorage.setItem("ui_experience_mode", mode);
      window.dispatchEvent(new Event("experience-mode-changed"));
    } catch (_) {}
    try {
      await requestWithFallback([
        () => api.put("/api/organizations/settings/experience/", { experience_mode: mode }),
        () => api.put("/api/organizations/settings/profile/", { experience_mode: mode }),
      ]);
    } catch (_) {}
  };

  const fetchOrganization = async () => {
    try {
      const res = await api.get("/api/organizations/me/");
      setOrganization(res.data);
      setOrgName(res.data?.name || "");
      setOrgDescription(res.data?.description || "");
    } catch (_) {}
  };

  const fetchMembers = async () => {
    try {
      const res = await api.get("/api/organizations/members/");
      setMembers(Array.isArray(res.data) ? res.data : res.data?.results || []);
    } catch (_) {}
  };

  const fetchInvitations = async () => {
    try {
      const res = await api.get("/api/organizations/settings/invitation-links/");
      setInvitations(Array.isArray(res.data) ? res.data : []);
    } catch (_) {
      setInvitations([]);
    }
  };

  const saveOrganization = async () => {
    setBusy(true);
    try {
      await api.put("/api/organizations/me/", { name: orgName, description: orgDescription });
      addToast?.("Organization updated", "success");
      await fetchOrganization();
    } catch (err) {
      addToast?.("Failed to update organization", "error");
    } finally {
      setBusy(false);
    }
  };

  const sendInvite = async () => {
    if (!inviteEmail.trim()) return;
    setBusy(true);
    try {
      await api.post("/api/organizations/invitations/send/", { email: inviteEmail, role: inviteRole });
      addToast?.("Invitation sent", "success");
      setInviteEmail("");
      setInviteRole("contributor");
      setShowInvite(false);
      await fetchInvitations();
    } catch (_) {
      addToast?.("Failed to invite member", "error");
    } finally {
      setBusy(false);
    }
  };

  const cancelInvitation = async (id) => {
    try {
      await api.delete(`/api/organizations/invitations/${id}/revoke/`);
      addToast?.("Invitation canceled", "success");
      await fetchInvitations();
    } catch (_) {
      addToast?.("Failed to cancel invitation", "error");
    }
  };

  const removeMember = async (id) => {
    if (!window.confirm("Remove this member from the workspace?")) return;
    try {
      await api.delete(`/api/organizations/members/${id}/`);
      addToast?.("Member removed", "success");
      await fetchMembers();
    } catch (_) {
      addToast?.("Failed to remove member", "error");
    }
  };

  return (
    <div style={{ padding: "0 32px 32px" }}>
      <PageHeader
        breadcrumb={[{ label: "Knoledgr", to: "/" }, { label: "Settings" }]}
        title="Settings"
        subtitle="Control workspace configuration, access, and product behavior."
        style={{ padding: "24px 0 0", background: "transparent" }}
      />

      <div style={layout}>
        <nav style={sideNav}>
          {sections.map((s) => {
            const Icon = s.icon;
            const active = section === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSection(s.id)}
                className={`atlas-sidebar-item ${active ? "is-active" : ""}`}
                style={{ margin: "2px 0", width: "100%", borderRadius: 3 }}
              >
                <Icon style={{ width: 14, height: 14 }} />
                <span style={{ flex: 1 }}>{s.label}</span>
              </button>
            );
          })}
        </nav>

        <section style={content}>
          {section === "notifications" ? (
            <NotificationsSection settings={notifications} onSave={saveNotifications} />
          ) : null}
          {section === "appearance" ? (
            <AppearanceSection
              darkMode={darkMode}
              onToggleDark={toggleDarkMode}
              experienceMode={experienceMode}
              onSetExperience={saveExperience}
            />
          ) : null}
          {section === "organization" && isAdmin ? (
            <OrganizationSection
              organization={organization}
              orgName={orgName}
              setOrgName={setOrgName}
              orgDescription={orgDescription}
              setOrgDescription={setOrgDescription}
              onSave={saveOrganization}
              busy={busy}
            />
          ) : null}
          {section === "team" && isAdmin ? (
            <TeamSection
              members={members}
              invitations={invitations}
              onInvite={() => setShowInvite(true)}
              onCancelInvite={cancelInvitation}
              onRemove={removeMember}
            />
          ) : null}
          {section === "privacy" ? <PrivacySection /> : null}
        </section>
      </div>

      {showInvite ? (
        <Modal title="Invite member" onClose={() => setShowInvite(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Email" isRequired>
              <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="atlas-input" type="email" autoFocus />
            </Field>
            <Field label="Role">
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="atlas-input">
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button appearance="subtle" onClick={() => setShowInvite(false)}>Cancel</Button>
              <Button appearance="primary" onClick={sendInvite} isDisabled={busy || !inviteEmail.trim()}>
                {busy ? "Sending…" : "Send invitation"}
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function NotificationsSection({ settings, onSave }) {
  return (
    <Panel title="Notifications" description="Choose which events trigger notifications and how often you receive digests.">
      <Toggle
        label="Mention notifications"
        description="Notify me when someone @mentions me."
        checked={settings.mention_notifications}
        onChange={(v) => onSave({ ...settings, mention_notifications: v })}
      />
      <Toggle
        label="Reply notifications"
        description="Notify me when someone replies to my thread."
        checked={settings.reply_notifications}
        onChange={(v) => onSave({ ...settings, reply_notifications: v })}
      />
      <Toggle
        label="Decision notifications"
        description="Notify me when a decision is committed in this workspace."
        checked={settings.decision_notifications}
        onChange={(v) => onSave({ ...settings, decision_notifications: v })}
      />
      <Field label="Digest frequency" helpText="How often we email a digest of activity.">
        <select
          value={settings.digest_frequency}
          onChange={(e) => onSave({ ...settings, digest_frequency: e.target.value })}
          className="atlas-input"
          style={{ maxWidth: 200 }}
        >
          <option value="off">Off</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
        </select>
      </Field>
    </Panel>
  );
}

function AppearanceSection({ darkMode, onToggleDark, experienceMode, onSetExperience }) {
  return (
    <Panel title="Appearance" description="Tune theme and how much complexity the workspace shows you.">
      <Toggle label="Dark theme" description="Use a darker interface in low-light environments." checked={darkMode} onChange={onToggleDark} />
      <Field label="Experience mode" helpText="Hide advanced surfaces for a simpler workspace.">
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { id: "simple", label: "Simple", hint: "Hide advanced surfaces" },
            { id: "standard", label: "Standard", hint: "Default workspace" },
            { id: "power", label: "Power", hint: "All surfaces enabled" },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onSetExperience(m.id)}
              style={{
                ...modePill,
                background: experienceMode === m.id ? "var(--b50)" : "var(--app-surface-alt)",
                borderColor: experienceMode === m.id ? "var(--b400)" : "var(--app-border)",
                color: experienceMode === m.id ? "var(--b500)" : "var(--app-text)",
              }}
            >
              <strong>{m.label}</strong>
              <span style={{ marginLeft: 6, fontSize: 11, color: "var(--app-muted)" }}>· {m.hint}</span>
            </button>
          ))}
        </div>
      </Field>
    </Panel>
  );
}

function OrganizationSection({ organization, orgName, setOrgName, orgDescription, setOrgDescription, onSave, busy }) {
  return (
    <Panel title="Organization" description="Edit your workspace identity.">
      <Field label="Name" isRequired>
        <input value={orgName} onChange={(e) => setOrgName(e.target.value)} className="atlas-input" />
      </Field>
      <Field label="Description">
        <textarea value={orgDescription} onChange={(e) => setOrgDescription(e.target.value)} className="atlas-input" rows={4} />
      </Field>
      {organization?.slug ? (
        <Field label="Slug" helpText="Workspace URL identifier.">
          <input value={organization.slug} className="atlas-input" disabled />
        </Field>
      ) : null}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button appearance="primary" onClick={onSave} isDisabled={busy || !orgName.trim()}>
          {busy ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </Panel>
  );
}

function TeamSection({ members, invitations, onInvite, onCancelInvite, onRemove }) {
  return (
    <Panel
      title="Team"
      description="Manage members and pending invitations."
      action={
        <Button appearance="primary" iconBefore={<PlusIcon style={{ width: 14, height: 14 }} />} onClick={onInvite}>
          Invite member
        </Button>
      }
    >
      <h4 style={subheading}>Members <span style={{ fontWeight: 400, color: "var(--app-muted)" }}>· {members.length}</span></h4>
      {members.length === 0 ? (
        <EmptyState title="No members" description="Invite teammates to start collaborating." />
      ) : (
        <div style={tableWrap}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--app-surface-alt)" }}>
                <th style={th}>Name</th>
                <th style={th}>Role</th>
                <th style={th}>Email</th>
                <th style={{ ...th, textAlign: "right" }} />
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id || m.user_id} style={{ borderBottom: "1px solid var(--app-border-subtle)" }}>
                  <td style={td}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <Avatar size="sm" name={m.full_name || m.email} />
                      <span>{m.full_name || m.email}</span>
                    </span>
                  </td>
                  <td style={td}><Lozenge>{m.role || "contributor"}</Lozenge></td>
                  <td style={td}><span style={{ color: "var(--app-muted)", fontSize: 13 }}>{m.email}</span></td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <Button appearance="subtle" size="sm" onClick={() => onRemove(m.id || m.user_id)}>Remove</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h4 style={{ ...subheading, marginTop: 24 }}>Pending invitations <span style={{ fontWeight: 400, color: "var(--app-muted)" }}>· {invitations.length}</span></h4>
      {invitations.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--app-muted)" }}>No pending invitations.</p>
      ) : (
        <div style={tableWrap}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--app-surface-alt)" }}>
                <th style={th}>Email</th>
                <th style={th}>Role</th>
                <th style={th}>Sent</th>
                <th style={{ ...th, textAlign: "right" }} />
              </tr>
            </thead>
            <tbody>
              {invitations.map((inv) => (
                <tr key={inv.id} style={{ borderBottom: "1px solid var(--app-border-subtle)" }}>
                  <td style={td}>{inv.email}</td>
                  <td style={td}><Lozenge>{inv.role}</Lozenge></td>
                  <td style={td}><span style={{ color: "var(--app-muted)", fontSize: 13 }}>{inv.created_at ? new Date(inv.created_at).toLocaleDateString() : "—"}</span></td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <Button appearance="subtle" size="sm" iconBefore={<TrashIcon style={{ width: 12, height: 12 }} />} onClick={() => onCancelInvite(inv.id)}>
                      Cancel
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function PrivacySection() {
  return (
    <Panel title="Privacy" description="How Knoledgr handles your data.">
      <SectionMessage tone="info">
        Your workspace data stays in this tenant. Export or delete it from the Profile page.
      </SectionMessage>
    </Panel>
  );
}

function Panel({ title, description, action, children }) {
  return (
    <div style={{ background: "var(--app-surface)", border: "1px solid var(--app-border)", borderRadius: 4, padding: 24 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 8 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500, color: "var(--app-text)" }}>{title}</h2>
          {description ? <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--app-muted)" }}>{description}</p> : null}
        </div>
        {action}
      </div>
      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 16 }}>{children}</div>
    </div>
  );
}

function Toggle({ label, description, checked, onChange }) {
  return (
    <label style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, cursor: "pointer", padding: "8px 0", borderBottom: "1px solid var(--app-border-subtle)" }}>
      <div>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "var(--app-text)" }}>{label}</p>
        {description ? <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--app-muted)" }}>{description}</p> : null}
      </div>
      <span style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}>
        <input
          type="checkbox"
          checked={!!checked}
          onChange={(e) => onChange?.(e.target.checked)}
          style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", margin: 0, cursor: "pointer" }}
        />
        <span
          style={{
            width: 32,
            height: 18,
            borderRadius: 999,
            background: checked ? "var(--b400)" : "var(--n50)",
            position: "relative",
            transition: "background 120ms ease",
          }}
        >
          <span
            style={{
              position: "absolute",
              top: 2,
              left: checked ? 16 : 2,
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: "#FFFFFF",
              transition: "left 120ms ease",
            }}
          />
        </span>
      </span>
    </label>
  );
}

function Modal({ children, onClose, title, width = 480 }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "var(--app-overlay)", zIndex: 199 }} />
      <div role="dialog" aria-modal="true" style={{ position: "fixed", top: "10vh", left: "50%", transform: "translateX(-50%)", width, maxWidth: "calc(100vw - 32px)", background: "var(--app-surface-overlay)", border: "1px solid var(--app-border)", borderRadius: 6, boxShadow: "var(--ui-shadow-lg)", zIndex: 200, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--app-border)" }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{title}</h2>
          <IconButton icon={<XMarkIcon style={{ width: 16, height: 16 }} />} label="Close" onClick={onClose} />
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </>
  );
}

const layout = {
  marginTop: 16,
  display: "grid",
  gridTemplateColumns: "220px minmax(0, 1fr)",
  gap: 24,
  alignItems: "start",
};

const sideNav = {
  position: "sticky",
  top: 72,
  background: "var(--app-surface)",
  border: "1px solid var(--app-border)",
  borderRadius: 4,
  padding: 8,
};

const content = {
  minWidth: 0,
};

const modePill = {
  display: "inline-flex",
  alignItems: "center",
  padding: "8px 12px",
  border: "1px solid var(--app-border)",
  borderRadius: 3,
  background: "var(--app-surface-alt)",
  fontFamily: "inherit",
  fontSize: 13,
  cursor: "pointer",
};

const tableWrap = { background: "var(--app-surface)", border: "1px solid var(--app-border)", borderRadius: 4, overflow: "hidden", marginTop: 8 };
const th = { textAlign: "left", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--app-muted)", padding: "10px 16px", borderBottom: "1px solid var(--app-border)" };
const td = { padding: "10px 16px", fontSize: 14, color: "var(--app-text)", verticalAlign: "middle" };
const subheading = { margin: "16px 0 8px", fontSize: 14, fontWeight: 600, color: "var(--app-text)" };
