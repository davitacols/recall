import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";
import { WorkspaceEmptyState, WorkspaceHero, WorkspacePanel, WorkspaceToolbar } from "../components/WorkspaceChrome";
import api from "../services/api";

function RetrospectiveMemory() {
  const { darkMode } = useTheme();
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      const response = await api.get("/api/agile/rca/recurring/?days=90");
      setInsights(response.data);
    } catch (error) {
      console.error("Failed to fetch insights:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ ...ui.container, display: "grid", placeItems: "center", minHeight: 360 }}>
        <div style={{ width: 24, height: 24, borderRadius: "50%", border: `2px solid ${palette.border}`, borderTopColor: palette.accent }} />
      </div>
    );
  }

  if (!insights) {
    return (
      <div style={{ ...ui.container, display: "grid", placeItems: "center", minHeight: 360 }}>
        <div style={{ color: palette.muted }}>Failed to load retrospective data</div>
      </div>
    );
  }

  const recurringCount = insights.top_causes?.length || 0;
  const blockerPatternCount = insights.blocker_patterns?.length || 0;
  const recommendationCount = insights.recommendations?.length || 0;
  const highestRisk = insights.top_causes?.[0]?.risk_score || 0;
  const retrosPulse =
    recurringCount === 0
      ? "No recurring retrospective themes have been detected yet."
      : `${recurringCount} recurring cause${recurringCount === 1 ? "" : "s"} are showing up in sprint reviews and should shape process improvements.`;

  return (
    <div style={{ ...ui.container, display: "grid", gap: 12, fontFamily: "'Sora', 'Space Grotesk', 'Segoe UI', sans-serif" }}>
      <WorkspaceHero
        palette={palette}
        darkMode={darkMode}
        variant="execution"
        eyebrow="RCA Memory"
        title="Retrospectives"
        description="Not a meeting replacement, but a persistent review memory for recurring causes, blocker patterns, and recommended improvements."
        stats={[
          { label: "Recurring causes", value: recurringCount, helper: "Themes repeating across sprint reviews." },
          { label: "Blocker patterns", value: blockerPatternCount, helper: "Recurring blocker types found in retrospectives." },
          { label: "Actions", value: recommendationCount, helper: "Recommended follow-through items from the memory layer." },
          { label: "Top risk", value: highestRisk, helper: "Highest current retrospective risk score." },
        ]}
        aside={
          <div
            style={{
              ...spotlightCard,
              border: `1px solid ${palette.border}`,
              background: darkMode
                ? "linear-gradient(145deg, rgba(29,24,20,0.96), rgba(20,17,14,0.88))"
                : "linear-gradient(145deg, rgba(255,252,248,0.98), rgba(245,239,229,0.9))",
            }}
          >
            <p style={{ ...spotlightEyebrow, color: palette.muted }}>Review pulse</p>
            <h3 style={{ margin: 0, fontSize: 22, lineHeight: 1.05, color: palette.text }}>
              {recurringCount === 0 ? "No patterns yet" : `${recurringCount} patterns in memory`}
            </h3>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: palette.muted }}>{retrosPulse}</p>
          </div>
        }
        actions={
          <Link to="/sprint-history" className="ui-btn-polish ui-focus-ring" style={{ ...ui.secondaryButton, textDecoration: "none" }}>
            Open Sprint History
          </Link>
        }
      />

      <WorkspaceToolbar palette={palette} darkMode={darkMode} variant="execution">
        <div style={toolbarLayout}>
          <div style={toolbarIntro}>
            <p style={{ ...toolbarEyebrow, color: palette.muted }}>Review guide</p>
            <h2 style={{ ...toolbarTitle, color: palette.text }}>Use retrospective memory to turn repeated pain into changes the team actually carries forward</h2>
            <p style={{ ...toolbarCopy, color: palette.muted }}>
              This surface is best used after sprint review. Scan repeated causes, connect blocker patterns, and translate them into durable operating changes.
            </p>
          </div>
          <div style={toolbarChipRail}>
            <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
              {recurringCount} recurring causes
            </span>
            <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
              {blockerPatternCount} blocker patterns
            </span>
            <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
              {recommendationCount} actions suggested
            </span>
          </div>
        </div>
      </WorkspaceToolbar>

      {insights.top_causes && insights.top_causes.length > 0 ? (
        <WorkspacePanel
          palette={palette}
          darkMode={darkMode}
          variant="execution"
          eyebrow="Recurring causes"
          title="Themes repeating across retrospectives"
          description="These themes are showing up often enough that they should shape process changes, not just meeting notes."
        >
          <div style={{ display: "grid", gap: 8 }}>
            {insights.top_causes.map((issue, idx) => (
              <article key={idx} style={{ border: `1px solid ${palette.border}`, background: palette.cardAlt, borderRadius: 20, padding: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: palette.text }}>{issue.keyword}</span>
                  <span style={{ padding: "4px 10px", borderRadius: 999, background: palette.warn, color: "#fff", fontSize: 11, fontWeight: 700 }}>
                    risk {issue.risk_score}
                  </span>
                </div>
                <p style={{ margin: "8px 0 0", fontSize: 12, color: palette.muted, lineHeight: 1.55 }}>
                  Mentions: {issue.mentions} | Affected sprints: {issue.affected_sprints} | Recurrence rate: {issue.recurrence_rate}
                </p>
              </article>
            ))}
          </div>
        </WorkspacePanel>
      ) : (
        <WorkspaceEmptyState
          palette={palette}
          darkMode={darkMode}
          variant="execution"
          title="No patterns detected yet"
          description="Run more retrospectives to detect recurring issues and start building review memory."
        />
      )}

      {insights.blocker_patterns && insights.blocker_patterns.length > 0 ? (
        <WorkspacePanel
          palette={palette}
          darkMode={darkMode}
          variant="execution"
          eyebrow="Blocker patterns"
          title="Recurring blocker patterns"
          description="Blocker types that are repeating in review memory and should likely feed process improvement."
        >
          <div style={{ display: "grid", gap: 7 }}>
            {insights.blocker_patterns.map((item, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", marginTop: 6, background: palette.text }} />
                <span style={{ fontSize: 13, color: palette.muted }}>
                  {item.blocker_type}: {item.count} blockers (avg {item.avg_days_open} days open)
                </span>
              </div>
            ))}
          </div>
        </WorkspacePanel>
      ) : null}

      {insights.recommendations && insights.recommendations.length > 0 ? (
        <WorkspacePanel
          palette={palette}
          darkMode={darkMode}
          variant="execution"
          eyebrow="Recommended actions"
          title="Follow-through worth carrying into the next cycle"
          description="These are the clearest next actions emerging from retrospective memory."
        >
          <div style={{ display: "grid", gap: 7 }}>
            {insights.recommendations.map((item, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", marginTop: 6, background: palette.accent }} />
                <span style={{ fontSize: 13, color: palette.muted }}>{item}</span>
              </div>
            ))}
          </div>
        </WorkspacePanel>
      ) : null}
    </div>
  );
}

const spotlightCard = { minWidth: 240, borderRadius: 24, padding: 16, display: "grid", gap: 10 };
const spotlightEyebrow = { margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" };
const toolbarLayout = { display: "grid", gap: 14 };
const toolbarIntro = { display: "grid", gap: 4 };
const toolbarEyebrow = { margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" };
const toolbarTitle = { margin: 0, fontSize: 24, lineHeight: 1.04 };
const toolbarCopy = { margin: 0, fontSize: 13, lineHeight: 1.65, maxWidth: 760 };
const toolbarChipRail = { display: "flex", gap: 8, flexWrap: "wrap" };
const toolbarChip = { display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "8px 12px", fontSize: 12, fontWeight: 700 };

export default RetrospectiveMemory;
