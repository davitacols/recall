import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { useToast } from "../components/Toast";
import { WorkspaceEmptyState, WorkspaceHero, WorkspacePanel, WorkspaceToolbar } from "../components/WorkspaceChrome";
import { useAuth } from "../hooks/useAuth";
import api from "../services/api";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";

const STATUS_OPTIONS = [["all", "All statuses"], ["new", "New"], ["reviewing", "Reviewing"], ["contacted", "Contacted"], ["resolved", "Resolved"], ["archived", "Archived"]];
const STATUS_LABELS = Object.fromEntries(STATUS_OPTIONS.filter(([value]) => value !== "all"));
const FEEDBACK_TYPE_OPTIONS = [["all", "All types"], ["general", "General"], ["bug", "Bug"], ["feature", "Feature"], ["docs", "Docs"], ["pricing", "Pricing"], ["support", "Support"], ["testimonial", "Testimonial"]];
const FEEDBACK_TYPE_LABELS = Object.fromEntries(FEEDBACK_TYPE_OPTIONS.filter(([value]) => value !== "all"));
const SENTIMENT_LABELS = { positive: "Working well", neutral: "Mixed or neutral", friction: "Needs improvement" };

function formatDateTime(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function getStatusTone(palette, status) {
  if (status === "resolved") return palette.success;
  if (status === "contacted") return palette.accent;
  if (status === "archived") return palette.muted;
  if (status === "reviewing") return palette.warn;
  return palette.text;
}

function mergeFeedback(items, feedbackId, updatedFeedback, fallback = {}) {
  return items.map((item) => (item.id === feedbackId ? { ...item, ...(updatedFeedback || {}), ...fallback } : item));
}

export default function FeedbackInbox() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);
  const canManage = Boolean(user?.is_staff || user?.is_superuser);

  const [feedbackItems, setFeedbackItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({ q: "", status: "all", feedback_type: "all" });
  const [selectedId, setSelectedId] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("new");
  const [notesDraft, setNotesDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [ownerBusy, setOwnerBusy] = useState(false);

  const loadFeedbackItems = async ({ silent = false } = {}) => {
    if (!canManage) return;
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const params = {};
      if (filters.q.trim()) params.q = filters.q.trim();
      if (filters.status !== "all") params.status = filters.status;
      if (filters.feedback_type !== "all") params.feedback_type = filters.feedback_type;
      const response = await api.get("/api/organizations/feedback/", { params });
      const nextItems = Array.isArray(response.data) ? response.data : [];
      setFeedbackItems(nextItems);
      setSelectedId((current) => (current && nextItems.some((item) => item.id === current) ? current : nextItems[0]?.id || null));
    } catch (error) {
      addToast(error.response?.data?.error || "Failed to load feedback.", "error");
      setFeedbackItems([]);
      setSelectedId(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!canManage) return;
    loadFeedbackItems();
  }, [canManage]);

  useEffect(() => {
    if (!canManage) return undefined;
    const timer = window.setTimeout(() => loadFeedbackItems({ silent: true }), 220);
    return () => window.clearTimeout(timer);
  }, [filters.q, filters.status, filters.feedback_type, canManage]);

  const selectedFeedback = useMemo(() => feedbackItems.find((item) => item.id === selectedId) || null, [feedbackItems, selectedId]);

  useEffect(() => {
    setSelectedStatus(selectedFeedback?.status || "new");
    setNotesDraft(selectedFeedback?.internal_notes || "");
  }, [selectedFeedback]);

  const statusCounts = useMemo(
    () =>
      feedbackItems.reduce(
        (acc, item) => {
          acc.total += 1;
          acc[item.status] = (acc[item.status] || 0) + 1;
          return acc;
        },
        { total: 0, new: 0, reviewing: 0, contacted: 0, resolved: 0, archived: 0 }
      ),
    [feedbackItems]
  );

  const hasPendingChanges = Boolean(
    selectedFeedback && (selectedStatus !== selectedFeedback.status || notesDraft !== (selectedFeedback.internal_notes || ""))
  );

  const handleSaveFeedback = async () => {
    if (!selectedFeedback || !hasPendingChanges || saving) return;
    setSaving(true);
    try {
      const response = await api.put(`/api/organizations/feedback/${selectedFeedback.id}/`, {
        status: selectedStatus,
        internal_notes: notesDraft,
      });
      setFeedbackItems((current) =>
        mergeFeedback(current, selectedFeedback.id, response.data?.feedback, {
          status: selectedStatus,
          internal_notes: notesDraft,
        })
      );
      addToast("Feedback updated.", "success");
    } catch (error) {
      addToast(error.response?.data?.error || "Unable to update feedback.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleOwnerUpdate = async (mode) => {
    if (!selectedFeedback || ownerBusy) return;
    setOwnerBusy(true);
    try {
      const response = await api.put(`/api/organizations/feedback/${selectedFeedback.id}/`, {
        status: selectedStatus,
        internal_notes: notesDraft,
        ...(mode === "assign" ? { assign_to_me: true } : { clear_owner: true }),
      });
      setFeedbackItems((current) => mergeFeedback(current, selectedFeedback.id, response.data?.feedback));
      addToast(mode === "assign" ? "Feedback assigned to you." : "Feedback owner cleared.", "success");
    } catch (error) {
      addToast(error.response?.data?.error || "Unable to update owner assignment.", "error");
    } finally {
      setOwnerBusy(false);
    }
  };

  if (!canManage) {
    return (
      <div style={{ ...ui.container, display: "grid", gap: 14 }}>
        <WorkspacePanel
          palette={palette}
          eyebrow="Feedback Inbox"
          title="Feedback inbox is restricted to Knoledgr platform staff."
          description="Customer workspace admins should not see global feedback submissions inside the product."
          minHeight={260}
        >
          <WorkspaceEmptyState
            palette={palette}
            title="Staff-only operational surface"
            description="If you need access to the centralized feedback review queue, sign in with a platform staff account."
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

  const pillStyle = (status) => ({
    borderRadius: 999,
    padding: "7px 11px",
    fontSize: 11,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    background: palette.accentSoft,
    color: getStatusTone(palette, status),
    border: `1px solid ${palette.border}`,
  });
  const cardStyle = {
    borderRadius: 18,
    border: `1px solid ${palette.border}`,
    background: palette.cardAlt,
    padding: 14,
    display: "grid",
    gap: 8,
  };
  const metaLabel = {
    margin: 0,
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: palette.muted,
  };

  return (
    <div style={{ ...ui.container, display: "grid", gap: 14 }}>
      <WorkspaceHero
        palette={palette}
        darkMode={darkMode}
        eyebrow="Feedback Operations"
        title="Review product feedback without leaving the workspace shell."
        description="This inbox keeps feedback searchable, assignable, and easy to resolve with notes and ownership attached."
        actions={
          <>
            <button
              className="ui-btn-polish ui-focus-ring"
              type="button"
              onClick={() => loadFeedbackItems({ silent: true })}
              disabled={refreshing}
              style={{ ...ui.secondaryButton, opacity: refreshing ? 0.75 : 1 }}
            >
              <ArrowPathIcon style={{ width: 14, height: 14, animation: refreshing ? "spin 1s linear infinite" : undefined }} />
              Refresh inbox
            </button>
            <Link className="ui-btn-polish ui-focus-ring" to="/feedback" style={{ ...ui.secondaryButton, textDecoration: "none" }}>
              <ArrowTopRightOnSquareIcon style={{ width: 14, height: 14 }} />
              Open public page
            </Link>
          </>
        }
        stats={[
          { label: "In View", value: statusCounts.total, helper: "Current filtered inbox count", tone: palette.text },
          { label: "New", value: statusCounts.new, helper: "Fresh submissions to review", tone: palette.warn },
          { label: "Contacted", value: statusCounts.contacted, helper: "Follow-up already underway", tone: palette.info },
          { label: "Resolved", value: statusCounts.resolved, helper: "Closed product feedback loops", tone: palette.success },
        ]}
      />

      <WorkspaceToolbar palette={palette}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(240px, 1fr) minmax(180px, 220px) minmax(180px, 220px)", gap: 12 }}>
          <input
            value={filters.q}
            onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
            placeholder="Search by person, email, page, or message"
            style={ui.input}
          />
          <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} style={ui.input}>
            {STATUS_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={filters.feedback_type}
            onChange={(event) => setFilters((current) => ({ ...current, feedback_type: event.target.value }))}
            style={ui.input}
          >
            {FEEDBACK_TYPE_OPTIONS.map(([value, label]) => (
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
          title={loading ? "Loading feedback..." : `${feedbackItems.length} feedback items`}
          description="Select a submission to inspect the message, page context, and resolution notes."
          minHeight={520}
        >
          {loading ? (
            <div style={{ display: "grid", gap: 10 }}>
              {[1, 2, 3, 4].map((item) => (
                <div key={item} style={{ height: 94, borderRadius: 18, border: `1px solid ${palette.border}`, background: palette.cardAlt, opacity: 0.72 }} />
              ))}
            </div>
          ) : null}
          {!loading && feedbackItems.length === 0 ? (
            <WorkspaceEmptyState
              palette={palette}
              title="No feedback matches these filters"
              description="Clear the search or change filters to see the rest of the queue."
            />
          ) : null}
          {!loading && feedbackItems.length > 0 ? (
            <div style={{ display: "grid", gap: 10 }}>
              {feedbackItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="ui-card-lift ui-smooth ui-focus-ring"
                  onClick={() => setSelectedId(item.id)}
                  style={{
                    ...cardStyle,
                    textAlign: "left",
                    cursor: "pointer",
                    borderColor: item.id === selectedId ? palette.accent : palette.border,
                    background: item.id === selectedId ? palette.card : palette.cardAlt,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: "-0.03em", color: palette.text }}>{item.full_name}</p>
                      <p style={{ margin: "4px 0 0", fontSize: 12, color: palette.muted }}>{item.company_name || item.email}</p>
                    </div>
                    <span style={pillStyle(item.status)}>{STATUS_LABELS[item.status] || item.status}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>
                    {`${FEEDBACK_TYPE_LABELS[item.feedback_type] || item.feedback_type} | ${SENTIMENT_LABELS[item.sentiment] || item.sentiment} | Rating ${item.rating}/5`}
                  </p>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: palette.muted }}>
                    {item.message.length > 180 ? `${item.message.slice(0, 177)}...` : item.message}
                  </p>
                </button>
              ))}
            </div>
          ) : null}
        </WorkspacePanel>

        <WorkspacePanel
          palette={palette}
          eyebrow="Review"
          title={selectedFeedback ? selectedFeedback.full_name : "Select a feedback item"}
          description={
            selectedFeedback
              ? "Review the submission, assign an owner, and keep notes on what the team decides to do next."
              : "Choose feedback from the inbox to inspect the full submission."
          }
          action={
            selectedFeedback ? (
              <button
                className="ui-btn-polish ui-focus-ring"
                type="button"
                onClick={handleSaveFeedback}
                disabled={saving || !hasPendingChanges}
                style={{ ...ui.primaryButton, opacity: saving || !hasPendingChanges ? 0.75 : 1 }}
              >
                <CheckCircleIcon style={{ width: 14, height: 14 }} />
                {saving ? "Saving" : "Save changes"}
              </button>
            ) : null
          }
          minHeight={520}
        >
          {!selectedFeedback ? (
            <WorkspaceEmptyState
              palette={palette}
              title="No feedback selected"
              description="Pick a submission from the inbox to review its product context and update status or notes."
            />
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
                <article style={cardStyle}>
                  <p style={metaLabel}>Contact</p>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: palette.text }}>{selectedFeedback.full_name}</p>
                  <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>{selectedFeedback.role_title || "No role shared"}</p>
                </article>
                <article style={cardStyle}>
                  <p style={metaLabel}>Type</p>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: palette.text }}>{FEEDBACK_TYPE_LABELS[selectedFeedback.feedback_type] || selectedFeedback.feedback_type}</p>
                  <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>{SENTIMENT_LABELS[selectedFeedback.sentiment] || selectedFeedback.sentiment}</p>
                </article>
                <article style={cardStyle}>
                  <p style={metaLabel}>Rating</p>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: palette.text }}>{`${selectedFeedback.rating}/5`}</p>
                  <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>{selectedFeedback.current_page || "No page shared"}</p>
                </article>
                <article style={cardStyle}>
                  <p style={metaLabel}>Owner</p>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: palette.text }}>{selectedFeedback.owner_name || "Unassigned"}</p>
                  <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>{selectedFeedback.owner_email || "Assign this item to a staff owner"}</p>
                </article>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "minmax(180px, 220px) 1fr", gap: 12, alignItems: "end" }}>
                <label style={{ display: "grid", gap: 8 }}>
                  <span style={metaLabel}>Feedback status</span>
                  <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)} style={ui.input}>
                    {STATUS_OPTIONS.filter(([value]) => value !== "all").map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <div style={{ display: "grid", gap: 6 }}>
                  <p style={metaLabel}>Timeline</p>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: palette.text }}>
                    {`Submitted ${formatDateTime(selectedFeedback.submitted_at)}${
                      selectedFeedback.contacted_at ? ` | Updated ${formatDateTime(selectedFeedback.contacted_at)}` : ""
                    }`}
                  </p>
                </div>
              </div>

              <article style={cardStyle}>
                <p style={metaLabel}>Feedback message</p>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: palette.text }}>{selectedFeedback.message}</p>
              </article>

              <article style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ display: "grid", gap: 4 }}>
                    <p style={metaLabel}>Internal notes</p>
                    <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>
                      Capture reproduction notes, product decisions, and follow-up context for the team.
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {selectedFeedback.owner_id === user?.id ? (
                      <button
                        type="button"
                        className="ui-btn-polish ui-focus-ring"
                        onClick={() => handleOwnerUpdate("clear")}
                        disabled={ownerBusy}
                        style={{ ...ui.secondaryButton, padding: "8px 12px", opacity: ownerBusy ? 0.7 : 1 }}
                      >
                        <UserCircleIcon style={{ width: 14, height: 14 }} />
                        Clear owner
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="ui-btn-polish ui-focus-ring"
                        onClick={() => handleOwnerUpdate("assign")}
                        disabled={ownerBusy}
                        style={{ ...ui.secondaryButton, padding: "8px 12px", opacity: ownerBusy ? 0.7 : 1 }}
                      >
                        <UserCircleIcon style={{ width: 14, height: 14 }} />
                        Assign to me
                      </button>
                    )}
                  </div>
                </div>
                <textarea
                  value={notesDraft}
                  onChange={(event) => setNotesDraft(event.target.value)}
                  rows={5}
                  placeholder="Add internal notes about severity, reproduction, follow-up, or ownership."
                  style={{ ...ui.input, minHeight: 140, resize: "vertical", lineHeight: 1.6 }}
                />
              </article>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <a
                  href={`mailto:${selectedFeedback.email}?subject=Knoledgr%20Feedback%20Follow-up`}
                  className="ui-btn-polish ui-focus-ring"
                  style={{ ...ui.secondaryButton, textDecoration: "none" }}
                >
                  <EnvelopeIcon style={{ width: 14, height: 14 }} />
                  Email contact
                </a>
                <Link className="ui-btn-polish ui-focus-ring" to="/feedback" style={{ ...ui.secondaryButton, textDecoration: "none" }}>
                  <ChatBubbleLeftRightIcon style={{ width: 14, height: 14 }} />
                  Public feedback page
                </Link>
              </div>
            </>
          )}
        </WorkspacePanel>
      </section>
    </div>
  );
}
