import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import NotificationBell from './NotificationBell';
import { 
  HomeIcon,
  DocumentTextIcon,
  BookOpenIcon,
  SparklesIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon,
  ChatBubbleLeftIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';

function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/knowledge?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const navigation = [
    { name: 'Home', href: '/', icon: HomeIcon },
    { name: 'Conversations', href: '/conversations', icon: ChatBubbleLeftIcon },
    { name: 'Decisions', href: '/decisions', icon: DocumentTextIcon },
    { name: 'Knowledge', href: '/knowledge', icon: BookOpenIcon },
    { name: 'Ask Recall', href: '/ask', icon: SparklesIcon },
    { name: 'Insights', href: '/insights', icon: ChartBarIcon },
  ];

  const adminNavigation = user?.role === 'admin' ? [
    { name: 'Settings', href: '/settings', icon: Cog6ToothIcon }
  ] : [];

  return (
    <div className="min-h-screen bg-[#fafbfc]">
      {/* Top Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 h-16 md:h-20 flex items-center justify-between">
          {/* Left: Mobile Menu + Logo + Org */}
          <div className="flex items-center space-x-2 md:space-x-6">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-gray-900"
            >
              {mobileMenuOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
            </button>
            <Link to="/" className="flex items-center space-x-2 md:space-x-3 group">
              {user?.organization_logo ? (
                <img src={user.organization_logo} alt={user.organization_name} className="w-8 md:w-10 h-8 md:h-10 object-contain" />
              ) : (
                <div className="w-8 md:w-10 h-8 md:h-10 bg-gray-900 flex items-center justify-center" style={{ backgroundColor: user?.organization_color || '#000000' }}>
                  <span className="text-white font-bold text-lg md:text-xl">R</span>
                </div>
              )}
              <span className="text-xl md:text-2xl font-bold text-gray-900">RECALL</span>
            </Link>
            <span className="text-gray-300 hidden md:inline">|</span>
            <span className="text-sm md:text-base text-gray-900 font-medium hidden md:inline">{user?.organization_name || ''}</span>
          </div>
          
          {/* Center: Search */}
          <div className="flex-1 max-w-2xl mx-4 md:mx-12 hidden sm:block">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-5 md:w-6 h-5 md:h-6 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 md:pl-12 pr-4 py-2 md:py-3 bg-gray-50 border border-gray-300 text-sm md:text-base focus:bg-white focus:border-gray-900 focus:outline-none transition-all"
                />
              </div>
            </form>
          </div>

          {/* Right: Profile */}
          <div className="flex items-center space-x-2 md:space-x-4">
            <NotificationBell />
            <div className="relative group">
              <Link to="/profile" className="w-9 md:w-11 h-9 md:h-11 rounded-full overflow-hidden hover:shadow-md transition-all block">
                {user?.profile_image ? (
                  <img src={user.profile_image} alt={user.full_name || user.username} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                    <span className="text-white font-bold text-sm md:text-base">
                      {(user?.full_name || user?.username)?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </Link>
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <Link to="/profile" className="block px-4 py-3 text-base text-gray-900 hover:bg-gray-100">Profile</Link>
                <button onClick={logout} className="w-full text-left px-4 py-3 text-base text-gray-900 hover:bg-gray-100">Logout</button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setMobileMenuOpen(false)} />
            <aside className="fixed top-16 left-0 bottom-0 w-72 bg-white border-r border-gray-200 overflow-y-auto z-50">
              <nav className="p-6 space-y-2">
                {[...navigation, ...adminNavigation].map((item) => {
                  const isActive = location.pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center space-x-4 px-4 py-4 text-base font-medium transition-all ${
                        isActive
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </aside>
          </div>
        )}

        {/* Desktop Sidebar */}
        <aside className={`${sidebarOpen ? 'w-72' : 'w-0'} bg-white border-r border-gray-200 h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)] sticky top-16 md:top-20 overflow-hidden transition-all duration-300 hidden lg:block`}>
          <nav className="p-6 space-y-2 w-72">
            {[...navigation, ...adminNavigation].map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center space-x-4 px-4 py-4 text-base font-medium transition-all ${
                    isActive
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className={`flex-1 px-4 md:px-8 py-6 md:py-8 transition-all duration-300`}>
          {/* Toggle Button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="mb-6 bg-white border border-gray-200 rounded-lg p-2.5 hover:bg-gray-50 hover:shadow-md transition-all shadow-sm hidden lg:block"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {sidebarOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;
