import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PlusIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import BulkEditBar from '../components/BulkEditBar';

function Backlog() {
  const { projectId } = useParams();
  const [backlog, setBacklog] = useState(null);
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateIssue, setShowCreateIssue] = useState(false);
  const [selectedIssues, setSelectedIssues] = useState(new Set());

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    try {
      const [backlogRes, sprintsRes] = await Promise.all([
        api.get(`/api/agile/projects/${projectId}/backlog/`),
        api.get(`/api/agile/projects/${projectId}/sprints/`)
      ]);
      setBacklog(backlogRes.data);
      setSprints(sprintsRes.data);
    } catch (error) {
      console.error('Failed to fetch backlog:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMoveToSprint = async (sprintId) => {
    if (selectedIssues.size === 0) return;

    try {
      for (const issueId of selectedIssues) {
        await api.put(`/api/agile/issues/${issueId}/`, { sprint_id: sprintId });
      }
      setSelectedIssues(new Set());
      fetchData();
    } catch (error) {
      console.error('Failed to move issues:', error);
    }
  };

  const toggleIssueSelection = (issueId) => {
    const newSelected = new Set(selectedIssues);
    if (newSelected.has(issueId)) {
      newSelected.delete(issueId);
    } else {
      newSelected.add(issueId);
    }
    setSelectedIssues(newSelected);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-16">
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-5xl font-black text-white">Product Backlog</h1>
          <button
            onClick={() => setShowCreateIssue(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gray-800 text-white hover:bg-gray-700 font-bold uppercase text-sm transition-all border border-gray-600"
          >
            <PlusIcon className="w-4 h-4" />
            New Issue
          </button>
        </div>

        <div className="grid grid-cols-3 gap-8">
          {/* Backlog Column */}
          <div className="col-span-2">
            <div className="p-8 bg-gray-800 border border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-white">Backlog ({backlog?.issue_count || 0})</h2>
                {selectedIssues.size > 0 && (
                  <span className="text-sm font-bold text-gray-400">{selectedIssues.size} selected</span>
                )}
              </div>

              {!backlog?.issues || backlog.issues.length === 0 ? (
                <p className="text-gray-400 font-medium py-8">No issues in backlog</p>
              ) : (
                <div className="space-y-3">
                  {backlog.issues.map(issue => (
                    <div
                      key={issue.id}
                      className={`p-4 border-l-4 cursor-pointer transition-all ${
                        selectedIssues.has(issue.id)
                          ? 'bg-gray-700 border-l-gray-400'
                          : 'bg-gray-800 border-l-gray-600 hover:border-l-gray-400'
                      }`}
                      onClick={() => toggleIssueSelection(issue.id)}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedIssues.has(issue.id)}
                          onChange={() => toggleIssueSelection(issue.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-gray-400 uppercase">{issue.key}</span>
                            <span className="text-xs px-2 py-1 bg-gray-700 text-gray-300 font-semibold rounded">
                              {issue.issue_type}
                            </span>
                          </div>
                          <h3 className="font-bold text-white mb-2">{issue.title}</h3>
                          <div className="flex gap-4 text-xs text-gray-400">
                            {issue.assignee_name && <div>Assigned: {issue.assignee_name}</div>}
                            {issue.story_points && <div>{issue.story_points} pts</div>}
                            <div className={`font-semibold ${getPriorityColor(issue.priority)}`}>
                              {issue.priority}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sprints Column */}
          <div className="space-y-6">
            <div className="p-8 bg-gray-800 border border-gray-700">
              <h3 className="text-lg font-bold text-white mb-4">Active Sprints</h3>
              {sprints.length === 0 ? (
                <p className="text-sm text-gray-400">No sprints</p>
              ) : (
                <div className="space-y-3">
                  {sprints.map(sprint => (
                    <button
                      key={sprint.id}
                      onClick={() => handleMoveToSprint(sprint.id)}
                      disabled={selectedIssues.size === 0}
                      className="w-full p-4 bg-gray-700 hover:bg-gray-600 border border-gray-600 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-white text-sm">{sprint.name}</div>
                          <div className="text-xs text-gray-400">{sprint.start_date}</div>
                        </div>
                        <ArrowRightIcon className="w-4 h-4 text-gray-500" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedIssues.size > 0 && (
              <div className="p-4 bg-blue-900/30 border border-blue-700 rounded">
                <p className="text-sm text-blue-300 font-medium">
                  Select a sprint above to move {selectedIssues.size} issue{selectedIssues.size !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showCreateIssue && (
        <CreateIssueModal
          projectId={projectId}
          onClose={() => setShowCreateIssue(false)}
          onSuccess={() => {
            setShowCreateIssue(false);
            fetchData();
          }}
        />
      )}
      
      <BulkEditBar 
        selectedIssues={Array.from(selectedIssues)}
        onUpdate={fetchData}
        onClear={() => setSelectedIssues(new Set())}
      />
    </div>
  );
}

function getPriorityColor(priority) {
  switch (priority) {
    case 'highest':
      return 'text-red-600';
    case 'high':
      return 'text-orange-600';
    case 'medium':
      return 'text-yellow-600';
    case 'low':
      return 'text-blue-600';
    default:
      return 'text-gray-600';
  }
}

function CreateIssueModal({ projectId, onClose, onSuccess }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [issueType, setIssueType] = useState('task');
  const [priority, setPriority] = useState('medium');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/api/agile/issues/', {
        title,
        description,
        issue_type: issueType,
        priority,
        project: projectId
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to create issue:', error);
      alert('Failed to create issue: ' + (error.response?.data?.detail || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Issue</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Issue title"
              className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">Type</label>
            <select
              value={issueType}
              onChange={(e) => setIssueType(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
            >
              <option value="epic">Epic</option>
              <option value="story">Story</option>
              <option value="task">Task</option>
              <option value="bug">Bug</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
            >
              <option value="lowest">Lowest</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="highest">Highest</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Issue description"
              className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all min-h-24"
            />
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
              disabled={submitting}
              className="px-6 py-3 bg-gray-900 text-white hover:bg-black font-bold uppercase text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {submitting ? 'Creating...' : 'Create Issue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Backlog;
