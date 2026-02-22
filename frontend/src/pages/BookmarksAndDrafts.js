import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookmarkIcon, DocumentIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../utils/ThemeAndAccessibility';
import api from '../services/api';

export default function BookmarksAndDrafts() {
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const [tab, setTab] = useState('bookmarks');
  const [bookmarks, setBookmarks] = useState([]);
  const [drafts, setDrafts] = useState([]);

  const bgColor = darkMode ? '#1c1917' : '#ffffff';
  const textColor = darkMode ? '#e7e5e4' : '#111827';
  const borderColor = darkMode ? '#292524' : '#e5e7eb';
  const secondaryText = darkMode ? '#a8a29e' : '#6b7280';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [bm, dr] = await Promise.all([
        api.get('/api/bookmarks/').catch(() => ({ data: [] })),
        api.get('/api/drafts/').catch(() => ({ data: [] }))
      ]);
      setBookmarks(bm.data);
      setDrafts(dr.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const items = tab === 'bookmarks' ? bookmarks : drafts;

  return (
    <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 600, color: textColor, marginBottom: '24px' }}>Bookmarks & Drafts</h1>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => setTab('bookmarks')} style={{ padding: '8px 16px', backgroundColor: tab === 'bookmarks' ? '#3b82f6' : 'transparent', border: `1px solid ${tab === 'bookmarks' ? '#3b82f6' : borderColor}`, color: tab === 'bookmarks' ? '#ffffff' : textColor, borderRadius: '5px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
          Bookmarks ({bookmarks.length})
        </button>
        <button onClick={() => setTab('drafts')} style={{ padding: '8px 16px', backgroundColor: tab === 'drafts' ? '#3b82f6' : 'transparent', border: `1px solid ${tab === 'drafts' ? '#3b82f6' : borderColor}`, color: tab === 'drafts' ? '#ffffff' : textColor, borderRadius: '5px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
          Drafts ({drafts.length})
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {items.map((item, i) => (
          <div key={i} onClick={() => navigate(item.url || '/')} style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '16px', cursor: 'pointer', transition: 'all 0.15s' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = '#3b82f6'} onMouseLeave={(e) => e.currentTarget.style.borderColor = borderColor}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: textColor, marginBottom: '4px' }}>{item.title}</h3>
            <p style={{ fontSize: '13px', color: secondaryText }}>{item.description || 'No description'}</p>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: secondaryText }}>
          {tab === 'bookmarks' ? <BookmarkIcon style={{ width: '48px', height: '48px', margin: '0 auto 16px', opacity: 0.5 }} /> : <DocumentIcon style={{ width: '48px', height: '48px', margin: '0 auto 16px', opacity: 0.5 }} />}
          <p>No {tab} yet</p>
        </div>
      )}
    </div>
  );
}
