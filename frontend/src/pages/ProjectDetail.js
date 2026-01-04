import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { colors, spacing, shadows, radius, motion } from '../utils/designTokens';
import { ChevronRightIcon, UserGroupIcon, PlusIcon, CheckCircleIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import SprintRoadmap from '../components/SprintRoadmap';

function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [showSprintForm, setShowSprintForm] = useState(false);
  const [sprintData, setSprintData] = useState({ name: '', goal: '' });
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [integrations, setIntegrations] = useState([]);
  const [showGitHubForm, setShowGitHubForm] = useState(false);
  const [githubData, setGithubData] = useState({ repo_url: '', github_token: '' });
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubSuccess, setGithubSuccess] = useState(false);
  const [githubActivity, setGithubActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);

  useEffect(() => {
    fetchProject();
    fetchTeamMembers();
    fetchSprints();
    fetchIntegrations();
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const response = await api.get(`/api/agile/projects/${projectId}/`);
      setProject(response.data);
    } catch (error) {
      console.error('Failed to fetch project:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const response = await api.get('/api/auth/team/');
      setTeamMembers(response.data);
    } catch (error) {
      console.error('Failed to fetch team members:', error);
    }
  };

  const fetchSprints = async () => {
    try {
      const response = await api.get(`/api/agile/projects/${projectId}/sprints/`);
      setSprints(response.data);
    } catch (error) {
      console.error('Failed to fetch sprints:', error);
      setSprints([]);
    }
  };

  const fetchIntegrations = async () => {
    try {
      const response = await api.get('/api/integrations/list/');
      console.log('Integrations response:', response.data);
      setIntegrations(response.data);
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
    }
  };

  const fetchGitHubActivity = async () => {
    setActivityLoading(true);
    try {
      const response = await api.get('/api/integrations/github/activity/');
      console.log('GitHub activity response:', response.data);
      setGithubActivity(response.data || []);
    } catch (error) {
      console.error('Failed to fetch GitHub activity:', error);
      setGithubActivity([]);
    } finally {
      setActivityLoading(false);
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
      fetchSprints();
    } catch (error) {
      console.error('Failed to create sprint:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConnectGitHub = async (e) => {
    e.preventDefault();
    setGithubLoading(true);
    try {
      await api.post('/api/integrations/github/connect/', githubData);
      setGithubSuccess(true);
      setTimeout(() => {
        setShowGitHubForm(false);
        setGithubData({ repo_url: '', github_token: '' });
        setGithubSuccess(false);
        fetchIntegrations();
      }, 1500);
    } catch (error) {
      console.error('Failed to connect GitHub:', error);
    } finally {
      setGithubLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
        <div style={{ width: '24px', height: '24px', border: '2px solid #E5E7EB', borderTop: '2px solid #0F172A', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!project) {
    return <div>Project not found</div>;
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'integrations', label: 'Integrations' },
    ...(integrations.length > 0 ? [{ id: 'activity', label: 'GitHub Activity' }] : [])
  ];

  return (
    <div style={{ display: 'flex', gap: spacing.xl }}>
      {/* Sidebar */}
      <div style={{
        width: '280px',
        backgroundColor: colors.background,
        borderRadius: radius.md,
        border: `1px solid ${colors.border}`,
        padding: spacing.lg,
        height: 'fit-content',
        position: 'sticky',
        top: '100px'
      }}>
        <div style={{ marginBottom: spacing.xl }}>
          <div style={{
            width: '48px',
            height: '48px',
            backgroundColor: colors.primary,
            borderRadius: radius.md,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.surface,
            fontWeight: 700,
            fontSize: '20px',
            marginBottom: spacing.md
          }}>
            {project.key.charAt(0)}
          </div>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: colors.primary, marginBottom: '4px' }}>
            {project.name}
          </h2>
          <p style={{ fontSize: '12px', color: colors.secondary }}>
            {project.key}
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: spacing.sm,
          marginBottom: spacing.xl,
          paddingBottom: spacing.lg,
          borderBottom: `1px solid ${colors.border}`
        }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: colors.primary }}>
              {project.issue_count}
            </div>
            <div style={{ fontSize: '11px', color: colors.secondary, textTransform: 'uppercase' }}>
              Issues
            </div>
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: colors.primary }}>
              {project.boards.length}
            </div>
            <div style={{ fontSize: '11px', color: colors.secondary, textTransform: 'uppercase' }}>
              Boards
            </div>
          </div>
        </div>

        <div style={{ marginBottom: spacing.xl }}>
          <h3 style={{ fontSize: '12px', fontWeight: 600, color: colors.secondary, textTransform: 'uppercase', marginBottom: spacing.md }}>
            Boards
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
            {project.boards.map((board) => (
              <Link
                key={board.id}
                to={`/boards/${board.id}`}
                style={{
                  padding: spacing.md,
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radius.md,
                  fontSize: '13px',
                  color: colors.primary,
                  textDecoration: 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: motion.fast,
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.background;
                  e.currentTarget.style.borderColor = colors.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = colors.surface;
                  e.currentTarget.style.borderColor = colors.border;
                }}
              >
                <span>{board.name}</span>
                <ChevronRightIcon style={{ width: '14px', height: '14px', color: colors.secondary }} />
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: '12px', fontWeight: 600, color: colors.secondary, textTransform: 'uppercase', marginBottom: spacing.md, display: 'flex', alignItems: 'center', gap: spacing.sm }}>
            <UserGroupIcon style={{ width: '14px', height: '14px' }} />
            Team
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
            {teamMembers.slice(0, 5).map((member) => (
              <div
                key={member.id}
                style={{
                  padding: spacing.md,
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radius.md,
                  fontSize: '13px',
                  color: colors.primary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.sm
                }}
              >
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: colors.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors.surface,
                  fontSize: '11px',
                  fontWeight: 600,
                  flexShrink: 0
                }}>
                  {member.full_name?.charAt(0).toUpperCase()}
                </div>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {member.full_name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1 }}>
        <div style={{ marginBottom: spacing.xl }}>
          <Link to="/projects" style={{ color: colors.secondary, textDecoration: 'none', fontSize: '14px', marginBottom: spacing.md, display: 'inline-block' }}>
            Back to Projects
          </Link>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: colors.primary, marginBottom: spacing.md }}>
            {project.name}
          </h1>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: spacing.lg, marginBottom: spacing.xl, borderBottom: `1px solid ${colors.border}`, paddingBottom: spacing.md }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: `${spacing.sm} 0`,
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? `2px solid ${colors.primary}` : 'none',
                color: activeTab === tab.id ? colors.primary : colors.secondary,
                fontSize: '14px',
                fontWeight: activeTab === tab.id ? 600 : 500,
                cursor: 'pointer',
                transition: motion.fast
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            <div style={{ marginBottom: spacing.xl }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: colors.primary }}>
                  Sprints
                </h2>
                <button
                  onClick={() => setShowSprintForm(true)}
                  style={{
                    padding: `${spacing.sm} ${spacing.md}`,
                    backgroundColor: colors.primary,
                    color: colors.surface,
                    border: 'none',
                    borderRadius: radius.md,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.sm,
                    fontWeight: 500,
                    fontSize: '13px',
                    transition: motion.fast
                  }}
                >
                  <PlusIcon style={{ width: '16px', height: '16px' }} />
                  New Sprint
                </button>
              </div>

              {showSprintForm && (
                <div style={{
                  padding: spacing.lg,
                  backgroundColor: colors.background,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radius.md,
                  marginBottom: spacing.lg
                }}>
                  <form onSubmit={handleCreateSprint} style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: 600, color: colors.primary, display: 'block', marginBottom: spacing.sm }}>
                        Sprint Name *
                      </label>
                      <input
                        type="text"
                        value={sprintData.name}
                        onChange={(e) => setSprintData({ ...sprintData, name: e.target.value })}
                        placeholder="e.g., Sprint 1"
                        style={{
                          width: '100%',
                          padding: `${spacing.sm} ${spacing.md}`,
                          border: `1px solid ${colors.border}`,
                          borderRadius: radius.md,
                          fontSize: '13px',
                          boxSizing: 'border-box'
                        }}
                        disabled={submitting}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: spacing.md, justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => setShowSprintForm(false)}
                        disabled={submitting}
                        style={{
                          padding: `${spacing.sm} ${spacing.md}`,
                          backgroundColor: colors.surface,
                          color: colors.primary,
                          border: `1px solid ${colors.border}`,
                          borderRadius: radius.md,
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: 500
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        style={{
                          padding: `${spacing.sm} ${spacing.md}`,
                          backgroundColor: colors.primary,
                          color: colors.surface,
                          border: 'none',
                          borderRadius: radius.md,
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: 500
                        }}
                      >
                        {submitting ? 'Creating...' : 'Create Sprint'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {sprints.length === 0 ? (
                <div style={{
                  padding: spacing.lg,
                  backgroundColor: colors.background,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radius.md,
                  textAlign: 'center',
                  color: colors.secondary,
                  fontSize: '14px'
                }}>
                  No sprints yet. Create one to start planning.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
                  {sprints.map((sprint) => (
                    <div
                      key={sprint.id}
                      onClick={() => navigate(`/sprints/${sprint.id}`)}
                      style={{
                        padding: spacing.lg,
                        backgroundColor: colors.surface,
                        border: `1px solid ${colors.border}`,
                        borderRadius: radius.md,
                        cursor: 'pointer',
                        transition: motion.fast
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = colors.primary;
                        e.currentTarget.style.boxShadow = shadows.sm;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = colors.border;
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <h3 style={{ fontSize: '15px', fontWeight: 600, color: colors.primary }}>
                        {sprint.name}
                      </h3>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <SprintRoadmap projectId={projectId} />
          </>
        )}

        {/* Integrations Tab */}
        {activeTab === 'integrations' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: colors.primary }}>
                Integrations
              </h2>
              <button
                onClick={() => setShowGitHubForm(true)}
                style={{
                  padding: `${spacing.sm} ${spacing.md}`,
                  backgroundColor: colors.primary,
                  color: colors.surface,
                  border: 'none',
                  borderRadius: radius.md,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.sm,
                  fontWeight: 500,
                  fontSize: '13px',
                  transition: motion.fast
                }}
              >
                <PlusIcon style={{ width: '16px', height: '16px' }} />
                Connect GitHub
              </button>
            </div>

            {showGitHubForm && (
              <div style={{
                padding: spacing.lg,
                backgroundColor: colors.background,
                border: `1px solid ${colors.border}`,
                borderRadius: radius.md,
                marginBottom: spacing.lg
              }}>
                {githubSuccess ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.md,
                    padding: spacing.lg,
                    backgroundColor: '#ECFDF5',
                    border: '1px solid #D1FAE5',
                    borderRadius: radius.md,
                    color: '#065F46'
                  }}>
                    <CheckCircleIcon style={{ width: '20px', height: '20px', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>GitHub Connected!</div>
                      <div style={{ fontSize: '13px', marginTop: '4px' }}>
                        {githubData.repo_url} is now connected
                      </div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleConnectGitHub} style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: 600, color: colors.primary, display: 'block', marginBottom: spacing.sm }}>
                        Repository URL *
                      </label>
                      <input
                        type="text"
                        value={githubData.repo_url}
                        onChange={(e) => setGithubData({ ...githubData, repo_url: e.target.value })}
                        placeholder="e.g., username/repo-name"
                        style={{
                          width: '100%',
                          padding: `${spacing.sm} ${spacing.md}`,
                          border: `1px solid ${colors.border}`,
                          borderRadius: radius.md,
                          fontSize: '13px',
                          boxSizing: 'border-box'
                        }}
                        disabled={githubLoading}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: 600, color: colors.primary, display: 'block', marginBottom: spacing.sm }}>
                        GitHub Token *
                      </label>
                      <input
                        type="password"
                        value={githubData.github_token}
                        onChange={(e) => setGithubData({ ...githubData, github_token: e.target.value })}
                        placeholder="ghp_xxxxx"
                        style={{
                          width: '100%',
                          padding: `${spacing.sm} ${spacing.md}`,
                          border: `1px solid ${colors.border}`,
                          borderRadius: radius.md,
                          fontSize: '13px',
                          boxSizing: 'border-box'
                        }}
                        disabled={githubLoading}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: spacing.md, justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => setShowGitHubForm(false)}
                        disabled={githubLoading}
                        style={{
                          padding: `${spacing.sm} ${spacing.md}`,
                          backgroundColor: colors.surface,
                          color: colors.primary,
                          border: `1px solid ${colors.border}`,
                          borderRadius: radius.md,
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: 500
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={githubLoading}
                        style={{
                          padding: `${spacing.sm} ${spacing.md}`,
                          backgroundColor: colors.primary,
                          color: colors.surface,
                          border: 'none',
                          borderRadius: radius.md,
                          cursor: githubLoading ? 'not-allowed' : 'pointer',
                          fontSize: '13px',
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          gap: spacing.sm,
                          opacity: githubLoading ? 0.6 : 1
                        }}
                      >
                        {githubLoading && (
                          <div style={{
                            width: '12px',
                            height: '12px',
                            border: '2px solid white',
                            borderTop: '2px solid transparent',
                            borderRadius: '50%',
                            animation: 'spin 0.6s linear infinite'
                          }} />
                        )}
                        {githubLoading ? 'Connecting...' : 'Connect'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {integrations.length === 0 ? (
              <div style={{
                padding: spacing.lg,
                backgroundColor: colors.background,
                border: `1px solid ${colors.border}`,
                borderRadius: radius.md,
                textAlign: 'center',
                color: colors.secondary,
                fontSize: '14px'
              }}>
                No integrations connected yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
                {integrations.map((integration) => (
                  <div
                    key={integration.id}
                    style={{
                      padding: spacing.lg,
                      backgroundColor: colors.surface,
                      border: `1px solid ${colors.border}`,
                      borderRadius: radius.md
                    }}
                  >
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: colors.primary, marginBottom: spacing.sm }}>
                      {integration.name}
                    </h3>
                    <p style={{ fontSize: '13px', color: colors.secondary }}>
                      Type: {integration.type}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* GitHub Activity Tab */}
        {activeTab === 'activity' && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: colors.primary, marginBottom: spacing.lg }}>
              Recent Activity
            </h2>

            {!githubActivity.length && !activityLoading && (
              <button
                onClick={fetchGitHubActivity}
                style={{
                  padding: `${spacing.md} ${spacing.lg}`,
                  backgroundColor: colors.primary,
                  color: colors.surface,
                  border: 'none',
                  borderRadius: radius.md,
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: '13px',
                  marginBottom: spacing.lg
                }}
              >
                Load Activity
              </button>
            )}

            {activityLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
                <div style={{ width: '24px', height: '24px', border: '2px solid #E5E7EB', borderTop: '2px solid #0F172A', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              </div>
            ) : githubActivity.length === 0 ? (
              <div style={{
                padding: spacing.lg,
                backgroundColor: colors.background,
                border: `1px solid ${colors.border}`,
                borderRadius: radius.md,
                textAlign: 'center',
                color: colors.secondary,
                fontSize: '14px'
              }}>
                No activity yet. Click "Load Activity" to fetch commits and PRs.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
                {githubActivity.map((item, idx) => (
                  <a
                    key={idx}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: spacing.lg,
                      backgroundColor: colors.surface,
                      border: `1px solid ${colors.border}`,
                      borderRadius: radius.md,
                      textDecoration: 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      transition: motion.fast,
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = colors.primary;
                      e.currentTarget.style.backgroundColor = colors.background;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = colors.border;
                      e.currentTarget.style.backgroundColor = colors.surface;
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: colors.primary, marginBottom: spacing.sm }}>
                        {item.type === 'commit' ? '📝 Commit' : '🔀 Pull Request'}
                      </div>
                      <div style={{ fontSize: '13px', color: colors.primary, marginBottom: '4px' }}>
                        {item.message || item.title}
                      </div>
                      <div style={{ fontSize: '12px', color: colors.secondary }}>
                        {item.author} • {new Date(item.date).toLocaleDateString()}
                      </div>
                    </div>
                    <ArrowTopRightOnSquareIcon style={{ width: '16px', height: '16px', color: colors.secondary, flexShrink: 0 }} />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProjectDetail;
