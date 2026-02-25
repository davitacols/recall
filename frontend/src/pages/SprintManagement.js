import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarIcon, ExclamationTriangleIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";
import api from "../services/api";

export default function SprintManagement() {
  const { darkMode } = useTheme();
  const navigate = useNavigate();

  const [sprints, setSprints] = useState([]);
  const [currentSprint, setCurrentSprint] = useState(null);
  const [blockers, setBlockers] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newSprint, setNewSprint] = useState({ name: "", start_date: "", end_date: "", goal: "" });
  const [loading, setLoading] = useState(true);

  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  useEffect(() => {
    fetchSprints();
    fetchBlockers();
  }, []);

  const fetchSprints = async () => {
    try {
      const response = await api.get("/api/agile/sprints/");
      const sprintList = response.data || [];
      setSprints(sprintList);
      setCurrentSprint(sprintList.find((sprint) => sprint.status === "active") || null);
    } catch (error) {
      console.error("Failed to fetch sprints:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBlockers = async () => {
    try {
      const response = await api.get("/api/agile/blockers/");
      setBlockers((response.data || []).filter((blocker) => blocker.status === "active"));
    } catch (error) {
      console.error("Failed to fetch blockers:", error);
    }
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    try {
      await api.post("/api/agile/sprints/", newSprint);
      setShowCreate(false);
      setNewSprint({ name: "", start_date: "", end_date: "", goal: "" });
      fetchSprints();
    } catch (error) {
      console.error("Failed to create sprint:", error);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: palette.bg, display: "grid", placeItems: "center" }}>
        <div style={spinner} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: palette.bg }}>
      <div style={ui.container}>
        <section
          style={{
            ...hero,
            border: `1px solid ${palette.border}`,
            background: darkMode
              ? "linear-gradient(140deg, rgba(255,167,97,0.14), rgba(87,205,184,0.13))"
              : "linear-gradient(140deg, rgba(255,196,146,0.42), rgba(152,243,223,0.36))",
          }}
        >
          <div>
            <p style={{ ...eyebrow, color: palette.muted }}>SPRINT OPERATIONS</p>
            <h1 style={{ ...title, color: palette.text }}>Sprint Management</h1>
            <p style={{ ...subtitle, color: palette.muted }}>Plan, track, and adapt sprint execution with live context.</p>
          </div>
          <button onClick={() => setShowCreate(true)} style={ui.primaryButton}><PlusIcon style={icon14} /> New Sprint</button>
        </section>

        {currentSprint && (
          <section style={{ ...activeCard, background: palette.card, border: `1px solid ${palette.border}` }}>
            <div style={sectionHeader}>
              <div>
                <h2 style={{ ...h2, color: palette.text }}>{currentSprint.name}</h2>
                <p style={{ ...muted, color: palette.muted }}>{currentSprint.goal || "No sprint goal"}</p>
              </div>
              <span style={activePill}>Active</span>
            </div>
            <p style={{ ...muted, color: palette.muted, marginTop: 6 }}>
              {new Date(currentSprint.start_date).toLocaleDateString()} - {new Date(currentSprint.end_date).toLocaleDateString()}
            </p>
            <div style={miniStats}>
              <Metric value={currentSprint.completed_count || 0} label="Completed" />
              <Metric value={currentSprint.blocked_count || 0} label="Blocked" />
              <Metric value={currentSprint.decisions_made || 0} label="Decisions" />
            </div>
          </section>
        )}

        {blockers.length > 0 && (
          <section style={{ marginBottom: 12 }}>
            <h2 style={{ ...h2, color: palette.text, marginBottom: 8 }}>
              <ExclamationTriangleIcon style={{ ...icon18, color: "#ef4444" }} /> Blockers ({blockers.length})
            </h2>
            <div style={list}>
              {blockers.map((blocker) => (
                <article key={blocker.id} style={{ ...blockerCard, background: palette.card, border: `1px solid ${palette.border}` }}>
                  <p style={{ ...itemTitle, color: palette.text }}>{blocker.title}</p>
                  <p style={{ ...muted, color: palette.muted }}>{blocker.description}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 style={{ ...h2, color: palette.text, marginBottom: 8 }}>All Sprints</h2>
          <div style={list}>
            {sprints.map((sprint) => (
              <article
                key={sprint.id}
                onClick={() => navigate(`/sprints/${sprint.id}`)}
                style={{ ...rowCard, background: palette.card, border: `1px solid ${palette.border}` }}
              >
                <div>
                  <p style={{ ...itemTitle, color: palette.text }}>{sprint.name}</p>
                  <p style={{ ...muted, color: palette.muted }}>
                    <CalendarIcon style={icon14} /> {new Date(sprint.start_date).toLocaleDateString()} - {new Date(sprint.end_date).toLocaleDateString()}
                  </p>
                  {sprint.goal && <p style={{ ...muted, color: palette.muted, marginTop: 4 }}>{sprint.goal}</p>}
                </div>
                <span style={statusPill}>{sprint.status}</span>
              </article>
            ))}
          </div>
        </section>

        {showCreate && (
          <div style={overlay}>
            <div style={{ ...modalCard, background: palette.card, border: `1px solid ${palette.border}` }}>
              <h3 style={{ margin: 0, fontSize: 22, color: palette.text }}>Create Sprint</h3>
              <form onSubmit={handleCreate} style={formStack}>
                <input placeholder="Sprint Name" required value={newSprint.name} onChange={(e) => setNewSprint({ ...newSprint, name: e.target.value })} style={ui.input} />
                <div style={ui.twoCol}>
                  <input type="date" required value={newSprint.start_date} onChange={(e) => setNewSprint({ ...newSprint, start_date: e.target.value })} style={ui.input} />
                  <input type="date" required value={newSprint.end_date} onChange={(e) => setNewSprint({ ...newSprint, end_date: e.target.value })} style={ui.input} />
                </div>
                <textarea rows={4} placeholder="Sprint goal" value={newSprint.goal} onChange={(e) => setNewSprint({ ...newSprint, goal: e.target.value })} style={ui.input} />
                <div style={buttonRow}>
                  <button type="button" onClick={() => setShowCreate(false)} style={ui.secondaryButton}>Cancel</button>
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

function Metric({ value, label }) {
  return (
    <article style={metricCard}>
      <p style={metricValue}>{value}</p>
      <p style={metricLabel}>{label}</p>
    </article>
  );
}

const spinner = { width: 30, height: 30, border: "2px solid rgba(120,120,120,0.35)", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite" };
const hero = { borderRadius: 16, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 10, flexWrap: "wrap", marginBottom: 12 };
const eyebrow = { margin: 0, fontSize: 11, letterSpacing: "0.14em", fontWeight: 700 };
const title = { margin: "7px 0 6px", fontSize: "clamp(1.5rem,3vw,2.2rem)", letterSpacing: "-0.02em" };
const subtitle = { margin: 0, fontSize: 14 };
const h2 = { margin: 0, fontSize: 19, display: "flex", alignItems: "center", gap: 7 };
const muted = { margin: 0, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 5 };
const sectionHeader = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 };
const activeCard = { borderRadius: 14, padding: 14, marginBottom: 12 };
const activePill = { border: "1px solid rgba(16,185,129,0.5)", background: "rgba(16,185,129,0.12)", color: "#10b981", borderRadius: 999, padding: "4px 10px", fontSize: 11, fontWeight: 700 };
const miniStats = { marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8 };
const metricCard = { borderRadius: 10, padding: 10, border: "1px solid rgba(255,225,193,0.2)", background: "#1f181c" };
const metricValue = { margin: 0, fontSize: 24, fontWeight: 800, color: "#f4ece0" };
const metricLabel = { margin: "4px 0 0", fontSize: 12, color: "#baa892" };
const list = { display: "grid", gap: 8 };
const blockerCard = { borderRadius: 12, padding: 12, borderLeft: "3px solid #ef4444" };
const rowCard = { borderRadius: 12, padding: 12, cursor: "pointer", display: "flex", justifyContent: "space-between", gap: 10 };
const itemTitle = { margin: 0, fontSize: 15, fontWeight: 700 };
const statusPill = { border: "1px solid rgba(120,120,120,0.45)", borderRadius: 999, padding: "4px 8px", height: "fit-content", fontSize: 11, textTransform: "capitalize", color: "#9e8d7b", fontWeight: 700 };
const overlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "grid", placeItems: "center", zIndex: 110, padding: 16 };
const modalCard = { width: "min(560px,100%)", borderRadius: 14, padding: 16 };
const formStack = { marginTop: 12, display: "grid", gap: 8 };
const buttonRow = { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 };
const icon18 = { width: 18, height: 18 };
const icon14 = { width: 14, height: 14 };


