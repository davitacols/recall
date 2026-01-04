import React from 'react';
import { Link } from 'react-router-dom';
import { colors, spacing, radius } from '../utils/designTokens';
import { ChevronRightIcon } from '@heroicons/react/24/outline';

function ContextBreadcrumb({ items }) {
  if (!items || items.length === 0) return null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: spacing.sm,
      padding: `${spacing.md} ${spacing.lg}`,
      backgroundColor: colors.background,
      borderRadius: radius.md,
      border: `1px solid ${colors.border}`,
      marginBottom: spacing.lg,
      overflowX: 'auto'
    }}>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <ChevronRightIcon style={{
              width: '16px',
              height: '16px',
              color: colors.secondary,
              flexShrink: 0
            }} />
          )}
          {item.href ? (
            <Link
              to={item.href}
              style={{
                fontSize: '13px',
                color: colors.primary,
                textDecoration: 'none',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                transition: 'color 0.2s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.target.style.color = colors.accent}
              onMouseLeave={(e) => e.target.style.color = colors.primary}
            >
              {item.label}
            </Link>
          ) : (
            <span style={{
              fontSize: '13px',
              color: colors.secondary,
              whiteSpace: 'nowrap'
            }}>
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default ContextBreadcrumb;
