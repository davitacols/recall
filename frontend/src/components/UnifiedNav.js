import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ChevronDownIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  CpuChipIcon,
  HomeIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { buildUnifiedNavModel, formatWorkspaceName, isHrefActive } from "./unifiedNavConfig";

export default function UnifiedNav({
  collapsed = false,
  onToggleCollapse = () => {},
  width = 248,
  collapsedWidth = 60,
}) {
  const { user } = useAuth();
  const location = useLocation();
  const [installedApps, setInstalledApps] = useState([]);
  const [openGroups, setOpenGroups] = useState(() => {
    try {
      const raw = localStorage.getItem("atlasSidebarOpenGroups");
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return { Knowledge: true, Collaborate: true, Execute: true, Resources: false };
  });

  const experienceMode = localStorage.getItem("ui_experience_mode") || "standard";

  useEffect(() => {
    let mounted = true;
    api
      .get("/api/enterprise/apps/installed/")
      .then((res) => {
        if (!mounted) return;
        setInstalledApps(Array.isArray(res.data?.results) ? res.data.results : res.data || []);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const navModel = useMemo(
    () => buildUnifiedNavModel({ user, experienceMode, installedApps }),
    [user, experienceMode, installedApps]
  );

  const workspaceLabel =
    user?.organization_name ||
    (user?.organization_slug ? formatWorkspaceName(user.organization_slug) : "Knoledgr");
  const workspaceInitial = workspaceLabel.charAt(0)?.toUpperCase() || "K";
  const userRole = user?.role || "member";

  const toggleGroup = (name) => {
    setOpenGroups((prev) => {
      const next = { ...prev, [name]: !prev[name] };
      try { localStorage.setItem("atlasSidebarOpenGroups", JSON.stringify(next)); } catch (_) {}
      return next;
    });
  };

  return (
    <>
      <style>{SIDEBAR_CSS}</style>
      <aside
        className={`usb ${collapsed ? "usb--collapsed" : ""}`}
        style={{ "--usb-w": `${width}px`, "--usb-cw": `${collapsedWidth}px` }}
      >
        <div className="usb__inner">

          {/* ── Workspace header ── */}
          <div className="usb__header">
            <div className="usb__ws-avatar">{workspaceInitial}</div>
            <div className="usb__ws-meta">
              <p className="usb__ws-name">{workspaceLabel}</p>
              <p className="usb__ws-role">{userRole}</p>
            </div>
            <button
              type="button"
              className="usb__toggle"
              onClick={onToggleCollapse}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed
                ? <ChevronDoubleRightIcon style={{ width: 13, height: 13 }} />
                : <ChevronDoubleLeftIcon style={{ width: 13, height: 13 }} />}
            </button>
          </div>

          {/* ── Pinned ── */}
          <div className="usb__pinned">
            <NavItem
              to={navModel.homeItem.href}
              icon={HomeIcon}
              label="Home"
              collapsed={collapsed}
              active={isHrefActive(location.pathname, navModel.homeItem.href)}
            />
            <NavItem
              to={navModel.askRecallItem.href}
              icon={SparklesIcon}
              label="Ask Recall"
              collapsed={collapsed}
              active={isHrefActive(location.pathname, navModel.askRecallItem.href)}
              ai
            />
            {navModel.agentItem ? (
              <NavItem
                to={navModel.agentItem.href}
                icon={CpuChipIcon}
                label="Agent"
                collapsed={collapsed}
                active={isHrefActive(location.pathname, navModel.agentItem.href)}
                ai
              />
            ) : null}
          </div>

          <div className="usb__divider" />

          {/* ── Scrollable nav ── */}
          <nav className="usb__scroll" aria-label="Workspace navigation">
            {navModel.workstreamGroups.map((group) => (
              <NavGroup
                key={group.name}
                group={group}
                collapsed={collapsed}
                open={!!openGroups[group.name]}
                onToggle={() => toggleGroup(group.name)}
                pathname={location.pathname}
              />
            ))}

            {navModel.appsItem.items?.length ? (
              <NavGroup
                group={navModel.appsItem}
                collapsed={collapsed}
                open={!!openGroups.Apps}
                onToggle={() => toggleGroup("Apps")}
                pathname={location.pathname}
              />
            ) : null}
          </nav>

          {/* ── Footer ── */}
          <div className="usb__footer">
            {navModel.utilityItems.map((item) => (
              <NavItem
                key={item.href}
                to={item.href}
                icon={item.icon}
                label={item.name}
                collapsed={collapsed}
                active={isHrefActive(location.pathname, item.href)}
                small
              />
            ))}
          </div>

        </div>
      </aside>
    </>
  );
}

/* ── NavItem ── */
function NavItem({ to, icon: Icon, label, collapsed, active, ai, small }) {
  return (
    <Link
      to={to}
      className={`usb__item${active ? " usb__item--active" : ""}${ai ? " usb__item--ai" : ""}${small ? " usb__item--small" : ""}`}
      title={collapsed ? label : undefined}
      aria-current={active ? "page" : undefined}
    >
      {Icon && <Icon className="usb__item-icon" aria-hidden="true" />}
      <span className="usb__item-label">{label}</span>
      {active && <span className="usb__item-pip" aria-hidden="true" />}
    </Link>
  );
}

/* ── NavGroup ── */
function NavGroup({ group, collapsed, open, onToggle, pathname }) {
  const hasActive = (group.items || []).some((it) => isHrefActive(pathname, it.href));

  if (collapsed) {
    return (
      <div className="usb__group">
        {(group.items || []).map((item) => (
          <NavItem
            key={item.href}
            to={item.href}
            icon={item.icon}
            label={item.name}
            collapsed
            active={isHrefActive(pathname, item.href)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="usb__group">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`usb__group-btn${hasActive ? " usb__group-btn--active" : ""}`}
      >
        <span className="usb__group-label">{group.name}</span>
        <ChevronDownIcon
          className={`usb__group-chevron${open ? " usb__group-chevron--open" : ""}`}
        />
      </button>

      {open && (
        <div className="usb__group-items">
          {(group.items || []).map((item) => (
            <NavItem
              key={item.href}
              to={item.href}
              icon={item.icon}
              label={item.name}
              collapsed={false}
              active={isHrefActive(pathname, item.href)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Styles ── */
const SIDEBAR_CSS = `
/* ── Shell ── */
.usb {
  position: fixed;
  top: var(--atlas-topnav-h, 60px);
  left: 0;
  bottom: 0;
  width: var(--usb-w, 248px);
  z-index: 90;
  background: var(--app-surface, #fff);
  border-right: 1px solid var(--app-border, #e8e8e8);
  transition: width 200ms cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}
.usb--collapsed { width: var(--usb-cw, 60px); }
.usb--collapsed:hover {
  width: var(--usb-w, 248px);
  box-shadow: 4px 0 24px -4px rgba(9,30,66,.14);
  z-index: 95;
}

.usb__inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: var(--usb-w, 248px);
}

/* ── Header ── */
.usb__header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  min-height: 56px;
  border-bottom: 1px solid var(--app-border-subtle, #f0f0f0);
  flex-shrink: 0;
}

.usb__ws-avatar {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  letter-spacing: -0.01em;
  box-shadow: 0 2px 8px -2px rgba(99,102,241,.45);
}

.usb__ws-meta {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  transition: opacity 160ms ease;
}
.usb__ws-name {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--app-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -0.01em;
}
.usb__ws-role {
  margin: 1px 0 0;
  font-size: 11px;
  color: var(--app-muted);
  text-transform: capitalize;
  font-weight: 500;
}

.usb__toggle {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  color: var(--app-muted);
  cursor: pointer;
  flex-shrink: 0;
  transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
}
.usb__toggle:hover {
  background: var(--app-surface-alt);
  border-color: var(--app-border-subtle);
  color: var(--app-text);
}

/* ── Pinned ── */
.usb__pinned {
  padding: 8px 8px 4px;
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex-shrink: 0;
}

.usb__divider {
  height: 1px;
  background: var(--app-border-subtle, #f0f0f0);
  margin: 0 12px 4px;
  flex-shrink: 0;
}

/* ── Scroll ── */
.usb__scroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 4px 8px 16px;
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}
.usb__scroll:hover { scrollbar-color: var(--app-border) transparent; }
.usb__scroll::-webkit-scrollbar { width: 4px; }
.usb__scroll::-webkit-scrollbar-thumb { background: transparent; border-radius: 4px; }
.usb__scroll:hover::-webkit-scrollbar-thumb { background: var(--app-border); }

/* ── Group ── */
.usb__group { margin-top: 4px; }

.usb__group-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 28px;
  padding: 0 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--app-text-disabled, #aaa);
  border-radius: 6px;
  transition: color 120ms ease;
}
.usb__group-btn:hover { color: var(--app-text-subtle, #666); }
.usb__group-btn--active { color: var(--app-text-subtle, #666); }
.usb__group-label { flex: 1; text-align: left; }

.usb__group-chevron {
  width: 12px;
  height: 12px;
  opacity: 0.5;
  transition: transform 180ms cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
}
.usb__group-chevron--open { transform: rotate(0deg); }
.usb__group-chevron:not(.usb__group-chevron--open) { transform: rotate(-90deg); }

.usb__group-items {
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin-top: 1px;
  padding-left: 4px;
}

/* ── Item ── */
.usb__item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 9px;
  height: 32px;
  padding: 0 10px;
  border-radius: 8px;
  color: var(--app-text-subtle, #555);
  text-decoration: none;
  font-size: 13.5px;
  font-weight: 500;
  letter-spacing: -0.003em;
  transition: background 100ms ease, color 100ms ease;
  white-space: nowrap;
  overflow: hidden;
}
.usb__item:hover {
  background: var(--app-surface-alt);
  color: var(--app-text);
  text-decoration: none;
}
.usb__item--active {
  background: var(--app-selected, #e8f0fe);
  color: var(--app-accent, #0052cc);
  font-weight: 600;
}
.usb__item--small { height: 30px; font-size: 13px; }

/* AI item accent */
.usb__item--ai:not(.usb__item--active) .usb__item-icon { color: #8b5cf6; }
.usb__item--ai:not(.usb__item--active) { color: var(--app-text-subtle); }

.usb__item-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: var(--app-text-disabled, #bbb);
  transition: color 100ms ease;
}
.usb__item:hover .usb__item-icon { color: var(--app-text-subtle); }
.usb__item--active .usb__item-icon { color: var(--app-accent, #0052cc); }

.usb__item-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Active pip — left edge indicator */
.usb__item-pip {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 16px;
  border-radius: 0 3px 3px 0;
  background: var(--app-accent, #0052cc);
}

/* ── Footer ── */
.usb__footer {
  padding: 6px 8px 10px;
  border-top: 1px solid var(--app-border-subtle, #f0f0f0);
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex-shrink: 0;
}

/* ── Collapsed state ── */
.usb--collapsed:not(:hover) .usb__ws-meta,
.usb--collapsed:not(:hover) .usb__toggle,
.usb--collapsed:not(:hover) .usb__item-label,
.usb--collapsed:not(:hover) .usb__group-btn,
.usb--collapsed:not(:hover) .usb__divider {
  opacity: 0;
  pointer-events: none;
}
.usb--collapsed:not(:hover) .usb__header {
  justify-content: center;
  padding: 10px 8px;
}
.usb--collapsed:not(:hover) .usb__item {
  justify-content: center;
  padding: 0;
}
.usb--collapsed:not(:hover) .usb__item-pip { display: none; }
.usb--collapsed:not(:hover) .usb__pinned,
.usb--collapsed:not(:hover) .usb__scroll,
.usb--collapsed:not(:hover) .usb__footer {
  padding-left: 6px;
  padding-right: 6px;
}
`;
