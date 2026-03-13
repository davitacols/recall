import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Cog6ToothIcon,
  ShieldCheckIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import {
  WorkspaceEmptyState,
  WorkspaceHero,
  WorkspacePanel,
} from "../components/WorkspaceChrome";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";

export default function AccountSettings() {
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const destinations = [
    {
      title: "Profile",
      description: "Update identity details, personal preferences, and the basics other teammates see.",
      href: "/profile",
      icon: UserCircleIcon,
    },
    {
      title: "Settings",
      description: "Open the broader account and workspace configuration surface.",
      href: "/settings",
      icon: Cog6ToothIcon,
    },
    {
      title: "Security",
      description: "Review access controls and the security-focused settings available in the main settings area.",
      href: "/settings",
      icon: ShieldCheckIcon,
    },
  ];

  return (
    <div style={{ ...ui.container, display: "grid", gap: 14 }}>
      <WorkspaceHero
        palette={palette}
        darkMode={darkMode}
        eyebrow="Account"
        title="Account Settings"
        description="This route now works as a cleaner account hub while the remaining account controls continue consolidating into the main settings surfaces."
        stats={[
          { label: "Primary Surfaces", value: destinations.length, helper: "Profile, settings, and security entry points", tone: palette.info },
          { label: "Mode", value: "Guided", helper: "Use the connected account surfaces instead of a dead-end placeholder", tone: palette.accent },
          { label: "Status", value: "Active", helper: "Account management is available through the linked pages", tone: palette.success },
        ]}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
        {destinations.map((item) => (
          <Link
            key={item.href + item.title}
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
        title="Account management is moving into shared settings"
        description="Instead of leaving this route as an empty screen, it now points people to the working account surfaces already present in the app."
      >
        <WorkspaceEmptyState
          palette={palette}
          title="Use the linked account areas"
          description="As account pages are consolidated, this route stays useful by acting as a polished navigation hub instead of a placeholder."
        />
      </WorkspacePanel>
    </div>
  );
}
