import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { buildApiUrl } from "../utils/apiBase";

export default function MissionControlPanel({ darkMode }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const palette = useMemo(
    () =>
      darkMode
        ? {
            panel: "rgba(16, 24, 31, 0.82)",
            border: "rgba(174, 210, 234, 0.2)",
            text: "#e8f0f6",
            muted: "#9fb2c3",
            accent: "#5aaee7",
            good: "#49bf8f",
            warn: "#d6aa57",
            bad: "#ef4444",
          }
        : {
            panel: "rgba(255, 255, 255, 0.82)",
            border: "rgba(83, 126, 157, 0.24)",
            text: "#0e2434",
            muted: "#4a6578",
            accent: "#2f80b8",
            good: "#2a8c67",
            warn: "#9b6c2f",
            bad: "#b91c1c",
          },
    [darkMode]
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

      // Fallback to chief-of-staff plan when mission-control endpoint fails.
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
    } catch (error) {
      setData(null);
      setError("Unable to load Mission Control data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  if (!data) {
    return (
      <article style={{ borderRadius: 14, border: `1px solid ${palette.border}`, background: palette.panel, padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <h3 style={{ margin: 0, fontSize: 14, color: palette.text }}>Mission Control</h3>
          <button
            onClick={fetchData}
            style={{ border: `1px solid ${palette.border}`, borderRadius: 8, background: "transparent", color: palette.text, fontSize: 11, padding: "5px 8px", cursor: "pointer" }}
          >
            Retry
          </button>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: palette.bad }}>
          {error || "No Mission Control data available."}
        </p>
      </article>
    );
  }

  const status = data.north_star?.status || "watch";
  const statusColor = status === "stable" ? palette.good : status === "watch" ? palette.warn : palette.bad;

  return (
    <article style={{ borderRadius: 14, border: `1px solid ${palette.border}`, background: palette.panel, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontSize: 14, color: palette.text }}>Mission Control</h3>
        <button
          onClick={fetchData}
          style={{ border: `1px solid ${palette.border}`, borderRadius: 8, background: "transparent", color: palette.text, fontSize: 11, padding: "5px 8px", cursor: "pointer" }}
        >
          Refresh
        </button>
      </div>

      <div style={{ borderRadius: 10, border: `1px solid ${palette.border}`, padding: 10, marginBottom: 8 }}>
        <p style={{ margin: 0, fontSize: 11, color: palette.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Critical Path Score</p>
        <p style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 800, color: palette.text }}>{data.north_star?.critical_path_score ?? "--"}</p>
        <p style={{ margin: "2px 0 0", fontSize: 12, color: statusColor, fontWeight: 700 }}>
          {status.toUpperCase()} {data.degraded ? "(FALLBACK)" : ""}
        </p>
        <p style={{ margin: "6px 0 0", fontSize: 12, color: palette.muted }}>{data.north_star?.summary}</p>
      </div>

      <div style={{ borderRadius: 10, border: `1px solid ${palette.border}`, padding: 10, marginBottom: 8 }}>
        <p style={{ margin: "0 0 6px", fontSize: 12, color: palette.text, fontWeight: 700 }}>Top Autonomous Actions</p>
        {(data.autonomous_actions || []).slice(0, 3).map((action, idx) => (
          <div key={idx} style={{ marginBottom: 6, paddingBottom: 6, borderBottom: idx < 2 ? `1px solid ${palette.border}` : "none" }}>
            <p style={{ margin: 0, fontSize: 12, color: palette.text, fontWeight: 700 }}>{action.title}</p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: palette.muted }}>
              {action.impact_estimate} impact | {action.time_to_value_hours}h | {action.confidence}% confidence
            </p>
            <Link to={action.url || "/"} style={{ fontSize: 11, color: palette.accent, textDecoration: "none" }}>
              Open
            </Link>
          </div>
        ))}
      </div>

      <div style={{ borderRadius: 10, border: `1px solid ${palette.border}`, padding: 10 }}>
        <p style={{ margin: 0, fontSize: 12, color: palette.text, fontWeight: 700 }}>24h Simulation</p>
        <p style={{ margin: "5px 0 0", fontSize: 12, color: palette.muted }}>
          Projected score: <span style={{ color: palette.text, fontWeight: 700 }}>{data.simulation_24h?.projected_critical_path_score ?? "--"}</span>
        </p>
        <p style={{ margin: "3px 0 0", fontSize: 12, color: palette.muted }}>
          On-track probability: <span style={{ color: palette.text, fontWeight: 700 }}>{data.simulation_24h?.probability_on_track_pct ?? "--"}%</span>
        </p>
      </div>
    </article>
  );
}
