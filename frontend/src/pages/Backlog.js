import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeftIcon, PlusIcon } from "@heroicons/react/24/outline";
import api from "../services/api";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";

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
      <div style={{ minHeight: "100vh", background: palette.bg, display: "grid", placeItems: "center" }}>
        <div style={spinner} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: palette.bg }}>
      <div style={ui.container}>
        <button onClick={() => navigate(-1)} style={backButton}>
          <ArrowLeftIcon style={icon14} /> Back
        </button>

        <section style={{ ...hero, background: palette.card, border: `1px solid ${palette.border}` }}>
          <div>
            <p style={{ ...eyebrow, color: palette.muted }}>PROJECT BACKLOG</p>
            <h1 style={{ ...titleStyle, color: palette.text }}>Prioritized Backlog</h1>
            <p style={{ ...subtitle, color: palette.muted }}>{backlogIssues.length} unplanned issues</p>
          </div>
          <button onClick={() => setShowCreate(true)} style={ui.primaryButton}>
            <PlusIcon style={icon14} /> New Issue
          </button>
        </section>

        <div style={ui.responsiveSplit}>
          <section style={{ ...leftCard, background: palette.card, border: `1px solid ${palette.border}` }}>
            <div style={{ overflowX: "auto" }}>
              <div style={tableHeader}>
                <span>Issue</span>
                <span>Type</span>
                <span>Priority</span>
                <span>Assignee</span>
              </div>

              {backlogIssues.length === 0 ? (
                <div style={empty}>Backlog is empty.</div>
              ) : (
                <div style={{ display: "grid", gap: 6 }}>
                  {backlogIssues.map((issue, index) => (
                    <article
                      key={issue.id}
                      draggable
                      onDragStart={() => setDraggedIssue(issue)}
                      onDragEnd={() => setDraggedIssue(null)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => handleReorderDrop(issue)}
                      onClick={() => navigate(`/issues/${issue.id}`)}
                      style={row}
                    >
                      <div>
                        <p style={rowKey}>{index + 1}. {issue.key || `ISS-${issue.id}`}</p>
                        <p style={rowTitle}>{issue.title}</p>
                      </div>
                      <p style={mutedTag}>{issue.issue_type || "task"}</p>
                      <p style={mutedTag}>{issue.priority || "medium"}</p>
                      <p style={mutedText}>{issue.assignee_name || "Unassigned"}</p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>

          <aside style={{ ...rightCard, background: palette.card, border: `1px solid ${palette.border}` }}>
            <h2 style={{ margin: 0, fontSize: 16, color: palette.text }}>Move to Sprint</h2>
            <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
              {sprints.length === 0 && <div style={empty}>No sprints available.</div>}
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
                    border: dropTarget === sprint.id ? "1px solid #10b981" : "1px solid rgba(120,120,120,0.35)",
                    background: dropTarget === sprint.id ? "rgba(16,185,129,0.08)" : "transparent",
                  }}
                >
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>{sprint.name}</p>
                  <p style={{ margin: "4px 0 0", fontSize: 11, color: "#9e8d7b" }}>{sprint.start_date} - {sprint.end_date}</p>
                </button>
              ))}
            </div>
          </aside>
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

const spinner = { width: 30, height: 30, border: "2px solid rgba(120,120,120,0.35)", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite" };
const backButton = { display: "inline-flex", alignItems: "center", gap: 6, border: "none", background: "transparent", color: "#7d6d5a", fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 10 };
const hero = { borderRadius: 16, padding: 16, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" };
const eyebrow = { margin: 0, fontSize: 11, letterSpacing: "0.12em", fontWeight: 700 };
const titleStyle = { margin: "8px 0 5px", fontSize: "clamp(1.5rem,3vw,2.2rem)", letterSpacing: "-0.02em" };
const subtitle = { margin: 0, fontSize: 13 };
const leftCard = { borderRadius: 12, padding: 10 };
const rightCard = { borderRadius: 12, padding: 10, height: "fit-content" };
const tableHeader = { minWidth: 620, display: "grid", gridTemplateColumns: "1fr 100px 90px 140px", gap: 8, padding: "8px 10px", fontSize: 11, color: "#9e8d7b", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 };
const row = { minWidth: 620, display: "grid", gridTemplateColumns: "1fr 100px 90px 140px", gap: 8, alignItems: "center", border: "1px solid rgba(120,120,120,0.32)", borderRadius: 10, padding: "10px", cursor: "pointer", background: "#1f181c" };
const rowKey = { margin: 0, fontSize: 11, color: "#9e8d7b", fontWeight: 700 };
const rowTitle = { margin: "3px 0 0", fontSize: 13, color: "#f4ece0", fontWeight: 600 };
const mutedTag = { margin: 0, fontSize: 11, color: "#baa892", textTransform: "capitalize", fontWeight: 700 };
const mutedText = { margin: 0, fontSize: 12, color: "#baa892" };
const sprintDrop = { borderRadius: 10, padding: 10, textAlign: "left", cursor: "pointer", color: "#f4ece0" };
const empty = { borderRadius: 10, border: "1px dashed rgba(120,120,120,0.35)", padding: "14px 10px", fontSize: 12, color: "#9e8d7b", textAlign: "center" };
const overlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "grid", placeItems: "center", zIndex: 120, padding: 16 };
const modalCard = { width: "min(520px,100%)", borderRadius: 14, padding: 16 };
const formStack = { marginTop: 12, display: "grid", gap: 8 };
const modalButtons = { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 };
const icon14 = { width: 14, height: 14 };

export default Backlog;

