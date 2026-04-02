import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
  PlusIcon,
  RocketLaunchIcon,
  TrashIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";
import {
  WorkspaceEmptyState,
  WorkspaceHero,
  WorkspacePanel,
  WorkspaceToolbar,
} from "../components/WorkspaceChrome";
import { createPlainTextPreview, hasMeaningfulText } from "../utils/textPreview";

export default function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const [project, setProject] = useState(null);
  const [sprints, setSprints] = useState([]);
  const [issues, setIssues] = useState([]);
  const [boards, setBoards] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("sprints");
  const [isNarrow, setIsNarrow] = useState(window.innerWidth < 1080);
  const [showCreateSprint, setShowCreateSprint] = useState(false);
  const [showCreateIssue, setShowCreateIssue] = useState(false);
  const [showEditProject, setShowEditProject] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreatingSprint, setIsCreatingSprint] = useState(false);
  const [isCreatingIssue, setIsCreatingIssue] = useState(false);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [sprintForm, setSprintForm] = useState({ name: "", start_date: "", end_date: "", goal: "" });
  const [issueForm, setIssueForm] = useState({ title: "", description: "", priority: "medium", sprint_id: "", assignee_id: "" });
  const [projectForm, setProjectForm] = useState({ name: "", description: "", lead_id: "" });
  const [projectFormError, setProjectFormError] = useState("");

  useEffect(() => {
    fetchProject();
    fetchTeamMembers();
    const interval = setInterval(fetchProject, 6000);
    const handleResize = () => setIsNarrow(window.innerWidth < 1080);
    window.addEventListener("resize", handleResize);
    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", handleResize);
    };
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
      setProject(null);
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
      const payload = { title: issueForm.title, description: issueForm.description, priority: issueForm.priority };
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
      navigate("/projects");
    } catch (error) {
      console.error("Failed to delete project:", error);
      setIsDeleting(false);
    }
  };

  const openEditProject = () => {
    if (!project) return;
    setProjectForm({
      name: project.name || "",
      description: project.description || "",
      lead_id: project.lead_id ? String(project.lead_id) : "",
    });
    setProjectFormError("");
    setShowEditProject(true);
  };

  const handleUpdateProject = async (event) => {
    event.preventDefault();
    setIsSavingProject(true);
    setProjectFormError("");
    const payload = {
      name: projectForm.name.trim(),
      description: projectForm.description,
      lead_id: projectForm.lead_id || "",
    };
    try {
      await api.patch(`/api/agile/projects/${projectId}/`, payload);
      setShowEditProject(false);
      fetchProject();
    } catch (error) {
      if (error?.response?.status === 405) {
        try {
          await api.put(`/api/agile/projects/${projectId}/`, payload);
          setShowEditProject(false);
          fetchProject();
          return;
        } catch (fallbackError) {
          console.error("Failed to update project with PUT fallback:", fallbackError);
          setProjectFormError(
            fallbackError?.response?.data?.detail ||
              fallbackError?.response?.data?.error ||
              fallbackError?.response?.data?.message ||
              "Failed to update project"
          );
          return;
        }
      }

      console.error("Failed to update project:", error);
      setProjectFormError(
        error?.response?.data?.detail ||
          error?.response?.data?.error ||
          error?.response?.data?.message ||
          "Failed to update project"
      );
    } finally {
      setIsSavingProject(false);
    }
  };

  if (loading) {
    return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}><div style={{ width: 28, height: 28, border: "2px solid var(--ui-border)", borderTopColor: "var(--ui-accent)", borderRadius: "50%", animation: "spin 1s linear infinite" }} /></div>;
  }

  if (!project) {
    return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: palette.muted }}>Project not found</div>;
  }

  const currentBoard = boards[0] || null;
  const activeSprintCount = sprints.filter((sprint) => sprint.status === "active").length;
  const completionRate = project.issue_count ? Math.round(((project.completed_issues || 0) / project.issue_count) * 100) : 0;
  const projectSummary = createPlainTextPreview(
    project.description,
    "Add a stronger project brief so roadmap, sprint, and issue work inherit the same context.",
    240
  );
  const documentedIssues = issues.filter((issue) => hasMeaningfulText(issue.description)).length;
  const issueCoverage = issues.length ? Math.round((documentedIssues / issues.length) * 100) : 0;
  const readySprints = sprints.filter((sprint) => hasMeaningfulText(sprint.goal)).length;
  const sprintCoverage = sprints.length ? Math.round((readySprints / sprints.length) * 100) : 0;
  const projectReadinessLabel =
    !project.description
      ? "Needs a stronger project brief before the workspace can carry context cleanly."
      : completionRate >= 60
        ? "Execution is moving with visible momentum and a clearer completion signal."
        : activeSprintCount
          ? "Sprint rhythm is active and still building toward stronger completion."
          : "Project structure exists, but the sprint cadence still needs more visible momentum.";
  const projectRoutingLabel = currentBoard
    ? "A connected board is already in place, so this page can act as the project control room."
    : "The project is structured, but a board route would make execution easier to navigate.";
  const tabs = [
    { key: "sprints", label: "Sprints", count: sprints.length },
    { key: "issues", label: "Issues", count: issues.length },
    { key: "roadmap", label: "Roadmap", count: boards.length },
  ];

  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", background: darkMode ? "radial-gradient(circle at 10% 5%, rgba(154,185,255,0.16), transparent 30%), radial-gradient(circle at 92% 12%, rgba(121,200,159,0.12), transparent 28%)" : "radial-gradient(circle at 10% 5%, rgba(46,99,208,0.1), transparent 30%), radial-gradient(circle at 92% 12%, rgba(47,127,95,0.08), transparent 28%)" }} />
      <div style={{ ...ui.container, position: "relative", zIndex: 1, display: "grid", gap: 16 }}>
        <WorkspaceHero
          palette={palette}
          darkMode={darkMode}
          variant="execution"
          eyebrow="Execution Workspace"
          title={project.name}
          description={project.description || "Plan sprints, shape the issue queue, and keep delivery context in one calmer workspace."}
          actions={
            <>
              <button className="ui-btn-polish ui-focus-ring" onClick={() => setShowCreateSprint(true)} style={ui.primaryButton}>
                <PlusIcon style={{ width: 14, height: 14 }} /> New Sprint
              </button>
              <button className="ui-btn-polish ui-focus-ring" onClick={() => setShowCreateIssue(true)} style={ui.secondaryButton}>
                <PlusIcon style={{ width: 14, height: 14 }} /> New Issue
              </button>
              <button className="ui-btn-polish ui-focus-ring" onClick={openEditProject} style={ui.secondaryButton}>
                <UserGroupIcon style={{ width: 14, height: 14 }} /> {project.lead_name ? "Edit Project" : "Assign lead"}
              </button>
            </>
          }
        />

        <WorkspaceToolbar palette={palette} darkMode={darkMode} variant="execution">
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: palette.muted }}>Control Room</p>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: palette.muted }}>Jump between execution routes and keep the core project facts visible without stretching the header.</p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={chipStyle(palette)}>{project.key || "Project"}</span>
              <span style={chipStyle(palette)}>{completionRate}% complete</span>
              <span style={chipStyle(palette)}>{project.lead_name || "No project lead yet"}</span>
              <span style={chipStyle(palette)}>{teamMembers.length} team members</span>
              <span style={chipStyle(palette)}>{boards.length} boards</span>
              <span style={chipStyle(palette)}>{activeTab}</span>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="ui-btn-polish ui-focus-ring" onClick={() => navigate("/projects")} style={ui.secondaryButton}><ArrowLeftIcon style={{ width: 14, height: 14 }} /> All Projects</button>
              <button className="ui-btn-polish ui-focus-ring" onClick={fetchProject} style={ui.secondaryButton}><ArrowPathIcon style={{ width: 14, height: 14 }} /> Refresh</button>
              <button className="ui-btn-polish ui-focus-ring" onClick={openEditProject} style={ui.secondaryButton}><UserGroupIcon style={{ width: 14, height: 14 }} /> {project.lead_name ? "Update lead" : "Assign lead"}</button>
              <Link className="ui-btn-polish ui-focus-ring" to={`/projects/${projectId}/backlog`} style={{ ...ui.secondaryButton, textDecoration: "none" }}>Backlog</Link>
              {currentBoard ? <Link className="ui-btn-polish ui-focus-ring" to={`/boards/${currentBoard.id}`} style={{ ...ui.secondaryButton, textDecoration: "none" }}>Kanban Board</Link> : null}
              <Link className="ui-btn-polish ui-focus-ring" to="/sprint" style={{ ...ui.secondaryButton, textDecoration: "none" }}>Sprint Center</Link>
              <button className="ui-btn-polish ui-focus-ring" onClick={() => setShowDeleteConfirm(true)} style={{ border: `1px solid ${palette.danger}`, borderRadius: 999, padding: "10px 16px", background: palette.accentSoft, color: palette.danger, fontSize: 13, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}><TrashIcon style={{ width: 14, height: 14 }} /> Delete</button>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {tabs.map((tab) => {
                const active = activeTab === tab.key;
                return <button key={tab.key} className="ui-btn-polish ui-focus-ring" onClick={() => setActiveTab(tab.key)} style={{ borderRadius: 999, padding: "10px 14px", fontSize: 13, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 8, border: `1px solid ${active ? palette.accent : palette.border}`, background: active ? palette.accentSoft : palette.cardAlt, color: active ? palette.accent : palette.text, cursor: "pointer" }}><span>{tab.label}</span><span style={{ opacity: 0.72 }}>{tab.count}</span></button>;
              })}
            </div>
          </div>
        </WorkspaceToolbar>

        <section style={{ ...briefingGrid, gridTemplateColumns: isNarrow ? "minmax(0,1fr)" : "minmax(0,1.15fr) repeat(2, minmax(220px, 0.425fr))" }}>
          <article
            className="ui-card-lift ui-smooth"
            style={{
              ...briefingPrimary,
              border: `1px solid ${palette.border}`,
              background: darkMode
                ? "linear-gradient(145deg, rgba(30,24,20,0.96), rgba(22,18,15,0.88))"
                : "linear-gradient(145deg, rgba(255,252,248,0.98), rgba(245,239,229,0.9))",
            }}
          >
            <div style={{ display: "grid", gap: 8 }}>
              <p style={{ ...briefingEyebrow, color: palette.muted }}>Project Briefing</p>
              <h2 style={{ margin: 0, fontSize: "clamp(1.18rem,2vw,1.68rem)", lineHeight: 1.05, color: palette.text }}>
                {projectSummary}
              </h2>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: palette.muted }}>
                {projectReadinessLabel}
              </p>
            </div>
            <div style={briefingMetaRail}>
              <span style={{ ...briefingChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                {project.key || "PRJ"}
              </span>
              <span style={{ ...briefingChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                {project.lead_name || "Project lead needed"}
              </span>
              <span style={{ ...briefingChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                {teamMembers.length} team members
              </span>
              <span style={{ ...briefingChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                {boards.length} boards
              </span>
            </div>
          </article>

          <article className="ui-card-lift ui-smooth" style={{ ...briefingMetric, border: `1px solid ${palette.border}`, background: palette.card }}>
            <p style={{ ...metricHeading, color: palette.muted }}>Issue coverage</p>
            <p style={{ ...metricFigure, color: palette.text }}>{issueCoverage}%</p>
            <p style={{ ...metricNarrative, color: palette.muted }}>
              {documentedIssues} of {issues.length} issues already have written detail that can survive handoffs.
            </p>
          </article>

          <article className="ui-card-lift ui-smooth" style={{ ...briefingMetric, border: `1px solid ${palette.border}`, background: palette.card }}>
            <p style={{ ...metricHeading, color: palette.muted }}>Routing posture</p>
            <p style={{ ...metricFigure, color: palette.text }}>{currentBoard ? "Ready" : "Partial"}</p>
            <p style={{ ...metricNarrative, color: palette.muted }}>
              {projectRoutingLabel} Sprint goals are documented across {sprintCoverage}% of the sprint record.
            </p>
          </article>
        </section>

        <div style={{ display: "grid", gridTemplateColumns: isNarrow ? "minmax(0,1fr)" : "minmax(0,1fr) 320px", gap: 14, alignItems: "start" }}>
          <div style={{ display: "grid", gap: 14 }}>
            {activeTab === "sprints" ? (
              <WorkspacePanel darkMode={darkMode} variant="execution" palette={palette} eyebrow="Delivery Cadence" title="Sprint Timeline" description="Each sprint reads as a more deliberate record with goal, schedule, and current state surfaced together." action={<button className="ui-btn-polish ui-focus-ring" onClick={() => setShowCreateSprint(true)} style={ui.primaryButton}><PlusIcon style={{ width: 14, height: 14 }} /> Create Sprint</button>}>
                {sprints.length === 0 ? <WorkspaceEmptyState darkMode={darkMode} variant="execution" palette={palette} title="Start the sprint rhythm" description="Create the first sprint to give the project a visible execution cadence." action={<button className="ui-btn-polish ui-focus-ring" onClick={() => setShowCreateSprint(true)} style={ui.primaryButton}>New Sprint</button>} /> : <div style={{ display: "grid", gap: 12 }}>{sprints.map((sprint) => <Link key={sprint.id} className="ui-card-lift ui-smooth" to={`/sprints/${sprint.id}`} style={{ borderRadius: 22, padding: 18, display: "grid", gap: 10, textDecoration: "none", border: `1px solid ${palette.border}`, background: palette.cardAlt }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}><div style={{ minWidth: 0 }}><p style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: "-0.03em", color: palette.text }}>{sprint.name}</p><p style={{ margin: "4px 0 0", fontSize: 12, color: palette.muted }}>{sprint.start_date} to {sprint.end_date}</p></div><span style={{ borderRadius: 999, padding: "8px 12px", fontSize: 11, fontWeight: 700, textTransform: "capitalize", border: `1px solid ${palette.border}`, background: palette.card, color: palette.text }}>{sprint.status}</span></div><p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: palette.muted }}>{sprint.goal || "No explicit sprint goal has been recorded yet."}</p></Link>)}</div>}
              </WorkspacePanel>
            ) : null}
            {activeTab === "issues" ? (
              <WorkspacePanel darkMode={darkMode} variant="execution" palette={palette} eyebrow="Execution Queue" title="Issue Stream" description="Review the work queue with clearer priority and state rhythm." action={<button className="ui-btn-polish ui-focus-ring" onClick={() => setShowCreateIssue(true)} style={ui.primaryButton}><PlusIcon style={{ width: 14, height: 14 }} /> Create Issue</button>}>
                {issues.length === 0 ? <WorkspaceEmptyState darkMode={darkMode} variant="execution" palette={palette} title="No issues in the queue yet" description="Create an issue to start turning the project plan into executable work." action={<button className="ui-btn-polish ui-focus-ring" onClick={() => setShowCreateIssue(true)} style={ui.primaryButton}>New Issue</button>} /> : <div style={{ display: "grid", gap: 12 }}>{issues.slice(0, 24).map((issue) => <Link key={issue.id} className="ui-card-lift ui-smooth" to={`/issues/${issue.id}`} style={{ borderRadius: 22, padding: 18, display: "grid", gap: 10, textDecoration: "none", border: `1px solid ${palette.border}`, background: palette.cardAlt }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}><div style={{ minWidth: 0 }}><p style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: "-0.03em", color: palette.text }}>{issue.title}</p><p style={{ margin: "4px 0 0", fontSize: 12, color: palette.muted }}>{issue.key || `Issue-${issue.id}`} | {(issue.priority || "medium").toUpperCase()}</p></div><span style={{ borderRadius: 999, padding: "8px 12px", fontSize: 11, fontWeight: 700, textTransform: "capitalize", border: `1px solid ${palette.border}`, background: palette.card, color: palette.text }}>{issue.status || "todo"}</span></div><p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: palette.muted }}>{createPlainTextPreview(issue.description, "No issue description has been added yet.", 160)}</p></Link>)}</div>}
              </WorkspacePanel>
            ) : null}
            {activeTab === "roadmap" ? (
              <WorkspacePanel darkMode={darkMode} variant="execution" palette={palette} eyebrow="Planning Horizon" title="Roadmap Routes" description="This workspace now points the team toward existing roadmap surfaces instead of leaving roadmap as a dead end.">
                <WorkspaceEmptyState darkMode={darkMode} variant="execution" palette={palette} title="Use linked planning surfaces for roadmap work" description="Releases, templates, and filters already support roadmap planning. This detail page now makes those routes explicit." action={<div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}><Link className="ui-btn-polish ui-focus-ring" to={`/projects/${projectId}/releases`} style={{ ...ui.primaryButton, textDecoration: "none" }}>Open Releases</Link><Link className="ui-btn-polish ui-focus-ring" to="/agile/templates" style={{ ...ui.secondaryButton, textDecoration: "none" }}>Issue Templates</Link><Link className="ui-btn-polish ui-focus-ring" to="/agile/filters" style={{ ...ui.secondaryButton, textDecoration: "none" }}>Saved Filters</Link></div>} />
              </WorkspacePanel>
            ) : null}
          </div>

          <div style={{ display: "grid", gap: 14 }}>
            <WorkspacePanel darkMode={darkMode} variant="execution" palette={palette} eyebrow="Snapshot" title="Project Readout" description="A tighter summary rail for the state of delivery.">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10 }}>
                <SummaryTile icon={ChartBarIcon} label="Total Issues" value={project.issue_count || 0} palette={palette} />
                <SummaryTile icon={CheckCircleIcon} label="Completed" value={`${completionRate}%`} palette={palette} />
                <SummaryTile icon={ClockIcon} label="Active Issues" value={project.active_issues || 0} palette={palette} />
                <SummaryTile icon={RocketLaunchIcon} label="Sprints" value={sprints.length} palette={palette} />
              </div>
            </WorkspacePanel>
            <WorkspacePanel darkMode={darkMode} variant="execution" palette={palette} eyebrow="Links" title="Quick Routes" description="Primary project destinations stay available regardless of the tab you are viewing.">
              <div style={{ display: "grid", gap: 10 }}>
                <Link className="ui-btn-polish ui-focus-ring" to={`/projects/${projectId}/backlog`} style={{ ...ui.secondaryButton, textDecoration: "none", justifyContent: "center" }}>Backlog</Link>
                {currentBoard ? <Link className="ui-btn-polish ui-focus-ring" to={`/boards/${currentBoard.id}`} style={{ ...ui.secondaryButton, textDecoration: "none", justifyContent: "center" }}>Kanban Board</Link> : null}
                <Link className="ui-btn-polish ui-focus-ring" to="/sprint" style={{ ...ui.secondaryButton, textDecoration: "none", justifyContent: "center" }}>Sprint Center</Link>
                <Link className="ui-btn-polish ui-focus-ring" to={`/projects/${projectId}/releases`} style={{ ...ui.secondaryButton, textDecoration: "none", justifyContent: "center" }}>Releases</Link>
              </div>
            </WorkspacePanel>
            <WorkspacePanel darkMode={darkMode} variant="execution" palette={palette} eyebrow="Team" title="Staffing Context" description="Member counts and sprint load give the page more operational texture.">
              <InfoRow label="Project lead" value={project.lead_name || "Unassigned"} palette={palette} />
              <InfoRow label="Team members" value={`${teamMembers.length}`} palette={palette} />
              <InfoRow label="Boards connected" value={`${boards.length}`} palette={palette} />
              <InfoRow label="Active sprints" value={`${activeSprintCount}`} palette={palette} />
              <InfoRow label="Issue completion" value={`${completionRate}%`} palette={palette} />
            </WorkspacePanel>
          </div>
        </div>

        {showEditProject ? <Modal title="Edit Project" onClose={() => setShowEditProject(false)} palette={palette}><form onSubmit={handleUpdateProject} style={{ display: "grid", gap: 14 }}>{projectFormError ? <div style={{ borderRadius: 16, padding: "10px 12px", fontSize: 13, border: `1px solid ${palette.danger}`, background: palette.accentSoft, color: palette.danger }}>{projectFormError}</div> : null}<div style={{ display: "grid", gap: 8 }}><label style={fieldLabel(palette)}>Project name</label><input required value={projectForm.name} onChange={(event) => setProjectForm((current) => ({ ...current, name: event.target.value }))} style={ui.input} placeholder="Project name" /></div><div style={{ display: "grid", gap: 8 }}><label style={fieldLabel(palette)}>Project brief</label><textarea rows={4} value={projectForm.description} onChange={(event) => setProjectForm((current) => ({ ...current, description: event.target.value }))} style={{ ...ui.input, resize: "vertical" }} placeholder="Describe the direction, scope, or execution context" /></div><div style={{ display: "grid", gap: 8 }}><label style={fieldLabel(palette)}>Project lead</label><select value={projectForm.lead_id} onChange={(event) => setProjectForm((current) => ({ ...current, lead_id: event.target.value }))} style={ui.input}><option value="">No project lead assigned</option>{teamMembers.map((member) => <option key={member.id} value={member.id}>{member.full_name || member.username}</option>)}</select></div><div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}><button type="button" className="ui-btn-polish ui-focus-ring" onClick={() => setShowEditProject(false)} style={ui.secondaryButton}>Cancel</button><button className="ui-btn-polish ui-focus-ring" type="submit" disabled={isSavingProject} style={ui.primaryButton}>{isSavingProject ? "Saving..." : "Save project"}</button></div></form></Modal> : null}

        {showCreateSprint ? <Modal title="Create Sprint" onClose={() => setShowCreateSprint(false)} palette={palette}><form onSubmit={handleCreateSprint} style={{ display: "grid", gap: 14 }}><div style={{ display: "grid", gap: 8 }}><label style={fieldLabel(palette)}>Sprint name</label><input required value={sprintForm.name} onChange={(event) => setSprintForm({ ...sprintForm, name: event.target.value })} style={ui.input} placeholder="Sprint name" /></div><div style={ui.twoCol}><div style={{ display: "grid", gap: 8 }}><label style={fieldLabel(palette)}>Start date</label><input type="date" required value={sprintForm.start_date} onChange={(event) => setSprintForm({ ...sprintForm, start_date: event.target.value })} style={ui.input} /></div><div style={{ display: "grid", gap: 8 }}><label style={fieldLabel(palette)}>End date</label><input type="date" required value={sprintForm.end_date} onChange={(event) => setSprintForm({ ...sprintForm, end_date: event.target.value })} style={ui.input} /></div></div><div style={{ display: "grid", gap: 8 }}><label style={fieldLabel(palette)}>Goal</label><textarea rows={4} value={sprintForm.goal} onChange={(event) => setSprintForm({ ...sprintForm, goal: event.target.value })} style={{ ...ui.input, resize: "vertical" }} placeholder="What should this sprint accomplish?" /></div><div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}><button type="button" className="ui-btn-polish ui-focus-ring" onClick={() => setShowCreateSprint(false)} style={ui.secondaryButton}>Cancel</button><button className="ui-btn-polish ui-focus-ring" type="submit" style={ui.primaryButton}>{isCreatingSprint ? "Creating..." : "Create Sprint"}</button></div></form></Modal> : null}

        {showCreateIssue ? <Modal title="Create Issue" onClose={() => setShowCreateIssue(false)} palette={palette}><form onSubmit={handleCreateIssue} style={{ display: "grid", gap: 14 }}><div style={{ display: "grid", gap: 8 }}><label style={fieldLabel(palette)}>Issue title</label><input required value={issueForm.title} onChange={(event) => setIssueForm({ ...issueForm, title: event.target.value })} style={ui.input} placeholder="Issue title" /></div><div style={{ display: "grid", gap: 8 }}><label style={fieldLabel(palette)}>Description</label><textarea rows={4} value={issueForm.description} onChange={(event) => setIssueForm({ ...issueForm, description: event.target.value })} style={{ ...ui.input, resize: "vertical" }} placeholder="Describe the work" /></div><div style={ui.twoCol}><div style={{ display: "grid", gap: 8 }}><label style={fieldLabel(palette)}>Priority</label><select value={issueForm.priority} onChange={(event) => setIssueForm({ ...issueForm, priority: event.target.value })} style={ui.input}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div><div style={{ display: "grid", gap: 8 }}><label style={fieldLabel(palette)}>Sprint</label><select value={issueForm.sprint_id} onChange={(event) => setIssueForm({ ...issueForm, sprint_id: event.target.value })} style={ui.input}><option value="">No Sprint</option>{sprints.map((sprint) => <option key={sprint.id} value={sprint.id}>{sprint.name}</option>)}</select></div></div><div style={{ display: "grid", gap: 8 }}><label style={fieldLabel(palette)}>Assignee</label><select value={issueForm.assignee_id} onChange={(event) => setIssueForm({ ...issueForm, assignee_id: event.target.value })} style={ui.input}><option value="">Unassigned</option>{teamMembers.map((member) => <option key={member.id} value={member.id}>{member.full_name || member.username}</option>)}</select></div><div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}><button type="button" className="ui-btn-polish ui-focus-ring" onClick={() => setShowCreateIssue(false)} style={ui.secondaryButton}>Cancel</button><button className="ui-btn-polish ui-focus-ring" type="submit" style={ui.primaryButton}>{isCreatingIssue ? "Creating..." : "Create Issue"}</button></div></form></Modal> : null}

        {showDeleteConfirm ? <Modal title="Delete Project" onClose={() => setShowDeleteConfirm(false)} palette={palette}><p style={{ margin: 0, color: palette.muted, fontSize: 14, lineHeight: 1.6 }}>This removes the project workspace permanently. Make sure any linked sprint or issue work has been moved or closed first.</p><div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}><button className="ui-btn-polish ui-focus-ring" onClick={() => setShowDeleteConfirm(false)} style={ui.secondaryButton}>Cancel</button><button className="ui-btn-polish ui-focus-ring" onClick={handleDeleteProject} style={{ border: `1px solid ${palette.danger}`, borderRadius: 999, padding: "10px 16px", background: palette.accentSoft, color: palette.danger, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{isDeleting ? "Deleting..." : "Delete Project"}</button></div></Modal> : null}
      </div>
    </div>
  );
}

function Modal({ title, onClose, children, palette }) {
  return <div style={{ position: "fixed", inset: 0, background: "rgba(22,18,15,0.56)", backdropFilter: "blur(14px)", display: "grid", placeItems: "center", padding: 18, zIndex: 120 }}><div style={{ width: "min(680px,100%)", borderRadius: 32, padding: 24, boxShadow: "var(--ui-shadow-lg)", display: "grid", gap: 18, border: `1px solid ${palette.border}`, background: palette.card }}><div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}><div><p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: palette.muted }}>Project Workspace</p><h3 style={{ margin: 0, fontSize: 28, color: palette.text, fontFamily: 'var(--font-display, "Fraunces"), Georgia, serif' }}>{title}</h3></div><button className="ui-btn-polish ui-focus-ring" onClick={onClose} style={{ border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text, borderRadius: 999, padding: "10px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Close</button></div>{children}</div></div>;
}

function SummaryTile({ icon: Icon, label, value, palette }) {
  return <article style={{ borderRadius: 20, border: `1px solid ${palette.border}`, background: palette.cardAlt, padding: 14, display: "grid", gap: 10 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><p style={{ margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: palette.muted }}>{label}</p><span style={{ width: 34, height: 34, borderRadius: 12, display: "grid", placeItems: "center", background: palette.accentSoft, color: palette.accent }}><Icon style={{ width: 16, height: 16 }} /></span></div><p style={{ margin: 0, fontSize: 26, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.05em", fontFamily: 'var(--font-display, "Fraunces"), Georgia, serif', color: palette.text }}>{value}</p></article>;
}

function InfoRow({ label, value, palette }) {
  return <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13 }}><span style={{ color: palette.muted }}>{label}</span><span style={{ color: palette.text, fontWeight: 700 }}>{value}</span></div>;
}

const chipStyle = (palette) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 12px",
  borderRadius: 999,
  border: `1px solid ${palette.border}`,
  background: palette.cardAlt,
  color: palette.text,
  fontSize: 12,
  fontWeight: 700,
  textTransform: "capitalize",
});

const fieldLabel = (palette) => ({
  margin: 0,
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: palette.muted,
});

const briefingGrid = {
  display: "grid",
  gap: 14,
};

const briefingPrimary = {
  borderRadius: 24,
  padding: 18,
  display: "grid",
  gap: 14,
  boxShadow: "var(--ui-shadow-sm)",
};

const briefingEyebrow = {
  margin: 0,
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};

const briefingMetaRail = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const briefingChip = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  borderRadius: 999,
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 700,
};

const briefingMetric = {
  borderRadius: 20,
  padding: 16,
  display: "grid",
  gap: 8,
  alignContent: "start",
  boxShadow: "var(--ui-shadow-xs)",
};

const metricHeading = {
  margin: 0,
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

const metricFigure = {
  margin: 0,
  fontSize: 28,
  lineHeight: 1,
  fontWeight: 800,
};

const metricNarrative = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.6,
};
