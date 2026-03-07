import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../utils/ThemeAndAccessibility';
import api from '../services/api';
import { useToast } from '../components/Toast';
import BrandedTechnicalIllustration from '../components/BrandedTechnicalIllustration';
import { getProjectPalette, getProjectUi } from '../utils/projectUi';

export default function AdvancedSearch() {
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const { addToast } = useToast();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ type: 'all', dateFrom: '', dateTo: '' });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

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
    <div style={{ ...ui.container, display: 'grid', gap: 12, fontFamily: "'Sora', 'Space Grotesk', 'Segoe UI', sans-serif" }}>
      <section
        style={{
          border: `1px solid ${palette.border}`,
          borderRadius: 16,
          padding: 'clamp(16px,2.4vw,24px)',
          background: `linear-gradient(140deg, ${palette.accentSoft}, ${darkMode ? 'rgba(96,165,250,0.14)' : 'rgba(191,219,254,0.4)'})`,
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) auto',
          alignItems: 'end',
          gap: 12,
        }}
      >
        <div style={{ display: 'grid', gap: 6 }}>
          <p style={{ margin: 0, fontSize: 11, letterSpacing: '0.12em', fontWeight: 700, color: palette.muted }}>DISCOVERY</p>
          <h1 style={{ margin: 0, fontSize: 'clamp(1.1rem,2vw,1.56rem)', color: palette.text }}>Advanced Search</h1>
          <p style={{ margin: 0, fontSize: 13, color: palette.muted }}>Find context across conversations, decisions, goals, and meetings.</p>
        </div>
        <BrandedTechnicalIllustration darkMode={darkMode} compact />
      </section>

      <div style={{ backgroundColor: palette.card, border: `1px solid ${palette.border}`, borderRadius: 16, padding: '16px', marginBottom: '2px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <MagnifyingGlassIcon style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: palette.muted }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && search()}
              placeholder="Search across all modules..."
              style={{ ...ui.input, paddingLeft: '36px' }}
            />
          </div>
          <button onClick={search} disabled={loading} style={ui.primaryButton}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} style={{ ...ui.input, width: 'auto', minWidth: 150, padding: '8px 10px', fontSize: 13 }}>
            <option value="all">All Types</option>
            <option value="conversations">Conversations</option>
            <option value="decisions">Decisions</option>
            <option value="knowledge">Knowledge</option>
            <option value="goals">Goals</option>
            <option value="meetings">Meetings</option>
          </select>
          <input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} style={{ ...ui.input, width: 'auto', minWidth: 148, padding: '8px 10px', fontSize: 13 }} />
          <input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} style={{ ...ui.input, width: 'auto', minWidth: 148, padding: '8px 10px', fontSize: 13 }} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {results.map((item, i) => (
          <div key={i} onClick={() => navigate_to(item)} style={{ backgroundColor: palette.card, border: `1px solid ${palette.border}`, borderRadius: '12px', padding: '14px', cursor: 'pointer', transition: 'all 0.15s' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = palette.accent} onMouseLeave={(e) => e.currentTarget.style.borderColor = palette.border}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ padding: '2px 8px', fontSize: '11px', fontWeight: 700, backgroundColor: palette.accentSoft, color: palette.text, borderRadius: '999px', textTransform: 'capitalize' }}>{item._type}</span>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: palette.text, margin: 0 }}>{item.title || item.question || 'Untitled'}</h3>
            </div>
            <p style={{ fontSize: '13px', color: palette.muted, margin: 0 }}>{(item.content || item.description || '').substring(0, 150)}...</p>
          </div>
        ))}
      </div>
      
      {results.length === 0 && query && !loading && (
        <div style={{ textAlign: 'center', padding: '30px', color: palette.muted }}>No results found</div>
      )}
    </div>
  );
}
