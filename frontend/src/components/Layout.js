import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
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
  InboxIcon
} from '@heroicons/react/24/outline';

function AvatarDisplay({ avatar, fullName }) {
  const initials = fullName?.charAt(0) || 'U';

  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: colors.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: colors.surface, fontSize: '14px', fontWeight: 'bold' }}>{initials}</span>
    </div>
  );
}

function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({ Sprint: true, Personal: true, Admin: true });

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
    <div style={{ minHeight: '100vh', backgroundColor: colors.background }}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-50 shadow-sm">
        <div className="h-full flex items-center justify-between px-8">
          <div className="flex items-center gap-8">
            <button onClick={toggleSidebar} className="p-2 hover:bg-gray-100 transition-all">
              {sidebarCollapsed ? (
                <Bars3Icon className="w-5 h-5 text-gray-900" />
              ) : (
                <XMarkIcon className="w-5 h-5 text-gray-900" />
              )}
            </button>
            <h1 className="text-2xl font-black text-gray-900">{getPageTitle()}</h1>
          </div>

          <div className="flex items-center gap-6">
            <Search />
            <Link to="/messages" className="p-2 text-gray-600 hover:text-gray-900 transition-colors" title="Messages">
              <InboxIcon className="w-6 h-6" />
            </Link>
            <NotificationBell />
            
            <div className="relative">
              <button
                onClick={() => setShowNewMenu(!showNewMenu)}
                className="px-6 py-2 bg-gray-900 text-white hover:bg-black font-bold uppercase text-xs transition-all"
              >
                New
              </button>
              {showNewMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 shadow-lg z-10">
                  <Link
                    to="/conversations/new"
                    onClick={() => setShowNewMenu(false)}
                    className="block px-6 py-3 text-sm text-gray-900 hover:bg-gray-50 border-b border-gray-200 transition-all"
                  >
                    New conversation
                  </Link>
                  <Link
                    to="/decisions/new"
                    onClick={() => setShowNewMenu(false)}
                    className="block px-6 py-3 text-sm text-gray-900 hover:bg-gray-50 border-b border-gray-200 transition-all"
                  >
                    New decision
                  </Link>
                  <Link
                    to="/issues/new"
                    onClick={() => setShowNewMenu(false)}
                    className="block px-6 py-3 text-sm text-gray-900 hover:bg-gray-50 transition-all"
                  >
                    New issue
                  </Link>
                </div>
              )}
            </div>

            <div className="relative">
              <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="w-8 h-8 overflow-hidden border-none cursor-pointer">
                <AvatarDisplay avatar={user?.avatar} fullName={user?.full_name} />
              </button>
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 shadow-lg z-10">
                  <Link to="/profile" onClick={() => setShowProfileMenu(false)} className="block px-6 py-3 text-sm text-gray-900 hover:bg-gray-50 border-b border-gray-200 transition-all">Profile</Link>
                  <Link to="/settings" onClick={() => setShowProfileMenu(false)} className="block px-6 py-3 text-sm text-gray-900 hover:bg-gray-50 border-b border-gray-200 transition-all">Settings</Link>
                  <button onClick={logout} className="w-full text-left px-6 py-3 text-sm text-gray-900 hover:bg-gray-50 border-none bg-transparent cursor-pointer transition-all">Sign out</button>
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
        width: sidebarCollapsed ? '80px' : '320px',
        backgroundColor: colors.surface,
        borderRight: `1px solid ${colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        transition: motion.normal
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
                      color: isActive ? colors.primary : colors.secondary,
                      backgroundColor: isActive ? '#f3f4f6' : 'transparent',
                      borderLeft: isActive ? `4px solid ${colors.primary}` : '4px solid transparent',
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
                        color: colors.secondary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        transition: motion.fast
                      }}
                      onMouseEnter={(e) => e.target.style.color = colors.primary}
                      onMouseLeave={(e) => e.target.style.color = colors.secondary}
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
                                color: isActive ? colors.primary : colors.secondary,
                                backgroundColor: isActive ? '#f3f4f6' : 'transparent',
                                fontWeight: isActive ? 600 : 'normal',
                                borderLeft: isActive ? `4px solid ${colors.primary}` : '4px solid transparent',
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

          <div style={{ padding: spacing.lg, borderTop: `1px solid ${colors.border}`, flexShrink: 0 }}>
            {!sidebarCollapsed ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '0', overflow: 'hidden', flexShrink: 0 }}>
                  <AvatarDisplay avatar={user?.avatar} fullName={user?.full_name} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: colors.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.full_name?.split(' ')[0]}</div>
                  <div style={{ fontSize: '11px', color: colors.secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.organization_name}</div>
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
        paddingTop: '64px',
        paddingLeft: sidebarCollapsed ? '80px' : '320px',
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
