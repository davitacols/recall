import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  HomeIcon, 
  ChatBubbleLeftIcon, 
  DocumentTextIcon, 
  ListBulletIcon,
  Bars3Icon,
  XMarkIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

export const MobileNav = ({ onSearchOpen }) => {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { path: '/dashboard', icon: HomeIcon, label: 'Home' },
    { path: '/conversations', icon: ChatBubbleLeftIcon, label: 'Conversations' },
    { path: '/decisions', icon: DocumentTextIcon, label: 'Decisions' },
    { path: '/sprint', icon: ListBulletIcon, label: 'Sprint' },
  ];

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <>
      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center flex-1 h-full ${
                  isActive(item.path) ? 'text-purple-600' : 'text-gray-600'
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs mt-1">{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={onSearchOpen}
            className="flex flex-col items-center justify-center flex-1 h-full text-gray-600"
          >
            <MagnifyingGlassIcon className="w-6 h-6" />
            <span className="text-xs mt-1">Search</span>
          </button>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-40">
        <div className="flex items-center justify-between h-14 px-4">
          <h1 className="text-xl font-bold text-gray-900">Knoledgr</h1>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 text-gray-600"
          >
            {menuOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setMenuOpen(false)}>
          <div className="absolute right-0 top-0 bottom-0 w-64 bg-white p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold">Menu</h2>
              <button onClick={() => setMenuOpen(false)}>
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <nav className="space-y-2">
              <Link to="/profile" className="block px-4 py-3 rounded-lg hover:bg-gray-100">Profile</Link>
              <Link to="/settings" className="block px-4 py-3 rounded-lg hover:bg-gray-100">Settings</Link>
              <Link to="/projects" className="block px-4 py-3 rounded-lg hover:bg-gray-100">Projects</Link>
              <Link to="/integrations" className="block px-4 py-3 rounded-lg hover:bg-gray-100">Integrations</Link>
            </nav>
          </div>
        </div>
      )}

      {/* Spacer for fixed elements */}
      <div className="md:hidden h-14"></div>
      <div className="md:hidden h-16"></div>
    </>
  );
};

export const MobileOptimized = ({ children }) => {
  return (
    <div className="min-h-screen pb-16 md:pb-0">
      {children}
    </div>
  );
};
