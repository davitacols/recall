import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import { useTheme } from "../utils/ThemeAndAccessibility";

function KanbanBoard() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { darkMode } = useTheme();

  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedIssue, setDraggedIssue] = useState(null);
  const [groupBy, setGroupBy] = useState("assignee");

  const palette = useMemo(
    () =>
      darkMode
        ? {
            bg: "#0f0b0d",
            card: "#171215",
            border: "rgba(255,225,193,0.14)",
            text: "#f4ece0",
            muted: "#baa892",
          }
        : {
            bg: "#f6f1ea",
            card: "#fffaf3",
            border: "#eadfce",
            text: "#231814",
            muted: "#7d6d5a",
          },
    [darkMode]
  );

  const statuses = ["todo", "in_progress", "in_review", "testing", "done"];

  useEffect(() => {
    fetchIssues();
  }, [projectId]);

  const fetchIssues = async () => {
    try {
      const response = await api.get(`/api/agile/projects/${projectId}/backlog/`);
      const sprintIssues = (response.data.issues || []).filter((issue) => issue.sprint_id != null);
      setIssues(sprintIssues);
    } catch (error) {
      console.error("Failed to fetch issues:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = async (status) => {
    if (!draggedIssue) return;
    try {
      await api.put(`/api/agile/issues/${draggedIssue.id}/`, { status });
      setDraggedIssue(null);
      fetchIssues();
    } catch (error) {
      console.error("Failed to move issue:", error);
      setDraggedIssue(null);
    }
  };

  const getLanes = () => {
    if (groupBy !== "assignee") return [{ id: "all", name: "All", issues }];
    const names = [...new Set(issues.map((issue) => issue.assignee_name || "Unassigned"))];
    return names.map((name) => ({ id: name, name, issues: issues.filter((issue) => (issue.assignee_name || "Unassigned") === name) }));
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: palette.bg, display: "grid", placeItems: "center" }}>
        <div style={spinner} />
      </div>
    );
  }

  const lanes = getLanes();

  return (
    <div style={{ minHeight: "100vh", background: palette.bg }}>
      <div style={container}>
        <section style={{ ...hero, background: palette.card, border: `1px solid ${palette.border}` }}>
          <div>
            <p style={{ ...eyebrow, color: palette.muted }}>KANBAN VIEW</p>
            <h1 style={{ ...title, color: palette.text }}>Sprint Board</h1>
            <p style={{ ...subtitle, color: palette.muted }}>{issues.length} active sprint issues</p>
          </div>
          <div style={switches}>
            <button onClick={() => setGroupBy("assignee")} style={groupBy === "assignee" ? activePill : pill}>By Assignee</button>
            <button onClick={() => setGroupBy("none")} style={groupBy === "none" ? activePill : pill}>No Lanes</button>
          </div>
        </section>

        <div style={{ overflowX: "auto" }}>
          {lanes.map((lane) => (
            <section key={lane.id} style={laneWrap}>
              <div style={laneHead}>{lane.name}</div>
              {statuses.map((status) => {
                const colIssues = lane.issues.filter((issue) => issue.status === status);
                return (
                  <article key={`${lane.id}-${status}`} style={column} onDragOver={(event) => event.preventDefault()} onDrop={() => handleDrop(status)}>
                    <div style={columnHead}>{status.replace("_", " ")} ({colIssues.length})</div>
                    <div style={list}>
                      {colIssues.map((issue) => (
                        <button
                          key={issue.id}
                          draggable
                          onDragStart={() => setDraggedIssue(issue)}
                          onDragEnd={() => setDraggedIssue(null)}
                          onClick={() => navigate(`/issues/${issue.id}`)}
                          style={issueCard}
                        >
                          <p style={issueKey}>{issue.key || `ISS-${issue.id}`}</p>
                          <p style={issueTitle}>{issue.title}</p>
                        </button>
                      ))}
                    </div>
                  </article>
                );
              })}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

const container = { maxWidth: 1500, margin: "0 auto", padding: 20 };
const spinner = { width: 30, height: 30, border: "2px solid rgba(120,120,120,0.35)", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite" };
const hero = { borderRadius: 16, padding: 16, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" };
const eyebrow = { margin: 0, fontSize: 11, letterSpacing: "0.12em", fontWeight: 700 };
const title = { margin: "8px 0 5px", fontSize: "clamp(1.5rem,3vw,2.2rem)", letterSpacing: "-0.02em" };
const subtitle = { margin: 0, fontSize: 13 };
const switches = { display: "flex", gap: 6, flexWrap: "wrap" };
const pill = { border: "1px solid rgba(120,120,120,0.45)", borderRadius: 999, padding: "6px 10px", fontSize: 12, fontWeight: 700, color: "#7d6d5a", background: "transparent", cursor: "pointer" };
const activePill = { ...pill, color: "#20140f", border: "1px solid #ff9f62", background: "linear-gradient(135deg,#ffd390,#ff9f62)" };
const laneWrap = { display: "grid", gridTemplateColumns: "180px repeat(5, minmax(210px, 1fr))", gap: 8, marginBottom: 8, minWidth: 1250 };
const laneHead = { borderRadius: 10, border: "1px solid rgba(120,120,120,0.3)", background: "#171215", padding: 10, color: "#f4ece0", fontWeight: 700, fontSize: 13 };
const column = { borderRadius: 10, border: "1px solid rgba(120,120,120,0.3)", background: "#171215", padding: 8, minHeight: 110 };
const columnHead = { color: "#baa892", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 8 };
const list = { display: "grid", gap: 8 };
const issueCard = { borderRadius: 9, border: "1px solid rgba(120,120,120,0.3)", background: "#251d22", padding: 9, cursor: "pointer", textAlign: "left" };
const issueKey = { margin: 0, fontSize: 11, color: "#9e8d7b", fontWeight: 700 };
const issueTitle = { margin: "4px 0 0", fontSize: 13, color: "#f4ece0", fontWeight: 600, lineHeight: 1.35 };

export default KanbanBoard;

