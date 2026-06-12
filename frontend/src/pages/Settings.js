import React, { useEffect, useMemo, useState } from "react";
import {
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { useToast } from "../components/Toast";
import "./Settings.css";

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
        { id: "notifications", label: "Notifications" },
        { id: "appearance", label: "Appearance" },
        isAdmin ? { id: "organization", label: "Organization" } : null,
        isAdmin ? { id: "team", label: "Team" } : null,
        { id: "privacy", label: "Privacy" },
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
    <div className="st">
      <header className="st-header">
        <h1 className="st-title">Settings</h1>
        <p className="st-sub">Workspace configuration, access, and product behavior.</p>
      </header>

      <div className="st-grid">
        <nav className="st-nav" aria-label="Settings sections">
          {sections.map((s) => {
            const active = section === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSection(s.id)}
                className={`st-nav-item${active ? " is-active" : ""}`}
              >
                {s.label}
              </button>
            );
          })}
        </nav>

        <section className="st-content">
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
          <div className="st-form">
            <Field label="Email" required>
              <input
                className="st-input"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                type="email"
                autoFocus
              />
            </Field>
            <Field label="Role">
              <select
                className="st-input"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>
            <div className="st-modal-actions">
              <button type="button" className="st-btn" onClick={() => setShowInvite(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="st-btn st-btn-primary"
                onClick={sendInvite}
                disabled={busy || !inviteEmail.trim()}
              >
                {busy ? "Sending…" : "Send invitation"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

/* ─── sections ─────────────────────────────────────────── */

function NotificationsSection({ settings, onSave }) {
  return (
    <Panel
      title="Notifications"
      description="Choose which events notify you and how often you receive digests."
    >
      <Toggle
        label="Mentions"
        description="Notify me when someone @-mentions me."
        checked={settings.mention_notifications}
        onChange={(v) => onSave({ ...settings, mention_notifications: v })}
      />
      <Toggle
        label="Replies"
        description="Notify me when someone replies to my thread."
        checked={settings.reply_notifications}
        onChange={(v) => onSave({ ...settings, reply_notifications: v })}
      />
      <Toggle
        label="Decisions"
        description="Notify me when a decision is committed."
        checked={settings.decision_notifications}
        onChange={(v) => onSave({ ...settings, decision_notifications: v })}
      />
      <Field label="Digest frequency" hint="How often we email a digest of activity.">
        <select
          className="st-input"
          style={{ maxWidth: 220 }}
          value={settings.digest_frequency}
          onChange={(e) => onSave({ ...settings, digest_frequency: e.target.value })}
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
  const modes = [
    { id: "simple", label: "Simple", hint: "Hide advanced surfaces" },
    { id: "standard", label: "Standard", hint: "Default workspace" },
    { id: "power", label: "Power", hint: "All surfaces enabled" },
  ];
  return (
    <Panel title="Appearance" description="Tune theme and how much complexity the workspace shows you.">
      <Toggle
        label="Dark theme"
        description="Use a darker interface in low-light environments."
        checked={darkMode}
        onChange={onToggleDark}
      />
      <Field label="Experience mode" hint="Hide advanced surfaces for a simpler workspace.">
        <div className="st-segmented">
          {modes.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onSetExperience(m.id)}
              className={`st-seg${experienceMode === m.id ? " is-active" : ""}`}
            >
              <span>{m.label}</span>
              <span className="st-seg-hint">{m.hint}</span>
            </button>
          ))}
        </div>
      </Field>
    </Panel>
  );
}

function OrganizationSection({
  organization,
  orgName,
  setOrgName,
  orgDescription,
  setOrgDescription,
  onSave,
  busy,
}) {
  return (
    <Panel title="Organization" description="Edit your workspace identity.">
      <Field label="Name" required>
        <input className="st-input" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
      </Field>
      <Field label="Description">
        <textarea
          className="st-input"
          value={orgDescription}
          onChange={(e) => setOrgDescription(e.target.value)}
          rows={4}
        />
      </Field>
      {organization?.slug ? (
        <Field label="Slug" hint="Workspace URL identifier.">
          <input className="st-input" value={organization.slug} disabled />
        </Field>
      ) : null}
      <div className="st-form-actions">
        <button
          type="button"
          className="st-btn st-btn-primary"
          onClick={onSave}
          disabled={busy || !orgName.trim()}
        >
          {busy ? "Saving…" : "Save changes"}
        </button>
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
        <button type="button" className="st-btn st-btn-primary" onClick={onInvite}>
          <PlusIcon /> Invite member
        </button>
      }
    >
      <h4 className="st-subhead">
        Members <span className="st-count">· {members.length}</span>
      </h4>
      {members.length === 0 ? (
        <p className="st-empty">No members yet. Invite teammates to start collaborating.</p>
      ) : (
        <table className="st-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Email</th>
              <th aria-label="actions" />
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id || m.user_id}>
                <td>{m.full_name || m.email}</td>
                <td className="st-table-muted">{m.role || "contributor"}</td>
                <td className="st-table-muted">{m.email}</td>
                <td className="st-table-right">
                  <button
                    type="button"
                    className="st-table-link"
                    onClick={() => onRemove(m.id || m.user_id)}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h4 className="st-subhead" style={{ marginTop: 24 }}>
        Pending invitations <span className="st-count">· {invitations.length}</span>
      </h4>
      {invitations.length === 0 ? (
        <p className="st-empty">No pending invitations.</p>
      ) : (
        <table className="st-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Sent</th>
              <th aria-label="actions" />
            </tr>
          </thead>
          <tbody>
            {invitations.map((inv) => (
              <tr key={inv.id}>
                <td>{inv.email}</td>
                <td className="st-table-muted">{inv.role}</td>
                <td className="st-table-muted">
                  {inv.created_at ? new Date(inv.created_at).toLocaleDateString() : "—"}
                </td>
                <td className="st-table-right">
                  <button
                    type="button"
                    className="st-table-link"
                    onClick={() => onCancelInvite(inv.id)}
                  >
                    <TrashIcon /> Cancel
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}

function PrivacySection() {
  return (
    <Panel title="Privacy" description="How Knoledgr handles your data.">
      <p className="st-info">
        Your workspace data stays in this tenant. Export or delete it from the Profile page.
      </p>
    </Panel>
  );
}

/* ─── building blocks ─────────────────────────────────── */

function Panel({ title, description, action, children }) {
  return (
    <article className="st-panel">
      <header className="st-panel-head">
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {action}
      </header>
      <div className="st-panel-body">{children}</div>
    </article>
  );
}

function Field({ label, hint, required, children }) {
  return (
    <label className="st-field">
      <span className="st-field-label">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </span>
      {children}
      {hint ? <span className="st-field-hint">{hint}</span> : null}
    </label>
  );
}

function Toggle({ label, description, checked, onChange }) {
  return (
    <label className="st-toggle">
      <span className="st-toggle-text">
        <span className="st-toggle-label">{label}</span>
        {description ? <span className="st-toggle-desc">{description}</span> : null}
      </span>
      <span className="st-toggle-switch">
        <input
          type="checkbox"
          checked={!!checked}
          onChange={(e) => onChange?.(e.target.checked)}
        />
        <span className="st-toggle-track">
          <span className="st-toggle-thumb" />
        </span>
      </span>
    </label>
  );
}

function Modal({ children, onClose, title }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <>
      <div className="st-modal-back" onClick={onClose} />
      <div role="dialog" aria-modal="true" className="st-modal">
        <header className="st-modal-head">
          <h2>{title}</h2>
          <button type="button" className="st-modal-close" onClick={onClose} aria-label="Close">
            <XMarkIcon />
          </button>
        </header>
        <div className="st-modal-body">{children}</div>
      </div>
    </>
  );
}
