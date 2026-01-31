import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PlusIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import { AddIssuesToSprintModal } from '../components/AddIssuesToSprintModal';
import BurndownChart from '../components/BurndownChart';

function SprintDetail() {
  const { id } = useParams();
  const [sprint, setSprint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddIssues, setShowAddIssues] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [completing, setCompleting] = useState(false);

  const fetchSprint = async () => {
    try {
      const response = await api.get(`/api/agile/sprints/${id}/detail/`);
      const data = response.data.data || response.data;
      setSprint(data);
    } catch (error) {
      console.error('Failed to fetch sprint:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignIssues = async () => {
    try {
      await api.post(`/api/agile/sprints/${id}/assign-issues/`);
      fetchSprint();
    } catch (error) {
      console.error('Failed to assign issues:', error);
    }
  };

  useEffect(() => {
    fetchSprint();
  }, [id]);

  const handleCompleteSprint = async () => {
    setCompleting(true);
    try {
      if (sprint.issues) {
        for (const issue of sprint.issues) {
          if (issue.status !== 'done') {
            await api.put(`/api/agile/issues/${issue.id}/`, { status: 'done' });
          }
        }
      }

      await api.put(`/api/agile/sprints/${id}/detail/`, { status: 'completed' });
      
      fetchSprint();
      setShowConfirm(false);
    } catch (error) {
      console.error('Failed to complete sprint:', error);
    } finally {
      setCompleting(false);
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
    return (
      <div className="text-center py-20">
        <h2 className="text-3xl font-black text-gray-900">Sprint not found</h2>
      </div>
    );
  }

  const issueCount = sprint.issue_count || sprint.issues?.length || 0;
  const completedCount = sprint.completed || 0;
  const completionPercentage = issueCount > 0 ? Math.round((completedCount / issueCount) * 100) : 0;
  const isCompleted = sprint.status === 'completed';

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-16">
        {/* Header */}
        <div className="mb-12">
          <a href="/sprint-history" className="text-sm text-gray-600 hover:text-gray-900 font-medium mb-4 inline-block">← Back to Sprint History</a>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-6xl font-black text-gray-900 mb-3 tracking-tight">{sprint.name}</h1>
              <p className="text-lg text-gray-600 font-light">{sprint.project_name} • {sprint.start_date} to {sprint.end_date}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleAssignIssues}
                className="px-6 py-3 bg-blue-600 text-white hover:bg-blue-700 font-bold uppercase text-sm transition-all"
              >
                Link Unlinked Issues
              </button>
              {!isCompleted && (
                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={completing}
                  className="px-8 py-4 bg-green-600 text-white hover:bg-green-700 font-bold uppercase text-sm transition-all disabled:opacity-50"
                >
                  {completing ? 'Completing...' : 'Complete Sprint'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Confirmation Dialog */}
        {showConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-8 w-full max-w-md">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Complete Sprint?</h2>
              <p className="text-gray-600 mb-8">This will mark all incomplete issues as done and close the sprint.</p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={completing}
                  className="px-6 py-3 border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white font-bold uppercase text-sm transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCompleteSprint}
                  disabled={completing}
                  className="px-6 py-3 bg-green-600 text-white hover:bg-green-700 font-bold uppercase text-sm transition-all disabled:opacity-50"
                >
                  {completing ? 'Completing...' : 'Complete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sprint Goal */}
        {sprint.goal && (
          <div className="p-8 bg-white border border-gray-200 mb-12">
            <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">Sprint Goal</h3>
            <p className="text-xl text-gray-900 font-light">{sprint.goal}</p>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-4 gap-6 mb-12">
          <div className="p-8 bg-white border border-gray-200 text-center">
            <p className="text-4xl font-black text-gray-900 mb-2">{issueCount}</p>
            <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Total Issues</p>
          </div>

          <div className="p-8 bg-white border border-gray-200 text-center">
            <p className="text-4xl font-black text-green-600 mb-2">{completedCount}</p>
            <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Completed</p>
          </div>

          <div className="p-8 bg-white border border-gray-200 text-center">
            <p className="text-4xl font-black text-amber-600 mb-2">{sprint.in_progress || 0}</p>
            <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">In Progress</p>
          </div>

          <div className="p-8 bg-white border border-gray-200 text-center">
            <p className="text-4xl font-black text-red-600 mb-2">{sprint.blocked || 0}</p>
            <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Blocked</p>
          </div>
        </div>

        {/* Burndown Chart */}
        <div className="mb-12">
          <BurndownChart sprint={sprint} />
        </div>

        {/* Completion Progress */}
        <div className="p-8 bg-white border border-gray-200 mb-12">
          <div className="flex justify-between mb-4">
            <span className="text-sm font-bold text-gray-900 uppercase tracking-wide">Completion Rate</span>
            <span className="text-sm font-bold text-gray-900">{completionPercentage}%</span>
          </div>
          <div className="w-full h-3 bg-gray-200">
            <div
              style={{ width: `${completionPercentage}%` }}
              className="h-full bg-green-600 transition-all duration-300"
            />
          </div>
        </div>

        {/* Issues List */}
        <div className="p-8 bg-white border border-gray-200">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-black text-gray-900">Sprint Issues ({sprint.issue_count || sprint.issues?.length || 0})</h2>
            {!isCompleted && (
              <button
                onClick={() => setShowAddIssues(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white hover:bg-black font-bold uppercase text-sm transition-all"
              >
                <PlusIcon className="w-4 h-4" />
                Add Issues
              </button>
            )}
          </div>

          {!sprint.issues || sprint.issues.length === 0 ? (
            <p className="text-gray-600 font-medium">No issues in this sprint</p>
          ) : (
            <div className="space-y-4">
              {sprint.issues.map(issue => (
                <div key={issue.id} className="p-6 bg-white border border-gray-200 hover:border-gray-900 transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">{issue.key}</div>
                      <h3 className="text-lg font-bold text-gray-900">{issue.title}</h3>
                    </div>
                    <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wide ${getStatusBgColor(issue.status)}`}>
                      {issue.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="flex gap-6 text-sm text-gray-600 font-medium">
                    {issue.assignee && <div>Assigned to: {issue.assignee}</div>}
                    {issue.story_points && <div>{issue.story_points} pts</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showAddIssues && (
          <AddIssuesToSprintModal
            sprintId={id}
            projectId={sprint.project_id}
            onClose={() => setShowAddIssues(false)}
            onSuccess={() => fetchSprint()}
          />
        )}
        <div className="mt-12">
          <a href={`/projects/${sprint.project_id}`} className="inline-block px-8 py-4 bg-gray-900 text-white hover:bg-black font-bold uppercase text-sm transition-all">
            View Project →
          </a>
        </div>
      </div>
    </div>
  );
}

function getStatusBgColor(status) {
  switch (status) {
    case 'done':
      return 'bg-green-100 text-green-800';
    case 'in_progress':
      return 'bg-amber-100 text-amber-800';
    case 'in_review':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export default SprintDetail;
