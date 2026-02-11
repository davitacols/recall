import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../utils/ThemeAndAccessibility';
import NotificationBell from './NotificationBell';
import MobileBottomNav from './MobileBottomNav';
import Search from './Search';
import { colors, spacing, shadows, radius, motion } from '../utils/designTokens';
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
  MoonIcon
} from '@heroicons/react/24/outline';

function AvatarDisplay({ avatar, fullName }) {
  const initials = fullName?.charAt(0) || 'U';
  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({ Sprint: true, Personal: true, Admin: true });

  const bgColor = '#141414';
  const textColor = '#FFFFFF';
  const accentColor = '#3B82F6';
  const accentLight = '#60A5FA';
  const hoverBg = 'rgba(255, 255, 255, 0.05)';
  const secondaryText = '#A0A0A0';
  const mainBg = '#0A0A0A';
  const borderColor = 'rgba(255, 255, 255, 0.1)';
  const sidebarBg = '#141414';

  useEffect(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved) setSidebarCollapsed(JSON.parse(saved));
  }, []);

  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
  };

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const primaryNav = [
    { name: 'Home', href: '/', icon: HomeIcon },
    { name: 'Conversations', href: '/conversations', icon: ChatBubbleLeftIcon },
    { name: 'Decisions', href: '/decisions', icon: DocumentTextIcon },
    { name: 'Knowledge', href: '/knowledge', icon: BookOpenIcon },
    { name: 'Projects', href: '/projects', icon: RectangleStackIcon },
    { name: 'Notifications', href: '/notifications', icon: BellIcon },
  ];

  const sprintNav = [
    { name: 'Current Sprint', href: '/sprint' },
    { name: 'Sprint History', href: '/sprint-history' },
    { name: 'Blockers', href: '/blockers' },
    { name: 'Retrospectives', href: '/retrospectives' },
  ];

  const personalNav = [
    { name: 'My Decisions', href: '/my-decisions' },
    { name: 'My Questions', href: '/my-questions' },
    { name: 'Knowledge Health', href: '/knowledge-health' },
  ];

  const adminNav = [
    { name: 'Analytics', href: '/analytics' },
    { name: 'Integrations', href: '/integrations' },
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
        zIndex: 50
      }}>
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: '32px', paddingRight: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            <button onClick={toggleSidebar} style={{ padding: '8px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', transition: 'all 0.2s', color: secondaryText }} onMouseEnter={(e) => e.target.style.color = accentLight} onMouseLeave={(e) => e.target.style.color = secondaryText}>
              {sidebarCollapsed ? (
                <Bars3Icon style={{ width: '20px', height: '20px' }} />
              ) : (
                <XMarkIcon style={{ width: '20px', height: '20px' }} />
              )}
            </button>
            <h1 style={{ fontSize: '24px', fontWeight: 900, color: textColor }}>{getPageTitle()}</h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <Search />
            <Link to="/messages" style={{ padding: '8px', color: secondaryText, textDecoration: 'none', transition: 'color 0.2s' }} title="Messages" onMouseEnter={(e) => e.target.style.color = accentLight} onMouseLeave={(e) => e.target.style.color = secondaryText}>
              <InboxIcon style={{ width: '24px', height: '24px' }} />
            </Link>
            <NotificationBell />

            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowProfileMenu(!showProfileMenu)} style={{ width: '32px', height: '32px', overflow: 'hidden', border: 'none', cursor: 'pointer' }}>
                <AvatarDisplay avatar={user?.avatar} fullName={user?.full_name} />
              </button>
              {showProfileMenu && (
                <div style={{ position: 'absolute', right: 0, marginTop: '8px', width: '192px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, boxShadow: '0 10px 15px rgba(0,0,0,0.3)', zIndex: 10 }}>
                  <Link to="/profile" onClick={() => setShowProfileMenu(false)} style={{ display: 'block', paddingLeft: '24px', paddingRight: '24px', paddingTop: '12px', paddingBottom: '12px', fontSize: '14px', color: textColor, textDecoration: 'none', borderBottom: `1px solid ${borderColor}`, transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.target.style.backgroundColor = hoverBg} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>Profile</Link>
                  <Link to="/settings" onClick={() => setShowProfileMenu(false)} style={{ display: 'block', paddingLeft: '24px', paddingRight: '24px', paddingTop: '12px', paddingBottom: '12px', fontSize: '14px', color: textColor, textDecoration: 'none', borderBottom: `1px solid ${borderColor}`, transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.target.style.backgroundColor = hoverBg} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>Settings</Link>
                  <button onClick={logout} style={{ width: '100%', textAlign: 'left', paddingLeft: '24px', paddingRight: '24px', paddingTop: '12px', paddingBottom: '12px', fontSize: '14px', color: textColor, border: 'none', backgroundColor: 'transparent', cursor: 'pointer', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.target.style.backgroundColor = hoverBg} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>Sign out</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside style={{
        position: 'fixed',
        top: '60px',
        left: 0,
        bottom: 0,
        width: sidebarCollapsed ? '70px' : '260px',
        background: sidebarBg,
        borderRight: `1px solid ${borderColor}`,
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease'
      }}>
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <nav style={{ flex: 1, padding: spacing.lg, overflowY: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
              {primaryNav.map((item) => {
                const isActive = location.pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing.md,
                      padding: `${spacing.md} ${spacing.lg}`,
                      borderRadius: '0',
                      fontSize: '14px',
                      fontWeight: isActive ? 700 : 500,
                      textDecoration: 'none',
                      color: isActive ? accentColor : secondaryText,
                      backgroundColor: isActive ? hoverBg : 'transparent',
                      borderLeft: isActive ? `3px solid ${accentColor}` : '3px solid transparent',
                      borderRadius: '0',
                      marginBottom: '2px',
                      paddingLeft: isActive ? '12px' : spacing.lg,
                      transition: motion.fast
                    }}
                    title={sidebarCollapsed ? item.name : ''}
                  >
                    <Icon style={{ width: '20px', height: '20px', flexShrink: 0 }} />
                    {!sidebarCollapsed && <span>{item.name}</span>}
                  </Link>
                );
              })}
            </div>

            {!sidebarCollapsed && (
              <>
                {[
                  { title: 'Sprint', items: sprintNav },
                  { title: 'Personal', items: personalNav },
                  ...(user?.role === 'admin' ? [{ title: 'Admin', items: adminNav }] : [])
                ].map((section) => (
                  <div key={section.title} style={{ marginTop: spacing.xl }}>
                    <button
                      onClick={() => toggleGroup(section.title)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: `${spacing.sm} ${spacing.lg}`,
                        fontSize: '11px',
                        fontWeight: 700,
                        color: accentColor,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        transition: motion.fast
                      }}
                      onMouseEnter={(e) => e.target.style.color = accentLight}
                      onMouseLeave={(e) => e.target.style.color = accentColor}
                    >
                      <span>{section.title}</span>
                      <ChevronDownIcon 
                        style={{ 
                          width: '14px', 
                          height: '14px',
                          transform: expandedGroups[section.title] ? 'rotate(0deg)' : 'rotate(-90deg)',
                          transition: motion.fast
                        }} 
                      />
                    </button>
                    
                    {expandedGroups[section.title] && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs, marginTop: spacing.sm }}>
                        {section.items.map((item) => {
                          const isActive = location.pathname === item.href;
                          return (
                            <Link
                              key={item.name}
                              to={item.href}
                              style={{
                                display: 'block',
                                padding: `${spacing.sm} ${spacing.lg}`,
                                paddingLeft: spacing.xl,
                                borderRadius: '0',
                                fontSize: '13px',
                                textDecoration: 'none',
                                color: isActive ? accentColor : secondaryText,
                                backgroundColor: isActive ? hoverBg : 'transparent',
                                fontWeight: isActive ? 600 : 'normal',
                                borderLeft: isActive ? `4px solid ${accentColor}` : '4px solid transparent',
                                paddingLeft: isActive ? '12px' : spacing.xl,
                                transition: motion.fast
                              }}
                            >
                              {item.name}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </nav>

          <div style={{ padding: spacing.lg, borderTop: `1px solid ${borderColor}`, flexShrink: 0 }}>
            {!sidebarCollapsed ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '0', overflow: 'hidden', flexShrink: 0 }}>
                  <AvatarDisplay avatar={user?.avatar} fullName={user?.full_name} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: textColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.full_name?.split(' ')[0]}</div>
                  <div style={{ fontSize: '11px', color: secondaryText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.organization_name}</div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '0', overflow: 'hidden' }}>
                  <AvatarDisplay avatar={user?.avatar} fullName={user?.full_name} />
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{
        paddingTop: '60px',
        paddingLeft: sidebarCollapsed ? '70px' : '260px',
        transition: 'padding-left 0.2s ease',
        backgroundColor: mainBg,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh'
      }}>
        <div style={{ flex: 1, padding: spacing.xl, color: textColor, backgroundColor: mainBg }}>
          {children}
        </div>
      </main>
      
      <MobileBottomNav />
    </div>
  );
}

export default Layout;
