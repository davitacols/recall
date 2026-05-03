import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CubeIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { getUnifiedNavPalette } from "../utils/projectUi";
import BrandLogo from "./BrandLogo";
import {
  buildUnifiedNavModel,
  formatWorkspaceName,
  getFirstNavTarget,
  getNavItemCount,
  isHrefActive,
  isNavItemActive,
} from "./unifiedNavConfig";

const SUBNAV_ATTACH_WIDTH = 14;

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
  const isResizingRef = useRef(false);

  const [openDropdown, setOpenDropdown] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [installedApps, setInstalledApps] = useState([]);
  const [experienceMode, setExperienceMode] = useState(
    localStorage.getItem("ui_experience_mode") || "standard"
  );

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
    setOpenDropdown(null);
    setSearchOpen(false);
    setSelectedIndex(-1);
  }, [collapsed]);

  useEffect(() => {
    onSubnavChange(Boolean(openDropdown) && !collapsed);
  }, [collapsed, onSubnavChange, openDropdown]);

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
      } catch {
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
      } catch {
        try {
          const fallback = await api.get("/api/organizations/search/", {
            params: { q: query },
          });
          const normalized = (fallback.data || []).slice(0, 8).map((item) => ({
            id: item.id,
            type: item.type,
            title: item.title || item.name || "Untitled",
            subtitle: item.key
              ? `${item.key}${item.status ? ` | ${item.status}` : ""}`
              : item.status || "",
            url: item.url,
          }));
          setResults(normalized);
        } catch {
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

  const {
    homeItem,
    askRecallItem,
    workstreamGroups,
    appsItem,
    utilityItems,
  } = useMemo(
    () =>
      buildUnifiedNavModel({
        user,
        experienceMode,
        installedApps,
      }),
    [experienceMode, installedApps, user]
  );

  useEffect(() => {
    if (!openDropdown) return;
    const availableGroups = new Set(["Apps", ...workstreamGroups.map((group) => group.name)]);
    if (!availableGroups.has(openDropdown)) {
      setOpenDropdown(null);
    }
  }, [openDropdown, workstreamGroups]);

  const workspaceName = formatWorkspaceName(user?.organization_slug);
  const workspaceModeLabel =
    experienceMode === "simple" ? "Simple workspace" : "Full workspace";
  const primaryItems = [homeItem, ...workstreamGroups];
  const appsActive = openDropdown === "Apps" || isNavItemActive(location.pathname, appsItem);
  const askRecallActive = isHrefActive(location.pathname, askRecallItem.href);
  const activeSubnav = useMemo(() => {
    if (!openDropdown) return null;

    if (openDropdown === "Apps") {
      return {
        eyebrow: "Extensions",
        title: "Apps",
        summary: appsItem.summary,
        items: appsItem.items,
        footerLink: { name: "Manage apps", href: "/enterprise" },
      };
    }

    const group = workstreamGroups.find((item) => item.name === openDropdown);
    if (!group) return null;

    return {
      eyebrow: "Workstream",
      title: group.name,
      summary: group.summary,
      items: group.items,
    };
  }, [appsItem, openDropdown, workstreamGroups]);

  const optionItems = useMemo(
    () => [
      ...suggestions.map((suggestion, index) => ({
        id: `suggestion-${index}`,
        mode: "suggestion",
        title:
          suggestion.type === "tag"
            ? `#${suggestion.value}`
            : suggestion.text || suggestion.value || "",
        subtitle:
          suggestion.type === "tag" ? "Suggestion" : "Search suggestion",
        suggestionValue:
          suggestion.type === "tag"
            ? `#${suggestion.value}`
            : suggestion.text || suggestion.value || "",
      })),
      ...results.map((result, index) => ({
        id: `result-${index}`,
        mode: "result",
        ...result,
      })),
    ],
    [results, suggestions]
  );

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

  const onSearchKeyDown = (event) => {
    if (!searchOpen) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!optionItems.length) return;
      setSelectedIndex((prev) => (prev + 1) % optionItems.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!optionItems.length) return;
      setSelectedIndex((prev) => (prev - 1 + optionItems.length) % optionItems.length);
      return;
    }

    if (event.key === "Enter") {
      if (selectedIndex < 0 || selectedIndex >= optionItems.length) return;
      event.preventDefault();

      const selectedItem = optionItems[selectedIndex];
      if (selectedItem.mode === "suggestion") {
        setQuery(selectedItem.suggestionValue);
        setSelectedIndex(-1);
        return;
      }

      navigate(mapTypeToRoute(selectedItem));
      setSearchOpen(false);
      setQuery("");
      setSelectedIndex(-1);
    }
  };

  const handleGroupToggle = (item) => {
    const shouldToggle = item.special === "apps" || getNavItemCount(item) > 0;

    if (!shouldToggle) {
      navigate(getFirstNavTarget(item));
      return;
    }

    if (collapsed) {
      navigate(getFirstNavTarget(item));
      return;
    }

    setOpenDropdown((current) => (current === item.name ? null : item.name));
  };

  const renderPrimaryItem = (item) => {
    const Icon = item.icon;
    const active = item.special === "apps"
      ? appsActive
      : isNavItemActive(location.pathname, item);
    const expandable = item.special === "apps" || getNavItemCount(item) > 0;
    const expanded = !collapsed && openDropdown === item.name;
    const count = getNavItemCount(item);
    const summary = item.summary || item.description;

    const content = (
      <>
        <span
          style={{
            ...railItemAccent,
            background: active ? palette.accent : "transparent",
            opacity: active ? 1 : 0,
          }}
        />
        <span
          style={{
            ...railIconShell,
            background: active ? palette.accentSoft : palette.surfaceMuted,
            color: active ? palette.accent : palette.muted,
            border: `1px solid ${active ? palette.activeBorder : palette.border}`,
            boxShadow: active ? palette.focusGlow : "none",
          }}
        >
          <Icon style={icon16} />
        </span>

        {!collapsed ? (
          <>
            <span style={railItemBody}>
              <span style={{ ...railItemLabel, color: palette.text }}>
                {item.name}
              </span>
              {summary && item.name === "Home" ? (
                <span style={{ ...railItemMeta, color: active ? palette.textSubtle : palette.muted }}>
                  {summary}
                </span>
              ) : null}
            </span>

            {expandable ? (
              <span style={railItemTail}>
                <span
                  style={{
                    ...railCount,
                    color: active ? palette.text : palette.muted,
                    background: active ? palette.accentSoft : palette.surfaceMuted,
                    border: `1px solid ${active ? palette.activeBorder : palette.border}`,
                  }}
                >
                  {count}
                </span>
                <ChevronDownIcon
                  style={{
                    ...icon14,
                    color: active ? palette.text : palette.muted,
                    transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.18s ease",
                  }}
                />
              </span>
            ) : null}
          </>
        ) : null}
      </>
    );

    const sharedStyle = {
      ...railItemButton,
      justifyContent: collapsed ? "center" : "flex-start",
      padding: collapsed ? "10px 0" : railItemButton.padding,
      minHeight: collapsed ? 48 : railItemButton.minHeight,
      background: active ? palette.active : "transparent",
      border: `1px solid ${active ? palette.activeBorder : "transparent"}`,
      boxShadow: active ? palette.itemShadow : "none",
      color: palette.text,
    };

    if (expandable) {
      return (
        <button
          key={item.name}
          type="button"
          className="ui-btn-polish ui-focus-ring"
          onClick={() => handleGroupToggle(item)}
          style={sharedStyle}
          title={item.name}
        >
          {content}
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
        {content}
      </Link>
    );
  };

  const renderUtilityItem = (item) => {
    const Icon = item.icon;
    const active = isHrefActive(location.pathname, item.href);

    return (
      <Link
        key={item.name}
        to={item.href}
        className="ui-btn-polish ui-focus-ring"
        style={{
          ...utilityItemButton,
          justifyContent: collapsed ? "center" : "flex-start",
          padding: collapsed ? "10px 0" : utilityItemButton.padding,
          background: active ? palette.active : "transparent",
          border: `1px solid ${active ? palette.activeBorder : "transparent"}`,
          boxShadow: active ? palette.itemShadow : "none",
          color: palette.text,
        }}
        title={item.name}
      >
        <span
          style={{
            ...utilityIconShell,
            background: active ? palette.accentSoft : palette.surfaceMuted,
            color: active ? palette.accent : palette.muted,
            border: `1px solid ${active ? palette.activeBorder : palette.border}`,
          }}
        >
          <Icon style={icon16} />
        </span>
        {!collapsed ? (
          <span style={utilityItemBody}>
            <span style={{ ...utilityItemLabel, color: palette.text }}>{item.name}</span>
            <span style={{ ...utilityItemMeta, color: palette.muted }}>
              {item.description}
            </span>
          </span>
        ) : null}
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
          padding: collapsed ? "14px 8px 12px" : "16px 12px 14px",
          gridTemplateRows: collapsed ? "auto minmax(0, 1fr) auto" : "auto auto auto minmax(0, 1fr) auto",
        }}
      >
        <div
          style={{
            ...brandPanel,
            border: `1px solid ${palette.border}`,
            background: palette.surface,
            boxShadow: palette.panelShadow,
            flexDirection: collapsed ? "column" : "row",
            justifyContent: collapsed ? "flex-start" : "space-between",
            padding: collapsed ? "12px 8px" : brandPanel.padding,
          }}
        >
          {!collapsed ? (
            <Link to="/dashboard" style={brandLink}>
              <span
                style={{
                  ...brandMarkShell,
                  background: palette.brandBadgeBg,
                  border: `1px solid ${palette.brandBadgeBorder}`,
                }}
              >
                <BrandLogo
                  tone={darkMode ? "light" : "warm"}
                  size="sm"
                  showText={false}
                />
              </span>
              <span style={brandText}>
                <span style={{ ...brandEyebrow, color: palette.muted }}>
                  Knoledgr workspace
                </span>
                <span style={{ ...brandTitle, color: palette.text }}>
                  {workspaceName}
                </span>
                <span style={brandMetaRow}>
                  <span
                    style={{
                      ...brandMetaPill,
                      color: palette.muted,
                      border: `1px solid ${palette.border}`,
                      background: palette.surfaceMuted,
                    }}
                  >
                    {workspaceModeLabel}
                  </span>
                </span>
              </span>
            </Link>
          ) : (
            <Link
              to="/dashboard"
              style={{
                ...collapsedBrandLink,
                border: `1px solid ${palette.brandBadgeBorder}`,
                background: palette.brandBadgeBg,
              }}
              title="Go to dashboard"
            >
              <BrandLogo
                tone={darkMode ? "light" : "warm"}
                size="sm"
                showText={false}
              />
            </Link>
          )}

          <button
            type="button"
            onClick={onToggleCollapse}
            className="ui-btn-polish ui-focus-ring"
            style={{
              ...collapseButton,
              color: palette.text,
              border: `1px solid ${palette.border}`,
              background: palette.surfaceMuted,
            }}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRightIcon style={icon14} /> : <ChevronLeftIcon style={icon14} />}
          </button>
        </div>

        {!collapsed ? (
          <Link
            to={askRecallItem.href}
            className="ui-btn-polish ui-focus-ring"
            style={{
              ...featureCard,
              color: palette.ctaText,
              background: palette.ctaGradient,
              border: `1px solid ${palette.ctaBorder}`,
              boxShadow: palette.featureShadow,
            }}
          >
            <span
              style={{
                ...featureIconShell,
                background: palette.ctaIconBg,
                border: `1px solid ${palette.ctaIconBorder}`,
              }}
            >
              <SparklesIcon style={icon16} />
            </span>
            <span style={featureText}>
              <span style={featureEyebrow}>Workspace AI</span>
              <span style={featureTitle}>Ask Recall</span>
              <span style={featureMeta}>{askRecallItem.summary}</span>
            </span>
          </Link>
        ) : null}

        {!collapsed ? (
          <div style={searchWrap} ref={searchRef}>
            <div
              style={{
                ...searchShell,
                background: palette.searchBg,
                border: `1px solid ${
                  searchOpen ? palette.searchFocusBorder : palette.border
                }`,
                boxShadow: searchOpen ? palette.focusGlow : "none",
              }}
            >
              <MagnifyingGlassIcon style={{ ...icon16, color: palette.muted }} />
              <input
                ref={searchInputRef}
                value={query}
                className="ui-focus-ring"
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSearchOpen(true);
                  setSelectedIndex(-1);
                }}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={onSearchKeyDown}
                placeholder="Search or jump"
                aria-label="Search workspace"
                style={{ ...searchInput, color: palette.text }}
              />
              {query ? (
                <button
                  type="button"
                  className="ui-btn-polish ui-focus-ring"
                  onClick={() => {
                    setQuery("");
                    setSelectedIndex(-1);
                  }}
                  style={{ ...clearButton, color: palette.muted }}
                  aria-label="Clear search"
                >
                  <XMarkIcon style={icon14} />
                </button>
              ) : (
                <kbd
                  style={{
                    ...searchKbd,
                    border: `1px solid ${palette.border}`,
                    background: palette.kbdBg,
                    color: palette.muted,
                  }}
                >
                  Ctrl+K
                </kbd>
              )}
            </div>

            {searchOpen && (query.trim() || suggestions.length > 0 || results.length > 0) ? (
              <div
                style={{
                  ...resultsDropdown,
                  background: palette.subnavBg,
                  border: `1px solid ${palette.border}`,
                  boxShadow: palette.dropdownShadow,
                }}
              >
                {loading ? (
                  <div style={{ ...searchStateRow, color: palette.muted }}>
                    Searching...
                  </div>
                ) : null}

                {!loading && optionItems.length === 0 ? (
                  <div style={{ ...searchStateRow, color: palette.muted }}>
                    No results found
                  </div>
                ) : null}

                {!loading
                  ? optionItems.map((item, index) => {
                      const active = index === selectedIndex;
                      return (
                        <button
                          key={item.id}
                          type="button"
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
                            color: palette.text,
                            background: active ? palette.active : "transparent",
                            border: `1px solid ${
                              active ? palette.activeBorder : "transparent"
                            }`,
                          }}
                        >
                          <span
                            style={{
                              ...resultTypePill,
                              color: active ? palette.text : palette.muted,
                              border: `1px solid ${palette.border}`,
                              background: palette.surfaceMuted,
                            }}
                          >
                            {item.mode === "suggestion" ? "Hint" : item.type || "Item"}
                          </span>
                          <span style={resultText}>
                            <span style={resultTitle}>{item.title}</span>
                            {item.subtitle ? (
                              <span style={{ ...resultSubtitle, color: palette.muted }}>
                                {item.subtitle}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      );
                    })
                  : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <div style={navScrollArea} ref={dropdownRef}>
          {!collapsed ? (
            <div
              style={{
                ...navSectionCard,
                background: palette.surface,
                border: `1px solid ${palette.border}`,
              }}
            >
              <div style={navSectionHeader}>
                <span style={{ ...navSectionEyebrow, color: palette.muted }}>
                  Overview
                </span>
              </div>
              <div style={navSectionBody}>{renderPrimaryItem(homeItem)}</div>
            </div>
          ) : null}

          <div
            style={{
              ...navSectionCard,
              background: collapsed ? "transparent" : palette.surface,
              border: collapsed ? "none" : `1px solid ${palette.border}`,
              padding: collapsed ? 0 : navSectionCard.padding,
            }}
          >
            {!collapsed ? (
              <div style={navSectionHeader}>
                <span style={{ ...navSectionEyebrow, color: palette.muted }}>
                  Workstreams
                </span>
              </div>
            ) : null}
            <div
              style={{
                ...navSectionBody,
                gap: collapsed ? 6 : navSectionBody.gap,
              }}
            >
              {collapsed ? renderPrimaryItem(homeItem) : null}
              {workstreamGroups.map((item) => renderPrimaryItem(item))}
            </div>
          </div>

          {!collapsed ? (
            <div
              style={{
                ...footerStack,
                borderTop: `1px solid ${palette.border}`,
              }}
            >
              <div
                style={{
                  ...navSectionCard,
                  background: palette.surface,
                  border: `1px solid ${palette.border}`,
                }}
              >
                <div style={navSectionHeader}>
                  <span style={{ ...navSectionEyebrow, color: palette.muted }}>
                    Tools
                  </span>
                </div>
                <div style={navSectionBody}>{renderPrimaryItem(appsItem)}</div>
              </div>

              <div
                style={{
                  ...navSectionCard,
                  background: palette.surface,
                  border: `1px solid ${palette.border}`,
                }}
              >
                <div style={navSectionHeader}>
                  <span style={{ ...navSectionEyebrow, color: palette.muted }}>
                    Workspace
                  </span>
                </div>
                <div style={utilityList}>{utilityItems.map((item) => renderUtilityItem(item))}</div>
              </div>
            </div>
          ) : (
            <div style={collapsedFooterRail}>
              {renderUtilityItem(askRecallItem)}
              {renderPrimaryItem(appsItem)}
              {utilityItems.map((item) => renderUtilityItem(item))}
            </div>
          )}
        </div>

        {!collapsed ? (
          <div
            onMouseDown={() => {
              isResizingRef.current = true;
            }}
            style={resizeHandle}
            title={`Drag to resize (${minWidth}-${maxWidth}px)`}
          />
        ) : null}
      </aside>

      {!collapsed && activeSubnav ? (
        <aside
          id="unified-subnav-sidebar"
          ref={subnavRef}
          style={{
            ...subnavShell,
            left: sidebarWidth - SUBNAV_ATTACH_WIDTH,
            width: subnavWidth + SUBNAV_ATTACH_WIDTH,
            color: palette.text,
            background: palette.subnavBg,
            border: `1px solid ${palette.border}`,
            boxShadow: palette.dropdownShadow,
          }}
        >
          <div
            style={{
              ...subnavInner,
              paddingLeft: subnavInner.paddingLeft + SUBNAV_ATTACH_WIDTH,
            }}
          >
            <div style={{ ...subnavHeader, borderBottom: `1px solid ${palette.border}` }}>
              <div style={subnavTitleBlock}>
                <p style={{ ...subnavEyebrow, color: palette.muted }}>
                  {activeSubnav.eyebrow || "Section"}
                </p>
                <div style={subnavTitleRow}>
                  <p style={{ ...subnavTitle, color: palette.text }}>{activeSubnav.title}</p>
                  <span
                    style={{
                      ...subnavCount,
                      color: palette.text,
                      border: `1px solid ${palette.activeBorder}`,
                      background: palette.accentSoft,
                    }}
                  >
                    {activeSubnav.items.length}
                  </span>
                </div>
                {activeSubnav.summary ? (
                  <p style={{ ...subnavSummary, color: palette.muted }}>
                    {activeSubnav.summary}
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => setOpenDropdown(null)}
                className="ui-btn-polish ui-focus-ring"
                style={{
                  ...subnavCloseButton,
                  color: palette.text,
                  border: `1px solid ${palette.border}`,
                  background: palette.surfaceMuted,
                }}
                aria-label="Close sub-navigation"
                title="Close sub-navigation"
              >
                <XMarkIcon style={icon14} />
              </button>
            </div>

            <div style={subnavList}>
              {activeSubnav.items.length === 0 ? (
                <p style={{ ...subnavEmpty, color: palette.muted }}>
                  No items available yet.
                </p>
              ) : (
                activeSubnav.items.map((item) => {
                  const ItemIcon = item.icon || CubeIcon;
                  const subActive =
                    !item.external && isHrefActive(location.pathname, item.href);

                  const itemBody = (
                    <>
                      <span
                        style={{
                          ...subnavIconShell,
                          background: subActive ? palette.accentSoft : palette.surfaceMuted,
                          color: subActive ? palette.accent : palette.muted,
                          border: `1px solid ${
                            subActive ? palette.activeBorder : palette.border
                          }`,
                        }}
                      >
                        <ItemIcon style={icon16} />
                      </span>
                      <span style={subnavItemBody}>
                        <span style={{ ...subnavItemLabel, color: palette.text }}>
                          {item.name}
                        </span>
                        {item.description ? (
                          <span style={{ ...subnavItemMeta, color: palette.muted }}>
                            {item.description}
                          </span>
                        ) : null}
                      </span>
                      {item.external ? (
                        <span
                          style={{
                            ...subnavExternalTag,
                            color: palette.muted,
                            border: `1px solid ${palette.border}`,
                            background: palette.surfaceMuted,
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
                          border: `1px solid ${palette.border}`,
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
                        color: palette.text,
                        background: subActive ? palette.active : "transparent",
                        border: `1px solid ${
                          subActive ? palette.activeBorder : palette.border
                        }`,
                        boxShadow: subActive ? palette.itemShadow : "none",
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
                  style={{
                    ...subnavFooterLink,
                    color: palette.text,
                    background: palette.surface,
                    border: `1px solid ${palette.border}`,
                  }}
                >
                  {activeSubnav.footerLink.name}
                </Link>
              </div>
            ) : null}
          </div>
        </aside>
      ) : null}
    </>
  );
}

const sidebar = {
  position: "fixed",
  top: 0,
  left: 0,
  bottom: 0,
  display: "grid",
  gap: 12,
  zIndex: 70,
  backdropFilter: "blur(18px)",
  overflow: "hidden",
};

const brandPanel = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  borderRadius: 18,
  padding: "12px",
  minHeight: 68,
};

const brandLink = {
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr)",
  gap: 12,
  alignItems: "center",
  minWidth: 0,
  flex: 1,
  textDecoration: "none",
};

const collapsedBrandLink = {
  width: 40,
  height: 40,
  display: "grid",
  placeItems: "center",
  borderRadius: 14,
  textDecoration: "none",
};

const brandMarkShell = {
  width: 40,
  height: 40,
  display: "grid",
  placeItems: "center",
  borderRadius: 14,
  flexShrink: 0,
};

const brandText = {
  minWidth: 0,
  display: "grid",
  gap: 3,
};

const brandEyebrow = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  lineHeight: 1,
};

const brandTitle = {
  fontSize: 15,
  fontWeight: 700,
  lineHeight: 1.12,
  letterSpacing: "-0.03em",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const brandMetaRow = {
  display: "flex",
  alignItems: "center",
  gap: 5,
  flexWrap: "wrap",
};

const brandMetaPill = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "3px 7px",
  fontSize: 9.5,
  fontWeight: 700,
  lineHeight: 1,
};

const collapseButton = {
  width: 34,
  height: 34,
  display: "grid",
  placeItems: "center",
  borderRadius: 12,
  cursor: "pointer",
  flexShrink: 0,
};

const featureCard = {
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr)",
  gap: 10,
  alignItems: "center",
  textDecoration: "none",
  borderRadius: 16,
  padding: "10px 11px",
};

const featureIconShell = {
  width: 34,
  height: 34,
  display: "grid",
  placeItems: "center",
  borderRadius: 12,
  flexShrink: 0,
};

const featureText = {
  minWidth: 0,
  display: "grid",
  gap: 3,
};

const featureEyebrow = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  lineHeight: 1,
};

const featureTitle = {
  fontSize: 14,
  fontWeight: 700,
  lineHeight: 1.08,
  letterSpacing: "-0.02em",
};

const featureMeta = {
  fontSize: 11,
  lineHeight: 1.3,
  opacity: 0.88,
};

const searchWrap = {
  position: "relative",
};

const searchShell = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  minWidth: 0,
  height: 42,
  borderRadius: 16,
  padding: "0 11px",
  transition: "border-color 0.18s ease, box-shadow 0.18s ease",
};

const searchInput = {
  border: "none",
  outline: "none",
  background: "transparent",
  width: "100%",
  minWidth: 0,
  fontSize: 13,
  fontFamily: "inherit",
  fontWeight: 600,
};

const searchKbd = {
  borderRadius: 8,
  padding: "2px 7px",
  fontSize: 10,
  fontFamily: "monospace",
  letterSpacing: "-0.01em",
  whiteSpace: "nowrap",
};

const clearButton = {
  border: "none",
  background: "transparent",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
  padding: 2,
};

const resultsDropdown = {
  position: "absolute",
  top: "calc(100% + 8px)",
  left: 0,
  right: 0,
  maxHeight: 360,
  overflowY: "auto",
  borderRadius: 20,
  zIndex: 90,
  padding: 8,
};

const searchStateRow = {
  padding: "10px 12px",
  fontSize: 12,
};

const resultRow = {
  width: "100%",
  borderRadius: 14,
  padding: "10px 11px",
  display: "flex",
  alignItems: "flex-start",
  gap: 8,
  textAlign: "left",
  fontFamily: "inherit",
  cursor: "pointer",
};

const resultTypePill = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "4px 8px",
  fontSize: 10,
  fontWeight: 700,
  lineHeight: 1,
  textTransform: "uppercase",
  flexShrink: 0,
};

const resultText = {
  minWidth: 0,
  display: "grid",
  gap: 3,
};

const resultTitle = {
  fontSize: 13,
  fontWeight: 700,
  lineHeight: 1.2,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const resultSubtitle = {
  fontSize: 11,
  lineHeight: 1.3,
};

const navScrollArea = {
  minWidth: 0,
  minHeight: 0,
  overflowY: "auto",
  overflowX: "hidden",
  display: "grid",
  alignContent: "start",
  gap: 10,
  paddingRight: 4,
  paddingBottom: 10,
  overscrollBehavior: "contain",
  scrollbarGutter: "stable",
};

const navSectionCard = {
  borderRadius: 16,
  padding: "8px",
  display: "grid",
  gap: 7,
};

const navSectionHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  padding: "0 2px",
};

const navSectionEyebrow = {
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  lineHeight: 1,
};

const navSectionBody = {
  display: "grid",
  gap: 4,
};

const railItemButton = {
  position: "relative",
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: 9,
  minHeight: 44,
  borderRadius: 12,
  padding: "7px 8px",
  textAlign: "left",
  cursor: "pointer",
  textDecoration: "none",
  transition: "background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease",
};

const railItemAccent = {
  position: "absolute",
  left: 6,
  top: 9,
  bottom: 9,
  width: 3,
  borderRadius: 999,
  transition: "opacity 0.18s ease",
};

const railIconShell = {
  width: 30,
  height: 30,
  borderRadius: 10,
  display: "grid",
  placeItems: "center",
  flexShrink: 0,
};

const railItemBody = {
  minWidth: 0,
  display: "grid",
  gap: 2,
  flex: 1,
};

const railItemLabel = {
  fontSize: 13.5,
  fontWeight: 700,
  lineHeight: 1.15,
};

const railItemMeta = {
  fontSize: 10,
  lineHeight: 1.28,
};

const railItemTail = {
  display: "flex",
  alignItems: "center",
  gap: 5,
  flexShrink: 0,
  marginLeft: "auto",
};

const railCount = {
  minWidth: 22,
  height: 18,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  padding: "0 6px",
  fontSize: 9.5,
  fontWeight: 700,
  lineHeight: 1,
};

const footerStack = {
  display: "grid",
  gap: 10,
  paddingTop: 10,
  marginTop: 4,
};

const utilityList = {
  display: "grid",
  gap: 4,
};

const utilityItemButton = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: 9,
  padding: "7px 8px",
  minHeight: 42,
  borderRadius: 12,
  textDecoration: "none",
  transition: "background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease",
};

const utilityIconShell = {
  width: 28,
  height: 28,
  display: "grid",
  placeItems: "center",
  borderRadius: 10,
  flexShrink: 0,
};

const utilityItemBody = {
  minWidth: 0,
  display: "grid",
  gap: 2,
  flex: 1,
};

const utilityItemLabel = {
  fontSize: 12.5,
  fontWeight: 700,
  lineHeight: 1.2,
};

const utilityItemMeta = {
  display: "none",
  fontSize: 10.5,
  lineHeight: 1.28,
};

const collapsedFooterRail = {
  display: "grid",
  gap: 6,
};

const resizeHandle = {
  position: "absolute",
  top: 0,
  right: -3,
  bottom: 0,
  width: 6,
  cursor: "col-resize",
  zIndex: 75,
};

const subnavShell = {
  position: "fixed",
  top: 14,
  bottom: 14,
  zIndex: 69,
  borderRadius: "0 28px 28px 0",
  overflow: "hidden",
  backdropFilter: "blur(18px)",
};

const subnavInner = {
  height: "100%",
  display: "grid",
  gridTemplateRows: "auto minmax(0, 1fr) auto",
  paddingLeft: 20,
};

const subnavHeader = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 10,
  padding: "18px 16px 14px 0",
};

const subnavTitleBlock = {
  minWidth: 0,
  display: "grid",
  gap: 6,
  flex: 1,
};

const subnavEyebrow = {
  margin: 0,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  lineHeight: 1,
};

const subnavTitleRow = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

const subnavTitle = {
  margin: 0,
  fontSize: 16,
  fontWeight: 700,
  lineHeight: 1.12,
  letterSpacing: "-0.02em",
};

const subnavCount = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "5px 9px",
  fontSize: 10,
  fontWeight: 700,
  lineHeight: 1,
};

const subnavSummary = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.45,
  maxWidth: 280,
};

const subnavCloseButton = {
  width: 34,
  height: 34,
  borderRadius: 14,
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
  flexShrink: 0,
};

const subnavList = {
  display: "grid",
  alignContent: "start",
  gap: 8,
  padding: "12px 16px 14px 0",
  overflowY: "auto",
};

const subnavItem = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  borderRadius: 18,
  padding: "11px 12px",
  textDecoration: "none",
  transition: "background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease",
};

const subnavIconShell = {
  width: 36,
  height: 36,
  borderRadius: 14,
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
  fontWeight: 700,
  lineHeight: 1.2,
};

const subnavItemMeta = {
  fontSize: 11,
  lineHeight: 1.35,
};

const subnavExternalTag = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "5px 9px",
  fontSize: 10,
  fontWeight: 700,
  lineHeight: 1,
  flexShrink: 0,
};

const subnavEmpty = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.5,
  padding: "6px 4px",
};

const subnavFooter = {
  padding: "12px 16px 16px 0",
};

const subnavFooterLink = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  minHeight: 44,
  borderRadius: 16,
  textDecoration: "none",
  fontSize: 13,
  fontWeight: 700,
};

const icon16 = {
  width: 16,
  height: 16,
  flexShrink: 0,
};

const icon14 = {
  width: 14,
  height: 14,
  flexShrink: 0,
};
