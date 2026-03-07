import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";

const DAY_OPTIONS = [7, 14, 30];

function riskColor(level, palette) {
  if (level === "high") return palette.danger;
  if (level === "medium") return palette.warn;
  return palette.success;
}

export default function BurnoutRisk() {
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const [days, setDays] = useState(14);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ results: [], high_risk_count: 0, users_evaluated: 0 });
  const [error, setError] = useState("");

  useEffect(() => {
    loadRisk(days);
  }, [days]);

  const loadRisk = async (windowDays) => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/api/business/team/burnout-risk/", {
        params: { days: windowDays },
      });
      setData(response.data || { results: [] });
    } catch (loadError) {
      setError(loadError?.response?.data?.error || "Failed to load burnout risk data.");
      setData({ results: [], high_risk_count: 0, users_evaluated: 0 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={ui.container}>
        <section style={{ borderRadius: 16, border: `1px solid ${palette.border}`, background: palette.card, padding: 16, marginBottom: 12 }}>
          <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.12em", fontWeight: 700, color: palette.muted }}>TEAM HEALTH</p>
          <h1 style={{ margin: "8px 0 4px", fontSize: "clamp(1.5rem,3vw,2.2rem)", color: palette.text, letterSpacing: "-0.02em" }}>
            Burnout Risk Radar
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: palette.muted }}>
            Track risk signals from open load, overdue work, meetings, and concern markers.
          </p>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 8, marginBottom: 12 }}>
          <MetricCard label="Users Evaluated" value={data.users_evaluated || 0} palette={palette} />
          <MetricCard label="High Risk" value={data.high_risk_count || 0} color={palette.danger} palette={palette} />
          <article style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.card, padding: 12 }}>
            <p style={{ margin: 0, fontSize: 11, color: palette.muted }}>Window</p>
            <select value={days} onChange={(event) => setDays(Number(event.target.value))} style={{ ...ui.input, marginTop: 8 }}>
              {DAY_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  Last {value} days
                </option>
              ))}
            </select>
          </article>
        </section>

        {error ? (
          <div style={{ borderRadius: 12, border: `1px solid ${palette.error}`, background: palette.card, padding: 10, color: palette.error, marginBottom: 10, fontSize: 12 }}>
            {error}
          </div>
        ) : null}

        <section style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.card, padding: 10 }}>
          {loading ? (
            <p style={{ margin: 0, color: palette.muted, fontSize: 12 }}>Loading risk data...</p>
          ) : data.results?.length ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
                <thead>
                  <tr>
                    {["Member", "Risk", "Open", "Overdue", "Meeting Hrs", "Concern Reactions"].map((column) => (
                      <th
                        key={column}
                        style={{
                          textAlign: "left",
                          borderBottom: `1px solid ${palette.border}`,
                          padding: "8px 6px",
                          color: palette.muted,
                          fontSize: 11,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                        }}
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.results.map((row) => (
                    <tr key={row.user_id}>
                      <td style={{ padding: "9px 6px", borderBottom: `1px solid ${palette.border}`, color: palette.text, fontSize: 13 }}>
                        {row.name || `User ${row.user_id}`}
                      </td>
                      <td style={{ padding: "9px 6px", borderBottom: `1px solid ${palette.border}`, fontSize: 12 }}>
                        <span style={{ color: riskColor(row.risk_level, palette), fontWeight: 700 }}>
                          {row.risk_level} ({row.risk_score})
                        </span>
                      </td>
                      <td style={{ padding: "9px 6px", borderBottom: `1px solid ${palette.border}`, color: palette.text, fontSize: 12 }}>
                        {row.signals?.open_tasks || 0}
                      </td>
                      <td style={{ padding: "9px 6px", borderBottom: `1px solid ${palette.border}`, color: palette.text, fontSize: 12 }}>
                        {row.signals?.overdue_tasks || 0}
                      </td>
                      <td style={{ padding: "9px 6px", borderBottom: `1px solid ${palette.border}`, color: palette.text, fontSize: 12 }}>
                        {row.signals?.meeting_hours_last_period || 0}
                      </td>
                      <td style={{ padding: "9px 6px", borderBottom: `1px solid ${palette.border}`, color: palette.text, fontSize: 12 }}>
                        {row.signals?.concern_reactions_last_period || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ margin: 0, color: palette.muted, fontSize: 12 }}>No risk records available for this window.</p>
          )}
        </section>
      </div>
    </div>
  );
}

function MetricCard({ label, value, color, palette }) {
  return (
    <article style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.cardAlt, padding: 12 }}>
      <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: color || palette.text }}>{value}</p>
      <p style={{ margin: "4px 0 0", fontSize: 11, color: palette.muted }}>{label}</p>
    </article>
  );
}
