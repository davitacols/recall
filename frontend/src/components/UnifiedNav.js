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
  onToggleCollapse = () => {},
  onResizeWidth = () => {},
  minWidth = 220,
  maxWidth = 420,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
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
    const onClickOutside = (event) => {
      if (!dropdownRef.current?.contains(event.target)) {
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

  if (isMobile) {
    return null;
  }

  return (
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
        }}
      >
        <button
          onClick={onToggleCollapse}
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
          <BrandLogo tone={darkMode ? "dark" : "light"} size="sm" showText={!collapsed} />
        </Link>
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
              ref={searchInputRef}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSearchOpen(true);
                setSelectedIndex(-1);
              }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={onSearchKeyDown}
              placeholder="Search"
              style={{ ...searchInput, color: palette.text }}
            />
            {query ? (
              <button onClick={() => setQuery("")} style={{ ...clearButton, color: palette.muted }} aria-label="Clear search">
                <XMarkIcon style={icon14} />
              </button>
            ) : (
              <kbd style={{ ...kbd, border: `1px solid ${palette.border}`, background: palette.kbdBg }}>Ctrl+K</kbd>
            )}
          </div>

          {searchOpen && (query.trim() || suggestions.length > 0 || results.length > 0) && (
            <div style={{ ...resultsDropdown, background: palette.navBg, border: `1px solid ${palette.border}`, boxShadow: palette.dropdownShadow }}>
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
          <span style={{ ...sectionLabel, color: palette.muted }}>Workstreams</span>
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

                {expanded && !collapsed && (
                  <div
                    style={{
                      ...inlineDropdown,
                      background: palette.panelAlt,
                      border: `1px solid ${palette.border}`,
                    }}
                  >
                    {item.items.map((subItem) => {
                      const SubIcon = subItem.icon;
                      const subActive =
                        location.pathname === subItem.href ||
                        (subItem.href !== "/" && location.pathname.startsWith(`${subItem.href}/`));
                      return (
                        <Link
                          key={subItem.href}
                          to={subItem.href}
                          onClick={() => setOpenDropdown(null)}
                          style={{
                            ...dropdownItem,
                            color: subActive ? palette.text : palette.muted,
                            background: subActive ? palette.active : "transparent",
                            borderLeft: `3px solid ${subActive ? palette.accentA : "transparent"}`,
                          }}
                        >
                          <SubIcon style={icon16} />
                          <span>{subItem.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.name}
              to={item.href}
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
            <div
              style={{
                ...inlineDropdown,
                background: palette.panelAlt,
                border: `1px solid ${palette.border}`,
              }}
            >
              {installedApps.length === 0 ? (
                <Link
                  to="/enterprise"
                  onClick={() => setOpenDropdown(null)}
                  style={{
                    ...dropdownItem,
                    color: palette.muted,
                  }}
                >
                  No apps installed
                </Link>
              ) : (
                installedApps.map((app) => {
                  const target = getAppLaunchTarget(app);
                  if (target.type === "external") {
                    return (
                      <a
                        key={app.id}
                        href={target.href}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => setOpenDropdown(null)}
                        style={{
                          ...dropdownItem,
                          color: palette.text,
                          borderLeft: "3px solid transparent",
                        }}
                      >
                        <span>{app.name}</span>
                      </a>
                    );
                  }
                  return (
                    <Link
                      key={app.id}
                      to={target.href}
                      onClick={() => setOpenDropdown(null)}
                      style={{
                        ...dropdownItem,
                        color: palette.text,
                        borderLeft: "3px solid transparent",
                      }}
                    >
                      <span>{app.name}</span>
                    </Link>
                  );
                })
              )}
              <Link
                to="/enterprise"
                onClick={() => setOpenDropdown(null)}
                style={{
                  ...dropdownItem,
                  color: palette.muted,
                  borderTop: `1px solid ${palette.border}`,
                }}
              >
                Manage Apps
              </Link>
            </div>
          )}
        </div>
      </div>

      {!collapsed && (
        <div style={{ ...insightCard, background: palette.panelAlt, border: `1px solid ${palette.border}` }}>
          <p style={{ ...insightLabel, color: palette.muted }}>Memory Health</p>
          <p style={{ ...insightValue, color: palette.text }}>91%</p>
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
  padding: "12px 10px",
  zIndex: 70,
  backdropFilter: "blur(12px)",
  overflow: "hidden",
};

const brandWrap = {
  padding: "0 8px",
  minHeight: 36,
  display: "flex",
  alignItems: "center",
  gap: 8,
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

const sectionLabelWrap = {
  padding: "0 10px",
};

const sectionLabel = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const navList = {
  display: "grid",
  gap: 7,
  minWidth: 0,
  overflowY: "auto",
  overflowX: "hidden",
  padding: "0 2px",
  position: "relative",
  zIndex: 1,
};

const topButton = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  borderRadius: 12,
  fontSize: 13,
  fontWeight: 600,
  textDecoration: "none",
  padding: "9px 11px",
  cursor: "pointer",
  whiteSpace: "nowrap",
  width: "100%",
  textAlign: "left",
  transition: "all 0.2s ease",
  backdropFilter: "blur(3px)",
};

const inlineDropdown = {
  marginTop: 4,
  marginLeft: 8,
  borderRadius: 10,
  overflow: "hidden",
};

const dropdownItem = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "9px 10px",
  textDecoration: "none",
  fontSize: 13,
  fontWeight: 600,
};

const iconPill = {
  width: 24,
  height: 24,
  borderRadius: 8,
  display: "grid",
  placeItems: "center",
  flexShrink: 0,
};

const appsGlyph = {
  borderRadius: 8,
  padding: "4px 8px",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.03em",
};

const searchWrap = {
  position: "relative",
  padding: "0 2px",
};

const searchShell = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  borderRadius: 10,
  padding: "6px 8px",
  height: 36,
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
};

const insightCard = {
  borderRadius: 12,
  padding: "10px 12px",
  marginTop: 2,
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
  fontSize: 22,
  fontWeight: 800,
  letterSpacing: "-0.02em",
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

const collapseButton = {
  width: 24,
  height: 24,
  borderRadius: 6,
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
  borderRadius: 12,
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
  padding: "9px 10px",
  cursor: "pointer",
  fontFamily: "inherit",
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
