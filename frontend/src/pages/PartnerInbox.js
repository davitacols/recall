import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { useToast } from "../components/Toast";
import { WorkspaceEmptyState, WorkspaceHero, WorkspacePanel, WorkspaceToolbar } from "../components/WorkspaceChrome";
import { useAuth } from "../hooks/useAuth";
import api from "../services/api";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";

const STATUS_OPTIONS = [["all", "All statuses"], ["new", "New"], ["reviewing", "Reviewing"], ["contacted", "Contacted"], ["qualified", "Qualified"], ["archived", "Archived"]];
const STATUS_LABELS = Object.fromEntries(STATUS_OPTIONS.filter(([value]) => value !== "all"));
const PARTNER_TYPE_LABELS = { agency: "Agency", fractional: "Fractional operator", consultant: "Consultant", ecosystem: "Ecosystem team" };

function formatDateTime(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function getStatusTone(palette, status) {
  if (status === "qualified") return palette.success;
  if (status === "contacted") return palette.accent;
  if (status === "archived") return palette.muted;
  if (status === "reviewing") return palette.warn;
  return palette.text;
}

function mergeInquiry(items, inquiryId, updatedInquiry, fallback = {}) {
  return items.map((item) => (item.id === inquiryId ? { ...item, ...(updatedInquiry || {}), ...fallback } : item));
}

export default function PartnerInbox() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);
  const canManage = Boolean(user?.is_staff || user?.is_superuser);

  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({ q: "", status: "all" });
  const [selectedId, setSelectedId] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("new");
  const [notesDraft, setNotesDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [ownerBusy, setOwnerBusy] = useState(false);

  const loadInquiries = async ({ silent = false } = {}) => {
    if (!canManage) return;
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const params = {};
      if (filters.q.trim()) params.q = filters.q.trim();
      if (filters.status !== "all") params.status = filters.status;
      const response = await api.get("/api/organizations/partner-inquiries/", { params });
      const nextInquiries = Array.isArray(response.data) ? response.data : [];
      setInquiries(nextInquiries);
      setSelectedId((current) => (current && nextInquiries.some((item) => item.id === current) ? current : nextInquiries[0]?.id || null));
    } catch (error) {
      addToast(error.response?.data?.error || "Failed to load partner inquiries.", "error");
      setInquiries([]);
      setSelectedId(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!canManage) return;
    loadInquiries();
  }, [canManage]);

  useEffect(() => {
    if (!canManage) return undefined;
    const timer = window.setTimeout(() => loadInquiries({ silent: true }), 220);
    return () => window.clearTimeout(timer);
  }, [filters.q, filters.status, canManage]);

  const selectedInquiry = useMemo(() => inquiries.find((item) => item.id === selectedId) || null, [inquiries, selectedId]);

  useEffect(() => {
    setSelectedStatus(selectedInquiry?.status || "new");
    setNotesDraft(selectedInquiry?.internal_notes || "");
  }, [selectedInquiry]);

  const statusCounts = useMemo(() => inquiries.reduce((acc, inquiry) => {
    acc.total += 1;
    acc[inquiry.status] = (acc[inquiry.status] || 0) + 1;
    return acc;
  }, { total: 0, new: 0, reviewing: 0, contacted: 0, qualified: 0, archived: 0 }), [inquiries]);

  const hasPendingChanges = Boolean(selectedInquiry && (selectedStatus !== selectedInquiry.status || notesDraft !== (selectedInquiry.internal_notes || "")));

  const handleSaveInquiry = async () => {
    if (!selectedInquiry || !hasPendingChanges || saving) return;
    setSaving(true);
    try {
      const response = await api.put(`/api/organizations/partner-inquiries/${selectedInquiry.id}/`, { status: selectedStatus, internal_notes: notesDraft });
      setInquiries((current) => mergeInquiry(current, selectedInquiry.id, response.data?.inquiry, { status: selectedStatus, internal_notes: notesDraft }));
      addToast("Partner inquiry updated.", "success");
    } catch (error) {
      addToast(error.response?.data?.error || "Unable to update the inquiry.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleOwnerUpdate = async (mode) => {
    if (!selectedInquiry || ownerBusy) return;
    setOwnerBusy(true);
    try {
      const response = await api.put(`/api/organizations/partner-inquiries/${selectedInquiry.id}/`, {
        status: selectedStatus,
        internal_notes: notesDraft,
        ...(mode === "assign" ? { assign_to_me: true } : { clear_owner: true }),
      });
      setInquiries((current) => mergeInquiry(current, selectedInquiry.id, response.data?.inquiry));
      addToast(mode === "assign" ? "Inquiry assigned to you." : "Inquiry owner cleared.", "success");
    } catch (error) {
      addToast(error.response?.data?.error || "Unable to update owner assignment.", "error");
    } finally {
      setOwnerBusy(false);
    }
  };

  if (!canManage) {
    return <div style={{ ...ui.container, display: "grid", gap: 14 }}><WorkspacePanel palette={palette} eyebrow="Partner Inbox" title="Partner inbox is restricted to Knoledgr platform staff." description="Customer workspace admins should not see global partner-program leads inside the product." minHeight={260}><WorkspaceEmptyState palette={palette} title="Staff-only operational surface" description="If you need access to partner operations, sign in with a platform staff account or use internal admin access." action={<Link className="ui-btn-polish ui-focus-ring" to="/dashboard" style={{ ...ui.secondaryButton, textDecoration: "none" }}>Return to dashboard</Link>} /></WorkspacePanel></div>;
  }

  const pillStyle = (status) => ({ borderRadius: 999, padding: "7px 11px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", background: palette.accentSoft, color: getStatusTone(palette, status), border: `1px solid ${palette.border}` });
  const cardStyle = { borderRadius: 18, border: `1px solid ${palette.border}`, background: palette.cardAlt, padding: 14, display: "grid", gap: 8 };
  const metaLabel = { margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: palette.muted };

  return (
    <div style={{ ...ui.container, display: "grid", gap: 14 }}>
      <WorkspaceHero palette={palette} darkMode={darkMode} eyebrow="Partner Operations" title="Review inbound partner interest without leaving the workspace shell." description="This inbox keeps partner-program submissions searchable, filterable, and easy to qualify without dropping into Django admin." actions={<><button className="ui-btn-polish ui-focus-ring" type="button" onClick={() => loadInquiries({ silent: true })} disabled={refreshing} style={{ ...ui.secondaryButton, opacity: refreshing ? 0.75 : 1 }}>{refreshing ? <ArrowPathIcon style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <ArrowPathIcon style={{ width: 14, height: 14 }} />}Refresh inbox</button><Link className="ui-btn-polish ui-focus-ring" to="/partners" style={{ ...ui.secondaryButton, textDecoration: "none" }}><ArrowTopRightOnSquareIcon style={{ width: 14, height: 14 }} />Open public page</Link></>} stats={[{ label: "In View", value: statusCounts.total, helper: "Current filtered inbox count", tone: palette.text }, { label: "New", value: statusCounts.new, helper: "Unreviewed submissions", tone: palette.warn }, { label: "Contacted", value: statusCounts.contacted, helper: "Active follow-up underway", tone: palette.info }, { label: "Qualified", value: statusCounts.qualified, helper: "Strong partner fits", tone: palette.success }]} />

      <WorkspaceToolbar palette={palette}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(240px, 1fr) minmax(180px, 220px)", gap: 12 }}>
          <input value={filters.q} onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))} placeholder="Search by company, person, email, or role" style={ui.input} />
          <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} style={ui.input}>
            {STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
      </WorkspaceToolbar>

      <section style={{ display: "grid", gridTemplateColumns: "minmax(320px, 0.92fr) minmax(320px, 1.08fr)", gap: 14, alignItems: "start" }}>
        <WorkspacePanel palette={palette} eyebrow="Inbox" title={loading ? "Loading submissions..." : `${inquiries.length} partner inquiries`} description="Select a submission to review fit, notes, and current qualification state." minHeight={520}>
          {loading ? <div style={{ display: "grid", gap: 10 }}>{[1, 2, 3, 4].map((item) => <div key={item} style={{ height: 94, borderRadius: 18, border: `1px solid ${palette.border}`, background: palette.cardAlt, opacity: 0.72 }} />)}</div> : null}
          {!loading && inquiries.length === 0 ? <WorkspaceEmptyState palette={palette} title="No partner inquiries match these filters" description="Clear the search, switch back to all statuses, or wait for the next public submission to land." /> : null}
          {!loading && inquiries.length > 0 ? <div style={{ display: "grid", gap: 10 }}>{inquiries.map((inquiry) => <button key={inquiry.id} type="button" className="ui-card-lift ui-smooth ui-focus-ring" onClick={() => setSelectedId(inquiry.id)} style={{ ...cardStyle, textAlign: "left", cursor: "pointer", borderColor: inquiry.id === selectedId ? palette.accent : palette.border, background: inquiry.id === selectedId ? palette.card : palette.cardAlt }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}><div style={{ minWidth: 0 }}><p style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: "-0.03em", color: palette.text }}>{inquiry.company_name}</p><p style={{ margin: "4px 0 0", fontSize: 12, color: palette.muted }}>{`${inquiry.full_name} - ${inquiry.role_title}`}</p></div><span style={pillStyle(inquiry.status)}>{STATUS_LABELS[inquiry.status] || inquiry.status}</span></div><p style={{ margin: 0, fontSize: 12, color: palette.muted }}>{`${PARTNER_TYPE_LABELS[inquiry.partner_type] || inquiry.partner_type} | ${formatDateTime(inquiry.submitted_at)}${inquiry.owner_name ? ` | Owner: ${inquiry.owner_name}` : ""}`}</p><p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: palette.muted }}>{inquiry.service_summary}</p></button>)}</div> : null}
        </WorkspacePanel>

        <WorkspacePanel palette={palette} eyebrow="Review" title={selectedInquiry ? selectedInquiry.company_name : "Select a partner inquiry"} description={selectedInquiry ? "Review the operating context, assign an owner, and update inquiry notes or status." : "Choose a submission from the inbox to inspect the details."} action={selectedInquiry ? <button className="ui-btn-polish ui-focus-ring" type="button" onClick={handleSaveInquiry} disabled={saving || !hasPendingChanges} style={{ ...ui.primaryButton, opacity: saving || !hasPendingChanges ? 0.75 : 1 }}>{saving ? <ArrowPathIcon style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <CheckCircleIcon style={{ width: 14, height: 14 }} />}{saving ? "Saving" : "Save changes"}</button> : null} minHeight={520}>
          {!selectedInquiry ? <WorkspaceEmptyState palette={palette} title="No inquiry selected" description="Pick a company from the inbox to review its fit and move it through the partner pipeline." /> : <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
              <article style={cardStyle}><p style={metaLabel}>Contact</p><p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: palette.text }}>{selectedInquiry.full_name}</p><p style={{ margin: 0, fontSize: 12, color: palette.muted }}>{selectedInquiry.role_title}</p></article>
              <article style={cardStyle}><p style={metaLabel}>Company</p><p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: palette.text }}>{selectedInquiry.company_name}</p><p style={{ margin: 0, fontSize: 12, color: palette.muted }}>{PARTNER_TYPE_LABELS[selectedInquiry.partner_type] || selectedInquiry.partner_type}</p></article>
              <article style={cardStyle}><p style={metaLabel}>Email</p><p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: palette.text }}>{selectedInquiry.work_email}</p><p style={{ margin: 0, fontSize: 12, color: palette.muted }}>{selectedInquiry.organization_name || "No existing workspace linked"}</p></article>
              <article style={cardStyle}><p style={metaLabel}>Owner</p><p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: palette.text }}>{selectedInquiry.owner_name || "Unassigned"}</p><p style={{ margin: 0, fontSize: 12, color: palette.muted }}>{selectedInquiry.owner_email || "Assign this inquiry to an internal owner"}</p></article>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "minmax(180px, 220px) 1fr", gap: 12, alignItems: "end" }}>
              <label style={{ display: "grid", gap: 8 }}>
                <span style={metaLabel}>Inquiry status</span>
                <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)} style={ui.input}>
                  {STATUS_OPTIONS.filter(([value]) => value !== "all").map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <div style={{ display: "grid", gap: 6 }}><p style={metaLabel}>Timeline</p><p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: palette.text }}>{`Submitted ${formatDateTime(selectedInquiry.submitted_at)}${selectedInquiry.contacted_at ? ` | Contacted ${formatDateTime(selectedInquiry.contacted_at)}` : ""}`}</p></div>
            </div>

            <article style={cardStyle}><p style={metaLabel}>Practice summary</p><p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: palette.text }}>{selectedInquiry.service_summary}</p></article>

            <article style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ display: "grid", gap: 4 }}><p style={metaLabel}>Internal notes</p><p style={{ margin: 0, fontSize: 12, color: palette.muted }}>Capture qualification context, rollout ideas, and follow-up notes for the team.</p></div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {selectedInquiry.owner_id === user?.id ? <button type="button" className="ui-btn-polish ui-focus-ring" onClick={() => handleOwnerUpdate("clear")} disabled={ownerBusy} style={{ ...ui.secondaryButton, padding: "8px 12px", opacity: ownerBusy ? 0.7 : 1 }}>{ownerBusy ? <ArrowPathIcon style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <UserCircleIcon style={{ width: 14, height: 14 }} />}Clear owner</button> : <button type="button" className="ui-btn-polish ui-focus-ring" onClick={() => handleOwnerUpdate("assign")} disabled={ownerBusy} style={{ ...ui.secondaryButton, padding: "8px 12px", opacity: ownerBusy ? 0.7 : 1 }}>{ownerBusy ? <ArrowPathIcon style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <UserCircleIcon style={{ width: 14, height: 14 }} />}Assign to me</button>}
                </div>
              </div>
              <textarea value={notesDraft} onChange={(event) => setNotesDraft(event.target.value)} rows={5} placeholder="Add internal qualification notes, follow-up ideas, or rollout observations." style={{ ...ui.input, minHeight: 140, resize: "vertical", lineHeight: 1.6 }} />
            </article>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {selectedInquiry.website ? <a href={selectedInquiry.website} target="_blank" rel="noreferrer" className="ui-btn-polish ui-focus-ring" style={{ ...ui.secondaryButton, textDecoration: "none" }}><GlobeAltIcon style={{ width: 14, height: 14 }} />Visit website</a> : null}
              <a href={`mailto:${selectedInquiry.work_email}?subject=Knoledgr%20Partner%20Program`} className="ui-btn-polish ui-focus-ring" style={{ ...ui.secondaryButton, textDecoration: "none" }}><EnvelopeIcon style={{ width: 14, height: 14 }} />Email contact</a>
              <Link className="ui-btn-polish ui-focus-ring" to="/enterprise" style={{ ...ui.secondaryButton, textDecoration: "none" }}><ClipboardDocumentListIcon style={{ width: 14, height: 14 }} />Enterprise console</Link>
            </div>
          </>}
        </WorkspacePanel>
      </section>
    </div>
  );
}
