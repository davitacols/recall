import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRightIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  ExclamationTriangleIcon,
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
import { createPlainTextPreview, hasMeaningfulText } from "../utils/textPreview";

export default function Projects() {
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showLeadPicker, setShowLeadPicker] = useState(false);
  const [newProject, setNewProject] = useState({ name: "", description: "", lead_id: "" });
  const [leadPickerProject, setLeadPickerProject] = useState(null);
  const [leadDraft, setLeadDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [savingLead, setSavingLead] = useState(false);
  const [createError, setCreateError] = useState("");
  const [leadError, setLeadError] = useState("");

  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);
  const portfolioProjects = useMemo(
    () =>
      [...projects]
        .sort((left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0))
        .map((project) => {
          const hasBrief = hasMeaningfulText(project.description);
          const hasLead = Boolean(project.lead_name);
          const needsAttention = !hasBrief || !hasLead;
          const statusLabel = !hasLead && !hasBrief ? "Needs lead + brief" : !hasLead ? "Needs lead" : !hasBrief ? "Needs brief" : "Ready";
          return {
            ...project,
            hasBrief,
            hasLead,
            needsAttention,
            statusLabel,
            summary: createPlainTextPreview(
              project.description,
              "No project brief yet. Open the workspace to add direction, project lead notes, and planning context.",
              180
            ),
            createdLabel: project.created_at ? new Date(project.created_at).toLocaleDateString() : "Recently added",
          };
        }),
    [projects]
  );
  const projectSummary = useMemo(
    () => ({
      total: projects.length,
    }),
    [projects]
  );
  const readyProjects = useMemo(() => portfolioProjects.filter((project) => !project.needsAttention), [portfolioProjects]);
  const attentionProjects = useMemo(() => portfolioProjects.filter((project) => project.needsAttention), [portfolioProjects]);
  const ownerGaps = useMemo(() => portfolioProjects.filter((project) => !project.hasLead).length, [portfolioProjects]);
  const briefGaps = useMemo(() => portfolioProjects.filter((project) => !project.hasBrief).length, [portfolioProjects]);
  const newestProject = portfolioProjects[0] || null;

  useEffect(() => {
    fetchProjects();
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      const response = await api.get("/api/organizations/members/");
      setTeamMembers(response.data || []);
    } catch (error) {
      console.error("Failed to fetch team members:", error);
      setTeamMembers([]);
    }
  };

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
        ...(newProject.lead_id ? { lead_id: parseInt(newProject.lead_id, 10) } : {}),
      });
      setShowCreate(false);
      setNewProject({ name: "", description: "", lead_id: "" });
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

  const openLeadPicker = (project) => {
    setLeadPickerProject(project);
    setLeadDraft(project?.lead ? String(project.lead) : "");
    setLeadError("");
    setShowLeadPicker(true);
  };

  const handleSaveLead = async (event) => {
    event.preventDefault();
    if (!leadPickerProject) return;
    setSavingLead(true);
    setLeadError("");
    try {
      await api.put(`/api/agile/projects/${leadPickerProject.id}/`, {
        lead_id: leadDraft || "",
      });
      setShowLeadPicker(false);
      setLeadPickerProject(null);
      setLeadDraft("");
      fetchProjects();
    } catch (error) {
      console.error("Failed to update project lead:", error);
      setLeadError(
        error?.response?.data?.detail ||
          error?.response?.data?.error ||
          error?.response?.data?.message ||
          "Failed to update project lead"
      );
    } finally {
      setSavingLead(false);
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
      label: "Ready",
      value: readyProjects.length,
      helper: "Lead and brief in place",
      tone: palette.text,
    },
    {
      label: "Needs shaping",
      value: attentionProjects.length,
      helper: "Missing lead or brief",
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
      <h3 style={{ ...asideTitle, color: palette.text }}>Projects move faster when the project lead and context are obvious.</h3>
      <p style={{ ...asideBody, color: palette.muted }}>
        {readyProjects.length} workspaces are ready to run. {attentionProjects.length} still need shaping before handoffs feel clean.
      </p>
      <div style={asideMetricGrid}>
        <div style={{ ...asideMetric, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
          <p style={{ ...asideMetricLabel, color: palette.muted }}>Owner gaps</p>
          <p style={{ ...asideMetricValue, color: palette.text }}>{ownerGaps}</p>
        </div>
        <div style={{ ...asideMetric, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
          <p style={{ ...asideMetricLabel, color: palette.muted }}>Brief gaps</p>
          <p style={{ ...asideMetricValue, color: palette.text }}>{briefGaps}</p>
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
        description="Organize delivery tracks, roadmaps, and project lead accountability in a calmer workspace that keeps execution context close."
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
            <p style={{ ...toolbarEyebrow, color: palette.muted }}>Portfolio View</p>
            <h2 style={{ ...toolbarTitle, color: palette.text }}>See which workspaces are ready to run and which still need shaping</h2>
            <p style={{ ...toolbarCopy, color: palette.muted }}>
              The portfolio now leads with operating signals first, then drops into the project atlas so you can spot lead gaps and missing briefs before they slow delivery.
            </p>
          </div>

          <div style={toolbarChipRail}>
            <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
              {readyProjects.length} ready to run
            </span>
            <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
              {ownerGaps} missing leads
            </span>
            <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
              {briefGaps} missing briefs
            </span>
          </div>
        </div>
      </WorkspaceToolbar>

      {projects.length ? (
        <section style={portfolioOverviewGrid}>
          <article
            className="ui-card-lift ui-smooth"
            style={{
              ...portfolioSpotlight,
              border: `1px solid ${palette.border}`,
              background: darkMode
                ? "linear-gradient(145deg, rgba(30,24,20,0.96), rgba(22,18,15,0.88))"
                : "linear-gradient(145deg, rgba(255,252,248,0.98), rgba(247,240,230,0.92))",
            }}
          >
            <div style={{ display: "grid", gap: 8 }}>
              <p style={{ ...cardEyebrow, color: palette.muted, margin: 0 }}>Portfolio Spotlight</p>
              <h3 style={{ margin: 0, fontSize: 28, lineHeight: 1.02, color: palette.text }}>
                {newestProject ? newestProject.name : "Start a new workspace"}
              </h3>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: palette.muted }}>
                {newestProject
                  ? newestProject.summary
                  : "Create a project to coordinate boards, roadmaps, project lead accountability, and surrounding execution context from one place."}
              </p>
            </div>
            <div style={spotlightMetaRail}>
              <span style={{ ...summaryBadge, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                <FolderIcon style={icon12} /> {newestProject?.key || "PRJ"}
              </span>
              <span style={{ ...summaryBadge, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                <ClockIcon style={icon12} /> {newestProject?.createdLabel || "New workspace"}
              </span>
              <span style={{ ...statusBadge(palette, darkMode, newestProject?.needsAttention), maxWidth: "100%" }}>
                {newestProject?.statusLabel || "Ready to start"}
              </span>
            </div>
            <div style={spotlightActions}>
              {newestProject ? (
                <button
                  className="ui-btn-polish ui-focus-ring"
                  onClick={() => navigate(`/projects/${newestProject.id}`)}
                  style={ui.primaryButton}
                >
                  Open workspace <ArrowRightIcon style={icon14} />
                </button>
              ) : (
                <button className="ui-btn-polish ui-focus-ring" onClick={() => setShowCreate(true)} style={ui.primaryButton}>
                  <PlusIcon style={icon14} /> Create Project
                </button>
              )}
            </div>
          </article>

          <div style={portfolioSignalGrid}>
            <PortfolioSignalCard
              palette={palette}
              icon={FolderIcon}
              label="Ready workspaces"
              value={readyProjects.length}
              helper="Lead and brief are already in place."
            />
            <PortfolioSignalCard
              palette={palette}
              icon={UserGroupIcon}
              label="Owner gaps"
              value={ownerGaps}
              helper="Projects that still need a visible lead."
            />
            <PortfolioSignalCard
              palette={palette}
              icon={ClipboardDocumentListIcon}
              label="Brief gaps"
              value={briefGaps}
              helper="Workspaces that need more written context."
            />
            <PortfolioSignalCard
              palette={palette}
              icon={ExclamationTriangleIcon}
              label="Attention now"
              value={attentionProjects.length}
              helper="Best first scan for cleanup and handoff safety."
              highlight
            />
          </div>
        </section>
      ) : null}

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

              <label style={{ ...label, color: palette.muted }}>Project Lead</label>
              <select
                value={newProject.lead_id}
                onChange={(event) => setNewProject({ ...newProject, lead_id: event.target.value })}
                className="ui-focus-ring"
                style={ui.input}
              >
                <option value="">Assign the creator</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name || member.username || member.email}
                  </option>
                ))}
              </select>

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

      {showLeadPicker && leadPickerProject ? (
        <div style={modalOverlay}>
          <div style={{ ...modalCard, background: palette.card, border: `1px solid ${palette.border}` }}>
            <div style={modalHeader}>
              <div>
                <p style={{ ...modalEyebrow, color: palette.muted }}>Project Ownership</p>
                <h2 style={{ ...modalTitle, color: palette.text }}>Set Project Owner</h2>
                <p style={{ ...modalBody, color: palette.muted }}>
                  Give <strong style={{ color: palette.text }}>{leadPickerProject.name}</strong> a visible project lead so delivery, handoffs, and review accountability stay obvious.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveLead} style={formStack}>
              {leadError ? (
                <div style={{ ...errorBox, border: `1px solid ${palette.danger}`, background: palette.accentSoft, color: palette.danger }}>
                  {leadError}
                </div>
              ) : null}

              <label style={{ ...label, color: palette.muted }}>Project Lead</label>
              <select
                required
                value={leadDraft}
                onChange={(event) => setLeadDraft(event.target.value)}
                className="ui-focus-ring"
                style={ui.input}
              >
                <option value="">Select a project lead</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name || member.username || member.email}
                  </option>
                ))}
              </select>

              <div style={buttonRow}>
                <button
                  type="button"
                  onClick={() => {
                    setShowLeadPicker(false);
                    setLeadPickerProject(null);
                    setLeadDraft("");
                    setLeadError("");
                  }}
                  className="ui-btn-polish ui-focus-ring"
                  style={ui.secondaryButton}
                >
                  Cancel
                </button>
                <button type="submit" disabled={savingLead || !leadDraft} className="ui-btn-polish ui-focus-ring" style={ui.primaryButton}>
                  {savingLead ? "Saving..." : "Save project lead"}
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
        <div style={{ display: "grid", gap: 18 }}>
          {attentionProjects.length ? (
            <PortfolioSection
              palette={palette}
              title="Needs shaping"
              description="These workspaces are missing a project lead, project context, or both."
              projects={attentionProjects}
              navigate={navigate}
              darkMode={darkMode}
              onOpenLeadPicker={openLeadPicker}
            />
          ) : null}

          <PortfolioSection
            palette={palette}
            title={attentionProjects.length ? "Project atlas" : "All workspaces"}
            description={
              attentionProjects.length
                ? "The rest of the portfolio is structured enough to use as the front door into active delivery."
                : "Each project acts as the front door into roadmap, management, and surrounding execution context."
            }
            projects={attentionProjects.length ? readyProjects : portfolioProjects}
            navigate={navigate}
            darkMode={darkMode}
            onOpenLeadPicker={openLeadPicker}
          />
        </div>
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

function PortfolioSignalCard({ palette, icon: Icon, label, value, helper, highlight = false }) {
  return (
    <article
      className="ui-card-lift ui-smooth"
      style={{
        ...signalCard,
        border: `1px solid ${highlight ? palette.accent : palette.border}`,
        background: highlight ? palette.accentSoft : palette.card,
      }}
    >
      <div style={signalCardTop}>
        <span style={{ ...signalIconWrap, background: highlight ? palette.accent : palette.cardAlt, color: highlight ? palette.buttonText : palette.text }}>
          <Icon style={icon14} />
        </span>
        <p style={{ ...signalLabel, color: palette.muted }}>{label}</p>
      </div>
      <p style={{ ...signalValue, color: palette.text }}>{value}</p>
      <p style={{ ...signalHelper, color: palette.muted }}>{helper}</p>
    </article>
  );
}

function PortfolioSection({ palette, title, description, projects, navigate, darkMode, onOpenLeadPicker }) {
  if (!projects.length) {
    return null;
  }

  return (
    <section style={{ display: "grid", gap: 12 }}>
      <div style={sectionIntro}>
        <div>
          <p style={{ ...toolbarEyebrow, color: palette.muted, margin: 0 }}>Project Section</p>
          <h2 style={{ ...sectionTitle, color: palette.text }}>{title}</h2>
        </div>
        <p style={{ ...sectionCopy, color: palette.muted }}>{description}</p>
      </div>

      <div style={projectGrid}>
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
              <div style={{ minWidth: 0, display: "grid", gap: 8 }}>
                <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" }}>
                  <p style={{ ...cardEyebrow, color: palette.muted, margin: 0 }}>Delivery Workspace</p>
                  <span style={statusBadge(palette, darkMode, project.needsAttention)}>{project.statusLabel}</span>
                </div>
                <div>
                  <h3 style={{ ...cardTitle, color: palette.text }}>{project.name || "Untitled project"}</h3>
                  <p style={{ ...cardDescription, color: palette.muted }}>{project.summary}</p>
                </div>
              </div>
            </div>

            <div style={projectSummaryGrid}>
              <div style={{ ...summaryTile, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
                <p style={{ ...summaryLabel, color: palette.muted }}>Lead</p>
                <p style={{ ...summaryValue, color: palette.text }}>{project.lead_name || "Assign lead"}</p>
              </div>
              <div style={{ ...summaryTile, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
                <p style={{ ...summaryLabel, color: palette.muted }}>Brief</p>
                <p style={{ ...summaryValue, color: palette.text }}>{project.hasBrief ? "In place" : "Needs context"}</p>
              </div>
              <div style={{ ...summaryTile, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
                <p style={{ ...summaryLabel, color: palette.muted }}>Created</p>
                <p style={{ ...summaryValue, color: palette.text }}>{project.createdLabel}</p>
              </div>
            </div>

            <div style={projectChipRail}>
              <span style={{ ...chip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                <UserGroupIcon style={icon12} /> {project.lead_name || "No lead assigned"}
              </span>
              <span style={{ ...chip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                <ClipboardDocumentListIcon style={icon12} /> {project.hasBrief ? "Brief in place" : "Needs brief"}
              </span>
            </div>

            <div style={{ ...projectActions, borderTop: `1px solid ${palette.border}` }}>
              {!project.hasLead ? (
                <button
                  className="ui-btn-polish ui-focus-ring"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenLeadPicker?.(project);
                  }}
                  style={miniActionButton(palette)}
                >
                  Set lead
                </button>
              ) : null}
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
      </div>
    </section>
  );
}

function statusBadge(palette, darkMode, needsAttention) {
  return {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 999,
    padding: "7px 11px",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    border: `1px solid ${needsAttention ? palette.warn : palette.accent}`,
    background: needsAttention
      ? darkMode
        ? "rgba(245, 158, 11, 0.16)"
        : "rgba(245, 158, 11, 0.1)"
      : palette.accentSoft,
    color: needsAttention ? palette.warn : palette.link,
  };
}

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
  minHeight: 310,
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
  minHeight: 72,
  display: "-webkit-box",
  WebkitBoxOrient: "vertical",
  WebkitLineClamp: 4,
  overflow: "hidden",
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

const portfolioOverviewGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))",
  gap: 14,
};

const portfolioSpotlight = {
  borderRadius: 28,
  padding: 22,
  display: "grid",
  gap: 16,
  boxShadow: "var(--ui-shadow-sm)",
};

const spotlightMetaRail = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const summaryBadge = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  borderRadius: 999,
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 700,
};

const spotlightActions = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  alignItems: "center",
};

const portfolioSignalGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
  gap: 12,
};

const signalCard = {
  borderRadius: 22,
  padding: 16,
  display: "grid",
  gap: 10,
  boxShadow: "var(--ui-shadow-xs)",
};

const signalCardTop = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const signalIconWrap = {
  width: 34,
  height: 34,
  borderRadius: 12,
  display: "grid",
  placeItems: "center",
};

const signalLabel = {
  margin: 0,
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

const signalValue = {
  margin: 0,
  fontSize: 28,
  lineHeight: 1,
  fontWeight: 800,
};

const signalHelper = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.55,
};

const sectionIntro = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "end",
  flexWrap: "wrap",
};

const sectionTitle = {
  margin: "4px 0 0",
  fontSize: 26,
  lineHeight: 1.03,
};

const sectionCopy = {
  margin: 0,
  fontSize: 13,
  lineHeight: 1.65,
  maxWidth: 620,
};

const projectGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))",
  gap: 14,
};

const projectSummaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))",
  gap: 8,
};

const summaryTile = {
  borderRadius: 18,
  padding: "10px 12px",
  display: "grid",
  gap: 4,
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
  fontSize: 13,
  fontWeight: 700,
  lineHeight: 1.4,
};

const icon14 = { width: 14, height: 14 };
const icon12 = { width: 12, height: 12 };
