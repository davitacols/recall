import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowPathIcon,
  ArrowRightIcon,
  CheckBadgeIcon,
  ClockIcon,
  FunnelIcon,
  ListBulletIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  RocketLaunchIcon,
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
  const reviewQueue = (statusCounts.proposed || 0) + (statusCounts.under_review || 0);
  const recentCount = decisions.filter((decision) => {
    const timestamp = new Date(decision.created_at).getTime();
    if (Number.isNaN(timestamp)) return false;
    return Date.now() - timestamp <= 1000 * 60 * 60 * 24 * 30;
  }).length;

  const statusLabel = (status) => statusConfig[status]?.label || statusConfig.default.label;

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", position: "relative" }}>
        <div
          style={{
            ...ambientLayer,
            background: darkMode
              ? "radial-gradient(circle at 8% 4%, rgba(59,130,246,0.14), transparent 34%), radial-gradient(circle at 86% 12%, rgba(168,85,247,0.1), transparent 26%)"
              : "radial-gradient(circle at 8% 4%, rgba(59,130,246,0.1), transparent 34%), radial-gradient(circle at 86% 12%, rgba(168,85,247,0.08), transparent 26%)",
          }}
        />
        <div style={{ ...ui.container, position: "relative", zIndex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14 }}>
            {[1, 2, 3, 4].map((item) => (
              <div key={item} style={{ borderRadius: 22, height: 156, background: palette.card, border: `1px solid ${palette.border}`, opacity: 0.72, boxShadow: "var(--ui-shadow-xs)" }} />
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
            ? "radial-gradient(circle at 8% 4%, rgba(59,130,246,0.14), transparent 34%), radial-gradient(circle at 86% 12%, rgba(168,85,247,0.1), transparent 26%), radial-gradient(circle at 52% 0%, rgba(16,185,129,0.08), transparent 24%)"
            : "radial-gradient(circle at 8% 4%, rgba(59,130,246,0.09), transparent 34%), radial-gradient(circle at 86% 12%, rgba(168,85,247,0.08), transparent 26%), radial-gradient(circle at 52% 0%, rgba(16,185,129,0.06), transparent 24%)",
        }}
      />
      <div style={{ ...ui.container, position: "relative", zIndex: 1 }}>
        <section
          className="ui-enter ui-card-lift ui-smooth"
          style={{
            ...heroCard,
            border: `1px solid ${palette.border}`,
            background: darkMode
              ? "linear-gradient(145deg, rgba(11,18,32,0.96) 0%, rgba(17,24,39,0.94) 54%, rgba(21,32,54,0.88) 100%)"
              : "linear-gradient(145deg, rgba(255,255,255,0.96) 0%, rgba(246,249,252,0.98) 58%, rgba(232,241,255,0.92) 100%)",
            boxShadow: "var(--ui-shadow-sm)",
            "--ui-delay": "10ms",
          }}
        >
          <div style={{ display: "grid", alignContent: "space-between", gap: 16, minWidth: 0 }}>
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", color: palette.muted, textTransform: "uppercase" }}>DECISION CENTER</p>
              <h1 style={{ margin: "8px 0 10px", fontSize: "clamp(2rem,3vw,2.7rem)", color: palette.text, letterSpacing: "-0.04em", lineHeight: 1.02 }}>Decisions</h1>
              <p style={{ margin: 0, fontSize: 15, color: palette.muted, lineHeight: 1.6, maxWidth: 720 }}>
                Capture proposals, approvals, and implementation moves in one place so teams can trace how work actually changed.
              </p>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={{ ...heroChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                <ClockIcon style={{ width: 14, height: 14 }} /> {recentCount} added in 30 days
              </span>
              <span style={{ ...heroChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                <FunnelIcon style={{ width: 14, height: 14 }} /> {filteredDecisions.length} visible now
              </span>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="ui-btn-polish ui-focus-ring" onClick={() => navigate("/conversations/new")} style={ui.primaryButton}>
                <PlusIcon style={{ width: 14, height: 14 }} /> New Decision
              </button>
              <button className="ui-btn-polish ui-focus-ring" onClick={() => navigate("/conversations")} style={ui.secondaryButton}>
                Conversations
              </button>
              <button className="ui-btn-polish ui-focus-ring" onClick={() => navigate("/sprint")} style={ui.secondaryButton}>
                Current Sprint
              </button>
              <button className="ui-btn-polish ui-focus-ring" onClick={fetchDecisions} style={ui.secondaryButton}>
                <ArrowPathIcon style={{ width: 14, height: 14 }} /> Refresh
              </button>
            </div>
          </div>

          <div style={heroStatGrid}>
            <Metric icon={ListBulletIcon} label="Total decisions" value={decisions.length} helper="Records in the decision log." palette={palette} />
            <Metric icon={ClockIcon} label="Review queue" value={reviewQueue} helper="Proposals still moving toward a call." palette={palette} tone={statusConfig.under_review.tone} />
            <Metric icon={CheckBadgeIcon} label="Approved" value={statusCounts.approved || 0} helper={`${approvalRate}% of all recorded decisions.`} palette={palette} tone={statusConfig.approved.tone} />
            <Metric icon={RocketLaunchIcon} label="Implemented" value={statusCounts.implemented || 0} helper={`${implementedRate}% have moved into delivery.`} palette={palette} tone={statusConfig.implemented.tone} />
          </div>
        </section>

        <section
          className="ui-enter ui-card-lift ui-smooth"
          style={{
            borderRadius: 24,
            border: `1px solid ${palette.border}`,
            background: palette.card,
            padding: 18,
            marginBottom: 16,
            display: "grid",
            gap: 14,
            boxShadow: "var(--ui-shadow-xs)",
            "--ui-delay": "140ms",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: palette.muted, textTransform: "uppercase" }}>Refine The View</p>
              <h2 style={{ margin: "8px 0 4px", fontSize: 20, color: palette.text }}>Filter the decision stream</h2>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: palette.muted }}>Narrow by status, search across the record, and choose the layout that fits the review.</p>
            </div>
            <span style={{ ...heroChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
              {viewMode === "grid" ? "Grid view" : "List view"}
            </span>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {["all", "proposed", "under_review", "approved", "implemented"].map((status) => (
              <button
                className="ui-btn-polish ui-focus-ring"
                key={status}
                onClick={() => setFilter(status)}
                style={{
                  ...ui.secondaryButton,
                  fontSize: 11,
                  padding: "8px 12px",
                  textTransform: "capitalize",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: filter === status ? (darkMode ? "rgba(59,130,246,0.2)" : "rgba(59,130,246,0.12)") : "transparent",
                  border: filter === status ? (darkMode ? "1px solid rgba(59,130,246,0.45)" : "1px solid rgba(37,99,235,0.32)") : ui.secondaryButton.border,
                  color: filter === status ? "var(--app-link)" : ui.secondaryButton.color,
                }}
              >
                <FunnelIcon style={{ width: 11, height: 11 }} />
                {status === "all" ? "All" : status.replace("_", " ")}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", width: "100%", alignItems: "center" }}>
            <div style={{ position: "relative", minWidth: isMobile ? 0 : 260, width: isMobile ? "100%" : "auto", flex: 1 }}>
              <MagnifyingGlassIcon style={{ width: 14, height: 14, position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: palette.muted }} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search decisions..." style={{ ...ui.input, paddingLeft: 30 }} />
            </div>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} style={{ ...ui.input, width: isMobile ? "100%" : 150, padding: "9px 10px" }}>
              <option value="recent">Recent</option>
              <option value="oldest">Oldest</option>
              <option value="title">Title</option>
            </select>
            <button
              className="ui-btn-polish ui-focus-ring"
              onClick={() => setViewMode("grid")}
              style={{
                ...ui.secondaryButton,
                padding: "8px 10px",
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
                padding: "8px 10px",
                background: viewMode === "list" ? (darkMode ? "rgba(120,120,120,0.18)" : "rgba(120,120,120,0.1)") : "transparent",
              }}
            >
              <ListBulletIcon style={{ width: 15, height: 15 }} />
            </button>
          </div>
        </section>

        {filteredDecisions.length === 0 ? (
          <div
            className="ui-enter ui-card-lift ui-smooth"
            style={{
              borderRadius: 24,
              border: `1px dashed ${palette.border}`,
              background: palette.card,
              padding: "52px 22px",
              textAlign: "center",
              color: palette.muted,
              display: "grid",
              justifyItems: "center",
              gap: 10,
              boxShadow: "var(--ui-shadow-xs)",
              "--ui-delay": "210ms",
            }}
          >
            <CheckBadgeIcon style={{ width: 48, height: 48, color: palette.muted }} />
            <h2 style={{ margin: "6px 0 0", fontSize: 24, color: palette.text }}>
              {decisions.length === 0 ? "Start the decision record" : "No decisions match this view"}
            </h2>
            <p style={{ margin: 0, maxWidth: 540, fontSize: 14, lineHeight: 1.6 }}>
              {decisions.length === 0
                ? "Capture the next proposal, approval, or implementation move so the team can trace what changed."
                : "Try adjusting the search, switching status filters, or changing the sort order to widen the view."}
            </p>
            <button
              className="ui-btn-polish ui-focus-ring"
              onClick={() => (decisions.length === 0 ? navigate("/conversations/new") : (setFilter("all"), setQuery(""), setSortBy("recent")))}
              style={{ ...ui.primaryButton, marginTop: 8 }}
            >
              {decisions.length === 0 ? "Capture Decision" : "Reset Filters"}
            </button>
          </div>
        ) : viewMode === "grid" ? (
          <section className="ui-enter" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))", gap: 14, "--ui-delay": "210ms" }}>
            {filteredDecisions.map((decision) => (
              <article
                className="ui-card-lift ui-smooth"
                key={decision.id}
                onClick={() => navigate(`/decisions/${decision.id}`)}
                style={{
                  borderRadius: 22,
                  border: `1px solid ${palette.border}`,
                  background: palette.card,
                  padding: 18,
                  cursor: "pointer",
                  display: "grid",
                  gap: 14,
                  minHeight: 228,
                  boxShadow: "var(--ui-shadow-xs)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start", minWidth: 0 }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: palette.muted }}>Decision Record</p>
                    <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: palette.text, lineHeight: 1.15 }}>{decision.title}</p>
                  </div>
                  <span style={{ fontSize: 11, color: palette.muted, whiteSpace: "nowrap" }}>{formatDate(decision.created_at)}</span>
                </div>

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

                {decision.description && <p style={{ margin: 0, fontSize: 13, color: palette.muted, lineHeight: 1.6 }}>{decision.description}</p>}

                <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, fontSize: 12, color: palette.muted, paddingTop: 12, borderTop: `1px solid ${palette.border}`, alignItems: "flex-end" }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" }}>Owner</p>
                    <p style={{ margin: "6px 0 0", color: palette.text, fontWeight: 700 }}>{decision.decision_maker_name || "Unknown"}</p>
                  </div>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: palette.accent, fontWeight: 700 }}>
                    Open decision <ArrowRightIcon style={{ width: 12, height: 12 }} />
                  </span>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="ui-enter" style={{ display: "grid", gap: 10, "--ui-delay": "210ms" }}>
            {filteredDecisions.map((decision) => (
              <article
                className="ui-card-lift ui-smooth"
                key={decision.id}
                onClick={() => navigate(`/decisions/${decision.id}`)}
                style={{
                  borderRadius: 22,
                  border: `1px solid ${palette.border}`,
                  background: palette.card,
                  padding: 18,
                  cursor: "pointer",
                  display: "grid",
                  gap: 12,
                  boxShadow: "var(--ui-shadow-xs)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
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
                    <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: palette.text, lineHeight: 1.15 }}>{decision.title}</p>
                    {decision.description && <p style={{ margin: "8px 0 0", fontSize: 13, color: palette.muted, lineHeight: 1.6 }}>{decision.description}</p>}
                  </div>
                  <span style={{ ...heroChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                    Owner: {decision.decision_maker_name || "Unknown"}
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap", paddingTop: 12, borderTop: `1px solid ${palette.border}` }}>
                  <div style={{ fontSize: 12, color: palette.muted }}>
                    Decision status: <span style={{ color: palette.text, fontWeight: 700 }}>{statusLabel(decision.status)}</span>
                  </div>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: palette.accent, fontWeight: 700, fontSize: 12 }}>
                    Open decision <ArrowRightIcon style={{ width: 12, height: 12 }} />
                  </span>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, helper, palette, tone }) {
  return (
    <article
      style={{
        borderRadius: 22,
        padding: "16px 16px 14px",
        border: `1px solid ${tone?.border || palette.border}`,
        background: tone?.bg || palette.cardAlt,
        display: "grid",
        gap: 8,
        boxShadow: "var(--ui-shadow-xs)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            width: 34,
            height: 34,
            borderRadius: 12,
            display: "grid",
            placeItems: "center",
            background: tone?.bg || palette.accentSoft,
            color: tone?.text || palette.accent,
          }}
        >
          <Icon style={{ width: 16, height: 16 }} />
        </span>
        <p style={{ margin: 0, fontSize: 11, color: palette.muted, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>{label}</p>
      </div>
      <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: tone?.text || palette.text, lineHeight: 1 }}>{value}</p>
      <p style={{ margin: 0, fontSize: 13, color: palette.muted, lineHeight: 1.5 }}>{helper}</p>
    </article>
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
        padding: "4px 9px",
        textTransform: "capitalize",
      }}
    >
      {text}
    </span>
  );
}

const ambientLayer = { position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 };
const heroCard = {
  position: "relative",
  zIndex: 1,
  marginBottom: 16,
  borderRadius: 28,
  padding: "clamp(20px, 3vw, 30px)",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 18,
};
const heroStatGrid = { display: "grid", gap: 10, alignContent: "start" };
const heroChip = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  borderRadius: 999,
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 700,
};

function formatDate(rawDate) {
  if (!rawDate) return "Unknown date";
  return new Date(rawDate).toLocaleDateString();
}

export default Decisions;
