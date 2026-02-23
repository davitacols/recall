import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline';

export default function Breadcrumbs({ darkMode, items }) {
  const location = useLocation();
  const textColor = darkMode ? '#e7e5e4' : '#111827';
  const secondaryText = darkMode ? '#a8a29e' : '#6b7280';
  const hoverColor = darkMode ? '#d6d3d1' : '#374151';

  // Auto-generate breadcrumbs from path if items not provided
  const breadcrumbs = items || location.pathname
    .split('/')
    .filter(Boolean)
    .map((segment, idx, arr) => ({
      name: segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '),
      href: '/' + arr.slice(0, idx + 1).join('/')
    }));

  if (breadcrumbs.length === 0) return null;

  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '13px',
      padding: '12px 0',
      color: secondaryText
    }}>
      <Link
        to="/"
        style={{
          display: 'flex',
          alignItems: 'center',
          color: secondaryText,
          textDecoration: 'none',
          transition: 'color 0.15s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = hoverColor}
        onMouseLeave={(e) => e.currentTarget.style.color = secondaryText}
      >
        <HomeIcon style={{ width: '14px', height: '14px' }} />
      </Link>
      
      {breadcrumbs.map((crumb, idx) => (
        <React.Fragment key={crumb.href}>
          <ChevronRightIcon style={{ width: '12px', height: '12px', color: secondaryText }} />
          {idx === breadcrumbs.length - 1 ? (
            <span style={{ color: textColor, fontWeight: 500 }}>{crumb.name}</span>
          ) : (
            <Link
              to={crumb.href}
              style={{
                color: secondaryText,
                textDecoration: 'none',
                transition: 'color 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = hoverColor}
              onMouseLeave={(e) => e.currentTarget.style.color = secondaryText}
            >
              {crumb.name}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
