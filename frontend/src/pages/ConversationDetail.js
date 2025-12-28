import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeftIcon, PlusIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import MentionTagInput from '../components/MentionTagInput';
import HighlightedText from '../components/HighlightedText';
import DeveloperInsights from '../components/DeveloperInsights';

const ReplyItem = ({ reply, depth = 0, onReply, onEdit, onDelete, currentUserId }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(reply.content);

  const handleSave = async () => {
    await onEdit(reply.id, editContent);
    setIsEditing(false);
  };

  return (
    <div className={`${depth > 0 ? 'ml-12 mt-4' : ''}`}>
      <div className="bg-white border border-gray-200 p-6 hover:shadow-sm transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Link to="/profile" className="w-10 h-10 bg-gray-900 flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {reply.author?.charAt(0).toUpperCase()}
              </span>
            </Link>
            <div>
              <Link to="/profile" className="font-medium text-gray-900 hover:text-blue-600 transition-colors">{reply.author}</Link>
              <div className="text-sm text-gray-500">
                {new Date(reply.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>
          {reply.author_id === currentUserId && (
            <div className="flex space-x-2">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
              >
                {isEditing ? 'Cancel' : 'Edit'}
              </button>
              <button
                onClick={() => onDelete(reply.id)}
                className="text-sm text-red-600 hover:text-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          )}
        </div>
        {isEditing ? (
          <div>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              rows={3}
            />
            <button
              onClick={handleSave}
              className="mt-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Save
            </button>
          </div>
        ) : (
          <>
            <p className="text-gray-700 whitespace-pre-wrap mb-4">
              <HighlightedText text={reply.content} />
            </p>
            <button
              onClick={() => onReply(reply.id)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              Reply
            </button>
          </>
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
  const [conversation, setConversation] = useState(null);
  const [replies, setReplies] = useState([]);
  const [newReply, setNewReply] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [impactLevel, setImpactLevel] = useState('medium');
  const [editHistory, setEditHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkId, setBookmarkId] = useState(null);
  const [bookmarkNote, setBookmarkNote] = useState('');
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);
  const [simpleExplanation, setSimpleExplanation] = useState('');
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [reactions, setReactions] = useState({ reactions: [], user_reaction: null });
  const [complexity, setComplexity] = useState(null);
  const [showComplexityWarning, setShowComplexityWarning] = useState(false);
  const [timeline, setTimeline] = useState([]);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closureSummary, setClosureSummary] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUserId(user.id);
    fetchConversation();
    fetchReplies();
    fetchHistory();
    fetchBookmarkStatus();
    fetchReactions();
    checkComplexity();
  }, [id]);

  const fetchConversation = async () => {
    try {
      const response = await api.get(`/api/conversations/${id}/`);
      setConversation(response.data);
      setEditTitle(response.data.title);
      setEditContent(response.data.content);
    } catch (error) {
      console.error('Failed to fetch conversation:', error);
    }
  };

  const fetchReplies = async () => {
    try {
      const response = await api.get(`/api/conversations/${id}/replies/`);
      setReplies(response.data);
    } catch (error) {
      console.error('Failed to fetch replies:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await api.get(`/api/conversations/${id}/history/`);
      setEditHistory(response.data);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  };

  const fetchBookmarkStatus = async () => {
    try {
      const response = await api.get(`/api/conversations/${id}/bookmark-status/`);
      setBookmarked(response.data.bookmarked);
      setBookmarkId(response.data.bookmark_id);
      setBookmarkNote(response.data.note || '');
    } catch (error) {
      console.error('Failed to fetch bookmark status:', error);
    }
  };

  const fetchReactions = async () => {
    try {
      const response = await api.get(`/api/conversations/${id}/reactions/`);
      setReactions(response.data);
    } catch (error) {
      console.error('Failed to fetch reactions:', error);
    }
  };

  const handleReaction = async (type) => {
    try {
      if (reactions.user_reaction === type) {
        await api.delete(`/api/conversations/${id}/reactions/remove/`);
      } else {
        await api.post(`/api/conversations/${id}/reactions/add/`, { reaction_type: type });
      }
      fetchReactions();
    } catch (error) {
      console.error('Failed to update reaction:', error);
    }
  };

  const checkComplexity = async () => {
    try {
      const response = await api.post(`/api/conversations/${id}/complexity/`);
      if (response.data.is_complex && response.data.complexity_score > 60) {
        setComplexity(response.data);
        setShowComplexityWarning(true);
      }
    } catch (error) {
      console.error('Failed to check complexity:', error);
    }
  };

  const fetchTimeline = async () => {
    try {
      const response = await api.get(`/api/conversations/${id}/timeline/`);
      setTimeline(response.data.timeline || []);
    } catch (error) {
      console.error('Failed to fetch timeline:', error);
    }
  };

  const handleCloseConversation = async () => {
    try {
      await api.post(`/api/conversations/${id}/close/`, {
        summary: closureSummary,
        next_steps: nextSteps,
        owner_id: currentUserId
      });
      setShowCloseModal(false);
      alert('Conversation closed successfully!');
      fetchConversation();
    } catch (error) {
      alert('Failed to close conversation');
    }
  };

  const handleMarkCrisis = async () => {
    try {
      await api.post(`/api/conversations/${id}/crisis/`, { is_crisis: !conversation.is_crisis });
      fetchConversation();
    } catch (error) {
      alert('Failed to update crisis status');
    }
  };

  const handleGenerateShareLink = async () => {
    try {
      const response = await api.post(`/api/conversations/${id}/share/`);
      setShareUrl(window.location.origin + response.data.share_url);
      navigator.clipboard.writeText(window.location.origin + response.data.share_url);
      alert('Share link copied to clipboard!');
    } catch (error) {
      alert('Failed to generate share link');
    }
  };

  const handleSubmitReply = async (e) => {
    e.preventDefault();
    if (!newReply.trim()) return;

    setSubmitting(true);
    try {
      await api.post(`/api/conversations/${id}/replies/`, {
        content: newReply,
        parent_reply_id: replyingTo
      });
      setNewReply('');
      setReplyingTo(null);
      fetchReplies();
    } catch (error) {
      console.error('Failed to submit reply:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const buildReplyTree = (replies) => {
    const map = {};
    const roots = [];
    
    replies.forEach(reply => {
      map[reply.id] = { ...reply, children: [] };
    });
    
    replies.forEach(reply => {
      if (reply.parent_reply) {
        if (map[reply.parent_reply]) {
          map[reply.parent_reply].children.push(map[reply.id]);
        }
      } else {
        roots.push(map[reply.id]);
      }
    });
    
    return roots;
  };

  const handleEditPost = async () => {
    try {
      await api.put(`/api/conversations/${id}/`, {
        title: editTitle,
        content: editContent
      });
      setIsEditingPost(false);
      fetchConversation();
    } catch (error) {
      console.error('Failed to update:', error);
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm('Delete this conversation?')) return;
    try {
      await api.delete(`/api/conversations/${id}/`);
      window.location.href = '/conversations';
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const handleEditReply = async (replyId, content) => {
    try {
      await api.put(`/api/conversations/replies/${replyId}/`, { content });
      fetchReplies();
    } catch (error) {
      console.error('Failed to update reply:', error);
    }
  };

  const handleDeleteReply = async (replyId) => {
    if (!window.confirm('Delete this reply?')) return;
    try {
      await api.delete(`/api/conversations/replies/${replyId}/`);
      fetchReplies();
    } catch (error) {
      console.error('Failed to delete reply:', error);
    }
  };

  const handleConvertToDecision = async () => {
    try {
      const response = await api.post(`/api/decisions/convert/${id}/`, { impact_level: impactLevel });
      alert('Converted to decision!');
      setShowConvertModal(false);
      window.location.href = `/decisions/${response.data.id}`;
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to convert');
    }
  };

  const handleBookmark = async () => {
    if (bookmarked) {
      setShowBookmarkModal(true);
    } else {
      try {
        const response = await api.post('/api/conversations/bookmarks/', {
          conversation_id: id,
          note: ''
        });
        setBookmarked(true);
        setBookmarkId(response.data.id);
      } catch (error) {
        alert('Failed to bookmark');
      }
    }
  };

  const handleSaveBookmark = async () => {
    try {
      await api.post('/api/conversations/bookmarks/', {
        conversation_id: id,
        note: bookmarkNote
      });
      setShowBookmarkModal(false);
      fetchBookmarkStatus();
    } catch (error) {
      alert('Failed to save note');
    }
  };

  const handleRemoveBookmark = async () => {
    try {
      await api.delete(`/api/conversations/bookmarks/${bookmarkId}/`);
      setBookmarked(false);
      setBookmarkId(null);
      setBookmarkNote('');
      setShowBookmarkModal(false);
    } catch (error) {
      alert('Failed to remove bookmark');
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await api.post(`/api/conversations/${id}/status/`, { status_label: newStatus });
      fetchConversation();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleExplainSimply = async () => {
    setLoadingExplanation(true);
    try {
      const response = await api.post(`/api/conversations/${id}/explain/`);
      setSimpleExplanation(response.data.simple_explanation);
    } catch (error) {
      alert('Failed to generate explanation');
    } finally {
      setLoadingExplanation(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="text-center py-20">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Conversation Not Found</h3>
        <Link to="/conversations" className="text-gray-600 hover:text-gray-900">
          ← Back to Conversations
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex gap-8">
      {/* Main Content */}
      <div className="flex-1">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-6">
          <Link 
            to="/conversations" 
            className="inline-flex items-center text-sm text-gray-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Conversations
          </Link>
          {conversation.author_id === currentUserId && (
            <div className="flex space-x-3">
              <button
                onClick={() => setIsEditingPost(!isEditingPost)}
                className="px-4 py-2 border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {isEditingPost ? 'Cancel' : 'Edit'}
              </button>
              <button
                onClick={handleDeletePost}
                className="px-4 py-2 bg-red-600 text-sm text-white hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-3 mb-6">
          <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium">
            {conversation.post_type}
          </span>
          <select
            value={conversation.status_label}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="px-3 py-1 border border-gray-300 text-xs font-medium focus:outline-none focus:border-blue-500"
          >
            <option value="open">Open</option>
            <option value="good_example">✓ Good Example</option>
            <option value="needs_followup">⚠ Needs Follow-up</option>
            <option value="resolved">✓ Resolved</option>
            <option value="in_progress">→ In Progress</option>
          </select>
          <span className="text-xs text-gray-500">
            {new Date(conversation.created_at).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
          </span>
        </div>
        
        <h1 className="text-3xl font-semibold text-gray-900 mb-6">{conversation.title}</h1>
        
        <div className="flex items-center space-x-3">
          <Link to="/profile" className="w-10 h-10 bg-gray-900 flex items-center justify-center">
            <span className="text-white font-medium text-sm">
              {conversation.author?.charAt(0).toUpperCase()}
            </span>
          </Link>
          <div>
            <Link to="/profile" className="font-medium text-gray-900 hover:text-blue-600 transition-colors">{conversation.author}</Link>
            <div className="text-sm text-gray-500">Author</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white border border-gray-200 mb-8">
        {/* Complexity Warning */}
        {showComplexityWarning && complexity && (
          <div className="border-b border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-t-2xl">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-yellow-900 mb-2 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  New Team Member Alert
                </h3>
                <p className="text-sm text-yellow-900 mb-3">
                  This conversation may be hard for a new team member to understand.
                </p>
                {complexity.acronyms?.length > 0 && (
                  <div className="mb-2">
                    <span className="text-xs font-semibold text-yellow-900">Acronyms Found:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {complexity.acronyms.map((acr, idx) => (
                        <span key={idx} className="px-3 py-1 bg-yellow-600 text-white text-xs font-medium rounded-full">
                          {acr}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {complexity.issues?.length > 0 && (
                  <div className="mb-2">
                    <span className="text-xs font-semibold text-yellow-900">Issues:</span>
                    <ul className="list-disc list-inside text-sm text-yellow-900 mt-1">
                      {complexity.issues.map((issue, idx) => (
                        <li key={idx}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowComplexityWarning(false)}
                className="text-yellow-900 hover:text-yellow-700 ml-4 p-1 rounded-lg hover:bg-yellow-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <button
              onClick={handleExplainSimply}
              disabled={loadingExplanation}
              className="px-4 py-2 bg-yellow-600 text-white hover:bg-yellow-700 font-medium rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {loadingExplanation ? 'Generating...' : 'Get Simple Explanation'}
            </button>
          </div>
        )}
        
        <div className="p-8">
          {isEditingPost ? (
            <div>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full text-4xl font-bold mb-4 p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                rows={8}
              />
              <button
                onClick={handleEditPost}
                className="mt-4 px-6 py-3 bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          ) : (
            <div className="prose max-w-none">
              <div className="text-lg leading-relaxed text-gray-700 whitespace-pre-wrap">
                <HighlightedText text={conversation.content} />
              </div>
            </div>
          )}
        </div>
        
        {/* Reactions */}
        <div className="border-t border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => handleReaction('agree')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                reactions.user_reaction === 'agree'
                  ? 'bg-green-600 text-white shadow-md'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              👍 Agree {reactions.reactions.find(r => r.reaction_type === 'agree')?.count || 0}
            </button>
            <button
              onClick={() => handleReaction('unsure')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                reactions.user_reaction === 'unsure'
                  ? 'bg-yellow-600 text-white shadow-md'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              🤔 Unsure {reactions.reactions.find(r => r.reaction_type === 'unsure')?.count || 0}
            </button>
            <button
              onClick={() => handleReaction('concern')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                reactions.user_reaction === 'concern'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              👎 Concern {reactions.reactions.find(r => r.reaction_type === 'concern')?.count || 0}
            </button>
          </div>
        </div>
      </div>

      {/* Replies */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">
          Replies ({replies.length})
        </h2>
        
        <div className="space-y-6">
          {buildReplyTree(replies).map((reply) => (
            <ReplyItem 
              key={reply.id} 
              reply={reply} 
              onReply={setReplyingTo} 
              onEdit={handleEditReply}
              onDelete={handleDeleteReply}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      </div>

      {/* Reply Form */}
      <div className="bg-white border border-gray-200 p-6">
        {replyingTo && (
          <div className="mb-4 p-4 bg-blue-50 border-l-4 border-blue-600">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-900 font-medium">Replying to a comment</span>
              <button
                onClick={() => setReplyingTo(null)}
                className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        <h3 className="font-semibold text-gray-900 mb-4 text-sm">
          {replyingTo ? 'Add Reply' : 'Add Comment'}
        </h3>
        <form onSubmit={handleSubmitReply}>
          <MentionTagInput
            value={newReply}
            onChange={(e) => setNewReply(e.target.value)}
            placeholder="Share your thoughts... Use @username to mention"
            rows={4}
          />
          <button
            type="submit"
            disabled={submitting || !newReply.trim()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50 mt-4"
          >
            {submitting ? 'Posting...' : 'Post Reply'}
          </button>
        </form>
      </div>

      {/* Developer Insights */}
      <DeveloperInsights conversationId={id} />
      </div>

      {/* Sidebar */}
      <div className="w-96 flex-shrink-0 sticky top-4 self-start space-y-6">
        {/* Why This Matters */}
        {conversation.why_this_matters && (
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl shadow-md border border-yellow-200 p-6">
            <h3 className="font-semibold text-yellow-900 mb-3 text-sm flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
              </svg>
              Why This Matters
            </h3>
            <p className="text-sm text-yellow-900 leading-relaxed">{conversation.why_this_matters}</p>
          </div>
        )}

        {/* Convert to Decision */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 text-sm">
            Actions
          </h3>
          {conversation.is_crisis && (
            <div className="mb-3 px-4 py-2 bg-gray-900 text-white text-xs font-semibold rounded-lg text-center shadow-md">
              CRISIS MODE
            </div>
          )}
          <div className="space-y-2">
          <button
            onClick={handleMarkCrisis}
            className={`w-full px-4 py-3 font-medium text-sm rounded-lg transition-all ${
              conversation.is_crisis
                ? 'bg-gray-900 text-white hover:bg-gray-800 shadow-md'
                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {conversation.is_crisis ? '✓ Crisis Mode Active' : 'Mark as Crisis'}
          </button>
          <button
            onClick={handleBookmark}
            className={`w-full px-4 py-3 font-medium text-sm rounded-lg transition-all ${
              bookmarked
                ? 'bg-gray-900 text-white hover:bg-gray-800 shadow-md'
                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {bookmarked ? '★ Bookmarked' : '☆ Bookmark'}
          </button>
          <button
            onClick={() => setShowCloseModal(true)}
            disabled={conversation.is_closed}
            className="w-full px-4 py-3 bg-gray-900 text-white hover:bg-gray-800 font-medium text-sm rounded-lg transition-all disabled:opacity-50 shadow-md"
          >
            {conversation.is_closed ? '✓ Closed' : 'Wrap Up & Close'}
          </button>
          <button
            onClick={handleGenerateShareLink}
            className="w-full px-4 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-sm rounded-lg transition-all"
          >
            Share Link
          </button>
          <button
            onClick={() => setShowConvertModal(true)}
            className="w-full px-4 py-3 bg-gray-900 text-white hover:bg-gray-800 font-medium text-sm rounded-lg transition-all shadow-md"
          >
            Convert to Decision
          </button>
          {editHistory.length > 0 && (
            <button
              onClick={() => {
                setShowHistory(!showHistory);
                if (!showHistory && timeline.length === 0) fetchTimeline();
              }}
              className="w-full px-4 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-sm rounded-lg transition-all"
            >
              {showHistory ? 'Hide' : 'Show'} History
            </button>
          )}
          <button
            onClick={() => {
              setShowTimeline(!showTimeline);
              if (!showTimeline && timeline.length === 0) fetchTimeline();
            }}
            className="w-full px-4 py-3 bg-gray-900 text-white hover:bg-gray-800 font-medium text-sm rounded-lg transition-all shadow-md"
          >
            {showTimeline ? 'Hide' : 'Show'} Timeline
          </button>
          </div>
        </div>

        {/* Edit History */}
        {showHistory && editHistory.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm">
              Edit History
            </h3>
            <div className="space-y-3">
              {editHistory.map((edit) => (
                <div key={edit.id} className="pb-3 border-b border-gray-200 last:border-0">
                  <div className="text-xs text-gray-500 mb-1">
                    {new Date(edit.edited_at).toLocaleDateString()} by {edit.edited_by}
                  </div>
                  <div className="text-xs font-semibold text-gray-900 mb-1">{edit.field_changed}</div>
                  <div className="text-xs text-red-600 line-through mb-1">{edit.old_value}</div>
                  <div className="text-xs text-green-600">{edit.new_value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Full Timeline */}
        {showTimeline && timeline.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm">
              Timeline
            </h3>
            <div className="space-y-3">
              {timeline.map((item, idx) => (
                <div key={idx} className="flex items-start space-x-3 pb-3 border-b border-gray-200 last:border-0">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                    item.type === 'created' ? 'bg-gray-900' :
                    item.type === 'edited' ? 'bg-blue-600' :
                    item.type === 'decision' ? 'bg-green-600' :
                    'bg-purple-600'
                  }`}></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-900">{item.type}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(item.date).toLocaleDateString()}
                      </span>
                    </div>
                    {item.id && item.type === 'related' ? (
                      <Link to={`/conversations/${item.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-700">
                        {item.title}
                      </Link>
                    ) : item.id && item.type === 'decision' ? (
                      <Link to={`/decisions/${item.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-700">
                        {item.title}
                      </Link>
                    ) : (
                      <p className="text-sm font-medium text-gray-900">{item.title}</p>
                    )}
                    {item.author && (
                      <p className="text-xs text-gray-600 mt-1">by {item.author}</p>
                    )}
                    {item.details && (
                      <p className="text-xs text-gray-600 mt-1">{item.details}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary */}
        {conversation.ai_summary && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm">
              Summary
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed mb-4">{conversation.ai_summary}</p>
            <button
              onClick={handleExplainSimply}
              disabled={loadingExplanation}
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg font-medium text-xs rounded-lg transition-all disabled:opacity-50"
            >
              {loadingExplanation ? 'Generating...' : 'Explain Like I\'m New'}
            </button>
            {simpleExplanation && (
              <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-600 rounded-lg">
                <p className="text-xs font-semibold text-blue-900 mb-2">Simple Explanation</p>
                <p className="text-sm text-blue-900 leading-relaxed">{simpleExplanation}</p>
              </div>
            )}
          </div>
        )}

        {/* Action Items */}
        {conversation.ai_action_items?.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm">
              Action Items
            </h3>
            <div className="space-y-3">
              {conversation.ai_action_items.map((item, idx) => (
                <div key={idx} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="text-sm text-gray-700 font-medium">{item.title}</p>
                    {item.priority && (
                      <span className="text-xs text-gray-500">{item.priority}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Keywords */}
        {conversation.ai_keywords?.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm">
              Keywords
            </h3>
            <div className="flex flex-wrap gap-2">
              {conversation.ai_keywords.map((keyword, idx) => (
                <span key={idx} className="px-3 py-1.5 bg-gradient-to-r from-blue-100 to-purple-100 text-gray-900 text-xs font-medium rounded-full">
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 text-sm">
            Stats
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Views</span>
              <span className="text-sm font-semibold text-gray-900">{conversation.view_count}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Replies</span>
              <span className="text-sm font-semibold text-gray-900">{conversation.reply_count}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Created</span>
              <span className="text-sm font-semibold text-gray-900">
                {new Date(conversation.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Convert Modal */}
      {showConvertModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Convert to Decision</h2>
            <p className="text-gray-600 mb-6">
              This will create a decision record from this conversation.
            </p>
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Impact Level
              </label>
              <select
                value={impactLevel}
                onChange={(e) => setImpactLevel(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleConvertToDecision}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg font-medium transition-all"
              >
                Convert
              </button>
              <button
                onClick={() => setShowConvertModal(false)}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bookmark Modal */}
      {showBookmarkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Bookmark Note</h2>
            <p className="text-sm text-gray-600 mb-4">Add a private note to remember why this is important</p>
            <textarea
              value={bookmarkNote}
              onChange={(e) => setBookmarkNote(e.target.value)}
              placeholder="Your private note..."
              className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 mb-6"
              rows={4}
            />
            <div className="flex space-x-3">
              <button
                onClick={handleSaveBookmark}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg font-medium transition-all"
              >
                Save Note
              </button>
              <button
                onClick={handleRemoveBookmark}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-all"
              >
                Remove
              </button>
              <button
                onClick={() => setShowBookmarkModal(false)}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Conversation Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Wrap Up Conversation</h2>
            <p className="text-sm text-gray-600 mb-6">
              Summarize what was decided and what happens next.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                What Was Decided?
              </label>
              <textarea
                value={closureSummary}
                onChange={(e) => setClosureSummary(e.target.value)}
                placeholder="Key decisions and outcomes..."
                className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                rows={3}
              />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                What's Next?
              </label>
              <textarea
                value={nextSteps}
                onChange={(e) => setNextSteps(e.target.value)}
                placeholder="Action items and next steps..."
                className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                rows={3}
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleCloseConversation}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-all"
              >
                Close Conversation
              </button>
              <button
                onClick={() => setShowCloseModal(false)}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-all"
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

export default ConversationDetail;