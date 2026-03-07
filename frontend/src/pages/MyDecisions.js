import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";
import BrandedTechnicalIllustration from "../components/BrandedTechnicalIllustration";
import api from "../services/api";

function MyDecisions() {
  const { user } = useAuth();
  const { darkMode } = useTheme();
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  useEffect(() => {
    fetchMyDecisions();
  }, []);

  const fetchMyDecisions = async () => {
    try {
      const response = await api.get("/api/decisions/");
      const myDecisions = (response.data.results || response.data).filter((d) => d.decision_maker === user?.id);
      setDecisions(myDecisions);
    } catch (error) {
      console.error("Failed to fetch decisions:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDecisions = decisions.filter((d) => {
    if (filter === "all") return true;
    return d.status === filter;
  });

  const getImpactColor = (level) => {
    if (level === "critical") return palette.danger;
    if (level === "high") return palette.warn;
    if (level === "medium") return palette.info;
    return palette.muted;
  };

  if (loading) {
    return (
      <div style={{ ...ui.container, display: "grid", placeItems: "center", minHeight: 360 }}>
        <div style={{ width: 24, height: 24, borderRadius: "50%", border: `2px solid ${palette.border}`, borderTopColor: palette.accent, animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ ...ui.container, display: "grid", gap: 12, fontFamily: "'Sora', 'Space Grotesk', 'Segoe UI', sans-serif" }}>
      <section
        style={{
          border: `1px solid ${palette.border}`,
          borderRadius: 16,
          padding: "clamp(16px,2.4vw,24px)",
          background: `linear-gradient(140deg, ${palette.accentSoft}, ${darkMode ? "rgba(96,165,250,0.14)" : "rgba(191,219,254,0.42)"})`,
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) auto",
          alignItems: "end",
          gap: 12,
        }}
      >
        <div style={{ display: "grid", gap: 6 }}>
          <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.12em", fontWeight: 700, color: palette.muted }}>ACCOUNTABILITY</p>
          <h1 style={{ margin: 0, fontSize: "clamp(1.12rem,2.1vw,1.58rem)", color: palette.text }}>My Decisions</h1>
          <p style={{ margin: 0, fontSize: 13, color: palette.muted }}>Decisions you own and are accountable for.</p>
        </div>
        <BrandedTechnicalIllustration darkMode={darkMode} compact />
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>
        <StatCard label="Total" value={decisions.length} palette={palette} />
        <StatCard label="Approved" value={decisions.filter((d) => d.status === "approved").length} palette={palette} tone={palette.success} />
        <StatCard label="Under Review" value={decisions.filter((d) => d.status === "under_review").length} palette={palette} tone={palette.info} />
        <StatCard label="Implemented" value={decisions.filter((d) => d.status === "implemented").length} palette={palette} />
      </section>

      <section style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        {["all", "proposed", "under_review", "approved", "implemented"].map((status) => {
          const selected = filter === status;
          return (
            <button
              key={status}
              onClick={() => setFilter(status)}
              style={{
                border: `1px solid ${selected ? palette.accent : palette.border}`,
                borderRadius: 999,
                background: selected ? palette.accentSoft : palette.cardAlt,
                color: palette.text,
                fontSize: 12,
                fontWeight: 700,
                textTransform: "capitalize",
                padding: "8px 12px",
                cursor: "pointer",
              }}
            >
              {status === "all" ? "All" : status.replace("_", " ")}
            </button>
          );
        })}
      </section>

      {filteredDecisions.length === 0 ? (
        <section style={{ textAlign: "center", padding: "40px 20px", border: `1px solid ${palette.border}`, borderRadius: 14, background: palette.card }}>
          <h3 style={{ marginTop: 0, marginBottom: 6, fontSize: 20, color: palette.text }}>No decisions yet</h3>
          <p style={{ marginTop: 0, marginBottom: 14, fontSize: 14, color: palette.muted }}>
            Start making decisions to build your track record.
          </p>
          <a href="/conversations" style={{ ...ui.primaryButton, textDecoration: "none", display: "inline-flex" }}>
            View conversations
          </a>
        </section>
      ) : (
        <section style={{ display: "grid", gap: 10 }}>
          {filteredDecisions.map((decision) => (
            <Link
              key={decision.id}
              to={`/decisions/${decision.id}`}
              style={{
                border: `1px solid ${palette.border}`,
                borderRadius: 12,
                padding: 14,
                textDecoration: "none",
                background: palette.card,
                color: palette.text,
                transition: "border-color 0.16s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: getImpactColor(decision.impact_level) }} />
                  <span style={{ padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: "uppercase", background: palette.accentSoft, color: palette.text }}>
                    {(decision.status || "proposed").replace("_", " ")}
                  </span>
                  <span style={{ fontSize: 11, color: palette.muted, fontWeight: 700, textTransform: "uppercase" }}>
                    {decision.impact_level || "unknown"} impact
                  </span>
                </div>
                <span style={{ fontSize: 12, color: palette.muted }}>
                  {new Date(decision.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
              <h3 style={{ margin: "0 0 6px", fontSize: 18, color: palette.text }}>{decision.title || "Untitled decision"}</h3>
              {decision.description ? <p style={{ margin: 0, fontSize: 13, color: palette.muted }}>{decision.description}</p> : null}
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, palette, tone }) {
  return (
    <article style={{ border: `1px solid ${palette.border}`, borderRadius: 12, padding: 12, background: palette.card }}>
      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", color: palette.muted, textTransform: "uppercase" }}>{label}</p>
      <p style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 800, color: tone || palette.text }}>{value}</p>
    </article>
  );
}

export default MyDecisions;
