import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarIcon, ExclamationTriangleIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";
import api from "../services/api";
import { WorkspaceEmptyState, WorkspaceHero, WorkspacePanel, WorkspaceToolbar } from "../components/WorkspaceChrome";
import { createPlainTextPreview } from "../utils/textPreview";

export default function SprintManagement() {
  const { darkMode } = useTheme();
  const navigate = useNavigate();

  const [sprints, setSprints] = useState([]);
  const [currentSprint, setCurrentSprint] = useState(null);
  const [blockers, setBlockers] = useState([]);
  const [defaultProjectId, setDefaultProjectId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newSprint, setNewSprint] = useState({ name: "", start_date: "", end_date: "", goal: "" });
  const [loading, setLoading] = useState(true);

  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  useEffect(() => {
    fetchSprints();
    fetchBlockers();
    fetchDefaultProject();
  }, []);

  const normalizeSprint = (sprint, source = "primary") => ({
    id: sprint.id,
    name: sprint.name || `Sprint ${sprint.id}`,
    goal: sprint.goal || "",
    start_date: sprint.start_date,
    end_date: sprint.end_date,
    status: sprint.status || (source === "current" ? "active" : "completed"),
    completed_count: sprint.completed_count ?? sprint.completed ?? 0,
    blocked_count: sprint.blocked_count ?? sprint.blocked ?? 0,
    decisions_made: sprint.decisions_made ?? 0,
    project_id: sprint.project_id ?? null,
  });

  const fetchDefaultProject = async () => {
    try {
      const response = await api.get("/api/agile/projects/");
      const projects = Array.isArray(response.data) ? response.data : [];
      if (projects.length > 0) {
        setDefaultProjectId(projects[0].id);
      }
    } catch (error) {
      // Best-effort only; creation still attempts legacy endpoint fallback.
    }
  };

  const fetchSprints = async () => {
    try {
      const response = await api.get("/api/agile/sprints/");
      const sprintList = (Array.isArray(response.data) ? response.data : []).map((s) => normalizeSprint(s));
      setSprints(sprintList);
      setCurrentSprint(sprintList.find((sprint) => sprint.status === "active") || null);
      if (!defaultProjectId) {
        const projectFromSprint = sprintList.find((s) => s.project_id)?.project_id;
        if (projectFromSprint) setDefaultProjectId(projectFromSprint);
      }
    } catch (error) {
      if (error?.response?.status === 404) {
        try {
          const [currentResult, historyResult] = await Promise.allSettled([
            api.get("/api/agile/current-sprint/"),
            api.get("/api/agile/sprint-history/"),
          ]);

          const current =
            currentResult.status === "fulfilled" && currentResult.value?.data
              ? normalizeSprint(currentResult.value.data, "current")
              : null;
          const history =
            historyResult.status === "fulfilled" && Array.isArray(historyResult.value?.data)
              ? historyResult.value.data.map((s) => normalizeSprint(s, "history"))
              : [];

          const mergedMap = new Map();
          if (current?.id) mergedMap.set(current.id, current);
          history.forEach((s) => mergedMap.set(s.id, s));
          const merged = Array.from(mergedMap.values()).sort(
            (a, b) => new Date(b.end_date || b.start_date || 0) - new Date(a.end_date || a.start_date || 0)
          );

          setSprints(merged);
          setCurrentSprint(current || merged.find((s) => s.status === "active") || null);
          if (!defaultProjectId) {
            const projectFromSprint = merged.find((s) => s.project_id)?.project_id;
            if (projectFromSprint) setDefaultProjectId(projectFromSprint);
          }
        } catch (fallbackError) {
          console.error("Failed to fetch sprints:", fallbackError);
        }
      } else {
        console.error("Failed to fetch sprints:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchBlockers = async () => {
    try {
      const response = await api.get("/api/agile/blockers/");
      setBlockers((response.data || []).filter((blocker) => blocker.status === "active"));
    } catch (error) {
      console.error("Failed to fetch blockers:", error);
    }
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    try {
      if (defaultProjectId) {
        await api.post(`/api/agile/projects/${defaultProjectId}/sprints/`, newSprint);
      } else {
        await api.post("/api/agile/sprints/", newSprint);
      }
      setShowCreate(false);
      setNewSprint({ name: "", start_date: "", end_date: "", goal: "" });
      fetchSprints();
    } catch (error) {
      if (error?.response?.status === 404 && defaultProjectId) {
        try {
          await api.post("/api/agile/sprints/", newSprint);
          setShowCreate(false);
          setNewSprint({ name: "", start_date: "", end_date: "", goal: "" });
          fetchSprints();
          return;
        } catch (fallbackError) {
          console.error("Failed to create sprint:", fallbackError);
        }
      } else {
        console.error("Failed to create sprint:", error);
      }
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div style={spinner} />
      </div>
    );
  }

  const totalSprints = sprints.length;
  const activeSprintCount = sprints.filter((sprint) => sprint.status === "active").length;
  const completedSprintCount = sprints.filter((sprint) => sprint.status === "completed").length;
  const upcomingSprintCount = sprints.filter((sprint) => sprint.status === "planned").length;
  const totalBlocked = sprints.reduce((sum, sprint) => sum + (sprint.blocked_count || 0), 0);
  const totalCompleted = sprints.reduce((sum, sprint) => sum + (sprint.completed_count || 0), 0);
  const totalDecisions = sprints.reduce((sum, sprint) => sum + (sprint.decisions_made || 0), 0);
  const sprintPulse =
    currentSprint
      ? currentSprint.blocked_count > 0
        ? `${currentSprint.blocked_count} blocker${currentSprint.blocked_count === 1 ? "" : "s"} are shaping this sprint's execution posture.`
        : "The active sprint is moving without open blockers at the moment."
      : totalSprints === 0
        ? "No sprint cycles have been started yet."
        : "There is no active sprint right now, but prior sprint history is available for review.";

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={ui.container}>
        <WorkspaceHero
          palette={palette}
          darkMode={darkMode}
          variant="execution"
          eyebrow="Sprint Operations"
          title="Manage sprint cycles with clearer delivery context"
          description="Plan new sprint windows, track the active cycle, and review execution health across every sprint the team has run."
          stats={[
            { label: "Total sprints", value: totalSprints, helper: "All sprint cycles tracked in this workspace." },
            { label: "Active", value: activeSprintCount, helper: "Sprint cycles currently in motion." },
            { label: "Completed work", value: totalCompleted, helper: "Issues marked complete across sprint history." },
            { label: "Decisions", value: totalDecisions, helper: "Decision events recorded across sprint cycles." },
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
              <p style={{ ...spotlightEyebrow, color: palette.muted }}>Sprint pulse</p>
              <h3 style={{ margin: 0, fontSize: 22, lineHeight: 1.05, color: palette.text }}>
                {currentSprint ? currentSprint.name : "No live sprint"}
              </h3>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: palette.muted }}>{sprintPulse}</p>
            </div>
          }
          actions={
            <button onClick={() => setShowCreate(true)} className="ui-btn-polish ui-focus-ring" style={ui.primaryButton}>
              <PlusIcon style={icon14} /> New Sprint
            </button>
          }
        />

        <WorkspaceToolbar palette={palette} darkMode={darkMode} variant="execution">
          <div style={toolbarLayout}>
            <div style={toolbarIntro}>
              <p style={{ ...toolbarEyebrow, color: palette.muted }}>Operations guide</p>
              <h2 style={{ ...toolbarTitle, color: palette.text }}>Keep active cycles visible, watch blockers early, and review how each sprint actually landed</h2>
              <p style={{ ...toolbarCopy, color: palette.muted }}>
                Sprint management should read like an execution timeline, not an admin table. Use the sections below to scan the current cycle, blockers, and prior sprint history.
              </p>
            </div>
            <div style={toolbarChipRail}>
              <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                {blockers.length} active blockers
              </span>
              <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                {upcomingSprintCount} planned
              </span>
              <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                {completedSprintCount} completed cycles
              </span>
              <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                {totalBlocked} total blocked items
              </span>
            </div>
          </div>
        </WorkspaceToolbar>

        <div style={ui.responsiveSplit}>
          <WorkspacePanel
            palette={palette}
            darkMode={darkMode}
            variant="execution"
            eyebrow="Current cycle"
            title={currentSprint ? currentSprint.name : "No active sprint"}
            description={
              currentSprint
                ? createPlainTextPreview(currentSprint.goal, "No sprint goal yet.", 180)
                : "Start a sprint to bring delivery, blockers, and follow-through into the active cycle."
            }
            minHeight={260}
          >
            {currentSprint ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <p style={{ ...muted, color: palette.muted }}>
                    <CalendarIcon style={icon14} /> {new Date(currentSprint.start_date).toLocaleDateString()} - {new Date(currentSprint.end_date).toLocaleDateString()}
                  </p>
                  <span style={{ ...statusBadge, border: `1px solid ${palette.success}`, background: palette.accentSoft, color: palette.success }}>
                    Active
                  </span>
                </div>
                <div style={miniStats}>
                  <Metric value={currentSprint.completed_count || 0} label="Completed" />
                  <Metric value={currentSprint.blocked_count || 0} label="Blocked" />
                  <Metric value={currentSprint.decisions_made || 0} label="Decisions" />
                </div>
              </>
            ) : (
              <WorkspaceEmptyState
                palette={palette}
                darkMode={darkMode}
                variant="execution"
                title="No active sprint"
                description="Create a new sprint or review prior cycles until the next execution window begins."
              />
            )}
          </WorkspacePanel>

          <WorkspacePanel
            palette={palette}
            darkMode={darkMode}
            variant="execution"
            eyebrow="Blocker watch"
            title={`Active blockers${blockers.length ? ` (${blockers.length})` : ""}`}
            description="Surface the blockers currently shaping sprint delivery before they turn into drift."
            minHeight={260}
          >
            {blockers.length === 0 ? (
              <WorkspaceEmptyState
                palette={palette}
                darkMode={darkMode}
                variant="execution"
                title="No active blockers"
                description="The blocker lane is currently clear across sprint operations."
              />
            ) : (
              <div style={list}>
                {blockers.map((blocker) => (
                  <article key={blocker.id} style={{ ...blockerCard, background: palette.cardAlt, border: `1px solid ${palette.border}`, borderLeft: `3px solid ${palette.danger}` }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <ExclamationTriangleIcon style={{ ...icon18, color: palette.danger }} />
                      <p style={{ ...itemTitle, color: palette.text }}>{blocker.title}</p>
                    </div>
                    <p style={{ ...muted, color: palette.muted }}>
                      {createPlainTextPreview(blocker.description || "", "No blocker description added yet.", 140)}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </WorkspacePanel>
        </div>

        <WorkspacePanel
          palette={palette}
          darkMode={darkMode}
          variant="execution"
          eyebrow="Sprint atlas"
          title="All sprint cycles"
          description="Open a sprint to inspect its execution detail, issue flow, and delivery decisions."
        >
          {sprints.length === 0 ? (
            <WorkspaceEmptyState
              palette={palette}
              darkMode={darkMode}
              variant="execution"
              title="No sprint history yet"
              description="Create the first sprint to start building your execution history."
            />
          ) : (
            <div style={list}>
              {sprints.map((sprint) => (
                <article
                  key={sprint.id}
                  className="ui-card-lift ui-smooth"
                  onClick={() => navigate(`/sprints/${sprint.id}`)}
                  style={{ ...rowCard, background: palette.cardAlt, border: `1px solid ${palette.border}` }}
                >
                  <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ ...itemTitle, color: palette.text }}>{sprint.name}</p>
                        <p style={{ ...muted, color: palette.muted }}>
                          <CalendarIcon style={icon14} /> {new Date(sprint.start_date).toLocaleDateString()} - {new Date(sprint.end_date).toLocaleDateString()}
                        </p>
                      </div>
                      <span style={{ ...statusPill, border: `1px solid ${palette.border}`, background: palette.card, color: palette.text }}>{sprint.status}</span>
                    </div>
                    <p style={{ ...sprintGoalPreview, color: palette.muted }}>
                      {createPlainTextPreview(sprint.goal, "No sprint goal recorded.", 180)}
                    </p>
                    <div style={metaRail}>
                      <span style={{ ...metaChip, border: `1px solid ${palette.border}`, background: palette.card, color: palette.text }}>
                        {sprint.completed_count || 0} completed
                      </span>
                      <span style={{ ...metaChip, border: `1px solid ${palette.border}`, background: palette.card, color: palette.text }}>
                        {sprint.blocked_count || 0} blocked
                      </span>
                      <span style={{ ...metaChip, border: `1px solid ${palette.border}`, background: palette.card, color: palette.text }}>
                        {sprint.decisions_made || 0} decisions
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </WorkspacePanel>

        {showCreate && (
          <div style={overlay}>
            <div style={{ ...modalCard, background: palette.card, border: `1px solid ${palette.border}` }}>
              <h3 style={{ margin: 0, fontSize: 22, color: palette.text }}>Create Sprint</h3>
              <form onSubmit={handleCreate} style={formStack}>
                <input placeholder="Sprint Name" required value={newSprint.name} onChange={(e) => setNewSprint({ ...newSprint, name: e.target.value })} style={ui.input} />
                <div style={ui.twoCol}>
                  <input type="date" required value={newSprint.start_date} onChange={(e) => setNewSprint({ ...newSprint, start_date: e.target.value })} style={ui.input} />
                  <input type="date" required value={newSprint.end_date} onChange={(e) => setNewSprint({ ...newSprint, end_date: e.target.value })} style={ui.input} />
                </div>
                <textarea rows={4} placeholder="Sprint goal" value={newSprint.goal} onChange={(e) => setNewSprint({ ...newSprint, goal: e.target.value })} style={ui.input} />
                <div style={buttonRow}>
                  <button type="button" onClick={() => setShowCreate(false)} style={ui.secondaryButton}>Cancel</button>
                  <button type="submit" style={ui.primaryButton}>Create</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ value, label }) {
  return (
    <article style={metricCard}>
      <p style={metricValue}>{value}</p>
      <p style={metricLabel}>{label}</p>
    </article>
  );
}

const spinner = { width: 30, height: 30, border: "2px solid var(--ui-border)", borderTopColor: "var(--ui-accent)", borderRadius: "50%", animation: "spin 1s linear infinite" };
const muted = { margin: 0, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 5 };
const spotlightCard = { minWidth: 240, borderRadius: 24, padding: 16, display: "grid", gap: 10 };
const spotlightEyebrow = { margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" };
const toolbarLayout = { display: "grid", gap: 14 };
const toolbarIntro = { display: "grid", gap: 4 };
const toolbarEyebrow = { margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" };
const toolbarTitle = { margin: 0, fontSize: 24, lineHeight: 1.04 };
const toolbarCopy = { margin: 0, fontSize: 13, lineHeight: 1.65, maxWidth: 760 };
const toolbarChipRail = { display: "flex", gap: 8, flexWrap: "wrap" };
const toolbarChip = { display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "8px 12px", fontSize: 12, fontWeight: 700 };
const statusBadge = { borderRadius: 999, padding: "5px 11px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" };
const miniStats = { marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8 };
const metricCard = { borderRadius: 10, padding: 10, border: "1px solid var(--ui-border)", background: "var(--ui-panel-alt)" };
const metricValue = { margin: 0, fontSize: 24, fontWeight: 800, color: "var(--ui-text)" };
const metricLabel = { margin: "4px 0 0", fontSize: 12, color: "var(--ui-muted)" };
const list = { display: "grid", gap: 8 };
const blockerCard = { borderRadius: 12, padding: 12 };
const rowCard = { borderRadius: 22, padding: 16, cursor: "pointer" };
const itemTitle = { margin: 0, fontSize: 15, fontWeight: 700 };
const sprintGoalPreview = { margin: 0, fontSize: 13, lineHeight: 1.65 };
const metaRail = { display: "flex", gap: 8, flexWrap: "wrap" };
const metaChip = { display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "7px 11px", fontSize: 11, fontWeight: 700, textTransform: "capitalize" };
const statusPill = { borderRadius: 999, padding: "5px 10px", height: "fit-content", fontSize: 11, textTransform: "capitalize", fontWeight: 800 };
const overlay = { position: "fixed", inset: 0, background: "rgba(5,12,20,0.62)", display: "grid", placeItems: "center", zIndex: 110, padding: 16 };
const modalCard = { width: "min(560px,100%)", borderRadius: 14, padding: 16 };
const formStack = { marginTop: 12, display: "grid", gap: 8 };
const buttonRow = { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 };
const icon18 = { width: 18, height: 18 };
const icon14 = { width: 14, height: 14 };



