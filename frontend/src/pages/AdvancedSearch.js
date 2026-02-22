import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../utils/ThemeAndAccessibility';
import api from '../services/api';
import { useToast } from '../components/Toast';

export default function AdvancedSearch() {
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const { addToast } = useToast();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ type: 'all', dateFrom: '', dateTo: '' });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const bgColor = darkMode ? '#1c1917' : '#ffffff';
  const textColor = darkMode ? '#e7e5e4' : '#111827';
  const borderColor = darkMode ? '#292524' : '#e5e7eb';
  const secondaryText = darkMode ? '#a8a29e' : '#6b7280';

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const endpoints = filters.type === 'all' 
        ? ['/api/conversations/', '/api/decisions/', '/api/knowledge/', '/api/business/goals/', '/api/business/meetings/']
        : [`/api/${filters.type}/`];
      
      const responses = await Promise.all(endpoints.map(ep => api.get(`${ep}?search=${query}`).catch(() => ({ data: [] }))));
      const combined = responses.flatMap((r, i) => (r.data.results || r.data || []).map(item => ({ ...item, _type: filters.type === 'all' ? ['conversations', 'decisions', 'knowledge', 'goals', 'meetings'][i] : filters.type })));
      setResults(combined);
    } catch (error) {
      addToast('Search failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const navigate_to = (item) => {
    const routes = { conversations: `/conversations/${item.id}`, decisions: `/decisions/${item.id}`, knowledge: `/knowledge/${item.id}`, goals: `/business/goals/${item.id}`, meetings: `/business/meetings/${item.id}` };
    navigate(routes[item._type] || '/');
  };

  return (
    <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 600, color: textColor, marginBottom: '24px' }}>Advanced Search</h1>
      
      <div style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <MagnifyingGlassIcon style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: secondaryText }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && search()}
              placeholder="Search across all modules..."
              style={{ width: '100%', paddingLeft: '38px', padding: '10px 12px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px', color: textColor, fontSize: '14px', outline: 'none' }}
            />
          </div>
          <button onClick={search} disabled={loading} style={{ padding: '10px 20px', backgroundColor: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: '5px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} style={{ padding: '8px 12px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px', color: textColor, fontSize: '13px', outline: 'none' }}>
            <option value="all">All Types</option>
            <option value="conversations">Conversations</option>
            <option value="decisions">Decisions</option>
            <option value="knowledge">Knowledge</option>
            <option value="goals">Goals</option>
            <option value="meetings">Meetings</option>
          </select>
          <input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} style={{ padding: '8px 12px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px', color: textColor, fontSize: '13px', outline: 'none' }} />
          <input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} style={{ padding: '8px 12px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px', color: textColor, fontSize: '13px', outline: 'none' }} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {results.map((item, i) => (
          <div key={i} onClick={() => navigate_to(item)} style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '16px', cursor: 'pointer', transition: 'all 0.15s' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = '#3b82f6'} onMouseLeave={(e) => e.currentTarget.style.borderColor = borderColor}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ padding: '2px 8px', fontSize: '11px', fontWeight: 600, backgroundColor: '#3b82f6', color: '#ffffff', borderRadius: '3px', textTransform: 'capitalize' }}>{item._type}</span>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: textColor }}>{item.title || item.question || 'Untitled'}</h3>
            </div>
            <p style={{ fontSize: '13px', color: secondaryText }}>{(item.content || item.description || '').substring(0, 150)}...</p>
          </div>
        ))}
      </div>
      
      {results.length === 0 && query && !loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: secondaryText }}>No results found</div>
      )}
    </div>
  );
}
