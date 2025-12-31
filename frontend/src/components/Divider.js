import React from 'react';
import { spacing } from '../utils/designTokens';

function Divider({ style = {} }) {
  return (
    <div style={{
      height: '1px',
      backgroundColor: '#E5E7EB',
      margin: `${spacing.lg} 0`,
      ...style
    }} />
  );
}

export default Divider;
