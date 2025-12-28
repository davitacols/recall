import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import NotificationBell from './NotificationBell';
import { 
  HomeIcon,
  ChatBubbleLeftRightIcon, 
  DocumentCheckIcon, 
  MagnifyingGlassIcon,
  Bars3Icon
} from '@heroicons/react/24/outline';

function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [avatar, setAvatar] = useState(null);

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'Conversations', href: '/conversations' },
    { name: 'Decisions', href: '/decisions' },
    { name: 'Knowledge', href: '/knowledge' },
    { name: 'Activity', href: '/activity' },
  ];

  const adminNavigation = user?.role === 'admin' ? [
    { name: 'Settings', href: '/settings' }
  ] : [];

  useEffect(() => {
    const fetchAvatar = async () => {
      try {
        const response = await api.get('/api/auth/profile/');
        setAvatar(response.data.avatar);
      } catch (error) {
        console.error('Failed to fetch avatar:', error);
      }
    };
    if (user) {
      fetchAvatar();
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-300 sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-900 flex items-center justify-center">
                <span className="text-white font-bold text-lg">R</span>
              </div>
              <span className="text-xl font-normal text-gray-900 tracking-tight">RECALL</span>
            </Link>
            
            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {[...navigation, ...adminNavigation].map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`px-4 py-2 text-sm font-normal transition-colors ${
                      isActive
                        ? 'text-gray-900 bg-gray-100'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <NotificationBell />
              <div className="hidden md:flex items-center space-x-3">
                <Link to="/profile" className="w-8 h-8 bg-gray-900 flex items-center justify-center hover:bg-gray-800 transition-colors overflow-hidden">
                  {avatar ? (
                    <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-medium text-xs">
                      {(user?.full_name || user?.username)?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </Link>
                <Link to="/profile" className="text-sm font-normal text-gray-700 hover:text-gray-900 transition-colors">
                  {user?.full_name || user?.username}
                </Link>
                <button onClick={logout} className="text-sm text-gray-600 hover:text-gray-900 font-normal transition-colors">
                  Sign out
                </button>
              </div>
              <button className="md:hidden p-2 hover:bg-gray-100 transition-colors">
                <Bars3Icon className="w-6 h-6 text-gray-700" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-8 py-8">
        {children}
      </main>
    </div>
  );
}

export default Layout;
