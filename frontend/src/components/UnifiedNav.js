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
import BrandLogo from "./BrandLogo";
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

  const navItemsBase = [
    { name: "Home", href: "/", icon: HomeIcon },
    {
      name: "Knowledge",
      icon: Squares2X2Icon,
      items: [
        { name: "Search", href: "/knowledge", icon: MagnifyingGlassIcon },
        { name: "Graph", href: "/knowledge/graph", icon: CubeIcon },
        { name: "Analytics", href: "/knowledge/analytics", icon: ChartBarIcon },
      ],
    },
    {
      name: "Collaborate",
      icon: ChatBubbleLeftIcon,
      items: [
        { name: "Conversations", href: "/conversations", icon: ChatBubbleLeftIcon },
        { name: "Decisions", href: "/decisions", icon: DocumentCheckIcon },
        { name: "Meetings", href: "/business/meetings", icon: CalendarIcon },
      ],
    },
    {
      name: "Execute",
      icon: RocketLaunchIcon,
      items: [
        { name: "Projects", href: "/projects", icon: CubeIcon },
        { name: "Goals", href: "/business/goals", icon: FlagIcon },
        { name: "Tasks", href: "/business/tasks", icon: ClipboardDocumentListIcon },
        { name: "Journey Maps", href: "/business/journeys", icon: DocumentTextIcon },
        { name: "Calendar Planner", href: "/business/calendar", icon: CalendarIcon },
        { name: "Team Health", href: "/business/team-health", icon: ChartBarIcon },
        { name: "Service Desk", href: "/service-desk", icon: ClipboardDocumentListIcon },
        { name: "Sprints", href: "/sprint-history", icon: RocketLaunchIcon },
      ],
    },
    {
      name: "Resources",
      icon: DocumentTextIcon,
      items: [
        { name: "Docs", href: "/docs", icon: DocumentTextIcon },
        { name: "Documents", href: "/business/documents", icon: DocumentTextIcon },
        { name: "Templates", href: "/business/templates", icon: DocumentTextIcon },
        ...(user?.role === "admin"
          ? [{ name: "Import/Export", href: "/import-export", icon: DocumentTextIcon }]
          : []),
      ],
    },
  ];

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
            items: group.items.filter((item) =>
              ["/business/goals", "/business/tasks", "/business/calendar"].includes(item.href)
            ),
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
      return item.href === "/"
        ? location.pathname === "/"
        : location.pathname === item.href || location.pathname.startsWith(`${item.href}/`);
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
        title: "Apps",
        items: installedApps.map((app) => {
          const target = getAppLaunchTarget(app);
          return {
            id: `app-${app.id}`,
            name: app.name,
            href: target.href,
            external: target.type === "external",
          };
        }),
        footerLink: { name: "Manage Apps", href: "/enterprise", external: false },
      };
    }
    const group = navItems.find((item) => item.name === openDropdown && Array.isArray(item.items));
    if (!group) return null;
    return {
      title: group.name,
      items: group.items.map((subItem) => ({
        id: subItem.href,
        name: subItem.name,
        href: subItem.href,
        icon: subItem.icon,
        external: false,
      })),
    };
  }, [openDropdown, installedApps, navItems]);

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
        gridTemplateRows: collapsed ? "auto minmax(0,1fr)" : sidebar.gridTemplateRows,
        transition: "width 0.2s ease, padding 0.2s ease",
      }}
    >
      <div style={{ ...sidebarTextureA, background: `radial-gradient(circle, ${palette.accentA}55, transparent 68%)` }} />
      <div style={{ ...sidebarTextureB, background: `radial-gradient(circle, ${palette.accentB}4a, transparent 72%)` }} />

      <div
        style={{
          ...brandWrap,
          justifyContent: collapsed ? "center" : "flex-start",
          padding: collapsed ? "0" : brandWrap.padding,
          border: `1px solid ${palette.border}`,
          background: darkMode
            ? "linear-gradient(145deg, rgba(12, 24, 38, 0.84), rgba(18, 39, 58, 0.68))"
            : "linear-gradient(145deg, rgba(255, 255, 255, 0.94), rgba(237, 246, 255, 0.84))",
          boxShadow: darkMode ? "0 12px 30px rgba(2, 10, 18, 0.28)" : "0 12px 24px rgba(21, 52, 84, 0.08)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            ...brandWrapBackdrop,
            backgroundImage: "url('/brand/knoledgr-grid.svg')",
            opacity: darkMode ? 0.24 : 0.1,
          }}
        />
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
        <Link to="/" style={{ ...brand, color: palette.text, display: "inline-flex", alignItems: "center", gap: 8 }}>
          <BrandLogo tone={darkMode ? "dark" : "warm"} size="sm" showText={!collapsed} />
        </Link>
        {!collapsed ? (
          <span
            style={{
              ...brandTag,
              border: `1px solid ${palette.border}`,
              background: palette.panelAlt,
              color: palette.text,
            }}
          >
            Context OS
          </span>
        ) : null}
      </div>

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
                placeholder="Search Knoledgr"
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

      {!collapsed && (
        <div style={sectionLabelWrap}>
          <span style={{ ...sectionLabel, color: palette.muted }}>Platform</span>
        </div>
      )}

      <div style={{ ...navList, padding: collapsed ? 0 : navList.padding }} ref={dropdownRef}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isTopLevelActive(item);

          if (item.items) {
            const expanded = openDropdown === item.name;
            return (
              <div key={item.name} style={{ position: "relative" }}>
                <button
                  className="ui-btn-polish ui-focus-ring"
                  onClick={() => {
                    if (collapsed) {
                      navigate(item.items[0]?.href || "/");
                      return;
                    }
                    setOpenDropdown(expanded ? null : item.name);
                  }}
                  style={{
                    ...topButton,
                    color: active ? palette.text : palette.muted,
                    background: active ? palette.active : "transparent",
                    border: `1px solid ${active ? palette.activeBorder : "transparent"}`,
                    justifyContent: collapsed ? "center" : "flex-start",
                    padding: collapsed ? "8px" : topButton.padding,
                  }}
                  title={item.name}
                >
                  <span style={{ ...iconPill, background: active ? `${palette.accentA}30` : palette.panelAlt }}>
                    <Icon style={icon16} />
                  </span>
                  {!collapsed && <span>{item.name}</span>}
                  {!collapsed && (
                    <ChevronDownIcon
                      style={{
                        ...icon14,
                        marginLeft: "auto",
                        transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.15s",
                      }}
                    />
                  )}
                </button>
              </div>
            );
          }

          return (
            <Link
              key={item.name}
              to={item.href}
              className="ui-btn-polish ui-focus-ring"
              style={{
                ...topButton,
                color: active ? palette.text : palette.muted,
                background: active ? palette.active : "transparent",
                border: `1px solid ${active ? palette.activeBorder : "transparent"}`,
                justifyContent: collapsed ? "center" : "flex-start",
                padding: collapsed ? "8px" : topButton.padding,
              }}
              title={item.name}
            >
              <span style={{ ...iconPill, background: active ? `${palette.accentA}30` : palette.panelAlt }}>
                <Icon style={icon16} />
              </span>
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}

        <div style={{ position: "relative" }}>
          <button
            className="ui-btn-polish ui-focus-ring"
            onClick={() => {
              if (collapsed) {
                navigate("/enterprise");
                return;
              }
              setOpenDropdown(openDropdown === "Apps" ? null : "Apps");
            }}
            style={{
              ...topButton,
              color: installedApps.length ? palette.text : palette.muted,
              background: openDropdown === "Apps" ? palette.active : "transparent",
              border: `1px solid ${openDropdown === "Apps" ? palette.activeBorder : "transparent"}`,
              justifyContent: collapsed ? "center" : "flex-start",
              padding: collapsed ? "8px" : topButton.padding,
            }}
            title="Apps"
          >
            {collapsed ? (
              <span style={{ ...iconPill, background: palette.panelAlt }}>
                <CubeIcon style={icon16} />
              </span>
            ) : (
              <span style={{ ...appsGlyph, background: palette.panelAlt }}>Apps</span>
            )}
            {!collapsed && (
              <ChevronDownIcon
                style={{
                  ...icon14,
                  marginLeft: "auto",
                  transform: openDropdown === "Apps" ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.15s",
                }}
              />
            )}
          </button>
          {openDropdown === "Apps" && !collapsed && (
            null
          )}
        </div>
      </div>

      {!collapsed && (
        <div
          style={{
            ...insightCard,
            background: darkMode
              ? "linear-gradient(160deg, rgba(12, 24, 38, 0.9), rgba(18, 39, 58, 0.74))"
              : "linear-gradient(160deg, rgba(255, 255, 255, 0.96), rgba(237, 246, 255, 0.88))",
            border: `1px solid ${palette.border}`,
            backgroundImage: "url('/brand/knoledgr-grid.svg')",
            backgroundSize: "760px 760px",
            backgroundPosition: "center",
          }}
        >
          <p style={{ ...insightLabel, color: palette.muted }}>Memory Health</p>
          <p style={{ ...insightValue, color: palette.text }}>91%</p>
          <p style={{ ...insightHint, color: palette.muted }}>
            Search, linked work, and decision coverage are trending healthy this week.
          </p>
          <div style={insightPillRow}>
            <span style={{ ...insightPill, border: `1px solid ${palette.border}`, color: palette.text }}>
              Coverage +12%
            </span>
            <span style={{ ...insightPill, border: `1px solid ${palette.border}`, color: palette.muted }}>
              Graph stable
            </span>
          </div>
          <div style={{ ...insightTrack, background: palette.track }}>
            <div style={{ ...insightFill, background: `linear-gradient(90deg, ${palette.accentA}, ${palette.accentB})` }} />
          </div>
        </div>
      )}

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
          <p style={subnavTitle}>{activeSubnav.title}</p>
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
                    <span>{item.name}</span>
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
                  {ItemIcon ? <ItemIcon style={icon16} /> : null}
                  <span>{item.name}</span>
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
  gap: 12,
  padding: "14px 12px",
  zIndex: 70,
  backdropFilter: "blur(18px)",
  overflow: "hidden",
};

const brandWrap = {
  padding: "10px 10px 12px",
  minHeight: 52,
  display: "flex",
  alignItems: "center",
  gap: 8,
  borderRadius: 18,
};

const brandWrapBackdrop = {
  position: "absolute",
  inset: 0,
  backgroundRepeat: "repeat",
  backgroundSize: "820px 820px",
  pointerEvents: "none",
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

const brand = {
  textDecoration: "none",
  fontSize: 18,
  fontWeight: 800,
  letterSpacing: "-0.02em",
  position: "relative",
  zIndex: 1,
};

const brandTag = {
  marginLeft: "auto",
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  position: "relative",
  zIndex: 1,
};

const sectionLabelWrap = {
  padding: "0 12px",
};

const sectionLabel = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
};

const navList = {
  display: "grid",
  gap: 8,
  minWidth: 0,
  overflowY: "auto",
  overflowX: "hidden",
  padding: "0 4px",
  position: "relative",
  zIndex: 1,
};

const topButton = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  borderRadius: 16,
  fontSize: 13,
  fontWeight: 700,
  textDecoration: "none",
  padding: "11px 12px",
  cursor: "pointer",
  whiteSpace: "nowrap",
  width: "100%",
  textAlign: "left",
  transition: "all 0.18s ease",
  backdropFilter: "blur(8px)",
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
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  padding: "18px 14px 12px",
};

const subnavTitle = {
  margin: 0,
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};

const subnavClose = {
  width: 24,
  height: 24,
  borderRadius: 10,
  background: "transparent",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
};

const subnavList = {
  display: "grid",
  alignContent: "start",
  gap: 4,
  padding: "10px",
  overflowY: "auto",
};

const subnavItem = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "11px 12px",
  textDecoration: "none",
  fontSize: 13,
  fontWeight: 700,
  borderRadius: 14,
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
  width: 24,
  height: 24,
  borderRadius: 10,
  display: "grid",
  placeItems: "center",
  flexShrink: 0,
};

const appsGlyph = {
  borderRadius: 10,
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.03em",
};

const searchWrap = {
  position: "relative",
  padding: "0 4px",
};

const searchShell = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  borderRadius: 16,
  padding: "8px 10px",
  height: 42,
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

const insightCard = {
  borderRadius: 18,
  padding: "14px 14px 12px",
  marginTop: 4,
  position: "relative",
  zIndex: 1,
};

const insightLabel = {
  margin: 0,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.09em",
  textTransform: "uppercase",
};

const insightValue = {
  margin: "5px 0 8px",
  fontSize: 24,
  fontWeight: 800,
  letterSpacing: "-0.02em",
};

const insightHint = {
  margin: "0 0 12px",
  fontSize: 12,
  lineHeight: 1.45,
};

const insightTrack = {
  width: "100%",
  height: 6,
  borderRadius: 999,
  background: "transparent",
  overflow: "hidden",
};

const insightFill = {
  width: "91%",
  height: "100%",
  borderRadius: 999,
};

const insightPillRow = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  flexWrap: "wrap",
  marginBottom: 12,
};

const insightPill = {
  borderRadius: 999,
  padding: "5px 8px",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.04em",
  background: "rgba(255,255,255,0.04)",
};

const collapseButton = {
  width: 24,
  height: 24,
  borderRadius: 10,
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
  borderRadius: 18,
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
  padding: "11px 12px",
  cursor: "pointer",
  fontFamily: "inherit",
  borderRadius: 12,
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
