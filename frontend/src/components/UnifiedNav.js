import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  HomeIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { Badge } from "./atlas";
import {
  buildUnifiedNavModel,
  formatWorkspaceName,
  isHrefActive,
} from "./unifiedNavConfig";

/**
 * UnifiedNav — Atlassian-style project/workspace sidebar.
 *
 * Header:    workspace switcher (avatar + name + chevron)
 * Pinned:    Home · Ask Recall
 * Sections:  collapsible groups (Knowledge, Collaborate, Execute, Resources)
 *            each item renders as a row with an icon + label
 * Footer:    Apps · Settings · collapse toggle
 */
export default function UnifiedNav({
  collapsed = false,
  onToggleCollapse = () => {},
  width = 240,
  collapsedWidth = 56,
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
    return () => {
      mounted = false;
    };
  }, []);

  const navModel = useMemo(
    () => buildUnifiedNavModel({ user, experienceMode, installedApps }),
    [user, experienceMode, installedApps]
  );

  const activeWidth = collapsed ? collapsedWidth : width;

  const workspaceLabel =
    user?.organization_name ||
    (user?.organization_slug ? formatWorkspaceName(user.organization_slug) : "Knoledgr");
  const workspaceInitial = workspaceLabel.charAt(0)?.toUpperCase() || "K";

  const toggleGroup = (name) => {
    setOpenGroups((prev) => {
      const next = { ...prev, [name]: !prev[name] };
      try {
        localStorage.setItem("atlasSidebarOpenGroups", JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  };

  return (
    <aside
      style={{
        position: "fixed",
        top: "var(--atlas-topnav-h, 56px)",
        left: 0,
        bottom: 0,
        width: activeWidth,
        background: "var(--app-surface)",
        borderRight: "1px solid var(--app-border)",
        display: "flex",
        flexDirection: "column",
        zIndex: 90,
        transition: "width 180ms cubic-bezier(0.2, 0, 0, 1)",
        overflow: "hidden",
      }}
    >
      {/* Workspace header */}
      <div
        style={{
          padding: collapsed ? "12px 8px" : "12px 16px",
          borderBottom: "1px solid var(--app-border-subtle)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: 4,
            background: "var(--b400)",
            color: "#FFFFFF",
            display: "grid",
            placeItems: "center",
            fontWeight: 700,
            fontSize: 12,
            flexShrink: 0,
          }}
        >
          {workspaceInitial}
        </span>
        {!collapsed ? (
          <div style={{ minWidth: 0, flex: 1 }}>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 600,
                color: "var(--app-text)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {workspaceLabel}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: "var(--app-muted)" }}>Software project</p>
          </div>
        ) : null}
      </div>

      {/* Pinned (Home, Ask Recall) */}
      <div style={{ padding: "8px 0" }}>
        <SidebarItem
          to={navModel.homeItem.href}
          icon={HomeIcon}
          label="Home"
          collapsed={collapsed}
          active={isHrefActive(location.pathname, navModel.homeItem.href)}
        />
        <SidebarItem
          to={navModel.askRecallItem.href}
          icon={SparklesIcon}
          label="Ask Recall"
          collapsed={collapsed}
          active={isHrefActive(location.pathname, navModel.askRecallItem.href)}
        />
      </div>

      {/* Scrollable sections */}
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 0 16px" }}>
        {navModel.workstreamGroups.map((group) => (
          <SidebarGroup
            key={group.name}
            group={group}
            collapsed={collapsed}
            open={!!openGroups[group.name]}
            onToggle={() => toggleGroup(group.name)}
            pathname={location.pathname}
          />
        ))}

        {!collapsed && navModel.appsItem.items?.length ? (
          <SidebarGroup
            group={navModel.appsItem}
            collapsed={collapsed}
            open={!!openGroups.Apps}
            onToggle={() => toggleGroup("Apps")}
            pathname={location.pathname}
          />
        ) : null}
      </div>

      {/* Footer: utilities + collapse */}
      <div
        style={{
          borderTop: "1px solid var(--app-border-subtle)",
          padding: "8px 0",
        }}
      >
        {navModel.utilityItems.map((item) => (
          <SidebarItem
            key={item.href}
            to={item.href}
            icon={item.icon}
            label={item.name}
            collapsed={collapsed}
            active={isHrefActive(location.pathname, item.href)}
          />
        ))}
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            margin: "4px 8px 0",
            padding: "0 12px",
            height: 32,
            width: "calc(100% - 16px)",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--app-muted)",
            fontSize: 13,
            fontWeight: 500,
            borderRadius: 3,
            justifyContent: collapsed ? "center" : "flex-start",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--n30)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          {collapsed ? (
            <ChevronDoubleRightIcon style={{ width: 14, height: 14 }} />
          ) : (
            <>
              <ChevronDoubleLeftIcon style={{ width: 14, height: 14 }} />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

function SidebarItem({ to, icon: Icon, label, collapsed, active, badge }) {
  return (
    <Link
      to={to}
      className={`atlas-sidebar-item ${active ? "is-active" : ""}`}
      title={collapsed ? label : undefined}
      style={{
        justifyContent: collapsed ? "center" : "flex-start",
        padding: collapsed ? "0 8px" : undefined,
      }}
    >
      {Icon ? <Icon style={{ width: 16, height: 16, flexShrink: 0 }} /> : null}
      {!collapsed ? <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span> : null}
      {!collapsed && badge ? <Badge>{badge}</Badge> : null}
    </Link>
  );
}

function SidebarGroup({ group, collapsed, open, onToggle, pathname }) {
  const Icon = group.icon;
  const groupActive = (group.items || []).some((it) => isHrefActive(pathname, it.href));

  if (collapsed) {
    return (
      <div style={{ padding: "0 0 4px" }}>
        {(group.items || []).map((item) => (
          <SidebarItem
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
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        style={{
          width: "calc(100% - 16px)",
          margin: "8px 8px 2px",
          padding: "4px 8px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: groupActive ? "var(--app-text)" : "var(--app-muted)",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          borderRadius: 3,
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {Icon ? <Icon style={{ width: 12, height: 12 }} /> : null}
          {group.name}
        </span>
        {open ? (
          <ChevronDownIcon style={{ width: 12, height: 12 }} />
        ) : (
          <ChevronRightIcon style={{ width: 12, height: 12 }} />
        )}
      </button>
      {open ? (
        <div>
          {(group.items || []).map((item) => (
            <SidebarItem
              key={item.href}
              to={item.href}
              icon={item.icon}
              label={item.name}
              collapsed={collapsed}
              active={isHrefActive(pathname, item.href)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
