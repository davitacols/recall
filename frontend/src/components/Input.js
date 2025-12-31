import React from 'react';
import { components, spacing, motion, shadows } from '../utils/designTokens';

function Input({ 
  label, 
  placeholder, 
  value, 
  onChange, 
  type = 'text',
  error,
  disabled,
  style = {}
}) {
  return (
    <div style={{ marginBottom: spacing.lg }}>
      {label && (
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: 500,
          color: '#0F172A',
          marginBottom: spacing.sm
        }}>
          {label}
        </label>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          ...components.input,
          borderColor: error ? '#EF4444' : components.input.border,
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? 'not-allowed' : 'text',
          transition: motion.fast,
          ...style
        }}
        onFocus={(e) => {
          e.target.style.borderColor = '#4F46E5';
          e.target.style.boxShadow = shadows.focus;
        }}
        onBlur={(e) => {
          e.target.style.borderColor = error ? '#EF4444' : '#E2E8F0';
          e.target.style.boxShadow = 'none';
        }}
      />
      {error && (
        <p style={{
          fontSize: '13px',
          color: '#EF4444',
          marginTop: spacing.sm,
          margin: 0
        }}>
          {error}
        </p>
      )}
    </div>
  );
}

export default Input;
