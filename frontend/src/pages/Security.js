import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BuildingOffice2Icon,
  LockClosedIcon,
  ServerStackIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import UpgradeNotice from "../components/UpgradeNotice";
import { WorkspaceHero, WorkspacePanel } from "../components/WorkspaceChrome";
import api from "../services/api";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";

const CONTROL_PILLARS = [
  {
    title: "Identity and access",
    body: "Role-based permissions, workspace scoping, and enterprise-ready paths for SSO / SAML as the team matures.",
    icon: LockClosedIcon,
  },
  {
    title: "Data handling",
    body: "Decision memory, documents, and execution history stay within organization boundaries with export and deletion paths available.",
    icon: ShieldCheckIcon,
  },
  {
    title: "Operational resilience",
    body: "Billing, retention, and workspace controls are moving into a clearer operating layer instead of hidden admin settings.",
    icon: ServerStackIcon,
  },
];

const ENTERPRISE_CONTROLS = [
  "SSO / SAML access management",
  "Data residency and security annex review",
  "Custom rollout support and procurement handoff",
  "Expanded audit and governance expectations",
];

const DATA_RIGHTS = [
  "Export workspace data in standard formats",
  "Remove members and revoke pending invitations",
  "Review legal and security public docs before procurement",
  "Move from self-serve pricing to enterprise rollout when governance changes",
];

export default function Security() {
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);
  const [planName, setPlanName] = useState("");

  useEffect(() => {
    let isMounted = true;
    api
      .get("/api/organizations/subscription/")
      .then((response) => {
        if (isMounted) {
          setPlanName(response.data?.plan?.display_name || response.data?.plan?.name || "");
        }
      })
      .catch(() => {
        if (isMounted) {
          setPlanName("");
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <WorkspaceHero
        palette={palette}
        darkMode={darkMode}
        eyebrow="Security & Governance"
        title="Security posture should feel operational, not hidden."
        description="Review the controls available in the current workspace, then move into enterprise governance when identity, data residency, or procurement requirements become more formal."
        actions={
          <>
            <Link className="ui-btn-polish ui-focus-ring" to="/security-annex" style={{ ...ui.primaryButton, textDecoration: "none" }}>
              <ShieldCheckIcon style={{ width: 14, height: 14 }} />
              Open Security Annex
            </Link>
            <Link className="ui-btn-polish ui-focus-ring" to="/subscription" style={{ ...ui.secondaryButton, textDecoration: "none" }}>
              <BuildingOffice2Icon style={{ width: 14, height: 14 }} />
              Pricing & Upgrade
            </Link>
          </>
        }
        stats={[
          { label: "Current Plan", value: planName || "Workspace", helper: "Billing determines which governance controls are unlocked.", tone: palette.text },
          { label: "Identity", value: "RBAC", helper: "Role-based access exists on every workspace.", tone: palette.accent },
          { label: "Exports", value: "Available", helper: "Teams can keep data portable as policies evolve.", tone: palette.success },
          { label: "Enterprise Path", value: "Ready", helper: "Use pricing when SSO, data residency, or procurement appear.", tone: palette.warn },
        ]}
        aside={
          <UpgradeNotice
            palette={palette}
            title="Enterprise controls have a clear path now."
            description="When the workspace needs SSO / SAML, governance review, or residency conversations, move from self-serve pricing into the enterprise track."
            currentPlan={planName || undefined}
            requiredPlan="Enterprise"
            ctaTo="/subscription"
            ctaLabel="Review plans"
            secondaryTo="/enterprise"
            secondaryLabel="Enterprise"
          />
        }
      />

      <WorkspacePanel
        palette={palette}
        eyebrow="Security Layers"
        title="Core control pillars"
        description="The product already carries several operational control surfaces. This page makes them visible and points admins toward the right upgrade route when the team outgrows self-serve settings."
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
          {CONTROL_PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <article
                key={pillar.title}
                style={{
                  borderRadius: 22,
                  padding: 18,
                  border: `1px solid ${palette.border}`,
                  background: palette.cardAlt,
                  display: "grid",
                  gap: 10,
                }}
              >
                <div style={{ width: 42, height: 42, borderRadius: 14, display: "grid", placeItems: "center", background: palette.accentSoft, color: palette.accent }}>
                  <Icon style={{ width: 18, height: 18 }} />
                </div>
                <h3 style={{ margin: 0, fontSize: 18, letterSpacing: "-0.03em", color: palette.text }}>
                  {pillar.title}
                </h3>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: palette.muted }}>
                  {pillar.body}
                </p>
              </article>
            );
          })}
        </div>
      </WorkspacePanel>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 14 }}>
        <WorkspacePanel
          palette={palette}
          eyebrow="Enterprise Upgrade"
          title="Controls that usually trigger procurement"
          description="These are the moments where teams stop treating security as a settings page and start treating it like a rollout decision."
        >
          <div style={{ display: "grid", gap: 10 }}>
            {ENTERPRISE_CONTROLS.map((item) => (
              <div key={item} style={{ borderRadius: 18, padding: 14, border: `1px solid ${palette.border}`, background: palette.cardAlt, fontSize: 13, lineHeight: 1.55, color: palette.text }}>
                {item}
              </div>
            ))}
          </div>
        </WorkspacePanel>

        <WorkspacePanel
          palette={palette}
          eyebrow="Data Rights"
          title="Baseline control expectations"
          description="Keep the product promises grounded in actual workspace behavior instead of vague compliance copy."
        >
          <div style={{ display: "grid", gap: 10 }}>
            {DATA_RIGHTS.map((item) => (
              <div key={item} style={{ borderRadius: 18, padding: 14, border: `1px solid ${palette.border}`, background: palette.cardAlt, fontSize: 13, lineHeight: 1.55, color: palette.text }}>
                {item}
              </div>
            ))}
          </div>
        </WorkspacePanel>
      </div>
    </div>
  );
}
