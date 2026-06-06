import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Bars3Icon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  QuestionMarkCircleIcon,
  Cog6ToothIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../hooks/useAuth";
import { Avatar, IconButton } from "./atlas";
import BrandLogo from "./BrandLogo";
import NotificationBell from "./NotificationBell";
import WorkspaceSwitcher from "./WorkspaceSwitcher";
import { formatWorkspaceName } from "./unifiedNavConfig";

/**
 * AtlasTopNav — global top bar.
 * Pill search, refined icon buttons, charcoal Create CTA, avatar pill with name.
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
  const [searchFocused, setSearchFocused] = useState(false);
  const [showSwitcher, setShowSwitcher] = useState(false);
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
  const firstName = user?.full_name?.split(" ")[0] || "Account";

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const q = search.trim();
    if (!q) return;
    navigate(`/knowledge?q=${encodeURIComponent(q)}`);
  };

  return (
    <>
      <style>{TOPNAV_STYLES}</style>
      <header className="atlas-topnav" ref={menuRef}>
        <div className="atlas-topnav-left">
          {showSidebarToggle ? (
            <IconButton
              icon={<Bars3Icon style={{ width: 18, height: 18 }} />}
              label="Toggle sidebar"
              onClick={onToggleSidebar}
            />
          ) : null}
          <Link to="/dashboard" className="atlas-topnav-brand" aria-label="Knoledgr home">
            <BrandLogo size="sm" tone="blue" showText={false} />
            <span>Knoledgr</span>
          </Link>

          <nav className="atlas-topnav-nav">
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
          </nav>
        </div>

        <form
          onSubmit={handleSearchSubmit}
          className={`atlas-topnav-search ${searchFocused ? "is-focused" : ""}`}
          role="search"
        >
          <MagnifyingGlassIcon className="atlas-topnav-search-icon" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search pages, decisions, people…"
            aria-label="Search"
          />
          <kbd className="atlas-topnav-kbd">⌘K</kbd>
        </form>

        <div className="atlas-topnav-right">
          <button
            type="button"
            className="atlas-topnav-create"
            onClick={() => navigate("/projects?new=1")}
          >
            <PlusIcon style={{ width: 14, height: 14 }} />
            Create
          </button>

          <div className="atlas-topnav-icons">
            <IconButton
              icon={<SparklesIcon style={{ width: 18, height: 18 }} />}
              label="Ask Recall"
              onClick={() => navigate("/ask")}
            />
            <NotificationBell />
            <IconButton
              icon={<QuestionMarkCircleIcon style={{ width: 18, height: 18 }} />}
              label="Help & docs"
              onClick={() => window.open("/docs", "_blank", "noopener,noreferrer")}
            />
            <IconButton
              icon={<Cog6ToothIcon style={{ width: 18, height: 18 }} />}
              label="Settings"
              onClick={() => navigate("/settings")}
            />
          </div>

          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setOpenMenu(openMenu === "profile" ? null : "profile")}
              className="atlas-topnav-profile"
              aria-label="Account"
            >
              <Avatar name={user?.full_name || initial} src={user?.avatar} size="sm" />
              <span className="atlas-topnav-profile-name">{firstName}</span>
              <ChevronDownIcon style={{ width: 12, height: 12, opacity: 0.6 }} />
            </button>
            {openMenu === "profile" ? (
              <div className="atlas-topnav-profile-menu">
                <div className="atlas-topnav-profile-head">
                  <p className="atlas-topnav-profile-name-lg">{user?.full_name || "User"}</p>
                  <p className="atlas-topnav-profile-email">{user?.email}</p>
                  <p className="atlas-topnav-profile-ws">{workspaceLabel}</p>
                </div>
                <MenuItem onClick={() => { setOpenMenu(null); navigate("/profile"); }}>Profile</MenuItem>
                <MenuItem onClick={() => { setOpenMenu(null); navigate("/settings"); }}>Settings</MenuItem>
                <MenuItem onClick={() => { setOpenMenu(null); navigate("/notifications"); }}>Notifications</MenuItem>
                <div className="atlas-topnav-divider" />
                <MenuItem onClick={() => { setOpenMenu(null); setShowSwitcher(true); }}>Switch workspace</MenuItem>
                <div className="atlas-topnav-divider" />
                <MenuItem onClick={logout} danger>Sign out</MenuItem>
              </div>
            ) : null}
          </div>
        </div>
      </header>
      {showSwitcher ? <WorkspaceSwitcher onClose={() => setShowSwitcher(false)} /> : null}
    </>
  );
}

function TopMenu({ label, items, isOpen, onOpen }) {
  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={onOpen}
        aria-expanded={isOpen}
        className={`atlas-topnav-navbtn ${isOpen ? "is-open" : ""}`}
      >
        {label}
        <ChevronDownIcon style={{ width: 12, height: 12, opacity: 0.6 }} />
      </button>
      {isOpen ? (
        <div className="atlas-topnav-dropdown">
          {items.map((item) => (
            <Link key={item.to} to={item.to} className="atlas-topnav-menuitem">
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
      className={`atlas-topnav-menuitem ${danger ? "is-danger" : ""}`}
      style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit" }}
    >
      {children}
    </button>
  );
}

const TOPNAV_STYLES = `
.atlas-topnav {
  position: sticky;
  top: 0;
  z-index: 100;
  height: var(--atlas-topnav-h, 60px);
  width: 100%;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--app-border);
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 540px) auto;
  align-items: center;
  gap: 20px;
  padding: 0 16px;
  font-family: inherit;
}

[data-theme="dark"] .atlas-topnav {
  background: rgba(15, 16, 17, 0.82);
}

.atlas-topnav-left {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.atlas-topnav-right {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-self: end;
}

.atlas-topnav-brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  height: 36px;
  padding: 0 10px 0 4px;
  margin-right: 8px;
  color: var(--app-text);
  text-decoration: none;
  font-weight: 700;
  font-size: 15px;
  letter-spacing: -0.012em;
  border-radius: 8px;
  transition: background 120ms ease;
}
.atlas-topnav-brand:hover { background: var(--app-surface-alt); }

.atlas-topnav-nav {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: 4px;
}

.atlas-topnav-navbtn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 34px;
  padding: 0 12px;
  background: transparent;
  color: var(--app-text);
  border: none;
  border-radius: 7px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease;
}
.atlas-topnav-navbtn:hover { background: var(--app-surface-alt); }
.atlas-topnav-navbtn.is-open { background: var(--app-surface-alt); color: var(--app-accent); }

.atlas-topnav-dropdown {
  position: absolute;
  top: 40px;
  left: 0;
  min-width: 240px;
  background: var(--app-surface-overlay);
  border: 1px solid var(--app-border);
  border-radius: 10px;
  box-shadow:
    0 1px 1px rgba(9, 30, 66, 0.04),
    0 12px 32px -8px rgba(9, 30, 66, 0.18);
  padding: 6px;
  z-index: 110;
}

.atlas-topnav-menuitem {
  display: block;
  padding: 8px 12px;
  font-size: 14px;
  color: var(--app-text);
  text-decoration: none;
  cursor: pointer;
  border-radius: 6px;
  transition: background 100ms ease;
}
.atlas-topnav-menuitem:hover { background: var(--app-surface-alt); }
.atlas-topnav-menuitem.is-danger { color: var(--r500); }

.atlas-topnav-divider {
  height: 1px;
  background: var(--app-border-subtle);
  margin: 6px 4px;
}

/* ---------- Search ---------- */

.atlas-topnav-search {
  position: relative;
  display: flex;
  align-items: center;
  height: 38px;
  padding: 0 12px 0 38px;
  border-radius: 999px;
  background: var(--app-surface-alt);
  border: 1px solid transparent;
  transition: background 140ms ease, border-color 140ms ease, box-shadow 140ms ease;
}
.atlas-topnav-search:hover { background: var(--n30); }
.atlas-topnav-search.is-focused {
  background: var(--app-surface);
  border-color: var(--b400);
  box-shadow: 0 0 0 4px rgba(94, 106, 210, 0.16);
}

.atlas-topnav-search input {
  flex: 1;
  height: 100%;
  background: transparent;
  border: none;
  outline: none;
  color: var(--app-text);
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  padding: 0;
}
.atlas-topnav-search input::placeholder { color: var(--app-text-subtle); font-weight: 400; }

.atlas-topnav-search-icon {
  position: absolute;
  left: 14px;
  width: 16px;
  height: 16px;
  color: var(--app-muted);
  pointer-events: none;
}

.atlas-topnav-kbd {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  border: 1px solid var(--app-border);
  border-radius: 5px;
  background: var(--app-surface);
  color: var(--app-muted);
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

/* ---------- Right cluster ---------- */

.atlas-topnav-create {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 14px;
  border: none;
  border-radius: 8px;
  background: var(--app-text);
  color: var(--app-surface);
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.005em;
  cursor: pointer;
  transition: transform 140ms ease, opacity 140ms ease;
}
.atlas-topnav-create:hover { transform: translateY(-1px); opacity: 0.92; }

.atlas-topnav-icons {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0 2px;
}

.atlas-topnav-icons::after {
  content: "";
  width: 1px;
  height: 22px;
  background: var(--app-border-subtle);
  margin: 0 6px 0 8px;
}

/* ---------- Profile ---------- */

.atlas-topnav-profile {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 10px 0 4px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 999px;
  cursor: pointer;
  font-family: inherit;
  transition: background 120ms ease, border-color 120ms ease;
}
.atlas-topnav-profile:hover {
  background: var(--app-surface-alt);
  border-color: var(--app-border-subtle);
}

.atlas-topnav-profile-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--app-text);
  max-width: 110px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.atlas-topnav-profile-menu {
  position: absolute;
  top: 44px;
  right: 0;
  min-width: 280px;
  background: var(--app-surface-overlay);
  border: 1px solid var(--app-border);
  border-radius: 12px;
  box-shadow:
    0 1px 1px rgba(9, 30, 66, 0.04),
    0 16px 40px -10px rgba(9, 30, 66, 0.22);
  padding: 6px;
  z-index: 120;
}

.atlas-topnav-profile-head {
  padding: 12px 14px 14px;
  border-bottom: 1px solid var(--app-border-subtle);
  margin-bottom: 6px;
}
.atlas-topnav-profile-name-lg {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--app-text);
}
.atlas-topnav-profile-email {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--app-muted);
}
.atlas-topnav-profile-ws {
  margin: 8px 0 0;
  font-size: 11px;
  color: var(--app-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 600;
}

@media (max-width: 1100px) {
  .atlas-topnav { grid-template-columns: auto minmax(0, 1fr) auto; padding: 0 14px; }
  .atlas-topnav-nav { display: none; }
  .atlas-topnav-kbd { display: none; }
}

@media (max-width: 720px) {
  .atlas-topnav-create span,
  .atlas-topnav-profile-name { display: none; }
  .atlas-topnav-icons { gap: 0; }
}
`;
