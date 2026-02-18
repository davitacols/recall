import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, CalendarIcon, FlagIcon, ChartBarIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import { BurndownChart, SprintTimeTracking } from '../components/BurndownChart';

function SprintDetail() {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-stone-700 border-t-stone-400 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!sprint) {
    return <div className="min-h-screen bg-stone-950 flex items-center justify-center"><h2 className="text-xl font-semibold text-stone-500">Sprint not found</h2></div>;
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
    <div className="min-h-screen bg-stone-950">
      <div className="max-w-[1800px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 px-3 py-2 hover:bg-stone-900 rounded transition-all border border-stone-800 bg-stone-900/50 inline-flex items-center gap-2 text-stone-400 hover:text-stone-200"
          >
            <ArrowLeftIcon className="w-4 h-4" />
          </button>
          
          <div className="bg-stone-900 border border-stone-800 rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-stone-100 mb-2">{sprint.name}</h1>
                <div className="flex items-center gap-4 text-sm text-stone-500">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    <span>{sprint.start_date} → {sprint.end_date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FlagIcon className="w-4 h-4" />
                    <span>{sprint.project_name}</span>
                  </div>
                </div>
              </div>
              <div className={`px-3 py-1.5 rounded text-sm font-medium border ${
                progress === 100 ? 'bg-green-900/20 text-green-400 border-green-800' :
                progress >= 50 ? 'bg-blue-900/20 text-blue-400 border-blue-800' :
                'bg-stone-800 text-stone-400 border-stone-700'
              }`}>
                {progress}% Complete
              </div>
            </div>

            {sprint.goal && (
              <div className="mt-4 p-3 bg-blue-900/20 border border-blue-800 rounded">
                <p className="text-sm text-blue-300">Sprint Goal: {sprint.goal}</p>
              </div>
            )}
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <MetricCard label="Total Issues" value={sprint.issue_count || 0} icon={ChartBarIcon} />
          <MetricCard label="Completed" value={sprint.completed || 0} color="green" icon={CheckCircleIcon} />
          <MetricCard label="In Progress" value={sprint.in_progress || 0} color="blue" icon={ClockIcon} />
          <MetricCard label="Blocked" value={sprint.blocked || 0} color="red" icon={FlagIcon} />
          <MetricCard label="Decisions" value={sprint.decisions || 0} color="purple" icon={CalendarIcon} />
        </div>

        {/* Decision Impact */}
        {decisionImpact && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-stone-100 mb-4">Decision Impact Analysis</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <ImpactCard value={decisionImpact.total_effort_added || 0} label="Effort Added" color="blue" />
              <ImpactCard value={decisionImpact.total_effort_removed || 0} label="Effort Removed" color="green" />
              <ImpactCard value={decisionImpact.blocked_issues || 0} label="Blocked Issues" color="red" />
              <ImpactCard value={decisionImpact.enabled_issues || 0} label="Enabled Issues" color="purple" />
            </div>
          </div>
        )}

        {/* Burndown Chart */}
        <div className="mb-8">
          <BurndownChart sprintId={id} />
        </div>

        {/* Time Tracking Summary */}
        <div className="mb-8">
          <SprintTimeTracking sprintId={id} />
        </div>

        {/* Kanban Board */}
        <div>
          <h3 className="text-lg font-semibold text-stone-100 mb-4">Sprint Board</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {statuses.map(status => (
              <div 
                key={status} 
                className="bg-stone-900 border border-stone-800 rounded-lg overflow-hidden min-h-[500px] flex flex-col"
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(status)}
              >
                <div className={`p-3 border-b border-stone-800 ${statusColors[status]}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-stone-100 text-xs uppercase">
                      {statusLabels[status]}
                    </h3>
                    <span className="px-2 py-0.5 bg-stone-800 text-stone-300 text-xs font-semibold rounded border border-stone-700">
                      {getStatusIcon(status)}
                    </span>
                  </div>
                </div>
                <div className="flex-1 p-3 space-y-2.5 overflow-y-auto">
                  {issues.filter(i => i.status === status).length === 0 && (
                    <div className="flex items-center justify-center h-32 text-stone-600 text-sm">
                      No issues
                    </div>
                  )}
                  {issues.filter(i => i.status === status).map(issue => (
                    <IssueCard 
                      key={issue.id} 
                      issue={issue}
                      onDragStart={() => handleDragStart(issue)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, color = 'gray', icon: Icon }) {
  const colors = {
    gray: { bg: 'bg-stone-900', border: 'border-stone-800', text: 'text-stone-100', icon: 'text-stone-500' },
    green: { bg: 'bg-green-900/20', border: 'border-green-800', text: 'text-green-400', icon: 'text-green-500' },
    blue: { bg: 'bg-blue-900/20', border: 'border-blue-800', text: 'text-blue-400', icon: 'text-blue-500' },
    red: { bg: 'bg-red-900/20', border: 'border-red-800', text: 'text-red-400', icon: 'text-red-500' },
    purple: { bg: 'bg-purple-900/20', border: 'border-purple-800', text: 'text-purple-400', icon: 'text-purple-500' }
  };
  const style = colors[color];
  return (
    <div className={`p-4 ${style.bg} border ${style.border} rounded-lg`}>
      <div className="flex items-center justify-between mb-2">
        {Icon && <Icon className={`w-5 h-5 ${style.icon}`} />}
        <p className={`text-2xl font-bold ${style.text}`}>{value}</p>
      </div>
      <p className="text-xs font-semibold uppercase text-stone-500">{label}</p>
    </div>
  );
}

function ImpactCard({ value, label, color }) {
  const colors = {
    blue: 'bg-blue-900/20 border-blue-800 text-blue-400',
    green: 'bg-green-900/20 border-green-800 text-green-400',
    red: 'bg-red-900/20 border-red-800 text-red-400',
    purple: 'bg-purple-900/20 border-purple-800 text-purple-400'
  };
  return (
    <div className={`p-5 ${colors[color]} border rounded-lg`}>
      <p className="text-3xl font-bold mb-1">{value}</p>
      <p className="text-xs font-semibold uppercase">{label}</p>
    </div>
  );
}

function IssueCard({ issue, onDragStart }) {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-stone-500';
    }
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={() => window.location.href = `/issues/${issue.id}`}
      className="p-3 bg-stone-800 border border-stone-700 rounded hover:bg-stone-800/80 hover:border-stone-600 transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-semibold text-stone-500 font-mono">{issue.key}</span>
            {issue.priority && (
              <span className={`w-2 h-2 rounded-full ${getPriorityColor(issue.priority)}`} title={issue.priority}></span>
            )}
          </div>
          <h4 className="font-medium text-stone-200 text-sm line-clamp-2 leading-snug">{issue.title}</h4>
        </div>
      </div>
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-700">
        <div className="flex items-center gap-2">
          {issue.assignee && (
            <div className="w-6 h-6 rounded-full bg-stone-700 flex items-center justify-center text-white text-xs font-semibold">
              {issue.assignee.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        {issue.story_points && (
          <span className="px-2 py-0.5 bg-stone-700 text-stone-300 text-xs font-semibold rounded border border-stone-600">
            {issue.story_points} pts
          </span>
        )}
      </div>
    </div>
  );
}

export default SprintDetail;
