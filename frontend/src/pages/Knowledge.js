import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MagnifyingGlassIcon, SparklesIcon, EyeIcon, BookmarkIcon, FireIcon, ClockIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

function Knowledge() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [stats, setStats] = useState({ total_items: 0, this_week: 0, total_searches: 0 });
  const [trendingTopics, setTrendingTopics] = useState([]);
  const [timeComparison, setTimeComparison] = useState(null);
  const [showComparison, setShowComparison] = useState(false);
  const [culturalMemories, setCulturalMemories] = useState([]);
  const [legacyContent, setLegacyContent] = useState([]);
  const [showCulturalModal, setShowCulturalModal] = useState(false);
  const [newMemory, setNewMemory] = useState({ title: '', story: '', year: new Date().getFullYear(), category: 'general' });

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await api.post('/api/knowledge/search/', { query });
      setResults(response.data.results || []);
      setHasSearched(true);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const suggestedQueries = [
    'Q4 planning decisions',
    'team expansion updates',
    'budget allocation',
    'product roadmap changes',
    'hiring decisions'
  ];

  React.useEffect(() => {
    fetchStats();
    fetchTrending();
    fetchCulturalMemories();
    fetchLegacyContent();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/api/knowledge/stats/');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchTrending = async () => {
    try {
      const response = await api.get('/api/knowledge/trending/');
      setTrendingTopics(response.data.slice(0, 5));
    } catch (error) {
      console.error('Failed to fetch trending:', error);
    }
  };

  const fetchTimeComparison = async (period) => {
    try {
      const response = await api.post('/api/knowledge/time-comparison/', { period });
      setTimeComparison(response.data);
      setShowComparison(true);
    } catch (error) {
      console.error('Failed to fetch comparison:', error);
    }
  };

  const fetchCulturalMemories = async () => {
    try {
      const response = await api.get('/api/knowledge/cultural-memory/');
      setCulturalMemories(response.data.memories || []);
    } catch (error) {
      console.error('Failed to fetch cultural memories:', error);
    }
  };

  const fetchLegacyContent = async () => {
    try {
      const response = await api.get('/api/knowledge/legacy/');
      setLegacyContent(response.data.legacy || []);
    } catch (error) {
      console.error('Failed to fetch legacy content:', error);
    }
  };

  const handleAddMemory = async () => {
    try {
      await api.post('/api/knowledge/cultural-memory/', newMemory);
      setShowCulturalModal(false);
      setNewMemory({ title: '', story: '', year: new Date().getFullYear(), category: 'general' });
      fetchCulturalMemories();
    } catch (error) {
      alert('Failed to add memory');
    }
  };



  const recentSearches = [
    'Marketing strategy 2024',
    'Engineering roadmap',
    'Sales targets Q4',
    'Product launch timeline'
  ];

  const filters = [
    { id: 'all', name: 'All Results' },
    { id: 'conversation', name: 'Conversations' },
    { id: 'decision', name: 'Decisions' },
    { id: 'update', name: 'Updates' },
    { id: 'question', name: 'Questions' }
  ];

  const getImageUrl = (index, type) => {
    const colors = {
      conversation: '3498db',
      decision: '2ecc71',
      update: '9b59b6',
      question: 'f39c12'
    };
    const heights = [250, 300, 350, 280, 320];
    return `https://via.placeholder.com/400x${heights[index % heights.length]}/${colors[type] || 'e74c3c'}/ffffff?text=${type?.toUpperCase() || 'SEARCH'}`;
  };

  const filteredResults = selectedFilter === 'all' 
    ? results 
    : results.filter(r => r.content_type === selectedFilter);

  return (
    <div className="flex gap-8">
      {/* Main Content */}
      <div className="flex-1">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-900 mb-6">
            <SparklesIcon className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">KNOWLEDGE SEARCH</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Search through your organization's conversations, decisions, and insights
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-12">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for anything..."
              className="w-full px-6 py-6 text-xl border-2 border-gray-300 focus:border-gray-900 focus:outline-none pr-40"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="absolute right-2 top-2 bottom-2 px-8 bg-gray-900 hover:bg-gray-800 text-white font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {/* Suggested Queries */}
        {!hasSearched && (
          <div className="mb-16">
            <p className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide">Popular Searches:</p>
            <div className="flex flex-wrap gap-3">
              {suggestedQueries.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => setQuery(suggestion)}
                  className="px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 hover:border-gray-900 hover:bg-gray-50 transition-colors font-bold uppercase tracking-wide text-xs"
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
            <div className="mb-8 pb-6 border-b-2 border-gray-900">
              <h2 className="text-3xl font-bold text-gray-900">
                SEARCH RESULTS
                {filteredResults.length > 0 && (
                  <span className="ml-4 text-xl font-normal text-gray-600">({filteredResults.length})</span>
                )}
              </h2>
              <button
                onClick={() => {
                  setQuery('');
                  setResults([]);
                  setHasSearched(false);
                  setSelectedFilter('all');
                }}
                className="mt-4 text-sm font-bold text-gray-600 hover:text-gray-900 uppercase tracking-wide"
              >
                New search →
              </button>
            </div>
            
            {filteredResults.length === 0 ? (
              <div className="text-center py-20">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 mb-6">
                  <MagnifyingGlassIcon className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">NO RESULTS FOUND</h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  No results found for "{query}". Try different keywords
                </p>
              </div>
            ) : (
              <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
                {filteredResults.map((result, index) => (
                  <div key={index} className="break-inside-avoid">
                    <div className="bg-white border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow duration-300 group cursor-pointer">
                      <div className="relative overflow-hidden bg-gray-100">
                        <img 
                          src={getImageUrl(index, result.content_type)} 
                          alt="" 
                          className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white">
                            <div className="flex items-center space-x-4 text-sm">
                              <div className="flex items-center space-x-1">
                                <EyeIcon className="w-4 h-4" />
                                <span>{Math.floor(Math.random() * 100)}</span>
                              </div>
                            </div>
                            <BookmarkIcon className="w-5 h-5" />
                          </div>
                        </div>
                        {result.relevance_score && (
                          <div className="absolute top-4 right-4 px-3 py-1 bg-gray-900 text-white text-xs font-bold">
                            {Math.round(result.relevance_score * 100)}% MATCH
                          </div>
                        )}
                      </div>
                      
                      <div className="p-4">
                        <div className="flex items-center space-x-2 mb-3">
                          <span className="px-2 py-1 bg-gray-900 text-white text-xs font-bold uppercase tracking-wide">
                            {result.content_type}
                          </span>
                        </div>
                        
                        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-gray-700 transition-colors">
                          {result.title}
                        </h3>
                        
                        {result.summary && (
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                            {result.summary}
                          </p>
                        )}
                        
                        <p className="text-sm text-gray-600 line-clamp-3">
                          {result.content_preview}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        {!hasSearched && (
          <>
          {/* Time Comparison Results */}
          {showComparison && timeComparison && (
            <div className="mb-8 bg-white border-2 border-gray-900 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-wide">
                  Changes Since {timeComparison.period}
                </h2>
                <button
                  onClick={() => setShowComparison(false)}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="text-center p-4 bg-gray-50 border border-gray-200">
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    {timeComparison.comparison.conversations.current}
                  </div>
                  <div className="text-xs text-gray-600 uppercase tracking-wide font-bold mb-2">Conversations</div>
                  <div className={`text-sm font-bold ${
                    timeComparison.comparison.conversations.change > 0 ? 'text-green-600' :
                    timeComparison.comparison.conversations.change < 0 ? 'text-red-600' :
                    'text-gray-600'
                  }`}>
                    {timeComparison.comparison.conversations.change > 0 ? '+' : ''}
                    {timeComparison.comparison.conversations.change} vs previous
                  </div>
                </div>
                <div className="text-center p-4 bg-gray-50 border border-gray-200">
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    {timeComparison.comparison.decisions.current}
                  </div>
                  <div className="text-xs text-gray-600 uppercase tracking-wide font-bold mb-2">Decisions</div>
                  <div className={`text-sm font-bold ${
                    timeComparison.comparison.decisions.change > 0 ? 'text-green-600' :
                    timeComparison.comparison.decisions.change < 0 ? 'text-red-600' :
                    'text-gray-600'
                  }`}>
                    {timeComparison.comparison.decisions.change > 0 ? '+' : ''}
                    {timeComparison.comparison.decisions.change} vs previous
                  </div>
                </div>
              </div>
              
              {timeComparison.key_decisions.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Key Decisions</h3>
                  <div className="space-y-2">
                    {timeComparison.key_decisions.slice(0, 5).map((dec) => (
                      <Link
                        key={dec.id}
                        to={`/decisions/${dec.id}`}
                        className="block p-3 bg-gray-50 border border-gray-200 hover:bg-gray-100"
                      >
                        <div className="text-sm font-bold text-gray-900">{dec.title}</div>
                        <div className="text-xs text-gray-600 mt-1">
                          {new Date(dec.decided_at).toLocaleDateString()} • {dec.impact_level}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              
              {timeComparison.trending_topics.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Trending Topics</h3>
                  <div className="flex flex-wrap gap-2">
                    {timeComparison.trending_topics.map((topic, idx) => (
                      <span key={idx} className="px-3 py-1 bg-gray-900 text-white text-xs font-bold uppercase">
                        {topic.topic} ({topic.count})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="mb-8 text-center">
            <Link
              to="/faq"
              className="inline-block px-8 py-4 bg-gray-900 text-white hover:bg-gray-800 font-bold uppercase tracking-wide text-lg"
            >
              View FAQ →
            </Link>
            <p className="text-sm text-gray-600 mt-3">Auto-generated from resolved questions</p>
          </div>

          {/* Cultural Memory */}
          {culturalMemories.length > 0 && (
            <div className="mb-8 bg-white border-2 border-purple-600 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-purple-900 uppercase tracking-wide">
                  📖 Cultural Memory
                </h2>
                <button
                  onClick={() => setShowCulturalModal(true)}
                  className="px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 font-bold uppercase text-xs"
                >
                  Add Memory
                </button>
              </div>
              <p className="text-sm text-purple-900 mb-4">Stories and milestones that define our organization</p>
              <div className="space-y-3">
                {culturalMemories.slice(0, 5).map((memory) => (
                  <div key={memory.id} className="bg-white border-2 border-purple-600 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{memory.title}</h3>
                      <span className="px-3 py-1 bg-purple-600 text-white text-xs font-bold">{memory.year}</span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{memory.story}</p>
                    <div className="text-xs text-gray-500">Added by {memory.created_by}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Legacy Mode */}
          {legacyContent.length > 0 && (
            <div className="mb-8 bg-white border-2 border-gray-600 p-6">
              <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-wide mb-4">
                🏛️ Legacy Archive
              </h2>
              <p className="text-sm text-gray-600 mb-4">Historical content and old decisions</p>
              <div className="space-y-2">
                {legacyContent.slice(0, 10).map((item) => (
                  <Link
                    key={`${item.type}-${item.id}`}
                    to={item.type === 'decision' ? `/decisions/${item.id}` : `/conversations/${item.id}`}
                    className="block p-3 bg-gray-50 border border-gray-200 hover:bg-gray-100"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-bold text-gray-900">{item.title}</div>
                        <div className="text-xs text-gray-600 mt-1">
                          {new Date(item.date).toLocaleDateString()} • {item.author}
                        </div>
                      </div>
                      <span className="px-2 py-1 bg-gray-600 text-white text-xs font-bold uppercase">
                        {item.type}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-8 bg-white border-2 border-gray-200">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-900 mb-4">
                <MagnifyingGlassIcon className="w-8 h-8 text-white" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">{stats.total_items}</div>
              <div className="text-xs text-gray-600 uppercase tracking-wide font-bold">Searchable Items</div>
            </div>
            <div className="text-center p-8 bg-white border-2 border-gray-200">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-900 mb-4">
                <SparklesIcon className="w-8 h-8 text-white" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">{stats.this_week}</div>
              <div className="text-xs text-gray-600 uppercase tracking-wide font-bold">This Week</div>
            </div>
            <div className="text-center p-8 bg-white border-2 border-gray-200">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-900 mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">{stats.total_searches}</div>
              <div className="text-xs text-gray-600 uppercase tracking-wide font-bold">Total Searches</div>
            </div>
          </div>
          </>
        )}
      </div>

      {/* Right Sidebar */}
      <div className="w-80 flex-shrink-0 space-y-6">
        {/* Time-Based Memory */}
        <div className="bg-white border-2 border-gray-200 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide border-b-2 border-gray-900 pb-2">
            Time-Based Memory
          </h3>
          <div className="space-y-2">
            <button
              onClick={() => fetchTimeComparison('month')}
              className="w-full text-left px-3 py-2 text-sm font-bold uppercase tracking-wide text-gray-600 hover:bg-gray-100"
            >
              What Changed Last Month?
            </button>
            <button
              onClick={() => fetchTimeComparison('quarter')}
              className="w-full text-left px-3 py-2 text-sm font-bold uppercase tracking-wide text-gray-600 hover:bg-gray-100"
            >
              What Changed Last Quarter?
            </button>
            <button
              onClick={() => fetchTimeComparison('year')}
              className="w-full text-left px-3 py-2 text-sm font-bold uppercase tracking-wide text-gray-600 hover:bg-gray-100"
            >
              What Changed Last Year?
            </button>
          </div>
        </div>

        {/* Filters */}
        {hasSearched && (
          <div className="bg-white border-2 border-gray-200 p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide border-b-2 border-gray-900 pb-2">
              Filter Results
            </h3>
            <div className="space-y-2">
              {filters.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setSelectedFilter(filter.id)}
                  className={`w-full text-left px-3 py-2 text-sm font-bold uppercase tracking-wide transition-colors ${
                    selectedFilter === filter.id
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {filter.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Trending Topics */}
        <div className="bg-white border-2 border-gray-200 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide border-b-2 border-gray-900 pb-2 flex items-center">
            <FireIcon className="w-4 h-4 mr-2" />
            Trending Topics
          </h3>
          <div className="space-y-3">
            {trendingTopics.length > 0 ? (
              trendingTopics.map((topic, index) => (
                <button
                  key={index}
                  onClick={() => setQuery(topic.topic)}
                  className="w-full text-left hover:bg-gray-50 transition-colors p-2 border-b border-gray-100 last:border-0"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-900">{topic.topic}</span>
                    <span className="text-xs font-bold text-gray-500">{topic.count}</span>
                  </div>
                </button>
              ))
            ) : (
              <p className="text-sm text-gray-500">No trending topics yet</p>
            )}
          </div>
        </div>

        {/* Recent Searches */}
        <div className="bg-white border-2 border-gray-200 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide border-b-2 border-gray-900 pb-2 flex items-center">
            <ClockIcon className="w-4 h-4 mr-2" />
            Recent Searches
          </h3>
          <div className="space-y-2">
            {recentSearches.map((search, index) => (
              <button
                key={index}
                onClick={() => setQuery(search)}
                className="w-full text-left text-sm text-gray-600 hover:text-gray-900 font-medium py-1 hover:underline"
              >
                {search}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-gray-900 text-white p-6">
          <h3 className="text-sm font-bold mb-4 uppercase tracking-wide">
            Quick Stats
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-gray-700">
              <span className="text-xs uppercase tracking-wide">Total Items</span>
              <span className="text-xl font-bold">{stats.total_items}</span>
            </div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-700">
              <span className="text-xs uppercase tracking-wide">This Week</span>
              <span className="text-xl font-bold">{stats.this_week}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide">Searches</span>
              <span className="text-xl font-bold">{stats.total_searches}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cultural Memory Modal */}
      {showCulturalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white border-2 border-purple-600 w-full max-w-lg p-8">
            <h2 className="text-2xl font-bold text-purple-900 mb-6 uppercase tracking-wide">Add Cultural Memory</h2>
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-900 mb-2 uppercase tracking-wider">Title</label>
              <input
                type="text"
                value={newMemory.title}
                onChange={(e) => setNewMemory({ ...newMemory, title: e.target.value })}
                className="w-full p-3 border-2 border-gray-300 focus:outline-none focus:border-purple-600"
              />
            </div>
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-900 mb-2 uppercase tracking-wider">Story</label>
              <textarea
                value={newMemory.story}
                onChange={(e) => setNewMemory({ ...newMemory, story: e.target.value })}
                className="w-full p-3 border-2 border-gray-300 focus:outline-none focus:border-purple-600"
                rows={4}
              />
            </div>
            <div className="mb-6 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-900 mb-2 uppercase tracking-wider">Year</label>
                <input
                  type="number"
                  value={newMemory.year}
                  onChange={(e) => setNewMemory({ ...newMemory, year: parseInt(e.target.value) })}
                  className="w-full p-3 border-2 border-gray-300 focus:outline-none focus:border-purple-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-900 mb-2 uppercase tracking-wider">Category</label>
                <select
                  value={newMemory.category}
                  onChange={(e) => setNewMemory({ ...newMemory, category: e.target.value })}
                  className="w-full p-3 border-2 border-gray-300 focus:outline-none focus:border-purple-600"
                >
                  <option value="general">General</option>
                  <option value="milestone">Milestone</option>
                  <option value="achievement">Achievement</option>
                  <option value="lesson">Lesson Learned</option>
                </select>
              </div>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={handleAddMemory}
                className="px-6 py-3 bg-purple-600 text-white hover:bg-purple-700 font-bold uppercase tracking-wide text-sm"
              >
                Add Memory
              </button>
              <button
                onClick={() => setShowCulturalModal(false)}
                className="px-6 py-3 border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white font-bold uppercase tracking-wide text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Knowledge;
