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

    const meetingsToday = upcomingMeetings.filter((meeting) => {
      const date = new Date(meeting.meeting_date);
      return date.toDateString() === now.toDateString();
    }).length;

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
      meetingsToday,
      meetingsNext24h,
      goalsNeedingAttention,
      stalledGoals,
    };
  }, [goals, meetings, tasks]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh" }}>
        <div style={ui.container}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 8 }}>
            {[1, 2, 3, 4].map((item) => (
              <div key={item} style={{ borderRadius: 12, height: 110, border: `1px solid ${palette.border}`, background: palette.card, opacity: 0.75 }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={ui.container}>
        <section
          style={{
            borderRadius: 12,
            border: `1px solid ${palette.border}`,
            background: palette.card,
            padding: 14,
            marginBottom: 10,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: palette.muted }}>BUSINESS OVERVIEW</p>
              <h1 style={{ margin: "8px 0 4px", fontSize: "clamp(1.2rem,2.1vw,1.8rem)", color: palette.text }}>Operations Dashboard</h1>
              <p style={{ margin: 0, fontSize: 13, color: palette.muted }}>
                {tasks.length} tasks, {meetings.length} meetings, {goals.length} goals. Completion {computed.completionRate}%.
              </p>
            </div>
            <button onClick={fetchData} className="ui-btn-polish" style={ui.secondaryButton}>
              <ArrowPathIcon style={{ width: 14, height: 14 }} />
              Refresh
            </button>
          </div>
        </section>

        <section style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          <SummaryPill icon={ExclamationTriangleIcon} label="Attention" value={`${computed.stalledGoals} goals`} palette={palette} tone={computed.stalledGoals > 0 ? palette.danger : palette.success} />
          <SummaryPill icon={CalendarDaysIcon} label="Next 24h" value={`${computed.meetingsNext24h} meetings`} palette={palette} tone={computed.meetingsNext24h > 0 ? palette.warn : palette.success} />
          <SummaryPill icon={CheckCircleIcon} label="Execution" value={`${computed.completionRate}% done`} palette={palette} tone={computed.completionRate >= 60 ? palette.success : palette.warn} />
        </section>

        <section style={{ ...ui.responsiveSplit, alignItems: "start" }}>
          <div style={{ display: "grid", gap: 10 }}>
            <ListSection title="Upcoming Meetings" linkTo="/business/meetings" linkText="View all meetings" palette={palette}>
              {computed.upcomingMeetings.length === 0 ? (
                <EmptyState text="No upcoming meetings scheduled." palette={palette} />
              ) : (
                computed.upcomingMeetings.slice(0, 5).map((meeting) => (
                  <Link key={meeting.id} to={`/business/meetings/${meeting.id}`} style={{ ...rowLink, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: palette.text }}>{meeting.title}</p>
                    <p style={{ margin: "4px 0 0", fontSize: 11, color: palette.muted }}>
                      {new Date(meeting.meeting_date).toLocaleString()} | {meeting.duration_minutes || 60} min
                    </p>
                  </Link>
                ))
              )}
            </ListSection>

            <ListSection title="Goals Needing Attention" linkTo="/business/goals" linkText="Open goals" palette={palette}>
              {computed.goalsNeedingAttention.length === 0 ? (
                <EmptyState text="No active goals need attention right now." palette={palette} />
              ) : (
                computed.goalsNeedingAttention.map((goal) => {
                  const progress = Math.max(0, Math.min(100, goal.progress || 0));
                  return (
                    <Link key={goal.id} to={`/business/goals/${goal.id}`} style={{ ...rowLink, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: palette.text }}>{goal.title}</p>
                        <span style={{ fontSize: 11, color: palette.muted }}>{progress}%</span>
                      </div>
                      <div style={{ marginTop: 6, width: "100%", height: 7, borderRadius: 999, background: palette.progressTrack, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${progress}%`, background: progress >= 70 ? palette.success : progress >= 40 ? palette.warn : palette.danger }} />
                      </div>
                    </Link>
                  );
                })
              )}
            </ListSection>
          </div>

          <section style={{ borderRadius: 10, border: `1px solid ${palette.border}`, background: palette.card, padding: 10 }}>
            <h2 style={{ margin: "0 0 10px", fontSize: 15, color: palette.text, letterSpacing: "0.06em", textTransform: "uppercase" }}>Quick Actions</h2>
            <div style={{ display: "grid", gap: 8 }}>
              <ActionLink to="/business/tasks" label="Open Task Board" helper="Move work from To Do to Done" icon={ClockIcon} palette={palette} />
              <ActionLink to="/business/meetings" label="Plan Meetings" helper="Check upcoming sessions and schedule new ones" icon={CalendarDaysIcon} palette={palette} />
              <ActionLink to="/business/goals" label="Review Goals" helper="Update stalled objectives and milestones" icon={FlagIcon} palette={palette} />
              <ActionLink to="/business/analytics" label="Open Analytics" helper="Track trends and outcomes" icon={FlagIcon} palette={palette} />
            </div>
          </section>
        </section>
      </div>
    </div>
  );
}

function SummaryPill({ icon: Icon, label, value, palette, tone }) {
  return (
    <div style={{ borderRadius: 999, padding: "7px 10px", border: `1px solid ${tone || palette.border}`, background: "transparent", display: "inline-flex", alignItems: "center", gap: 8 }}>
      <Icon style={{ width: 14, height: 14, color: tone || palette.info }} />
      <p style={{ margin: 0, fontSize: 11, color: palette.muted }}>{label}</p>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: tone || palette.text }}>{value}</p>
    </div>
  );
}

function ListSection({ title, linkTo, linkText, palette, children }) {
  return (
    <section style={{ borderRadius: 10, border: `1px solid ${palette.border}`, background: palette.card, padding: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
        <h2 style={{ margin: 0, fontSize: 16, color: palette.text }}>{title}</h2>
        <Link to={linkTo} style={{ fontSize: 11, fontWeight: 700, color: palette.info, textDecoration: "none" }}>
          {linkText}
        </Link>
      </div>
      <div style={{ display: "grid", gap: 8 }}>{children}</div>
    </section>
  );
}

function EmptyState({ text, palette }) {
  return <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>{text}</p>;
}

function ActionLink({ to, label, helper, icon: Icon, palette }) {
  return (
    <Link to={to} style={{ borderRadius: 9, border: `1px solid ${palette.border}`, background: "transparent", padding: 9, textDecoration: "none", display: "grid", gridTemplateColumns: "16px 1fr", gap: 8, alignItems: "start" }}>
      <Icon style={{ width: 16, height: 16, color: palette.info }} />
      <div>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: palette.text }}>{label}</p>
        <p style={{ margin: "3px 0 0", fontSize: 11, color: palette.muted }}>{helper}</p>
      </div>
    </Link>
  );
}

const rowLink = {
  borderRadius: 10,
  textDecoration: "none",
  padding: 10,
};
