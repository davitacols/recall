import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeftIcon, PlusIcon } from "@heroicons/react/24/outline";
import api from "../services/api";
import { WorkspaceEmptyState, WorkspaceHero, WorkspacePanel, WorkspaceToolbar } from "../components/WorkspaceChrome";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";
import { createPlainTextPreview } from "../utils/textPreview";

function Backlog() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { darkMode } = useTheme();

  const [backlogIssues, setBacklogIssues] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedIssue, setDraggedIssue] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const [title, setTitle] = useState("");
  const [issueType, setIssueType] = useState("story");
  const [priority, setPriority] = useState("medium");
  const [submitting, setSubmitting] = useState(false);

  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    try {
      const [backlogRes, sprintsRes] = await Promise.all([
        api.get(`/api/agile/projects/${projectId}/backlog/`),
        api.get(`/api/agile/projects/${projectId}/sprints/`),
      ]);
      const issues = (backlogRes.data.issues || []).filter((issue) => !issue.sprint_id);
      setBacklogIssues(issues);
      setSprints(sprintsRes.data || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDropToSprint = async (sprintId) => {
    if (!draggedIssue) return;
    try {
      await api.put(`/api/agile/issues/${draggedIssue.id}/`, { sprint_id: sprintId });
      fetchData();
    } catch (error) {
      console.error("Failed to move issue:", error);
    } finally {
      setDraggedIssue(null);
      setDropTarget(null);
    }
  };

  const handleReorderDrop = (targetIssue) => {
    if (!draggedIssue || draggedIssue.id === targetIssue.id) return;
    const next = [...backlogIssues];
    const from = next.findIndex((issue) => issue.id === draggedIssue.id);
    const to = next.findIndex((issue) => issue.id === targetIssue.id);
    next.splice(from, 1);
    next.splice(to, 0, draggedIssue);
    setBacklogIssues(next);
    setDraggedIssue(null);
  };

  const handleCreateIssue = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await api.post(`/api/agile/projects/${projectId}/issues/`, { title, issue_type: issueType, priority });
      setShowCreate(false);
      setTitle("");
      setIssueType("story");
      setPriority("medium");
      fetchData();
    } catch (error) {
      console.error("Failed to create issue:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div style={spinner} />
      </div>
    );
  }

  const backlogCount = backlogIssues.length;
  const highPriorityCount = backlogIssues.filter((issue) => ["highest", "high"].includes(String(issue.priority || "").toLowerCase())).length;
  const assignedCount = backlogIssues.filter((issue) => Boolean(issue.assignee_name)).length;
  const activeSprintCount = sprints.filter((sprint) => String(sprint.status || "").toLowerCase() === "active").length;
  const backlogPulse =
    backlogCount === 0
      ? "Backlog is clear and ready for the next planning cycle."
      : highPriorityCount > 0
        ? `${highPriorityCount} high-priority issue${highPriorityCount === 1 ? "" : "s"} should be shaped before the next sprint commit.`
        : "Backlog is populated and ready to be sorted into the next sprint window.";

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={ui.container}>
        <button onClick={() => navigate(-1)} style={backButton}>
          <ArrowLeftIcon style={icon14} /> Back
        </button>

        <WorkspaceHero
          palette={palette}
          darkMode={darkMode}
          eyebrow="Project Backlog"
          title="Shape the next sprint before work gets noisy"
          description="Review unplanned work, reorder what matters, and route the strongest candidates into an active sprint without losing context."
          stats={[
            { label: "Unplanned", value: backlogCount, helper: "Issues still waiting for sprint routing." },
            { label: "High priority", value: highPriorityCount, helper: "Urgent items asking for shaping." },
            { label: "Assigned", value: assignedCount, helper: "Backlog work that already has an owner." },
            { label: "Sprints", value: sprints.length, helper: `${activeSprintCount} active sprint${activeSprintCount === 1 ? "" : "s"} available for routing.` },
          ]}
          aside={
            <div
              style={{
                ...spotlightCard,
                border: `1px solid ${palette.border}`,
                background: darkMode
                  ? "linear-gradient(145deg, rgba(29,24,20,0.96), rgba(20,17,14,0.88))"
                  : "linear-gradient(145deg, rgba(255,252,248,0.98), rgba(245,239,229,0.9))",
              }}
            >
              <p style={{ ...spotlightEyebrow, color: palette.muted }}>Planning pulse</p>
              <h3 style={{ margin: 0, fontSize: 22, lineHeight: 1.05, color: palette.text }}>
                {backlogCount === 0 ? "Backlog clear" : `${backlogCount} issues waiting`}
              </h3>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: palette.muted }}>{backlogPulse}</p>
            </div>
          }
          actions={
            <button onClick={() => setShowCreate(true)} className="ui-btn-polish ui-focus-ring" style={ui.primaryButton}>
              <PlusIcon style={icon14} /> New Issue
            </button>
          }
        />

        <WorkspaceToolbar palette={palette}>
          <div style={toolbarLayout}>
            <div style={toolbarIntro}>
              <p style={{ ...toolbarEyebrow, color: palette.muted }}>Planning guide</p>
              <h2 style={{ ...toolbarTitle, color: palette.text }}>Reorder here, then drag straight into the sprint that should carry the work</h2>
              <p style={{ ...toolbarCopy, color: palette.muted }}>
                Keep the backlog focused on work that is shaped enough to start. Use the right rail as the routing surface for upcoming sprint commitments.
              </p>
            </div>
            <div style={toolbarChipRail}>
              <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                Drag to reorder
              </span>
              <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                Drag right to plan into sprint
              </span>
              <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                {assignedCount} already owned
              </span>
            </div>
          </div>
        </WorkspaceToolbar>

        <div style={ui.responsiveSplit}>
          <WorkspacePanel
            palette={palette}
            eyebrow="Backlog atlas"
            title="Unplanned work queue"
            description="Reorder issues by priority and readiness before assigning them to a sprint."
            minHeight={480}
          >
            {backlogIssues.length === 0 ? (
              <WorkspaceEmptyState
                palette={palette}
                title="Backlog is empty"
                description="Create the next issue or pull more candidate work into planning."
              />
            ) : (
              <div style={issueList}>
                {backlogIssues.map((issue, index) => (
                  <article
                    key={issue.id}
                    className="ui-card-lift ui-smooth"
                    draggable
                    onDragStart={() => setDraggedIssue(issue)}
                    onDragEnd={() => setDraggedIssue(null)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => handleReorderDrop(issue)}
                    onClick={() => navigate(`/issues/${issue.id}`)}
                    style={{
                      ...issueCard,
                      border: `1px solid ${palette.border}`,
                      background: palette.cardAlt,
                    }}
                  >
                    <div style={issueHead}>
                      <div style={{ minWidth: 0, display: "grid", gap: 6 }}>
                        <p style={{ ...issueIndex, color: palette.muted }}>
                          {index + 1}. {issue.key || `ISS-${issue.id}`}
                        </p>
                        <p style={{ ...issueTitle, color: palette.text }}>{issue.title}</p>
                      </div>
                      <span style={{ ...priorityBadge, border: `1px solid ${palette.border}`, color: palette.text, background: palette.card }}>
                        {issue.priority || "medium"}
                      </span>
                    </div>
                    <p style={{ ...issuePreview, color: palette.muted }}>
                      {createPlainTextPreview(issue.description || issue.summary || "", "No issue brief added yet.", 160)}
                    </p>
                    <div style={metaRail}>
                      <span style={{ ...metaChip, border: `1px solid ${palette.border}`, background: palette.card, color: palette.text }}>
                        {issue.issue_type || "task"}
                      </span>
                      <span style={{ ...metaChip, border: `1px solid ${palette.border}`, background: palette.card, color: palette.text }}>
                        {issue.assignee_name || "Unassigned"}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </WorkspacePanel>

          <WorkspacePanel
            palette={palette}
            eyebrow="Sprint routing"
            title="Move into sprint"
            description="Drop backlog work onto a sprint when the issue is ready to carry into execution."
            minHeight={480}
          >
            {sprints.length === 0 ? (
              <WorkspaceEmptyState
                palette={palette}
                title="No sprints available"
                description="Create a sprint in the project first, then route backlog items into it."
              />
            ) : (
              <div style={sprintList}>
                {sprints.map((sprint) => (
                  <button
                    key={sprint.id}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDropTarget(sprint.id);
                    }}
                    onDragLeave={() => setDropTarget(null)}
                    onDrop={() => handleDropToSprint(sprint.id)}
                    style={{
                      ...sprintDrop,
                      border: dropTarget === sprint.id ? `1px solid ${palette.success}` : `1px solid ${palette.border}`,
                      background: dropTarget === sprint.id ? palette.accentSoft : palette.cardAlt,
                    }}
                  >
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: palette.text }}>{sprint.name}</p>
                    <p style={{ margin: "6px 0 0", fontSize: 12, color: palette.muted }}>
                      {sprint.start_date} - {sprint.end_date}
                    </p>
                    <p style={{ margin: "8px 0 0", fontSize: 12, lineHeight: 1.55, color: palette.muted }}>
                      {sprint.goal || "No sprint goal added yet."}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </WorkspacePanel>
        </div>

        {showCreate && (
          <div style={overlay}>
            <div style={{ ...modalCard, background: palette.card, border: `1px solid ${palette.border}` }}>
              <h3 style={{ margin: 0, fontSize: 20, color: palette.text }}>Create Issue</h3>
              <form onSubmit={handleCreateIssue} style={formStack}>
                <input required placeholder="Issue title" value={title} onChange={(event) => setTitle(event.target.value)} style={ui.input} />
                <div style={ui.twoCol}>
                  <select value={issueType} onChange={(event) => setIssueType(event.target.value)} style={ui.input}>
                    <option value="epic">Epic</option>
                    <option value="story">Story</option>
                    <option value="task">Task</option>
                    <option value="bug">Bug</option>
                  </select>
                  <select value={priority} onChange={(event) => setPriority(event.target.value)} style={ui.input}>
                    <option value="highest">Highest</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                    <option value="lowest">Lowest</option>
                  </select>
                </div>
                <div style={modalButtons}>
                  <button type="button" onClick={() => setShowCreate(false)} style={ui.secondaryButton}>Cancel</button>
                  <button type="submit" disabled={submitting} style={ui.primaryButton}>{submitting ? "Creating..." : "Create"}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const spinner = { width: 30, height: 30, border: "2px solid var(--app-border-strong)", borderTopColor: "var(--app-info)", borderRadius: "50%", animation: "spin 1s linear infinite" };
const backButton = { display: "inline-flex", alignItems: "center", gap: 6, border: "none", background: "transparent", color: "var(--app-muted)", fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 10 };
const spotlightCard = { minWidth: 240, borderRadius: 24, padding: 16, display: "grid", gap: 10 };
const spotlightEyebrow = { margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" };
const toolbarLayout = { display: "grid", gap: 14 };
const toolbarIntro = { display: "grid", gap: 4 };
const toolbarEyebrow = { margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" };
const toolbarTitle = { margin: 0, fontSize: 24, lineHeight: 1.04 };
const toolbarCopy = { margin: 0, fontSize: 13, lineHeight: 1.65, maxWidth: 760 };
const toolbarChipRail = { display: "flex", gap: 8, flexWrap: "wrap" };
const toolbarChip = { display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "8px 12px", fontSize: 12, fontWeight: 700 };
const issueList = { display: "grid", gap: 12 };
const issueCard = { borderRadius: 22, padding: 16, display: "grid", gap: 12, cursor: "pointer" };
const issueHead = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 };
const issueIndex = { margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" };
const issueTitle = { margin: 0, fontSize: 16, lineHeight: 1.25, fontWeight: 700 };
const issuePreview = { margin: 0, fontSize: 13, lineHeight: 1.65 };
const priorityBadge = { display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "7px 11px", fontSize: 11, fontWeight: 800, textTransform: "capitalize", whiteSpace: "nowrap" };
const metaRail = { display: "flex", gap: 8, flexWrap: "wrap" };
const metaChip = { display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "7px 11px", fontSize: 11, fontWeight: 700, textTransform: "capitalize" };
const sprintList = { display: "grid", gap: 10 };
const sprintDrop = { borderRadius: 20, padding: 14, textAlign: "left", cursor: "pointer", color: "var(--app-text)", display: "grid", gap: 2 };
const overlay = { position: "fixed", inset: 0, background: "var(--app-overlay)", display: "grid", placeItems: "center", zIndex: 120, padding: 16 };
const modalCard = { width: "min(520px,100%)", borderRadius: 0, padding: 16 };
const formStack = { marginTop: 12, display: "grid", gap: 8 };
const modalButtons = { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 };
const icon14 = { width: 14, height: 14 };

export default Backlog;


