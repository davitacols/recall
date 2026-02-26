import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import api from "../services/api";

function SprintDetail() {
  const { darkMode } = useTheme();
  const { id } = useParams();
  const navigate = useNavigate();

  const [sprint, setSprint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [draggedIssue, setDraggedIssue] = useState(null);
  const [autopilot, setAutopilot] = useState(null);
  const [autopilotLoading, setAutopilotLoading] = useState(false);
  const [autopilotApplying, setAutopilotApplying] = useState(false);
  const [autopilotMessage, setAutopilotMessage] = useState("");

  const palette = useMemo(
    () =>
      darkMode
        ? {
            bg: "#0f0b0d",
            card: "#171215",
            cardAlt: "#1f181c",
            border: "rgba(255,225,193,0.14)",
            text: "#f4ece0",
            muted: "#baa892",
          }
        : {
            bg: "#f6f1ea",
            card: "#fffaf3",
            cardAlt: "#ffffff",
            border: "#eadfce",
            text: "#231814",
            muted: "#7d6d5a",
          },
    [darkMode]
  );

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [sprintRes, autopilotRes] = await Promise.all([
        api.get(`/api/agile/sprints/${id}/detail/`),
        api.get(`/api/agile/sprints/${id}/autopilot/`),
      ]);
      setSprint(sprintRes.data.data || sprintRes.data);
      setAutopilot(autopilotRes.data || null);
    } catch (error) {
      console.error("Failed to fetch sprint:", error);
      setSprint(null);
      setAutopilot(null);
    } finally {
      setLoading(false);
      setAutopilotLoading(false);
    }
  };

  const refreshAutopilot = async () => {
    setAutopilotLoading(true);
    try {
      const response = await api.get(`/api/agile/sprints/${id}/autopilot/`);
      setAutopilot(response.data || null);
    } catch (error) {
      console.error("Failed to refresh autopilot:", error);
    } finally {
      setAutopilotLoading(false);
    }
  };

  const handleDrop = async (status) => {
    if (!draggedIssue) return;
    try {
      await api.put(`/api/agile/issues/${draggedIssue.id}/`, { status });
      setDraggedIssue(null);
      fetchData();
    } catch (error) {
      console.error("Failed to update issue:", error);
      setDraggedIssue(null);
    }
  };

  const applyAutopilotPlan = async () => {
    if (!autopilot) return;
    setAutopilotApplying(true);
    setAutopilotMessage("");
    try {
      const dropIds = (autopilot.scope_swap?.suggested_drops || []).map((item) => item.issue_id);
      const addIds = (autopilot.scope_swap?.suggested_adds || []).map((item) => item.issue_id);
      const response = await api.post(`/api/agile/sprints/${id}/autopilot/apply/`, {
        drop_issue_ids: dropIds,
        add_issue_ids: addIds,
        create_decision_followups: true,
      });
      setAutopilotMessage(
        `Applied plan: dropped ${response.data?.dropped_count || 0}, added ${response.data?.added_count || 0}, follow-ups ${response.data?.followups_created || 0}.`
      );
      await fetchData();
    } catch (error) {
      setAutopilotMessage(error?.response?.data?.error || "Failed to apply autopilot plan.");
    } finally {
      setAutopilotApplying(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: palette.bg, display: "grid", placeItems: "center" }}>
        <div style={spinner} />
      </div>
    );
  }

  if (!sprint) {
    return (
      <div style={{ minHeight: "100vh", background: palette.bg, display: "grid", placeItems: "center" }}>
        <h2 style={{ color: palette.muted }}>Sprint not found</h2>
      </div>
    );
  }

  const issues = sprint.issues || [];
  const progress = sprint.issue_count > 0 ? Math.round(((sprint.completed || 0) / sprint.issue_count) * 100) : 0;
  const statuses = ["backlog", "todo", "in_progress", "in_review", "testing", "done"];

  return (
    <div style={{ minHeight: "100vh", background: palette.bg }}>
      <div style={container}>
        <button onClick={() => navigate(-1)} style={backButton}>
          <ArrowLeftIcon style={icon14} /> Back
        </button>

        <section style={{ ...hero, background: palette.card, border: `1px solid ${palette.border}` }}>
          <div>
            <p style={{ ...eyebrow, color: palette.muted }}>SPRINT DETAIL</p>
            <h1 style={{ ...title, color: palette.text }}>{sprint.name}</h1>
            <p style={{ ...sub, color: palette.muted }}>
              {sprint.start_date} - {sprint.end_date} | {sprint.project_name}
            </p>
            {sprint.goal && <p style={{ ...sub, marginTop: 8, color: palette.muted }}>Goal: {sprint.goal}</p>}
          </div>
          <div style={topRight}>
            <span style={statusPill}>{progress}% complete</span>
            <Link to="/sprint-management" style={secondaryButton}>Sprint Management</Link>
          </div>
        </section>

        <section style={statsGrid}>
          <Metric label="Total" value={sprint.issue_count || 0} />
          <Metric label="Done" value={sprint.completed || 0} />
          <Metric label="In Progress" value={sprint.in_progress || 0} />
          <Metric label="Blocked" value={sprint.blocked || 0} />
          <Metric label="Decisions" value={sprint.decisions || 0} />
        </section>

        <section style={{ ...progressCard, background: palette.card, border: `1px solid ${palette.border}`, display: "grid", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <p style={{ margin: 0, fontSize: 11, color: palette.muted, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>
                Decision-Coupled Sprint Autopilot
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 16, color: palette.text, fontWeight: 800 }}>
                Goal Probability: {autopilot ? `${autopilot.goal_probability}%` : "--"}
              </p>
              {autopilot && (
                <p style={{ margin: "4px 0 0", fontSize: 12, color: palette.muted }}>
                  Confidence: {(autopilot.confidence_band || "low").toUpperCase()} | Unresolved decisions: {autopilot.signals?.unresolved_decisions || 0}
                </p>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={refreshAutopilot} disabled={autopilotLoading} style={secondaryButton}>
                {autopilotLoading ? "Refreshing..." : "Refresh Autopilot"}
              </button>
              <button onClick={applyAutopilotPlan} disabled={autopilotApplying || !autopilot} style={secondaryButton}>
                {autopilotApplying ? "Applying..." : "Apply Autopilot Plan"}
              </button>
            </div>
          </div>
          {autopilotMessage && (
            <p style={{ margin: 0, fontSize: 12, color: autopilotMessage.startsWith("Failed") ? "#ef4444" : "#10b981" }}>
              {autopilotMessage}
            </p>
          )}
          {autopilot?.risks?.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: 18, color: palette.muted, fontSize: 12 }}>
              {autopilot.risks.slice(0, 3).map((risk, idx) => (
                <li key={idx}>{risk}</li>
              ))}
            </ul>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 8 }}>
            <div style={{ border: `1px solid ${palette.border}`, borderRadius: 10, padding: 9 }}>
              <p style={{ margin: "0 0 6px", fontSize: 12, color: palette.text, fontWeight: 700 }}>Scope Swap: Suggested Drops</p>
              {(autopilot?.scope_swap?.suggested_drops || []).slice(0, 3).map((item) => (
                <p key={item.issue_id} style={{ margin: "0 0 4px", fontSize: 11, color: palette.muted }}>
                  {item.key}: {item.title}
                </p>
              ))}
              {(autopilot?.scope_swap?.suggested_drops || []).length === 0 && (
                <p style={{ margin: 0, fontSize: 11, color: palette.muted }}>No drops suggested.</p>
              )}
            </div>
            <div style={{ border: `1px solid ${palette.border}`, borderRadius: 10, padding: 9 }}>
              <p style={{ margin: "0 0 6px", fontSize: 12, color: palette.text, fontWeight: 700 }}>Scope Swap: Suggested Adds</p>
              {(autopilot?.scope_swap?.suggested_adds || []).slice(0, 3).map((item) => (
                <p key={item.issue_id} style={{ margin: "0 0 4px", fontSize: 11, color: palette.muted }}>
                  {item.key}: {item.title}
                </p>
              ))}
              {(autopilot?.scope_swap?.suggested_adds || []).length === 0 && (
                <p style={{ margin: 0, fontSize: 11, color: palette.muted }}>No adds suggested.</p>
              )}
            </div>
            <div style={{ border: `1px solid ${palette.border}`, borderRadius: 10, padding: 9 }}>
              <p style={{ margin: "0 0 6px", fontSize: 12, color: palette.text, fontWeight: 700 }}>Decision Dependency Heatmap</p>
              {(autopilot?.decision_dependency_heatmap || []).slice(0, 4).map((item) => (
                <p key={item.issue_id} style={{ margin: "0 0 4px", fontSize: 11, color: palette.muted }}>
                  {item.key}: exposure {item.decision_exposure_score}
                </p>
              ))}
              {(autopilot?.decision_dependency_heatmap || []).length === 0 && (
                <p style={{ margin: 0, fontSize: 11, color: palette.muted }}>No dependency signals yet.</p>
              )}
            </div>
          </div>
        </section>

        <section style={{ ...progressCard, background: palette.card, border: `1px solid ${palette.border}` }}>
          <div style={progressTrack}>
            <div style={{ ...progressFill, width: `${progress}%` }} />
          </div>
        </section>

        <section style={board}>
          {statuses.map((status) => {
            const columnIssues = issues.filter((issue) => issue.status === status);
            return (
              <article key={status} style={{ ...column, background: palette.card, border: `1px solid ${palette.border}` }}>
                <div style={columnHead}>
                  <p style={{ margin: 0, fontSize: 11, color: palette.muted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
                    {status.replace("_", " ")}
                  </p>
                  <span style={countBadge}>{columnIssues.length}</span>
                </div>
                <div
                  style={dropZone}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handleDrop(status)}
                >
                  {columnIssues.map((issue) => (
                    <div
                      key={issue.id}
                      draggable
                      onDragStart={() => setDraggedIssue(issue)}
                      onDragEnd={() => setDraggedIssue(null)}
                      onClick={() => navigate(`/issues/${issue.id}`)}
                      style={issueCard}
                    >
                      <p style={issueKey}>{issue.key || `ISS-${issue.id}`}</p>
                      <p style={issueTitle}>{issue.title}</p>
                      <p style={issueMeta}>{issue.assignee_name || issue.assignee || "Unassigned"}</p>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <article style={metricCard}>
      <p style={metricValue}>{value}</p>
      <p style={metricLabel}>{label}</p>
    </article>
  );
}

const container = { maxWidth: 1320, margin: "0 auto", padding: 20 };
const spinner = { width: 30, height: 30, border: "2px solid rgba(120,120,120,0.35)", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite" };
const backButton = { display: "inline-flex", alignItems: "center", gap: 6, border: "none", background: "transparent", color: "#7d6d5a", fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 10 };
const hero = { borderRadius: 16, padding: 16, marginBottom: 12, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" };
const eyebrow = { margin: 0, fontSize: 11, letterSpacing: "0.12em", fontWeight: 700 };
const title = { margin: "8px 0 5px", fontSize: "clamp(1.5rem,3vw,2.2rem)", letterSpacing: "-0.02em" };
const sub = { margin: 0, fontSize: 13 };
const topRight = { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" };
const statusPill = { borderRadius: 999, border: "1px solid rgba(16,185,129,0.5)", background: "rgba(16,185,129,0.1)", color: "#10b981", fontSize: 11, fontWeight: 700, padding: "5px 10px" };
const secondaryButton = { border: "1px solid rgba(120,120,120,0.45)", borderRadius: 10, padding: "9px 12px", fontSize: 13, fontWeight: 700, color: "#7d6d5a", background: "transparent", textDecoration: "none" };
const statsGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 8, marginBottom: 12 };
const metricCard = { borderRadius: 12, padding: 12, border: "1px solid rgba(255,225,193,0.2)", background: "#1f181c" };
const metricValue = { margin: 0, fontSize: 26, fontWeight: 800, color: "#f4ece0" };
const metricLabel = { margin: "4px 0 0", fontSize: 12, color: "#baa892" };
const progressCard = { borderRadius: 12, padding: 12, marginBottom: 12 };
const progressTrack = { width: "100%", height: 10, borderRadius: 999, background: "rgba(120,120,120,0.25)", overflow: "hidden" };
const progressFill = { height: "100%", background: "linear-gradient(90deg,#10b981,#34d399)" };
const board = { display: "grid", gridTemplateColumns: "repeat(6,minmax(190px,1fr))", gap: 8, overflowX: "auto", paddingBottom: 4 };
const column = { borderRadius: 12, padding: 10, minHeight: 420 };
const columnHead = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 };
const countBadge = { minWidth: 22, height: 22, borderRadius: 999, border: "1px solid rgba(120,120,120,0.4)", color: "#9e8d7b", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700 };
const dropZone = { display: "grid", gap: 8 };
const issueCard = { borderRadius: 10, border: "1px solid rgba(120,120,120,0.35)", background: "#251d22", padding: 10, cursor: "pointer" };
const issueKey = { margin: 0, fontSize: 11, color: "#9e8d7b", fontWeight: 700 };
const issueTitle = { margin: "5px 0", fontSize: 13, color: "#f4ece0", fontWeight: 600, lineHeight: 1.35 };
const issueMeta = { margin: 0, fontSize: 11, color: "#baa892" };
const icon14 = { width: 14, height: 14 };

export default SprintDetail;

