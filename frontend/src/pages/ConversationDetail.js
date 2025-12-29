import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeftIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import MentionTagInput from '../components/MentionTagInput';
import HighlightedText from '../components/HighlightedText';
import DeveloperInsights from '../components/DeveloperInsights';
import AISummaryPanel from '../components/AISummaryPanel';

const ReplyItem = ({ reply, depth = 0, onReply, onEdit, onDelete, currentUserId }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(reply.content);

  const handleSave = async () => {
    await onEdit(reply.id, editContent);
    setIsEditing(false);
  };

  return (
    <div className={`${depth > 0 ? 'ml-12 mt-4' : ''}`}>
      <div className="bg-white border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {reply.author_avatar ? (
              <img src={reply.author_avatar} alt={reply.author} className="w-10 h-10 object-cover" />
            ) : (
              <div className="w-10 h-10 bg-gray-900 flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {reply.author?.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
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
            <div className="text-lg text-gray-700 mb-4" style={{whiteSpace: 'pre-wrap', wordWrap: 'break-word'}}>
              <HighlightedText text={reply.content} />
            </div>
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
  const { user } = useAuth();
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
  const [documents, setDocuments] = useState([]);
  const [uploadComment, setUploadComment] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [showUploadBox, setShowUploadBox] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUserId(user.id);
    fetchConversation();
    fetchReplies();
    fetchHistory();
    fetchBookmarkStatus();
    fetchReactions();
    checkComplexity();
    fetchDocuments();
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

  const fetchDocuments = async () => {
    try {
      const response = await api.get(`/api/conversations/${id}/documents/`);
      setDocuments(response.data);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setShowUploadBox(true);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('comment', uploadComment);

    try {
      await api.post(`/api/conversations/${id}/documents/upload/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadComment('');
      setSelectedFile(null);
      setShowUploadBox(false);
      fetchDocuments();
    } catch (error) {
      alert('Failed to upload file');
    }
  };

  const cancelUpload = () => {
    setSelectedFile(null);
    setUploadComment('');
    setShowUploadBox(false);
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('Delete this file?')) return;
    try {
      await api.delete(`/api/conversations/documents/${docId}/`);
      fetchDocuments();
    } catch (error) {
      alert('Failed to delete file');
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
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
      <div className="flex flex-col lg:flex-row gap-12">
      {/* Main Content */}
      <div className="flex-1 max-w-4xl">
        {/* Back Button */}
        <Link 
          to="/conversations" 
          className="inline-flex items-center text-base text-gray-600 hover:text-gray-900 mb-8"
        >
          <ArrowLeftIcon className="w-5 h-5 mr-2" />
          Back to Conversations
        </Link>

        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-6">
            <span className="px-4 py-1.5 bg-gray-900 text-white text-xs font-bold uppercase tracking-wider">
              {conversation.post_type}
            </span>
            <span className="text-base text-gray-500">
              {new Date(conversation.created_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8 leading-tight">{conversation.title}</h1>
          
          <div className="flex items-center justify-between pb-8 border-b border-gray-200">
            <div className="flex items-center gap-4">
              {conversation.author_avatar ? (
                <img src={conversation.author_avatar} alt={conversation.author} className="w-12 h-12 object-cover" />
              ) : (
                <div className="w-12 h-12 bg-gray-900 flex items-center justify-center">
                  <span className="text-white font-bold">
                    {conversation.author?.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <Link to="/profile" className="text-lg font-bold text-gray-900 hover:underline">{conversation.author}</Link>
                <div className="text-sm text-gray-500">Author</div>
              </div>
            </div>
            {conversation.author_id === currentUserId && (
              <div className="flex gap-3">
                <button
                  onClick={() => setIsEditingPost(!isEditingPost)}
                  className="recall-btn-secondary text-sm"
                >
                  {isEditingPost ? 'Cancel' : 'Edit'}
                </button>
                <button
                  onClick={handleDeletePost}
                  className="px-5 py-2.5 bg-red-600 text-white hover:bg-red-700 text-sm font-bold uppercase"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="mb-12">
        {/* AI Summary Panel - Sticky */}
        <AISummaryPanel 
          conversation={conversation}
          onExplainSimply={handleExplainSimply}
          loadingExplanation={loadingExplanation}
          simpleExplanation={simpleExplanation}
        />
        
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
        
        <div className="py-8">
          {isEditingPost ? (
            <div>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full text-3xl font-bold mb-6 p-4 border border-gray-900 focus:outline-none"
              />
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full p-4 border border-gray-900 focus:outline-none text-lg"
                rows={12}
              />
              <button
                onClick={handleEditPost}
                className="recall-btn-primary mt-6"
              >
                Save Changes
              </button>
            </div>
          ) : (
            <div className="text-xl leading-relaxed text-gray-800" style={{whiteSpace: 'pre-wrap', wordWrap: 'break-word'}}>
              <HighlightedText text={conversation.content} />
            </div>
          )}
        </div>
        
        {/* Reactions */}
        <div className="pt-8 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => handleReaction('agree')}
              className={`px-6 py-3 font-medium transition-all ${
                reactions.user_reaction === 'agree'
                  ? 'bg-gray-900 text-white'
                  : 'border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white'
              }`}
            >
              👍 {reactions.reactions.find(r => r.reaction_type === 'agree')?.count || 0}
            </button>
            <button
              onClick={() => handleReaction('unsure')}
              className={`px-6 py-3 font-medium transition-all ${
                reactions.user_reaction === 'unsure'
                  ? 'bg-gray-900 text-white'
                  : 'border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white'
              }`}
            >
              🤔 {reactions.reactions.find(r => r.reaction_type === 'unsure')?.count || 0}
            </button>
            <button
              onClick={() => handleReaction('concern')}
              className={`px-6 py-3 font-medium transition-all ${
                reactions.user_reaction === 'concern'
                  ? 'bg-gray-900 text-white'
                  : 'border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white'
              }`}
            >
              👎 {reactions.reactions.find(r => r.reaction_type === 'concern')?.count || 0}
            </button>
          </div>
        </div>
      </div>

        {/* Replies */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">
            Replies
          </h2>
        
        {replies.length === 0 ? (
          <div className="text-center py-12 border border-gray-200 bg-gray-50">
            <p className="text-base text-gray-600">No replies yet. Be the first to comment.</p>
          </div>
        ) : (
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
        )}
      </div>

        {/* Reply Form */}
        <div className="border-t border-gray-200 pt-8">
        {replyingTo && (
          <div className="mb-6 p-4 bg-gray-100 border-l-4 border-gray-900">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900">Replying to a comment</span>
              <button
                onClick={() => setReplyingTo(null)}
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        <h3 className="text-xl font-bold text-gray-900 mb-6">
          {replyingTo ? 'Reply' : 'Add a comment'}
        </h3>
        <form onSubmit={handleSubmitReply}>
          <MentionTagInput
            value={newReply}
            onChange={(e) => setNewReply(e.target.value)}
            placeholder="Share your thoughts..."
            rows={5}
          />
          
          {/* File Upload Box */}
          {showUploadBox && (
            <div className="mt-4 p-4 bg-gray-50 border-2 border-gray-900">
              <div className="flex items-start gap-3 mb-3">
                <svg className="w-6 h-6 text-gray-600 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">{selectedFile?.name}</p>
                  <p className="text-xs text-gray-500">{(selectedFile?.size / 1024).toFixed(1)} KB</p>
                </div>
                <button type="button" onClick={cancelUpload} className="text-gray-600 hover:text-gray-900">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <input
                type="text"
                value={uploadComment}
                onChange={(e) => setUploadComment(e.target.value)}
                placeholder="Add a comment about this file..."
                className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-900 mb-3"
              />
              <button
                type="button"
                onClick={handleFileUpload}
                className="w-full px-4 py-3 bg-gray-900 text-white hover:bg-gray-800 font-bold uppercase text-sm"
              >
                Upload File
              </button>
            </div>
          )}
          
          <div className="flex items-center gap-4 mt-6">
            <button
              type="submit"
              disabled={submitting || !newReply.trim()}
              className="recall-btn-primary disabled:opacity-50"
            >
              {submitting ? 'Posting...' : 'Reply'}
            </button>
            <label className="px-5 py-2.5 border-2 border-gray-900 text-gray-900 hover:bg-gray-100 font-bold uppercase text-sm cursor-pointer">
              <input type="file" className="hidden" onChange={handleFileSelect} />
              Attach File
            </label>
          </div>
        </form>
        
        {/* Documents */}
        {documents.length > 0 && (
          <div className="mt-8 border-t border-gray-200 pt-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Attached files</h3>
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200">
                  <div className="flex items-center space-x-3">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div>
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="font-medium text-gray-900 hover:underline">
                        {doc.filename}
                      </a>
                      <p className="text-xs text-gray-500">{(doc.file_size / 1024).toFixed(1)} KB • {doc.uploaded_by}</p>
                      {doc.comment && <p className="text-sm text-gray-700 mt-1">{doc.comment}</p>}
                    </div>
                  </div>
                  {doc.uploaded_by === user?.full_name && (
                    <button onClick={() => handleDeleteDocument(doc.id)} className="text-red-600 hover:text-red-700 text-sm font-bold">
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

        {/* Developer Insights */}
        <DeveloperInsights conversationId={id} />
      </div>

      {/* Sidebar */}
      <div className="w-80 flex-shrink-0 space-y-8">
        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleMarkCrisis}
            className={`w-full px-5 py-3 font-medium transition-all ${
              conversation.is_crisis
                ? 'bg-gray-900 text-white'
                : 'border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white'
            }`}
          >
            {conversation.is_crisis ? '✓ Crisis Mode' : 'Mark as Crisis'}
          </button>
          <button
            onClick={handleBookmark}
            className={`w-full px-5 py-3 font-medium transition-all ${
              bookmarked
                ? 'bg-gray-900 text-white'
                : 'border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white'
            }`}
          >
            {bookmarked ? '★ Bookmarked' : '☆ Bookmark'}
          </button>
          <button
            onClick={() => setShowCloseModal(true)}
            disabled={conversation.is_closed}
            className="w-full px-5 py-3 bg-gray-900 text-white hover:bg-gray-800 font-medium transition-all disabled:opacity-50"
          >
            {conversation.is_closed ? '✓ Closed' : 'Close Conversation'}
          </button>
          <button
            onClick={handleGenerateShareLink}
            className="w-full px-5 py-3 border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white font-medium transition-all"
          >
            Share
          </button>
          <button
            onClick={() => setShowConvertModal(true)}
            className="w-full px-5 py-3 bg-gray-900 text-white hover:bg-gray-800 font-medium transition-all"
          >
            Convert to Decision
          </button>
        </div>

        {/* Stats */}
        <div className="border-t border-gray-200 pt-8">
          <h3 className="font-bold text-gray-900 mb-4">Stats</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Views</span>
              <span className="font-bold text-gray-900">{conversation.view_count}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Replies</span>
              <span className="font-bold text-gray-900">{conversation.reply_count}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Created</span>
              <span className="font-bold text-gray-900">
                {new Date(conversation.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>
        </div>

        {/* Summary */}
        {conversation.ai_summary && (
          <div className="border-t border-gray-200 pt-8">
            <h3 className="font-bold text-gray-900 mb-4">Summary</h3>
            <p className="text-gray-700 leading-relaxed mb-4">{conversation.ai_summary}</p>
            <button
              onClick={handleExplainSimply}
              disabled={loadingExplanation}
              className="w-full px-5 py-3 border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white font-medium transition-all disabled:opacity-50"
            >
              {loadingExplanation ? 'Generating...' : 'Explain Simply'}
            </button>
            {simpleExplanation && (
              <div className="mt-4 p-4 bg-gray-100 border-l-4 border-gray-900">
                <p className="text-sm font-bold text-gray-900 mb-2">Simple Explanation</p>
                <p className="text-gray-700 leading-relaxed">{simpleExplanation}</p>
              </div>
            )}
          </div>
        )}

        {/* Action Items */}
        {conversation.ai_action_items?.length > 0 && (
          <div className="border-t border-gray-200 pt-8">
            <h3 className="font-bold text-gray-900 mb-4">Action Items</h3>
            <div className="space-y-3">
              {conversation.ai_action_items.map((item, idx) => (
                <div key={idx} className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-gray-900 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-700 font-medium">{item.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Keywords */}
        {conversation.ai_keywords?.length > 0 && (
          <div className="border-t border-gray-200 pt-8">
            <h3 className="font-bold text-gray-900 mb-4">Keywords</h3>
            <div className="flex flex-wrap gap-2">
              {conversation.ai_keywords.map((keyword, idx) => (
                <span key={idx} className="px-3 py-1 bg-gray-900 text-white text-sm font-medium">
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      </div>
      </div>

      {/* Convert Modal */}
      {showConvertModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Convert to decision</h2>
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
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Save for later</h2>
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
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Close conversation</h2>
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