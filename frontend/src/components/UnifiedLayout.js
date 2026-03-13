import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronDownIcon, MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../utils/ThemeAndAccessibility";
import BrandLogo from "./BrandLogo";
import Breadcrumbs from "./Breadcrumbs";
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
  const [showWorkspaceSwitcher, setShowWorkspaceSwitcher] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [workspacesLoading, setWorkspacesLoading] = useState(false);
  const [workspacePassword, setWorkspacePassword] = useState("");
  const [requestingCodeOrgSlug, setRequestingCodeOrgSlug] = useState(null);
  const [switchingOrgSlug, setSwitchingOrgSlug] = useState(null);
  const [workspaceError, setWorkspaceError] = useState("");
  const profileRef = useRef(null);
  const workspaceSwitcherRef = useRef(null);
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
      if (!workspaceSwitcherRef.current?.contains(event.target)) {
        setShowWorkspaceSwitcher(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    const loadWorkspaces = async () => {
      if (!showProfile && !showWorkspaceSwitcher) return;
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
  }, [showProfile, showWorkspaceSwitcher]);

  const palette = useMemo(
    () =>
      darkMode
        ? {
            pageBg: "#09121c",
            panelBg: "rgba(15, 26, 41, 0.84)",
            panelBgAlt: "#162739",
            panelGlass: "linear-gradient(180deg, rgba(15, 26, 41, 0.92), rgba(11, 20, 31, 0.88))",
            border: "rgba(144, 164, 189, 0.18)",
            text: "#edf4ff",
            muted: "#90a6c0",
            hover: "rgba(99, 197, 255, 0.1)",
            glowOne: "rgba(46, 123, 245, 0.16)",
            glowTwo: "rgba(69, 209, 255, 0.12)",
            buttonBg: "rgba(11, 20, 31, 0.84)",
            menuSurface: "#101b2a",
            accent: "#63c5ff",
            accentSoft: "rgba(99, 197, 255, 0.14)",
          }
        : {
            pageBg: "#f2f7fc",
            panelBg: "rgba(255, 255, 255, 0.88)",
            panelBgAlt: "#f6fafe",
            panelGlass: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(245,250,255,0.92))",
            border: "rgba(15, 23, 42, 0.09)",
            text: "#13263d",
            muted: "#5f7690",
            hover: "rgba(33, 118, 255, 0.08)",
            glowOne: "rgba(33, 118, 255, 0.1)",
            glowTwo: "rgba(57, 183, 255, 0.1)",
            buttonBg: "rgba(245, 250, 255, 0.96)",
            menuSurface: "#ffffff",
            accent: "#2176ff",
            accentSoft: "rgba(33, 118, 255, 0.1)",
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
    setShowWorkspaceSwitcher(false);
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
                        background: darkMode ? "#8bd0ff" : "#2e7db3",
                        color: darkMode ? "#0a1118" : "#eef7ff",
                        border: `1px solid ${darkMode ? "rgba(120,191,233,0.5)" : "#24688f"}`,
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
              background: palette.panelGlass,
              border: `1px solid ${palette.border}`,
              boxShadow: darkMode ? "0 18px 44px rgba(2,8,16,0.36)" : "0 18px 42px rgba(29,55,78,0.12)",
            }}
          >
            <div
              aria-hidden="true"
              style={{
                ...headerBackdrop,
                backgroundImage: "url('/brand/knoledgr-aurora.svg')",
                opacity: darkMode ? 0.42 : 0.22,
              }}
            />
            <div
              aria-hidden="true"
              style={{
                ...headerBackdropGrid,
                backgroundImage: "url('/brand/knoledgr-grid.svg')",
                opacity: darkMode ? 0.18 : 0.1,
              }}
            />
            <div style={headerPrimaryRow}>
              <div style={headerIdentity}>
                <div style={headerTitleBlock}>
                  <div
                    style={{
                      ...headerBrandCapsule,
                      border: `1px solid ${palette.border}`,
                      background: darkMode
                        ? "linear-gradient(135deg, rgba(10, 24, 38, 0.82), rgba(19, 37, 58, 0.66))"
                        : "linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(235, 245, 255, 0.78))",
                    }}
                  >
                    <BrandLogo tone={darkMode ? "light" : "warm"} size="sm" showText={false} />
                    <div style={headerBrandCopy}>
                      <p style={{ ...headerBrandLabel, color: palette.text }}>Knoledgr Memory OS</p>
                      <p style={{ ...headerBrandHint, color: palette.muted }}>Context stays attached to work</p>
                    </div>
                  </div>
                  <p style={{ ...headerEyebrow, color: palette.accent }}>{pageMeta.section}</p>
                  <h1 style={{ ...headerTitle, ...(isMobile ? headerTitleMobile : null), color: palette.text }}>
                    {pageTitle}
                  </h1>
                  <p style={{ ...headerSubtitle, color: palette.muted }}>
                    {pageMeta.description}
                  </p>
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
                      setShowWorkspaceSwitcher(false);
                    }}
                    style={{ ...avatarButton, border: `1px solid ${palette.border}` }}
                    aria-label="Open profile menu"
                  >
                    {avatar ? (
                      <img src={avatar} alt={user?.full_name || "User"} style={avatarImage} />
                    ) : (
                      <span style={avatarInitial}>{initial}</span>
                    )}
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

                      <button onClick={logout} className="ui-btn-polish ui-focus-ring" style={{ ...menuButton, color: "var(--app-danger)", background: palette.panelBgAlt }}>
                        Sign out
                      </button>

                      {workspaceSwitcherContent}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div style={{ ...headerSecondaryRow, borderTop: `1px solid ${palette.border}` }}>
              <div style={{ ...headerBreadcrumbs, ...(isMobile ? { display: "none" } : null) }}>
                <Breadcrumbs darkMode={darkMode} />
              </div>
              <div style={headerMetaPills}>
                <div ref={workspaceSwitcherRef} style={{ position: "relative" }}>
                  <button
                    onClick={() => {
                      setShowWorkspaceSwitcher((prev) => !prev);
                      setShowProfile(false);
                    }}
                    className="ui-btn-polish ui-focus-ring"
                    style={{
                      ...orgSwitcherButton,
                      border: `1px solid ${palette.border}`,
                      background: palette.buttonBg,
                      color: palette.text,
                    }}
                  >
                    <span>{user?.organization_slug || "workspace"}</span>
                    <ChevronDownIcon style={{ ...icon16, width: 12, height: 12 }} />
                  </button>
                  {showWorkspaceSwitcher ? (
                    <div
                      style={{
                        ...orgSwitcherMenu,
                        background: palette.menuSurface,
                        border: `1px solid ${palette.border}`,
                      }}
                    >
                      {workspaceSwitcherContent}
                    </div>
                  ) : null}
                </div>
                <span
                  style={{
                    ...headerPill,
                    border: `1px solid ${palette.border}`,
                    background: palette.buttonBg,
                    color: palette.muted,
                  }}
                >
                  {`Mode: ${String(user?.experience_mode || "standard")}`}
                </span>
                <span
                  style={{
                    ...headerPill,
                    border: `1px solid ${palette.border}`,
                    background: palette.accentSoft,
                    color: palette.text,
                  }}
                >
                  {`Today | ${todayLabel}`}
                </span>
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
            color: darkMode ? "#062032" : "#eef8ff",
            border: darkMode
              ? "1px solid rgba(139,208,255,0.45)"
              : "1px solid rgba(46,125,179,0.35)",
            background: darkMode
              ? "linear-gradient(135deg, #9bd9ff, #6ab8ec)"
              : "linear-gradient(135deg, #2f80b8, #65aede)",
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
  backgroundImage:
    "url('/brand/knoledgr-grid.svg'), radial-gradient(960px 560px at -8% -8%, rgba(79,140,255,0.16), transparent 62%), radial-gradient(880px 620px at 108% -8%, rgba(91,192,235,0.14), transparent 58%), radial-gradient(920px 520px at 50% 118%, rgba(108,138,173,0.09), transparent 66%)",
  backgroundSize: "820px 820px, auto, auto, auto",
  backgroundRepeat: "repeat, no-repeat, no-repeat, no-repeat",
};

const ambientGlowOne = {
  position: "fixed",
  width: 500,
  height: 500,
  top: -220,
  left: -170,
  borderRadius: "50%",
  pointerEvents: "none",
  filter: "blur(72px)",
};

const ambientGlowTwo = {
  position: "fixed",
  width: 540,
  height: 540,
  right: -220,
  bottom: -260,
  borderRadius: "50%",
  pointerEvents: "none",
  filter: "blur(80px)",
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
  width: 40,
  height: 40,
  borderRadius: 16,
  overflow: "hidden",
  display: "grid",
  placeItems: "center",
  padding: 0,
  background: "linear-gradient(135deg, #87afff, #59b8ff)",
  color: "#0b1b34",
  fontWeight: 800,
  cursor: "pointer",
};

const avatarImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const avatarInitial = {
  fontSize: 15,
};

const profileMenu = {
  position: "absolute",
  right: 0,
  top: 48,
  minWidth: 340,
  maxWidth: 420,
  borderRadius: 22,
  overflow: "hidden",
  boxShadow: "0 24px 56px rgba(2,12,26,0.26)",
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
  borderRadius: 10,
  padding: "10px 11px",
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
  borderRadius: 16,
  padding: "12px 13px",
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
  borderRadius: 10,
  padding: "9px 12px",
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
  padding: "12px 16px",
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

const orgSwitcherButton = {
  borderRadius: 999,
  padding: "8px 12px",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.04em",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  cursor: "pointer",
};

const orgSwitcherMenu = {
  position: "absolute",
  right: 0,
  top: "calc(100% + 8px)",
  width: "min(92vw, 420px)",
  borderRadius: 14,
  overflow: "hidden",
  boxShadow: "0 20px 40px rgba(0,0,0,0.28)",
  zIndex: 130,
};

const main = {
  position: "relative",
  zIndex: 1,
  minHeight: "100vh",
  transition: "padding-left 0.22s ease",
  paddingBottom: 32,
};

const contentContainer = {
  maxWidth: 1840,
  margin: "0 auto",
  padding: "12px clamp(12px, 1.6vw, 18px) 28px",
};

const contentContainerMobile = {
  padding: "8px 12px calc(92px + env(safe-area-inset-bottom, 0px))",
};

const layoutHeader = {
  position: "sticky",
  top: 0,
  zIndex: 80,
  borderRadius: 24,
  padding: "14px 16px 10px",
  marginBottom: 16,
  backdropFilter: "blur(18px)",
};

const layoutHeaderMobile = {
  top: 0,
  borderRadius: 18,
  padding: "10px 11px 8px",
  marginBottom: 12,
};

const headerEyebrow = {
  margin: 0,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
};

const headerTitle = {
  margin: "6px 0 0",
  fontSize: "clamp(1.02rem, 1.45vw, 1.32rem)",
  letterSpacing: "-0.03em",
  fontWeight: 800,
};

const headerTitleMobile = {
  marginBottom: 4,
  fontSize: "1.18rem",
};

const headerSubtitle = {
  margin: "6px 0 0",
  fontSize: 12,
  lineHeight: 1.45,
  maxWidth: 620,
};

const headerPrimaryRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  position: "relative",
  zIndex: 1,
};

const headerIdentity = {
  display: "flex",
  alignItems: "flex-start",
  gap: 12,
  minWidth: 0,
};

const headerActions = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const headerActionsMobile = {
  gap: 6,
};

const headerActionCluster = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  borderRadius: 16,
  padding: "6px",
};

const headerTitleBlock = {
  minWidth: 0,
  maxWidth: 680,
  display: "grid",
  gap: 8,
};

const headerBrandCapsule = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  width: "fit-content",
  borderRadius: 18,
  padding: "6px 8px",
  backdropFilter: "blur(16px)",
};

const headerBrandCopy = {
  display: "grid",
  gap: 2,
};

const headerBrandLabel = {
  margin: 0,
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.02em",
};

const headerBrandHint = {
  margin: 0,
  fontSize: 10,
  fontWeight: 600,
};

const headerBreadcrumbs = {
  minWidth: 0,
};

const headerMetaRow = {
  marginTop: 10,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  position: "relative",
  zIndex: 1,
};

const headerSecondaryRow = {
  ...headerMetaRow,
  paddingTop: 10,
};

const headerBackdrop = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "cover",
};

const headerBackdropGrid = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  backgroundPosition: "center",
  backgroundRepeat: "repeat",
  backgroundSize: "900px 900px",
};

const headerMetaPills = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

const headerPill = {
  borderRadius: 999,
  padding: "8px 12px",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.02em",
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
  borderRadius: 16,
  display: "grid",
  placeItems: "center",
  fontSize: 13,
  fontWeight: 800,
  letterSpacing: "0.01em",
  boxShadow: "0 18px 38px rgba(2,12,26,0.24)",
  cursor: "grab",
  userSelect: "none",
  touchAction: "none",
};



