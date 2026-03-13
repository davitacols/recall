import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  CheckIcon,
  ChatBubbleBottomCenterTextIcon,
  ClockIcon,
  EyeIcon,
  PaperClipIcon,
  PencilIcon,
  SparklesIcon,
  TrashIcon,
  UserCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";
import DecisionImpactPanel from "../components/DecisionImpactPanel";
import IssueAttachments from "../components/IssueAttachments";
import WatchButton from "../components/WatchButton";
import { TimeEstimate, TimeTracker } from "../components/TimeTracker";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";

const STATUSES = ["backlog", "todo", "in_progress", "in_review", "testing", "done"];
const PRIORITIES = ["lowest", "low", "medium", "high", "highest"];

const getApiErrorMessage = (error, fallback) =>
  error?.response?.data?.detail ||
  error?.response?.data?.error ||
  error?.response?.data?.message ||
  error?.message ||
  fallback;

const formatLabel = (value) => (value ? value.replaceAll("_", " ") : "-");
const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : "-");
const formatDateOnly = (value) => (value ? new Date(value).toLocaleDateString() : "-");

const getSemanticChipStyle = (value, type, darkMode) => {
  const statusStyles = {
    backlog: { border: "rgba(148,163,184,0.55)", text: "#94a3b8", bgDark: "rgba(148,163,184,0.14)", bgLight: "rgba(148,163,184,0.16)" },
    todo: { border: "rgba(59,130,246,0.55)", text: "var(--app-info)", bgDark: "rgba(59,130,246,0.14)", bgLight: "rgba(59,130,246,0.14)" },
    in_progress: { border: "rgba(245,158,11,0.55)", text: "var(--app-warning)", bgDark: "rgba(245,158,11,0.16)", bgLight: "rgba(245,158,11,0.16)" },
    in_review: { border: "rgba(168,85,247,0.55)", text: "#a78bfa", bgDark: "rgba(168,85,247,0.16)", bgLight: "rgba(168,85,247,0.14)" },
    testing: { border: "rgba(236,72,153,0.55)", text: "#f472b6", bgDark: "rgba(236,72,153,0.16)", bgLight: "rgba(236,72,153,0.14)" },
    done: { border: "rgba(34,197,94,0.55)", text: "var(--app-success)", bgDark: "rgba(34,197,94,0.16)", bgLight: "rgba(34,197,94,0.14)" },
  };
  const priorityStyles = {
    lowest: { border: "rgba(34,197,94,0.55)", text: "var(--app-success)", bgDark: "rgba(34,197,94,0.16)", bgLight: "rgba(34,197,94,0.14)" },
    low: { border: "rgba(132,204,22,0.55)", text: "#84cc16", bgDark: "rgba(132,204,22,0.16)", bgLight: "rgba(132,204,22,0.14)" },
    medium: { border: "rgba(245,158,11,0.55)", text: "var(--app-warning)", bgDark: "rgba(245,158,11,0.16)", bgLight: "rgba(245,158,11,0.14)" },
    high: { border: "rgba(249,115,22,0.55)", text: "#f97316", bgDark: "rgba(249,115,22,0.16)", bgLight: "rgba(249,115,22,0.14)" },
    highest: { border: "rgba(239,68,68,0.55)", text: "var(--app-danger)", bgDark: "rgba(239,68,68,0.16)", bgLight: "rgba(239,68,68,0.14)" },
  };
  const token = (type === "status" ? statusStyles : priorityStyles)[value];
  if (!token) return {};
  return {
    border: `1px solid ${token.border}`,
    color: token.text,
    background: darkMode ? token.bgDark : token.bgLight,
  };
};

function IssueDetail() {
  const { issueId } = useParams();
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const [issue, setIssue] = useState(null);
  const [formData, setFormData] = useState({});
  const [teamMembers, setTeamMembers] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [commenting, setCommenting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const resolvedIssueId = issue?.id ? String(issue.id) : String(issueId);

  const fetchIssue = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/agile/issues/${issueId}/`);
      if (String(response.data?.id || "") !== String(issueId)) {
        navigate(`/issues/${response.data.id}`, { replace: true });
      }
      setIssue(response.data);
      setFormData({
        title: response.data.title || "",
        description: response.data.description || "",
        status: response.data.status || "todo",
        priority: response.data.priority || "medium",
        issue_type: response.data.issue_type || "task",
        assignee_id: response.data.assignee_id ?? "",
        sprint_id: response.data.sprint_id ?? "",
        story_points: response.data.story_points ?? "",
        due_date: response.data.due_date || "",
      });
      setError("");

      if (response.data.project_id) {
        const sprintResponse = await api.get(`/api/agile/projects/${response.data.project_id}/sprints/`);
        setSprints(sprintResponse.data || []);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load issue"));
    } finally {
      setLoading(false);
    }
  }, [issueId, navigate]);

  const fetchTeamMembers = useCallback(async () => {
    try {
      const response = await api.get("/api/organizations/members/");
      setTeamMembers(response.data || []);
    } catch (err) {
      setTeamMembers([]);
    }
  }, []);

  useEffect(() => {
    fetchIssue();
    fetchTeamMembers();
  }, [fetchIssue, fetchTeamMembers]);

  const handleSave = async () => {
    if (!formData.title?.trim()) {
      setError("Title is required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description || "",
        status: formData.status || "todo",
        priority: formData.priority || "medium",
        issue_type: formData.issue_type || "task",
        assignee_id: formData.assignee_id === "" ? null : Number(formData.assignee_id),
        sprint_id: formData.sprint_id === "" ? null : Number(formData.sprint_id),
        story_points: formData.story_points === "" ? null : Number(formData.story_points),
        due_date: formData.due_date || null,
      };

      await api.put(`/api/agile/issues/${resolvedIssueId}/`, payload);
      setEditing(false);
      await fetchIssue();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to update issue"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this issue? This action cannot be undone.")) return;
    try {
      await api.delete(`/api/agile/issues/${resolvedIssueId}/`);
      navigate(issue?.project_id ? `/projects/${issue.project_id}` : "/projects");
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete issue"));
    }
  };

  const handleAddComment = async (event) => {
    event.preventDefault();
    if (!newComment.trim()) return;
    setCommenting(true);
    try {
      await api.post(`/api/agile/issues/${resolvedIssueId}/comments/`, { content: newComment.trim() });
      setNewComment("");
      await fetchIssue();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to add comment"));
    } finally {
      setCommenting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div style={spinner} />
      </div>
    );
  }

  if (!issue) {
    return (
      <div style={{ minHeight: "100vh" }}>
        <div style={ui.container}>
          <button onClick={() => navigate(-1)} style={{ ...backButton, color: palette.muted }}>
            <ArrowLeftIcon style={icon14} /> Back
          </button>
          <section style={{ ...cardBase, border: `1px solid ${palette.border}`, background: palette.card }}>
            <h1 style={{ margin: 0, color: palette.text }}>Issue not found</h1>
          </section>
        </div>
      </div>
    );
  }

  const commentCount = Array.isArray(issue.comments) ? issue.comments.length : 0;
  const attachmentCount = Array.isArray(issue.attachments) ? issue.attachments.length : 0;
  const watcherCount = Number(issue.watchers_count || 0);

  return (
    <div style={{ minHeight: "100vh", fontFamily: "'Sora', 'Space Grotesk', 'Segoe UI', sans-serif" }}>
      <div
        style={{
          ...ambientGlow,
          background: darkMode
            ? "radial-gradient(circle at 12% 8%, rgba(59,130,246,0.18), transparent 36%), radial-gradient(circle at 86% 16%, rgba(14,165,233,0.12), transparent 32%), radial-gradient(circle at 58% 0%, rgba(99,102,241,0.12), transparent 30%)"
            : "radial-gradient(circle at 12% 8%, rgba(59,130,246,0.12), transparent 36%), radial-gradient(circle at 86% 16%, rgba(14,165,233,0.08), transparent 32%), radial-gradient(circle at 58% 0%, rgba(99,102,241,0.08), transparent 30%)",
        }}
      />
      <div style={{ ...ui.container, width: "min(1420px,100%)", position: "relative", zIndex: 1 }}>
        <button className="ui-btn-polish ui-focus-ring" onClick={() => navigate(-1)} style={{ ...backButton, color: palette.muted }}>
          <ArrowLeftIcon style={icon14} /> Back To Board
        </button>

        {error && <div style={errorBanner}>{error}</div>}

        <section
          className="ui-enter ui-card-lift ui-smooth"
          style={{
            ...hero,
            border: `1px solid ${palette.border}`,
            background: darkMode
              ? "linear-gradient(145deg, rgba(11,18,32,0.96) 0%, rgba(17,24,39,0.94) 52%, rgba(21,32,54,0.88) 100%)"
              : "linear-gradient(145deg, rgba(255,255,255,0.96) 0%, rgba(246,249,252,0.98) 58%, rgba(230,238,250,0.92) 100%)",
            boxShadow: darkMode ? "0 28px 64px rgba(2,8,23,0.42)" : "0 28px 64px rgba(15,23,42,0.1)",
            "--ui-delay": "30ms",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <p style={{ ...issueKey, color: palette.muted }}>{issue.key || `ISS-${issue.id}`}</p>
            {!editing ? (
              <h1 style={{ ...issueTitle, color: palette.text }}>{issue.title}</h1>
            ) : (
              <input value={formData.title || ""} onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))} style={ui.input} />
            )}
            <div style={tagRow}>
              <span style={{ ...chip, ...getSemanticChipStyle(issue.status, "status", darkMode) }}>{formatLabel(issue.status)}</span>
              <span style={{ ...chip, ...getSemanticChipStyle(issue.priority, "priority", darkMode) }}>{formatLabel(issue.priority)}</span>
              <span style={{ ...chip, border: `1px solid ${palette.border}`, color: palette.muted }}>{formatLabel(issue.issue_type)}</span>
            </div>
          </div>

          <div style={heroActions}>
            <div className="ui-btn-polish ui-focus-ring"><WatchButton issueId={resolvedIssueId} isWatching={Boolean(issue.is_watching)} /></div>
            {!editing ? (
              <button className="ui-btn-polish ui-focus-ring" onClick={() => setEditing(true)} style={ui.secondaryButton}>
                <PencilIcon style={icon14} /> Edit
              </button>
            ) : (
              <>
                <button className="ui-btn-polish ui-focus-ring" onClick={handleSave} disabled={saving} style={ui.primaryButton}>
                  <CheckIcon style={icon14} /> {saving ? "Saving..." : "Save"}
                </button>
                <button className="ui-btn-polish ui-focus-ring" onClick={() => setEditing(false)} disabled={saving} style={ui.secondaryButton}>
                  <XMarkIcon style={icon14} /> Cancel
                </button>
              </>
            )}
            <button className="ui-btn-polish ui-focus-ring" onClick={handleDelete} style={dangerButton}>
              <TrashIcon style={icon14} />
            </button>
          </div>
        </section>

        <section
          className="ui-enter ui-card-lift ui-smooth"
          style={{
            ...signalRail,
            border: `1px solid ${palette.border}`,
            background: darkMode ? "rgba(15,23,42,0.82)" : "rgba(255,255,255,0.8)",
            boxShadow: "var(--ui-shadow-xs)",
            "--ui-delay": "90ms",
          }}
        >
          <p style={{ ...signalTitle, color: palette.muted }}>Execution Snapshot</p>
          <div style={signalPills}>
            <span style={{ ...signalPill, ...getSemanticChipStyle(issue.status, "status", darkMode) }}>{formatLabel(issue.status)}</span>
            <span style={{ ...signalPill, ...getSemanticChipStyle(issue.priority, "priority", darkMode) }}>{formatLabel(issue.priority)} priority</span>
            <span style={{ ...signalPill, border: `1px solid ${palette.border}`, color: palette.text }}>
              <EyeIcon style={icon14} /> {watcherCount} watching
            </span>
            <span style={{ ...signalPill, border: `1px solid ${palette.border}`, color: palette.text }}>
              <ChatBubbleBottomCenterTextIcon style={icon14} /> {commentCount} comments
            </span>
            <span style={{ ...signalPill, border: `1px solid ${palette.border}`, color: palette.text }}>
              <PaperClipIcon style={icon14} /> {attachmentCount} attachments
            </span>
          </div>
        </section>

        <div className="ui-enter" style={{ ...metricsRow, "--ui-delay": "140ms" }}>
          <Metric icon={UserCircleIcon} label="Reporter" value={issue.reporter_name || "-"} palette={palette} className="ui-card-lift ui-smooth" />
          <Metric icon={UserCircleIcon} label="Assignee" value={issue.assignee_name || "Unassigned"} palette={palette} className="ui-card-lift ui-smooth" />
          <Metric icon={ClockIcon} label="Created" value={formatDateTime(issue.created_at)} palette={palette} className="ui-card-lift ui-smooth" />
          <Metric icon={CalendarDaysIcon} label="Due" value={formatDateOnly(issue.due_date)} palette={palette} className="ui-card-lift ui-smooth" />
          <Metric icon={SparklesIcon} label="Story Points" value={issue.story_points ?? "-"} palette={palette} className="ui-card-lift ui-smooth" />
        </div>

        <div className="ui-enter" style={{ ...contentLayout, "--ui-delay": "190ms" }}>
          <main style={mainStack}>
            <section className="ui-card-lift ui-smooth" style={{ ...cardBase, border: `1px solid ${palette.border}`, background: palette.card }}>
              <h2 style={{ ...sectionTitle, color: palette.text }}>Issue Brief</h2>
              {!editing ? (
                <p style={{ ...bodyText, color: palette.muted }}>{issue.description || "No description provided yet."}</p>
              ) : (
                <textarea rows={7} value={formData.description || ""} onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))} style={{ ...ui.input, resize: "vertical" }} />
              )}
            </section>

            <section className="ui-card-lift ui-smooth" style={{ ...cardBase, border: `1px solid ${palette.border}`, background: palette.card }}>
              <h2 style={{ ...sectionTitle, color: palette.text }}>
                <ChatBubbleBottomCenterTextIcon style={icon16} /> Discussion
              </h2>

              <div style={commentList}>
                {(issue.comments || []).length === 0 && <div style={{ ...emptyState, border: `1px dashed ${palette.border}`, color: palette.muted }}>No comments yet.</div>}
                {(issue.comments || []).map((comment) => (
                  <article key={comment.id} style={{ ...commentCard, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
                    <p style={{ ...commentMeta, color: palette.muted }}>{comment.author} | {formatDateTime(comment.created_at)}</p>
                    <p style={{ ...bodyText, color: palette.text }}>{comment.content}</p>
                  </article>
                ))}
              </div>

              <form onSubmit={handleAddComment} style={commentComposer}>
                <textarea rows={3} value={newComment} onChange={(event) => setNewComment(event.target.value)} placeholder="Add context, blockers, links..." style={{ ...ui.input, resize: "vertical" }} />
                <button className="ui-btn-polish ui-focus-ring" type="submit" disabled={commenting || !newComment.trim()} style={ui.primaryButton}>
                  {commenting ? "Posting..." : "Post Comment"}
                </button>
              </form>
            </section>

            <section className="ui-card-lift ui-smooth" style={{ ...cardBase, border: `1px solid ${palette.border}`, background: palette.card }}>
              <h2 style={{ ...sectionTitle, color: palette.text }}>Delivery Signals</h2>
              <div style={moduleStack}>
                <div style={{ ...subCard, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
                  <TimeTracker issueId={resolvedIssueId} />
                </div>
                <div style={{ ...subCard, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
                  <IssueAttachments issueId={resolvedIssueId} />
                </div>
                <DecisionImpactPanel issueId={resolvedIssueId} issueTitle={issue.title} />
              </div>
            </section>
          </main>

          <aside className="ui-card-lift ui-smooth" style={{ ...sidePanel, border: `1px solid ${palette.border}`, background: palette.card }}>
            <h2 style={{ ...sectionTitle, color: palette.text }}>Properties</h2>

            <Field label="Status" palette={palette}>
              {!editing ? (
                <span style={{ ...chip, width: "fit-content", ...getSemanticChipStyle(issue.status, "status", darkMode) }}>{formatLabel(issue.status)}</span>
              ) : (
                <select value={formData.status || "todo"} onChange={(event) => setFormData((prev) => ({ ...prev, status: event.target.value }))} style={ui.input}>
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>{formatLabel(status)}</option>
                  ))}
                </select>
              )}
            </Field>

            <Field label="Priority" palette={palette}>
              {!editing ? (
                <span style={{ ...chip, width: "fit-content", ...getSemanticChipStyle(issue.priority, "priority", darkMode) }}>{formatLabel(issue.priority)}</span>
              ) : (
                <select value={formData.priority || "medium"} onChange={(event) => setFormData((prev) => ({ ...prev, priority: event.target.value }))} style={ui.input}>
                  {PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>{formatLabel(priority)}</option>
                  ))}
                </select>
              )}
            </Field>

            <Field label="Assignee" palette={palette}>
              {!editing ? (
                <span style={{ ...valueText, color: palette.text }}>{issue.assignee_name || "Unassigned"}</span>
              ) : (
                <select value={formData.assignee_id ?? ""} onChange={(event) => setFormData((prev) => ({ ...prev, assignee_id: event.target.value }))} style={ui.input}>
                  <option value="">Unassigned</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>{member.full_name || member.username}</option>
                  ))}
                </select>
              )}
            </Field>

            <Field label="Sprint" palette={palette}>
              {!editing ? (
                <span style={{ ...valueText, color: palette.text }}>{issue.sprint_name || "Backlog"}</span>
              ) : (
                <select value={formData.sprint_id ?? ""} onChange={(event) => setFormData((prev) => ({ ...prev, sprint_id: event.target.value }))} style={ui.input}>
                  <option value="">Backlog</option>
                  {sprints.map((sprint) => (
                    <option key={sprint.id} value={sprint.id}>{sprint.name}</option>
                  ))}
                </select>
              )}
            </Field>

            <Field label="Story Points" palette={palette}>
              {!editing ? (
                <span style={{ ...valueText, color: palette.text }}>{issue.story_points ?? "-"}</span>
              ) : (
                <input type="number" min="0" value={formData.story_points ?? ""} onChange={(event) => setFormData((prev) => ({ ...prev, story_points: event.target.value }))} style={ui.input} />
              )}
            </Field>

            <Field label="Due Date" palette={palette}>
              {!editing ? (
                <span style={{ ...valueText, color: palette.text }}>{formatDateOnly(issue.due_date)}</span>
              ) : (
                <input type="date" value={formData.due_date || ""} onChange={(event) => setFormData((prev) => ({ ...prev, due_date: event.target.value }))} style={ui.input} />
              )}
            </Field>

            <Field label="Updated" palette={palette}>
              <span style={{ ...valueText, color: palette.muted }}>{formatDateTime(issue.updated_at)}</span>
            </Field>

            <div style={{ ...subCard, border: `1px solid ${palette.border}`, background: palette.cardAlt, marginTop: 4 }}>
              <TimeEstimate issueId={resolvedIssueId} estimate={issue.time_estimate} onUpdate={fetchIssue} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, palette }) {
  return (
    <label style={fieldWrap}>
      <span style={{ ...fieldLabel, color: palette.muted }}>{label}</span>
      {children}
    </label>
  );
}

function Metric({ icon: Icon, label, value, palette, className = "" }) {
  return (
    <article className={className} style={{ ...metricCard, border: `1px solid ${palette.border}`, background: palette.card }}>
      <p style={{ ...metricLabel, color: palette.muted }}>
        <Icon style={icon14} /> {label}
      </p>
      <p style={{ ...metricValue, color: palette.text }}>{value}</p>
    </article>
  );
}

const spinner = { width: 34, height: 34, border: "2px solid var(--app-border-strong)", borderTopColor: "var(--app-warning)", borderRadius: "50%", animation: "spin 1s linear infinite" };
const ambientGlow = { position: "fixed", inset: 0, pointerEvents: "none" };
const backButton = { display: "inline-flex", alignItems: "center", gap: 6, border: "none", background: "transparent", fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 12 };
const errorBanner = { borderRadius: 12, border: "1px solid var(--app-danger-border)", background: "var(--app-danger-soft)", color: "var(--app-danger)", padding: "10px 12px", marginBottom: 10, fontSize: 13 };
const cardBase = { borderRadius: 24, padding: "clamp(16px,2.2vw,22px)", boxShadow: "var(--ui-shadow-xs)" };
const hero = {
  borderRadius: 28,
  padding: "clamp(20px,2.8vw,30px)",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  alignItems: "start",
  gap: 18,
};
const issueKey = { margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" };
const issueTitle = { margin: "10px 0 12px", fontSize: "clamp(1.5rem,3vw,2.3rem)", letterSpacing: "-0.04em", lineHeight: 1.05, maxWidth: 820 };
const tagRow = { display: "flex", gap: 8, flexWrap: "wrap" };
const chip = { borderRadius: 999, padding: "6px 11px", fontSize: 12, fontWeight: 700, textTransform: "capitalize" };
const heroActions = { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end" };
const dangerButton = { border: "1px solid var(--app-danger-border)", borderRadius: 14, padding: 11, color: "var(--app-danger)", background: "rgba(239,68,68,0.1)", cursor: "pointer", display: "grid", placeItems: "center", boxShadow: "var(--ui-shadow-xs)" };
const signalRail = { marginTop: 14, borderRadius: 22, padding: "14px 16px", display: "grid", gap: 10 };
const signalTitle = { margin: 0, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 800 };
const signalPills = { display: "flex", gap: 8, flexWrap: "wrap" };
const signalPill = { display: "inline-flex", alignItems: "center", gap: 5, borderRadius: 999, padding: "7px 12px", fontSize: 12, fontWeight: 700, textTransform: "capitalize" };
const metricsRow = { marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12 };
const metricCard = { borderRadius: 20, padding: "14px 14px 13px", boxShadow: "var(--ui-shadow-xs)" };
const metricLabel = { margin: 0, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 5 };
const metricValue = { margin: "8px 0 0", fontSize: 14, fontWeight: 700, lineHeight: 1.4 };
const contentLayout = { marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))", gap: 12, alignItems: "start" };
const mainStack = { display: "grid", gap: 12 };
const sidePanel = { borderRadius: 24, padding: "clamp(16px,2.2vw,22px)", display: "grid", gap: 8, alignContent: "start", position: "sticky", top: 24, height: "fit-content", boxShadow: "var(--ui-shadow-xs)" };
const sectionTitle = { margin: "0 0 12px", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 16, fontWeight: 800, letterSpacing: "-0.015em" };
const bodyText = { margin: 0, fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" };
const fieldWrap = { display: "grid", gap: 6, marginBottom: 8 };
const fieldLabel = { fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 };
const valueText = { fontSize: 14, fontWeight: 600 };
const commentList = { display: "grid", gap: 10 };
const commentCard = { borderRadius: 16, padding: 12, boxShadow: "var(--ui-shadow-xs)" };
const commentMeta = { margin: "0 0 6px", fontSize: 11, fontWeight: 700 };
const commentComposer = { marginTop: 12, display: "grid", gap: 8 };
const emptyState = { borderRadius: 16, padding: "14px 12px", textAlign: "center", fontSize: 12 };
const subCard = { borderRadius: 18, padding: 12, boxShadow: "var(--ui-shadow-xs)" };
const moduleStack = { display: "grid", gap: 12 };
const icon14 = { width: 14, height: 14 };
const icon16 = { width: 16, height: 16 };

export default IssueDetail;

