import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ListBulletIcon, PlusIcon, Squares2X2Icon } from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";
import api from "../services/api";

function Decisions() {
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid");

  useEffect(() => {
    fetchDecisions();
  }, []);

  const fetchDecisions = async () => {
    try {
      const response = await api.get("/api/decisions/");
      const data = response.data.data || response.data.results || response.data || [];
      const decisionsArray = Array.isArray(data) ? data : [];
      setDecisions(decisionsArray.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    } catch (error) {
      console.error("Failed to fetch decisions:", error);
      setDecisions([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredDecisions = decisions.filter((decision) => (filter === "all" ? true : decision.status === filter));

  const statusCounts = decisions.reduce((acc, decision) => {
    acc[decision.status] = (acc[decision.status] || 0) + 1;
    return acc;
  }, {});

  const statusLabel = (status) => {
    if (!status) return "Proposed";
    return status.replace("_", " ");
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: palette.bg }}>
        <div style={ui.container}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 10 }}>
            {[1, 2, 3, 4].map((item) => (
              <div key={item} style={{ borderRadius: 12, height: 140, background: palette.card, border: `1px solid ${palette.border}`, opacity: 0.7 }} />
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
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: palette.muted }}>DECISION CENTER</p>
            <h1 style={{ margin: "8px 0 4px", fontSize: "clamp(1.5rem,3vw,2.2rem)", color: palette.text, letterSpacing: "-0.02em" }}>Decisions</h1>
            <p style={{ margin: 0, fontSize: 13, color: palette.muted }}>Track choices, review status, and implementation momentum.</p>
          </div>
          <button onClick={() => navigate("/conversations")} style={ui.primaryButton}><PlusIcon style={{ width: 14, height: 14 }} /> New Decision</button>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8, marginBottom: 12 }}>
          <Metric label="Total" value={decisions.length} />
          <Metric label="Approved" value={statusCounts.approved || 0} color="#10b981" />
          <Metric label="Under Review" value={statusCounts.under_review || 0} color="#f59e0b" />
          <Metric label="Implemented" value={statusCounts.implemented || 0} color="#3b82f6" />
        </section>

        <section style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.card, padding: 10, marginBottom: 12, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["all", "proposed", "under_review", "approved", "implemented"].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                style={{
                  ...ui.secondaryButton,
                  fontSize: 11,
                  padding: "7px 10px",
                  textTransform: "capitalize",
                  background: filter === status ? "rgba(59,130,246,0.2)" : "transparent",
                  border: filter === status ? "1px solid rgba(59,130,246,0.45)" : ui.secondaryButton.border,
                  color: filter === status ? "#93c5fd" : ui.secondaryButton.color,
                }}
              >
                {status === "all" ? "All" : status.replace("_", " ")}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setViewMode("grid")} style={{ ...ui.secondaryButton, padding: "7px 9px", background: viewMode === "grid" ? "rgba(120,120,120,0.18)" : "transparent" }}><Squares2X2Icon style={{ width: 15, height: 15 }} /></button>
            <button onClick={() => setViewMode("list")} style={{ ...ui.secondaryButton, padding: "7px 9px", background: viewMode === "list" ? "rgba(120,120,120,0.18)" : "transparent" }}><ListBulletIcon style={{ width: 15, height: 15 }} /></button>
          </div>
        </section>

        {filteredDecisions.length === 0 ? (
          <div style={{ borderRadius: 12, border: `1px dashed ${palette.border}`, background: palette.card, padding: "20px 14px", textAlign: "center", color: palette.muted, fontSize: 13 }}>
            No decisions found for this filter.
          </div>
        ) : viewMode === "grid" ? (
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 10 }}>
            {filteredDecisions.map((decision) => (
              <article key={decision.id} onClick={() => navigate(`/decisions/${decision.id}`)} style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.card, padding: 12, cursor: "pointer" }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
                  <Badge text={statusLabel(decision.status)} />
                  <Badge text={decision.impact_level || "medium"} tone="amber" />
                </div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: palette.text }}>{decision.title}</p>
                {decision.description && <p style={{ margin: "5px 0 0", fontSize: 12, color: palette.muted, lineHeight: 1.4 }}>{decision.description}</p>}
                <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", fontSize: 11, color: palette.muted }}>
                  <span>{decision.decision_maker_name || "Unknown"}</span>
                  <span>{new Date(decision.created_at).toLocaleDateString()}</span>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section style={{ display: "grid", gap: 8 }}>
            {filteredDecisions.map((decision) => (
              <article key={decision.id} onClick={() => navigate(`/decisions/${decision.id}`)} style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.card, padding: 12, cursor: "pointer", display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
                    <Badge text={statusLabel(decision.status)} />
                    <Badge text={decision.impact_level || "medium"} tone="amber" />
                  </div>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: palette.text }}>{decision.title}</p>
                  {decision.description && <p style={{ margin: "5px 0 0", fontSize: 12, color: palette.muted }}>{decision.description}</p>}
                </div>
                <div style={{ fontSize: 11, color: palette.muted, textAlign: "right" }}>
                  <p style={{ margin: 0 }}>{decision.decision_maker_name || "Unknown"}</p>
                  <p style={{ margin: "4px 0 0" }}>{new Date(decision.created_at).toLocaleDateString()}</p>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, color = "#f4ece0" }) {
  return (
    <article style={{ borderRadius: 12, padding: 12, border: "1px solid rgba(255,225,193,0.2)", background: "#1f181c" }}>
      <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color }}>{value}</p>
      <p style={{ margin: "4px 0 0", fontSize: 11, color: "#baa892" }}>{label}</p>
    </article>
  );
}

function Badge({ text, tone = "blue" }) {
  const styles = tone === "amber"
    ? { border: "1px solid rgba(245,158,11,0.45)", color: "#fcd34d", background: "rgba(245,158,11,0.12)" }
    : { border: "1px solid rgba(59,130,246,0.45)", color: "#93c5fd", background: "rgba(59,130,246,0.12)" };

  return <span style={{ ...styles, fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "3px 8px", textTransform: "capitalize" }}>{text}</span>;
}

export default Decisions;
