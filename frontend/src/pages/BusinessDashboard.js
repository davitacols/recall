import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  FlagIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";
import api from "../services/api";
import {
  WorkspaceEmptyState,
  WorkspaceHero,
  WorkspacePanel,
} from "../components/WorkspaceChrome";

export default function BusinessDashboard() {
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const [goals, setGoals] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [goalsRes, meetingsRes, tasksRes] = await Promise.all([
        api.get("/api/business/goals/").catch(() => ({ data: [] })),
        api.get("/api/business/meetings/").catch(() => ({ data: [] })),
        api.get("/api/business/tasks/").catch(() => ({ data: [] })),
      ]);

      setGoals(Array.isArray(goalsRes.data) ? goalsRes.data : []);
      setMeetings(Array.isArray(meetingsRes.data) ? meetingsRes.data : []);
      setTasks(Array.isArray(tasksRes.data) ? tasksRes.data : []);
    } catch (error) {
      setGoals([]);
      setMeetings([]);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const computed = useMemo(() => {
    const now = new Date();
    const doneTasks = tasks.filter((task) => task.status === "done").length;
    const inProgressTasks = tasks.filter((task) => task.status === "in_progress").length;
    const todoTasks = tasks.filter((task) => task.status === "todo").length;
    const completionRate = tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0;

    const upcomingMeetings = [...meetings]
      .filter((meeting) => meeting.meeting_date && new Date(meeting.meeting_date) > now)
      .sort((a, b) => new Date(a.meeting_date) - new Date(b.meeting_date));

    const meetingsNext24h = upcomingMeetings.filter((meeting) => {
      const date = new Date(meeting.meeting_date);
      return date > now && date.getTime() - now.getTime() <= 24 * 60 * 60 * 1000;
    }).length;

    const goalsNeedingAttention = [...goals]
      .filter((goal) => goal.status !== "completed")
      .sort((a, b) => (a.progress || 0) - (b.progress || 0))
      .slice(0, 5);

    const stalledGoals = goalsNeedingAttention.filter((goal) => (goal.progress || 0) < 40).length;

    return {
      doneTasks,
      inProgressTasks,
      todoTasks,
      completionRate,
      upcomingMeetings,
      meetingsNext24h,
      goalsNeedingAttention,
      stalledGoals,
    };
  }, [goals, meetings, tasks]);

  const stats = [
    {
      label: "Completion",
      value: `${computed.completionRate}%`,
      helper: `${computed.doneTasks} of ${tasks.length} tasks closed`,
      tone: computed.completionRate >= 60 ? palette.good : palette.warn,
    },
    {
      label: "Upcoming Meetings",
      value: computed.upcomingMeetings.length,
      helper: `${computed.meetingsNext24h} landing in the next 24 hours`,
      tone: palette.info,
    },
    {
      label: "Goals At Risk",
      value: computed.stalledGoals,
      helper: "Objectives below 40% progress",
      tone: computed.stalledGoals ? palette.danger : palette.good,
    },
  ];

  if (loading) {
    return (
      <div style={ui.container}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
          {[1, 2, 3, 4].map((item) => (
            <div key={item} style={{ borderRadius: 22, height: 126, border: `1px solid ${palette.border}`, background: palette.card, opacity: 0.76 }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...ui.container, display: "grid", gap: 14 }}>
      <WorkspaceHero
        palette={palette}
        darkMode={darkMode}
        eyebrow="Business Overview"
        title="Operations Dashboard"
        description={`${tasks.length} tasks, ${meetings.length} meetings, and ${goals.length} goals aligned in one operating view.`}
        stats={stats}
        actions={
          <>
            <button onClick={fetchData} className="ui-btn-polish ui-focus-ring" style={ui.primaryButton}>
              <ArrowPathIcon style={{ width: 14, height: 14 }} />
              Refresh
            </button>
            <Link to="/business/tasks" className="ui-btn-polish ui-focus-ring" style={{ ...ui.secondaryButton, textDecoration: "none" }}>
              Open task board
            </Link>
          </>
        }
        aside={
          <div style={{ display: "grid", gap: 10, width: "100%" }}>
            {[
              { icon: ExclamationTriangleIcon, label: "Attention", value: `${computed.stalledGoals} goals`, tone: computed.stalledGoals ? palette.danger : palette.good },
              { icon: CalendarDaysIcon, label: "Next 24h", value: `${computed.meetingsNext24h} meetings`, tone: computed.meetingsNext24h ? palette.warn : palette.good },
              { icon: CheckCircleIcon, label: "Execution", value: `${computed.completionRate}% done`, tone: computed.completionRate >= 60 ? palette.good : palette.warn },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  style={{
                    borderRadius: 18,
                    border: `1px solid ${palette.border}`,
                    background: palette.cardAlt,
                    padding: "12px 14px",
                    display: "grid",
                    gap: 4,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Icon style={{ width: 14, height: 14, color: item.tone }} />
                    <p style={{ margin: 0, fontSize: 11, color: palette.muted, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      {item.label}
                    </p>
                  </div>
                  <p style={{ margin: 0, fontSize: 24, color: item.tone, fontWeight: 800, lineHeight: 1 }}>{item.value}</p>
                </div>
              );
            })}
          </div>
        }
      />

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
        <WorkspacePanel
          palette={palette}
          eyebrow="Meetings"
          title="Upcoming Meetings"
          description="Use the next scheduled sessions to keep context flowing into action."
          action={
            <Link to="/business/meetings" style={{ color: palette.link, textDecoration: "none", fontSize: 12, fontWeight: 800 }}>
              View all
            </Link>
          }
        >
          {computed.upcomingMeetings.length === 0 ? (
            <WorkspaceEmptyState
              palette={palette}
              title="No upcoming meetings"
              description="Your next scheduled business sessions will appear here."
            />
          ) : (
            computed.upcomingMeetings.slice(0, 5).map((meeting) => (
              <Link
                key={meeting.id}
                to={`/business/meetings/${meeting.id}`}
                className="ui-card-lift ui-smooth"
                style={{
                  borderRadius: 18,
                  border: `1px solid ${palette.border}`,
                  background: palette.cardAlt,
                  padding: 14,
                  textDecoration: "none",
                  display: "grid",
                  gap: 6,
                }}
              >
                <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: palette.text }}>{meeting.title}</p>
                <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>
                  {new Date(meeting.meeting_date).toLocaleString()} | {meeting.duration_minutes || 60} minutes
                </p>
              </Link>
            ))
          )}
        </WorkspacePanel>

        <WorkspacePanel
          palette={palette}
          eyebrow="Goals"
          title="Goals Needing Attention"
          description="These goals are furthest from done and most likely to need intervention."
          action={
            <Link to="/business/goals" style={{ color: palette.link, textDecoration: "none", fontSize: 12, fontWeight: 800 }}>
              Open goals
            </Link>
          }
        >
          {computed.goalsNeedingAttention.length === 0 ? (
            <WorkspaceEmptyState
              palette={palette}
              title="Goal progress looks healthy"
              description="No active goals need attention right now."
            />
          ) : (
            computed.goalsNeedingAttention.map((goal) => {
              const progress = Math.max(0, Math.min(100, goal.progress || 0));
              const tone = progress >= 70 ? palette.good : progress >= 40 ? palette.warn : palette.danger;
              return (
                <Link
                  key={goal.id}
                  to={`/business/goals/${goal.id}`}
                  className="ui-card-lift ui-smooth"
                  style={{
                    borderRadius: 18,
                    border: `1px solid ${palette.border}`,
                    background: palette.cardAlt,
                    padding: 14,
                    textDecoration: "none",
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: palette.text }}>{goal.title}</p>
                    <span style={{ fontSize: 11, color: palette.muted }}>{progress}%</span>
                  </div>
                  <div style={{ width: "100%", height: 8, borderRadius: 999, background: palette.progressTrack, overflow: "hidden" }}>
                    <div style={{ width: `${progress}%`, height: "100%", background: tone }} />
                  </div>
                </Link>
              );
            })
          )}
        </WorkspacePanel>

        <WorkspacePanel
          palette={palette}
          eyebrow="Quick Actions"
          title="Keep work moving"
          description="Jump into the most common business workflows."
        >
          <ActionLink to="/business/tasks" label="Open Task Board" helper={`${computed.todoTasks} to do, ${computed.inProgressTasks} in progress`} icon={ClockIcon} palette={palette} />
          <ActionLink to="/business/meetings" label="Plan Meetings" helper="Review the next sessions and schedule new ones" icon={CalendarDaysIcon} palette={palette} />
          <ActionLink to="/business/goals" label="Review Goals" helper="Update stalled objectives and unblock ownership" icon={FlagIcon} palette={palette} />
          <ActionLink to="/business/analytics" label="Open Analytics" helper="Track operating trends and business outcomes" icon={CheckCircleIcon} palette={palette} />
        </WorkspacePanel>
      </section>
    </div>
  );
}

function ActionLink({ to, label, helper, icon: Icon, palette }) {
  return (
    <Link
      to={to}
      className="ui-card-lift ui-smooth"
      style={{
        borderRadius: 18,
        border: `1px solid ${palette.border}`,
        background: palette.cardAlt,
        padding: 14,
        textDecoration: "none",
        display: "grid",
        gridTemplateColumns: "18px 1fr",
        gap: 10,
        alignItems: "start",
      }}
    >
      <Icon style={{ width: 18, height: 18, color: palette.info }} />
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: palette.text }}>{label}</p>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: palette.muted, lineHeight: 1.45 }}>{helper}</p>
      </div>
    </Link>
  );
}
