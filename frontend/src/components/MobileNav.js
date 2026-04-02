import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  HomeIcon,
  ChatBubbleLeftIcon,
  Squares2X2Icon,
  RocketLaunchIcon,
  Bars3Icon,
  XMarkIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../utils/ThemeAndAccessibility";

function formatWorkspaceName(orgSlug) {
  if (!orgSlug) return "Knoledgr";
  return orgSlug
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export const MobileNav = ({ onSearchOpen }) => {
  const location = useLocation();
  const { darkMode } = useTheme();
  const { user, listWorkspaces, requestWorkspaceSwitchCode, switchWorkspace } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [workspaces, setWorkspaces] = useState([]);
  const [workspacePassword, setWorkspacePassword] = useState("");
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [requestingCodeOrgSlug, setRequestingCodeOrgSlug] = useState(null);
  const [switchingOrgSlug, setSwitchingOrgSlug] = useState(null);
  const [workspaceError, setWorkspaceError] = useState("");

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const loadWorkspaces = async () => {
      if (!menuOpen) return;
      setWorkspaceError("");
      setWorkspaceLoading(true);
      const result = await listWorkspaces();
      if (result.success) {
        setWorkspaces(Array.isArray(result.data?.workspaces) ? result.data.workspaces : []);
      } else {
        setWorkspaceError(result.error || "Failed to load workspaces");
      }
      setWorkspaceLoading(false);
    };

    loadWorkspaces();
  }, [menuOpen, listWorkspaces]);

  const palette = useMemo(
    () =>
      darkMode
        ? {
            surface: "rgba(29, 24, 21, 0.94)",
            panel: "#1c1714",
            panelAlt: "#241f1b",
            border: "rgba(238, 229, 216, 0.12)",
            text: "var(--app-text)",
            muted: "#b7ab9b",
            active: "var(--app-accent)",
            overlay: "rgba(0,0,0,0.58)",
            navPill: "var(--app-info-soft)",
          }
        : {
            surface: "rgba(255, 252, 248, 0.95)",
            panel: "var(--app-surface-alt)",
            panelAlt: "#f7f1e8",
            border: "var(--app-border)",
            text: "var(--app-text)",
            muted: "#6e655b",
            active: "var(--app-accent)",
            overlay: "rgba(20, 17, 13, 0.3)",
            navPill: "rgba(46, 99, 208, 0.08)",
          },
    [darkMode]
  );

  const experienceMode = localStorage.getItem("ui_experience_mode") || "standard";
  const workspaceName = formatWorkspaceName(user?.organization_slug);

  const navItems = [
    { path: "/dashboard", icon: HomeIcon, label: "Home", match: ["/dashboard"] },
    { path: "/knowledge", icon: Squares2X2Icon, label: "Knowledge", match: ["/knowledge"] },
    {
      path: "/conversations",
      icon: ChatBubbleLeftIcon,
      label: "Collab",
      match: ["/conversations", "/decisions", "/business/meetings"],
    },
    {
      path: "/projects",
      icon: RocketLaunchIcon,
      label: "Execute",
      match: ["/projects", "/business/goals", "/business/tasks", "/sprint-history", "/sprints", "/sprint"],
    },
  ];

  const menuSections = [
    {
      title: "Navigate",
      items: [
        {
          to: "/knowledge",
          label: "Knowledge",
          meta: "Search, graph, and analytics for workspace memory",
          match: ["/knowledge"],
        },
        {
          to: "/conversations",
          label: "Collaborate",
          meta: "Conversations, decisions, and meetings in motion",
          match: ["/conversations", "/decisions", "/business/meetings"],
        },
        {
          to: "/projects",
          label: "Execute",
          meta: "Projects, goals, tasks, and sprint delivery",
          match: ["/projects", "/business/goals", "/business/tasks", "/sprint-history", "/sprints", "/sprint"],
        },
        {
          to: "/docs",
          label: "Resources",
          meta: "Docs, templates, and shared operational assets",
          match: ["/docs", "/business/documents", "/business/templates", "/feedback/inbox", "/partners/inbox", "/import-export"],
        },
      ],
    },
    {
      title: "Utilities",
      items: [
        {
          to: "/profile",
          label: "Profile",
          meta: "Identity, account details, and personal preferences",
          match: ["/profile"],
        },
        {
          to: "/settings",
          label: "Settings",
          meta: "Theme, workspace preferences, and experience mode",
          match: ["/settings"],
        },
        {
          to: "/integrations",
          label: "Integrations",
          meta: "Connected tools, credentials, and service setup",
          match: ["/integrations"],
        },
        {
          to: "/enterprise",
          label: "Apps",
          meta: "Manage installed apps and workspace extensions",
          match: ["/enterprise"],
        },
      ],
    },
  ];

  const isActive = (path, match = [path]) => {
    return match.some((candidate) => location.pathname === candidate || location.pathname.startsWith(`${candidate}/`));
  };

  const handleSwitchWorkspace = async (orgSlug) => {
    if (!workspacePassword.trim()) {
      setWorkspaceError("Enter verification code to switch workspace");
      return;
    }

    setWorkspaceError("");
    setSwitchingOrgSlug(orgSlug);
    const result = await switchWorkspace({ org_slug: orgSlug, otp_code: workspacePassword });
    setSwitchingOrgSlug(null);

    if (!result.success) {
      setWorkspaceError(result.error || "Workspace switch failed");
      return;
    }

    setMenuOpen(false);
    setWorkspacePassword("");
    window.location.href = "/dashboard";
  };

  const handleRequestWorkspaceCode = async (orgSlug) => {
    setWorkspaceError("");
    setRequestingCodeOrgSlug(orgSlug);
    const result = await requestWorkspaceSwitchCode({ org_slug: orgSlug });
    setRequestingCodeOrgSlug(null);
    if (!result.success) {
      setWorkspaceError(result.error || "Failed to send verification code");
      return;
    }
    setWorkspaceError("Verification code sent to your email");
  };

  if (!isMobile) return null;

  return (
    <>
      <nav
        style={{
          ...mobileBottomNav,
          background: palette.surface,
          borderTop: `1px solid ${palette.border}`,
        }}
      >
        <div style={mobileBottomInner}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path, item.match);
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  ...mobileNavItem,
                  color: active ? palette.active : palette.muted,
                  background: active ? palette.navPill : "transparent",
                }}
              >
                <Icon style={icon20} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={onSearchOpen}
            style={{ ...mobileNavItem, color: palette.muted, background: "transparent", border: "none" }}
          >
            <MagnifyingGlassIcon style={icon20} />
            <span>Search</span>
          </button>

          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            style={{ ...mobileNavItem, color: palette.muted, background: "transparent", border: "none" }}
          >
            {menuOpen ? <XMarkIcon style={icon20} /> : <Bars3Icon style={icon20} />}
            <span>Menu</span>
          </button>
        </div>
      </nav>

      {menuOpen ? (
        <div style={{ ...menuOverlay, background: palette.overlay }} onClick={() => setMenuOpen(false)}>
          <aside
            style={{ ...menuPanel, background: palette.panel, borderLeft: `1px solid ${palette.border}` }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ ...menuHeader, borderBottom: `1px solid ${palette.border}` }}>
              <p style={{ ...menuTitle, color: palette.text }}>Workspace Menu</p>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                style={{ ...iconButton, color: palette.text, border: `1px solid ${palette.border}` }}
                aria-label="Close menu"
              >
                <XMarkIcon style={icon20} />
              </button>
            </div>

            <div style={menuContent}>
              <nav style={{ ...quickLinks, border: `1px solid ${palette.border}`, background: palette.panelAlt }}>
                <div
                  style={{
                    ...menuHero,
                    borderBottom: `1px solid ${palette.border}`,
                    background: palette.panelAlt,
                  }}
                >
                  <p style={{ ...menuHeroEyebrow, color: palette.muted }}>Workspace</p>
                  <p style={{ ...menuHeroTitle, color: palette.text }}>{workspaceName}</p>
                  <p style={{ ...menuHeroMeta, color: palette.muted }}>
                    {experienceMode === "simple" ? "Simple mode" : "Full workspace"} navigation for knowledge, collaboration, and execution.
                  </p>
                </div>
                <div style={menuSectionStack}>
                  {menuSections.map((section) => (
                    <section key={section.title} style={menuSection}>
                      <p style={{ ...menuSectionTitle, color: palette.muted }}>{section.title}</p>
                      <div style={menuSectionList}>
                        {section.items.map((item) => {
                          const active = isActive(item.to, item.match);
                          return (
                            <Link
                              key={item.to}
                              to={item.to}
                              style={{
                                ...menuLinkCard,
                                color: palette.text,
                                border: `1px solid ${active ? palette.active : palette.border}`,
                                background: active ? palette.navPill : palette.panel,
                              }}
                            >
                              <span style={menuLinkHeader}>
                                <span style={menuLinkLabel}>{item.label}</span>
                                {active ? (
                                  <span
                                    style={{
                                      ...menuLinkPill,
                                      color: palette.active,
                                      border: `1px solid ${palette.border}`,
                                      background: palette.surface,
                                    }}
                                  >
                                    Open
                                  </span>
                                ) : null}
                              </span>
                              <span style={{ ...menuLinkMeta, color: palette.muted }}>{item.meta}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              </nav>

              <section style={{ ...workspaceBlock, border: `1px solid ${palette.border}`, background: palette.panelAlt }}>
                <p style={{ ...workspaceHeading, color: palette.muted }}>Switch Workspace</p>
                <input
                  type="text"
                  value={workspacePassword}
                  onChange={(event) => setWorkspacePassword(event.target.value)}
                  placeholder="Enter 6-digit code"
                  style={{
                    ...workspaceInput,
                    background: palette.panel,
                    color: palette.text,
                    border: `1px solid ${palette.border}`,
                  }}
                />

                {workspaceError ? (
                  <p style={{ ...workspaceMeta, color: workspaceError.includes("sent") ? palette.muted : "var(--app-danger)" }}>
                    {workspaceError}
                  </p>
                ) : null}
                {workspaceLoading ? <p style={{ ...workspaceMeta, color: palette.muted }}>Loading workspaces...</p> : null}
                {!workspaceLoading && workspaces.length <= 1 ? (
                  <p style={{ ...workspaceMeta, color: palette.muted }}>No other workspace found.</p>
                ) : null}

                {!workspaceLoading && workspaces.length > 1 ? (
                  <div style={workspaceList}>
                    {workspaces.map((workspace) => {
                      const isCurrent = workspace.org_slug === user?.organization_slug;
                      return (
                        <div
                          key={`${workspace.user_id}-${workspace.org_slug}`}
                          style={{ ...workspaceCard, border: `1px solid ${palette.border}`, background: palette.panel }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <p style={{ ...workspaceName, color: palette.text }}>{workspace.org_name}</p>
                            <p style={{ ...workspaceMeta, color: palette.muted }}>
                              {workspace.org_slug} - {workspace.role}
                            </p>
                          </div>

                          {isCurrent ? (
                            <span style={{ ...currentTag, color: palette.text, border: `1px solid ${palette.border}` }}>
                              Current
                            </span>
                          ) : (
                            <div style={workspaceActions}>
                              <button
                                type="button"
                                onClick={() => handleRequestWorkspaceCode(workspace.org_slug)}
                                disabled={requestingCodeOrgSlug === workspace.org_slug}
                                style={{
                                  ...ghostButton,
                                  color: palette.text,
                                  border: `1px solid ${palette.border}`,
                                  opacity: requestingCodeOrgSlug === workspace.org_slug ? 0.65 : 1,
                                }}
                              >
                                {requestingCodeOrgSlug === workspace.org_slug ? "Sending..." : "Send"}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSwitchWorkspace(workspace.org_slug)}
                                disabled={switchingOrgSlug === workspace.org_slug}
                                style={{
                                  ...primaryButton,
                                  opacity: switchingOrgSlug === workspace.org_slug ? 0.65 : 1,
                                }}
                              >
                                {switchingOrgSlug === workspace.org_slug ? "Switching..." : "Switch"}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </section>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
};

export const MobileOptimized = ({ children }) => {
  return <div style={mobileContentWrap}>{children}</div>;
};

const iconButton = {
  width: 38,
  height: 38,
  display: "grid",
  placeItems: "center",
  background: "transparent",
  borderRadius: 12,
  padding: 0,
  cursor: "pointer",
};

const mobileBottomNav = {
  position: "fixed",
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 65,
  backdropFilter: "blur(14px)",
  paddingBottom: "env(safe-area-inset-bottom, 0px)",
  boxShadow: "0 -12px 28px rgba(26, 20, 16, 0.08)",
};

const mobileBottomInner = {
  minHeight: 68,
  display: "grid",
  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
  gap: 4,
  padding: "8px 8px 9px",
};

const mobileNavItem = {
  textDecoration: "none",
  display: "grid",
  justifyItems: "center",
  alignContent: "center",
  gap: 4,
  fontSize: 11,
  fontWeight: 700,
  lineHeight: 1.1,
  padding: "7px 4px",
  borderRadius: 14,
};

const menuOverlay = {
  position: "fixed",
  inset: 0,
  zIndex: 90,
};

const menuPanel = {
  position: "absolute",
  right: 0,
  top: 0,
  bottom: 0,
  width: "min(360px, 88vw)",
  display: "grid",
  gridTemplateRows: "auto minmax(0, 1fr)",
  boxShadow: "var(--ui-shadow-lg)",
};

const menuHeader = {
  padding: "14px 14px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
};

const menuTitle = {
  margin: 0,
  fontFamily: 'var(--font-display, "Fraunces"), Georgia, serif',
  fontSize: 22,
  fontWeight: 700,
};

const menuContent = {
  overflowY: "auto",
  padding: "14px",
  display: "grid",
  gap: 14,
};

const quickLinks = {
  display: "grid",
  borderRadius: 22,
  overflow: "hidden",
};

const menuHero = {
  padding: "16px 14px 14px",
  display: "grid",
  gap: 6,
};

const menuHeroEyebrow = {
  margin: 0,
  fontSize: 10,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.14em",
};

const menuHeroTitle = {
  margin: 0,
  fontFamily: 'var(--font-display, "Fraunces"), Georgia, serif',
  fontSize: 24,
  lineHeight: 1,
  fontWeight: 700,
};

const menuHeroMeta = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.45,
};

const menuSectionStack = {
  display: "grid",
  gap: 12,
  padding: "14px",
};

const menuSection = {
  display: "grid",
  gap: 8,
};

const menuSectionTitle = {
  margin: 0,
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

const menuSectionList = {
  display: "grid",
  gap: 8,
};

const menuLinkCard = {
  textDecoration: "none",
  borderRadius: 18,
  padding: "12px 13px",
  display: "grid",
  gap: 4,
};

const menuLinkHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
};

const menuLinkLabel = {
  fontSize: 14,
  fontWeight: 800,
  lineHeight: 1.15,
};

const menuLinkMeta = {
  fontSize: 12,
  lineHeight: 1.4,
};

const menuLinkPill = {
  borderRadius: 999,
  padding: "4px 8px",
  fontSize: 10,
  fontWeight: 700,
  lineHeight: 1,
};

const workspaceBlock = {
  display: "grid",
  gap: 10,
  padding: "14px",
  borderRadius: 22,
};

const workspaceHeading = {
  margin: 0,
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const workspaceInput = {
  width: "100%",
  padding: "12px 13px",
  outline: "none",
  fontSize: 14,
  fontFamily: "inherit",
  borderRadius: 16,
};

const workspaceList = {
  display: "grid",
  gap: 8,
};

const workspaceCard = {
  padding: "12px",
  display: "grid",
  gap: 8,
  borderRadius: 18,
};

const workspaceName = {
  margin: 0,
  fontSize: 14,
  fontWeight: 700,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const workspaceMeta = {
  margin: "4px 0 0",
  fontSize: 12,
};

const currentTag = {
  display: "inline-flex",
  alignItems: "center",
  width: "fit-content",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  padding: "5px 10px",
  borderRadius: 999,
};

const workspaceActions = {
  display: "flex",
  gap: 6,
  alignItems: "center",
};

const ghostButton = {
  borderRadius: 999,
  background: "transparent",
  padding: "8px 11px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};

const primaryButton = {
  border: "1px solid rgba(46, 99, 208, 0.22)",
  borderRadius: 999,
  background: "linear-gradient(135deg, #2e63d0, #5e8fe8)",
  color: "#fbf7f0",
  padding: "8px 11px",
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
};

const mobileContentWrap = { minHeight: "100vh", paddingBottom: "calc(72px + env(safe-area-inset-bottom, 0px))" };

const icon20 = { width: 20, height: 20 };
