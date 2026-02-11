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

  const bgColor = '#1A1A1A';
  const textColor = '#F5F5F5';
  const accentColor = '#6B9FED';
  const accentLight = '#8AB4F1';
  const hoverBg = 'rgba(255, 255, 255, 0.06)';
  const secondaryText = '#B8B8B8';
  const mainBg = '#0F0F0F';
  const borderColor = 'rgba(255, 255, 255, 0.08)';
  const sidebarBg = '#1A1A1A';

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
      {/* Jira-Style Header */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '56px',
        background: bgColor,
        borderBottom: `1px solid ${borderColor}`,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: '12px'
      }}>
        {/* Left: Logo + Menu Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={toggleSidebar} style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '6px', color: secondaryText, transition: 'all 0.2s' }} onMouseEnter={(e) => { e.target.style.backgroundColor = hoverBg; e.target.style.color = textColor; }} onMouseLeave={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.color = secondaryText; }}>
            <Bars3Icon style={{ width: '20px', height: '20px' }} />
          </button>
          <h1 style={{ fontSize: '16px', fontWeight: 600, color: textColor, margin: 0 }}>{getPageTitle()}</h1>
        </div>

        {/* Right: Actions */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Search />
          <Link to="/messages" style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: secondaryText, borderRadius: '6px', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.target.style.backgroundColor = hoverBg; e.target.style.color = textColor; }} onMouseLeave={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.color = secondaryText; }}>
            <InboxIcon style={{ width: '20px', height: '20px' }} />
          </Link>
          <NotificationBell />
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowProfileMenu(!showProfileMenu)} style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', border: 'none', cursor: 'pointer', padding: 0 }}>
              <AvatarDisplay avatar={user?.avatar} fullName={user?.full_name} />
            </button>
            {showProfileMenu && (
              <div style={{ position: 'absolute', right: 0, marginTop: '8px', width: '200px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.3)', zIndex: 10, overflow: 'hidden' }}>
                <Link to="/profile" onClick={() => setShowProfileMenu(false)} style={{ display: 'block', padding: '12px 16px', fontSize: '14px', color: textColor, textDecoration: 'none', transition: 'background 0.2s' }} onMouseEnter={(e) => e.target.style.backgroundColor = hoverBg} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>Profile</Link>
                <Link to="/settings" onClick={() => setShowProfileMenu(false)} style={{ display: 'block', padding: '12px 16px', fontSize: '14px', color: textColor, textDecoration: 'none', transition: 'background 0.2s' }} onMouseEnter={(e) => e.target.style.backgroundColor = hoverBg} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>Settings</Link>
                <button onClick={logout} style={{ width: '100%', textAlign: 'left', padding: '12px 16px', fontSize: '14px', color: textColor, border: 'none', backgroundColor: 'transparent', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={(e) => e.target.style.backgroundColor = hoverBg} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>Sign out</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Jira-Style Sidebar */}
      <aside style={{
        position: 'fixed',
        top: '56px',
        left: 0,
        bottom: 0,
        width: sidebarCollapsed ? '64px' : '240px',
        background: bgColor,
        borderRight: `1px solid ${borderColor}`,
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease',
        overflowX: 'hidden'
      }}>
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
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
                      gap: '12px',
                      padding: sidebarCollapsed ? '10px' : '10px 12px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: isActive ? 600 : 500,
                      textDecoration: 'none',
                      color: isActive ? accentColor : secondaryText,
                      backgroundColor: isActive ? hoverBg : 'transparent',
                      transition: 'all 0.15s',
                      justifyContent: sidebarCollapsed ? 'center' : 'flex-start'
                    }}
                    onMouseEnter={(e) => { if (!isActive) { e.target.style.backgroundColor = hoverBg; e.target.style.color = textColor; } }}
                    onMouseLeave={(e) => { if (!isActive) { e.target.style.backgroundColor = 'transparent'; e.target.style.color = secondaryText; } }}
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
        paddingTop: '56px',
        paddingLeft: sidebarCollapsed ? '64px' : '240px',
        transition: 'padding-left 0.2s ease',
        backgroundColor: mainBg,
        flex: 1,
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
