import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PlusIcon } from "@heroicons/react/24/outline";
import {
  WorkspaceEmptyState,
  WorkspaceHero,
  WorkspacePanel,
  WorkspaceToolbar,
} from "../components/WorkspaceChrome";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";
import { createPlainTextPreview } from "../utils/textPreview";

export default function TasksBoard() {
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const [board, setBoard] = useState({ todo: [], in_progress: [], done: [] });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    status: "todo",
    goal_id: "",
    conversation_id: "",
    decision_id: "",
  });

  const columns = useMemo(
    () => [
      {
        key: "todo",
        title: "To Do",
        description: "Tasks staged and ready for someone to pick up.",
        accent: darkMode ? "#c3cbd8" : "#64748b",
      },
      {
        key: "in_progress",
        title: "In Progress",
        description: "Work that is actively moving through execution.",
        accent: darkMode ? "#9AB9FF" : "#2E63D0",
      },
      {
        key: "done",
        title: "Done",
        description: "Completed tasks and resolved execution items.",
        accent: darkMode ? "#79C89F" : "#2F7F5F",
      },
    ],
    [darkMode]
  );

  useEffect(() => {
    fetchBoard();
  }, []);

  const fetchBoard = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/business/tasks/board/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        console.error("API Error:", res.status, await res.text());
        setBoard({ todo: [], in_progress: [], done: [] });
        return;
      }
      setBoard(await res.json());
    } catch (error) {
      console.error("Error fetching board:", error);
      setBoard({ todo: [], in_progress: [], done: [] });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const token = localStorage.getItem("token");
      await fetch(`${process.env.REACT_APP_API_URL}/api/business/tasks/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
      setShowModal(false);
      setFormData({
        title: "",
        description: "",
        priority: "medium",
        status: "todo",
        goal_id: "",
        conversation_id: "",
        decision_id: "",
      });
      fetchBoard();
    } catch (error) {
      console.error("Error creating task:", error);
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      const token = localStorage.getItem("token");
      await fetch(`${process.env.REACT_APP_API_URL}/api/business/tasks/${taskId}/`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchBoard();
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const totalTasks = columns.reduce((acc, col) => acc + (board[col.key]?.length || 0), 0);
  const inProgressCount = board.in_progress?.length || 0;
  const doneCount = board.done?.length || 0;
  const highPriorityCount = columns.reduce(
    (acc, col) => acc + (board[col.key] || []).filter((task) => String(task.priority || "").toLowerCase() === "high").length,
    0
  );
  const boardPulse =
    totalTasks === 0
      ? "The execution board is clear. Add a task when a new operational thread needs tracking."
      : inProgressCount > doneCount
        ? "Execution is active right now, with more work moving than completed. Keep the middle lane from becoming a parking lot."
        : "Closed work is keeping pace with active execution. This board is in a healthy rhythm.";

  const executionAside = (
    <div
      style={{
        ...asideCard,
        border: `1px solid ${palette.border}`,
        background: darkMode
          ? "linear-gradient(150deg, rgba(32,27,23,0.92), rgba(22,18,15,0.84))"
          : "linear-gradient(150deg, rgba(255,252,248,0.98), rgba(244,237,226,0.9))",
      }}
    >
      <p style={{ ...asideEyebrow, color: palette.muted }}>Board Pulse</p>
      <h3 style={{ ...asideTitle, color: palette.text }}>
        {totalTasks === 0 ? "Ready for the next task" : `${totalTasks} tasks in flow`}
      </h3>
      <p style={{ ...asideCopy, color: palette.muted }}>{boardPulse}</p>
      <div style={asideMetricGrid}>
        <div style={{ ...asideMetric, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
          <p style={{ ...asideMetricLabel, color: palette.muted }}>In progress</p>
          <p style={{ ...asideMetricValue, color: palette.text }}>{inProgressCount}</p>
        </div>
        <div style={{ ...asideMetric, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
          <p style={{ ...asideMetricLabel, color: palette.muted }}>Done</p>
          <p style={{ ...asideMetricValue, color: palette.text }}>{doneCount}</p>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={{ minHeight: "100vh" }}>
        <div style={ui.container}>
          <div style={columnsGrid}>
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                style={{
                  borderRadius: 24,
                  minHeight: 320,
                  background: palette.card,
                  border: `1px solid ${palette.border}`,
                  opacity: 0.72,
                }}
              />
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
          variant="execution"
          eyebrow="Task Execution"
          title="Tasks Board"
          description="Run lightweight execution work in one calmer board that keeps movement, priority, and ownership visible."
          aside={executionAside}
          stats={[
            { label: "Total", value: totalTasks, helper: "Tasks across the board." },
            { label: "To do", value: board.todo?.length || 0, helper: "Tasks waiting to start." },
            { label: "In progress", value: inProgressCount, helper: "Tasks actively moving." },
            { label: "High priority", value: highPriorityCount, helper: "Urgent work asking for attention." },
          ]}
          actions={
            <>
              <Link className="ui-btn-polish ui-focus-ring" to="/projects" style={{ ...ui.secondaryButton, textDecoration: "none" }}>
                Projects
              </Link>
              <button className="ui-btn-polish ui-focus-ring" onClick={() => setShowModal(true)} style={ui.primaryButton}>
                <PlusIcon style={icon14} /> New Task
              </button>
            </>
          }
        />

        <WorkspaceToolbar palette={palette} darkMode={darkMode} variant="execution">
          <div style={toolbarLayout}>
            <div style={toolbarIntro}>
              <p style={{ ...toolbarEyebrow, color: palette.muted }}>Execution Guide</p>
              <h2 style={{ ...toolbarTitle, color: palette.text }}>Keep this board for active operational work, not for long-term backlog parking</h2>
              <p style={{ ...toolbarCopy, color: palette.muted }}>
                The board should make it obvious what is ready, what is moving, and what is finished, so small execution work stays easy to review.
              </p>
            </div>
            <div style={toolbarChipRail}>
              <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                {board.todo?.length || 0} ready to start
              </span>
              <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                Move work forward from the middle lane
              </span>
              <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                {doneCount} already closed
              </span>
            </div>
          </div>
        </WorkspaceToolbar>

        <div style={columnsGrid}>
          {columns.map((column) => {
            const tasks = board[column.key] || [];
            const nextStatus = column.key === "todo" ? "in_progress" : "done";
            const nextStatusLabel = column.key === "todo" ? "In Progress" : "Done";

            return (
              <WorkspacePanel
                key={column.key}
                palette={palette}
                darkMode={darkMode}
                variant="execution"
                eyebrow="Workflow Lane"
                title={column.title}
                description={column.description}
                minHeight={460}
                action={
                  <span
                    style={{
                      ...laneBadge,
                      border: `1px solid ${palette.border}`,
                      background: palette.cardAlt,
                      color: palette.text,
                    }}
                  >
                    {tasks.length} tasks
                  </span>
                }
              >
                {tasks.length === 0 ? (
                  <WorkspaceEmptyState
                    palette={palette}
                    darkMode={darkMode}
                    variant="execution"
                    title={`No tasks in ${column.title.toLowerCase()}`}
                    description="Add a new task or move one here when the workflow changes."
                  />
                ) : (
                  <div style={stack}>
                    {tasks.map((task) => (
                      <article
                        key={task.id}
                        className="ui-card-lift ui-smooth"
                        style={{
                          ...taskCard,
                          border: `1px solid ${palette.border}`,
                          background: palette.cardAlt,
                        }}
                      >
                        <div style={taskHead}>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ ...taskTitle, color: palette.text }}>{task.title}</p>
                            <p style={{ ...taskBody, color: palette.muted }}>
                              {createPlainTextPreview(task.description, "No description has been added yet.", 140)}
                            </p>
                          </div>
                          <span
                            style={{
                              ...priorityChip,
                              border: `1px solid ${priorityColor(task.priority, palette)}`,
                              color: priorityColor(task.priority, palette),
                            }}
                          >
                            {task.priority || "medium"}
                          </span>
                        </div>

                        <div style={taskMetaRail}>
                          <span style={{ ...metaChip, border: `1px solid ${palette.border}`, background: palette.card, color: palette.text }}>
                            {task.assigned_to?.full_name || "Unassigned"}
                          </span>
                          <span style={{ ...metaChip, border: `1px solid ${palette.border}`, background: palette.card, color: palette.text }}>
                            {column.title}
                          </span>
                        </div>

                        {column.key !== "done" ? (
                          <button
                            className="ui-btn-polish ui-focus-ring"
                            onClick={() => updateTaskStatus(task.id, nextStatus)}
                            style={{ ...ui.secondaryButton, width: "100%", justifyContent: "center" }}
                          >
                            Move to {nextStatusLabel}
                          </button>
                        ) : null}
                      </article>
                    ))}
                  </div>
                )}
              </WorkspacePanel>
            );
          })}
        </div>

        {showModal ? (
          <div style={overlay}>
            <div style={{ ...modalCard, border: `1px solid ${palette.border}`, background: palette.card }}>
              <p style={{ ...modalEyebrow, color: palette.muted }}>Create Task</p>
              <h2 style={{ ...modalTitle, color: palette.text }}>Add operational work to the board</h2>
              <p style={{ ...modalCopy, color: palette.muted }}>
                Keep the title crisp and the description useful enough that someone else could pick it up without asking for more context.
              </p>
              <form onSubmit={handleSubmit} style={formStack}>
                <input
                  required
                  placeholder="Task title"
                  value={formData.title}
                  onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                  className="ui-focus-ring"
                  style={ui.input}
                />
                <textarea
                  rows={4}
                  placeholder="Description"
                  value={formData.description}
                  onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                  className="ui-focus-ring"
                  style={{ ...ui.input, resize: "vertical" }}
                />
                <div style={ui.twoCol}>
                  <select value={formData.priority} onChange={(event) => setFormData({ ...formData, priority: event.target.value })} className="ui-focus-ring" style={ui.input}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                  <select value={formData.status} onChange={(event) => setFormData({ ...formData, status: event.target.value })} className="ui-focus-ring" style={ui.input}>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <div style={buttonRow}>
                  <button type="button" onClick={() => setShowModal(false)} className="ui-btn-polish ui-focus-ring" style={ui.secondaryButton}>
                    Cancel
                  </button>
                  <button type="submit" className="ui-btn-polish ui-focus-ring" style={ui.primaryButton}>
                    Create task
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function priorityColor(priority, palette) {
  if (priority === "high") return palette.danger;
  if (priority === "medium") return palette.warn;
  return palette.info;
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

const columnsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 14,
  marginTop: 14,
};

const laneBadge = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "8px 12px",
  fontSize: 11,
  fontWeight: 800,
};

const stack = {
  display: "grid",
  gap: 12,
};

const taskCard = {
  borderRadius: 22,
  padding: 16,
  display: "grid",
  gap: 12,
};

const taskHead = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
};

const taskTitle = {
  margin: 0,
  fontSize: 16,
  fontWeight: 800,
  letterSpacing: "-0.03em",
};

const taskBody = {
  margin: "6px 0 0",
  fontSize: 13,
  lineHeight: 1.65,
};

const priorityChip = {
  borderRadius: 999,
  padding: "7px 11px",
  fontSize: 11,
  fontWeight: 800,
  textTransform: "capitalize",
  whiteSpace: "nowrap",
};

const taskMetaRail = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const metaChip = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "7px 11px",
  fontSize: 11,
  fontWeight: 700,
};

const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(14, 10, 8, 0.36)",
  backdropFilter: "blur(8px)",
  display: "grid",
  placeItems: "center",
  zIndex: 120,
  padding: 16,
};

const modalCard = {
  width: "min(560px, 100%)",
  borderRadius: 28,
  padding: 22,
  boxShadow: "var(--ui-shadow-lg)",
};

const modalEyebrow = {
  margin: 0,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};

const modalTitle = {
  margin: "6px 0 0",
  fontSize: 28,
  lineHeight: 1.02,
};

const modalCopy = {
  margin: "8px 0 0",
  fontSize: 13,
  lineHeight: 1.6,
};

const formStack = {
  marginTop: 16,
  display: "grid",
  gap: 10,
};

const buttonRow = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
  marginTop: 8,
  flexWrap: "wrap",
};

const icon14 = { width: 14, height: 14 };
