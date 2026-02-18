import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PlusIcon, TrashIcon, ChartBarIcon, RocketLaunchIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import { useTheme } from '../utils/ThemeAndAccessibility';

function ProjectDetail() {
  const { projectId } = useParams();
  const { darkMode } = useTheme();
  const [project, setProject] = useState(null);
  const [sprints, setSprints] = useState([]);
  const [issues, setIssues] = useState([]);
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('sprints');
  const [teamMembers, setTeamMembers] = useState([]);
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
    fetchTeamMembers();
    
    const interval = setInterval(() => {
      fetchProject();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [projectId]);

  const fetchTeamMembers = async () => {
    try {
      const response = await api.get('/api/organizations/members/');
      setTeamMembers(response.data || []);
    } catch (error) {
      console.error('Failed to fetch team members:', error);
      setTeamMembers([]);
    }
  };

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

  const bgColor = darkMode ? 'bg-stone-950' : 'bg-white';
  const cardBg = darkMode ? 'bg-stone-900' : 'bg-white';
  const borderColor = darkMode ? 'border-stone-800' : 'border-gray-200';
  const textColor = darkMode ? 'text-stone-100' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-stone-400' : 'text-gray-600';
  const textTertiary = darkMode ? 'text-stone-500' : 'text-gray-500';
  const hoverBorder = darkMode ? 'hover:border-stone-700' : 'hover:border-gray-300';
  const hoverBg = darkMode ? 'hover:bg-stone-700' : 'hover:bg-gray-100';
  const inputBg = darkMode ? 'bg-stone-800' : 'bg-gray-50';
  const inputBorder = darkMode ? 'border-stone-700' : 'border-gray-300';
  const inputText = darkMode ? 'text-stone-200' : 'text-gray-900';
  const modalBg = darkMode ? 'bg-stone-900' : 'bg-white';
  const buttonBg = darkMode ? 'bg-stone-800' : 'bg-gray-100';
  const buttonText = darkMode ? 'text-stone-200' : 'text-gray-700';

  if (loading) {
    return (
      <div className={`min-h-screen ${bgColor} flex items-center justify-center`}>
        <div className={`w-8 h-8 border-2 ${darkMode ? 'border-stone-700 border-t-stone-400' : 'border-gray-300 border-t-gray-600'} rounded-full animate-spin`}></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className={`min-h-screen ${bgColor} flex items-center justify-center`}>
        <h2 className={`text-xl font-semibold ${textTertiary}`}>Project not found</h2>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bgColor}`}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className={`${cardBg} border ${borderColor} rounded-lg p-6`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 ${inputBg} rounded-lg flex items-center justify-center text-white font-bold text-xl border ${inputBorder}`}>
                  {project.key.charAt(0)}
                </div>
                <div>
                  <h1 className={`text-2xl font-bold ${textColor} mb-1`}>{project.name}</h1>
                  <p className={`text-sm ${textTertiary} font-mono`}>{project.key}</p>
                </div>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 hover:bg-red-900/20 text-red-400 rounded transition-all border border-transparent hover:border-red-900/30"
                title="Delete project"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            </div>
            {project.description && (
              <p className={`${textSecondary} leading-relaxed`}>{project.description}</p>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="flex gap-4 mb-8">
          <Link to={`/projects/${projectId}/backlog`} className={`px-5 py-2 ${buttonBg} ${buttonText} rounded ${hoverBg} font-medium text-sm transition-all border ${borderColor}`}>
            View Backlog
          </Link>
          {boards.length > 0 && (
            <Link to={`/boards/${boards[0].id}`} className={`px-5 py-2 ${buttonBg} ${buttonText} rounded ${hoverBg} font-medium text-sm transition-all border ${borderColor}`}>
              View Kanban Board
            </Link>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={ChartBarIcon} label="Total Issues" value={project.issue_count} />
          <StatCard icon={CheckCircleIcon} label="Completed" value={project.completed_issues} color="green" />
          <StatCard icon={ClockIcon} label="Active" value={project.active_issues} color="blue" />
          <StatCard icon={RocketLaunchIcon} label="Sprints" value={sprints.length} color="purple" />
        </div>

        {/* Tabs */}
        <div className={`flex gap-2 mb-8 ${cardBg} border ${borderColor} rounded-lg p-1`}>
          {['sprints', 'issues', 'roadmap'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-2 font-medium text-sm transition-all rounded ${
                activeTab === tab
                  ? `${inputBg} ${textColor} border ${inputBorder}`
                  : `${textTertiary} hover:${textSecondary}`
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Sprints Tab */}
        {activeTab === 'sprints' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-xl font-bold ${textColor}`}>Sprints</h2>
              <button
                onClick={() => setShowCreateSprint(true)}
                className={`flex items-center gap-2 px-4 py-2 ${buttonBg} ${buttonText} rounded ${hoverBg} font-medium text-sm transition-all border ${borderColor}`}
              >
                <PlusIcon className="w-4 h-4" />
                New Sprint
              </button>
            </div>

            {sprints.length === 0 ? (
              <div className={`p-12 ${cardBg} border ${borderColor} rounded-lg text-center`}>
                <p className={`${textTertiary} mb-6`}>No sprints yet</p>
                <button
                  onClick={() => setShowCreateSprint(true)}
                  className={`px-5 py-2 ${buttonBg} ${buttonText} rounded ${hoverBg} font-medium text-sm transition-all border ${borderColor}`}
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
                    className={`block p-5 ${cardBg} border ${borderColor} rounded-lg ${hoverBorder} ${darkMode ? 'hover:bg-stone-900/80' : 'hover:bg-gray-50'} transition-all`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className={`text-base font-semibold ${textColor} mb-1`}>{sprint.name}</h3>
                        <p className={`text-sm ${textTertiary}`}>{sprint.start_date} to {sprint.end_date}</p>
                        {sprint.goal && <p className={`text-sm ${textTertiary} mt-2 italic`}>{sprint.goal}</p>}
                      </div>
                      <span className={`px-3 py-1 text-xs font-semibold rounded border ${
                        sprint.status === 'active' ? 'bg-green-900/20 text-green-400 border-green-800' :
                        sprint.status === 'completed' ? `${inputBg} ${textSecondary} border ${inputBorder}` :
                        'bg-blue-900/20 text-blue-400 border-blue-800'
                      }`}>
                        {sprint.status}
                      </span>
                    </div>
                    <div className={`flex gap-6 text-sm ${textTertiary}`}>
                      <span>{sprint.issue_count} issues</span>
                      <span className="text-green-400">{sprint.completed_count} completed</span>
                      {sprint.blocked_count > 0 && <span className="text-red-400">{sprint.blocked_count} blocked</span>}
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
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-xl font-bold ${textColor}`}>Issues</h2>
              <button
                onClick={() => setShowCreateIssue(true)}
                className={`flex items-center gap-2 px-4 py-2 ${buttonBg} ${buttonText} rounded ${hoverBg} font-medium text-sm transition-all border ${borderColor}`}
              >
                <PlusIcon className="w-4 h-4" />
                New Issue
              </button>
            </div>

            {issues.length === 0 ? (
              <div className={`p-12 ${cardBg} border ${borderColor} rounded-lg text-center`}>
                <p className={`${textTertiary} mb-6`}>No issues yet</p>
                <button
                  onClick={() => setShowCreateIssue(true)}
                  className={`px-5 py-2 ${buttonBg} ${buttonText} rounded ${hoverBg} font-medium text-sm transition-all border ${borderColor}`}
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
                    className={`block p-4 ${cardBg} border ${borderColor} rounded-lg ${hoverBorder} ${darkMode ? 'hover:bg-stone-900/80' : 'hover:bg-gray-50'} transition-all`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`font-semibold ${darkMode ? 'text-stone-300' : 'text-gray-700'} font-mono text-sm`}>{issue.key}</span>
                          <span className={`px-2 py-1 text-xs font-semibold rounded border ${
                            issue.priority === 'highest' ? 'bg-red-900/20 text-red-400 border-red-800' :
                            issue.priority === 'high' ? 'bg-orange-900/20 text-orange-400 border-orange-800' :
                            issue.priority === 'medium' ? 'bg-yellow-900/20 text-yellow-400 border-yellow-800' :
                            `${inputBg} ${textSecondary} border ${inputBorder}`
                          }`}>
                            {issue.priority}
                          </span>
                        </div>
                        <h4 className={`text-base font-semibold ${textColor} mb-2`}>{issue.title}</h4>
                        <div className={`flex gap-4 text-xs ${textTertiary}`}>
                          <span>Status: {issue.status}</span>
                          {issue.assignee && <span>Assigned: {issue.assignee}</span>}
                          {issue.sprint_name && <span>Sprint: {issue.sprint_name}</span>}
                        </div>
                      </div>
                      {issue.story_points && (
                        <div className="text-right ml-4">
                          <p className={`text-xl font-bold ${textSecondary}`}>{issue.story_points}</p>
                          <p className={`text-xs ${darkMode ? 'text-stone-600' : 'text-gray-400'}`}>points</p>
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
            <h2 className={`text-xl font-bold ${textColor} mb-6`}>Project Roadmap</h2>
            {sprints.length === 0 ? (
              <div className={`p-12 ${cardBg} border ${borderColor} rounded-lg text-center`}>
                <p className={textTertiary}>No sprints to display</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sprints.map(sprint => (
                  <div key={sprint.id} className={`p-5 ${cardBg} border ${borderColor} rounded-lg ${hoverBorder} transition-all`}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className={`text-base font-semibold ${textColor}`}>{sprint.name}</h3>
                        <p className={`text-sm ${textTertiary}`}>{sprint.start_date} to {sprint.end_date}</p>
                      </div>
                      <span className={`text-sm font-medium ${textSecondary}`}>{sprint.completed_count}/{sprint.issue_count} completed</span>
                    </div>
                    <div className={`w-full h-2 ${inputBg} rounded-full overflow-hidden`}>
                      <div
                        style={{ width: `${sprint.issue_count > 0 ? (sprint.completed_count / sprint.issue_count) * 100 : 0}%` }}
                        className="h-full bg-green-600 transition-all rounded-full"
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
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className={`${modalBg} border ${borderColor} rounded-lg p-6 w-full max-w-md`}>
              <h2 className={`text-xl font-bold ${textColor} mb-5`}>Create Sprint</h2>
              <form onSubmit={handleCreateSprint} className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium ${textSecondary} mb-2`}>Name *</label>
                  <input
                    type="text"
                    value={sprintForm.name}
                    onChange={(e) => setSprintForm({ ...sprintForm, name: e.target.value })}
                    placeholder="e.g., Sprint 1"
                    className={`w-full px-3 py-2 ${inputBg} ${inputText} border ${inputBorder} rounded focus:outline-none ${darkMode ? 'focus:border-stone-600' : 'focus:border-gray-400'} transition-all`}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium ${textSecondary} mb-2`}>Start Date *</label>
                    <input
                      type="date"
                      value={sprintForm.start_date}
                      onChange={(e) => setSprintForm({ ...sprintForm, start_date: e.target.value })}
                      className={`w-full px-3 py-2 ${inputBg} ${inputText} border ${inputBorder} rounded focus:outline-none ${darkMode ? 'focus:border-stone-600' : 'focus:border-gray-400'} transition-all`}
                      required
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${textSecondary} mb-2`}>End Date *</label>
                    <input
                      type="date"
                      value={sprintForm.end_date}
                      onChange={(e) => setSprintForm({ ...sprintForm, end_date: e.target.value })}
                      className={`w-full px-3 py-2 ${inputBg} ${inputText} border ${inputBorder} rounded focus:outline-none ${darkMode ? 'focus:border-stone-600' : 'focus:border-gray-400'} transition-all`}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className={`block text-sm font-medium ${textSecondary} mb-2`}>Goal</label>
                  <textarea
                    value={sprintForm.goal}
                    onChange={(e) => setSprintForm({ ...sprintForm, goal: e.target.value })}
                    placeholder="Sprint goal..."
                    className={`w-full px-3 py-2 ${inputBg} ${inputText} border ${inputBorder} rounded focus:outline-none ${darkMode ? 'focus:border-stone-600' : 'focus:border-gray-400'} transition-all min-h-20`}
                  />
                </div>
                <div className="flex gap-3 justify-end pt-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateSprint(false)}
                    className={`px-4 py-2 ${buttonBg} ${darkMode ? 'text-stone-300' : 'text-gray-700'} border ${borderColor} rounded ${hoverBg} font-medium text-sm transition-all`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingSprint}
                    className={`px-4 py-2 ${darkMode ? 'bg-stone-700 text-stone-100 border-stone-600 hover:bg-stone-600' : 'bg-gray-200 text-gray-900 border-gray-300 hover:bg-gray-300'} rounded font-medium text-sm transition-all disabled:opacity-50 border flex items-center gap-2`}
                  >
                    {isCreatingSprint && (
                      <div className={`w-4 h-4 border-2 ${darkMode ? 'border-stone-400 border-t-transparent' : 'border-gray-600 border-t-transparent'} rounded-full animate-spin`} />
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
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className={`${modalBg} border ${borderColor} rounded-lg p-6 w-full max-w-md`}>
              <h2 className={`text-xl font-bold ${textColor} mb-5`}>Create Issue</h2>
              <form onSubmit={handleCreateIssue} className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium ${textSecondary} mb-2`}>Title *</label>
                  <input
                    type="text"
                    value={issueForm.title}
                    onChange={(e) => setIssueForm({ ...issueForm, title: e.target.value })}
                    placeholder="Issue title"
                    className={`w-full px-3 py-2 ${inputBg} ${inputText} border ${inputBorder} rounded focus:outline-none ${darkMode ? 'focus:border-stone-600' : 'focus:border-gray-400'} transition-all`}
                    required
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${textSecondary} mb-2`}>Description</label>
                  <textarea
                    value={issueForm.description}
                    onChange={(e) => setIssueForm({ ...issueForm, description: e.target.value })}
                    placeholder="Issue description"
                    className={`w-full px-3 py-2 ${inputBg} ${inputText} border ${inputBorder} rounded focus:outline-none ${darkMode ? 'focus:border-stone-600' : 'focus:border-gray-400'} transition-all min-h-20`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium ${textSecondary} mb-2`}>Priority</label>
                    <select
                      value={issueForm.priority}
                      onChange={(e) => setIssueForm({ ...issueForm, priority: e.target.value })}
                      className={`w-full px-3 py-2 ${inputBg} ${inputText} border ${inputBorder} rounded focus:outline-none ${darkMode ? 'focus:border-stone-600' : 'focus:border-gray-400'} transition-all`}
                    >
                      <option value="lowest">Lowest</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="highest">Highest</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${textSecondary} mb-2`}>Sprint</label>
                    <select
                      value={issueForm.sprint_id}
                      onChange={(e) => setIssueForm({ ...issueForm, sprint_id: e.target.value ? parseInt(e.target.value) : '' })}
                      className={`w-full px-3 py-2 ${inputBg} ${inputText} border ${inputBorder} rounded focus:outline-none ${darkMode ? 'focus:border-stone-600' : 'focus:border-gray-400'} transition-all`}
                    >
                      <option value="">Backlog</option>
                      {sprints.map(sprint => (
                        <option key={sprint.id} value={sprint.id}>{sprint.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className={`block text-sm font-medium ${textSecondary} mb-2`}>Assignee</label>
                  <select
                    value={issueForm.assignee_id}
                    onChange={(e) => setIssueForm({ ...issueForm, assignee_id: e.target.value ? parseInt(e.target.value) : '' })}
                    className={`w-full px-3 py-2 ${inputBg} ${inputText} border ${inputBorder} rounded focus:outline-none ${darkMode ? 'focus:border-stone-600' : 'focus:border-gray-400'} transition-all`}
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.full_name || member.username}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 justify-end pt-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateIssue(false)}
                    className={`px-4 py-2 ${buttonBg} ${darkMode ? 'text-stone-300' : 'text-gray-700'} border ${borderColor} rounded ${hoverBg} font-medium text-sm transition-all`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingIssue}
                    className={`px-4 py-2 ${darkMode ? 'bg-stone-700 text-stone-100 border-stone-600 hover:bg-stone-600' : 'bg-gray-200 text-gray-900 border-gray-300 hover:bg-gray-300'} rounded font-medium text-sm transition-all disabled:opacity-50 border flex items-center gap-2`}
                  >
                    {isCreatingIssue && (
                      <div className={`w-4 h-4 border-2 ${darkMode ? 'border-stone-400 border-t-transparent' : 'border-gray-600 border-t-transparent'} rounded-full animate-spin`} />
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
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className={`${modalBg} border ${borderColor} rounded-lg p-6 w-full max-w-md`}>
              <h2 className={`text-xl font-bold ${textColor} mb-3`}>Delete Project?</h2>
              <p className={`${textSecondary} mb-6`}>This will permanently delete the project and all associated sprints, issues, and data.</p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className={`px-4 py-2 ${buttonBg} ${darkMode ? 'text-stone-300' : 'text-gray-700'} border ${borderColor} rounded ${hoverBg} font-medium text-sm transition-all`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteProject}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-900 text-red-200 rounded hover:bg-red-800 font-medium text-sm transition-all disabled:opacity-50 border border-red-800 flex items-center gap-2"
                >
                  {isDeleting && (
                    <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
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

function StatCard({ icon: Icon, label, value, color = 'stone' }) {
  const { darkMode } = useTheme();
  const colors = darkMode ? {
    stone: { bg: 'bg-stone-900', border: 'border-stone-800', text: 'text-stone-100', icon: 'text-stone-500' },
    green: { bg: 'bg-green-900/20', border: 'border-green-800', text: 'text-green-400', icon: 'text-green-500' },
    blue: { bg: 'bg-blue-900/20', border: 'border-blue-800', text: 'text-blue-400', icon: 'text-blue-500' },
    purple: { bg: 'bg-purple-900/20', border: 'border-purple-800', text: 'text-purple-400', icon: 'text-purple-500' }
  } : {
    stone: { bg: 'bg-white', border: 'border-gray-200', text: 'text-gray-900', icon: 'text-gray-500' },
    green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600', icon: 'text-green-500' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', icon: 'text-blue-500' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600', icon: 'text-purple-500' }
  };
  const style = colors[color];
  return (
    <div className={`p-5 ${style.bg} border ${style.border} rounded-lg ${darkMode ? 'hover:border-stone-700' : 'hover:border-gray-300'} transition-all`}>
      <div className="flex items-center justify-between mb-3">
        {Icon && <Icon className={`w-5 h-5 ${style.icon}`} />}
        <p className={`text-2xl font-bold ${style.text}`}>{value}</p>
      </div>
      <p className={`text-xs font-semibold uppercase ${darkMode ? 'text-stone-500' : 'text-gray-500'}`}>{label}</p>
    </div>
  );
}

export default ProjectDetail;
