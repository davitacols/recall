import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import { useToast } from '../components/Toast';

function Conversations() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [conversations, setConversations] = useState([]);
  const [filteredConversations, setFilteredConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [conversations, searchQuery, filterType, sortBy]);

  const loadConversations = async () => {
    try {
      const response = await api.get('/api/conversations/');
      const allConvs = response.data.results || response.data || [];
      const filtered = Array.isArray(allConvs) ? allConvs.filter(c => c && c.id) : [];
      setConversations(filtered);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let result = [...conversations];

    if (searchQuery) {
      result = result.filter(conv =>
        (conv.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (conv.content || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterType !== 'all') {
      result = result.filter(conv => conv.post_type === filterType);
    }

    if (sortBy === 'recent') {
      result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortBy === 'replies') {
      result.sort((a, b) => (b.reply_count || 0) - (a.reply_count || 0));
    } else if (sortBy === 'views') {
      result.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
    }

    setFilteredConversations(result);
  };

  const getTypeColor = (type) => {
    const colors = {
      'question': 'bg-blue-50 border-blue-200 text-blue-700',
      'discussion': 'bg-purple-50 border-purple-200 text-purple-700',
      'decision': 'bg-green-50 border-green-200 text-green-700',
      'blocker': 'bg-red-50 border-red-200 text-red-700',
    };
    return colors[type] || 'bg-gray-50 border-gray-200 text-gray-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-16">
        {/* Header */}
        <div className="mb-16">
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-7xl font-black text-gray-900 mb-3 tracking-tight">Conversations</h1>
              <p className="text-xl text-gray-600 font-light">Collaborate, discuss, and make decisions together</p>
            </div>
            <button
              onClick={() => navigate('/conversations/new')}
              className="flex items-center gap-2 px-8 py-4 bg-gray-900 text-white hover:bg-black font-bold uppercase text-sm transition-all shadow-lg hover:shadow-xl"
            >
              <PlusIcon className="w-5 h-5" />
              New
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-12">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
              />
            </div>

            {/* Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-3 bg-white border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all font-medium"
            >
              <option value="all">All Types</option>
              <option value="question">Questions</option>
              <option value="discussion">Discussions</option>
              <option value="decision">Decisions</option>
              <option value="blocker">Blockers</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-3 bg-white border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all font-medium"
            >
              <option value="recent">Most Recent</option>
              <option value="replies">Most Replies</option>
              <option value="views">Most Views</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        {conversations.length > 0 && (
          <div className="grid grid-cols-3 gap-6 mb-12">
            <div className="bg-white p-6 border border-gray-200 hover:border-gray-900 transition-all">
              <p className="text-sm text-gray-600 font-semibold uppercase tracking-wide mb-2">Total</p>
              <p className="text-4xl font-black text-gray-900">{conversations.length}</p>
            </div>
            <div className="bg-white p-6 border border-gray-200 hover:border-gray-900 transition-all">
              <p className="text-sm text-gray-600 font-semibold uppercase tracking-wide mb-2">This Week</p>
              <p className="text-4xl font-black text-gray-900">
                {conversations.filter(c => {
                  const date = new Date(c.created_at);
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return date > weekAgo;
                }).length}
              </p>
            </div>
            <div className="bg-white p-6 border border-gray-200 hover:border-gray-900 transition-all">
              <p className="text-sm text-gray-600 font-semibold uppercase tracking-wide mb-2">Avg Replies</p>
              <p className="text-4xl font-black text-gray-900">
                {Math.round(conversations.reduce((sum, c) => sum + (c.reply_count || 0), 0) / conversations.length)}
              </p>
            </div>
          </div>
        )}

        {/* Conversations List */}
        {filteredConversations.length === 0 ? (
          <div className="bg-white border border-gray-200 p-16 text-center">
            <p className="text-gray-600 text-lg font-semibold mb-2">No conversations found</p>
            <p className="text-gray-500 text-sm">
              {searchQuery ? 'Try adjusting your search' : 'Start a new conversation to get started'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredConversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => navigate(`/conversations/${conv.id}`)}
                className="bg-white border border-gray-200 p-6 cursor-pointer hover:border-gray-900 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-4">
                      <span className={`px-3 py-1 text-xs font-bold border ${getTypeColor(conv.post_type)}`}>
                        {conv.post_type || 'Discussion'}
                      </span>
                      {conv.is_crisis && (
                        <span className="px-3 py-1 bg-red-50 border border-red-200 text-red-700 text-xs font-bold">Crisis</span>
                      )}
                      {conv.is_closed && (
                        <span className="px-3 py-1 bg-gray-100 border border-gray-300 text-gray-700 text-xs font-bold">Closed</span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {conv.title || conv.question || 'Untitled'}
                    </h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2 font-light">
                      {conv.content || conv.description || 'No description'}
                    </p>
                    <div className="flex items-center gap-8 text-sm text-gray-500 font-medium">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {new Date(conv.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                        {conv.reply_count || 0}
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        {conv.view_count || 0}
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    {conv.author_avatar ? (
                      <img src={conv.author_avatar} alt={conv.author} className="w-12 h-12 object-cover" />
                    ) : (
                      <div className="w-12 h-12 bg-gray-900 flex items-center justify-center">
                        <span className="text-white text-sm font-bold">
                          {conv.author?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <p className="text-xs text-gray-600 mt-3 font-semibold">{conv.author}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Conversations;
