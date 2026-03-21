import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  BriefcaseIcon,
  BuildingOffice2Icon,
  CheckCircleIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { useToast } from "../components/Toast";
import { WorkspaceEmptyState, WorkspaceHero, WorkspacePanel, WorkspaceToolbar } from "../components/WorkspaceChrome";
import { useAuth } from "../hooks/useAuth";
import api from "../services/api";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";

const STATUS_OPTIONS = [
  ["all", "All statuses"],
  ["new", "New"],
  ["reviewing", "Reviewing"],
  ["contacted", "Contacted"],
  ["qualified", "Qualified"],
  ["archived", "Archived"],
];

const STATUS_LABELS = Object.fromEntries(STATUS_OPTIONS.filter(([value]) => value !== "all"));
const PARTNER_TYPE_LABELS = {
  agency: "Agency",
  fractional: "Fractional operator",
  consultant: "Consultant",
  ecosystem: "Ecosystem team",
};

function formatDateTime(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getStatusTone(palette, status) {
  if (status === "qualified") return palette.success;
  if (status === "contacted") return palette.accent;
  if (status === "archived") return palette.muted;
  if (status === "reviewing") return palette.warn;
  return palette.text;
}

function statusPill(palette, status) {
  return {
    borderRadius: 999,
    padding: "7px 11px",
    fontSize: 11,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    background: palette.accentSoft,
    color: getStatusTone(palette, status),
    border: `1px solid ${palette.border}`,
  };
}

export default function PartnerInbox() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({ q: "", status: "all" });
  const [selectedId, setSelectedId] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("new");
  const [saving, setSaving] = useState(false);

  const canManage = Boolean(user?.is_staff || user?.is_superuser);

  const loadInquiries = async ({ silent = false } = {}) => {
    if (!canManage) return;
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const params = {};
      if (filters.q.trim()) params.q = filters.q.trim();
      if (filters.status !== "all") params.status = filters.status;

      const response = await api.get("/api/organizations/partner-inquiries/", { params });
      const nextInquiries = Array.isArray(response.data) ? response.data : [];
      setInquiries(nextInquiries);
      setSelectedId((current) => {
        if (current && nextInquiries.some((item) => item.id === current)) return current;
        return nextInquiries[0]?.id || null;
      });
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
    loadInquiries();
  }, []);

  useEffect(() => {
    if (!canManage) return undefined;
    const timer = window.setTimeout(() => {
      loadInquiries({ silent: true });
    }, 220);
    return () => window.clearTimeout(timer);
  }, [filters.q, filters.status]);

  const selectedInquiry = useMemo(
    () => inquiries.find((item) => item.id === selectedId) || null,
    [inquiries, selectedId]
  );

  useEffect(() => {
    setSelectedStatus(selectedInquiry?.status || "new");
  }, [selectedInquiry]);

  const statusCounts = useMemo(
    () =>
      inquiries.reduce(
        (accumulator, inquiry) => {
          accumulator.total += 1;
          accumulator[inquiry.status] = (accumulator[inquiry.status] || 0) + 1;
          return accumulator;
        },
        { total: 0, new: 0, reviewing: 0, contacted: 0, qualified: 0, archived: 0 }
      ),
    [inquiries]
  );

  const handleSaveStatus = async () => {
    if (!selectedInquiry || selectedStatus === selectedInquiry.status || saving) return;
    setSaving(true);

    try {
      const response = await api.put(`/api/organizations/partner-inquiries/${selectedInquiry.id}/`, {
        status: selectedStatus,
      });
      const updatedInquiry = response.data?.inquiry || null;
      setInquiries((current) =>
        current.map((item) => (item.id === selectedInquiry.id ? { ...item, ...(updatedInquiry || {}), status: selectedStatus } : item))
      );
      addToast("Partner inquiry updated.", "success");
    } catch (error) {
      addToast(error.response?.data?.error || "Unable to update the inquiry.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (!canManage) {
    return (
      <div style={{ ...ui.container, display: "grid", gap: 14 }}>
        <WorkspacePanel
          palette={palette}
          eyebrow="Partner Inbox"
          title="Partner inbox is restricted to Knoledgr platform staff."
          description="Customer workspace admins should not see global partner-program leads inside the product."
          minHeight={260}
        >
          <WorkspaceEmptyState
            palette={palette}
            title="Staff-only operational surface"
            description="If you need access to partner operations, sign in with a platform staff account or use the Django admin access already provisioned for internal operations."
            action={
              <Link className="ui-btn-polish ui-focus-ring" to="/dashboard" style={{ ...ui.secondaryButton, textDecoration: "none" }}>
                Return to dashboard
              </Link>
            }
          />
        </WorkspacePanel>
      </div>
    );
  }

  return (
    <div style={{ ...ui.container, display: "grid", gap: 14 }}>
      <WorkspaceHero
        palette={palette}
        darkMode={darkMode}
        eyebrow="Partner Operations"
        title="Review inbound partner interest without leaving the workspace shell."
        description="This inbox keeps partner-program submissions searchable, filterable, and easy to qualify without dropping into Django admin."
        actions={
          <>
            <button
              className="ui-btn-polish ui-focus-ring"
              type="button"
              onClick={() => loadInquiries({ silent: true })}
              disabled={refreshing}
              style={{ ...ui.secondaryButton, opacity: refreshing ? 0.75 : 1 }}
            >
              <ArrowPathIcon style={{ width: 14, height: 14, animation: refreshing ? "spin 1s linear infinite" : "none" }} />
              Refresh inbox
            </button>
            <Link className="ui-btn-polish ui-focus-ring" to="/partners" style={{ ...ui.secondaryButton, textDecoration: "none" }}>
              <ArrowTopRightOnSquareIcon style={{ width: 14, height: 14 }} />
              Open public page
            </Link>
          </>
        }
        stats={[
          { label: "In View", value: statusCounts.total, helper: "Current filtered inbox count", tone: palette.text },
          { label: "New", value: statusCounts.new, helper: "Unreviewed submissions", tone: palette.warn },
          { label: "Contacted", value: statusCounts.contacted, helper: "Active follow-up underway", tone: palette.info },
          { label: "Qualified", value: statusCounts.qualified, helper: "Strong partner fits", tone: palette.success },
        ]}
        aside={
          <div
            style={{
              borderRadius: 22,
              padding: 18,
              border: `1px solid ${palette.border}`,
              background: palette.card,
              display: "grid",
              gap: 8,
              minWidth: 220,
            }}
          >
            <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: palette.muted, fontWeight: 800 }}>
              Intake rules
            </p>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: palette.text }}>Global lead data</p>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: palette.muted }}>
              This surface is deliberately limited to platform staff because these inquiries are not scoped to any one customer workspace.
            </p>
          </div>
        }
      />

      <WorkspaceToolbar palette={palette}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(240px, 1fr) minmax(180px, 220px)", gap: 12 }}>
          <input
            value={filters.q}
            onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
            placeholder="Search by company, person, email, or role"
            style={ui.input}
          />
          <select
            value={filters.status}
            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
            style={ui.input}
          >
            {STATUS_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </WorkspaceToolbar>

      <section style={{ display: "grid", gridTemplateColumns: "minmax(320px, 0.92fr) minmax(320px, 1.08fr)", gap: 14, alignItems: "start" }}>
        <WorkspacePanel
          palette={palette}
          eyebrow="Inbox"
          title={loading ? "Loading submissions..." : `${inquiries.length} partner inquiries`}
          description="Select any submission to inspect the company fit, service summary, and current qualification state."
          minHeight={520}
        >
          {loading ? (
            <div style={{ display: "grid", gap: 10 }}>
              {[1, 2, 3, 4].map((item) => (
                <div key={item} style={{ height: 94, borderRadius: 18, border: `1px solid ${palette.border}`, background: palette.cardAlt, opacity: 0.72 }} />
              ))}
            </div>
          ) : null}

          {!loading && inquiries.length === 0 ? (
            <WorkspaceEmptyState
              palette={palette}
              title="No partner inquiries match these filters"
              description="Clear the search, switch back to all statuses, or wait for the next public submission to land."
            />
          ) : null}

          {!loading && inquiries.length > 0 ? (
            <div style={{ display: "grid", gap: 10 }}>
              {inquiries.map((inquiry) => {
                const active = inquiry.id === selectedId;
                return (
                  <button
                    key={inquiry.id}
                    type="button"
                    className="ui-card-lift ui-smooth ui-focus-ring"
                    onClick={() => setSelectedId(inquiry.id)}
                    style={{
                      borderRadius: 20,
                      border: `1px solid ${active ? palette.accent : palette.border}`,
                      background: active ? palette.card : palette.cardAlt,
                      padding: 16,
                      display: "grid",
                      gap: 10,
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: "-0.03em", color: palette.text }}>
                          {inquiry.company_name}
                        </p>
                        <p style={{ margin: "4px 0 0", fontSize: 12, color: palette.muted }}>
                          {inquiry.full_name} · {inquiry.role_title}
                        </p>
                      </div>
                      <span style={statusPill(palette, inquiry.status)}>{STATUS_LABELS[inquiry.status] || inquiry.status}</span>
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", fontSize: 12, color: palette.muted }}>
                      <span>{PARTNER_TYPE_LABELS[inquiry.partner_type] || inquiry.partner_type}</span>
                      <span>·</span>
                      <span>{formatDateTime(inquiry.submitted_at)}</span>
                    </div>

                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: palette.muted }}>
                      {inquiry.service_summary}
                    </p>
                  </button>
                );
              })}
            </div>
          ) : null}
        </WorkspacePanel>

        <WorkspacePanel
          palette={palette}
          eyebrow="Review"
          title={selectedInquiry ? selectedInquiry.company_name : "Select a partner inquiry"}
          description={selectedInquiry ? "Review the operating context and update the inquiry status." : "Choose a submission from the inbox to inspect the details."}
          action={
            selectedInquiry ? (
              <button
                className="ui-btn-polish ui-focus-ring"
                type="button"
                onClick={handleSaveStatus}
                disabled={saving || selectedStatus === selectedInquiry.status}
                style={{
                  ...ui.primaryButton,
                  opacity: saving || selectedStatus === selectedInquiry.status ? 0.75 : 1,
                }}
              >
                {saving ? <ArrowPathIcon style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <CheckCircleIcon style={{ width: 14, height: 14 }} />}
                {saving ? "Saving" : "Save status"}
              </button>
            ) : null
          }
          minHeight={520}
        >
          {!selectedInquiry ? (
            <WorkspaceEmptyState
              palette={palette}
              title="No inquiry selected"
              description="Pick a company from the inbox to review its fit and move it through the partner pipeline."
            />
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
                {[
                  {
                    label: "Contact",
                    value: selectedInquiry.full_name,
                    helper: selectedInquiry.role_title,
                    icon: BriefcaseIcon,
                  },
                  {
                    label: "Company",
                    value: selectedInquiry.company_name,
                    helper: PARTNER_TYPE_LABELS[selectedInquiry.partner_type] || selectedInquiry.partner_type,
                    icon: BuildingOffice2Icon,
                  },
                  {
                    label: "Email",
                    value: selectedInquiry.work_email,
                    helper: selectedInquiry.organization_name || "No existing workspace linked",
                    icon: EnvelopeIcon,
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <article
                      key={item.label}
                      style={{
                        borderRadius: 18,
                        padding: 14,
                        border: `1px solid ${palette.border}`,
                        background: palette.cardAlt,
                        display: "grid",
                        gap: 8,
                      }}
                    >
                      <div style={{ width: 34, height: 34, borderRadius: 12, display: "grid", placeItems: "center", background: palette.accentSoft, color: palette.accent }}>
                        <Icon style={{ width: 16, height: 16 }} />
                      </div>
                      <div style={{ display: "grid", gap: 3 }}>
                        <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: palette.muted }}>{item.label}</p>
                        <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: palette.text, lineHeight: 1.35 }}>{item.value}</p>
                        <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>{item.helper}</p>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "minmax(180px, 220px) 1fr", gap: 12, alignItems: "end" }}>
                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: palette.muted }}>
                    Inquiry status
                  </span>
                  <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)} style={ui.input}>
                    {STATUS_OPTIONS.filter(([value]) => value !== "all").map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <div style={{ display: "grid", gap: 6 }}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: palette.muted }}>
                    Timeline
                  </p>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: palette.text }}>
                    Submitted {formatDateTime(selectedInquiry.submitted_at)}
                    {selectedInquiry.contacted_at ? ` · Contacted ${formatDateTime(selectedInquiry.contacted_at)}` : ""}
                  </p>
                </div>
              </div>

              <article
                style={{
                  borderRadius: 20,
                  padding: 16,
                  border: `1px solid ${palette.border}`,
                  background: palette.cardAlt,
                  display: "grid",
                  gap: 8,
                }}
              >
                <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: palette.muted }}>
                  Practice summary
                </p>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: palette.text }}>
                  {selectedInquiry.service_summary}
                </p>
              </article>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {selectedInquiry.website ? (
                  <a
                    href={selectedInquiry.website}
                    target="_blank"
                    rel="noreferrer"
                    className="ui-btn-polish ui-focus-ring"
                    style={{ ...ui.secondaryButton, textDecoration: "none" }}
                  >
                    <GlobeAltIcon style={{ width: 14, height: 14 }} />
                    Visit website
                  </a>
                ) : null}
                <a
                  href={`mailto:${selectedInquiry.work_email}?subject=Knoledgr%20Partner%20Program`}
                  className="ui-btn-polish ui-focus-ring"
                  style={{ ...ui.secondaryButton, textDecoration: "none" }}
                >
                  <EnvelopeIcon style={{ width: 14, height: 14 }} />
                  Email contact
                </a>
                <Link className="ui-btn-polish ui-focus-ring" to="/partners" style={{ ...ui.secondaryButton, textDecoration: "none" }}>
                  <SparklesIcon style={{ width: 14, height: 14 }} />
                  View public partner page
                </Link>
              </div>
            </>
          )}
        </WorkspacePanel>
      </section>
    </div>
  );
}
