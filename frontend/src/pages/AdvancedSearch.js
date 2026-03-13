import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import api from "../services/api";
import { useToast } from "../components/Toast";
import BrandedTechnicalIllustration from "../components/BrandedTechnicalIllustration";
import {
  WorkspaceEmptyState,
  WorkspaceHero,
  WorkspacePanel,
  WorkspaceToolbar,
} from "../components/WorkspaceChrome";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";

const SEARCH_ENDPOINTS = {
  conversations: "/api/conversations/",
  decisions: "/api/decisions/",
  knowledge: "/api/knowledge/",
  goals: "/api/business/goals/",
  meetings: "/api/business/meetings/",
};

const TYPE_LABELS = {
  conversations: "Conversations",
  decisions: "Decisions",
  knowledge: "Knowledge",
  goals: "Goals",
  meetings: "Meetings",
};

function getItemDate(item) {
  return item.meeting_date || item.created_at || item.updated_at || null;
}

function getItemPreview(item) {
  const source = item.content || item.description || item.summary || item.notes || "";
  return source ? `${String(source).slice(0, 160)}${source.length > 160 ? "..." : ""}` : "Open this record to review the linked context.";
}

function normalizeResults(type, payload) {
  const items = Array.isArray(payload?.results) ? payload.results : Array.isArray(payload) ? payload : [];
  return items.map((item) => ({
    ...item,
    _type: type,
    _label: TYPE_LABELS[type] || type,
    _date: getItemDate(item),
    _preview: getItemPreview(item),
    _title: item.title || item.question || item.name || "Untitled",
  }));
}

function withinDateRange(itemDate, dateFrom, dateTo) {
  if (!itemDate) return !dateFrom && !dateTo;
  const candidate = new Date(itemDate);
  if (Number.isNaN(candidate.getTime())) return !dateFrom && !dateTo;
  if (dateFrom) {
    const start = new Date(`${dateFrom}T00:00:00`);
    if (candidate < start) return false;
  }
  if (dateTo) {
    const end = new Date(`${dateTo}T23:59:59`);
    if (candidate > end) return false;
  }
  return true;
}

export default function AdvancedSearch() {
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const { addToast } = useToast();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ type: "all", dateFrom: "", dateTo: "" });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const activeFilterCount = Number(filters.type !== "all") + Number(Boolean(filters.dateFrom)) + Number(Boolean(filters.dateTo));

  const stats = [
    { label: "Search Scope", value: "5 modules", helper: "Conversations, decisions, knowledge, goals, meetings", tone: palette.info },
    { label: "Active Filters", value: activeFilterCount, helper: activeFilterCount ? "Results narrowed by date or module" : "Scanning all indexed modules", tone: activeFilterCount ? palette.warn : palette.good },
    { label: "Results", value: searched ? results.length : "--", helper: searched ? "Records matched the current query" : "Run a query to populate results", tone: searched ? palette.accent : palette.muted },
  ];

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const targets =
        filters.type === "all"
          ? Object.entries(SEARCH_ENDPOINTS)
          : [[filters.type, SEARCH_ENDPOINTS[filters.type]]];

      const responses = await Promise.all(
        targets.map(async ([type, endpoint]) => {
          try {
            const response = await api.get(`${endpoint}?search=${encodeURIComponent(query.trim())}`);
            return normalizeResults(type, response.data);
          } catch {
            return [];
          }
        })
      );

      const combined = responses
        .flat()
        .filter((item) => withinDateRange(item._date, filters.dateFrom, filters.dateTo))
        .sort((a, b) => new Date(b._date || 0) - new Date(a._date || 0));

      setResults(combined);
    } catch (error) {
      addToast("Search failed", "error");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({ type: "all", dateFrom: "", dateTo: "" });
    setResults([]);
    setSearched(false);
  };

  const navigateTo = (item) => {
    const routes = {
      conversations: `/conversations/${item.id}`,
      decisions: `/decisions/${item.id}`,
      knowledge: `/knowledge/${item.id}`,
      goals: `/business/goals/${item.id}`,
      meetings: `/business/meetings/${item.id}`,
    };
    navigate(routes[item._type] || "/");
  };

  return (
    <div style={{ ...ui.container, display: "grid", gap: 14 }}>
      <WorkspaceHero
        palette={palette}
        darkMode={darkMode}
        eyebrow="Discovery"
        title="Advanced Search"
        description="Search across the connected Knoledgr workspace and narrow results by module or time window without losing context."
        stats={stats}
        actions={
          <>
            <button onClick={search} disabled={loading || !query.trim()} className="ui-btn-polish ui-focus-ring" style={ui.primaryButton}>
              {loading ? "Searching..." : "Run Search"}
            </button>
            <button onClick={clearFilters} className="ui-btn-polish ui-focus-ring" style={ui.secondaryButton}>
              Reset Filters
            </button>
          </>
        }
        aside={<BrandedTechnicalIllustration darkMode={darkMode} compact />}
      />

      <WorkspaceToolbar palette={palette}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          <div style={{ position: "relative", minWidth: 0 }}>
            <MagnifyingGlassIcon
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                width: 16,
                height: 16,
                color: palette.muted,
              }}
            />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") search();
              }}
              placeholder="Search across all modules..."
              style={{ ...ui.input, paddingLeft: 38 }}
            />
          </div>
          <button onClick={search} disabled={loading || !query.trim()} className="ui-btn-polish ui-focus-ring" style={{ ...ui.primaryButton, justifyContent: "center" }}>
            {loading ? "Searching..." : "Search"}
          </button>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <select
            value={filters.type}
            onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}
            style={{ ...ui.input, width: "auto", minWidth: 170, padding: "8px 10px", fontSize: 13 }}
          >
            <option value="all">All Modules</option>
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))}
            style={{ ...ui.input, width: "auto", minWidth: 156, padding: "8px 10px", fontSize: 13 }}
          />
          <input
            type="date"
            value={filters.dateTo}
            onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))}
            style={{ ...ui.input, width: "auto", minWidth: 156, padding: "8px 10px", fontSize: 13 }}
          />
        </div>
      </WorkspaceToolbar>

      <WorkspacePanel
        palette={palette}
        eyebrow="Results"
        title={searched ? `${results.length} records matched` : "Run a search to begin"}
        description={
          searched
            ? "Open a result to jump straight into the underlying record."
            : "Queries search across the main routed knowledge surfaces in Knoledgr."
        }
      >
        {!searched ? (
          <WorkspaceEmptyState
            palette={palette}
            title="Start with a question or keyword"
            description="Search decisions, goals, meetings, conversations, and knowledge records from one place."
          />
        ) : null}

        {searched && !loading && results.length === 0 ? (
          <WorkspaceEmptyState
            palette={palette}
            title="No results found"
            description="Try broadening the time range, switching back to all modules, or using a shorter query."
          />
        ) : null}

        {results.length ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
            {results.map((item) => (
              <button
                key={`${item._type}-${item.id}`}
                type="button"
                onClick={() => navigateTo(item)}
                className="ui-card-lift ui-smooth ui-focus-ring"
                style={{
                  border: `1px solid ${palette.border}`,
                  borderRadius: 18,
                  padding: 16,
                  background: palette.cardAlt,
                  cursor: "pointer",
                  textAlign: "left",
                  display: "grid",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <span
                    style={{
                      padding: "4px 9px",
                      fontSize: 10,
                      fontWeight: 800,
                      background: palette.accentSoft,
                      color: palette.text,
                      borderRadius: 999,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {item._label}
                  </span>
                  <span style={{ fontSize: 11, color: palette.muted }}>
                    {item._date ? new Date(item._date).toLocaleDateString() : "No date"}
                  </span>
                </div>
                <h3 style={{ margin: 0, fontSize: 17, color: palette.text, lineHeight: 1.15 }}>{item._title}</h3>
                <p style={{ margin: 0, fontSize: 13, color: palette.muted, lineHeight: 1.55 }}>{item._preview}</p>
              </button>
            ))}
          </div>
        ) : null}
      </WorkspacePanel>
    </div>
  );
}
