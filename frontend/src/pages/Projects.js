import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChartBarIcon, FolderIcon, PlusIcon, UserGroupIcon } from "@heroicons/react/24/outline";
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
      <div style={{ minHeight: "100vh", background: palette.bg }}>
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
    <div style={{ minHeight: "100vh", background: palette.bg }}>
      <div style={ui.container}>
        <section
          style={{
            ...hero,
            border: `1px solid ${palette.border}`,
            background: darkMode
              ? "linear-gradient(145deg, rgba(255,167,97,0.16), rgba(87,205,184,0.13))"
              : "linear-gradient(145deg, rgba(255,196,146,0.42), rgba(152,243,223,0.36))",
          }}
        >
          <div>
            <p style={{ ...eyebrow, color: palette.muted }}>PROJECT WORKSPACE</p>
            <h1 style={{ ...title, color: palette.text }}>Projects</h1>
            <p style={{ ...subtitle, color: palette.muted }}>Organize teams, boards, and delivery tracks in one place.</p>
          </div>
          <button onClick={() => setShowCreate(true)} style={{ ...ui.primaryButton, ...newButton }}>
            <PlusIcon style={icon16} /> New Project
          </button>
        </section>

        {showCreate && (
          <div style={modalOverlay}>
            <div style={{ ...modalCard, background: palette.card, border: `1px solid ${palette.border}` }}>
              <h2 style={{ margin: 0, fontSize: 22, color: palette.text }}>Create Project</h2>
              <form onSubmit={handleCreate} style={formStack}>
                {createError && (
                  <div style={errorBox}>{createError}</div>
                )}
                <label style={label}>Project Name</label>
                <input
                  required
                  value={newProject.name}
                  onChange={(event) => setNewProject({ ...newProject, name: event.target.value })}
                  style={{ ...ui.input, ...input }}
                />
                <label style={label}>Description</label>
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
          <div style={{ ...emptyCard, background: palette.card, border: `1px solid ${palette.border}` }}>
            <FolderIcon style={{ width: 48, height: 48, color: palette.muted }} />
            <p style={{ color: palette.muted, margin: "10px 0 0" }}>No projects yet. Create your first project.</p>
          </div>
        ) : (
          <div style={grid}>
            {projects.map((project) => (
              <article
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                style={{ ...card, background: palette.card, border: `1px solid ${palette.border}` }}
              >
                <div style={cardTop}>
                  <div style={keyBadge}>{project.key || "PRJ"}</div>
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ ...cardTitle, color: palette.text }}>{project.name}</h3>
                    <p style={{ ...cardDesc, color: palette.muted }}>{project.description || "No description"}</p>
                  </div>
                </div>
                <div style={{ ...cardMeta, borderTop: `1px solid ${palette.border}` }}>
                  <span style={metaItem}><UserGroupIcon style={icon14} /> {project.lead_name || "No lead"}</span>
                  <span style={metaItem}><ChartBarIcon style={icon14} /> Active</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const hero = { borderRadius: 18, padding: "22px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 14, flexWrap: "wrap", marginBottom: 14 };
const eyebrow = { margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.15em" };
const title = { margin: "7px 0 6px", fontSize: "clamp(1.6rem,3vw,2.3rem)", letterSpacing: "-0.02em" };
const subtitle = { margin: 0, fontSize: 14 };
const newButton = { display: "inline-flex", alignItems: "center", gap: 7, border: "none", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#20140f", background: "linear-gradient(135deg,#ffd390,#ff9f62)" };
const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(270px,1fr))", gap: 10 };
const card = { borderRadius: 14, padding: 14, cursor: "pointer" };
const cardTop = { display: "grid", gridTemplateColumns: "auto 1fr", gap: 10, alignItems: "start" };
const keyBadge = { width: 50, height: 50, borderRadius: 12, display: "grid", placeItems: "center", background: "linear-gradient(135deg,#ffcc8b,#ff935d)", color: "#20140f", fontWeight: 800, fontSize: 12 };
const cardTitle = { margin: 0, fontSize: 17, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const cardDesc = { margin: "4px 0 0", fontSize: 13, lineHeight: 1.45, minHeight: 36 };
const cardMeta = { marginTop: 12, paddingTop: 10, display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12 };
const metaItem = { display: "inline-flex", alignItems: "center", gap: 5, color: "#9e8d7b" };
const emptyCard = { borderRadius: 14, padding: "34px 14px", textAlign: "center" };
const modalOverlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "grid", placeItems: "center", zIndex: 100, padding: 16 };
const modalCard = { width: "min(520px,100%)", borderRadius: 16, padding: 18 };
const formStack = { marginTop: 14, display: "grid", gap: 8 };
const label = { fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#9e8d7b" };
const errorBox = { borderRadius: 10, border: "1px solid rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.12)", color: "#ef4444", padding: "8px 10px", fontSize: 13 };
const input = { borderRadius: 10, padding: "10px 12px", fontSize: 14, outline: "none", fontFamily: "inherit" };
const buttonRow = { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 };
const skeletonGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(270px,1fr))", gap: 10 };
const skeletonCard = { borderRadius: 14, minHeight: 130, opacity: 0.7 };
const icon16 = { width: 16, height: 16 };
const icon14 = { width: 14, height: 14 };
