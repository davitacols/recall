import React from 'react';
import { colors, spacing, shadows, radius, motion } from '../utils/designTokens';

function Card({ 
  children, 
  hoverable = false, 
  onClick, 
  style = {},
  padding = spacing.lg,
  variant = 'default'
}) {
  const variants = {
    default: {
      backgroundColor: colors.surface,
      border: `1px solid ${colors.border}`,
      boxShadow: shadows.sm
    },
    elevated: {
      backgroundColor: colors.surface,
      border: `1px solid ${colors.border}`,
      boxShadow: shadows.md
    },
    ghost: {
      backgroundColor: colors.background,
      border: `1px solid ${colors.border}`,
      boxShadow: 'none'
    }
  };

  return (
    <div
      onClick={onClick}
      style={{
        padding,
        borderRadius: '8px',
        transition: motion.fast,
        cursor: hoverable ? 'pointer' : 'default',
        ...variants[variant],
        ...style
      }}
      onMouseEnter={(e) => {
        if (hoverable) {
          e.currentTarget.style.borderColor = colors.accent;
          e.currentTarget.style.boxShadow = shadows.md;
          e.currentTarget.style.transform = 'translateY(-2px)';
        }
      }}
      onMouseLeave={(e) => {
        if (hoverable) {
          e.currentTarget.style.borderColor = colors.border;
          e.currentTarget.style.boxShadow = shadows.sm;
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
    >
      {children}
    </div>
  );
}

export default Card;
