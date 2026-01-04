import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import BurndownChart from '../components/BurndownChart';
import { colors, spacing, shadows, radius } from '../utils/designTokens';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

function SprintDetail() {
  const { id } = useParams();
  const [sprint, setSprint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    fetchSprint();
  }, [id]);

  const fetchSprint = async () => {
    try {
      const response = await api.get(`/api/agile/sprints/${id}/detail/`);
      setSprint(response.data);
    } catch (error) {
      console.error('Failed to fetch sprint:', error);
    } finally {
      setLoading(false);
    }
  };

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
        <div style={{ width: '24px', height: '24px', border: '2px solid #E5E7EB', borderTop: '2px solid #0F172A', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!sprint) {
    return (
      <div style={{ textAlign: 'center', paddingTop: '80px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 700, color: colors.primary }}>
          Sprint not found
        </h2>
      </div>
    );
  }

  const issueCount = sprint.issue_count || 0;
  const completedCount = sprint.completed || 0;
  const completionPercentage = issueCount > 0 ? Math.round((completedCount / issueCount) * 100) : 0;
  const isCompleted = sprint.status === 'completed';

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: spacing.xl }}>
        <Link to="/sprint-history" style={{ color: colors.secondary, textDecoration: 'none', fontSize: '14px', marginBottom: spacing.md, display: 'inline-block' }}>
          ← Back to Sprint History
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 700, color: colors.primary, marginBottom: spacing.sm }}>
              {sprint.name}
            </h1>
            <p style={{ fontSize: '14px', color: colors.secondary }}>
              {sprint.project_name} • {sprint.start_date} to {sprint.end_date}
            </p>
          </div>
          {!isCompleted && (
            <button
              onClick={() => setShowConfirm(true)}
              disabled={completing}
              style={{
                padding: `${spacing.md} ${spacing.lg}`,
                backgroundColor: '#10B981',
                color: 'white',
                border: 'none',
                borderRadius: radius.md,
                cursor: completing ? 'not-allowed' : 'pointer',
                fontWeight: 500,
                fontSize: '13px',
                opacity: completing ? 0.6 : 1
              }}
            >
              {completing ? 'Completing...' : 'Complete Sprint'}
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50
        }}>
          <div style={{
            backgroundColor: colors.surface,
            borderRadius: radius.md,
            padding: spacing.xl,
            maxWidth: '400px',
            boxShadow: shadows.lg
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: colors.primary, marginBottom: spacing.md }}>
              Complete Sprint?
            </h2>
            <p style={{ fontSize: '14px', color: colors.secondary, marginBottom: spacing.lg }}>
              This will mark all incomplete issues as done and close the sprint.
            </p>
            <div style={{ display: 'flex', gap: spacing.md, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowConfirm(false)}
                disabled={completing}
                style={{
                  padding: `${spacing.md} ${spacing.lg}`,
                  backgroundColor: colors.background,
                  color: colors.primary,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radius.md,
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: '13px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteSprint}
                disabled={completing}
                style={{
                  padding: `${spacing.md} ${spacing.lg}`,
                  backgroundColor: '#10B981',
                  color: 'white',
                  border: 'none',
                  borderRadius: radius.md,
                  cursor: completing ? 'not-allowed' : 'pointer',
                  fontWeight: 500,
                  fontSize: '13px',
                  opacity: completing ? 0.6 : 1
                }}
              >
                {completing ? 'Completing...' : 'Complete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sprint Goal */}
      {sprint.goal && (
        <div style={{
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.md,
          padding: spacing.lg,
          marginBottom: spacing.xl
        }}>
          <h3 style={{ fontSize: '12px', fontWeight: 600, color: colors.secondary, textTransform: 'uppercase', marginBottom: spacing.sm }}>
            Sprint Goal
          </h3>
          <p style={{ fontSize: '16px', color: colors.primary }}>
            {sprint.goal}
          </p>
        </div>
      )}

      {/* Metrics Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: spacing.lg,
        marginBottom: spacing.xl
      }}>
        <div style={{
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.md,
          padding: spacing.lg,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: colors.primary, marginBottom: spacing.sm }}>
            {issueCount}
          </div>
          <div style={{ fontSize: '12px', color: colors.secondary, textTransform: 'uppercase' }}>
            Total Issues
          </div>
        </div>

        <div style={{
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.md,
          padding: spacing.lg,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#10B981', marginBottom: spacing.sm }}>
            {completedCount}
          </div>
          <div style={{ fontSize: '12px', color: colors.secondary, textTransform: 'uppercase' }}>
            Completed
          </div>
        </div>

        <div style={{
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.md,
          padding: spacing.lg,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#F59E0B', marginBottom: spacing.sm }}>
            {sprint.in_progress || 0}
          </div>
          <div style={{ fontSize: '12px', color: colors.secondary, textTransform: 'uppercase' }}>
            In Progress
          </div>
        </div>

        <div style={{
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.md,
          padding: spacing.lg,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#EF4444', marginBottom: spacing.sm }}>
            {sprint.blocked || 0}
          </div>
          <div style={{ fontSize: '12px', color: colors.secondary, textTransform: 'uppercase' }}>
            Blocked
          </div>
        </div>
      </div>

      {/* Burndown Chart */}
      <div style={{ marginBottom: spacing.xl }}>
        <BurndownChart sprint={sprint} />
      </div>

      {/* Completion Progress */}
      <div style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.md,
        padding: spacing.lg,
        marginBottom: spacing.xl
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing.md }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: colors.primary }}>
            Completion Rate
          </span>
          <span style={{ fontSize: '14px', fontWeight: 600, color: colors.primary }}>
            {completionPercentage}%
          </span>
        </div>
        <div style={{
          width: '100%',
          height: '12px',
          backgroundColor: colors.background,
          borderRadius: '6px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${completionPercentage}%`,
            height: '100%',
            backgroundColor: '#10B981',
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>

      {/* Issues List */}
      <div style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.md,
        padding: spacing.lg
      }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: colors.primary, marginBottom: spacing.lg }}>
          Sprint Issues ({sprint.issues?.length || 0})
        </h2>

        {!sprint.issues || sprint.issues.length === 0 ? (
          <p style={{ fontSize: '14px', color: colors.secondary }}>
            No issues in this sprint
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            {sprint.issues.map(issue => (
              <div key={issue.id} style={{
                padding: spacing.md,
                backgroundColor: colors.background,
                borderRadius: radius.md,
                borderLeft: `3px solid ${getStatusColor(issue.status)}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: spacing.sm }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: colors.secondary, marginBottom: '4px' }}>
                      {issue.key}
                    </div>
                    <h3 style={{ fontSize: '14px', fontWeight: 500, color: colors.primary }}>
                      {issue.title}
                    </h3>
                  </div>
                  <span style={{
                    padding: `${spacing.sm} ${spacing.md}`,
                    backgroundColor: getStatusBgColor(issue.status),
                    color: getStatusColor(issue.status),
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: radius.md,
                    whiteSpace: 'nowrap'
                  }}>
                    {issue.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: spacing.lg, fontSize: '12px', color: colors.secondary }}>
                  {issue.assignee && (
                    <div>Assigned to: {issue.assignee}</div>
                  )}
                  {issue.story_points && (
                    <div>{issue.story_points} pts</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* View Project Link */}
      <div style={{ marginTop: spacing.xl }}>
        <Link to={`/projects/${sprint.project_id}`} style={{
          display: 'inline-block',
          padding: `${spacing.md} ${spacing.lg}`,
          backgroundColor: colors.primary,
          color: 'white',
          textDecoration: 'none',
          borderRadius: radius.md,
          fontSize: '14px',
          fontWeight: 500
        }}>
          View Project →
        </Link>
      </div>
    </div>
  );
}

function getStatusColor(status) {
  switch (status) {
    case 'done':
      return '#10B981';
    case 'in_progress':
      return '#F59E0B';
    case 'in_review':
      return '#3B82F6';
    default:
      return '#6B7280';
  }
}

function getStatusBgColor(status) {
  switch (status) {
    case 'done':
      return '#D1FAE5';
    case 'in_progress':
      return '#FEF3C7';
    case 'in_review':
      return '#DBEAFE';
    default:
      return '#F3F4F6';
  }
}

export default SprintDetail;
