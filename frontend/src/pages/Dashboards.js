import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ChartBarIcon,
  RectangleGroupIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import {
  WorkspaceEmptyState,
  WorkspaceHero,
  WorkspacePanel,
} from "../components/WorkspaceChrome";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";

export default function Dashboards() {
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const starterViews = [
    {
      title: "Reports",
      description: "Sprint and delivery reporting for agile execution.",
      href: "/reports",
    },
    {
      title: "Knowledge Analytics",
      description: "Distribution, density, and activity across the knowledge graph.",
      href: "/knowledge/analytics",
    },
    {
      title: "Knowledge Health",
      description: "Quality and risk signals for your team memory system.",
      href: "/knowledge-health",
    },
  ];

  return (
    <div style={{ ...ui.container, display: "grid", gap: 14 }}>
      <WorkspaceHero
        palette={palette}
        darkMode={darkMode}
        eyebrow="Executive Views"
        title="Dashboards"
        description="A dedicated dashboard builder is still being shaped, but the key operational views already exist across reports, analytics, and knowledge health."
        stats={[
          { label: "Starter Views", value: starterViews.length, helper: "Available now for reporting and monitoring", tone: palette.info },
          { label: "Mode", value: "Curated", helper: "Use guided dashboards while custom composition evolves", tone: palette.accent },
          { label: "Goal", value: "One pane", helper: "Bring delivery, memory, and risk together over time", tone: palette.success },
        ]}
        aside={
          <div
            style={{
              minWidth: 220,
              borderRadius: 20,
              border: `1px solid ${palette.border}`,
              background: palette.cardAlt,
              padding: 14,
              display: "grid",
              gap: 8,
            }}
          >
            <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 800, color: palette.muted }}>
              Current Approach
            </p>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: palette.text }}>
              Use focused dashboard surfaces today, then converge them into custom executive views as the builder matures.
            </p>
          </div>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
        {starterViews.map((view) => (
          <Link
            key={view.href}
            to={view.href}
            className="ui-card-lift ui-smooth ui-focus-ring"
            style={{
              textDecoration: "none",
              borderRadius: 20,
              border: `1px solid ${palette.border}`,
              background: palette.card,
              padding: 16,
              display: "grid",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                background: palette.accentSoft,
                color: palette.info,
                display: "grid",
                placeItems: "center",
              }}
            >
              <ChartBarIcon style={{ width: 18, height: 18 }} />
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              <h3 style={{ margin: 0, fontSize: 17, lineHeight: 1.2, letterSpacing: "-0.03em", color: palette.text }}>
                {view.title}
              </h3>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: palette.muted }}>
                {view.description}
              </p>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: palette.link }}>Open view</span>
          </Link>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
        <WorkspacePanel
          palette={palette}
          eyebrow="Direction"
          title="What custom dashboards should solve"
          description="A professional dashboard builder in Knoledgr should blend delivery metrics, decision context, and memory quality instead of isolating them."
        >
          <div style={{ display: "grid", gap: 10 }}>
            {[
              { icon: RectangleGroupIcon, title: "Composable sections", body: "Pin the views leaders need most without losing route-level depth." },
              { icon: ChartBarIcon, title: "Shared reporting language", body: "Use the same KPI definitions across agile, business, and knowledge surfaces." },
              { icon: SparklesIcon, title: "Context-aware summaries", body: "Pair charts with explanations so trends are not detached from the why." },
            ].map((item) => (
              <div
                key={item.title}
                style={{
                  borderRadius: 16,
                  border: `1px solid ${palette.border}`,
                  background: palette.cardAlt,
                  padding: 14,
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    background: palette.accentSoft,
                    color: palette.info,
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <item.icon style={{ width: 17, height: 17 }} />
                </div>
                <div style={{ display: "grid", gap: 4 }}>
                  <strong style={{ color: palette.text, fontSize: 14 }}>{item.title}</strong>
                  <p style={{ margin: 0, color: palette.muted, fontSize: 13, lineHeight: 1.6 }}>{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </WorkspacePanel>

        <WorkspacePanel
          palette={palette}
          eyebrow="Availability"
          title="Use the routed views today"
          description="Until custom composition is ready, the quickest path is to use the purpose-built dashboards already connected to live data."
        >
          <WorkspaceEmptyState
            palette={palette}
            title="Custom dashboard builder coming next"
            description="The current product already has strong reporting views. This page now acts as a guided hub instead of an empty placeholder."
          />
        </WorkspacePanel>
      </div>
    </div>
  );
}
