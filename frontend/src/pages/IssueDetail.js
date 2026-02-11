import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, TrashIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import DecisionImpactPanel from '../components/DecisionImpactPanel';
import IssueAttachments from '../components/IssueAttachments';
import WatchButton from '../components/WatchButton';

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
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-12">
          <button
            onClick={() => navigate(-1)}
            className="mb-8 inline-flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back
          </button>
          <div className="p-8 bg-red-50 border border-red-200 rounded">
            <h2 className="text-2xl font-bold text-red-900 mb-2">Error</h2>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="text-center py-20">
        <h2 className="text-4xl font-black text-gray-900 mb-4">Issue not found</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-12 md:py-16">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 transition-all"
          >
            <ArrowLeftIcon className="w-6 h-6 text-gray-900" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-lg font-bold text-gray-900">{issue.key}</span>
              <span className={`px-3 py-1 text-xs font-bold uppercase ${
                issue.priority === 'highest' ? 'bg-red-100 text-red-700' :
                issue.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                issue.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {issue.priority}
              </span>
              <span className={`px-3 py-1 text-xs font-bold uppercase ${
                issue.status === 'done' ? 'bg-green-100 text-green-700' :
                issue.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                issue.status === 'in_review' ? 'bg-purple-100 text-purple-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {issue.status}
              </span>
            </div>
            {!editing ? (
              <h1 className="text-4xl font-black text-gray-900">{issue.title}</h1>
            ) : (
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full text-4xl font-black text-gray-900 border-b-2 border-gray-900 focus:outline-none"
              />
            )}
          </div>
          <button
            onClick={() => setEditing(!editing)}
            className="px-6 py-3 bg-gray-900 text-white hover:bg-black font-bold uppercase text-sm transition-all"
          >
            {editing ? 'Cancel' : 'Edit'}
          </button>
          <button
            onClick={handleDelete}
            className="p-3 hover:bg-red-50 text-red-600 transition-all"
          >
            <TrashIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="col-span-2 space-y-8">
            {/* Description */}
            <div className="p-8 bg-white border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Description</h2>
              {!editing ? (
                <p className="text-gray-600 whitespace-pre-wrap">{issue.description || 'No description'}</p>
              ) : (
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all min-h-32"
                />
              )}
            </div>

            {/* Comments */}
            <div className="p-8 bg-white border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-6">Comments</h2>

              {issue.comments && issue.comments.length > 0 ? (
                <div className="space-y-4 mb-8">
                  {issue.comments.map(comment => (
                    <div key={comment.id} className="p-4 bg-gray-50 border border-gray-200">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-gray-900">{comment.author}</span>
                        <span className="text-xs text-gray-600">{new Date(comment.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-gray-600">{comment.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 mb-8">No comments yet</p>
              )}

              <form onSubmit={handleAddComment} className="space-y-4">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all min-h-24"
                />
                <button
                  type="submit"
                  disabled={submitting || !newComment.trim()}
                  className="px-6 py-3 bg-gray-900 text-white hover:bg-black font-bold uppercase text-sm transition-all disabled:opacity-50"
                >
                  {submitting ? 'Posting...' : 'Post Comment'}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column */}
          <div className="col-span-2 space-y-6">
            {/* Watch Button */}
            <WatchButton issueId={issueId} isWatching={issue.watchers?.includes(parseInt(localStorage.getItem('user_id')))} />
            
            {/* Attachments */}
            <IssueAttachments issueId={issueId} />
            
            {/* Decision Impacts */}
            <DecisionImpactPanel issueId={issueId} issueTitle={issue.title} />

            {/* Status */}
            <div className="p-6 bg-white border border-gray-200">
              <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Status</h3>
              {!editing ? (
                <p className="text-gray-600 capitalize">{issue.status}</p>
              ) : (
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
                >
                  <option value="backlog">Backlog</option>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="in_review">In Review</option>
                  <option value="testing">Testing</option>
                  <option value="done">Done</option>
                </select>
              )}
            </div>

            {/* Priority */}
            <div className="p-6 bg-white border border-gray-200">
              <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Priority</h3>
              {!editing ? (
                <p className="text-gray-600 capitalize">{issue.priority}</p>
              ) : (
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
                >
                  <option value="lowest">Lowest</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="highest">Highest</option>
                </select>
              )}
            </div>

            {/* Issue Type */}
            <div className="p-6 bg-white border border-gray-200">
              <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Type</h3>
              <p className="text-gray-600 capitalize">{issue.issue_type || 'task'}</p>
            </div>

            {/* Assignee */}
            <div className="p-6 bg-white border border-gray-200">
              <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Assignee</h3>
              {!editing ? (
                <p className="text-gray-600">{issue.assignee_name || 'Unassigned'}</p>
              ) : (
                <select
                  value={formData.assignee_id || ''}
                  onChange={(e) => setFormData({ ...formData, assignee_id: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
                >
                  <option value="">Unassigned</option>
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.first_name} {member.last_name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Reporter */}
            <div className="p-6 bg-white border border-gray-200">
              <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Reporter</h3>
              <p className="text-gray-600">{issue.reporter_name}</p>
            </div>

            {/* Story Points */}
            <div className="p-6 bg-white border border-gray-200">
              <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Story Points</h3>
              {!editing ? (
                <p className="text-gray-600">{issue.story_points || '-'}</p>
              ) : (
                <input
                  type="number"
                  value={formData.story_points || ''}
                  onChange={(e) => setFormData({ ...formData, story_points: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
                />
              )}
            </div>

            {/* Sprint */}
            <div className="p-6 bg-white border border-gray-200">
              <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Sprint</h3>
              <p className="text-gray-600">{issue.sprint_name || 'Backlog'}</p>
            </div>

            {/* Due Date */}
            <div className="p-6 bg-white border border-gray-200">
              <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Due Date</h3>
              {!editing ? (
                <p className="text-gray-600">{issue.due_date || '-'}</p>
              ) : (
                <input
                  type="date"
                  value={formData.due_date || ''}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
                />
              )}
            </div>

            {/* Created */}
            <div className="p-6 bg-white border border-gray-200">
              <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Created</h3>
              <p className="text-gray-600 text-sm">{new Date(issue.created_at).toLocaleString()}</p>
            </div>

            {/* Code Review Section */}
            {issue.status === 'in_review' && (
              <>
                {/* Code Review Status */}
                <div className="p-6 bg-white border border-gray-200">
                  <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Review Status</h3>
                  {!editing ? (
                    <p className={`capitalize font-semibold ${
                      issue.code_review_status === 'approved' ? 'text-green-600' :
                      issue.code_review_status === 'changes_requested' ? 'text-red-600' :
                      issue.code_review_status === 'merged' ? 'text-blue-600' :
                      'text-yellow-600'
                    }`}>{issue.code_review_status || 'pending'}</p>
                  ) : (
                    <select
                      value={formData.code_review_status || ''}
                      onChange={(e) => setFormData({ ...formData, code_review_status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
                    >
                      <option value="pending">Pending Review</option>
                      <option value="approved">Approved</option>
                      <option value="changes_requested">Changes Requested</option>
                      <option value="merged">Merged</option>
                    </select>
                  )}
                </div>

                {/* PR URL */}
                <div className="p-6 bg-white border border-gray-200">
                  <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Pull Request</h3>
                  {!editing ? (
                    issue.pr_url ? (
                      <a href={issue.pr_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                        {issue.pr_url}
                      </a>
                    ) : (
                      <p className="text-gray-600">-</p>
                    )
                  ) : (
                    <input
                      type="url"
                      value={formData.pr_url || ''}
                      onChange={(e) => setFormData({ ...formData, pr_url: e.target.value })}
                      placeholder="https://github.com/..."
                      className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
                    />
                  )}
                </div>

                {/* Branch Name */}
                <div className="p-6 bg-white border border-gray-200">
                  <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Branch</h3>
                  {!editing ? (
                    <p className="text-gray-600 font-mono text-sm">{issue.branch_name || '-'}</p>
                  ) : (
                    <input
                      type="text"
                      value={formData.branch_name || ''}
                      onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                      placeholder="feature/branch-name"
                      className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
                    />
                  )}
                </div>

                {/* CI Status */}
                <div className="p-6 bg-white border border-gray-200">
                  <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">CI/CD Status</h3>
                  {!editing ? (
                    <div className="space-y-2">
                      <p className={`capitalize font-semibold ${
                        issue.ci_status === 'passed' ? 'text-green-600' :
                        issue.ci_status === 'failed' ? 'text-red-600' :
                        issue.ci_status === 'running' ? 'text-blue-600' :
                        'text-gray-600'
                      }`}>{issue.ci_status || '-'}</p>
                      {issue.ci_url && (
                        <a href={issue.ci_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm break-all">
                          View Pipeline
                        </a>
                      )}
                    </div>
                  ) : (
                    <select
                      value={formData.ci_status || ''}
                      onChange={(e) => setFormData({ ...formData, ci_status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
                    >
                      <option value="">-</option>
                      <option value="pending">Pending</option>
                      <option value="running">Running</option>
                      <option value="passed">Passed</option>
                      <option value="failed">Failed</option>
                    </select>
                  )}
                </div>

                {/* Test Coverage */}
                <div className="p-6 bg-white border border-gray-200">
                  <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Test Coverage</h3>
                  {!editing ? (
                    <p className="text-gray-600">{issue.test_coverage ? `${issue.test_coverage}%` : '-'}</p>
                  ) : (
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.test_coverage || ''}
                      onChange={(e) => setFormData({ ...formData, test_coverage: e.target.value ? parseInt(e.target.value) : null })}
                      placeholder="0-100"
                      className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
                    />
                  )}
                </div>
              </>
            )}

            {/* Save Button */}
            {editing && (
              <button
                onClick={handleUpdate}
                disabled={submitting}
                className="w-full px-6 py-3 bg-green-600 text-white hover:bg-green-700 font-bold uppercase text-sm transition-all disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default IssueDetail;
