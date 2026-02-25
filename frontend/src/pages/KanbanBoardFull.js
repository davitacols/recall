import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeftIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import api from "../services/api";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";

function KanbanBoard() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const { darkMode } = useTheme();

  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [draggedIssue, setDraggedIssue] = useState(null);
  const [showCreateIssue, setShowCreateIssue] = useState(false);
  const [newIssueTitle, setNewIssueTitle] = useState("");

  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  useEffect(() => {
    fetchBoard();
  }, [boardId]);

  const fetchBoard = async () => {
    try {
      const response = await api.get(`/api/agile/boards/${boardId}/`);
      setBoard(response.data);
    } catch (error) {
      console.error("Failed to fetch board:", error);
      setBoard(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = async (column) => {
    if (!draggedIssue || !board?.columns) return;

    const statusMap = {
      "To Do": "todo",
      "In Progress": "in_progress",
      "In Review": "in_review",
      Done: "done",
      Testing: "testing",
      Backlog: "backlog",
    };

    const status = statusMap[column.name] || "todo";

    try {
      await api.put(`/api/agile/issues/${draggedIssue.id}/`, { status });
      setDraggedIssue(null);
      fetchBoard();
    } catch (error) {
      console.error("Failed to move issue:", error);
      setDraggedIssue(null);
    }
  };

  const handleCreateIssue = async () => {
    if (!newIssueTitle.trim() || !board?.project_id) return;
    try {
      await api.post(`/api/agile/projects/${board.project_id}/issues/`, { title: newIssueTitle.trim() });
      setShowCreateIssue(false);
      setNewIssueTitle("");
      fetchBoard();
    } catch (error) {
      console.error("Failed to create issue:", error);
    }
  };

  const handleDeleteIssue = async (issueId) => {
    if (!window.confirm("Delete this issue?")) return;
    try {
      await api.delete(`/api/agile/issues/${issueId}/`);
      fetchBoard();
    } catch (error) {
      console.error("Failed to delete issue:", error);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: palette.bg, display: "grid", placeItems: "center" }}>
        <div style={spinner} />
      </div>
    );
  }

  if (!board) {
    return (
      <div style={{ minHeight: "100vh", background: palette.bg, display: "grid", placeItems: "center" }}>
        <p style={{ color: palette.muted }}>Board not found.</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: palette.bg }}>
      <div style={ui.container}>
        <section style={{ ...hero, background: palette.card, border: `1px solid ${palette.border}` }}>
          <div>
            <button onClick={() => navigate(-1)} style={backButton}>
              <ArrowLeftIcon style={icon14} /> Back
            </button>
            <p style={{ ...eyebrow, color: palette.muted }}>KANBAN BOARD</p>
            <h1 style={{ ...title, color: palette.text }}>{board.name}</h1>
            <p style={{ ...subtitle, color: palette.muted }}>Project: {board.project_name}</p>
          </div>
          <button onClick={() => setShowCreateIssue(true)} style={ui.primaryButton}>
            <PlusIcon style={icon14} /> New Issue
          </button>
        </section>

        <section style={boardGrid}>
          {(board.columns || []).map((column) => (
            <article key={column.id} style={{ ...columnCard, background: palette.card, border: `1px solid ${palette.border}` }}>
              <div style={columnHead}>
                <h2 style={{ margin: 0, fontSize: 13, color: palette.text, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {column.name}
                </h2>
                <span style={countBadge}>{column.issue_count || (column.issues || []).length || 0}</span>
              </div>

              <div
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => handleDrop(column)}
                style={issuesWrap}
              >
                {(column.issues || []).length === 0 && <div style={empty}>No issues</div>}

                {(column.issues || []).map((issue) => (
                  <article
                    key={issue.id}
                    draggable
                    onDragStart={() => setDraggedIssue(issue)}
                    onDragEnd={() => setDraggedIssue(null)}
                    onClick={() => navigate(`/issues/${issue.id}`)}
                    style={issueCard}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={issueKey}>{issue.key || `ISS-${issue.id}`}</p>
                        <p style={issueTitle}>{issue.title}</p>
                      </div>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeleteIssue(issue.id);
                        }}
                        style={deleteButton}
                      >
                        <TrashIcon style={icon14} />
                      </button>
                    </div>
                    <p style={issueMeta}>{issue.assignee || issue.assignee_name || "Unassigned"}</p>
                  </article>
                ))}
              </div>
            </article>
          ))}
        </section>

        {showCreateIssue && (
          <div style={overlay}>
            <div style={{ ...modalCard, background: palette.card, border: `1px solid ${palette.border}` }}>
              <h3 style={{ margin: 0, fontSize: 20, color: palette.text }}>Create Issue</h3>
              <div style={formStack}>
                <input
                  autoFocus
                  value={newIssueTitle}
                  onChange={(event) => setNewIssueTitle(event.target.value)}
                  placeholder="Issue title"
                  style={ui.input}
                />
                <div style={modalButtons}>
                  <button onClick={() => setShowCreateIssue(false)} style={ui.secondaryButton}>Cancel</button>
                  <button onClick={handleCreateIssue} style={ui.primaryButton}>Create</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const spinner = { width: 30, height: 30, border: "2px solid rgba(120,120,120,0.35)", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite" };
const hero = { borderRadius: 16, padding: 16, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" };
const backButton = { display: "inline-flex", alignItems: "center", gap: 6, border: "none", background: "transparent", color: "#7d6d5a", fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 8 };
const eyebrow = { margin: 0, fontSize: 11, letterSpacing: "0.12em", fontWeight: 700 };
const title = { margin: "8px 0 5px", fontSize: "clamp(1.5rem,3vw,2.2rem)", letterSpacing: "-0.02em" };
const subtitle = { margin: 0, fontSize: 13 };
const boardGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 8 };
const columnCard = { borderRadius: 12, padding: 10, minHeight: 520, display: "flex", flexDirection: "column" };
const columnHead = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 };
const countBadge = { minWidth: 22, height: 22, borderRadius: 999, border: "1px solid rgba(120,120,120,0.4)", color: "#9e8d7b", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700 };
const issuesWrap = { display: "grid", gap: 8, alignContent: "start", flex: 1 };
const empty = { borderRadius: 10, border: "1px dashed rgba(120,120,120,0.35)", padding: "14px 10px", fontSize: 12, color: "#9e8d7b", textAlign: "center" };
const issueCard = { borderRadius: 10, border: "1px solid rgba(120,120,120,0.35)", background: "#251d22", padding: 10, cursor: "pointer" };
const issueKey = { margin: 0, fontSize: 11, color: "#9e8d7b", fontWeight: 700 };
const issueTitle = { margin: "5px 0", fontSize: 13, color: "#f4ece0", fontWeight: 600, lineHeight: 1.35 };
const issueMeta = { margin: 0, fontSize: 11, color: "#baa892" };
const deleteButton = { border: "none", background: "transparent", color: "#ef4444", cursor: "pointer", padding: 2 };
const overlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "grid", placeItems: "center", zIndex: 120, padding: 16 };
const modalCard = { width: "min(520px,100%)", borderRadius: 14, padding: 16 };
const formStack = { marginTop: 12, display: "grid", gap: 8 };
const modalButtons = { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 };
const icon14 = { width: 14, height: 14 };

export default KanbanBoard;

