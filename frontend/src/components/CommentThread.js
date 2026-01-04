import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { colors, spacing, radius, shadows } from '../utils/designTokens';
import { HeartIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline';

function CommentThread({ conversationId }) {
  const [replies, setReplies] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    fetchReplies();
  }, [conversationId]);

  const fetchReplies = async () => {
    try {
      const res = await api.get(`/api/conversations/${conversationId}/replies/`);
      setReplies(res.data);
    } catch (error) {
      console.error('Failed to fetch replies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMentionInput = async (text) => {
    const match = text.match(/@(\w*)$/);
    if (match) {
      const query = match[1];
      if (query.length >= 2) {
        try {
          const res = await api.get(`/api/conversations/mention-suggestions/?q=${query}`);
          setMentionSuggestions(res.data);
          setShowSuggestions(true);
        } catch (error) {
          console.error('Failed to fetch suggestions:', error);
        }
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const handleCommentChange = (e) => {
    const text = e.target.value;
    setNewComment(text);
    handleMentionInput(text);
  };

  const insertMention = (user) => {
    const lastAtIndex = newComment.lastIndexOf('@');
    const beforeMention = newComment.substring(0, lastAtIndex);
    const afterMention = newComment.substring(newComment.length);
    setNewComment(`${beforeMention}@${user.id} `);
    setShowSuggestions(false);
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    try {
      await api.post(`/api/conversations/${conversationId}/replies/`, {
        content: newComment
      });
      setNewComment('');
      fetchReplies();
    } catch (error) {
      console.error('Failed to post comment:', error);
    }
  };

  if (loading) {
    return <div style={{ padding: spacing.lg, color: colors.secondary }}>Loading comments...</div>;
  }

  return (
    <div style={{ marginTop: spacing.xl }}>
      <h3 style={{ fontSize: '16px', fontWeight: 600, color: colors.primary, marginBottom: spacing.lg }}>
        Comments ({replies.length})
      </h3>

      {/* Comment Input */}
      <div style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.md,
        padding: spacing.lg,
        marginBottom: spacing.lg
      }}>
        <div style={{ position: 'relative', marginBottom: spacing.md }}>
          <textarea
            value={newComment}
            onChange={handleCommentChange}
            placeholder="Add a comment... (type @ to mention someone)"
            style={{
              width: '100%',
              minHeight: '80px',
              padding: spacing.md,
              border: `1px solid ${colors.border}`,
              borderRadius: radius.md,
              fontSize: '14px',
              fontFamily: 'inherit',
              boxSizing: 'border-box'
            }}
          />
          
          {showSuggestions && mentionSuggestions.length > 0 && (
            <div style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              right: 0,
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: radius.md,
              boxShadow: shadows.md,
              zIndex: 10,
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              {mentionSuggestions.map(user => (
                <button
                  key={user.id}
                  onClick={() => insertMention(user)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: spacing.md,
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderBottom: `1px solid ${colors.border}`,
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: colors.primary,
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = colors.background}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  {user.name} ({user.email})
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleSubmitComment}
          disabled={!newComment.trim()}
          style={{
            padding: `${spacing.sm} ${spacing.lg}`,
            backgroundColor: colors.primary,
            color: colors.surface,
            border: 'none',
            borderRadius: radius.md,
            cursor: newComment.trim() ? 'pointer' : 'not-allowed',
            fontSize: '13px',
            fontWeight: 500,
            opacity: newComment.trim() ? 1 : 0.5
          }}
        >
          Post Comment
        </button>
      </div>

      {/* Comments List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
        {replies.map(reply => (
          <div
            key={reply.id}
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: radius.md,
              padding: spacing.lg
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing.sm }}>
              <div style={{ fontWeight: 600, color: colors.primary, fontSize: '14px' }}>
                {reply.author}
              </div>
              <div style={{ fontSize: '12px', color: colors.secondary }}>
                {new Date(reply.created_at).toLocaleDateString()}
              </div>
            </div>
            <p style={{ fontSize: '14px', color: colors.primary, lineHeight: 1.6, marginBottom: spacing.md }}>
              {reply.content}
            </p>
            <div style={{ display: 'flex', gap: spacing.lg, fontSize: '12px' }}>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  color: colors.secondary,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <HeartIcon style={{ width: '14px', height: '14px' }} />
                Like
              </button>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  color: colors.secondary,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <ChatBubbleLeftIcon style={{ width: '14px', height: '14px' }} />
                Reply
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CommentThread;
