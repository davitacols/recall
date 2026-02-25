import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function SmartSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (query.length > 2) {
      searchContent();
    } else {
      setResults([]);
    }
  }, [query]);

  const searchContent = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:8000/api/knowledge/search-all/?q=${query}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setResults(data.results || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (result) => {
    navigate(result.url);
    setIsOpen(false);
    setQuery('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-20">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl">
        <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700">
          <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations, decisions, tasks..."
            className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white"
            autoFocus
          />
          <button onClick={() => setIsOpen(false)}>
            <XMarkIcon className="w-5 h-5 text-gray-400 hover:text-gray-600" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading && (
            <div className="p-4 text-center text-gray-500">Searching...</div>
          )}
          
          {!loading && results.length === 0 && query.length > 2 && (
            <div className="p-4 text-center text-gray-500">No results found</div>
          )}

          {results.map((result, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(result)}
              className="w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {result.type}
                </span>
                <span className="font-medium text-gray-900 dark:text-white">{result.title}</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{result.excerpt}</p>
            </button>
          ))}
        </div>

        <div className="p-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 flex items-center justify-between">
          <span>Type to search</span>
          <span>ESC to close</span>
        </div>
      </div>
    </div>
  );
}
