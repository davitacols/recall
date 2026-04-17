import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Bars3Icon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getUnifiedNavPalette } from "../utils/projectUi";
import BrandLogo from "./BrandLogo";
import {
  buildUnifiedNavModel,
  formatWorkspaceName,
  getNavItemCount,
  isHrefActive,
  isNavItemActive,
} from "./unifiedNavConfig";

export const MobileNav = ({ onSearchOpen }) => {
  const location = useLocation();
  const { darkMode } = useTheme();
  const {
    user,
    listWorkspaces,
    requestWorkspaceSwitchCode,
    switchWorkspace,
  } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [workspaces, setWorkspaces] = useState([]);
  const [workspacePassword, setWorkspacePassword] = useState("");
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [requestingCodeOrgSlug, setRequestingCodeOrgSlug] = useState(null);
  const [switchingOrgSlug, setSwitchingOrgSlug] = useState(null);
  const [workspaceError, setWorkspaceError] = useState("");
  const [installedApps, setInstalledApps] = useState([]);
  const [experienceMode, setExperienceMode] = useState(
    localStorage.getItem("ui_experience_mode") || "standard"
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const syncExperienceMode = () => {
      setExperienceMode(localStorage.getItem("ui_experience_mode") || "standard");
    };

    window.addEventListener("storage", syncExperienceMode);
    window.addEventListener("focus", syncExperienceMode);
    window.addEventListener("experience-mode-changed", syncExperienceMode);

    return () => {
      window.removeEventListener("storage", syncExperienceMode);
      window.removeEventListener("focus", syncExperienceMode);
      window.removeEventListener("experience-mode-changed", syncExperienceMode);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;

    let active = true;

    const loadWorkspaces = async () => {
      setWorkspaceError("");
      setWorkspaceLoading(true);
      const result = await listWorkspaces();
      if (!active) return;

      if (result.success) {
        setWorkspaces(Array.isArray(result.data?.workspaces) ? result.data.workspaces : []);
      } else {
        setWorkspaceError(result.error || "Failed to load workspaces");
      }
      setWorkspaceLoading(false);
    };

    const loadInstalledApps = async () => {
      try {
        const response = await api.get("/api/organizations/enterprise/marketplace/apps/");
        if (!active) return;
        const apps = Array.isArray(response.data) ? response.data : [];
        setInstalledApps(apps.filter((app) => app.installed));
      } catch {
        if (!active) return;
        setInstalledApps([]);
      }
    };

    loadWorkspaces();
    loadInstalledApps();

    return () => {
      active = false;
    };
  }, [listWorkspaces, menuOpen]);

  const palette = useMemo(() => getUnifiedNavPalette(darkMode), [darkMode]);

  const {
    askRecallItem,
    bottomNavItems,
    mobileMenuSections,
  } = useMemo(
    () =>
      buildUnifiedNavModel({
        user,
        experienceMode,
        installedApps,
      }),
    [experienceMode, installedApps, user]
  );

  const workspaceName = formatWorkspaceName(user?.organization_slug);

  const handleSwitchWorkspace = async (orgSlug) => {
    if (!workspacePassword.trim()) {
      setWorkspaceError("Enter verification code to switch workspace");
      return;
    }

    setWorkspaceError("");
    setSwitchingOrgSlug(orgSlug);
    const result = await switchWorkspace({
      org_slug: orgSlug,
      otp_code: workspacePassword,
    });
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

  const renderLeafLink = (item) => {
    const Icon = item.icon;
    const active = isNavItemActive(location.pathname, item);

    return (
      <Link
        key={item.href || item.name}
        to={item.href}
        onClick={() => setMenuOpen(false)}
        style={{
          ...menuLeafLink,
          color: palette.text,
          background: active ? palette.active : palette.surface,
          border: `1px solid ${active ? palette.activeBorder : palette.border}`,
          boxShadow: active ? palette.itemShadow : "none",
        }}
      >
        <span
          style={{
            ...menuLeafIcon,
            background: active ? palette.accentSoft : palette.surfaceMuted,
            border: `1px solid ${active ? palette.activeBorder : palette.border}`,
            color: active ? palette.accent : palette.muted,
          }}
        >
          <Icon style={icon18} />
        </span>
        <span style={menuLeafBody}>
          <span style={{ ...menuLeafTitle, color: palette.text }}>{item.name}</span>
          <span style={{ ...menuLeafMeta, color: palette.muted }}>
            {item.summary || item.description}
          </span>
        </span>
        <ChevronRightIcon style={{ ...icon16, color: palette.muted }} />
      </Link>
    );
  };

  const renderGroupCard = (item) => {
    const Icon = item.icon;
    const active = isNavItemActive(location.pathname, item);

    return (
      <div
        key={item.name}
        style={{
          ...menuGroupCard,
          background: active ? palette.active : palette.surface,
          border: `1px solid ${active ? palette.activeBorder : palette.border}`,
          boxShadow: active ? palette.itemShadow : "none",
        }}
      >
        <div style={menuGroupHeader}>
          <span
            style={{
              ...menuLeafIcon,
              background: active ? palette.accentSoft : palette.surfaceMuted,
              border: `1px solid ${active ? palette.activeBorder : palette.border}`,
              color: active ? palette.accent : palette.muted,
            }}
          >
            <Icon style={icon18} />
          </span>
          <span style={menuLeafBody}>
            <span style={{ ...menuLeafTitle, color: palette.text }}>{item.name}</span>
            <span style={{ ...menuLeafMeta, color: palette.muted }}>{item.summary}</span>
          </span>
          <span
            style={{
              ...menuCount,
              color: active ? palette.text : palette.muted,
              border: `1px solid ${active ? palette.activeBorder : palette.border}`,
              background: active ? palette.accentSoft : palette.surfaceMuted,
            }}
          >
            {getNavItemCount(item)}
          </span>
        </div>

        <div style={menuSubList}>
          {item.items.map((subItem) => {
            const subActive =
              !subItem.external && isHrefActive(location.pathname, subItem.href);
            const SubIcon = subItem.icon;

            if (subItem.external) {
              return (
                <a
                  key={subItem.id || subItem.href || subItem.name}
                  href={subItem.href}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setMenuOpen(false)}
                  style={{
                    ...menuSubItem,
                    color: palette.text,
                    background: palette.surfaceMuted,
                    border: `1px solid ${palette.border}`,
                  }}
                >
                  <span style={menuSubLabelWrap}>
                    <SubIcon style={{ ...icon16, color: palette.muted }} />
                    <span style={menuSubLabel}>{subItem.name}</span>
                  </span>
                  <span style={{ ...menuSubMeta, color: palette.muted }}>External</span>
                </a>
              );
            }

            return (
              <Link
                key={subItem.href}
                to={subItem.href}
                onClick={() => setMenuOpen(false)}
                style={{
                  ...menuSubItem,
                  color: palette.text,
                  background: subActive ? palette.surface : palette.surfaceMuted,
                  border: `1px solid ${subActive ? palette.activeBorder : palette.border}`,
                }}
              >
                <span style={menuSubLabelWrap}>
                  <SubIcon style={{ ...icon16, color: subActive ? palette.accent : palette.muted }} />
                  <span style={menuSubLabel}>{subItem.name}</span>
                </span>
                {subActive ? (
                  <span style={{ ...menuSubMeta, color: palette.accent }}>Current</span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>
    );
  };

  if (!isMobile) return null;

  return (
    <>
      <nav
        style={{
          ...mobileBottomNav,
          background: palette.surface,
          borderTop: `1px solid ${palette.border}`,
          boxShadow: palette.shadow,
        }}
      >
        <div style={mobileBottomInner}>
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const active = item.match.some((candidate) =>
              location.pathname === candidate ||
              location.pathname.startsWith(`${candidate}/`)
            );

            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  ...mobileNavItem,
                  color: active ? palette.accent : palette.muted,
                  background: active ? palette.accentSoft : "transparent",
                  border: `1px solid ${active ? palette.activeBorder : "transparent"}`,
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
            style={{
              ...mobileNavItem,
              color: palette.muted,
              background: "transparent",
              border: "1px solid transparent",
            }}
          >
            <MagnifyingGlassIcon style={icon20} />
            <span>Search</span>
          </button>

          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            style={{
              ...mobileNavItem,
              color: menuOpen ? palette.accent : palette.muted,
              background: menuOpen ? palette.accentSoft : "transparent",
              border: `1px solid ${menuOpen ? palette.activeBorder : "transparent"}`,
            }}
          >
            {menuOpen ? <XMarkIcon style={icon20} /> : <Bars3Icon style={icon20} />}
            <span>Menu</span>
          </button>
        </div>
      </nav>

      {menuOpen ? (
        <div
          style={{ ...menuOverlay, background: "rgba(17, 13, 10, 0.42)" }}
          onClick={() => setMenuOpen(false)}
        >
          <aside
            style={{
              ...menuPanel,
              background: palette.navBg,
              borderLeft: `1px solid ${palette.borderStrong || palette.border}`,
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              style={{
                ...menuHeader,
                borderBottom: `1px solid ${palette.border}`,
                background: palette.surface,
              }}
            >
              <div style={menuHeaderBrand}>
                <span
                  style={{
                    ...menuBrandMark,
                    background: palette.brandBadgeBg,
                    border: `1px solid ${palette.brandBadgeBorder}`,
                  }}
                >
                  <BrandLogo
                    tone={darkMode ? "light" : "warm"}
                    size="sm"
                    showText={false}
                  />
                </span>
                <div style={menuHeaderText}>
                  <p style={{ ...menuHeaderEyebrow, color: palette.muted }}>Knoledgr</p>
                  <p style={{ ...menuHeaderTitle, color: palette.text }}>{workspaceName}</p>
                  <p style={{ ...menuHeaderMeta, color: palette.muted }}>
                    {experienceMode === "simple" ? "Simple workspace" : "Full workspace"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                style={{
                  ...closeButton,
                  color: palette.text,
                  border: `1px solid ${palette.border}`,
                  background: palette.surfaceMuted,
                }}
                aria-label="Close menu"
              >
                <XMarkIcon style={icon18} />
              </button>
            </div>

            <div style={menuContent}>
              <Link
                to={askRecallItem.href}
                onClick={() => setMenuOpen(false)}
                style={{
                  ...askRecallCard,
                  color: palette.ctaText,
                  background: palette.ctaGradient,
                  border: `1px solid ${palette.ctaBorder}`,
                  boxShadow: palette.featureShadow,
                }}
              >
                <span
                  style={{
                    ...askRecallIcon,
                    background: palette.ctaIconBg,
                    border: `1px solid ${palette.ctaIconBorder}`,
                  }}
                >
                  <SparklesIcon style={icon18} />
                </span>
                <span style={askRecallText}>
                  <span style={askRecallEyebrow}>Quick action</span>
                  <span style={askRecallTitle}>Ask Recall</span>
                  <span style={askRecallMeta}>{askRecallItem.summary}</span>
                </span>
              </Link>

              <div style={sectionStack}>
                {mobileMenuSections.map((section) => (
                  <section
                    key={section.title}
                    style={{
                      ...sectionCard,
                      background: palette.surface,
                      border: `1px solid ${palette.border}`,
                    }}
                  >
                    <p style={{ ...sectionTitle, color: palette.muted }}>{section.title}</p>
                    <div style={sectionBody}>
                      {section.items.map((item) =>
                        getNavItemCount(item) > 0 ? renderGroupCard(item) : renderLeafLink(item)
                      )}
                    </div>
                  </section>
                ))}
              </div>

              <section
                style={{
                  ...workspaceBlock,
                  background: palette.surface,
                  border: `1px solid ${palette.border}`,
                }}
              >
                <p style={{ ...sectionTitle, color: palette.muted }}>Switch Workspace</p>
                <input
                  type="text"
                  value={workspacePassword}
                  onChange={(event) => setWorkspacePassword(event.target.value)}
                  placeholder="Enter 6-digit code"
                  style={{
                    ...workspaceInput,
                    background: palette.searchBg,
                    color: palette.text,
                    border: `1px solid ${palette.border}`,
                  }}
                />

                {workspaceError ? (
                  <p
                    style={{
                      ...workspaceMeta,
                      color: workspaceError.includes("sent")
                        ? palette.muted
                        : "var(--app-danger)",
                    }}
                  >
                    {workspaceError}
                  </p>
                ) : null}

                {workspaceLoading ? (
                  <p style={{ ...workspaceMeta, color: palette.muted }}>
                    Loading workspaces...
                  </p>
                ) : null}

                {!workspaceLoading && workspaces.length <= 1 ? (
                  <p style={{ ...workspaceMeta, color: palette.muted }}>
                    No other workspace found.
                  </p>
                ) : null}

                {!workspaceLoading && workspaces.length > 1 ? (
                  <div style={workspaceList}>
                    {workspaces.map((workspace) => {
                      const isCurrent = workspace.org_slug === user?.organization_slug;

                      return (
                        <div
                          key={`${workspace.user_id}-${workspace.org_slug}`}
                          style={{
                            ...workspaceCard,
                            background: palette.surfaceMuted,
                            border: `1px solid ${palette.border}`,
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <p style={{ ...workspaceNameText, color: palette.text }}>
                              {workspace.org_name}
                            </p>
                            <p style={{ ...workspaceMeta, color: palette.muted }}>
                              {workspace.org_slug} - {workspace.role}
                            </p>
                          </div>

                          {isCurrent ? (
                            <span
                              style={{
                                ...currentTag,
                                color: palette.text,
                                border: `1px solid ${palette.border}`,
                                background: palette.surface,
                              }}
                            >
                              Current
                            </span>
                          ) : (
                            <div style={workspaceActions}>
                              <button
                                type="button"
                                onClick={() => handleRequestWorkspaceCode(workspace.org_slug)}
                                disabled={requestingCodeOrgSlug === workspace.org_slug}
                                style={{
                                  ...workspaceGhostButton,
                                  color: palette.text,
                                  border: `1px solid ${palette.border}`,
                                  background: palette.surface,
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
                                  ...workspacePrimaryButton,
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

const mobileBottomNav = {
  position: "fixed",
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 65,
  paddingBottom: "env(safe-area-inset-bottom, 0px)",
  backdropFilter: "blur(18px)",
};

const mobileBottomInner = {
  minHeight: 68,
  display: "grid",
  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
  gap: 4,
  padding: "8px 8px 9px",
};

const mobileNavItem = {
  display: "grid",
  justifyItems: "center",
  alignContent: "center",
  gap: 4,
  minHeight: 48,
  borderRadius: 16,
  textDecoration: "none",
  fontSize: 10,
  fontWeight: 700,
  lineHeight: 1.1,
};

const menuOverlay = {
  position: "fixed",
  inset: 0,
  zIndex: 90,
};

const menuPanel = {
  position: "absolute",
  top: 0,
  right: 0,
  bottom: 0,
  width: "min(392px, 92vw)",
  display: "grid",
  gridTemplateRows: "auto minmax(0, 1fr)",
  boxShadow: "0 28px 60px rgba(17, 13, 10, 0.24)",
};

const menuHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  padding: "16px 14px 14px",
};

const menuHeaderBrand = {
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr)",
  gap: 10,
  alignItems: "center",
  minWidth: 0,
  flex: 1,
};

const menuBrandMark = {
  width: 42,
  height: 42,
  display: "grid",
  placeItems: "center",
  borderRadius: 15,
  flexShrink: 0,
};

const menuHeaderText = {
  minWidth: 0,
  display: "grid",
  gap: 2,
};

const menuHeaderEyebrow = {
  margin: 0,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  lineHeight: 1,
};

const menuHeaderTitle = {
  margin: 0,
  fontSize: 16,
  fontWeight: 700,
  lineHeight: 1.15,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const menuHeaderMeta = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.35,
};

const closeButton = {
  width: 36,
  height: 36,
  display: "grid",
  placeItems: "center",
  borderRadius: 14,
  cursor: "pointer",
  flexShrink: 0,
};

const menuContent = {
  overflowY: "auto",
  padding: "14px",
  display: "grid",
  gap: 14,
};

const askRecallCard = {
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr)",
  gap: 10,
  alignItems: "center",
  textDecoration: "none",
  borderRadius: 22,
  padding: "14px 14px 13px",
};

const askRecallIcon = {
  width: 38,
  height: 38,
  display: "grid",
  placeItems: "center",
  borderRadius: 14,
};

const askRecallText = {
  minWidth: 0,
  display: "grid",
  gap: 3,
};

const askRecallEyebrow = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  lineHeight: 1,
};

const askRecallTitle = {
  fontSize: 15,
  fontWeight: 700,
  lineHeight: 1.12,
};

const askRecallMeta = {
  fontSize: 12,
  lineHeight: 1.35,
  opacity: 0.9,
};

const sectionStack = {
  display: "grid",
  gap: 12,
};

const sectionCard = {
  display: "grid",
  gap: 10,
  borderRadius: 22,
  padding: "12px",
};

const sectionTitle = {
  margin: 0,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  lineHeight: 1,
};

const sectionBody = {
  display: "grid",
  gap: 8,
};

const menuLeafLink = {
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr) auto",
  gap: 10,
  alignItems: "center",
  textDecoration: "none",
  borderRadius: 18,
  padding: "12px",
};

const menuLeafIcon = {
  width: 36,
  height: 36,
  display: "grid",
  placeItems: "center",
  borderRadius: 14,
  flexShrink: 0,
};

const menuLeafBody = {
  minWidth: 0,
  display: "grid",
  gap: 3,
};

const menuLeafTitle = {
  fontSize: 14,
  fontWeight: 700,
  lineHeight: 1.15,
};

const menuLeafMeta = {
  fontSize: 11,
  lineHeight: 1.35,
};

const menuGroupCard = {
  display: "grid",
  gap: 10,
  borderRadius: 18,
  padding: "12px",
};

const menuGroupHeader = {
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr) auto",
  gap: 10,
  alignItems: "center",
};

const menuCount = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 28,
  height: 24,
  padding: "0 8px",
  borderRadius: 999,
  fontSize: 10,
  fontWeight: 700,
  lineHeight: 1,
};

const menuSubList = {
  display: "grid",
  gap: 6,
};

const menuSubItem = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  textDecoration: "none",
  borderRadius: 14,
  padding: "10px 11px",
};

const menuSubLabelWrap = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
};

const menuSubLabel = {
  fontSize: 12,
  fontWeight: 700,
  lineHeight: 1.2,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const menuSubMeta = {
  fontSize: 10,
  fontWeight: 700,
  lineHeight: 1,
  flexShrink: 0,
};

const workspaceBlock = {
  display: "grid",
  gap: 10,
  borderRadius: 22,
  padding: "12px",
};

const workspaceInput = {
  width: "100%",
  borderRadius: 16,
  padding: "11px 12px",
  fontSize: 14,
  fontFamily: "inherit",
  outline: "none",
};

const workspaceList = {
  display: "grid",
  gap: 8,
};

const workspaceCard = {
  display: "grid",
  gap: 8,
  borderRadius: 16,
  padding: "11px",
};

const workspaceNameText = {
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
  lineHeight: 1.35,
};

const currentTag = {
  display: "inline-flex",
  alignItems: "center",
  width: "fit-content",
  borderRadius: 999,
  padding: "5px 10px",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const workspaceActions = {
  display: "flex",
  gap: 6,
  alignItems: "center",
};

const workspaceGhostButton = {
  borderRadius: 999,
  padding: "8px 11px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};

const workspacePrimaryButton = {
  border: "1px solid rgba(46, 99, 208, 0.22)",
  borderRadius: 999,
  background: "linear-gradient(135deg, #2E63D0, #5E8FE8)",
  color: "#FBF7F0",
  padding: "8px 11px",
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
};

const mobileContentWrap = {
  minHeight: "100vh",
  paddingBottom: "calc(76px + env(safe-area-inset-bottom, 0px))",
};

const icon20 = { width: 20, height: 20 };
const icon18 = { width: 18, height: 18 };
const icon16 = { width: 16, height: 16 };
