import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { colors, spacing, shadows, radius, motion } from '../utils/designTokens';

function CurrentSprint() {
  const [sprint, setSprint] = useState(null);
  const [blockers, setBlockers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBlockerModal, setShowBlockerModal] = useState(false);

  useEffect(() => {
    fetchSprint();
  }, []);

  const fetchSprint = async () => {
    try {
      const sprintRes = await api.get('/api/agile/current-sprint/');
      setSprint(sprintRes.data);
      
      if (sprintRes.data.id) {
        const blockersRes = await api.get(`/api/agile/blockers/?sprint_id=${sprintRes.data.id}`);
        setBlockers(blockersRes.data);
      }
    } catch (error) {
      console.error('Failed to fetch sprint:', error);
    } finally {
      setLoading(false);
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
        <h2 style={{ fontSize: '32px', fontWeight: 700, color: colors.primary, marginBottom: spacing.md }}>
          No active sprint
        </h2>
        <p style={{ fontSize: '16px', color: colors.secondary, marginBottom: spacing.lg, maxWidth: '500px', margin: '0 auto' }}>
          Create a sprint in a project to start tracking progress, blockers, and team updates.
        </p>
        <Link to="/projects" style={{ color: colors.primary, textDecoration: 'none', fontWeight: 500 }}>
          Go to Projects →
        </Link>
      </div>
    );
  }

  const completionPercentage = sprint.issue_stats?.completion_percentage || 0;

  return (
    <div>
      {/* Sprint Header */}
      <div style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.md,
        padding: spacing.lg,
        marginBottom: spacing.xl
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: spacing.md }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: colors.primary, marginBottom: spacing.sm }}>
              {sprint.name}
            </h1>
            <p style={{ fontSize: '14px', color: colors.secondary }}>
              {sprint.project_name} • {sprint.start_date} to {sprint.end_date}
            </p>
          </div>
          <div style={{
            display: 'flex',
            gap: spacing.sm,
            alignItems: 'center'
          }}>
            <span style={{
              padding: `${spacing.sm} ${spacing.md}`,
              backgroundColor: '#10B981',
              color: 'white',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: radius.md
            }}>
              Active
            </span>
            <span style={{
              padding: `${spacing.sm} ${spacing.md}`,
              backgroundColor: colors.background,
              color: colors.primary,
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: radius.md
            }}>
              {sprint.days_remaining} days left
            </span>
          </div>
        </div>

        {sprint.goal && (
          <p style={{ fontSize: '14px', color: colors.secondary, fontStyle: 'italic' }}>
            Goal: {sprint.goal}
          </p>
        )}
      </div>

      {/* Two Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: spacing.xl }}>
        {/* Left: Issues Progress */}
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: colors.primary, marginBottom: spacing.lg }}>
            Sprint Progress
          </h2>

          {/* Progress Bar */}
          <div style={{
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.md,
            padding: spacing.lg,
            marginBottom: spacing.lg
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing.md }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: colors.primary }}>
                Completion
              </span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: colors.primary }}>
                {completionPercentage}%
              </span>
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: colors.background,
              borderRadius: '4px',
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

          {/* Issue Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: spacing.md,
            marginBottom: spacing.lg
          }}>
            <div style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: radius.md,
              padding: spacing.lg,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: colors.primary, marginBottom: spacing.sm }}>
                {sprint.issue_stats?.completed || 0}
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
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#F59E0B', marginBottom: spacing.sm }}>
                {sprint.issue_stats?.in_progress || 0}
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
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#6B7280', marginBottom: spacing.sm }}>
                {sprint.issue_stats?.todo || 0}
              </div>
              <div style={{ fontSize: '12px', color: colors.secondary, textTransform: 'uppercase' }}>
                To Do
              </div>
            </div>
          </div>

          {/* View Board Link */}
          <Link to={`/projects/${sprint.project_id}`} style={{
            display: 'inline-block',
            padding: `${spacing.md} ${spacing.lg}`,
            backgroundColor: colors.primary,
            color: 'white',
            textDecoration: 'none',
            borderRadius: radius.md,
            fontSize: '14px',
            fontWeight: 500,
            transition: motion.fast
          }}>
            View Kanban Board →
          </Link>
        </div>

        {/* Right: Sidebar */}
        <div>
          {/* Blockers */}
          <div style={{
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.md,
            padding: spacing.lg,
            marginBottom: spacing.lg
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: colors.primary, marginBottom: spacing.md }}>
              Active Blockers
            </h3>

            {blockers.length === 0 ? (
              <p style={{ fontSize: '12px', color: colors.secondary }}>
                No active blockers
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                {blockers.slice(0, 3).map(blocker => (
                  <div key={blocker.id} style={{
                    padding: spacing.md,
                    backgroundColor: colors.background,
                    borderRadius: radius.md,
                    borderLeft: `3px solid #EF4444`
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: colors.primary, marginBottom: '4px' }}>
                      {blocker.title}
                    </div>
                    <div style={{ fontSize: '11px', color: colors.secondary }}>
                      {blocker.days_open} days open
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowBlockerModal(true)}
              style={{
                width: '100%',
                marginTop: spacing.md,
                padding: `${spacing.sm} ${spacing.md}`,
                backgroundColor: colors.primary,
                color: 'white',
                border: 'none',
                borderRadius: radius.md,
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: motion.fast
              }}
            >
              Report Blocker
            </button>
          </div>

          {/* Sprint Info */}
          <div style={{
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.md,
            padding: spacing.lg
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: colors.primary, marginBottom: spacing.md }}>
              Sprint Info
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
              <div>
                <div style={{ fontSize: '11px', color: colors.secondary, textTransform: 'uppercase', marginBottom: '4px' }}>
                  Total Issues
                </div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: colors.primary }}>
                  {sprint.issue_stats?.total || 0}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: colors.secondary, textTransform: 'uppercase', marginBottom: '4px' }}>
                  Decisions Made
                </div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: colors.primary }}>
                  {sprint.decisions_made || 0}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showBlockerModal && (
        <BlockerModal
          sprintId={sprint.id}
          onClose={() => setShowBlockerModal(false)}
          onSubmit={() => {
            setShowBlockerModal(false);
            fetchSprint();
          }}
        />
      )}
    </div>
  );
}

function BlockerModal({ sprintId, onClose, onSubmit }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('technical');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/api/agile/blockers/', {
        sprint_id: sprintId,
        title,
        description,
        type
      });
      onSubmit();
    } catch (error) {
      console.error('Failed to create blocker:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
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
        padding: spacing.lg,
        maxWidth: '400px',
        width: '90%',
        boxShadow: shadows.lg
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: colors.primary, marginBottom: spacing.md }}>
          Report Blocker
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: spacing.md }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: colors.primary, display: 'block', marginBottom: spacing.sm }}>
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's blocking progress?"
              style={{
                width: '100%',
                padding: spacing.md,
                border: `1px solid ${colors.border}`,
                borderRadius: radius.md,
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
              required
            />
          </div>

          <div style={{ marginBottom: spacing.md }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: colors.primary, display: 'block', marginBottom: spacing.sm }}>
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              style={{
                width: '100%',
                padding: spacing.md,
                border: `1px solid ${colors.border}`,
                borderRadius: radius.md,
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            >
              <option value="technical">Technical</option>
              <option value="dependency">Dependency</option>
              <option value="decision">Decision Needed</option>
              <option value="resource">Resource</option>
              <option value="external">External</option>
            </select>
          </div>

          <div style={{ marginBottom: spacing.lg }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: colors.primary, display: 'block', marginBottom: spacing.sm }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide context..."
              style={{
                width: '100%',
                padding: spacing.md,
                border: `1px solid ${colors.border}`,
                borderRadius: radius.md,
                fontSize: '14px',
                boxSizing: 'border-box',
                minHeight: '100px',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: spacing.md, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: `${spacing.sm} ${spacing.md}`,
                backgroundColor: colors.background,
                color: colors.primary,
                border: `1px solid ${colors.border}`,
                borderRadius: radius.md,
                cursor: submitting ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                opacity: submitting ? 0.6 : 1
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
                color: 'white',
                border: 'none',
                borderRadius: radius.md,
                cursor: submitting ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                opacity: submitting ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm
              }}
            >
              {submitting && (
                <div style={{
                  width: '14px',
                  height: '14px',
                  border: '2px solid white',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 0.6s linear infinite'
                }} />
              )}
              {submitting ? 'Creating...' : 'Report Blocker'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CurrentSprint;
