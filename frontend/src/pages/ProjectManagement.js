import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeftIcon, PlusIcon } from "@heroicons/react/24/outline";
import api from "../services/api";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";

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
      <div style={{ minHeight: "100vh", background: palette.bg, display: "grid", placeItems: "center" }}>
        <div style={spinner} />
      </div>
    );
  }

  if (!project) {
    return <div style={{ minHeight: "100vh", background: palette.bg, display: "grid", placeItems: "center", color: palette.muted }}>Project not found</div>;
  }

  const activeSprint = sprints.find((sprint) => sprint.status === "active");
  const done = issues.filter((issue) => issue.status === "done").length;
  const inProgress = issues.filter((issue) => issue.status === "in_progress").length;

  return (
    <div style={{ minHeight: "100vh", background: palette.bg }}>
      <div style={ui.container}>
        <button onClick={() => navigate("/projects")} style={backButton}><ArrowLeftIcon style={icon14} /> Back to Projects</button>

        <section style={{ ...hero, background: palette.card, border: `1px solid ${palette.border}` }}>
          <div>
            <p style={{ ...eyebrow, color: palette.muted }}>PROJECT MANAGEMENT</p>
            <h1 style={{ ...title, color: palette.text }}>{project.name}</h1>
            <p style={{ ...subtitle, color: palette.muted }}>{project.key} | {project.description || "No description"}</p>
          </div>
          <button onClick={() => setShowSprintForm(true)} style={ui.primaryButton}><PlusIcon style={icon14} /> New Sprint</button>
        </section>

        <section style={statsGrid}>
          <Metric label="Issues" value={issues.length} />
          <Metric label="Done" value={done} />
          <Metric label="In Progress" value={inProgress} />
          <Metric label="Sprints" value={sprints.length} />
        </section>

        {activeSprint && (
          <section style={{ ...card, border: `1px solid ${palette.border}`, background: palette.card }}>
            <h2 style={h2}>Active Sprint: {activeSprint.name}</h2>
            <p style={muted}>{activeSprint.start_date} - {activeSprint.end_date}</p>
            <p style={muted}>{activeSprint.goal || "No sprint goal"}</p>
          </section>
        )}

        <div style={ui.responsiveSplit}>
          <section style={{ ...card, border: `1px solid ${palette.border}`, background: palette.card }}>
            <h2 style={h2}>Sprints</h2>
            <div style={list}>
              {sprints.map((sprint) => (
                <button key={sprint.id} onClick={() => navigate(`/sprints/${sprint.id}`)} style={rowButton}>
                  <span>{sprint.name}</span>
                  <span style={pill}>{sprint.status}</span>
                </button>
              ))}
            </div>
          </section>

          <section style={{ ...card, border: `1px solid ${palette.border}`, background: palette.card }}>
            <h2 style={h2}>Team</h2>
            <div style={list}>
              {teamMembers.length === 0 && <div style={empty}>No team members</div>}
              {teamMembers.map((member) => (
                <div key={member.id} style={teamRow}>
                  <div style={avatar}>{(member.full_name || "?").charAt(0).toUpperCase()}</div>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, color: "#f4ece0", fontWeight: 600 }}>{member.full_name || member.username}</p>
                    <p style={{ margin: "3px 0 0", fontSize: 11, color: "#baa892" }}>{member.email || member.role || "Team member"}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {showSprintForm && (
          <div style={overlay}>
            <div style={{ ...modalCard, background: palette.card, border: `1px solid ${palette.border}` }}>
              <h3 style={{ margin: 0, fontSize: 20, color: palette.text }}>Create Sprint</h3>
              <form onSubmit={handleCreateSprint} style={formStack}>
                <input required value={sprintData.name} onChange={(event) => setSprintData({ ...sprintData, name: event.target.value })} placeholder="Sprint name" style={ui.input} />
                <textarea rows={4} value={sprintData.goal} onChange={(event) => setSprintData({ ...sprintData, goal: event.target.value })} placeholder="Sprint goal" style={ui.input} />
                <div style={buttons}>
                  <button type="button" onClick={() => setShowSprintForm(false)} style={ui.secondaryButton}>Cancel</button>
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

function Metric({ label, value }) {
  return (
    <article style={metricCard}>
      <p style={metricValue}>{value}</p>
      <p style={metricLabel}>{label}</p>
    </article>
  );
}

const spinner = { width: 30, height: 30, border: "2px solid rgba(120,120,120,0.35)", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite" };
const backButton = { display: "inline-flex", alignItems: "center", gap: 6, border: "none", background: "transparent", color: "#7d6d5a", fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 10 };
const hero = { borderRadius: 16, padding: 16, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" };
const eyebrow = { margin: 0, fontSize: 11, letterSpacing: "0.12em", fontWeight: 700 };
const title = { margin: "8px 0 5px", fontSize: "clamp(1.5rem,3vw,2.2rem)", letterSpacing: "-0.02em" };
const subtitle = { margin: 0, fontSize: 13 };
const statsGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 8, marginBottom: 12 };
const metricCard = { borderRadius: 12, padding: 12, border: "1px solid rgba(255,225,193,0.2)", background: "#1f181c" };
const metricValue = { margin: 0, fontSize: 26, fontWeight: 800, color: "#f4ece0" };
const metricLabel = { margin: "4px 0 0", fontSize: 12, color: "#baa892" };
const card = { borderRadius: 12, padding: 12, marginBottom: 10 };
const h2 = { margin: 0, fontSize: 16, color: "#f4ece0" };
const muted = { margin: "6px 0 0", fontSize: 12, color: "#baa892" };
const list = { marginTop: 8, display: "grid", gap: 7 };
const rowButton = { borderRadius: 10, border: "1px solid rgba(120,120,120,0.35)", background: "#1f181c", color: "#f4ece0", padding: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", fontSize: 13 };
const pill = { borderRadius: 999, border: "1px solid rgba(120,120,120,0.4)", padding: "3px 8px", fontSize: 10, color: "#baa892", textTransform: "capitalize", fontWeight: 700 };
const teamRow = { borderRadius: 10, border: "1px solid rgba(120,120,120,0.35)", background: "#1f181c", padding: 10, display: "grid", gridTemplateColumns: "30px 1fr", gap: 8, alignItems: "center" };
const avatar = { width: 30, height: 30, borderRadius: 999, background: "linear-gradient(135deg,#ffd390,#ff9f62)", color: "#20140f", fontWeight: 800, display: "grid", placeItems: "center", fontSize: 12 };
const empty = { borderRadius: 10, border: "1px dashed rgba(120,120,120,0.35)", padding: "14px 10px", fontSize: 12, color: "#9e8d7b", textAlign: "center" };
const overlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "grid", placeItems: "center", zIndex: 120, padding: 16 };
const modalCard = { width: "min(560px,100%)", borderRadius: 14, padding: 16 };
const formStack = { marginTop: 12, display: "grid", gap: 8 };
const buttons = { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 };
const icon14 = { width: 14, height: 14 };

export default ProjectManagement;

