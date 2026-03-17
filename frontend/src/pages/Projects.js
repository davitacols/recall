import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRightIcon,
  ClipboardDocumentListIcon,
  FolderIcon,
  PlusIcon,
  RocketLaunchIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import {
  WorkspaceEmptyState,
  WorkspaceHero,
  WorkspaceToolbar,
} from "../components/WorkspaceChrome";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";
import api from "../services/api";

export default function Projects() {
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newProject, setNewProject] = useState({ name: "", description: "" });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);
  const projectSummary = useMemo(
    () => ({
      total: projects.length,
      withLead: projects.filter((project) => Boolean(project.lead_name)).length,
      documented: projects.filter((project) => Boolean(project.description?.trim())).length,
    }),
    [projects]
  );
  const leadCoverage = projectSummary.total ? Math.round((projectSummary.withLead / projectSummary.total) * 100) : 0;
  const briefCoverage = projectSummary.total ? Math.round((projectSummary.documented / projectSummary.total) * 100) : 0;

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await api.get("/api/agile/projects/");
      setProjects(response.data || []);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!newProject.name.trim()) {
      setCreateError("Project name is required");
      return;
    }
    setCreating(true);
    setCreateError("");
    try {
      await api.post("/api/agile/projects/", {
        name: newProject.name.trim(),
        description: newProject.description?.trim() || "",
      });
      setShowCreate(false);
      setNewProject({ name: "", description: "" });
      fetchProjects();
    } catch (error) {
      console.error("Failed to create project:", error);
      setCreateError(
        error?.response?.data?.detail ||
          error?.response?.data?.error ||
          error?.response?.data?.message ||
          "Failed to create project"
      );
    } finally {
      setCreating(false);
    }
  };

  const heroStats = [
    {
      label: "Workspaces",
      value: projectSummary.total,
      helper: "Active project spaces",
      tone: palette.accent,
    },
    {
      label: "Lead Coverage",
      value: `${leadCoverage}%`,
      helper: `${projectSummary.withLead} with named leads`,
      tone: palette.text,
    },
    {
      label: "Documented",
      value: `${briefCoverage}%`,
      helper: `${projectSummary.documented} with briefs or context`,
      tone: palette.info,
    },
  ];

  const operationsAside = (
    <div
      style={{
        ...asideCard,
        border: `1px solid ${palette.border}`,
        background: darkMode
          ? "linear-gradient(160deg, rgba(32,27,23,0.9), rgba(22,18,15,0.82))"
          : "linear-gradient(160deg, rgba(255,252,248,0.96), rgba(244,237,226,0.88))",
      }}
    >
      <p style={{ ...asideEyebrow, color: palette.muted }}>Execution Readiness</p>
      <h3 style={{ ...asideTitle, color: palette.text }}>Projects feel stronger when ownership and briefs are obvious.</h3>
      <p style={{ ...asideBody, color: palette.muted }}>
        {projectSummary.withLead} have clear owners and {projectSummary.documented} already carry enough context for handoffs.
      </p>
      <div style={asideMetricGrid}>
        <div style={{ ...asideMetric, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
          <p style={{ ...asideMetricLabel, color: palette.muted }}>Leads</p>
          <p style={{ ...asideMetricValue, color: palette.text }}>{leadCoverage}%</p>
        </div>
        <div style={{ ...asideMetric, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
          <p style={{ ...asideMetricLabel, color: palette.muted }}>Briefs</p>
          <p style={{ ...asideMetricValue, color: palette.text }}>{briefCoverage}%</p>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              style={{
                borderRadius: 24,
                height: 150,
                background: palette.card,
                border: `1px solid ${palette.border}`,
                opacity: 0.76,
                boxShadow: "var(--ui-shadow-sm)",
              }}
            />
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12 }}>
          {[1, 2, 3].map((item) => (
            <div
              key={`card-${item}`}
              style={{
                borderRadius: 24,
                minHeight: 240,
                background: palette.card,
                border: `1px solid ${palette.border}`,
                opacity: 0.72,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <WorkspaceHero
        palette={palette}
        darkMode={darkMode}
        eyebrow="Execution Workspace"
        title="Projects"
        description="Organize delivery tracks, roadmaps, and ownership in a calmer project workspace that keeps execution context close."
        stats={heroStats}
        aside={operationsAside}
        actions={
          <>
            <button className="ui-btn-polish ui-focus-ring" onClick={() => setShowCreate(true)} style={ui.primaryButton}>
              <PlusIcon style={icon14} /> New Project
            </button>
            <button className="ui-btn-polish ui-focus-ring" onClick={() => navigate("/sprint")} style={ui.secondaryButton}>
              <RocketLaunchIcon style={icon14} /> Sprint Center
            </button>
            <button className="ui-btn-polish ui-focus-ring" onClick={() => navigate("/business/documents")} style={ui.secondaryButton}>
              Documents
            </button>
          </>
        }
      />

      <WorkspaceToolbar palette={palette}>
        <div style={toolbarLayout}>
          <div style={toolbarIntro}>
            <p style={{ ...toolbarEyebrow, color: palette.muted }}>Delivery Surface</p>
            <h2 style={{ ...toolbarTitle, color: palette.text }}>Move from a project list to the right workspace fast</h2>
            <p style={{ ...toolbarCopy, color: palette.muted }}>
              Each workspace can act as the front door into overview, roadmap planning, and the management layer for ongoing delivery.
            </p>
          </div>

          <div style={toolbarChipRail}>
            <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
              {projectSummary.total} active workspaces
            </span>
            <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
              {projectSummary.withLead} with clear leads
            </span>
            <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
              {projectSummary.documented} documented
            </span>
          </div>
        </div>
      </WorkspaceToolbar>

      {showCreate ? (
        <div style={modalOverlay}>
          <div style={{ ...modalCard, background: palette.card, border: `1px solid ${palette.border}` }}>
            <div style={modalHeader}>
              <div>
                <p style={{ ...modalEyebrow, color: palette.muted }}>Create Delivery Workspace</p>
                <h2 style={{ ...modalTitle, color: palette.text }}>Create Project</h2>
                <p style={{ ...modalBody, color: palette.muted }}>
                  Start with a clear name and a short project brief, then shape the roadmap and management views afterward.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreate} style={formStack}>
              {createError ? (
                <div style={{ ...errorBox, border: `1px solid ${palette.danger}`, background: palette.accentSoft, color: palette.danger }}>
                  {createError}
                </div>
              ) : null}

              <label style={{ ...label, color: palette.muted }}>Project Name</label>
              <input
                required
                value={newProject.name}
                onChange={(event) => setNewProject({ ...newProject, name: event.target.value })}
                className="ui-focus-ring"
                style={ui.input}
              />

              <label style={{ ...label, color: palette.muted }}>Description</label>
              <textarea
                rows={4}
                value={newProject.description}
                onChange={(event) => setNewProject({ ...newProject, description: event.target.value })}
                className="ui-focus-ring"
                style={{ ...ui.input, resize: "vertical" }}
              />

              <div style={buttonRow}>
                <button type="button" onClick={() => setShowCreate(false)} className="ui-btn-polish ui-focus-ring" style={ui.secondaryButton}>
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="ui-btn-polish ui-focus-ring" style={ui.primaryButton}>
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {projects.length === 0 ? (
        <WorkspaceEmptyState
          palette={palette}
          title="Start your first project workspace"
          description="Create a project to coordinate boards, issue flow, roadmap work, and the surrounding context from one place."
          action={
            <button className="ui-btn-polish ui-focus-ring" onClick={() => setShowCreate(true)} style={ui.primaryButton}>
              <PlusIcon style={icon14} /> Create Project
            </button>
          }
        />
      ) : (
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 14 }}>
          {projects.map((project) => (
            <article
              key={project.id}
              className="ui-card-lift ui-smooth"
              onClick={() => navigate(`/projects/${project.id}`)}
              style={{
                ...projectCard,
                border: `1px solid ${palette.border}`,
                background: palette.card,
              }}
            >
              <div style={projectCardTop}>
                <div style={{ ...keyBadge, background: palette.ctaGradient, color: palette.buttonText }}>
                  {project.key || "PRJ"}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ ...cardEyebrow, color: palette.muted }}>Delivery Workspace</p>
                  <h3 style={{ ...cardTitle, color: palette.text }}>{project.name || "Untitled project"}</h3>
                  <p style={{ ...cardDescription, color: palette.muted }}>
                    {project.description || "No project brief yet. Open the workspace to add context, direction, and planning detail."}
                  </p>
                </div>
              </div>

              <div style={projectChipRail}>
                <span style={{ ...chip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                  <UserGroupIcon style={icon12} /> {project.lead_name || "No lead assigned"}
                </span>
                <span style={{ ...chip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                  <ClipboardDocumentListIcon style={icon12} /> {project.description?.trim() ? "Brief in place" : "Needs brief"}
                </span>
              </div>

              <div style={{ ...projectActions, borderTop: `1px solid ${palette.border}` }}>
                <button
                  className="ui-btn-polish ui-focus-ring"
                  onClick={(event) => {
                    event.stopPropagation();
                    navigate(`/projects/${project.id}`);
                  }}
                  style={miniActionButton(palette)}
                >
                  Overview
                </button>
                <button
                  className="ui-btn-polish ui-focus-ring"
                  onClick={(event) => {
                    event.stopPropagation();
                    navigate(`/projects/${project.id}/roadmap`);
                  }}
                  style={miniActionButton(palette)}
                >
                  Roadmap
                </button>
                <button
                  className="ui-btn-polish ui-focus-ring"
                  onClick={(event) => {
                    event.stopPropagation();
                    navigate(`/projects/${project.id}/manage`);
                  }}
                  style={miniActionButton(palette)}
                >
                  Manage
                </button>
                <span style={{ ...openLink, color: palette.accent }}>
                  Open workspace <ArrowRightIcon style={icon12} />
                </span>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

function miniActionButton(palette) {
  return {
    border: "none",
    borderRadius: 999,
    padding: "8px 12px",
    background: palette.cardAlt,
    color: palette.text,
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  };
}

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
  lineHeight: 1.02,
};

const toolbarCopy = {
  margin: 0,
  fontSize: 13,
  lineHeight: 1.6,
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
  fontSize: 20,
  lineHeight: 1.04,
};

const asideBody = {
  margin: 0,
  fontSize: 12,
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
  gap: 3,
};

const asideMetricLabel = {
  margin: 0,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

const asideMetricValue = {
  margin: 0,
  fontSize: 18,
  fontWeight: 700,
  lineHeight: 1,
};

const modalOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(14, 10, 8, 0.36)",
  backdropFilter: "blur(8px)",
  display: "grid",
  placeItems: "center",
  zIndex: 100,
  padding: 16,
};

const modalCard = {
  width: "min(560px,100%)",
  borderRadius: 28,
  padding: 22,
  boxShadow: "var(--ui-shadow-lg)",
};

const modalHeader = {
  display: "grid",
  gap: 4,
};

const modalEyebrow = {
  margin: 0,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};

const modalTitle = {
  margin: 0,
  fontSize: 28,
  lineHeight: 1.02,
};

const modalBody = {
  margin: 0,
  fontSize: 13,
  lineHeight: 1.6,
};

const formStack = {
  marginTop: 16,
  display: "grid",
  gap: 10,
};

const label = {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const errorBox = {
  borderRadius: 16,
  padding: "10px 12px",
  fontSize: 13,
};

const buttonRow = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
  marginTop: 8,
  flexWrap: "wrap",
};

const projectCard = {
  borderRadius: 26,
  padding: 20,
  cursor: "pointer",
  display: "grid",
  gap: 14,
  minHeight: 266,
  boxShadow: "var(--ui-shadow-sm)",
};

const projectCardTop = {
  display: "grid",
  gridTemplateColumns: "auto 1fr",
  gap: 12,
  alignItems: "start",
};

const keyBadge = {
  width: 58,
  height: 58,
  borderRadius: 18,
  display: "grid",
  placeItems: "center",
  fontWeight: 800,
  fontSize: 13,
  boxShadow: "var(--ui-shadow-sm)",
};

const cardEyebrow = {
  margin: "0 0 6px",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};

const cardTitle = {
  margin: 0,
  fontSize: 24,
  lineHeight: 1.04,
};

const cardDescription = {
  margin: "8px 0 0",
  fontSize: 14,
  lineHeight: 1.65,
  minHeight: 70,
};

const projectChipRail = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const chip = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
};

const projectActions = {
  marginTop: "auto",
  paddingTop: 14,
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

const openLink = {
  marginLeft: "auto",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
  fontWeight: 700,
};

const icon14 = { width: 14, height: 14 };
const icon12 = { width: 12, height: 12 };
