import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  HomeIcon, 
  ChatBubbleLeftIcon, 
  DocumentCheckIcon,
  RocketLaunchIcon,
  FlagIcon,
  ClipboardDocumentListIcon,
  CalendarIcon,
  DocumentTextIcon,
  Squares2X2Icon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  CubeIcon
} from '@heroicons/react/24/outline';

export default function UnifiedNav({ darkMode }) {
  const location = useLocation();
  const [openDropdown, setOpenDropdown] = useState(null);

  const bgColor = darkMode ? '#1c1917' : '#ffffff';
  const textColor = darkMode ? '#e7e5e4' : '#111827';
  const borderColor = darkMode ? '#292524' : '#e5e7eb';
  const hoverBg = darkMode ? '#292524' : '#f3f4f6';
  const secondaryText = darkMode ? '#a8a29e' : '#6b7280';

  const navItems = [
    { name: 'Home', href: '/', icon: HomeIcon },
    { 
      name: 'Knowledge', 
      icon: Squares2X2Icon,
      items: [
        { name: 'Search', href: '/knowledge', icon: MagnifyingGlassIcon },
        { name: 'Graph', href: '/knowledge/graph', icon: CubeIcon },
        { name: 'Analytics', href: '/knowledge/analytics', icon: ChartBarIcon }
      ]
    },
    { 
      name: 'Collaborate', 
      icon: ChatBubbleLeftIcon,
      items: [
        { name: 'Conversations', href: '/conversations', icon: ChatBubbleLeftIcon },
        { name: 'Decisions', href: '/decisions', icon: DocumentCheckIcon },
        { name: 'Meetings', href: '/business/meetings', icon: CalendarIcon }
      ]
    },
    { 
      name: 'Execute', 
      icon: RocketLaunchIcon,
      items: [
        { name: 'Projects', href: '/projects', icon: CubeIcon },
        { name: 'Goals', href: '/business/goals', icon: FlagIcon },
        { name: 'Tasks', href: '/business/tasks', icon: ClipboardDocumentListIcon },
        { name: 'Sprints', href: '/sprint-history', icon: RocketLaunchIcon }
      ]
    },
    { 
      name: 'Resources', 
      icon: DocumentTextIcon,
      items: [
        { name: 'Documents', href: '/business/documents', icon: DocumentTextIcon },
        { name: 'Templates', href: '/business/templates', icon: DocumentTextIcon }
      ]
    }
  ];

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '56px',
      backgroundColor: bgColor,
      borderBottom: `1px solid ${borderColor}`,
      display: 'flex',
      alignItems: 'center',
      padding: '0 200px 0 16px',
      gap: '8px',
      zIndex: 50
    }}>
      {/* Logo */}
      <Link to="/" style={{
        fontSize: '18px',
        fontWeight: 700,
        color: textColor,
        textDecoration: 'none',
        marginRight: '24px',
        letterSpacing: '-0.02em'
      }}>
        Recall
      </Link>

      {/* Nav Items */}
      <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = item.href ? location.pathname === item.href : 
            item.items?.some(sub => location.pathname.startsWith(sub.href));
          
          if (item.items) {
            return (
              <div 
                key={item.name}
                style={{ position: 'relative' }}
              >
                <button
                  onMouseEnter={() => setOpenDropdown(item.name)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? textColor : secondaryText,
                    backgroundColor: isActive ? hoverBg : 'transparent',
                    border: `1px solid ${isActive ? borderColor : 'transparent'}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <Icon style={{ width: '16px', height: '16px' }} />
                  <span>{item.name}</span>
                </button>
                
                {openDropdown === item.name && (
                  <div 
                    onMouseEnter={() => setOpenDropdown(item.name)}
                    onMouseLeave={() => setOpenDropdown(null)}
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: '4px',
                      minWidth: '200px',
                      backgroundColor: bgColor,
                      border: `1px solid ${borderColor}`,
                      borderRadius: '8px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      overflow: 'hidden',
                      zIndex: 100
                    }}>
                    {item.items.map(subItem => {
                      const SubIcon = subItem.icon;
                      return (
                        <Link
                          key={subItem.href}
                          to={subItem.href}
                          onClick={() => setOpenDropdown(null)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px 14px',
                            fontSize: '13px',
                            color: textColor,
                            textDecoration: 'none',
                            transition: 'background 0.15s',
                            borderLeft: location.pathname === subItem.href ? '3px solid #3b82f6' : '3px solid transparent'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBg}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          {SubIcon && <SubIcon style={{ width: '16px', height: '16px', color: secondaryText }} />}
                          <span>{subItem.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }
          
          return (
            <Link
              key={item.name}
              to={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? textColor : secondaryText,
                backgroundColor: isActive ? hoverBg : 'transparent',
                textDecoration: 'none',
                transition: 'all 0.15s',
                border: `1px solid ${isActive ? borderColor : 'transparent'}`
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = hoverBg;
                  e.currentTarget.style.color = textColor;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = secondaryText;
                }
              }}
            >
              <Icon style={{ width: '16px', height: '16px' }} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', width: '220px', marginLeft: 'auto' }}>
        <MagnifyingGlassIcon style={{
          position: 'absolute',
          left: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '16px',
          height: '16px',
          color: secondaryText
        }} />
        <input
          type="text"
          placeholder="Search..."
          readOnly
          onClick={() => {
            const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true });
            document.dispatchEvent(event);
          }}
          style={{
            width: '100%',
            padding: '7px 36px 7px 38px',
            fontSize: '13px',
            backgroundColor: darkMode ? '#292524' : '#f9fafb',
            border: `1px solid ${borderColor}`,
            borderRadius: '8px',
            color: secondaryText,
            outline: 'none',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = hoverBg;
            e.currentTarget.style.borderColor = darkMode ? '#3f3f46' : '#d1d5db';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = darkMode ? '#292524' : '#f9fafb';
            e.currentTarget.style.borderColor = borderColor;
          }}
        />
        <kbd style={{
          position: 'absolute',
          right: '10px',
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: '11px',
          color: secondaryText,
          backgroundColor: darkMode ? '#1c1917' : '#ffffff',
          border: `1px solid ${borderColor}`,
          borderRadius: '4px',
          padding: '2px 6px',
          fontFamily: 'monospace'
        }}>⌘K</kbd>
      </div>
    </nav>
  );
}
