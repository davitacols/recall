import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
  PlusIcon,
  RocketLaunchIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";

function ProjectDetail() {
  const { projectId } = useParams();
  const { darkMode } = useTheme();

  const [project, setProject] = useState(null);
  const [sprints, setSprints] = useState([]);
  const [issues, setIssues] = useState([]);
  const [boards, setBoards] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("sprints");

  const [showCreateSprint, setShowCreateSprint] = useState(false);
  const [showCreateIssue, setShowCreateIssue] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreatingSprint, setIsCreatingSprint] = useState(false);
  const [isCreatingIssue, setIsCreatingIssue] = useState(false);

  const [sprintForm, setSprintForm] = useState({ name: "", start_date: "", end_date: "", goal: "" });
  const [issueForm, setIssueForm] = useState({ title: "", description: "", priority: "medium", sprint_id: "", assignee_id: "" });

  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  useEffect(() => {
    fetchProject();
    fetchTeamMembers();
    const interval = setInterval(fetchProject, 6000);
    return () => clearInterval(interval);
  }, [projectId]);

  const fetchTeamMembers = async () => {
    try {
      const response = await api.get("/api/organizations/members/");
      setTeamMembers(response.data || []);
    } catch (error) {
      console.error("Failed to fetch team members:", error);
    }
  };

  const fetchProject = async () => {
    try {
      const [projectRes, sprintsRes, issuesRes] = await Promise.all([
        api.get(`/api/agile/projects/${projectId}/`),
        api.get(`/api/agile/projects/${projectId}/sprints/`),
        api.get(`/api/agile/projects/${projectId}/issues/`),
      ]);
      setProject(projectRes.data);
      setSprints(sprintsRes.data || []);
      setIssues(issuesRes.data || []);
      setBoards(projectRes.data.boards || []);
    } catch (error) {
      console.error("Failed to fetch project:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSprint = async (event) => {
    event.preventDefault();
    setIsCreatingSprint(true);
    try {
      await api.post(`/api/agile/projects/${projectId}/sprints/`, sprintForm);
      setShowCreateSprint(false);
      setSprintForm({ name: "", start_date: "", end_date: "", goal: "" });
      fetchProject();
    } catch (error) {
      console.error("Failed to create sprint:", error);
    } finally {
      setIsCreatingSprint(false);
    }
  };

  const handleCreateIssue = async (event) => {
    event.preventDefault();
    setIsCreatingIssue(true);
    try {
      const payload = {
        title: issueForm.title,
        description: issueForm.description,
        priority: issueForm.priority,
      };
      if (issueForm.sprint_id) payload.sprint_id = parseInt(issueForm.sprint_id, 10);
      if (issueForm.assignee_id) payload.assignee_id = parseInt(issueForm.assignee_id, 10);

      await api.post(`/api/agile/projects/${projectId}/issues/`, payload);
      setShowCreateIssue(false);
      setIssueForm({ title: "", description: "", priority: "medium", sprint_id: "", assignee_id: "" });
      fetchProject();
    } catch (error) {
      console.error("Failed to create issue:", error);
    } finally {
      setIsCreatingIssue(false);
    }
  };

  const handleDeleteProject = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/api/agile/projects/${projectId}/delete/`);
      window.location.href = "/projects";
    } catch (error) {
      console.error("Failed to delete project:", error);
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: palette.bg, display: "grid", placeItems: "center" }}>
        <div style={spinner} />
      </div>
    );
  }

  if (!project) {
    return (
      <div style={{ minHeight: "100vh", background: palette.bg, display: "grid", placeItems: "center" }}>
        <h2 style={{ color: palette.muted }}>Project not found</h2>
      </div>
    );
  }

  const tabs = ["sprints", "issues", "roadmap"];

  return (
    <div style={{ minHeight: "100vh", background: palette.bg }}>
      <div style={ui.container}>
        <section style={{ ...hero, border: `1px solid ${palette.border}`, background: palette.card }}>
          <div style={heroTop}>
            <div style={projectBadge}>{project.key?.charAt(0) || "P"}</div>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ ...title, color: palette.text }}>{project.name}</h1>
              <p style={{ ...sub, color: palette.muted }}>{project.key}</p>
              {project.description && <p style={{ ...sub, marginTop: 8, color: palette.muted }}>{project.description}</p>}
            </div>
          </div>
          <button onClick={() => setShowDeleteConfirm(true)} style={dangerIconButton}>
            <TrashIcon style={icon18} />
          </button>
        </section>

        <div style={quickLinkRow}>
          <Link to={`/projects/${projectId}/backlog`} style={quickButton}>View Backlog</Link>
          {boards.length > 0 && <Link to={`/boards/${boards[0].id}`} style={quickButton}>View Kanban Board</Link>}
          <Link to="/sprint" style={quickButton}>Sprint Center</Link>
        </div>

        <section style={statsGrid}>
          <Stat icon={ChartBarIcon} label="Total Issues" value={project.issue_count || 0} />
          <Stat icon={CheckCircleIcon} label="Completed" value={project.completed_issues || 0} />
          <Stat icon={ClockIcon} label="Active" value={project.active_issues || 0} />
          <Stat icon={RocketLaunchIcon} label="Sprints" value={sprints.length} />
        </section>

        <section style={{ ...tabWrap, border: `1px solid ${palette.border}`, background: palette.card }}>
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                ...tabButton,
                color: activeTab === tab ? palette.text : palette.muted,
                background: activeTab === tab ? palette.cardAlt : "transparent",
                border: `1px solid ${activeTab === tab ? palette.border : "transparent"}`,
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </section>

        {activeTab === "sprints" && (
          <section>
            <div style={sectionHeader}>
              <h2 style={{ ...h2, color: palette.text }}>Sprints</h2>
              <button onClick={() => setShowCreateSprint(true)} style={ui.primaryButton}><PlusIcon style={icon14} /> New Sprint</button>
            </div>
            {sprints.length === 0 ? (
              <Empty text="No sprints yet" />
            ) : (
              <div style={list}>
                {sprints.map((sprint) => (
                  <Link key={sprint.id} to={`/sprints/${sprint.id}`} style={{ ...itemCard, border: `1px solid ${palette.border}`, background: palette.card }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div>
                        <p style={{ ...itemTitle, color: palette.text }}>{sprint.name}</p>
                        <p style={{ ...itemMeta, color: palette.muted }}>{sprint.start_date} to {sprint.end_date}</p>
                        {sprint.goal && <p style={{ ...itemMeta, marginTop: 5, color: palette.muted }}>{sprint.goal}</p>}
                      </div>
                      <span style={statusPill}>{sprint.status}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "issues" && (
          <section>
            <div style={sectionHeader}>
              <h2 style={{ ...h2, color: palette.text }}>Issues</h2>
              <button onClick={() => setShowCreateIssue(true)} style={ui.primaryButton}><PlusIcon style={icon14} /> New Issue</button>
            </div>
            {issues.length === 0 ? (
              <Empty text="No issues yet" />
            ) : (
              <div style={list}>
                {issues.slice(0, 20).map((issue) => (
                  <Link key={issue.id} to={`/issues/${issue.id}`} style={{ ...itemCard, border: `1px solid ${palette.border}`, background: palette.card }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div>
                        <p style={{ ...itemTitle, color: palette.text }}>{issue.title}</p>
                        <p style={{ ...itemMeta, color: palette.muted }}>{issue.key || `Issue-${issue.id}`} • {issue.priority || "medium"}</p>
                      </div>
                      <span style={statusPill}>{issue.status || "todo"}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "roadmap" && (
          <section style={{ ...emptyBlock, border: `1px solid ${palette.border}`, background: palette.card }}>
            <h3 style={{ margin: 0, color: palette.text }}>Roadmap</h3>
            <p style={{ ...sub, marginTop: 8, color: palette.muted }}>Use milestones and releases pages to manage roadmap planning.</p>
          </section>
        )}

        {showCreateSprint && (
          <Modal title="Create Sprint" onClose={() => setShowCreateSprint(false)}>
            <form onSubmit={handleCreateSprint} style={formStack}>
              <input required placeholder="Sprint name" value={sprintForm.name} onChange={(e) => setSprintForm({ ...sprintForm, name: e.target.value })} style={ui.input} />
              <div style={ui.twoCol}>
                <input type="date" required value={sprintForm.start_date} onChange={(e) => setSprintForm({ ...sprintForm, start_date: e.target.value })} style={ui.input} />
                <input type="date" required value={sprintForm.end_date} onChange={(e) => setSprintForm({ ...sprintForm, end_date: e.target.value })} style={ui.input} />
              </div>
              <textarea rows={4} placeholder="Sprint goal" value={sprintForm.goal} onChange={(e) => setSprintForm({ ...sprintForm, goal: e.target.value })} style={ui.input} />
              <div style={modalButtons}>
                <button type="button" onClick={() => setShowCreateSprint(false)} style={ui.secondaryButton}>Cancel</button>
                <button type="submit" style={ui.primaryButton}>{isCreatingSprint ? "Creating..." : "Create"}</button>
              </div>
            </form>
          </Modal>
        )}

        {showCreateIssue && (
          <Modal title="Create Issue" onClose={() => setShowCreateIssue(false)}>
            <form onSubmit={handleCreateIssue} style={formStack}>
              <input required placeholder="Issue title" value={issueForm.title} onChange={(e) => setIssueForm({ ...issueForm, title: e.target.value })} style={ui.input} />
              <textarea rows={4} placeholder="Description" value={issueForm.description} onChange={(e) => setIssueForm({ ...issueForm, description: e.target.value })} style={ui.input} />
              <div style={ui.twoCol}>
                <select value={issueForm.priority} onChange={(e) => setIssueForm({ ...issueForm, priority: e.target.value })} style={ui.input}>
                  <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
                </select>
                <select value={issueForm.sprint_id} onChange={(e) => setIssueForm({ ...issueForm, sprint_id: e.target.value })} style={ui.input}>
                  <option value="">No Sprint</option>
                  {sprints.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <select value={issueForm.assignee_id} onChange={(e) => setIssueForm({ ...issueForm, assignee_id: e.target.value })} style={ui.input}>
                <option value="">Unassigned</option>
                {teamMembers.map((m) => <option key={m.id} value={m.id}>{m.full_name || m.username}</option>)}
              </select>
              <div style={modalButtons}>
                <button type="button" onClick={() => setShowCreateIssue(false)} style={ui.secondaryButton}>Cancel</button>
                <button type="submit" style={ui.primaryButton}>{isCreatingIssue ? "Creating..." : "Create"}</button>
              </div>
            </form>
          </Modal>
        )}

        {showDeleteConfirm && (
          <Modal title="Delete Project" onClose={() => setShowDeleteConfirm(false)}>
            <p style={{ fontSize: 14, color: "#9e8d7b", marginBottom: 12 }}>This action cannot be undone.</p>
            <div style={modalButtons}>
              <button onClick={() => setShowDeleteConfirm(false)} style={ui.secondaryButton}>Cancel</button>
              <button onClick={handleDeleteProject} style={dangerButton}>{isDeleting ? "Deleting..." : "Delete"}</button>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={overlay}>
      <div style={modalCard}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 20 }}>{title}</h3>
          <button onClick={onClose} style={closeBtn}>Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Empty({ text }) {
  return <div style={emptyBlock}><p style={{ margin: 0, color: "#9e8d7b" }}>{text}</p></div>;
}

function Stat({ icon: Icon, label, value }) {
  return (
    <article style={statCard}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={statLabel}>{label}</p>
        <Icon style={icon16} />
      </div>
      <p style={statValue}>{value}</p>
    </article>
  );
}

const spinner = { width: 28, height: 28, border: "2px solid rgba(120,120,120,0.35)", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite" };
const hero = { borderRadius: 16, padding: 16, display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12 };
const heroTop = { display: "grid", gridTemplateColumns: "56px 1fr", gap: 10, alignItems: "start" };
const projectBadge = { width: 56, height: 56, borderRadius: 14, display: "grid", placeItems: "center", background: "linear-gradient(135deg,#ffcc8b,#ff935d)", color: "#20140f", fontWeight: 800, fontSize: 18 };
const title = { margin: "0 0 2px", fontSize: "clamp(1.5rem,3vw,2.1rem)", letterSpacing: "-0.02em" };
const sub = { margin: 0, fontSize: 13 };
const dangerIconButton = { border: "1px solid rgba(239,68,68,0.45)", borderRadius: 10, width: 36, height: 36, color: "#ef4444", background: "rgba(239,68,68,0.08)", display: "grid", placeItems: "center", cursor: "pointer" };
const quickLinkRow = { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 };
const quickButton = { padding: "9px 12px", borderRadius: 10, border: "1px solid rgba(120,120,120,0.4)", textDecoration: "none", fontSize: 13, fontWeight: 700, color: "#7d6d5a", background: "transparent" };
const statsGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 8, marginBottom: 12 };
const statCard = { borderRadius: 12, padding: 12, border: "1px solid rgba(255,225,193,0.2)", background: "#171215", color: "#f4ece0" };
const statLabel = { margin: 0, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#baa892", fontWeight: 700 };
const statValue = { margin: "7px 0 0", fontSize: 30, fontWeight: 800 };
const tabWrap = { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, borderRadius: 12, padding: 6, marginBottom: 12 };
const tabButton = { borderRadius: 9, padding: "9px 10px", fontSize: 13, fontWeight: 700, cursor: "pointer" };
const sectionHeader = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 };
const h2 = { margin: 0, fontSize: 20 };
const dangerButton = { border: "1px solid rgba(239,68,68,0.45)", borderRadius: 10, padding: "9px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#ef4444", background: "rgba(239,68,68,0.08)" };
const list = { display: "grid", gap: 8 };
const itemCard = { borderRadius: 12, padding: 12, textDecoration: "none" };
const itemTitle = { margin: 0, fontSize: 15, fontWeight: 700 };
const itemMeta = { margin: "3px 0 0", fontSize: 12 };
const statusPill = { border: "1px solid rgba(120,120,120,0.45)", borderRadius: 999, padding: "4px 8px", fontSize: 11, textTransform: "capitalize", fontWeight: 700, color: "#9e8d7b" };
const emptyBlock = { borderRadius: 12, padding: "24px 14px", textAlign: "center" };
const overlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "grid", placeItems: "center", zIndex: 110, padding: 14 };
const modalCard = { width: "min(560px,100%)", background: "#fffaf3", borderRadius: 14, padding: 16 };
const closeBtn = { border: "none", background: "transparent", color: "#7d6d5a", fontWeight: 700, cursor: "pointer" };
const formStack = { display: "grid", gap: 8 };
const modalButtons = { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 };
const icon18 = { width: 18, height: 18 };
const icon16 = { width: 16, height: 16 };
const icon14 = { width: 14, height: 14 };

export default ProjectDetail;

