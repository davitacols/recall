import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { colors, spacing, radius, shadows } from '../utils/designTokens';

function SprintRoadmap({ projectId }) {
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    
    setLoading(true);
    api.get(`/api/agile/projects/${projectId}/roadmap/`)
      .then(res => {
        setSprints(Array.isArray(res.data) ? res.data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching sprint roadmap:', err);
        setLoading(false);
      });
  }, [projectId]);

  if (loading) return <div style={{ padding: spacing.lg, color: colors.secondary }}>Loading roadmap...</div>;
  if (!sprints.length) return null;

  return (
    <div style={{
      marginTop: spacing.xl,
      marginBottom: spacing.xl,
      padding: spacing.lg,
      backgroundColor: colors.background,
      borderRadius: radius.lg,
      border: `1px solid ${colors.border}`
    }}>
      <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: spacing.lg, color: colors.primary }}>
        🗺️ Sprint Roadmap
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
        {sprints.map(sprint => (
          <Link
            key={sprint.id}
            to={`/sprints/${sprint.id}`}
            style={{
              padding: spacing.md,
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              border: `1px solid ${colors.border}`,
              textDecoration: 'none',
              color: colors.primary,
              transition: 'all 0.2s',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.accentLight;
              e.currentTarget.style.boxShadow = shadows.sm;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = colors.surface;
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ fontWeight: 500, marginBottom: spacing.sm }}>{sprint.name}</div>
            <div style={{ fontSize: '12px', color: colors.secondary, display: 'flex', gap: spacing.lg, marginBottom: spacing.sm }}>
              <span>📅 {sprint.start_date} to {sprint.end_date}</span>
              <span>✅ {sprint.completed}/{sprint.issue_count} issues</span>
              <span>📋 {sprint.decision_count} decisions</span>
            </div>
            {sprint.goal && (
              <div style={{ fontSize: '12px', color: colors.secondary, fontStyle: 'italic' }}>
                Goal: {sprint.goal}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default SprintRoadmap;
