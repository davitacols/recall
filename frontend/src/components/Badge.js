import React from 'react';
import { colors, spacing } from '../utils/designTokens';

function Badge({ 
  children, 
  variant = 'default',
  size = 'md'
}) {
  const variants = {
    default: { bg: colors.background, text: colors.primary, border: colors.border },
    success: { bg: colors.successLight, text: colors.success, border: colors.success },
    warning: { bg: colors.warningLight, text: colors.warning, border: colors.warning },
    critical: { bg: colors.criticalLight, text: colors.critical, border: colors.critical },
    accent: { bg: colors.accentLight, text: colors.accent, border: colors.accent }
  };

  const sizes = {
    sm: { padding: `${spacing.xs} ${spacing.sm}`, fontSize: '12px' },
    md: { padding: `${spacing.xs} ${spacing.md}`, fontSize: '13px' },
    lg: { padding: `${spacing.sm} ${spacing.lg}`, fontSize: '14px' }
  };

  const variantStyle = variants[variant];
  const sizeStyle = sizes[size];

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      ...sizeStyle,
      backgroundColor: variantStyle.bg,
      color: variantStyle.text,
      border: `1px solid ${variantStyle.border}`,
      borderRadius: '6px',
      fontWeight: 500,
      whiteSpace: 'nowrap'
    }}>
      {children}
    </span>
  );
}

export default Badge;
