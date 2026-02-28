import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowTopRightOnSquareIcon,
  BeakerIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  ShareIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";
import api from "../services/api";
import BM25 from "../utils/bm25";

const QUICK_QUERIES = [
  "architecture tradeoffs",
  "sprint blockers",
  "api design changes",
  "security risk decisions",
  "incident response timeline",
];

const LABELS = {
  conversation: "Conversation",
  decision: "Decision",
  meeting: "Meeting",
  document: "Document",
  task: "Task",
  unknown: "Other",
};

function normalizeSearchResponse(res) {
  const payload = res?.data?.data || res?.data?.results || res?.data || [];
  return Array.isArray(payload) ? payload : [];
}

function normalizeTrendingResponse(res) {
  const payload = res?.data?.data || res?.data?.results || res?.data || [];
  return Array.isArray(payload) ? payload : [];
}

function itemType(item) {
  return item.content_type || item.type || "unknown";
}

function itemDate(item) {
  return item.updated_at || item.created_at || item.date || "";
}

function itemRoute(item) {
  if (item.url) return item.url;
  const t = itemType(item);
  if (t === "conversation") return `/conversations/${item.id}`;
  if (t === "decision") return `/decisions/${item.id}`;
  if (t === "meeting") return `/business/meetings/${item.id}`;
  if (t === "document") return `/business/documents/${item.id}`;
  if (t === "task") return "/business/tasks";
  return null;
}

function FeatureLink({ to, icon: Icon, label }) {
  return (
    <Link
      to={to}
      className="ui-btn-polish"
      style={{
        borderRadius: 10,
        border: "1px solid rgba(120,120,120,0.45)",
        color: "#baa892",
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

function StatCard({ label, value, tone, palette }) {
  return (
    <article style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.card, padding: 12 }}>
      <p style={{ margin: "0 0 4px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: palette.muted }}>{label}</p>
      <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: tone }}>{value}</p>
    </article>
  );
}

export default function Knowledge() {
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [stats, setStats] = useState({ total_items: 0, this_week: 0, total_searches: 0 });
  const [trending, setTrending] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortMode, setSortMode] = useState("relevance");

  const runSearch = async (text) => {
    const q = (text || "").trim();
    if (!q) return;

    setLoading(true);
    setError("");
    try {
      const searchRes = await api.post("/api/knowledge/search/", { query: q });
      const items = normalizeSearchResponse(searchRes);
      if (!items.length) {
        setResults([]);
        setSearched(true);
        return;
      }

      const docs = items.map((item) => ({
        id: `${itemType(item)}_${item.id}`,
        title: item.title || "Untitled",
        text: `${item.title || ""} ${item.content_preview || item.summary || item.content || ""}`,
        ...item,
      }));

      const ranked = new BM25(docs).search(q).map((r) => ({ ...r.doc, bm25_score: r.score }));
      setResults(ranked);
      setSearched(true);
    } catch (e) {
      setResults([]);
      setSearched(true);
      setError("Search failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadTop = async () => {
      const [statsRes, trendRes] = await Promise.all([
        api.get("/api/knowledge/stats/").catch(() => ({ data: {} })),
        api.get("/api/knowledge/trending/").catch(() => ({ data: [] })),
      ]);
      const s = statsRes?.data?.data || statsRes?.data || {};
      setStats({
        total_items: s.total_items || 0,
        this_week: s.this_week || 0,
        total_searches: s.total_searches || 0,
      });
      setTrending(normalizeTrendingResponse(trendRes).slice(0, 8));
    };

    loadTop();

    const preset = new URLSearchParams(window.location.search).get("q");
    if (preset) {
      setQuery(preset);
      runSearch(preset);
    }
  }, []);

  const resultTypes = useMemo(() => {
    const counts = {};
    results.forEach((item) => {
      const t = itemType(item);
      counts[t] = (counts[t] || 0) + 1;
    });
    return [{ key: "all", label: "All", count: results.length }].concat(
      Object.entries(counts).map(([key, count]) => ({ key, label: LABELS[key] || key, count }))
    );
  }, [results]);

  const viewResults = useMemo(() => {
    const filtered = results.filter((item) => typeFilter === "all" || itemType(item) === typeFilter);
    if (sortMode === "latest") {
      return [...filtered].sort((a, b) => new Date(itemDate(b) || 0) - new Date(itemDate(a) || 0));
    }
    return [...filtered].sort((a, b) => Number(b.bm25_score || b.relevance_score || 0) - Number(a.bm25_score || a.relevance_score || 0));
  }, [results, typeFilter, sortMode]);

  return (
    <div style={{ minHeight: "100vh", background: palette.bg }}>
      <div style={ui.container}>
        <section
          className="ui-enter"
          style={{ borderRadius: 18, border: `1px solid ${palette.border}`, background: `linear-gradient(150deg, ${palette.card} 10%, ${darkMode ? "#261b21" : "#fff1dd"} 100%)`, padding: 16, marginBottom: 12 }}
        >
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: palette.muted }}>KNOWLEDGE COMMAND</p>
          <h1 style={{ margin: "8px 0 4px", color: palette.text, fontSize: "clamp(1.45rem,2.5vw,2.1rem)" }}>Unified knowledge retrieval</h1>
          <p style={{ margin: "0 0 12px", color: palette.muted, fontSize: 13 }}>Search conversations, decisions, meetings, and docs from one flow with relevance ranking.</p>

          <form onSubmit={(e) => { e.preventDefault(); runSearch(query); }} style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.cardAlt, padding: 8, display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
            <div style={{ position: "relative" }}>
              <MagnifyingGlassIcon style={{ width: 16, height: 16, position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: palette.muted }} />
              <input
                className="ui-focus-ring"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for decisions, risks, dependencies, or prior incidents..."
                style={{ ...ui.input, paddingLeft: 35 }}
              />
            </div>
            <button type="submit" disabled={loading || !query.trim()} className="ui-btn-polish" style={{ ...ui.primaryButton, minWidth: 128, justifyContent: "center", opacity: loading || !query.trim() ? 0.65 : 1 }}>
              <SparklesIcon style={{ width: 15, height: 15 }} />
              {loading ? "Searching..." : "Search"}
            </button>
          </form>

          <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
            {QUICK_QUERIES.map((q) => (
              <button key={q} type="button" onClick={() => { setQuery(q); runSearch(q); }} className="ui-btn-polish ui-focus-ring" style={{ border: `1px solid ${palette.border}`, borderRadius: 999, background: "transparent", color: palette.muted, fontSize: 12, padding: "6px 10px", cursor: "pointer" }}>
                {q}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <FeatureLink to="/knowledge/graph" icon={ShareIcon} label="Graph" />
            <FeatureLink to="/knowledge/analytics" icon={ChartBarIcon} label="Analytics" />
            <FeatureLink to="/knowledge-health" icon={BeakerIcon} label="Health" />
          </div>
        </section>

        {!searched && (
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 8, marginBottom: 12 }}>
            <StatCard label="Searchable Items" value={stats.total_items} tone="#60a5fa" palette={palette} />
            <StatCard label="Indexed This Week" value={stats.this_week} tone="#34d399" palette={palette} />
            <StatCard label="Total Searches" value={stats.total_searches} tone="#f59e0b" palette={palette} />
          </section>
        )}

        {!searched && trending.length > 0 && (
          <section style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.card, padding: 12, marginBottom: 12 }}>
            <h2 style={{ margin: "0 0 10px", fontSize: 16, color: palette.text }}>Trending Topics</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {trending.map((topic, i) => {
                const label = topic.topic || topic.title || "Untitled";
                const count = topic.count || 0;
                return (
                  <button key={`${label}_${i}`} type="button" onClick={() => { setQuery(label); runSearch(label); }} className="ui-btn-polish ui-focus-ring" style={{ border: "none", borderRadius: 999, padding: "7px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", background: darkMode ? "rgba(96,165,250,0.18)" : "#dbeafe", color: darkMode ? "#93c5fd" : "#1d4ed8" }}>
                    {label} {count ? `(${count})` : ""}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {searched && (
          <section style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.card, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, color: palette.text }}>{viewResults.length} result{viewResults.length === 1 ? "" : "s"} for "{query}"</h2>
                {error && <p style={{ margin: "6px 0 0", fontSize: 12, color: "#ef4444" }}>{error}</p>}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ ...ui.input, width: "auto", minWidth: 120, padding: "8px 10px" }}>
                  {resultTypes.map((it) => (
                    <option key={it.key} value={it.key}>{it.label} ({it.count})</option>
                  ))}
                </select>
                <select value={sortMode} onChange={(e) => setSortMode(e.target.value)} style={{ ...ui.input, width: "auto", minWidth: 120, padding: "8px 10px" }}>
                  <option value="relevance">Sort: Relevance</option>
                  <option value="latest">Sort: Latest</option>
                </select>
                <button type="button" onClick={() => { setSearched(false); setResults([]); setQuery(""); setError(""); setTypeFilter("all"); setSortMode("relevance"); }} className="ui-btn-polish" style={ui.secondaryButton}>
                  New Search
                </button>
              </div>
            </div>

            {viewResults.length === 0 ? (
              <div style={{ borderRadius: 10, border: `1px dashed ${palette.border}`, padding: 16, textAlign: "center", color: palette.muted, fontSize: 13 }}>
                No matching records. Try broader terms or remove source filters.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {viewResults.map((item, idx) => {
                  const route = itemRoute(item);
                  const t = itemType(item);
                  return (
                    <article key={`${t}_${item.id}_${idx}`} onClick={() => route && navigate(route)} className="ui-card-lift ui-smooth" style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.cardAlt, padding: 12, cursor: route ? "pointer" : "default" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "3px 8px", color: palette.muted, border: `1px solid ${palette.border}`, background: darkMode ? "#2b2227" : "#f3e9da" }}>{LABELS[t] || "Other"}</span>
                          {Number.isFinite(item.bm25_score) && <span style={{ fontSize: 11, color: palette.muted }}>Score {Number(item.bm25_score).toFixed(2)}</span>}
                        </div>
                        <span style={{ fontSize: 11, color: palette.muted }}>{itemDate(item) ? new Date(itemDate(item)).toLocaleDateString() : ""}</span>
                      </div>
                      <h3 style={{ margin: "0 0 6px", color: palette.text, fontSize: 16 }}>{item.title || "Untitled"}</h3>
                      <p style={{ margin: 0, color: palette.muted, fontSize: 13, lineHeight: 1.5, display: "-webkit-box", overflow: "hidden", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
                        {item.content_preview || item.summary || item.content || "No preview available."}
                      </p>
                      {route && (
                        <Link to={route} onClick={(e) => e.stopPropagation()} style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none", fontSize: 12, color: darkMode ? "#93c5fd" : "#1d4ed8" }}>
                          Open item
                          <ArrowTopRightOnSquareIcon style={{ width: 12, height: 12 }} />
                        </Link>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
