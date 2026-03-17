import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronDownIcon, MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../utils/ThemeAndAccessibility";
import BrandLogo from "./BrandLogo";
import NLCommandBar from "./NLCommandBar";
import NotificationBell from "./NotificationBell";
import UnifiedNav from "./UnifiedNav";

const SIDEBAR_STORAGE_KEY = "unifiedSidebarWidth";
const SIDEBAR_COLLAPSED_STORAGE_KEY = "unifiedSidebarCollapsed";
const SIDEBAR_WIDTH_DEFAULT = 272;
const SIDEBAR_WIDTH_COLLAPSED = 72;
const SIDEBAR_WIDTH_MIN = 220;
const SIDEBAR_WIDTH_MAX = 420;
const SUBNAV_WIDTH = 236;
const ASK_FAB_STORAGE_KEY = "askRecallFabPosV1";
const ASK_FAB_WIDTH = 132;
const ASK_FAB_HEIGHT = 44;
const ASK_FAB_PAD = 14;

function clampFabPosition(x, y) {
  const mobileOffset = window.innerWidth < 768 ? 88 : 0;
  const maxX = Math.max(ASK_FAB_PAD, window.innerWidth - ASK_FAB_WIDTH - ASK_FAB_PAD);
  const maxY = Math.max(
    ASK_FAB_PAD,
    window.innerHeight - ASK_FAB_HEIGHT - ASK_FAB_PAD - mobileOffset
  );
  return {
    x: Math.min(Math.max(ASK_FAB_PAD, x), maxX),
    y: Math.min(Math.max(ASK_FAB_PAD, y), maxY),
  };
}

function getDefaultFabPosition() {
  if (typeof window === "undefined") return { x: 24, y: 24 };
  return clampFabPosition(window.innerWidth - ASK_FAB_WIDTH - 24, window.innerHeight - ASK_FAB_HEIGHT - 24);
}

function loadFabPosition() {
  if (typeof window === "undefined") return { x: 24, y: 24 };
  try {
    const raw = window.localStorage.getItem(ASK_FAB_STORAGE_KEY);
    if (!raw) return getDefaultFabPosition();
    const parsed = JSON.parse(raw);
    if (!Number.isFinite(parsed?.x) || !Number.isFinite(parsed?.y)) return getDefaultFabPosition();
    return clampFabPosition(parsed.x, parsed.y);
  } catch {
    return getDefaultFabPosition();
  }
}

export default function UnifiedLayout({ children }) {
  const { user, logout, listWorkspaces, requestWorkspaceSwitchCode, switchWorkspace } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = Number(window.localStorage.getItem(SIDEBAR_STORAGE_KEY));
    if (!Number.isFinite(saved)) return SIDEBAR_WIDTH_DEFAULT;
    return Math.min(SIDEBAR_WIDTH_MAX, Math.max(SIDEBAR_WIDTH_MIN, saved));
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "true"
  );
  const [subnavOpen, setSubnavOpen] = useState(false);
  const [askFabPos, setAskFabPos] = useState(loadFabPosition);
  const [showProfile, setShowProfile] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [workspacesLoading, setWorkspacesLoading] = useState(false);
  const [workspacePassword, setWorkspacePassword] = useState("");
  const [requestingCodeOrgSlug, setRequestingCodeOrgSlug] = useState(null);
  const [switchingOrgSlug, setSwitchingOrgSlug] = useState(null);
  const [workspaceError, setWorkspaceError] = useState("");
  const profileRef = useRef(null);
  const askFabDragRef = useRef({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
    moved: false,
  });

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const onResize = () => {
      setAskFabPos((current) => clampFabPosition(current.x, current.y));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (!profileRef.current?.contains(event.target)) {
        setShowProfile(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    const loadWorkspaces = async () => {
      if (!showProfile) return;
      setWorkspaceError("");
      setWorkspacesLoading(true);
      const result = await listWorkspaces();
      if (result.success) {
        const items = Array.isArray(result.data?.workspaces) ? result.data.workspaces : [];
        setWorkspaces(items);
      } else {
        setWorkspaceError(result.error || "Failed to load workspaces");
      }
      setWorkspacesLoading(false);
    };

    loadWorkspaces();
  }, [showProfile]);

  const palette = useMemo(
    () =>
      darkMode
        ? {
            pageBg: "#14110f",
            panelBg: "rgba(29, 24, 21, 0.9)",
            panelBgAlt: "#221d19",
            panelGlass: "linear-gradient(180deg, rgba(31, 26, 23, 0.94), rgba(21, 18, 15, 0.92))",
            border: "rgba(238, 229, 216, 0.12)",
            text: "#f5efe6",
            muted: "#b7ab9b",
            hover: "rgba(154, 185, 255, 0.08)",
            glowOne: "rgba(154, 185, 255, 0.14)",
            glowTwo: "rgba(210, 168, 106, 0.1)",
            buttonBg: "rgba(35, 29, 25, 0.88)",
            menuSurface: "#1c1714",
            accent: "#9ab9ff",
            accentSoft: "rgba(154, 185, 255, 0.14)",
            avatarGradient: "linear-gradient(135deg, #e7effd, #9ab9ff)",
            avatarText: "#121418",
            primaryGradient: "linear-gradient(135deg, #e7effd, #9ab9ff)",
            primaryText: "#121418",
            primaryBorder: "rgba(154, 185, 255, 0.32)",
            headerBg: "rgba(26, 22, 19, 0.76)",
            headerShadow: "0 18px 38px rgba(0,0,0,0.18)",
            backdrop:
              "url('/brand/knoledgr-grid.svg'), radial-gradient(900px 540px at -8% -8%, rgba(154, 185, 255, 0.12), transparent 62%), radial-gradient(760px 520px at 108% -4%, rgba(210, 168, 106, 0.08), transparent 58%), linear-gradient(180deg, #14110f, #171310)",
          }
        : {
            pageBg: "#f6f1e8",
            panelBg: "rgba(255, 252, 248, 0.94)",
            panelBgAlt: "#f1e9dd",
            panelGlass: "linear-gradient(180deg, rgba(255, 252, 248, 0.96), rgba(246, 238, 226, 0.94))",
            border: "rgba(58, 47, 38, 0.12)",
            text: "#1f1a17",
            muted: "#6e655b",
            hover: "rgba(46, 99, 208, 0.06)",
            glowOne: "rgba(94, 143, 232, 0.12)",
            glowTwo: "rgba(214, 196, 167, 0.18)",
            buttonBg: "rgba(255, 252, 248, 0.9)",
            menuSurface: "#fffcf8",
            accent: "#2e63d0",
            accentSoft: "rgba(46, 99, 208, 0.1)",
            avatarGradient: "linear-gradient(135deg, #2e63d0, #5e8fe8)",
            avatarText: "#fbf7f0",
            primaryGradient: "linear-gradient(135deg, #2e63d0, #5e8fe8)",
            primaryText: "#fbf7f0",
            primaryBorder: "rgba(46, 99, 208, 0.22)",
            headerBg: "rgba(255, 252, 248, 0.76)",
            headerShadow: "0 18px 36px rgba(38, 30, 24, 0.06)",
            backdrop:
              "url('/brand/knoledgr-grid.svg'), radial-gradient(920px 560px at -8% -8%, rgba(94, 143, 232, 0.12), transparent 62%), radial-gradient(760px 520px at 108% -4%, rgba(214, 196, 167, 0.18), transparent 58%), linear-gradient(180deg, #f6f1e8, #fbf7f0)",
          },
    [darkMode]
  );

  const avatar = user?.avatar;
  const initial = user?.full_name?.charAt(0)?.toUpperCase() || "U";
  const activeSidebarWidth = sidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED : sidebarWidth;
  const pageMeta = getPageMeta(location.pathname);
  const pageTitle = pageMeta.title;
  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }).format(new Date()),
    []
  );
  const showAskFab =
    location.pathname === "/" || location.pathname === "/dashboard" || location.pathname === "/business";

  const handleSidebarWidthChange = (nextWidth) => {
    const clamped = Math.min(SIDEBAR_WIDTH_MAX, Math.max(SIDEBAR_WIDTH_MIN, nextWidth));
    setSidebarWidth(clamped);
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(clamped));
  };

  const handleToggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(next));
      return next;
    });
  };

  useEffect(() => {
    if (isMobile || sidebarCollapsed) {
      setSubnavOpen(false);
    }
  }, [isMobile, sidebarCollapsed]);

  const handleAskFabPointerDown = (event) => {
    askFabDragRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - askFabPos.x,
      offsetY: event.clientY - askFabPos.y,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleAskFabPointerMove = (event) => {
    if (!askFabDragRef.current.active || askFabDragRef.current.pointerId !== event.pointerId) return;
    const distance = Math.hypot(
      event.clientX - askFabDragRef.current.startX,
      event.clientY - askFabDragRef.current.startY
    );
    const x = event.clientX - askFabDragRef.current.offsetX;
    const y = event.clientY - askFabDragRef.current.offsetY;
    askFabDragRef.current.moved = distance > 4;
    setAskFabPos(clampFabPosition(x, y));
  };

  const handleAskFabPointerUp = (event) => {
    if (askFabDragRef.current.pointerId !== event.pointerId) return;
    const moved = askFabDragRef.current.moved;
    askFabDragRef.current = {
      active: false,
      pointerId: null,
      startX: 0,
      startY: 0,
      offsetX: 0,
      offsetY: 0,
      moved: false,
    };
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch (_) {
      // ignore release failures
    }
    window.localStorage.setItem(ASK_FAB_STORAGE_KEY, JSON.stringify(askFabPos));
    if (!moved) navigate("/ask");
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

    setWorkspacePassword("");
    setShowProfile(false);
    window.location.href = "/";
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

  const workspaceSwitcherContent = (
    <div style={{ ...workspaceMenuSection, borderTop: `1px solid ${palette.border}` }}>
      <p style={{ ...workspaceTitle, color: palette.muted }}>Switch Workspace</p>
      <input
        type="text"
        value={workspacePassword}
        onChange={(event) => setWorkspacePassword(event.target.value)}
        placeholder="Enter 6-digit code"
        className="ui-focus-ring"
        style={{
          ...workspacePasswordInput,
          background: palette.buttonBg,
          color: palette.text,
          border: `1px solid ${palette.border}`,
        }}
      />
      {workspaceError ? (
        <p style={{ ...workspaceMeta, color: workspaceError.includes("sent") ? palette.muted : "var(--app-danger)" }}>{workspaceError}</p>
      ) : null}
      {workspacesLoading ? (
        <p style={{ ...workspaceMeta, color: palette.muted }}>Loading workspaces...</p>
      ) : null}
      {!workspacesLoading && workspaces.length <= 1 ? (
        <p style={{ ...workspaceMeta, color: palette.muted }}>No other workspace found.</p>
      ) : null}
      {!workspacesLoading && workspaces.length > 1 ? (
        <div style={workspaceList}>
          {workspaces.map((workspace) => {
            const isCurrent = workspace.org_slug === user?.organization_slug;
            return (
              <div
                key={`${workspace.user_id}-${workspace.org_slug}`}
                style={{
                  ...workspaceItem,
                  border: `1px solid ${palette.border}`,
                  background: palette.panelBgAlt,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <p style={{ ...workspaceName, color: palette.text }}>{workspace.org_name}</p>
                  <p style={{ ...workspaceMeta, color: palette.muted }}>
                    {workspace.org_slug} - {workspace.role}
                  </p>
                </div>
                {isCurrent ? (
                  <span style={{ ...workspaceTag, border: `1px solid ${palette.border}`, color: palette.text }}>
                    Current
                  </span>
                ) : (
                  <div style={workspaceActions}>
                    <button
                      onClick={() => handleRequestWorkspaceCode(workspace.org_slug)}
                      disabled={requestingCodeOrgSlug === workspace.org_slug}
                      className="ui-btn-polish ui-focus-ring"
                      style={{
                        ...workspaceSwitchButton,
                        background: palette.buttonBg,
                        color: palette.text,
                        border: `1px solid ${palette.border}`,
                        opacity: requestingCodeOrgSlug === workspace.org_slug ? 0.65 : 1,
                        cursor: requestingCodeOrgSlug === workspace.org_slug ? "not-allowed" : "pointer",
                      }}
                    >
                      {requestingCodeOrgSlug === workspace.org_slug ? "Sending..." : "Send Code"}
                    </button>
                    <button
                      onClick={() => handleSwitchWorkspace(workspace.org_slug)}
                      disabled={switchingOrgSlug === workspace.org_slug}
                      className="ui-btn-polish ui-focus-ring"
                      style={{
                        ...workspaceSwitchButton,
                        background: palette.primaryGradient,
                        color: palette.primaryText,
                        border: `1px solid ${palette.primaryBorder}`,
                        opacity: switchingOrgSlug === workspace.org_slug ? 0.65 : 1,
                        cursor: switchingOrgSlug === workspace.org_slug ? "not-allowed" : "pointer",
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
    </div>
  );

  return (
    <div
      style={{
        ...page,
        background: palette.pageBg,
        backgroundImage: palette.backdrop,
        backgroundSize: "860px 860px, auto, auto, auto",
        backgroundRepeat: "repeat, no-repeat, no-repeat, no-repeat",
        "--ui-bg": palette.pageBg,
        "--ui-panel": palette.panelBg,
        "--ui-panel-alt": palette.panelBgAlt,
        "--ui-border": palette.border,
        "--ui-text": palette.text,
        "--ui-muted": palette.muted,
        "--ui-accent": darkMode ? "#63c5ff" : "#2f86d4",
        "--ui-info": darkMode ? "#59d0d8" : "#169aa6",
        "--ui-good": darkMode ? "#43c18e" : "#228360",
        "--ui-warn": darkMode ? "#ddb05d" : "#a66f2d",
        "--ui-danger": darkMode ? "#ff7186" : "#cf4f67",
      }}
    >
      <div style={{ ...ambientGlowOne, background: palette.glowOne }} />
      <div style={{ ...ambientGlowTwo, background: palette.glowTwo }} />

      <UnifiedNav
        darkMode={darkMode}
        sidebarWidth={activeSidebarWidth}
        collapsed={sidebarCollapsed}
        subnavWidth={SUBNAV_WIDTH}
        onToggleCollapse={handleToggleSidebar}
        onResizeWidth={handleSidebarWidthChange}
        onSubnavChange={setSubnavOpen}
        minWidth={SIDEBAR_WIDTH_MIN}
        maxWidth={SIDEBAR_WIDTH_MAX}
      />
      <NLCommandBar darkMode={darkMode} />

      <main
        style={{
          ...main,
          paddingTop: 0,
          paddingLeft: isMobile
            ? 0
            : Math.max(0, activeSidebarWidth + (subnavOpen ? SUBNAV_WIDTH : 0) - 16),
          paddingBottom: isMobile ? 0 : undefined,
        }}
      >
        <div style={{ ...contentContainer, ...(isMobile ? contentContainerMobile : null) }}>
          <header
            style={{
              ...layoutHeader,
              ...(isMobile ? layoutHeaderMobile : null),
              background: palette.headerBg,
              border: `1px solid ${palette.border}`,
              boxShadow: palette.headerShadow,
              backdropFilter: "blur(18px)",
            }}
          >
            <div style={headerPrimaryRow}>
              <div style={headerIdentity}>
                <div
                  style={{
                    ...headerBrandCapsule,
                    border: `1px solid ${palette.border}`,
                    background: palette.buttonBg,
                  }}
                >
                  <BrandLogo tone={darkMode ? "light" : "warm"} size="sm" showText={false} />
                  {!isMobile ? (
                    <div style={headerBrandCopy}>
                      <p style={{ ...headerBrandLabel, color: palette.text }}>Knoledgr</p>
                    </div>
                  ) : null}
                </div>
                <div style={headerTitleBlock}>
                  <span
                    style={{
                      ...headerSectionPill,
                      border: `1px solid ${palette.border}`,
                      background: palette.buttonBg,
                      color: palette.muted,
                    }}
                  >
                    {pageMeta.section}
                  </span>
                  <h1 style={{ ...headerTitle, ...(isMobile ? headerTitleMobile : null), color: palette.text }}>
                    {pageTitle}
                  </h1>
                </div>
              </div>

              <div style={{ ...headerActions, ...(isMobile ? headerActionsMobile : null) }}>
                <div
                  style={{
                    ...headerActionCluster,
                    border: `1px solid ${palette.border}`,
                    background: palette.buttonBg,
                  }}
                >
                  <NotificationBell />
                  <button
                    onClick={toggleDarkMode}
                    style={{
                      ...iconButton,
                      color: palette.text,
                      background: "transparent",
                      border: `1px solid ${palette.border}`,
                    }}
                    aria-label="Toggle theme"
                  >
                    {darkMode ? <SunIcon style={icon16} /> : <MoonIcon style={icon16} />}
                  </button>
                </div>

                <div ref={profileRef} style={{ position: "relative" }}>
                  <button
                    onClick={() => {
                      setShowProfile((value) => !value);
                    }}
                    style={{
                      ...menuTriggerButton,
                      border: `1px solid ${palette.border}`,
                      background: palette.buttonBg,
                      color: palette.text,
                    }}
                    aria-label="Open workspace menu"
                  >
                    <span
                      style={{
                        ...avatarButton,
                        background: palette.avatarGradient,
                        color: palette.avatarText,
                      }}
                    >
                      {avatar ? (
                        <img src={avatar} alt={user?.full_name || "User"} style={avatarImage} />
                      ) : (
                        <span style={avatarInitial}>{initial}</span>
                      )}
                    </span>
                    {!isMobile ? (
                      <span style={menuTriggerLabel}>{user?.organization_slug || "workspace"}</span>
                    ) : null}
                    <ChevronDownIcon style={{ width: 14, height: 14, flexShrink: 0 }} />
                  </button>

                  {showProfile && (
                    <div
                      style={{
                        ...profileMenu,
                        ...(isMobile ? profileMenuMobile : null),
                        background: palette.menuSurface,
                        border: `1px solid ${palette.border}`,
                      }}
                    >
                      <div style={{ ...profileHead, borderBottom: `1px solid ${palette.border}` }}>
                        <p style={{ ...nameLine, color: palette.text }}>{user?.full_name || "User"}</p>
                        <p style={{ ...emailLine, color: palette.muted }}>{user?.email || ""}</p>
                        <div style={menuMetaRail}>
                          <span style={{ ...menuMetaPill, border: `1px solid ${palette.border}`, background: palette.panelBgAlt, color: palette.text }}>
                            {user?.organization_slug || "workspace"}
                          </span>
                          <span style={{ ...menuMetaPill, border: `1px solid ${palette.border}`, background: palette.panelBgAlt, color: palette.muted }}>
                            {`Mode: ${String(user?.experience_mode || "standard")}`}
                          </span>
                          <span style={{ ...menuMetaPill, border: `1px solid ${palette.border}`, background: palette.accentSoft, color: palette.text }}>
                            {`Today | ${todayLabel}`}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          navigate("/profile");
                          setShowProfile(false);
                        }}
                        className="ui-btn-polish ui-focus-ring"
                        style={{ ...menuButton, color: palette.text, background: palette.panelBgAlt }}
                      >
                        Profile
                      </button>

                      <button
                        onClick={() => {
                          navigate("/settings");
                          setShowProfile(false);
                        }}
                        className="ui-btn-polish ui-focus-ring"
                        style={{ ...menuButton, color: palette.text, background: palette.panelBgAlt }}
                      >
                        Settings
                      </button>

                      <button
                        onClick={logout}
                        className="ui-btn-polish ui-focus-ring"
                        style={{ ...menuButton, color: "var(--app-danger)", background: palette.panelBgAlt }}
                      >
                        Sign out
                      </button>

                      {workspaceSwitcherContent}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>
          <section className="app-page-shell">
            {children}
          </section>
        </div>
      </main>
      {showAskFab && (
        <button
          type="button"
          onPointerDown={handleAskFabPointerDown}
          onPointerMove={handleAskFabPointerMove}
          onPointerUp={handleAskFabPointerUp}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              navigate("/ask");
            }
          }}
          style={{
            ...askFabButton,
            left: askFabPos.x,
            top: askFabPos.y,
            color: palette.primaryText,
            border: `1px solid ${palette.primaryBorder}`,
            background: palette.primaryGradient,
          }}
          className="ui-btn-polish ui-focus-ring"
          aria-label="Open Ask Recall"
          title="Ask Recall (drag to move)"
        >
          Ask Recall
        </button>
      )}
    </div>
  );
}

const page = {
  minHeight: "100vh",
  position: "relative",
  overflowX: "hidden",
};

const ambientGlowOne = {
  position: "fixed",
  width: 420,
  height: 420,
  top: -180,
  left: -130,
  borderRadius: "50%",
  pointerEvents: "none",
  filter: "blur(74px)",
};

const ambientGlowTwo = {
  position: "fixed",
  width: 460,
  height: 460,
  right: -180,
  bottom: -180,
  borderRadius: "50%",
  pointerEvents: "none",
  filter: "blur(82px)",
};

const iconButton = {
  width: 34,
  height: 34,
  borderRadius: 14,
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
};

const avatarButton = {
  width: 34,
  height: 34,
  borderRadius: 12,
  overflow: "hidden",
  display: "grid",
  placeItems: "center",
  padding: 0,
  fontWeight: 800,
};

const avatarImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const avatarInitial = {
  fontSize: 13,
};

const menuTriggerButton = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  borderRadius: 999,
  padding: "4px 10px 4px 4px",
  cursor: "pointer",
  fontWeight: 700,
};

const menuTriggerLabel = {
  fontSize: 12,
  lineHeight: 1,
  whiteSpace: "nowrap",
};

const profileMenu = {
  position: "absolute",
  right: 0,
  top: 46,
  minWidth: 340,
  maxWidth: 420,
  borderRadius: 26,
  overflow: "hidden",
  boxShadow: "var(--ui-shadow-md)",
  zIndex: 120,
};

const profileMenuMobile = {
  position: "fixed",
  top: 70,
  left: 10,
  right: 10,
  minWidth: 0,
  maxWidth: "none",
  maxHeight: "calc(100vh - 92px)",
  overflowY: "auto",
  borderRadius: 18,
};

const profileHead = {
  padding: "14px 16px",
  display: "grid",
  gap: 10,
};

const nameLine = {
  margin: 0,
  fontSize: 15,
  fontWeight: 700,
};

const emailLine = {
  margin: "4px 0 0",
  fontSize: 13,
};

const menuMetaRail = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

const menuMetaPill = {
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.02em",
};

const workspaceMenuSection = {
  padding: "14px 16px 16px",
  display: "grid",
  gap: 10,
};

const workspaceTitle = {
  margin: 0,
  fontSize: 12,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  fontWeight: 700,
};

const workspacePasswordInput = {
  width: "100%",
  borderRadius: 16,
  padding: "12px 13px",
  fontSize: 14,
  outline: "none",
};

const workspaceList = {
  display: "grid",
  gap: 10,
};

const workspaceItem = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  alignItems: "center",
  gap: 10,
  borderRadius: 18,
  padding: "13px 14px",
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

const workspaceSwitchButton = {
  borderRadius: 999,
  padding: "9px 13px",
  fontSize: 12,
  fontWeight: 700,
  minWidth: 92,
};

const workspaceTag = {
  borderRadius: 999,
  padding: "7px 12px",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
};

const menuButton = {
  width: "100%",
  textAlign: "left",
  border: "none",
  background: "transparent",
  padding: "14px 16px",
  fontSize: 14,
  cursor: "pointer",
  fontFamily: "inherit",
  fontWeight: 700,
};

const workspaceActions = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const main = {
  position: "relative",
  zIndex: 1,
  minHeight: "100vh",
  transition: "padding-left 0.22s ease",
  paddingBottom: 32,
};

const contentContainer = {
  maxWidth: 1720,
  margin: "0 auto",
  padding: "14px clamp(12px, 1.8vw, 22px) 32px",
};

const contentContainerMobile = {
  padding: "8px 12px calc(92px + env(safe-area-inset-bottom, 0px))",
};

const layoutHeader = {
  position: "sticky",
  top: 10,
  zIndex: 80,
  borderRadius: 18,
  padding: "10px 14px",
  marginBottom: 12,
};

const layoutHeaderMobile = {
  top: 8,
  borderRadius: 16,
  padding: "10px 10px",
  marginBottom: 8,
};

const headerTitle = {
  margin: 0,
  fontFamily: "inherit",
  fontSize: "clamp(1.05rem, 1.6vw, 1.34rem)",
  letterSpacing: "-0.02em",
  lineHeight: 1.15,
  fontWeight: 700,
};

const headerTitleMobile = {
  fontSize: "1rem",
};

const headerPrimaryRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  flexWrap: "wrap",
  position: "relative",
  zIndex: 1,
};

const headerIdentity = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  minWidth: 0,
};

const headerActions = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const headerActionsMobile = {
  gap: 6,
};

const headerActionCluster = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  borderRadius: 999,
  padding: "4px",
};

const headerTitleBlock = {
  minWidth: 0,
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
};

const headerBrandCapsule = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  width: "fit-content",
  borderRadius: 999,
  padding: "6px 10px",
  backdropFilter: "blur(12px)",
};

const headerBrandCopy = {
  display: "grid",
  gap: 1,
};

const headerBrandLabel = {
  margin: 0,
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};

const headerSectionPill = {
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
};

function getPageMeta(pathname) {
  const routeMeta = [
    {
      prefix: "/conversations",
      title: "Conversations",
      section: "Collaborate",
      description: "Capture ongoing discussions, decisions, and the rationale behind team work.",
    },
    {
      prefix: "/decisions",
      title: "Decisions",
      section: "Decision Memory",
      description: "Track approvals, rationale, impact, and the history behind each key call.",
    },
    {
      prefix: "/knowledge/graph",
      title: "Knowledge Graph",
      section: "Knowledge",
      description: "See how conversations, documents, projects, and decisions connect across the workspace.",
    },
    {
      prefix: "/knowledge/analytics",
      title: "Knowledge Analytics",
      section: "Knowledge",
      description: "Measure coverage, recall quality, and how usable your team memory really is.",
    },
    {
      prefix: "/knowledge",
      title: "Knowledge",
      section: "Knowledge",
      description: "Search team memory quickly and recover the context behind what changed.",
    },
    {
      prefix: "/projects",
      title: "Projects",
      section: "Execution",
      description: "Plan delivery, follow execution, and keep linked work visible across teams.",
    },
    {
      prefix: "/business/goals",
      title: "Goals",
      section: "Business",
      description: "Align work to outcomes, owners, and the context behind each objective.",
    },
    {
      prefix: "/business/meetings",
      title: "Meetings",
      section: "Business",
      description: "Turn meeting activity into structured context your team can reuse later.",
    },
    {
      prefix: "/business/tasks",
      title: "Tasks",
      section: "Business",
      description: "Manage follow-through with enough context to keep execution grounded.",
    },
    {
      prefix: "/business/documents",
      title: "Documents",
      section: "Memory",
      description: "Keep the source record close to the work so teams can trace what matters quickly.",
    },
    {
      prefix: "/service-desk",
      title: "Service Desk",
      section: "Execution",
      description: "Handle requests with context, history, and the next best action in view.",
    },
    {
      prefix: "/sprint",
      title: "Sprints",
      section: "Execution",
      description: "Track sprint flow, blockers, and delivery signals in one operating layer.",
    },
    {
      prefix: "/docs",
      title: "Documentation",
      section: "Resources",
      description: "Reference how the platform works without leaving the broader workflow context.",
    },
    {
      prefix: "/settings",
      title: "Settings",
      section: "Administration",
      description: "Control workspace configuration, access, and product behavior from one place.",
    },
    {
      prefix: "/profile",
      title: "Profile",
      section: "Workspace",
      description: "Manage your identity, preferences, and how you work across Knoledgr.",
    },
    {
      prefix: "/notifications",
      title: "Notifications",
      section: "Workspace",
      description: "Stay on top of changes that matter without losing signal in the noise.",
    },
    {
      prefix: "/messages",
      title: "Messages",
      section: "Workspace",
      description: "Keep direct communication connected to the rest of your team context.",
    },
    {
      prefix: "/business",
      title: "Business",
      section: "Business",
      description: "Get a broader operating view across goals, meetings, tasks, and supporting memory.",
    },
  ];

  const matched = routeMeta.find((route) => pathname.startsWith(route.prefix));
  if (matched) return matched;
  if (pathname === "/" || pathname === "/dashboard") {
    return {
      title: "Dashboard",
      section: "Overview",
      description: "Track context, execution, and recent decisions across the workspace at a glance.",
    };
  }
  return {
    title: "Workspace",
    section: "Workspace",
    description: "Move through team memory, decisions, and execution from one connected surface.",
  };
}

const icon16 = { width: 16, height: 16 };

const askFabButton = {
  position: "fixed",
  zIndex: 150,
  width: ASK_FAB_WIDTH,
  height: ASK_FAB_HEIGHT,
  borderRadius: 999,
  display: "grid",
  placeItems: "center",
  fontSize: 13,
  fontWeight: 800,
  letterSpacing: "0.01em",
  boxShadow: "var(--ui-shadow-md)",
  cursor: "grab",
  userSelect: "none",
  touchAction: "none",
};



