import React from 'react';
import { colors, spacing } from '../utils/designTokens';

function Badge({ children, variant = 'default', style = {} }) {
  const variants = {
    default: {
      backgroundColor: '#F3F4F6',
      color: '#6B7280',
      border: '1px solid #E5E7EB',
    },
    decision: {
      backgroundColor: '#F1F5F9',
      color: colors.decision,
      border: `1px solid ${colors.decision}`,
    },
    question: {
      backgroundColor: '#FFFBEB',
      color: colors.question,
      border: `1px solid ${colors.question}`,
    },
    success: {
      backgroundColor: '#F0FDF4',
      color: colors.success,
      border: `1px solid ${colors.success}`,
    },
    critical: {
      backgroundColor: '#FEF2F2',
      color: colors.critical,
      border: `1px solid ${colors.critical}`,
    },
    intelligence: {
      backgroundColor: colors.aiTint,
      color: colors.intelligence,
      border: `1px solid #DBEAFE`,
    }
  };

  const style_obj = variants[variant] || variants.default;

  return (
    <span style={{
      display: 'inline-block',
      padding: `${spacing.sm} ${spacing.md}`,
      fontSize: '12px',
      fontWeight: 500,
      borderRadius: '4px',
      ...style_obj,
      ...style
    }}>
      {children}
    </span>
  );
}

export default Badge;
