import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  AdjustmentsHorizontalIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  Bars3Icon,
  CheckCircleIcon,
  ChevronDownIcon,
  ExclamationTriangleIcon,
  EllipsisHorizontalIcon,
  PlusIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";
import {
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  EmptyState,
  IconButton,
  Lozenge,
  SectionMessage,
} from "./atlas";
import { statusToLozenge } from "../utils/designTokens";
import IssueDetail from "./IssueDetail";

const PRIORITY_COLORS = {
  highest: "var(--r500)",
  high: "var(--r400)",
  medium: "var(--y400)",
  low: "var(--g400)",
  lowest: "var(--g500)",
};

const STATUS_MAP = {
  "to do": "todo",
  todo: "todo",
  "in progress": "in_progress",
  "in review": "in_review",
  review: "in_review",
  testing: "testing",
  done: "done",
  backlog: "backlog",
};

function priorityArrow(p) {
  const key = String(p || "").toLowerCase();
  if (["highest", "high"].includes(key)) {
    return <ArrowUpIcon style={{ width: 12, height: 12, color: PRIORITY_COLORS[key] || "var(--r400)" }} />;
  }
  if (["low", "lowest"].includes(key)) {
    return <ArrowDownIcon style={{ width: 12, height: 12, color: PRIORITY_COLORS[key] || "var(--g400)" }} />;
  }
  return <Bars3Icon style={{ width: 12, height: 12, color: PRIORITY_COLORS.medium }} />;
}

function typeBadge(type) {
  const t = String(type || "task").toLowerCase();
  const map = {
    bug: { bg: "var(--r400)", icon: <ExclamationTriangleIcon style={{ width: 10, height: 10, color: "#FFFFFF" }} /> },
    story: { bg: "var(--g400)", icon: <CheckCircleIcon style={{ width: 10, height: 10, color: "#FFFFFF" }} /> },
    task: { bg: "var(--b400)", icon: <CheckCircleIcon style={{ width: 10, height: 10, color: "#FFFFFF" }} /> },
    epic: { bg: "var(--p400)", icon: <CheckCircleIcon style={{ width: 10, height: 10, color: "#FFFFFF" }} /> },
  };
  const entry = map[t] || map.task;
  return (
    <span
      title={t}
      style={{
        width: 16,
        height: 16,
        borderRadius: 3,
        background: entry.bg,
        display: "inline-grid",
        placeItems: "center",
        flexShrink: 0,
      }}
    >
      {entry.icon}
    </span>
  );
}

function KanbanBoard() {
  const { boardId } = useParams();
  const [board, setBoard] = useState(null);
  const [columns, setColumns] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedIssue, setDraggedIssue] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [selectedIssueId, setSelectedIssueId] = useState(null);
  const [moveError, setMoveError] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchBoard();
  }, [boardId]);

  const fetchBoard = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/agile/boards/${boardId}/`);
      setBoard(res.data);
      setColumns(res.data.columns || []);
      const flat = [];
      (res.data.columns || []).forEach((col) => {
        (col.issues || []).forEach((issue) => {
          flat.push({ ...issue, column_id: col.id });
        });
      });
      setIssues(flat);
    } catch (err) {
      console.error("Failed to fetch board:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e, issue) => {
    setDraggedIssue(issue);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, columnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => setDragOverColumn(null);

  const handleDrop = async (e, columnId) => {
    e.preventDefault();
    setDragOverColumn(null);
    if (!draggedIssue) return;

    const column = columns.find((c) => c.id === columnId);
    const newStatus = STATUS_MAP[String(column?.name || "").trim().toLowerCase()];
    if (!newStatus) {
      setMoveError(`Cannot move to "${column?.name || "unknown"}": unsupported column status mapping.`);
      setDraggedIssue(null);
      return;
    }
    if (newStatus === draggedIssue.status) {
      setMoveError("");
      setDraggedIssue(null);
      return;
    }

    setMoveError("");
    const transitionComment = `Moved via board to ${column?.name || "column"}`;
    try {
      try {
        const validation = await api.post(`/api/agile/issues/${draggedIssue.id}/validate-transition/`, {
          status: newStatus,
          transition_comment: transitionComment,
        });
        if (validation?.data?.valid === false) {
          const details = validation.data.errors?.join(", ") || validation.data.message || "Invalid workflow transition";
          setMoveError(details);
          setDraggedIssue(null);
          return;
        }
      } catch (_) {
        // optional endpoint
      }
      await api.put(`/api/agile/issues/${draggedIssue.id}/`, {
        status: newStatus,
        transition_comment: transitionComment,
      });
      setDraggedIssue(null);
      await fetchBoard();
    } catch (err) {
      const responseData = err?.response?.data;
      const details =
        responseData?.errors?.join(", ") ||
        responseData?.error ||
        responseData?.message ||
        "Failed to move issue.";
      setMoveError(details);
      setDraggedIssue(null);
    }
  };

  const visibleIssues = useMemo(() => {
    const q = search.trim().toLowerCase();
    return issues.filter((iss) => {
      if (onlyMine && iss.assignee_id && iss.assignee_id !== window.__currentUserId) return false;
      if (!q) return true;
      const hay = `${iss.key || ""} ${iss.title || ""} ${iss.summary || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [issues, search, onlyMine]);

  const issuesForColumn = (columnId) => visibleIssues.filter((i) => i.column_id === columnId);

  const handleCreateIssue = () => {
    window.location.href = `/issues/new?boardId=${boardId}`;
  };

  if (loading) {
    return (
      <div style={{ padding: 32 }}>
        <div style={{ height: 40, width: 240, background: "var(--n30)", borderRadius: 4, marginBottom: 16 }} />
        <div style={{ display: "flex", gap: 12 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ flex: 1, height: 380, background: "var(--n20)", borderRadius: 4 }} />
          ))}
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <div style={{ padding: 32 }}>
        <EmptyState title="Board not found" description="Check the URL or pick a board from your projects list." />
      </div>
    );
  }

  return (
    <div style={{ padding: "0 32px 32px", display: "flex", flexDirection: "column", minHeight: "100%" }}>
      {/* Header */}
      <div style={{ padding: "24px 0 12px" }}>
        <Breadcrumb
          items={[
            { label: "Projects", to: "/projects" },
            { label: board.project_name || board.project_slug || "Project" },
            { label: board.name },
          ]}
        />
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginTop: 4 }}>
          <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 6 }}>
            <h1 style={{ fontSize: 24, fontWeight: 500, lineHeight: 1.16, margin: 0, color: "var(--app-text)" }}>
              {board.name}
            </h1>
            <IconButton
              icon={<StarIcon style={{ width: 16, height: 16 }} />}
              label="Star board"
              size={28}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Button appearance="subtle" iconBefore={<AdjustmentsHorizontalIcon style={{ width: 14, height: 14 }} />}>
              Group
            </Button>
            <Button
              appearance="primary"
              iconBefore={<PlusIcon style={{ width: 14, height: 14 }} />}
              onClick={handleCreateIssue}
            >
              Create
            </Button>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div style={filterBar}>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search this board"
          className="atlas-input"
          style={{ width: 220 }}
        />
        <span style={{ display: "flex", marginLeft: 8 }}>
          {[1, 2, 3].map((i) => (
            <span
              key={i}
              style={{
                width: 28,
                height: 28,
                marginLeft: -6,
                borderRadius: "50%",
                border: "2px solid var(--app-surface)",
                background: ["#0052CC", "#00875A", "#5243AA"][i - 1],
                display: "inline-grid",
                placeItems: "center",
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: 11,
              }}
            >
              {String.fromCharCode(64 + i)}
            </span>
          ))}
        </span>
        <Button
          appearance={onlyMine ? "primary" : "subtle"}
          size="sm"
          onClick={() => setOnlyMine((v) => !v)}
        >
          Only my issues
        </Button>
        <Button appearance="subtle" size="sm" iconAfter={<ChevronDownIcon style={{ width: 12, height: 12 }} />}>
          Epic
        </Button>
        <Button appearance="subtle" size="sm" iconAfter={<ChevronDownIcon style={{ width: 12, height: 12 }} />}>
          Type
        </Button>
        <span style={{ flex: 1 }} />
        <IconButton icon={<EllipsisHorizontalIcon style={{ width: 16, height: 16 }} />} label="Board actions" />
      </div>

      {moveError ? (
        <SectionMessage tone="error" style={{ marginBottom: 12 }}>
          {moveError}
        </SectionMessage>
      ) : null}

      {/* Columns */}
      <div style={boardScroll}>
        <div style={{ ...columnRow, gridTemplateColumns: `repeat(${columns.length}, minmax(272px, 1fr))` }}>
          {columns.map((column) => {
            const list = issuesForColumn(column.id);
            const wip = column.wip_limit || column.wipLimit || null;
            const overWip = wip && list.length > wip;
            const isOver = dragOverColumn === column.id;
            return (
              <div
                key={column.id}
                style={{
                  ...columnStyle,
                  background: isOver ? "var(--b50)" : "var(--app-surface-alt)",
                }}
              >
                <div style={columnHeader}>
                  <span style={columnTitle}>
                    {column.name}
                  </span>
                  <span style={{ ...columnCount, color: overWip ? "var(--r500)" : "var(--app-muted)" }}>
                    {list.length}{wip ? ` / ${wip}` : ""}
                  </span>
                </div>
                <div
                  onDragOver={(e) => handleDragOver(e, column.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, column.id)}
                  style={columnBody}
                >
                  {list.map((issue) => (
                    <IssueCard
                      key={issue.id}
                      issue={issue}
                      onDragStart={handleDragStart}
                      onClick={() => setSelectedIssueId(issue.id)}
                    />
                  ))}
                  {list.length === 0 ? (
                    <div style={emptyColumn}>Drop issues here</div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedIssueId ? (
        <IssueDetail
          issueId={selectedIssueId}
          onClose={() => {
            setSelectedIssueId(null);
            fetchBoard();
          }}
          onUpdate={fetchBoard}
        />
      ) : null}
    </div>
  );
}

function IssueCard({ issue, onDragStart, onClick }) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, issue)}
      onClick={onClick}
      style={cardStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "var(--ui-shadow-md)";
        e.currentTarget.style.background = "var(--app-surface-hover, var(--app-surface))";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "var(--ui-shadow-sm)";
        e.currentTarget.style.background = "var(--app-surface)";
      }}
    >
      <p style={cardSummary}>{issue.title || issue.summary}</p>
      {Array.isArray(issue.labels) && issue.labels.length ? (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
          {issue.labels.slice(0, 3).map((l) => (
            <Lozenge key={l} variant="default">
              {l}
            </Lozenge>
          ))}
        </div>
      ) : null}
      <div style={cardFooter}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          {typeBadge(issue.issue_type || issue.type)}
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--app-muted)", fontFamily: "var(--font-mono)" }}>
            {issue.key || `#${issue.id}`}
          </span>
          {priorityArrow(issue.priority)}
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {issue.story_points ? (
            <span style={storyPoints}>{issue.story_points}</span>
          ) : null}
          <Avatar size="small" name={issue.assignee_name || issue.assignee || "Unassigned"} src={issue.assignee_avatar} />
        </div>
      </div>
    </div>
  );
}

const filterBar = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 0 16px",
};

const boardScroll = {
  flex: 1,
  overflowX: "auto",
  paddingBottom: 16,
};

const columnRow = {
  display: "grid",
  gap: 8,
  alignItems: "start",
};

const columnStyle = {
  borderRadius: 4,
  background: "var(--app-surface-alt)",
  border: "1px solid transparent",
  display: "flex",
  flexDirection: "column",
  maxHeight: "calc(100vh - 240px)",
  minHeight: 200,
};

const columnHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "8px 12px",
  gap: 8,
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
};

const columnBody = {
  flex: 1,
  padding: "4px 8px 8px",
  display: "flex",
  flexDirection: "column",
  gap: 8,
  overflowY: "auto",
};

const cardStyle = {
  background: "var(--app-surface)",
  border: "1px solid var(--app-border)",
  borderRadius: 3,
  padding: "10px 12px",
  cursor: "pointer",
  boxShadow: "var(--ui-shadow-sm)",
  transition: "box-shadow 100ms ease, transform 100ms ease",
};

const cardSummary = {
  margin: "0 0 8px",
  fontSize: 14,
  lineHeight: 1.4286,
  color: "var(--app-text)",
};

const cardFooter = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
};

const storyPoints = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 20,
  height: 20,
  padding: "0 6px",
  fontSize: 11,
  fontWeight: 700,
  color: "var(--n700)",
  background: "var(--n30)",
  borderRadius: 10,
};

const emptyColumn = {
  padding: "16px 8px",
  textAlign: "center",
  fontSize: 12,
  color: "var(--app-text-disabled)",
  border: "1px dashed var(--app-border)",
  borderRadius: 3,
};

export default KanbanBoard;
