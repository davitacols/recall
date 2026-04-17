import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowPathIcon,
  ClipboardDocumentIcon,
  EnvelopeIcon,
  LinkIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import UpgradeNotice from "../components/UpgradeNotice";
import { useToast } from "../components/Toast";
import { WorkspaceEmptyState, WorkspaceHero, WorkspacePanel, WorkspaceToolbar } from "../components/WorkspaceChrome";
import api from "../services/api";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";

const ROLE_OPTIONS = [
  { value: "contributor", label: "Contributor" },
  { value: "manager", label: "Manager" },
  { value: "admin", label: "Admin" },
];

export default function StaffInvitations() {
  const { addToast } = useToast();
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const [invitations, setInvitations] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("contributor");
  const [generatedLink, setGeneratedLink] = useState("");
  const [resendingId, setResendingId] = useState(null);
  const [sending, setSending] = useState(false);
  const [limitNotice, setLimitNotice] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [invitesRes, subscriptionRes] = await Promise.allSettled([
      api.get("/api/organizations/invitations/"),
      api.get("/api/organizations/subscription/"),
    ]);

    if (invitesRes.status === "fulfilled") {
      setInvitations(Array.isArray(invitesRes.value.data) ? invitesRes.value.data : []);
    } else {
      addToast("Failed to load invitations", "error");
      setInvitations([]);
    }

    if (subscriptionRes.status === "fulfilled") {
      setSubscription(subscriptionRes.value.data || null);
      setLimitNotice(null);
    } else {
      setSubscription(null);
    }
    setLoading(false);
  };

  const copyText = async (value, successMessage = "Copied to clipboard") => {
    try {
      await navigator.clipboard.writeText(value);
      addToast(successMessage, "success");
    } catch {
      addToast("Copy failed", "error");
    }
  };

  const generateInviteLink = async () => {
    if (!inviteEmail.trim()) {
      addToast("Email is required", "error");
      return;
    }

    setSending(true);
    try {
      const response = await api.post("/api/organizations/invitations/send/", {
        email: inviteEmail.trim(),
        role: inviteRole,
      });

      setGeneratedLink(response.data?.invite_link || "");
      setInviteEmail("");
      setInviteRole("contributor");
      setLimitNotice(null);
      await loadData();
      addToast("Invitation sent successfully", "success");
    } catch (error) {
      const payload = error?.response?.data || null;
      if (error?.response?.status === 402 && payload) {
        setLimitNotice(payload);
        addToast(payload.error || "Seat limit reached", "warning");
      } else {
        addToast(payload?.error || "Failed to send invitation", "error");
      }
    } finally {
      setSending(false);
    }
  };

  const revokeInvitation = async (invitationId) => {
    if (!window.confirm("Are you sure you want to revoke this invitation?")) return;

    try {
      await api.delete(`/api/organizations/invitations/${invitationId}/revoke/`);
      addToast("Invitation revoked", "success");
      await loadData();
    } catch {
      addToast("Failed to revoke invitation", "error");
    }
  };

  const resendInvitation = async (invitationId) => {
    try {
      setResendingId(invitationId);
      await api.post(`/api/organizations/invitations/${invitationId}/resend/`);
      addToast("Invitation resent", "success");
      await loadData();
    } catch (error) {
      addToast(error?.response?.data?.error || "Failed to resend invitation", "error");
    } finally {
      setResendingId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <div style={{ height: 180, borderRadius: 24, background: palette.card, border: `1px solid ${palette.border}` }} />
        <div style={{ height: 340, borderRadius: 24, background: palette.card, border: `1px solid ${palette.border}` }} />
      </div>
    );
  }

  const seatSummary = subscription?.seat_summary || null;
  const currentPlan = subscription?.plan?.display_name || subscription?.plan?.name || "Workspace";
  const remainingSeatsLabel = seatSummary?.seat_limit ? String(seatSummary.remaining_seats) : "Unlimited";
  const nearSeatLimit = Boolean(seatSummary?.seat_limit && seatSummary.remaining_seats <= 1);
  const activeNotice = limitNotice || (nearSeatLimit
    ? {
        current_plan: subscription?.plan?.name || currentPlan,
        required_plan: seatSummary?.seat_limit === 3 ? "starter" : "professional",
        error: "Your workspace is close to its seat limit. Upgrade before inviting the next teammate.",
      }
    : null);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <WorkspaceHero
        palette={palette}
        darkMode={darkMode}
        eyebrow="Invitations & Seats"
        title="Invite teammates with seat pressure visible."
        description="Bring people into the workspace, keep pending invites organized, and know exactly when the current plan is about to run out of room."
        actions={
          <>
            <button className="ui-btn-polish ui-focus-ring" onClick={generateInviteLink} disabled={sending} style={ui.primaryButton}>
              <UserPlusIcon style={{ width: 14, height: 14 }} />
              {sending ? "Sending..." : "Send invite"}
            </button>
            <Link className="ui-btn-polish ui-focus-ring" to="/subscription" style={{ ...ui.secondaryButton, textDecoration: "none" }}>
              <LinkIcon style={{ width: 14, height: 14 }} />
              Pricing & Upgrade
            </Link>
          </>
        }
        stats={[
          { label: "Current Plan", value: currentPlan, helper: "Seat capacity now follows the billing plan.", tone: palette.text },
          { label: "Active Members", value: seatSummary?.active_users ?? 0, helper: seatSummary?.seat_limit ? `${seatSummary.seat_limit} total seats` : "Unlimited seats", tone: palette.accent },
          { label: "Pending Invites", value: invitations.length, helper: "Pending invites reserve room in the workspace.", tone: palette.warn },
          { label: "Seats Left", value: remainingSeatsLabel, helper: seatSummary?.seat_limit ? "Before the next upgrade prompt" : "No seat cap", tone: palette.success },
        ]}
        aside={activeNotice ? (
          <UpgradeNotice
            palette={palette}
            title="Seat pressure is part of the invite flow now."
            description={activeNotice.error}
            currentPlan={activeNotice.current_plan}
            requiredPlan={activeNotice.required_plan}
            ctaTo="/subscription"
            ctaLabel="Open pricing"
          />
        ) : null}
      />

      <WorkspaceToolbar palette={palette}>
        <div style={{ display: "grid", gap: 10 }}>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: palette.text }}>
            Pending invitations reserve seats so admins do not accidentally overbook the workspace and discover the limit later during onboarding.
          </p>
          {generatedLink ? (
            <div style={{ borderRadius: 18, padding: 14, border: `1px solid ${palette.border}`, background: palette.cardAlt, display: "grid", gap: 10 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: palette.muted }}>
                Latest Invite Link
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <code style={{ flex: "1 1 420px", margin: 0, padding: "10px 12px", borderRadius: 14, border: `1px solid ${palette.border}`, background: palette.card, color: palette.text, fontSize: 12, wordBreak: "break-all" }}>
                  {generatedLink}
                </code>
                <button className="ui-btn-polish ui-focus-ring" onClick={() => copyText(generatedLink, "Invitation link copied")} style={ui.secondaryButton}>
                  <ClipboardDocumentIcon style={{ width: 14, height: 14 }} />
                  Copy link
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </WorkspaceToolbar>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.25fr) minmax(320px,0.9fr)", gap: 14 }}>
        <WorkspacePanel
          palette={palette}
          eyebrow="Create Invite"
          title="Generate a new invitation"
          description="Send a direct invite link and reserve room for that teammate at the same time."
        >
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.4fr) minmax(180px,0.6fr) auto", gap: 10, alignItems: "end" }}>
            <label style={{ display: "grid", gap: 6, fontSize: 12, color: palette.muted }}>
              Email address
              <input
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="teammate@company.com"
                style={ui.input}
              />
            </label>
            <label style={{ display: "grid", gap: 6, fontSize: 12, color: palette.muted }}>
              Role
              <select value={inviteRole} onChange={(event) => setInviteRole(event.target.value)} style={ui.input}>
                {ROLE_OPTIONS.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </label>
            <button className="ui-btn-polish ui-focus-ring" onClick={generateInviteLink} disabled={sending} style={{ ...ui.primaryButton, justifyContent: "center" }}>
              <EnvelopeIcon style={{ width: 14, height: 14 }} />
              {sending ? "Sending..." : "Invite"}
            </button>
          </div>
        </WorkspacePanel>

        <WorkspacePanel
          palette={palette}
          eyebrow="Seat Posture"
          title="Capacity overview"
          description="Use seat capacity like an operating signal, not an afterthought."
        >
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ borderRadius: 18, padding: 14, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: palette.muted }}>
                Reserved seats
              </p>
              <p style={{ margin: "6px 0 4px", fontSize: 28, lineHeight: 1, letterSpacing: "-0.05em", color: palette.text, fontFamily: 'var(--font-display, "League Spartan"), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                {seatSummary?.reserved_seats ?? invitations.length}
              </p>
              <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>
                Active members plus pending invitations currently holding room.
              </p>
            </div>
            <div style={{ borderRadius: 18, padding: 14, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12, color: palette.muted }}>
                <span>Seat usage</span>
                <span>
                  {seatSummary?.seat_limit ? `${seatSummary.reserved_seats}/${seatSummary.seat_limit}` : "Unlimited"}
                </span>
              </div>
              <div style={{ marginTop: 10, height: 10, borderRadius: 999, background: palette.progressTrack, overflow: "hidden" }}>
                <div
                  style={{
                    width: `${Math.min(Number(seatSummary?.occupancy_percentage || 0), 100)}%`,
                    height: "100%",
                    borderRadius: 999,
                    background: palette.ctaGradient,
                  }}
                />
              </div>
            </div>
          </div>
        </WorkspacePanel>
      </div>

      <WorkspacePanel
        palette={palette}
        eyebrow="Pending Queue"
        title={`Outstanding invitations (${invitations.length})`}
        description="Copy, resend, or revoke invite links without losing sight of the seat capacity they are consuming."
      >
        {invitations.length === 0 ? (
          <WorkspaceEmptyState
            palette={palette}
            title="No pending invitations"
            description="Once an invite is sent, it will appear here until accepted or revoked."
          />
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {invitations.map((invitation) => (
              <article
                key={invitation.id}
                style={{
                  borderRadius: 20,
                  padding: 16,
                  border: `1px solid ${palette.border}`,
                  background: palette.cardAlt,
                  display: "grid",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div style={{ display: "grid", gap: 4 }}>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: palette.text }}>{invitation.email}</p>
                    <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>
                      {String(invitation.role || "contributor").toUpperCase()} · Invited by {invitation.invited_by || "Admin"}
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>
                      Expires {new Date(invitation.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span style={{ borderRadius: 999, padding: "7px 10px", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: invitation.is_valid ? palette.success : palette.warn, background: palette.card, border: `1px solid ${palette.border}` }}>
                    {invitation.is_valid ? "Active" : "Expired"}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button className="ui-btn-polish ui-focus-ring" onClick={() => copyText(invitation.invite_link, "Invitation link copied")} style={ui.secondaryButton}>
                    <ClipboardDocumentIcon style={{ width: 14, height: 14 }} />
                    Copy link
                  </button>
                  <button className="ui-btn-polish ui-focus-ring" onClick={() => resendInvitation(invitation.id)} disabled={resendingId === invitation.id} style={ui.secondaryButton}>
                    <ArrowPathIcon style={{ width: 14, height: 14 }} />
                    {resendingId === invitation.id ? "Resending..." : "Resend"}
                  </button>
                  <button className="ui-btn-polish ui-focus-ring" onClick={() => revokeInvitation(invitation.id)} style={{ ...ui.secondaryButton, color: palette.danger }}>
                    Revoke
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </WorkspacePanel>
    </div>
  );
}
