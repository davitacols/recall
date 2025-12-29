import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { 
  DocumentTextIcon,
  ChatBubbleLeftIcon,
  QuestionMarkCircleIcon,
  LightBulbIcon,
  ClockIcon,
  UserIcon
} from '@heroicons/react/24/outline';

function Dashboard() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const convRes = await api.get('/api/conversations/');
      setConversations((convRes.data.results || convRes.data || []).slice(0, 12));
    } catch (error) {
      console.error('Failed to fetch:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPostIcon = (type) => {
    switch(type) {
      case 'decision': return DocumentTextIcon;
      case 'question': return QuestionMarkCircleIcon;
      case 'proposal': return LightBulbIcon;
      default: return ChatBubbleLeftIcon;
    }
  };

  const getPostColor = (type) => {
    switch(type) {
      case 'decision': return 'text-blue-600 bg-blue-50';
      case 'question': return 'text-amber-600 bg-amber-50';
      case 'proposal': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
    }
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
      <div className="mb-8 md:mb-12 animate-fadeIn">
        <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-2 md:mb-3">Welcome back, {user?.full_name || user?.username}</h1>
        <p className="text-base md:text-xl text-gray-600">Your organization's memory</p>
      </div>

      {/* Feed */}
      <div className="space-y-3 md:space-y-4">
        {conversations.map((conv, index) => {
          const Icon = getPostIcon(conv.post_type);
          
          return (
            <Link
              key={conv.id}
              to={`/conversations/${conv.id}`}
              className="border border-gray-200 p-8 block hover:border-gray-900 transition-all duration-200 animate-fadeIn"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex items-start space-x-6">
                {/* Icon */}
                <div className="w-12 h-12 bg-gray-900 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                        conv.post_type === 'decision' ? 'bg-gray-900 text-white' :
                        conv.post_type === 'question' ? 'border border-gray-900 text-gray-900' :
                        conv.post_type === 'proposal' ? 'bg-gray-900 text-white' :
                        'border border-gray-900 text-gray-900'
                      }`}>
                        {conv.post_type}
                      </span>
                    </div>
                    <span className="text-sm text-gray-600">
                      {new Date(conv.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    {conv.title}
                  </h3>
                  
                  <p className="text-lg text-gray-700 line-clamp-2 mb-4">
                    {conv.content}
                  </p>
                  
                  <div className="flex items-center space-x-6 text-gray-600">
                    <span className="font-medium">{conv.author}</span>
                    {conv.reply_count > 0 && (
                      <span>{conv.reply_count} {conv.reply_count === 1 ? 'reply' : 'replies'}</span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default Dashboard;
