import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

function ProjectDetail() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [sprints, setSprints] = useState([]);
  const [issues, setIssues] = useState([]);
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('sprints');
  const [showCreateSprint, setShowCreateSprint] = useState(false);
  const [showCreateIssue, setShowCreateIssue] = useState(false);
  const [sprintForm, setSprintForm] = useState({ name: '', start_date: '', end_date: '', goal: '' });
  const [issueForm, setIssueForm] = useState({ title: '', description: '', priority: 'medium', sprint_id: '', assignee_id: '' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreatingSprint, setIsCreatingSprint] = useState(false);
  const [isCreatingIssue, setIsCreatingIssue] = useState(false);

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const [projectRes, sprintsRes, issuesRes] = await Promise.all([
        api.get(`/api/agile/projects/${projectId}/`),
        api.get(`/api/agile/projects/${projectId}/sprints/`),
        api.get(`/api/agile/projects/${projectId}/issues/`)
      ]);
      setProject(projectRes.data);
      setSprints(sprintsRes.data);
      setIssues(issuesRes.data);
      setBoards(projectRes.data.boards || []);
    } catch (error) {
      console.error('Failed to fetch project:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSprint = async (e) => {
    e.preventDefault();
    setIsCreatingSprint(true);
    try {
      await api.post(`/api/agile/projects/${projectId}/sprints/`, sprintForm);
      setShowCreateSprint(false);
      setSprintForm({ name: '', start_date: '', end_date: '', goal: '' });
      fetchProject();
    } catch (error) {
      console.error('Failed to create sprint:', error);
    } finally {
      setIsCreatingSprint(false);
    }
  };

  const handleCreateIssue = async (e) => {
    e.preventDefault();
    setIsCreatingIssue(true);
    try {
      await api.post(`/api/agile/projects/${projectId}/issues/`, issueForm);
      setShowCreateIssue(false);
      setIssueForm({ title: '', description: '', priority: 'medium', sprint_id: '', assignee_id: '' });
      fetchProject();
    } catch (error) {
      console.error('Failed to create issue:', error);
    } finally {
      setIsCreatingIssue(false);
    }
  };

  const handleDeleteProject = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/api/agile/projects/${projectId}/delete/`);
      window.location.href = '/projects';
    } catch (error) {
      console.error('Failed to delete project:', error);
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <h2 className="text-4xl font-black text-gray-900 mb-4">Project not found</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-16">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gray-900 flex items-center justify-center text-white font-black text-2xl">
                {project.key.charAt(0)}
              </div>
              <div>
                <h1 className="text-5xl font-black text-gray-900 mb-2">{project.name}</h1>
                <p className="text-lg text-gray-600 font-light">{project.key}</p>
              </div>
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-3 hover:bg-red-50 text-red-600 transition-all"
              title="Delete project"
            >
              <TrashIcon className="w-6 h-6" />
            </button>
          </div>
          {project.description && (
            <p className="text-lg text-gray-600 font-light max-w-2xl">{project.description}</p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-6 mb-12">
          <div className="p-6 bg-white border border-gray-200 text-center">
            <p className="text-3xl font-black text-gray-900 mb-2">{project.issue_count}</p>
            <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Total Issues</p>
          </div>
          <div className="p-6 bg-white border border-gray-200 text-center">
            <p className="text-3xl font-black text-green-600 mb-2">{project.completed_issues}</p>
            <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Completed</p>
          </div>
          <div className="p-6 bg-white border border-gray-200 text-center">
            <p className="text-3xl font-black text-amber-600 mb-2">{project.active_issues}</p>
            <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Active</p>
          </div>
          <div className="p-6 bg-white border border-gray-200 text-center">
            <p className="text-3xl font-black text-gray-900 mb-2">{sprints.length}</p>
            <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Sprints</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-gray-200">
          {['sprints', 'issues', 'roadmap'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-4 font-bold uppercase text-sm transition-all border-b-2 ${
                activeTab === tab
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Sprints Tab */}
        {activeTab === 'sprints' && (
          <div>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-gray-900">Sprints</h2>
              <button
                onClick={() => setShowCreateSprint(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white hover:bg-black font-bold uppercase text-sm transition-all"
              >
                <PlusIcon className="w-4 h-4" />
                New Sprint
              </button>
            </div>

            {sprints.length === 0 ? (
              <div className="p-8 bg-white border border-gray-200 text-center">
                <p className="text-gray-600 mb-6">No sprints yet</p>
                <button
                  onClick={() => setShowCreateSprint(true)}
                  className="px-6 py-3 bg-gray-900 text-white hover:bg-black font-bold uppercase text-sm transition-all"
                >
                  Create First Sprint
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {sprints.map(sprint => (
                  <Link
                    key={sprint.id}
                    to={`/sprints/${sprint.id}`}
                    className="block p-6 bg-white border border-gray-200 hover:border-gray-900 hover:shadow-md transition-all"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">{sprint.name}</h3>
                        <p className="text-sm text-gray-600">{sprint.start_date} to {sprint.end_date}</p>
                        {sprint.goal && <p className="text-sm text-gray-600 mt-2 italic">{sprint.goal}</p>}
                      </div>
                      <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                        sprint.status === 'active' ? 'bg-green-100 text-green-700' :
                        sprint.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {sprint.status}
                      </span>
                    </div>
                    <div className="flex gap-6 text-sm text-gray-600">
                      <span>{sprint.issue_count} issues</span>
                      <span>{sprint.completed_count} completed</span>
                      {sprint.blocked_count > 0 && <span className="text-red-600">{sprint.blocked_count} blocked</span>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Issues Tab */}
        {activeTab === 'issues' && (
          <div>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-gray-900">Issues</h2>
              <div className="flex gap-4">
                {boards.length > 0 && (
                  <a href={`/boards/${boards[0].id}`} className="px-6 py-3 bg-gray-900 text-white hover:bg-black font-bold uppercase text-sm transition-all">
                    View Kanban Board
                  </a>
                )}
                <button
                  onClick={() => setShowCreateIssue(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white hover:bg-black font-bold uppercase text-sm transition-all"
                >
                  <PlusIcon className="w-4 h-4" />
                  New Issue
                </button>
              </div>
            </div>

            {issues.length === 0 ? (
              <div className="p-8 bg-white border border-gray-200 text-center">
                <p className="text-gray-600 mb-6">No issues yet</p>
                <button
                  onClick={() => setShowCreateIssue(true)}
                  className="px-6 py-3 bg-gray-900 text-white hover:bg-black font-bold uppercase text-sm transition-all"
                >
                  Create First Issue
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {issues.map(issue => (
                  <Link
                    key={issue.id}
                    to={`/issues/${issue.id}`}
                    className="block p-4 bg-white border border-gray-200 hover:border-gray-900 hover:shadow-md transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-bold text-gray-900">{issue.key}</span>
                          <span className={`px-2 py-1 text-xs font-bold uppercase ${
                            issue.priority === 'highest' ? 'bg-red-100 text-red-700' :
                            issue.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                            issue.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {issue.priority}
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-gray-900 mb-1">{issue.title}</h4>
                        <div className="flex gap-4 text-xs text-gray-600">
                          <span>Status: {issue.status}</span>
                          {issue.assignee && <span>Assigned: {issue.assignee}</span>}
                          {issue.sprint_name && <span>Sprint: {issue.sprint_name}</span>}
                        </div>
                      </div>
                      {issue.story_points && (
                        <div className="text-right">
                          <p className="text-2xl font-black text-gray-900">{issue.story_points}</p>
                          <p className="text-xs text-gray-600">points</p>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Roadmap Tab */}
        {activeTab === 'roadmap' && (
          <div>
            <h2 className="text-2xl font-black text-gray-900 mb-8">Project Roadmap</h2>
            {sprints.length === 0 ? (
              <div className="p-8 bg-white border border-gray-200 text-center">
                <p className="text-gray-600">No sprints to display</p>
              </div>
            ) : (
              <div className="space-y-6">
                {sprints.map(sprint => (
                  <div key={sprint.id} className="p-6 bg-white border border-gray-200">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{sprint.name}</h3>
                        <p className="text-sm text-gray-600">{sprint.start_date} to {sprint.end_date}</p>
                      </div>
                      <span className="text-sm font-bold text-gray-600">{sprint.completed_count}/{sprint.issue_count} completed</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200">
                      <div
                        style={{ width: `${sprint.issue_count > 0 ? (sprint.completed_count / sprint.issue_count) * 100 : 0}%` }}
                        className="h-full bg-green-600 transition-all"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create Sprint Modal */}
        {showCreateSprint && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-8 w-full max-w-md">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Sprint</h2>
              <form onSubmit={handleCreateSprint} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">Name *</label>
                  <input
                    type="text"
                    value={sprintForm.name}
                    onChange={(e) => setSprintForm({ ...sprintForm, name: e.target.value })}
                    placeholder="e.g., Sprint 1"
                    className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">Start Date *</label>
                    <input
                      type="date"
                      value={sprintForm.start_date}
                      onChange={(e) => setSprintForm({ ...sprintForm, start_date: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">End Date *</label>
                    <input
                      type="date"
                      value={sprintForm.end_date}
                      onChange={(e) => setSprintForm({ ...sprintForm, end_date: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">Goal</label>
                  <textarea
                    value={sprintForm.goal}
                    onChange={(e) => setSprintForm({ ...sprintForm, goal: e.target.value })}
                    placeholder="Sprint goal..."
                    className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all min-h-20"
                  />
                </div>
                <div className="flex gap-3 justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateSprint(false)}
                    className="px-6 py-3 border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white font-bold uppercase text-sm transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingSprint}
                    className="px-6 py-3 bg-gray-900 text-white hover:bg-black font-bold uppercase text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isCreatingSprint && (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    Create Sprint
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Create Issue Modal */}
        {showCreateIssue && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-8 w-full max-w-md">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Issue</h2>
              <form onSubmit={handleCreateIssue} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">Title *</label>
                  <input
                    type="text"
                    value={issueForm.title}
                    onChange={(e) => setIssueForm({ ...issueForm, title: e.target.value })}
                    placeholder="Issue title"
                    className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">Description</label>
                  <textarea
                    value={issueForm.description}
                    onChange={(e) => setIssueForm({ ...issueForm, description: e.target.value })}
                    placeholder="Issue description"
                    className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all min-h-20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">Priority</label>
                    <select
                      value={issueForm.priority}
                      onChange={(e) => setIssueForm({ ...issueForm, priority: e.target.value })}
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
                    <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">Sprint</label>
                    <select
                      value={issueForm.sprint_id}
                      onChange={(e) => setIssueForm({ ...issueForm, sprint_id: e.target.value ? parseInt(e.target.value) : '' })}
                      className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
                    >
                      <option value="">Backlog</option>
                      {sprints.map(sprint => (
                        <option key={sprint.id} value={sprint.id}>{sprint.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">Assignee</label>
                  <input
                    type="text"
                    value={issueForm.assignee_id}
                    onChange={(e) => setIssueForm({ ...issueForm, assignee_id: e.target.value })}
                    placeholder="User ID or name"
                    className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
                  />
                </div>
                <div className="flex gap-3 justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateIssue(false)}
                    className="px-6 py-3 border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white font-bold uppercase text-sm transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingIssue}
                    className="px-6 py-3 bg-gray-900 text-white hover:bg-black font-bold uppercase text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isCreatingIssue && (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    Create Issue
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-8 w-full max-w-md">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Delete Project?</h2>
              <p className="text-gray-600 mb-6">This will permanently delete the project and all associated sprints, issues, and data.</p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-6 py-3 border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white font-bold uppercase text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteProject}
                  disabled={isDeleting}
                  className="px-6 py-3 bg-red-600 text-white hover:bg-red-700 font-bold uppercase text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isDeleting && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  Delete Project
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProjectDetail;
