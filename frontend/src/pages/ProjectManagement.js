import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { CheckCircleIcon, ExclamationIcon, CodeBracketIcon, CommandLineIcon, SparklesIcon, ChartBarIcon } from '@heroicons/react/24/outline';

function ProjectManagement() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [activeSprint, setActiveSprint] = useState(null);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('sprint');

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      const [projectRes, sprintRes, issuesRes] = await Promise.all([
        api.get(`/api/agile/projects/${projectId}/`),
        api.get(`/api/agile/projects/${projectId}/sprints/?status=active`),
        api.get(`/api/agile/projects/${projectId}/issues/unified/`)
      ]);
      
      setProject(projectRes.data);
      setActiveSprint(sprintRes.data[0] || null);
      setIssues(issuesRes.data);
    } catch (error) {
      console.error('Failed to fetch project data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-800"><div className="animate-spin text-white">Loading...</div></div>;
  if (!project) return <div>Project not found</div>;

  const todoIssues = issues.filter(i => i.status === 'todo');
  const inProgressIssues = issues.filter(i => i.status === 'in_progress');
  const inReviewIssues = issues.filter(i => i.status === 'in_review');
  const doneIssues = issues.filter(i => i.status === 'done');

  const completionPercent = activeSprint ? Math.round((activeSprint.completed / activeSprint.issue_count) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-xl bg-slate-900/80 border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <SparklesIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">{project.name}</h1>
                  <p className="text-sm text-slate-400">{project.key}</p>
                </div>
              </div>
              <p className="text-slate-300 mt-2">{project.description}</p>
            </div>
            <Link to={`/projects/${projectId}/settings`} className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">
              Settings
            </Link>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 border-t border-slate-700/50 pt-4">
            {['sprint', 'backlog', 'code', 'insights'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'sprint' && (
          <div className="space-y-8">
            {activeSprint ? (
              <>
                {/* Sprint Header Card */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl border border-slate-600/50 p-8 shadow-2xl">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-white">{activeSprint.name}</h2>
                      <p className="text-slate-400 mt-1">{activeSprint.start_date} to {activeSprint.end_date}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        {completionPercent}%
                      </div>
                      <p className="text-slate-400 text-sm mt-1">Complete</p>
                    </div>
                  </div>
                  {activeSprint.goal && (
                    <p className="text-slate-200 mt-4 text-lg">{activeSprint.goal}</p>
                  )}
                  {/* Progress Bar */}
                  <div className="mt-6 h-2 bg-slate-600 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500"
                      style={{ width: `${completionPercent}%` }}
                    />
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-4 gap-4">
                  <MetricCard label="To Do" value={todoIssues.length} color="from-slate-600 to-slate-700" icon="📋" />
                  <MetricCard label="In Progress" value={inProgressIssues.length} color="from-blue-600 to-blue-700" icon="⚙️" />
                  <MetricCard label="In Review" value={inReviewIssues.length} color="from-amber-600 to-amber-700" icon="👀" />
                  <MetricCard label="Done" value={doneIssues.length} color="from-green-600 to-green-700" icon="✅" />
                </div>

                {/* Kanban Board */}
                <div className="grid grid-cols-4 gap-4">
                  <IssueColumn title="To Do" issues={todoIssues} status="todo" color="slate" />
                  <IssueColumn title="In Progress" issues={inProgressIssues} status="in_progress" color="blue" />
                  <IssueColumn title="In Review" issues={inReviewIssues} status="in_review" color="amber" />
                  <IssueColumn title="Done" issues={doneIssues} status="done" color="green" />
                </div>
              </>
            ) : (
              <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl border border-slate-600/50 p-12 text-center">
                <p className="text-slate-300 mb-4">No active sprint</p>
                <Link to={`/projects/${projectId}/sprints/new`} className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all">
                  Create Sprint
                </Link>
              </div>
            )}
          </div>
        )}

        {activeTab === 'backlog' && (
          <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl border border-slate-600/50 p-8">
            <h2 className="text-xl font-bold text-white mb-6">Backlog</h2>
            <div className="space-y-3">
              {issues.filter(i => !i.sprint).map(issue => (
                <IssueRow key={issue.id} issue={issue} />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'code' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Pull Requests */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl border border-slate-600/50 p-8">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <CodeBracketIcon className="w-5 h-5 text-blue-400" />
                  Pull Requests
                </h3>
                <div className="space-y-3">
                  {issues.filter(i => i.pr_url).map(issue => (
                    <div key={issue.id} className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50 hover:border-blue-500/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-white">{issue.key}: {issue.title}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            Status: <span className={`font-medium ${getCodeReviewColor(issue.code_review_status)}`}>
                              {issue.code_review_status || 'pending'}
                            </span>
                          </p>
                        </div>
                        <a href={issue.pr_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-sm font-medium">
                          View PR →
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CI/CD Status */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl border border-slate-600/50 p-8">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <CommandLineIcon className="w-5 h-5 text-purple-400" />
                  CI/CD Pipeline
                </h3>
                <div className="space-y-3">
                  {issues.filter(i => i.ci_status).map(issue => (
                    <div key={issue.id} className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50 hover:border-purple-500/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-white">{issue.key}: {issue.title}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            <span className={`font-medium ${getCIStatusColor(issue.ci_status)}`}>
                              {issue.ci_status}
                            </span>
                            {issue.test_coverage && ` • Coverage: ${issue.test_coverage}%`}
                          </p>
                        </div>
                        {issue.ci_url && (
                          <a href={issue.ci_url} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 text-sm font-medium">
                            View →
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="grid grid-cols-3 gap-6">
            <InsightCard title="Velocity" value={`${activeSprint?.completed || 0} pts`} icon="📊" />
            <InsightCard title="Burndown" value={`${completionPercent}%`} icon="📉" />
            <InsightCard title="Code Quality" value={`${issues.filter(i => i.test_coverage && i.test_coverage > 80).length}/${issues.length}`} icon="✨" />
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, color, icon }) {
  return (
    <div className={`bg-gradient-to-br ${color} rounded-xl p-6 border border-slate-600/50 shadow-lg hover:shadow-xl transition-shadow`}>
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-3xl font-bold text-white">{value}</div>
      <div className="text-sm text-slate-300 mt-2">{label}</div>
    </div>
  );
}

function IssueColumn({ title, issues, status, color }) {
  const colorMap = {
    slate: 'from-slate-700 to-slate-600',
    blue: 'from-blue-700 to-blue-600',
    amber: 'from-amber-700 to-amber-600',
    green: 'from-green-700 to-green-600',
  };

  return (
    <div className={`bg-gradient-to-br ${colorMap[color]} rounded-xl p-4 border border-slate-600/50 min-h-96`}>
      <h3 className="font-bold text-white mb-4 flex items-center justify-between">
        {title}
        <span className="bg-slate-700/50 px-2 py-1 rounded text-xs">{issues.length}</span>
      </h3>
      <div className="space-y-3">
        {issues.map(issue => (
          <div key={issue.id} className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 hover:border-slate-500 transition-colors cursor-pointer hover:shadow-lg">
            <p className="font-medium text-white text-sm">{issue.key}</p>
            <p className="text-xs text-slate-300 mt-1">{issue.title}</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-slate-400">{issue.assignee || 'Unassigned'}</span>
              {issue.story_points && <span className="text-xs font-medium bg-slate-600 px-2 py-1 rounded text-slate-100">{issue.story_points}pts</span>}
            </div>
            <div className="mt-2 space-y-1">
              {issue.pr_url && <div className="text-xs text-blue-400">📝 PR linked</div>}
              {issue.ci_status && <div className={`text-xs ${getCIStatusColor(issue.ci_status)}`}>🔄 {issue.ci_status}</div>}
              {issue.linked_decisions?.length > 0 && <div className="text-xs text-purple-400">📋 {issue.linked_decisions.length} decision(s)</div>}
              {issue.linked_conversations?.length > 0 && <div className="text-xs text-indigo-400">💬 {issue.linked_conversations.length} conversation(s)</div>}
              {issue.blocking_blockers?.length > 0 && <div className="text-xs text-red-400">🚫 {issue.blocking_blockers.length} blocker(s)</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function IssueRow({ issue }) {
  return (
    <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50 hover:border-slate-500 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="font-medium text-white">{issue.key}: {issue.title}</p>
          <p className="text-sm text-slate-400 mt-1">{issue.assignee || 'Unassigned'}</p>
        </div>
        <div className="flex items-center gap-4">
          {issue.story_points && <span className="text-sm font-medium text-slate-300">{issue.story_points}pts</span>}
          <span className={`text-xs font-medium px-3 py-1 rounded ${getStatusColor(issue.status)}`}>
            {issue.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
}

function InsightCard({ title, value, icon }) {
  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl border border-slate-600/50 p-8 text-center shadow-lg hover:shadow-xl transition-shadow">
      <div className="text-4xl mb-4">{icon}</div>
      <p className="text-slate-400 text-sm font-medium mb-2">{title}</p>
      <p className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">{value}</p>
    </div>
  );
}

function getStatusColor(status) {
  const colors = {
    todo: 'bg-slate-600 text-slate-100',
    in_progress: 'bg-blue-600 text-blue-100',
    in_review: 'bg-amber-600 text-amber-100',
    done: 'bg-green-600 text-green-100',
  };
  return colors[status] || colors.todo;
}

function getCodeReviewColor(status) {
  const colors = {
    pending: 'text-slate-400',
    approved: 'text-green-400',
    changes_requested: 'text-amber-400',
    merged: 'text-green-300 font-bold',
  };
  return colors[status] || colors.pending;
}

function getCIStatusColor(status) {
  const colors = {
    pending: 'text-slate-400',
    running: 'text-blue-400',
    passed: 'text-green-400',
    failed: 'text-red-400',
  };
  return colors[status] || colors.pending;
}

export default ProjectManagement;
