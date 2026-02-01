import React, { useState, useEffect } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

export function AddIssuesToSprintModal({ sprintId, projectId, onClose, onSuccess }) {
  const [availableIssues, setAvailableIssues] = useState([]);
  const [selectedIssues, setSelectedIssues] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showCreateIssue, setShowCreateIssue] = useState(false);
  const [newIssueTitle, setNewIssueTitle] = useState('');

  useEffect(() => {
    fetchAvailableIssues();
    fetchTeamMembers();
  }, [projectId]);

  const fetchTeamMembers = async () => {
    try {
      console.log('Fetching team members from /api/organizations/members/');
      const response = await api.get('/api/organizations/members/');
      console.log('Team members response:', response.data);
      setTeamMembers(response.data || []);
    } catch (err) {
      console.error('Failed to fetch team members:', err);
      setTeamMembers([]);
    }
  };

  const fetchAvailableIssues = async () => {
    try {
      const response = await api.get(`/api/agile/projects/${projectId}/issues/`);
      const issues = response.data || [];
      setAvailableIssues(issues.filter((issue) => !issue.sprint_id));
    } catch (err) {
      console.error('Failed to fetch issues:', err);
      setError('Failed to fetch issues');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleIssue = (issueId) => {
    setSelectedIssues((prev) =>
      prev.includes(issueId) ? prev.filter((id) => id !== issueId) : [...prev, issueId]
    );
  };

  const handleCreateIssue = async () => {
    if (!newIssueTitle.trim()) return;
    
    try {
      const payload = {
        title: newIssueTitle,
        sprint_id: sprintId,
      };
      if (selectedAssignee) {
        payload.assignee_id = selectedAssignee;
      }
      const response = await api.post(`/api/agile/projects/${projectId}/issues/`, payload);
      setNewIssueTitle('');
      setShowCreateIssue(false);
      await new Promise(resolve => setTimeout(resolve, 500));
      await fetchAvailableIssues();
    } catch (err) {
      console.error('Failed to create issue:', err.response || err);
      setError(err.response?.data?.detail || err.message || 'Failed to create issue');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      for (const issueId of selectedIssues) {
        await api.put(`/api/agile/issues/${issueId}/`, {
          sprint_id: sprintId,
        });
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to add issues:', err.response || err);
      setError(err.response?.data?.detail || err.message || 'Failed to add issues');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white p-8 w-full max-w-md">
          <div className="flex items-center justify-center h-32">
            <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-8 w-full max-w-md max-h-96 overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Add Issues to Sprint</h2>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {availableIssues.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-6">No available issues to add</p>
            <button
              onClick={() => setShowCreateIssue(true)}
              className="px-6 py-3 bg-gray-900 text-white hover:bg-black font-bold uppercase text-sm transition-all"
            >
              <PlusIcon className="w-4 h-4 inline mr-2" />
              Create Issue
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              {availableIssues.map((issue) => (
                <label key={issue.id} className="flex items-center gap-3 p-3 border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIssues.includes(issue.id)}
                    onChange={() => handleToggleIssue(issue.id)}
                    className="w-4 h-4"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-gray-900">{issue.key}</div>
                    <div className="text-xs text-gray-600 truncate">{issue.title}</div>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-6 py-3 border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white font-bold uppercase text-sm transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || selectedIssues.length === 0}
                className="px-6 py-3 bg-gray-900 text-white hover:bg-black font-bold uppercase text-sm transition-all disabled:opacity-50"
              >
                {submitting ? 'Adding...' : 'Add'}
              </button>
            </div>
          </form>
        )}

        {showCreateIssue && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-8 w-full max-w-md">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Create New Issue</h3>
              <input
                type="text"
                value={newIssueTitle}
                onChange={(e) => setNewIssueTitle(e.target.value)}
                placeholder="Issue title"
                className="w-full px-4 py-2 border border-gray-300 focus:border-gray-900 focus:outline-none mb-4"
              />
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-900 mb-2">Assign to</label>
                {teamMembers.length === 0 ? (
                  <div className="text-sm text-gray-600 p-3 border border-gray-300 bg-gray-50">
                    No team members available
                  </div>
                ) : (
                  <select
                    value={selectedAssignee}
                    onChange={(e) => setSelectedAssignee(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 focus:border-gray-900 focus:outline-none"
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.full_name || member.username}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowCreateIssue(false)}
                  className="px-6 py-3 border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white font-bold uppercase text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateIssue}
                  className="px-6 py-3 bg-gray-900 text-white hover:bg-black font-bold uppercase text-sm transition-all"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
