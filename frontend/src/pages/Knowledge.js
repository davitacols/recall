import React, { useState } from 'react';
import { MagnifyingGlassIcon, ChartBarIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { useTheme } from '../utils/ThemeAndAccessibility';
import api from '../services/api';
import BM25 from '../utils/bm25';

function Knowledge() {
  const { darkMode } = useTheme();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [stats, setStats] = useState({ total_items: 0, this_week: 0, total_searches: 0 });

  React.useEffect(() => {
    fetchStats();
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) {
      setQuery(q);
      performSearch(q);
    }
  }, []);

  React.useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const performSearch = async (searchQuery) => {
    setLoading(true);
    try {
      const response = await api.post('/api/knowledge/search/', { query: searchQuery });
      const data = response.data.data || response.data.results || response.data || [];
      const apiResults = Array.isArray(data) ? data : [];

      if (apiResults.length > 0) {
        const documents = apiResults.map(r => ({
          id: r.id,
          title: r.title,
          text: `${r.title} ${r.content_preview || r.content || ''}`,
          ...r
        }));

        const bm25 = new BM25(documents);
        const rankedResults = bm25.search(searchQuery);
        setResults(rankedResults.map(r => ({ ...r.doc, bm25_score: r.score })));
      } else {
        setResults([]);
      }
      setHasSearched(true);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    performSearch(query);
  };

  const suggestedQueries = [
    'architecture decisions',
    'API design',
    'database choices',
    'performance issues',
    'security updates'
  ];

  const fetchStats = async () => {
    try {
      const response = await api.get('/api/knowledge/stats/');
      const data = response.data.data || response.data || {};
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const bgColor = darkMode ? '#1c1917' : '#ffffff';
  const textColor = darkMode ? '#e7e5e4' : '#111827';
  const borderColor = darkMode ? '#292524' : '#e5e7eb';
  const hoverBg = darkMode ? '#292524' : '#f3f4f6';
  const secondaryText = darkMode ? '#a8a29e' : '#6b7280';
  const mainBg = darkMode ? '#0c0a09' : '#f9fafb';

  return (
    <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: isMobile ? '12px' : 0 }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: textColor, marginBottom: '4px', letterSpacing: '-0.01em' }}>Knowledge</h1>
          <p style={{ fontSize: '14px', color: secondaryText }}>Search through your organization's collective memory</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', width: isMobile ? '100%' : 'auto' }}>
          <Link to="/knowledge/graph" style={{ padding: '8px 14px', border: `2px solid ${borderColor}`, borderRadius: '5px', backgroundColor: 'transparent', color: textColor, fontSize: '13px', fontWeight: 500, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.15s', flex: isMobile ? 1 : 'initial' }}>
            <DocumentTextIcon style={{ width: '16px', height: '16px' }} />
            Graph
          </Link>
          <Link to="/knowledge/analytics" style={{ padding: '8px 14px', border: `2px solid ${borderColor}`, borderRadius: '5px', backgroundColor: 'transparent', color: textColor, fontSize: '13px', fontWeight: 500, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.15s', flex: isMobile ? 1 : 'initial' }}>
            <ChartBarIcon style={{ width: '16px', height: '16px' }} />
            Analytics
          </Link>
        </div>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} style={{ marginBottom: '24px' }}>
        <div style={{ position: 'relative', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '10px' : 0 }}>
          <MagnifyingGlassIcon style={{ position: 'absolute', left: '12px', top: isMobile ? '17px' : '50%', transform: isMobile ? 'none' : 'translateY(-50%)', width: '16px', height: '16px', color: secondaryText }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for anything..."
            style={{ width: '100%', paddingLeft: '38px', paddingRight: isMobile ? '12px' : '100px', paddingTop: '10px', paddingBottom: '10px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px', color: textColor, fontSize: '14px', outline: 'none', transition: 'all 0.15s' }}
            onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
            onBlur={(e) => e.currentTarget.style.borderColor = borderColor}
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            style={{ position: isMobile ? 'relative' : 'absolute', right: isMobile ? 'auto' : '4px', top: isMobile ? 'auto' : '50%', transform: isMobile ? 'none' : 'translateY(-50%)', width: isMobile ? '100%' : 'auto', padding: '8px 14px', backgroundColor: 'transparent', border: '2px solid #3b82f6', color: '#3b82f6', borderRadius: '4px', fontWeight: 500, fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s', opacity: (loading || !query.trim()) ? 0.5 : 1 }}
            onMouseEnter={(e) => { if (!loading && query.trim()) { e.currentTarget.style.backgroundColor = '#3b82f6'; e.currentTarget.style.color = '#ffffff'; } }}
            onMouseLeave={(e) => { if (!loading && query.trim()) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#3b82f6'; } }}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {/* Suggested Queries */}
      {!hasSearched && (
        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '11px', fontWeight: 600, color: secondaryText, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '10px' }}>Try searching for:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {suggestedQueries.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => {
                  setQuery(suggestion);
                  performSearch(suggestion);
                }}
                style={{ padding: '6px 12px', border: `2px solid ${borderColor}`, borderRadius: '4px', backgroundColor: 'transparent', color: textColor, fontSize: '12px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.backgroundColor = hoverBg; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = borderColor; e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      {!hasSearched && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
          <div style={{ border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '16px', backgroundColor: bgColor }}>
            <p style={{ fontSize: '11px', color: secondaryText, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '6px' }}>Searchable Items</p>
            <p style={{ fontSize: '24px', fontWeight: 600, color: textColor }}>{stats.total_items}</p>
          </div>
          <div style={{ border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '16px', backgroundColor: bgColor }}>
            <p style={{ fontSize: '11px', color: secondaryText, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '6px' }}>This Week</p>
            <p style={{ fontSize: '24px', fontWeight: 600, color: textColor }}>{stats.this_week}</p>
          </div>
          <div style={{ border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '16px', backgroundColor: bgColor }}>
            <p style={{ fontSize: '11px', color: secondaryText, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '6px' }}>Total Searches</p>
            <p style={{ fontSize: '24px', fontWeight: 600, color: textColor }}>{stats.total_searches}</p>
          </div>
        </div>
      )}

      {/* Search Results */}
      {hasSearched && (
        <div>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: isMobile ? '10px' : 0, marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: textColor }}>
              {results.length} {results.length === 1 ? 'Result' : 'Results'}
            </h2>
            <button
              onClick={() => {
                setQuery('');
                setResults([]);
                setHasSearched(false);
              }}
              style={{ padding: '7px 12px', border: `2px solid ${borderColor}`, borderRadius: '5px', backgroundColor: 'transparent', color: textColor, fontSize: '13px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s', width: isMobile ? '100%' : 'auto' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.backgroundColor = hoverBg; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = borderColor; e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              New Search
            </button>
          </div>
          
          {results.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', border: `1px solid ${borderColor}`, borderRadius: '5px', backgroundColor: bgColor }}>
              <MagnifyingGlassIcon style={{ width: '48px', height: '48px', color: borderColor, margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: textColor, marginBottom: '6px' }}>No results found</h3>
              <p style={{ fontSize: '13px', color: secondaryText }}>Try different keywords or browse suggestions above</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {results.map((result, index) => (
                <div key={index} style={{ border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '16px', backgroundColor: bgColor, cursor: 'pointer', transition: 'all 0.15s' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.backgroundColor = '#1f2937'; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = borderColor; e.currentTarget.style.backgroundColor = bgColor; }}>
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                    <span style={{ padding: '3px 8px', backgroundColor: hoverBg, border: `1px solid ${borderColor}`, borderRadius: '3px', color: textColor, fontSize: '11px', fontWeight: 600, textTransform: 'capitalize' }}>
                      {result.content_type}
                    </span>
                    {result.bm25_score && (
                      <span style={{ padding: '3px 8px', border: `1px solid ${borderColor}`, borderRadius: '3px', backgroundColor: bgColor, color: secondaryText, fontSize: '11px', fontWeight: 600 }}>
                        Score: {result.bm25_score.toFixed(2)}
                      </span>
                    )}
                    {result.relevance_score && (
                      <span style={{ padding: '3px 8px', border: `1px solid ${borderColor}`, borderRadius: '3px', backgroundColor: bgColor, color: secondaryText, fontSize: '11px', fontWeight: 600 }}>
                        {Math.round(result.relevance_score * 100)}% match
                      </span>
                    )}
                  </div>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: textColor, marginBottom: '6px' }}>
                    {result.title}
                  </h3>
                  <p style={{ fontSize: '13px', color: secondaryText, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {result.content_preview || result.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Knowledge;
