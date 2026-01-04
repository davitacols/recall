import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import api from '../services/api';
import OnboardingProgress from '../components/OnboardingProgress';
import FirstTimeExperience from '../components/FirstTimeExperience';
import SprintSummary from '../components/SprintSummary';
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
  const [todaySummary, setTodaySummary] = useState({
    decisions: 0,
    proposals: 0,
    updates: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const convRes = await api.get('/api/conversations/');
      const allConvs = convRes.data.results || convRes.data || [];
      
      // Calculate today's summary
      const today = new Date().toDateString();
      const todayConvs = allConvs.filter(c => new Date(c.created_at).toDateString() === today);
      
      setTodaySummary({
        decisions: todayConvs.filter(c => c.post_type === 'decision').length,
        proposals: todayConvs.filter(c => c.post_type === 'proposal').length,
        updates: todayConvs.filter(c => c.post_type === 'update').length
      });
      
      setConversations(allConvs.slice(0, 12));
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

  const getCardBackground = (type) => {
    const backgrounds = {
      decision: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(37, 99, 235, 0.05) 100%)',
      proposal: 'linear-gradient(135deg, rgba(168, 85, 247, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
      question: 'linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, rgba(217, 119, 6, 0.05) 100%)',
      update: 'linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, rgba(22, 163, 74, 0.05) 100%)'
    };
    return backgrounds[type] || backgrounds.update;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 animate-fadeIn">
        <h1 className="text-5xl font-bold text-gray-900 mb-3">Welcome back, {user?.full_name || user?.username}</h1>
        <p className="text-xl text-gray-600 mb-2">Your organization's memory</p>
        <p className="text-base text-gray-500">Stay updated with recent conversations, decisions, and team activity. Search your knowledge base to find past decisions and insights.</p>
      </div>

      {/* Today in Recall Summary */}
      <div className="bg-gray-50 border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Today in Recall</h2>
        <div className="flex items-center gap-8 text-base text-gray-700">
          {todaySummary.decisions > 0 && (
            <div>
              <span className="font-bold text-gray-900">{todaySummary.decisions}</span> new {todaySummary.decisions === 1 ? 'decision' : 'decisions'}
            </div>
          )}
          {todaySummary.proposals > 0 && (
            <div>
              <span className="font-bold text-gray-900">{todaySummary.proposals}</span> {todaySummary.proposals === 1 ? 'proposal' : 'proposals'} awaiting input
            </div>
          )}
          {todaySummary.updates > 0 && (
            <div>
              <span className="font-bold text-gray-900">{todaySummary.updates}</span> {todaySummary.updates === 1 ? 'update' : 'updates'} from your team
            </div>
          )}
          {todaySummary.decisions === 0 && todaySummary.proposals === 0 && todaySummary.updates === 0 && (
            <div className="text-gray-600">No new activity today</div>
          )}
        </div>
      </div>

      {/* First Time Experience */}
      <FirstTimeExperience />

      {/* Sprint Summary */}
      <SprintSummary />

      {/* Onboarding Progress */}
      <OnboardingProgress />

      {/* Empty State */}
      {conversations.length === 0 ? (
        <div className="text-center py-20 border border-gray-200 bg-gray-50">
          <h3 className="text-2xl font-bold text-gray-900 mb-3">No conversations yet</h3>
          <p className="text-lg text-gray-600 mb-8">
            Start the first conversation to capture decisions and knowledge.
          </p>
          <a href="/conversations" className="recall-btn-primary inline-block">
            Start a conversation
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {conversations.map((conv, index) => {
          const Icon = getPostIcon(conv.post_type);
          
          return (
            <Link
              key={conv.id}
              to={`/conversations/${conv.id}`}
              className="border border-gray-200 p-6 block hover:border-gray-900 transition-all duration-200 animate-fadeIn relative overflow-hidden"
              style={{ 
                animationDelay: `${index * 0.05}s`,
                background: getCardBackground(conv.post_type)
              }}
            >
              {/* Decorative background element */}
              <div className="absolute top-0 right-0 w-32 h-32 opacity-5 pointer-events-none">
                <Icon className="w-full h-full" />
              </div>

              <div className="flex items-start gap-4 relative z-10">
                {/* Avatar */}
                <div className="w-12 h-12 flex-shrink-0">
                  {conv.author_avatar ? (
                    <img src={conv.author_avatar} alt={conv.author} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                      <span className="text-white font-bold text-base">{conv.author?.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 text-xs font-bold uppercase ${
                        conv.post_type === 'decision' ? 'bg-gray-900 text-white' :
                        conv.post_type === 'proposal' ? 'bg-gray-900 text-white' :
                        'border border-gray-900 text-gray-900'
                      }`}>
                        {conv.post_type}
                      </span>
                      {conv.impact_level && (
                        <span className="text-xs text-gray-600 font-medium">
                          {conv.impact_level} impact
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(conv.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {conv.title}
                  </h3>
                  
                  {/* AI Summary */}
                  {conv.ai_summary && (
                    <div className="bg-white bg-opacity-60 border-l-2 border-gray-900 p-3 mb-3">
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {conv.ai_summary}
                      </p>
                    </div>
                  )}
                  
                  {/* Why it matters */}
                  {conv.why_matters && (
                    <p className="text-base text-gray-600 mb-3 italic">
                      Why it matters: {conv.why_matters}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-6 text-sm text-gray-600">
                    <span className="font-medium">{conv.author}</span>
                    {conv.reply_count > 0 && (
                      <span>{conv.reply_count} {conv.reply_count === 1 ? 'reply' : 'replies'}</span>
                    )}
                    {conv.ai_keywords && conv.ai_keywords.length > 0 && (
                      <div className="flex gap-2">
                        {conv.ai_keywords.slice(0, 3).map((keyword, i) => (
                          <span key={i} className="text-xs px-2 py-1 bg-white bg-opacity-60 text-gray-700">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          );
          })}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
