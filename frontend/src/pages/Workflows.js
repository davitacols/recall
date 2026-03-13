import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  BoltIcon,
  Squares2X2Icon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import {
  WorkspaceEmptyState,
  WorkspaceHero,
  WorkspacePanel,
} from "../components/WorkspaceChrome";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";

export default function Workflows() {
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const destinations = [
    {
      title: "Automation Rules",
      description: "Set event-driven rules that reduce repetitive coordination work.",
      href: "/automation",
      icon: BoltIcon,
    },
    {
      title: "Templates",
      description: "Standardize recurring work so teams start from the same structure.",
      href: "/business/templates",
      icon: Squares2X2Icon,
    },
    {
      title: "Integrations",
      description: "Connect external systems that feed or trigger workflow activity.",
      href: "/integrations",
      icon: WrenchScrewdriverIcon,
    },
  ];

  return (
    <div style={{ ...ui.container, display: "grid", gap: 14 }}>
      <WorkspaceHero
        palette={palette}
        darkMode={darkMode}
        eyebrow="Operational Flows"
        title="Workflows"
        description="This page now acts as the workflow command surface for the automation, templates, and integrations that shape repeatable team operations."
        stats={[
          { label: "Workflow Surfaces", value: destinations.length, helper: "Automation, templates, and connected tooling", tone: palette.info },
          { label: "Mode", value: "Guided", helper: "Starts from working routes instead of an empty shell", tone: palette.accent },
          { label: "Focus", value: "Repeatable", helper: "Move teams from ad hoc work to defined operating patterns", tone: palette.success },
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
        title="Workflow design should connect people, tools, and templates"
        description="A workflow page is most useful when it routes people into the actual systems that encode repeatable work instead of stopping at a placeholder."
      >
        <WorkspaceEmptyState
          palette={palette}
          title="Use the linked workflow tools"
          description="This route now gives teams a usable workflow hub while the broader workflow administration surface continues evolving."
        />
      </WorkspacePanel>
    </div>
  );
}
