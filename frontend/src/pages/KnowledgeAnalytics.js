import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowTrendingUpIcon,
  ChartBarIcon,
  LinkIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import {
  WorkspaceEmptyState,
  WorkspaceHero,
  WorkspacePanel,
} from "../components/WorkspaceChrome";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";
import api from "../services/api";

function summarizeRows(rows) {
  const entries = Object.entries(rows || {});
  if (!entries.length) return "No data yet";
  const [topKey, topValue] = entries.sort((left, right) => right[1] - left[1])[0];
  return `${topKey.replace(/_/g, " ")} leads with ${topValue}`;
}

function Breakdown({ rows, total, color, palette }) {
  const entries = Object.entries(rows || {});
  if (!entries.length) {
    return (
      <WorkspaceEmptyState
        palette={palette}
        title="No analytics signals yet"
        description="As new conversations, decisions, and knowledge records accumulate, the distribution view will populate here."
      />
    );
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {entries
        .sort((left, right) => right[1] - left[1])
        .map(([type, count]) => (
          <div key={type} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
            <div style={{ display: "grid", gap: 5 }}>
              <p style={{ margin: 0, fontSize: 11, color: palette.muted, textTransform: "capitalize" }}>
                {type.replace(/_/g, " ")}
              </p>
              <div style={{ width: "100%", height: 6, borderRadius: 999, background: palette.progressTrack, overflow: "hidden" }}>
                <div style={{ width: `${(count / total) * 100}%`, height: "100%", background: color }} />
              </div>
            </div>
            <p style={{ margin: 0, minWidth: 26, fontSize: 12, fontWeight: 700, color: palette.text, textAlign: "right" }}>
              {count}
            </p>
          </div>
        ))}
    </div>
  );
}

export default function KnowledgeAnalytics() {
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const [timelineRes, graphRes] = await Promise.all([
          api.get("/api/knowledge/timeline/?days=30"),
          api.get("/api/knowledge/graph/"),
        ]);

        const timeline = timelineRes?.data?.results || timelineRes?.data || [];
        const graph = graphRes?.data || { nodes: [], edges: [] };

        const activityByType = {};
        timeline.forEach((item) => {
          activityByType[item.type] = (activityByType[item.type] || 0) + 1;
        });

        const nodesByType = {};
        (graph.nodes || []).forEach((node) => {
          nodesByType[node.type] = (nodesByType[node.type] || 0) + 1;
        });

        setStats({
          totalActivity: timeline.length,
          totalNodes: graph.nodes?.length || 0,
          totalLinks: graph.edges?.length || 0,
          activityByType,
          nodesByType,
          avgLinksPerNode: graph.nodes?.length ? (graph.edges.length / graph.nodes.length).toFixed(1) : "0.0",
        });
      } catch (error) {
        console.error("Failed to load knowledge analytics:", error);
        setStats({
          totalActivity: 0,
          totalNodes: 0,
          totalLinks: 0,
          activityByType: {},
          nodesByType: {},
          avgLinksPerNode: "0.0",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const heroStats = stats
    ? [
        {
          label: "30 Day Activity",
          value: stats.totalActivity,
          helper: summarizeRows(stats.activityByType),
          tone: palette.info,
        },
        {
          label: "Knowledge Items",
          value: stats.totalNodes,
          helper: summarizeRows(stats.nodesByType),
          tone: palette.accent,
        },
        {
          label: "Link Density",
          value: stats.avgLinksPerNode,
          helper: `${stats.totalLinks} relationships across the graph`,
          tone: palette.success,
        },
      ]
    : [];

  const analyticsAside = (
    <div style={{ ...analyticsAsideCard, border: `1px solid ${palette.border}`, background: palette.card }}>
      <p style={{ ...analyticsAsideEyebrow, color: palette.muted }}>30-day readout</p>
      <div style={{ display: "grid", gap: 8 }}>
        {[
          { icon: ChartBarIcon, label: "Timeline window", value: "30 days" },
          { icon: UserGroupIcon, label: "Graph coverage", value: stats?.totalNodes || 0 },
          { icon: LinkIcon, label: "Connections", value: stats?.totalLinks || 0 },
          { icon: ArrowTrendingUpIcon, label: "Avg links", value: stats?.avgLinksPerNode || "0.0" },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              ...analyticsAsideRow,
              border: `1px solid ${palette.border}`,
              background: palette.cardAlt,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <item.icon style={{ width: 15, height: 15, color: palette.info }} />
              <span style={{ fontSize: 11, color: palette.muted }}>{item.label}</span>
            </div>
            <strong style={{ color: palette.text, fontSize: 13 }}>{item.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ ...ui.container, display: "grid", gap: 12 }}>
      <WorkspaceHero
        palette={palette}
        darkMode={darkMode}
        eyebrow="Workspace Memory"
        title="Knowledge Analytics"
        description="Track how activity flows through the workspace, which record types dominate the graph, and how densely the memory layer is connected."
        stats={heroStats}
        aside={analyticsAside}
      />

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              style={{
                minHeight: 180,
                borderRadius: 16,
                border: `1px solid ${palette.border}`,
                background: palette.card,
                opacity: 0.7,
              }}
            />
          ))}
        </div>
      ) : null}

      {!loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
          <WorkspacePanel
            palette={palette}
            eyebrow="Timeline"
            title="Activity by type"
            description="Use the recent activity split to understand whether conversations, decisions, and structured records are staying balanced."
          >
            <Breakdown rows={stats?.activityByType} total={stats?.totalActivity || 1} color={palette.info} palette={palette} />
          </WorkspacePanel>

          <WorkspacePanel
            palette={palette}
            eyebrow="Graph"
            title="Content distribution"
            description="This distribution helps show whether the knowledge graph is dominated by only one kind of record."
          >
            <Breakdown rows={stats?.nodesByType} total={stats?.totalNodes || 1} color={palette.accent} palette={palette} />
          </WorkspacePanel>
        </div>
      ) : null}
    </div>
  );
}

const analyticsAsideCard = {
  minWidth: 220,
  borderRadius: 16,
  padding: 14,
  display: "grid",
  gap: 10,
};

const analyticsAsideEyebrow = {
  margin: 0,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const analyticsAsideRow = {
  borderRadius: 12,
  padding: "10px 11px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
};
