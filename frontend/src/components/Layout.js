import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Bars3Icon,
  BookOpenIcon,
  ChatBubbleLeftIcon,
  ChevronDownIcon,
  DocumentTextIcon,
  HomeIcon,
  InboxIcon,
  MoonIcon,
  RectangleStackIcon,
  SunIcon,
  UsersIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../hooks/useAuth";
import { getAvatarUrl } from "../utils/avatarUtils";
import { useTheme } from "../utils/ThemeAndAccessibility";
import MobileBottomNav from "./MobileBottomNav";
import NotificationBell from "./NotificationBell";
import Search from "./Search";
import "../styles/mobile.css";

function AvatarDisplay({ avatar, fullName }) {
  const [failed, setFailed] = useState(false);
  const avatarUrl = getAvatarUrl(avatar);
  const initial = fullName?.charAt(0)?.toUpperCase() || "U";

  if (avatarUrl && !failed) {
    return (
      <img
        src={avatarUrl}
        alt={fullName || "User"}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div style={avatarFallback}>
      <span style={avatarInitial}>{initial}</span>
    </div>
  );
}

function Layout({ children }) {
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const location = useLocation();

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 1024);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [isResizing, setIsResizing] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({
    Main: true,
    Work: true,
    Business: true,
    Personal: true,
    Admin: true,
  });

  useEffect(() => {
    const savedCollapsed = localStorage.getItem("sidebarCollapsed");
    const savedWidth = localStorage.getItem("sidebarWidth");
    if (savedCollapsed) setSidebarCollapsed(JSON.parse(savedCollapsed));
    if (savedWidth) setSidebarWidth(parseInt(savedWidth, 10));
  }, []);

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsSmallScreen(window.innerWidth < 1024);
      if (window.innerWidth >= 768) setMobileMenuOpen(false);
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const onMouseMove = (event) => {
      if (!isResizing) return;
      const nextWidth = Math.min(Math.max(event.clientX, 210), 360);
      setSidebarWidth(nextWidth);
      localStorage.setItem("sidebarWidth", String(nextWidth));
    };

    const onMouseUp = () => setIsResizing(false);

    if (isResizing) {
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [isResizing]);

  useEffect(() => {
    setProfileMenuOpen(false);
    if (isMobile) setMobileMenuOpen(false);
  }, [location.pathname, isMobile]);

  const toggleSidebar = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    localStorage.setItem("sidebarCollapsed", JSON.stringify(next));
  };

  const toggleGroup = (groupName) => {
    setExpandedGroups((prev) => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const navSections = useMemo(
    () => [
      {
        title: "Main",
        items: [
          { name: "Home", href: "/", icon: HomeIcon },
          { name: "Conversations", href: "/conversations", icon: ChatBubbleLeftIcon },
          { name: "Decisions", href: "/decisions", icon: DocumentTextIcon },
          { name: "Knowledge", href: "/knowledge", icon: BookOpenIcon },
        ],
      },
      {
        title: "Work",
        items: [
          { name: "Projects", href: "/projects", icon: RectangleStackIcon },
          { name: "Current Sprint", href: "/sprint" },
          { name: "Sprint History", href: "/sprint-history" },
          { name: "Blockers", href: "/blockers" },
          { name: "Retrospectives", href: "/retrospectives" },
        ],
      },
      {
        title: "Business",
        items: [
          { name: "Overview", href: "/business" },
          { name: "Goals", href: "/business/goals" },
          { name: "Meetings", href: "/business/meetings" },
          { name: "Tasks", href: "/business/tasks" },
          { name: "Documents", href: "/business/documents" },
          { name: "Templates", href: "/business/templates" },
        ],
      },
      {
        title: "Personal",
        items: [
          { name: "Activity Feed", href: "/activity" },
          { name: "Bookmarks & Drafts", href: "/bookmarks-drafts" },
          { name: "My Decisions", href: "/my-decisions" },
          { name: "My Questions", href: "/my-questions" },
          { name: "Knowledge Health", href: "/knowledge-health" },
        ],
      },
      ...(user?.role === "admin"
        ? [
            {
              title: "Admin",
              items: [
                { name: "Team", href: "/team", icon: UsersIcon },
                { name: "Analytics", href: "/analytics" },
                { name: "Advanced Search", href: "/search" },
                { name: "Integrations", href: "/integrations" },
                { name: "API Keys", href: "/api-keys" },
                { name: "Audit Logs", href: "/audit-logs" },
                { name: "Subscription", href: "/subscription" },
                { name: "Enterprise", href: "/enterprise" },
                { name: "Import/Export", href: "/import-export" },
              ],
            },
          ]
        : []),
    ],
    [user?.role]
  );

  const getPageTitle = () => {
    if (location.pathname === "/") return "Home";
    if (location.pathname.startsWith("/conversations")) return "Conversations";
    if (location.pathname.startsWith("/decisions")) return "Decisions";
    if (location.pathname.startsWith("/knowledge")) return "Knowledge";
    if (location.pathname.startsWith("/projects")) return "Projects";
    if (location.pathname.startsWith("/boards")) return "Board";
    if (location.pathname.startsWith("/notifications")) return "Notifications";
    if (location.pathname.startsWith("/sprint")) return "Sprint";
    if (location.pathname.startsWith("/blockers")) return "Blockers";
    if (location.pathname.startsWith("/retrospectives")) return "Retrospectives";
    return "Knoledgr";
  };

  const palette = darkMode
    ? {
        appBg: "#0f0b0d",
        headerBg: "rgba(22,16,19,0.86)",
        panelBg: "#171215",
        panelBgAlt: "#1d171b",
        border: "rgba(255,225,193,0.14)",
        text: "#f4ece0",
        textMuted: "#b9ab97",
        active: "rgba(255,170,99,0.18)",
        accent: "#ffb477",
      }
    : {
        appBg: "#f6f1ea",
        headerBg: "rgba(255,250,243,0.92)",
        panelBg: "#fffaf3",
        panelBgAlt: "#ffffff",
        border: "#eadfce",
        text: "#231814",
        textMuted: "#796a58",
        active: "rgba(255,150,82,0.18)",
        accent: "#db6b2e",
      };

  const computedSidebarWidth = isMobile
    ? 290
    : sidebarCollapsed
      ? 74
      : sidebarWidth;

  return (
    <div style={{ ...appShell, background: palette.appBg }}>
      <header style={{ ...header, background: palette.headerBg, borderBottom: `1px solid ${palette.border}` }}>
        <div style={headerLeft}>
          <button
            onClick={() => (isMobile ? setMobileMenuOpen((v) => !v) : toggleSidebar())}
            style={{ ...iconButton, color: palette.textMuted, border: `1px solid ${palette.border}` }}
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <XMarkIcon style={icon18} /> : <Bars3Icon style={icon18} />}
          </button>

          <div>
            <p style={{ ...headerEyebrow, color: palette.textMuted }}>Workspace</p>
            <h1 style={{ ...headerTitle, color: palette.text }}>{getPageTitle()}</h1>
          </div>
        </div>

        <div style={headerActions}>
          {!isSmallScreen && <Search />}

          <Link to="/messages" style={{ ...iconButton, color: palette.textMuted, border: `1px solid ${palette.border}` }}>
            <InboxIcon style={icon18} />
          </Link>

          <NotificationBell />

          <button
            onClick={toggleDarkMode}
            style={{ ...iconButton, color: palette.textMuted, border: `1px solid ${palette.border}` }}
            aria-label="Toggle theme"
          >
            {darkMode ? <SunIcon style={icon18} /> : <MoonIcon style={icon18} />}
          </button>

          <div style={{ position: "relative" }}>
            <button
              onClick={() => setProfileMenuOpen((v) => !v)}
              style={{ ...avatarButton, border: `1px solid ${palette.border}` }}
            >
              <AvatarDisplay avatar={user?.avatar} fullName={user?.full_name} />
            </button>
            {profileMenuOpen && (
              <div style={{ ...profileMenu, background: palette.panelBgAlt, border: `1px solid ${palette.border}` }}>
                <Link to="/profile" style={{ ...menuItem, color: palette.text }}>Profile</Link>
                <Link to="/settings" style={{ ...menuItem, color: palette.text }}>Settings</Link>
                <button onClick={logout} style={{ ...menuItemButton, color: "#f87171" }}>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {isMobile && mobileMenuOpen && (
        <button
          onClick={() => setMobileMenuOpen(false)}
          style={mobileOverlay}
          aria-label="Close navigation menu"
        />
      )}

      <aside
        style={{
          ...sidebar,
          width: computedSidebarWidth,
          left: isMobile && !mobileMenuOpen ? -320 : 0,
          background: palette.panelBg,
          borderRight: `1px solid ${palette.border}`,
        }}
      >
        <nav style={navWrap}>
          {navSections.map((section) => {
            const expanded = sidebarCollapsed ? true : expandedGroups[section.title];
            return (
              <div key={section.title} style={sectionBlock}>
                {!sidebarCollapsed && (
                  <button
                    onClick={() => toggleGroup(section.title)}
                    style={{ ...sectionHeader, color: palette.textMuted }}
                  >
                    <span>{section.title}</span>
                    <ChevronDownIcon style={{ ...icon14, transform: expanded ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.15s" }} />
                  </button>
                )}

                {expanded && (
                  <div style={linkStack}>
                    {section.items.map((item) => {
                      const isActive =
                        item.href === "/"
                          ? location.pathname === "/"
                          : location.pathname === item.href || location.pathname.startsWith(`${item.href}/`);
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          title={sidebarCollapsed ? item.name : undefined}
                          style={{
                            ...navLink,
                            justifyContent: sidebarCollapsed ? "center" : "flex-start",
                            color: isActive ? palette.text : palette.textMuted,
                            background: isActive ? palette.active : "transparent",
                            border: `1px solid ${isActive ? palette.border : "transparent"}`,
                            paddingLeft: sidebarCollapsed ? 10 : Icon ? 12 : 26,
                          }}
                        >
                          {Icon && <Icon style={icon16} />}
                          {!sidebarCollapsed && <span>{item.name}</span>}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div style={{ ...sidebarFooter, borderTop: `1px solid ${palette.border}` }}>
          {!sidebarCollapsed ? (
            <div style={{ ...userCard, background: palette.panelBgAlt, border: `1px solid ${palette.border}` }}>
              <div style={userAvatarSlot}>
                <AvatarDisplay avatar={user?.avatar} fullName={user?.full_name} />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ ...userName, color: palette.text }}>{user?.full_name || "User"}</p>
                <p style={{ ...userOrg, color: palette.textMuted }}>{user?.organization_name || "Organization"}</p>
              </div>
            </div>
          ) : (
            <div style={collapsedAvatarWrap}>
              <div style={{ ...userAvatarSlot, border: `1px solid ${palette.border}` }}>
                <AvatarDisplay avatar={user?.avatar} fullName={user?.full_name} />
              </div>
            </div>
          )}
        </div>

        {!isMobile && !sidebarCollapsed && (
          <div
            onMouseDown={(event) => {
              event.preventDefault();
              setIsResizing(true);
            }}
            style={{ ...resizeHandle, background: isResizing ? palette.accent : "transparent" }}
          />
        )}
      </aside>

      <main
        style={{
          ...main,
          paddingLeft: isMobile ? 0 : computedSidebarWidth,
          paddingBottom: isMobile ? 74 : 0,
        }}
      >
        <div style={mainInner}>{children}</div>
      </main>

      <MobileBottomNav />
    </div>
  );
}

const appShell = {
  minHeight: "100vh",
};

const header = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  height: 64,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 16px",
  backdropFilter: "blur(10px)",
  zIndex: 60,
};

const headerLeft = {
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const headerEyebrow = {
  margin: 0,
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.14em",
};

const headerTitle = {
  margin: "2px 0 0",
  fontSize: 16,
  lineHeight: 1,
};

const headerActions = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const iconButton = {
  width: 36,
  height: 36,
  borderRadius: 10,
  display: "grid",
  placeItems: "center",
  background: "transparent",
  cursor: "pointer",
  textDecoration: "none",
};

const avatarButton = {
  width: 36,
  height: 36,
  borderRadius: 10,
  overflow: "hidden",
  padding: 0,
  background: "transparent",
  cursor: "pointer",
};

const profileMenu = {
  position: "absolute",
  right: 0,
  top: 44,
  minWidth: 170,
  borderRadius: 12,
  overflow: "hidden",
  boxShadow: "0 18px 40px rgba(0,0,0,0.25)",
  zIndex: 80,
};

const menuItem = {
  display: "block",
  padding: "10px 12px",
  textDecoration: "none",
  fontSize: 14,
};

const menuItemButton = {
  width: "100%",
  textAlign: "left",
  padding: "10px 12px",
  fontSize: 14,
  border: "none",
  background: "transparent",
  cursor: "pointer",
  fontFamily: "inherit",
};

const mobileOverlay = {
  position: "fixed",
  inset: "64px 0 0 0",
  border: "none",
  background: "rgba(0,0,0,0.45)",
  zIndex: 50,
};

const sidebar = {
  position: "fixed",
  top: 64,
  bottom: 0,
  zIndex: 55,
  display: "flex",
  flexDirection: "column",
  transition: "left 0.2s ease, width 0.18s ease",
  overflow: "hidden",
};

const navWrap = {
  flex: 1,
  padding: "14px 10px",
  overflowY: "auto",
};

const sectionBlock = {
  marginBottom: 16,
};

const sectionHeader = {
  width: "100%",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  padding: "8px 10px",
};

const linkStack = {
  display: "grid",
  gap: 3,
};

const navLink = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  textDecoration: "none",
  borderRadius: 10,
  fontSize: 13,
  padding: "9px 10px",
  fontWeight: 600,
};

const sidebarFooter = {
  padding: 10,
};

const userCard = {
  borderRadius: 12,
  padding: 8,
  display: "grid",
  gridTemplateColumns: "34px 1fr",
  gap: 8,
  alignItems: "center",
};

const userAvatarSlot = {
  width: 34,
  height: 34,
  borderRadius: 10,
  overflow: "hidden",
};

const collapsedAvatarWrap = {
  display: "flex",
  justifyContent: "center",
};

const userName = {
  margin: 0,
  fontSize: 13,
  fontWeight: 700,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const userOrg = {
  margin: "2px 0 0",
  fontSize: 11,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const resizeHandle = {
  position: "absolute",
  right: 0,
  top: 0,
  bottom: 0,
  width: 4,
  cursor: "ew-resize",
};

const main = {
  paddingTop: 64,
  transition: "padding-left 0.18s ease",
};

const mainInner = {
  padding: "clamp(14px, 2vw, 24px)",
};

const avatarFallback = {
  width: "100%",
  height: "100%",
  display: "grid",
  placeItems: "center",
  background: "linear-gradient(135deg, #ffcb8c, #ff905d)",
};

const avatarInitial = {
  color: "#20140f",
  fontWeight: 800,
  fontSize: 13,
};

const icon18 = { width: 18, height: 18 };
const icon16 = { width: 16, height: 16, flexShrink: 0 };
const icon14 = { width: 14, height: 14, flexShrink: 0 };

export default Layout;

