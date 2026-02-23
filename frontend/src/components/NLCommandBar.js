import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlassIcon, SparklesIcon } from '@heroicons/react/24/outline';

export default function NLCommandBar({ darkMode }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const bgColor = darkMode ? '#1c1917' : '#ffffff';
  const textColor = darkMode ? '#e7e5e4' : '#111827';
  const borderColor = darkMode ? '#292524' : '#e5e7eb';
  const hoverBg = darkMode ? '#292524' : '#f3f4f6';
  const secondaryText = darkMode ? '#a8a29e' : '#6b7280';

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (query.length > 2) {
      handleSearch();
    } else {
      setResults([]);
    }
  }, [query]);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Parse natural language commands
      const lowerQuery = query.toLowerCase();
      
      // Action commands
      if (lowerQuery.startsWith('create ') || lowerQuery.startsWith('new ')) {
        const type = lowerQuery.includes('conversation') ? 'conversation' :
                     lowerQuery.includes('decision') ? 'decision' :
                     lowerQuery.includes('task') ? 'task' :
                     lowerQuery.includes('meeting') ? 'meeting' : null;
        
        if (type) {
          setResults([{
            type: 'action',
            title: `Create new ${type}`,
            action: () => navigate(`/${type}s/new`)
          }]);
          return;
        }
      }
      
      // Search commands
      if (lowerQuery.includes('find') || lowerQuery.includes('search') || lowerQuery.includes('show')) {
        const searchTerm = query.replace(/find|search|show|me|about/gi, '').trim();
        
        const res = await fetch(`http://localhost:8000/api/knowledge/search-all/?q=${encodeURIComponent(searchTerm)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        setResults(data.results?.slice(0, 5).map(item => ({
          type: 'result',
          title: item.title,
          contentType: item.content_type,
          action: () => {
            const path = item.content_type === 'conversation' ? `/conversations/${item.id}` :
                        item.content_type === 'decision' ? `/decisions/${item.id}` :
                        item.content_type === 'meeting' ? `/business/meetings/${item.id}` : '#';
            navigate(path);
            setOpen(false);
          }
        })) || []);
        return;
      }
      
      // Default search
      const res = await fetch(`http://localhost:8000/api/knowledge/search-all/?q=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      setResults(data.results?.slice(0, 5).map(item => ({
        type: 'result',
        title: item.title,
        contentType: item.content_type,
        action: () => {
          const path = item.content_type === 'conversation' ? `/conversations/${item.id}` :
                      item.content_type === 'decision' ? `/decisions/${item.id}` :
                      item.content_type === 'meeting' ? `/business/meetings/${item.id}` : '#';
          navigate(path);
          setOpen(false);
        }
      })) || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'start',
        justifyContent: 'center',
        paddingTop: '100px'
      }}
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '600px',
          maxWidth: '90%',
          backgroundColor: bgColor,
          border: `1px solid ${borderColor}`,
          borderRadius: '12px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          overflow: 'hidden'
        }}
      >
        {/* Search Input */}
        <div style={{ padding: '16px', borderBottom: `1px solid ${borderColor}` }}>
          <div style={{ position: 'relative' }}>
            <SparklesIcon style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '18px',
              height: '18px',
              color: '#f59e0b'
            }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything... (e.g., 'find decisions about auth' or 'create new task')"
              autoFocus
              style={{
                width: '100%',
                padding: '12px 12px 12px 40px',
                fontSize: '15px',
                backgroundColor: 'transparent',
                border: 'none',
                color: textColor,
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {results.map((result, idx) => (
              <button
                key={idx}
                onClick={result.action}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  textAlign: 'left',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderTop: idx > 0 ? `1px solid ${borderColor}` : 'none',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBg}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  backgroundColor: result.type === 'action' ? '#3b82f6' : hoverBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px'
                }}>
                  {result.type === 'action' ? '⚡' : '📄'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: textColor }}>
                    {result.title}
                  </div>
                  {result.contentType && (
                    <div style={{ fontSize: '12px', color: secondaryText, textTransform: 'capitalize' }}>
                      {result.contentType}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Suggestions */}
        {query.length === 0 && (
          <div style={{ padding: '16px' }}>
            <div style={{ fontSize: '11px', color: secondaryText, marginBottom: '12px', textTransform: 'uppercase', fontWeight: 600 }}>
              Try these commands:
            </div>
            {[
              'find decisions about authentication',
              'create new conversation',
              'show me recent meetings',
              'search for API documentation'
            ].map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => setQuery(suggestion)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  textAlign: 'left',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: secondaryText,
                  marginBottom: '4px',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = hoverBg;
                  e.currentTarget.style.color = textColor;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = secondaryText;
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div style={{ padding: '20px', textAlign: 'center', color: secondaryText, fontSize: '13px' }}>
            Searching...
          </div>
        )}
      </div>
    </div>
  );
}
