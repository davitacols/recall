import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";
import api from "../services/api";

function scoreTone(score) {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#3b82f6";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
}

function qualityLabel(score) {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Needs Work";
  return "Critical";
}

function MetricBar({ label, value, palette }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: palette.text }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: palette.text }}>{value}%</span>
      </div>
      <div style={{ width: "100%", height: 8, borderRadius: 999, background: "rgba(120,120,120,0.22)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${value}%`, background: value >= 60 ? "#3b82f6" : "#f59e0b" }} />
      </div>
    </div>
  );
}

function IssueCard({ title, value, hint, link, palette, tone }) {
  return (
    <article style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.cardAlt, padding: 12 }}>
      <p style={{ margin: 0, fontSize: 30, fontWeight: 800, color: tone }}>{value}</p>
      <h3 style={{ margin: "6px 0", fontSize: 14, color: palette.text }}>{title}</h3>
      <p style={{ margin: "0 0 8px", fontSize: 12, color: palette.muted }}>{hint}</p>
      {value > 0 && (
        <Link to={link} style={{ fontSize: 12, color: "#60a5fa", textDecoration: "none", fontWeight: 700 }}>
          Review now ->
        </Link>
      )}
    </article>
  );
}

export default function KnowledgeHealthDashboard() {
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await api.get("/api/knowledge/health/");
        const data = response?.data?.data || response?.data || null;
        setHealth(data);
      } catch (error) {
        setHealth(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: palette.bg }}>
        <div style={ui.container}>
          <div style={{ borderRadius: 14, height: 180, background: palette.card, border: `1px solid ${palette.border}`, opacity: 0.8 }} />
        </div>
      </div>
    );
  }

  if (!health) {
    return (
      <div style={{ minHeight: "100vh", background: palette.bg }}>
        <div style={ui.container}>
          <div style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.card, padding: 14, color: palette.muted }}>
            Failed to load knowledge health data.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: palette.bg }}>
      <div style={ui.container}>
        <section style={{ borderRadius: 16, border: `1px solid ${palette.border}`, background: palette.card, padding: 16, marginBottom: 12 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: palette.muted }}>KNOWLEDGE HEALTH</p>
          <h1 style={{ margin: "8px 0 4px", fontSize: "clamp(1.45rem,2.4vw,2.1rem)", color: palette.text }}>Knowledge quality and risk</h1>
          <p style={{ margin: 0, fontSize: 13, color: palette.muted }}>Track documentation quality and unresolved memory debt.</p>
        </section>

        <section style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.cardAlt, padding: 14, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div>
              <p style={{ margin: 0, fontSize: 11, color: palette.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>Overall Score</p>
              <p style={{ margin: "4px 0 0", fontSize: 50, fontWeight: 800, color: scoreTone(health.overall_score || 0) }}>
                {health.overall_score || 0}
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: 13, color: palette.text }}>{qualityLabel(health.overall_score || 0)}</p>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: palette.muted }}>
                Based on {health.total_decisions || 0} decisions
              </p>
            </div>
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 8, marginBottom: 12 }}>
          <IssueCard
            title="Decisions Without Owners"
            value={health.decisions_without_owners || 0}
            hint="Decisions missing accountable owners."
            link="/decisions?filter=no_owner"
            palette={palette}
            tone="#ef4444"
          />
          <IssueCard
            title="Old Unresolved Questions"
            value={health.old_unresolved || 0}
            hint="Questions older than 30 days still open."
            link="/conversations?type=question&status=unanswered"
            palette={palette}
            tone="#f59e0b"
          />
          <IssueCard
            title="Repeated Topics"
            value={health.repeated_topics || 0}
            hint="Same discussions repeated across threads."
            link="/insights/repeated"
            palette={palette}
            tone="#3b82f6"
          />
          <IssueCard
            title="Orphaned Conversations"
            value={health.orphaned_conversations || 0}
            hint="Conversations without follow-up actions."
            link="/conversations?filter=orphaned"
            palette={palette}
            tone="#94a3b8"
          />
        </section>

        <section style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.card, padding: 12, marginBottom: 12 }}>
          <h2 style={{ margin: "0 0 10px", fontSize: 16, color: palette.text }}>Documentation Quality</h2>
          <div style={{ display: "grid", gap: 10 }}>
            <MetricBar label="Decisions With Context" value={health.decisions_with_context || 0} palette={palette} />
            <MetricBar label="Decisions With Alternatives" value={health.decisions_with_alternatives || 0} palette={palette} />
            <MetricBar label="Decisions With Tradeoffs" value={health.decisions_with_tradeoffs || 0} palette={palette} />
            <MetricBar label="Decisions Reviewed" value={health.decisions_reviewed || 0} palette={palette} />
          </div>
        </section>

        {Array.isArray(health.recommendations) && health.recommendations.length > 0 && (
          <section style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: darkMode ? "rgba(59,130,246,0.14)" : "#dbeafe", padding: 12 }}>
            <h2 style={{ margin: "0 0 8px", fontSize: 16, color: darkMode ? "#bfdbfe" : "#1e40af" }}>Recommendations</h2>
            <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
              {health.recommendations.map((item, index) => (
                <li key={`${item}_${index}`} style={{ fontSize: 13, color: darkMode ? "#dbeafe" : "#1e3a8a" }}>
                  {item}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
