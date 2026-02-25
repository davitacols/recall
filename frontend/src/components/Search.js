import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

function Search() {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.defaultPrevented) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        if (document.querySelector('[data-unified-nav-search="true"]')) return;
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setIsFocused(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch suggestions
  useEffect(() => {
    if (query.length < 1) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await api.get('/api/recall/search/suggestions/', {
          params: { q: query, limit: 5 }
        });
        setSuggestions(response.data.suggestions || []);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Fetch search results
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const searchWithBM25 = async () => {
      setLoading(true);
      try {
        const response = await api.post('/api/recall/search/search/', {
          query,
          limit: 8
        });
        setResults(response.data.results || []);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(searchWithBM25, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleResultClick = (result) => {
    let href;
    switch (result.type) {
      case 'conversation':
        href = `/conversations/${result.id}`;
        break;
      case 'decision':
        href = `/decisions/${result.id}`;
        break;
      case 'sprint':
        href = `/sprint/${result.id}`;
        break;
      case 'issue':
        href = `/issues/${result.id}`;
        break;
      case 'blocker':
        href = `/blockers/${result.id}`;
        break;
      default:
        href = `/`;
    }
    navigate(href);
    setQuery('');
    setIsFocused(false);
  };

  const handleSuggestionClick = (suggestion) => {
    if (suggestion.type === 'tag') {
      setQuery(`#${suggestion.value}`);
    } else {
      setQuery(suggestion.text);
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'conversation': return 'bg-blue-50 text-blue-900';
      case 'decision': return 'bg-purple-50 text-purple-900';
      case 'sprint': return 'bg-green-50 text-green-900';
      case 'issue': return 'bg-orange-50 text-orange-900';
      case 'blocker': return 'bg-red-50 text-red-900';
      default: return 'bg-gray-50 text-gray-900';
    }
  };

  return (
    <div ref={containerRef} className="relative w-80">
      <div className={`relative flex items-center bg-gray-100 border transition-all ${isFocused ? 'border-gray-900 shadow-md' : 'border-gray-200'}`}>
        <MagnifyingGlassIcon className="absolute left-4 w-4 h-4 text-gray-600 pointer-events-none" />
        
        <input
          ref={inputRef}
          type="text"
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          className="flex-1 px-4 py-2 pl-10 bg-transparent border-none text-sm text-gray-900 outline-none placeholder-gray-600"
        />

        {query && (
          <button
            onClick={() => setQuery('')}
            className="p-2 mr-2 hover:bg-gray-200 transition-all"
          >
            <XMarkIcon className="w-4 h-4 text-gray-600" />
          </button>
        )}

        {!query && (
          <div className="px-2 mr-2 py-1 bg-gray-200 rounded text-xs text-gray-600 font-medium">
            ⌘K
          </div>
        )}
      </div>

      {isFocused && query && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 shadow-lg z-50">
          {suggestions.length > 0 && !loading && (
            <div className="border-b border-gray-100">
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-600 flex items-center gap-2"
                >
                  {suggestion.type === 'tag' && <span className="text-blue-500">#</span>}
                  {suggestion.type === 'tag' ? suggestion.value : suggestion.text}
                </button>
              ))}
            </div>
          )}
          
          {loading ? (
            <div className="p-4 text-center">
              <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-600">
              No results found for "{query}"
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {results.map((result, idx) => (
                <button
                  key={idx}
                  onClick={() => handleResultClick(result)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <span className={`px-2 py-1 text-xs font-bold uppercase rounded ${getTypeColor(result.type)}`}>
                      {result.type}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-gray-900 truncate">{result.title}</div>
                      <div className="text-xs text-gray-600 mt-1">Score: {result.score?.toFixed(2) || 'N/A'}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Search;
