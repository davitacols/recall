import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, EyeIcon, HeartIcon, BookmarkIcon, Squares2X2Icon, ListBulletIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import MentionTagInput from '../components/MentionTagInput';

function Conversations() {
  const [conversations, setConversations] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('masonry');

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await api.get('/api/conversations/');
      setConversations(response.data.results || response.data);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateConversation = async (formData) => {
    try {
      await api.post('/api/conversations/', formData);
      setShowCreateForm(false);
      fetchConversations();
    } catch (error) {
      console.error('Failed to create conversation:', error);
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
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 pb-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-5xl font-bold text-gray-900 mb-2">Conversations</h1>
            <p className="text-lg text-gray-600">{conversations.length} conversations in your workspace</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex border border-gray-300">
              <button
                onClick={() => setViewMode('masonry')}
                className={`p-2 ${viewMode === 'masonry' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                <Squares2X2Icon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                <ListBulletIcon className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white font-medium transition-colors"
            >
              <PlusIcon className="w-5 h-5 inline mr-2" />
              Create
            </button>
          </div>
        </div>
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
          <h3 className="text-2xl font-bold text-gray-900 mb-4">No Conversations Yet</h3>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Start engaging with your team by creating your first conversation
          </p>
          <button onClick={() => setShowCreateForm(true)} className="inline-block px-8 py-4 bg-gray-900 hover:bg-gray-800 text-white font-medium transition-colors">
            Create First Conversation
          </button>
        </div>
      ) : viewMode === 'masonry' ? (
        <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
          {conversations.map((conversation) => (
            <div key={conversation.id} className="break-inside-avoid">
              <Link to={`/conversations/${conversation.id}`}>
                <div className="bg-white border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow duration-300 group cursor-pointer">
                  <div className="relative overflow-hidden bg-gray-100">
                    <img 
                      src={getImageUrl(conversation.id, conversation.post_type)} 
                      alt="" 
                      className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white">
                        <div className="flex items-center space-x-4 text-sm">
                          <div className="flex items-center space-x-1">
                            <EyeIcon className="w-4 h-4" />
                            <span>{Math.floor(Math.random() * 100)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <HeartIcon className="w-4 h-4" />
                            <span>{conversation.replies_count || 0}</span>
                          </div>
                        </div>
                        <BookmarkIcon className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <span className="px-2 py-1 bg-gray-900 text-white text-xs font-medium uppercase tracking-wide">
                        {conversation.post_type}
                      </span>
                      {conversation.status_label && conversation.status_label !== 'open' && (
                        <span className={`px-2 py-1 text-xs font-bold uppercase tracking-wide ${
                          conversation.status_label === 'good_example' ? 'bg-green-100 text-green-800' :
                          conversation.status_label === 'needs_followup' ? 'bg-yellow-100 text-yellow-800' :
                          conversation.status_label === 'resolved' ? 'bg-blue-100 text-blue-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {conversation.status_label === 'good_example' ? '✓ Good Example' :
                           conversation.status_label === 'needs_followup' ? '⚠ Follow-up' :
                           conversation.status_label === 'resolved' ? '✓ Resolved' :
                           '→ In Progress'}
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {new Date(conversation.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-gray-700 transition-colors">
                      {conversation.title}
                    </h3>
                    
                    <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                      {conversation.content}
                    </p>
                    
                    <div className="flex items-center space-x-2 pt-3 border-t border-gray-100">
                      <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">
                          {conversation.author?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{conversation.author}</span>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {conversations.map((conversation) => (
            <Link key={conversation.id} to={`/conversations/${conversation.id}`}>
              <div className="bg-white border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer group">
                <div className="flex">
                  <div className="w-48 h-32 flex-shrink-0 overflow-hidden bg-gray-100">
                    <img 
                      src={getImageUrl(conversation.id, conversation.post_type)} 
                      alt="" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="flex-1 p-6">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="px-2 py-1 bg-gray-900 text-white text-xs font-medium uppercase tracking-wide">
                        {conversation.post_type}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(conversation.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-gray-700 transition-colors">
                      {conversation.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {conversation.content}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">
                            {conversation.author?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{conversation.author}</span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <EyeIcon className="w-4 h-4" />
                          <span>{Math.floor(Math.random() * 100)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <HeartIcon className="w-4 h-4" />
                          <span>{conversation.replies_count || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white w-full max-w-2xl">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Create Conversation</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
              Type
            </label>
            <select
              value={formData.post_type}
              onChange={(e) => setFormData({ ...formData, post_type: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 focus:border-gray-900 focus:outline-none"
            >
              <option value="update">Update</option>
              <option value="question">Question</option>
              <option value="decision">Decision</option>
              <option value="proposal">Proposal</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 focus:border-gray-900 focus:outline-none"
              placeholder="Enter a compelling title"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
              Content
            </label>
            <MentionTagInput
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Share your thoughts... Use @username to mention and #tag to organize"
              rows={6}
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onCancel} className="px-6 py-3 border-2 border-gray-900 text-gray-900 font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white font-medium transition-colors disabled:opacity-50">
              {loading ? 'Creating...' : 'Create Conversation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Conversations;