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
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 pb-6 border-b border-gray-200">
        <div className="mb-4">
          <h1 className="text-5xl font-bold text-gray-900 mb-2">Decision Log</h1>
          <p className="text-lg text-gray-600">{decisions.length} decisions tracked</p>
        </div>

        {/* Stats */}
        <div className="flex items-center space-x-8 text-sm mb-6">
          <div>
            <span className="font-bold text-2xl text-gray-900">{decisions.length}</span>
            <span className="text-gray-600 ml-2">Total</span>
          </div>
          <div>
            <span className="font-bold text-2xl text-green-600">{statusCounts.approved || 0}</span>
            <span className="text-gray-600 ml-2">Approved</span>
          </div>
          <div>
            <span className="font-bold text-2xl text-blue-600">{statusCounts.under_review || 0}</span>
            <span className="text-gray-600 ml-2">Under Review</span>
          </div>
          <div>
            <span className="font-bold text-2xl text-purple-600">{statusCounts.implemented || 0}</span>
            <span className="text-gray-600 ml-2">Implemented</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-2">
          {['all', 'proposed', 'under_review', 'approved', 'implemented', 'rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 text-sm font-medium uppercase tracking-wide transition-colors ${
                filter === status
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {status === 'all' ? 'All' : status.replace('_', ' ')}
              {status !== 'all' && statusCounts[status] && (
                <span className="ml-2">({statusCounts[status]})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Decisions */}
      {filteredDecisions.length === 0 ? (
        <div className="text-center py-20">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            {filter === 'all' ? 'No Decisions Yet' : `No ${filter.replace('_', ' ')} Decisions`}
          </h3>
          <p className="text-gray-600 max-w-md mx-auto">
            {filter === 'all' 
              ? 'Decisions are created from conversations with type "Decision"' 
              : 'Try selecting a different filter'}
          </p>
        </div>
      ) : (
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
          {filteredDecisions.map((decision) => (
            <Link key={decision.id} to={`/decisions/${decision.id}`} className="break-inside-avoid block">
              <div className="bg-white border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow duration-300 group cursor-pointer">
                <div className="relative overflow-hidden bg-gray-100">
                  <img 
                    src={getImageUrl(decision.id, decision.status)} 
                    alt="" 
                    className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-4 left-4 text-white text-sm">
                      <div className="flex items-center space-x-1">
                        <EyeIcon className="w-4 h-4" />
                        <span>View Details</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="px-2 py-1 bg-gray-900 text-white text-xs font-medium uppercase tracking-wide flex items-center space-x-1">
                      {getStatusIcon(decision.status)}
                      <span>{decision.status.replace('_', ' ')}</span>
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(decision.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-gray-700 transition-colors">
                    {decision.title}
                  </h3>
                  
                  {decision.confidence && (
                    <div className={`mb-3 p-2 border-2 ${
                      decision.confidence.color === 'green' ? 'border-green-600 bg-green-50' :
                      decision.confidence.color === 'blue' ? 'border-blue-600 bg-blue-50' :
                      'border-yellow-600 bg-yellow-50'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wide">
                          Confidence: {decision.confidence.level}
                        </span>
                        <span className="text-lg font-bold">{decision.confidence.score}%</span>
                      </div>
                    </div>
                  )}
                  
                  <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                    {decision.description}
                  </p>
                  
                  {decision.rationale && (
                    <div className="mb-3 p-3 bg-gray-50 border-l-4 border-gray-900">
                      <p className="text-xs font-bold text-gray-900 mb-1 uppercase tracking-wide">Rationale</p>
                      <p className="text-sm text-gray-700 line-clamp-2">{decision.rationale}</p>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2 pt-3 border-t border-gray-100">
                    <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">
                        {decision.decision_maker_name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{decision.decision_maker_name}</span>
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

export default Decisions;
