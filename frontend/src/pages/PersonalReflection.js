import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { Link } from 'react-router-dom';

function PersonalReflection() {
  const { user } = useAuth();
  const [reflection, setReflection] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReflection();
  }, []);

  const fetchReflection = async () => {
    try {
      const response = await api.get('/api/knowledge/reflection/');
      setReflection(response.data);
    } catch (error) {
      console.error('Failed to fetch reflection:', error);
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

  if (!reflection) {
    return (
      <div className="text-center py-20">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">No Data Available</h3>
        <p className="text-gray-600">Start contributing to see your reflection</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-5xl font-bold text-gray-900 mb-4 uppercase tracking-wide">
          Your Reflection
        </h1>
        <p className="text-lg text-gray-600">
          {reflection.period} • {user?.full_name || user?.username}
        </p>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-700 text-white p-8 mb-8 border-2 border-gray-900">
        <h2 className="text-3xl font-bold mb-6 uppercase tracking-wide">Your Impact</h2>
        <p className="text-xl mb-8">{reflection.message}</p>
        
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-5xl font-bold mb-2">{reflection.contributions.conversations}</div>
            <div className="text-sm uppercase tracking-wide opacity-80">Conversations</div>
          </div>
          <div className="text-center">
            <div className="text-5xl font-bold mb-2">{reflection.contributions.replies}</div>
            <div className="text-sm uppercase tracking-wide opacity-80">Replies</div>
          </div>
          <div className="text-center">
            <div className="text-5xl font-bold mb-2">{reflection.contributions.decisions}</div>
            <div className="text-sm uppercase tracking-wide opacity-80">Decisions</div>
          </div>
        </div>
      </div>

      {/* Total Contributions */}
      <div className="bg-white border-2 border-gray-900 p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 uppercase tracking-wide">
          Total Contributions
        </h2>
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="text-7xl font-bold text-gray-900 mb-2">
              {reflection.contributions.total}
            </div>
            <div className="text-sm text-gray-600 uppercase tracking-wide font-bold">
              Total Contributions
            </div>
          </div>
        </div>
      </div>

      {/* Top Topics */}
      {reflection.top_topics.length > 0 && (
        <div className="bg-white border-2 border-gray-900 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 uppercase tracking-wide">
            Your Top Topics
          </h2>
          <p className="text-gray-600 mb-6">
            The topics you've been most active in
          </p>
          <div className="space-y-4">
            {reflection.top_topics.map((topic, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-gray-900 text-white flex items-center justify-center font-bold">
                    {idx + 1}
                  </div>
                  <span className="text-lg font-bold text-gray-900 uppercase">{topic.topic}</span>
                </div>
                <span className="px-4 py-2 bg-gray-900 text-white font-bold text-sm">
                  {topic.count} contributions
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insights */}
      <div className="bg-blue-50 border-2 border-blue-600 p-8">
        <h2 className="text-2xl font-bold text-blue-900 mb-6 uppercase tracking-wide">
          💡 Insights
        </h2>
        <div className="space-y-4">
          {reflection.contributions.conversations > 10 && (
            <div className="p-4 bg-white border border-blue-600">
              <p className="text-sm text-blue-900">
                <strong>Active Contributor:</strong> You've started {reflection.contributions.conversations} conversations. 
                Your voice is helping shape the organization's knowledge.
              </p>
            </div>
          )}
          {reflection.contributions.replies > 20 && (
            <div className="p-4 bg-white border border-blue-600">
              <p className="text-sm text-blue-900">
                <strong>Engaged Team Member:</strong> With {reflection.contributions.replies} replies, 
                you're actively participating in discussions and helping others.
              </p>
            </div>
          )}
          {reflection.contributions.decisions > 5 && (
            <div className="p-4 bg-white border border-blue-600">
              <p className="text-sm text-blue-900">
                <strong>Decision Maker:</strong> You've made {reflection.contributions.decisions} decisions. 
                Your leadership is driving the organization forward.
              </p>
            </div>
          )}
          {reflection.top_topics.length > 0 && (
            <div className="p-4 bg-white border border-blue-600">
              <p className="text-sm text-blue-900">
                <strong>Subject Matter Expert:</strong> You're most active in "{reflection.top_topics[0].topic}". 
                Consider documenting your expertise for others.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-8 text-center">
        <Link
          to="/conversations"
          className="inline-block px-8 py-4 bg-gray-900 text-white hover:bg-gray-800 font-bold uppercase tracking-wide text-lg mr-4"
        >
          Continue Contributing
        </Link>
        <Link
          to="/settings"
          className="inline-block px-8 py-4 border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white font-bold uppercase tracking-wide text-lg"
        >
          View Settings
        </Link>
      </div>
    </div>
  );
}

export default PersonalReflection;
