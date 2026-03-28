import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeftIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import api from "../services/api";
import { WorkspaceEmptyState, WorkspaceHero, WorkspacePanel, WorkspaceToolbar } from "../components/WorkspaceChrome";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";
import { createPlainTextPreview } from "../utils/textPreview";

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

function statusForColumn(columnName) {
  return COLUMN_STATUS_MAP[String(columnName || "").trim().toLowerCase()] || null;
}

function moveIssueBetweenColumns(previousBoard, issueId, targetColumnId, nextStatus) {
  if (!previousBoard?.columns?.length) return previousBoard;

  let movedIssue = null;
  const strippedColumns = previousBoard.columns.map((column) => {
    const issues = Array.isArray(column.issues) ? column.issues : [];
    const nextIssues = issues.filter((issue) => {
      if (issue.id === issueId) {
        movedIssue = issue;
        return false;
      }
      return true;
    });
    return {
      ...column,
      issues: nextIssues,
      issue_count: nextIssues.length,
    };
  });

  if (!movedIssue) return previousBoard;

  return {
    ...previousBoard,
    columns: strippedColumns.map((column) => {
      if (column.id !== targetColumnId) {
        return column;
      }
      const nextIssues = [{ ...movedIssue, status: nextStatus }, ...(column.issues || [])];
      return {
        ...column,
        issues: nextIssues,
        issue_count: nextIssues.length,
      };
    }),
  };
}

function KanbanBoard() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const { darkMode } = useTheme();

  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [draggedIssue, setDraggedIssue] = useState(null);
  const [showCreateIssue, setShowCreateIssue] = useState(false);
  const [newIssueTitle, setNewIssueTitle] = useState("");
  const [moveError, setMoveError] = useState("");
  const [movingIssueId, setMovingIssueId] = useState(null);

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
    if (movingIssueId === draggedIssue.id) return;

    const status = statusForColumn(column.name);
    if (!status) {
      setMoveError(`Cannot move to "${column.name}": no status mapping configured.`);
      setDraggedIssue(null);
      return;
    }
    if (status === draggedIssue.status) {
      setMoveError("");
      setDraggedIssue(null);
      return;
    }

    let previousBoard = null;
    try {
      setMoveError("");
      const issueId = draggedIssue.id;
      const transitionComment = `Moved via board to ${column.name}`;
      previousBoard = board;
      setMovingIssueId(issueId);
      setBoard((current) => moveIssueBetweenColumns(current, issueId, column.id, status));
      setDraggedIssue(null);
      await api.put(`/api/agile/issues/${issueId}/`, {
        status,
        transition_comment: transitionComment,
      });
    } catch (error) {
      console.error("Failed to move issue:", error);
      if (previousBoard) {
        setBoard(previousBoard);
      }
      const responseData = error?.response?.data;
      const detail =
        responseData?.errors?.join(", ") ||
        responseData?.error ||
        responseData?.message ||
        "Failed to move issue.";
      setMoveError(detail);
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
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div style={spinner} />
      </div>
    );
  }

  if (!board) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <p style={{ color: palette.muted }}>Board not found.</p>
      </div>
    );
  }

  const columns = board.columns || [];
  const totalIssues = columns.reduce((sum, column) => sum + (column.issue_count || (column.issues || []).length || 0), 0);
  const activeColumns = columns.filter((column) => (column.issue_count || (column.issues || []).length || 0) > 0).length;
  const inFlightIssues = columns.reduce(
    (sum, column) =>
      ["in progress", "in review", "review", "testing"].includes(String(column.name || "").toLowerCase())
        ? sum + (column.issue_count || (column.issues || []).length || 0)
        : sum,
    0,
  );
  const boardPulse = moveError
    ? "A recent move needs attention before the board flow is fully healthy again."
    : inFlightIssues > 0
      ? `${inFlightIssues} issue${inFlightIssues === 1 ? "" : "s"} are currently moving through active execution lanes.`
      : "Board is configured and ready for work to move through execution.";

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={ui.container}>
        <button onClick={() => navigate(-1)} style={backButton}>
          <ArrowLeftIcon style={icon14} /> Back
        </button>

        <WorkspaceHero
          palette={palette}
          darkMode={darkMode}
          eyebrow="Kanban Board"
          title={board.name}
          description={`Run execution from one board view for ${board.project_name || "this project"}, with drag-based status changes and clearer in-flight visibility.`}
          stats={[
            { label: "Columns", value: columns.length, helper: "Tracked workflow lanes in this board." },
            { label: "Issues", value: totalIssues, helper: "All issues currently on the board." },
            { label: "In flight", value: inFlightIssues, helper: "Issues moving through active execution lanes." },
            { label: "Active lanes", value: activeColumns, helper: "Columns that currently contain work." },
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
              <p style={{ ...spotlightEyebrow, color: palette.muted }}>Board pulse</p>
              <h3 style={{ margin: 0, fontSize: 22, lineHeight: 1.05, color: palette.text }}>
                {moveError ? "Move needs attention" : `${totalIssues} items in motion`}
              </h3>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: palette.muted }}>{boardPulse}</p>
            </div>
          }
          actions={
            <button onClick={() => setShowCreateIssue(true)} className="ui-btn-polish ui-focus-ring" style={ui.primaryButton}>
              <PlusIcon style={icon14} /> New Issue
            </button>
          }
        />

        <WorkspaceToolbar palette={palette}>
          <div style={toolbarLayout}>
            <div style={toolbarIntro}>
              <p style={{ ...toolbarEyebrow, color: palette.muted }}>Board guide</p>
              <h2 style={{ ...toolbarTitle, color: palette.text }}>Drag issues across execution lanes and watch the flow stay grounded in context</h2>
              <p style={{ ...toolbarCopy, color: palette.muted }}>
                Use this board as the live execution surface for delivery. Moves are applied immediately and synced back into the project record.
              </p>
            </div>
            <div style={toolbarChipRail}>
              <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                Drag between columns
              </span>
              <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                {movingIssueId ? "Move in progress" : "Board ready"}
              </span>
              <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                {columns.length} execution lanes
              </span>
            </div>
            {moveError ? (
              <div style={{ ...errorBanner, border: `1px solid ${palette.danger}`, background: palette.accentSoft, color: palette.danger }}>
                {moveError}
              </div>
            ) : null}
          </div>
        </WorkspaceToolbar>

        <WorkspacePanel
          palette={palette}
          eyebrow="Execution lanes"
          title="Board flow"
          description="Each lane reflects live issue status. Open an issue for detail, or drag it to move execution forward."
        >
          {columns.length === 0 ? (
            <WorkspaceEmptyState
              palette={palette}
              title="No columns on this board"
              description="Create board columns first so work can move through a defined execution flow."
            />
          ) : (
            <section style={boardLane}>
              {columns.map((column) => (
                <article key={column.id} style={{ ...columnCard, background: palette.cardAlt, border: `1px solid ${palette.border}` }}>
                  <div style={columnHead}>
                    <div style={{ display: "grid", gap: 4 }}>
                      <h2 style={{ margin: 0, fontSize: 13, color: palette.text, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        {column.name}
                      </h2>
                      <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>
                        {(column.issue_count || (column.issues || []).length || 0) === 0 ? "Open lane" : "Work currently in this lane"}
                      </p>
                    </div>
                    <span style={{ ...countBadge, border: `1px solid ${palette.border}`, color: palette.text, background: palette.card }}>
                      {column.issue_count || (column.issues || []).length || 0}
                    </span>
                  </div>

                  <div
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => handleDrop(column)}
                    style={issuesWrap}
                  >
                    {(column.issues || []).length === 0 ? (
                      <WorkspaceEmptyState
                        palette={palette}
                        title="No issues"
                        description="Drop an issue here when it reaches this execution stage."
                      />
                    ) : (
                      (column.issues || []).map((issue) => (
                        <article
                          key={issue.id}
                          className="ui-card-lift ui-smooth"
                          draggable={movingIssueId !== issue.id}
                          onDragStart={() => setDraggedIssue(issue)}
                          onDragEnd={() => setDraggedIssue(null)}
                          onClick={() => navigate(`/issues/${issue.id}`)}
                          style={{
                            ...issueCard,
                            opacity: movingIssueId === issue.id ? 0.55 : 1,
                            border: `1px solid ${palette.border}`,
                            background: palette.card,
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                            <div style={{ minWidth: 0, display: "grid", gap: 6 }}>
                              <p style={{ ...issueKey, color: palette.muted }}>{issue.key || `ISS-${issue.id}`}</p>
                              <p style={{ ...issueTitle, color: palette.text }}>{issue.title}</p>
                            </div>
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDeleteIssue(issue.id);
                              }}
                              style={{ ...deleteButton, color: palette.danger }}
                            >
                              <TrashIcon style={icon14} />
                            </button>
                          </div>
                          <p style={{ ...issuePreview, color: palette.muted }}>
                            {createPlainTextPreview(issue.description || issue.summary || "", "No issue brief added yet.", 140)}
                          </p>
                          <div style={metaRail}>
                            <span style={{ ...metaChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                              {issue.assignee || issue.assignee_name || "Unassigned"}
                            </span>
                            <span style={{ ...metaChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                              {issue.priority || "medium"}
                            </span>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                </article>
              ))}
            </section>
          )}
        </WorkspacePanel>

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

const spinner = { width: 30, height: 30, border: "2px solid var(--ui-border)", borderTopColor: "var(--ui-accent)", borderRadius: "50%", animation: "spin 1s linear infinite" };
const backButton = { display: "inline-flex", alignItems: "center", gap: 6, border: "none", background: "transparent", color: "var(--ui-muted)", fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 8 };
const spotlightCard = { minWidth: 240, borderRadius: 24, padding: 16, display: "grid", gap: 10 };
const spotlightEyebrow = { margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" };
const toolbarLayout = { display: "grid", gap: 14 };
const toolbarIntro = { display: "grid", gap: 4 };
const toolbarEyebrow = { margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" };
const toolbarTitle = { margin: 0, fontSize: 24, lineHeight: 1.04 };
const toolbarCopy = { margin: 0, fontSize: 13, lineHeight: 1.65, maxWidth: 760 };
const toolbarChipRail = { display: "flex", gap: 8, flexWrap: "wrap" };
const toolbarChip = { display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "8px 12px", fontSize: 12, fontWeight: 700 };
const errorBanner = { borderRadius: 18, padding: "10px 12px", fontSize: 12, fontWeight: 700 };
const boardLane = { display: "grid", gridAutoFlow: "column", gridAutoColumns: "minmax(300px, 360px)", gap: 12, overflowX: "auto", overflowY: "hidden", paddingBottom: 4, alignItems: "start" };
const columnCard = { borderRadius: 24, padding: 12, minHeight: 520, display: "flex", flexDirection: "column", minWidth: 300 };
const columnHead = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 };
const countBadge = { minWidth: 28, height: 28, borderRadius: 999, display: "grid", placeItems: "center", fontSize: 11, fontWeight: 800 };
const issuesWrap = { display: "grid", gap: 8, alignContent: "start", flex: 1 };
const issueCard = { borderRadius: 20, padding: 12, cursor: "pointer", display: "grid", gap: 10 };
const issueKey = { margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" };
const issueTitle = { margin: 0, fontSize: 15, fontWeight: 700, lineHeight: 1.3 };
const issuePreview = { margin: 0, fontSize: 12, lineHeight: 1.6 };
const metaRail = { display: "flex", gap: 8, flexWrap: "wrap" };
const metaChip = { display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "7px 10px", fontSize: 11, fontWeight: 700, textTransform: "capitalize" };
const deleteButton = { border: "none", background: "transparent", cursor: "pointer", padding: 2 };
const overlay = { position: "fixed", inset: 0, background: "rgba(5,12,20,0.62)", display: "grid", placeItems: "center", zIndex: 120, padding: 16 };
const modalCard = { width: "min(520px,100%)", borderRadius: 0, padding: 16 };
const formStack = { marginTop: 12, display: "grid", gap: 8 };
const modalButtons = { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 };
const icon14 = { width: 14, height: 14 };

export default KanbanBoard;

