import React, { useEffect, useMemo, useState } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";

export default function TasksBoard() {
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const [board, setBoard] = useState({ todo: [], in_progress: [], done: [] });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ title: "", description: "", priority: "medium", status: "todo", goal_id: "", conversation_id: "", decision_id: "" });

  const columns = [
    { key: "todo", title: "To Do", accent: "#94a3b8" },
    { key: "in_progress", title: "In Progress", accent: "#3b82f6" },
    { key: "done", title: "Done", accent: "#10b981" },
  ];

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
      setFormData({ title: "", description: "", priority: "medium", status: "todo", goal_id: "", conversation_id: "", decision_id: "" });
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

  const totals = columns.reduce((acc, col) => acc + (board[col.key]?.length || 0), 0);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: palette.bg }}>
        <div style={ui.container}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 10 }}>
            {[1, 2, 3].map((item) => (
              <div key={item} style={{ borderRadius: 12, height: 320, background: palette.card, border: `1px solid ${palette.border}`, opacity: 0.7 }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: palette.bg }}>
      <div style={ui.container}>
        <section style={{ borderRadius: 16, border: `1px solid ${palette.border}`, background: palette.card, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: palette.muted }}>TASK EXECUTION</p>
            <h1 style={{ margin: "8px 0 4px", fontSize: "clamp(1.5rem,3vw,2.2rem)", color: palette.text, letterSpacing: "-0.02em" }}>Tasks Board</h1>
            <p style={{ margin: 0, fontSize: 13, color: palette.muted }}>{totals} tasks across workflow columns</p>
          </div>
          <button onClick={() => setShowModal(true)} style={ui.primaryButton}><PlusIcon style={{ width: 14, height: 14 }} /> New Task</button>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 10 }}>
          {columns.map((column) => (
            <article key={column.key} style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.card, padding: 10 }}>
              <div style={{ borderRadius: 9, border: `1px solid ${palette.border}`, padding: 10, marginBottom: 8, borderLeft: `4px solid ${column.accent}` }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: palette.text }}>{column.title}</p>
                <p style={{ margin: "4px 0 0", fontSize: 11, color: palette.muted }}>{board[column.key]?.length || 0} tasks</p>
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                {(board[column.key] || []).map((task) => (
                  <div key={task.id} style={{ borderRadius: 10, border: `1px solid ${palette.border}`, background: palette.cardAlt, padding: 10 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: palette.text }}>{task.title}</p>
                    {task.description && <p style={{ margin: "5px 0 0", fontSize: 12, color: palette.muted, lineHeight: 1.4 }}>{task.description}</p>}
                    <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 11, color: priorityColor(task.priority), border: `1px solid ${priorityColor(task.priority)}`, borderRadius: 999, padding: "3px 8px", textTransform: "capitalize", fontWeight: 700 }}>
                        {task.priority}
                      </span>
                      <span style={{ fontSize: 11, color: palette.muted }}>{task.assigned_to?.full_name || "Unassigned"}</span>
                    </div>
                    {column.key !== "done" && (
                      <button
                        onClick={() => updateTaskStatus(task.id, column.key === "todo" ? "in_progress" : "done")}
                        style={{ ...ui.secondaryButton, width: "100%", marginTop: 8, fontSize: 12, padding: "8px 10px" }}
                      >
                        Move to {column.key === "todo" ? "In Progress" : "Done"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>

        {showModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "grid", placeItems: "center", zIndex: 120, padding: 16 }}>
            <div style={{ width: "min(560px,100%)", borderRadius: 14, border: `1px solid ${palette.border}`, background: palette.card, padding: 16 }}>
              <h2 style={{ margin: 0, fontSize: 20, color: palette.text }}>Create Task</h2>
              <form onSubmit={handleSubmit} style={{ marginTop: 12, display: "grid", gap: 8 }}>
                <input required placeholder="Task title" value={formData.title} onChange={(event) => setFormData({ ...formData, title: event.target.value })} style={ui.input} />
                <textarea rows={4} placeholder="Description" value={formData.description} onChange={(event) => setFormData({ ...formData, description: event.target.value })} style={ui.input} />
                <div style={ui.twoCol}>
                  <select value={formData.priority} onChange={(event) => setFormData({ ...formData, priority: event.target.value })} style={ui.input}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                  <select value={formData.status} onChange={(event) => setFormData({ ...formData, status: event.target.value })} style={ui.input}>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
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

function priorityColor(priority) {
  if (priority === "high") return "#ef4444";
  if (priority === "medium") return "#f59e0b";
  return "#60a5fa";
}
