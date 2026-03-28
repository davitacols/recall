import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeftIcon, TrashIcon } from "@heroicons/react/24/outline";
import api from "../services/api";
import { WorkspaceEmptyState, WorkspaceHero, WorkspacePanel, WorkspaceToolbar } from "../components/WorkspaceChrome";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";

export default function GoalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "not_started",
    progress: 0,
    target_date: "",
  });

  useEffect(() => {
    fetchGoal();
  }, [id]);

  const fetchGoal = async () => {
    try {
      const response = await api.get(`/api/business/goals/${id}/`);
      const data = response.data;
      setGoal(data);
      setFormData({
        title: data.title || "",
        description: data.description || "",
        status: data.status || "not_started",
        progress: data.progress ?? 0,
        target_date: data.target_date || "",
      });
    } catch (error) {
      console.error("Error:", error);
      setGoal(null);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    try {
      await api.put(`/api/business/goals/${id}/`, formData);
      setEditing(false);
      fetchGoal();
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this goal?")) return;
    try {
      await api.delete(`/api/business/goals/${id}/`);
      navigate("/business/goals");
    } catch (error) {
      console.error("Error:", error);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh" }}>
        <div style={{ ...ui.container, display: "grid", placeItems: "center", minHeight: 320 }}>
          <div style={spinner} />
        </div>
      </div>
    );
  }

  if (!goal) {
    return (
      <div style={{ minHeight: "100vh" }}>
        <div style={ui.container}>
          <WorkspaceEmptyState
            palette={palette}
            title="Goal not found"
            description="This goal may have been removed or you may no longer have access to it."
            action={
              <Link to="/business/goals" className="ui-btn-polish ui-focus-ring" style={{ ...ui.primaryButton, textDecoration: "none" }}>
                Back to Goals
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const relatedTasks = Array.isArray(goal.tasks) ? goal.tasks : [];
  const goalPulse =
    goal.status === "completed"
      ? "This goal is complete and now acts as a record of what the team delivered."
      : goal.status === "in_progress"
        ? `This goal is active and currently ${goal.progress || 0}% complete.`
        : goal.status === "on_hold"
          ? "This goal is on hold and should be revisited before it drifts out of the operating plan."
          : "This goal has been defined but work has not fully started yet.";

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={ui.container}>
        <button onClick={() => navigate("/business/goals")} style={backButton}>
          <ArrowLeftIcon style={icon14} /> Back
        </button>

        <WorkspaceHero
          palette={palette}
          darkMode={darkMode}
          eyebrow="Goal Detail"
          title={goal.title}
          description={goal.description || "Use this goal to keep a business outcome visible while projects, tasks, and teams work toward it."}
          stats={[
            { label: "Status", value: formatStatus(goal.status), helper: "Current operating state of the goal." },
            { label: "Progress", value: `${goal.progress || 0}%`, helper: "Current completion estimate." },
            { label: "Tasks", value: relatedTasks.length, helper: "Linked tasks contributing to the goal." },
            {
              label: "Target",
              value: goal.target_date ? new Date(goal.target_date).toLocaleDateString() : "None",
              helper: "Target date currently recorded for the goal.",
            },
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
                {goal.progress || 0}% complete
              </h3>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: palette.muted }}>{goalPulse}</p>
            </div>
          }
          actions={
            <>
              {!editing ? (
                <button onClick={() => setEditing(true)} className="ui-btn-polish ui-focus-ring" style={ui.primaryButton}>
                  Edit Goal
                </button>
              ) : null}
              <button onClick={handleDelete} className="ui-btn-polish ui-focus-ring" style={dangerButton(palette)}>
                <TrashIcon style={icon14} />
                Delete
              </button>
            </>
          }
        />

        <WorkspaceToolbar palette={palette}>
          <div style={toolbarLayout}>
            <div style={toolbarIntro}>
              <p style={{ ...toolbarEyebrow, color: palette.muted }}>Operating guide</p>
              <h2 style={{ ...toolbarTitle, color: palette.text }}>Keep the goal concise, measurable, and connected to the work that actually moves it</h2>
              <p style={{ ...toolbarCopy, color: palette.muted }}>
                Goals work best when they stay visible above tasks and projects, but still reflect real progress and review.
              </p>
            </div>
            <div style={toolbarChipRail}>
              <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                {formatStatus(goal.status)}
              </span>
              <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                {relatedTasks.length} linked tasks
              </span>
              <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                {goal.target_date ? "Has target date" : "No target date"}
              </span>
            </div>
          </div>
        </WorkspaceToolbar>

        <div style={ui.responsiveSplit}>
          <WorkspacePanel
            palette={palette}
            eyebrow={editing ? "Edit goal" : "Goal summary"}
            title={editing ? "Update this goal" : "Current goal brief"}
            description={editing ? "Change the title, brief, status, and progress to keep the goal current." : "This is the current state of the goal and its planning metadata."}
            minHeight={320}
          >
            {editing ? (
              <form onSubmit={handleUpdate} style={{ display: "grid", gap: 10 }}>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                  style={ui.input}
                  placeholder="Goal title"
                />
                <textarea
                  value={formData.description}
                  onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                  rows={5}
                  style={{ ...ui.input, resize: "vertical" }}
                  placeholder="Describe the goal and what success looks like."
                />
                <div style={ui.twoCol}>
                  <select
                    value={formData.status}
                    onChange={(event) => setFormData({ ...formData, status: event.target.value })}
                    style={ui.input}
                  >
                    <option value="not_started">Not Started</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
                  </select>
                  <input
                    type="date"
                    value={formData.target_date || ""}
                    onChange={(event) => setFormData({ ...formData, target_date: event.target.value })}
                    style={ui.input}
                  />
                </div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.progress ?? 0}
                  onChange={(event) => setFormData({ ...formData, progress: Number(event.target.value || 0) })}
                  style={ui.input}
                  placeholder="Progress"
                />
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="ui-btn-polish ui-focus-ring"
                    onClick={() => {
                      setEditing(false);
                      setFormData({
                        title: goal.title || "",
                        description: goal.description || "",
                        status: goal.status || "not_started",
                        progress: goal.progress ?? 0,
                        target_date: goal.target_date || "",
                      });
                    }}
                    style={ui.secondaryButton}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="ui-btn-polish ui-focus-ring" style={ui.primaryButton}>
                    Save Changes
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display: "grid", gap: 14 }}>
                <div style={metaGroup}>
                  <span style={metaLabel(palette)}>Description</span>
                  <p style={metaBody(palette)}>{goal.description || "No description added yet."}</p>
                </div>
                <div style={summaryGrid}>
                  <div style={summaryCard(palette)}>
                    <span style={metaLabel(palette)}>Status</span>
                    <p style={summaryValue(palette)}>{formatStatus(goal.status)}</p>
                  </div>
                  <div style={summaryCard(palette)}>
                    <span style={metaLabel(palette)}>Progress</span>
                    <p style={summaryValue(palette)}>{goal.progress || 0}%</p>
                  </div>
                  <div style={summaryCard(palette)}>
                    <span style={metaLabel(palette)}>Target date</span>
                    <p style={summaryValue(palette)}>{goal.target_date ? new Date(goal.target_date).toLocaleDateString() : "Not set"}</p>
                  </div>
                  <div style={summaryCard(palette)}>
                    <span style={metaLabel(palette)}>Owner</span>
                    <p style={summaryValue(palette)}>{goal.owner?.full_name || "No owner assigned"}</p>
                  </div>
                </div>
              </div>
            )}
          </WorkspacePanel>

          <WorkspacePanel
            palette={palette}
            eyebrow="Execution linkage"
            title="Related tasks"
            description="These tasks currently carry the day-to-day work behind this goal."
            minHeight={320}
          >
            {relatedTasks.length === 0 ? (
              <WorkspaceEmptyState
                palette={palette}
                title="No linked tasks"
                description="This goal does not yet have tasks tied to it."
              />
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {relatedTasks.map((task) => (
                  <div key={task.id} style={taskCard(palette)}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: palette.text }}>{task.title}</p>
                      <span style={taskStatusChip(palette)}>{formatStatus(task.status)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </WorkspacePanel>
        </div>
      </div>
    </div>
  );
}

function formatStatus(status = "") {
  return String(status || "not_started").replace(/_/g, " ");
}

const spinner = { width: 28, height: 28, border: "2px solid var(--app-border-strong)", borderTopColor: "var(--app-info)", borderRadius: "50%", animation: "spin 1s linear infinite" };
const backButton = { display: "inline-flex", alignItems: "center", gap: 6, border: "none", background: "transparent", color: "var(--app-muted)", fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 10 };
const icon14 = { width: 14, height: 14 };
const spotlightCard = { minWidth: 240, borderRadius: 24, padding: 16, display: "grid", gap: 10 };
const spotlightEyebrow = { margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" };
const toolbarLayout = { display: "grid", gap: 14 };
const toolbarIntro = { display: "grid", gap: 4 };
const toolbarEyebrow = { margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" };
const toolbarTitle = { margin: 0, fontSize: 24, lineHeight: 1.04 };
const toolbarCopy = { margin: 0, fontSize: 13, lineHeight: 1.65, maxWidth: 760 };
const toolbarChipRail = { display: "flex", gap: 8, flexWrap: "wrap" };
const toolbarChip = { display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "8px 12px", fontSize: 12, fontWeight: 700, textTransform: "capitalize" };

function dangerButton(palette) {
  return {
    border: `1px solid ${palette.danger}`,
    borderRadius: 999,
    padding: "10px 16px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    color: palette.danger,
    background: palette.card,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  };
}

function metaLabel(palette) {
  return {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: palette.muted,
  };
}

function metaBody(palette) {
  return {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.7,
    color: palette.text,
  };
}

const metaGroup = {
  display: "grid",
  gap: 6,
};

const summaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
  gap: 10,
};

function summaryCard(palette) {
  return {
    borderRadius: 18,
    border: `1px solid ${palette.border}`,
    background: palette.cardAlt,
    padding: 12,
    display: "grid",
    gap: 6,
  };
}

function summaryValue(palette) {
  return {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    color: palette.text,
    textTransform: "capitalize",
  };
}

function taskCard(palette) {
  return {
    borderRadius: 18,
    border: `1px solid ${palette.border}`,
    background: palette.cardAlt,
    padding: 12,
  };
}

function taskStatusChip(palette) {
  return {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 999,
    border: `1px solid ${palette.border}`,
    background: palette.card,
    color: palette.text,
    padding: "6px 10px",
    fontSize: 11,
    fontWeight: 700,
    textTransform: "capitalize",
  };
}
