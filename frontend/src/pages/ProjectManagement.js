import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { PlusIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

function ProjectManagement() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('overview');
  const [sprints, setSprints] = useState([]);
  const [issues, setIssues] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [showSprintForm, setShowSprintForm] = useState(false);
  const [sprintData, setSprintData] = useState({ name: '', goal: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      const [projRes, sprintsRes, issuesRes, teamRes] = await Promise.all([
        api.get(`/api/agile/projects/${projectId}/`),
        api.get(`/api/agile/projects/${projectId}/sprints/`),
        api.get(`/api/agile/projects/${projectId}/issues/`).catch(() => ({ data: [] })),
        api.get('/api/auth/team/').catch(() => ({ data: [] }))
      ]);
      
      setProject(projRes.data);
      setSprints(sprintsRes.data);
      setIssues(issuesRes.data);
      setTeamMembers(teamRes.data);
    } catch (error) {
      console.error('Failed to fetch project data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSprint = async (e) => {
    e.preventDefault();
    if (!sprintData.name.trim()) return;
    
    setSubmitting(true);
    try {
      await api.post(`/api/agile/projects/${projectId}/sprints/`, sprintData);
      setShowSprintForm(false);
      setSprintData({ name: '', goal: '' });
      fetchProjectData();
    } catch (error) {
      console.error('Failed to create sprint:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (!project) return <div>Project not found</div>;

  const activeSprint = sprints.find(s => s.status === 'active');
  const completedSprints = sprints.filter(s => s.status === 'completed');
  const todoIssues = issues.filter(i => i.status === 'todo');
  const inProgressIssues = issues.filter(i => i.status === 'in_progress');
  const doneIssues = issues.filter(i => i.status === 'done');

  const sections = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'planning', label: 'Planning', icon: '📋' },
    { id: 'execution', label: 'Execution', icon: '⚙️' },
    { id: 'team', label: 'Team', icon: '👥' }
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-16">
        {/* Header */}
        <div className="mb-12">
          <button onClick={() => navigate('/projects')} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 font-medium mb-4">
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Projects
          </button>
          <h1 className="text-6xl font-black text-gray-900 mb-3 tracking-tight">{project.name}</h1>
          <p className="text-lg text-gray-600 font-light">{project.key} • {project.description}</p>
        </div>

        {/* Navigation */}
        <div className="flex gap-2 mb-12 border-b border-gray-200 pb-4">
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`px-6 py-3 text-sm font-bold uppercase tracking-wide transition-all ${
                activeSection === section.id
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {section.icon} {section.label}
            </button>
          ))}
        </div>

        {/* Overview Section */}
        {activeSection === 'overview' && (
          <div className="space-y-12">
            {/* Key Metrics */}
            <div className="grid grid-cols-4 gap-6">
              <MetricBox label="Total Issues" value={issues.length} />
              <MetricBox label="Active Sprint" value={activeSprint ? activeSprint.name : 'None'} />
              <MetricBox label="Completed" value={doneIssues.length} />
              <MetricBox label="In Progress" value={inProgressIssues.length} />
            </div>

            {/* Active Sprint */}
            {activeSprint && (
              <div className="p-8 bg-white border border-gray-200">
                <h2 className="text-2xl font-black text-gray-900 mb-6">Active Sprint: {activeSprint.name}</h2>
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-2">Duration</p>
                    <p className="text-lg font-bold text-gray-900">{activeSprint.start_date} to {activeSprint.end_date}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-2">Progress</p>
                    <p className="text-lg font-bold text-gray-900">{activeSprint.completed}/{activeSprint.issue_count} issues</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-2">Goal</p>
                    <p className="text-lg font-bold text-gray-900">{activeSprint.goal || '−'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Activity */}
            <div className="p-8 bg-white border border-gray-200">
              <h2 className="text-2xl font-black text-gray-900 mb-6">Recent Activity</h2>
              <div className="space-y-3">
                {completedSprints.slice(0, 5).map(sprint => (
                  <div key={sprint.id} className="p-4 bg-gray-50 border border-gray-200 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-gray-900">{sprint.name}</p>
                      <p className="text-xs text-gray-600">{sprint.start_date} to {sprint.end_date}</p>
                    </div>
                    <span className="text-sm font-bold text-green-600">Completed</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Planning Section */}
        {activeSection === 'planning' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-black text-gray-900">Sprint Planning</h2>
              <button
                onClick={() => setShowSprintForm(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white hover:bg-black font-bold uppercase text-sm transition-all"
              >
                <PlusIcon className="w-4 h-4" />
                New Sprint
              </button>
            </div>

            {showSprintForm && (
              <div className="p-8 bg-white border border-gray-200">
                <form onSubmit={handleCreateSprint} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">Sprint Name *</label>
                    <input
                      type="text"
                      value={sprintData.name}
                      onChange={(e) => setSprintData({ ...sprintData, name: e.target.value })}
                      placeholder="e.g., Sprint 1"
                      className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">Goal</label>
                    <textarea
                      value={sprintData.goal}
                      onChange={(e) => setSprintData({ ...sprintData, goal: e.target.value })}
                      placeholder="Sprint goal..."
                      rows="3"
                      className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
                      disabled={submitting}
                    />
                  </div>
                  <div className="flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowSprintForm(false)}
                      disabled={submitting}
                      className="px-6 py-3 border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white font-bold uppercase text-sm transition-all disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-3 bg-gray-900 text-white hover:bg-black font-bold uppercase text-sm transition-all disabled:opacity-50"
                    >
                      {submitting ? 'Creating...' : 'Create Sprint'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Sprints List */}
            <div className="space-y-4">
              {sprints.length === 0 ? (
                <div className="p-12 bg-white border border-gray-200 text-center">
                  <p className="text-gray-600 font-medium">No sprints yet. Create one to start planning.</p>
                </div>
              ) : (
                sprints.map(sprint => (
                  <div key={sprint.id} className="p-6 bg-white border border-gray-200 hover:border-gray-900 hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate(`/sprints/${sprint.id}`)}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{sprint.name}</h3>
                        <p className="text-sm text-gray-600">{sprint.start_date} to {sprint.end_date}</p>
                      </div>
                      <span className={`px-3 py-1 text-xs font-bold uppercase ${
                        sprint.status === 'active' ? 'bg-green-100 text-green-900' :
                        sprint.status === 'completed' ? 'bg-blue-100 text-blue-900' :
                        'bg-gray-100 text-gray-900'
                      }`}>
                        {sprint.status}
                      </span>
                    </div>
                    {sprint.goal && <p className="text-gray-700 font-light mb-3">{sprint.goal}</p>}
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>{sprint.completed}/{sprint.issue_count} issues completed</span>
                      <span>{Math.round((sprint.completed / sprint.issue_count) * 100)}%</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Execution Section */}
        {activeSection === 'execution' && (
          <div className="space-y-8">
            <h2 className="text-3xl font-black text-gray-900">Kanban Board</h2>
            <div className="grid grid-cols-3 gap-6">
              <IssueColumn title="To Do" issues={todoIssues} />
              <IssueColumn title="In Progress" issues={inProgressIssues} />
              <IssueColumn title="Done" issues={doneIssues} />
            </div>
          </div>
        )}

        {/* Team Section */}
        {activeSection === 'team' && (
          <div className="space-y-8">
            <h2 className="text-3xl font-black text-gray-900">Team Members</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teamMembers.length === 0 ? (
                <div className="p-12 bg-white border border-gray-200 text-center col-span-full">
                  <p className="text-gray-600 font-medium">No team members yet.</p>
                </div>
              ) : (
                teamMembers.map(member => (
                  <div key={member.id} className="p-6 bg-white border border-gray-200">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-gray-900 flex items-center justify-center text-white font-black text-lg">
                        {member.full_name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{member.full_name}</h3>
                        <p className="text-xs text-gray-600">{member.role || 'Team Member'}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">{member.email}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricBox({ label, value }) {
  return (
    <div className="p-6 bg-white border border-gray-200">
      <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-2">{label}</p>
      <p className="text-3xl font-black text-gray-900">{value}</p>
    </div>
  );
}

function IssueColumn({ title, issues }) {
  return (
    <div className="p-6 bg-white border border-gray-200">
      <h3 className="text-lg font-bold text-gray-900 mb-6">{title} ({issues.length})</h3>
      <div className="space-y-3">
        {issues.length === 0 ? (
          <p className="text-sm text-gray-600 text-center py-8">No issues</p>
        ) : (
          issues.map(issue => (
            <div key={issue.id} className="p-4 bg-gray-50 border border-gray-200 hover:border-gray-900 transition-all">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">{issue.key}</p>
              <p className="text-sm font-bold text-gray-900 mb-2">{issue.title}</p>
              <p className="text-xs text-gray-600">{issue.assignee || 'Unassigned'}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ProjectManagement;
