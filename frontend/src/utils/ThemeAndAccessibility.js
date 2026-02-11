import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true;
  });

  useEffect(() => {
    const theme = darkMode ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

// Accessibility utilities
export const AccessibilityUtils = {
  // ARIA labels
  getAriaLabel: (text, context) => `${text}${context ? ` - ${context}` : ''}`,
  
  // Keyboard navigation
  handleKeyDown: (e, callbacks) => {
    const keyMap = {
      'Enter': callbacks.onEnter,
      'Escape': callbacks.onEscape,
      'ArrowUp': callbacks.onArrowUp,
      'ArrowDown': callbacks.onArrowDown,
    };
    
    if (keyMap[e.key]) {
      e.preventDefault();
      keyMap[e.key]();
    }
  },
  
  // Focus management
  setFocus: (elementId) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.focus();
    }
  },
  
  // Announce to screen readers
  announce: (message, priority = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    document.body.appendChild(announcement);
    
    setTimeout(() => announcement.remove(), 1000);
  },
};

// Responsive utilities
export const ResponsiveUtils = {
  isMobile: () => window.innerWidth < 768,
  isTablet: () => window.innerWidth >= 768 && window.innerWidth < 1024,
  isDesktop: () => window.innerWidth >= 1024,
  
  useResponsive: () => {
    const [size, setSize] = useState({
      isMobile: ResponsiveUtils.isMobile(),
      isTablet: ResponsiveUtils.isTablet(),
      isDesktop: ResponsiveUtils.isDesktop(),
    });

    useEffect(() => {
      const handleResize = () => {
        setSize({
          isMobile: ResponsiveUtils.isMobile(),
          isTablet: ResponsiveUtils.isTablet(),
          isDesktop: ResponsiveUtils.isDesktop(),
        });
      };

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);

    return size;
  },
};

// PWA utilities
export const PWAUtils = {
  registerServiceWorker: async () => {
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/service-worker.js');
        console.log('Service Worker registered');
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  },
  
  requestNotificationPermission: async () => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        return true;
      }
      if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }
    }
    return false;
  },
  
  sendNotification: (title, options = {}) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, options);
    }
  },
};
