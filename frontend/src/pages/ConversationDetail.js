import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, ChatBubbleLeftIcon, HandThumbUpIcon, ExclamationTriangleIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../utils/ThemeAndAccessibility';
import { useToast } from '../components/Toast';
import api from '../services/api';
import MentionTagInput from '../components/MentionTagInput';
import HighlightedText from '../components/HighlightedText';
import { FavoriteButton, ExportButton, UndoRedoButtons } from '../components/QuickWinFeatures';
import { getAvatarUrl } from '../utils/avatarUtils';
import AIAssistant from '../components/AIAssistant';

const ReplyItem = ({ reply, depth = 0, onReply, onEdit, onDelete, currentUserId }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(reply.content);

  const handleSave = async () => {
    await onEdit(reply.id, editContent);
    setIsEditing(false);
  };

  const authorName = typeof reply.author === 'string' ? reply.author : reply.author?.username;
  const avatarUrl = getAvatarUrl(reply.author?.avatar || reply.author_avatar);

  return (
    <div style={{ marginLeft: depth > 0 ? '32px' : '0' }}>
      <div style={{ backgroundColor: '#1c1917', border: '1px solid #292524', borderRadius: '5px', padding: '12px', transition: 'all 0.15s' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '28px', height: '28px', backgroundColor: '#3b82f6', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt={authorName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = `<span style="color: #ffffff; font-size: 11px; font-weight: 600;">${authorName?.charAt(0).toUpperCase()}</span>`;
                }} />
              ) : (
                <span style={{ color: '#ffffff', fontSize: '11px', fontWeight: 600 }}>
                  {authorName?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#e7e5e4' }}>
                {authorName}
              </p>
              <p style={{ fontSize: '11px', color: '#a8a29e' }}>
                {new Date(reply.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          {reply.author_id === currentUserId && (
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => setIsEditing(!isEditing)} style={{ fontSize: '11px', color: '#a8a29e', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}>
                {isEditing ? 'Cancel' : 'Edit'}
              </button>
              <button onClick={() => onDelete(reply.id)} style={{ fontSize: '11px', color: '#a8a29e', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}>
                Delete
              </button>
            </div>
          )}
        </div>
        {isEditing ? (
          <div>
            <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #292524', borderRadius: '5px', backgroundColor: '#0c0a09', color: '#e7e5e4', fontSize: '13px' }} rows={2} />
            <button onClick={handleSave} style={{ marginTop: '8px', padding: '6px 12px', backgroundColor: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>
              Save
            </button>
          </div>
        ) : (
          <p style={{ fontSize: '13px', color: '#e7e5e4' }}>{reply.content}</p>
        )}
      </div>
      {reply.children?.map(child => (
        <ReplyItem key={child.id} reply={child} depth={depth + 1} onReply={onReply} onEdit={onEdit} onDelete={onDelete} currentUserId={currentUserId} />
      ))}
    </div>
  );
};

function ConversationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { darkMode } = useTheme();
  const { addToast } = useToast();
  const [conversation, setConversation] = useState(null);
  const [replies, setReplies] = useState([]);
  const [newReply, setNewReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [reactions, setReactions] = useState({ reactions: [], user_reaction: null });
  const [teamMembers, setTeamMembers] = useState([]);
  const [savingPost, setSavingPost] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);
  const [reactionLoading, setReactionLoading] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [formData, setFormData] = useState({ title: '', content: '', post_type: '', priority: 'medium' });
  const [creating, setCreating] = useState(false);
  const [converting, setConverting] = useState(false);

  const bgColor = darkMode ? '#1c1917' : '#ffffff';
  const textColor = darkMode ? '#e7e5e4' : '#111827';
  const borderColor = darkMode ? '#292524' : '#e5e7eb';
  const hoverBg = darkMode ? '#292524' : '#f3f4f6';
  const secondaryText = darkMode ? '#a8a29e' : '#6b7280';

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUserId(user.id);
    if (id !== 'new') {
      fetchConversation();
      fetchReplies();
      fetchReactions();
      fetchTeamMembers();
    } else {
      setLoading(false);
    }
  }, [id]);

  const fetchConversation = async () => {
    try {
      const response = await api.get(`/api/recall/conversations/${id}/`);
      setConversation(response.data);
      setEditTitle(response.data.title);
      setEditContent(response.data.content);
    } catch (error) {
      console.error('Failed to fetch conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReplies = async () => {
    try {
      const response = await api.get(`/api/recall/conversations/${id}/replies/`);
      setReplies(response.data);
    } catch (error) {
      console.error('Failed to fetch replies:', error);
    }
  };

  const fetchReactions = async () => {
    try {
      const response = await api.get(`/api/recall/conversations/${id}/reactions/`);
      setReactions(response.data);
    } catch (error) {
      console.error('Failed to fetch reactions:', error);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const response = await api.get('/api/organizations/team/members/');
      setTeamMembers(response.data);
    } catch (error) {
      console.error('Failed to fetch team members:', error);
    }
  };

  const handleEditPost = async () => {
    setSavingPost(true);
    try {
      await api.put(`/api/recall/conversations/${id}/`, { title: editTitle, content: editContent });
      setIsEditingPost(false);
      fetchConversation();
    } catch (error) {
      console.error('Failed to update:', error);
    } finally {
      setSavingPost(false);
    }
  };

  const handleDeletePost = async () => {
    setDeletingPost(true);
    try {
      await api.delete(`/api/recall/conversations/${id}/`);
      addToast('Conversation deleted successfully', 'success');
      window.location.href = '/conversations';
    } catch (error) {
      console.error('Failed to delete:', error);
      addToast('Failed to delete conversation', 'error');
      setDeletingPost(false);
    }
  };

  const handleEditReply = async (replyId, content) => {
    try {
      await api.put(`/api/recall/conversations/replies/${replyId}/`, { content });
      fetchReplies();
    } catch (error) {
      console.error('Failed to update reply:', error);
    }
  };

  const handleDeleteReply = async (replyId) => {
    try {
      await api.delete(`/api/recall/conversations/replies/${replyId}/`);
      addToast('Reply deleted successfully', 'success');
      fetchReplies();
    } catch (error) {
      console.error('Failed to delete reply:', error);
      addToast('Failed to delete reply', 'error');
    }
  };

  const handleSubmitReply = async (e) => {
    e.preventDefault();
    if (!newReply.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/api/recall/conversations/${id}/replies/`, { content: newReply });
      setNewReply('');
      fetchReplies();
    } catch (error) {
      console.error('Failed to submit reply:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReaction = async (type) => {
    setReactionLoading(true);
    try {
      if (reactions.user_reaction === type) {
        await api.delete(`/api/recall/conversations/${id}/reactions/remove/`);
      } else {
        await api.post(`/api/recall/conversations/${id}/reactions/add/`, { reaction_type: type });
      }
      fetchReactions();
    } catch (error) {
      console.error('Failed to update reaction:', error);
    } finally {
      setReactionLoading(false);
    }
  };

  const handleCreateConversation = async () => {
    if (!formData.title.trim() || !formData.content.trim() || !formData.post_type) {
      alert('Please fill in all fields');
      return;
    }
    setCreating(true);
    try {
      const response = await api.post('/api/recall/conversations/', formData);
      navigate(`/conversations/${response.data.id}`);
    } catch (error) {
      console.error('Failed to create conversation:', error);
      alert('Failed to create conversation');
    } finally {
      setCreating(false);
    }
  };

  const handleConvertToDecision = async () => {
    setConverting(true);
    try {
      const response = await api.post('/api/decisions/', {
        title: conversation.title,
        description: conversation.content,
        status: 'proposed',
        context: `Converted from conversation #${id}`,
        conversation_id: id
      });
      addToast('Successfully converted to decision', 'success');
      navigate(`/decisions/${response.data.id}`);
    } catch (error) {
      console.error('Failed to convert to decision:', error);
      addToast('Failed to convert to decision', 'error');
    } finally {
      setConverting(false);
    }
  };

  const buildReplyTree = (replies) => {
    const map = {};
    const roots = [];
    replies.forEach(reply => {
      map[reply.id] = { ...reply, children: [] };
    });
    replies.forEach(reply => {
      if (reply.parent_reply && map[reply.parent_reply]) {
        map[reply.parent_reply].children.push(map[reply.id]);
      } else {
        roots.push(map[reply.id]);
      }
    });
    return roots;
  };

  if (id === 'new') {
    if (!selectedType) {
      return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 24px' }}>
          <Link to="/conversations" style={{ display: 'inline-flex', alignItems: 'center', fontSize: '14px', color: '#6B778C', textDecoration: 'none', marginBottom: '40px', fontWeight: 500, transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#0052CC'} onMouseLeave={(e) => e.currentTarget.style.color = '#6B778C'}>
            <ArrowLeftIcon style={{ width: '16px', height: '16px', marginRight: '8px' }} />
            Back to Conversations
          </Link>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#172B4D', marginBottom: '12px' }}>Create New Conversation</h1>
            <p style={{ fontSize: '16px', color: '#6B778C' }}>Choose a conversation type to get started</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', maxWidth: '1000px', margin: '0 auto' }}>
            {[
              { type: 'update', label: 'Update', desc: 'Team announcements and status updates' },
              { type: 'decision', label: 'Decision', desc: 'Formal decisions with rationale' },
              { type: 'question', label: 'Question', desc: 'Questions seeking answers' },
              { type: 'proposal', label: 'Proposal', desc: 'Proposals for discussion' }
            ].map(({ type, label, desc }) => (
              <button
                key={type}
                onClick={() => {
                  setSelectedType(type);
                  setFormData({ ...formData, post_type: type });
                }}
                style={{ padding: '24px', border: '1px solid #DFE1E6', backgroundColor: '#ffffff', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#0052CC'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,82,204,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#DFE1E6'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <p style={{ fontWeight: 600, color: '#172B4D', fontSize: '16px', marginBottom: '8px' }}>{label}</p>
                <p style={{ fontSize: '14px', color: '#6B778C', lineHeight: '1.5' }}>{desc}</p>
              </button>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '48px 24px' }}>
        <button
          onClick={() => setSelectedType(null)}
          style={{ display: 'inline-flex', alignItems: 'center', fontSize: '14px', color: '#6B778C', marginBottom: '40px', fontWeight: 500, backgroundColor: 'transparent', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#0052CC'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#6B778C'}
        >
          <ArrowLeftIcon style={{ width: '16px', height: '16px', marginRight: '8px' }} />
          Back
        </button>
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #DFE1E6', borderRadius: '8px', padding: '40px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#172B4D', marginBottom: '32px' }}>Create {formData.post_type.charAt(0).toUpperCase() + formData.post_type.slice(1)}</h1>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#172B4D', marginBottom: '8px' }}>Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter conversation title"
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #DFE1E6', backgroundColor: '#ffffff', color: '#172B4D', borderRadius: '6px', fontSize: '14px', outline: 'none', transition: 'border 0.2s' }}
                onFocus={(e) => e.target.style.borderColor = '#0052CC'}
                onBlur={(e) => e.target.style.borderColor = '#DFE1E6'}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#172B4D', marginBottom: '8px' }}>Content</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Enter conversation content"
                rows={8}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #DFE1E6', backgroundColor: '#ffffff', color: '#172B4D', borderRadius: '6px', fontSize: '14px', outline: 'none', transition: 'border 0.2s', resize: 'vertical' }}
                onFocus={(e) => e.target.style.borderColor = '#0052CC'}
                onBlur={(e) => e.target.style.borderColor = '#DFE1E6'}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#172B4D', marginBottom: '8px' }}>Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #DFE1E6', backgroundColor: '#ffffff', color: '#172B4D', borderRadius: '6px', fontSize: '14px', outline: 'none', cursor: 'pointer' }}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '12px', paddingTop: '16px' }}>
              <button
                onClick={handleCreateConversation}
                disabled={creating}
                style={{ flex: 1, padding: '12px 24px', backgroundColor: '#0052CC', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', opacity: creating ? 0.6 : 1, transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,82,204,0.2)' }}
                onMouseEnter={(e) => !creating && (e.currentTarget.style.backgroundColor = '#0747A6')}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0052CC'}
              >
                {creating ? 'Creating...' : 'Create Conversation'}
              </button>
              <button
                onClick={() => setSelectedType(null)}
                style={{ flex: 1, padding: '12px 24px', border: '1px solid #DFE1E6', backgroundColor: '#ffffff', color: '#6B778C', borderRadius: '6px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F4F5F7'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
        <div style={{ width: '24px', height: '24px', border: '2px solid #292524', borderTop: '2px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div style={{ minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: textColor, marginBottom: '12px' }}>Conversation Not Found</h3>
          <Link to="/conversations" style={{ color: secondaryText, textDecoration: 'none', fontSize: '13px', fontWeight: 500 }}>
            ← Back to Conversations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
      <Link to="/conversations" style={{ display: 'inline-flex', alignItems: 'center', fontSize: '13px', color: secondaryText, textDecoration: 'none', marginBottom: '16px', fontWeight: 500 }}>
        <ArrowLeftIcon style={{ width: '14px', height: '14px', marginRight: '6px' }} />
        Back
      </Link>

      <div>
        {/* Header */}
        <div style={{ backgroundColor: bgColor, padding: '20px', borderRadius: '5px', border: `1px solid ${borderColor}`, marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ flex: 1 }}>
              {isEditingPost ? (
                <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} style={{ width: '100%', fontSize: '20px', fontWeight: 600, color: textColor, backgroundColor: bgColor, border: 'none', outline: 'none', marginBottom: '12px' }} />
              ) : (
                <h1 style={{ fontSize: '20px', fontWeight: 600, color: textColor, marginBottom: '12px' }}>{conversation.title}</h1>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', backgroundColor: '#3b82f6', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {(() => {
                    const avatarUrl = getAvatarUrl(conversation.author_avatar || conversation.author?.avatar);
                    return avatarUrl ? (
                      <img 
                        src={avatarUrl} 
                        alt={typeof conversation.author === 'string' ? conversation.author : conversation.author?.username} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const initial = typeof conversation.author === 'string' ? conversation.author.charAt(0).toUpperCase() : conversation.author?.username?.charAt(0).toUpperCase();
                          e.target.parentElement.innerHTML = `<span style="color: #ffffff; font-weight: 600; font-size: 13px;">${initial}</span>`;
                        }}
                      />
                    ) : (
                      <span style={{ color: '#ffffff', fontWeight: 600, fontSize: '13px' }}>
                        {typeof conversation.author === 'string' ? conversation.author.charAt(0).toUpperCase() : conversation.author?.username?.charAt(0).toUpperCase()}
                      </span>
                    );
                  })()}
                </div>
                <div>
                  <p style={{ color: textColor, fontWeight: 600, fontSize: '13px' }}>
                    {typeof conversation.author === 'string' ? conversation.author : conversation.author?.username}
                  </p>
                  <p style={{ color: secondaryText, fontSize: '11px' }}>{new Date(conversation.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px', marginLeft: '16px', flexWrap: 'wrap' }}>
              <button onClick={handleConvertToDecision} style={{ padding: '7px 12px', backgroundColor: 'transparent', border: '2px solid #10b981', color: '#10b981', borderRadius: '4px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', opacity: (converting || savingPost || deletingPost) ? 0.5 : 1, transition: 'all 0.15s' }} disabled={converting || savingPost || deletingPost} onMouseEnter={(e) => { if (!converting && !savingPost && !deletingPost) { e.currentTarget.style.backgroundColor = '#10b981'; e.currentTarget.style.color = '#ffffff'; } }} onMouseLeave={(e) => { if (!converting && !savingPost && !deletingPost) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#10b981'; } }}>
                {converting ? 'Converting...' : 'Convert to Decision'}
              </button>
              <FavoriteButton conversationId={id} />
              <ExportButton conversationId={id} type="conversation" />
              <UndoRedoButtons />
              {conversation.author_id === currentUserId && (
                <>
                  <button onClick={() => setIsEditingPost(!isEditingPost)} style={{ padding: '7px 12px', backgroundColor: bgColor, color: textColor, border: `1px solid ${borderColor}`, borderRadius: '4px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', opacity: (savingPost || deletingPost) ? 0.5 : 1 }} disabled={savingPost || deletingPost}>
                    {isEditingPost ? 'Cancel' : 'Edit'}
                  </button>
                  <button onClick={handleDeletePost} style={{ padding: '7px 12px', backgroundColor: '#ef4444', color: '#ffffff', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', opacity: (savingPost || deletingPost) ? 0.5 : 1 }} disabled={savingPost || deletingPost}>
                    {deletingPost ? 'Deleting...' : 'Delete'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <AIAssistant content={conversation?.content} contentType="conversation" />
        
        <div style={{ padding: '20px', border: `1px solid ${borderColor}`, borderRadius: '5px', backgroundColor: bgColor, marginBottom: '12px' }}>
          {isEditingPost ? (
            <div>
              <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} style={{ width: '100%', padding: '12px', border: `1px solid ${borderColor}`, borderRadius: '5px', backgroundColor: '#0c0a09', color: textColor, fontSize: '14px', outline: 'none' }} rows={10} />
              <button onClick={handleEditPost} style={{ marginTop: '12px', padding: '8px 14px', backgroundColor: 'transparent', border: '2px solid #3b82f6', color: '#3b82f6', borderRadius: '4px', fontWeight: 500, fontSize: '13px', cursor: 'pointer', opacity: savingPost ? 0.5 : 1, transition: 'all 0.15s' }} disabled={savingPost} onMouseEnter={(e) => { if (!savingPost) { e.currentTarget.style.backgroundColor = '#3b82f6'; e.currentTarget.style.color = '#ffffff'; } }} onMouseLeave={(e) => { if (!savingPost) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#3b82f6'; } }}>
                {savingPost ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          ) : (
            <div style={{ fontSize: '14px', lineHeight: '1.6', color: textColor }}>
              <HighlightedText text={conversation.content} />
            </div>
          )}
        </div>

        {/* Reactions */}
        <div style={{ padding: '16px', border: `1px solid ${borderColor}`, borderRadius: '5px', backgroundColor: bgColor, marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { type: 'agree', icon: HandThumbUpIcon, label: 'Agree' },
              { type: 'unsure', icon: QuestionMarkCircleIcon, label: 'Unsure' },
              { type: 'concern', icon: ExclamationTriangleIcon, label: 'Concern' }
            ].map(({ type, icon: Icon, label }) => (
              <button
                key={type}
                onClick={() => handleReaction(type)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  fontWeight: 500,
                  fontSize: '12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  opacity: reactionLoading ? 0.5 : 1,
                  backgroundColor: reactions.user_reaction === type ? '#3b82f6' : bgColor,
                  color: reactions.user_reaction === type ? '#ffffff' : textColor,
                  border: `1px solid ${reactions.user_reaction === type ? '#3b82f6' : borderColor}`
                }}
                disabled={reactionLoading}
              >
                <Icon style={{ width: '14px', height: '14px' }} />
                {label} ({reactions.reactions.find(r => r.reaction_type === type)?.count || 0})
              </button>
            ))}
          </div>
        </div>

        {/* Replies */}
        <div style={{ padding: '20px', border: `1px solid ${borderColor}`, borderRadius: '5px', backgroundColor: bgColor }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: textColor, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ChatBubbleLeftIcon style={{ width: '18px', height: '18px', color: textColor }} />
            Replies ({replies.length})
          </h2>

          {replies.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', backgroundColor: hoverBg, border: `1px solid ${borderColor}`, borderRadius: '5px', marginBottom: '16px' }}>
              <ChatBubbleLeftIcon style={{ width: '40px', height: '40px', color: borderColor, margin: '0 auto 12px' }} />
              <p style={{ color: secondaryText, fontWeight: 500, fontSize: '13px' }}>No replies yet. Be the first to comment.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              {buildReplyTree(replies).map((reply) => (
                <ReplyItem key={reply.id} reply={reply} onReply={() => {}} onEdit={handleEditReply} onDelete={handleDeleteReply} currentUserId={currentUserId} />
              ))}
            </div>
          )}

          {/* Add Reply */}
          <div style={{ backgroundColor: hoverBg, border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: textColor, marginBottom: '10px' }}>Add a comment</h3>
            <form onSubmit={handleSubmitReply}>
              <MentionTagInput value={newReply} onChange={(e) => setNewReply(e.target.value)} placeholder="Share your thoughts..." rows={4} />
              <button type="submit" disabled={submitting || !newReply.trim()} style={{ marginTop: '10px', padding: '8px 14px', backgroundColor: 'transparent', border: '2px solid #3b82f6', color: '#3b82f6', borderRadius: '4px', fontWeight: 500, fontSize: '13px', cursor: 'pointer', opacity: (submitting || !newReply.trim()) ? 0.5 : 1, transition: 'all 0.15s' }} onMouseEnter={(e) => { if (!submitting && newReply.trim()) { e.currentTarget.style.backgroundColor = '#3b82f6'; e.currentTarget.style.color = '#ffffff'; } }} onMouseLeave={(e) => { if (!submitting && newReply.trim()) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#3b82f6'; } }}>
                {submitting ? 'Posting...' : 'Reply'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConversationDetail;
