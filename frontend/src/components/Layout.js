import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../utils/ThemeAndAccessibility';
import NotificationBell from './NotificationBell';
import MobileBottomNav from './MobileBottomNav';
import Search from './Search';
import { colors, spacing, shadows, radius, motion } from '../utils/designTokens';
import { getAvatarUrl } from '../utils/avatarUtils';
import '../styles/mobile.css';
import { 
  HomeIcon,
  ChatBubbleLeftIcon,
  DocumentTextIcon,
  BookOpenIcon,
  BellIcon,
  Bars3Icon,
  XMarkIcon,
  RectangleStackIcon,
  ChevronDownIcon,
  InboxIcon,
  SunIcon,
  MoonIcon,
  UsersIcon
} from '@heroicons/react/24/outline';

function AvatarDisplay({ avatar, fullName }) {
  const initials = fullName?.charAt(0) || 'U';
  const avatarUrl = getAvatarUrl(avatar);
  
  if (avatarUrl) {
    return (
      <img 
        src={avatarUrl} 
        alt={fullName || 'User'} 
        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
        onError={(e) => {
          // Fallback to initials if image fails to load
          e.target.style.display = 'none';
          e.target.parentElement.innerHTML = `<div style="width: 100%; height: 100%; background-color: #3b82f6; display: flex; align-items: center; justify-content: center;"><span style="color: #ffffff; font-size: 14px; font-weight: bold;">${initials}</span></div>`;
        }}
      />
    );
  }
  
  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: '#ffffff', fontSize: '14px', fontWeight: 'bold' }}>{initials}</span>
    </div>
  );
}

function Layout({ children }) {
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(220);
  const [isResizing, setIsResizing] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({ Main: true, Work: true, Business: true, Personal: true, Admin: true });

  const bgColor = darkMode ? '#1c1917' : '#ffffff';
  const textColor = darkMode ? '#e7e5e4' : '#111827';
  const accentColor = '#3b82f6';
  const hoverBg = darkMode ? '#292524' : '#f3f4f6';
  const secondaryText = darkMode ? '#a8a29e' : '#6b7280';
  const mainBg = darkMode ? '#0c0a09' : '#f9fafb';
  const borderColor = darkMode ? '#292524' : '#e5e7eb';
  const activeBg = darkMode ? '#1f2937' : '#e5e7eb';

  useEffect(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved) setSidebarCollapsed(JSON.parse(saved));
    const savedWidth = localStorage.getItem('sidebarWidth');
    if (savedWidth) setSidebarWidth(parseInt(savedWidth));
  }, []);

  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
  };

  const handleMouseDown = (e) => {
    setIsResizing(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const newWidth = e.clientX;
      if (newWidth >= 180 && newWidth <= 400) {
        setSidebarWidth(newWidth);
        localStorage.setItem('sidebarWidth', newWidth.toString());
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const navSections = [
    {
      title: 'Main',
      items: [
        { name: 'Home', href: '/', icon: HomeIcon },
        { name: 'Conversations', href: '/conversations', icon: ChatBubbleLeftIcon },
        { name: 'Decisions', href: '/decisions', icon: DocumentTextIcon },
        { name: 'Knowledge', href: '/knowledge', icon: BookOpenIcon },
      ]
    },
    {
      title: 'Work',
      items: [
        { name: 'Projects', href: '/projects', icon: RectangleStackIcon },
        { name: 'Current Sprint', href: '/sprint' },
        { name: 'Sprint History', href: '/sprint-history' },
        { name: 'Blockers', href: '/blockers' },
        { name: 'Retrospectives', href: '/retrospectives' },
      ]
    },
    {
      title: 'Business',
      items: [
        { name: 'Overview', href: '/business' },
        { name: 'Goals', href: '/business/goals' },
        { name: 'Meetings', href: '/business/meetings' },
        { name: 'Tasks', href: '/business/tasks' },
        { name: 'Documents', href: '/business/documents' },
        { name: 'Templates', href: '/business/templates' },
      ]
    },
    {
      title: 'Personal',
      items: [
        { name: 'Activity Feed', href: '/activity' },
        { name: 'Bookmarks & Drafts', href: '/bookmarks-drafts' },
        { name: 'My Decisions', href: '/my-decisions' },
        { name: 'My Questions', href: '/my-questions' },
        { name: 'Knowledge Health', href: '/knowledge-health' },
      ]
    },
    ...(user?.role === 'admin' ? [{
      title: 'Admin',
      items: [
        { name: 'Team', href: '/team', icon: UsersIcon },
        { name: 'Analytics', href: '/analytics' },
        { name: 'Advanced Search', href: '/search' },
        { name: 'Integrations', href: '/integrations' },
        { name: 'API Keys', href: '/api-keys' },
        { name: 'Audit Logs', href: '/audit-logs' },
        { name: 'Subscription', href: '/subscription' },
        { name: 'Enterprise', href: '/enterprise' },
        { name: 'Import/Export', href: '/import-export' },
      ]
    }] : [])
  ];

  const getPageTitle = () => {
    if (location.pathname === '/') return 'Home';
    if (location.pathname.startsWith('/conversations')) return 'Conversations';
    if (location.pathname.startsWith('/decisions')) return 'Decisions';
    if (location.pathname.startsWith('/knowledge')) return 'Knowledge';
    if (location.pathname.startsWith('/projects')) return 'Projects';
    if (location.pathname.startsWith('/boards')) return 'Board';
    if (location.pathname.startsWith('/notifications')) return 'Notifications';
    if (location.pathname.startsWith('/sprint')) return 'Sprint';
    if (location.pathname.startsWith('/blockers')) return 'Blockers';
    if (location.pathname.startsWith('/retrospectives')) return 'Retrospectives';
    return 'Recall';
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: mainBg, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '60px',
        background: bgColor,
        borderBottom: `1px solid ${borderColor}`,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: '16px'
      }}>
        {/* Left: Logo + Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => window.innerWidth < 768 ? setMobileMenuOpen(!mobileMenuOpen) : toggleSidebar()} style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', border: `1px solid ${borderColor}`, cursor: 'pointer', borderRadius: '6px', color: secondaryText, transition: 'all 0.15s' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = hoverBg; e.currentTarget.style.color = textColor; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = secondaryText; }}>
            {mobileMenuOpen ? <XMarkIcon style={{ width: '18px', height: '18px' }} /> : <Bars3Icon style={{ width: '18px', height: '18px' }} />}
          </button>
          <h1 style={{ fontSize: '15px', fontWeight: 600, color: textColor, margin: 0, letterSpacing: '-0.01em' }}>{getPageTitle()}</h1>
        </div>

        {/* Right: Actions */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ display: window.innerWidth < 640 ? 'none' : 'block' }}><Search /></div>
          <Link to="/messages" style={{ width: '36px', height: '36px', display: window.innerWidth < 640 ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', color: secondaryText, borderRadius: '6px', transition: 'all 0.15s', border: `1px solid transparent` }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = hoverBg; e.currentTarget.style.color = textColor; e.currentTarget.style.borderColor = borderColor; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = secondaryText; e.currentTarget.style.borderColor = 'transparent'; }}>
            <InboxIcon style={{ width: '18px', height: '18px' }} />
          </Link>
          <NotificationBell />
          <div style={{ position: 'relative', marginLeft: '8px', display: window.innerWidth < 640 ? 'none' : 'block' }}>
            <button onClick={() => setShowProfileMenu(!showProfileMenu)} style={{ width: '32px', height: '32px', borderRadius: '6px', overflow: 'hidden', border: `1px solid ${borderColor}`, cursor: 'pointer', padding: 0, transition: 'all 0.15s' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = secondaryText} onMouseLeave={(e) => e.currentTarget.style.borderColor = borderColor}>
              <AvatarDisplay avatar={user?.avatar} fullName={user?.full_name} />
            </button>
            {showProfileMenu && (
              <div style={{ position: 'absolute', right: 0, marginTop: '8px', width: '180px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '6px', zIndex: 10, overflow: 'hidden' }}>
                <Link to="/profile" onClick={() => setShowProfileMenu(false)} style={{ display: 'block', padding: '10px 14px', fontSize: '13px', color: textColor, textDecoration: 'none', transition: 'background 0.15s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBg} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>Profile</Link>
                <Link to="/settings" onClick={() => setShowProfileMenu(false)} style={{ display: 'block', padding: '10px 14px', fontSize: '13px', color: textColor, textDecoration: 'none', transition: 'background 0.15s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBg} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>Settings</Link>
                <div style={{ height: '1px', backgroundColor: borderColor, margin: '4px 0' }} />
                <button onClick={logout} style={{ width: '100%', textAlign: 'left', padding: '10px 14px', fontSize: '13px', color: '#ef4444', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', transition: 'background 0.15s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBg} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>Sign out</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div onClick={() => setMobileMenuOpen(false)} style={{ position: 'fixed', top: '60px', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 40, display: window.innerWidth >= 768 ? 'none' : 'block' }} />
      )}

      {/* Sidebar */}
      <aside style={{
        position: 'fixed',
        top: '60px',
        left: mobileMenuOpen || window.innerWidth >= 768 ? 0 : '-100%',
        bottom: 0,
        width: window.innerWidth < 768 ? '280px' : (sidebarCollapsed ? '60px' : `${sidebarWidth}px`),
        background: bgColor,
        borderRight: `1px solid ${borderColor}`,
        display: 'flex',
        flexDirection: 'column',
        transition: window.innerWidth < 768 ? 'left 0.3s ease' : (sidebarCollapsed ? 'width 0.2s ease' : 'none'),
        overflowX: 'hidden',
        userSelect: isResizing ? 'none' : 'auto',
        zIndex: 45
      }}>
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <nav style={{ flex: 1, padding: '16px 10px', overflowY: 'auto' }}>
            {navSections.map((section, idx) => (
              <div key={section.title} style={{ marginBottom: idx < navSections.length - 1 ? '20px' : 0 }}>
                {!sidebarCollapsed && (
                  <button
                    onClick={() => toggleGroup(section.title)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 12px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: secondaryText,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      marginBottom: '6px'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = textColor}
                    onMouseLeave={(e) => e.currentTarget.style.color = secondaryText}
                  >
                    <span>{section.title}</span>
                    <ChevronDownIcon 
                      style={{ 
                        width: '12px', 
                        height: '12px',
                        transform: expandedGroups[section.title] ? 'rotate(0deg)' : 'rotate(-90deg)',
                        transition: 'transform 0.15s'
                      }} 
                    />
                  </button>
                )}
                
                {(sidebarCollapsed || expandedGroups[section.title]) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                    {section.items.map((item) => {
                      const isActive = location.pathname === item.href;
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: sidebarCollapsed ? '10px' : '8px 12px',
                            paddingLeft: sidebarCollapsed ? '10px' : (Icon ? '12px' : '24px'),
                            borderRadius: '5px',
                            fontSize: '13px',
                            fontWeight: isActive ? 600 : 500,
                            textDecoration: 'none',
                            color: isActive ? textColor : secondaryText,
                            backgroundColor: isActive ? activeBg : 'transparent',
                            transition: 'all 0.15s',
                            justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                            border: `1px solid ${isActive ? borderColor : 'transparent'}`
                          }}
                          onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = hoverBg; e.currentTarget.style.color = textColor; } }}
                          onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = secondaryText; } }}
                          title={sidebarCollapsed ? item.name : ''}
                        >
                          {Icon && <Icon style={{ width: '18px', height: '18px', flexShrink: 0 }} />}
                          {!sidebarCollapsed && <span>{item.name}</span>}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </nav>

          <div style={{ padding: '14px 10px', borderTop: `1px solid ${borderColor}`, flexShrink: 0 }}>
            {!sidebarCollapsed && (
              <button
                onClick={toggleDarkMode}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '5px', fontSize: '13px', fontWeight: 500, textDecoration: 'none', color: secondaryText, backgroundColor: 'transparent', transition: 'all 0.15s', border: `1px solid transparent`, marginBottom: '10px', cursor: 'pointer' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = hoverBg; e.currentTarget.style.color = textColor; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = secondaryText; }}
              >
                {darkMode ? <SunIcon style={{ width: '18px', height: '18px', flexShrink: 0 }} /> : <MoonIcon style={{ width: '18px', height: '18px', flexShrink: 0 }} />}
                <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
              </button>
            )}
            {sidebarCollapsed && (
              <button
                onClick={toggleDarkMode}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', borderRadius: '5px', fontSize: '13px', fontWeight: 500, textDecoration: 'none', color: secondaryText, backgroundColor: 'transparent', transition: 'all 0.15s', border: `1px solid transparent`, marginBottom: '10px', cursor: 'pointer' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = hoverBg; e.currentTarget.style.color = textColor; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = secondaryText; }}
                title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {darkMode ? <SunIcon style={{ width: '18px', height: '18px', flexShrink: 0 }} /> : <MoonIcon style={{ width: '18px', height: '18px', flexShrink: 0 }} />}
              </button>
            )}
            {!sidebarCollapsed ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 8px', borderRadius: '5px', backgroundColor: hoverBg, border: `1px solid ${borderColor}` }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '5px', overflow: 'hidden', flexShrink: 0 }}>
                  <AvatarDisplay avatar={user?.avatar} fullName={user?.full_name} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: textColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.full_name?.split(' ')[0]}</div>
                  <div style={{ fontSize: '11px', color: secondaryText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.organization_name}</div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '5px', overflow: 'hidden', border: `1px solid ${borderColor}` }}>
                  <AvatarDisplay avatar={user?.avatar} fullName={user?.full_name} />
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Resize Handle */}
        {!sidebarCollapsed && (
          <div
            onMouseDown={handleMouseDown}
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: '4px',
              cursor: 'ew-resize',
              backgroundColor: isResizing ? '#3b82f6' : 'transparent',
              transition: 'background-color 0.15s',
              zIndex: 10
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
            onMouseLeave={(e) => !isResizing && (e.currentTarget.style.backgroundColor = 'transparent')}
          />
        )}
      </aside>

      {/* Main Content */}
      <main style={{
        paddingTop: '60px',
        paddingLeft: window.innerWidth < 768 ? '0' : (sidebarCollapsed ? '60px' : `${sidebarWidth}px`),
        paddingBottom: window.innerWidth < 768 ? '70px' : '0',
        transition: sidebarCollapsed ? 'padding-left 0.2s ease' : 'none',
        backgroundColor: mainBg,
        flex: 1,
        minHeight: '100vh'
      }}>
        <div style={{ flex: 1, padding: window.innerWidth < 640 ? '16px' : '24px', color: textColor, backgroundColor: mainBg }}>
          {children}
        </div>
      </main>
      
      <MobileBottomNav />
    </div>
  );
}

export default Layout;
