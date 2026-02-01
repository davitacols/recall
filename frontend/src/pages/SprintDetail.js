import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PlusIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

function SprintDetail() {
  const { id } = useParams();
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
  const statusColors = { backlog: 'bg-gray-50', todo: 'bg-gray-100', in_progress: 'bg-blue-50', in_review: 'bg-purple-50', testing: 'bg-yellow-50', done: 'bg-green-50' };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-black text-gray-900 mb-2">{sprint.name}</h1>
          <p className="text-gray-600 font-medium">{sprint.project_name} • {sprint.start_date} to {sprint.end_date}</p>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          <MetricCard label="Total Issues" value={sprint.issue_count || 0} />
          <MetricCard label="Completed" value={sprint.completed || 0} color="green" />
          <MetricCard label="In Progress" value={sprint.in_progress || 0} color="blue" />
          <MetricCard label="Blocked" value={sprint.blocked || 0} color="red" />
          <MetricCard label="Decisions" value={sprint.decisions || 0} color="purple" />
        </div>

        {/* Decision Impact */}
        {decisionImpact && (
          <div className="p-6 bg-white border border-gray-200 mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Decision Impact</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 border border-blue-200">
                <p className="text-2xl font-black text-blue-600">{decisionImpact.total_effort_added || 0}</p>
                <p className="text-xs text-gray-600 font-semibold uppercase">Effort Added</p>
              </div>
              <div className="p-4 bg-green-50 border border-green-200">
                <p className="text-2xl font-black text-green-600">{decisionImpact.total_effort_removed || 0}</p>
                <p className="text-xs text-gray-600 font-semibold uppercase">Effort Removed</p>
              </div>
              <div className="p-4 bg-red-50 border border-red-200">
                <p className="text-2xl font-black text-red-600">{decisionImpact.blocked_issues || 0}</p>
                <p className="text-xs text-gray-600 font-semibold uppercase">Blocked Issues</p>
              </div>
              <div className="p-4 bg-purple-50 border border-purple-200">
                <p className="text-2xl font-black text-purple-600">{decisionImpact.enabled_issues || 0}</p>
                <p className="text-xs text-gray-600 font-semibold uppercase">Enabled Issues</p>
              </div>
            </div>
          </div>
        )}

        {/* Kanban Board */}
        <div className="grid grid-cols-6 gap-4">
          {statuses.map(status => (
            <div 
              key={status} 
              className={`p-4 ${statusColors[status]} border border-gray-200 min-h-96 rounded`}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(status)}
            >
              <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wide">
                {statusLabels[status]} ({issues.filter(i => i.status === status).length})
              </h3>
              <div className="space-y-3">
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
    gray: 'bg-gray-100 text-gray-900',
    green: 'bg-green-100 text-green-900',
    blue: 'bg-blue-100 text-blue-900',
    red: 'bg-red-100 text-red-900',
    purple: 'bg-purple-100 text-purple-900'
  };
  return (
    <div className={`p-4 ${colors[color]} border border-gray-200 text-center`}>
      <p className="text-3xl font-black mb-1">{value}</p>
      <p className="text-xs font-semibold uppercase text-gray-600">{label}</p>
    </div>
  );
}

function IssueCard({ issue, onDragStart }) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="block p-3 bg-white border border-gray-200 hover:border-gray-900 hover:shadow-md transition-all cursor-move"
    >
      <a href={`/issues/${issue.id}`} onClick={(e) => e.stopPropagation()}>
        <div className="text-xs font-bold text-gray-600 uppercase mb-1">{issue.key}</div>
        <h4 className="font-bold text-gray-900 text-sm mb-2 line-clamp-2">{issue.title}</h4>
        <div className="flex justify-between items-center text-xs text-gray-600">
          <span>{issue.priority}</span>
          {issue.story_points && <span className="font-semibold">{issue.story_points} pts</span>}
        </div>
      </a>
    </div>
  );
}

export default SprintDetail;
