import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeftIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import api from "../services/api";
import "./KanbanBoard.css";

const COLUMN_STATUS_MAP = {
  "to do": "todo",
  todo: "todo",
  backlog: "backlog",
  "in progress": "in_progress",
  "in review": "in_review",
  review: "in_review",
  testing: "testing",
  done: "done",
};

const IN_FLIGHT = ["in progress", "in review", "review", "testing"];

function statusForColumn(columnName) {
  return COLUMN_STATUS_MAP[String(columnName || "").trim().toLowerCase()] || null;
}

function priorityClass(priority) {
  const p = String(priority || "medium").toLowerCase();
  return `kb-pri-${["highest", "high", "medium", "low", "lowest"].includes(p) ? p : "medium"}`;
}

function moveIssueBetweenColumns(previousBoard, issueId, targetColumnId, nextStatus) {
  if (!previousBoard?.columns?.length) return previousBoard;
  let movedIssue = null;
  const strippedColumns = previousBoard.columns.map((column) => {
    const issues = Array.isArray(column.issues) ? column.issues : [];
    const nextIssues = issues.filter((issue) => {
      if (issue.id === issueId) { movedIssue = issue; return false; }
      return true;
    });
    return { ...column, issues: nextIssues, issue_count: nextIssues.length };
  });
  if (!movedIssue) return previousBoard;
  return {
    ...previousBoard,
    columns: strippedColumns.map((column) => {
      if (column.id !== targetColumnId) return column;
      const nextIssues = [{ ...movedIssue, status: nextStatus }, ...(column.issues || [])];
      return { ...column, issues: nextIssues, issue_count: nextIssues.length };
    }),
  };
}

export default function KanbanBoard() {
  const { boardId } = useParams();
  const navigate = useNavigate();

  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [draggedIssue, setDraggedIssue] = useState(null);
  const [showCreateIssue, setShowCreateIssue] = useState(false);
  const [newIssueTitle, setNewIssueTitle] = useState("");
  const [moveError, setMoveError] = useState("");
  const [movingIssueId, setMovingIssueId] = useState(null);

  useEffect(() => { fetchBoard(); }, [boardId]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (movingIssueId === draggedIssue.id) return;
    const status = statusForColumn(column.name);
    if (!status) {
      setMoveError(`Cannot move to "${column.name}": no status mapping configured.`);
      setDraggedIssue(null);
      return;
    }
    if (status === draggedIssue.status) { setMoveError(""); setDraggedIssue(null); return; }

    let previousBoard = null;
    try {
      setMoveError("");
      const issueId = draggedIssue.id;
      previousBoard = board;
      setMovingIssueId(issueId);
      setBoard((current) => moveIssueBetweenColumns(current, issueId, column.id, status));
      setDraggedIssue(null);
      await api.put(`/api/agile/issues/${issueId}/`, { status, transition_comment: `Moved via board to ${column.name}` });
    } catch (error) {
      if (previousBoard) setBoard(previousBoard);
      const responseData = error?.response?.data;
      setMoveError(responseData?.errors?.join(", ") || responseData?.error || responseData?.message || "Failed to move issue.");
      setDraggedIssue(null);
    } finally {
      setMovingIssueId(null);
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
    return <div className="kb"><div className="kb-loading"><div className="kb-spinner" /></div></div>;
  }
  if (!board) {
    return <div className="kb"><div className="kb-missing">Board not found.</div></div>;
  }

  const columns = board.columns || [];
  const colCount = (c) => c.issue_count || (c.issues || []).length || 0;
  const totalIssues = columns.reduce((sum, c) => sum + colCount(c), 0);
  const inFlight = columns.reduce(
    (sum, c) => (IN_FLIGHT.includes(String(c.name || "").toLowerCase()) ? sum + colCount(c) : sum),
    0
  );

  return (
    <div className="kb">
      <button type="button" className="kb-back" onClick={() => navigate(-1)}>
        <ArrowLeftIcon /> Back
      </button>

      <div className="kb-head">
        <div className="kb-title">
          <h1>{board.name}</h1>
          <p className="kb-sub">{board.project_name ? `${board.project_name} · ` : ""}Drag issues across lanes to move work forward.</p>
        </div>
        <div className="kb-head-right">
          <div className="kb-stats">
            <span className="kb-stat"><b>{columns.length}</b><span>Lanes</span></span>
            <span className="kb-stat"><b>{totalIssues}</b><span>Issues</span></span>
            <span className="kb-stat"><b>{inFlight}</b><span>In flight</span></span>
          </div>
          <button type="button" className="kb-btn kb-btn-primary" onClick={() => setShowCreateIssue(true)}>
            <PlusIcon /> New issue
          </button>
        </div>
      </div>

      {moveError ? <div className="kb-error">{moveError}</div> : null}

      {columns.length === 0 ? (
        <div className="kb-missing">No columns on this board yet.</div>
      ) : (
        <div className="kb-board">
          {columns.map((column) => (
            <section
              key={column.id}
              className="kb-col"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(column)}
            >
              <div className="kb-col-head">
                <span className="kb-col-name">{column.name}</span>
                <span className="kb-col-count">{colCount(column)}</span>
              </div>
              <div className="kb-col-body">
                {(column.issues || []).length === 0 ? (
                  <div className="kb-col-empty">Drop issues here</div>
                ) : (
                  (column.issues || []).map((issue) => {
                    const assignee = issue.assignee_name || issue.assignee || "";
                    return (
                      <article
                        key={issue.id}
                        className={`kb-card ${movingIssueId === issue.id ? "is-moving" : ""}`}
                        draggable={movingIssueId !== issue.id}
                        onDragStart={() => setDraggedIssue(issue)}
                        onDragEnd={() => setDraggedIssue(null)}
                        onClick={() => navigate(`/issues/${issue.id}`)}
                      >
                        <div className="kb-card-top">
                          <span className="kb-card-key">{issue.key || `ISS-${issue.id}`}</span>
                          <button
                            type="button"
                            className="kb-del"
                            aria-label="Delete issue"
                            onClick={(e) => { e.stopPropagation(); handleDeleteIssue(issue.id); }}
                          >
                            <TrashIcon />
                          </button>
                        </div>
                        <div className="kb-card-title">{issue.title}</div>
                        <div className="kb-card-meta">
                          <span className={`kb-pri ${priorityClass(issue.priority)}`}>{issue.priority || "medium"}</span>
                          {assignee ? (
                            <span className="kb-assignee">
                              <span className="kb-assignee-mark">{assignee.charAt(0).toUpperCase()}</span>
                              {assignee}
                            </span>
                          ) : null}
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      {showCreateIssue ? (
        <div className="kb-overlay" onMouseDown={() => setShowCreateIssue(false)}>
          <div className="kb-modal" onMouseDown={(e) => e.stopPropagation()}>
            <h3>Create issue</h3>
            <input
              className="atlas-input"
              autoFocus
              value={newIssueTitle}
              onChange={(e) => setNewIssueTitle(e.target.value)}
              placeholder="Issue title"
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateIssue(); }}
            />
            <div className="kb-modal-actions">
              <button type="button" className="kb-btn" onClick={() => setShowCreateIssue(false)}>Cancel</button>
              <button type="button" className="kb-btn kb-btn-primary" onClick={handleCreateIssue} disabled={!newIssueTitle.trim()}>Create</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
