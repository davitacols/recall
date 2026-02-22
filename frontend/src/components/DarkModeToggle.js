import React from 'react';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../utils/ThemeAndAccessibility';

export default function DarkModeToggle() {
  const { darkMode, toggleDarkMode } = useTheme();

  return (
    <button
      onClick={toggleDarkMode}
      style={{
        padding: '8px',
        backgroundColor: 'transparent',
        border: `1px solid ${darkMode ? '#292524' : '#e5e7eb'}`,
        borderRadius: '5px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s'
      }}
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = darkMode ? '#292524' : '#f3f4f6'}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
    >
      {darkMode ? (
        <SunIcon style={{ width: '18px', height: '18px', color: '#e7e5e4' }} />
      ) : (
        <MoonIcon style={{ width: '18px', height: '18px', color: '#111827' }} />
      )}
    </button>
  );
}
