import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";
import BrandedTechnicalIllustration from "../components/BrandedTechnicalIllustration";
import api from "../services/api";

function PersonalReflection() {
  const { user } = useAuth();
  const { darkMode } = useTheme();
  const [reflection, setReflection] = useState(null);
  const [loading, setLoading] = useState(true);

  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  useEffect(() => {
    fetchReflection();
  }, []);

  const fetchReflection = async () => {
    try {
      const response = await api.get("/api/knowledge/reflection/");
      setReflection(response.data);
    } catch (error) {
      console.error("Failed to fetch reflection:", error);
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

  if (!reflection) {
    return (
      <div style={{ ...ui.container, textAlign: "center", padding: "40px 0" }}>
        <h3 style={{ margin: "0 0 6px", fontSize: 20, color: palette.text }}>No Data Available</h3>
        <p style={{ margin: 0, color: palette.muted }}>Start contributing to see your reflection.</p>
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
          <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.12em", fontWeight: 700, color: palette.muted }}>PERSONAL IMPACT</p>
          <h1 style={{ margin: 0, fontSize: "clamp(1.12rem,2.1vw,1.58rem)", color: palette.text }}>Your Reflection</h1>
          <p style={{ margin: 0, fontSize: 13, color: palette.muted }}>
            {reflection.period} | {user?.full_name || user?.username}
          </p>
        </div>
        <BrandedTechnicalIllustration darkMode={darkMode} compact />
      </section>

      <section style={{ border: `1px solid ${palette.border}`, borderRadius: 14, background: `linear-gradient(145deg, ${palette.cardAlt}, ${palette.card})`, padding: 14 }}>
        <h2 style={{ marginTop: 0, marginBottom: 8, color: palette.text, fontSize: 18 }}>Your Impact</h2>
        <p style={{ marginTop: 0, marginBottom: 10, color: palette.muted, fontSize: 14 }}>{reflection.message}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8 }}>
          <Metric label="Conversations" value={reflection.contributions.conversations} palette={palette} />
          <Metric label="Replies" value={reflection.contributions.replies} palette={palette} />
          <Metric label="Decisions" value={reflection.contributions.decisions} palette={palette} />
          <Metric label="Total" value={reflection.contributions.total} palette={palette} tone={palette.success} />
        </div>
      </section>

      {(reflection.top_topics || []).length > 0 ? (
        <section style={{ border: `1px solid ${palette.border}`, borderRadius: 14, background: palette.card, padding: 14 }}>
          <h2 style={{ marginTop: 0, marginBottom: 4, color: palette.text, fontSize: 16 }}>Your Top Topics</h2>
          <p style={{ marginTop: 0, marginBottom: 8, color: palette.muted, fontSize: 13 }}>The areas where you contributed the most.</p>
          <div style={{ display: "grid", gap: 8 }}>
            {reflection.top_topics.map((topic, idx) => (
              <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, border: `1px solid ${palette.border}`, borderRadius: 10, padding: 10, background: palette.cardAlt }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 24, height: 24, borderRadius: 6, background: palette.accentSoft, color: palette.text, fontSize: 12, fontWeight: 700, display: "grid", placeItems: "center" }}>{idx + 1}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: palette.text }}>{topic.topic}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: palette.muted }}>{topic.count} contributions</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section style={{ border: `1px solid ${palette.info}`, borderRadius: 14, background: darkMode ? "rgba(37,99,235,0.12)" : "rgba(191,219,254,0.5)", padding: 14 }}>
        <h2 style={{ marginTop: 0, marginBottom: 8, color: palette.text, fontSize: 16 }}>Insights</h2>
        <div style={{ display: "grid", gap: 8 }}>
          {reflection.contributions.conversations > 10 ? (
            <InsightCard text={`Active Contributor: You started ${reflection.contributions.conversations} conversations and are shaping team knowledge.`} palette={palette} />
          ) : null}
          {reflection.contributions.replies > 20 ? (
            <InsightCard text={`Engaged Team Member: With ${reflection.contributions.replies} replies, you are actively helping others.`} palette={palette} />
          ) : null}
          {reflection.contributions.decisions > 5 ? (
            <InsightCard text={`Decision Maker: You made ${reflection.contributions.decisions} decisions that drive execution.`} palette={palette} />
          ) : null}
          {reflection.top_topics.length > 0 ? (
            <InsightCard text={`Subject Matter Expert: You are most active in "${reflection.top_topics[0].topic}". Consider documenting this expertise.`} palette={palette} />
          ) : null}
        </div>
      </section>

      <section style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
        <Link to="/conversations" style={{ ...ui.primaryButton, textDecoration: "none" }}>Continue Contributing</Link>
        <Link to="/settings" style={{ ...ui.secondaryButton, textDecoration: "none", color: palette.text }}>View Settings</Link>
      </section>
    </div>
  );
}

function Metric({ label, value, palette, tone }) {
  return (
    <article style={{ border: `1px solid ${palette.border}`, borderRadius: 10, background: palette.card, padding: 10 }}>
      <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: palette.muted, fontWeight: 700 }}>{label}</p>
      <p style={{ margin: "3px 0 0", fontSize: 26, color: tone || palette.text, fontWeight: 800 }}>{value}</p>
    </article>
  );
}

function InsightCard({ text, palette }) {
  return (
    <div style={{ border: `1px solid ${palette.border}`, borderRadius: 10, padding: 10, background: palette.card }}>
      <p style={{ margin: 0, fontSize: 13, color: palette.muted }}>{text}</p>
    </div>
  );
}

export default PersonalReflection;
