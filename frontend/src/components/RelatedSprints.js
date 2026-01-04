import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { colors, spacing, radius, shadows } from '../utils/designTokens';

function RelatedSprints({ decisionId }) {
  const [sprint, setSprint] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!decisionId) return;
    
    setLoading(true);
    api.get(`/api/decisions/${decisionId}/related-sprints/`)
      .then(res => {
        setSprint(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching related sprint:', err);
        setLoading(false);
      });
  }, [decisionId]);

  if (loading) return <div style={{ padding: spacing.lg, color: colors.secondary }}>Loading...</div>;
  if (!sprint) return null;

  return (
    <Link
      to={`/sprints/${sprint.id}`}
      style={{
        display: 'block',
        marginTop: spacing.lg,
        padding: spacing.lg,
        backgroundColor: colors.background,
        borderRadius: radius.lg,
        border: `2px solid ${colors.accent}`,
        textDecoration: 'none',
        color: colors.primary,
        transition: 'all 0.2s',
        cursor: 'pointer'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = shadows.md;
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: spacing.md, color: colors.accent }}>
        🎯 Sprint Context
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.lg }}>
        <div>
          <div style={{ fontSize: '12px', color: colors.secondary, marginBottom: spacing.sm }}>Sprint</div>
          <div style={{ fontWeight: 500 }}>{sprint.name}</div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: colors.secondary, marginBottom: spacing.sm }}>Project</div>
          <div style={{ fontWeight: 500 }}>{sprint.project_name}</div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: colors.secondary, marginBottom: spacing.sm }}>Duration</div>
          <div style={{ fontSize: '13px' }}>{sprint.start_date} to {sprint.end_date}</div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: colors.secondary, marginBottom: spacing.sm }}>Goal</div>
          <div style={{ fontSize: '13px' }}>{sprint.goal || 'No goal set'}</div>
        </div>
      </div>
    </Link>
  );
}

export default RelatedSprints;
