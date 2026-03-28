import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { WorkspaceEmptyState, WorkspaceHero, WorkspacePanel, WorkspaceToolbar } from "../components/WorkspaceChrome";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";
import { createPlainTextPreview } from "../utils/textPreview";

function SprintHistory() {
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const [sprints, setSprints] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [projectsRes, sprintsRes] = await Promise.all([
        api.get("/api/agile/projects/"),
        api.get("/api/agile/sprint-history/"),
      ]);
      setProjects(projectsRes.data || []);
      setSprints(sprintsRes.data.results || sprintsRes.data || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSprints = selectedProject ? sprints.filter((sprint) => sprint.project_id === selectedProject) : sprints;
  const totalSprints = sprints.length;
  const totalCompleted = sprints.reduce((sum, sprint) => sum + (sprint.completed || 0), 0);
  const totalBlocked = sprints.reduce((sum, sprint) => sum + (sprint.blocked || 0), 0);
  const totalDecisions = sprints.reduce((sum, sprint) => sum + (sprint.decisions || 0), 0);
  const historyPulse =
    filteredSprints.length === 0
      ? "There are no sprint cycles in the current filter yet."
      : totalBlocked > 0
        ? `${totalBlocked} blocked items were recorded across sprint history, making this a useful review surface before the next cycle.`
        : "Sprint history is available as a clean execution memory lane for planning the next cycle.";

  if (loading) {
    return (
      <div style={{ minHeight: "100vh" }}>
        <div style={ui.container}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 10 }}>
            {[1, 2, 3].map((item) => (
              <div key={item} style={{ borderRadius: 0, height: 200, background: palette.card, border: `1px solid ${palette.border}`, opacity: 0.7 }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={ui.container}>
        <WorkspaceHero
          palette={palette}
          darkMode={darkMode}
          eyebrow="Sprint History"
          title="Review delivery cycles as institutional execution memory"
          description="Use sprint history to inspect what completed, what blocked, and how delivery patterns should shape the next planning cycle."
          stats={[
            { label: "Sprints", value: totalSprints, helper: "Sprint cycles captured in history." },
            { label: "Completed", value: totalCompleted, helper: "Completed work recorded across sprint history." },
            { label: "Blocked", value: totalBlocked, helper: "Blocked work carried by those cycles." },
            { label: "Decisions", value: totalDecisions, helper: "Decision events tied to prior sprints." },
          ]}
          aside={
            <div
              style={{
                ...spotlightCard,
                border: `1px solid ${palette.border}`,
                background: darkMode
                  ? "linear-gradient(145deg, rgba(29,24,20,0.96), rgba(20,17,14,0.88))"
                  : "linear-gradient(145deg, rgba(255,252,248,0.98), rgba(245,239,229,0.9))",
              }}
            >
              <p style={{ ...spotlightEyebrow, color: palette.muted }}>History pulse</p>
              <h3 style={{ margin: 0, fontSize: 22, lineHeight: 1.05, color: palette.text }}>
                {filteredSprints.length === 0 ? "No cycles in view" : `${filteredSprints.length} cycles visible`}
              </h3>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: palette.muted }}>{historyPulse}</p>
            </div>
          }
          actions={
            <Link to="/projects" className="ui-btn-polish ui-focus-ring" style={{ ...ui.primaryButton, textDecoration: "none" }}>
              View All Projects
            </Link>
          }
        />

        <WorkspaceToolbar palette={palette}>
          <div style={toolbarLayout}>
            <div style={toolbarIntro}>
              <p style={{ ...toolbarEyebrow, color: palette.muted }}>Review guide</p>
              <h2 style={{ ...toolbarTitle, color: palette.text }}>Filter prior cycles, compare outcomes, and reopen the sprint that holds the lesson you need</h2>
              <p style={{ ...toolbarCopy, color: palette.muted }}>
                Sprint history works best as the review lane between execution and the next planning window.
              </p>
            </div>
            <div style={toolbarControls}>
              {projects.length > 0 ? (
                <select
                  value={selectedProject || ""}
                  onChange={(event) => setSelectedProject(event.target.value ? parseInt(event.target.value, 10) : null)}
                  style={{ ...ui.input, maxWidth: 320 }}
                >
                  <option value="">All Projects</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              ) : null}
              <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                {selectedProject ? "Project filtered" : "All projects"}
              </span>
            </div>
          </div>
        </WorkspaceToolbar>

        <WorkspacePanel
          palette={palette}
          eyebrow="Cycle atlas"
          title="Prior sprint outcomes"
          description="Open a sprint to inspect its detail, flow, blockers, and linked execution context."
        >
          {filteredSprints.length === 0 ? (
            <WorkspaceEmptyState
              palette={palette}
              title="No completed sprints yet"
              description="Sprint history will begin to fill in as the team completes more execution cycles."
            />
          ) : (
            <section style={historyGrid}>
              {filteredSprints.map((sprint) => {
                const total = (sprint.completed || 0) + (sprint.blocked || 0);
                const completion = total > 0 ? Math.round(((sprint.completed || 0) / total) * 100) : 0;

                return (
                  <article
                    key={sprint.id}
                    className="ui-card-lift ui-smooth"
                    style={{ ...historyCard, border: `1px solid ${palette.border}`, background: palette.cardAlt }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                      <div style={{ minWidth: 0, display: "grid", gap: 6 }}>
                        <p style={{ ...historyTitle, color: palette.text }}>{sprint.name}</p>
                        <p style={{ ...historyMeta, color: palette.muted }}>
                          {sprint.project_name} | {sprint.start_date} - {sprint.end_date}
                        </p>
                      </div>
                      <Link to={`/sprints/${sprint.id}`} className="ui-btn-polish ui-focus-ring" style={{ ...ui.secondaryButton, textDecoration: "none" }}>
                        View Details
                      </Link>
                    </div>

                    <p style={{ ...historyPreview, color: palette.muted }}>
                      {createPlainTextPreview(sprint.goal || "", "No sprint goal recorded for this cycle.", 160)}
                    </p>

                    <div style={metricRail}>
                      <Metric label="Completed" value={sprint.completed || 0} color={palette.success} palette={palette} />
                      <Metric label="Blocked" value={sprint.blocked || 0} color={palette.danger} palette={palette} />
                      <Metric label="Decisions" value={sprint.decisions || 0} color={palette.info} palette={palette} />
                    </div>

                    <div style={{ marginTop: 4 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: palette.muted }}>Completion</span>
                        <span style={{ fontSize: 11, color: palette.text, fontWeight: 700 }}>{completion}%</span>
                      </div>
                      <div style={{ width: "100%", height: 8, borderRadius: 999, background: palette.progressTrack, overflow: "hidden" }}>
                        <div style={{ width: `${completion}%`, height: "100%", background: `linear-gradient(90deg,${palette.success},${palette.info})` }} />
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          )}
        </WorkspacePanel>
      </div>
    </div>
  );
}

function Metric({ label, value, color, palette }) {
  return (
    <article style={{ borderRadius: 18, border: `1px solid ${palette.border}`, background: palette.card, padding: 10 }}>
      <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color }}>{value}</p>
      <p style={{ margin: "4px 0 0", fontSize: 11, color: palette.muted }}>{label}</p>
    </article>
  );
}

const spotlightCard = { minWidth: 240, borderRadius: 24, padding: 16, display: "grid", gap: 10 };
const spotlightEyebrow = { margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" };
const toolbarLayout = { display: "grid", gap: 14 };
const toolbarIntro = { display: "grid", gap: 4 };
const toolbarEyebrow = { margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" };
const toolbarTitle = { margin: 0, fontSize: 24, lineHeight: 1.04 };
const toolbarCopy = { margin: 0, fontSize: 13, lineHeight: 1.65, maxWidth: 760 };
const toolbarControls = { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" };
const toolbarChip = { display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "8px 12px", fontSize: 12, fontWeight: 700 };
const historyGrid = { display: "grid", gap: 12 };
const historyCard = { borderRadius: 24, padding: 16, display: "grid", gap: 12 };
const historyTitle = { margin: 0, fontSize: 18, fontWeight: 700 };
const historyMeta = { margin: 0, fontSize: 12 };
const historyPreview = { margin: 0, fontSize: 13, lineHeight: 1.65 };
const metricRail = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 8 };

export default SprintHistory;
