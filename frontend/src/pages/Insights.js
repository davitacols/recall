import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";
import BrandedTechnicalIllustration from "../components/BrandedTechnicalIllustration";
import api from "../services/api";

function Insights() {
  const { darkMode } = useTheme();
  const [stats, setStats] = useState({
    totalConversations: 0,
    totalDecisions: 0,
    thisWeek: 0,
    activeUsers: 0,
  });
  const [topContributors, setTopContributors] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      const [convRes, decRes] = await Promise.all([api.get("/api/conversations/"), api.get("/api/decisions/")]);
      const conversations = convRes.data.results || convRes.data || [];
      const decisions = decRes.data.results || decRes.data || [];

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const thisWeekConv = conversations.filter((c) => new Date(c.created_at) > oneWeekAgo);

      const contributors = {};
      conversations.forEach((c) => {
        contributors[c.author] = (contributors[c.author] || 0) + 1;
      });

      const topContrib = Object.entries(contributors)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

      setStats({
        totalConversations: conversations.length,
        totalDecisions: decisions.length,
        thisWeek: thisWeekConv.length,
        activeUsers: Object.keys(contributors).length,
      });
      setTopContributors(topContrib);
      setRecentActivity(conversations.slice(0, 5));
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

  return (
    <div style={{ ...ui.container, display: "grid", gap: 12, fontFamily: 'var(--font-primary, "League Spartan"), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
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
          <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.12em", fontWeight: 700, color: palette.muted }}>ANALYTICS</p>
          <h1 style={{ margin: 0, fontSize: "clamp(1.12rem,2.1vw,1.58rem)", color: palette.text }}>Insights</h1>
          <p style={{ margin: 0, fontSize: 13, color: palette.muted }}>Understand contribution, decision velocity, and knowledge activity.</p>
        </div>
        <BrandedTechnicalIllustration darkMode={darkMode} compact />
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 }}>
        <MetricCard label="Total Conversations" value={stats.totalConversations} palette={palette} />
        <MetricCard label="Decisions Made" value={stats.totalDecisions} palette={palette} />
        <MetricCard label="This Week" value={stats.thisWeek} palette={palette} tone={palette.success} />
        <MetricCard label="Active Users" value={stats.activeUsers} palette={palette} tone={palette.info} />
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 10 }}>
        <article style={{ border: `1px solid ${palette.border}`, borderRadius: 14, background: palette.card, overflow: "hidden" }}>
          <div style={{ padding: "12px 14px", borderBottom: `1px solid ${palette.border}` }}>
            <h2 style={{ margin: 0, fontSize: 16, color: palette.text }}>Top Contributors</h2>
          </div>
          {topContributors.map((contributor, idx) => (
            <div key={idx} style={{ padding: "12px 14px", borderBottom: idx === topContributors.length - 1 ? "none" : `1px solid ${palette.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: palette.accentSoft, display: "grid", placeItems: "center", color: palette.text, fontWeight: 700 }}>
                  {String(contributor.name || "?").charAt(0).toUpperCase()}
                </div>
                <span style={{ color: palette.text, fontSize: 14, fontWeight: 700 }}>{contributor.name}</span>
              </div>
              <span style={{ color: palette.text, fontSize: 18, fontWeight: 800 }}>{contributor.count}</span>
            </div>
          ))}
        </article>

        <article style={{ display: "grid", gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 16, color: palette.text }}>Recent Activity</h2>
          {recentActivity.map((activity, idx) => (
            <Link
              key={idx}
              to={`/conversations/${activity.id}`}
              style={{
                border: `1px solid ${palette.border}`,
                borderRadius: 12,
                padding: 12,
                textDecoration: "none",
                background: palette.card,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, gap: 8 }}>
                <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: "uppercase", background: activity.post_type === "decision" ? palette.accentSoft : palette.cardAlt, color: palette.text }}>
                  {activity.post_type || "conversation"}
                </span>
                <span style={{ fontSize: 12, color: palette.muted }}>
                  {new Date(activity.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
              <h3 style={{ margin: "0 0 4px", fontSize: 16, color: palette.text }}>{activity.title || "Untitled"}</h3>
              <p style={{ margin: 0, fontSize: 13, color: palette.muted }}>{activity.author || "Unknown"}</p>
            </Link>
          ))}
        </article>
      </section>
    </div>
  );
}

function MetricCard({ label, value, palette, tone }) {
  return (
    <article style={{ border: `1px solid ${palette.border}`, borderRadius: 12, padding: 12, background: palette.card }}>
      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", color: palette.muted, textTransform: "uppercase" }}>{label}</p>
      <p style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 800, color: tone || palette.text }}>{value}</p>
    </article>
  );
}

export default Insights;
