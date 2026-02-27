import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  CheckIcon,
  ChatBubbleBottomCenterTextIcon,
  ClockIcon,
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
    todo: { border: "rgba(59,130,246,0.55)", text: "#60a5fa", bgDark: "rgba(59,130,246,0.14)", bgLight: "rgba(59,130,246,0.14)" },
    in_progress: { border: "rgba(245,158,11,0.55)", text: "#f59e0b", bgDark: "rgba(245,158,11,0.16)", bgLight: "rgba(245,158,11,0.16)" },
    in_review: { border: "rgba(168,85,247,0.55)", text: "#a78bfa", bgDark: "rgba(168,85,247,0.16)", bgLight: "rgba(168,85,247,0.14)" },
    testing: { border: "rgba(236,72,153,0.55)", text: "#f472b6", bgDark: "rgba(236,72,153,0.16)", bgLight: "rgba(236,72,153,0.14)" },
    done: { border: "rgba(34,197,94,0.55)", text: "#22c55e", bgDark: "rgba(34,197,94,0.16)", bgLight: "rgba(34,197,94,0.14)" },
  };
  const priorityStyles = {
    lowest: { border: "rgba(34,197,94,0.55)", text: "#22c55e", bgDark: "rgba(34,197,94,0.16)", bgLight: "rgba(34,197,94,0.14)" },
    low: { border: "rgba(132,204,22,0.55)", text: "#84cc16", bgDark: "rgba(132,204,22,0.16)", bgLight: "rgba(132,204,22,0.14)" },
    medium: { border: "rgba(245,158,11,0.55)", text: "#f59e0b", bgDark: "rgba(245,158,11,0.16)", bgLight: "rgba(245,158,11,0.14)" },
    high: { border: "rgba(249,115,22,0.55)", text: "#f97316", bgDark: "rgba(249,115,22,0.16)", bgLight: "rgba(249,115,22,0.14)" },
    highest: { border: "rgba(239,68,68,0.55)", text: "#ef4444", bgDark: "rgba(239,68,68,0.16)", bgLight: "rgba(239,68,68,0.14)" },
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

  const fetchIssue = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/agile/issues/${issueId}/`);
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
  }, [issueId]);

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

      await api.put(`/api/agile/issues/${issueId}/`, payload);
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
      await api.delete(`/api/agile/issues/${issueId}/`);
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
      await api.post(`/api/agile/issues/${issueId}/comments/`, { content: newComment.trim() });
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
      <div style={{ minHeight: "100vh", background: palette.bg, display: "grid", placeItems: "center" }}>
        <div style={spinner} />
      </div>
    );
  }

  if (!issue) {
    return (
      <div style={{ minHeight: "100vh", background: palette.bg }}>
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

  return (
    <div style={{ minHeight: "100vh", background: palette.bg, fontFamily: "'League Spartan', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <div style={{ ...ambientGlow, background: darkMode ? "radial-gradient(circle at 10% 8%,rgba(245,158,11,0.18),transparent 42%), radial-gradient(circle at 85% 18%,rgba(59,130,246,0.16),transparent 36%)" : "radial-gradient(circle at 10% 8%,rgba(245,158,11,0.1),transparent 42%), radial-gradient(circle at 85% 18%,rgba(59,130,246,0.08),transparent 36%)" }} />
      <div style={{ ...ui.container, width: "min(1420px,100%)", position: "relative", zIndex: 1 }}>
        <button onClick={() => navigate(-1)} style={{ ...backButton, color: palette.muted }}>
          <ArrowLeftIcon style={icon14} /> Back To Board
        </button>

        {error && <div style={errorBanner}>{error}</div>}

        <section style={{ ...hero, border: `1px solid ${palette.border}`, background: darkMode ? "linear-gradient(140deg,#1b1417 0%,#140f11 100%)" : "linear-gradient(140deg,#fffdf9 0%,#fff7ea 100%)", boxShadow: darkMode ? "0 26px 60px rgba(0,0,0,0.35)" : "0 26px 60px rgba(20,12,4,0.08)" }}>
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
            <WatchButton issueId={issueId} isWatching={Boolean(issue.is_watching)} />
            {!editing ? (
              <button onClick={() => setEditing(true)} style={ui.secondaryButton}>
                <PencilIcon style={icon14} /> Edit
              </button>
            ) : (
              <>
                <button onClick={handleSave} disabled={saving} style={ui.primaryButton}>
                  <CheckIcon style={icon14} /> {saving ? "Saving..." : "Save"}
                </button>
                <button onClick={() => setEditing(false)} disabled={saving} style={ui.secondaryButton}>
                  <XMarkIcon style={icon14} /> Cancel
                </button>
              </>
            )}
            <button onClick={handleDelete} style={dangerButton}>
              <TrashIcon style={icon14} />
            </button>
          </div>
        </section>

        <div style={metricsRow}>
          <Metric icon={UserCircleIcon} label="Reporter" value={issue.reporter_name || "-"} palette={palette} />
          <Metric icon={ClockIcon} label="Created" value={formatDateTime(issue.created_at)} palette={palette} />
          <Metric icon={CalendarDaysIcon} label="Due" value={formatDateOnly(issue.due_date)} palette={palette} />
          <Metric icon={SparklesIcon} label="Story Points" value={issue.story_points ?? "-"} palette={palette} />
        </div>

        <div style={contentLayout}>
          <main style={mainStack}>
            <section style={{ ...cardBase, border: `1px solid ${palette.border}`, background: palette.card }}>
              <h2 style={{ ...sectionTitle, color: palette.text }}>Issue Brief</h2>
              {!editing ? (
                <p style={{ ...bodyText, color: palette.muted }}>{issue.description || "No description provided yet."}</p>
              ) : (
                <textarea rows={7} value={formData.description || ""} onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))} style={{ ...ui.input, resize: "vertical" }} />
              )}
            </section>

            <section style={{ ...cardBase, border: `1px solid ${palette.border}`, background: palette.card }}>
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
                <button type="submit" disabled={commenting || !newComment.trim()} style={ui.primaryButton}>
                  {commenting ? "Posting..." : "Post Comment"}
                </button>
              </form>
            </section>

            <section style={{ ...cardBase, border: `1px solid ${palette.border}`, background: palette.card }}>
              <h2 style={{ ...sectionTitle, color: palette.text }}>Delivery Signals</h2>
              <div style={moduleStack}>
                <div style={{ ...subCard, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
                  <TimeTracker issueId={issueId} />
                </div>
                <div style={{ ...subCard, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
                  <IssueAttachments issueId={issueId} />
                </div>
                <DecisionImpactPanel issueId={issueId} issueTitle={issue.title} />
              </div>
            </section>
          </main>

          <aside style={{ ...sidePanel, border: `1px solid ${palette.border}`, background: palette.card }}>
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
              <TimeEstimate issueId={issueId} estimate={issue.time_estimate} onUpdate={fetchIssue} />
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

function Metric({ icon: Icon, label, value, palette }) {
  return (
    <article style={{ ...metricCard, border: `1px solid ${palette.border}`, background: palette.card }}>
      <p style={{ ...metricLabel, color: palette.muted }}>
        <Icon style={icon14} /> {label}
      </p>
      <p style={{ ...metricValue, color: palette.text }}>{value}</p>
    </article>
  );
}

const spinner = { width: 34, height: 34, border: "2px solid rgba(120,120,120,0.35)", borderTopColor: "#f59e0b", borderRadius: "50%", animation: "spin 1s linear infinite" };
const ambientGlow = { position: "fixed", inset: 0, pointerEvents: "none" };
const backButton = { display: "inline-flex", alignItems: "center", gap: 6, border: "none", background: "transparent", fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 12 };
const errorBanner = { borderRadius: 12, border: "1px solid rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.12)", color: "#ef4444", padding: "10px 12px", marginBottom: 10, fontSize: 13 };
const cardBase = { borderRadius: 18, padding: "clamp(12px,2vw,18px)" };
const hero = { borderRadius: 20, padding: "clamp(14px,2.2vw,22px)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" };
const issueKey = { margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" };
const issueTitle = { margin: "8px 0 10px", fontSize: "clamp(1.4rem,3vw,2.15rem)", letterSpacing: "-0.03em", lineHeight: 1.1 };
const tagRow = { display: "flex", gap: 8, flexWrap: "wrap" };
const chip = { borderRadius: 999, padding: "5px 10px", fontSize: 12, fontWeight: 700, textTransform: "capitalize" };
const heroActions = { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" };
const dangerButton = { border: "1px solid rgba(239,68,68,0.45)", borderRadius: 10, padding: 9, color: "#ef4444", background: "rgba(239,68,68,0.1)", cursor: "pointer", display: "grid", placeItems: "center" };
const metricsRow = { marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10 };
const metricCard = { borderRadius: 14, padding: "10px 12px" };
const metricLabel = { margin: 0, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 5 };
const metricValue = { margin: "7px 0 0", fontSize: 13, fontWeight: 700 };
const contentLayout = { marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 10 };
const mainStack = { display: "grid", gap: 10 };
const sidePanel = { borderRadius: 18, padding: "clamp(12px,2vw,18px)", display: "grid", gap: 4, alignContent: "start", position: "sticky", top: 12, height: "fit-content" };
const sectionTitle = { margin: "0 0 10px", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 16, fontWeight: 800, letterSpacing: "-0.01em" };
const bodyText = { margin: 0, fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" };
const fieldWrap = { display: "grid", gap: 6, marginBottom: 8 };
const fieldLabel = { fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 };
const valueText = { fontSize: 14, fontWeight: 600 };
const commentList = { display: "grid", gap: 8 };
const commentCard = { borderRadius: 12, padding: 10 };
const commentMeta = { margin: "0 0 6px", fontSize: 11, fontWeight: 700 };
const commentComposer = { marginTop: 10, display: "grid", gap: 8 };
const emptyState = { borderRadius: 10, padding: "12px 10px", textAlign: "center", fontSize: 12 };
const subCard = { borderRadius: 12, padding: 10 };
const moduleStack = { display: "grid", gap: 10 };
const icon14 = { width: 14, height: 14 };
const icon16 = { width: 16, height: 16 };

export default IssueDetail;
