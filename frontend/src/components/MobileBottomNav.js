import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HomeIcon, ChatBubbleLeftIcon, BellIcon, UserIcon } from '@heroicons/react/24/outline';
import { HomeIcon as HomeIconSolid, ChatBubbleLeftIcon as ChatIconSolid, BellIcon as BellIconSolid, UserIcon as UserIconSolid } from '@heroicons/react/24/solid';

function MobileBottomNav() {
  const location = useLocation();

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <nav className="mobile-bottom-nav md:hidden">
      <Link to="/" className={`mobile-bottom-nav-item ${isActive('/') && location.pathname === '/' ? 'active' : ''}`}>
        {isActive('/') && location.pathname === '/' ? <HomeIconSolid /> : <HomeIcon />}
        <span>Home</span>
      </Link>
      
      <Link to="/conversations" className={`mobile-bottom-nav-item ${isActive('/conversations') ? 'active' : ''}`}>
        {isActive('/conversations') ? <ChatIconSolid /> : <ChatBubbleLeftIcon />}
        <span>Conversations</span>
      </Link>
      
      <Link to="/notifications" className={`mobile-bottom-nav-item ${isActive('/notifications') ? 'active' : ''}`}>
        {isActive('/notifications') ? <BellIconSolid /> : <BellIcon />}
        <span>Notifications</span>
      </Link>
      
      <Link to="/profile" className={`mobile-bottom-nav-item ${isActive('/profile') ? 'active' : ''}`}>
        {isActive('/profile') ? <UserIconSolid /> : <UserIcon />}
        <span>Profile</span>
      </Link>
    </nav>
  );
}

export default MobileBottomNav;
