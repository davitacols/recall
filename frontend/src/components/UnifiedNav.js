import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ChevronDownIcon,
  CpuChipIcon,
  HomeIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";
import { buildUnifiedNavModel, isHrefActive } from "./unifiedNavConfig";
import "./UnifiedNav.css";

// V2: the groups were renamed and reordered, and the stored map is keyed by
// group name. Reusing V1 would have left every returning user with all groups
// collapsed and no idea why.
const OPEN_GROUPS_KEY = "knoledgr.sidebar.openGroupsV2";

export default function UnifiedNav({
  collapsed = false,
  onToggleCollapse = () => {},
  width = 248,
  collapsedWidth = 60,
}) {
  const location = useLocation();
  const [installedApps, setInstalledApps] = useState([]);
  const [openGroups, setOpenGroups] = useState(() => {
    try {
      const raw = localStorage.getItem(OPEN_GROUPS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    // Memory open by default because it is the product; Resources closed
    // because it is reference material. "Execute" was in this list long after
    // the group itself was deleted.
    return { Memory: true, Explore: true, Resources: false };
  });

  const experienceMode =
    (typeof window !== "undefined" && localStorage.getItem("ui_experience_mode")) || "standard";

  useEffect(() => {
    let mounted = true;
    // Was /api/enterprise/apps/installed/ — a route that does not exist (there
    // is no /api/enterprise/ prefix at all), so this 404'd on every page load
    // and the empty catch swallowed it. The nav simply never showed installed
    // apps and nothing surfaced the failure.
    //
    // The marketplace endpoint carries an `installed` flag per app, so filter
    // on that rather than treating every listed app as installed.
    api
      .get("/api/organizations/enterprise/marketplace/apps/")
      .then((res) => {
        if (!mounted) return;
        const list = Array.isArray(res.data?.results)
          ? res.data.results
          : Array.isArray(res.data)
          ? res.data
          : [];
        setInstalledApps(list.filter((app) => app?.installed));
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // The foot of the sidebar carries the state of the memory itself.
  //
  // Every SaaS sidebar is a list of links; this one ends with the number the
  // product lives or dies by — what share of recorded decisions actually carry
  // their reasoning. A decision without its why is a row in a list, and if that
  // share falls the tool is failing at its one job. Putting it in the nav means
  // it is visible on every page rather than only when someone visits a
  // dashboard, which is the difference between a metric and a conscience.
  //
  // One request per mount, and a failure leaves the panel out entirely rather
  // than showing a zero that would read as "nothing recorded".
  const [memory, setMemory] = useState(null);
  useEffect(() => {
    let mounted = true;
    api
      .get("/api/decisions/memory-health/")
      .then((res) => {
        if (!mounted) return;
        const data = res.data?.data || res.data;
        if (!data || typeof data.decisions !== "number") return;
        setMemory({
          decisions: data.decisions,
          withWhy: data.decisions_with_rationale ?? 0,
        });
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const navModel = useMemo(
    () => buildUnifiedNavModel({ experienceMode, installedApps }),
    [experienceMode, installedApps]
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

        {memory && !collapsed ? <MemoryMeter {...memory} /> : null}
      </div>
    </aside>
  );
}

function MemoryMeter({ decisions, withWhy }) {
  const pct = decisions > 0 ? Math.round((withWhy / decisions) * 100) : null;
  // Below half, the record is filling up with decisions nobody will be able to
  // explain. That is worth a colour; everything above it is not.
  const thin = pct !== null && pct < 50;

  return (
    <Link
      // Straight to the gap when there is one. The meter was a number you
      // could only look at, on every page, with no route to acting on it.
      to={thin ? "/decisions?missing=why" : "/decisions"}
      className={`nav-memory${thin ? " is-thin" : ""}`}
      title={`${withWhy} of ${decisions} decisions record why they were made`}
    >
      <span className="nav-memory-head">
        <span className="nav-memory-count">{decisions}</span>
        <span className="nav-memory-label">
          decision{decisions === 1 ? "" : "s"} recorded
        </span>
      </span>
      <span className="nav-memory-bar" aria-hidden="true">
        <span style={{ width: `${Math.max(2, Math.min(100, pct ?? 0))}%` }} />
      </span>
      <span className="nav-memory-foot">
        {pct === null ? "nothing recorded yet" : `${pct}% carry their why`}
      </span>
    </Link>
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
