import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, ChatBubbleLeftIcon, HandThumbUpIcon, ExclamationTriangleIcon, QuestionMarkCircleIcon, LinkIcon, DocumentTextIcon, LightBulbIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

const ReplyItem = ({ reply, depth = 0, onEdit, onDelete, currentUserId }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(reply.content);

  const handleSave = async () => {
    await onEdit(reply.id, editContent);
    setIsEditing(false);
  };

  return (
    <div className={`${depth > 0 ? 'ml-8' : ''}`}>
      <div className="bg-gray-700 border border-gray-600 rounded-lg p-4 hover:border-gray-500 transition-colors">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {typeof reply.author === 'string' ? reply.author.charAt(0).toUpperCase() : reply.author?.username?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                {typeof reply.author === 'string' ? reply.author : reply.author?.username}
              </p>
              <p className="text-xs text-gray-400">{new Date(reply.created_at).toLocaleDateString()}</p>
            </div>
          </div>
          {reply.author_id === currentUserId && (
            <div className="flex gap-2">
              <button onClick={() => setIsEditing(!isEditing)} className="text-xs text-gray-400 hover:text-white">
                {isEditing ? 'Cancel' : 'Edit'}
              </button>
              <button onClick={() => onDelete(reply.id)} className="text-xs text-gray-400 hover:text-red-400">
                Delete
              </button>
            </div>
          )}
        </div>
        {isEditing ? (
          <div>
            <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="w-full p-2 bg-gray-600 border border-gray-500 rounded text-white text-sm" rows={2} />
            <button onClick={handleSave} className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs hover:bg-blue-700 rounded">Save</button>
          </div>
        ) : (
          <p className="text-sm text-gray-200">{reply.content}</p>
        )}
      </div>
      {reply.children?.map(child => (
        <ReplyItem key={child.id} reply={child} depth={depth + 1} onEdit={onEdit} onDelete={onDelete} currentUserId={currentUserId} />
      ))}
    </div>
  );
};

function ConversationDetailNew() {
  const { id } = useParams();
  const navigate = useNavigate();
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
  const [linkedIssues, setLinkedIssues] = useState([]);
  const [linkedDecisions, setLinkedDecisions] = useState([]);
  const [linkedKnowledge, setLinkedKnowledge] = useState([]);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUserId(user.id);
    fetchConversation();
    fetchReplies();
    fetchReactions();
    fetchLinkedItems();
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

  const fetchLinkedItems = async () => {
    try {
      const [issuesRes, decisionsRes, knowledgeRes] = await Promise.all([
        api.get(`/api/recall/conversations/${id}/linked-issues/`).catch(() => ({ data: [] })),
        api.get(`/api/recall/conversations/${id}/linked-decisions/`).catch(() => ({ data: [] })),
        api.get(`/api/recall/conversations/${id}/linked-knowledge/`).catch(() => ({ data: [] }))
      ]);
      setLinkedIssues(issuesRes.data);
      setLinkedDecisions(decisionsRes.data);
      setLinkedKnowledge(knowledgeRes.data);
    } catch (error) {
      console.error('Failed to fetch linked items:', error);
    }
  };

  const handleEditPost = async () => {
    try {
      await api.put(`/api/recall/conversations/${id}/`, { title: editTitle, content: editContent });
      setIsEditingPost(false);
      fetchConversation();
    } catch (error) {
      console.error('Failed to update:', error);
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm('Delete this conversation?')) return;
    try {
      await api.delete(`/api/recall/conversations/${id}/`);
      navigate('/conversations');
    } catch (error) {
      console.error('Failed to delete:', error);
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
    try {
      if (reactions.user_reaction === type) {
        await api.delete(`/api/recall/conversations/${id}/reactions/remove/`);
      } else {
        await api.post(`/api/recall/conversations/${id}/reactions/add/`, { reaction_type: type });
      }
      fetchReactions();
    } catch (error) {
      console.error('Failed to update reaction:', error);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent animate-spin rounded-full"></div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-white mb-4">Conversation Not Found</h3>
          <Link to="/conversations" className="text-gray-400 hover:text-white">← Back to Conversations</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Link to="/conversations" className="inline-flex items-center text-sm text-gray-400 hover:text-white mb-6 font-medium">
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back to Conversations
        </Link>

        <div className="grid grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="col-span-2 space-y-6">
            {/* Header */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  {isEditingPost ? (
                    <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full text-3xl font-bold text-white bg-gray-800 border-0 focus:outline-none mb-3" />
                  ) : (
                    <h1 className="text-3xl font-bold text-white mb-3">{conversation.title}</h1>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
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
                {conversation.author_id === currentUserId && (
                  <div className="flex gap-2 ml-4">
                    <button onClick={() => setIsEditingPost(!isEditingPost)} className="px-4 py-2 bg-gray-700 text-white hover:bg-gray-600 text-sm font-semibold rounded-lg">
                      {isEditingPost ? 'Cancel' : 'Edit'}
                    </button>
                    <button onClick={handleDeletePost} className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 text-sm font-semibold rounded-lg">
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              {isEditingPost ? (
                <div>
                  <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="w-full p-4 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gray-500 text-lg" rows={10} />
                  <button onClick={handleEditPost} className="mt-4 px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 font-semibold rounded-lg">
                    Save Changes
                  </button>
                </div>
              ) : (
                <div className="text-lg leading-relaxed text-gray-200">{conversation.content}</div>
              )}
            </div>

            {/* Reactions */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center gap-3">
                {[
                  { type: 'agree', icon: HandThumbUpIcon, label: 'Agree' },
                  { type: 'unsure', icon: QuestionMarkCircleIcon, label: 'Unsure' },
                  { type: 'concern', icon: ExclamationTriangleIcon, label: 'Concern' }
                ].map(({ type, icon: Icon, label }) => (
                  <button
                    key={type}
                    onClick={() => handleReaction(type)}
                    className={`flex items-center gap-2 px-4 py-2 font-semibold text-sm rounded-lg transition-colors ${
                      reactions.user_reaction === type
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 border border-gray-600 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label} ({reactions.reactions.find(r => r.reaction_type === type)?.count || 0})
                  </button>
                ))}
              </div>
            </div>

            {/* Replies */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <ChatBubbleLeftIcon className="w-6 h-6" />
                Replies ({replies.length})
              </h2>

              {replies.length === 0 ? (
                <div className="text-center py-12 bg-gray-700/50 border border-gray-600 rounded-lg">
                  <ChatBubbleLeftIcon className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-400 font-medium">No replies yet. Be the first to comment.</p>
                </div>
              ) : (
                <div className="space-y-4 mb-6">
                  {buildReplyTree(replies).map((reply) => (
                    <ReplyItem key={reply.id} reply={reply} onEdit={handleEditReply} onDelete={handleDeleteReply} currentUserId={currentUserId} />
                  ))}
                </div>
              )}

              {/* Add Reply */}
              <div className="bg-gray-700 rounded-lg p-4 mt-6">
                <h3 className="text-lg font-bold text-white mb-3">Add a comment</h3>
                <form onSubmit={handleSubmitReply}>
                  <textarea value={newReply} onChange={(e) => setNewReply(e.target.value)} placeholder="Share your thoughts..." rows={4} className="w-full p-3 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:border-gray-400" />
                  <button type="submit" disabled={submitting || !newReply.trim()} className="mt-3 px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 font-semibold rounded-lg disabled:opacity-50 transition-colors">
                    {submitting ? 'Posting...' : 'Reply'}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Sidebar - Linked Items */}
          <div className="space-y-6">
            {/* Linked Issues */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <LinkIcon className="w-5 h-5" />
                Linked Issues ({linkedIssues.length})
              </h3>
              {linkedIssues.length === 0 ? (
                <p className="text-gray-400 text-sm">No linked issues</p>
              ) : (
                <div className="space-y-2">
                  {linkedIssues.map(issue => (
                    <Link key={issue.id} to={`/issues/${issue.id}`} className="block p-3 bg-gray-700 hover:bg-gray-600 rounded-lg border border-gray-600 transition-colors">
                      <div className="text-xs font-bold text-gray-400 mb-1">{issue.key}</div>
                      <div className="text-sm font-semibold text-white line-clamp-2">{issue.title}</div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Linked Decisions */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <LightBulbIcon className="w-5 h-5" />
                Linked Decisions ({linkedDecisions.length})
              </h3>
              {linkedDecisions.length === 0 ? (
                <p className="text-gray-400 text-sm">No linked decisions</p>
              ) : (
                <div className="space-y-2">
                  {linkedDecisions.map(decision => (
                    <Link key={decision.id} to={`/decisions/${decision.id}`} className="block p-3 bg-gray-700 hover:bg-gray-600 rounded-lg border border-gray-600 transition-colors">
                      <div className="text-sm font-semibold text-white line-clamp-2">{decision.title}</div>
                      <div className="text-xs text-gray-400 mt-1">{decision.status}</div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Linked Knowledge */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <DocumentTextIcon className="w-5 h-5" />
                Linked Knowledge ({linkedKnowledge.length})
              </h3>
              {linkedKnowledge.length === 0 ? (
                <p className="text-gray-400 text-sm">No linked knowledge</p>
              ) : (
                <div className="space-y-2">
                  {linkedKnowledge.map(item => (
                    <Link key={item.id} to={`/knowledge/${item.id}`} className="block p-3 bg-gray-700 hover:bg-gray-600 rounded-lg border border-gray-600 transition-colors">
                      <div className="text-sm font-semibold text-white line-clamp-2">{item.title}</div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConversationDetailNew;
