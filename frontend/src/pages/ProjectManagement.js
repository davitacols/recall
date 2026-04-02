import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeftIcon, PlusIcon } from "@heroicons/react/24/outline";
import api from "../services/api";
import {
  WorkspaceEmptyState,
  WorkspaceHero,
  WorkspacePanel,
  WorkspaceToolbar,
} from "../components/WorkspaceChrome";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";
import { createPlainTextPreview } from "../utils/textPreview";

function ProjectManagement() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { darkMode } = useTheme();

  const [project, setProject] = useState(null);
  const [sprints, setSprints] = useState([]);
  const [issues, setIssues] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSprintForm, setShowSprintForm] = useState(false);
  const [sprintData, setSprintData] = useState({ name: "", goal: "" });
  const [submitting, setSubmitting] = useState(false);

  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      const [projRes, sprintsRes, issuesRes, teamRes] = await Promise.all([
        api.get(`/api/agile/projects/${projectId}/`),
        api.get(`/api/agile/projects/${projectId}/sprints/`),
        api.get(`/api/agile/projects/${projectId}/issues/`).catch(() => ({ data: [] })),
        api.get("/api/auth/team/").catch(() => ({ data: [] })),
      ]);
      setProject(projRes.data);
      setSprints(sprintsRes.data || []);
      setIssues(issuesRes.data || []);
      setTeamMembers(teamRes.data || []);
    } catch (error) {
      console.error("Failed to fetch project data:", error);
      setProject(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSprint = async (event) => {
    event.preventDefault();
    if (!sprintData.name.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/api/agile/projects/${projectId}/sprints/`, sprintData);
      setShowSprintForm(false);
      setSprintData({ name: "", goal: "" });
      fetchProjectData();
    } catch (error) {
      console.error("Failed to create sprint:", error);
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

  if (!project) {
    return (
      <div style={{ minHeight: "100vh" }}>
        <div style={ui.container}>
          <button className="ui-btn-polish ui-focus-ring" onClick={() => navigate("/projects")} style={{ ...backButton, color: palette.muted }}>
            <ArrowLeftIcon style={icon14} /> Back to Projects
          </button>
          <WorkspacePanel
            palette={palette}
            darkMode={darkMode}
            variant="execution"
            eyebrow="Project Management"
            title="Project not found"
            description="The workspace could not be loaded or may no longer exist."
          >
            <WorkspaceEmptyState
              palette={palette}
              darkMode={darkMode}
              variant="execution"
              title="No project management context available"
              description="Return to the portfolio and open a different project workspace."
              action={
                <Link className="ui-btn-polish ui-focus-ring" to="/projects" style={{ ...ui.secondaryButton, textDecoration: "none" }}>
                  Open projects
                </Link>
              }
            />
          </WorkspacePanel>
        </div>
      </div>
    );
  }

  const activeSprint = sprints.find((sprint) => sprint.status === "active");
  const done = issues.filter((issue) => issue.status === "done").length;
  const inProgress = issues.filter((issue) => issue.status === "in_progress").length;
  const backlogCount = issues.filter((issue) => !issue.sprint_id || issue.status === "backlog").length;
  const readyTeamCount = teamMembers.filter((member) => Boolean(member.email || member.role)).length;
  const projectPulse = activeSprint
    ? `${activeSprint.name} is the active delivery lane. Keep ownership, sprint goals, and issue flow visible so work does not stall between planning and execution.`
    : "No sprint is currently active. This is the best place to set the next sprint goal and tighten ownership before work starts moving.";

  const managementAside = (
    <div
      style={{
        ...asideCard,
        border: `1px solid ${palette.border}`,
        background: darkMode
          ? "linear-gradient(150deg, rgba(32,27,23,0.92), rgba(22,18,15,0.84))"
          : "linear-gradient(150deg, rgba(255,252,248,0.98), rgba(244,237,226,0.9))",
      }}
    >
      <p style={{ ...asideEyebrow, color: palette.muted }}>Management Pulse</p>
      <h3 style={{ ...asideTitle, color: palette.text }}>
        {activeSprint ? activeSprint.name : "Set the next sprint rhythm"}
      </h3>
      <p style={{ ...asideCopy, color: palette.muted }}>{projectPulse}</p>
      <div style={asideMetricGrid}>
        <div style={{ ...asideMetric, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
          <p style={{ ...asideMetricLabel, color: palette.muted }}>Ready staff</p>
          <p style={{ ...asideMetricValue, color: palette.text }}>{readyTeamCount}</p>
        </div>
        <div style={{ ...asideMetric, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
          <p style={{ ...asideMetricLabel, color: palette.muted }}>Backlog</p>
          <p style={{ ...asideMetricValue, color: palette.text }}>{backlogCount}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={ui.container}>
        <button className="ui-btn-polish ui-focus-ring" onClick={() => navigate("/projects")} style={{ ...backButton, color: palette.muted }}>
          <ArrowLeftIcon style={icon14} /> Back to Projects
        </button>

        <WorkspaceHero
          palette={palette}
          darkMode={darkMode}
          variant="execution"
          eyebrow="Project Management"
          title={project.name}
          description={project.description || "Run sprint cadence, issue flow, and staffing context from one execution-focused management surface."}
          aside={managementAside}
          stats={[
            { label: "Issues", value: issues.length, helper: "Tracked work items in this project." },
            { label: "Done", value: done, helper: "Work already closed." },
            { label: "In progress", value: inProgress, helper: "Work currently moving." },
            { label: "Sprints", value: sprints.length, helper: activeSprint ? "Includes one active sprint." : "No active sprint yet." },
          ]}
          actions={
            <>
              <Link className="ui-btn-polish ui-focus-ring" to={`/projects/${projectId}`} style={{ ...ui.secondaryButton, textDecoration: "none" }}>
                Overview
              </Link>
              <Link className="ui-btn-polish ui-focus-ring" to={`/projects/${projectId}/backlog`} style={{ ...ui.secondaryButton, textDecoration: "none" }}>
                Backlog
              </Link>
              <button className="ui-btn-polish ui-focus-ring" onClick={() => setShowSprintForm(true)} style={ui.primaryButton}>
                <PlusIcon style={icon14} /> New Sprint
              </button>
            </>
          }
        />

        <WorkspaceToolbar palette={palette} darkMode={darkMode} variant="execution">
          <div style={toolbarLayout}>
            <div style={toolbarIntro}>
              <p style={{ ...toolbarEyebrow, color: palette.muted }}>Operations Guide</p>
              <h2 style={{ ...toolbarTitle, color: palette.text }}>Project management should make cadence, ownership, and sprint readiness obvious at a glance</h2>
              <p style={{ ...toolbarCopy, color: palette.muted }}>
                Use this surface to keep sprint planning, team staffing, and issue momentum aligned instead of scattering management work across disconnected views.
              </p>
            </div>
            <div style={toolbarChipRail}>
              <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                {project.key || "PRJ"} workspace
              </span>
              <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                {teamMembers.length} teammates visible
              </span>
              <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                {activeSprint ? "1 sprint active" : "No sprint active"}
              </span>
            </div>
          </div>
        </WorkspaceToolbar>

        {activeSprint ? (
          <WorkspacePanel
            palette={palette}
            darkMode={darkMode}
            variant="execution"
            eyebrow="Current Sprint"
            title={activeSprint.name}
            description={activeSprint.goal || "Give the sprint a sharper goal so the team knows exactly what must be finished before the window closes."}
            action={
              <Link className="ui-btn-polish ui-focus-ring" to={`/sprints/${activeSprint.id}`} style={{ ...ui.primaryButton, textDecoration: "none" }}>
                Open sprint
              </Link>
            }
          >
            <div style={highlightGrid}>
              <div style={{ ...summaryTile, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
                <p style={{ ...summaryLabel, color: palette.muted }}>Window</p>
                <p style={{ ...summaryValue, color: palette.text }}>
                  {activeSprint.start_date} - {activeSprint.end_date}
                </p>
              </div>
              <div style={{ ...summaryTile, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
                <p style={{ ...summaryLabel, color: palette.muted }}>Issue load</p>
                <p style={{ ...summaryValue, color: palette.text }}>
                  {(activeSprint.issue_count || 0).toString()}
                </p>
              </div>
              <div style={{ ...summaryTile, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
                <p style={{ ...summaryLabel, color: palette.muted }}>Status</p>
                <p style={{ ...summaryValue, color: palette.text, textTransform: "capitalize" }}>{activeSprint.status}</p>
              </div>
            </div>
          </WorkspacePanel>
        ) : null}

        <div style={contentGrid}>
          <WorkspacePanel
            palette={palette}
            darkMode={darkMode}
            variant="execution"
            eyebrow="Sprint Operations"
            title="Sprint queue"
            description="Every sprint should read like an operational record, not just a name in a list."
          >
            {sprints.length === 0 ? (
              <WorkspaceEmptyState
                palette={palette}
                darkMode={darkMode}
                variant="execution"
                title="No sprints yet"
                description="Create the first sprint to start a visible delivery cadence for this project."
                action={
                  <button className="ui-btn-polish ui-focus-ring" onClick={() => setShowSprintForm(true)} style={ui.primaryButton}>
                    <PlusIcon style={icon14} /> Create sprint
                  </button>
                }
              />
            ) : (
              <div style={stack}>
                {sprints.map((sprint) => (
                  <button
                    key={sprint.id}
                    className="ui-card-lift ui-smooth"
                    onClick={() => navigate(`/sprints/${sprint.id}`)}
                    style={{
                      ...listCard,
                      border: `1px solid ${palette.border}`,
                      background: palette.cardAlt,
                    }}
                  >
                    <div style={listHead}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ ...listTitle, color: palette.text }}>{sprint.name}</p>
                        <p style={{ ...listMeta, color: palette.muted }}>
                          {sprint.start_date} - {sprint.end_date}
                        </p>
                      </div>
                      <span style={{ ...statusBadge, border: `1px solid ${palette.border}`, background: palette.card, color: palette.text }}>
                        {String(sprint.status || "planned").replaceAll("_", " ")}
                      </span>
                    </div>
                    <p style={{ ...listCopy, color: palette.muted }}>
                      {createPlainTextPreview(sprint.goal, "No sprint goal recorded yet.", 180)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </WorkspacePanel>

          <WorkspacePanel
            palette={palette}
            darkMode={darkMode}
            variant="execution"
            eyebrow="Staffing"
            title="Team and ownership"
            description="Keep the working team visible so sprint decisions do not happen without clear ownership context."
          >
            {teamMembers.length === 0 ? (
              <WorkspaceEmptyState
                palette={palette}
                darkMode={darkMode}
                variant="execution"
                title="No team members visible"
                description="Invite teammates or sync staff membership so project ownership is easier to manage."
              />
            ) : (
              <div style={stack}>
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    style={{
                      ...personCard,
                      border: `1px solid ${palette.border}`,
                      background: palette.cardAlt,
                    }}
                  >
                    <div style={{ ...avatar, background: palette.ctaGradient, color: palette.buttonText }}>
                      {(member.full_name || member.username || "?").charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ ...personName, color: palette.text }}>{member.full_name || member.username}</p>
                      <p style={{ ...personMeta, color: palette.muted }}>
                        {member.email || member.role || "Team member"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </WorkspacePanel>
        </div>

        <WorkspacePanel
          palette={palette}
          darkMode={darkMode}
          variant="execution"
          eyebrow="Execution Snapshot"
          title="What this workspace is carrying"
          description="A lighter roll-up of project management context for handoffs and weekly reviews."
        >
          <div style={highlightGrid}>
            <div style={{ ...summaryTile, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
              <p style={{ ...summaryLabel, color: palette.muted }}>Project key</p>
              <p style={{ ...summaryValue, color: palette.text }}>{project.key || "PRJ"}</p>
            </div>
            <div style={{ ...summaryTile, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
              <p style={{ ...summaryLabel, color: palette.muted }}>Backlog load</p>
              <p style={{ ...summaryValue, color: palette.text }}>{backlogCount}</p>
            </div>
            <div style={{ ...summaryTile, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
              <p style={{ ...summaryLabel, color: palette.muted }}>Team size</p>
              <p style={{ ...summaryValue, color: palette.text }}>{teamMembers.length}</p>
            </div>
          </div>
        </WorkspacePanel>

        {showSprintForm ? (
          <div style={overlay}>
            <div style={{ ...modalCard, background: palette.card, border: `1px solid ${palette.border}` }}>
              <p style={{ ...modalEyebrow, color: palette.muted }}>Create Sprint</p>
              <h3 style={{ ...modalTitle, color: palette.text }}>Open a new sprint window</h3>
              <p style={{ ...modalCopy, color: palette.muted }}>
                Give the sprint a clear name and goal so the team knows what outcome the next delivery window is meant to produce.
              </p>
              <form onSubmit={handleCreateSprint} style={formStack}>
                <input
                  required
                  value={sprintData.name}
                  onChange={(event) => setSprintData({ ...sprintData, name: event.target.value })}
                  placeholder="Sprint name"
                  className="ui-focus-ring"
                  style={ui.input}
                />
                <textarea
                  rows={4}
                  value={sprintData.goal}
                  onChange={(event) => setSprintData({ ...sprintData, goal: event.target.value })}
                  placeholder="Sprint goal"
                  className="ui-focus-ring"
                  style={{ ...ui.input, resize: "vertical" }}
                />
                <div style={buttonRow}>
                  <button type="button" onClick={() => setShowSprintForm(false)} className="ui-btn-polish ui-focus-ring" style={ui.secondaryButton}>
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="ui-btn-polish ui-focus-ring" style={ui.primaryButton}>
                    {submitting ? "Creating..." : "Create sprint"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const spinner = {
  width: 30,
  height: 30,
  border: "2px solid rgba(148,163,184,0.28)",
  borderTopColor: "var(--ui-accent)",
  borderRadius: "50%",
  animation: "spin 1s linear infinite",
};

const backButton = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  border: "none",
  background: "transparent",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
  marginBottom: 10,
};

const asideCard = {
  minWidth: 240,
  borderRadius: 24,
  padding: 16,
  display: "grid",
  gap: 10,
};

const asideEyebrow = {
  margin: 0,
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};

const asideTitle = {
  margin: 0,
  fontSize: 22,
  lineHeight: 1.04,
};

const asideCopy = {
  margin: 0,
  fontSize: 13,
  lineHeight: 1.6,
};

const asideMetricGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 8,
};

const asideMetric = {
  borderRadius: 18,
  padding: "10px 12px",
  display: "grid",
  gap: 4,
};

const asideMetricLabel = {
  margin: 0,
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

const asideMetricValue = {
  margin: 0,
  fontSize: 20,
  lineHeight: 1,
  fontWeight: 800,
};

const toolbarLayout = {
  display: "grid",
  gap: 14,
};

const toolbarIntro = {
  display: "grid",
  gap: 4,
};

const toolbarEyebrow = {
  margin: 0,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};

const toolbarTitle = {
  margin: 0,
  fontSize: 24,
  lineHeight: 1.04,
};

const toolbarCopy = {
  margin: 0,
  fontSize: 13,
  lineHeight: 1.65,
  maxWidth: 760,
};

const toolbarChipRail = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const toolbarChip = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  borderRadius: 999,
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 700,
};

const contentGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 14,
  marginTop: 14,
};

const highlightGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 10,
};

const summaryTile = {
  borderRadius: 18,
  padding: "12px 14px",
  display: "grid",
  gap: 6,
};

const summaryLabel = {
  margin: 0,
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

const summaryValue = {
  margin: 0,
  fontSize: 15,
  fontWeight: 700,
  lineHeight: 1.4,
};

const stack = {
  display: "grid",
  gap: 12,
};

const listCard = {
  borderRadius: 22,
  padding: 16,
  display: "grid",
  gap: 10,
  textAlign: "left",
  cursor: "pointer",
};

const listHead = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const listTitle = {
  margin: 0,
  fontSize: 16,
  fontWeight: 800,
  letterSpacing: "-0.03em",
};

const listMeta = {
  margin: "4px 0 0",
  fontSize: 12,
};

const listCopy = {
  margin: 0,
  fontSize: 13,
  lineHeight: 1.65,
};

const statusBadge = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "8px 12px",
  fontSize: 11,
  fontWeight: 800,
  textTransform: "capitalize",
};

const personCard = {
  borderRadius: 22,
  padding: 14,
  display: "grid",
  gridTemplateColumns: "42px minmax(0, 1fr)",
  gap: 12,
  alignItems: "center",
};

const avatar = {
  width: 42,
  height: 42,
  borderRadius: 14,
  display: "grid",
  placeItems: "center",
  fontSize: 15,
  fontWeight: 800,
};

const personName = {
  margin: 0,
  fontSize: 14,
  fontWeight: 700,
};

const personMeta = {
  margin: "4px 0 0",
  fontSize: 12,
  lineHeight: 1.5,
};

const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(14, 10, 8, 0.36)",
  backdropFilter: "blur(8px)",
  display: "grid",
  placeItems: "center",
  zIndex: 120,
  padding: 16,
};

const modalCard = {
  width: "min(560px, 100%)",
  borderRadius: 28,
  padding: 22,
  boxShadow: "var(--ui-shadow-lg)",
};

const modalEyebrow = {
  margin: 0,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};

const modalTitle = {
  margin: "6px 0 0",
  fontSize: 28,
  lineHeight: 1.02,
};

const modalCopy = {
  margin: "8px 0 0",
  fontSize: 13,
  lineHeight: 1.6,
};

const formStack = {
  marginTop: 16,
  display: "grid",
  gap: 10,
};

const buttonRow = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
  marginTop: 8,
  flexWrap: "wrap",
};

const icon14 = { width: 14, height: 14 };

export default ProjectManagement;
