import React, { useState } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import BM25 from '../utils/bm25';

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

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-16">
        {/* Header */}
        <div className="mb-16">
          <h1 className="text-7xl font-black text-gray-900 mb-3 tracking-tight">Knowledge</h1>
          <p className="text-xl text-gray-600 font-light">Search through your organization's collective memory</p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-16">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for anything..."
              className="w-full pl-12 pr-24 py-4 border border-gray-300 text-lg focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 transition-all"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2.5 bg-gray-900 text-white hover:bg-black font-bold uppercase text-sm transition-all disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {/* Suggested Queries */}
        {!hasSearched && (
          <div className="mb-16">
            <p className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-4">Try searching for:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedQueries.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setQuery(suggestion);
                    performSearch(suggestion);
                  }}
                  className="px-4 py-2 border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white font-bold text-sm uppercase transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        {!hasSearched && (
          <div className="grid grid-cols-3 gap-6 mb-16">
            <div className="border border-gray-200 p-8">
              <p className="text-sm text-gray-600 font-semibold uppercase tracking-wide mb-2">Searchable Items</p>
              <p className="text-5xl font-black text-gray-900">{stats.total_items}</p>
            </div>
            <div className="border border-gray-200 p-8">
              <p className="text-sm text-gray-600 font-semibold uppercase tracking-wide mb-2">This Week</p>
              <p className="text-5xl font-black text-gray-900">{stats.this_week}</p>
            </div>
            <div className="border border-gray-200 p-8">
              <p className="text-sm text-gray-600 font-semibold uppercase tracking-wide mb-2">Total Searches</p>
              <p className="text-5xl font-black text-gray-900">{stats.total_searches}</p>
            </div>
          </div>
        )}

        {/* Search Results */}
        {hasSearched && (
          <div>
            <div className="flex items-center justify-between mb-12">
              <h2 className="text-4xl font-black text-gray-900">
                {results.length} {results.length === 1 ? 'Result' : 'Results'}
              </h2>
              <button
                onClick={() => {
                  setQuery('');
                  setResults([]);
                  setHasSearched(false);
                }}
                className="px-6 py-3 border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white font-bold uppercase text-sm transition-all"
              >
                New Search
              </button>
            </div>
            
            {results.length === 0 ? (
              <div className="text-center py-24">
                <MagnifyingGlassIcon className="w-16 h-16 text-gray-300 mx-auto mb-6" />
                <h3 className="text-3xl font-black text-gray-900 mb-3">No results found</h3>
                <p className="text-lg text-gray-600">Try different keywords or browse suggestions above</p>
              </div>
            ) : (
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div key={index} className="border border-gray-200 p-8 hover:border-gray-900 hover:shadow-md transition-all">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="px-3 py-1 bg-gray-900 text-white text-xs font-bold uppercase tracking-wide">
                        {result.content_type}
                      </span>
                      {result.bm25_score && (
                        <span className="px-3 py-1 border border-gray-900 text-gray-900 text-xs font-bold uppercase tracking-wide">
                          Score: {result.bm25_score.toFixed(2)}
                        </span>
                      )}
                      {result.relevance_score && (
                        <span className="px-3 py-1 border border-gray-900 text-gray-900 text-xs font-bold uppercase tracking-wide">
                          {Math.round(result.relevance_score * 100)}% match
                        </span>
                      )}
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3 hover:text-blue-600 transition-colors">
                      {result.title}
                    </h3>
                    <p className="text-base text-gray-700 line-clamp-2 font-light">
                      {result.content_preview || result.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Knowledge;
