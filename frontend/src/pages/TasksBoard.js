import React, { useEffect, useMemo, useState } from "react";
import {
  PlusIcon,
  Squares2X2Icon,
  ListBulletIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  Avatar,
  Button,
  EmptyState,
  Field,
  IconButton,
  Lozenge,
  PageHeader,
  SectionMessage,
  Tabs,
} from "../components/atlas";

const COLUMNS = [
  { id: "todo", label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "done", label: "Done" },
];

const PRIORITIES = ["low", "medium", "high", "urgent"];

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function TasksBoard() {
  const apiBase = process.env.REACT_APP_API_URL || "";
  const [board, setBoard] = useState({ todo: [], in_progress: [], done: [] });
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("board");
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [draggedTask, setDraggedTask] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    status: "todo",
    due_date: "",
  });

  const authHeaders = () => {
    const token = localStorage.getItem("token") || localStorage.getItem("access_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    fetchBoard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchBoard = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${apiBase}/api/business/tasks/board/`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`Tasks API returned ${res.status}`);
      const data = await res.json();
      setBoard({
        todo: data.todo || [],
        in_progress: data.in_progress || [],
        done: data.done || [],
      });
    } catch (err) {
      setError(err.message || "Failed to load tasks");
      setBoard({ todo: [], in_progress: [], done: [] });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${apiBase}/api/business/tasks/`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("Failed to create task");
      setShowModal(false);
      setFormData({ title: "", description: "", priority: "medium", status: "todo", due_date: "" });
      await fetchBoard();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (taskId, newStatus) => {
    try {
      await fetch(`${apiBase}/api/business/tasks/${taskId}/`, {
        method: "PUT",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchBoard();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDragStart = (task) => (e) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (col) => (e) => {
    e.preventDefault();
    setDropTarget(col);
  };

  const handleDrop = (col) => async (e) => {
    e.preventDefault();
    setDropTarget(null);
    if (!draggedTask || draggedTask.status === col) return;
    await updateStatus(draggedTask.id, col);
    setDraggedTask(null);
  };

  const allTasks = useMemo(
    () => [...board.todo, ...board.in_progress, ...board.done].map((t) => ({ ...t, _status: t.status })),
    [board]
  );

  const totals = {
    todo: board.todo.length,
    in_progress: board.in_progress.length,
    done: board.done.length,
    all: allTasks.length,
  };

  return (
    <div style={{ padding: "0 32px 32px" }}>
      <PageHeader
        breadcrumb={[{ label: "Knoledgr", to: "/" }, { label: "Tasks" }]}
        title="Tasks"
        subtitle="Track day-to-day execution with enough context to stay grounded."
        actions={
          <Button appearance="primary" iconBefore={<PlusIcon style={{ width: 14, height: 14 }} />} onClick={() => setShowModal(true)}>
            Create task
          </Button>
        }
        style={{ padding: "24px 0 0", background: "transparent" }}
      />

      <div style={toolbar}>
        <span style={{ display: "flex", gap: 0, border: "1px solid var(--app-border)", borderRadius: 3, overflow: "hidden" }}>
          <button
            type="button"
            onClick={() => setView("board")}
            aria-pressed={view === "board"}
            style={{
              ...viewToggle,
              background: view === "board" ? "var(--b50)" : "var(--app-surface)",
              color: view === "board" ? "var(--b500)" : "var(--app-muted)",
            }}
          >
            <Squares2X2Icon style={{ width: 14, height: 14 }} /> Board
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            aria-pressed={view === "list"}
            style={{
              ...viewToggle,
              background: view === "list" ? "var(--b50)" : "var(--app-surface)",
              color: view === "list" ? "var(--b500)" : "var(--app-muted)",
              borderLeft: "1px solid var(--app-border)",
            }}
          >
            <ListBulletIcon style={{ width: 14, height: 14 }} /> List
          </button>
        </span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: "var(--app-muted)" }}>
          {totals.all} task{totals.all === 1 ? "" : "s"} · {totals.in_progress} in progress
        </span>
      </div>

      {error ? <SectionMessage tone="error" style={{ marginTop: 16 }}>{error}</SectionMessage> : null}

      {loading ? (
        <div style={{ marginTop: 16, height: 320, background: "var(--n20)", borderRadius: 4 }} />
      ) : view === "board" ? (
        <div style={{ ...columnRow }}>
          {COLUMNS.map((col) => {
            const tasks = board[col.id] || [];
            const isOver = dropTarget === col.id;
            return (
              <div
                key={col.id}
                onDragOver={handleDragOver(col.id)}
                onDrop={handleDrop(col.id)}
                style={{ ...columnStyle, background: isOver ? "var(--b50)" : "var(--app-surface-alt)" }}
              >
                <div style={columnHeader}>
                  <span style={columnTitle}>{col.label}</span>
                  <span style={columnCount}>{tasks.length}</span>
                </div>
                <div style={columnBody}>
                  {tasks.length === 0 ? (
                    <div style={emptyColumn}>Drop tasks here</div>
                  ) : (
                    tasks.map((t) => <TaskCard key={t.id} task={t} onDragStart={handleDragStart({ ...t, status: col.id })} />)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <ListView tasks={allTasks} onCreate={() => setShowModal(true)} />
      )}

      {showModal ? (
        <Modal title="Create task" onClose={() => setShowModal(false)}>
          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Title" isRequired>
              <input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="atlas-input" required autoFocus />
            </Field>
            <Field label="Description">
              <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="atlas-input" rows={4} />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <Field label="Status">
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="atlas-input">
                  {COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </Field>
              <Field label="Priority">
                <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} className="atlas-input">
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Due">
                <input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} className="atlas-input" />
              </Field>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
              <Button type="button" appearance="subtle" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit" appearance="primary" isDisabled={submitting || !formData.title.trim()}>{submitting ? "Creating…" : "Create"}</Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

function TaskCard({ task, onDragStart }) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      style={{
        background: "var(--app-surface)",
        border: "1px solid var(--app-border)",
        borderRadius: 3,
        padding: "10px 12px",
        cursor: "grab",
        boxShadow: "var(--ui-shadow-sm)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.4286, color: "var(--app-text)" }}>{task.title}</p>
      {task.description ? (
        <p style={{ margin: 0, fontSize: 12, color: "var(--app-muted)", lineHeight: 1.4286, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {task.description}
        </p>
      ) : null}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <Lozenge variant={priorityVariant(task.priority)}>{task.priority || "medium"}</Lozenge>
          {task.due_date ? <span style={{ fontSize: 11, color: "var(--app-muted)" }}>{formatDate(task.due_date)}</span> : null}
        </span>
        <Avatar size="sm" name={task.assignee_name || task.owner || "Unassigned"} />
      </div>
    </div>
  );
}

function ListView({ tasks, onCreate }) {
  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={<Squares2X2Icon style={{ width: "100%", height: "100%" }} />}
        title="No tasks yet"
        description="Create your first task to start tracking work."
        primaryAction={<Button appearance="primary" onClick={onCreate}>Create task</Button>}
      />
    );
  }
  return (
    <div style={{ background: "var(--app-surface)", border: "1px solid var(--app-border)", borderRadius: 4, overflow: "hidden", marginTop: 8 }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "var(--app-surface-alt)" }}>
            <th style={th}>Task</th>
            <th style={th}>Status</th>
            <th style={th}>Priority</th>
            <th style={th}>Assignee</th>
            <th style={th}>Due</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <tr key={t.id} style={{ borderBottom: "1px solid var(--app-border-subtle)" }}>
              <td style={td}>
                <p style={{ margin: 0, fontWeight: 500 }}>{t.title}</p>
                {t.description ? <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--app-muted)" }}>{t.description.slice(0, 120)}</p> : null}
              </td>
              <td style={td}><Lozenge status={t._status || t.status} /></td>
              <td style={td}><Lozenge variant={priorityVariant(t.priority)}>{t.priority || "medium"}</Lozenge></td>
              <td style={td}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Avatar size="sm" name={t.assignee_name || t.owner || "Unassigned"} />
                  <span style={{ fontSize: 13 }}>{t.assignee_name || t.owner || "—"}</span>
                </span>
              </td>
              <td style={td}>
                <span style={{ fontSize: 13, color: "var(--app-muted)" }}>{formatDate(t.due_date) || "—"}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Modal({ children, onClose, title, width = 520 }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "var(--app-overlay)", zIndex: 199 }} />
      <div role="dialog" aria-modal="true" style={{ position: "fixed", top: "10vh", left: "50%", transform: "translateX(-50%)", width, maxWidth: "calc(100vw - 32px)", background: "var(--app-surface-overlay)", border: "1px solid var(--app-border)", borderRadius: 6, boxShadow: "var(--ui-shadow-lg)", zIndex: 200, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--app-border)" }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{title}</h2>
          <IconButton icon={<XMarkIcon style={{ width: 16, height: 16 }} />} label="Close" onClick={onClose} />
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </>
  );
}

function priorityVariant(p) {
  const k = String(p || "").toLowerCase();
  if (k === "urgent" || k === "high") return "removed";
  if (k === "medium") return "moved";
  return "success";
}

const toolbar = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "16px 0",
};

const viewToggle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "6px 10px",
  background: "var(--app-surface)",
  border: "none",
  fontFamily: "inherit",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
};

const columnRow = {
  marginTop: 8,
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(280px, 1fr))",
  gap: 8,
};

const columnStyle = {
  borderRadius: 4,
  border: "1px solid transparent",
  display: "flex",
  flexDirection: "column",
  minHeight: 400,
};

const columnHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "8px 12px",
};

const columnTitle = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "var(--app-muted)",
};

const columnCount = {
  fontSize: 11,
  fontWeight: 700,
  color: "var(--app-muted)",
};

const columnBody = {
  flex: 1,
  padding: "4px 8px 8px",
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const emptyColumn = {
  padding: 16,
  textAlign: "center",
  fontSize: 12,
  color: "var(--app-text-disabled)",
  border: "1px dashed var(--app-border)",
  borderRadius: 3,
};

const th = { textAlign: "left", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--app-muted)", padding: "10px 16px", borderBottom: "1px solid var(--app-border)" };
const td = { padding: "10px 16px", fontSize: 14, color: "var(--app-text)", verticalAlign: "middle" };
