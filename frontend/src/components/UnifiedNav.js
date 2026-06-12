import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ChevronDownIcon,
  CpuChipIcon,
  HomeIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { buildUnifiedNavModel, isHrefActive } from "./unifiedNavConfig";
import "./UnifiedNav.css";

const OPEN_GROUPS_KEY = "knoledgr.sidebar.openGroupsV1";

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
      const raw = localStorage.getItem(OPEN_GROUPS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return { Knowledge: true, Collaborate: true, Execute: true, Resources: false };
  });

  const experienceMode =
    (typeof window !== "undefined" && localStorage.getItem("ui_experience_mode")) || "standard";

  useEffect(() => {
    let mounted = true;
    api
      .get("/api/enterprise/apps/installed/")
      .then((res) => {
        if (!mounted) return;
        setInstalledApps(Array.isArray(res.data?.results) ? res.data.results : res.data || []);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const navModel = useMemo(
    () => buildUnifiedNavModel({ user, experienceMode, installedApps }),
    [user, experienceMode, installedApps]
  );

  const toggleGroup = (name) => {
    setOpenGroups((prev) => {
      const next = { ...prev, [name]: !prev[name] };
      try {
        localStorage.setItem(OPEN_GROUPS_KEY, JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  };

  return (
    <aside
      className={`nav${collapsed ? " is-collapsed" : ""}`}
      style={{ "--nav-w": `${width}px`, "--nav-cw": `${collapsedWidth}px` }}
      aria-label="Workspace navigation"
    >
      <div className="nav-inner">
        {/* Pinned */}
        <div className="nav-pinned">
          <NavItem
            to={navModel.homeItem.href}
            Icon={HomeIcon}
            label="Home"
            collapsed={collapsed}
            active={isHrefActive(location.pathname, navModel.homeItem.href)}
          />
          <NavItem
            to={navModel.askRecallItem.href}
            Icon={SparklesIcon}
            label="Ask Recall"
            collapsed={collapsed}
            active={isHrefActive(location.pathname, navModel.askRecallItem.href)}
          />
          {navModel.agentItem ? (
            <NavItem
              to={navModel.agentItem.href}
              Icon={CpuChipIcon}
              label="Agent"
              collapsed={collapsed}
              active={isHrefActive(location.pathname, navModel.agentItem.href)}
            />
          ) : null}
        </div>

        {/* Scrollable nav */}
        <nav className="nav-scroll">
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

        {/* Footer utilities */}
        <div className="nav-footer">
          {navModel.utilityItems.map((item) => (
            <NavItem
              key={item.href}
              to={item.href}
              Icon={item.icon}
              label={item.name}
              collapsed={collapsed}
              active={isHrefActive(location.pathname, item.href)}
              size="sm"
            />
          ))}
        </div>
      </div>
    </aside>
  );
}

function NavItem({ to, Icon, label, collapsed, active, size }) {
  return (
    <Link
      to={to}
      className={`nav-item${active ? " is-active" : ""}${size === "sm" ? " is-small" : ""}`}
      title={collapsed ? label : undefined}
      aria-current={active ? "page" : undefined}
    >
      {Icon ? <Icon className="nav-item-icon" aria-hidden="true" /> : null}
      <span className="nav-item-label">{label}</span>
    </Link>
  );
}

function NavGroup({ group, collapsed, open, onToggle, pathname }) {
  const hasActive = (group.items || []).some((it) => isHrefActive(pathname, it.href));

  if (collapsed) {
    return (
      <div className="nav-group is-collapsed">
        {(group.items || []).map((item) => (
          <NavItem
            key={item.href}
            to={item.href}
            Icon={item.icon}
            label={item.name}
            collapsed
            active={isHrefActive(pathname, item.href)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={`nav-group${hasActive ? " has-active" : ""}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="nav-group-head"
      >
        <span className="nav-group-name">{group.name}</span>
        <ChevronDownIcon
          className={`nav-group-chev${open ? " is-open" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open ? (
        <div className="nav-group-list">
          {(group.items || []).map((item) => (
            <NavItem
              key={item.href}
              to={item.href}
              Icon={item.icon}
              label={item.name}
              collapsed={false}
              active={isHrefActive(pathname, item.href)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
