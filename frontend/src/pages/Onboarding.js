import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpenIcon, CheckCircleIcon, LightBulbIcon, ClockIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

function Onboarding() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOnboardingData();
  }, []);

  const fetchOnboardingData = async () => {
    try {
      const response = await api.get('/api/knowledge/onboarding/');
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch onboarding data:', error);
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

  if (!data) {
    return (
      <div className="text-center py-20">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">No Data Available</h3>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 pb-6 border-b-2 border-gray-900">
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-16 h-16 bg-gray-900 flex items-center justify-center">
            <BookOpenIcon className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-5xl font-bold text-gray-900 mb-2">Welcome to {data.organization_name}</h1>
            <p className="text-lg text-gray-600">Everything you need to know to get started</p>
          </div>
        </div>
      </div>

      {/* Key Decisions */}
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-6 uppercase tracking-wide flex items-center">
          <CheckCircleIcon className="w-8 h-8 mr-3" />
          Key Decisions
        </h2>
        <p className="text-gray-600 mb-6">Important decisions that shape how we work</p>
        <div className="space-y-4">
          {data.key_decisions.map((decision) => (
            <Link key={decision.id} to={`/decisions/${decision.id}`}>
              <div className="bg-white border-2 border-gray-200 p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl font-bold text-gray-900">{decision.title}</h3>
                  <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                    decision.impact_level === 'critical' ? 'bg-red-600 text-white' :
                    decision.impact_level === 'high' ? 'bg-orange-600 text-white' :
                    'bg-gray-900 text-white'
                  }`}>
                    {decision.impact_level}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-3">{decision.description}</p>
                <p className="text-xs text-gray-500">
                  Decided: {new Date(decision.decided_at).toLocaleDateString()}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Good Examples */}
      {data.good_examples.length > 0 && (
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 uppercase tracking-wide flex items-center">
            <LightBulbIcon className="w-8 h-8 mr-3" />
            Good Examples
          </h2>
          <p className="text-gray-600 mb-6">Learn from these exemplary conversations</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data.good_examples.map((example) => (
              <Link key={example.id} to={`/conversations/${example.id}`}>
                <div className="bg-white border-2 border-green-600 p-6 hover:shadow-lg transition-shadow">
                  <span className="px-2 py-1 bg-green-600 text-white text-xs font-bold uppercase tracking-wide mb-3 inline-block">
                    {example.post_type}
                  </span>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">{example.title}</h3>
                  {example.summary && (
                    <p className="text-sm text-gray-700">{example.summary}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Updates */}
      {data.recent_updates.length > 0 && (
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 uppercase tracking-wide flex items-center">
            <ClockIcon className="w-8 h-8 mr-3" />
            Recent Important Updates
          </h2>
          <p className="text-gray-600 mb-6">Stay current with these recent developments</p>
          <div className="space-y-4">
            {data.recent_updates.map((update) => (
              <Link key={update.id} to={`/conversations/${update.id}`}>
                <div className="bg-white border-2 border-gray-200 p-6 hover:shadow-lg transition-shadow">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">{update.title}</h3>
                  <p className="text-sm text-gray-700 mb-3">{update.content}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(update.created_at).toLocaleDateString()}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Trending Topics */}
      {data.trending_topics.length > 0 && (
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 uppercase tracking-wide">
            What We're Talking About
          </h2>
          <p className="text-gray-600 mb-6">Current focus areas and trending topics</p>
          <div className="flex flex-wrap gap-3">
            {data.trending_topics.map((topic, index) => (
              <div key={index} className="px-6 py-3 bg-gray-900 text-white font-bold uppercase tracking-wide text-sm">
                {topic.topic} ({topic.count})
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Onboarding;
