import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckBadgeIcon,
  ExclamationTriangleIcon,
  LinkIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import {
  WorkspaceEmptyState,
  WorkspaceHero,
  WorkspacePanel,
} from "../components/WorkspaceChrome";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";
import api from "../services/api";

function scoreTone(score, palette) {
  if (score >= 80) return palette.success;
  if (score >= 60) return palette.info;
  if (score >= 40) return palette.warn;
  return palette.danger;
}

function qualityLabel(score) {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Healthy";
  if (score >= 40) return "Needs work";
  return "Critical";
}

function MetricBar({ label, value, palette }) {
  return (
    <div style={{ display: "grid", gap: 5 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <span style={{ fontSize: 12, color: palette.text }}>{label}</span>
        <strong style={{ fontSize: 12, color: palette.text }}>{value}%</strong>
      </div>
      <div style={{ width: "100%", height: 8, borderRadius: 999, background: palette.progressTrack, overflow: "hidden" }}>
        <div
          style={{
            width: `${value}%`,
            height: "100%",
            background: value >= 75 ? palette.success : value >= 55 ? palette.info : palette.warn,
          }}
        />
      </div>
    </div>
  );
}

function IssueCard({ title, value, hint, link, palette, tone }) {
  return (
    <article
      className="ui-card-lift ui-smooth"
      style={{
        borderRadius: 18,
        border: `1px solid ${palette.border}`,
        background: palette.cardAlt,
        padding: 16,
        display: "grid",
        gap: 8,
      }}
    >
      <p style={{ margin: 0, fontSize: 32, fontWeight: 800, color: tone }}>{value}</p>
      <h3 style={{ margin: 0, fontSize: 15, lineHeight: 1.25, color: palette.text }}>{title}</h3>
      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: palette.muted }}>{hint}</p>
      {value > 0 ? (
        <Link
          to={link}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: palette.link,
            textDecoration: "none",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          Review now
          <LinkIcon style={{ width: 14, height: 14 }} />
        </Link>
      ) : (
        <span style={{ fontSize: 12, fontWeight: 700, color: palette.success }}>
          No action needed
        </span>
      )}
    </article>
  );
}

export default function KnowledgeHealthDashboard() {
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await api.get("/api/knowledge/health/");
        const data = response?.data?.data || response?.data || null;
        setHealth(data);
      } catch (error) {
        setHealth(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const riskCount = health
    ? (health.decisions_without_owners || 0) +
      (health.old_unresolved || 0) +
      (health.repeated_topics || 0) +
      (health.orphaned_conversations || 0)
    : 0;

  return (
    <div style={{ ...ui.container, display: "grid", gap: 14 }}>
      <WorkspaceHero
        palette={palette}
        darkMode={darkMode}
        eyebrow="Memory Health"
        title="Knowledge Health"
        description="Measure the quality of organizational memory so missing owners, unresolved questions, and repeated topics are visible before they slow the team down."
        stats={
          health
            ? [
                {
                  label: "Overall Score",
                  value: health.overall_score || 0,
                  helper: qualityLabel(health.overall_score || 0),
                  tone: scoreTone(health.overall_score || 0, palette),
                },
                {
                  label: "Risk Signals",
                  value: riskCount,
                  helper: "Open issues weakening team memory quality",
                  tone: riskCount ? palette.warn : palette.success,
                },
                {
                  label: "Recommendations",
                  value: Array.isArray(health.recommendations) ? health.recommendations.length : 0,
                  helper: "Suggested fixes generated from the health scan",
                  tone: palette.info,
                },
              ]
            : []
        }
        aside={
          health ? (
            <div
              style={{
                minWidth: 220,
                borderRadius: 20,
                border: `1px solid ${palette.border}`,
                background: palette.cardAlt,
                padding: 14,
                display: "grid",
                gap: 8,
              }}
            >
              <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 800, color: palette.muted }}>
                Current Status
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 14,
                    background: `${scoreTone(health.overall_score || 0, palette)}18`,
                    color: scoreTone(health.overall_score || 0, palette),
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  {health.overall_score >= 60 ? (
                    <CheckBadgeIcon style={{ width: 20, height: 20 }} />
                  ) : (
                    <ExclamationTriangleIcon style={{ width: 20, height: 20 }} />
                  )}
                </div>
                <div style={{ display: "grid", gap: 2 }}>
                  <strong style={{ color: palette.text, fontSize: 15 }}>{qualityLabel(health.overall_score || 0)}</strong>
                  <span style={{ color: palette.muted, fontSize: 12 }}>
                    Based on {health.total_decisions || 0} decisions reviewed
                  </span>
                </div>
              </div>
            </div>
          ) : null
        }
      />

      {loading ? (
        <div
          style={{
            minHeight: 220,
            borderRadius: 20,
            border: `1px solid ${palette.border}`,
            background: palette.card,
            opacity: 0.7,
          }}
        />
      ) : null}

      {!loading && !health ? (
        <WorkspaceEmptyState
          palette={palette}
          title="Knowledge health is unavailable"
          description="We could not load the current knowledge health score or recommendations."
        />
      ) : null}

      {!loading && health ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <IssueCard
              title="Decisions Without Owners"
              value={health.decisions_without_owners || 0}
              hint="Decisions missing accountable owners and likely to stall."
              link="/decisions?filter=no_owner"
              palette={palette}
              tone={palette.danger}
            />
            <IssueCard
              title="Old Unresolved Questions"
              value={health.old_unresolved || 0}
              hint="Questions older than 30 days that still have no outcome."
              link="/conversations?type=question&status=unanswered"
              palette={palette}
              tone={palette.warn}
            />
            <IssueCard
              title="Repeated Topics"
              value={health.repeated_topics || 0}
              hint="Signals that the same discussion is being reopened across threads."
              link="/insights/repeated"
              palette={palette}
              tone={palette.info}
            />
            <IssueCard
              title="Orphaned Conversations"
              value={health.orphaned_conversations || 0}
              hint="Conversations that do not appear to link to clear next actions."
              link="/conversations?filter=orphaned"
              palette={palette}
              tone={palette.muted}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
            <WorkspacePanel
              palette={palette}
              eyebrow="Quality"
              title="Documentation quality"
              description="These signals show whether decisions are being recorded with enough context to make future retrieval trustworthy."
            >
              <div style={{ display: "grid", gap: 12 }}>
                <MetricBar label="Decisions With Context" value={health.decisions_with_context || 0} palette={palette} />
                <MetricBar label="Decisions With Alternatives" value={health.decisions_with_alternatives || 0} palette={palette} />
                <MetricBar label="Decisions With Tradeoffs" value={health.decisions_with_tradeoffs || 0} palette={palette} />
                <MetricBar label="Decisions Reviewed" value={health.decisions_reviewed || 0} palette={palette} />
              </div>
            </WorkspacePanel>

            <WorkspacePanel
              palette={palette}
              eyebrow="Guidance"
              title="Recommended fixes"
              description="Use these recommendations to close the highest-value gaps in your current memory system."
            >
              {Array.isArray(health.recommendations) && health.recommendations.length > 0 ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {health.recommendations.map((item, index) => (
                    <div
                      key={`${item}-${index}`}
                      style={{
                        borderRadius: 16,
                        border: `1px solid ${palette.border}`,
                        background: palette.cardAlt,
                        padding: 14,
                        display: "flex",
                        gap: 10,
                        alignItems: "flex-start",
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 12,
                          background: palette.accentSoft,
                          color: palette.info,
                          display: "grid",
                          placeItems: "center",
                          flexShrink: 0,
                        }}
                      >
                        <SparklesIcon style={{ width: 17, height: 17 }} />
                      </div>
                      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: palette.text }}>
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <WorkspaceEmptyState
                  palette={palette}
                  title="No recommendations right now"
                  description="Once the health scan finds a gap, recommended fixes will appear here."
                />
              )}
            </WorkspacePanel>
          </div>
        </>
      ) : null}
    </div>
  );
}
