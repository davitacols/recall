import React from 'react';
import { components, spacing, motion } from '../utils/designTokens';

function Card({ children, title, subtitle, action, style = {} }) {
  return (
    <div style={{
      ...components.card,
      marginBottom: spacing.lg,
      transition: motion.normal,
      ...style
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
    }}>
      {(title || subtitle) && (
        <div style={{ marginBottom: spacing.lg }}>
          {title && (
            <h3 style={{
              fontSize: '16px',
              fontWeight: 600,
              color: '#0F172A',
              margin: 0,
              marginBottom: subtitle ? spacing.sm : 0
            }}>
              {title}
            </h3>
          )}
          {subtitle && (
            <p style={{
              fontSize: '14px',
              color: '#64748B',
              margin: 0
            }}>
              {subtitle}
            </p>
          )}
        </div>
      )}
      
      <div style={{ marginBottom: action ? spacing.lg : 0 }}>
        {children}
      </div>
      
      {action && (
        <div style={{ display: 'flex', gap: spacing.md, justifyContent: 'flex-end' }}>
          {action}
        </div>
      )}
    </div>
  );
}

export default Card;
