import React from 'react';
import { colors } from '../utils/designTokens';

function SaveIndicator({ status, statusText }) {
  if (!statusText) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: colors.muted }}>
      {status === 'saving' && (
        <div style={{
          width: '12px',
          height: '12px',
          border: `2px solid ${colors.muted}`,
          borderTop: `2px solid transparent`,
          borderRadius: '50%',
          animation: 'spin 0.6s linear infinite'
        }}></div>
      )}
      {status === 'saved' && (
        <svg style={{ width: '16px', height: '16px', color: colors.success, fill: 'currentColor' }} viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      )}
      {status === 'error' && (
        <svg style={{ width: '16px', height: '16px', color: colors.critical, fill: 'currentColor' }} viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      )}
      <span style={{ color: status === 'saved' ? colors.success : status === 'error' ? colors.critical : colors.muted }}>
        {statusText}
      </span>
    </div>
  );
}

export default SaveIndicator;
