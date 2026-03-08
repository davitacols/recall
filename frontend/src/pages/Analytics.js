import React, { useEffect, useMemo, useState } from "react";
import { CalendarIcon, ChartBarIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";
import api from "../services/api";
import { useToast } from "../components/Toast";

export default function Analytics() {
  const { darkMode } = useTheme();
  const { addToast } = useToast();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const res = await api.get("/api/business/analytics/");
      setAnalytics(res.data);
    } catch (error) {
      addToast("Failed to load analytics", "error");
      setAnalytics(null);
    }
  };

  if (!analytics) {
    return (
      <div style={{ minHeight: "100vh" }}>
        <div style={ui.container}>
          <div style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.card, padding: 14, color: palette.muted, fontSize: 13 }}>Loading analytics...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={ui.container}>
        <section style={{ borderRadius: 16, border: `1px solid ${palette.border}`, background: darkMode ? "radial-gradient(circle at 12% 16%, rgba(90,174,231,0.2), rgba(16,24,31,0.85) 58%)" : "radial-gradient(circle at 12% 16%, rgba(47,128,184,0.14), rgba(255,255,255,0.82) 58%)", padding: 16, marginBottom: 12 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: palette.muted }}>BUSINESS ANALYTICS</p>
          <h1 style={{ margin: "8px 0 4px", fontSize: "clamp(1.2rem,2.1vw,1.8rem)", color: palette.text, letterSpacing: "-0.02em" }}>Business Performance Snapshot</h1>
          <p style={{ margin: 0, fontSize: 13, color: palette.muted }}>Goals, meetings, and execution progress in one command view.</p>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 8, marginBottom: 12 }}>
          <SummaryCard icon={CheckCircleIcon} label="Goals" value={analytics.goals?.total || 0} sub={`+${analytics.goals?.recent || 0} this week`} palette={palette} />
          <SummaryCard icon={CalendarIcon} label="Meetings" value={analytics.meetings?.total || 0} sub={`${analytics.meetings?.upcoming || 0} upcoming`} palette={palette} />
          <SummaryCard icon={ChartBarIcon} label="Tasks" value={analytics.tasks?.total || 0} sub={`+${analytics.tasks?.recent || 0} this week`} palette={palette} />
        </section>

        <section style={ui.responsiveSplit}>
          <BreakdownCard title="Goals by Status" rows={analytics.goals?.by_status || {}} colorMap={statusColorMap(palette)} palette={palette} />
          <BreakdownCard title="Tasks by Status" rows={analytics.tasks?.by_status || {}} colorMap={statusColorMap(palette)} palette={palette} />
        </section>

        <section style={{ marginTop: 10 }}>
          <BreakdownCard title="Tasks by Priority" rows={analytics.tasks?.by_priority || {}} colorMap={priorityColorMap(palette)} cols={4} palette={palette} />
        </section>
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, sub, palette }) {
  return (
    <article style={{ borderRadius: 12, padding: 12, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <Icon style={{ width: 18, height: 18, color: palette.info }} />
        <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: palette.text }}>{value}</p>
      </div>
      <p style={{ margin: 0, fontSize: 12, color: palette.muted, fontWeight: 700 }}>{label}</p>
      <p style={{ margin: "4px 0 0", fontSize: 11, color: palette.muted }}>{sub}</p>
    </article>
  );
}

function BreakdownCard({ title, rows, colorMap, cols = 4, palette }) {
  const entries = Object.entries(rows || {});

  return (
    <article style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.card, padding: 12 }}>
      <h2 style={{ margin: "0 0 10px", fontSize: 16, color: palette.text }}>{title}</h2>
      {entries.length === 0 ? (
        <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>No data</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(90px,1fr))`, gap: 8 }}>
          {entries.map(([key, count]) => (
            <div key={key} style={{ borderRadius: 10, border: `1px solid ${palette.border}`, background: palette.cardAlt, padding: 10, textAlign: "center" }}>
              <div style={{ width: 44, height: 44, borderRadius: 999, background: colorMap[key] || palette.muted, margin: "0 auto 6px", display: "grid", placeItems: "center", color: palette.buttonText, fontWeight: 800, fontSize: 16 }}>
                {count}
              </div>
              <p style={{ margin: 0, fontSize: 11, color: palette.muted, textTransform: "capitalize" }}>{key.replace("_", " ")}</p>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

const statusColorMap = (palette) => ({
  not_started: palette.muted,
  in_progress: palette.info,
  completed: palette.success,
  on_hold: palette.warn,
  todo: palette.muted,
  done: palette.success,
});

const priorityColorMap = (palette) => ({
  low: palette.muted,
  medium: palette.info,
  high: palette.warn,
  critical: palette.danger,
});

