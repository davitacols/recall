import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChatBubbleLeftIcon,
  ClockIcon,
  CubeIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";
import {
  Badge,
  Button,
  EmptyState,
  Lozenge,
  PageHeader,
  SectionMessage,
  Tabs,
} from "../components/atlas";

const TYPE_FACETS = [
  { id: "all", label: "All" },
  { id: "documents", label: "Pages" },
  { id: "conversations", label: "Conversations" },
  { id: "decisions", label: "Decisions" },
  { id: "issues", label: "Issues" },
];

function timeAgo(input) {
  if (!input) return "—";
  const d = new Date(input);
  if (isNaN(d.getTime())) return "—";
  const sec = Math.max(1, Math.round((Date.now() - d.getTime()) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const m = Math.round(sec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function kindMeta(kind) {
  const map = {
    document: { icon: DocumentTextIcon, color: "var(--b400)" },
    page: { icon: DocumentTextIcon, color: "var(--b400)" },
    conversation: { icon: ChatBubbleLeftIcon, color: "var(--t400)" },
    decision: { icon: SparklesIcon, color: "var(--p400)" },
    issue: { icon: ExclamationTriangleIcon, color: "var(--y400)" },
    project: { icon: CubeIcon, color: "var(--g400)" },
  };
  return map[String(kind || "").toLowerCase()] || map.document;
}

function kindToHref(item) {
  const k = String(item.kind || item.content_type || "").toLowerCase();
  if (k.includes("conversation")) return `/conversations/${item.id}`;
  if (k.includes("decision")) return `/decisions/${item.id}`;
  if (k.includes("issue")) return `/issues/${item.id}`;
  if (k.includes("document") || k.includes("page")) return `/business/documents/${item.id}`;
  return item.url || "#";
}

export default function Knowledge() {
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const initialQuery = params.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [trending, setTrending] = useState([]);
  const [stats, setStats] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  const [activeFacet, setActiveFacet] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    Promise.all([
      api.get("/api/knowledge/stats/").catch(() => ({ data: {} })),
      api.get("/api/knowledge/trending/").catch(() => ({ data: [] })),
    ]).then(([statsRes, trendRes]) => {
      if (!mounted) return;
      setStats(statsRes?.data || {});
      setTrending(Array.isArray(trendRes?.data) ? trendRes.data : trendRes?.data?.results || []);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const handle = setTimeout(() => runSearch(query), 240);
    return () => clearTimeout(handle);
  }, [query, activeFacet]);

  const runSearch = async (q) => {
    setLoading(true);
    setError("");
    try {
      const filters = activeFacet === "all" ? {} : { kinds: [activeFacet] };
      const { data } = await api.post("/api/knowledge/search/", { query: q, filters });
      setResults(data?.results || data?.hits || []);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSuggest = async (e) => {
    const v = e.target.value;
    setQuery(v);
    if (!v.trim()) {
      setSuggestions([]);
      return;
    }
    try {
      const { data } = await api.get("/api/knowledge/search/suggestions/", { params: { q: v } });
      setSuggestions(Array.isArray(data) ? data : data?.results || []);
    } catch (_) {}
  };

  const facetTabs = useMemo(
    () =>
      TYPE_FACETS.map((f) => ({
        id: f.id,
        label: f.label,
        count:
          f.id === "all"
            ? results.length
            : results.filter((r) => String(r.kind || "").toLowerCase().includes(f.id.slice(0, -1))).length,
      })),
    [results]
  );

  return (
    <div style={{ padding: "0 32px 32px" }}>
      <PageHeader
        breadcrumb={[
          { label: "Knoledgr", to: "/" },
          { label: "Knowledge" },
        ]}
        title="Search team memory"
        subtitle="Find pages, conversations, decisions, and issues across this workspace."
        actions={
          <Button
            appearance="primary"
            iconBefore={<PlusIcon style={{ width: 14, height: 14 }} />}
            onClick={() => (window.location.href = "/business/documents?new=1")}
          >
            Create page
          </Button>
        }
        style={{ padding: "24px 0 0", background: "transparent" }}
      />

      {/* Search box */}
      <div style={{ marginTop: 16, position: "relative" }}>
        <MagnifyingGlassIcon style={searchIcon} />
        <input
          autoFocus
          value={query}
          onChange={handleSuggest}
          placeholder="Search across pages, conversations, decisions, and issues…"
          className="atlas-input"
          style={{ height: 44, fontSize: 16, paddingLeft: 40 }}
        />
        {suggestions.length && query ? (
          <div style={suggestionsBox}>
            {suggestions.slice(0, 8).map((s, i) => (
              <button
                key={s.id || i}
                type="button"
                onClick={() => { setQuery(s.text || s.value || s.title || ""); setSuggestions([]); }}
                style={suggestionItem}
              >
                <MagnifyingGlassIcon style={{ width: 14, height: 14, color: "var(--app-muted)" }} />
                <span>{s.text || s.value || s.title}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div style={{ marginTop: 16 }}>
        <Tabs tabs={facetTabs} value={activeFacet} onChange={setActiveFacet} />
      </div>

      {error ? <SectionMessage tone="error" style={{ marginTop: 16 }}>{error}</SectionMessage> : null}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 32, marginTop: 16 }}>
        <section>
          {query.trim() ? (
            loading ? (
              <SkeletonRows />
            ) : results.length ? (
              <ul style={resultList}>
                {results.map((item, idx) => <ResultRow key={item.id || idx} item={item} />)}
              </ul>
            ) : (
              <EmptyState
                icon={<MagnifyingGlassIcon style={{ width: "100%", height: "100%" }} />}
                title={`No results for "${query}"`}
                description="Try different keywords, or remove the type filter to broaden the search."
              />
            )
          ) : (
            <BrowseTiles />
          )}
        </section>

        <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SidebarCard title="Workspace memory">
            <StatLine label="Pages" value={stats?.documents || stats?.pages || 0} />
            <StatLine label="Conversations" value={stats?.conversations || 0} />
            <StatLine label="Decisions" value={stats?.decisions || 0} />
            <StatLine label="Issues" value={stats?.issues || 0} />
          </SidebarCard>

          <SidebarCard title="Trending" to="/knowledge/analytics">
            {trending.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: "var(--app-muted)" }}>No signals yet.</p>
            ) : (
              trending.slice(0, 5).map((t, i) => {
                const Icon = kindMeta(t.kind).icon;
                return (
                  <Link key={t.id || i} to={kindToHref(t)} style={trendingItem}>
                    <Icon style={{ width: 14, height: 14, color: kindMeta(t.kind).color, flexShrink: 0 }} />
                    <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.title || t.summary || "Untitled"}
                    </span>
                    <Badge>{t.score || t.views || 1}</Badge>
                  </Link>
                );
              })
            )}
          </SidebarCard>

          <SidebarCard title="Tips">
            <p style={tipsCopy}>
              Use <kbd style={kbd}>"</kbd> for exact phrases. Type <kbd style={kbd}>type:page</kbd> or <kbd style={kbd}>owner:me</kbd> to filter.
            </p>
          </SidebarCard>
        </aside>
      </div>
    </div>
  );
}

function ResultRow({ item }) {
  const k = kindMeta(item.kind || item.content_type);
  const Icon = k.icon;
  const href = kindToHref(item);
  return (
    <li style={resultItem}>
      <Link to={href} style={{ display: "flex", gap: 12, padding: "12px 16px", color: "inherit", textDecoration: "none" }}>
        <span style={{ width: 18, height: 18, flexShrink: 0, color: k.color, marginTop: 2 }}>
          <Icon style={{ width: 18, height: 18 }} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={resultTitle}>{item.title || item.summary || "Untitled"}</span>
            {item.kind ? <Lozenge>{item.kind}</Lozenge> : null}
            {item.status ? <Lozenge status={item.status} /> : null}
          </div>
          {item.snippet || item.description ? (
            <p style={resultSnippet}>{(item.snippet || item.description || "").slice(0, 220)}</p>
          ) : null}
          <div style={resultMeta}>
            <span>{item.project_name || item.project_slug || "Workspace"}</span>
            <span>·</span>
            <span>{item.author_name || item.created_by_name || "—"}</span>
            <span>·</span>
            <span>{timeAgo(item.updated_at || item.created_at)}</span>
          </div>
        </div>
      </Link>
    </li>
  );
}

function BrowseTiles() {
  const tiles = [
    { icon: DocumentTextIcon, title: "Pages", description: "Working documents & wikis", to: "/business/documents", color: "var(--b400)" },
    { icon: ChatBubbleLeftIcon, title: "Conversations", description: "Threads & follow-ups", to: "/conversations", color: "var(--t400)" },
    { icon: SparklesIcon, title: "Decisions", description: "Committed choices & rationale", to: "/decisions", color: "var(--p400)" },
    { icon: ExclamationTriangleIcon, title: "Issues", description: "Tasks, bugs, stories", to: "/projects", color: "var(--y400)" },
    { icon: ClockIcon, title: "Recent", description: "Latest activity", to: "/dashboard", color: "var(--n400)" },
    { icon: SparklesIcon, title: "Ask Recall", description: "Grounded AI answers", to: "/ask", color: "var(--g400)" },
  ];
  return (
    <div style={tilesGrid}>
      {tiles.map((t) => {
        const Icon = t.icon;
        return (
          <Link key={t.title} to={t.to} style={tile}>
            <span style={{ ...tileIcon, color: t.color }}>
              <Icon style={{ width: 20, height: 20 }} />
            </span>
            <div>
              <p style={tileTitle}>{t.title}</p>
              <p style={tileDesc}>{t.description}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function SidebarCard({ title, to, children }) {
  return (
    <div className="atlas-card" style={{ padding: 0 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "1px solid var(--app-border-subtle)",
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--app-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {title}
        </span>
        {to ? (
          <Link to={to} style={{ fontSize: 12, color: "var(--app-link)", textDecoration: "none" }}>
            View all
          </Link>
        ) : null}
      </div>
      <div style={{ padding: "12px 16px" }}>{children}</div>
    </div>
  );
}

function StatLine({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
      <span style={{ color: "var(--app-muted)" }}>{label}</span>
      <strong style={{ color: "var(--app-text)" }}>{value}</strong>
    </div>
  );
}

function SkeletonRows() {
  return (
    <ul style={resultList}>
      {[0, 1, 2].map((i) => (
        <li key={i} style={{ ...resultItem, padding: 16 }}>
          <div style={{ height: 14, background: "var(--n30)", borderRadius: 3, width: "60%", marginBottom: 8 }} />
          <div style={{ height: 12, background: "var(--n20)", borderRadius: 3, width: "90%" }} />
        </li>
      ))}
    </ul>
  );
}

const searchIcon = {
  position: "absolute",
  left: 12,
  top: 14,
  width: 18,
  height: 18,
  color: "var(--app-muted)",
  pointerEvents: "none",
};

const suggestionsBox = {
  position: "absolute",
  top: "calc(100% + 4px)",
  left: 0,
  right: 0,
  background: "var(--app-surface-overlay)",
  border: "1px solid var(--app-border)",
  borderRadius: 4,
  boxShadow: "var(--ui-shadow-md)",
  padding: 4,
  zIndex: 60,
};

const suggestionItem = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  padding: "8px 12px",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  textAlign: "left",
  fontSize: 14,
  color: "var(--app-text)",
  fontFamily: "inherit",
  borderRadius: 3,
};

const resultList = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  background: "var(--app-surface)",
  border: "1px solid var(--app-border)",
  borderRadius: 4,
  overflow: "hidden",
};

const resultItem = {
  borderBottom: "1px solid var(--app-border-subtle)",
};

const resultTitle = {
  fontSize: 14,
  fontWeight: 600,
  color: "var(--app-text)",
};

const resultSnippet = {
  margin: "4px 0 0",
  fontSize: 13,
  color: "var(--app-muted)",
  lineHeight: 1.4286,
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

const resultMeta = {
  marginTop: 6,
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
  color: "var(--app-muted)",
};

const tilesGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 12,
};

const tile = {
  display: "flex",
  gap: 12,
  padding: "16px",
  background: "var(--app-surface)",
  border: "1px solid var(--app-border)",
  borderRadius: 4,
  textDecoration: "none",
  color: "var(--app-text)",
  transition: "background 100ms ease",
};

const tileIcon = {
  flexShrink: 0,
  display: "inline-flex",
  width: 36,
  height: 36,
  background: "var(--app-surface-alt)",
  borderRadius: 4,
  alignItems: "center",
  justifyContent: "center",
};

const tileTitle = {
  margin: 0,
  fontSize: 14,
  fontWeight: 600,
};

const tileDesc = {
  margin: "2px 0 0",
  fontSize: 12,
  color: "var(--app-muted)",
};

const trendingItem = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 0",
  fontSize: 13,
  color: "var(--app-text)",
  textDecoration: "none",
  borderBottom: "1px solid var(--app-border-subtle)",
};

const tipsCopy = {
  margin: 0,
  fontSize: 12,
  color: "var(--app-muted)",
  lineHeight: 1.55,
};

const kbd = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  background: "var(--n20)",
  border: "1px solid var(--app-border-subtle)",
  borderRadius: 3,
  padding: "0 4px",
  color: "var(--app-text)",
};
