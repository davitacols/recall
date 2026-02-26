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
            panel: "#171215",
            border: "rgba(255,225,193,0.14)",
            text: "#f4ece0",
            muted: "#baa892",
            accent: "#ffb476",
            good: "#66d5ab",
            warn: "#f59e0b",
            bad: "#ef4444",
          }
        : {
            panel: "#fffaf3",
            border: "#eadfce",
            text: "#231814",
            muted: "#7d6d5a",
            accent: "#d9692e",
            good: "#1f8f66",
            warn: "#b45309",
            bad: "#b91c1c",
          },
    [darkMode]
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setError("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(buildApiUrl("/api/knowledge/ai/mission-control/"), {
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
        setData(null);
        setError(message);
        return;
      }
      const result = await response.json();
      setData(result);
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
        <p style={{ margin: "2px 0 0", fontSize: 12, color: statusColor, fontWeight: 700 }}>{status.toUpperCase()}</p>
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
