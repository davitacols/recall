import React from 'react';
import { components, motion, shadows } from '../utils/designTokens';

function Button({ 
  children, 
  loading = false, 
  disabled = false, 
  variant = 'primary', 
  type = 'button',
  onClick,
  style = {}
}) {
  const variantStyles = {
    primary: components.button.primary,
    secondary: components.button.secondary,
    ghost: components.button.ghost,
  };

  const baseStyle = variantStyles[variant];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        ...baseStyle,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        border: baseStyle.border || 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: motion.fast,
        ...style
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.target.style.backgroundColor = baseStyle.hover;
          if (variant === 'primary') {
            e.target.style.boxShadow = shadows.md;
          }
        }
      }}
      onMouseLeave={(e) => {
        e.target.style.backgroundColor = baseStyle.background;
        if (variant === 'primary') {
          e.target.style.boxShadow = shadows.sm;
        }
      }}
      onFocus={(e) => {
        e.target.style.boxShadow = shadows.focus;
      }}
      onBlur={(e) => {
        e.target.style.boxShadow = variant === 'primary' ? shadows.sm : 'none';
      }}
    >
      {loading && (
        <div style={{
          width: '16px',
          height: '16px',
          border: `2px solid ${baseStyle.text}`,
          borderTop: `2px solid transparent`,
          borderRadius: '50%',
          animation: 'spin 0.6s linear infinite'
        }} />
      )}
      {children}
    </button>
  );
}

export default Button;
