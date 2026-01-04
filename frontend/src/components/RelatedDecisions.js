import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { colors, spacing, radius, shadows } from '../utils/designTokens';

function RelatedDecisions({ conversationId }) {
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!conversationId) return;
    
    setLoading(true);
    api.get(`/api/conversations/${conversationId}/related-decisions/`)
      .then(res => {
        setDecisions(Array.isArray(res.data) ? res.data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching related decisions:', err);
        setLoading(false);
      });
  }, [conversationId]);

  if (loading) return <div style={{ padding: spacing.lg, color: colors.secondary }}>Loading...</div>;
  if (!decisions.length) return null;

  return (
    <div style={{
      marginTop: spacing.xl,
      padding: spacing.lg,
      backgroundColor: colors.background,
      borderRadius: radius.lg,
      border: `1px solid ${colors.border}`
    }}>
      <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: spacing.lg, color: colors.primary }}>
        📋 Related Decisions
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
        {decisions.map(decision => (
          <Link
            key={decision.id}
            to={`/decisions/${decision.id}`}
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
            <div style={{ fontWeight: 500, marginBottom: spacing.sm }}>{decision.title}</div>
            <div style={{ fontSize: '12px', color: colors.secondary, display: 'flex', gap: spacing.md }}>
              <span>Status: {decision.status}</span>
              <span>Impact: {decision.impact_level}</span>
              {decision.sprint_name && <span>Sprint: {decision.sprint_name}</span>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default RelatedDecisions;
