import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowPathIcon,
  BoltIcon,
  ClockIcon,
  ExclamationTriangleIcon,
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

export default function MissionControlPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
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
    fetchData();
  }, []);

  const mapPlanToMissionControl = (plan) => {
    const readiness = Number(plan?.readiness_score ?? 50);
    const status = plan?.status || "watch";
    const summary =
      status === "stable"
        ? "Execution is healthy based on chief-of-staff readiness."
        : status === "watch"
        ? "Execution risk is rising; intervention is recommended."
        : "Critical execution risk detected; immediate intervention required.";

    const interventions = Array.isArray(plan?.interventions) ? plan.interventions : [];
    const autonomousActions = interventions.map((item) => ({
      title: item.title,
      impact_estimate: item.impact || "medium",
      time_to_value_hours: 8,
      confidence: item.confidence || 70,
      url: item.url || "/",
    }));

    const projected = Math.max(5, Math.min(99, readiness + Math.min(20, interventions.length * 3)));
    return {
      generated_at: plan?.generated_at,
      north_star: {
        critical_path_score: readiness,
        status,
        summary,
      },
      autonomous_actions: autonomousActions,
      simulation_24h: {
        projected_critical_path_score: projected,
        probability_on_track_pct: Math.max(10, Math.min(98, projected - 2)),
      },
      evidence: [],
      degraded: true,
      fallback_source: "chief_of_staff_plan",
    };
  };

  const readJsonSafe = async (response, fallback = null) => {
    try {
      const text = await response.text();
      if (!text) return fallback;
      return JSON.parse(text);
    } catch (_e) {
      return fallback;
    }
  };

  const fetchData = async () => {
    setError("");
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const missionResponse = await fetch(buildApiUrl("/api/knowledge/ai/mission-control/"), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (missionResponse.ok) {
        const missionBody = await readJsonSafe(missionResponse, null);
        if (missionBody) {
          setData(missionBody);
          return;
        }
      }

      const planResponse = await fetch(buildApiUrl("/api/knowledge/ai/chief-of-staff/plan/"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (planResponse.ok) {
        const planBody = await readJsonSafe(planResponse, null);
        if (planBody) {
          setData(mapPlanToMissionControl(planBody));
          setError("Mission Control fallback mode is active.");
          return;
        }
      }

      const missionErr = await readJsonSafe(missionResponse, null);
      const planErr = await readJsonSafe(planResponse, null);
      const message =
        missionErr?.error ||
        missionErr?.detail ||
        planErr?.error ||
        planErr?.detail ||
        `Mission Control unavailable (${missionResponse.status}/${planResponse.status})`;
      setData(null);
      setError(message);
    } catch (_error) {
      setData(null);
      setError("Unable to load Mission Control data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section style={shell}>
        <div style={headerRow}>
          <div style={titleStack}>
            <p style={{ ...eyebrow, color: palette.muted }}>Execution Pulse</p>
            <h3 style={{ ...title, color: palette.text }}>Mission Control</h3>
          </div>
          <div style={{ ...ghostChip, border: `1px solid ${palette.border}`, color: palette.muted, background: palette.cardAlt }}>
            Syncing
          </div>
        </div>

        <div style={{ ...heroPanel, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
          <div style={loadingMetricStack}>
            <div style={{ ...loadingBarLarge, background: palette.panel }} />
            <div style={{ ...loadingBarMedium, background: palette.panel }} />
            <div style={{ ...loadingBarSmall, background: palette.panel }} />
          </div>
          <div style={loadingGrid}>
            <div style={{ ...loadingMetricCard, border: `1px solid ${palette.border}`, background: palette.panel }} />
            <div style={{ ...loadingMetricCard, border: `1px solid ${palette.border}`, background: palette.panel }} />
          </div>
        </div>
      </section>
    );
  }

  if (!data) {
    return (
      <section style={shell}>
        <div style={headerRow}>
          <div style={titleStack}>
            <p style={{ ...eyebrow, color: palette.muted }}>Execution Pulse</p>
            <h3 style={{ ...title, color: palette.text }}>Mission Control</h3>
          </div>
          <button
            className="ui-btn-polish ui-focus-ring"
            onClick={fetchData}
            style={{ ...ghostButton, border: `1px solid ${palette.border}`, color: palette.text, background: palette.cardAlt }}
          >
            <ArrowPathIcon style={icon14} />
            Retry
          </button>
        </div>
        <StateBox
          palette={palette}
          tone="danger"
          title="Mission Control is offline"
          description={error || "No Mission Control data available right now."}
        />
      </section>
    );
  }

  const status = data.north_star?.status || "watch";
  const statusMeta = getStatusMeta(status, palette);
  const actions = (data.autonomous_actions || []).slice(0, 3);

  return (
    <section style={shell}>
      <div style={headerRow}>
        <div style={titleStack}>
          <p style={{ ...eyebrow, color: palette.muted }}>Execution Pulse</p>
          <h3 style={{ ...title, color: palette.text }}>Mission Control</h3>
        </div>
        <button
          className="ui-btn-polish ui-focus-ring"
          onClick={fetchData}
          style={{ ...ghostButton, border: `1px solid ${palette.border}`, color: palette.text, background: palette.cardAlt }}
        >
          <ArrowPathIcon style={icon14} />
          Refresh
        </button>
      </div>

      {error ? (
        <div style={{ ...notice, border: `1px solid ${palette.border}`, background: statusMeta.soft, color: statusMeta.color }}>
          <ExclamationTriangleIcon style={icon14} />
          {error}
        </div>
      ) : null}

      <div style={{ ...heroPanel, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
        <div style={heroMain}>
          <p style={{ ...metricLabel, color: palette.muted }}>Critical Path Score</p>
          <div style={scoreRow}>
            <p style={{ ...scoreValue, color: palette.text }}>{data.north_star?.critical_path_score ?? "--"}</p>
            <span
              style={{
                ...statusChip,
                border: `1px solid ${statusMeta.color}`,
                color: statusMeta.color,
                background: statusMeta.soft,
              }}
            >
              {statusMeta.label}
              {data.degraded ? " Fallback" : " Live"}
            </span>
          </div>
          <p style={{ ...summary, color: palette.muted }}>{data.north_star?.summary}</p>
        </div>

        <div style={metricRail}>
          <MetricCard
            palette={palette}
            icon={BoltIcon}
            label="Projected 24h"
            value={data.simulation_24h?.projected_critical_path_score ?? "--"}
            tone={palette.accent}
          />
          <MetricCard
            palette={palette}
            icon={ClockIcon}
            label="On-track odds"
            value={`${data.simulation_24h?.probability_on_track_pct ?? "--"}%`}
            tone={palette.good}
          />
        </div>
      </div>

      <div style={sectionBlock}>
        <div style={sectionHeader}>
          <p style={{ ...sectionEyebrow, color: palette.muted }}>Top Autonomous Actions</p>
          <p style={{ ...sectionHelper, color: palette.muted }}>
            Highest-confidence interventions the system would prioritize next.
          </p>
        </div>

        {actions.length ? (
          <div style={actionList}>
            {actions.map((action, index) => (
              <Link
                key={`${action.title}-${index}`}
                to={action.url || "/"}
                className="ui-card-lift ui-smooth"
                style={{ ...actionCard, border: `1px solid ${palette.border}`, background: palette.panel }}
              >
                <div style={actionTop}>
                  <div style={actionTitleWrap}>
                    <p style={{ ...actionTitle, color: palette.text }}>{action.title}</p>
                    <p style={{ ...actionMeta, color: palette.muted }}>
                      {action.impact_estimate} impact
                    </p>
                  </div>
                  <span style={{ ...confidenceChip, background: statusMeta.soft, color: statusMeta.color }}>
                    {action.confidence}% confidence
                  </span>
                </div>
                <div style={actionFooter}>
                  <span style={{ ...metaChip, border: `1px solid ${palette.border}`, color: palette.muted, background: palette.cardAlt }}>
                    <ClockIcon style={icon12} />
                    {action.time_to_value_hours}h
                  </span>
                  <span style={{ ...openLink, color: palette.accent }}>Open</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <StateBox
            palette={palette}
            tone="neutral"
            title="No autonomous actions yet"
            description="Mission Control is ready, but it does not have enough signal to propose next actions right now."
          />
        )}
      </div>
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
const ghostChip = {
  borderRadius: 999,
  padding: "8px 12px",
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};
const notice = {
  borderRadius: 16,
  padding: "10px 12px",
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 12,
  fontWeight: 700,
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
const summary = { margin: 0, fontSize: 12, lineHeight: 1.6 };
const metricRail = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 };
const metricCard = { borderRadius: 16, padding: "12px 12px 10px", display: "grid", gap: 8 };
const metricCardHeader = { display: "flex", alignItems: "center", gap: 6 };
const metricCardLabel = { margin: 0, fontSize: 11, fontWeight: 700 };
const metricCardValue = { margin: 0, fontSize: 22, fontWeight: 800, lineHeight: 1 };
const sectionBlock = { display: "grid", gap: 10 };
const sectionHeader = { display: "grid", gap: 4 };
const sectionEyebrow = { margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" };
const sectionHelper = { margin: 0, fontSize: 12, lineHeight: 1.55 };
const actionList = { display: "grid", gap: 10 };
const actionCard = { borderRadius: 18, padding: "12px 12px 10px", textDecoration: "none", display: "grid", gap: 10 };
const actionTop = { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" };
const actionTitleWrap = { display: "grid", gap: 4, minWidth: 0 };
const actionTitle = { margin: 0, fontSize: 13, fontWeight: 700, lineHeight: 1.45 };
const actionMeta = { margin: 0, fontSize: 11 };
const confidenceChip = {
  borderRadius: 999,
  padding: "6px 8px",
  fontSize: 10,
  fontWeight: 800,
  whiteSpace: "nowrap",
};
const actionFooter = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" };
const metaChip = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  borderRadius: 999,
  padding: "5px 8px",
  fontSize: 10,
  fontWeight: 700,
};
const openLink = { fontSize: 11, fontWeight: 800 };
const stateBox = { borderRadius: 18, padding: "16px 14px", display: "grid", gap: 6 };
const stateTitle = { margin: 0, fontSize: 13, fontWeight: 800 };
const stateDescription = { margin: 0, fontSize: 12, lineHeight: 1.6 };
const loadingMetricStack = { display: "grid", gap: 8 };
const loadingBarLarge = { width: "44%", height: 30, borderRadius: 999, animation: "glow 1.8s ease-in-out infinite" };
const loadingBarMedium = { width: "68%", height: 12, borderRadius: 999, animation: "glow 1.8s ease-in-out infinite" };
const loadingBarSmall = { width: "54%", height: 12, borderRadius: 999, animation: "glow 1.8s ease-in-out infinite" };
const loadingGrid = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 };
const loadingMetricCard = { height: 84, borderRadius: 16, animation: "glow 1.8s ease-in-out infinite" };
const icon12 = { width: 12, height: 12 };
const icon14 = { width: 14, height: 14 };
