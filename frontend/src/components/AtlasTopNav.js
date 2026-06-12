import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  ChevronDownIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  QuestionMarkCircleIcon,
  SparklesIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../hooks/useAuth";
import { Avatar } from "./atlas";
import NotificationBell from "./NotificationBell";
import WorkspaceSwitcher from "./WorkspaceSwitcher";
import { useDocsDrawer } from "./DocsDrawer";
import { formatWorkspaceName } from "./unifiedNavConfig";
import "./AtlasTopNav.css";

/**
 * AtlasTopNav — global top bar.
 * Sidebar toggle (always visible) · brand · workspace · search · actions · profile.
 */
export default function AtlasTopNav({
  onToggleSidebar,
  workspaceName,
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const docsDrawer = useDocsDrawer();
  const [search, setSearch] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [showSwitcher, setShowSwitcher] = useState(false);
  const profileRef = useRef(null);

  // Close menu when route changes
  useEffect(() => {
    setProfileOpen(false);
  }, [location.pathname]);

  // Close on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (!profileRef.current?.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const workspaceLabel =
    workspaceName ||
    user?.organization_name ||
    (user?.organization_slug ? formatWorkspaceName(user.organization_slug) : "Knoledgr");
  const workspaceInitial = workspaceLabel.charAt(0)?.toUpperCase() || "K";

  const fullName = user?.full_name || user?.email || "Account";
  const firstName = (user?.full_name || "").split(" ")[0] || fullName;

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const q = search.trim();
    if (!q) return;
    navigate(`/knowledge?q=${encodeURIComponent(q)}`);
  };

  return (
    <>
      <header className="tn">
        {/* Left: toggle + brand + workspace */}
        <div className="tn-left">
          <button
            type="button"
            className="tn-toggle"
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
            title="Toggle sidebar"
          >
            <Bars3Icon />
          </button>

          <Link to="/dashboard" className="tn-brand" aria-label="Knoledgr home">
            <span className="tn-brand-mark" aria-hidden="true">K</span>
            <span className="tn-brand-name">Knoledgr</span>
          </Link>

          <span className="tn-divider" aria-hidden="true" />

          <button
            type="button"
            className="tn-workspace"
            onClick={() => setShowSwitcher(true)}
            title="Switch workspace"
          >
            <span className="tn-workspace-mark">{workspaceInitial}</span>
            <span className="tn-workspace-name">{workspaceLabel}</span>
            <ChevronDownIcon className="tn-chev" />
          </button>
        </div>

        {/* Center: search */}
        <form className="tn-search" onSubmit={handleSearchSubmit} role="search">
          <MagnifyingGlassIcon />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search workspace…"
            aria-label="Search"
          />
          <kbd>⌘K</kbd>
        </form>

        {/* Right: actions + profile */}
        <div className="tn-right">
          <button
            type="button"
            className="tn-create"
            onClick={() => navigate("/projects?new=1")}
          >
            <PlusIcon />
            Create
          </button>

          <div className="tn-actions">
            <IconAction
              label="Ask Recall"
              onClick={() => navigate("/ask")}
            >
              <SparklesIcon />
            </IconAction>
            <NotificationBell />
            <IconAction label="Help & docs" onClick={() => docsDrawer.toggle()}>
              <QuestionMarkCircleIcon />
            </IconAction>
            <IconAction label="Settings" onClick={() => navigate("/settings")}>
              <Cog6ToothIcon />
            </IconAction>
          </div>

          <div className="tn-profile-wrap" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((v) => !v)}
              className={`tn-profile${profileOpen ? " is-open" : ""}`}
              aria-label="Account menu"
              aria-expanded={profileOpen}
            >
              <Avatar name={fullName} src={user?.avatar} size="sm" />
              <span className="tn-profile-name">{firstName}</span>
              <ChevronDownIcon className="tn-chev" />
            </button>
            {profileOpen ? (
              <div className="tn-profile-menu" role="menu">
                <div className="tn-profile-head">
                  <Avatar name={fullName} src={user?.avatar} size="md" />
                  <div className="tn-profile-id">
                    <p className="tn-profile-fullname">{fullName}</p>
                    {user?.email ? <p className="tn-profile-email">{user.email}</p> : null}
                    <p className="tn-profile-role">
                      {user?.role || "member"} · {workspaceLabel}
                    </p>
                  </div>
                </div>
                <div className="tn-profile-sep" />
                <MenuLink to="/profile" onClick={() => setProfileOpen(false)} icon={UserCircleIcon}>
                  View profile
                </MenuLink>
                <MenuLink to="/settings" onClick={() => setProfileOpen(false)} icon={Cog6ToothIcon}>
                  Settings
                </MenuLink>
                <div className="tn-profile-sep" />
                <MenuButton
                  onClick={() => {
                    setProfileOpen(false);
                    setShowSwitcher(true);
                  }}
                >
                  Switch workspace
                </MenuButton>
                <div className="tn-profile-sep" />
                <MenuButton danger onClick={logout} icon={ArrowRightOnRectangleIcon}>
                  Sign out
                </MenuButton>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {showSwitcher ? <WorkspaceSwitcher onClose={() => setShowSwitcher(false)} /> : null}
    </>
  );
}

function IconAction({ children, label, onClick }) {
  return (
    <button
      type="button"
      className="tn-icon"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

function MenuLink({ to, children, onClick, icon: Icon }) {
  return (
    <Link to={to} className="tn-menu-item" onClick={onClick}>
      {Icon ? <Icon /> : null}
      <span>{children}</span>
    </Link>
  );
}

function MenuButton({ children, onClick, danger, icon: Icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`tn-menu-item${danger ? " is-danger" : ""}`}
    >
      {Icon ? <Icon /> : null}
      <span>{children}</span>
    </button>
  );
}
