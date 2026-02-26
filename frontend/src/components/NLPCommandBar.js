import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../utils/ThemeAndAccessibility';
import { MagnifyingGlassIcon, ClockIcon } from '@heroicons/react/24/outline';


export default function NLPCommandBar() {
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const bgSecondary = darkMode ? 'bg-stone-900' : 'bg-white';
  const borderColor = darkMode ? 'border-stone-800' : 'border-gray-200';
  const textPrimary = darkMode ? 'text-stone-100' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-stone-500' : 'text-gray-600';
  const hoverBg = darkMode ? 'hover:bg-stone-800' : 'hover:bg-gray-50';

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.defaultPrevented) return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        if (document.querySelector('[data-unified-nav-search="true"]')) return;
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('commandHistory');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const parseQuery = (q) => {
    const lower = q.toLowerCase();
    
    // Action commands
    if (lower.startsWith('create task')) {
      const match = lower.match(/linked to decision #(\d+)/);
      return { type: 'action', action: 'create_task', decisionId: match ? match[1] : null };
    }
    if (lower.startsWith('create goal')) return { type: 'action', action: 'create_goal' };
    if (lower.startsWith('create meeting')) return { type: 'action', action: 'create_meeting' };
    
    // Search queries
    if (lower.includes('find') || lower.includes('search')) {
      const keywords = lower.replace(/find|search|about|for/g, '').trim();
      if (lower.includes('decision')) return { type: 'search', target: 'decisions', keywords };
      if (lower.includes('conversation')) return { type: 'search', target: 'conversations', keywords };
      if (lower.includes('project')) return { type: 'search', target: 'projects', keywords };
      return { type: 'search', target: 'all', keywords };
    }
    
    return { type: 'search', target: 'all', keywords: q };
  };

  const executeCommand = async () => {
    if (!query.trim()) return;
    
    const parsed = parseQuery(query);
    const newHistory = [query, ...history.filter(h => h !== query)].slice(0, 10);
    setHistory(newHistory);
    localStorage.setItem('commandHistory', JSON.stringify(newHistory));
    
    if (parsed.type === 'action') {
      if (parsed.action === 'create_task') {
        navigate('/business/tasks');
      } else if (parsed.action === 'create_goal') {
        navigate('/business/goals');
      } else if (parsed.action === 'create_meeting') {
        navigate('/business/meetings');
      }
      setIsOpen(false);
      return;
    }
    
    if (parsed.type === 'search') {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/knowledge/search-all/?q=${encodeURIComponent(parsed.keywords)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setResults(data.results || []);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') executeCommand();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-32 z-50" onClick={() => setIsOpen(false)}>
      <div className={`${bgSecondary} border ${borderColor} rounded-lg shadow-2xl w-full max-w-2xl`} onClick={(e) => e.stopPropagation()}>
        <div className={`p-4 border-b ${borderColor}`}>
          <div className="flex items-center gap-3">
            <MagnifyingGlassIcon className={`w-5 h-5 ${textSecondary}`} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a command or search... (e.g., 'Find decisions about auth' or 'Create task linked to decision #123')"
              className={`flex-1 bg-transparent ${textPrimary} outline-none text-sm`}
              autoFocus
            />
          </div>
        </div>

        {loading && (
          <div className="p-8 text-center">
            <div className={`text-sm ${textSecondary}`}>Searching...</div>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="max-h-96 overflow-y-auto">
            {results.map((result, idx) => (
              <div
                key={idx}
                onClick={() => {
                  navigate(result.url);
                  setIsOpen(false);
                }}
                className={`p-4 border-b ${borderColor} cursor-pointer ${hoverBg} transition-colors`}
              >
                <div className={`text-sm font-medium ${textPrimary} mb-1`}>{result.title}</div>
                <div className={`text-xs ${textSecondary}`}>{result.type}</div>
              </div>
            ))}
          </div>
        )}

        {!loading && results.length === 0 && query && (
          <div className="p-8 text-center">
            <div className={`text-sm ${textSecondary}`}>No results found</div>
          </div>
        )}

        {!query && history.length > 0 && (
          <div className="p-4">
            <div className={`text-xs font-semibold ${textSecondary} mb-2 flex items-center gap-2`}>
              <ClockIcon className="w-4 h-4" />
              Recent Commands
            </div>
            {history.map((cmd, idx) => (
              <div
                key={idx}
                onClick={() => setQuery(cmd)}
                className={`p-2 text-sm ${textPrimary} cursor-pointer ${hoverBg} rounded transition-colors`}
              >
                {cmd}
              </div>
            ))}
          </div>
        )}

        <div className={`p-3 border-t ${borderColor} flex items-center justify-between text-xs ${textSecondary}`}>
          <div>Press Enter to execute</div>
          <div>ESC to close</div>
        </div>
      </div>
    </div>
  );
}


