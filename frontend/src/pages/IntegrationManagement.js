import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  CircleStackIcon,
  KeyIcon,
  Square3Stack3DIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import {
  WorkspaceEmptyState,
  WorkspaceHero,
  WorkspacePanel,
} from "../components/WorkspaceChrome";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";

export default function IntegrationManagement() {
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const destinations = [
    {
      title: "Integrations",
      description: "Review connected tools and high-level integration coverage.",
      href: "/integrations",
      icon: Square3Stack3DIcon,
    },
    {
      title: "API Keys",
      description: "Manage programmatic access and token-based entry points.",
      href: "/api-keys",
      icon: KeyIcon,
    },
    {
      title: "Automation",
      description: "Pair integrations with automation rules to move work automatically.",
      href: "/automation",
      icon: CircleStackIcon,
    },
  ];

  return (
    <div style={{ ...ui.container, display: "grid", gap: 14 }}>
      <WorkspaceHero
        palette={palette}
        darkMode={darkMode}
        eyebrow="Connected Systems"
        title="Integration Management"
        description="Use this page as the cleaner control hub for integrations, API access, and the automation flows that depend on them."
        stats={[
          { label: "Connected Surfaces", value: destinations.length, helper: "Integration, API key, and automation entry points", tone: palette.info },
          { label: "Mode", value: "Hub", helper: "Routes to the working surfaces already shipped", tone: palette.accent },
          { label: "Goal", value: "Reliable", helper: "Connected tools should stay discoverable and manageable", tone: palette.success },
        ]}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
        {destinations.map((item) => (
          <Link
            key={item.href}
            to={item.href}
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
              <item.icon style={{ width: 18, height: 18 }} />
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              <h3 style={{ margin: 0, fontSize: 17, lineHeight: 1.2, letterSpacing: "-0.03em", color: palette.text }}>
                {item.title}
              </h3>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: palette.muted }}>
                {item.description}
              </p>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: palette.link }}>Open {item.title}</span>
          </Link>
        ))}
      </div>

      <WorkspacePanel
        palette={palette}
        eyebrow="Direction"
        title="Connected tooling should stay centralized"
        description="The old placeholder is now replaced with an actual navigation surface so integration management feels intentional instead of unfinished."
      >
        <WorkspaceEmptyState
          palette={palette}
          title="Use the linked integration surfaces"
          description="As integration administration keeps evolving, this page now acts as a stable professional hub instead of a blank stop."
        />
      </WorkspacePanel>
    </div>
  );
}
