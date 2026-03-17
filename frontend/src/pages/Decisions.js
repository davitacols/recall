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
import {
  WorkspaceEmptyState,
  WorkspaceHero,
  WorkspacePanel,
  WorkspaceToolbar,
} from "../components/WorkspaceChrome";
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
          ? { bg: "rgba(210,168,106,0.14)", border: "rgba(210,168,106,0.28)", text: "#f4d3a4" }
          : { bg: "rgba(168,116,57,0.1)", border: "rgba(168,116,57,0.22)", text: "#8c5f2f" },
      },
      under_review: {
        label: "Under Review",
        tone: darkMode
          ? { bg: "rgba(154,185,255,0.14)", border: "rgba(154,185,255,0.3)", text: "#d7e3ff" }
          : { bg: "rgba(46,99,208,0.08)", border: "rgba(46,99,208,0.18)", text: "#2e63d0" },
      },
      approved: {
        label: "Approved",
        tone: darkMode
          ? { bg: "rgba(121,200,159,0.14)", border: "rgba(121,200,159,0.3)", text: "#bcebcf" }
          : { bg: "rgba(47,127,95,0.08)", border: "rgba(47,127,95,0.18)", text: "#2f7f5f" },
      },
      implemented: {
        label: "Implemented",
        tone: darkMode
          ? { bg: "rgba(238,229,216,0.08)", border: "rgba(238,229,216,0.18)", text: "#f5efe6" }
          : { bg: "rgba(31,26,23,0.06)", border: "rgba(58,47,38,0.14)", text: "#1f1a17" },
      },
      default: {
        label: "Proposed",
        tone: darkMode
          ? { bg: "rgba(210,168,106,0.14)", border: "rgba(210,168,106,0.28)", text: "#f4d3a4" }
          : { bg: "rgba(168,116,57,0.1)", border: "rgba(168,116,57,0.22)", text: "#8c5f2f" },
      },
    }),
    [darkMode]
  );

  const impactTone = darkMode
    ? { bg: "rgba(245,239,230,0.05)", border: "rgba(245,239,230,0.18)", text: "#d8cdbf" }
    : { bg: "rgba(31,26,23,0.05)", border: "rgba(58,47,38,0.12)", text: "#5b5148" };

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
  const visibleRatio = decisions.length ? Math.round((filteredDecisions.length / decisions.length) * 100) : 0;
  const implementedCount = statusCounts.implemented || 0;

  const decisionStats = [
    {
      label: "Recorded",
      value: decisions.length,
      helper: "Decision records in the workspace",
      tone: palette.accent,
    },
    {
      label: "Review Queue",
      value: reviewQueue,
      helper: "Proposals still moving toward a call",
      tone: statusConfig.under_review.tone.text,
    },
    {
      label: "Approved",
      value: `${approvalRate}%`,
      helper: `${statusCounts.approved || 0} approved decisions`,
      tone: statusConfig.approved.tone.text,
    },
    {
      label: "Implemented",
      value: `${implementedRate}%`,
      helper: `${implementedCount} moved into delivery`,
      tone: palette.text,
    },
  ];

  const reviewAside = (
    <div
      style={{
        ...decisionAsideCard,
        border: `1px solid ${palette.border}`,
        background: darkMode
          ? "linear-gradient(160deg, rgba(32,27,23,0.9), rgba(22,18,15,0.82))"
          : "linear-gradient(160deg, rgba(255,252,248,0.96), rgba(244,237,226,0.88))",
      }}
    >
      <p style={{ ...decisionAsideEyebrow, color: palette.muted }}>Decision Flow</p>
      <h3 style={{ ...decisionAsideTitle, color: palette.text }}>Keep rationale and rollout attached.</h3>
      <p style={{ ...decisionAsideBody, color: palette.muted }}>
        {recentCount} new records landed in the last 30 days, and {reviewQueue} still need active attention.
      </p>
      <div style={decisionAsideMetrics}>
        <div style={{ ...decisionAsideMetric, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
          <p style={{ ...decisionAsideMetricLabel, color: palette.muted }}>Visible</p>
          <p style={{ ...decisionAsideMetricValue, color: palette.text }}>{visibleRatio}%</p>
        </div>
        <div style={{ ...decisionAsideMetric, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
          <p style={{ ...decisionAsideMetricLabel, color: palette.muted }}>Recent</p>
          <p style={{ ...decisionAsideMetricValue, color: palette.text }}>{recentCount}</p>
        </div>
      </div>
    </div>
  );

  const statusLabel = (status) => statusConfig[status]?.label || statusConfig.default.label;

  if (loading) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              style={{
                borderRadius: 24,
                height: 150,
                background: palette.card,
                border: `1px solid ${palette.border}`,
                opacity: 0.76,
                boxShadow: "var(--ui-shadow-sm)",
              }}
            />
          ))}
        </div>
        <div style={{ borderRadius: 26, height: 420, background: palette.card, border: `1px solid ${palette.border}`, opacity: 0.7 }} />
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <WorkspaceHero
        palette={palette}
        darkMode={darkMode}
        eyebrow="Decision Memory"
        title="Decisions"
        description="Capture proposals, approvals, and implementation moves in one place so teams can recover the reasoning behind what changed."
        stats={decisionStats}
        aside={reviewAside}
        actions={
          <>
            <button className="ui-btn-polish ui-focus-ring" onClick={() => navigate("/conversations/new")} style={ui.primaryButton}>
              <PlusIcon style={icon14} /> Capture Decision
            </button>
            <button className="ui-btn-polish ui-focus-ring" onClick={() => navigate("/decision-proposals")} style={ui.secondaryButton}>
              Decision Proposals
            </button>
            <button className="ui-btn-polish ui-focus-ring" onClick={() => navigate("/sprint")} style={ui.secondaryButton}>
              Current Sprint
            </button>
            <button className="ui-btn-polish ui-focus-ring" onClick={fetchDecisions} style={ui.secondaryButton}>
              <ArrowPathIcon style={icon14} /> Refresh
            </button>
          </>
        }
      />

      <WorkspaceToolbar palette={palette}>
        <div style={toolbarLayout}>
          <div style={toolbarIntro}>
            <p style={{ ...toolbarEyebrow, color: palette.muted }}>Refine The Stream</p>
            <h2 style={{ ...toolbarTitle, color: palette.text }}>Find the records that need attention now</h2>
            <p style={{ ...toolbarCopy, color: palette.muted }}>
              Filter by stage, search across the log, and switch between an editorial list or compact card layout.
            </p>
          </div>

          <div style={toolbarMetaRail}>
            <span style={{ ...toolbarMetaChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
              {filteredDecisions.length} visible
            </span>
            <span style={{ ...toolbarMetaChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
              {viewMode === "grid" ? "Grid view" : "List view"}
            </span>
          </div>

          <div style={filterRail}>
            {["all", "proposed", "under_review", "approved", "implemented"].map((status) => {
              const active = filter === status;
              return (
                <button
                  key={status}
                  className="ui-btn-polish ui-focus-ring"
                  onClick={() => setFilter(status)}
                  style={{
                    ...filterPill,
                    border: `1px solid ${active ? palette.accent : palette.border}`,
                    background: active ? palette.accentSoft : palette.cardAlt,
                    color: active ? palette.accent : palette.text,
                  }}
                >
                  <FunnelIcon style={icon12} />
                  {status === "all" ? "All" : statusLabel(status)}
                </button>
              );
            })}
          </div>

          <div style={{ ...searchRail, gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) auto auto auto" }}>
            <div style={{ position: "relative", minWidth: 0 }}>
              <MagnifyingGlassIcon style={{ ...searchIcon, color: palette.muted }} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search titles, descriptions, or owners..."
                className="ui-focus-ring"
                style={{ ...ui.input, paddingLeft: 38 }}
              />
            </div>

            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} style={{ ...ui.input, width: isMobile ? "100%" : 160 }}>
              <option value="recent">Recent first</option>
              <option value="oldest">Oldest first</option>
              <option value="title">Title</option>
            </select>

            <div style={viewToggle}>
              <button
                className="ui-btn-polish ui-focus-ring"
                onClick={() => setViewMode("grid")}
                style={{
                  ...toggleButton,
                  background: viewMode === "grid" ? palette.accentSoft : "transparent",
                  color: viewMode === "grid" ? palette.accent : palette.muted,
                }}
                aria-label="Grid view"
              >
                <Squares2X2Icon style={icon14} />
              </button>
              <button
                className="ui-btn-polish ui-focus-ring"
                onClick={() => setViewMode("list")}
                style={{
                  ...toggleButton,
                  background: viewMode === "list" ? palette.accentSoft : "transparent",
                  color: viewMode === "list" ? palette.accent : palette.muted,
                }}
                aria-label="List view"
              >
                <ListBulletIcon style={icon14} />
              </button>
            </div>

            <div style={toolbarSummary}>
              <p style={{ ...toolbarSummaryLabel, color: palette.muted }}>Implementation</p>
              <p style={{ ...toolbarSummaryValue, color: palette.text }}>{implementedCount}</p>
            </div>
          </div>
        </div>
      </WorkspaceToolbar>

      {filteredDecisions.length === 0 ? (
        <WorkspaceEmptyState
          palette={palette}
          title={decisions.length === 0 ? "Start the decision record" : "No decisions match this view"}
          description={
            decisions.length === 0
              ? "Capture the next proposal, approval, or implementation move so the team can trace what changed."
              : "Try adjusting the search, widening the filter, or changing the sort order to bring more records back into view."
          }
          action={
            <button
              className="ui-btn-polish ui-focus-ring"
              onClick={() =>
                decisions.length === 0
                  ? navigate("/conversations/new")
                  : (setFilter("all"), setQuery(""), setSortBy("recent"))
              }
              style={ui.primaryButton}
            >
              {decisions.length === 0 ? "Capture Decision" : "Reset Filters"}
            </button>
          }
        />
      ) : viewMode === "grid" ? (
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 14 }}>
          {filteredDecisions.map((decision) => (
            <DecisionGridCard
              key={decision.id}
              decision={decision}
              palette={palette}
              statusLabel={statusLabel(decision.status)}
              statusTone={statusConfig[decision.status]?.tone || statusConfig.default.tone}
              impactTone={impactTone}
              onOpen={() => navigate(`/decisions/${decision.id}`)}
            />
          ))}
        </section>
      ) : (
        <section style={{ display: "grid", gap: 12 }}>
          {filteredDecisions.map((decision) => (
            <WorkspacePanel
              key={decision.id}
              palette={palette}
              title={decision.title || "Untitled decision"}
              eyebrow="Decision Record"
              description={decision.description || "No description provided yet."}
              action={<DecisionActionRail palette={palette} decision={decision} onOpen={() => navigate(`/decisions/${decision.id}`)} />}
            >
              <div style={decisionListRow}>
                <div style={decisionBadgeRail}>
                  <Badge text={statusLabel(decision.status)} tone={statusConfig[decision.status]?.tone || statusConfig.default.tone} />
                  <Badge text={(decision.impact_level || "medium").toUpperCase()} tone={impactTone} />
                  <Badge text={`Owner ${decision.decision_maker_name || "Unknown"}`} tone={{ bg: palette.cardAlt, border: palette.border, text: palette.text }} />
                </div>
                <div style={decisionMetaRail}>
                  <span style={{ color: palette.muted }}>{formatDate(decision.created_at)}</span>
                  <button className="ui-btn-polish ui-focus-ring" onClick={() => navigate(`/decisions/${decision.id}`)} style={decisionLinkButton(palette)}>
                    Open decision <ArrowRightIcon style={icon12} />
                  </button>
                </div>
              </div>
            </WorkspacePanel>
          ))}
        </section>
      )}
    </div>
  );
}

function DecisionGridCard({ decision, palette, statusLabel, statusTone, impactTone, onOpen }) {
  return (
    <article
      className="ui-card-lift ui-smooth"
      onClick={onOpen}
      style={{
        borderRadius: 26,
        border: `1px solid ${palette.border}`,
        background: palette.card,
        padding: 20,
        cursor: "pointer",
        display: "grid",
        gap: 14,
        minHeight: 258,
        boxShadow: "var(--ui-shadow-sm)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ ...cardEyebrow, color: palette.muted }}>Decision Record</p>
          <h3 style={{ ...cardTitle, color: palette.text }}>{decision.title || "Untitled decision"}</h3>
        </div>
        <span style={{ ...dateChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.muted }}>
          {formatDate(decision.created_at)}
        </span>
      </div>

      <div style={decisionBadgeRail}>
        <Badge text={statusLabel} tone={statusTone} />
        <Badge text={(decision.impact_level || "medium").toUpperCase()} tone={impactTone} />
      </div>

      <p style={{ ...cardDescription, color: palette.muted }}>
        {decision.description || "No description provided yet. Open the record to add rationale, context, and follow-through."}
      </p>

      <div style={{ ...decisionFoot, borderTop: `1px solid ${palette.border}` }}>
        <div>
          <p style={{ ...cardLabel, color: palette.muted }}>Owner</p>
          <p style={{ ...cardOwner, color: palette.text }}>{decision.decision_maker_name || "Unknown"}</p>
        </div>
        <span style={{ ...openLink, color: palette.accent }}>
          Open decision <ArrowRightIcon style={icon12} />
        </span>
      </div>
    </article>
  );
}

function DecisionActionRail({ palette, decision, onOpen }) {
  return (
    <div style={decisionActionRail}>
      <Badge text={formatDate(decision.created_at)} tone={{ bg: palette.cardAlt, border: palette.border, text: palette.muted }} />
      <button className="ui-btn-polish ui-focus-ring" onClick={onOpen} style={decisionLinkButton(palette)}>
        Open decision <ArrowRightIcon style={icon12} />
      </button>
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
        padding: "6px 10px",
        lineHeight: 1.2,
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      {text}
    </span>
  );
}

function formatDate(rawDate) {
  if (!rawDate) return "Unknown date";
  return new Date(rawDate).toLocaleDateString();
}

function decisionLinkButton(palette) {
  return {
    border: "none",
    borderRadius: 999,
    padding: "8px 12px",
    background: palette.accentSoft,
    color: palette.accent,
    fontSize: 12,
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    cursor: "pointer",
  };
}

const toolbarLayout = {
  display: "grid",
  gap: 14,
};

const toolbarIntro = {
  display: "grid",
  gap: 4,
};

const toolbarEyebrow = {
  margin: 0,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};

const toolbarTitle = {
  margin: 0,
  fontSize: 24,
  lineHeight: 1.02,
};

const toolbarCopy = {
  margin: 0,
  fontSize: 13,
  lineHeight: 1.6,
  maxWidth: 760,
};

const toolbarMetaRail = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const toolbarMetaChip = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  borderRadius: 999,
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 700,
};

const filterRail = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const filterPill = {
  borderRadius: 999,
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  cursor: "pointer",
};

const searchRail = {
  display: "grid",
  gap: 10,
  alignItems: "center",
};

const searchIcon = {
  width: 16,
  height: 16,
  position: "absolute",
  left: 12,
  top: "50%",
  transform: "translateY(-50%)",
};

const viewToggle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  borderRadius: 999,
  padding: 4,
  background: "var(--ui-panel-alt)",
  border: "1px solid var(--ui-border)",
  width: "fit-content",
};

const toggleButton = {
  width: 36,
  height: 36,
  borderRadius: 999,
  border: "none",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
};

const toolbarSummary = {
  display: "grid",
  gap: 2,
  minWidth: 88,
};

const toolbarSummaryLabel = {
  margin: 0,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

const toolbarSummaryValue = {
  margin: 0,
  fontSize: 24,
  fontWeight: 700,
  lineHeight: 1,
};

const decisionAsideCard = {
  minWidth: 240,
  borderRadius: 24,
  padding: 16,
  display: "grid",
  gap: 10,
};

const decisionAsideEyebrow = {
  margin: 0,
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};

const decisionAsideTitle = {
  margin: 0,
  fontSize: 20,
  lineHeight: 1.04,
};

const decisionAsideBody = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.6,
};

const decisionAsideMetrics = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 8,
};

const decisionAsideMetric = {
  borderRadius: 18,
  padding: "10px 12px",
  display: "grid",
  gap: 3,
};

const decisionAsideMetricLabel = {
  margin: 0,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

const decisionAsideMetricValue = {
  margin: 0,
  fontSize: 18,
  fontWeight: 700,
  lineHeight: 1,
};

const decisionBadgeRail = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const cardEyebrow = {
  margin: "0 0 6px",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};

const cardTitle = {
  margin: 0,
  fontSize: 22,
  lineHeight: 1.05,
};

const dateChip = {
  fontSize: 11,
  fontWeight: 700,
  borderRadius: 999,
  padding: "7px 10px",
  whiteSpace: "nowrap",
};

const cardDescription = {
  margin: 0,
  fontSize: 14,
  lineHeight: 1.7,
};

const decisionFoot = {
  marginTop: "auto",
  paddingTop: 12,
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-end",
  flexWrap: "wrap",
};

const cardLabel = {
  margin: 0,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

const cardOwner = {
  margin: "6px 0 0",
  fontSize: 14,
  fontWeight: 700,
};

const openLink = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
  fontWeight: 700,
};

const decisionListRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
};

const decisionMetaRail = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
};

const decisionActionRail = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const icon14 = { width: 14, height: 14 };
const icon12 = { width: 12, height: 12 };

export default Decisions;
