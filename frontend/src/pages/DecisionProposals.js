import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRightIcon,
  ArrowPathIcon,
  ClockIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";
import api from "../services/api";

function normalizeDecisionCollection(payload) {
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
}

function SummaryCard({ icon: Icon, label, value, helper, palette, tone }) {
  return (
    <article
      style={{
        borderRadius: 22,
        padding: "16px 16px 14px",
        border: `1px solid ${tone?.border || palette.border}`,
        background: tone?.bg || palette.cardAlt,
        display: "grid",
        gap: 8,
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
            background: tone?.iconBg || palette.accentSoft,
            color: tone?.iconColor || palette.accent,
          }}
        >
          <Icon style={{ width: 16, height: 16 }} />
        </span>
        <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.12em", color: palette.muted, textTransform: "uppercase", fontWeight: 700 }}>{label}</p>
      </div>
      <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: tone?.text || palette.text, lineHeight: 1 }}>{value}</p>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: palette.muted }}>{helper}</p>
    </article>
  );
}

function StatusBadge({ status, palette, darkMode }) {
  const tones = {
    proposed: darkMode
      ? { bg: "rgba(245,158,11,0.14)", border: "rgba(245,158,11,0.42)", text: "var(--app-warning)" }
      : { bg: "rgba(245,158,11,0.1)", border: "rgba(180,83,9,0.3)", text: "#92400e" },
    under_review: darkMode
      ? { bg: "rgba(59,130,246,0.18)", border: "rgba(59,130,246,0.45)", text: "var(--app-link)" }
      : { bg: "rgba(59,130,246,0.12)", border: "rgba(37,99,235,0.3)", text: "var(--app-link)" },
  };
  const tone = tones[status] || { bg: palette.cardAlt, border: palette.border, text: palette.text };
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
      {(status || "proposed").replace("_", " ")}
    </span>
  );
}

function DecisionProposals() {
  const { darkMode } = useTheme();
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  useEffect(() => {
    fetchProposals();
  }, []);

  const fetchProposals = async () => {
    try {
      const response = await api.get("/api/decisions/");
      setDecisions(normalizeDecisionCollection(response.data));
    } catch (error) {
      console.error("Failed to fetch decisions:", error);
      setDecisions([]);
    } finally {
      setLoading(false);
    }
  };

  const proposalDecisions = useMemo(
    () => decisions.filter((decision) => ["proposed", "under_review"].includes(decision.status)),
    [decisions]
  );

  const filteredProposals = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    return proposalDecisions.filter((decision) => {
      const matchesFilter = filter === "all" ? true : decision.status === filter;
      const haystack = `${decision.title || ""} ${decision.description || ""} ${decision.decision_maker_name || ""}`.toLowerCase();
      const matchesQuery = lowered ? haystack.includes(lowered) : true;
      return matchesFilter && matchesQuery;
    });
  }, [filter, proposalDecisions, query]);

  const proposedCount = proposalDecisions.filter((decision) => decision.status === "proposed").length;
  const inReviewCount = proposalDecisions.filter((decision) => decision.status === "under_review").length;
  const recentCount = proposalDecisions.filter((decision) => {
    const timestamp = new Date(decision.created_at).getTime();
    if (Number.isNaN(timestamp)) return false;
    return Date.now() - timestamp <= 1000 * 60 * 60 * 24 * 14;
  }).length;
  const groupedProposals = {
    proposed: filteredProposals.filter((decision) => decision.status === "proposed"),
    under_review: filteredProposals.filter((decision) => decision.status === "under_review"),
  };
  const newestProposal = [...filteredProposals].sort(
    (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  )[0];

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", position: "relative", fontFamily: "'Sora', 'Space Grotesk', 'Segoe UI', sans-serif" }}>
        <div style={ambientLayer(darkMode)} />
        <div style={{ ...ui.container, position: "relative", zIndex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14 }}>
            {[1, 2, 3, 4].map((item) => (
              <div key={item} style={{ borderRadius: 22, minHeight: 152, border: `1px solid ${palette.border}`, background: palette.card, opacity: 0.72, boxShadow: "var(--ui-shadow-xs)" }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", position: "relative", fontFamily: "'Sora', 'Space Grotesk', 'Segoe UI', sans-serif" }}>
      <div style={ambientLayer(darkMode)} />
      <div style={{ ...ui.container, position: "relative", zIndex: 1, display: "grid", gap: 16 }}>
        <section
          className="ui-enter ui-card-lift ui-smooth"
          style={{
            border: `1px solid ${palette.border}`,
            borderRadius: 28,
            padding: "clamp(20px,3vw,30px)",
            background: darkMode
              ? "linear-gradient(145deg, rgba(11,18,32,0.96) 0%, rgba(17,24,39,0.94) 56%, rgba(21,32,54,0.9) 100%)"
              : "linear-gradient(145deg, rgba(255,255,255,0.96) 0%, rgba(246,249,252,0.98) 58%, rgba(232,241,255,0.92) 100%)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
            alignItems: "start",
            gap: 18,
            boxShadow: "var(--ui-shadow-sm)",
          }}
        >
          <div style={{ display: "grid", gap: 16, alignContent: "space-between", minWidth: 0 }}>
            <div>
              <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.18em", fontWeight: 700, color: palette.muted, textTransform: "uppercase" }}>INTAKE QUEUE</p>
              <h1 style={{ margin: "8px 0 10px", fontSize: "clamp(2rem,3vw,2.7rem)", color: palette.text, letterSpacing: "-0.04em", lineHeight: 1.02 }}>Decision Proposals</h1>
              <p style={{ margin: 0, fontSize: 15, color: palette.muted, lineHeight: 1.6, maxWidth: 720 }}>
                Review proposals and in-progress calls before they land in the approved decision log. This queue is powered by the existing decision statuses you already ship.
              </p>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={heroChip(palette)}>
                <SparklesIcon style={{ width: 14, height: 14 }} /> {filteredProposals.length} visible now
              </span>
              <span style={heroChip(palette)}>
                <ClockIcon style={{ width: 14, height: 14 }} /> {recentCount} updated in 14 days
              </span>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link className="ui-btn-polish ui-focus-ring" to="/conversations/new" style={{ ...ui.primaryButton, textDecoration: "none" }}>
                Capture Decision
              </Link>
              <Link className="ui-btn-polish ui-focus-ring" to="/decisions" style={{ ...ui.secondaryButton, textDecoration: "none" }}>
                Open Decision Log
              </Link>
              <button className="ui-btn-polish ui-focus-ring" onClick={fetchProposals} style={ui.secondaryButton}>
                <ArrowPathIcon style={{ width: 14, height: 14 }} /> Refresh
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
            <SummaryCard icon={SparklesIcon} label="Active queue" value={proposalDecisions.length} helper="Current proposals and decisions still under review." palette={palette} />
            <SummaryCard icon={ClockIcon} label="Proposed" value={proposedCount} helper="Ideas that still need review and a final call." palette={palette} />
            <SummaryCard icon={FunnelIcon} label="In review" value={inReviewCount} helper="Decisions actively being evaluated before approval." palette={palette} />
          </div>
        </section>

        <section
          className="ui-enter ui-card-lift ui-smooth"
          style={{
            borderRadius: 24,
            border: `1px solid ${palette.border}`,
            background: palette.card,
            padding: 18,
            display: "grid",
            gap: 14,
            boxShadow: "var(--ui-shadow-xs)",
            "--ui-delay": "90ms",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: palette.muted, textTransform: "uppercase" }}>Refine The Queue</p>
              <h2 style={{ margin: "8px 0 4px", fontSize: 20, color: palette.text }}>Filter proposals in motion</h2>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: palette.muted }}>Search across the proposal queue and focus on the stage that needs review attention.</p>
            </div>
            <span style={heroChip(palette)}>{filter === "all" ? "All proposal states" : filter.replace("_", " ")}</span>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {["all", "proposed", "under_review"].map((status) => {
              const selected = filter === status;
              return (
                <button
                  key={status}
                  className="ui-btn-polish ui-focus-ring"
                  onClick={() => setFilter(status)}
                  style={{
                    ...ui.secondaryButton,
                    border: selected ? "1px solid rgba(37,99,235,0.32)" : ui.secondaryButton.border,
                    background: selected ? (darkMode ? "rgba(59,130,246,0.2)" : "rgba(59,130,246,0.12)") : "transparent",
                    color: selected ? "var(--app-link)" : ui.secondaryButton.color,
                    textTransform: "capitalize",
                    fontSize: 11,
                    padding: "8px 12px",
                  }}
                >
                  {status === "all" ? "All" : status.replace("_", " ")}
                </button>
              );
            })}
          </div>

          <div style={{ position: "relative" }}>
            <MagnifyingGlassIcon style={{ width: 16, height: 16, position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: palette.muted }} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search decision proposals..." style={{ ...ui.input, paddingLeft: 36 }} />
          </div>
        </section>

        {filteredProposals.length === 0 ? (
          <section
            className="ui-enter ui-card-lift ui-smooth"
            style={{
              textAlign: "center",
              padding: "52px 22px",
              border: `1px dashed ${palette.border}`,
              borderRadius: 24,
              background: palette.card,
              display: "grid",
              justifyItems: "center",
              gap: 10,
              boxShadow: "var(--ui-shadow-xs)",
              "--ui-delay": "150ms",
            }}
          >
            <SparklesIcon style={{ width: 48, height: 48, color: palette.muted }} />
            <h3 style={{ margin: "6px 0 0", fontSize: 24, color: palette.text }}>
              {proposalDecisions.length === 0 ? "No active proposals right now" : "No proposals match this view"}
            </h3>
            <p style={{ margin: 0, fontSize: 14, color: palette.muted, lineHeight: 1.6, maxWidth: 540 }}>
              {proposalDecisions.length === 0
                ? "New decision proposals usually begin in conversations and then enter this queue once they are recorded as proposed or under review."
                : "Try changing the status filter or search text to widen the proposal view."}
            </p>
            <Link className="ui-btn-polish ui-focus-ring" to="/conversations/new" style={{ ...ui.primaryButton, textDecoration: "none", marginTop: 8 }}>
              Capture Decision
            </Link>
          </section>
        ) : (
          <section className="ui-enter" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14, alignItems: "start", "--ui-delay": "150ms" }}>
            <aside style={{ display: "grid", gap: 14 }}>
              <article className="ui-card-lift ui-smooth" style={{ borderRadius: 22, border: `1px solid ${palette.border}`, background: palette.card, padding: 18, boxShadow: "var(--ui-shadow-xs)" }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: palette.muted, textTransform: "uppercase" }}>Queue Notes</p>
                <h3 style={{ margin: "8px 0 6px", fontSize: 20, color: palette.text }}>Review with context, not speed</h3>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: palette.muted }}>
                  Treat this queue like an editorial desk: confirm the problem, read the rationale, and only then move a proposal into the permanent decision log.
                </p>
              </article>

              {newestProposal ? (
                <article className="ui-card-lift ui-smooth" style={{ borderRadius: 22, border: `1px solid ${palette.border}`, background: palette.card, padding: 18, boxShadow: "var(--ui-shadow-xs)" }}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: palette.muted, textTransform: "uppercase" }}>Newest Proposal</p>
                  <h3 style={{ margin: "8px 0 6px", fontSize: 18, color: palette.text, lineHeight: 1.2 }}>{newestProposal.title || "Untitled proposal"}</h3>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: palette.muted }}>
                    {newestProposal.description || "Open the proposal to review the context and draft rationale."}
                  </p>
                  <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 12, color: palette.muted }}>Owner: <span style={{ color: palette.text, fontWeight: 700 }}>{newestProposal.decision_maker_name || "Unknown"}</span></span>
                    <span style={{ fontSize: 12, color: palette.muted }}>Created: <span style={{ color: palette.text, fontWeight: 700 }}>{new Date(newestProposal.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span></span>
                  </div>
                </article>
              ) : null}
            </aside>

            <div style={{ display: "grid", gap: 14 }}>
              {["proposed", "under_review"].map((statusKey) => {
                const items = groupedProposals[statusKey];
                if (!items.length) return null;

                return (
                  <section key={statusKey} className="ui-card-lift ui-smooth" style={{ borderRadius: 24, border: `1px solid ${palette.border}`, background: palette.card, padding: 18, boxShadow: "var(--ui-shadow-xs)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 12 }}>
                      <div>
                        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: palette.muted, textTransform: "uppercase" }}>
                          {statusKey === "proposed" ? "Awaiting Review" : "Being Evaluated"}
                        </p>
                        <h3 style={{ margin: "8px 0 4px", fontSize: 22, color: palette.text, textTransform: "capitalize" }}>
                          {statusKey.replace("_", " ")}
                        </h3>
                        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: palette.muted }}>
                          {statusKey === "proposed"
                            ? "Fresh calls that still need a clearer final decision."
                            : "Proposals already in motion and waiting for a final approval path."}
                        </p>
                      </div>
                      <span style={heroChip(palette)}>{items.length} item{items.length === 1 ? "" : "s"}</span>
                    </div>

                    <div style={{ display: "grid", gap: 10 }}>
                      {items.map((decision) => (
                        <Link
                          className="ui-card-lift ui-smooth"
                          key={decision.id}
                          to={`/decisions/${decision.id}`}
                          style={{
                            border: `1px solid ${palette.border}`,
                            borderRadius: 18,
                            padding: 16,
                            textDecoration: "none",
                            background: palette.cardAlt,
                            color: palette.text,
                            display: "grid",
                            gap: 12,
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                                <StatusBadge status={decision.status} palette={palette} darkMode={darkMode} />
                                <span style={{ fontSize: 11, color: palette.muted, fontWeight: 700, textTransform: "uppercase" }}>
                                  {decision.impact_level || "unknown"} impact
                                </span>
                              </div>
                              <h4 style={{ margin: 0, fontSize: 18, color: palette.text, fontWeight: 800, lineHeight: 1.18 }}>
                                {decision.title || "Untitled proposal"}
                              </h4>
                              {decision.description ? <p style={{ margin: "8px 0 0", fontSize: 13, color: palette.muted, lineHeight: 1.6 }}>{decision.description}</p> : null}
                            </div>
                            <span style={{ fontSize: 12, color: palette.muted }}>
                              {new Date(decision.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap", paddingTop: 12, borderTop: `1px solid ${palette.border}` }}>
                            <span style={{ fontSize: 12, color: palette.muted }}>
                              Decision maker: <span style={{ color: palette.text, fontWeight: 700 }}>{decision.decision_maker_name || "Unknown"}</span>
                            </span>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: palette.accent, fontWeight: 700, fontSize: 12 }}>
                              Open proposal <ArrowRightIcon style={{ width: 12, height: 12 }} />
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

const ambientLayer = (darkMode) => ({
  position: "fixed",
  inset: 0,
  pointerEvents: "none",
  background: darkMode
    ? "radial-gradient(circle at 8% 4%, rgba(59,130,246,0.14), transparent 34%), radial-gradient(circle at 86% 12%, rgba(168,85,247,0.1), transparent 26%), radial-gradient(circle at 52% 0%, rgba(16,185,129,0.08), transparent 24%)"
    : "radial-gradient(circle at 8% 4%, rgba(59,130,246,0.1), transparent 34%), radial-gradient(circle at 86% 12%, rgba(168,85,247,0.08), transparent 26%), radial-gradient(circle at 52% 0%, rgba(16,185,129,0.06), transparent 24%)",
});

const heroChip = (palette) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  borderRadius: 999,
  padding: "8px 12px",
  border: `1px solid ${palette.border}`,
  background: palette.cardAlt,
  color: palette.text,
  fontSize: 12,
  fontWeight: 700,
});

export default DecisionProposals;
