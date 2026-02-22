import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../utils/ThemeAndAccessibility';
import { MagnifyingGlassIcon, DocumentTextIcon, ChatBubbleLeftIcon, LightBulbIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

export default function KnowledgeBase() {
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [stats, setStats] = useState(null);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(false);

  const bgColor = darkMode ? '#1c1917' : '#ffffff';
  const textColor = darkMode ? '#e7e5e4' : '#111827';
  const borderColor = darkMode ? '#292524' : '#e5e7eb';
  const cardBg = darkMode ? '#0c0a09' : '#ffffff';
  const secondaryText = darkMode ? '#a8a29e' : '#6b7280';

  useEffect(() => {
    fetchStats();
    fetchTrending();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get('/api/knowledge/stats/');
      setStats(res.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchTrending = async () => {
    try {
      const res = await api.get('/api/knowledge/trending/');
      setTrending(res.data);
    } catch (error) {
      console.error('Failed to fetch trending:', error);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const res = await api.post('/api/knowledge/search/', { query: searchQuery });
      setResults(res.data.results || []);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, color: textColor, marginBottom: '8px' }}>Knowledge Base</h1>
        <p style={{ fontSize: '15px', color: secondaryText }}>Search conversations, decisions, and organizational knowledge</p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} style={{ marginBottom: '32px' }}>
        <div style={{ position: 'relative' }}>
          <MagnifyingGlassIcon style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: secondaryText }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search knowledge base..."
            style={{
              width: '100%',
              padding: '16px 16px 16px 48px',
              fontSize: '16px',
              border: `2px solid ${borderColor}`,
              borderRadius: '12px',
              backgroundColor: bgColor,
              color: textColor,
              outline: 'none'
            }}
            onFocus={(e) => e.target.style.borderColor = '#667eea'}
            onBlur={(e) => e.target.style.borderColor = borderColor}
          />
        </div>
      </form>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          <div style={{ padding: '20px', backgroundColor: cardBg, border: `1px solid ${borderColor}`, borderRadius: '12px' }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: textColor }}>{stats.total_items}</div>
            <div style={{ fontSize: '13px', color: secondaryText, marginTop: '4px' }}>Total Items</div>
          </div>
          <div style={{ padding: '20px', backgroundColor: cardBg, border: `1px solid ${borderColor}`, borderRadius: '12px' }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#10b981' }}>{stats.this_week}</div>
            <div style={{ fontSize: '13px', color: secondaryText, marginTop: '4px' }}>This Week</div>
          </div>
          <div style={{ padding: '20px', backgroundColor: cardBg, border: `1px solid ${borderColor}`, borderRadius: '12px' }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#3b82f6' }}>{stats.total_searches}</div>
            <div style={{ fontSize: '13px', color: secondaryText, marginTop: '4px' }}>Searches</div>
          </div>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: secondaryText }}>Searching...</div>
      ) : results.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {results.map((result, idx) => (
            <div
              key={idx}
              onClick={() => navigate(result.type === 'conversation' ? `/conversations/${result.id}` : `/decisions/${result.id}`)}
              style={{
                padding: '24px',
                backgroundColor: cardBg,
                border: `1px solid ${borderColor}`,
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#667eea';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = borderColor;
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                {result.type === 'conversation' ? (
                  <ChatBubbleLeftIcon style={{ width: '18px', height: '18px', color: '#3b82f6' }} />
                ) : (
                  <LightBulbIcon style={{ width: '18px', height: '18px', color: '#f59e0b' }} />
                )}
                <span style={{ fontSize: '12px', fontWeight: 600, color: secondaryText, textTransform: 'uppercase' }}>
                  {result.type}
                </span>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: textColor, marginBottom: '8px' }}>
                {result.title}
              </h3>
              <p style={{ fontSize: '14px', color: secondaryText, lineHeight: '1.6' }}>
                {result.summary || result.content}
              </p>
            </div>
          ))}
        </div>
      ) : searchQuery ? (
        <div style={{ textAlign: 'center', padding: '60px', color: secondaryText }}>
          <DocumentTextIcon style={{ width: '48px', height: '48px', margin: '0 auto 16px', color: borderColor }} />
          <p>No results found for "{searchQuery}"</p>
        </div>
      ) : (
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: textColor, marginBottom: '16px' }}>Trending Topics</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {trending.map((topic, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSearchQuery(topic.topic);
                  handleSearch({ preventDefault: () => {} });
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: darkMode ? '#312e81' : '#e0e7ff',
                  color: darkMode ? '#a5b4fc' : '#3730a3',
                  border: 'none',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                {topic.topic} ({topic.count})
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
