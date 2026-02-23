import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, CalendarIcon, FlagIcon, ChartBarIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../utils/ThemeAndAccessibility';
import api from '../services/api';
import { BurndownChart, SprintTimeTracking } from '../components/BurndownChart';

function SprintDetail() {
  const { darkMode } = useTheme();
  const { id } = useParams();
  const navigate = useNavigate();
  const [sprint, setSprint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [decisionImpact, setDecisionImpact] = useState(null);
  const [draggedIssue, setDraggedIssue] = useState(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [sprintRes, impactRes] = await Promise.all([
        api.get(`/api/agile/sprints/${id}/detail/`),
        api.get(`/api/agile/sprints/${id}/decision-analysis/`).catch(() => null)
      ]);
      setSprint(sprintRes.data.data || sprintRes.data);
      if (impactRes) setDecisionImpact(impactRes.data);
    } catch (error) {
      console.error('Failed to fetch sprint:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (issue) => {
    setDraggedIssue(issue);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (status) => {
    if (!draggedIssue) return;
    
    try {
      await api.put(`/api/agile/issues/${draggedIssue.id}/`, { status });
      setDraggedIssue(null);
      fetchData();
    } catch (error) {
      console.error('Failed to update issue:', error);
    }
  };

  const bgPrimary = darkMode ? 'bg-stone-950' : 'bg-gray-50';
  const bgSecondary = darkMode ? 'bg-stone-900' : 'bg-white';
  const borderColor = darkMode ? 'border-stone-800' : 'border-gray-200';
  const textPrimary = darkMode ? 'text-stone-100' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-stone-500' : 'text-gray-600';
  const cardBg = darkMode ? 'bg-stone-800' : 'bg-gray-100';
  const cardBorder = darkMode ? 'border-stone-700' : 'border-gray-300';

  if (loading) {
    return (
      <div className={`min-h-screen ${bgPrimary} flex items-center justify-center`}>
        <div className={`w-8 h-8 border-2 ${borderColor} ${darkMode ? 'border-t-stone-400' : 'border-t-gray-600'} rounded-full animate-spin`}></div>
      </div>
    );
  }

  if (!sprint) {
    return <div className={`min-h-screen ${bgPrimary} flex items-center justify-center`}><h2 className={`text-xl font-semibold ${textSecondary}`}>Sprint not found</h2></div>;
  }

  const issues = sprint.issues || [];
  const statuses = ['backlog', 'todo', 'in_progress', 'in_review', 'testing', 'done'];
  const statusLabels = { backlog: 'Backlog', todo: 'To Do', in_progress: 'In Progress', in_review: 'In Review', testing: 'Testing', done: 'Done' };
  const statusColors = {
    backlog: 'bg-stone-800',
    todo: 'bg-slate-700',
    in_progress: 'bg-blue-900',
    in_review: 'bg-purple-900',
    testing: 'bg-yellow-900',
    done: 'bg-green-900'
  };

  const getStatusIcon = (status) => {
    const completed = issues.filter(i => i.status === status).length;
    return completed;
  };

  const progress = sprint.issue_count > 0 ? Math.round((sprint.completed / sprint.issue_count) * 100) : 0;

  return (
    <div className={`min-h-screen ${bgPrimary}`}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <button
          onClick={() => navigate(-1)}
          className={`mb-6 px-3 py-2 rounded border ${borderColor} ${textSecondary} hover:${textPrimary} transition-all`}
        >
          ← Back
        </button>

        <div className={`${bgSecondary} border ${borderColor} rounded-lg p-6 mb-6`}>
          <div className="flex items-center justify-between mb-2">
            <h1 className={`text-2xl font-bold ${textPrimary}`}>{sprint.name}</h1>
            <span className={`px-3 py-1 rounded text-sm font-medium ${
              progress === 100 ? (darkMode ? 'bg-green-900/20 text-green-400' : 'bg-green-100 text-green-700') :
              progress >= 50 ? (darkMode ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-100 text-blue-700') :
              (darkMode ? 'bg-stone-800 text-stone-400' : 'bg-gray-200 text-gray-700')
            }`}>
              {progress}% Complete
            </span>
          </div>
          <div className={`flex items-center gap-4 text-sm ${textSecondary} mb-4`}>
            <span>{sprint.start_date} → {sprint.end_date}</span>
            <span>•</span>
            <span>{sprint.project_name}</span>
          </div>
          {sprint.goal && (
            <p className={`text-sm ${textSecondary}`}>{sprint.goal}</p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className={`${bgSecondary} border ${borderColor} rounded-lg p-4`}>
            <p className={`text-2xl font-bold ${textPrimary}`}>{sprint.issue_count || 0}</p>
            <p className={`text-xs ${textSecondary}`}>Total</p>
          </div>
          <div className={`${bgSecondary} border ${borderColor} rounded-lg p-4`}>
            <p className={`text-2xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>{sprint.completed || 0}</p>
            <p className={`text-xs ${textSecondary}`}>Done</p>
          </div>
          <div className={`${bgSecondary} border ${borderColor} rounded-lg p-4`}>
            <p className={`text-2xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{sprint.in_progress || 0}</p>
            <p className={`text-xs ${textSecondary}`}>In Progress</p>
          </div>
          <div className={`${bgSecondary} border ${borderColor} rounded-lg p-4`}>
            <p className={`text-2xl font-bold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>{sprint.blocked || 0}</p>
            <p className={`text-xs ${textSecondary}`}>Blocked</p>
          </div>
          <div className={`${bgSecondary} border ${borderColor} rounded-lg p-4`}>
            <p className={`text-2xl font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>{sprint.decisions || 0}</p>
            <p className={`text-xs ${textSecondary}`}>Decisions</p>
          </div>
        </div>

        {/* Board */}
        <div className="grid grid-cols-6 gap-3">
          {statuses.map(status => (
            <div key={status}>
              <div className={`${bgSecondary} border ${borderColor} rounded-lg p-3 mb-2`}>
                <h3 className={`text-xs font-semibold ${textPrimary} uppercase mb-1`}>{statusLabels[status]}</h3>
                <span className={`text-xs ${textSecondary}`}>{issues.filter(i => i.status === status).length}</span>
              </div>
              <div className="space-y-2">
                {issues.filter(i => i.status === status).map(issue => (
                  <div
                    key={issue.id}
                    draggable
                    onDragStart={() => handleDragStart(issue)}
                    onClick={() => window.location.href = `/issues/${issue.id}`}
                    className={`p-3 ${bgSecondary} border ${borderColor} rounded cursor-pointer hover:border-gray-400 transition-all`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs ${textSecondary} font-mono`}>{issue.key}</span>
                      {issue.priority && (
                        <span className={`w-2 h-2 rounded-full ${
                          issue.priority === 'critical' ? 'bg-red-500' :
                          issue.priority === 'high' ? 'bg-orange-500' :
                          issue.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                        }`}></span>
                      )}
                    </div>
                    <p className={`text-sm ${textPrimary} line-clamp-2 mb-2`}>{issue.title}</p>
                    <div className="flex items-center justify-between">
                      {issue.assignee && (
                        <div className={`w-6 h-6 rounded-full ${cardBg} flex items-center justify-center text-xs font-semibold ${textPrimary}`}>
                          {issue.assignee.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {issue.story_points && (
                        <span className={`text-xs ${textSecondary}`}>{issue.story_points}pts</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}



export default SprintDetail;
