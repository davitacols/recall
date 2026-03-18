import React, { useEffect, useMemo, useState } from "react";
import { LinkIcon } from "@heroicons/react/24/outline";
import api from "../services/api";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";

export function DecisionImpactPanel({ issueId }) {
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);
  const [impacts, setImpacts] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLinkModal, setShowLinkModal] = useState(false);

  useEffect(() => {
    fetchImpacts();
  }, [issueId]);

  const fetchImpacts = async () => {
    try {
      const response = await api.get(`/api/agile/issues/${issueId}/decision-impacts/`);
      setImpacts(response.data?.impacts || []);
      setHistory(response.data?.history || []);
    } catch (error) {
      console.error("Failed to fetch impacts:", error);
      setImpacts([]);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ fontSize: 12, color: palette.muted }}>Loading decision context...</div>;
  }

  return (
    <div style={stack}>
      <div style={headerRow}>
        <div>
          <p style={{ ...title, color: palette.text }}>Decision Impact</p>
          <p style={{ ...meta, color: palette.muted }}>
            Capture how decisions unblock, reshape, or delay delivery on this issue.
          </p>
        </div>

        <button
          className="ui-btn-polish ui-focus-ring"
          onClick={() => setShowLinkModal(true)}
          style={primaryButton(palette)}
        >
          <LinkIcon style={icon14} />
          Link Decision
        </button>
      </div>

      {impacts.length ? (
        <div style={stack}>
          {impacts.map((impact) => (
            <article
              key={impact.id}
              className="ui-card-lift ui-smooth"
              style={{ ...impactCard, border: `1px solid ${palette.border}`, background: palette.cardAlt }}
            >
              <div style={impactHeader}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ ...impactTitle, color: palette.text }}>{impact.decision_title}</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                    <span style={{ ...tonePill(getImpactTone(impact.impact_type, palette)), textTransform: "capitalize" }}>
                      {impact.impact_type}
                    </span>
                    <span style={{ ...smallPill, border: `1px solid ${palette.border}`, color: palette.muted }}>
                      {impact.created_by_name || "Unknown"}
                    </span>
                  </div>
                </div>
              </div>

              <p style={{ ...body, color: palette.muted }}>
                {impact.description || "No explanation was added for this decision relationship yet."}
              </p>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {impact.estimated_effort_change !== 0 ? (
                  <span
                    style={{
                      ...smallPill,
                      color: impact.estimated_effort_change > 0 ? palette.warn : palette.good,
                      border: `1px solid ${palette.border}`,
                    }}
                  >
                    {impact.estimated_effort_change > 0 ? "+" : ""}
                    {impact.estimated_effort_change} pts
                  </span>
                ) : null}
                {impact.estimated_delay_days > 0 ? (
                  <span style={{ ...smallPill, color: palette.warn, border: `1px solid ${palette.border}` }}>
                    {impact.estimated_delay_days} day delay
                    {impact.estimated_delay_days > 1 ? "s" : ""}
                  </span>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div style={{ ...emptyState, border: `1px dashed ${palette.border}`, color: palette.muted }}>
          No decisions are linked to this issue yet.
        </div>
      )}

      {history.length ? (
        <div style={stack}>
          <p style={{ ...sectionLabel, color: palette.muted }}>Decision-driven changes</p>
          {history.map((entry) => (
            <article
              key={entry.id}
              style={{
                ...historyCard,
                border: `1px solid ${palette.border}`,
                background: palette.cardAlt,
              }}
            >
              <div style={impactHeader}>
                <p style={{ ...historyType, color: palette.text }}>{String(entry.change_type || "").replace(/_/g, " ")}</p>
                <span style={{ ...meta, color: palette.muted }}>
                  {entry.created_at ? new Date(entry.created_at).toLocaleDateString() : "-"}
                </span>
              </div>
              <p style={{ ...meta, color: palette.muted }}>
                Decision: <span style={{ color: palette.text, fontWeight: 700 }}>{entry.decision_title}</span>
              </p>
              {entry.old_value && entry.new_value ? (
                <p style={{ ...body, color: palette.text }}>
                  {entry.old_value} -> {entry.new_value}
                </p>
              ) : null}
              {entry.reason ? <p style={{ ...meta, color: palette.muted }}>{entry.reason}</p> : null}
            </article>
          ))}
        </div>
      ) : null}

      {showLinkModal ? (
        <LinkDecisionModal
          issueId={issueId}
          palette={palette}
          ui={ui}
          onClose={() => setShowLinkModal(false)}
          onSuccess={() => {
            setShowLinkModal(false);
            fetchImpacts();
          }}
        />
      ) : null}
    </div>
  );
}

function LinkDecisionModal({ issueId, palette, ui, onClose, onSuccess }) {
  const [decisions, setDecisions] = useState([]);
  const [selectedDecision, setSelectedDecision] = useState("");
  const [impactType, setImpactType] = useState("enables");
  const [description, setDescription] = useState("");
  const [effortChange, setEffortChange] = useState(0);
  const [delayDays, setDelayDays] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDecisions();
  }, []);

  const fetchDecisions = async () => {
    try {
      const response = await api.get("/api/decisions/");
      setDecisions(response.data?.results || response.data || []);
    } catch (error) {
      console.error("Failed to fetch decisions:", error);
      setDecisions([]);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await api.post(`/api/agile/issues/${issueId}/link-decision/`, {
        decision_id: selectedDecision,
        impact_type: impactType,
        description,
        estimated_effort_change: parseInt(effortChange, 10) || 0,
        estimated_delay_days: parseInt(delayDays, 10) || 0,
      });
      onSuccess();
    } catch (error) {
      console.error("Failed to link decision:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={overlay}>
      <div
        className="ui-card-lift ui-smooth"
        style={{
          ...modalCard,
          border: `1px solid ${palette.border}`,
          background: palette.card,
        }}
      >
        <div style={headerRow}>
          <div>
            <p style={{ ...sectionLabel, color: palette.muted }}>Link Decision</p>
            <h3 style={{ ...modalTitle, color: palette.text }}>Connect a decision to this issue</h3>
          </div>
          <button className="ui-btn-polish ui-focus-ring" onClick={onClose} style={secondaryButton(palette)}>
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} style={stack}>
          <Field label="Decision" palette={palette}>
            <select value={selectedDecision} onChange={(event) => setSelectedDecision(event.target.value)} style={ui.input} required>
              <option value="">Select a decision...</option>
              {decisions.map((decision) => (
                <option key={decision.id} value={decision.id}>
                  {decision.title}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Impact type" palette={palette}>
            <select value={impactType} onChange={(event) => setImpactType(event.target.value)} style={ui.input}>
              <option value="enables">Enables</option>
              <option value="blocks">Blocks</option>
              <option value="changes">Changes Requirements</option>
              <option value="accelerates">Accelerates</option>
              <option value="delays">Delays</option>
            </select>
          </Field>

          <Field label="Description" palette={palette}>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="How does this decision affect the issue?"
              style={{ ...ui.input, minHeight: 96, resize: "vertical" }}
            />
          </Field>

          <div style={ui.twoCol}>
            <Field label="Effort change (pts)" palette={palette}>
              <input type="number" value={effortChange} onChange={(event) => setEffortChange(event.target.value)} style={ui.input} />
            </Field>
            <Field label="Delay (days)" palette={palette}>
              <input type="number" value={delayDays} onChange={(event) => setDelayDays(event.target.value)} style={ui.input} />
            </Field>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
            <button className="ui-btn-polish ui-focus-ring" type="button" onClick={onClose} style={secondaryButton(palette)}>
              Cancel
            </button>
            <button
              className="ui-btn-polish ui-focus-ring"
              type="submit"
              disabled={submitting || !selectedDecision}
              style={{ ...primaryButton(palette), border: "none", opacity: submitting || !selectedDecision ? 0.7 : 1 }}
            >
              {submitting ? "Linking..." : "Link Decision"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children, palette }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ ...sectionLabel, color: palette.muted }}>{label}</span>
      {children}
    </label>
  );
}

function getImpactTone(type, palette) {
  switch (type) {
    case "blocks":
      return { background: "rgba(239, 68, 68, 0.12)", color: palette.danger };
    case "enables":
      return { background: "rgba(34, 197, 94, 0.12)", color: palette.good };
    case "changes":
      return { background: "rgba(245, 158, 11, 0.12)", color: palette.warn };
    case "accelerates":
      return { background: palette.accentSoft, color: palette.accent };
    case "delays":
      return { background: "rgba(245, 158, 11, 0.12)", color: palette.warn };
    default:
      return { background: palette.accentSoft, color: palette.accent };
  }
}

function tonePill(tone) {
  return {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 999,
    padding: "5px 9px",
    fontSize: 11,
    fontWeight: 800,
    ...tone,
  };
}

function primaryButton(palette) {
  return {
    borderRadius: 999,
    padding: "10px 14px",
    fontSize: 12,
    fontWeight: 800,
    color: palette.buttonText,
    background: palette.ctaGradient,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    cursor: "pointer",
    border: "none",
  };
}

function secondaryButton(palette) {
  return {
    borderRadius: 999,
    padding: "10px 14px",
    fontSize: 12,
    fontWeight: 800,
    color: palette.text,
    background: palette.cardAlt,
    border: `1px solid ${palette.border}`,
    cursor: "pointer",
  };
}

const stack = { display: "grid", gap: 12 };
const headerRow = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" };
const title = { margin: 0, fontSize: 14, fontWeight: 800, letterSpacing: "-0.01em" };
const meta = { margin: 0, fontSize: 12, lineHeight: 1.55 };
const impactCard = { borderRadius: 18, padding: 16, display: "grid", gap: 10 };
const impactHeader = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" };
const impactTitle = { margin: 0, fontSize: 15, fontWeight: 800, lineHeight: 1.4 };
const body = { margin: 0, fontSize: 13, lineHeight: 1.65 };
const smallPill = { display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "5px 9px", fontSize: 11, fontWeight: 700 };
const emptyState = { borderRadius: 16, padding: "18px 14px", textAlign: "center", fontSize: 12 };
const sectionLabel = { margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" };
const historyCard = { borderRadius: 16, padding: 14, display: "grid", gap: 6 };
const historyType = { margin: 0, fontSize: 13, fontWeight: 800, textTransform: "capitalize" };
const overlay = { position: "fixed", inset: 0, background: "rgba(8, 10, 14, 0.55)", display: "grid", placeItems: "center", zIndex: 140, padding: 16 };
const modalCard = { width: "min(640px, 100%)", borderRadius: 24, padding: 20, display: "grid", gap: 16 };
const modalTitle = { margin: "4px 0 0", fontSize: 24, lineHeight: 1.05, letterSpacing: "-0.04em" };
const icon14 = { width: 14, height: 14 };

export default DecisionImpactPanel;
