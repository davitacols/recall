import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { colors, spacing, shadows, radius, motion } from '../utils/designTokens';
import { XMarkIcon, UserIcon, CheckIcon } from '@heroicons/react/24/outline';

function IssueDetail({ issueId, onClose, onUpdate }) {
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [showAssigneeMenu, setShowAssigneeMenu] = useState(false);
  const [showSprintMenu, setShowSprintMenu] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);

  const statusOptions = ['todo', 'in_progress', 'in_review', 'done'];

  useEffect(() => {
    fetchIssue();
    fetchTeamMembers();
    
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [issueId, onClose]);

  useEffect(() => {
    if (issue?.project_id) {
      fetchSprints();
    }
  }, [issue?.project_id]);

  const fetchIssue = async () => {
    try {
      const response = await api.get(`/api/agile/issues/${issueId}/`);
      setIssue(response.data);
    } catch (error) {
      console.error('Failed to fetch issue:', error);
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
      const response = await api.get(`/api/agile/projects/${issue.project_id}/sprints/`);
      setSprints(response.data);
    } catch (error) {
      console.error('Failed to fetch sprints:', error);
    }
  };

  const handleAssign = async (userId) => {
    try {
      await api.put(`/api/agile/issues/${issueId}/`, {
        assignee_id: userId
      });
      setShowAssigneeMenu(false);
      fetchIssue();
      onUpdate?.();
    } catch (error) {
      console.error('Failed to assign issue:', error);
    }
  };

  const handleAssignSprint = async (sprintId) => {
    try {
      await api.put(`/api/agile/issues/${issueId}/`, {
        sprint_id: sprintId
      });
      setShowSprintMenu(false);
      fetchIssue();
      onUpdate?.();
    } catch (error) {
      console.error('Failed to assign sprint:', error);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      await api.put(`/api/agile/issues/${issueId}/`, {
        status: newStatus
      });
      setShowStatusMenu(false);
      fetchIssue();
      onUpdate?.();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleUpdateTitle = async (newTitle) => {
    if (!newTitle.trim()) return;
    try {
      await api.put(`/api/agile/issues/${issueId}/`, {
        title: newTitle
      });
      setEditingTitle(false);
      fetchIssue();
      onUpdate?.();
    } catch (error) {
      console.error('Failed to update title:', error);
    }
  };

  const handleUpdateDescription = async (newDescription) => {
    try {
      await api.put(`/api/agile/issues/${issueId}/`, {
        description: newDescription
      });
      setEditingDescription(false);
      fetchIssue();
      onUpdate?.();
    } catch (error) {
      console.error('Failed to update description:', error);
    }
  };

  const getSprintStatus = (sprint) => {
    const today = new Date();
    const start = new Date(sprint.start_date);
    const end = new Date(sprint.end_date);
    
    if (today < start) return 'upcoming';
    if (today > end) return 'completed';
    return 'active';
  };

  const activeSprints = sprints.filter(s => getSprintStatus(s) === 'active');
  const upcomingSprints = sprints.filter(s => getSprintStatus(s) === 'upcoming');

  if (loading) {
    return (
      <>
        <div
          onClick={onClose}
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            zIndex: 39
          }}
        />
        <div style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: '100%',
          backgroundColor: colors.surface,
          borderLeft: `1px solid ${colors.border}`,
          boxShadow: shadows.lg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 40
        }}>
          <div style={{ width: '24px', height: '24px', border: '2px solid #E5E7EB', borderTop: '2px solid #0F172A', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      </>
    );
  }

  if (!issue) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          zIndex: 39
        }}
      />
      <div style={{
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: '100%',
        backgroundColor: colors.surface,
        borderLeft: `1px solid ${colors.border}`,
        boxShadow: shadows.lg,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 40,
        overflowY: 'auto'
      }}>
        <div style={{
          padding: spacing.lg,
          borderBottom: `1px solid ${colors.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: colors.secondary }}>
            {issue.key}
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: colors.secondary,
              padding: '4px',
              transition: motion.fast
            }}
            onMouseEnter={(e) => e.target.style.color = colors.primary}
            onMouseLeave={(e) => e.target.style.color = colors.secondary}
          >
            <XMarkIcon style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        <div style={{ padding: spacing.lg, flex: 1 }}>
          {editingTitle ? (
            <input
              type="text"
              defaultValue={issue.title}
              onBlur={(e) => handleUpdateTitle(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleUpdateTitle(e.target.value)}
              style={{
                width: '100%',
                fontSize: '18px',
                fontWeight: 600,
                color: colors.primary,
                border: `1px solid ${colors.border}`,
                padding: spacing.sm,
                borderRadius: radius.md,
                marginBottom: spacing.lg
              }}
              autoFocus
            />
          ) : (
            <h2
              onClick={() => setEditingTitle(true)}
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: colors.primary,
                marginBottom: spacing.lg,
                cursor: 'pointer',
                padding: spacing.sm,
                borderRadius: radius.md,
                transition: motion.fast
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = colors.background}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              {issue.title}
            </h2>
          )}

          <div style={{ marginBottom: spacing.xl }}>
            <h3 style={{ fontSize: '12px', fontWeight: 600, color: colors.secondary, textTransform: 'uppercase', marginBottom: spacing.md }}>
              Details
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: colors.secondary, display: 'block', marginBottom: spacing.sm }}>
                  Status
                </label>
                <button
                  onClick={() => setShowStatusMenu(!showStatusMenu)}
                  style={{
                    width: '100%',
                    padding: spacing.md,
                    backgroundColor: colors.background,
                    border: `1px solid ${colors.border}`,
                    borderRadius: radius.md,
                    fontSize: '14px',
                    color: colors.primary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: motion.fast,
                    textTransform: 'capitalize'
                  }}
                >
                  {issue.status.replace('_', ' ')}
                </button>

                {showStatusMenu && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: spacing.sm,
                    backgroundColor: colors.surface,
                    border: `1px solid ${colors.border}`,
                    borderRadius: radius.md,
                    boxShadow: shadows.lg,
                    zIndex: 50
                  }}>
                    {statusOptions.map((status) => (
                      <button
                        key={status}
                        onClick={() => handleUpdateStatus(status)}
                        style={{
                          width: '100%',
                          padding: spacing.md,
                          border: 'none',
                          backgroundColor: 'transparent',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '14px',
                          color: colors.primary,
                          transition: motion.fast,
                          borderBottom: `1px solid ${colors.border}`,
                          textTransform: 'capitalize',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = colors.background}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        <span>{status.replace('_', ' ')}</span>
                        {issue.status === status && <CheckIcon style={{ width: '16px', height: '16px', color: '#10B981' }} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: colors.secondary, display: 'block', marginBottom: spacing.sm }}>
                  Priority
                </label>
                <div style={{
                  padding: spacing.md,
                  backgroundColor: colors.background,
                  borderRadius: radius.md,
                  fontSize: '14px',
                  color: colors.primary,
                  textTransform: 'capitalize'
                }}>
                  {issue.priority}
                </div>
              </div>

              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: colors.secondary, display: 'block', marginBottom: spacing.sm }}>
                  Assignee
                </label>
                <button
                  onClick={() => setShowAssigneeMenu(!showAssigneeMenu)}
                  style={{
                    width: '100%',
                    padding: spacing.md,
                    backgroundColor: colors.background,
                    border: `1px solid ${colors.border}`,
                    borderRadius: radius.md,
                    fontSize: '14px',
                    color: colors.primary,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.sm,
                    transition: motion.fast
                  }}
                >
                  <UserIcon style={{ width: '16px', height: '16px' }} />
                  {issue.assignee || 'Unassigned'}
                </button>

                {showAssigneeMenu && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: spacing.sm,
                    backgroundColor: colors.surface,
                    border: `1px solid ${colors.border}`,
                    borderRadius: radius.md,
                    boxShadow: shadows.lg,
                    zIndex: 50,
                    maxHeight: '300px',
                    overflowY: 'auto'
                  }}>
                    <button
                      onClick={() => handleAssign(null)}
                      style={{
                        width: '100%',
                        padding: spacing.md,
                        border: 'none',
                        backgroundColor: 'transparent',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: colors.primary,
                        transition: motion.fast,
                        borderBottom: `1px solid ${colors.border}`
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = colors.background}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      Unassigned
                    </button>
                    {teamMembers.map((member) => (
                      <button
                        key={member.id}
                        onClick={() => handleAssign(member.id)}
                        style={{
                          width: '100%',
                          padding: spacing.md,
                          border: 'none',
                          backgroundColor: 'transparent',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '14px',
                          color: colors.primary,
                          transition: motion.fast,
                          borderBottom: `1px solid ${colors.border}`
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = colors.background}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        {member.full_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: colors.secondary, display: 'block', marginBottom: spacing.sm }}>
                  Sprint
                </label>
                <button
                  onClick={() => setShowSprintMenu(!showSprintMenu)}
                  style={{
                    width: '100%',
                    padding: spacing.md,
                    backgroundColor: colors.background,
                    border: `1px solid ${colors.border}`,
                    borderRadius: radius.md,
                    fontSize: '14px',
                    color: colors.primary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: motion.fast,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span>{issue.sprint || 'No Sprint'}</span>
                  {issue.sprint && <CheckIcon style={{ width: '16px', height: '16px', color: '#10B981' }} />}
                </button>

                {showSprintMenu && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: spacing.sm,
                    backgroundColor: colors.surface,
                    border: `1px solid ${colors.border}`,
                    borderRadius: radius.md,
                    boxShadow: shadows.lg,
                    zIndex: 50,
                    maxHeight: '400px',
                    overflowY: 'auto'
                  }}>
                    <button
                      onClick={() => handleAssignSprint(null)}
                      style={{
                        width: '100%',
                        padding: spacing.md,
                        border: 'none',
                        backgroundColor: 'transparent',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: colors.primary,
                        transition: motion.fast,
                        borderBottom: `1px solid ${colors.border}`
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = colors.background}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      No Sprint
                    </button>

                    {activeSprints.length > 0 && (
                      <>
                        <div style={{
                          padding: `${spacing.sm} ${spacing.md}`,
                          fontSize: '11px',
                          fontWeight: 600,
                          color: colors.secondary,
                          textTransform: 'uppercase',
                          backgroundColor: colors.background
                        }}>
                          Active
                        </div>
                        {activeSprints.map((sprint) => (
                          <button
                            key={sprint.id}
                            onClick={() => handleAssignSprint(sprint.id)}
                            style={{
                              width: '100%',
                              padding: spacing.md,
                              border: 'none',
                              backgroundColor: 'transparent',
                              textAlign: 'left',
                              cursor: 'pointer',
                              fontSize: '14px',
                              color: colors.primary,
                              transition: motion.fast,
                              borderBottom: `1px solid ${colors.border}`,
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = colors.background}
                            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                          >
                            <span>{sprint.name}</span>
                            {issue.sprint === sprint.name && <CheckIcon style={{ width: '16px', height: '16px', color: '#10B981' }} />}
                          </button>
                        ))}
                      </>
                    )}

                    {upcomingSprints.length > 0 && (
                      <>
                        <div style={{
                          padding: `${spacing.sm} ${spacing.md}`,
                          fontSize: '11px',
                          fontWeight: 600,
                          color: colors.secondary,
                          textTransform: 'uppercase',
                          backgroundColor: colors.background
                        }}>
                          Upcoming
                        </div>
                        {upcomingSprints.map((sprint) => (
                          <button
                            key={sprint.id}
                            onClick={() => handleAssignSprint(sprint.id)}
                            style={{
                              width: '100%',
                              padding: spacing.md,
                              border: 'none',
                              backgroundColor: 'transparent',
                              textAlign: 'left',
                              cursor: 'pointer',
                              fontSize: '14px',
                              color: colors.primary,
                              transition: motion.fast,
                              borderBottom: `1px solid ${colors.border}`,
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = colors.background}
                            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                          >
                            <span>{sprint.name}</span>
                            {issue.sprint === sprint.name && <CheckIcon style={{ width: '16px', height: '16px', color: '#10B981' }} />}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>

              {issue.story_points && (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: colors.secondary, display: 'block', marginBottom: spacing.sm }}>
                    Story Points
                  </label>
                  <div style={{
                    padding: spacing.md,
                    backgroundColor: colors.background,
                    borderRadius: radius.md,
                    fontSize: '14px',
                    color: colors.primary
                  }}>
                    {issue.story_points}
                  </div>
                </div>
              )}

              {issue.due_date && (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: colors.secondary, display: 'block', marginBottom: spacing.sm }}>
                    Due Date
                  </label>
                  <div style={{
                    padding: spacing.md,
                    backgroundColor: colors.background,
                    borderRadius: radius.md,
                    fontSize: '14px',
                    color: colors.primary
                  }}>
                    {new Date(issue.due_date).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>
          </div>

          {issue.description && (
            <div>
              <h3 style={{ fontSize: '12px', fontWeight: 600, color: colors.secondary, textTransform: 'uppercase', marginBottom: spacing.md }}>
                Description
              </h3>
              {editingDescription ? (
                <textarea
                  defaultValue={issue.description}
                  onBlur={(e) => handleUpdateDescription(e.target.value)}
                  style={{
                    width: '100%',
                    padding: spacing.md,
                    border: `1px solid ${colors.border}`,
                    borderRadius: radius.md,
                    fontSize: '14px',
                    color: colors.primary,
                    fontFamily: 'inherit',
                    minHeight: '100px',
                    marginBottom: spacing.lg
                  }}
                  autoFocus
                />
              ) : (
                <div
                  onClick={() => setEditingDescription(true)}
                  style={{
                    padding: spacing.md,
                    backgroundColor: colors.background,
                    borderRadius: radius.md,
                    fontSize: '14px',
                    color: colors.primary,
                    cursor: 'pointer',
                    minHeight: '60px',
                    transition: motion.fast
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#F1F5F9'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = colors.background}
                >
                  {issue.description || 'Add description...'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default IssueDetail;
