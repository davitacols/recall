import React, { useEffect, useState } from "react";
import AtlasTopNav from "./AtlasTopNav";
import UnifiedNav from "./UnifiedNav";
import { MobileNav } from "./MobileNav";
import { AgentDock, AgentDockFab, AgentDockProvider } from "./AgentDock";
import { DocsDrawer, DocsDrawerProvider } from "./DocsDrawer";

const SIDEBAR_W = 248;
const SIDEBAR_W_COLLAPSED = 60;
const SIDEBAR_COLLAPSED_KEY = "atlasSidebarCollapsed";
const TOPNAV_H = 60;

/**
 * UnifiedLayout — Atlassian-style app shell.
 *
 * +-------------------------------------------------------------+
 * |                  AtlasTopNav (56px)                          |
 * +---------+---------------------------------------------------+
 * |         |                                                   |
 * | side    |                  content                          |
 * | nav     |                                                   |
 * | 240px   |                                                   |
 * |         |                                                   |
 * +---------+---------------------------------------------------+
 */
export default function UnifiedLayout({ children }) {
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true"
  );
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch (_) {}
      return next;
    });
  };

  const sidebarWidth = collapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W;
  const contentLeftPad = isMobile ? 0 : sidebarWidth;

  return (
    <DocsDrawerProvider>
    <AgentDockProvider>
      <div
        style={{
          minHeight: "100vh",
          background: "var(--app-bg)",
          color: "var(--app-text)",
          "--atlas-topnav-h": `${TOPNAV_H}px`,
          "--atlas-sidebar-w": `${SIDEBAR_W}px`,
          "--atlas-sidebar-collapsed-w": `${SIDEBAR_W_COLLAPSED}px`,
        }}
      >
        <AtlasTopNav
          onToggleSidebar={toggleSidebar}
          showSidebarToggle={isMobile}
        />

        {!isMobile ? (
          <UnifiedNav
            collapsed={collapsed}
            onToggleCollapse={toggleSidebar}
            width={SIDEBAR_W}
            collapsedWidth={SIDEBAR_W_COLLAPSED}
          />
        ) : null}

        <main
          style={{
            paddingLeft: contentLeftPad,
            minHeight: `calc(100vh - ${TOPNAV_H}px)`,
            transition: "padding-left 220ms cubic-bezier(0.2, 0.8, 0.2, 1)",
            paddingBottom: isMobile ? 80 : 0,
          }}
        >
          <div className="app-page-shell">{children}</div>
        </main>

        {isMobile ? <MobileNav /> : null}

        {/* Global agent dock: FAB launcher + slide-over panel. */}
        <AgentDockFab />
        <AgentDock />

        {/* Global docs drawer: searchable inline help, toggled by the
            top-nav Help button or ⌘/. */}
        <DocsDrawer />
      </div>
    </AgentDockProvider>
    </DocsDrawerProvider>
  );
}
