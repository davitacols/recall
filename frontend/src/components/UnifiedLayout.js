import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../utils/ThemeAndAccessibility';
import UnifiedNav from './UnifiedNav';
import Breadcrumbs from './Breadcrumbs';
import QuickActions from './QuickActions';
import NLCommandBar from './NLCommandBar';
import NotificationBell from './NotificationBell';
import { BellIcon, UserCircleIcon, SunIcon, MoonIcon } from '@heroicons/react/24/outline';

export default function UnifiedLayout({ children }) {
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);

  const bgColor = darkMode ? '#0c0a09' : '#f9fafb';
  const cardBg = darkMode ? '#1c1917' : '#ffffff';
  const textColor = darkMode ? '#e7e5e4' : '#111827';
  const borderColor = darkMode ? '#292524' : '#e5e7eb';
  const hoverBg = darkMode ? '#292524' : '#f3f4f6';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: bgColor }}>
      <UnifiedNav darkMode={darkMode} />
      <NLCommandBar darkMode={darkMode} />
      
      {/* User Menu */}
      <div style={{
        position: 'fixed',
        top: '12px',
        right: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        zIndex: 51
      }}>
        <QuickActions darkMode={darkMode} />
        <button
          onClick={toggleDarkMode}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: darkMode ? '#292524' : '#f3f4f6',
            border: `1px solid ${borderColor}`,
            color: textColor,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBg}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = darkMode ? '#292524' : '#f3f4f6'}
        >
          {darkMode ? (
            <SunIcon style={{ width: '16px', height: '16px' }} />
          ) : (
            <MoonIcon style={{ width: '16px', height: '16px' }} />
          )}
        </button>
        <NotificationBell />
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowProfile(!showProfile)}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: user?.avatar ? 'transparent' : '#3b82f6',
              border: `2px solid ${borderColor}`,
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              padding: 0
            }}
          >
            {user?.avatar ? (
              <img 
                src={user.avatar} 
                alt={user.full_name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              user?.full_name?.charAt(0) || 'U'
            )}
          </button>
          
          {showProfile && (
            <div style={{
              position: 'absolute',
              right: 0,
              marginTop: '8px',
              width: '180px',
              backgroundColor: cardBg,
              border: `1px solid ${borderColor}`,
              borderRadius: '6px',
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              <div style={{ padding: '12px 14px', borderBottom: `1px solid ${borderColor}` }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: textColor }}>{user?.full_name}</div>
                <div style={{ fontSize: '11px', color: darkMode ? '#a8a29e' : '#6b7280' }}>{user?.email}</div>
              </div>
              <button
                onClick={() => { navigate('/profile'); setShowProfile(false); }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 14px',
                  fontSize: '13px',
                  color: textColor,
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBg}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                Profile
              </button>
              <button
                onClick={() => { navigate('/settings'); setShowProfile(false); }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 14px',
                  fontSize: '13px',
                  color: textColor,
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBg}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                Settings
              </button>
              <div style={{ height: '1px', backgroundColor: borderColor }} />
              <button
                onClick={logout}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 14px',
                  fontSize: '13px',
                  color: '#ef4444',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBg}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      <main style={{ paddingTop: '56px', minHeight: '100vh' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 24px' }}>
          <Breadcrumbs darkMode={darkMode} />
          {children}
        </div>
      </main>
    </div>
  );
}
