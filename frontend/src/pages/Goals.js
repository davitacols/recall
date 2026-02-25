import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FlagIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";

export default function Goals() {
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    target_date: "",
    status: "not_started",
    conversation_id: "",
    decision_id: "",
  });

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/business/goals/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        console.error("API Error:", res.status, await res.text());
        setGoals([]);
        return;
      }
      setGoals(await res.json());
    } catch (error) {
      console.error("Error fetching goals:", error);
      setGoals([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const token = localStorage.getItem("token");
      await fetch(`${process.env.REACT_APP_API_URL}/api/business/goals/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
      setShowModal(false);
      setFormData({ title: "", description: "", target_date: "", status: "not_started", conversation_id: "", decision_id: "" });
      fetchGoals();
    } catch (error) {
      console.error("Error creating goal:", error);
    }
  };

  const doneCount = goals.filter((goal) => goal.status === "completed").length;
  const inProgressCount = goals.filter((goal) => goal.status === "in_progress").length;
  const avgProgress = goals.length ? Math.round(goals.reduce((sum, goal) => sum + (goal.progress || 0), 0) / goals.length) : 0;

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: palette.bg }}>
        <div style={ui.container}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 10 }}>
            {[1, 2, 3, 4].map((item) => (
              <div key={item} style={{ borderRadius: 12, height: 128, background: palette.card, border: `1px solid ${palette.border}`, opacity: 0.7 }} />
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
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: palette.muted }}>BUSINESS GOALS</p>
            <h1 style={{ margin: "8px 0 4px", fontSize: "clamp(1.5rem,3vw,2.2rem)", color: palette.text, letterSpacing: "-0.02em" }}>Goals</h1>
            <p style={{ margin: 0, fontSize: 13, color: palette.muted }}>Track delivery outcomes and strategic milestones.</p>
          </div>
          <button onClick={() => setShowModal(true)} style={ui.primaryButton}><PlusIcon style={{ width: 14, height: 14 }} /> New Goal</button>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 8, marginBottom: 12 }}>
          <Metric label="Total" value={goals.length} />
          <Metric label="In Progress" value={inProgressCount} />
          <Metric label="Completed" value={doneCount} />
          <Metric label="Avg Progress" value={`${avgProgress}%`} />
        </section>

        {goals.length === 0 ? (
          <div style={{ borderRadius: 12, border: `1px dashed ${palette.border}`, background: palette.card, padding: "20px 14px", textAlign: "center", color: palette.muted, fontSize: 13 }}>
            No goals yet. Create one to start tracking progress.
          </div>
        ) : (
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 10 }}>
            {goals.map((goal) => (
              <article key={goal.id} onClick={() => navigate(`/business/goals/${goal.id}`)} style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.card, padding: 12, cursor: "pointer" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <FlagIcon style={{ width: 16, height: 16, color: statusColor(goal.status) }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: palette.text }}>{goal.title}</p>
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: palette.muted, lineHeight: 1.4 }}>{goal.description || "No description"}</p>
                  </div>
                </div>
                <div style={{ marginTop: 10 }}>
                  <div style={{ width: "100%", height: 7, borderRadius: 999, background: "rgba(120,120,120,0.25)", overflow: "hidden" }}>
                    <div style={{ width: `${goal.progress || 0}%`, height: "100%", background: "linear-gradient(90deg,#10b981,#34d399)" }} />
                  </div>
                </div>
                <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11 }}>
                  <span style={{ color: palette.muted, textTransform: "capitalize" }}>{(goal.status || "not_started").replace("_", " ")}</span>
                  <span style={{ color: palette.text, fontWeight: 700 }}>{goal.progress || 0}%</span>
                </div>
              </article>
            ))}
          </section>
        )}

        {showModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "grid", placeItems: "center", zIndex: 120, padding: 16 }}>
            <div style={{ width: "min(560px,100%)", borderRadius: 14, border: `1px solid ${palette.border}`, background: palette.card, padding: 16 }}>
              <h2 style={{ margin: 0, fontSize: 20, color: palette.text }}>Create Goal</h2>
              <form onSubmit={handleSubmit} style={{ marginTop: 12, display: "grid", gap: 8 }}>
                <input required placeholder="Goal title" value={formData.title} onChange={(event) => setFormData({ ...formData, title: event.target.value })} style={ui.input} />
                <textarea rows={4} placeholder="Description" value={formData.description} onChange={(event) => setFormData({ ...formData, description: event.target.value })} style={ui.input} />
                <div style={ui.twoCol}>
                  <input type="date" value={formData.target_date} onChange={(event) => setFormData({ ...formData, target_date: event.target.value })} style={ui.input} />
                  <select value={formData.status} onChange={(event) => setFormData({ ...formData, status: event.target.value })} style={ui.input}>
                    <option value="not_started">Not Started</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
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

function Metric({ label, value }) {
  return (
    <article style={{ borderRadius: 12, padding: 12, border: "1px solid rgba(255,225,193,0.2)", background: "#1f181c" }}>
      <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#f4ece0" }}>{value}</p>
      <p style={{ margin: "4px 0 0", fontSize: 12, color: "#baa892" }}>{label}</p>
    </article>
  );
}

function statusColor(status) {
  if (status === "completed") return "#10b981";
  if (status === "in_progress") return "#3b82f6";
  if (status === "on_hold") return "#f59e0b";
  return "#9ca3af";
}
