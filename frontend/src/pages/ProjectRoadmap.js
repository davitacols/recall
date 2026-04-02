import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
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

function ProjectRoadmap() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const response = await api.get(`/api/agile/projects/${projectId}/`);
      setProject(response.data);
    } catch (error) {
      console.error("Failed to fetch project:", error);
      setProject(null);
    } finally {
      setLoading(false);
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
            eyebrow="Roadmap"
            title="Project not found"
            description="The roadmap could not be loaded for this workspace."
          >
            <WorkspaceEmptyState
              palette={palette}
              darkMode={darkMode}
              variant="execution"
              title="No roadmap to show"
              description="Return to the project portfolio and open a different workspace."
            />
          </WorkspacePanel>
        </div>
      </div>
    );
  }

  const sprints = Array.isArray(project.sprints) ? project.sprints : [];
  const activeCount = sprints.filter((sprint) => String(sprint.status || "").toLowerCase() === "active").length;
  const completedCount = sprints.filter((sprint) => String(sprint.status || "").toLowerCase() === "completed").length;
  const totalIssues = sprints.reduce((sum, sprint) => sum + Number(sprint.issue_count || 0), 0);
  const totalCompleted = sprints.reduce((sum, sprint) => sum + Number(sprint.completed_count || 0), 0);
  const roadmapPulse =
    sprints.length === 0
      ? "No sprint plan has been staged yet, so the roadmap is still waiting for its first delivery horizon."
      : activeCount > 0
        ? `${activeCount} sprint${activeCount === 1 ? "" : "s"} are active right now. Keep the timeline tight so the next handoff stays obvious.`
        : "The roadmap is planned but there is no active sprint at the moment. This is a good time to sequence the next delivery window.";

  const roadmapAside = (
    <div
      style={{
        ...asideCard,
        border: `1px solid ${palette.border}`,
        background: darkMode
          ? "linear-gradient(150deg, rgba(32,27,23,0.92), rgba(22,18,15,0.84))"
          : "linear-gradient(150deg, rgba(255,252,248,0.98), rgba(244,237,226,0.9))",
      }}
    >
      <p style={{ ...asideEyebrow, color: palette.muted }}>Roadmap Pulse</p>
      <h3 style={{ ...asideTitle, color: palette.text }}>
        {sprints.length === 0 ? "Start the first sprint horizon" : `${sprints.length} sprint windows mapped`}
      </h3>
      <p style={{ ...asideCopy, color: palette.muted }}>{roadmapPulse}</p>
      <div style={asideMetricGrid}>
        <div style={{ ...asideMetric, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
          <p style={{ ...asideMetricLabel, color: palette.muted }}>Issue load</p>
          <p style={{ ...asideMetricValue, color: palette.text }}>{totalIssues}</p>
        </div>
        <div style={{ ...asideMetric, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
          <p style={{ ...asideMetricLabel, color: palette.muted }}>Completed</p>
          <p style={{ ...asideMetricValue, color: palette.text }}>{totalCompleted}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={ui.container}>
        <button className="ui-btn-polish ui-focus-ring" onClick={() => navigate(-1)} style={{ ...backButton, color: palette.muted }}>
          <ArrowLeftIcon style={icon14} /> Back
        </button>

        <WorkspaceHero
          palette={palette}
          darkMode={darkMode}
          variant="execution"
          eyebrow="Project Roadmap"
          title={project.name}
          description="See sprint sequence, delivery pressure, and completion trend as one roadmap instead of isolated sprint records."
          aside={roadmapAside}
          stats={[
            { label: "Sprints", value: sprints.length, helper: "Delivery windows on the roadmap." },
            { label: "Active", value: activeCount, helper: "Sprints currently in flight." },
            { label: "Completed", value: completedCount, helper: "Sprints already closed." },
            { label: "Issues", value: totalIssues, helper: "Total roadmap workload across all sprints." },
          ]}
          actions={
            <>
              <Link className="ui-btn-polish ui-focus-ring" to={`/projects/${projectId}`} style={{ ...ui.secondaryButton, textDecoration: "none" }}>
                Overview
              </Link>
              <Link className="ui-btn-polish ui-focus-ring" to={`/projects/${projectId}/manage`} style={{ ...ui.secondaryButton, textDecoration: "none" }}>
                Manage
              </Link>
            </>
          }
        />

        <WorkspaceToolbar palette={palette} darkMode={darkMode} variant="execution">
          <div style={toolbarLayout}>
            <div style={toolbarIntro}>
              <p style={{ ...toolbarEyebrow, color: palette.muted }}>Planning Horizon</p>
              <h2 style={{ ...toolbarTitle, color: palette.text }}>A useful roadmap shows sequence, load, and what each sprint is meant to deliver</h2>
              <p style={{ ...toolbarCopy, color: palette.muted }}>
                Use this view to keep the sprint timeline readable for planning reviews, release conversations, and project check-ins.
              </p>
            </div>
            <div style={toolbarChipRail}>
              <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                {project.key || "PRJ"} timeline
              </span>
              <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                {activeCount} active
              </span>
              <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                {completedCount} completed
              </span>
            </div>
          </div>
        </WorkspaceToolbar>

        <div style={contentGrid}>
          <WorkspacePanel
            palette={palette}
            darkMode={darkMode}
            variant="execution"
            eyebrow="Timeline"
            title="Sprint sequence"
            description="Each sprint reads like a checkpoint in the delivery story, with scope and completion signal visible."
          >
            {sprints.length === 0 ? (
              <WorkspaceEmptyState
                palette={palette}
                darkMode={darkMode}
                variant="execution"
                title="No sprint roadmap yet"
                description="Create the first sprint in project management to start plotting delivery over time."
                action={
                  <Link className="ui-btn-polish ui-focus-ring" to={`/projects/${projectId}/manage`} style={{ ...ui.primaryButton, textDecoration: "none" }}>
                    Open management
                  </Link>
                }
              />
            ) : (
              <div style={stack}>
                {sprints.map((sprint, index) => {
                  const completion =
                    Number(sprint.issue_count || 0) > 0
                      ? Math.round((Number(sprint.completed_count || 0) / Number(sprint.issue_count || 0)) * 100)
                      : 0;

                  return (
                    <button
                      key={sprint.id}
                      className="ui-card-lift ui-smooth"
                      onClick={() => navigate(`/sprints/${sprint.id}`)}
                      style={{
                        ...roadmapCard,
                        border: `1px solid ${palette.border}`,
                        background: palette.cardAlt,
                      }}
                    >
                      <div style={roadmapRail}>
                        <div style={{ ...roadmapIndex, background: palette.ctaGradient, color: palette.buttonText }}>
                          {index + 1}
                        </div>
                        <div style={{ minWidth: 0, display: "grid", gap: 8 }}>
                          <div style={roadmapHead}>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ ...roadmapTitle, color: palette.text }}>{sprint.name}</p>
                              <p style={{ ...roadmapMeta, color: palette.muted }}>
                                {sprint.start_date} - {sprint.end_date}
                              </p>
                            </div>
                            <span style={{ ...statusBadge, border: `1px solid ${palette.border}`, background: palette.card, color: palette.text }}>
                              {String(sprint.status || "planned").replaceAll("_", " ")}
                            </span>
                          </div>
                          <p style={{ ...roadmapCopy, color: palette.muted }}>
                            {createPlainTextPreview(sprint.goal, "No sprint goal has been added yet.", 220)}
                          </p>
                          <div style={summaryRail}>
                            <span style={{ ...summaryChip, border: `1px solid ${palette.border}`, background: palette.card, color: palette.text }}>
                              {sprint.issue_count || 0} issues
                            </span>
                            <span style={{ ...summaryChip, border: `1px solid ${palette.border}`, background: palette.card, color: palette.text }}>
                              {sprint.completed_count || 0} completed
                            </span>
                            <span style={{ ...summaryChip, border: `1px solid ${palette.border}`, background: palette.card, color: palette.text }}>
                              {completion}% done
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </WorkspacePanel>

          <WorkspacePanel
            palette={palette}
            darkMode={darkMode}
            variant="execution"
            eyebrow="Signals"
            title="Roadmap readout"
            description="A compact summary for planning calls and delivery reviews."
          >
            <div style={signalGrid}>
              <div style={{ ...signalCard, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
                <p style={{ ...signalLabel, color: palette.muted }}>Project key</p>
                <p style={{ ...signalValue, color: palette.text }}>{project.key || "PRJ"}</p>
              </div>
              <div style={{ ...signalCard, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
                <p style={{ ...signalLabel, color: palette.muted }}>Roadmap load</p>
                <p style={{ ...signalValue, color: palette.text }}>{totalIssues}</p>
              </div>
              <div style={{ ...signalCard, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
                <p style={{ ...signalLabel, color: palette.muted }}>Closed work</p>
                <p style={{ ...signalValue, color: palette.text }}>{totalCompleted}</p>
              </div>
            </div>
          </WorkspacePanel>
        </div>
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
  gridTemplateColumns: "minmax(0, 1.4fr) minmax(280px, 0.85fr)",
  gap: 14,
  marginTop: 14,
};

const stack = {
  display: "grid",
  gap: 12,
};

const roadmapCard = {
  borderRadius: 24,
  padding: 18,
  display: "grid",
  gap: 12,
  cursor: "pointer",
  textAlign: "left",
};

const roadmapRail = {
  display: "grid",
  gridTemplateColumns: "56px minmax(0, 1fr)",
  gap: 14,
  alignItems: "start",
};

const roadmapIndex = {
  width: 56,
  height: 56,
  borderRadius: 18,
  display: "grid",
  placeItems: "center",
  fontSize: 16,
  fontWeight: 800,
  boxShadow: "var(--ui-shadow-sm)",
};

const roadmapHead = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const roadmapTitle = {
  margin: 0,
  fontSize: 18,
  fontWeight: 800,
  letterSpacing: "-0.03em",
};

const roadmapMeta = {
  margin: "4px 0 0",
  fontSize: 12,
};

const roadmapCopy = {
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

const summaryRail = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const summaryChip = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 700,
};

const signalGrid = {
  display: "grid",
  gap: 10,
};

const signalCard = {
  borderRadius: 20,
  padding: "14px 16px",
  display: "grid",
  gap: 4,
};

const signalLabel = {
  margin: 0,
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

const signalValue = {
  margin: 0,
  fontSize: 18,
  fontWeight: 800,
  lineHeight: 1.1,
};

const icon14 = { width: 14, height: 14 };

export default ProjectRoadmap;
