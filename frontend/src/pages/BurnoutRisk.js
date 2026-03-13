import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";
import BrandedTechnicalIllustration from "../components/BrandedTechnicalIllustration";
import { WorkspaceEmptyState, WorkspaceHero, WorkspacePanel, WorkspaceToolbar } from "../components/WorkspaceChrome";

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

  const stats = [
    {
      label: "Users Evaluated",
      value: data.users_evaluated || 0,
      helper: "Members assessed during the current window",
      tone: palette.info,
    },
    {
      label: "High Risk",
      value: data.high_risk_count || 0,
      helper: "People with elevated burnout indicators",
      tone: (data.high_risk_count || 0) > 0 ? palette.danger : palette.good,
    },
    {
      label: "Window",
      value: `${days}d`,
      helper: "Active analysis window",
      tone: palette.warn,
    },
  ];

  return (
    <div style={{ ...ui.container, display: "grid", gap: 14 }}>
      <WorkspaceHero
        palette={palette}
        darkMode={darkMode}
        eyebrow="Team Health"
        title="Burnout Risk Radar"
        description="Track risk signals from open load, overdue work, meetings, and concern markers."
        stats={stats}
        actions={
          <button onClick={() => loadRisk(days)} className="ui-btn-polish ui-focus-ring" style={ui.primaryButton}>
            Refresh risk data
          </button>
        }
        aside={<BrandedTechnicalIllustration darkMode={darkMode} compact />}
      />

      <WorkspaceToolbar palette={palette}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: palette.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Analysis Window
          </span>
          <select value={days} onChange={(event) => setDays(Number(event.target.value))} style={{ ...ui.input, width: "auto", minWidth: 150 }}>
            {DAY_OPTIONS.map((value) => (
              <option key={value} value={value}>
                Last {value} days
              </option>
            ))}
          </select>
        </div>
      </WorkspaceToolbar>

      {error ? (
        <div
          style={{
            borderRadius: 16,
            border: `1px solid ${palette.danger}`,
            background: palette.card,
            padding: 12,
            color: palette.danger,
            fontSize: 12,
          }}
        >
          {error}
        </div>
      ) : null}

      <WorkspacePanel
        palette={palette}
        eyebrow="Risk Table"
        title="Current burnout indicators"
        description="Monitor overload, overdue work, meeting load, and concern reactions for the selected period."
      >
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
                    <td style={{ padding: "10px 6px", borderBottom: `1px solid ${palette.border}`, color: palette.text, fontSize: 13 }}>
                      {row.name || `User ${row.user_id}`}
                    </td>
                    <td style={{ padding: "10px 6px", borderBottom: `1px solid ${palette.border}`, fontSize: 12 }}>
                      <span style={{ color: riskColor(row.risk_level, palette), fontWeight: 800 }}>
                        {row.risk_level} ({row.risk_score})
                      </span>
                    </td>
                    <td style={{ padding: "10px 6px", borderBottom: `1px solid ${palette.border}`, color: palette.text, fontSize: 12 }}>
                      {row.signals?.open_tasks || 0}
                    </td>
                    <td style={{ padding: "10px 6px", borderBottom: `1px solid ${palette.border}`, color: palette.text, fontSize: 12 }}>
                      {row.signals?.overdue_tasks || 0}
                    </td>
                    <td style={{ padding: "10px 6px", borderBottom: `1px solid ${palette.border}`, color: palette.text, fontSize: 12 }}>
                      {row.signals?.meeting_hours_last_period || 0}
                    </td>
                    <td style={{ padding: "10px 6px", borderBottom: `1px solid ${palette.border}`, color: palette.text, fontSize: 12 }}>
                      {row.signals?.concern_reactions_last_period || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <WorkspaceEmptyState
            palette={palette}
            title="No risk records available"
            description="No burnout risk records were returned for this analysis window."
          />
        )}
      </WorkspacePanel>
    </div>
  );
}
