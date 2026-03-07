import React, { useEffect, useMemo, useState } from "react";
import { ArrowTrendingUpIcon, ChartBarIcon, LinkIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";

export default function KnowledgeAnalytics() {
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const [timeline, graph] = await Promise.all([
        fetch(`${process.env.REACT_APP_API_URL}/api/knowledge/timeline/?days=30`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => r.json()),
        fetch(`${process.env.REACT_APP_API_URL}/api/knowledge/graph/`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => r.json()),
      ]);

      const activityByType = {};
      (timeline || []).forEach((item) => {
        activityByType[item.type] = (activityByType[item.type] || 0) + 1;
      });

      const nodesByType = {};
      (graph.nodes || []).forEach((node) => {
        nodesByType[node.type] = (nodesByType[node.type] || 0) + 1;
      });

      setStats({
        totalActivity: (timeline || []).length,
        totalNodes: graph.nodes?.length || 0,
        totalLinks: graph.edges?.length || 0,
        activityByType,
        nodesByType,
        avgLinksPerNode: graph.nodes?.length ? (graph.edges.length / graph.nodes.length).toFixed(1) : "0.0",
      });
    } catch (error) {
      console.error("Error:", error);
      setStats({ totalActivity: 0, totalNodes: 0, totalLinks: 0, activityByType: {}, nodesByType: {}, avgLinksPerNode: "0.0" });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh" }}>
        <div style={ui.container}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 8 }}>
            {[1, 2, 3, 4].map((i) => <div key={i} style={{ borderRadius: 12, height: 120, background: palette.card, border: `1px solid ${palette.border}`, opacity: 0.7 }} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={ui.container}>
        <section style={{ borderRadius: 16, border: `1px solid ${palette.border}`, background: palette.card, padding: 16, marginBottom: 12 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: palette.muted }}>KNOWLEDGE ANALYTICS</p>
          <h1 style={{ margin: "8px 0 4px", fontSize: "clamp(1.2rem,2.1vw,1.8rem)", color: palette.text, letterSpacing: "-0.02em" }}>Knowledge Analytics</h1>
          <p style={{ margin: 0, fontSize: 13, color: palette.muted }}>30-day trend, content distribution, and knowledge linkage density.</p>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 8, marginBottom: 12 }}>
          <TopStat icon={ChartBarIcon} label="Total Activity" value={stats.totalActivity} />
          <TopStat icon={UserGroupIcon} label="Knowledge Items" value={stats.totalNodes} />
          <TopStat icon={LinkIcon} label="Connections" value={stats.totalLinks} />
          <TopStat icon={ArrowTrendingUpIcon} label="Avg Links/Item" value={stats.avgLinksPerNode} />
        </section>

        <section style={ui.responsiveSplit}>
          <article style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.card, padding: 12 }}>
            <h2 style={{ margin: "0 0 10px", fontSize: 16, color: palette.text }}>Activity by Type</h2>
            <Breakdown rows={stats.activityByType} total={stats.totalActivity || 1} color="var(--app-info)" />
          </article>

          <article style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.card, padding: 12 }}>
            <h2 style={{ margin: "0 0 10px", fontSize: 16, color: palette.text }}>Content Distribution</h2>
            <Breakdown rows={stats.nodesByType} total={stats.totalNodes || 1} color="var(--app-info)" />
          </article>
        </section>
      </div>
    </div>
  );
}

function TopStat({ icon: Icon, label, value }) {
  return (
    <article style={{ borderRadius: 12, padding: 12, border: "1px solid var(--app-border-strong)", background: "var(--app-surface-alt)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Icon style={{ width: 18, height: 18, color: "var(--app-link)" }} />
        <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "var(--app-text)" }}>{value}</p>
      </div>
      <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--app-muted)" }}>{label}</p>
    </article>
  );
}

function Breakdown({ rows, total, color }) {
  const entries = Object.entries(rows || {});
  if (!entries.length) return <p style={{ margin: 0, fontSize: 12, color: "var(--app-muted)" }}>No data</p>;

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {entries.map(([type, count]) => (
        <div key={type} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center" }}>
          <div>
            <p style={{ margin: "0 0 4px", fontSize: 12, color: "var(--app-muted)", textTransform: "capitalize" }}>{type.replace("_", " ")}</p>
            <div style={{ width: "100%", height: 7, borderRadius: 999, background: "var(--app-track)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(count / total) * 100}%`, background: color }} />
            </div>
          </div>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "var(--app-text)", minWidth: 24, textAlign: "right" }}>{count}</p>
        </div>
      ))}
    </div>
  );
}

