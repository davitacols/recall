import React, { useState } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

function Knowledge() {
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

  const performSearch = async (searchQuery) => {
    setLoading(true);
    try {
      const response = await api.post('/api/knowledge/search/', { query: searchQuery });
      setResults(response.data.results || []);
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
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8 md:mb-12 animate-fadeIn">
        <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-2 md:mb-3">Knowledge Search</h1>
        <p className="text-base md:text-xl text-gray-600 mb-2">Search through your organization's memory</p>
        <p className="text-sm md:text-base text-gray-500">Find decisions, conversations, and insights from your team's collective knowledge base.</p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-8 md:mb-12 animate-fadeIn" style={{ animationDelay: '0.1s' }}>
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 w-5 md:w-6 h-5 md:h-6 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for anything..."
            className="w-full pl-12 md:pl-16 pr-24 md:pr-32 py-4 md:py-5 border border-gray-300 text-base md:text-lg focus:border-gray-900 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 recall-btn-primary disabled:opacity-50 text-sm md:text-base"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {/* Suggested Queries */}
      {!hasSearched && (
        <div className="mb-12">
          <p className="text-lg font-bold text-gray-900 mb-4">Try searching for:</p>
          <div className="flex flex-wrap gap-3">
            {suggestedQueries.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => setQuery(suggestion)}
                className="px-5 py-3 border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white font-medium transition-all"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Results */}
      {hasSearched && (
        <div>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900">
              {results.length} {results.length === 1 ? 'Result' : 'Results'}
            </h2>
            <button
              onClick={() => {
                setQuery('');
                setResults([]);
                setHasSearched(false);
              }}
              className="recall-btn-secondary"
            >
              New search
            </button>
          </div>
          
          {results.length === 0 ? (
            <div className="text-center py-20">
              <MagnifyingGlassIcon className="w-16 h-16 text-gray-300 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-gray-900 mb-3">No results found</h3>
              <p className="text-lg text-gray-600">Try different keywords</p>
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={index} className="border border-gray-200 p-8 hover:border-gray-900 transition-all">
                  <div className="flex items-center space-x-3 mb-4">
                    <span className="px-3 py-1 bg-gray-900 text-white text-xs font-bold uppercase tracking-wide">
                      {result.content_type}
                    </span>
                    {result.relevance_score && (
                      <span className="px-3 py-1 border border-gray-900 text-gray-900 text-xs font-bold uppercase tracking-wide">
                        {Math.round(result.relevance_score * 100)}% match
                      </span>
                    )}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    {result.title}
                  </h3>
                  <p className="text-lg text-gray-700 line-clamp-2">
                    {result.content_preview}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      {!hasSearched && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          <div className="border border-gray-200 p-8 text-center">
            <div className="text-4xl font-bold text-gray-900 mb-2">{stats.total_items}</div>
            <div className="text-sm text-gray-600 uppercase tracking-wide">Searchable Items</div>
          </div>
          <div className="border border-gray-200 p-8 text-center">
            <div className="text-4xl font-bold text-gray-900 mb-2">{stats.this_week}</div>
            <div className="text-sm text-gray-600 uppercase tracking-wide">This Week</div>
          </div>
          <div className="border border-gray-200 p-8 text-center">
            <div className="text-4xl font-bold text-gray-900 mb-2">{stats.total_searches}</div>
            <div className="text-sm text-gray-600 uppercase tracking-wide">Total Searches</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Knowledge;
