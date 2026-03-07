import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PlusIcon,
  ChatBubbleLeftIcon,
  DocumentCheckIcon,
  CubeIcon,
  CalendarIcon,
  DocumentTextIcon,
  FlagIcon
} from '@heroicons/react/24/outline';

export default function QuickActions({ darkMode }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  
  const bgColor = darkMode ? 'var(--app-surface)' : 'var(--app-surface-alt)';
  const textColor = darkMode ? 'var(--app-text)' : 'var(--app-text)';
  const borderColor = darkMode ? '#292524' : 'var(--app-border)';
  const hoverBg = darkMode ? '#292524' : '#f3f4f6';
  const secondaryText = darkMode ? 'var(--app-muted)' : 'var(--app-muted)';

  const actions = [
    { name: 'Conversation', icon: ChatBubbleLeftIcon, href: '/conversations/new' },
    { name: 'Decision', icon: DocumentCheckIcon, href: '/decisions' },
    { name: 'Project', icon: CubeIcon, href: '/projects' },
    { name: 'Goal', icon: FlagIcon, href: '/business/goals' },
    { name: 'Meeting', icon: CalendarIcon, href: '/business/meetings' },
    { name: 'Document', icon: DocumentTextIcon, href: '/business/documents' }
  ];

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
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
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = darkMode ? 'var(--app-info)' : 'var(--app-info)';
          e.currentTarget.style.color = 'var(--app-surface-alt)';
          e.currentTarget.style.borderColor = 'var(--app-info)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = darkMode ? '#292524' : '#f3f4f6';
          e.currentTarget.style.color = textColor;
          e.currentTarget.style.borderColor = borderColor;
        }}
      >
        <PlusIcon style={{ width: '16px', height: '16px', strokeWidth: 2.5 }} />
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 49
            }}
          />
          <div style={{
            position: 'absolute',
            right: 0,
            marginTop: '8px',
            width: '180px',
            backgroundColor: bgColor,
            border: `1px solid ${borderColor}`,
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            zIndex: 50
          }}>
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.name}
                  onClick={() => {
                    navigate(action.href);
                    setOpen(false);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    fontSize: '13px',
                    color: textColor,
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBg}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Icon style={{ width: '16px', height: '16px', color: secondaryText }} />
                  {action.name}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
