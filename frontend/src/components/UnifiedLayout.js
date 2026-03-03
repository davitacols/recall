import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../utils/ThemeAndAccessibility";
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
const ASK_FAB_STORAGE_KEY = "askRecallFabPosV1";
const ASK_FAB_WIDTH = 132;
const ASK_FAB_HEIGHT = 44;
const ASK_FAB_PAD = 14;

function clampFabPosition(x, y) {
  const maxX = Math.max(ASK_FAB_PAD, window.innerWidth - ASK_FAB_WIDTH - ASK_FAB_PAD);
  const maxY = Math.max(ASK_FAB_PAD, window.innerHeight - ASK_FAB_HEIGHT - ASK_FAB_PAD);
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
  const { user, logout } = useAuth();
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
  const [askFabPos, setAskFabPos] = useState(loadFabPosition);
  const [showProfile, setShowProfile] = useState(false);
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

  const palette = useMemo(
    () =>
      darkMode
        ? {
            pageBg: "#0f0b0d",
            panelBg: "#171215",
            panelBgAlt: "#1d171b",
            border: "rgba(255,225,193,0.14)",
            text: "#f4ece0",
            muted: "#baa892",
            hover: "rgba(255,255,255,0.06)",
          }
        : {
            pageBg: "#f6f8fb",
            panelBg: "#ffffff",
            panelBgAlt: "#ffffff",
            border: "#dbe4ef",
            text: "#0f172a",
            muted: "#475569",
            hover: "rgba(15,23,42,0.05)",
          },
    [darkMode]
  );

  const avatar = user?.avatar;
  const initial = user?.full_name?.charAt(0)?.toUpperCase() || "U";
  const activeSidebarWidth = sidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED : sidebarWidth;
  const pageTitle = getPageTitle(location.pathname);
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

  return (
    <div style={{ ...page, background: palette.pageBg }}>
      <div style={ambientGlowOne} />
      <div style={ambientGlowTwo} />

      <UnifiedNav
        darkMode={darkMode}
        sidebarWidth={activeSidebarWidth}
        collapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        onResizeWidth={handleSidebarWidthChange}
        minWidth={SIDEBAR_WIDTH_MIN}
        maxWidth={SIDEBAR_WIDTH_MAX}
      />
      <NLCommandBar darkMode={darkMode} />

      <main style={{ ...main, paddingTop: 0, paddingLeft: isMobile ? 0 : activeSidebarWidth }}>
        <div style={contentContainer}>
          <header
            style={{
              ...layoutHeader,
              background: palette.panelBg,
              border: `1px solid ${palette.border}`,
            }}
          >
            <div style={headerTop}>
              <div>
                <p style={{ ...headerEyebrow, color: palette.muted }}>Workspace</p>
                <h1 style={{ ...headerTitle, color: palette.text }}>{pageTitle}</h1>
              </div>
              <div style={headerActions}>
                <NotificationBell />
                <button
                  onClick={toggleDarkMode}
                  style={{
                    ...iconButton,
                    color: palette.text,
                    background: palette.hover,
                    border: `1px solid ${palette.border}`,
                  }}
                  aria-label="Toggle theme"
                >
                  {darkMode ? <SunIcon style={icon16} /> : <MoonIcon style={icon16} />}
                </button>

                <div ref={profileRef} style={{ position: "relative" }}>
                  <button
                    onClick={() => setShowProfile((value) => !value)}
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
                        background: palette.panelBgAlt,
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
                        style={{ ...menuButton, color: palette.text }}
                      >
                        Profile
                      </button>

                      <button
                        onClick={() => {
                          navigate("/settings");
                          setShowProfile(false);
                        }}
                        style={{ ...menuButton, color: palette.text }}
                      >
                        Settings
                      </button>

                      <button onClick={logout} style={{ ...menuButton, color: "#ef4444" }}>
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div style={headerBreadcrumbs}>
              <Breadcrumbs darkMode={darkMode} />
            </div>
          </header>
          {children}
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
            color: "#231713",
            border: darkMode
              ? "1px solid rgba(255,225,193,0.35)"
              : "1px solid rgba(217,105,46,0.28)",
            background: darkMode
              ? "linear-gradient(135deg, #ffd190, #ff9f62)"
              : "linear-gradient(135deg, #ffe0b0, #ffb475)",
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
  width: 500,
  height: 500,
  top: -220,
  left: -170,
  borderRadius: "50%",
  pointerEvents: "none",
  background: "rgba(255,170,80,0.14)",
  filter: "blur(60px)",
};

const ambientGlowTwo = {
  position: "fixed",
  width: 540,
  height: 540,
  right: -220,
  bottom: -260,
  borderRadius: "50%",
  pointerEvents: "none",
  background: "rgba(88,210,189,0.12)",
  filter: "blur(60px)",
};

const iconButton = {
  width: 32,
  height: 32,
  borderRadius: 9,
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
};

const avatarButton = {
  width: 32,
  height: 32,
  borderRadius: "50%",
  overflow: "hidden",
  display: "grid",
  placeItems: "center",
  padding: 0,
  background: "linear-gradient(135deg, #ffcf8f, #ff965f)",
  color: "#261812",
  fontWeight: 800,
  cursor: "pointer",
};

const avatarImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const avatarInitial = {
  fontSize: 13,
};

const profileMenu = {
  position: "absolute",
  right: 0,
  top: 40,
  minWidth: 190,
  borderRadius: 12,
  overflow: "hidden",
  boxShadow: "0 20px 40px rgba(0,0,0,0.28)",
  zIndex: 120,
};

const profileHead = {
  padding: "10px 12px",
};

const nameLine = {
  margin: 0,
  fontSize: 13,
  fontWeight: 700,
};

const emailLine = {
  margin: "3px 0 0",
  fontSize: 11,
};

const menuButton = {
  width: "100%",
  textAlign: "left",
  border: "none",
  background: "transparent",
  padding: "10px 12px",
  fontSize: 13,
  cursor: "pointer",
  fontFamily: "inherit",
};

const main = {
  position: "relative",
  zIndex: 1,
  minHeight: "100vh",
  transition: "padding-left 0.2s ease",
};

const contentContainer = {
  maxWidth: 1400,
  margin: "0 auto",
  padding: "0 clamp(14px, 2vw, 24px) 24px",
};

const layoutHeader = {
  position: "sticky",
  top: 0,
  zIndex: 80,
  borderRadius: 12,
  padding: "12px 14px 10px",
  marginBottom: 12,
  backdropFilter: "blur(6px)",
};

const headerEyebrow = {
  margin: 0,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const headerTitle = {
  margin: "4px 0 8px",
  fontSize: "clamp(1.05rem, 2vw, 1.35rem)",
  letterSpacing: "-0.01em",
};

const headerTop = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
};

const headerActions = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const headerBreadcrumbs = {
  marginTop: 4,
};

function getPageTitle(pathname) {
  const routeTitles = [
    { prefix: "/conversations", title: "Conversations" },
    { prefix: "/decisions", title: "Decisions" },
    { prefix: "/knowledge/graph", title: "Knowledge Graph" },
    { prefix: "/knowledge/analytics", title: "Knowledge Analytics" },
    { prefix: "/knowledge", title: "Knowledge" },
    { prefix: "/projects", title: "Projects" },
    { prefix: "/business/goals", title: "Goals" },
    { prefix: "/business/meetings", title: "Meetings" },
    { prefix: "/business/tasks", title: "Tasks" },
    { prefix: "/business/documents", title: "Documents" },
    { prefix: "/service-desk", title: "Service Desk" },
    { prefix: "/sprint", title: "Sprints" },
    { prefix: "/docs", title: "Documentation" },
    { prefix: "/settings", title: "Settings" },
    { prefix: "/profile", title: "Profile" },
    { prefix: "/notifications", title: "Notifications" },
    { prefix: "/messages", title: "Messages" },
    { prefix: "/business", title: "Business" },
  ];

  const matched = routeTitles.find((route) => pathname.startsWith(route.prefix));
  if (matched) return matched.title;
  if (pathname === "/" || pathname === "/dashboard") return "Dashboard";
  return "Workspace";
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
  boxShadow: "0 12px 28px rgba(2,6,23,0.28)",
  cursor: "grab",
  userSelect: "none",
  touchAction: "none",
};
