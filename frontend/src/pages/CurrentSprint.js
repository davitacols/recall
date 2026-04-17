import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ExclamationTriangleIcon, PlusIcon, SparklesIcon } from "@heroicons/react/24/outline";
import api from "../services/api";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";
import { WorkspaceHero, WorkspaceToolbar } from "../components/WorkspaceChrome";
import { buildAskRecallPath } from "../utils/askRecall";

function CurrentSprint() {
  const { darkMode } = useTheme();
  const [sprint, setSprint] = useState(null);
  const [blockers, setBlockers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBlockerModal, setShowBlockerModal] = useState(false);

  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const fetchSprint = useCallback(async () => {
    try {
      const sprintRes = await api.get("/api/agile/current-sprint/");
      const current = sprintRes.data;
      setSprint(current);
      if (current?.id) {
        const blockersRes = await api.get(`/api/agile/blockers/?sprint_id=${current.id}`).catch(() => ({ data: [] }));
        setBlockers(blockersRes.data || []);
      } else {
        setBlockers([]);
      }
    } catch (error) {
      console.error("Failed to fetch sprint:", error);
      setSprint(null);
      setBlockers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSprint();
    const interval = setInterval(fetchSprint, 5000);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        fetchSprint();
      }
    };
    window.addEventListener("focus", fetchSprint);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", fetchSprint);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchSprint]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div style={spinner} />
      </div>
    );
  }

  if (!sprint) {
    return (
      <div style={{ minHeight: "100vh" }}>
        <div style={ui.container}>
          <WorkspaceHero
            palette={palette}
            darkMode={darkMode}
            variant="execution"
            eyebrow="Sprint Center"
            title="No active sprint"
            description="Start a sprint in a project to track execution, blockers, delivery rhythm, and outcome velocity from one workspace."
            stats={[
              { label: "Blockers", value: 0, helper: "No active sprint context yet." },
              { label: "Completion", value: "0%", helper: "Sprint completion appears once a sprint is active." },
            ]}
            actions={<Link to="/projects" className="ui-btn-polish ui-focus-ring" style={{ ...ui.primaryButton, textDecoration: "none" }}>Go to Projects</Link>}
          />
        </div>
      </div>
    );
  }

  const completion = sprint.issue_count > 0 ? Math.round(((sprint.completed || 0) / sprint.issue_count) * 100) : 0;
  const blockerCount = blockers.length;
  const sprintPulse =
    blockerCount > 0
      ? `${blockerCount} active blocker${blockerCount === 1 ? "" : "s"} need attention before flow feels healthy.`
      : completion >= 70
        ? "Sprint is moving well and the blocker lane is clear."
        : "Delivery is active and the sprint still has room to tighten execution.";
  const sprintAskRecallQuestion = `What is putting the ${sprint.name} sprint at risk, and what should we fix next?`;

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={ui.container}>
        <WorkspaceHero
          palette={palette}
          darkMode={darkMode}
          variant="execution"
          eyebrow="Active Sprint"
          title={sprint.name}
          description={sprint.goal || "Keep the current sprint moving, surface blockers early, and track completion from one calmer center."}
          stats={[
            { label: "Completion", value: `${completion}%`, helper: "Percent of sprint work completed." },
            { label: "Issues", value: sprint.issue_count || 0, helper: "Tracked items in this sprint." },
            { label: "In progress", value: sprint.in_progress || 0, helper: "Work currently moving." },
            { label: "Blockers", value: blockerCount, helper: "Known blockers attached to the sprint." },
          ]}
          aside={
            <div
              style={{
                ...spotlightCard,
                border: `1px solid ${palette.border}`,
                background: darkMode
                  ? "linear-gradient(145deg, rgba(30,24,20,0.96), rgba(22,18,15,0.88))"
                  : "linear-gradient(145deg, rgba(255,252,248,0.98), rgba(245,239,229,0.9))",
              }}
            >
              <p style={{ ...spotlightEyebrow, color: palette.muted }}>Sprint window</p>
              <h3 style={{ margin: 0, fontSize: 22, lineHeight: 1.05, color: palette.text }}>
                {sprint.start_date} - {sprint.end_date}
              </h3>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: palette.muted }}>{sprintPulse}</p>
            </div>
          }
          actions={
            <>
              <Link to={`/projects/${sprint.project_id}`} className="ui-btn-polish ui-focus-ring" style={{ ...ui.secondaryButton, textDecoration: "none" }}>Project</Link>
              <Link to={buildAskRecallPath(sprintAskRecallQuestion)} className="ui-btn-polish ui-focus-ring" style={{ ...ui.secondaryButton, textDecoration: "none" }}>
                <SparklesIcon style={{ width: 14, height: 14 }} /> Ask Recall
              </Link>
              <Link to="/sprint-management" className="ui-btn-polish ui-focus-ring" style={{ ...ui.secondaryButton, textDecoration: "none" }}>Manage Sprints</Link>
            </>
          }
        />

        <WorkspaceToolbar palette={palette} darkMode={darkMode} variant="execution">
          <div style={toolbarLayout}>
            <div style={toolbarIntro}>
              <p style={{ ...toolbarEyebrow, color: palette.muted }}>Delivery pulse</p>
              <h2 style={{ ...toolbarTitle, color: palette.text }}>See progress and friction before you drop into blockers</h2>
              <p style={{ ...toolbarCopy, color: palette.muted }}>{sprintPulse}</p>
            </div>
            <div style={toolbarChipRail}>
              <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                {sprint.todo || 0} to do
              </span>
              <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                {sprint.completed || 0} completed
              </span>
              <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                {blockerCount} blockers
              </span>
            </div>
          </div>
        </WorkspaceToolbar>

        <section style={statsGrid}>
          <Metric label="Completion" value={`${completion}%`} />
          <Metric label="Issues" value={sprint.issue_count || 0} />
          <Metric label="Completed" value={sprint.completed || 0} />
          <Metric label="In Progress" value={sprint.in_progress || 0} />
          <Metric label="To Do" value={sprint.todo || 0} />
        </section>

        <section style={{ ...progressCard, background: palette.card, border: `1px solid ${palette.border}` }}>
          <div style={progressTrack}>
            <div style={{ ...progressFill, width: `${completion}%` }} />
          </div>
          <p style={{ margin: "8px 0 0", color: palette.muted, fontSize: 12 }}>Sprint completion</p>
        </section>

        <section style={{ ...listCard, background: palette.card, border: `1px solid ${palette.border}` }}>
          <div style={sectionHeader}>
            <h2 style={{ ...h2, color: palette.text, margin: 0 }}>Active Blockers</h2>
            <button onClick={() => setShowBlockerModal(true)} style={primaryButtonAlt}>
              <PlusIcon style={icon14} /> Report Blocker
            </button>
          </div>

          {blockers.length === 0 ? (
            <div style={emptyRow}>No active blockers.</div>
          ) : (
            <div style={list}>
              {blockers.map((blocker) => (
                <article key={blocker.id} style={blockerCard}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <ExclamationTriangleIcon style={{ ...icon16, color: palette.danger }} />
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{blocker.title}</p>
                  </div>
                  <p style={{ margin: "6px 0 0", fontSize: 12, color: palette.muted }}>{blocker.description || "No description"}</p>
                </article>
              ))}
            </div>
          )}
        </section>

        {showBlockerModal && (
          <BlockerModal
            sprintId={sprint.id}
            onClose={() => setShowBlockerModal(false)}
            onSubmit={() => {
              setShowBlockerModal(false);
              fetchSprint();
            }}
            palette={palette}
          />
        )}
      </div>
    </div>
  );
}

function BlockerModal({ sprintId, onClose, onSubmit, palette }) {
  const ui = useMemo(() => getProjectUi(palette), [palette]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("technical");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/api/agile/blockers/", { sprint_id: sprintId, title, description, type });
      onSubmit();
    } catch (error) {
      console.error("Failed to create blocker:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={overlay}>
      <div style={{ ...modalCard, background: palette.card, border: `1px solid ${palette.border}` }}>
        <h3 style={{ margin: 0, fontSize: 20, color: palette.text }}>Report Blocker</h3>
        <form onSubmit={handleSubmit} style={formStack}>
          <input required placeholder="Title" value={title} onChange={(event) => setTitle(event.target.value)} style={ui.input} />
          <select value={type} onChange={(event) => setType(event.target.value)} style={ui.input}>
            <option value="technical">Technical</option>
            <option value="dependency">Dependency</option>
            <option value="decision">Decision Needed</option>
            <option value="resource">Resource</option>
            <option value="external">External</option>
          </select>
          <textarea rows={4} placeholder="Description" value={description} onChange={(event) => setDescription(event.target.value)} style={ui.input} />
          <div style={modalButtons}>
            <button type="button" onClick={onClose} style={ui.secondaryButton}>Cancel</button>
            <button type="submit" disabled={submitting} style={ui.primaryButton}>{submitting ? "Reporting..." : "Report"}</button>
          </div>
        </form>
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

const spinner = { width: 30, height: 30, border: "2px solid var(--ui-border)", borderTopColor: "var(--ui-accent)", borderRadius: "50%", animation: "spin 1s linear infinite" };
const h2 = { fontSize: 19 };
const statsGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 8, marginBottom: 12 };
const metricCard = { borderRadius: 0, padding: 12, border: "1px solid var(--ui-border)", background: "var(--ui-panel-alt)" };
const metricValue = { margin: 0, fontSize: 26, fontWeight: 800, color: "var(--ui-text)" };
const metricLabel = { margin: "4px 0 0", fontSize: 12, color: "var(--ui-muted)" };
const progressCard = { borderRadius: 0, padding: 12, marginBottom: 12 };
const progressTrack = { width: "100%", height: 10, borderRadius: 999, background: "var(--ui-border)", overflow: "hidden" };
const progressFill = { height: "100%", background: "linear-gradient(90deg,var(--ui-good),var(--ui-info))" };
const listCard = { borderRadius: 0, padding: 12 };
const sectionHeader = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 };
const list = { display: "grid", gap: 8 };
const blockerCard = { borderRadius: 0, border: "1px solid var(--ui-border)", background: "var(--ui-panel-alt)", padding: 10 };
const emptyRow = { borderRadius: 0, border: "1px dashed var(--ui-border)", padding: "14px 10px", fontSize: 13, color: "var(--ui-muted)" };
const primaryButtonAlt = { border: "none", borderRadius: 0, padding: "9px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer", color: "var(--ui-text)", background: "linear-gradient(135deg,#9bd9ff,#6ab8ec)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 };
const overlay = { position: "fixed", inset: 0, background: "rgba(5,12,20,0.62)", display: "grid", placeItems: "center", zIndex: 120, padding: 16 };
const modalCard = { width: "min(560px,100%)", borderRadius: 0, padding: 16 };
const formStack = { marginTop: 12, display: "grid", gap: 8 };
const modalButtons = { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 };
const icon16 = { width: 16, height: 16 };
const icon14 = { width: 14, height: 14 };
const spotlightCard = { minWidth: 240, borderRadius: 24, padding: 16, display: "grid", gap: 10 };
const spotlightEyebrow = { margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" };
const toolbarLayout = { display: "grid", gap: 14 };
const toolbarIntro = { display: "grid", gap: 4 };
const toolbarEyebrow = { margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" };
const toolbarTitle = { margin: 0, fontSize: 24, lineHeight: 1.04 };
const toolbarCopy = { margin: 0, fontSize: 13, lineHeight: 1.65, maxWidth: 760 };
const toolbarChipRail = { display: "flex", gap: 8, flexWrap: "wrap" };
const toolbarChip = { display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "8px 12px", fontSize: 12, fontWeight: 700 };

export default CurrentSprint;


