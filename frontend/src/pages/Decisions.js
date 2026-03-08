import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowPathIcon,
  FunnelIcon,
  ListBulletIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";
import api from "../services/api";

function Decisions() {
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [viewMode, setViewMode] = useState("list");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");

  useEffect(() => {
    fetchDecisions();
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const fetchDecisions = async () => {
    try {
      const response = await api.get("/api/decisions/");
      const data = response.data.data || response.data.results || response.data || [];
      const decisionsArray = Array.isArray(data) ? data : [];
      setDecisions(decisionsArray.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    } catch (error) {
      console.error("Failed to fetch decisions:", error);
      setDecisions([]);
    } finally {
      setLoading(false);
    }
  };

  const statusConfig = useMemo(
    () => ({
      proposed: {
        label: "Proposed",
        tone: darkMode
          ? { bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.45)", text: "var(--app-warning)" }
          : { bg: "var(--app-warning-soft)", border: "rgba(180,83,9,0.35)", text: "#92400e" },
      },
      under_review: {
        label: "Under Review",
        tone: darkMode
          ? { bg: "rgba(59,130,246,0.18)", border: "rgba(59,130,246,0.45)", text: "var(--app-link)" }
          : { bg: "rgba(59,130,246,0.12)", border: "var(--app-info-border)", text: "var(--app-link)" },
      },
      approved: {
        label: "Approved",
        tone: darkMode
          ? { bg: "rgba(16,185,129,0.18)", border: "var(--app-success-border)", text: "#6ee7b7" }
          : { bg: "var(--app-success-soft)", border: "rgba(5,150,105,0.35)", text: "#047857" },
      },
      implemented: {
        label: "Implemented",
        tone: darkMode
          ? { bg: "rgba(168,85,247,0.2)", border: "rgba(168,85,247,0.45)", text: "#d8b4fe" }
          : { bg: "rgba(168,85,247,0.12)", border: "rgba(126,34,206,0.32)", text: "#7e22ce" },
      },
      default: {
        label: "Proposed",
        tone: darkMode
          ? { bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.45)", text: "var(--app-warning)" }
          : { bg: "var(--app-warning-soft)", border: "rgba(180,83,9,0.35)", text: "#92400e" },
      },
    }),
    [darkMode]
  );

  const filteredDecisions = useMemo(() => {
    const loweredQuery = query.trim().toLowerCase();
    const filtered = decisions.filter((decision) => {
      const matchesFilter = filter === "all" ? true : decision.status === filter;
      const haystack = `${decision.title || ""} ${decision.description || ""} ${decision.decision_maker_name || ""}`.toLowerCase();
      const matchesQuery = loweredQuery ? haystack.includes(loweredQuery) : true;
      return matchesFilter && matchesQuery;
    });

    const sorted = [...filtered];
    if (sortBy === "recent") sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (sortBy === "oldest") sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    if (sortBy === "title") sorted.sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));
    return sorted;
  }, [decisions, filter, query, sortBy]);

  const statusCounts = decisions.reduce((acc, decision) => {
    acc[decision.status] = (acc[decision.status] || 0) + 1;
    return acc;
  }, {});
  const approvalRate = decisions.length ? Math.round(((statusCounts.approved || 0) / decisions.length) * 100) : 0;
  const implementedRate = decisions.length ? Math.round(((statusCounts.implemented || 0) / decisions.length) * 100) : 0;

  const statusLabel = (status) => statusConfig[status]?.label || statusConfig.default.label;

  if (loading) {
    return (
      <div style={{ minHeight: "100vh" }}>
        <div style={ui.container}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 10 }}>
            {[1, 2, 3, 4].map((item) => (
              <div key={item} style={{ borderRadius: 12, height: 140, background: palette.card, border: `1px solid ${palette.border}`, opacity: 0.7 }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", position: "relative", fontFamily: "'Sora', 'Space Grotesk', 'Segoe UI', sans-serif" }}>
      <div
        style={{
          ...ambientLayer,
          background: darkMode
            ? "radial-gradient(circle at 8% 4%, rgba(59,130,246,0.14), transparent 34%)"
            : "radial-gradient(circle at 8% 4%, rgba(59,130,246,0.09), transparent 34%)",
        }}
      />
      <div style={ui.container}>
        <section
          className="ui-enter"
          style={{
            ...commandStrip,
            position: "sticky",
            top: 72,
            border: `1px solid ${palette.border}`,
            background: darkMode ? "rgba(17,24,39,0.88)" : "rgba(255,255,255,0.86)",
            backdropFilter: "blur(8px)",
            "--ui-delay": "10ms",
          }}
        >
          <button className="ui-btn-polish ui-focus-ring" onClick={() => navigate("/conversations")} style={{ ...commandPill, border: `1px solid ${palette.border}`, color: palette.text }}>
            Conversations
          </button>
          <button className="ui-btn-polish ui-focus-ring" onClick={() => navigate("/sprint")} style={{ ...commandPill, border: `1px solid ${palette.border}`, color: palette.text }}>
            Current Sprint
          </button>
          <button className="ui-btn-polish ui-focus-ring" onClick={fetchDecisions} style={{ ...commandPill, border: `1px solid ${palette.border}`, color: palette.text }}>
            <ArrowPathIcon style={{ width: 13, height: 13 }} /> Refresh
          </button>
          <button className="ui-btn-polish ui-focus-ring" onClick={() => navigate("/conversations/new")} style={{ ...ui.primaryButton, marginLeft: "auto" }}>
            <PlusIcon style={{ width: 14, height: 14 }} /> New Decision
          </button>
        </section>

        <section className="ui-enter" style={{ borderRadius: 14, border: `1px solid ${palette.border}`, background: palette.card, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap", marginBottom: 10, position: "relative", zIndex: 1, "--ui-delay": "70ms" }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: palette.muted }}>DECISION CENTER</p>
            <h1 style={{ margin: "8px 0 4px", fontSize: "clamp(1.2rem,2.3vw,1.75rem)", color: palette.text, letterSpacing: "-0.02em" }}>Decisions</h1>
            <p style={{ margin: 0, fontSize: 13, color: palette.muted }}>Track proposals, approvals, and implementation progress.</p>
          </div>
        </section>

        <section className="ui-enter" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8, marginBottom: 10, "--ui-delay": "130ms" }}>
          <Metric label="Total" value={decisions.length} palette={palette} />
          <Metric label="Approved" value={statusCounts.approved || 0} palette={palette} tone={statusConfig.approved.tone} />
          <Metric label="Implemented" value={statusCounts.implemented || 0} palette={palette} tone={statusConfig.implemented.tone} />
          <Metric label="Approval" value={`${approvalRate}%`} palette={palette} />
        </section>

        <section
          className="ui-enter"
          style={{
            borderRadius: 10,
            border: `1px solid ${palette.border}`,
            background: palette.card,
            padding: 8,
            marginBottom: 10,
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
            "--ui-delay": "170ms",
          }}
        >
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {["all", "proposed", "under_review", "approved", "implemented"].map((status) => (
              <button
                className="ui-btn-polish ui-focus-ring"
                key={status}
                onClick={() => setFilter(status)}
                style={{
                  ...ui.secondaryButton,
                  fontSize: 10,
                  padding: "6px 9px",
                  textTransform: "capitalize",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: filter === status ? (darkMode ? "rgba(59,130,246,0.2)" : "rgba(59,130,246,0.12)") : "transparent",
                  border: filter === status ? (darkMode ? "1px solid rgba(59,130,246,0.45)" : "1px solid rgba(37,99,235,0.32)") : ui.secondaryButton.border,
                  color: filter === status ? (darkMode ? "var(--app-link)" : "var(--app-link)") : ui.secondaryButton.color,
                }}
              >
                <FunnelIcon style={{ width: 11, height: 11 }} />
                {status === "all" ? "All" : status.replace("_", " ")}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", width: isMobile ? "100%" : "auto" }}>
            <div style={{ position: "relative", minWidth: isMobile ? 0 : 210, width: isMobile ? "100%" : "auto", flex: 1 }}>
              <MagnifyingGlassIcon style={{ width: 14, height: 14, position: "absolute", left: 10, top: 10, color: palette.muted }} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search decisions..."
                style={{ ...ui.input, paddingLeft: 30 }}
              />
            </div>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} style={{ ...ui.input, width: isMobile ? "100%" : 140, padding: "9px 10px" }}>
              <option value="recent">Recent</option>
              <option value="oldest">Oldest</option>
              <option value="title">Title</option>
            </select>
            <button
              className="ui-btn-polish ui-focus-ring"
              onClick={() => setViewMode("grid")}
              style={{
                ...ui.secondaryButton,
                padding: "7px 9px",
                background: viewMode === "grid" ? (darkMode ? "rgba(120,120,120,0.18)" : "rgba(120,120,120,0.1)") : "transparent",
              }}
            >
              <Squares2X2Icon style={{ width: 15, height: 15 }} />
            </button>
            <button
              className="ui-btn-polish ui-focus-ring"
              onClick={() => setViewMode("list")}
              style={{
                ...ui.secondaryButton,
                padding: "7px 9px",
                background: viewMode === "list" ? (darkMode ? "rgba(120,120,120,0.18)" : "rgba(120,120,120,0.1)") : "transparent",
              }}
            >
              <ListBulletIcon style={{ width: 15, height: 15 }} />
            </button>
          </div>
        </section>

        {filteredDecisions.length === 0 ? (
          <div style={{ borderRadius: 12, border: `1px dashed ${palette.border}`, background: palette.card, padding: "20px 14px", textAlign: "center", color: palette.muted, fontSize: 13 }}>
            No decisions found. Try changing filters or search text.
          </div>
        ) : viewMode === "grid" ? (
          <section className="ui-enter" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 10, "--ui-delay": "210ms" }}>
            {filteredDecisions.map((decision) => (
              <article
                className="ui-card-lift ui-smooth"
                key={decision.id}
                onClick={() => navigate(`/decisions/${decision.id}`)}
                style={{
                  borderRadius: 10,
                  border: `1px solid ${palette.border}`,
                  background: palette.card,
                  padding: 12,
                  cursor: "pointer",
                  transition: "transform 0.18s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 8 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", minWidth: 0 }}>
                    <Badge text={statusLabel(decision.status)} tone={statusConfig[decision.status]?.tone || statusConfig.default.tone} />
                    <Badge
                      text={(decision.impact_level || "medium").toUpperCase()}
                      tone={
                        darkMode
                          ? { bg: "rgba(245,158,11,0.14)", border: "rgba(245,158,11,0.42)", text: "var(--app-warning)" }
                          : { bg: "rgba(245,158,11,0.1)", border: "rgba(180,83,9,0.3)", text: "#92400e" }
                      }
                    />
                  </div>
                  <span style={{ fontSize: 11, color: palette.muted }}>{formatDate(decision.created_at)}</span>
                </div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: palette.text }}>{decision.title}</p>
                {decision.description && <p style={{ margin: "5px 0 0", fontSize: 12, color: palette.muted, lineHeight: 1.4 }}>{decision.description}</p>}
                <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6, fontSize: 11, color: palette.muted, paddingTop: 8, borderTop: `1px solid ${palette.border}` }}>
                  <span>Owner</span>
                  <span>{decision.decision_maker_name || "Unknown"}</span>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="ui-enter" style={{ display: "grid", gap: 8, "--ui-delay": "210ms" }}>
            {filteredDecisions.map((decision) => (
              <article
                className="ui-card-lift ui-smooth"
                key={decision.id}
                onClick={() => navigate(`/decisions/${decision.id}`)}
                style={{
                  borderRadius: 10,
                  border: `1px solid ${palette.border}`,
                  background: palette.card,
                  padding: 10,
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6, flexWrap: "wrap", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <Badge text={statusLabel(decision.status)} tone={statusConfig[decision.status]?.tone || statusConfig.default.tone} />
                    <Badge
                      text={(decision.impact_level || "medium").toUpperCase()}
                      tone={
                        darkMode
                          ? { bg: "rgba(245,158,11,0.14)", border: "rgba(245,158,11,0.42)", text: "var(--app-warning)" }
                          : { bg: "rgba(245,158,11,0.1)", border: "rgba(180,83,9,0.3)", text: "#92400e" }
                      }
                    />
                    </div>
                    <span style={{ fontSize: 11, color: palette.muted }}>{formatDate(decision.created_at)}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: palette.text }}>{decision.title}</p>
                  {decision.description && <p style={{ margin: "5px 0 0", fontSize: 12, color: palette.muted, lineHeight: 1.4 }}>{decision.description}</p>}
                </div>
                <div style={{ fontSize: 11, color: palette.muted, textAlign: "right" }}>
                  <p style={{ margin: 0 }}>Owner</p>
                  <p style={{ margin: "4px 0 0", color: palette.text }}>{decision.decision_maker_name || "Unknown"}</p>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, palette, tone }) {
  return (
    <div
      style={{
        borderRadius: 999,
        padding: "8px 12px",
        border: `1px solid ${tone?.border || palette.border}`,
        background: tone?.bg || "transparent",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 8,
      }}
    >
      <p style={{ margin: 0, fontSize: 11, color: palette.muted }}>{label}</p>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: tone?.text || palette.text }}>{value}</p>
    </div>
  );
}

function Badge({ text, tone }) {
  return (
    <span
      style={{
        border: `1px solid ${tone.border}`,
        color: tone.text,
        background: tone.bg,
        fontSize: 11,
        fontWeight: 700,
        borderRadius: 999,
        padding: "3px 8px",
        textTransform: "capitalize",
      }}
    >
      {text}
    </span>
  );
}

const ambientLayer = { position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 };
const commandStrip = { position: "relative", zIndex: 10, marginBottom: 10, borderRadius: 12, padding: 8, display: "flex", flexWrap: "wrap", gap: 8 };
const commandPill = { display: "inline-flex", alignItems: "center", gap: 5, borderRadius: 999, padding: "6px 10px", background: "transparent", fontSize: 11, fontWeight: 700, cursor: "pointer" };

function formatDate(rawDate) {
  if (!rawDate) return "Unknown date";
  return new Date(rawDate).toLocaleDateString();
}

export default Decisions;

