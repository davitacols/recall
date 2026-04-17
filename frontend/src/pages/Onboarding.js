import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpenIcon, CheckCircleIcon, ClockIcon, LightBulbIcon } from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";
import BrandedTechnicalIllustration from "../components/BrandedTechnicalIllustration";
import api from "../services/api";

function Onboarding() {
  const { darkMode } = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  useEffect(() => {
    fetchOnboardingData();
  }, []);

  const fetchOnboardingData = async () => {
    try {
      const response = await api.get("/api/knowledge/onboarding/");
      setData(response.data);
    } catch (error) {
      console.error("Failed to fetch onboarding data:", error);
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

  if (!data) {
    return (
      <div style={{ ...ui.container, textAlign: "center", padding: "40px 0", color: palette.muted }}>
        <h3 style={{ margin: 0, fontSize: 20, color: palette.text }}>No Data Available</h3>
      </div>
    );
  }

  return (
    <div style={{ ...ui.container, display: "grid", gap: 12, fontFamily: 'var(--font-primary, "League Spartan"), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <section
        style={{
          border: `1px solid ${palette.border}`,
          borderRadius: 16,
          padding: "clamp(16px,2.4vw,24px)",
          background: `linear-gradient(140deg, ${palette.accentSoft}, ${darkMode ? "rgba(31,143,102,0.12)" : "rgba(187,247,208,0.42)"})`,
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) auto",
          alignItems: "end",
          gap: 12,
        }}
      >
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <BookOpenIcon style={{ width: 18, height: 18, color: palette.text }} />
            <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.12em", fontWeight: 700, color: palette.muted }}>WELCOME BRIEF</p>
          </div>
          <h1 style={{ margin: 0, fontSize: "clamp(1.12rem,2.1vw,1.58rem)", color: palette.text }}>
            Welcome to {data.organization_name}
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: palette.muted }}>Everything you need to get started quickly.</p>
        </div>
        <BrandedTechnicalIllustration darkMode={darkMode} compact />
      </section>

      <Section title="Key Decisions" icon={CheckCircleIcon} palette={palette} subtitle="Important decisions that shape how we work.">
        <div style={{ display: "grid", gap: 8 }}>
          {(data.key_decisions || []).map((decision) => (
            <Link key={decision.id} to={`/decisions/${decision.id}`} style={{ textDecoration: "none" }}>
              <article style={{ border: `1px solid ${palette.border}`, borderRadius: 12, padding: 12, background: palette.card }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6, alignItems: "flex-start" }}>
                  <h3 style={{ margin: 0, color: palette.text, fontSize: 16 }}>{decision.title}</h3>
                  <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: "uppercase", background: palette.accentSoft, color: palette.text }}>
                    {decision.impact_level}
                  </span>
                </div>
                <p style={{ margin: "0 0 4px", color: palette.muted, fontSize: 13 }}>{decision.description}</p>
                <p style={{ margin: 0, color: palette.muted, fontSize: 12 }}>
                  Decided: {decision.decided_at ? new Date(decision.decided_at).toLocaleDateString() : "N/A"}
                </p>
              </article>
            </Link>
          ))}
        </div>
      </Section>

      {(data.good_examples || []).length > 0 ? (
        <Section title="Good Examples" icon={LightBulbIcon} palette={palette} subtitle="Learn from exemplary conversations.">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 8 }}>
            {data.good_examples.map((example) => (
              <Link key={example.id} to={`/conversations/${example.id}`} style={{ textDecoration: "none" }}>
                <article style={{ border: `1px solid ${palette.success}`, borderRadius: 12, padding: 12, background: palette.card }}>
                  <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 999, background: palette.success, color: "#fff", fontSize: 11, fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>
                    {example.post_type}
                  </span>
                  <h3 style={{ margin: "0 0 6px", fontSize: 15, color: palette.text }}>{example.title}</h3>
                  {example.summary ? <p style={{ margin: 0, fontSize: 13, color: palette.muted }}>{example.summary}</p> : null}
                </article>
              </Link>
            ))}
          </div>
        </Section>
      ) : null}

      {(data.recent_updates || []).length > 0 ? (
        <Section title="Recent Important Updates" icon={ClockIcon} palette={palette} subtitle="Stay current with recent developments.">
          <div style={{ display: "grid", gap: 8 }}>
            {data.recent_updates.map((update) => (
              <Link key={update.id} to={`/conversations/${update.id}`} style={{ textDecoration: "none" }}>
                <article style={{ border: `1px solid ${palette.border}`, borderRadius: 12, padding: 12, background: palette.card }}>
                  <h3 style={{ margin: "0 0 6px", fontSize: 15, color: palette.text }}>{update.title}</h3>
                  <p style={{ margin: "0 0 6px", fontSize: 13, color: palette.muted }}>{update.content}</p>
                  <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>{new Date(update.created_at).toLocaleDateString()}</p>
                </article>
              </Link>
            ))}
          </div>
        </Section>
      ) : null}

      {(data.trending_topics || []).length > 0 ? (
        <Section title="What We Are Talking About" palette={palette} subtitle="Current focus areas and trending topics.">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {data.trending_topics.map((topic, idx) => (
              <span key={idx} style={{ padding: "7px 10px", borderRadius: 999, background: palette.cardAlt, border: `1px solid ${palette.border}`, color: palette.text, fontSize: 12, fontWeight: 700 }}>
                {topic.topic} ({topic.count})
              </span>
            ))}
          </div>
        </Section>
      ) : null}
    </div>
  );
}

function Section({ title, subtitle, icon: Icon, palette, children }) {
  return (
    <section style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "grid", gap: 4 }}>
        <h2 style={{ margin: 0, fontSize: 17, color: palette.text, display: "flex", alignItems: "center", gap: 6 }}>
          {Icon ? <Icon style={{ width: 16, height: 16 }} /> : null}
          {title}
        </h2>
        {subtitle ? <p style={{ margin: 0, color: palette.muted, fontSize: 13 }}>{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

export default Onboarding;
