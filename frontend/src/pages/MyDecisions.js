import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';

function MyDecisions() {
  const { user } = useAuth();
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchMyDecisions();
  }, []);

  const fetchMyDecisions = async () => {
    try {
      const response = await api.get('/api/decisions/');
      const myDecisions = (response.data.results || response.data).filter(
        d => d.decision_maker === user?.id
      );
      setDecisions(myDecisions);
    } catch (error) {
      console.error('Failed to fetch decisions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDecisions = decisions.filter(d => {
    if (filter === 'all') return true;
    return d.status === filter;
  });

  const getImpactColor = (level) => {
    switch (level) {
      case 'critical': return 'bg-red-600';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-blue-500';
      case 'low': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
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
      <div className="mb-8">
        <h1 className="text-5xl font-bold text-gray-900 mb-3">My Decisions</h1>
        <p className="text-xl text-gray-600">Decisions you own and are accountable for</p>
      </div>

      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="border border-gray-200 p-6">
          <div className="text-4xl font-bold text-gray-900 mb-2">{decisions.length}</div>
          <div className="text-sm text-gray-600 font-medium">Total</div>
        </div>
        <div className="border border-gray-200 p-6">
          <div className="text-4xl font-bold text-green-600 mb-2">
            {decisions.filter(d => d.status === 'approved').length}
          </div>
          <div className="text-sm text-gray-600 font-medium">Approved</div>
        </div>
        <div className="border border-gray-200 p-6">
          <div className="text-4xl font-bold text-blue-600 mb-2">
            {decisions.filter(d => d.status === 'under_review').length}
          </div>
          <div className="text-sm text-gray-600 font-medium">Under Review</div>
        </div>
        <div className="border border-gray-200 p-6">
          <div className="text-4xl font-bold text-gray-900 mb-2">
            {decisions.filter(d => d.status === 'implemented').length}
          </div>
          <div className="text-sm text-gray-600 font-medium">Implemented</div>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-8">
        {['all', 'proposed', 'under_review', 'approved', 'implemented'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 text-sm font-medium transition-colors capitalize ${
              filter === status
                ? 'bg-gray-900 text-white'
                : 'border border-gray-900 text-gray-900 hover:bg-gray-100'
            }`}
          >
            {status === 'all' ? 'All' : status.replace('_', ' ')}
          </button>
        ))}
      </div>

      {filteredDecisions.length === 0 ? (
        <div className="text-center py-20 border border-gray-200 bg-gray-50">
          <h3 className="text-2xl font-bold text-gray-900 mb-3">No decisions yet</h3>
          <p className="text-lg text-gray-600 mb-8">
            Start making decisions to build your track record.
          </p>
          <a href="/conversations" className="recall-btn-primary inline-block">
            View conversations
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDecisions.map((decision) => (
            <Link
              key={decision.id}
              to={`/decisions/${decision.id}`}
              className="border border-gray-200 p-6 block hover:border-gray-900 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full ${getImpactColor(decision.impact_level)}`}></span>
                  <span className="px-3 py-1 text-xs font-bold uppercase bg-gray-100 text-gray-700">
                    {decision.status.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-gray-600 font-medium uppercase">
                    {decision.impact_level} impact
                  </span>
                </div>
                <span className="text-sm text-gray-500">
                  {new Date(decision.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">{decision.title}</h3>
              {decision.description && (
                <p className="text-base text-gray-700 line-clamp-2">{decision.description}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyDecisions;
