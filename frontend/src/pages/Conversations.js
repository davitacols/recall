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
  const textColor = '#e7e5e4';
  const borderColor = '#292524';
  const hoverBg = '#292524';
  const secondaryText = '#a8a29e';

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
        <div style={{ width: '24px', height: '24px', border: '2px solid #292524', borderTop: '2px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 600, color: textColor, marginBottom: '4px', letterSpacing: '-0.01em' }}>Conversations</h1>
            <p style={{ fontSize: '14px', color: secondaryText }}>Collaborate, discuss, and make decisions together</p>
          </div>
          <button
            onClick={() => navigate('/conversations/new')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', backgroundColor: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: '5px', fontWeight: 500, fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
          >
            <PlusIcon style={{ width: '16px', height: '16px' }} />
            New Conversation
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <MagnifyingGlassIcon style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: secondaryText }} />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', paddingLeft: '38px', paddingRight: '12px', paddingTop: '8px', paddingBottom: '8px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px', color: textColor, fontSize: '13px', outline: 'none', transition: 'all 0.15s' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = borderColor; }}
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{ padding: '8px 12px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px', color: textColor, fontSize: '13px', outline: 'none', cursor: 'pointer' }}
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
            style={{ padding: '8px 12px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px', color: textColor, fontSize: '13px', outline: 'none', cursor: 'pointer' }}
          >
            <option value="recent">Most Recent</option>
            <option value="replies">Most Replies</option>
            <option value="views">Most Views</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      {conversations.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
          <div style={{ backgroundColor: bgColor, padding: '16px', border: `1px solid ${borderColor}`, borderRadius: '5px' }}>
            <p style={{ fontSize: '11px', color: secondaryText, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '6px' }}>Total</p>
            <p style={{ fontSize: '24px', fontWeight: 600, color: textColor }}>{conversations.length}</p>
          </div>
          <div style={{ backgroundColor: bgColor, padding: '16px', border: `1px solid ${borderColor}`, borderRadius: '5px' }}>
            <p style={{ fontSize: '11px', color: secondaryText, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '6px' }}>This Week</p>
            <p style={{ fontSize: '24px', fontWeight: 600, color: textColor }}>
              {conversations.filter(c => {
                const date = new Date(c.created_at);
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return date > weekAgo;
              }).length}
            </p>
          </div>
          <div style={{ backgroundColor: bgColor, padding: '16px', border: `1px solid ${borderColor}`, borderRadius: '5px' }}>
            <p style={{ fontSize: '11px', color: secondaryText, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '6px' }}>Avg Replies</p>
            <p style={{ fontSize: '24px', fontWeight: 600, color: textColor }}>
              {Math.round(conversations.reduce((sum, c) => sum + (c.reply_count || 0), 0) / conversations.length)}
            </p>
          </div>
        </div>
      )}

      {/* Conversations List */}
      {filteredConversations.length === 0 ? (
        <div style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '48px', textAlign: 'center' }}>
          <p style={{ color: textColor, fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>No conversations found</p>
          <p style={{ color: secondaryText, fontSize: '13px' }}>
            {searchQuery ? 'Try adjusting your search' : 'Start a new conversation to get started'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredConversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => navigate(`/conversations/${conv.id}`)}
              style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '16px', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.backgroundColor = '#1f2937'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = borderColor; e.currentTarget.style.backgroundColor = bgColor; }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                    <span style={{ padding: '3px 8px', fontSize: '11px', fontWeight: 600, border: `1px solid ${borderColor}`, borderRadius: '3px', backgroundColor: hoverBg, color: textColor, textTransform: 'capitalize' }}>
                      {conv.post_type || 'Discussion'}
                    </span>
                    {conv.is_closed && (
                      <span style={{ padding: '3px 8px', backgroundColor: hoverBg, border: `1px solid ${borderColor}`, borderRadius: '3px', color: secondaryText, fontSize: '11px', fontWeight: 600 }}>Closed</span>
                    )}
                  </div>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: textColor, marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {conv.title || conv.question || 'Untitled'}
                  </h3>
                  <p style={{ color: secondaryText, fontSize: '13px', marginBottom: '10px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {conv.content || conv.description || 'No description'}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: secondaryText }}>
                    <div>{new Date(conv.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                    <div>{conv.reply_count || 0} replies</div>
                    <div>{conv.view_count || 0} views</div>
                  </div>
                </div>
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  {(conv.author_avatar || conv.author?.avatar) ? (
                    <img src={conv.author_avatar || conv.author?.avatar} alt={conv.author} style={{ width: '36px', height: '36px', borderRadius: '5px', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '36px', height: '36px', borderRadius: '5px', backgroundColor: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ color: '#ffffff', fontSize: '13px', fontWeight: 600 }}>
                        {(conv.author || conv.author_name || 'U')?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <p style={{ fontSize: '11px', color: secondaryText, marginTop: '6px', fontWeight: 500 }}>{conv.author || conv.author_name}</p>
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
