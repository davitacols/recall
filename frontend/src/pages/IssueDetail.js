import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, TrashIcon, PencilIcon, CheckIcon, XMarkIcon, ClockIcon, UserIcon, CalendarIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import DecisionImpactPanel from '../components/DecisionImpactPanel';
import IssueAttachments from '../components/IssueAttachments';
import WatchButton from '../components/WatchButton';
import { TimeTracker, TimeEstimate } from '../components/TimeTracker';

function IssueDetail() {
  const { issueId } = useParams();
  const navigate = useNavigate();
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);

  useEffect(() => {
    fetchIssue();
    fetchTeamMembers();
  }, [issueId]);

  const fetchTeamMembers = async () => {
    try {
      const response = await api.get('/api/team/members/');
      setTeamMembers(response.data);
    } catch (error) {
      console.error('Failed to fetch team members:', error);
    }
  };

  const fetchIssue = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/api/agile/issues/${issueId}/`);
      setIssue(response.data);
      setFormData(response.data);
    } catch (err) {
      console.error('Failed to fetch issue:', err);
      setError(err.response?.data?.error || 'Failed to load issue');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    setSubmitting(true);
    try {
      await api.put(`/api/agile/issues/${issueId}/`, formData);
      setEditing(false);
      fetchIssue();
    } catch (error) {
      console.error('Failed to update issue:', error);
      setError(error.response?.data?.error || 'Failed to update issue');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      await api.post(`/api/agile/issues/${issueId}/comments/`, { content: newComment });
      setNewComment('');
      fetchIssue();
    } catch (error) {
      console.error('Failed to add comment:', error);
      setError(error.response?.data?.error || 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this issue?')) return;
    try {
      await api.delete(`/api/agile/issues/${issueId}/`);
      navigate(`/projects/${issue.project_id}`);
    } catch (error) {
      console.error('Failed to delete issue:', error);
      setError(error.response?.data?.error || 'Failed to delete issue');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-stone-700 border-t-stone-400 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-stone-950 p-6">
        <button onClick={() => navigate(-1)} className="mb-4 px-3 py-2 hover:bg-stone-900 rounded transition-all border border-stone-800 bg-stone-900/50 inline-flex items-center gap-2 text-stone-400 hover:text-stone-200">
          <ArrowLeftIcon className="w-4 h-4" />
          <span className="text-sm">Back</span>
        </button>
        <div className="p-5 bg-red-900/20 border border-red-800 rounded">
          <h2 className="text-lg font-semibold text-red-400 mb-2">Error Loading Issue</h2>
          <p className="text-red-300/80 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <h2 className="text-xl font-semibold text-stone-500">Issue not found</h2>
      </div>
    );
  }

  const priorityColors = {
    highest: 'bg-red-500/20 text-red-400 border-red-500/30',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    lowest: 'bg-stone-700/40 text-stone-400 border-stone-600/30'
  };

  const statusColors = {
    backlog: 'bg-stone-700/40 text-stone-300 border-stone-600/30',
    todo: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    in_progress: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    in_review: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    testing: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    done: 'bg-green-500/20 text-green-400 border-green-500/30'
  };

  return (
    <div className="min-h-screen bg-stone-950">
      <div className="max-w-[1600px] mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <button onClick={() => navigate(-1)} className="mb-4 px-3 py-2 hover:bg-stone-900 rounded transition-all border border-stone-800 bg-stone-900/50 inline-flex items-center gap-2 text-stone-400 hover:text-stone-200">
            <ArrowLeftIcon className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>
          
          <div className="bg-stone-900 border border-stone-800 rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 text-xs font-semibold text-stone-500 bg-stone-800 rounded border border-stone-700 font-mono">{issue.key}</span>
                  <span className={`px-2 py-1 text-xs font-semibold rounded border ${priorityColors[issue.priority] || priorityColors.low}`}>
                    {issue.priority}
                  </span>
                  <span className={`px-2 py-1 text-xs font-semibold rounded border ${statusColors[issue.status] || statusColors.backlog}`}>
                    {issue.status.replace('_', ' ')}
                  </span>
                </div>
                {!editing ? (
                  <h1 className="text-2xl font-bold text-stone-100">{issue.title}</h1>
                ) : (
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full text-2xl font-bold bg-stone-800 text-stone-100 border border-stone-700 rounded px-3 py-2 focus:outline-none focus:border-stone-600"
                  />
                )}
              </div>
              <div className="flex items-center gap-2">
                {!editing ? (
                  <button onClick={() => setEditing(true)} className="px-4 py-2 bg-stone-800 text-stone-300 border border-stone-700 rounded hover:bg-stone-700 transition-all flex items-center gap-2">
                    <PencilIcon className="w-4 h-4" />
                    <span className="font-medium">Edit</span>
                  </button>
                ) : (
                  <>
                    <button onClick={handleUpdate} disabled={submitting} className="px-4 py-2 bg-stone-700 text-stone-100 rounded hover:bg-stone-600 transition-all flex items-center gap-2 disabled:opacity-50 border border-stone-600">
                      <CheckIcon className="w-4 h-4" />
                      <span className="font-medium">Save</span>
                    </button>
                    <button onClick={() => setEditing(false)} className="px-4 py-2 bg-stone-800 text-stone-300 border border-stone-700 rounded hover:bg-stone-700 transition-all flex items-center gap-2">
                      <XMarkIcon className="w-4 h-4" />
                      <span className="font-medium">Cancel</span>
                    </button>
                  </>
                )}
                <button onClick={handleDelete} className="p-2 hover:bg-red-900/20 text-red-400 rounded transition-all border border-transparent hover:border-red-900/30">
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 3-Column Layout */}
        <div className="grid grid-cols-[1fr_280px_320px] gap-6">
          {/* Main Content */}
          <div className="space-y-6">
            {/* Description */}
            <div className="bg-gradient-to-br from-stone-900/60 to-stone-800/40 backdrop-blur-sm border border-stone-700/50 rounded-xl p-6 hover:border-stone-600/50 transition-all">
              <div className="flex items-center gap-2 mb-4">
                <ChartBarIcon className="w-5 h-5 text-amber-400" />
                <h2 className="text-sm font-bold text-stone-300 uppercase tracking-wider">Description</h2>
              </div>
              {!editing ? (
                <p className="text-stone-200 whitespace-pre-wrap text-sm leading-relaxed">{issue.description || 'No description provided'}</p>
              ) : (
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-stone-800/40 text-stone-200 border border-stone-700/50 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 min-h-32 text-sm"
                  placeholder="Describe the issue..."
                />
              )}
            </div>

            {/* Activity & Comments */}
            <div className="bg-gradient-to-br from-stone-900/60 to-stone-800/40 backdrop-blur-sm border border-stone-700/50 rounded-xl p-6 hover:border-stone-600/50 transition-all">
              <div className="flex items-center gap-2 mb-5">
                <ClockIcon className="w-5 h-5 text-amber-400" />
                <h2 className="text-sm font-bold text-stone-300 uppercase tracking-wider">Activity</h2>
              </div>

              {issue.comments && issue.comments.length > 0 ? (
                <div className="space-y-3 mb-5">
                  {issue.comments.map(comment => (
                    <div key={comment.id} className="bg-stone-800/40 border border-stone-700/40 rounded-lg p-4 hover:bg-stone-800/60 transition-all">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-xs font-bold">
                            {comment.author.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-stone-200 text-sm">{comment.author}</span>
                        </div>
                        <span className="text-xs text-stone-500">{new Date(comment.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-stone-300 text-sm leading-relaxed ml-10">{comment.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 mb-5">
                  <div className="w-16 h-16 rounded-full bg-stone-800/40 flex items-center justify-center mb-3">
                    <span className="text-3xl">💬</span>
                  </div>
                  <p className="text-stone-500 text-sm">No comments yet</p>
                </div>
              )}

              <form onSubmit={handleAddComment} className="space-y-3">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="w-full bg-stone-800/40 text-stone-200 border border-stone-700/50 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 min-h-24 text-sm placeholder-stone-500"
                />
                <button
                  type="submit"
                  disabled={submitting || !newComment.trim()}
                  className="px-5 py-2.5 bg-transparent border-2 border-amber-500 text-amber-500 rounded-lg hover:bg-amber-500 hover:text-white transition-all text-sm font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Posting...' : 'Add Comment'}
                </button>
              </form>
            </div>

            {/* Attachments */}
            <IssueAttachments issueId={issueId} />

            {/* Time Tracking */}
            <div className="bg-gradient-to-br from-stone-900/60 to-stone-800/40 backdrop-blur-sm border border-stone-700/50 rounded-xl p-6 hover:border-stone-600/50 transition-all">
              <TimeTracker issueId={issueId} />
            </div>

            {/* Decision Impacts */}
            <DecisionImpactPanel issueId={issueId} issueTitle={issue.title} />
          </div>

          {/* Metadata Sidebar */}
          <div className="space-y-3">
            <MetadataCard title="Status" icon={ChartBarIcon}>
              {!editing ? (
                <p className="text-stone-200 text-sm capitalize font-medium">{issue.status.replace('_', ' ')}</p>
              ) : (
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-stone-800/40 text-stone-200 border border-stone-700/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
                >
                  <option value="backlog">Backlog</option>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="in_review">In Review</option>
                  <option value="testing">Testing</option>
                  <option value="done">Done</option>
                </select>
              )}
            </MetadataCard>

            <MetadataCard title="Priority" icon={ChartBarIcon}>
              {!editing ? (
                <p className="text-stone-200 text-sm capitalize font-medium">{issue.priority}</p>
              ) : (
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full bg-stone-800/40 text-stone-200 border border-stone-700/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
                >
                  <option value="lowest">Lowest</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="highest">Highest</option>
                </select>
              )}
            </MetadataCard>

            <MetadataCard title="Type" icon={ChartBarIcon}>
              <p className="text-stone-200 text-sm capitalize font-medium">{issue.issue_type || 'task'}</p>
            </MetadataCard>

            <MetadataCard title="Assignee" icon={UserIcon}>
              {!editing ? (
                <p className="text-stone-200 text-sm font-medium">{issue.assignee_name || 'Unassigned'}</p>
              ) : (
                <select
                  value={formData.assignee_id || ''}
                  onChange={(e) => setFormData({ ...formData, assignee_id: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full bg-stone-800/40 text-stone-200 border border-stone-700/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
                >
                  <option value="">Unassigned</option>
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.first_name} {member.last_name}
                    </option>
                  ))}
                </select>
              )}
            </MetadataCard>

            <MetadataCard title="Reporter" icon={UserIcon}>
              <p className="text-stone-200 text-sm font-medium">{issue.reporter_name}</p>
            </MetadataCard>

            <MetadataCard title="Story Points" icon={ChartBarIcon}>
              {!editing ? (
                <p className="text-stone-200 text-sm font-medium">{issue.story_points || '-'}</p>
              ) : (
                <input
                  type="number"
                  value={formData.story_points || ''}
                  onChange={(e) => setFormData({ ...formData, story_points: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full bg-stone-800/40 text-stone-200 border border-stone-700/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
                  placeholder="Points"
                />
              )}
            </MetadataCard>

            <MetadataCard title="Sprint" icon={CalendarIcon}>
              <p className="text-stone-200 text-sm font-medium">{issue.sprint_name || 'Backlog'}</p>
            </MetadataCard>

            <MetadataCard title="Due Date" icon={CalendarIcon}>
              {!editing ? (
                <p className="text-stone-200 text-sm font-medium">{issue.due_date || '-'}</p>
              ) : (
                <input
                  type="date"
                  value={formData.due_date || ''}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full bg-stone-800/40 text-stone-200 border border-stone-700/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
                />
              )}
            </MetadataCard>

            <MetadataCard title="Created" icon={ClockIcon}>
              <p className="text-stone-300 text-xs">{new Date(issue.created_at).toLocaleString()}</p>
            </MetadataCard>

            <div className="bg-stone-900 border border-stone-800 rounded p-3">
              <TimeEstimate issueId={issueId} estimate={issue.time_estimate} onUpdate={fetchIssue} />
            </div>
          </div>

          {/* Code Review Sidebar */}
          <div className="space-y-3">
            <WatchButton issueId={issueId} isWatching={issue.watchers?.includes(parseInt(localStorage.getItem('user_id')))} />

            {issue.status === 'in_review' && (
              <>
                <MetadataCard title="Review Status" icon={CheckIcon}>
                  {!editing ? (
                    <p className={`text-sm font-semibold capitalize ${
                      issue.code_review_status === 'approved' ? 'text-green-400' :
                      issue.code_review_status === 'changes_requested' ? 'text-red-400' :
                      issue.code_review_status === 'merged' ? 'text-blue-400' :
                      'text-yellow-400'
                    }`}>{issue.code_review_status || 'pending'}</p>
                  ) : (
                    <select
                      value={formData.code_review_status || ''}
                      onChange={(e) => setFormData({ ...formData, code_review_status: e.target.value })}
                      className="w-full bg-stone-800/40 text-stone-200 border border-stone-700/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
                    >
                      <option value="pending">Pending Review</option>
                      <option value="approved">Approved</option>
                      <option value="changes_requested">Changes Requested</option>
                      <option value="merged">Merged</option>
                    </select>
                  )}
                </MetadataCard>

                <MetadataCard title="Pull Request" icon={ChartBarIcon}>
                  {!editing ? (
                    issue.pr_url ? (
                      <a href={issue.pr_url} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 text-sm break-all underline">
                        View PR
                      </a>
                    ) : (
                      <p className="text-stone-400 text-sm">-</p>
                    )
                  ) : (
                    <input
                      type="url"
                      value={formData.pr_url || ''}
                      onChange={(e) => setFormData({ ...formData, pr_url: e.target.value })}
                      placeholder="https://github.com/..."
                      className="w-full bg-stone-800/40 text-stone-200 border border-stone-700/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
                    />
                  )}
                </MetadataCard>

                <MetadataCard title="Branch" icon={ChartBarIcon}>
                  {!editing ? (
                    <p className="text-stone-200 text-xs font-mono">{issue.branch_name || '-'}</p>
                  ) : (
                    <input
                      type="text"
                      value={formData.branch_name || ''}
                      onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                      placeholder="feature/branch-name"
                      className="w-full bg-stone-800/40 text-stone-200 border border-stone-700/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
                    />
                  )}
                </MetadataCard>

                <MetadataCard title="CI/CD Status" icon={ChartBarIcon}>
                  {!editing ? (
                    <div className="space-y-2">
                      <p className={`text-sm font-semibold capitalize ${
                        issue.ci_status === 'passed' ? 'text-green-400' :
                        issue.ci_status === 'failed' ? 'text-red-400' :
                        issue.ci_status === 'running' ? 'text-blue-400' :
                        'text-stone-400'
                      }`}>{issue.ci_status || '-'}</p>
                      {issue.ci_url && (
                        <a href={issue.ci_url} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 text-xs break-all underline">
                          View Pipeline
                        </a>
                      )}
                    </div>
                  ) : (
                    <select
                      value={formData.ci_status || ''}
                      onChange={(e) => setFormData({ ...formData, ci_status: e.target.value })}
                      className="w-full bg-stone-800/40 text-stone-200 border border-stone-700/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
                    >
                      <option value="">-</option>
                      <option value="pending">Pending</option>
                      <option value="running">Running</option>
                      <option value="passed">Passed</option>
                      <option value="failed">Failed</option>
                    </select>
                  )}
                </MetadataCard>

                <MetadataCard title="Test Coverage" icon={ChartBarIcon}>
                  {!editing ? (
                    <p className="text-stone-200 text-sm font-medium">{issue.test_coverage ? `${issue.test_coverage}%` : '-'}</p>
                  ) : (
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.test_coverage || ''}
                      onChange={(e) => setFormData({ ...formData, test_coverage: e.target.value ? parseInt(e.target.value) : null })}
                      placeholder="0-100"
                      className="w-full bg-stone-800/40 text-stone-200 border border-stone-700/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
                    />
                  )}
                </MetadataCard>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetadataCard({ title, icon: Icon, children }) {
  return (
    <div className="bg-stone-900 border border-stone-800 rounded p-3">
      <div className="flex items-center gap-2 mb-2">
        {Icon && <Icon className="w-4 h-4 text-stone-500" />}
        <h3 className="text-xs font-semibold text-stone-500 uppercase">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default IssueDetail;
