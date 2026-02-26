import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ChartBarIcon,
  ChatBubbleLeftIcon,
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

export default function UnifiedNav({ darkMode, rightActions = null }) {
  const location = useLocation();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [isCompact, setIsCompact] = useState(window.innerWidth < 1180);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onResize = () => setIsCompact(window.innerWidth < 1180);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    setOpenDropdown(null);
  }, [location.pathname]);

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
  }, []);

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

  const palette = useMemo(
    () =>
      darkMode
        ? {
            navBg: "rgba(23,18,21,0.9)",
            border: "rgba(255,225,193,0.14)",
            text: "#f4ece0",
            muted: "#b9a997",
            hover: "rgba(255,255,255,0.06)",
            active: "rgba(255,173,105,0.18)",
            searchBg: "rgba(255,255,255,0.03)",
          }
        : {
            navBg: "rgba(255,250,243,0.94)",
            border: "#eadfce",
            text: "#231814",
            muted: "#7b6a58",
            hover: "rgba(35,24,20,0.06)",
            active: "rgba(255,158,87,0.2)",
            searchBg: "rgba(255,255,255,0.8)",
          },
    [darkMode]
  );

  const navItems = [
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

  return (
    <nav
      data-unified-nav-search="true"
      style={{
        ...nav,
        background: palette.navBg,
        borderBottom: `1px solid ${palette.border}`,
      }}
    >
      <div style={brandWrap}>
        <Link to="/" style={{ ...brand, color: palette.text }}>
          Knoledgr
        </Link>
      </div>

      <div style={centerWrap}>
        <div style={navList} ref={dropdownRef}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isTopLevelActive(item);

            if (item.items) {
              const expanded = openDropdown === item.name;
              return (
                <div key={item.name} style={{ position: "relative" }}>
                  <button
                    onClick={() => setOpenDropdown(expanded ? null : item.name)}
                    style={{
                      ...topButton,
                      color: active ? palette.text : palette.muted,
                      background: active ? palette.active : "transparent",
                      border: `1px solid ${active ? palette.border : "transparent"}`,
                    }}
                    title={isCompact ? item.name : undefined}
                  >
                    <Icon style={icon16} />
                    {!isCompact && <span>{item.name}</span>}
                    {!isCompact && (
                      <ChevronDownIcon
                        style={{
                          ...icon14,
                          transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                          transition: "transform 0.15s",
                        }}
                      />
                    )}
                  </button>

                  {expanded && (
                    <div
                      style={{
                        ...dropdown,
                        background: palette.navBg,
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
                              borderLeft: `3px solid ${subActive ? "#ffab69" : "transparent"}`,
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
                  border: `1px solid ${active ? palette.border : "transparent"}`,
                }}
                title={isCompact ? item.name : undefined}
              >
                <Icon style={icon16} />
                {!isCompact && <span>{item.name}</span>}
              </Link>
            );
          })}
        </div>

        <div ref={searchRef} style={searchWrap}>
          <div
            style={{
              ...searchShell,
              width: isCompact ? 170 : 260,
              background: palette.searchBg,
              border: `1px solid ${searchOpen ? "#ffab69" : palette.border}`,
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
              !isCompact && window.innerWidth >= 1320 && (
                <kbd style={{ ...kbd, border: `1px solid ${palette.border}` }}>Ctrl+K</kbd>
              )
            )}
          </div>

          {searchOpen && (query.trim() || suggestions.length > 0 || results.length > 0) && (
            <div style={{ ...resultsDropdown, background: palette.navBg, border: `1px solid ${palette.border}` }}>
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
      </div>

      <div style={rightWrap}>
        {rightActions}
      </div>
    </nav>
  );
}

const nav = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  height: 56,
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr) auto",
  alignItems: "center",
  gap: 8,
  padding: "0 14px",
  zIndex: 70,
  backdropFilter: "blur(10px)",
};

const brandWrap = {
  paddingRight: 8,
};

const brand = {
  textDecoration: "none",
  fontSize: 20,
  fontWeight: 800,
  letterSpacing: "-0.02em",
};

const navList = {
  display: "flex",
  gap: 6,
  minWidth: 0,
  overflow: "visible",
};

const centerWrap = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
  justifyContent: "space-between",
};

const topButton = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 600,
  textDecoration: "none",
  padding: "7px 10px",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const dropdown = {
  position: "absolute",
  top: "calc(100% + 6px)",
  left: 0,
  minWidth: 210,
  borderRadius: 12,
  overflow: "hidden",
  boxShadow: "0 18px 40px rgba(0,0,0,0.22)",
  zIndex: 85,
};

const dropdownItem = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 12px",
  textDecoration: "none",
  fontSize: 13,
  fontWeight: 600,
};

const searchWrap = {
  position: "relative",
  flexShrink: 0,
};

const searchShell = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  borderRadius: 10,
  padding: "6px 8px",
  height: 36,
  minWidth: 0,
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

const rightWrap = {
  display: "flex",
  alignItems: "center",
  gap: 8,
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
  background: "rgba(255,255,255,0.03)",
  letterSpacing: "-0.01em",
  whiteSpace: "nowrap",
};

const resultsDropdown = {
  position: "absolute",
  top: "calc(100% + 6px)",
  right: 0,
  width: 360,
  maxHeight: 360,
  overflowY: "auto",
  borderRadius: 12,
  boxShadow: "0 18px 40px rgba(0,0,0,0.22)",
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
