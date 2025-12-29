import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import NotificationBell from './NotificationBell';
import MobileBottomNav from './MobileBottomNav';
import '../styles/mobile.css';
import { 
  HomeIcon,
  ChatBubbleLeftIcon,
  DocumentTextIcon,
  BookOpenIcon,
  BellIcon,
  BookmarkIcon,
  DocumentDuplicateIcon,
  FolderIcon,
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

  const secondaryNav = [
    { name: 'Bookmarks', href: '/bookmarks', icon: BookmarkIcon },
    { name: 'Drafts', href: '/drafts', icon: DocumentDuplicateIcon },
    { name: 'Files', href: '/files', icon: FolderIcon },
  ];

  const getPageTitle = () => {
    if (location.pathname === '/') return 'Home';
    if (location.pathname.startsWith('/conversations')) return 'Conversations';
    if (location.pathname.startsWith('/decisions')) return 'Decisions';
    if (location.pathname.startsWith('/knowledge')) return 'Knowledge';
    if (location.pathname.startsWith('/notifications')) return 'Notifications';
    return 'Recall';
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-50">
        <div className="h-full flex items-center justify-between px-4">
          {/* Left: Toggle + Page Title */}
          <div className="flex items-center gap-4">
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-2">
              {mobileMenuOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
            </button>
            <button onClick={toggleSidebar} className="hidden lg:block p-2">
              <Bars3Icon className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">{getPageTitle()}</h1>
          </div>

          {/* Center: Search */}
          <div className="hidden md:block flex-1 max-w-md mx-8">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search conversations, decisions, or tags"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-12 py-2 border border-gray-300 text-sm focus:border-gray-900 focus:outline-none"
                />
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">⌘K</kbd>
              </div>
            </form>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            <NotificationBell />
            
            <div className="relative">
              <button
                onClick={() => setShowNewMenu(!showNewMenu)}
                className="px-4 py-2 bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                New
              </button>
              {showNewMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 shadow-lg">
                  <Link
                    to="/conversations/new"
                    onClick={() => setShowNewMenu(false)}
                    className="block px-4 py-3 text-sm text-gray-900 hover:bg-gray-100"
                  >
                    New conversation
                  </Link>
                  <Link
                    to="/decisions/new"
                    onClick={() => setShowNewMenu(false)}
                    className="block px-4 py-3 text-sm text-gray-900 hover:bg-gray-100"
                  >
                    New decision
                  </Link>
                </div>
              )}
            </div>

            <div className="relative">
              <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="w-8 h-8 rounded-full overflow-hidden">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.full_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                    <span className="text-white text-sm font-bold">{user?.full_name?.charAt(0) || 'U'}</span>
                  </div>
                )}
              </button>
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 shadow-lg">
                  <Link to="/profile" onClick={() => setShowProfileMenu(false)} className="block px-4 py-3 text-sm text-gray-900 hover:bg-gray-100">Profile</Link>
                  <Link to="/settings" onClick={() => setShowProfileMenu(false)} className="block px-4 py-3 text-sm text-gray-900 hover:bg-gray-100">Settings</Link>
                  <button onClick={logout} className="w-full text-left px-4 py-3 text-sm text-gray-900 hover:bg-gray-100">Sign out</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setMobileMenuOpen(false)} />
          <aside className="fixed top-16 left-0 bottom-0 w-64 bg-white border-r border-gray-200 overflow-y-auto">
            <nav className="p-4">
              {primaryNav.map((item) => {
                const isActive = location.pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors ${
                      isActive ? 'bg-gray-900 text-white' : 'text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className={`fixed top-16 left-0 bottom-0 ${
        sidebarCollapsed ? 'w-20' : 'w-64'
      } bg-white border-r border-gray-200 hidden lg:block transition-all duration-200 overflow-y-auto`}>
        <div className="h-full flex flex-col">
          {/* Org Switcher */}
          <div className="p-4 border-b border-gray-200">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-3 p-2">
                {user?.organization_logo ? (
                  <img src={user.organization_logo} alt="" className="w-8 h-8 object-contain" />
                ) : (
                  <div className="w-8 h-8 bg-gray-900 flex items-center justify-center">
                    <span className="text-white text-sm font-bold">R</span>
                  </div>
                )}
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium text-gray-900 truncate">{user?.organization_name}</div>
                </div>
              </div>
            )}
            {sidebarCollapsed && (
              <div className="flex justify-center">
                {user?.organization_logo ? (
                  <img src={user.organization_logo} alt="" className="w-8 h-8 object-contain" />
                ) : (
                  <div className="w-8 h-8 bg-gray-900 flex items-center justify-center">
                    <span className="text-white text-sm font-bold">R</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Primary Nav */}
          <nav className="flex-1 p-4 space-y-1">
            {primaryNav.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors relative ${
                    isActive ? 'bg-gray-900 text-white' : 'text-gray-900 hover:bg-gray-100'
                  }`}
                  title={sidebarCollapsed ? item.name : ''}
                >
                  {isActive && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-900" />}
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!sidebarCollapsed && <span>{item.name}</span>}
                </Link>
              );
            })}

            {/* Quick Actions */}
            {!sidebarCollapsed && (
              <div className="pt-4 space-y-2">
                <Link
                  to="/conversations/new"
                  className="block w-full px-3 py-2 text-sm font-medium text-gray-900 border border-gray-900 hover:bg-gray-100 transition-colors text-center"
                >
                  + New conversation
                </Link>
                <Link
                  to="/decisions/new"
                  className="block w-full px-3 py-2 text-sm font-medium text-gray-900 border border-gray-900 hover:bg-gray-100 transition-colors text-center"
                >
                  + New decision
                </Link>
              </div>
            )}

            {/* Secondary Nav */}
            {!sidebarCollapsed && (
              <div className="pt-6 space-y-1">
                {secondaryNav.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className="flex items-center gap-3 px-3 py-2 text-xs text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-gray-200">
            {!sidebarCollapsed ? (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">{user?.full_name?.charAt(0) || 'U'}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{user?.full_name?.split(' ')[0]}</div>
                  <div className="text-xs text-gray-600">{user?.role}</div>
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                <div className="w-8 h-8 rounded-full overflow-hidden">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">{user?.full_name?.charAt(0) || 'U'}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`pt-16 ${
        sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
      } transition-all duration-200 mobile-content-wrapper`}>
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
      
      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}

export default Layout;
