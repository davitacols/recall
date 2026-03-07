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
        <section style={{ borderRadius: 16, border: `1px solid ${palette.border}`, background: palette.card, padding: 16, marginBottom: 12 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: palette.muted }}>BUSINESS ANALYTICS</p>
          <h1 style={{ margin: "8px 0 4px", fontSize: "clamp(1.2rem,2.1vw,1.8rem)", color: palette.text, letterSpacing: "-0.02em" }}>Analytics</h1>
          <p style={{ margin: 0, fontSize: 13, color: palette.muted }}>Goals, meetings, and task delivery in one operational view.</p>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 8, marginBottom: 12 }}>
          <SummaryCard icon={CheckCircleIcon} label="Goals" value={analytics.goals?.total || 0} sub={`+${analytics.goals?.recent || 0} this week`} />
          <SummaryCard icon={CalendarIcon} label="Meetings" value={analytics.meetings?.total || 0} sub={`${analytics.meetings?.upcoming || 0} upcoming`} />
          <SummaryCard icon={ChartBarIcon} label="Tasks" value={analytics.tasks?.total || 0} sub={`+${analytics.tasks?.recent || 0} this week`} />
        </section>

        <section style={ui.responsiveSplit}>
          <BreakdownCard title="Goals by Status" rows={analytics.goals?.by_status || {}} colorMap={statusColorMap} />
          <BreakdownCard title="Tasks by Status" rows={analytics.tasks?.by_status || {}} colorMap={statusColorMap} />
        </section>

        <section style={{ marginTop: 10 }}>
          <BreakdownCard title="Tasks by Priority" rows={analytics.tasks?.by_priority || {}} colorMap={priorityColorMap} cols={4} />
        </section>
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, sub }) {
  return (
    <article style={{ borderRadius: 12, padding: 12, border: "1px solid var(--app-border-strong)", background: "var(--app-surface-alt)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <Icon style={{ width: 18, height: 18, color: "var(--app-link)" }} />
        <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "var(--app-text)" }}>{value}</p>
      </div>
      <p style={{ margin: 0, fontSize: 12, color: "var(--app-muted)", fontWeight: 700 }}>{label}</p>
      <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--app-muted)" }}>{sub}</p>
    </article>
  );
}

function BreakdownCard({ title, rows, colorMap, cols = 4 }) {
  const entries = Object.entries(rows || {});

  return (
    <article style={{ borderRadius: 12, border: "1px solid var(--app-border)", background: "var(--app-surface)", padding: 12 }}>
      <h2 style={{ margin: "0 0 10px", fontSize: 16, color: "var(--app-text)" }}>{title}</h2>
      {entries.length === 0 ? (
        <p style={{ margin: 0, fontSize: 12, color: "var(--app-muted)" }}>No data</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(90px,1fr))`, gap: 8 }}>
          {entries.map(([key, count]) => (
            <div key={key} style={{ borderRadius: 10, border: "1px solid var(--app-border-strong)", background: "var(--app-surface-alt)", padding: 10, textAlign: "center" }}>
              <div style={{ width: 44, height: 44, borderRadius: 999, background: colorMap[key] || "var(--app-muted)", margin: "0 auto 6px", display: "grid", placeItems: "center", color: "var(--app-surface-alt)", fontWeight: 800, fontSize: 16 }}>
                {count}
              </div>
              <p style={{ margin: 0, fontSize: 11, color: "var(--app-muted)", textTransform: "capitalize" }}>{key.replace("_", " ")}</p>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

const statusColorMap = {
  not_started: "var(--app-muted)",
  in_progress: "var(--app-info)",
  completed: "var(--app-success)",
  on_hold: "var(--app-warning)",
  todo: "var(--app-muted)",
  done: "var(--app-success)",
};

const priorityColorMap = {
  low: "var(--app-muted)",
  medium: "var(--app-info)",
  high: "var(--app-warning)",
  critical: "var(--app-danger)",
};

