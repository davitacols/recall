import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  ArrowTopRightOnSquareIcon,
  CalendarDaysIcon,
  ChatBubbleBottomCenterTextIcon,
  CheckIcon,
  ClockIcon,
  CodeBracketIcon,
  EyeIcon,
  FolderIcon,
  PaperClipIcon,
  PencilIcon,
  QueueListIcon,
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
import { WorkspaceEmptyState, WorkspacePanel } from "../components/WorkspaceChrome";
import AIAssistant from "../components/AIAssistant";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";
import { buildAskRecallPath } from "../utils/askRecall";

const STATUSES = ["backlog", "todo", "in_progress", "in_review", "testing", "done"];
const PRIORITIES = ["lowest", "low", "medium", "high", "highest"];
const ISSUE_TYPES = ["epic", "story", "task", "bug", "subtask"];

const getApiErrorMessage = (error, fallback) =>
  error?.response?.data?.detail ||
  error?.response?.data?.error ||
  error?.response?.data?.message ||
  error?.message ||
  fallback;

const formatLabel = (value) => (value ? String(value).replaceAll("_", " ") : "-");
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
  const [attachmentCount, setAttachmentCount] = useState(0);
  const [githubTimeline, setGithubTimeline] = useState(null);
  const [githubLoading, setGithubLoading] = useState(false);

  const resolvedIssueId = issue?.id ? String(issue.id) : String(issueId);

  const fetchGithubTimeline = useCallback(async (targetIssueId) => {
    if (!targetIssueId) {
      setGithubTimeline(null);
      return;
    }
    try {
      setGithubLoading(true);
      const response = await api.get(`/api/integrations/fresh/github/issues/${targetIssueId}/timeline/`);
      setGithubTimeline(response.data);
    } catch (_) {
      setGithubTimeline(null);
    } finally {
      setGithubLoading(false);
    }
  }, []);

  const fetchIssue = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/agile/issues/${issueId}/`);
      if (String(response.data?.id || "") !== String(issueId)) {
        navigate(`/issues/${response.data.id}`, { replace: true });
      }
      setIssue(response.data);
      fetchGithubTimeline(response.data.id);
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
      setAttachmentCount(Array.isArray(response.data.attachments) ? response.data.attachments.length : 0);
      setError("");

      if (response.data.project_id) {
        const sprintResponse = await api.get(`/api/agile/projects/${response.data.project_id}/sprints/`);
        setSprints(sprintResponse.data || []);
      } else {
        setSprints([]);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load issue"));
    } finally {
      setLoading(false);
    }
  }, [fetchGithubTimeline, issueId, navigate]);

  const fetchTeamMembers = useCallback(async () => {
    try {
      const response = await api.get("/api/organizations/members/");
      setTeamMembers(response.data || []);
    } catch (_) {
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

  const handleApplyIssueAI = ({ kind, summary, actionItems }) => {
    setFormData((current) => {
      if (kind === "summary" && summary) {
        return { ...current, description: summary };
      }
      if (kind === "actions" && Array.isArray(actionItems) && actionItems.length > 0) {
        return {
          ...current,
          description: `${current.description || issue.description || ""}${current.description || issue.description ? "\n\n" : ""}AI suggested next actions:\n${actionItems.map((item) => `- ${item}`).join("\n")}`,
        };
      }
      return current;
    });
    setEditing(true);
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

  const handleWatchToggle = (nextWatching) => {
    setIssue((current) => {
      if (!current) return current;
      const previous = Boolean(current.is_watching);
      const delta = previous === nextWatching ? 0 : nextWatching ? 1 : -1;
      return {
        ...current,
        is_watching: nextWatching,
        watchers_count: Math.max(0, Number(current.watchers_count || 0) + delta),
      };
    });
  };

  if (loading) {
    return (
      <div style={loadingWrap}>
        <div style={spinner} />
      </div>
    );
  }

  if (!issue) {
    return (
      <div style={{ minHeight: "100vh" }}>
        <div style={ui.container}>
          <button className="ui-btn-polish ui-focus-ring" onClick={() => navigate(-1)} style={{ ...backButton, color: palette.muted }}>
            <ArrowLeftIcon style={icon14} /> Back
          </button>
          <WorkspacePanel palette={palette} darkMode={darkMode} variant="execution" eyebrow="Issue" title="Issue not found">
            <p style={{ ...bodyText, color: palette.muted }}>
              The issue could not be loaded or may no longer exist.
            </p>
          </WorkspacePanel>
        </div>
      </div>
    );
  }

  const commentCount = Array.isArray(issue.comments) ? issue.comments.length : 0;
  const watcherCount = Number(issue.watchers_count || 0);
  const labels = Array.isArray(issue.labels) ? issue.labels : [];
  const isOverdue =
    issue.due_date &&
    issue.status !== "done" &&
    new Date(issue.due_date).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0);
  const issueAnchorName = issue.key ? `${issue.key} ${issue.title}` : issue.title;
  const issueAskRecallQuestion = issue.sprint_name
    ? `What is the current status of ${issueAnchorName} in ${issue.sprint_name}, what is blocking it, and what should happen next?`
    : `What is the current status of ${issueAnchorName}, what is blocking it, and what should happen next?`;

  const engineeringRows = [
    { label: "Code review", value: issue.code_review_status ? formatLabel(issue.code_review_status) : "Not linked" },
    { label: "Branch", value: issue.branch_name || "Not linked" },
    { label: "Commit", value: issue.commit_hash || "Not linked" },
    { label: "CI status", value: issue.ci_status ? formatLabel(issue.ci_status) : "Not linked" },
    { label: "Test coverage", value: issue.test_coverage != null ? `${issue.test_coverage}%` : "Unknown" },
  ];

  const hasEngineeringLinks = Boolean(issue.pr_url || issue.ci_url);
  const hasEngineeringSignals = hasEngineeringLinks || engineeringRows.some((item) => item.value !== "Not linked");

  return (
    <div style={pageRoot}>
      <div
        style={{
          ...ambientGlow,
          background: darkMode
            ? "radial-gradient(circle at 12% 10%, rgba(154,185,255,0.18), transparent 34%), radial-gradient(circle at 88% 8%, rgba(210,168,106,0.12), transparent 28%), radial-gradient(circle at 56% 0%, rgba(121,200,159,0.08), transparent 24%)"
            : "radial-gradient(circle at 12% 10%, rgba(46,99,208,0.12), transparent 34%), radial-gradient(circle at 88% 8%, rgba(168,116,57,0.08), transparent 28%), radial-gradient(circle at 56% 0%, rgba(47,127,95,0.08), transparent 24%)",
        }}
      />

      <div style={{ ...ui.container, width: "min(1500px, 100%)", position: "relative", zIndex: 1 }}>
        <div style={topRow}>
          <button className="ui-btn-polish ui-focus-ring" onClick={() => navigate(-1)} style={{ ...backButton, color: palette.muted }}>
            <ArrowLeftIcon style={icon14} /> Back
          </button>

          <div style={contextLinkRow}>
            {issue.project_id ? (
              <Link className="ui-btn-polish ui-focus-ring" to={`/projects/${issue.project_id}`} style={contextLink(palette)}>
                <FolderIcon style={icon14} />
                Project Workspace
              </Link>
            ) : null}
            {issue.sprint_id ? (
              <Link className="ui-btn-polish ui-focus-ring" to={`/sprints/${issue.sprint_id}`} style={contextLink(palette)}>
                <QueueListIcon style={icon14} />
                {issue.sprint_name || "Open Sprint"}
              </Link>
            ) : null}
            <button
              className="ui-btn-polish ui-focus-ring"
              onClick={() => navigate(buildAskRecallPath(issueAskRecallQuestion))}
              style={contextLink(palette)}
            >
              <SparklesIcon style={icon14} />
              Ask Recall
            </button>
          </div>
        </div>

        {error ? (
          <div
            style={{
              ...errorBanner,
              border: `1px solid ${palette.danger}`,
              color: palette.danger,
              background: darkMode ? "rgba(200, 86, 93, 0.14)" : "rgba(200, 86, 93, 0.08)",
            }}
          >
            {error}
          </div>
        ) : null}

        <section
          className="ui-enter ui-card-lift ui-smooth"
          style={{
            ...heroCard,
            border: `1px solid ${palette.border}`,
            background: palette.card,
            "--ui-delay": "40ms",
          }}
        >
          <div style={{ minWidth: 0, display: "grid", gap: 14 }}>
            <div style={{ display: "grid", gap: 8 }}>
              <p style={{ ...eyebrow, color: palette.muted }}>Issue Workspace</p>
              <p style={{ ...issueKey, color: palette.muted }}>{issue.key || `ISS-${issue.id}`}</p>
              {!editing ? (
                <h1 style={{ ...heroTitle, color: palette.text }}>{issue.title}</h1>
              ) : (
                <input
                  value={formData.title || ""}
                  onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
                  style={{ ...ui.input, fontSize: 18, fontWeight: 700 }}
                />
              )}
              <p style={{ ...heroSummary, color: palette.muted }}>
                {(editing ? formData.description : issue.description) || "Capture the issue outcome, blockers, and supporting context in a single workspace."}
              </p>
            </div>

            <div style={chipRow}>
              <span style={{ ...chip, ...getSemanticChipStyle(editing ? formData.status : issue.status, "status", darkMode) }}>
                {formatLabel(editing ? formData.status : issue.status)}
              </span>
              <span style={{ ...chip, ...getSemanticChipStyle(editing ? formData.priority : issue.priority, "priority", darkMode) }}>
                {formatLabel(editing ? formData.priority : issue.priority)}
              </span>
              <span style={{ ...chip, border: `1px solid ${palette.border}`, color: palette.muted }}>
                {formatLabel(editing ? formData.issue_type : issue.issue_type)}
              </span>
              {labels.slice(0, 4).map((label) => (
                <span key={label} style={{ ...chip, border: `1px solid ${palette.border}`, color: palette.text }}>
                  {label}
                </span>
              ))}
            </div>

            <div style={heroMetaRow}>
              <p style={{ ...tinyMeta, color: palette.muted }}>Updated {formatDateTime(issue.updated_at)}</p>
              {isOverdue ? (
                <span style={{ ...statusNote, color: palette.warn, border: `1px solid ${palette.border}` }}>
                  Due date has passed
                </span>
              ) : null}
            </div>
          </div>

          <aside style={heroAside}>
            <div style={heroAsideHeader}>
              <div>
                <p style={{ ...eyebrow, color: palette.muted }}>Issue Readout</p>
                <p style={{ ...asideTitle, color: palette.text }}>Current state and activity</p>
              </div>
              <div style={heroActionRow}>
                <WatchButton issueId={resolvedIssueId} isWatching={Boolean(issue.is_watching)} onToggle={handleWatchToggle} />
                <button className="ui-btn-polish ui-focus-ring" onClick={handleDelete} style={dangerButton(palette)}>
                  <TrashIcon style={icon14} />
                </button>
              </div>
            </div>

            <div style={summaryGrid}>
              <SummaryTile icon={EyeIcon} label="Watching" value={watcherCount} helper="Team members following this issue" palette={palette} />
              <SummaryTile icon={ChatBubbleBottomCenterTextIcon} label="Comments" value={commentCount} helper="Discussion and delivery notes" palette={palette} />
              <SummaryTile icon={PaperClipIcon} label="Files" value={attachmentCount} helper="Attachments and supporting evidence" palette={palette} />
              <SummaryTile icon={SparklesIcon} label="Story Points" value={issue.story_points ?? "-"} helper={issue.due_date ? `Due ${formatDateOnly(issue.due_date)}` : "No due date set"} palette={palette} />
            </div>
          </aside>
        </section>

        <section
          className="ui-enter"
          style={{
            ...contentGrid,
            "--ui-delay": "120ms",
          }}
        >
          <main style={mainColumn}>
            <WorkspacePanel
              palette={palette}
              darkMode={darkMode}
              variant="execution"
              eyebrow="Brief"
              title="Issue brief"
              description="Keep the problem statement and implementation notes readable instead of burying them under metadata."
            >
              <AIAssistant
                content={`${issue.title || ""}\n\n${editing ? formData.description || "" : issue.description || ""}`}
                contentType="issue"
                onApply={handleApplyIssueAI}
              />

              {!editing ? (
                <p style={{ ...descriptionText, color: palette.muted }}>
                  {issue.description || "No description provided yet."}
                </p>
              ) : (
                <textarea
                  rows={8}
                  value={formData.description || ""}
                  onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
                  style={{ ...ui.input, resize: "vertical" }}
                />
              )}

              {labels.length ? (
                <div style={supportingRow}>
                  <p style={{ ...eyebrow, color: palette.muted }}>Labels</p>
                  <div style={chipRow}>
                    {labels.map((label) => (
                      <span key={label} style={{ ...chip, border: `1px solid ${palette.border}`, color: palette.text }}>
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </WorkspacePanel>

            <WorkspacePanel
              palette={palette}
              darkMode={darkMode}
              variant="execution"
              eyebrow="Discussion"
              title="Team thread"
              description="Capture blockers, implementation notes, and decision breadcrumbs in one place."
            >
              {(issue.comments || []).length ? (
                <div style={commentList}>
                  {(issue.comments || []).map((comment) => (
                    <article
                      key={comment.id}
                      className="ui-card-lift ui-smooth"
                      style={{ ...commentCard, border: `1px solid ${palette.border}`, background: palette.cardAlt }}
                    >
                      <div style={commentHead}>
                        <p style={{ ...commentAuthor, color: palette.text }}>{comment.author || "Unknown"}</p>
                        <p style={{ ...tinyMeta, color: palette.muted }}>{formatDateTime(comment.created_at)}</p>
                      </div>
                      <p style={{ ...commentBody, color: palette.text }}>{comment.content}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <div style={{ ...emptyState, border: `1px dashed ${palette.border}`, color: palette.muted }}>
                  No comments yet. Use this thread to leave blockers, decisions, and implementation notes.
                </div>
              )}

              <form onSubmit={handleAddComment} style={commentComposer}>
                <textarea
                  rows={4}
                  value={newComment}
                  onChange={(event) => setNewComment(event.target.value)}
                  placeholder="Add context, blockers, links, or implementation notes..."
                  style={{ ...ui.input, resize: "vertical" }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    className="ui-btn-polish ui-focus-ring"
                    type="submit"
                    disabled={commenting || !newComment.trim()}
                    style={{
                      ...ui.primaryButton,
                      opacity: commenting || !newComment.trim() ? 0.7 : 1,
                      cursor: commenting || !newComment.trim() ? "not-allowed" : "pointer",
                    }}
                  >
                    {commenting ? "Posting..." : "Post Comment"}
                  </button>
                </div>
              </form>
            </WorkspacePanel>

            <WorkspacePanel
              palette={palette}
              darkMode={darkMode}
              variant="execution"
              eyebrow="Signals"
              title="Execution signals"
              description="Bring together time, files, and decision context without making the issue page feel overloaded."
            >
              <div style={moduleGrid}>
                <div style={{ ...moduleCard, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
                  <TimeTracker issueId={resolvedIssueId} />
                </div>
                <div style={{ ...moduleCard, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
                  <IssueAttachments issueId={resolvedIssueId} onCountChange={setAttachmentCount} />
                </div>
              </div>
              <div style={{ ...moduleCard, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
                <DecisionImpactPanel issueId={resolvedIssueId} issueTitle={issue.title} />
              </div>
            </WorkspacePanel>
          </main>

          <aside style={asideColumn}>
            <WorkspacePanel
              palette={palette}
              darkMode={darkMode}
              variant="execution"
              eyebrow="Workflow"
              title="Issue controls"
              description="Update the issue state, assignment, planning context, and estimate from one calmer control surface."
              action={
                !editing ? (
                  <button className="ui-btn-polish ui-focus-ring" onClick={() => setEditing(true)} style={ui.secondaryButton}>
                    <PencilIcon style={icon14} /> Edit
                  </button>
                ) : (
                  <div style={actionRow}>
                    <button className="ui-btn-polish ui-focus-ring" onClick={handleSave} disabled={saving} style={ui.primaryButton}>
                      <CheckIcon style={icon14} /> {saving ? "Saving..." : "Save"}
                    </button>
                    <button
                      className="ui-btn-polish ui-focus-ring"
                      onClick={() => {
                        setEditing(false);
                        setFormData({
                          title: issue.title || "",
                          description: issue.description || "",
                          status: issue.status || "todo",
                          priority: issue.priority || "medium",
                          issue_type: issue.issue_type || "task",
                          assignee_id: issue.assignee_id ?? "",
                          sprint_id: issue.sprint_id ?? "",
                          story_points: issue.story_points ?? "",
                          due_date: issue.due_date || "",
                        });
                      }}
                      disabled={saving}
                      style={ui.secondaryButton}
                    >
                      <XMarkIcon style={icon14} /> Cancel
                    </button>
                  </div>
                )
              }
            >
              <div style={fieldGrid}>
                <Field label="Status" palette={palette}>
                  {!editing ? (
                    <span style={{ ...chip, width: "fit-content", ...getSemanticChipStyle(issue.status, "status", darkMode) }}>
                      {formatLabel(issue.status)}
                    </span>
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
                    <span style={{ ...chip, width: "fit-content", ...getSemanticChipStyle(issue.priority, "priority", darkMode) }}>
                      {formatLabel(issue.priority)}
                    </span>
                  ) : (
                    <select value={formData.priority || "medium"} onChange={(event) => setFormData((prev) => ({ ...prev, priority: event.target.value }))} style={ui.input}>
                      {PRIORITIES.map((priority) => (
                        <option key={priority} value={priority}>{formatLabel(priority)}</option>
                      ))}
                    </select>
                  )}
                </Field>

                <Field label="Issue type" palette={palette}>
                  {!editing ? (
                    <span style={{ ...chip, width: "fit-content", border: `1px solid ${palette.border}`, color: palette.text }}>
                      {formatLabel(issue.issue_type)}
                    </span>
                  ) : (
                    <select value={formData.issue_type || "task"} onChange={(event) => setFormData((prev) => ({ ...prev, issue_type: event.target.value }))} style={ui.input}>
                      {ISSUE_TYPES.map((type) => (
                        <option key={type} value={type}>{formatLabel(type)}</option>
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

                <Field label="Story points" palette={palette}>
                  {!editing ? (
                    <span style={{ ...valueText, color: palette.text }}>{issue.story_points ?? "-"}</span>
                  ) : (
                    <input type="number" min="0" value={formData.story_points ?? ""} onChange={(event) => setFormData((prev) => ({ ...prev, story_points: event.target.value }))} style={ui.input} />
                  )}
                </Field>

                <Field label="Due date" palette={palette}>
                  {!editing ? (
                    <span style={{ ...valueText, color: palette.text }}>{formatDateOnly(issue.due_date)}</span>
                  ) : (
                    <input type="date" value={formData.due_date || ""} onChange={(event) => setFormData((prev) => ({ ...prev, due_date: event.target.value }))} style={ui.input} />
                  )}
                </Field>
              </div>
            </WorkspacePanel>

            <WorkspacePanel
              palette={palette}
              darkMode={darkMode}
              variant="execution"
              eyebrow="Context"
              title="Timeline and accountability"
              description="Keep the assignee, reporter, and connected planning surfaces visible without digging through the project."
            >
              <InfoRow icon={UserCircleIcon} label="Reporter" value={issue.reporter_name || "-"} palette={palette} />
              <InfoRow icon={UserCircleIcon} label="Assignee" value={issue.assignee_name || "Unassigned"} palette={palette} />
              <InfoRow icon={ClockIcon} label="Created" value={formatDateTime(issue.created_at)} palette={palette} />
              <InfoRow icon={CalendarDaysIcon} label="Updated" value={formatDateTime(issue.updated_at)} palette={palette} />
              <InfoRow
                icon={FolderIcon}
                label="Project"
                palette={palette}
                valueNode={
                  issue.project_id ? (
                    <Link className="ui-focus-ring" to={`/projects/${issue.project_id}`} style={inlineLink(palette)}>
                      Open project workspace
                    </Link>
                  ) : (
                    <span style={{ ...valueText, color: palette.muted }}>No project linked</span>
                  )
                }
              />
              <InfoRow
                icon={QueueListIcon}
                label="Sprint"
                palette={palette}
                valueNode={
                  issue.sprint_id ? (
                    <Link className="ui-focus-ring" to={`/sprints/${issue.sprint_id}`} style={inlineLink(palette)}>
                      {issue.sprint_name || "Open sprint"}
                    </Link>
                  ) : (
                    <span style={{ ...valueText, color: palette.muted }}>Backlog</span>
                  )
                }
              />
            </WorkspacePanel>

            <WorkspacePanel
              palette={palette}
              darkMode={darkMode}
              variant="execution"
              eyebrow="Engineering"
              title="Code and delivery signals"
              description="Surface pull request, CI, branch, and estimate context when this issue is connected to execution."
            >
              {hasEngineeringSignals ? (
                <div style={infoStack}>
                  {engineeringRows.map((row) => (
                    <InfoRow key={row.label} icon={CodeBracketIcon} label={row.label} value={row.value} palette={palette} />
                  ))}

                  {issue.pr_url ? (
                    <InfoRow
                      icon={ArrowTopRightOnSquareIcon}
                      label="Pull request"
                      palette={palette}
                      valueNode={
                        <a href={issue.pr_url} target="_blank" rel="noopener noreferrer" style={inlineLink(palette)}>
                          Open pull request
                        </a>
                      }
                    />
                  ) : null}

                  {issue.ci_url ? (
                    <InfoRow
                      icon={ArrowTopRightOnSquareIcon}
                      label="CI build"
                      palette={palette}
                      valueNode={
                        <a href={issue.ci_url} target="_blank" rel="noopener noreferrer" style={inlineLink(palette)}>
                          Open CI run
                        </a>
                      }
                    />
                  ) : null}
                </div>
              ) : (
                <WorkspaceEmptyState
                  palette={palette}
                  darkMode={darkMode}
                  variant="execution"
                  title="No engineering signals yet"
                  description="Link a branch, pull request, CI run, or estimate to make this issue more execution-aware."
                />
              )}

              <GitHubTimelineCard timeline={githubTimeline} loading={githubLoading} palette={palette} />

              <div style={{ ...moduleCard, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
                <TimeEstimate issueId={resolvedIssueId} estimate={issue.time_estimate} onUpdate={fetchIssue} />
              </div>
            </WorkspacePanel>
          </aside>
        </section>
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

function SummaryTile({ icon: Icon, label, value, helper, palette }) {
  return (
    <article style={{ ...summaryTile, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
      <p style={{ ...summaryLabel, color: palette.muted }}>
        <Icon style={icon14} /> {label}
      </p>
      <p style={{ ...summaryValue, color: palette.text }}>{value}</p>
      <p style={{ ...summaryHelper, color: palette.muted }}>{helper}</p>
    </article>
  );
}

function InfoRow({ icon: Icon, label, value, palette, valueNode }) {
  return (
    <div style={{ ...infoRow, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
      <p style={{ ...infoLabel, color: palette.muted }}>
        <Icon style={icon14} /> {label}
      </p>
      <div style={{ minWidth: 0 }}>{valueNode || <span style={{ ...valueText, color: palette.text }}>{value}</span>}</div>
    </div>
  );
}

function GitHubTimelineCard({ timeline, loading, palette }) {
  if (loading) {
    return (
      <div style={{ ...moduleCard, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
        <p style={{ ...bodySm, color: palette.muted }}>Loading GitHub timeline...</p>
      </div>
    );
  }

  if (!timeline?.repository?.configured) {
    return null;
  }

  const recent = timeline.recent_activity || [];
  return (
    <div style={{ ...moduleCard, border: `1px solid ${palette.border}`, background: palette.cardAlt, display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <p style={{ ...eyebrowText, color: palette.muted }}>GitHub Timeline</p>
          <p style={{ ...sectionTitle, color: palette.text, marginTop: 4 }}>
            {(timeline.implementation_status || "not_started").replaceAll("_", " ")}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <MiniMetric label="PRs" value={timeline.summary?.pull_requests || 0} palette={palette} />
          <MiniMetric label="Commits" value={timeline.summary?.commits || 0} palette={palette} />
          <MiniMetric label="Deploys" value={timeline.summary?.deployments || 0} palette={palette} />
        </div>
      </div>

      <div style={{ ...infoRow, border: `1px solid ${palette.border}`, background: palette.card }}>
        <p style={{ ...infoLabel, color: palette.muted }}>Suggested branch</p>
        <p style={{ ...infoValue, color: palette.text }}>{timeline.naming?.suggested_branch || "-"}</p>
      </div>

      {timeline.linked_decisions?.length ? (
        <div style={{ display: "grid", gap: 8 }}>
          {timeline.linked_decisions.map((decision) => (
            <div key={decision.id} style={{ ...infoRow, border: `1px solid ${palette.border}`, background: palette.card }}>
              <p style={{ ...infoLabel, color: palette.muted }}>Linked decision</p>
              <p style={{ ...infoValue, color: palette.text }}>
                {decision.title} ({decision.impact_type?.replaceAll("_", " ")})
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {recent.length ? (
        <div style={{ display: "grid", gap: 8 }}>
          {recent.slice(0, 3).map((item, index) => {
            const content = (
              <>
                <p style={{ ...bodySmStrong, color: palette.text }}>{item.title || item.type}</p>
                <p style={{ ...bodySm, color: palette.muted }}>
                  {[item.subtitle, item.author, item.timestamp ? new Date(item.timestamp).toLocaleString() : null].filter(Boolean).join(" | ")}
                </p>
              </>
            );

            if (!item.url) {
              return (
                <div
                  key={`${item.type}-${index}`}
                  style={{
                    ...moduleCard,
                    border: `1px solid ${palette.border}`,
                    background: palette.card,
                    display: "grid",
                    gap: 4,
                  }}
                >
                  {content}
                </div>
              );
            }

            return (
              <a
                key={`${item.type}-${item.url}`}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  ...moduleCard,
                  border: `1px solid ${palette.border}`,
                  background: palette.card,
                  textDecoration: "none",
                  display: "grid",
                  gap: 4,
                }}
              >
                {content}
              </a>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function MiniMetric({ label, value, palette }) {
  return (
    <div style={{ ...moduleCard, padding: "10px 12px", border: `1px solid ${palette.border}`, background: palette.card }}>
      <p style={{ ...eyebrowText, color: palette.muted }}>{label}</p>
      <p style={{ ...bodyLgStrong, color: palette.text, marginTop: 4 }}>{value}</p>
    </div>
  );
}

function contextLink(palette) {
  return {
    textDecoration: "none",
    borderRadius: 999,
    padding: "9px 12px",
    fontSize: 12,
    fontWeight: 800,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    border: `1px solid ${palette.border}`,
    background: palette.card,
    color: palette.text,
  };
}

function inlineLink(palette) {
  return {
    color: palette.link,
    fontSize: 13,
    fontWeight: 700,
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  };
}

function dangerButton(palette) {
  return {
    borderRadius: 999,
    width: 40,
    height: 40,
    display: "grid",
    placeItems: "center",
    border: `1px solid ${palette.border}`,
    color: palette.danger,
    background: "rgba(239, 68, 68, 0.1)",
    cursor: "pointer",
  };
}

const pageRoot = { minHeight: "100vh", position: "relative" };
const ambientGlow = { position: "fixed", inset: 0, pointerEvents: "none" };
const loadingWrap = { minHeight: "100vh", display: "grid", placeItems: "center" };
const spinner = { width: 34, height: 34, border: "2px solid var(--app-border-strong)", borderTopColor: "var(--app-warning)", borderRadius: "50%", animation: "spin 1s linear infinite" };
const topRow = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 10 };
const backButton = { display: "inline-flex", alignItems: "center", gap: 6, border: "none", background: "transparent", fontWeight: 700, fontSize: 13, cursor: "pointer" };
const contextLinkRow = { display: "flex", gap: 8, flexWrap: "wrap" };
const errorBanner = { borderRadius: 16, padding: "12px 14px", marginBottom: 12, fontSize: 13, lineHeight: 1.55 };
const heroCard = { borderRadius: 18, padding: "clamp(16px, 2.2vw, 22px)", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14, alignItems: "start", boxShadow: "none" };
const heroAside = { display: "grid", gap: 10, alignContent: "start" };
const heroAsideHeader = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" };
const heroActionRow = { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" };
const eyebrow = { margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" };
const issueKey = { margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" };
const heroTitle = { margin: 0, fontFamily: "inherit", fontSize: "clamp(1.45rem, 2.2vw, 2rem)", lineHeight: 1.08, letterSpacing: "-0.03em", fontWeight: 700, maxWidth: "24ch" };
const heroSummary = { margin: 0, fontSize: 13, lineHeight: 1.62, maxWidth: 680 };
const chipRow = { display: "flex", gap: 6, flexWrap: "wrap" };
const chip = { borderRadius: 999, padding: "5px 10px", fontSize: 11, fontWeight: 700, textTransform: "capitalize" };
const heroMetaRow = { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" };
const tinyMeta = { margin: 0, fontSize: 11, lineHeight: 1.5 };
const statusNote = { borderRadius: 999, padding: "4px 9px", fontSize: 10, fontWeight: 700, background: "rgba(245,158,11,0.1)" };
const asideTitle = { margin: "2px 0 0", fontSize: 14, fontWeight: 700, letterSpacing: "-0.02em" };
const summaryGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 };
const summaryTile = { borderRadius: 14, padding: "11px 12px", display: "grid", gap: 4 };
const summaryLabel = { margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: 5 };
const summaryValue = { margin: 0, fontFamily: "inherit", fontSize: 18, fontWeight: 700, lineHeight: 1.05, letterSpacing: "-0.02em" };
const summaryHelper = { margin: 0, fontSize: 11, lineHeight: 1.45 };
const contentGrid = { marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12, alignItems: "start" };
const mainColumn = { display: "grid", gap: 14 };
const asideColumn = { display: "grid", gap: 14, alignContent: "start", position: "sticky", top: 18 };
const descriptionText = { margin: 0, fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap" };
const supportingRow = { display: "grid", gap: 8 };
const commentList = { display: "grid", gap: 10 };
const commentCard = { borderRadius: 18, padding: 14, display: "grid", gap: 8 };
const commentHead = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" };
const commentAuthor = { margin: 0, fontSize: 13, fontWeight: 800 };
const commentBody = { margin: 0, fontSize: 13, lineHeight: 1.65, whiteSpace: "pre-wrap" };
const commentComposer = { display: "grid", gap: 10 };
const emptyState = { borderRadius: 16, padding: "18px 14px", textAlign: "center", fontSize: 12 };
const moduleGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 };
const moduleCard = { borderRadius: 18, padding: 14 };
const actionRow = { display: "flex", gap: 8, flexWrap: "wrap" };
const fieldGrid = { display: "grid", gap: 10 };
const fieldWrap = { display: "grid", gap: 6 };
const fieldLabel = { fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" };
const valueText = { fontSize: 13, fontWeight: 700, lineHeight: 1.5, wordBreak: "break-word" };
const infoStack = { display: "grid", gap: 10 };
const infoRow = { borderRadius: 16, padding: "12px 14px", display: "grid", gap: 6 };
const infoLabel = { margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: 5 };
const infoValue = { margin: 0, fontSize: 13, fontWeight: 700, lineHeight: 1.5, wordBreak: "break-word" };
const bodyText = { margin: 0, fontSize: 14, lineHeight: 1.6 };
const bodySm = { margin: 0, fontSize: 12, lineHeight: 1.55 };
const bodySmStrong = { margin: 0, fontSize: 12, fontWeight: 700, lineHeight: 1.55 };
const bodyLgStrong = { margin: 0, fontSize: 18, fontWeight: 800, lineHeight: 1 };
const eyebrowText = { margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" };
const sectionTitle = { margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em" };
const icon14 = { width: 14, height: 14 };

export default IssueDetail;
