import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, EyeIcon, HeartIcon, BookmarkIcon, Squares2X2Icon, ListBulletIcon } from '@heroicons/react/24/outline';
import { useToast } from '../components/Toast';
import api from '../services/api';
import MentionTagInput from '../components/MentionTagInput';

function Conversations() {
  const [conversations, setConversations] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('masonry');
  const { addToast } = useToast();

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await api.get('/api/conversations/');
      setConversations(response.data.results || response.data);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      addToast('Failed to load conversations', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateConversation = async (formData) => {
    try {
      await api.post('/api/conversations/', formData);
      setShowCreateForm(false);
      fetchConversations();
      addToast('Conversation created successfully', 'success');
    } catch (error) {
      console.error('Failed to create conversation:', error);
      addToast('Failed to create conversation', 'error');
    }
  };

  const getImageUrl = (id, postType) => {
    const colors = {
      update: '3498db',
      question: 'f39c12',
      decision: '2ecc71',
      proposal: '9b59b6'
    };
    const heights = [250, 300, 350, 280, 320, 270];
    return `https://via.placeholder.com/400x${heights[id % heights.length]}/${colors[postType] || 'e74c3c'}/ffffff?text=${postType.toUpperCase()}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 md:mb-12 animate-fadeIn gap-4">
        <div>
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-2 md:mb-3">Conversations</h1>
          <p className="text-base md:text-xl text-gray-600">{conversations.length} conversations</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="recall-btn-primary flex items-center space-x-2 justify-center sm:justify-start"
        >
          <PlusIcon className="w-5 h-5" />
          <span>New Conversation</span>
        </button>
      </div>

      {/* Create Form Modal */}
      {showCreateForm && (
        <CreateConversationForm
          onSubmit={handleCreateConversation}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Conversations */}
      {conversations.length === 0 ? (
        <div className="text-center py-20">
          <h3 className="text-2xl font-bold text-gray-900 mb-3">No Conversations Yet</h3>
          <p className="text-lg text-gray-600 mb-8">
            Start engaging with your team
          </p>
          <button onClick={() => setShowCreateForm(true)} className="recall-btn-primary">
            Create First Conversation
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {conversations.map((conversation, index) => (
            <Link key={conversation.id} to={`/conversations/${conversation.id}`}>
              <div className="border border-gray-200 p-4 md:p-8 hover:border-gray-900 transition-all duration-200 animate-fadeIn" style={{ animationDelay: `${index * 0.05}s` }}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 md:mb-6 gap-3">
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                      conversation.post_type === 'decision' ? 'bg-gray-900 text-white' :
                      conversation.post_type === 'question' ? 'border border-gray-900 text-gray-900' :
                      conversation.post_type === 'proposal' ? 'bg-gray-900 text-white' :
                      'border border-gray-900 text-gray-900'
                    }`}>
                      {conversation.post_type}
                    </span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {new Date(conversation.created_at).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 md:mb-4">
                  {conversation.title}
                </h3>
                
                <p className="text-base md:text-lg text-gray-700 line-clamp-2 mb-3 md:mb-4">
                  {conversation.content}
                </p>
                
                <div className="flex flex-wrap items-center gap-3 md:gap-6 text-sm md:text-base text-gray-600">
                  <span className="font-medium">{conversation.author}</span>
                  {conversation.replies_count > 0 && (
                    <span>{conversation.replies_count} {conversation.replies_count === 1 ? 'reply' : 'replies'}</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateConversationForm({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    post_type: 'update',
    title: '',
    content: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit(formData);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white w-full max-w-3xl">
        <div className="p-8 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Create Conversation</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-900">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div>
            <label className="block text-base font-bold text-gray-900 mb-3">
              Type
            </label>
            <select
              value={formData.post_type}
              onChange={(e) => setFormData({ ...formData, post_type: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 text-base focus:border-gray-900 focus:outline-none"
            >
              <option value="update">Update</option>
              <option value="question">Question</option>
              <option value="decision">Decision</option>
              <option value="proposal">Proposal</option>
            </select>
          </div>
          
          <div>
            <label className="block text-base font-bold text-gray-900 mb-3">
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 text-base focus:border-gray-900 focus:outline-none"
              placeholder="Enter a compelling title"
              required
            />
          </div>
          
          <div>
            <label className="block text-base font-bold text-gray-900 mb-3">
              Content
            </label>
            <MentionTagInput
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Share your thoughts..."
              rows={8}
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-6">
            <button type="button" onClick={onCancel} className="recall-btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="recall-btn-primary disabled:opacity-50">
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Conversations;