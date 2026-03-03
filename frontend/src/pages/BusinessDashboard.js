import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../utils/ThemeAndAccessibility";
import {
  ArrowPathIcon,
  BellAlertIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  FlagIcon,
} from "@heroicons/react/24/outline";

export default function BusinessDashboard() {
  const { darkMode } = useTheme();
  const [goals, setGoals] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const bgPrimary = darkMode ? "bg-stone-950" : "bg-gray-50";
  const bgSecondary = darkMode ? "bg-stone-900" : "bg-white";
  const borderColor = darkMode ? "border-stone-800" : "border-gray-200";
  const textPrimary = darkMode ? "text-stone-100" : "text-gray-900";
  const textSecondary = darkMode ? "text-stone-500" : "text-gray-600";
  const textTertiary = darkMode ? "text-stone-400" : "text-gray-500";
  const inputBg = darkMode ? "bg-stone-800" : "bg-gray-50";
  const dangerTone = darkMode
    ? "border-red-500/40 bg-red-500/10 text-red-200"
    : "border-red-300 bg-red-50 text-red-800";
  const warnTone = darkMode
    ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
    : "border-amber-300 bg-amber-50 text-amber-800";
  const okTone = darkMode
    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
    : "border-emerald-300 bg-emerald-50 text-emerald-800";

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const apiBase = process.env.REACT_APP_API_URL || "http://localhost:8000";
      const [goalsRes, meetingsRes, tasksRes] = await Promise.all([
        fetch(`${apiBase}/api/business/goals/`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${apiBase}/api/business/meetings/`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${apiBase}/api/business/tasks/`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const goalsData = (await goalsRes.json()) || [];
      const meetingsData = (await meetingsRes.json()) || [];
      const tasksData = (await tasksRes.json()) || [];

      setGoals(Array.isArray(goalsData) ? goalsData : []);
      setMeetings(Array.isArray(meetingsData) ? meetingsData : []);
      setTasks(Array.isArray(tasksData) ? tasksData : []);
    } catch (fetchError) {
      console.error("Failed to load business dashboard:", fetchError);
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
      <div className={`min-h-screen ${bgPrimary}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className={`${bgSecondary} border ${borderColor} rounded-xl p-5 animate-pulse`}
              >
                <div className={`h-3 ${inputBg} rounded w-1/3 mb-3`} />
                <div className={`h-8 ${inputBg} rounded w-2/3`} />
              </div>
            ))}
          </div>
          <div className={`h-44 ${bgSecondary} border ${borderColor} rounded-xl animate-pulse`} />
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bgPrimary}`}>
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <section className={`${bgSecondary} border ${borderColor} rounded-2xl p-5 md:p-6 mb-6`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className={`text-xs font-semibold tracking-[0.14em] ${textTertiary}`}>
                TEAM CONTROL CENTER
              </p>
              <h1 className={`mt-2 text-2xl md:text-3xl font-bold ${textPrimary}`}>
                Business Dashboard
              </h1>
              <p className={`mt-2 text-sm ${textSecondary}`}>
                {tasks.length} tasks, {meetings.length} meetings, {goals.length} goals. Task
                completion is {computed.completionRate}%.
              </p>
            </div>
            <button
              onClick={fetchData}
              className={`inline-flex items-center gap-2 px-3 py-2 text-sm border ${borderColor} ${textPrimary} rounded-md ${inputBg}`}
            >
              <ArrowPathIcon className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatusCard
            title="Needs Attention"
            value={`${computed.stalledGoals} stalled goals`}
            subtitle={`${computed.todoTasks} tasks waiting to start`}
            icon={ExclamationTriangleIcon}
            tone={computed.stalledGoals > 0 ? dangerTone : okTone}
          />
          <StatusCard
            title="Next 24 Hours"
            value={`${computed.meetingsNext24h} meetings`}
            subtitle={`${computed.meetingsToday} scheduled today`}
            icon={BellAlertIcon}
            tone={computed.meetingsNext24h > 0 ? warnTone : okTone}
          />
          <StatusCard
            title="Execution Health"
            value={`${computed.completionRate}% complete`}
            subtitle={`${computed.inProgressTasks} tasks in progress`}
            icon={CheckCircleIcon}
            tone={computed.completionRate >= 60 ? okTone : warnTone}
          />
        </section>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <MetricCard
            to="/business/goals"
            icon={FlagIcon}
            label="Goals"
            value={goals.length}
            helper={`${computed.stalledGoals} at risk`}
            bgSecondary={bgSecondary}
            borderColor={borderColor}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
          />
          <MetricCard
            to="/business/meetings"
            icon={CalendarDaysIcon}
            label="Meetings"
            value={meetings.length}
            helper={`${computed.meetingsToday} today`}
            bgSecondary={bgSecondary}
            borderColor={borderColor}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
          />
          <MetricCard
            to="/business/tasks"
            icon={ClockIcon}
            label="Tasks"
            value={tasks.length}
            helper={`${computed.todoTasks} todo`}
            bgSecondary={bgSecondary}
            borderColor={borderColor}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
          />
          <MetricCard
            to="/business/tasks"
            icon={CheckCircleIcon}
            label="Completed"
            value={computed.doneTasks}
            helper={`${computed.completionRate}% completion`}
            bgSecondary={bgSecondary}
            borderColor={borderColor}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
          />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          <div className="lg:col-span-8 space-y-6">
            <ListSection
              title="Upcoming Meetings"
              linkTo="/business/meetings"
              linkText="View all meetings"
              bgSecondary={bgSecondary}
              borderColor={borderColor}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
            >
              {computed.upcomingMeetings.length === 0 ? (
                <EmptyState text="No upcoming meetings scheduled." textSecondary={textSecondary} />
              ) : (
                computed.upcomingMeetings.slice(0, 5).map((meeting) => (
                  <Link key={meeting.id} to={`/business/meetings/${meeting.id}`} className="block">
                    <div className={`p-4 ${inputBg} border ${borderColor} rounded-lg`}>
                      <p className={`text-sm font-semibold ${textPrimary}`}>{meeting.title}</p>
                      <div className={`mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs ${textSecondary}`}>
                        <span>{new Date(meeting.meeting_date).toLocaleString()}</span>
                        <span>{meeting.duration_minutes || 60} min</span>
                        {meeting.location && <span>{meeting.location}</span>}
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </ListSection>

            <ListSection
              title="Goals Needing Attention"
              linkTo="/business/goals"
              linkText="Open goals"
              bgSecondary={bgSecondary}
              borderColor={borderColor}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
            >
              {computed.goalsNeedingAttention.length === 0 ? (
                <EmptyState text="No active goals need attention right now." textSecondary={textSecondary} />
              ) : (
                computed.goalsNeedingAttention.map((goal) => (
                  <Link key={goal.id} to={`/business/goals/${goal.id}`} className="block">
                    <div className={`p-4 ${inputBg} border ${borderColor} rounded-lg`}>
                      <div className="flex items-center justify-between gap-3">
                        <p className={`text-sm font-semibold ${textPrimary}`}>{goal.title}</p>
                        <span className={`text-xs ${textSecondary}`}>{goal.progress || 0}%</span>
                      </div>
                      <div className={`mt-2 h-2 ${darkMode ? "bg-stone-700" : "bg-gray-200"} rounded-full overflow-hidden`}>
                        <div
                          className={`${goal.progress >= 70 ? "bg-emerald-500" : goal.progress >= 40 ? "bg-amber-500" : "bg-red-500"} h-full`}
                          style={{ width: `${Math.max(0, Math.min(100, goal.progress || 0))}%` }}
                        />
                      </div>
                      <p className={`mt-2 text-xs ${textSecondary}`}>
                        Status: {(goal.status || "unknown").replace("_", " ")}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </ListSection>
          </div>

          <aside className="lg:col-span-4 space-y-6">
            <section className={`${bgSecondary} border ${borderColor} rounded-2xl p-5`}>
              <h2 className={`text-sm font-semibold tracking-[0.11em] ${textTertiary} uppercase mb-4`}>
                Quick Actions
              </h2>
              <div className="space-y-3">
                <ActionLink
                  to="/business/tasks"
                  label="Open Task Board"
                  helper="Move work from To Do to Done"
                  icon={ClockIcon}
                  textPrimary={textPrimary}
                  textSecondary={textSecondary}
                  borderColor={borderColor}
                  inputBg={inputBg}
                />
                <ActionLink
                  to="/business/meetings"
                  label="Plan Meetings"
                  helper="Check upcoming sessions and schedule new ones"
                  icon={CalendarDaysIcon}
                  textPrimary={textPrimary}
                  textSecondary={textSecondary}
                  borderColor={borderColor}
                  inputBg={inputBg}
                />
                <ActionLink
                  to="/business/documents"
                  label="Review Documents"
                  helper="Keep decisions and references updated"
                  icon={DocumentTextIcon}
                  textPrimary={textPrimary}
                  textSecondary={textSecondary}
                  borderColor={borderColor}
                  inputBg={inputBg}
                />
                <ActionLink
                  to="/business/analytics"
                  label="Open Analytics"
                  helper="Track trends and outcomes"
                  icon={ChartBarIcon}
                  textPrimary={textPrimary}
                  textSecondary={textSecondary}
                  borderColor={borderColor}
                  inputBg={inputBg}
                />
              </div>
            </section>
          </aside>
        </section>
      </div>
    </div>
  );
}

function StatusCard({ title, value, subtitle, icon: Icon, tone }) {
  return (
    <article className={`border rounded-xl p-4 ${tone}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold tracking-[0.09em] uppercase">{title}</p>
        <Icon className="w-5 h-5" />
      </div>
      <p className="mt-3 text-lg font-bold">{value}</p>
      <p className="mt-1 text-xs opacity-80">{subtitle}</p>
    </article>
  );
}

function MetricCard({
  to,
  icon: Icon,
  label,
  value,
  helper,
  bgSecondary,
  borderColor,
  textPrimary,
  textSecondary,
}) {
  return (
    <Link to={to} className={`p-4 ${bgSecondary} border ${borderColor} rounded-xl`}>
      <div className="flex items-center justify-between">
        <p className={`text-sm ${textSecondary}`}>{label}</p>
        <Icon className={`w-5 h-5 ${textSecondary}`} />
      </div>
      <p className={`mt-2 text-3xl font-bold ${textPrimary}`}>{value}</p>
      <p className={`mt-1 text-xs ${textSecondary}`}>{helper}</p>
    </Link>
  );
}

function ListSection({
  title,
  linkTo,
  linkText,
  bgSecondary,
  borderColor,
  textPrimary,
  textSecondary,
  children,
}) {
  return (
    <section className={`${bgSecondary} border ${borderColor} rounded-2xl p-5`}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className={`text-lg font-bold ${textPrimary}`}>{title}</h2>
        <Link to={linkTo} className={`text-xs font-medium ${textSecondary}`}>
          {linkText}
        </Link>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function EmptyState({ text, textSecondary }) {
  return <p className={`text-sm ${textSecondary}`}>{text}</p>;
}

function ActionLink({
  to,
  label,
  helper,
  icon: Icon,
  textPrimary,
  textSecondary,
  borderColor,
  inputBg,
}) {
  return (
    <Link to={to} className={`block p-3 ${inputBg} border ${borderColor} rounded-lg`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 mt-0.5 ${textSecondary}`} />
        <div>
          <p className={`text-sm font-semibold ${textPrimary}`}>{label}</p>
          <p className={`text-xs mt-1 ${textSecondary}`}>{helper}</p>
        </div>
      </div>
    </Link>
  );
}
