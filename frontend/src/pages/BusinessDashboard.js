import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
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
            borderRadius: 16,
            border: `1px solid ${palette.border}`,
            background: darkMode
              ? "radial-gradient(circle at 12% 16%, rgba(90,174,231,0.2), rgba(16,24,31,0.85) 58%)"
              : "radial-gradient(circle at 12% 16%, rgba(47,128,184,0.14), rgba(255,255,255,0.82) 58%)",
            padding: 16,
            marginBottom: 12,
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

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 8, marginBottom: 12 }}>
          <StatusCard title="Needs Attention" value={`${computed.stalledGoals} stalled goals`} subtitle={`${computed.todoTasks} tasks waiting`} palette={palette} tone={computed.stalledGoals > 0 ? palette.danger : palette.success} icon={ExclamationTriangleIcon} />
          <StatusCard title="Next 24 Hours" value={`${computed.meetingsNext24h} meetings`} subtitle={`${computed.meetingsToday} today`} palette={palette} tone={computed.meetingsNext24h > 0 ? palette.warn : palette.success} icon={CalendarDaysIcon} />
          <StatusCard title="Execution Health" value={`${computed.completionRate}% complete`} subtitle={`${computed.inProgressTasks} in progress`} palette={palette} tone={computed.completionRate >= 60 ? palette.success : palette.warn} icon={CheckCircleIcon} />
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 8, marginBottom: 12 }}>
          <MetricCard to="/business/goals" icon={FlagIcon} label="Goals" value={goals.length} helper={`${computed.stalledGoals} at risk`} palette={palette} />
          <MetricCard to="/business/meetings" icon={CalendarDaysIcon} label="Meetings" value={meetings.length} helper={`${computed.meetingsToday} today`} palette={palette} />
          <MetricCard to="/business/tasks" icon={ClockIcon} label="Tasks" value={tasks.length} helper={`${computed.todoTasks} todo`} palette={palette} />
          <MetricCard to="/business/tasks" icon={CheckCircleIcon} label="Completed" value={computed.doneTasks} helper={`${computed.completionRate}% completion`} palette={palette} />
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

          <section style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.card, padding: 12 }}>
            <h2 style={{ margin: "0 0 10px", fontSize: 15, color: palette.text, letterSpacing: "0.06em", textTransform: "uppercase" }}>Quick Actions</h2>
            <div style={{ display: "grid", gap: 8 }}>
              <ActionLink to="/business/tasks" label="Open Task Board" helper="Move work from To Do to Done" icon={ClockIcon} palette={palette} />
              <ActionLink to="/business/meetings" label="Plan Meetings" helper="Check upcoming sessions and schedule new ones" icon={CalendarDaysIcon} palette={palette} />
              <ActionLink to="/business/documents" label="Review Documents" helper="Keep decisions and references updated" icon={DocumentTextIcon} palette={palette} />
              <ActionLink to="/business/analytics" label="Open Analytics" helper="Track trends and outcomes" icon={FlagIcon} palette={palette} />
            </div>
          </section>
        </section>
      </div>
    </div>
  );
}

function StatusCard({ title, value, subtitle, icon: Icon, palette, tone }) {
  return (
    <article style={{ borderRadius: 12, border: `1px solid ${tone}`, background: palette.cardAlt, padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: palette.muted }}>{title}</p>
        <Icon style={{ width: 16, height: 16, color: tone }} />
      </div>
      <p style={{ margin: "8px 0 0", fontSize: 17, fontWeight: 800, color: tone }}>{value}</p>
      <p style={{ margin: "3px 0 0", fontSize: 11, color: palette.muted }}>{subtitle}</p>
    </article>
  );
}

function MetricCard({ to, icon: Icon, label, value, helper, palette }) {
  return (
    <Link to={to} style={{ borderRadius: 12, padding: 12, border: `1px solid ${palette.border}`, background: palette.card, textDecoration: "none" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ margin: 0, fontSize: 11, color: palette.muted }}>{label}</p>
        <Icon style={{ width: 16, height: 16, color: palette.info }} />
      </div>
      <p style={{ margin: "7px 0 0", fontSize: 28, fontWeight: 800, color: palette.text }}>{value}</p>
      <p style={{ margin: "2px 0 0", fontSize: 11, color: palette.muted }}>{helper}</p>
    </Link>
  );
}

function ListSection({ title, linkTo, linkText, palette, children }) {
  return (
    <section style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.card, padding: 12 }}>
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
    <Link to={to} style={{ borderRadius: 10, border: `1px solid ${palette.border}`, background: palette.cardAlt, padding: 10, textDecoration: "none", display: "grid", gridTemplateColumns: "16px 1fr", gap: 8, alignItems: "start" }}>
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
