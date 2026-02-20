import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../utils/ThemeAndAccessibility';
import { FlagIcon, CalendarIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

export default function BusinessDashboard() {
  const { darkMode } = useTheme();
  const [stats, setStats] = useState({ goals: 0, meetings: 0, tasks: 0, completed: 0 });
  const [recentGoals, setRecentGoals] = useState([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);
  const [loading, setLoading] = useState(true);

  const bgPrimary = darkMode ? 'bg-stone-950' : 'bg-gray-50';
  const bgSecondary = darkMode ? 'bg-stone-900' : 'bg-white';
  const borderColor = darkMode ? 'border-stone-800' : 'border-gray-200';
  const textPrimary = darkMode ? 'text-stone-100' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-stone-500' : 'text-gray-600';
  const textTertiary = darkMode ? 'text-stone-400' : 'text-gray-500';
  const inputBg = darkMode ? 'bg-stone-800' : 'bg-white';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [goalsRes, meetingsRes, tasksRes] = await Promise.all([
        fetch('http://localhost:8000/api/business/goals/', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('http://localhost:8000/api/business/meetings/', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('http://localhost:8000/api/business/tasks/', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const goals = await goalsRes.json();
      const meetings = await meetingsRes.json();
      const tasks = await tasksRes.json();

      setStats({
        goals: goals.length,
        meetings: meetings.length,
        tasks: tasks.length,
        completed: tasks.filter(t => t.status === 'done').length
      });

      setRecentGoals(goals.slice(0, 3));
      setUpcomingMeetings(meetings.slice(0, 3));
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${bgPrimary}`}>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[1,2,3,4].map(i => (
              <div key={i} className={`p-6 ${bgSecondary} border ${borderColor} rounded-lg animate-pulse`}>
                <div className={`h-4 ${inputBg} rounded w-1/2 mb-3`}></div>
                <div className={`h-8 ${inputBg} rounded w-3/4`}></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bgPrimary}`}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className={`text-3xl font-bold ${textPrimary} mb-2`}>Business Overview</h1>
          <p className={`text-sm ${textSecondary}`}>Track your goals, meetings, and tasks</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className={`p-6 ${bgSecondary} border ${borderColor} rounded-lg`}>
            <div className="flex items-center gap-3 mb-2">
              <FlagIcon className={`w-5 h-5 ${textSecondary}`} />
              <span className={`text-sm ${textSecondary}`}>Goals</span>
            </div>
            <p className={`text-3xl font-bold ${textPrimary}`}>{stats.goals}</p>
          </div>
          <div className={`p-6 ${bgSecondary} border ${borderColor} rounded-lg`}>
            <div className="flex items-center gap-3 mb-2">
              <CalendarIcon className={`w-5 h-5 ${textSecondary}`} />
              <span className={`text-sm ${textSecondary}`}>Meetings</span>
            </div>
            <p className={`text-3xl font-bold ${textPrimary}`}>{stats.meetings}</p>
          </div>
          <div className={`p-6 ${bgSecondary} border ${borderColor} rounded-lg`}>
            <div className="flex items-center gap-3 mb-2">
              <ClockIcon className={`w-5 h-5 ${textSecondary}`} />
              <span className={`text-sm ${textSecondary}`}>Tasks</span>
            </div>
            <p className={`text-3xl font-bold ${textPrimary}`}>{stats.tasks}</p>
          </div>
          <div className={`p-6 ${bgSecondary} border ${borderColor} rounded-lg`}>
            <div className="flex items-center gap-3 mb-2">
              <CheckCircleIcon className={`w-5 h-5 ${textSecondary}`} />
              <span className={`text-sm ${textSecondary}`}>Completed</span>
            </div>
            <p className={`text-3xl font-bold ${textPrimary}`}>{stats.completed}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-xl font-bold ${textPrimary}`}>Recent Goals</h2>
              <Link to="/business/goals" className={`text-sm ${textSecondary} hover:${textPrimary}`}>View all</Link>
            </div>
            <div className="space-y-3">
              {recentGoals.map(goal => (
                <Link key={goal.id} to={`/business/goals/${goal.id}`} className="block">
                  <div className={`p-4 ${bgSecondary} border ${borderColor} rounded-lg hover:border-stone-700 transition-all`}>
                    <h3 className={`text-sm font-medium ${textPrimary} mb-1`}>{goal.title}</h3>
                    <div className="flex justify-between items-center">
                      <span className={`text-xs ${textSecondary}`}>{goal.status.replace('_', ' ')}</span>
                      <span className={`text-xs ${textSecondary}`}>{goal.progress}%</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-xl font-bold ${textPrimary}`}>Upcoming Meetings</h2>
              <Link to="/business/meetings" className={`text-sm ${textSecondary} hover:${textPrimary}`}>View all</Link>
            </div>
            <div className="space-y-3">
              {upcomingMeetings.map(meeting => (
                <Link key={meeting.id} to={`/business/meetings/${meeting.id}`} className="block">
                  <div className={`p-4 ${bgSecondary} border ${borderColor} rounded-lg hover:border-stone-700 transition-all`}>
                    <h3 className={`text-sm font-medium ${textPrimary} mb-1`}>{meeting.title}</h3>
                    <span className={`text-xs ${textSecondary}`}>{new Date(meeting.meeting_date).toLocaleString()}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
