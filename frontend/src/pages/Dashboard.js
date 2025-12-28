import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import api from '../services/api';

function Dashboard() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [convRes, decRes] = await Promise.all([
        api.get('/api/conversations/'),
        api.get('/api/decisions/')
      ]);
      setConversations((convRes.data.results || convRes.data || []).slice(0, 9));
      setDecisions((decRes.data.results || decRes.data || []).slice(0, 5));
    } catch (error) {
      console.error('Failed to fetch:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Hero */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">
            Welcome back, {user?.full_name || user?.username}
          </h1>
          <p className="text-base text-gray-600">Here's what's happening in your workspace</p>
        </div>

        {/* What to Read */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold text-gray-900">What to Read</h2>
            <Link to="/conversations" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {conversations.map((conv) => (
              <Link
                key={conv.id}
                to={`/conversations/${conv.id}`}
                className="bg-white border border-gray-200 p-5 hover:border-gray-400 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-2 py-0.5 text-xs font-medium ${
                    conv.post_type === 'decision' ? 'bg-green-100 text-green-700' :
                    conv.post_type === 'question' ? 'bg-yellow-100 text-yellow-700' :
                    conv.post_type === 'proposal' ? 'bg-purple-100 text-purple-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {conv.post_type}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(conv.created_at).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2 line-clamp-2">
                  {conv.title}
                </h3>
                <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                  {conv.content}
                </p>
                <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                  <div className="w-6 h-6 bg-gray-900 flex items-center justify-center text-white text-xs font-medium">
                    {conv.author?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-gray-700">{conv.author}</span>
                  <span className="text-xs text-gray-400 ml-auto">{conv.reply_count || 0} replies</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Decisions */}
        {decisions.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold text-gray-900">Recent Decisions</h2>
              <Link to="/decisions" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {decisions.map((dec) => (
                <Link
                  key={dec.id}
                  to={`/decisions/${dec.id}`}
                  className="bg-white border border-gray-200 p-5 hover:border-gray-400 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-xs font-medium ${
                        dec.status === 'approved' ? 'bg-green-100 text-green-700' :
                        dec.status === 'under_review' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {dec.status.replace('_', ' ')}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-medium ${
                        dec.impact_level === 'critical' ? 'bg-red-100 text-red-700' :
                        dec.impact_level === 'high' ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {dec.impact_level}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(dec.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-2">
                    {dec.title}
                  </h3>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                    {dec.description}
                  </p>
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-500">Decision maker:</span>
                    <span className="text-sm text-gray-900 font-medium">{dec.decision_maker_name}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
