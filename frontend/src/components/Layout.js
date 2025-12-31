import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import NotificationBell from './NotificationBell';
import MobileBottomNav from './MobileBottomNav';
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
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved) setSidebarCollapsed(JSON.parse(saved));
  }, []);

  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/knowledge?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const primaryNav = [
    { name: 'Home', href: '/', icon: HomeIcon },
    { name: 'Conversations', href: '/conversations', icon: ChatBubbleLeftIcon },
    { name: 'Decisions', href: '/decisions', icon: DocumentTextIcon },
    { name: 'Knowledge', href: '/knowledge', icon: BookOpenIcon },
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
    if (location.pathname.startsWith('/notifications')) return 'Notifications';
    if (location.pathname.startsWith('/sprint')) return 'Sprint';
    if (location.pathname.startsWith('/blockers')) return 'Blockers';
    if (location.pathname.startsWith('/retrospectives')) return 'Retrospectives';
    return 'Recall';
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.background }}>
      {/* Header */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '64px',
        backgroundColor: colors.surface,
        borderBottom: `1px solid ${colors.border}`,
        zIndex: 50,
        boxShadow: shadows.sm
      }}>
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `0 ${spacing.lg}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.lg }}>
            <button onClick={toggleSidebar} style={{ display: 'none', padding: spacing.md, background: 'none', border: 'none', cursor: 'pointer' }}>
              <Bars3Icon style={{ width: '20px', height: '20px', color: colors.primary }} />
            </button>
            <h1 style={{ fontSize: '18px', fontWeight: 600, color: colors.primary }}>{getPageTitle()}</h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.lg }}>
            <NotificationBell />
            
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowNewMenu(!showNewMenu)}
                style={{
                  padding: `${spacing.sm} ${spacing.lg}`,
                  backgroundColor: colors.primary,
                  color: colors.surface,
                  fontSize: '14px',
                  fontWeight: 500,
                  border: 'none',
                  borderRadius: radius.md,
                  cursor: 'pointer',
                  transition: motion.fast,
                  boxShadow: shadows.sm
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#1a1f35';
                  e.target.style.boxShadow = shadows.md;
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = colors.primary;
                  e.target.style.boxShadow = shadows.sm;
                }}
              >
                New
              </button>
              {showNewMenu && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  marginTop: spacing.sm,
                  width: '192px',
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radius.lg,
                  boxShadow: shadows.lg,
                  zIndex: 10
                }}>
                  <Link
                    to="/conversations/new"
                    onClick={() => setShowNewMenu(false)}
                    style={{
                      display: 'block',
                      padding: spacing.lg,
                      fontSize: '14px',
                      color: colors.primary,
                      textDecoration: 'none',
                      borderBottom: `1px solid ${colors.border}`,
                      transition: motion.fast
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = colors.background}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    New conversation
                  </Link>
                  <Link
                    to="/decisions/new"
                    onClick={() => setShowNewMenu(false)}
                    style={{
                      display: 'block',
                      padding: spacing.lg,
                      fontSize: '14px',
                      color: colors.primary,
                      textDecoration: 'none',
                      transition: motion.fast
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = colors.background}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    New decision
                  </Link>
                </div>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowProfileMenu(!showProfileMenu)} style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', border: 'none', cursor: 'pointer' }}>
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', backgroundColor: colors.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: colors.surface, fontSize: '14px', fontWeight: 'bold' }}>{user?.full_name?.charAt(0) || 'U'}</span>
                  </div>
                )}
              </button>
              {showProfileMenu && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  marginTop: spacing.sm,
                  width: '192px',
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radius.lg,
                  boxShadow: shadows.lg,
                  zIndex: 10
                }}>
                  <Link to="/profile" onClick={() => setShowProfileMenu(false)} style={{ display: 'block', padding: spacing.lg, fontSize: '14px', color: colors.primary, textDecoration: 'none', borderBottom: `1px solid ${colors.border}`, transition: motion.fast }} onMouseEnter={(e) => e.target.style.backgroundColor = colors.background} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>Profile</Link>
                  <Link to="/settings" onClick={() => setShowProfileMenu(false)} style={{ display: 'block', padding: spacing.lg, fontSize: '14px', color: colors.primary, textDecoration: 'none', borderBottom: `1px solid ${colors.border}`, transition: motion.fast }} onMouseEnter={(e) => e.target.style.backgroundColor = colors.background} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>Settings</Link>
                  <button onClick={logout} style={{ width: '100%', textAlign: 'left', padding: spacing.lg, fontSize: '14px', color: colors.primary, border: 'none', backgroundColor: 'transparent', cursor: 'pointer', transition: motion.fast }} onMouseEnter={(e) => e.target.style.backgroundColor = colors.background} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>Sign out</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside style={{
        position: 'fixed',
        top: '64px',
        left: 0,
        bottom: 0,
        width: sidebarCollapsed ? '80px' : '256px',
        backgroundColor: colors.background,
        borderRight: `1px solid ${colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        transition: motion.normal
      }}>
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <nav style={{ flex: 1, padding: spacing.lg, overflowY: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
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
                      borderRadius: radius.md,
                      fontSize: '14px',
                      fontWeight: 500,
                      textDecoration: 'none',
                      color: isActive ? colors.accent : colors.secondary,
                      backgroundColor: isActive ? colors.accentLight : 'transparent',
                      borderLeft: isActive ? `3px solid ${colors.accent}` : 'none',
                      paddingLeft: isActive ? '13px' : spacing.lg,
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
                    <h3 style={{ fontSize: '12px', fontWeight: 600, color: colors.secondary, textTransform: 'uppercase', letterSpacing: '0.05em', padding: `0 ${spacing.lg}`, marginBottom: spacing.md }}>
                      {section.title}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                      {section.items.map((item) => {
                        const isActive = location.pathname === item.href;
                        return (
                          <Link
                            key={item.name}
                            to={item.href}
                            style={{
                              display: 'block',
                              padding: `${spacing.md} ${spacing.lg}`,
                              borderRadius: radius.md,
                              fontSize: '14px',
                              textDecoration: 'none',
                              color: isActive ? colors.accent : colors.secondary,
                              backgroundColor: isActive ? colors.accentLight : 'transparent',
                              fontWeight: isActive ? 500 : 'normal',
                              transition: motion.fast
                            }}
                          >
                            {item.name}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </>
            )}
          </nav>

          <div style={{ padding: spacing.lg, borderTop: `1px solid ${colors.border}`, flexShrink: 0 }}>
            {!sidebarCollapsed ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                  {user?.avatar ? (
                    <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', backgroundColor: colors.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ color: colors.surface, fontSize: '12px', fontWeight: 'bold' }}>{user?.full_name?.charAt(0) || 'U'}</span>
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: colors.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.full_name?.split(' ')[0]}</div>
                  <div style={{ fontSize: '12px', color: colors.secondary }}>{user?.organization_name}</div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden' }}>
                  {user?.avatar ? (
                    <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', backgroundColor: colors.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ color: colors.surface, fontSize: '12px', fontWeight: 'bold' }}>{user?.full_name?.charAt(0) || 'U'}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{
        paddingTop: '64px',
        paddingLeft: sidebarCollapsed ? '80px' : '256px',
        transition: motion.normal
      }}>
        <div style={{ padding: spacing.xl }}>
          {children}
        </div>
      </main>
      
      <MobileBottomNav />
    </div>
  );
}

export default Layout;
