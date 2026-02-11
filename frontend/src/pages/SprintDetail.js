import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, CalendarIcon, FlagIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

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
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (!sprint) {
    return <div className="text-center py-20"><h2 className="text-3xl font-black text-gray-900">Sprint not found</h2></div>;
  }

  const issues = sprint.issues || [];
  const statuses = ['backlog', 'todo', 'in_progress', 'in_review', 'testing', 'done'];
  const statusLabels = { backlog: 'Backlog', todo: 'To Do', in_progress: 'In Progress', in_review: 'In Review', testing: 'Testing', done: 'Done' };
  const statusColors = {
    backlog: 'border-t-gray-400',
    todo: 'border-t-slate-500',
    in_progress: 'border-t-blue-500',
    in_review: 'border-t-purple-500',
    testing: 'border-t-yellow-500',
    done: 'border-t-green-500'
  };

  const getStatusIcon = (status) => {
    const completed = issues.filter(i => i.status === status).length;
    return completed;
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-[1800px] mx-auto px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 p-2 hover:bg-white/80 rounded-lg transition-all border border-gray-200 bg-white shadow-sm inline-flex items-center gap-2"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-700" />
          </button>
          <div>
            <h1 className="text-4xl font-black text-white mb-3">{sprint.name}</h1>
            <div className="flex items-center gap-6 text-sm text-gray-300">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                <span className="font-medium">{sprint.start_date} → {sprint.end_date}</span>
              </div>
              <div className="flex items-center gap-2">
                <FlagIcon className="w-5 h-5" />
                <span className="font-medium">{sprint.project_name}</span>
              </div>
            </div>
            {sprint.goal && (
              <div className="mt-4 p-4 bg-blue-500/20 border-l-4 border-blue-400 rounded-r-lg">
                <p className="text-sm font-semibold text-white">Sprint Goal: {sprint.goal}</p>
              </div>
            )}
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <MetricCard label="Total Issues" value={sprint.issue_count || 0} />
          <MetricCard label="Completed" value={sprint.completed || 0} color="green" />
          <MetricCard label="In Progress" value={sprint.in_progress || 0} color="blue" />
          <MetricCard label="Blocked" value={sprint.blocked || 0} color="red" />
          <MetricCard label="Decisions" value={sprint.decisions || 0} color="purple" />
        </div>

        {/* Decision Impact */}
        {decisionImpact && (
          <div className="mb-6">
            <h3 className="text-xl font-bold text-white mb-4">Decision Impact Analysis</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-5 bg-blue-600 border border-blue-500 rounded-xl">
                <p className="text-3xl font-black text-white mb-1">{decisionImpact.total_effort_added || 0}</p>
                <p className="text-xs text-gray-100 font-bold uppercase tracking-wide">Effort Added</p>
              </div>
              <div className="p-5 bg-green-600 border border-green-500 rounded-xl">
                <p className="text-3xl font-black text-white mb-1">{decisionImpact.total_effort_removed || 0}</p>
                <p className="text-xs text-gray-100 font-bold uppercase tracking-wide">Effort Removed</p>
              </div>
              <div className="p-5 bg-red-600 border border-red-500 rounded-xl">
                <p className="text-3xl font-black text-white mb-1">{decisionImpact.blocked_issues || 0}</p>
                <p className="text-xs text-gray-100 font-bold uppercase tracking-wide">Blocked Issues</p>
              </div>
              <div className="p-5 bg-purple-600 border border-purple-500 rounded-xl">
                <p className="text-3xl font-black text-white mb-1">{decisionImpact.enabled_issues || 0}</p>
                <p className="text-xs text-gray-100 font-bold uppercase tracking-wide">Enabled Issues</p>
              </div>
            </div>
          </div>
        )}

        {/* Kanban Board */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statuses.map(status => (
            <div 
              key={status} 
              className={`rounded-xl border-t-4 ${statusColors[status]} min-h-[500px] flex flex-col`}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(status)}
            >
              <div className="p-4 pb-3 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-sm uppercase tracking-wide">
                    {statusLabels[status]}
                  </h3>
                  <span className="px-2.5 py-1 bg-gray-700 text-gray-200 text-xs font-bold rounded-full">
                    {getStatusIcon(status)}
                  </span>
                </div>
              </div>
              <div className="flex-1 p-3 space-y-2.5 overflow-y-auto">
                {issues.filter(i => i.status === status).length === 0 && (
                  <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
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
  );
}

function MetricCard({ label, value, color = 'gray' }) {
  const colors = {
    gray: 'bg-gray-700 border-gray-600 text-white',
    green: 'bg-green-600 border-green-500 text-white',
    blue: 'bg-blue-600 border-blue-500 text-white',
    red: 'bg-red-600 border-red-500 text-white',
    purple: 'bg-purple-600 border-purple-500 text-white'
  };
  return (
    <div className={`p-5 ${colors[color]} border rounded-xl text-center`}>
      <p className="text-3xl font-black mb-1">{value}</p>
      <p className="text-xs font-bold uppercase tracking-wide text-gray-100">{label}</p>
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
      default: return 'bg-gray-400';
    }
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={() => window.location.href = `/issues/${issue.id}`}
      className="p-3.5 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 hover:border-gray-500 transition-all duration-200 cursor-pointer hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-bold text-gray-400 uppercase">{issue.key}</span>
            {issue.priority && (
              <span className={`w-2 h-2 rounded-full ${getPriorityColor(issue.priority)}`} title={issue.priority}></span>
            )}
          </div>
          <h4 className="font-semibold text-white text-sm line-clamp-2 leading-snug">{issue.title}</h4>
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-700">
        <div className="flex items-center gap-2">
          {issue.assignee && (
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                {issue.assignee.charAt(0).toUpperCase()}
              </div>
            </div>
          )}
        </div>
        {issue.story_points && (
          <span className="px-2 py-0.5 bg-indigo-500/30 text-indigo-300 text-xs font-bold rounded">
            {issue.story_points} pts
          </span>
        )}
      </div>
    </div>
  );
}

export default SprintDetail;
