import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChartBarIcon, ClockIcon, SparklesIcon } from "@heroicons/react/24/outline";
import api from "../services/api";
import {
  Avatar,
  Button,
  EmptyState,
  Lozenge,
  PageHeader,
  SectionMessage,
} from "../components/atlas";

function timeAgo(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  const sec = Math.max(1, Math.round((Date.now() - d.getTime()) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const m = Math.round(sec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function Insights() {
  const [stats, setStats] = useState({ totalConversations: 0, totalDecisions: 0, thisWeek: 0, activeUsers: 0 });
  const [topContributors, setTopContributors] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([
      api.get("/api/conversations/"),
      api.get("/api/decisions/"),
    ]).then(([convRes, decRes]) => {
      if (!mounted) return;
      const conversations = convRes.status === "fulfilled" ? (convRes.value.data.results || convRes.value.data || []) : [];
      const decisions = decRes.status === "fulfilled" ? (decRes.value.data.results || decRes.value.data || []) : [];
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const thisWeek = conversations.filter((c) => new Date(c.created_at) > oneWeekAgo);
      const contribs = {};
      conversations.forEach((c) => {
        const key = c.author_name || c.author || c.created_by_name || "Anonymous";
        contribs[key] = (contribs[key] || 0) + 1;
      });
      const top = Object.entries(contribs).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));
      setStats({
        totalConversations: conversations.length,
        totalDecisions: decisions.length,
        thisWeek: thisWeek.length,
        activeUsers: Object.keys(contribs).length,
      });
      setTopContributors(top);
      setRecent(conversations.slice(0, 8));
    }).catch((err) => mounted && setError(err?.message || "Failed to load insights"))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  return (
    <div style={{ padding: "0 32px 32px" }}>
      <PageHeader
        breadcrumb={[{ label: "Knoledgr", to: "/" }, { label: "Insights" }]}
        title="Insights"
        subtitle="Understand contribution, decision velocity, and knowledge activity."
        style={{ padding: "24px 0 0", background: "transparent" }}
      />

      {error ? <SectionMessage tone="error" style={{ marginTop: 16 }}>{error}</SectionMessage> : null}

      {loading ? (
        <div style={{ marginTop: 16, height: 240, background: "var(--n20)", borderRadius: 4 }} />
      ) : (
        <>
          <section style={statsRow}>
            <Stat label="Conversations" value={stats.totalConversations} />
            <Stat label="Decisions" value={stats.totalDecisions} />
            <Stat label="This week" value={stats.thisWeek} tone="g" />
            <Stat label="Active contributors" value={stats.activeUsers} tone="b" />
          </section>

          <div style={twoCol}>
            <section style={panel}>
              <h2 style={panelTitle}>Top contributors</h2>
              {topContributors.length === 0 ? (
                <p style={{ color: "var(--app-muted)", fontSize: 13 }}>No contributions yet.</p>
              ) : (
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {topContributors.map((c) => (
                    <li key={c.name} style={contribRow}>
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Avatar size="sm" name={c.name} />
                        <span style={{ fontSize: 14 }}>{c.name}</span>
                      </span>
                      <span style={{ fontSize: 13, color: "var(--app-muted)" }}>{c.count} conversation{c.count === 1 ? "" : "s"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section style={panel}>
              <h2 style={panelTitle}>Recent conversations</h2>
              {recent.length === 0 ? (
                <p style={{ color: "var(--app-muted)", fontSize: 13 }}>No conversations yet.</p>
              ) : (
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {recent.map((c) => (
                    <li key={c.id} style={recentRow}>
                      <Link to={`/conversations/${c.id}`} style={{ color: "var(--app-text)", textDecoration: "none", fontWeight: 500, flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.title || "Untitled"}</span>
                      </Link>
                      <span style={{ fontSize: 12, color: "var(--app-muted)", flexShrink: 0, marginLeft: 8 }}>{timeAgo(c.created_at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, tone }) {
  const color = tone === "g" ? "var(--g400)" : tone === "b" ? "var(--b400)" : "var(--app-text)";
  return (
    <div style={statCard}>
      <p style={{ margin: 0, fontSize: 11, color: "var(--app-muted)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 700 }}>{label}</p>
      <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 500, color }}>{value}</p>
    </div>
  );
}

const statsRow = {
  marginTop: 16,
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 8,
};

const statCard = {
  background: "var(--app-surface)",
  border: "1px solid var(--app-border)",
  borderRadius: 4,
  padding: 16,
};

const twoCol = {
  marginTop: 16,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 16,
};

const panel = {
  background: "var(--app-surface)",
  border: "1px solid var(--app-border)",
  borderRadius: 4,
  padding: 16,
};

const panelTitle = {
  margin: "0 0 12px",
  fontSize: 14,
  fontWeight: 600,
  color: "var(--app-text)",
};

const contribRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "8px 0",
  borderBottom: "1px solid var(--app-border-subtle)",
};

const recentRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "8px 0",
  borderBottom: "1px solid var(--app-border-subtle)",
  fontSize: 14,
};
