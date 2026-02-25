import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ExclamationTriangleIcon, PlusIcon } from "@heroicons/react/24/outline";
import api from "../services/api";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";

function CurrentSprint() {
  const { darkMode } = useTheme();
  const [sprint, setSprint] = useState(null);
  const [blockers, setBlockers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBlockerModal, setShowBlockerModal] = useState(false);

  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  useEffect(() => {
    fetchSprint();
    const interval = setInterval(fetchSprint, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchSprint = async () => {
    try {
      const sprintRes = await api.get("/api/agile/current-sprint/");
      const current = sprintRes.data;
      setSprint(current);
      if (current?.id) {
        const blockersRes = await api.get(`/api/agile/blockers/?sprint_id=${current.id}`).catch(() => ({ data: [] }));
        setBlockers(blockersRes.data || []);
      } else {
        setBlockers([]);
      }
    } catch (error) {
      console.error("Failed to fetch sprint:", error);
      setSprint(null);
      setBlockers([]);
    } finally {
      setLoading(false);
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
      <div style={{ minHeight: "100vh", background: palette.bg }}>
        <div style={ui.container}>
          <section style={{ ...hero, background: palette.card, border: `1px solid ${palette.border}` }}>
            <p style={{ ...eyebrow, color: palette.muted }}>SPRINT CENTER</p>
            <h1 style={{ ...title, color: palette.text }}>No active sprint</h1>
            <p style={{ ...subtitle, color: palette.muted }}>
              Start a sprint in a project to track execution, blockers, and outcome velocity.
            </p>
            <Link to="/projects" style={ui.primaryButton}>Go to Projects</Link>
          </section>
        </div>
      </div>
    );
  }

  const completion = sprint.issue_count > 0 ? Math.round(((sprint.completed || 0) / sprint.issue_count) * 100) : 0;

  return (
    <div style={{ minHeight: "100vh", background: palette.bg }}>
      <div style={ui.container}>
        <section style={{ ...hero, background: palette.card, border: `1px solid ${palette.border}` }}>
          <div>
            <p style={{ ...eyebrow, color: palette.muted }}>ACTIVE SPRINT</p>
            <h1 style={{ ...title, color: palette.text }}>{sprint.name}</h1>
            <p style={{ ...subtitle, color: palette.muted }}>
              {sprint.start_date} - {sprint.end_date}
            </p>
            {sprint.goal && <p style={{ ...subtitle, color: palette.muted, marginTop: 8 }}>Goal: {sprint.goal}</p>}
          </div>
          <div style={ctaRow}>
            <Link to={`/projects/${sprint.project_id}`} style={ui.secondaryButton}>Project</Link>
            <Link to="/sprint-management" style={ui.secondaryButton}>Manage Sprints</Link>
          </div>
        </section>

        <section style={statsGrid}>
          <Metric label="Completion" value={`${completion}%`} />
          <Metric label="Issues" value={sprint.issue_count || 0} />
          <Metric label="Completed" value={sprint.completed || 0} />
          <Metric label="In Progress" value={sprint.in_progress || 0} />
          <Metric label="To Do" value={sprint.todo || 0} />
        </section>

        <section style={{ ...progressCard, background: palette.card, border: `1px solid ${palette.border}` }}>
          <div style={progressTrack}>
            <div style={{ ...progressFill, width: `${completion}%` }} />
          </div>
          <p style={{ margin: "8px 0 0", color: palette.muted, fontSize: 12 }}>Sprint completion</p>
        </section>

        <section style={{ ...listCard, background: palette.card, border: `1px solid ${palette.border}` }}>
          <div style={sectionHeader}>
            <h2 style={{ ...h2, color: palette.text, margin: 0 }}>Active Blockers</h2>
            <button onClick={() => setShowBlockerModal(true)} style={primaryButtonAlt}>
              <PlusIcon style={icon14} /> Report Blocker
            </button>
          </div>

          {blockers.length === 0 ? (
            <div style={emptyRow}>No active blockers.</div>
          ) : (
            <div style={list}>
              {blockers.map((blocker) => (
                <article key={blocker.id} style={blockerCard}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <ExclamationTriangleIcon style={{ ...icon16, color: "#ef4444" }} />
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{blocker.title}</p>
                  </div>
                  <p style={{ margin: "6px 0 0", fontSize: 12, color: palette.muted }}>{blocker.description || "No description"}</p>
                </article>
              ))}
            </div>
          )}
        </section>

        {showBlockerModal && (
          <BlockerModal
            sprintId={sprint.id}
            onClose={() => setShowBlockerModal(false)}
            onSubmit={() => {
              setShowBlockerModal(false);
              fetchSprint();
            }}
            palette={palette}
          />
        )}
      </div>
    </div>
  );
}

function BlockerModal({ sprintId, onClose, onSubmit, palette }) {
  const ui = useMemo(() => getProjectUi(palette), [palette]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("technical");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/api/agile/blockers/", { sprint_id: sprintId, title, description, type });
      onSubmit();
    } catch (error) {
      console.error("Failed to create blocker:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={overlay}>
      <div style={{ ...modalCard, background: palette.card, border: `1px solid ${palette.border}` }}>
        <h3 style={{ margin: 0, fontSize: 20, color: palette.text }}>Report Blocker</h3>
        <form onSubmit={handleSubmit} style={formStack}>
          <input required placeholder="Title" value={title} onChange={(event) => setTitle(event.target.value)} style={ui.input} />
          <select value={type} onChange={(event) => setType(event.target.value)} style={ui.input}>
            <option value="technical">Technical</option>
            <option value="dependency">Dependency</option>
            <option value="decision">Decision Needed</option>
            <option value="resource">Resource</option>
            <option value="external">External</option>
          </select>
          <textarea rows={4} placeholder="Description" value={description} onChange={(event) => setDescription(event.target.value)} style={ui.input} />
          <div style={modalButtons}>
            <button type="button" onClick={onClose} style={ui.secondaryButton}>Cancel</button>
            <button type="submit" disabled={submitting} style={ui.primaryButton}>{submitting ? "Reporting..." : "Report"}</button>
          </div>
        </form>
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

const spinner = { width: 30, height: 30, border: "2px solid rgba(120,120,120,0.35)", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite" };
const hero = { borderRadius: 16, padding: 16, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" };
const eyebrow = { margin: 0, fontSize: 11, letterSpacing: "0.12em", fontWeight: 700 };
const title = { margin: "8px 0 5px", fontSize: "clamp(1.5rem,3vw,2.2rem)", letterSpacing: "-0.02em" };
const subtitle = { margin: 0, fontSize: 13 };
const ctaRow = { display: "flex", gap: 8, flexWrap: "wrap" };
const h2 = { fontSize: 19 };
const statsGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 8, marginBottom: 12 };
const metricCard = { borderRadius: 12, padding: 12, border: "1px solid rgba(255,225,193,0.2)", background: "#1f181c" };
const metricValue = { margin: 0, fontSize: 26, fontWeight: 800, color: "#f4ece0" };
const metricLabel = { margin: "4px 0 0", fontSize: 12, color: "#baa892" };
const progressCard = { borderRadius: 12, padding: 12, marginBottom: 12 };
const progressTrack = { width: "100%", height: 10, borderRadius: 999, background: "rgba(120,120,120,0.25)", overflow: "hidden" };
const progressFill = { height: "100%", background: "linear-gradient(90deg,#10b981,#34d399)" };
const listCard = { borderRadius: 12, padding: 12 };
const sectionHeader = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 };
const list = { display: "grid", gap: 8 };
const blockerCard = { borderRadius: 10, border: "1px solid rgba(239,68,68,0.28)", background: "rgba(239,68,68,0.08)", padding: 10 };
const emptyRow = { borderRadius: 10, border: "1px dashed rgba(120,120,120,0.35)", padding: "14px 10px", fontSize: 13, color: "#9e8d7b" };
const primaryButton = { border: "none", borderRadius: 10, padding: "9px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#20140f", background: "linear-gradient(135deg,#ffd390,#ff9f62)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 };
const primaryButtonAlt = { ...primaryButton, background: "linear-gradient(135deg,#ffb58a,#ff8e6f)", color: "#31170f" };
const overlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "grid", placeItems: "center", zIndex: 120, padding: 16 };
const modalCard = { width: "min(560px,100%)", borderRadius: 14, padding: 16 };
const formStack = { marginTop: 12, display: "grid", gap: 8 };
const modalButtons = { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 };
const icon16 = { width: 16, height: 16 };
const icon14 = { width: 14, height: 14 };

export default CurrentSprint;

