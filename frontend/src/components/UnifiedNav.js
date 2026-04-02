import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ChartBarIcon,
  ChatBubbleLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ClipboardDocumentListIcon,
  CubeIcon,
  DocumentCheckIcon,
  DocumentTextIcon,
  FlagIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  RocketLaunchIcon,
  Squares2X2Icon,
  CalendarIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";
import { getUnifiedNavPalette } from "../utils/projectUi";
import { useAuth } from "../hooks/useAuth";

function getAppLaunchTarget(app) {
  const launchPath = (app?.launch_path || "").trim();
  if (launchPath) {
    if (launchPath.startsWith("http://") || launchPath.startsWith("https://")) {
      return { type: "external", href: launchPath };
    }
    return { type: "internal", href: launchPath };
  }
  if (app?.docs_url) {
    return { type: "external", href: app.docs_url };
  }
  return { type: "internal", href: "/enterprise" };
}

function formatWorkspaceName(orgSlug) {
  if (!orgSlug) return "Team navigation";
  return orgSlug
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function UnifiedNav({
  darkMode,
  sidebarWidth = 272,
  collapsed = false,
  subnavWidth = 236,
  onToggleCollapse = () => {},
  onResizeWidth = () => {},
  onSubnavChange = () => {},
  minWidth = 220,
  maxWidth = 420,
}) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const subnavRef = useRef(null);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [installedApps, setInstalledApps] = useState([]);
  const [experienceMode, setExperienceMode] = useState(localStorage.getItem("ui_experience_mode") || "standard");
  const isResizingRef = useRef(false);

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const onMouseMove = (event) => {
      if (!isResizingRef.current || collapsed) return;
      onResizeWidth(event.clientX);
    };

    const onMouseUp = () => {
      isResizingRef.current = false;
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [collapsed, onResizeWidth]);

  useEffect(() => {
    setOpenDropdown(null);
  }, [location.pathname]);

  useEffect(() => {
    if (!collapsed) return;
    setSearchOpen(false);
    setSelectedIndex(-1);
    setOpenDropdown(null);
  }, [collapsed]);

  useEffect(() => {
    onSubnavChange(Boolean(openDropdown) && !collapsed);
  }, [openDropdown, collapsed, onSubnavChange]);

  useEffect(() => {
    const onClickOutside = (event) => {
      const clickedNav = dropdownRef.current?.contains(event.target);
      const clickedSubnav = subnavRef.current?.contains(event.target);
      if (!clickedNav && !clickedSubnav) {
        setOpenDropdown(null);
      }
      if (!searchRef.current?.contains(event.target)) {
        setSearchOpen(false);
        setSelectedIndex(-1);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (collapsed) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
        searchInputRef.current?.focus();
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setSelectedIndex(-1);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [collapsed]);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await api.get("/api/recall/search/suggestions/", {
          params: { q: query, limit: 5 },
        });
        setSuggestions((response.data?.suggestions || []).slice(0, 5));
      } catch (error) {
        setSuggestions([]);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const syncExperienceMode = () => {
      setExperienceMode(localStorage.getItem("ui_experience_mode") || "standard");
    };
    window.addEventListener("storage", syncExperienceMode);
    window.addEventListener("focus", syncExperienceMode);
    window.addEventListener("experience-mode-changed", syncExperienceMode);
    return () => {
      window.removeEventListener("storage", syncExperienceMode);
      window.removeEventListener("focus", syncExperienceMode);
      window.removeEventListener("experience-mode-changed", syncExperienceMode);
    };
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const bm25Response = await api.post("/api/recall/search/search/", {
          query,
          limit: 8,
        });
        const normalized = (bm25Response.data?.results || []).map((item) => ({
          id: item.id,
          type: item.type,
          title: item.title || item.name || "Untitled",
          subtitle: item.score != null ? `Score ${Number(item.score).toFixed(2)}` : "",
          url: item.url,
        }));
        setResults(normalized);
      } catch (searchError) {
        try {
          const fallback = await api.get("/api/organizations/search/", { params: { q: query } });
          const normalized = (fallback.data || []).slice(0, 8).map((item) => ({
            id: item.id,
            type: item.type,
            title: item.title || item.name || "Untitled",
            subtitle: item.key ? `${item.key}${item.status ? ` | ${item.status}` : ""}` : item.status || "",
            url: item.url,
          }));
          setResults(normalized);
        } catch (fallbackError) {
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, 260);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let active = true;

    const loadInstalledApps = async () => {
      try {
        const response = await api.get("/api/organizations/enterprise/marketplace/apps/");
        if (!active) return;
        const apps = Array.isArray(response.data) ? response.data : [];
        setInstalledApps(apps.filter((app) => app.installed));
      } catch {
        if (!active) return;
        setInstalledApps([]);
      }
    };

    loadInstalledApps();
    const interval = setInterval(loadInstalledApps, 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const palette = useMemo(() => getUnifiedNavPalette(darkMode), [darkMode]);
  const workspaceName = formatWorkspaceName(user?.organization_slug);

  const navItemsBase = useMemo(
    () => [
      {
        name: "Home",
        href: "/dashboard",
        icon: HomeIcon,
        summary: "Dashboards, priorities, and the workspace pulse",
      },
      {
        name: "Knowledge",
        icon: Squares2X2Icon,
        summary: "Search, graph, and analytics for team memory",
        items: [
          {
            name: "Search",
            href: "/knowledge",
            icon: MagnifyingGlassIcon,
            description: "Look up decisions, documents, and captured context",
          },
          {
            name: "Graph",
            href: "/knowledge/graph",
            icon: CubeIcon,
            description: "Trace relationships across people, work, and memory",
          },
          {
            name: "Analytics",
            href: "/knowledge/analytics",
            icon: ChartBarIcon,
            description: "Measure coverage, freshness, and knowledge flow",
          },
        ],
      },
      {
        name: "Collaborate",
        icon: ChatBubbleLeftIcon,
        summary: "Conversations, decisions, and meetings in motion",
        items: [
          {
            name: "Conversations",
            href: "/conversations",
            icon: ChatBubbleLeftIcon,
            description: "Review discussion threads and linked follow-through",
          },
          {
            name: "Decisions",
            href: "/decisions",
            icon: DocumentCheckIcon,
            description: "Track committed choices, rationale, and owners",
          },
          {
            name: "Meetings",
            href: "/business/meetings",
            icon: CalendarIcon,
            description: "Capture meetings and keep follow-up visible",
          },
        ],
      },
      {
        name: "Execute",
        icon: RocketLaunchIcon,
        summary: "Projects, goals, tasks, and sprint delivery",
        items: [
          {
            name: "Projects",
            href: "/projects",
            icon: CubeIcon,
            description: "Monitor project health, scope, and execution lanes",
          },
          {
            name: "Goals",
            href: "/business/goals",
            icon: FlagIcon,
            description: "Track outcomes, owners, and performance targets",
          },
          {
            name: "Tasks",
            href: "/business/tasks",
            icon: ClipboardDocumentListIcon,
            description: "Move day-to-day execution and ownership forward",
          },
          {
            name: "Sprints",
            href: "/sprint-history",
            icon: RocketLaunchIcon,
            description: "Inspect sprint progress, rhythm, and delivery health",
          },
        ],
      },
      {
        name: "Resources",
        icon: DocumentTextIcon,
        summary: "Docs, templates, and operational assets",
        items: [
          {
            name: "Docs",
            href: "/docs",
            icon: DocumentTextIcon,
            description: "Reference product docs, guides, and system notes",
          },
          {
            name: "Documents",
            href: "/business/documents",
            icon: DocumentTextIcon,
            description: "Open working documents, briefs, and deliverables",
          },
          {
            name: "Templates",
            href: "/business/templates",
            icon: DocumentTextIcon,
            description: "Reuse structured working documents and starter assets",
          },
          ...(user?.is_staff || user?.is_superuser
            ? [
                {
                  name: "Feedback Inbox",
                  href: "/feedback/inbox",
                  icon: ChatBubbleLeftIcon,
                  description: "Review incoming customer product feedback",
                },
                {
                  name: "Partner Inbox",
                  href: "/partners/inbox",
                  icon: ClipboardDocumentListIcon,
                  description: "Track partner-facing operational conversations",
                },
              ]
            : []),
          ...(user?.role === "admin"
            ? [
                {
                  name: "Import/Export",
                  href: "/import-export",
                  icon: DocumentTextIcon,
                  description: "Move structured data into and out of the workspace",
                },
              ]
            : []),
        ],
      },
    ],
    [user?.is_staff, user?.is_superuser, user?.role]
  );

  const navItems = useMemo(() => {
    if (experienceMode !== "simple") {
      return navItemsBase;
    }
    return navItemsBase
      .map((group) => {
        if (!group.items) return group;
        if (group.name === "Knowledge") {
          return { ...group, items: group.items.filter((item) => ["/knowledge"].includes(item.href)) };
        }
        if (group.name === "Execute") {
          return {
            ...group,
            items: group.items.filter((item) => ["/projects", "/business/goals", "/business/tasks"].includes(item.href)),
          };
        }
        if (group.name === "Resources") {
          return { ...group, items: group.items.filter((item) => ["/docs"].includes(item.href)) };
        }
        return group;
      })
      .filter((group) => !group.items || group.items.length > 0);
  }, [experienceMode, navItemsBase]);

  const isTopLevelActive = (item) => {
    if (item.href) {
      return location.pathname === item.href || location.pathname.startsWith(`${item.href}/`);
    }
    return item.items?.some(
      (sub) =>
        location.pathname === sub.href ||
        (sub.href !== "/" && location.pathname.startsWith(`${sub.href}/`))
    );
  };

  const mapTypeToRoute = (item) => {
    if (!item) return "/";
    if (item.url) return item.url;
    switch (item.type) {
      case "conversation":
        return `/conversations/${item.id}`;
      case "decision":
        return `/decisions/${item.id}`;
      case "sprint":
        return `/sprint/${item.id}`;
      case "issue":
        return `/issues/${item.id}`;
      case "project":
        return `/projects/${item.id}`;
      case "goal":
        return `/business/goals/${item.id}`;
      case "document":
        return `/business/documents/${item.id}`;
      case "meeting":
        return `/business/meetings/${item.id}`;
      default:
        return "/";
    }
  };

  const optionItems = [
    ...suggestions.map((s, index) => ({
      id: `suggestion-${index}`,
      mode: "suggestion",
      title: s.type === "tag" ? `#${s.value}` : s.text || s.value || "",
      subtitle: s.type === "tag" ? "Suggestion" : "Search suggestion",
      suggestionValue: s.type === "tag" ? `#${s.value}` : s.text || s.value || "",
    })),
    ...results.map((r, index) => ({
      id: `result-${index}`,
      mode: "result",
      ...r,
    })),
  ];

  const onSearchKeyDown = (event) => {
    if (!searchOpen) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!optionItems.length) return;
      setSelectedIndex((prev) => (prev + 1) % optionItems.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!optionItems.length) return;
      setSelectedIndex((prev) => (prev - 1 + optionItems.length) % optionItems.length);
    } else if (event.key === "Enter") {
      if (selectedIndex < 0 || selectedIndex >= optionItems.length) return;
      event.preventDefault();
      const selectedItem = optionItems[selectedIndex];
      if (selectedItem.mode === "suggestion") {
        setQuery(selectedItem.suggestionValue);
        setSelectedIndex(-1);
      } else {
        navigate(mapTypeToRoute(selectedItem));
        setSearchOpen(false);
        setQuery("");
        setSelectedIndex(-1);
      }
    }
  };

  const activeSubnav = useMemo(() => {
    if (!openDropdown) return null;
    if (openDropdown === "Apps") {
      return {
        eyebrow: "Extensions",
        title: "Apps",
        summary: installedApps.length
          ? "Launch installed tools and workflow extensions from this rail."
          : "No apps are installed yet. Open Enterprise to add workspace extensions.",
        items: installedApps.map((app) => {
          const target = getAppLaunchTarget(app);
          return {
            id: `app-${app.id}`,
            name: app.name,
            href: target.href,
            external: target.type === "external",
            description: app.tagline || app.short_description || app.description || "Open installed app",
          };
        }),
        footerLink: { name: "Manage Apps", href: "/enterprise", external: false },
      };
    }
    const group = navItems.find((item) => item.name === openDropdown && Array.isArray(item.items));
    if (!group) return null;
    return {
      eyebrow: "Workstream",
      title: group.name,
      summary: group.summary,
      items: group.items.map((subItem) => ({
        id: subItem.href,
        name: subItem.name,
        href: subItem.href,
        icon: subItem.icon,
        external: false,
        description: subItem.description,
      })),
    };
  }, [openDropdown, installedApps, navItems]);

  const homeItem = navItems.find((item) => item.name === "Home") || null;
  const workflowItems = navItems.filter((item) => item.name !== "Home");
  const appsActive =
    openDropdown === "Apps" ||
    location.pathname === "/enterprise" ||
    location.pathname.startsWith("/enterprise/");
  const appsItem = {
    name: "Apps",
    icon: CubeIcon,
    summary: installedApps.length
      ? `${installedApps.length} installed tool${installedApps.length === 1 ? "" : "s"} and extensions`
      : "Install workspace tools and workflow extensions",
    items: installedApps,
    special: "apps",
  };
  const activePrimaryItem = appsActive
    ? appsItem
    : navItems.find((item) => isTopLevelActive(item)) || homeItem || navItems[0] || null;
  const workspaceModeLabel = experienceMode === "simple" ? "Simple mode" : "Full workspace";

  const renderTopLevelItem = (item) => {
    const Icon = item.icon;
    const hasChildren = Array.isArray(item.items);
    const isAppsItem = item.special === "apps";
    const active = isAppsItem ? appsActive : isTopLevelActive(item);
    const expanded = hasChildren && openDropdown === item.name;
    const sharedStyle = {
      ...topButton,
      color: active ? palette.text : palette.muted,
      background: active ? `linear-gradient(135deg, ${palette.active}, ${palette.panelAlt})` : "transparent",
      border: `1px solid ${active ? palette.activeBorder : "transparent"}`,
      justifyContent: collapsed ? "center" : "flex-start",
      padding: collapsed ? "10px" : topButton.padding,
      boxShadow: active ? `0 18px 32px ${palette.accentA}12` : "none",
    };
    const labelContent = (
      <>
        <span
          style={{
            ...iconPill,
            background: active ? `${palette.accentA}22` : palette.panelAlt,
            color: active ? palette.text : palette.muted,
          }}
        >
          <Icon style={icon16} />
        </span>
        {!collapsed ? (
          <>
            <span style={topButtonContent}>
              <span style={{ ...topButtonLabel, color: palette.text }}>{item.name}</span>
              {item.summary ? <span style={{ ...topButtonMeta, color: palette.muted }}>{item.summary}</span> : null}
            </span>
            {(hasChildren || isAppsItem) && (
              <span style={topButtonTail}>
                <span
                  style={{
                    ...topButtonCount,
                    border: `1px solid ${active ? palette.activeBorder : palette.border}`,
                    background: active ? `${palette.accentA}18` : palette.searchBg,
                    color: active ? palette.text : palette.muted,
                  }}
                >
                  {item.items.length}
                </span>
                <ChevronDownIcon
                  style={{
                    ...icon14,
                    transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.15s ease",
                  }}
                />
              </span>
            )}
          </>
        ) : null}
      </>
    );

    if (hasChildren || isAppsItem) {
      return (
        <button
          key={item.name}
          className="ui-btn-polish ui-focus-ring"
          onClick={() => {
            if (collapsed) {
              if (isAppsItem) {
                navigate("/enterprise");
                return;
              }
              navigate(item.items[0]?.href || "/dashboard");
              return;
            }
            setOpenDropdown(expanded ? null : item.name);
          }}
          style={sharedStyle}
          title={item.name}
        >
          {labelContent}
        </button>
      );
    }

    return (
      <Link
        key={item.name}
        to={item.href}
        className="ui-btn-polish ui-focus-ring"
        style={sharedStyle}
        title={item.name}
      >
        {labelContent}
      </Link>
    );
  };

  if (isMobile) {
    return null;
  }

  return (
    <>
    <aside
      data-unified-nav-search="true"
      style={{
        ...sidebar,
        width: sidebarWidth,
        background: palette.navBg,
        borderRight: `1px solid ${palette.border}`,
        boxShadow: palette.shadow,
        padding: collapsed ? "10px 6px" : sidebar.padding,
        gridTemplateRows: collapsed ? "auto minmax(0,1fr) auto" : sidebar.gridTemplateRows,
        transition: "width 0.2s ease, padding 0.2s ease",
      }}
    >
      <div style={{ ...sidebarTextureA, background: `radial-gradient(circle, ${palette.accentA}55, transparent 68%)` }} />
      <div style={{ ...sidebarTextureB, background: `radial-gradient(circle, ${palette.accentB}4a, transparent 72%)` }} />

      <div
          style={{
            ...brandWrap,
            justifyContent: collapsed ? "center" : "space-between",
            padding: collapsed ? "6px 0" : brandWrap.padding,
            border: `1px solid ${palette.border}`,
            background: palette.searchBg,
            boxShadow: collapsed ? "none" : `0 18px 28px ${palette.accentA}10`,
          }}
        >
        {!collapsed ? (
          <Link to="/dashboard" style={brandHome}>
            <p style={{ ...brandEyebrow, color: palette.muted }}>Workspace</p>
            <p style={{ ...brandTitle, color: palette.text }}>Knoledgr</p>
            <p style={{ ...brandMeta, color: palette.muted }}>{workspaceName}</p>
          </Link>
        ) : null}
        <button
          onClick={onToggleCollapse}
          className="ui-btn-polish ui-focus-ring"
          style={{
            ...collapseButton,
            color: palette.muted,
            border: `1px solid ${palette.border}`,
            background: palette.searchBg,
          }}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRightIcon style={icon14} /> : <ChevronLeftIcon style={icon14} />}
        </button>
      </div>

      {!collapsed && activePrimaryItem && (
        <div
          style={{
            ...workspaceOverviewCard,
            background: palette.searchBg,
            border: `1px solid ${palette.border}`,
            boxShadow: `0 20px 30px ${palette.accentA}10`,
          }}
        >
          <div style={workspaceOverviewHeader}>
            <span style={{ ...workspaceOverviewEyebrow, color: palette.muted }}>Command center</span>
            <span
              style={{
                ...workspaceOverviewPill,
                color: palette.text,
                border: `1px solid ${palette.border}`,
                background: palette.panelAlt,
              }}
            >
              {workspaceModeLabel}
            </span>
          </div>
          <p style={{ ...workspaceOverviewTitle, color: palette.text }}>{activePrimaryItem.name}</p>
          <p style={{ ...workspaceOverviewMeta, color: palette.muted }}>{activePrimaryItem.summary}</p>
          <div style={workspaceOverviewStats}>
            <span
              style={{
                ...workspaceOverviewPill,
                color: palette.muted,
                border: `1px solid ${palette.border}`,
                background: "transparent",
              }}
            >
              {`${navItems.length} zones`}
            </span>
            <span
              style={{
                ...workspaceOverviewPill,
                color: palette.muted,
                border: `1px solid ${palette.border}`,
                background: "transparent",
              }}
            >
              {installedApps.length ? `${installedApps.length} apps` : "0 apps"}
            </span>
          </div>
        </div>
      )}

      {!collapsed && (
        <div style={searchWrap} ref={searchRef}>
          <div
            style={{
              ...searchShell,
              background: palette.searchBg,
              border: `1px solid ${searchOpen ? palette.searchFocusBorder : palette.border}`,
            }}
          >
            <MagnifyingGlassIcon style={{ ...icon16, color: palette.muted }} />
              <input
                className="ui-focus-ring"
                ref={searchInputRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                setSearchOpen(true);
                setSelectedIndex(-1);
              }}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={onSearchKeyDown}
                placeholder="Search workspace"
                aria-label="Search workspace"
                style={{ ...searchInput, color: palette.text }}
              />
            {query ? (
              <button className="ui-btn-polish ui-focus-ring" onClick={() => setQuery("")} style={{ ...clearButton, color: palette.muted }} aria-label="Clear search">
                <XMarkIcon style={icon14} />
              </button>
            ) : (
              <kbd style={{ ...kbd, border: `1px solid ${palette.border}`, background: palette.kbdBg }}>Ctrl+K</kbd>
            )}
          </div>

          {searchOpen && (query.trim() || suggestions.length > 0 || results.length > 0) && (
            <div style={{ ...resultsDropdown, background: palette.dropdownBg, border: `1px solid ${palette.border}`, boxShadow: palette.dropdownShadow }}>
              {loading && <div style={{ ...searchStateRow, color: palette.muted }}>Searching...</div>}
              {!loading && optionItems.length === 0 && (
                <div style={{ ...searchStateRow, color: palette.muted }}>No results found</div>
              )}
              {!loading &&
                optionItems.map((item, index) => {
                  const active = index === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      onMouseEnter={() => setSelectedIndex(index)}
                      onClick={() => {
                        if (item.mode === "suggestion") {
                          setQuery(item.suggestionValue);
                          setSelectedIndex(-1);
                          return;
                        }
                        navigate(mapTypeToRoute(item));
                        setSearchOpen(false);
                        setQuery("");
                        setSelectedIndex(-1);
                      }}
                      style={{
                        ...resultRow,
                        color: active ? palette.text : palette.muted,
                        background: active ? palette.active : "transparent",
                      }}
                    >
                      <span style={{ ...resultTypePill, border: `1px solid ${palette.border}` }}>
                        {item.mode === "suggestion" ? "hint" : item.type || "item"}
                      </span>
                      <span style={resultTextWrap}>
                        <span style={resultTitle}>{item.title}</span>
                        {item.subtitle ? <span style={resultSubtitle}>{item.subtitle}</span> : null}
                      </span>
                    </button>
                  );
                })}
            </div>
          )}
        </div>
      )}

      <div style={{ ...navList, padding: collapsed ? 0 : navList.padding }} ref={dropdownRef}>
        {!collapsed ? (
          <div style={sectionLabelWrap}>
            <span style={{ ...sectionLabel, color: palette.muted }}>Overview</span>
          </div>
        ) : null}
        {homeItem ? renderTopLevelItem(homeItem) : null}
        {!collapsed ? (
          <div style={sectionLabelWrap}>
            <span style={{ ...sectionLabel, color: palette.muted }}>Workstreams</span>
          </div>
        ) : null}
        {workflowItems.map((item) => renderTopLevelItem(item))}
      </div>

      <div
        style={{
          ...navFooter,
          borderTop: `1px solid ${palette.border}`,
          background: collapsed ? "transparent" : "linear-gradient(180deg, transparent, rgba(0,0,0,0.02))",
        }}
      >
        {!collapsed ? (
          <div style={sectionLabelWrap}>
            <span style={{ ...sectionLabel, color: palette.muted }}>Extensions</span>
          </div>
        ) : null}
        <div style={navFooterInner}>{renderTopLevelItem(appsItem)}</div>
      </div>

      {!collapsed && (
        <div
          onMouseDown={() => {
            isResizingRef.current = true;
          }}
          style={resizeHandle}
          title={`Drag to resize (${minWidth}-${maxWidth}px)`}
        />
      )}
    </aside>
    {!collapsed && activeSubnav && (
      <aside
        id="unified-subnav-sidebar"
        ref={subnavRef}
        style={{
          ...subnavSidebar,
          left: sidebarWidth,
          width: subnavWidth,
          color: palette.text,
          background: palette.dropdownBg,
          borderRight: `1px solid ${palette.border}`,
          boxShadow: palette.dropdownShadow,
        }}
      >
        <div style={{ ...subnavHeader, borderBottom: `1px solid ${palette.border}` }}>
          <div style={subnavTitleBlock}>
            <p style={{ ...subnavEyebrow, color: palette.muted }}>{activeSubnav.eyebrow || "Section"}</p>
            <div style={subnavTitleRow}>
              <p style={subnavTitle}>{activeSubnav.title}</p>
              <span
                style={{
                  ...subnavCount,
                  color: palette.muted,
                  border: `1px solid ${palette.border}`,
                  background: palette.panelAlt,
                }}
              >
                {activeSubnav.items.length}
              </span>
            </div>
            {activeSubnav.summary ? (
              <p style={{ ...subnavSummary, color: palette.muted }}>{activeSubnav.summary}</p>
            ) : null}
          </div>
          <button
            onClick={() => setOpenDropdown(null)}
            className="ui-btn-polish ui-focus-ring"
            style={{ ...subnavClose, color: palette.muted, border: `1px solid ${palette.border}` }}
            aria-label="Close sub-navigation"
            title="Close sub-navigation"
          >
            <XMarkIcon style={icon14} />
          </button>
        </div>
        <div style={subnavList}>
          {activeSubnav.items.length === 0 ? (
            <p style={{ ...subnavEmpty, color: palette.muted }}>No items available.</p>
          ) : (
            activeSubnav.items.map((item) => {
              const ItemIcon = item.icon;
              const subActive =
                !item.external &&
                (location.pathname === item.href || (item.href !== "/" && location.pathname.startsWith(`${item.href}/`)));
              const itemIcon = ItemIcon || CubeIcon;
              const itemBody = (
                <>
                  <span
                    style={{
                      ...subnavIconPill,
                      background: subActive ? `${palette.accentA}20` : palette.panelAlt,
                      color: subActive ? palette.text : palette.muted,
                    }}
                  >
                    {React.createElement(itemIcon, { style: icon16 })}
                  </span>
                  <span style={subnavItemBody}>
                    <span style={subnavItemLabel}>{item.name}</span>
                    {item.description ? (
                      <span style={{ ...subnavItemMeta, color: palette.muted }}>{item.description}</span>
                    ) : null}
                  </span>
                  {item.external ? (
                    <span
                      style={{
                        ...subnavExternalTag,
                        color: palette.muted,
                        border: `1px solid ${palette.border}`,
                        background: palette.panelAlt,
                      }}
                    >
                      External
                    </span>
                  ) : null}
                </>
              );
              if (item.external) {
                return (
                  <a
                    key={item.id}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setOpenDropdown(null)}
                    className="ui-btn-polish ui-focus-ring"
                    style={{
                      ...subnavItem,
                      color: palette.text,
                      background: "transparent",
                      borderLeft: "3px solid transparent",
                    }}
                  >
                    {itemBody}
                  </a>
                );
              }
              return (
                <Link
                  key={item.id}
                  to={item.href}
                  onClick={() => setOpenDropdown(null)}
                  className="ui-btn-polish ui-focus-ring"
                  style={{
                    ...subnavItem,
                    color: subActive ? palette.text : palette.muted,
                    background: subActive ? palette.active : "transparent",
                    borderLeft: `3px solid ${subActive ? palette.accentA : "transparent"}`,
                  }}
                >
                  {itemBody}
                </Link>
              );
            })
          )}
        </div>
        {activeSubnav.footerLink ? (
          <div style={{ ...subnavFooter, borderTop: `1px solid ${palette.border}` }}>
            <Link
              to={activeSubnav.footerLink.href}
              onClick={() => setOpenDropdown(null)}
              className="ui-btn-polish ui-focus-ring"
              style={{ ...subnavItem, color: palette.muted, borderLeft: "3px solid transparent" }}
            >
              <span>{activeSubnav.footerLink.name}</span>
            </Link>
          </div>
        ) : null}
      </aside>
    )}
    </>
  );
}

const sidebar = {
  position: "fixed",
  top: 0,
  left: 0,
  bottom: 0,
  display: "grid",
  gridTemplateRows: "auto auto auto minmax(0,1fr) auto",
  gap: 10,
  padding: "16px 12px",
  zIndex: 70,
  backdropFilter: "blur(18px)",
  overflow: "hidden",
};

const brandWrap = {
  padding: "12px 12px 10px",
  minHeight: 68,
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  borderRadius: 20,
};

const sidebarTextureA = {
  position: "absolute",
  width: 160,
  height: 160,
  borderRadius: "50%",
  top: -70,
  right: -55,
  pointerEvents: "none",
  zIndex: 0,
};

const sidebarTextureB = {
  position: "absolute",
  width: 200,
  height: 200,
  borderRadius: "50%",
  bottom: -110,
  left: -90,
  pointerEvents: "none",
  zIndex: 0,
};

const brandHome = {
  textDecoration: "none",
  display: "grid",
  gap: 3,
  minWidth: 0,
  flex: 1,
};

const brandEyebrow = {
  margin: 0,
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

const brandTitle = {
  margin: 0,
  fontSize: 17,
  fontWeight: 800,
  letterSpacing: "-0.03em",
  lineHeight: 1.1,
};

const brandMeta = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.45,
};

const workspaceOverviewCard = {
  borderRadius: 22,
  padding: "14px 14px 13px",
  position: "relative",
  zIndex: 1,
  display: "grid",
  gap: 10,
};

const workspaceOverviewHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  flexWrap: "wrap",
};

const workspaceOverviewEyebrow = {
  fontSize: 10,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.14em",
};

const workspaceOverviewTitle = {
  margin: 0,
  fontSize: 18,
  lineHeight: 1.05,
  letterSpacing: "-0.03em",
  fontWeight: 800,
};

const workspaceOverviewMeta = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.45,
};

const workspaceOverviewStats = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

const workspaceOverviewPill = {
  borderRadius: 999,
  padding: "5px 9px",
  fontSize: 11,
  fontWeight: 700,
  lineHeight: 1,
};

const sectionLabelWrap = {
  padding: "0 14px",
};

const sectionLabel = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.14em",
};

const navList = {
  display: "grid",
  gap: 9,
  minWidth: 0,
  overflowY: "auto",
  overflowX: "hidden",
  padding: "0 4px 4px",
  position: "relative",
  zIndex: 1,
};

const topButton = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  borderRadius: 20,
  fontSize: 13,
  fontWeight: 700,
  textDecoration: "none",
  padding: "13px 14px",
  cursor: "pointer",
  width: "100%",
  textAlign: "left",
  transition: "all 0.18s ease",
  backdropFilter: "blur(8px)",
  minHeight: 62,
};

const topButtonContent = {
  minWidth: 0,
  display: "grid",
  gap: 3,
  flex: 1,
};

const topButtonLabel = {
  fontSize: 13,
  fontWeight: 800,
  lineHeight: 1.15,
};

const topButtonMeta = {
  fontSize: 11,
  lineHeight: 1.4,
  whiteSpace: "normal",
};

const topButtonTail = {
  display: "flex",
  alignItems: "center",
  alignSelf: "flex-start",
  gap: 8,
  marginLeft: "auto",
  paddingTop: 2,
  flexShrink: 0,
};

const topButtonCount = {
  minWidth: 28,
  height: 24,
  borderRadius: 999,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0 8px",
  fontSize: 11,
  fontWeight: 800,
  lineHeight: 1,
};

const navFooter = {
  position: "relative",
  zIndex: 1,
  paddingTop: 10,
};

const navFooterInner = {
  padding: "0 4px 4px",
};

const subnavSidebar = {
  position: "fixed",
  top: 0,
  bottom: 0,
  zIndex: 69,
  display: "grid",
  gridTemplateRows: "auto minmax(0,1fr) auto",
  backdropFilter: "blur(18px)",
};

const subnavHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  padding: "20px 16px 16px",
  alignItems: "flex-start",
};

const subnavTitleBlock = {
  display: "grid",
  gap: 6,
  minWidth: 0,
  flex: 1,
};

const subnavEyebrow = {
  margin: 0,
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};

const subnavTitleRow = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
  flexWrap: "wrap",
};

const subnavTitle = {
  margin: 0,
  fontSize: 16,
  fontWeight: 800,
  letterSpacing: "-0.02em",
  lineHeight: 1.1,
};

const subnavCount = {
  borderRadius: 999,
  padding: "5px 9px",
  fontSize: 11,
  fontWeight: 700,
  lineHeight: 1,
};

const subnavSummary = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.45,
};

const subnavClose = {
  width: 28,
  height: 28,
  borderRadius: 12,
  background: "transparent",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
};

const subnavList = {
  display: "grid",
  alignContent: "start",
  gap: 6,
  padding: "12px",
  overflowY: "auto",
};

const subnavItem = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "12px 13px",
  textDecoration: "none",
  fontSize: 13,
  fontWeight: 700,
  borderRadius: 16,
};

const subnavIconPill = {
  width: 30,
  height: 30,
  borderRadius: 12,
  display: "grid",
  placeItems: "center",
  flexShrink: 0,
};

const subnavItemBody = {
  minWidth: 0,
  display: "grid",
  gap: 3,
  flex: 1,
};

const subnavItemLabel = {
  fontSize: 13,
  fontWeight: 800,
  lineHeight: 1.2,
};

const subnavItemMeta = {
  fontSize: 11,
  lineHeight: 1.35,
};

const subnavExternalTag = {
  borderRadius: 999,
  padding: "4px 8px",
  fontSize: 10,
  fontWeight: 700,
  lineHeight: 1,
  flexShrink: 0,
};

const subnavFooter = {
  padding: "8px",
};

const subnavEmpty = {
  margin: 0,
  padding: "10px 8px",
  fontSize: 12,
};

const iconPill = {
  width: 32,
  height: 32,
  borderRadius: 13,
  display: "grid",
  placeItems: "center",
  flexShrink: 0,
};

const searchWrap = {
  position: "relative",
  padding: "0 4px 2px",
};

const searchShell = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  borderRadius: 18,
  padding: "10px 12px",
  height: 48,
  minWidth: 0,
  width: "100%",
};

const searchInput = {
  border: "none",
  outline: "none",
  background: "transparent",
  fontSize: 13,
  width: "100%",
  minWidth: 0,
  fontFamily: "inherit",
  fontWeight: 600,
};

const collapseButton = {
  width: 28,
  height: 28,
  borderRadius: 12,
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
  flexShrink: 0,
};

const resizeHandle = {
  position: "absolute",
  right: -3,
  top: 0,
  bottom: 0,
  width: 6,
  cursor: "col-resize",
  zIndex: 75,
};

const clearButton = {
  border: "none",
  background: "transparent",
  display: "grid",
  placeItems: "center",
  padding: 2,
  cursor: "pointer",
};

const kbd = {
  borderRadius: 6,
  padding: "1px 5px",
  fontSize: 10,
  fontFamily: "monospace",
  background: "transparent",
  letterSpacing: "-0.01em",
  whiteSpace: "nowrap",
};

const resultsDropdown = {
  position: "absolute",
  top: "calc(100% + 6px)",
  left: 0,
  right: 0,
  maxHeight: 360,
  overflowY: "auto",
  borderRadius: 20,
  boxShadow: "none",
  zIndex: 90,
};

const searchStateRow = {
  padding: "10px 12px",
  fontSize: 12,
};

const resultRow = {
  width: "100%",
  border: "none",
  background: "transparent",
  display: "flex",
  alignItems: "flex-start",
  gap: 8,
  textAlign: "left",
  padding: "12px 13px",
  cursor: "pointer",
  fontFamily: "inherit",
  borderRadius: 16,
};

const resultTypePill = {
  borderRadius: 999,
  padding: "2px 7px",
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  lineHeight: 1.5,
  flexShrink: 0,
};

const resultTextWrap = {
  minWidth: 0,
  display: "grid",
};

const resultTitle = {
  fontSize: 13,
  fontWeight: 700,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const resultSubtitle = {
  fontSize: 11,
  opacity: 0.85,
};

const icon16 = { width: 16, height: 16, flexShrink: 0 };
const icon14 = { width: 14, height: 14, flexShrink: 0 };
