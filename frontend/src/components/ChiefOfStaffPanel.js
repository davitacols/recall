import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowPathIcon,
  BoltIcon,
  CheckCircleIcon,
  PlayIcon,
} from "@heroicons/react/24/outline";
import { buildApiUrl } from "../utils/apiBase";

function getStatusMeta(status, palette) {
  if (status === "stable") {
    return {
      color: palette.good,
      soft: "rgba(25, 136, 99, 0.12)",
      label: "Stable",
    };
  }
  if (status === "watch") {
    return {
      color: palette.warn,
      soft: "rgba(183, 119, 40, 0.14)",
      label: "Watch",
    };
  }
  return {
    color: palette.bad,
    soft: "rgba(207, 79, 103, 0.14)",
    label: "Critical",
  };
}

export default function ChiefOfStaffPanel() {
  const [plan, setPlan] = useState(null);
  const [selected, setSelected] = useState({});
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [lastRun, setLastRun] = useState(null);
  const [error, setError] = useState("");

  const palette = useMemo(
    () => ({
      panel: "var(--ui-panel)",
      cardAlt: "var(--ui-panel-alt)",
      border: "var(--ui-border)",
      text: "var(--ui-text)",
      muted: "var(--ui-muted)",
      accent: "var(--ui-accent)",
      good: "var(--ui-good)",
      warn: "var(--ui-warn)",
      bad: "var(--app-danger)",
      buttonText: "var(--app-button-text)",
      gradient: "var(--app-gradient-primary)",
    }),
    []
  );

  useEffect(() => {
    fetchPlan();
  }, []);

  const fetchPlan = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(buildApiUrl("/api/knowledge/ai/chief-of-staff/plan/"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        let message = `Request failed (${response.status})`;
        try {
          const errBody = await response.json();
          if (errBody?.error) message = errBody.error;
          else if (errBody?.detail) message = errBody.detail;
        } catch (_e) {
          // Keep fallback message.
        }
        setPlan(null);
        setError(message);
        return;
      }
      const data = await response.json();
      setPlan(data);

      const next = {};
      (data.interventions || []).slice(0, 3).forEach((item) => {
        next[item.id] = true;
      });
      setSelected(next);
    } catch (_error) {
      setPlan(null);
      setError("Unable to load Chief of Staff plan");
    } finally {
      setLoading(false);
    }
  };

  const execute = async (dryRun = false) => {
    if (!plan || executing) return;
    const interventionIds = Object.keys(selected).filter((id) => selected[id]);
    if (interventionIds.length === 0) return;

    setExecuting(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(buildApiUrl("/api/knowledge/ai/chief-of-staff/execute/"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          intervention_ids: interventionIds,
          dry_run: dryRun,
        }),
      });
      const data = await response.json();
      setLastRun(data);
      if (!dryRun) {
        await fetchPlan();
      }
    } catch (_error) {
      setLastRun({ error: "Execution failed" });
    } finally {
      setExecuting(false);
    }
  };

  const toggle = (id) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) {
    return (
      <section style={shell}>
        <div style={headerRow}>
          <div style={titleStack}>
            <p style={{ ...eyebrow, color: palette.muted }}>Execution Guidance</p>
            <h3 style={{ ...title, color: palette.text }}>Chief of Staff</h3>
          </div>
          <div style={{ ...ghostChip, border: `1px solid ${palette.border}`, color: palette.muted, background: palette.cardAlt }}>
            Planning
          </div>
        </div>

        <div style={{ ...heroPanel, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
          <div style={loadingMetricStack}>
            <div style={{ ...loadingBarLarge, background: palette.panel }} />
            <div style={{ ...loadingBarMedium, background: palette.panel }} />
          </div>
          <div style={loadingGrid}>
            <div style={{ ...loadingMetricCard, border: `1px solid ${palette.border}`, background: palette.panel }} />
            <div style={{ ...loadingMetricCard, border: `1px solid ${palette.border}`, background: palette.panel }} />
          </div>
        </div>
      </section>
    );
  }

  if (!plan) {
    return (
      <section style={shell}>
        <div style={headerRow}>
          <div style={titleStack}>
            <p style={{ ...eyebrow, color: palette.muted }}>Execution Guidance</p>
            <h3 style={{ ...title, color: palette.text }}>Chief of Staff</h3>
          </div>
          <button
            className="ui-btn-polish ui-focus-ring"
            onClick={fetchPlan}
            style={{ ...ghostButton, border: `1px solid ${palette.border}`, color: palette.text, background: palette.cardAlt }}
          >
            <ArrowPathIcon style={icon14} />
            Retry
          </button>
        </div>
        <StateBox
          palette={palette}
          tone="danger"
          title="Chief of Staff is unavailable"
          description={error || "No Chief of Staff plan is available right now."}
        />
      </section>
    );
  }

  const status = plan.status || "watch";
  const statusMeta = getStatusMeta(status, palette);
  const selectedCount = Object.values(selected).filter(Boolean).length;
  const interventions = (plan.interventions || []).slice(0, 6);

  return (
    <section style={shell}>
      <div style={headerRow}>
        <div style={titleStack}>
          <p style={{ ...eyebrow, color: palette.muted }}>Execution Guidance</p>
          <h3 style={{ ...title, color: palette.text }}>Chief of Staff</h3>
        </div>
        <button
          className="ui-btn-polish ui-focus-ring"
          onClick={fetchPlan}
          style={{ ...ghostButton, border: `1px solid ${palette.border}`, color: palette.text, background: palette.cardAlt }}
        >
          <ArrowPathIcon style={icon14} />
          Refresh
        </button>
      </div>

      <div style={{ ...heroPanel, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
        <div style={heroMain}>
          <p style={{ ...metricLabel, color: palette.muted }}>Readiness Score</p>
          <div style={scoreRow}>
            <p style={{ ...scoreValue, color: palette.text }}>{plan.readiness_score ?? "--"}</p>
            <span
              style={{
                ...statusChip,
                border: `1px solid ${statusMeta.color}`,
                color: statusMeta.color,
                background: statusMeta.soft,
              }}
            >
              {statusMeta.label}
            </span>
          </div>
        </div>

        <div style={metricRail}>
          <MetricCard
            palette={palette}
            icon={CheckCircleIcon}
            label="Selected"
            value={selectedCount}
            tone={palette.good}
          />
          <MetricCard
            palette={palette}
            icon={BoltIcon}
            label="Interventions"
            value={interventions.length}
            tone={palette.accent}
          />
        </div>
      </div>

      <div style={sectionBlock}>
        <div style={sectionHeader}>
          <p style={{ ...sectionEyebrow, color: palette.muted }}>Proposed Interventions</p>
          <p style={{ ...sectionHelper, color: palette.muted }}>
            Select the highest-value moves before running a dry run or execution pass.
          </p>
        </div>

        {interventions.length ? (
          <div style={interventionList}>
            {interventions.map((item) => (
              <label
                key={item.id}
                className="ui-card-lift ui-smooth"
                style={{ ...interventionCard, border: `1px solid ${palette.border}`, background: palette.panel }}
              >
                <div style={checkboxWrap}>
                  <input type="checkbox" checked={!!selected[item.id]} onChange={() => toggle(item.id)} />
                </div>
                <div style={interventionBody}>
                  <div style={interventionTop}>
                    <div style={interventionTitleWrap}>
                      <p style={{ ...interventionTitle, color: palette.text }}>{item.title}</p>
                      <p style={{ ...interventionReason, color: palette.muted }}>{item.reason}</p>
                    </div>
                    <span style={{ ...confidenceChip, background: statusMeta.soft, color: statusMeta.color }}>
                      {item.confidence}% confidence
                    </span>
                  </div>
                  <div style={interventionFooter}>
                    <span style={{ ...metaChip, border: `1px solid ${palette.border}`, color: palette.muted, background: palette.cardAlt }}>
                      {item.impact} impact
                    </span>
                    <Link to={item.url || "/"} style={{ ...openLink, color: palette.accent }}>
                      Open
                    </Link>
                  </div>
                </div>
              </label>
            ))}
          </div>
        ) : (
          <StateBox
            palette={palette}
            tone="neutral"
            title="No interventions proposed yet"
            description="Chief of Staff does not have enough context to recommend actions right now."
          />
        )}
      </div>

      <div style={actionRail}>
        <button
          className="ui-btn-polish ui-focus-ring"
          onClick={() => execute(true)}
          disabled={executing || selectedCount === 0}
          style={{
            ...ghostButton,
            border: `1px solid ${palette.border}`,
            color: palette.text,
            background: palette.cardAlt,
            opacity: executing || selectedCount === 0 ? 0.6 : 1,
          }}
        >
          <PlayIcon style={icon14} />
          {executing ? "Running..." : "Dry Run"}
        </button>
        <button
          className="ui-btn-polish ui-focus-ring"
          onClick={() => execute(false)}
          disabled={executing || selectedCount === 0}
          style={{
            ...primaryButton,
            background: palette.gradient,
            color: palette.buttonText,
            opacity: executing || selectedCount === 0 ? 0.6 : 1,
          }}
        >
          <CheckCircleIcon style={icon14} />
          {executing ? "Executing..." : "Approve & Execute"}
        </button>
      </div>

      {lastRun ? (
        "error" in lastRun ? (
          <StateBox palette={palette} tone="danger" title="Execution failed" description={lastRun.error} />
        ) : (
          <div style={{ ...runSummary, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
            <p style={{ ...runTitle, color: palette.text }}>
              Last run: {lastRun.executed_count || 0} executed, {lastRun.skipped_count || 0} skipped
            </p>
            <p style={{ ...runMeta, color: palette.muted }}>
              Audit records created: {(lastRun.audit_log_ids || []).length}
            </p>
          </div>
        )
      ) : null}
    </section>
  );
}

function MetricCard({ palette, icon: Icon, label, value, tone }) {
  return (
    <div style={{ ...metricCard, border: `1px solid ${palette.border}`, background: palette.panel }}>
      <div style={metricCardHeader}>
        <Icon style={{ ...icon14, color: tone }} />
        <p style={{ ...metricCardLabel, color: palette.muted }}>{label}</p>
      </div>
      <p style={{ ...metricCardValue, color: tone }}>{value}</p>
    </div>
  );
}

function StateBox({ palette, tone, title, description }) {
  const toneColor = tone === "danger" ? palette.bad : palette.muted;
  const toneBg = tone === "danger" ? "rgba(207, 79, 103, 0.08)" : palette.cardAlt;
  return (
    <div style={{ ...stateBox, border: `1px solid ${palette.border}`, background: toneBg }}>
      <p style={{ ...stateTitle, color: toneColor }}>{title}</p>
      <p style={{ ...stateDescription, color: palette.muted }}>{description}</p>
    </div>
  );
}

const shell = { display: "grid", gap: 14 };
const headerRow = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" };
const titleStack = { display: "grid", gap: 4, minWidth: 0 };
const eyebrow = { margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" };
const title = { margin: 0, fontSize: 16, lineHeight: 1.1 };
const ghostButton = {
  borderRadius: 999,
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  cursor: "pointer",
};
const primaryButton = {
  border: "none",
  borderRadius: 999,
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 800,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  cursor: "pointer",
};
const ghostChip = {
  borderRadius: 999,
  padding: "8px 12px",
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};
const heroPanel = {
  borderRadius: 20,
  padding: "16px 16px 14px",
  display: "grid",
  gap: 14,
};
const heroMain = { display: "grid", gap: 8 };
const metricLabel = { margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" };
const scoreRow = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" };
const scoreValue = { margin: 0, fontSize: 34, fontWeight: 800, lineHeight: 0.95, letterSpacing: "-0.04em" };
const statusChip = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "7px 10px",
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};
const metricRail = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 };
const metricCard = { borderRadius: 16, padding: "12px 12px 10px", display: "grid", gap: 8 };
const metricCardHeader = { display: "flex", alignItems: "center", gap: 6 };
const metricCardLabel = { margin: 0, fontSize: 11, fontWeight: 700 };
const metricCardValue = { margin: 0, fontSize: 22, fontWeight: 800, lineHeight: 1 };
const sectionBlock = { display: "grid", gap: 10 };
const sectionHeader = { display: "grid", gap: 4 };
const sectionEyebrow = { margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" };
const sectionHelper = { margin: 0, fontSize: 12, lineHeight: 1.55 };
const interventionList = { display: "grid", gap: 10 };
const interventionCard = {
  borderRadius: 18,
  padding: "12px 12px 10px",
  display: "grid",
  gridTemplateColumns: "20px minmax(0, 1fr)",
  gap: 10,
  alignItems: "start",
  cursor: "pointer",
};
const checkboxWrap = { paddingTop: 2 };
const interventionBody = { display: "grid", gap: 8, minWidth: 0 };
const interventionTop = { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" };
const interventionTitleWrap = { display: "grid", gap: 4, minWidth: 0 };
const interventionTitle = { margin: 0, fontSize: 13, fontWeight: 700, lineHeight: 1.45 };
const interventionReason = { margin: 0, fontSize: 11, lineHeight: 1.55 };
const confidenceChip = {
  borderRadius: 999,
  padding: "6px 8px",
  fontSize: 10,
  fontWeight: 800,
  whiteSpace: "nowrap",
};
const interventionFooter = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" };
const metaChip = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "5px 8px",
  fontSize: 10,
  fontWeight: 700,
};
const openLink = { textDecoration: "none", fontSize: 11, fontWeight: 800 };
const actionRail = { display: "flex", gap: 8, flexWrap: "wrap" };
const runSummary = { borderRadius: 18, padding: "14px 14px 12px", display: "grid", gap: 4 };
const runTitle = { margin: 0, fontSize: 13, fontWeight: 800 };
const runMeta = { margin: 0, fontSize: 11 };
const stateBox = { borderRadius: 18, padding: "16px 14px", display: "grid", gap: 6 };
const stateTitle = { margin: 0, fontSize: 13, fontWeight: 800 };
const stateDescription = { margin: 0, fontSize: 12, lineHeight: 1.6 };
const loadingMetricStack = { display: "grid", gap: 8 };
const loadingBarLarge = { width: "44%", height: 30, borderRadius: 999, animation: "glow 1.8s ease-in-out infinite" };
const loadingBarMedium = { width: "68%", height: 12, borderRadius: 999, animation: "glow 1.8s ease-in-out infinite" };
const loadingGrid = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 };
const loadingMetricCard = { height: 84, borderRadius: 16, animation: "glow 1.8s ease-in-out infinite" };
const icon14 = { width: 14, height: 14 };
