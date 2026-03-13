import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import api from "../services/api";
import BrandedTechnicalIllustration from "../components/BrandedTechnicalIllustration";
import {
  WorkspaceEmptyState,
  WorkspaceHero,
  WorkspacePanel,
  WorkspaceToolbar,
} from "../components/WorkspaceChrome";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";

const FILTERS = ["all", "conversation", "decision", "goal"];

function getActor(activity) {
  if (typeof activity.author === "string" && activity.author.trim()) return activity.author;
  if (typeof activity.created_by === "string" && activity.created_by.trim()) return activity.created_by;
  if (activity.created_by?.full_name) return activity.created_by.full_name;
  return "Someone";
}

function getActivityRoute(activity) {
  const routes = {
    conversation: `/conversations/${activity.id}`,
    decision: `/decisions/${activity.id}`,
    goal: `/business/goals/${activity.id}`,
  };
  return routes[activity.type] || "/";
}

export default function ActivityFeed() {
  const { darkMode } = useTheme();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [lastUpdated, setLastUpdated] = useState(null);

  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  useEffect(() => {
    loadActivities();
    const interval = setInterval(loadActivities, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadActivities = async () => {
    try {
      const [conversationsRes, decisionsRes, goalsRes] = await Promise.all([
        api.get("/api/conversations/").catch(() => ({ data: [] })),
        api.get("/api/decisions/").catch(() => ({ data: [] })),
        api.get("/api/business/goals/").catch(() => ({ data: [] })),
      ]);

      const combined = [
        ...(conversationsRes.data.results || conversationsRes.data || []).map((item) => ({
          ...item,
          type: "conversation",
          action: "captured",
        })),
        ...(decisionsRes.data.results || decisionsRes.data || []).map((item) => ({
          ...item,
          type: "decision",
          action: "logged",
        })),
        ...(goalsRes.data || []).map((item) => ({
          ...item,
          type: "goal",
          action: "updated",
        })),
      ]
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
        .slice(0, 50);

      setActivities(combined);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to load activities:", error);
      setActivities([]);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  };

  const counts = useMemo(
    () => ({
      total: activities.length,
      conversation: activities.filter((item) => item.type === "conversation").length,
      decision: activities.filter((item) => item.type === "decision").length,
      goal: activities.filter((item) => item.type === "goal").length,
    }),
    [activities]
  );

  const filteredActivities = useMemo(() => {
    if (activeFilter === "all") return activities;
    return activities.filter((item) => item.type === activeFilter);
  }, [activities, activeFilter]);

  const stats = [
    { label: "Events", value: counts.total, helper: "Recent records pulled into the live feed", tone: palette.info },
    { label: "Decisions", value: counts.decision, helper: "Decision signals currently visible", tone: palette.good },
    { label: "Conversations", value: counts.conversation, helper: "Fresh discussions entering the memory layer", tone: palette.accent },
  ];

  const filterButtons = (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {FILTERS.map((filter) => {
        const active = activeFilter === filter;
        return (
          <button
            key={filter}
            type="button"
            className="ui-btn-polish ui-focus-ring"
            onClick={() => setActiveFilter(filter)}
            style={{
              border: `1px solid ${active ? palette.accent : palette.border}`,
              borderRadius: 999,
              padding: "8px 12px",
              background: active ? palette.accentSoft : "transparent",
              color: active ? palette.text : palette.muted,
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            {filter === "all" ? "All" : `${filter}s`}
          </button>
        );
      })}
    </div>
  );

  return (
    <div style={{ ...ui.container, display: "grid", gap: 14 }}>
      <WorkspaceHero
        palette={palette}
        darkMode={darkMode}
        eyebrow="Timeline"
        title="Activity Feed"
        description="Track the latest conversations, decisions, and goal movement in one live operational stream."
        stats={stats}
        actions={
          <button onClick={loadActivities} className="ui-btn-polish ui-focus-ring" style={ui.secondaryButton}>
            <ArrowPathIcon style={{ width: 14, height: 14 }} />
            Refresh feed
          </button>
        }
        aside={<BrandedTechnicalIllustration darkMode={darkMode} compact />}
      />

      <WorkspaceToolbar palette={palette}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {filterButtons}
          <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>
            {lastUpdated ? `Last refreshed ${lastUpdated.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Waiting for first refresh"}
          </p>
        </div>
      </WorkspaceToolbar>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
        <WorkspacePanel
          palette={palette}
          eyebrow="Live Stream"
          title={loading ? "Loading activity..." : `${filteredActivities.length} updates in view`}
          description="Open any record to jump directly into the source item."
          minHeight={420}
        >
          {loading ? (
            <div style={{ display: "grid", gap: 10 }}>
              {[1, 2, 3, 4].map((item) => (
                <div key={item} style={{ height: 84, borderRadius: 18, border: `1px solid ${palette.border}`, background: palette.cardAlt, opacity: 0.72 }} />
              ))}
            </div>
          ) : null}

          {!loading && filteredActivities.length === 0 ? (
            <WorkspaceEmptyState
              palette={palette}
              title="No feed items for this filter"
              description="Switch back to all activity or wait for the next sync to bring in new records."
            />
          ) : null}

          {!loading && filteredActivities.length > 0 ? (
            <div style={{ display: "grid", gap: 10 }}>
              {filteredActivities.map((activity) => {
                const tone =
                  activity.type === "decision"
                    ? palette.good
                    : activity.type === "goal"
                      ? palette.warn
                      : palette.info;
                return (
                  <Link
                    key={`${activity.type}-${activity.id}`}
                    to={getActivityRoute(activity)}
                    className="ui-card-lift ui-smooth"
                    style={{
                      borderRadius: 18,
                      border: `1px solid ${palette.border}`,
                      background: palette.cardAlt,
                      padding: 14,
                      display: "grid",
                      gap: 10,
                      textDecoration: "none",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: "50%",
                            background: tone,
                            boxShadow: `0 0 0 6px ${palette.accentSoft}`,
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ fontSize: 11, color: palette.muted, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 800 }}>
                          {activity.type}
                        </span>
                      </div>
                      <span style={{ fontSize: 11, color: palette.muted }}>
                        {activity.created_at ? new Date(activity.created_at).toLocaleString() : "No timestamp"}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 15, color: palette.text, lineHeight: 1.5 }}>
                      <strong>{getActor(activity)}</strong> {activity.action} a <span style={{ textTransform: "capitalize" }}>{activity.type}</span>:{" "}
                      <strong>{activity.title || "Untitled"}</strong>
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>
                      {activity.description || activity.summary || "Open the record to inspect the full context and linked work."}
                    </p>
                  </Link>
                );
              })}
            </div>
          ) : null}
        </WorkspacePanel>

        <WorkspacePanel
          palette={palette}
          eyebrow="Feed Health"
          title="What is flowing through memory"
          description="Use the feed composition to spot whether the team is discussing, deciding, or executing."
        >
          <div style={{ display: "grid", gap: 10 }}>
            {[
              { label: "Decisions", value: counts.decision, tone: palette.good, helper: "Decision records now visible" },
              { label: "Conversations", value: counts.conversation, tone: palette.info, helper: "Discussion threads in the feed" },
              { label: "Goals", value: counts.goal, tone: palette.warn, helper: "Objective changes and progress updates" },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  borderRadius: 18,
                  border: `1px solid ${palette.border}`,
                  background: palette.cardAlt,
                  padding: "14px 14px 12px",
                  display: "grid",
                  gap: 4,
                }}
              >
                <p style={{ margin: 0, fontSize: 11, color: palette.muted, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  {item.label}
                </p>
                <p style={{ margin: 0, fontSize: 28, color: item.tone, fontWeight: 800, lineHeight: 1 }}>{item.value}</p>
                <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>{item.helper}</p>
              </div>
            ))}
          </div>
        </WorkspacePanel>
      </section>
    </div>
  );
}
