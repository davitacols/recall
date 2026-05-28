import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Bars3Icon,
  BellIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  QuestionMarkCircleIcon,
  Cog6ToothIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../hooks/useAuth";
import { Avatar, IconButton, Button } from "./atlas";
import BrandLogo from "./BrandLogo";
import { formatWorkspaceName } from "./unifiedNavConfig";

/**
 * AtlasTopNav — Atlassian-style global top bar (56px).
 *
 * Left:   app switcher (9-dot) · brand · "Your work" ▾ · "Projects" ▾ · "Apps" ▾ · "Create"
 * Center: global search
 * Right:  notifications · help · settings · avatar
 */
export default function AtlasTopNav({
  onToggleSidebar,
  showSidebarToggle = false,
  workspaceName,
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [openMenu, setOpenMenu] = useState(null);
  const [search, setSearch] = useState("");
  const menuRef = useRef(null);

  useEffect(() => {
    setOpenMenu(null);
  }, [location.pathname]);

  useEffect(() => {
    const onClick = (e) => {
      if (!menuRef.current?.contains(e.target)) setOpenMenu(null);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const workspaceLabel =
    workspaceName ||
    user?.organization_name ||
    (user?.organization_slug ? formatWorkspaceName(user.organization_slug) : "Knoledgr");

  const initial = user?.full_name?.charAt(0)?.toUpperCase() || "U";

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const q = search.trim();
    if (!q) return;
    navigate(`/knowledge?q=${encodeURIComponent(q)}`);
  };

  return (
    <header style={topbarStyle} ref={menuRef}>
      <div style={leftCluster}>
        {showSidebarToggle ? (
          <IconButton
            icon={<Bars3Icon style={{ width: 18, height: 18 }} />}
            label="Toggle sidebar"
            onClick={onToggleSidebar}
          />
        ) : null}
        <Link to="/dashboard" style={brandLink} aria-label="Knoledgr home">
          <span style={brandMark}>
            <BrandLogo size={22} />
          </span>
          <span style={brandName}>Knoledgr</span>
        </Link>

        <nav style={navLinkRow}>
          <TopMenu
            label="Your work"
            isOpen={openMenu === "work"}
            onOpen={() => setOpenMenu(openMenu === "work" ? null : "work")}
            items={[
              { label: "Assigned to me", to: "/dashboard?tab=assigned" },
              { label: "Recently viewed", to: "/dashboard?tab=viewed" },
              { label: "Starred", to: "/dashboard?tab=starred" },
              { label: "Worked on", to: "/dashboard?tab=worked" },
              { label: "All boards", to: "/projects" },
            ]}
          />
          <TopMenu
            label="Projects"
            isOpen={openMenu === "projects"}
            onOpen={() => setOpenMenu(openMenu === "projects" ? null : "projects")}
            items={[
              { label: "View all projects", to: "/projects" },
              { label: "Create project", to: "/projects?new=1" },
            ]}
          />
          <TopMenu
            label="Knowledge"
            isOpen={openMenu === "knowledge"}
            onOpen={() => setOpenMenu(openMenu === "knowledge" ? null : "knowledge")}
            items={[
              { label: "Search", to: "/knowledge" },
              { label: "Graph", to: "/knowledge/graph" },
              { label: "Analytics", to: "/knowledge/analytics" },
              { label: "Documents", to: "/business/documents" },
            ]}
          />
          <TopMenu
            label="Apps"
            isOpen={openMenu === "apps"}
            onOpen={() => setOpenMenu(openMenu === "apps" ? null : "apps")}
            items={[
              { label: "Browse apps", to: "/enterprise" },
              { label: "Integrations", to: "/integrations" },
            ]}
          />
          <Button
            appearance="primary"
            size="sm"
            iconBefore={<PlusIcon style={{ width: 14, height: 14 }} />}
            onClick={() => navigate("/projects?new=1")}
            style={{ marginLeft: 8 }}
          >
            Create
          </Button>
        </nav>
      </div>

      <form onSubmit={handleSearchSubmit} style={searchForm} role="search">
        <MagnifyingGlassIcon style={searchIcon} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search"
          style={searchInput}
          aria-label="Search"
        />
      </form>

      <div style={rightCluster}>
        <IconButton
          icon={<SparklesIcon style={{ width: 18, height: 18 }} />}
          label="Ask Recall"
          onClick={() => navigate("/ask")}
        />
        <IconButton
          icon={<BellIcon style={{ width: 18, height: 18 }} />}
          label="Notifications"
          onClick={() => navigate("/notifications")}
        />
        <IconButton
          icon={<QuestionMarkCircleIcon style={{ width: 18, height: 18 }} />}
          label="Help"
          onClick={() => navigate("/docs")}
        />
        <IconButton
          icon={<Cog6ToothIcon style={{ width: 18, height: 18 }} />}
          label="Settings"
          onClick={() => navigate("/settings")}
        />
        <div style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setOpenMenu(openMenu === "profile" ? null : "profile")}
            style={profileTrigger}
            aria-label="Account"
          >
            <Avatar name={user?.full_name || initial} src={user?.avatar} size="sm" />
          </button>
          {openMenu === "profile" ? (
            <div style={profileMenu}>
              <div style={profileMenuHead}>
                <p style={{ fontWeight: 600, fontSize: 14, color: "var(--app-text)", margin: 0 }}>
                  {user?.full_name || "User"}
                </p>
                <p style={{ marginTop: 2, fontSize: 12, color: "var(--app-muted)" }}>{user?.email}</p>
                <p style={{ marginTop: 6, fontSize: 11, color: "var(--app-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {workspaceLabel}
                </p>
              </div>
              <MenuItem onClick={() => { setOpenMenu(null); navigate("/profile"); }}>Profile</MenuItem>
              <MenuItem onClick={() => { setOpenMenu(null); navigate("/settings"); }}>Settings</MenuItem>
              <MenuItem onClick={() => { setOpenMenu(null); navigate("/notifications"); }}>Notifications</MenuItem>
              <div style={menuDivider} />
              <MenuItem onClick={logout} danger>Sign out</MenuItem>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function TopMenu({ label, items, isOpen, onOpen }) {
  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={onOpen}
        aria-expanded={isOpen}
        style={{
          ...navLinkButton,
          background: isOpen ? "var(--n30)" : "transparent",
        }}
      >
        {label}
        <ChevronDownIcon style={{ width: 12, height: 12, opacity: 0.7 }} />
      </button>
      {isOpen ? (
        <div style={topMenuDropdown}>
          {items.map((item) => (
            <Link key={item.to} to={item.to} style={menuItemStyle}>
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({ children, onClick, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...menuItemStyle,
        width: "100%",
        textAlign: "left",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        color: danger ? "var(--r500)" : "var(--app-text)",
        fontSize: 14,
      }}
    >
      {children}
    </button>
  );
}

const topbarStyle = {
  position: "sticky",
  top: 0,
  zIndex: 100,
  height: "var(--atlas-topnav-h, 56px)",
  width: "100%",
  background: "var(--app-surface)",
  borderBottom: "1px solid var(--app-border)",
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(240px, 720px) auto",
  alignItems: "center",
  gap: 16,
  padding: "0 16px",
};

const leftCluster = { display: "flex", alignItems: "center", gap: 4, minWidth: 0 };
const rightCluster = { display: "flex", alignItems: "center", gap: 2, justifySelf: "end" };

const brandLink = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  textDecoration: "none",
  color: "var(--app-text)",
  padding: "0 8px",
  height: 32,
  borderRadius: 3,
};

const brandMark = { display: "inline-flex" };
const brandName = { fontWeight: 600, fontSize: 14, letterSpacing: "-0.005em" };

const navLinkRow = { display: "flex", alignItems: "center", gap: 2, marginLeft: 8 };

const navLinkButton = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  height: 32,
  padding: "0 8px",
  background: "transparent",
  color: "var(--app-text)",
  border: "none",
  borderRadius: 3,
  fontFamily: "inherit",
  fontSize: 14,
  fontWeight: 500,
  cursor: "pointer",
};

const topMenuDropdown = {
  position: "absolute",
  top: 36,
  left: 0,
  minWidth: 240,
  background: "var(--app-surface-overlay)",
  border: "1px solid var(--app-border)",
  borderRadius: 4,
  boxShadow: "var(--ui-shadow-md)",
  padding: "4px 0",
  zIndex: 110,
};

const menuItemStyle = {
  display: "block",
  padding: "8px 16px",
  fontSize: 14,
  color: "var(--app-text)",
  textDecoration: "none",
  cursor: "pointer",
};

const menuDivider = {
  height: 1,
  background: "var(--app-border-subtle)",
  margin: "4px 0",
};

const searchForm = {
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifySelf: "stretch",
};

const searchIcon = {
  position: "absolute",
  left: 8,
  width: 16,
  height: 16,
  color: "var(--app-muted)",
  pointerEvents: "none",
};

const searchInput = {
  width: "100%",
  height: 32,
  paddingLeft: 32,
  paddingRight: 8,
  fontSize: 14,
  background: "var(--n20)",
  border: "2px solid transparent",
  borderRadius: 3,
  color: "var(--app-text)",
  outline: "none",
  fontFamily: "inherit",
};

const profileTrigger = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 32,
  height: 32,
  background: "transparent",
  border: "none",
  borderRadius: "50%",
  padding: 0,
  cursor: "pointer",
};

const profileMenu = {
  position: "absolute",
  top: 40,
  right: 0,
  minWidth: 280,
  background: "var(--app-surface-overlay)",
  border: "1px solid var(--app-border)",
  borderRadius: 4,
  boxShadow: "var(--ui-shadow-md)",
  padding: "4px 0",
  zIndex: 120,
};

const profileMenuHead = {
  padding: "12px 16px",
  borderBottom: "1px solid var(--app-border-subtle)",
};
