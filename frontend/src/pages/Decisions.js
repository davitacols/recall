import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircleIcon, ClockIcon, XCircleIcon, EyeIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

function Decisions() {
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchDecisions();
  }, []);

  const fetchDecisions = async () => {
    try {
      const response = await api.get('/api/decisions/');
      setDecisions(response.data.results || response.data);
    } catch (error) {
      console.error('Failed to fetch decisions:', error);
    } finally {
      setLoading(false);
    }
  };



  const getImageUrl = (id, status) => {
    const colors = {
      proposed: 'f39c12',
      under_review: '3498db',
      approved: '2ecc71',
      rejected: 'e74c3c',
      implemented: '9b59b6',
      cancelled: '95a5a6'
    };
    const heights = [250, 300, 350, 280, 320];
    return `https://via.placeholder.com/400x${heights[id % heights.length]}/${colors[status] || 'e74c3c'}/ffffff?text=${status.toUpperCase()}`;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
      case 'implemented':
        return <CheckCircleIcon className="w-5 h-5" />;
      case 'under_review':
      case 'proposed':
        return <ClockIcon className="w-5 h-5" />;
      case 'rejected':
      case 'cancelled':
        return <XCircleIcon className="w-5 h-5" />;
      default:
        return <ClockIcon className="w-5 h-5" />;
    }
  };

  const filteredDecisions = decisions.filter(decision => {
    if (filter === 'all') return true;
    return decision.status === filter;
  });

  const statusCounts = decisions.reduce((acc, decision) => {
    acc[decision.status] = (acc[decision.status] || 0) + 1;
    return acc;
  }, {});

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
        <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-2 md:mb-3">Decisions</h1>
        <p className="text-base md:text-xl text-gray-600">{decisions.length} decisions tracked</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-8 md:mb-12">
        <div className="border border-gray-200 p-6 animate-fadeIn" style={{ animationDelay: '0s' }}>
          <div className="text-4xl font-bold text-gray-900 mb-2">{decisions.length}</div>
          <div className="text-sm text-gray-600 uppercase tracking-wide">Total</div>
        </div>
        <div className="border border-gray-200 p-6 animate-fadeIn" style={{ animationDelay: '0.05s' }}>
          <div className="text-4xl font-bold text-gray-900 mb-2">{statusCounts.approved || 0}</div>
          <div className="text-sm text-gray-600 uppercase tracking-wide">Approved</div>
        </div>
        <div className="border border-gray-200 p-6 animate-fadeIn" style={{ animationDelay: '0.1s' }}>
          <div className="text-4xl font-bold text-gray-900 mb-2">{statusCounts.under_review || 0}</div>
          <div className="text-sm text-gray-600 uppercase tracking-wide">Under Review</div>
        </div>
        <div className="border border-gray-200 p-6 animate-fadeIn" style={{ animationDelay: '0.15s' }}>
          <div className="text-4xl font-bold text-gray-900 mb-2">{statusCounts.implemented || 0}</div>
          <div className="text-sm text-gray-600 uppercase tracking-wide">Implemented</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-3 mb-8">
        {['all', 'proposed', 'under_review', 'approved', 'implemented', 'rejected'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-5 py-2.5 font-medium transition-colors capitalize ${
              filter === status
                ? 'bg-gray-900 text-white'
                : 'border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white'
            }`}
          >
            {status === 'all' ? 'All' : status.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Decisions */}
      {filteredDecisions.length === 0 ? (
        <div className="text-center py-20">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">No Decisions Found</h3>
          <p className="text-gray-600">
            {filter === 'all' ? 'No decisions yet' : `No ${filter.replace('_', ' ')} decisions`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDecisions.map((decision, index) => (
            <Link key={decision.id} to={`/decisions/${decision.id}`}>
              <div className="border border-gray-200 p-8 hover:border-gray-900 transition-all duration-200 animate-fadeIn" style={{ animationDelay: `${index * 0.05}s` }}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                      decision.status === 'approved' || decision.status === 'implemented' ? 'bg-gray-900 text-white' :
                      decision.status === 'under_review' || decision.status === 'proposed' ? 'border border-gray-900 text-gray-900' :
                      'bg-red-600 text-white'
                    }`}>
                      {decision.status.replace('_', ' ')}
                    </span>
                    <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                      decision.impact_level === 'critical' ? 'bg-red-600 text-white' :
                      decision.impact_level === 'high' ? 'bg-gray-900 text-white' :
                      'border border-gray-900 text-gray-900'
                    }`}>
                      {decision.impact_level}
                    </span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {new Date(decision.created_at).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  {decision.title}
                </h3>
                
                <p className="text-lg text-gray-700 line-clamp-2 mb-4">
                  {decision.description}
                </p>
                
                <div className="text-gray-600">
                  <span className="font-medium">Decision Maker:</span> {decision.decision_maker_name}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}


    </div>
  );
}

export default Decisions;
