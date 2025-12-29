import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircleIcon, ClockIcon, XCircleIcon, EyeIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

function Decisions() {
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState('timeline'); // timeline or list

  useEffect(() => {
    fetchDecisions();
  }, []);

  const fetchDecisions = async () => {
    try {
      const response = await api.get('/api/decisions/');
      // Sort by date for timeline view
      const sorted = (response.data.results || response.data).sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );
      setDecisions(sorted);
    } catch (error) {
      console.error('Failed to fetch decisions:', error);
    } finally {
      setLoading(false);
    }
  };



  const getImpactColor = (level) => {
    switch (level) {
      case 'critical': return 'bg-red-600';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-blue-500';
      case 'low': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
      case 'implemented':
        return 'text-green-600';
      case 'under_review':
      case 'proposed':
        return 'text-blue-600';
      case 'rejected':
      case 'cancelled':
        return 'text-red-600';
      default:
        return 'text-gray-600';
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
      <div className="mb-8 animate-fadeIn">
        <h1 className="text-5xl font-bold text-gray-900 mb-3">Decisions</h1>
        <p className="text-xl text-gray-600">The brain of your organization</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="border border-gray-200 p-6">
          <div className="text-4xl font-bold text-gray-900 mb-2">{decisions.length}</div>
          <div className="text-sm text-gray-600 font-medium">Total Decisions</div>
        </div>
        <div className="border border-gray-200 p-6">
          <div className="text-4xl font-bold text-green-600 mb-2">{statusCounts.approved || 0}</div>
          <div className="text-sm text-gray-600 font-medium">Approved</div>
        </div>
        <div className="border border-gray-200 p-6">
          <div className="text-4xl font-bold text-blue-600 mb-2">{statusCounts.under_review || 0}</div>
          <div className="text-sm text-gray-600 font-medium">Under Review</div>
        </div>
        <div className="border border-gray-200 p-6">
          <div className="text-4xl font-bold text-gray-900 mb-2">{statusCounts.implemented || 0}</div>
          <div className="text-sm text-gray-600 font-medium">Implemented</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
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
      </div>

      {/* Timeline View */}
      {filteredDecisions.length === 0 ? (
        <div className="text-center py-20 border border-gray-200 bg-gray-50">
          <h3 className="text-2xl font-bold text-gray-900 mb-3">No decisions yet</h3>
          <p className="text-lg text-gray-600 mb-8">
            Convert conversations into decisions to track outcomes.
          </p>
          <a href="/conversations" className="recall-btn-primary inline-block">
            View conversations
          </a>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>
          
          {/* Timeline Items */}
          <div className="space-y-8">
            {filteredDecisions.map((decision, index) => (
              <div key={decision.id} className="relative pl-20 animate-fadeIn" style={{ animationDelay: `${index * 0.05}s` }}>
                {/* Timeline Dot */}
                <div className={`absolute left-6 w-5 h-5 rounded-full border-4 border-white ${getImpactColor(decision.impact_level)}`}></div>
                
                {/* Decision Card */}
                <Link to={`/decisions/${decision.id}`}>
                  <div className="border border-gray-200 p-6 hover:border-gray-900 transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 text-xs font-bold uppercase ${getStatusColor(decision.status)}`}>
                          {decision.status.replace('_', ' ')}
                        </span>
                        <span className="px-3 py-1 text-xs font-bold uppercase bg-gray-100 text-gray-700">
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
                    
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">
                      {decision.title}
                    </h3>
                    
                    {decision.description && (
                      <p className="text-base text-gray-700 mb-4 line-clamp-2">
                        {decision.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Decision Maker:</span> {decision.decision_maker_name}
                      </div>
                      {decision.review_date && (
                        <div>
                          <span className="font-medium">Review:</span> {new Date(decision.review_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}


    </div>
  );
}

export default Decisions;
