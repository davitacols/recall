import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, ChatBubbleLeftIcon, HandThumbUpIcon, ExclamationTriangleIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../utils/ThemeAndAccessibility';
import api from '../services/api';
import MentionTagInput from '../components/MentionTagInput';
import HighlightedText from '../components/HighlightedText';
import { FavoriteButton, ExportButton, UndoRedoButtons } from '../components/QuickWinFeatures';

const ReplyItem = ({ reply, depth = 0, onReply, onEdit, onDelete, currentUserId }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(reply.content);

  const handleSave = async () => {
    await onEdit(reply.id, editContent);
    setIsEditing(false);
  };

  return (
    <div className={`${depth > 0 ? 'ml-8' : ''}`}>
      <div className="bg-gray-50 border border-gray-200 p-4 hover:border-gray-300 transition-colors">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">
                {typeof reply.author === 'string' ? reply.author.charAt(0).toUpperCase() : reply.author?.username?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {typeof reply.author === 'string' ? reply.author : reply.author?.username}
              </p>
              <p className="text-xs text-gray-500">
                {new Date(reply.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          {reply.author_id === currentUserId && (
            <div className="flex gap-2">
              <button onClick={() => setIsEditing(!isEditing)} className="text-xs text-gray-600 hover:text-gray-900">
                {isEditing ? 'Cancel' : 'Edit'}
              </button>
              <button onClick={() => onDelete(reply.id)} className="text-xs text-gray-600 hover:text-gray-900">
                Delete
              </button>
            </div>
          )}
        </div>
        {isEditing ? (
          <div>
            <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="w-full p-2 border border-gray-300 text-sm" rows={2} />
            <button onClick={handleSave} className="mt-2 px-3 py-1 bg-gray-900 text-white text-xs hover:bg-black">
              Save
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-700">{reply.content}</p>
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

  const bgColor = darkMode ? '#1a1a1a' : '#ffffff';
  const textColor = darkMode ? '#ffffff' : '#111827';
  const borderColor = darkMode ? '#333333' : '#e5e7eb';
  const hoverBg = darkMode ? '#2a2a2a' : '#f3f4f6';
  const secondaryText = darkMode ? '#9ca3af' : '#6b7280';

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
    if (!window.confirm('Delete this conversation?')) return;
    setDeletingPost(true);
    try {
      await api.delete(`/api/recall/conversations/${id}/`);
      window.location.href = '/conversations';
    } catch (error) {
      console.error('Failed to delete:', error);
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
    if (!window.confirm('Delete this reply?')) return;
    try {
      await api.delete(`/api/recall/conversations/replies/${replyId}/`);
      fetchReplies();
    } catch (error) {
      console.error('Failed to delete reply:', error);
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
        <div>
          <div style={{ maxWidth: '100%', margin: '0 auto', paddingLeft: '32px', paddingRight: '32px', paddingTop: '48px' }}>
            <Link to="/conversations" style={{ display: 'inline-flex', alignItems: 'center', fontSize: '14px', color: secondaryText, textDecoration: 'none', marginBottom: '32px', fontWeight: 500 }}>
              <ArrowLeftIcon style={{ width: '16px', height: '16px', marginRight: '8px' }} />
              Back to Conversations
            </Link>
            <div style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, padding: '32px' }}>
              <h1 style={{ fontSize: '36px', fontWeight: 700, color: textColor, marginBottom: '8px' }}>Create New Conversation</h1>
              <p style={{ color: secondaryText, marginBottom: '32px' }}>Start a new conversation to capture team discussions and decisions.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
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
                    style={{ padding: '16px', border: `1px solid ${borderColor}`, backgroundColor: bgColor, color: textColor, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
                    onMouseEnter={(e) => { e.target.style.borderColor = '#111827'; e.target.style.backgroundColor = hoverBg; }}
                    onMouseLeave={(e) => { e.target.style.borderColor = borderColor; e.target.style.backgroundColor = bgColor; }}
                  >
                    <p style={{ fontWeight: 600, color: textColor }}>{label}</p>
                    <p style={{ fontSize: '14px', color: secondaryText }}>{desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div>
        <div style={{ maxWidth: '100%', margin: '0 auto', paddingLeft: '32px', paddingRight: '32px', paddingTop: '48px' }}>
          <button
            onClick={() => setSelectedType(null)}
            style={{ display: 'inline-flex', alignItems: 'center', fontSize: '14px', color: secondaryText, textDecoration: 'none', marginBottom: '32px', fontWeight: 500, backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <ArrowLeftIcon style={{ width: '16px', height: '16px', marginRight: '8px' }} />
            Back
          </button>
          <div style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, padding: '32px', maxWidth: '40rem' }}>
            <h1 style={{ fontSize: '36px', fontWeight: 700, color: textColor, marginBottom: '32px' }}>Create {formData.post_type.charAt(0).toUpperCase() + formData.post_type.slice(1)}</h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: textColor, marginBottom: '8px' }}>Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter conversation title"
                  style={{ width: '100%', paddingLeft: '16px', paddingRight: '16px', paddingTop: '12px', paddingBottom: '12px', border: `1px solid ${borderColor}`, backgroundColor: bgColor, color: textColor, outline: 'none', transition: 'all 0.2s' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: textColor, marginBottom: '8px' }}>Content</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Enter conversation content"
                  rows={8}
                  style={{ width: '100%', paddingLeft: '16px', paddingRight: '16px', paddingTop: '12px', paddingBottom: '12px', border: `1px solid ${borderColor}`, backgroundColor: bgColor, color: textColor, outline: 'none', transition: 'all 0.2s' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: textColor, marginBottom: '8px' }}>Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  style={{ width: '100%', paddingLeft: '16px', paddingRight: '16px', paddingTop: '12px', paddingBottom: '12px', border: `1px solid ${borderColor}`, backgroundColor: bgColor, color: textColor, outline: 'none', transition: 'all 0.2s' }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '16px', paddingTop: '16px' }}>
                <button
                  onClick={handleCreateConversation}
                  disabled={creating}
                  style={{ flex: 1, paddingLeft: '24px', paddingRight: '24px', paddingTop: '12px', paddingBottom: '12px', backgroundColor: '#111827', color: '#ffffff', border: 'none', fontWeight: 600, cursor: 'pointer', opacity: creating ? 0.5 : 1, transition: 'all 0.2s' }}
                  onMouseEnter={(e) => !creating && (e.target.style.backgroundColor = '#000000')}
                  onMouseLeave={(e) => !creating && (e.target.style.backgroundColor = '#111827')}
                >
                  {creating ? 'Creating...' : 'Create Conversation'}
                </button>
                <button
                  onClick={() => setSelectedType(null)}
                  style={{ flex: 1, paddingLeft: '24px', paddingRight: '24px', paddingTop: '12px', paddingBottom: '12px', border: `1px solid ${borderColor}`, backgroundColor: bgColor, color: textColor, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = hoverBg}
                  onMouseLeave={(e) => e.target.style.backgroundColor = bgColor}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid #111827', borderTop: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '24px', fontWeight: 700, color: textColor, marginBottom: '16px' }}>Conversation Not Found</h3>
          <Link to="/conversations" style={{ color: secondaryText, textDecoration: 'none', fontWeight: 500 }}>
            ← Back to Conversations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-full mx-auto px-8 py-8">
        <Link to="/conversations" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-8 font-medium">
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back
        </Link>

        <div className="bg-white border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gray-900 px-8 py-8">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {isEditingPost ? (
                  <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full text-4xl font-bold text-white bg-gray-900 border-0 focus:outline-none mb-4" />
                ) : (
                  <h1 className="text-4xl font-bold text-white mb-4">{conversation.title}</h1>
                )}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">
                      {typeof conversation.author === 'string' ? conversation.author.charAt(0).toUpperCase() : conversation.author?.username?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-white font-semibold">
                      {typeof conversation.author === 'string' ? conversation.author : conversation.author?.username}
                    </p>
                    <p className="text-gray-400 text-sm">{new Date(conversation.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <FavoriteButton conversationId={id} />
                <ExportButton conversationId={id} type="conversation" />
                <UndoRedoButtons />
                {conversation.author_id === currentUserId && (
                  <>
                    <button onClick={() => setIsEditingPost(!isEditingPost)} className="px-4 py-2 bg-white text-gray-900 hover:bg-gray-100 text-sm font-semibold disabled:opacity-50" disabled={savingPost || deletingPost}>
                      {isEditingPost ? 'Cancel' : 'Edit'}
                    </button>
                    <button onClick={handleDeletePost} className="px-4 py-2 bg-gray-700 text-white hover:bg-gray-800 text-sm font-semibold disabled:opacity-50" disabled={savingPost || deletingPost}>
                      {deletingPost ? 'Deleting...' : 'Delete'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-8 py-8 border-b border-gray-200">
            {isEditingPost ? (
              <div>
                <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="w-full p-4 border border-gray-300 focus:outline-none focus:border-gray-900 text-lg" rows={10} />
                <button onClick={handleEditPost} className="mt-4 px-6 py-2 bg-gray-900 text-white hover:bg-black font-semibold disabled:opacity-50" disabled={savingPost}>
                  {savingPost ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            ) : (
              <div className="text-lg leading-relaxed text-gray-800">
                <HighlightedText text={conversation.content} />
              </div>
            )}
          </div>

          {/* Reactions */}
          <div className="px-8 py-6 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-3">
              {[
                { type: 'agree', icon: HandThumbUpIcon, label: 'Agree' },
                { type: 'unsure', icon: QuestionMarkCircleIcon, label: 'Unsure' },
                { type: 'concern', icon: ExclamationTriangleIcon, label: 'Concern' }
              ].map(({ type, icon: Icon, label }) => (
                <button
                  key={type}
                  onClick={() => handleReaction(type)}
                  className={`flex items-center gap-2 px-4 py-2 font-semibold text-sm transition-colors disabled:opacity-50 ${
                    reactions.user_reaction === type
                      ? 'bg-gray-900 text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:border-gray-900'
                  }`}
                  disabled={reactionLoading}
                >
                  <Icon className="w-4 h-4" />
                  {label} ({reactions.reactions.find(r => r.reaction_type === type)?.count || 0})
                </button>
              ))}
            </div>
          </div>

          {/* Replies */}
          <div className="px-8 py-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-2">
              <ChatBubbleLeftIcon className="w-6 h-6 text-gray-900" />
              Replies ({replies.length})
            </h2>

            {replies.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 border border-gray-200">
                <ChatBubbleLeftIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">No replies yet. Be the first to comment.</p>
              </div>
            ) : (
              <div className="space-y-4 mb-8">
                {buildReplyTree(replies).map((reply) => (
                  <ReplyItem key={reply.id} reply={reply} onReply={() => {}} onEdit={handleEditReply} onDelete={handleDeleteReply} currentUserId={currentUserId} />
                ))}
              </div>
            )}

            {/* Add Reply */}
            <div className="bg-gray-50 border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Add a comment</h3>
              <form onSubmit={handleSubmitReply}>
                <MentionTagInput value={newReply} onChange={(e) => setNewReply(e.target.value)} placeholder="Share your thoughts..." rows={4} />
                <button type="submit" disabled={submitting || !newReply.trim()} className="mt-4 px-6 py-2 bg-gray-900 text-white hover:bg-black font-semibold disabled:opacity-50 transition-colors">
                  {submitting ? 'Posting...' : 'Reply'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConversationDetail;
