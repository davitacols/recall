import React, { useEffect, useMemo, useState } from "react";
import { CalendarIcon, ChartBarIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";
import api from "../services/api";
import { useToast } from "../components/Toast";
import BrandedTechnicalIllustration from "../components/BrandedTechnicalIllustration";
import { WorkspaceEmptyState, WorkspaceHero, WorkspacePanel } from "../components/WorkspaceChrome";

export default function Analytics() {
  const { darkMode } = useTheme();
  const { addToast } = useToast();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/business/analytics/");
      setAnalytics(res.data);
    } catch (error) {
      addToast("Failed to load analytics", "error");
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    {
      label: "Goals",
      value: analytics?.goals?.total ?? "--",
      helper: `+${analytics?.goals?.recent || 0} this week`,
      tone: palette.good,
    },
    {
      label: "Meetings",
      value: analytics?.meetings?.total ?? "--",
      helper: `${analytics?.meetings?.upcoming || 0} upcoming`,
      tone: palette.info,
    },
    {
      label: "Tasks",
      value: analytics?.tasks?.total ?? "--",
      helper: `+${analytics?.tasks?.recent || 0} this week`,
      tone: palette.accent,
    },
  ];

  return (
    <div style={{ ...ui.container, display: "grid", gap: 14 }}>
      <WorkspaceHero
        palette={palette}
        darkMode={darkMode}
        eyebrow="Business Analytics"
        title="Business Performance Snapshot"
        description="Goals, meetings, and execution progress in one command view."
        stats={stats}
        actions={
          <button onClick={loadAnalytics} className="ui-btn-polish ui-focus-ring" style={ui.primaryButton}>
            Refresh analytics
          </button>
        }
        aside={<BrandedTechnicalIllustration darkMode={darkMode} compact />}
      />

      {loading ? (
        <WorkspacePanel palette={palette} title="Loading analytics" description="Pulling the latest business metrics and breakdowns.">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
            {[1, 2, 3, 4].map((item) => (
              <div key={item} style={{ height: 132, borderRadius: 18, border: `1px solid ${palette.border}`, background: palette.cardAlt, opacity: 0.76 }} />
            ))}
          </div>
        </WorkspacePanel>
      ) : null}

      {!loading && !analytics ? (
        <WorkspacePanel palette={palette} title="Analytics unavailable">
          <WorkspaceEmptyState
            palette={palette}
            title="No analytics data loaded"
            description="Try refreshing the page after the business analytics endpoint is available."
            action={
              <button onClick={loadAnalytics} className="ui-btn-polish ui-focus-ring" style={ui.primaryButton}>
                Retry
              </button>
            }
          />
        </WorkspacePanel>
      ) : null}

      {!loading && analytics ? (
        <>
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
            <SummaryCard icon={CheckCircleIcon} label="Goals" value={analytics.goals?.total || 0} sub={`+${analytics.goals?.recent || 0} this week`} palette={palette} />
            <SummaryCard icon={CalendarIcon} label="Meetings" value={analytics.meetings?.total || 0} sub={`${analytics.meetings?.upcoming || 0} upcoming`} palette={palette} />
            <SummaryCard icon={ChartBarIcon} label="Tasks" value={analytics.tasks?.total || 0} sub={`+${analytics.tasks?.recent || 0} this week`} palette={palette} />
          </section>

          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14 }}>
            <WorkspacePanel
              palette={palette}
              eyebrow="Goal Health"
              title="Goals by Status"
              description="A quick view of how active objectives are moving through the business workspace."
            >
              <BreakdownCard rows={analytics.goals?.by_status || {}} colorMap={statusColorMap(palette)} palette={palette} />
            </WorkspacePanel>

            <WorkspacePanel
              palette={palette}
              eyebrow="Execution"
              title="Tasks by Status"
              description="Monitor how work is distributed between to-do, in-progress, and complete."
            >
              <BreakdownCard rows={analytics.tasks?.by_status || {}} colorMap={statusColorMap(palette)} palette={palette} />
            </WorkspacePanel>
          </section>

          <WorkspacePanel
            palette={palette}
            eyebrow="Priority Load"
            title="Tasks by Priority"
            description="See whether high-priority work is dominating the queue."
          >
            <BreakdownCard rows={analytics.tasks?.by_priority || {}} colorMap={priorityColorMap(palette)} cols={4} palette={palette} />
          </WorkspacePanel>
        </>
      ) : null}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, sub, palette }) {
  return (
    <article
      className="ui-card-lift ui-smooth"
      style={{ borderRadius: 18, padding: 14, border: `1px solid ${palette.border}`, background: palette.cardAlt }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <Icon style={{ width: 18, height: 18, color: palette.info }} />
        <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: palette.text }}>{value}</p>
      </div>
      <p style={{ margin: 0, fontSize: 12, color: palette.muted, fontWeight: 700 }}>{label}</p>
      <p style={{ margin: "4px 0 0", fontSize: 11, color: palette.muted }}>{sub}</p>
    </article>
  );
}

function BreakdownCard({ rows, colorMap, cols = 4, palette }) {
  const entries = Object.entries(rows || {});

  if (!entries.length) {
    return (
      <WorkspaceEmptyState
        palette={palette}
        title="No data yet"
        description="This metric will populate once the analytics endpoint returns grouped counts."
      />
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(90px,1fr))`, gap: 10 }}>
      {entries.map(([key, count]) => (
        <div
          key={key}
          style={{ borderRadius: 16, border: `1px solid ${palette.border}`, background: palette.cardAlt, padding: 12, textAlign: "center" }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 999,
              background: colorMap[key] || palette.muted,
              margin: "0 auto 8px",
              display: "grid",
              placeItems: "center",
              color: palette.buttonText,
              fontWeight: 800,
              fontSize: 16,
            }}
          >
            {count}
          </div>
          <p style={{ margin: 0, fontSize: 11, color: palette.muted, textTransform: "capitalize" }}>{key.replace("_", " ")}</p>
        </div>
      ))}
    </div>
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
