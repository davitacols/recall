import React from 'react';
import { colors, spacing, shadows, radius, motion } from '../utils/designTokens';

function Button({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  disabled = false,
  loading = false,
  icon: Icon,
  style = {},
  ...props
}) {
  const variants = {
    primary: {
      backgroundColor: colors.accent,
      color: colors.surface,
      border: 'none',
      hover: colors.accentDark,
      boxShadow: shadows.sm
    },
    secondary: {
      backgroundColor: colors.surface,
      color: colors.primary,
      border: `1px solid ${colors.border}`,
      hover: colors.background,
      boxShadow: 'none'
    },
    ghost: {
      backgroundColor: 'transparent',
      color: colors.secondary,
      border: 'none',
      hover: colors.background,
      boxShadow: 'none'
    },
    danger: {
      backgroundColor: colors.critical,
      color: colors.surface,
      border: 'none',
      hover: '#DC2626',
      boxShadow: shadows.sm
    }
  };

  const sizes = {
    sm: { padding: `${spacing.xs} ${spacing.md}`, fontSize: '13px' },
    md: { padding: `${spacing.sm} ${spacing.lg}`, fontSize: '14px' },
    lg: { padding: `${spacing.md} ${spacing.xl}`, fontSize: '15px' }
  };

  const variantStyle = variants[variant];
  const sizeStyle = sizes[size];

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        ...variantStyle,
        ...sizeStyle,
        borderRadius: '8px',
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: motion.fast,
        display: 'inline-flex',
        alignItems: 'center',
        gap: spacing.sm,
        opacity: disabled ? 0.5 : 1,
        ...style
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = variantStyle.hover;
          e.currentTarget.style.boxShadow = shadows.md;
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = variantStyle.backgroundColor;
          e.currentTarget.style.boxShadow = variantStyle.boxShadow;
        }
      }}
      {...props}
    >
      {loading && (
        <div style={{
          width: '14px',
          height: '14px',
          border: '2px solid currentColor',
          borderTop: '2px solid transparent',
          borderRadius: '50%',
          animation: 'spin 0.6s linear infinite'
        }} />
      )}
      {Icon && <Icon style={{ width: '18px', height: '18px' }} />}
      {children}
    </button>
  );
}

export default Button;
