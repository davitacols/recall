import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';


const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const SearchBar = ({ onSearch }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchType, setSearchType] = useState('all');
  const suggestionsRef = useRef(null);
  const resultsRef = useRef(null);

  const API_URL = `${API_BASE}/api`;

  // Fetch suggestions as user types
  useEffect(() => {
    if (query.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await axios.get(`${API_URL}/search/suggestions/`, {
          params: { q: query, limit: 10 }
        });
        setSuggestions(response.data.suggestions || []);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      }
    }, 300); // Debounce 300ms

    return () => clearTimeout(timer);
  }, [query]);

  // Handle search
  const handleSearch = async (searchQuery = query) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/search/search/`, {
        query: searchQuery,
        search_type: searchType,
        limit: 20
      });

      setResults(response.data.results || []);
      setShowResults(true);
      setShowSuggestions(false);

      if (onSearch) {
        onSearch(response.data);
      }
    } catch (error) {
      console.error('Error searching:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    if (suggestion.type === 'tag') {
      setQuery(`#${suggestion.value}`);
      handleSearch(`#${suggestion.value}`);
    } else if (suggestion.type === 'conversation') {
      setQuery(suggestion.text);
      handleSearch(suggestion.text);
    }
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
      if (resultsRef.current && !resultsRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Search Input */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="flex-1 relative" ref={suggestionsRef}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={() => query.length > 0 && setShowSuggestions(true)}
              placeholder="Search conversations, decisions, and knowledge..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                  >
                    {suggestion.type === 'tag' && (
                      <>
                        <span className="text-blue-500">#</span>
                        <span>{suggestion.value}</span>
                      </>
                    )}
                    {suggestion.type === 'conversation' && (
                      <>
                        <span className="text-gray-500">ðŸ’¬</span>
                        <span>{suggestion.text}</span>
                      </>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search Type Selector */}
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All</option>
            <option value="bm25">BM25</option>
            <option value="postgres">Full-Text</option>
          </select>

          {/* Search Button */}
          <button
            onClick={() => handleSearch()}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Results */}
      {showResults && (
        <div className="mt-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4" ref={resultsRef}>
          {results.length > 0 ? (
            <div>
              <div className="text-sm text-gray-600 mb-3">
                Found {results.length} results
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {results.map((result, idx) => (
                  <div
                    key={idx}
                    className="p-3 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {result.type === 'conversation' && (
                            <span className="text-blue-500 text-sm">ðŸ’¬ Conversation</span>
                          )}
                          {result.type === 'decision' && (
                            <span className="text-green-500 text-sm">âœ“ Decision</span>
                          )}
                          <span className="text-xs text-gray-500">
                            Score: {result.score.toFixed(2)}
                          </span>
                        </div>
                        <h3 className="font-semibold text-gray-900 mt-1">
                          {result.title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {result.content}
                        </p>
                        {result.author && (
                          <div className="text-xs text-gray-500 mt-2">
                            By {result.author} â€¢ {new Date(result.created_at).toLocaleDateString()}
                          </div>
                        )}
                        {result.status && (
                          <div className="text-xs text-gray-500 mt-1">
                            Status: {result.status}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-4">
              No results found for "{query}"
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="mt-4 text-center text-gray-500">
          Searching...
        </div>
      )}
    </div>
  );
};

export default SearchBar;



