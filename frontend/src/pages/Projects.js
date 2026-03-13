import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRightIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  FolderIcon,
  PlusIcon,
  RocketLaunchIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
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

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await api.get("/api/agile/projects/");
      setProjects(response.data || []);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
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

  if (loading) {
    return (
      <div style={{ minHeight: "100vh" }}>
        <div style={ui.container}>
          <div style={skeletonGrid}>
            {[1, 2, 3].map((item) => (
              <div key={item} style={{ ...skeletonCard, background: palette.card, border: `1px solid ${palette.border}` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={{ ...ui.container, width: "min(1480px,100%)" }}>
        <section
          className="ui-enter"
          style={{
            ...hero,
            border: `1px solid ${palette.border}`,
            background: palette.card,
            "--ui-delay": "20ms",
          }}
        >
          <div style={heroMain}>
            <p style={{ ...eyebrow, color: palette.muted }}>PROJECT WORKSPACE</p>
            <h1 style={{ ...title, color: palette.text }}>Projects built around execution context</h1>
            <p style={{ ...subtitle, color: palette.muted }}>
              Organize delivery tracks, boards, owners, and active work in one modern workspace.
            </p>
            <div style={heroActions}>
              <button
                className="ui-btn-polish ui-focus-ring"
                onClick={() => setShowCreate(true)}
                style={{ ...ui.primaryButton, ...newButton, color: palette.buttonText, background: palette.ctaGradient }}
              >
                <PlusIcon style={icon16} /> New Project
              </button>
              <Link
                className="ui-btn-polish ui-focus-ring"
                to="/sprint"
                style={{ ...ui.secondaryButton, ...heroLink, color: palette.text }}
              >
                <RocketLaunchIcon style={icon16} /> Sprint Center
              </Link>
            </div>
          </div>
          <div style={heroStatGrid}>
            <SummaryCard
              icon={FolderIcon}
              label="Workspaces"
              value={projectSummary.total}
              helper="Active project spaces"
              palette={palette}
            />
            <SummaryCard
              icon={UserGroupIcon}
              label="With Leads"
              value={projectSummary.withLead}
              helper="Clear ownership assigned"
              palette={palette}
            />
            <SummaryCard
              icon={ClipboardDocumentListIcon}
              label="Documented"
              value={projectSummary.documented}
              helper="Project briefs in place"
              palette={palette}
            />
          </div>
        </section>

        {showCreate && (
          <div style={modalOverlay}>
            <div style={{ ...modalCard, background: palette.card, border: `1px solid ${palette.border}` }}>
              <h2 style={{ margin: 0, fontSize: 22, color: palette.text }}>Create Project</h2>
              <form onSubmit={handleCreate} style={formStack}>
                {createError && (
                  <div style={{ ...errorBox, border: `1px solid ${palette.danger}`, background: palette.accentSoft, color: palette.danger }}>{createError}</div>
                )}
                <label style={{ ...label, color: palette.muted }}>Project Name</label>
                <input
                  required
                  value={newProject.name}
                  onChange={(event) => setNewProject({ ...newProject, name: event.target.value })}
                  style={{ ...ui.input, ...input }}
                />
                <label style={{ ...label, color: palette.muted }}>Description</label>
                <textarea
                  rows={4}
                  value={newProject.description}
                  onChange={(event) => setNewProject({ ...newProject, description: event.target.value })}
                  style={{ ...ui.input, ...input, resize: "vertical" }}
                />
                <div style={buttonRow}>
                  <button type="button" onClick={() => setShowCreate(false)} style={ui.secondaryButton}>Cancel</button>
                  <button type="submit" disabled={creating} style={ui.primaryButton}>{creating ? "Creating..." : "Create"}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {projects.length === 0 ? (
          <div className="ui-enter ui-card-lift ui-smooth" style={{ ...emptyCard, background: palette.card, border: `1px solid ${palette.border}`, "--ui-delay": "90ms" }}>
            <FolderIcon style={{ width: 48, height: 48, color: palette.muted }} />
            <h2 style={{ margin: "16px 0 6px", fontSize: 22, color: palette.text }}>Start your first project workspace</h2>
            <p style={{ color: palette.muted, margin: 0, maxWidth: 460 }}>
              Create a project to coordinate boards, issues, sprint work, and team context from one place.
            </p>
            <button
              className="ui-btn-polish ui-focus-ring"
              onClick={() => setShowCreate(true)}
              style={{ ...ui.primaryButton, marginTop: 18, alignSelf: "center" }}
            >
              <PlusIcon style={icon16} /> Create Project
            </button>
          </div>
        ) : (
          <div className="ui-enter" style={{ ...grid, "--ui-delay": "90ms" }}>
            {projects.map((project) => (
              <article
                className="ui-card-lift ui-smooth"
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                style={{ ...card, background: palette.card, border: `1px solid ${palette.border}` }}
              >
                <div style={cardTop}>
                  <div style={{ ...keyBadge, background: palette.ctaGradient, color: palette.buttonText }}>
                    {project.key || "PRJ"}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ ...cardEyebrow, color: palette.muted }}>Delivery Workspace</p>
                    <h3 style={{ ...cardTitle, color: palette.text }}>{project.name}</h3>
                    <p style={{ ...cardDesc, color: palette.muted }}>{project.description || "No description"}</p>
                  </div>
                </div>
                <div style={cardSignalRow}>
                  <span style={{ ...signalChip, border: `1px solid ${palette.border}`, color: palette.text, background: palette.cardAlt }}>
                    <UserGroupIcon style={icon14} /> {project.lead_name || "No lead assigned"}
                  </span>
                  <span style={{ ...signalChip, border: `1px solid ${palette.border}`, color: palette.text, background: palette.cardAlt }}>
                    <ChartBarIcon style={icon14} /> Active workspace
                  </span>
                </div>
                <div style={{ ...cardMeta, borderTop: `1px solid ${palette.border}` }}>
                  <span style={{ ...metaItem, color: palette.muted }}>Open workspace</span>
                  <span style={{ ...metaItem, color: palette.accent }}>
                    View <ArrowRightIcon style={icon14} />
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, helper, palette }) {
  return (
    <article style={{ ...summaryCard, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
      <div style={summaryHead}>
        <span style={{ ...summaryIcon, background: palette.accentSoft, color: palette.accent }}>
          <Icon style={icon16} />
        </span>
        <p style={{ ...summaryLabel, color: palette.muted }}>{label}</p>
      </div>
      <p style={{ ...summaryValue, color: palette.text }}>{value}</p>
      <p style={{ ...summaryHelper, color: palette.muted }}>{helper}</p>
    </article>
  );
}

const hero = {
  borderRadius: 28,
  padding: "clamp(20px, 3vw, 30px)",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 18,
  marginBottom: 18,
  boxShadow: "var(--ui-shadow-sm)",
};
const heroMain = { minWidth: 0, display: "grid", alignContent: "space-between", gap: 16 };
const eyebrow = { margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" };
const title = { margin: "7px 0 8px", fontSize: "clamp(2rem,3vw,2.8rem)", letterSpacing: "-0.04em", lineHeight: 1.02 };
const subtitle = { margin: 0, fontSize: 15, lineHeight: 1.55, maxWidth: 720 };
const heroActions = { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" };
const heroLink = { textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 7 };
const heroStatGrid = { display: "grid", gap: 10, alignContent: "start" };
const summaryCard = { borderRadius: 22, padding: "16px 16px 14px", display: "grid", gap: 8 };
const summaryHead = { display: "flex", alignItems: "center", gap: 10 };
const summaryIcon = { width: 34, height: 34, borderRadius: 12, display: "grid", placeItems: "center" };
const summaryLabel = { margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" };
const summaryValue = { margin: 0, fontSize: 28, fontWeight: 800, lineHeight: 1 };
const summaryHelper = { margin: 0, fontSize: 13, lineHeight: 1.45 };
const newButton = { display: "inline-flex", alignItems: "center", gap: 7 };
const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 14 };
const card = { borderRadius: 22, padding: 18, cursor: "pointer", display: "grid", gap: 14 };
const cardTop = { display: "grid", gridTemplateColumns: "auto 1fr", gap: 10, alignItems: "start" };
const keyBadge = { width: 56, height: 56, borderRadius: 16, display: "grid", placeItems: "center", fontWeight: 800, fontSize: 13, boxShadow: "var(--ui-shadow-sm)" };
const cardEyebrow = { margin: "0 0 6px", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" };
const cardTitle = { margin: 0, fontSize: 19, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const cardDesc = { margin: "6px 0 0", fontSize: 14, lineHeight: 1.5, minHeight: 44 };
const cardSignalRow = { display: "flex", gap: 8, flexWrap: "wrap" };
const signalChip = { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700 };
const cardMeta = { marginTop: 4, paddingTop: 12, display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12, alignItems: "center" };
const metaItem = { display: "inline-flex", alignItems: "center", gap: 5 };
const emptyCard = { borderRadius: 24, padding: "54px 22px", textAlign: "center", display: "grid", justifyItems: "center" };
const modalOverlay = { position: "fixed", inset: 0, background: "rgba(5,12,20,0.62)", backdropFilter: "blur(8px)", display: "grid", placeItems: "center", zIndex: 100, padding: 16 };
const modalCard = { width: "min(560px,100%)", borderRadius: 24, padding: 22, boxShadow: "var(--ui-shadow-lg)" };
const formStack = { marginTop: 14, display: "grid", gap: 10 };
const label = { fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" };
const errorBox = { borderRadius: 14, padding: "10px 12px", fontSize: 13 };
const input = { padding: "10px 12px", fontSize: 14, outline: "none", fontFamily: "inherit" };
const buttonRow = { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 };
const skeletonGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 14 };
const skeletonCard = { borderRadius: 22, minHeight: 170, opacity: 0.7 };
const icon16 = { width: 16, height: 16 };
const icon14 = { width: 14, height: 14 };
