import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FlagIcon, PlusIcon } from "@heroicons/react/24/outline";
import api from "../services/api";
import { WorkspaceEmptyState, WorkspaceHero, WorkspacePanel, WorkspaceToolbar } from "../components/WorkspaceChrome";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";
import { createPlainTextPreview } from "../utils/textPreview";

export default function Goals() {
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    target_date: "",
    status: "not_started",
    conversation_id: "",
    decision_id: "",
  });

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const response = await api.get("/api/business/goals/");
      setGoals(response.data || []);
    } catch (error) {
      console.error("Error fetching goals:", error);
      setGoals([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await api.post("/api/business/goals/", formData);
      setShowModal(false);
      setFormData({ title: "", description: "", target_date: "", status: "not_started", conversation_id: "", decision_id: "" });
      fetchGoals();
    } catch (error) {
      console.error("Error creating goal:", error);
    }
  };

  const doneCount = goals.filter((goal) => goal.status === "completed").length;
  const inProgressCount = goals.filter((goal) => goal.status === "in_progress").length;
  const onHoldCount = goals.filter((goal) => goal.status === "on_hold").length;
  const avgProgress = goals.length ? Math.round(goals.reduce((sum, goal) => sum + (goal.progress || 0), 0) / goals.length) : 0;
  const goalPulse =
    goals.length === 0
      ? "No business goals have been defined yet."
      : doneCount > 0
        ? `${doneCount} goal${doneCount === 1 ? "" : "s"} are complete, while the remaining goals still shape the operating agenda.`
        : `${inProgressCount} goal${inProgressCount === 1 ? "" : "s"} are actively moving and average progress is ${avgProgress}%.`;

  if (loading) {
    return (
      <div style={{ minHeight: "100vh" }}>
        <div style={ui.container}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 10 }}>
            {[1, 2, 3, 4].map((item) => (
              <div key={item} style={{ borderRadius: 0, height: 128, background: palette.card, border: `1px solid ${palette.border}`, opacity: 0.7 }} />
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
          eyebrow="Business Goals"
          title="Goals"
          description="Track delivery outcomes, strategic milestones, and the higher-level work the team is trying to accomplish."
          stats={[
            { label: "Total", value: goals.length, helper: "Goals tracked in this workspace." },
            { label: "In progress", value: inProgressCount, helper: "Goals currently moving." },
            { label: "Completed", value: doneCount, helper: "Goals already achieved." },
            { label: "Avg progress", value: `${avgProgress}%`, helper: "Average progress across all goals." },
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
              <p style={{ ...spotlightEyebrow, color: palette.muted }}>Goal pulse</p>
              <h3 style={{ margin: 0, fontSize: 22, lineHeight: 1.05, color: palette.text }}>
                {goals.length === 0 ? "No goals yet" : `${goals.length} goals in play`}
              </h3>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: palette.muted }}>{goalPulse}</p>
            </div>
          }
          actions={
            <button onClick={() => setShowModal(true)} className="ui-btn-polish ui-focus-ring" style={ui.primaryButton}>
              <PlusIcon style={{ width: 14, height: 14 }} /> New Goal
            </button>
          }
        />

        <WorkspaceToolbar palette={palette}>
          <div style={toolbarLayout}>
            <div style={toolbarIntro}>
              <p style={{ ...toolbarEyebrow, color: palette.muted }}>Planning guide</p>
              <h2 style={{ ...toolbarTitle, color: palette.text }}>Use goals as the operating layer above tasks and projects</h2>
              <p style={{ ...toolbarCopy, color: palette.muted }}>
                Goals work best when they stay concise, measurable, and linked to the work that actually moves them forward.
              </p>
            </div>
            <div style={toolbarChipRail}>
              <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                {doneCount} completed
              </span>
              <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                {inProgressCount} active
              </span>
              <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                {onHoldCount} on hold
              </span>
            </div>
          </div>
        </WorkspaceToolbar>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 8, marginBottom: 12 }}>
          <Metric label="Total" value={goals.length} palette={palette} />
          <Metric label="In Progress" value={inProgressCount} palette={palette} />
          <Metric label="Completed" value={doneCount} palette={palette} />
          <Metric label="Avg Progress" value={`${avgProgress}%`} palette={palette} />
        </section>

        <WorkspacePanel
          palette={palette}
          eyebrow="Goal atlas"
          title="Strategic milestones"
          description="Open a goal to see progress, linked work, and the detail behind the milestone."
        >
          {goals.length === 0 ? (
            <WorkspaceEmptyState
              palette={palette}
              title="No goals yet"
              description="Create the first goal to start tracking the business outcomes your projects and tasks should support."
            />
          ) : (
            <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 12 }}>
              {goals.map((goal) => (
                <article
                  key={goal.id}
                  className="ui-card-lift ui-smooth"
                  onClick={() => navigate(`/business/goals/${goal.id}`)}
                  style={{ borderRadius: 24, border: `1px solid ${palette.border}`, background: palette.cardAlt, padding: 16, cursor: "pointer", display: "grid", gap: 12 }}
                >
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <FlagIcon style={{ width: 16, height: 16, color: statusColor(goal.status, palette), marginTop: 2 }} />
                    <div style={{ minWidth: 0, flex: 1, display: "grid", gap: 6 }}>
                      <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: palette.text }}>{goal.title}</p>
                      <p style={{ margin: 0, fontSize: 13, color: palette.muted, lineHeight: 1.55 }}>
                        {createPlainTextPreview(goal.description || "", "No description yet.", 150)}
                      </p>
                    </div>
                  </div>
                  <div style={{ width: "100%", height: 7, borderRadius: 999, background: palette.progressTrack, overflow: "hidden" }}>
                    <div style={{ width: `${goal.progress || 0}%`, height: "100%", background: `linear-gradient(90deg,${palette.success},${palette.info})` }} />
                  </div>
                  <div style={metaRail}>
                    <span style={{ ...metaChip, border: `1px solid ${palette.border}`, background: palette.card, color: palette.text }}>
                      {(goal.status || "not_started").replace("_", " ")}
                    </span>
                    <span style={{ ...metaChip, border: `1px solid ${palette.border}`, background: palette.card, color: palette.text }}>
                      {goal.progress || 0}%
                    </span>
                    {goal.target_date ? (
                      <span style={{ ...metaChip, border: `1px solid ${palette.border}`, background: palette.card, color: palette.text }}>
                        {new Date(goal.target_date).toLocaleDateString()}
                      </span>
                    ) : null}
                  </div>
                </article>
              ))}
            </section>
          )}
        </WorkspacePanel>

        {showModal && (
          <div style={{ position: "fixed", inset: 0, background: "var(--app-overlay)", display: "grid", placeItems: "center", zIndex: 120, padding: 16 }}>
            <div style={{ width: "min(560px,100%)", borderRadius: 24, border: `1px solid ${palette.border}`, background: palette.card, padding: 16 }}>
              <h2 style={{ margin: 0, fontSize: 20, color: palette.text }}>Create Goal</h2>
              <form onSubmit={handleSubmit} style={{ marginTop: 12, display: "grid", gap: 8 }}>
                <input required placeholder="Goal title" value={formData.title} onChange={(event) => setFormData({ ...formData, title: event.target.value })} style={ui.input} />
                <textarea rows={4} placeholder="Description" value={formData.description} onChange={(event) => setFormData({ ...formData, description: event.target.value })} style={ui.input} />
                <div style={ui.twoCol}>
                  <input type="date" value={formData.target_date} onChange={(event) => setFormData({ ...formData, target_date: event.target.value })} style={ui.input} />
                  <select value={formData.status} onChange={(event) => setFormData({ ...formData, status: event.target.value })} style={ui.input}>
                    <option value="not_started">Not Started</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
                  </select>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                  <button type="button" onClick={() => setShowModal(false)} style={ui.secondaryButton}>Cancel</button>
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

function Metric({ label, value, palette }) {
  return (
    <article style={{ borderRadius: 18, padding: 12, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
      <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: palette.text }}>{value}</p>
      <p style={{ margin: "4px 0 0", fontSize: 12, color: palette.muted }}>{label}</p>
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
const toolbarChipRail = { display: "flex", gap: 8, flexWrap: "wrap" };
const toolbarChip = { display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "8px 12px", fontSize: 12, fontWeight: 700 };
const metaRail = { display: "flex", gap: 8, flexWrap: "wrap" };
const metaChip = { display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "7px 11px", fontSize: 11, fontWeight: 700, textTransform: "capitalize" };

function statusColor(status, palette) {
  if (status === "completed") return palette.success;
  if (status === "in_progress") return palette.info;
  if (status === "on_hold") return palette.warn;
  return palette.muted;
}
