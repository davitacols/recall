import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  BeakerIcon,
  ChartBarIcon,
  CpuChipIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ShareIcon,
  SparklesIcon,
  Squares2X2Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";
import api from "../services/api";
import BM25 from "../utils/bm25";
import { useAuth } from "../hooks/useAuth";

const QUICK_QUERIES = [
  "architecture tradeoffs",
  "sprint blockers",
  "api design changes",
  "security risk decisions",
  "incident response timeline",
];

const TYPE_OPTIONS = [
  { key: "conversation", label: "Conversations" },
  { key: "decision", label: "Decisions" },
  { key: "goal", label: "Goals" },
  { key: "task", label: "Tasks" },
  { key: "meeting", label: "Meetings" },
  { key: "document", label: "Documents" },
];

const LABELS = {
  conversation: "Conversation",
  decision: "Decision",
  goal: "Goal",
  meeting: "Meeting",
  document: "Document",
  task: "Task",
  unknown: "Other",
};

function normalizeSearchResponse(response) {
  const payload = response?.data?.data || response?.data?.results || response?.data || [];
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  const bucketToType = {
    conversations: "conversation",
    decisions: "decision",
    goals: "goal",
    tasks: "task",
    meetings: "meeting",
    documents: "document",
  };

  const flat = [];
  Object.entries(bucketToType).forEach(([bucket, type]) => {
    const items = Array.isArray(payload[bucket]) ? payload[bucket] : [];
    items.forEach((item) => flat.push({ ...item, type: item.type || type }));
  });
  return flat;
}

function normalizeTrendingResponse(response) {
  const payload = response?.data?.data || response?.data?.results || response?.data || [];
  return Array.isArray(payload) ? payload : [];
}

function itemType(item) {
  return item.content_type || item.type || "unknown";
}

function itemDate(item) {
  return item.updated_at || item.created_at || item.date || "";
}

function itemPreview(item) {
  return item.content_preview || item.summary || item.content || item.description || "No preview available.";
}

function itemRoute(item) {
  if (item.url) return item.url;
  const type = itemType(item);
  if (type === "conversation") return `/conversations/${item.id}`;
  if (type === "decision") return `/decisions/${item.id}`;
  if (type === "goal") return `/business/goals/${item.id}`;
  if (type === "meeting") return `/business/meetings/${item.id}`;
  if (type === "document") return `/business/documents/${item.id}`;
  if (type === "task") return "/business/tasks";
  return null;
}

function graphHrefForItem(item) {
  const params = new URLSearchParams();
  params.set("focus_type", itemType(item));
  params.set("focus_id", String(item.id));
  return `/knowledge/graph?${params.toString()}`;
}

function FeatureLink({ to, icon: Icon, label }) {
  return (
    <Link
      to={to}
      className="ui-btn-polish"
      style={{
        borderRadius: 10,
        border: "1px solid var(--app-border-strong)",
        color: "var(--app-muted)",
        textDecoration: "none",
        padding: "8px 10px",
        fontSize: 12,
        fontWeight: 700,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <Icon style={{ width: 14, height: 14 }} />
      {label}
    </Link>
  );
}

function StatCard({ label, value, helper, tone, palette }) {
  return (
    <article style={{ borderRadius: 16, border: `1px solid ${palette.border}`, background: palette.card, padding: 14 }}>
      <p style={{ margin: "0 0 4px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: palette.muted }}>{label}</p>
      <p style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 800, color: tone }}>{value}</p>
      <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>{helper}</p>
    </article>
  );
}

export default function Knowledge() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState([]);
  const [stats, setStats] = useState({
    total_items: 0,
    this_week: 0,
    total_searches: 0,
    type_counts: {},
  });
  const [trending, setTrending] = useState([]);
  const [searched, setSearched] = useState(Boolean(searchParams.get("q")));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortMode, setSortMode] = useState("relevance");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchTypes, setSearchTypes] = useState(() => {
    const raw = searchParams.get("types");
    return raw ? raw.split(",").map((item) => item.trim()).filter(Boolean) : [];
  });
  const [insights, setInsights] = useState({
    summary: { memory_gaps_count: 0, forgotten_count: 0, faq_count: 0 },
    memory_gaps: [],
    forgotten: [],
    faq: [],
  });
  const [trainingState, setTrainingState] = useState({ running: false, error: "", result: null });

  const syncSearchParams = (nextQuery, nextTypes) => {
    const params = {};
    if (nextQuery) params.q = nextQuery;
    if (nextTypes.length) params.types = nextTypes.join(",");
    setSearchParams(params, { replace: true });
  };

  const runSearch = async (text, explicitTypes = searchTypes, syncUrl = true) => {
    const trimmed = (text || "").trim();
    if (!trimmed) return;

    setLoading(true);
    setError("");
    setShowSuggestions(false);

    try {
      const filters = explicitTypes.length ? { types: explicitTypes } : {};
      const response = await api.post("/api/knowledge/search/", { query: trimmed, filters });
      const items = normalizeSearchResponse(response);
      const docs = items.map((item) => ({
        id: `${itemType(item)}_${item.id}`,
        title: item.title || "Untitled",
        text: `${item.title || ""} ${itemPreview(item)}`,
        ...item,
      }));
      const ranked = items.length
        ? new BM25(docs).search(trimmed).map((result) => ({ ...result.doc, bm25_score: result.score }))
        : [];

      setResults(ranked);
      setSearched(true);
      if (syncUrl) syncSearchParams(trimmed, explicitTypes);
    } catch {
      setResults([]);
      setSearched(true);
      setError("Search failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadTop = async () => {
      const [statsResponse, trendResponse, insightsResponse] = await Promise.all([
        api.get("/api/knowledge/stats/").catch(() => ({ data: {} })),
        api.get("/api/knowledge/trending/").catch(() => ({ data: [] })),
        api.get("/api/knowledge/insights/overview/").catch(() => ({ data: {} })),
      ]);

      const statsPayload = statsResponse?.data?.data || statsResponse?.data || {};
      setStats({
        total_items: statsPayload.total_items || 0,
        this_week: statsPayload.this_week || 0,
        total_searches: statsPayload.total_searches || 0,
        type_counts: statsPayload.type_counts || {},
      });
      setTrending(normalizeTrendingResponse(trendResponse).slice(0, 8));

      const insightsPayload = insightsResponse?.data || {};
      setInsights({
        summary: insightsPayload.summary || { memory_gaps_count: 0, forgotten_count: 0, faq_count: 0 },
        memory_gaps: Array.isArray(insightsPayload.memory_gaps) ? insightsPayload.memory_gaps : [],
        forgotten: Array.isArray(insightsPayload.forgotten) ? insightsPayload.forgotten : [],
        faq: Array.isArray(insightsPayload.faq) ? insightsPayload.faq : [],
      });
    };

    loadTop();
  }, []);

  useEffect(() => {
    const presetQuery = searchParams.get("q");
    const presetTypes = (searchParams.get("types") || "").split(",").map((item) => item.trim()).filter(Boolean);
    if (!presetQuery) return;
    setQuery(presetQuery);
    setSearchTypes(presetTypes);
    runSearch(presetQuery, presetTypes, false);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      return undefined;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await api.get("/api/knowledge/search/suggestions/", { params: { q: trimmed } });
        setSuggestions(Array.isArray(response?.data?.suggestions) ? response.data.suggestions : []);
      } catch {
        setSuggestions([]);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [query]);

  const runDeepTraining = async () => {
    setTrainingState({ running: true, error: "", result: null });
    try {
      const response = await api.post("/api/knowledge/ai/train-deep-model/", {
        epochs: 3,
        max_samples: 800,
      });
      setTrainingState({ running: false, error: "", result: response.data?.training || null });
    } catch (trainingError) {
      const message = trainingError?.response?.data?.error || "Training failed.";
      setTrainingState({ running: false, error: message, result: null });
    }
  };

  const toggleSearchType = (typeKey) => {
    setSearchTypes((previous) =>
      previous.includes(typeKey)
        ? previous.filter((item) => item !== typeKey)
        : [...previous, typeKey]
    );
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setSearched(false);
    setError("");
    setTypeFilter("all");
    setSortMode("relevance");
    setSuggestions([]);
    setSearchTypes([]);
    setSearchParams({}, { replace: true });
  };

  const resultTypes = useMemo(() => {
    const counts = {};
    results.forEach((item) => {
      const type = itemType(item);
      counts[type] = (counts[type] || 0) + 1;
    });
    return [{ key: "all", label: "All", count: results.length }].concat(
      Object.entries(counts).map(([key, count]) => ({ key, label: LABELS[key] || key, count }))
    );
  }, [results]);

  const resultOverview = useMemo(() => {
    const counts = {};
    results.forEach((item) => {
      const type = itemType(item);
      counts[type] = (counts[type] || 0) + 1;
    });
    const topType = Object.entries(counts).sort((left, right) => right[1] - left[1])[0];
    return {
      total: results.length,
      topType: topType ? `${LABELS[topType[0]] || topType[0]} (${topType[1]})` : "No results",
      activeSources: searchTypes.length ? searchTypes.length : TYPE_OPTIONS.length,
    };
  }, [results, searchTypes]);

  const viewResults = useMemo(() => {
    const filtered = results.filter((item) => typeFilter === "all" || itemType(item) === typeFilter);
    if (sortMode === "latest") {
      return [...filtered].sort((left, right) => new Date(itemDate(right) || 0) - new Date(itemDate(left) || 0));
    }
    return [...filtered].sort(
      (left, right) => Number(right.bm25_score || right.relevance_score || 0) - Number(left.bm25_score || left.relevance_score || 0)
    );
  }, [results, sortMode, typeFilter]);

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={ui.container}>
        <section
          className="ui-enter"
          style={{
            borderRadius: 20,
            border: `1px solid ${palette.border}`,
            background: `linear-gradient(150deg, ${palette.card} 10%, ${darkMode ? "rgba(38,27,33,0.92)" : "rgba(244,237,226,0.92)"} 100%)`,
            padding: 18,
            marginBottom: 14,
          }}
        >
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: palette.muted }}>KNOWLEDGE COMMAND</p>
          <h1 style={{ margin: "8px 0 4px", color: palette.text, fontSize: "clamp(1.18rem,1.95vw,1.72rem)" }}>Unified knowledge retrieval</h1>
          <p style={{ margin: "0 0 14px", color: palette.muted, fontSize: 13 }}>
            Search conversations, decisions, goals, meetings, tasks, and documents from one workspace, then move straight into the graph around the records you find.
          </p>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              runSearch(query);
            }}
            style={{
              borderRadius: 14,
              border: `1px solid ${palette.border}`,
              background: palette.cardAlt,
              padding: 8,
              display: "grid",
              gridTemplateColumns: "minmax(0,1fr) auto auto",
              gap: 8,
              alignItems: "start",
            }}
          >
            <div style={{ position: "relative" }}>
              <MagnifyingGlassIcon style={{ width: 16, height: 16, position: "absolute", left: 12, top: 14, color: palette.muted }} />
              <input
                className="ui-focus-ring"
                value={query}
                onFocus={() => setShowSuggestions(true)}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setShowSuggestions(true);
                }}
                placeholder="Search for prior decisions, blockers, owners, knowledge gaps, or implementation context..."
                style={{ ...ui.input, paddingLeft: 35, paddingRight: 34 }}
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setSuggestions([]);
                  }}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: 10,
                    border: "none",
                    background: "transparent",
                    color: palette.muted,
                    cursor: "pointer",
                  }}
                >
                  <XMarkIcon style={{ width: 16, height: 16 }} />
                </button>
              ) : null}
              {showSuggestions && suggestions.length > 0 ? (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    left: 0,
                    right: 0,
                    zIndex: 5,
                    borderRadius: 14,
                    border: `1px solid ${palette.border}`,
                    background: palette.card,
                    boxShadow: "var(--ui-shadow-lg)",
                    overflow: "hidden",
                  }}
                >
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => {
                        setQuery(suggestion);
                        runSearch(suggestion);
                      }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        border: "none",
                        background: "transparent",
                        color: palette.text,
                        padding: "11px 12px",
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="ui-btn-polish"
              style={{ ...ui.primaryButton, minWidth: 122, justifyContent: "center", opacity: loading || !query.trim() ? 0.65 : 1 }}
            >
              <SparklesIcon style={{ width: 15, height: 15 }} />
              {loading ? "Searching..." : "Search"}
            </button>
            <button
              type="button"
              disabled={!query.trim()}
              onClick={() => navigate(`/knowledge/graph?q=${encodeURIComponent(query.trim())}${searchTypes.length ? `&types=${encodeURIComponent(searchTypes.join(","))}` : ""}`)}
              className="ui-btn-polish"
              style={{ ...ui.secondaryButton, minWidth: 144, justifyContent: "center", opacity: query.trim() ? 1 : 0.6 }}
            >
              <Squares2X2Icon style={{ width: 15, height: 15 }} />
              Explore Graph
            </button>
          </form>

          <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
            {QUICK_QUERIES.map((quickQuery) => (
              <button
                key={quickQuery}
                type="button"
                onClick={() => {
                  setQuery(quickQuery);
                  runSearch(quickQuery);
                }}
                className="ui-btn-polish ui-focus-ring"
                style={{
                  border: `1px solid ${palette.border}`,
                  borderRadius: 999,
                  background: "transparent",
                  color: palette.muted,
                  fontSize: 12,
                  padding: "6px 10px",
                  cursor: "pointer",
                }}
              >
                {quickQuery}
              </button>
            ))}
          </div>

          <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: palette.muted, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <FunnelIcon style={{ width: 14, height: 14 }} />
              Search Sources
            </span>
            {TYPE_OPTIONS.map((option) => {
              const active = searchTypes.includes(option.key);
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => toggleSearchType(option.key)}
                  className="ui-btn-polish ui-focus-ring"
                  style={{
                    borderRadius: 999,
                    border: `1px solid ${active ? palette.accent : palette.border}`,
                    background: active ? (darkMode ? "rgba(96,165,250,0.14)" : "#dbeafe") : "transparent",
                    color: active ? palette.text : palette.muted,
                    padding: "7px 11px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {option.label}
                </button>
              );
            })}
            {searchTypes.length ? (
              <button type="button" onClick={() => setSearchTypes([])} className="ui-btn-polish ui-focus-ring" style={{ ...ui.secondaryButton, padding: "7px 11px", fontSize: 12 }}>
                Reset sources
              </button>
            ) : null}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <FeatureLink to="/knowledge/graph" icon={ShareIcon} label="Graph" />
            <FeatureLink to="/knowledge/analytics" icon={ChartBarIcon} label="Analytics" />
            <FeatureLink to="/knowledge-health" icon={BeakerIcon} label="Health" />
            {["admin", "manager"].includes(String(user?.role || "")) ? (
              <button
                type="button"
                onClick={runDeepTraining}
                disabled={trainingState.running}
                className="ui-btn-polish"
                style={{ ...ui.primaryButton, opacity: trainingState.running ? 0.65 : 1 }}
              >
                <CpuChipIcon style={{ width: 15, height: 15 }} />
                {trainingState.running ? "Training..." : "Train Deep Model"}
              </button>
            ) : null}
          </div>

          {(trainingState.error || trainingState.result) ? (
            <div style={{ marginTop: 12, borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.cardAlt, padding: 12 }}>
              {trainingState.error ? (
                <p style={{ margin: 0, fontSize: 12, color: "var(--app-danger)" }}>{trainingState.error}</p>
              ) : (
                <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>
                  Model trained across {Object.keys(trainingState.result?.label_map || {}).length || 0} organization domains. Accuracy: {trainingState.result?.metrics?.accuracy ?? "N/A"}, dataset: {trainingState.result?.dataset_size ?? 0}.
                </p>
              )}
            </div>
          ) : null}
        </section>

        {!searched ? (
          <>
            <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10, marginBottom: 14 }}>
              <StatCard label="Searchable Items" value={stats.total_items} helper="Records discoverable from the workspace" tone="var(--app-info)" palette={palette} />
              <StatCard label="Indexed This Week" value={stats.this_week} helper="New knowledge added in the last 7 days" tone="var(--app-success)" palette={palette} />
              <StatCard label="Total Searches" value={stats.total_searches} helper="Team search demand across the knowledge layer" tone="var(--app-warning)" palette={palette} />
              <StatCard label="Memory Gaps" value={insights.summary.memory_gaps_count} helper="Repeated topics still missing durable decisions" tone="var(--app-danger)" palette={palette} />
              <StatCard label="Forgotten Decisions" value={insights.summary.forgotten_count} helper="Older decisions not being referenced recently" tone="var(--app-warning)" palette={palette} />
              <StatCard label="FAQ Items" value={insights.summary.faq_count} helper="Resolved questions converted into reusable answers" tone="var(--app-info)" palette={palette} />
            </section>

            {Object.keys(stats.type_counts || {}).length ? (
              <section style={{ borderRadius: 14, border: `1px solid ${palette.border}`, background: palette.card, padding: 12, marginBottom: 14 }}>
                <h2 style={{ margin: "0 0 10px", fontSize: 16, color: palette.text }}>Knowledge mix</h2>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {Object.entries(stats.type_counts).map(([key, value]) => (
                    <span
                      key={key}
                      style={{
                        borderRadius: 999,
                        border: `1px solid ${palette.border}`,
                        background: palette.cardAlt,
                        color: palette.text,
                        padding: "8px 11px",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {LABELS[key] || key} {value}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            {trending.length ? (
              <section style={{ borderRadius: 14, border: `1px solid ${palette.border}`, background: palette.card, padding: 12, marginBottom: 14 }}>
                <h2 style={{ margin: "0 0 10px", fontSize: 16, color: palette.text }}>Trending topics</h2>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {trending.map((topic, index) => {
                    const label = topic.topic || topic.title || "Untitled";
                    return (
                      <button
                        key={`${label}_${index}`}
                        type="button"
                        onClick={() => {
                          setQuery(label);
                          runSearch(label);
                        }}
                        className="ui-btn-polish ui-focus-ring"
                        style={{
                          border: "none",
                          borderRadius: 999,
                          padding: "7px 10px",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                          background: darkMode ? "rgba(96,165,250,0.18)" : "#dbeafe",
                          color: "var(--app-link)",
                        }}
                      >
                        {label} {topic.count ? `(${topic.count})` : ""}
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {(insights.memory_gaps.length || insights.forgotten.length || insights.faq.length) ? (
              <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 10, marginBottom: 14 }}>
                <article style={{ borderRadius: 14, border: `1px solid ${palette.border}`, background: palette.card, padding: 14 }}>
                  <h3 style={{ margin: "0 0 8px", fontSize: 14, color: palette.text }}>Top memory gaps</h3>
                  <div style={{ display: "grid", gap: 8 }}>
                    {insights.memory_gaps.slice(0, 4).map((gap) => (
                      <button
                        key={gap.topic}
                        type="button"
                        onClick={() => {
                          setQuery(gap.topic);
                          runSearch(gap.topic);
                        }}
                        style={{ textAlign: "left", border: "none", background: "transparent", padding: 0, cursor: "pointer" }}
                      >
                        <p style={{ margin: "0 0 2px", fontSize: 13, color: palette.text }}>{gap.topic}</p>
                        <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>{gap.discussion_count} repeated discussions</p>
                      </button>
                    ))}
                  </div>
                </article>

                <article style={{ borderRadius: 14, border: `1px solid ${palette.border}`, background: palette.card, padding: 14 }}>
                  <h3 style={{ margin: "0 0 8px", fontSize: 14, color: palette.text }}>Forgotten decisions</h3>
                  <div style={{ display: "grid", gap: 8 }}>
                    {insights.forgotten.slice(0, 4).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => navigate(`/decisions/${item.id}`)}
                        style={{ textAlign: "left", border: "none", background: "transparent", padding: 0, cursor: "pointer" }}
                      >
                        <p style={{ margin: "0 0 2px", fontSize: 13, color: palette.text }}>{item.title}</p>
                        <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>{item.days_old} days old | {item.impact_level}</p>
                      </button>
                    ))}
                  </div>
                </article>

                <article style={{ borderRadius: 14, border: `1px solid ${palette.border}`, background: palette.card, padding: 14 }}>
                  <h3 style={{ margin: "0 0 8px", fontSize: 14, color: palette.text }}>FAQ coverage</h3>
                  <div style={{ display: "grid", gap: 8 }}>
                    {insights.faq.slice(0, 4).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setQuery(item.question);
                          runSearch(item.question);
                        }}
                        style={{ textAlign: "left", border: "none", background: "transparent", padding: 0, cursor: "pointer" }}
                      >
                        <p style={{ margin: "0 0 2px", fontSize: 13, color: palette.text }}>{item.question}</p>
                        <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>{item.reply_count} replies | {item.view_count} views</p>
                      </button>
                    ))}
                  </div>
                </article>
              </section>
            ) : null}
          </>
        ) : (
          <section style={{ display: "grid", gap: 12 }}>
            <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10 }}>
              <StatCard label="Results" value={resultOverview.total} helper={`Search results for "${query}"`} tone="var(--app-info)" palette={palette} />
              <StatCard label="Top Source" value={resultOverview.topType} helper="Dominant record type in this result set" tone="var(--app-success)" palette={palette} />
              <StatCard label="Active Sources" value={resultOverview.activeSources} helper="Source types included in this search" tone="var(--app-warning)" palette={palette} />
            </section>

            <section style={{ borderRadius: 14, border: `1px solid ${palette.border}`, background: palette.card, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, color: palette.text }}>{viewResults.length} result{viewResults.length === 1 ? "" : "s"} for "{query}"</h2>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: palette.muted }}>
                    Filter within the current result set or open the graph around the query.
                  </p>
                  {error ? <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--app-danger)" }}>{error}</p> : null}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} style={{ ...ui.input, width: "auto", minWidth: 120, padding: "8px 10px" }}>
                    {resultTypes.map((item) => (
                      <option key={item.key} value={item.key}>{item.label} ({item.count})</option>
                    ))}
                  </select>
                  <select value={sortMode} onChange={(event) => setSortMode(event.target.value)} style={{ ...ui.input, width: "auto", minWidth: 120, padding: "8px 10px" }}>
                    <option value="relevance">Sort: Relevance</option>
                    <option value="latest">Sort: Latest</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => navigate(`/knowledge/graph?q=${encodeURIComponent(query.trim())}${searchTypes.length ? `&types=${encodeURIComponent(searchTypes.join(","))}` : ""}`)}
                    className="ui-btn-polish"
                    style={ui.secondaryButton}
                  >
                    <Squares2X2Icon style={{ width: 15, height: 15 }} />
                    Query graph
                  </button>
                  <button type="button" onClick={clearSearch} className="ui-btn-polish" style={ui.secondaryButton}>
                    <ArrowPathIcon style={{ width: 15, height: 15 }} />
                    New search
                  </button>
                </div>
              </div>

              {viewResults.length === 0 ? (
                <div style={{ borderRadius: 12, border: `1px dashed ${palette.border}`, padding: 18, textAlign: "center", color: palette.muted, fontSize: 13 }}>
                  No matching records. Try broader terms, remove some source filters, or search the graph instead.
                </div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {viewResults.map((item, index) => {
                    const route = itemRoute(item);
                    const type = itemType(item);
                    return (
                      <article
                        key={`${type}_${item.id}_${index}`}
                        className="ui-card-lift ui-smooth"
                        style={{ borderRadius: 14, border: `1px solid ${palette.border}`, background: palette.cardAlt, padding: 14 }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                borderRadius: 999,
                                padding: "3px 8px",
                                color: palette.muted,
                                border: `1px solid ${palette.border}`,
                                background: darkMode ? "#2b2227" : "#f3e9da",
                              }}
                            >
                              {LABELS[type] || "Other"}
                            </span>
                            {Number.isFinite(item.bm25_score) ? <span style={{ fontSize: 11, color: palette.muted }}>Score {Number(item.bm25_score).toFixed(2)}</span> : null}
                            {item.status ? <span style={{ fontSize: 11, color: palette.muted }}>Status {item.status}</span> : null}
                          </div>
                          <span style={{ fontSize: 11, color: palette.muted }}>
                            {itemDate(item) ? new Date(itemDate(item)).toLocaleDateString() : ""}
                          </span>
                        </div>

                        <h3 style={{ margin: "0 0 6px", color: palette.text, fontSize: 16 }}>{item.title || "Untitled"}</h3>
                        <p style={{ margin: 0, color: palette.muted, fontSize: 13, lineHeight: 1.6 }}>
                          {itemPreview(item)}
                        </p>

                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                          {route ? (
                            <Link to={route} className="ui-btn-polish" style={{ ...ui.primaryButton, textDecoration: "none" }}>
                              Open item
                              <ArrowTopRightOnSquareIcon style={{ width: 12, height: 12 }} />
                            </Link>
                          ) : null}
                          <Link to={graphHrefForItem(item)} className="ui-btn-polish" style={{ ...ui.secondaryButton, textDecoration: "none" }}>
                            <ShareIcon style={{ width: 14, height: 14 }} />
                            Explore neighborhood
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </section>
        )}
      </div>
    </div>
  );
}
