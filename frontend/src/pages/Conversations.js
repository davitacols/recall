import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../utils/ThemeAndAccessibility';
import api from '../services/api';
import { useToast } from '../components/Toast';

function Conversations() {
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const { addToast } = useToast();
  const [conversations, setConversations] = useState([]);
  const [filteredConversations, setFilteredConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  const bgColor = '#1c1917';
  const textColor = '#ffffff';
  const borderColor = '#b45309';
  const hoverBg = '#292415';
  const secondaryText = '#d1d5db';

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

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ width: '32px', height: '32px', border: '2px solid #374151', borderTop: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '64px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '56px', fontWeight: 900, color: textColor, marginBottom: '12px', letterSpacing: '-0.02em' }}>Conversations</h1>
            <p style={{ fontSize: '20px', color: secondaryText, fontWeight: 300 }}>Collaborate, discuss, and make decisions together</p>
          </div>
          <button
            onClick={() => navigate('/conversations/new')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '32px', paddingRight: '32px', paddingTop: '16px', paddingBottom: '16px', backgroundColor: '#d97706', color: '#ffffff', border: 'none', fontWeight: 700, textTransform: 'uppercase', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#fbbf24'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#d97706'}
          >
            <PlusIcon style={{ width: '20px', height: '20px' }} />
            New
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div style={{ marginBottom: '48px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <MagnifyingGlassIcon style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: secondaryText }} />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', paddingLeft: '48px', paddingRight: '16px', paddingTop: '12px', paddingBottom: '12px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, color: textColor, outline: 'none', transition: 'all 0.2s' }}
              onFocus={(e) => { e.target.style.borderColor = textColor; }}
              onBlur={(e) => { e.target.style.borderColor = borderColor; }}
            />
          </div>

          {/* Filter and Sort */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{ paddingLeft: '16px', paddingRight: '16px', paddingTop: '12px', paddingBottom: '12px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, color: textColor, outline: 'none', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' }}
            >
              <option value="all">All Types</option>
              <option value="question">Questions</option>
              <option value="discussion">Discussions</option>
              <option value="decision">Decisions</option>
              <option value="blocker">Blockers</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ paddingLeft: '16px', paddingRight: '16px', paddingTop: '12px', paddingBottom: '12px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, color: textColor, outline: 'none', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' }}
            >
              <option value="recent">Most Recent</option>
              <option value="replies">Most Replies</option>
              <option value="views">Most Views</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      {conversations.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '48px' }}>
          <div style={{ backgroundColor: bgColor, padding: '24px', border: `1px solid ${borderColor}`, transition: 'all 0.2s' }} onMouseEnter={(e) => e.target.style.borderColor = textColor} onMouseLeave={(e) => e.target.style.borderColor = borderColor}>
            <p style={{ fontSize: '12px', color: secondaryText, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Total</p>
            <p style={{ fontSize: '36px', fontWeight: 900, color: textColor }}>{conversations.length}</p>
          </div>
          <div style={{ backgroundColor: bgColor, padding: '24px', border: `1px solid ${borderColor}`, transition: 'all 0.2s' }} onMouseEnter={(e) => e.target.style.borderColor = textColor} onMouseLeave={(e) => e.target.style.borderColor = borderColor}>
            <p style={{ fontSize: '12px', color: secondaryText, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>This Week</p>
            <p style={{ fontSize: '36px', fontWeight: 900, color: textColor }}>
              {conversations.filter(c => {
                const date = new Date(c.created_at);
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return date > weekAgo;
              }).length}
            </p>
          </div>
          <div style={{ backgroundColor: bgColor, padding: '24px', border: `1px solid ${borderColor}`, transition: 'all 0.2s' }} onMouseEnter={(e) => e.target.style.borderColor = textColor} onMouseLeave={(e) => e.target.style.borderColor = borderColor}>
            <p style={{ fontSize: '12px', color: secondaryText, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Avg Replies</p>
            <p style={{ fontSize: '36px', fontWeight: 900, color: textColor }}>
              {Math.round(conversations.reduce((sum, c) => sum + (c.reply_count || 0), 0) / conversations.length)}
            </p>
          </div>
        </div>
      )}

      {/* Conversations List */}
      {filteredConversations.length === 0 ? (
        <div style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, padding: '64px', textAlign: 'center' }}>
          <p style={{ color: secondaryText, fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No conversations found</p>
          <p style={{ color: secondaryText, fontSize: '14px' }}>
            {searchQuery ? 'Try adjusting your search' : 'Start a new conversation to get started'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredConversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => navigate(`/conversations/${conv.id}`)}
              style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, padding: '24px', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = textColor; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = borderColor; }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '24px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <span style={{ paddingLeft: '12px', paddingRight: '12px', paddingTop: '4px', paddingBottom: '4px', fontSize: '12px', fontWeight: 700, border: `1px solid ${borderColor}`, backgroundColor: hoverBg, color: textColor }}>
                      {conv.post_type || 'Discussion'}
                    </span>
                    {conv.is_closed && (
                      <span style={{ paddingLeft: '12px', paddingRight: '12px', paddingTop: '4px', paddingBottom: '4px', backgroundColor: hoverBg, border: `1px solid ${borderColor}`, color: textColor, fontSize: '12px', fontWeight: 700 }}>Closed</span>
                    )}
                  </div>
                  <h3 style={{ fontSize: '20px', fontWeight: 700, color: textColor, marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {conv.title || conv.question || 'Untitled'}
                  </h3>
                  <p style={{ color: secondaryText, fontSize: '14px', marginBottom: '16px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', fontWeight: 300 }}>
                    {conv.content || conv.description || 'No description'}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '32px', fontSize: '14px', color: secondaryText, fontWeight: 500 }}>
                    <div>{new Date(conv.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                    <div>{conv.reply_count || 0} replies</div>
                    <div>{conv.view_count || 0} views</div>
                  </div>
                </div>
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  {conv.author_avatar ? (
                    <img src={conv.author_avatar} alt={conv.author} style={{ width: '48px', height: '48px', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '48px', height: '48px', backgroundColor: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ color: '#ffffff', fontSize: '14px', fontWeight: 700 }}>
                        {conv.author?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <p style={{ fontSize: '12px', color: secondaryText, marginTop: '12px', fontWeight: 600 }}>{conv.author}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Conversations;
