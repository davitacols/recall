import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  MagnifyingGlassIcon,
  BookOpenIcon,
  ShareIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";

/**
 * KnowledgeLayout — one unified "Knowledge" area.
 *
 * Consolidates the previously scattered knowledge surfaces (search, advanced
 * search, knowledge base, graph, analytics, health, insights) into a single
 * destination with a tab strip. Each tab renders its page through the Outlet.
 */
const TABS = [
  { to: "/knowledge", label: "Search", icon: MagnifyingGlassIcon, end: true },
  { to: "/knowledge/base", label: "Browse", icon: BookOpenIcon },
  { to: "/knowledge/graph", label: "Graph", icon: ShareIcon },
  { to: "/knowledge/insights", label: "Insights", icon: ChartBarIcon },
];

export default function KnowledgeLayout() {
  return (
    <div className="kh">
      <style>{KH_STYLES}</style>
      <div className="kh-bar">
        <span className="kh-bar-label">Knowledge</span>
        <nav className="kh-tabs" aria-label="Knowledge sections">
          {TABS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `kh-tab ${isActive ? "is-active" : ""}`}
            >
              <Icon aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
      <Outlet />
    </div>
  );
}

const KH_STYLES = `
.kh { min-height: calc(100vh - var(--atlas-topnav-h, 60px)); }
.kh-bar {
  display: flex; align-items: center; gap: 16px;
  padding: 12px clamp(16px, 2.4vw, 28px) 0;
  border-bottom: 1px solid var(--app-border);
}
.kh-bar-label {
  font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--app-text-disabled); padding-bottom: 12px;
}
.kh-tabs { display: flex; align-items: stretch; gap: 2px; }
.kh-tab {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 13px 12px; border-bottom: 2px solid transparent;
  color: var(--app-muted); font-size: 13.5px; font-weight: 540; text-decoration: none;
  transition: color 120ms ease, border-color 120ms ease;
}
.kh-tab:hover { color: var(--app-text); text-decoration: none; }
.kh-tab svg { width: 15px; height: 15px; }
.kh-tab.is-active { color: var(--app-accent); border-bottom-color: var(--app-accent); }
@media (max-width: 600px) {
  .kh-bar-label { display: none; }
  .kh-tabs { overflow-x: auto; }
}
`;
