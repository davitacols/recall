import React, { useEffect, useMemo, useState } from "react";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";
import BrandedTechnicalIllustration from "../components/BrandedTechnicalIllustration";
import api from "../services/api";

function RetrospectiveMemory() {
  const { darkMode } = useTheme();
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      const response = await api.get("/api/agile/rca/recurring/?days=90");
      setInsights(response.data);
    } catch (error) {
      console.error("Failed to fetch insights:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ ...ui.container, display: "grid", placeItems: "center", minHeight: 360 }}>
        <div style={{ width: 24, height: 24, borderRadius: "50%", border: `2px solid ${palette.border}`, borderTopColor: palette.accent }} />
      </div>
    );
  }

  if (!insights) {
    return (
      <div style={{ ...ui.container, display: "grid", placeItems: "center", minHeight: 360 }}>
        <div style={{ color: palette.muted }}>Failed to load retrospective data</div>
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
          background: `linear-gradient(140deg, ${palette.accentSoft}, ${darkMode ? "rgba(245,158,11,0.12)" : "rgba(254,243,199,0.52)"})`,
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) auto",
          alignItems: "end",
          gap: 12,
        }}
      >
        <div style={{ display: "grid", gap: 6 }}>
          <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.12em", fontWeight: 700, color: palette.muted }}>RCA MEMORY</p>
          <h1 style={{ margin: 0, fontSize: "clamp(1.12rem,2.1vw,1.58rem)", color: palette.text }}>Retrospectives</h1>
          <p style={{ margin: 0, fontSize: 13, color: palette.muted }}>Not a meeting replacement, a persistent root-cause memory.</p>
        </div>
        <BrandedTechnicalIllustration darkMode={darkMode} compact />
      </section>

      {insights.top_causes && insights.top_causes.length > 0 ? (
        <section style={{ border: `1px solid ${palette.warn}`, background: darkMode ? "rgba(245,158,11,0.12)" : "rgba(254,243,199,0.6)", borderRadius: 14, padding: 14 }}>
          <h2 style={{ marginTop: 0, marginBottom: 6, fontSize: 18, color: palette.text }}>Recurring Root Causes</h2>
          <p style={{ marginTop: 0, marginBottom: 10, fontSize: 13, color: palette.muted }}>
            These themes repeat in retrospectives and should be addressed systematically.
          </p>
          <div style={{ display: "grid", gap: 8 }}>
            {insights.top_causes.map((issue, idx) => (
              <article key={idx} style={{ border: `1px solid ${palette.border}`, background: palette.card, borderRadius: 10, padding: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: palette.text }}>{issue.keyword}</span>
                  <span style={{ padding: "3px 8px", borderRadius: 999, background: palette.warn, color: "#fff", fontSize: 11, fontWeight: 700 }}>
                    risk {issue.risk_score}
                  </span>
                </div>
                <p style={{ margin: "6px 0 0", fontSize: 12, color: palette.muted }}>
                  Mentions: {issue.mentions} | Affected sprints: {issue.affected_sprints} | Recurrence rate: {issue.recurrence_rate}
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section style={{ textAlign: "center", padding: "40px 20px", border: `1px solid ${palette.border}`, borderRadius: 14, background: palette.card }}>
          <h3 style={{ marginTop: 0, marginBottom: 6, fontSize: 20, color: palette.text }}>No patterns detected yet</h3>
          <p style={{ margin: 0, fontSize: 14, color: palette.muted }}>
            Run more retrospectives to detect recurring issues.
          </p>
        </section>
      )}

      {insights.blocker_patterns && insights.blocker_patterns.length > 0 ? (
        <section style={{ border: `1px solid ${palette.border}`, borderRadius: 14, background: palette.card, padding: 14 }}>
          <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: 16, color: palette.text }}>Recurring Blocker Patterns</h2>
          <div style={{ display: "grid", gap: 7 }}>
            {insights.blocker_patterns.map((item, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", marginTop: 6, background: palette.text }} />
                <span style={{ fontSize: 13, color: palette.muted }}>
                  {item.blocker_type}: {item.count} blockers (avg {item.avg_days_open} days open)
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {insights.recommendations && insights.recommendations.length > 0 ? (
        <section style={{ border: `1px solid ${palette.border}`, borderRadius: 14, background: palette.cardAlt, padding: 14 }}>
          <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: 16, color: palette.text }}>Recommended Actions</h2>
          <div style={{ display: "grid", gap: 7 }}>
            {insights.recommendations.map((item, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", marginTop: 6, background: palette.accent }} />
                <span style={{ fontSize: 13, color: palette.muted }}>{item}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default RetrospectiveMemory;
