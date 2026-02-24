import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, Squares2X2Icon, ListBulletIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../utils/ThemeAndAccessibility';
import api from '../services/api';

function Decisions() {
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');

  const bgPrimary = darkMode ? 'bg-stone-950' : 'bg-gray-50';
  const bgSecondary = darkMode ? 'bg-stone-900' : 'bg-white';
  const borderColor = darkMode ? 'border-stone-800' : 'border-gray-200';
  const textPrimary = darkMode ? 'text-stone-100' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-stone-400' : 'text-gray-600';
  const hoverBg = darkMode ? 'hover:bg-stone-800' : 'hover:bg-gray-50';
  const hoverBorder = darkMode ? 'hover:border-stone-700' : 'hover:border-gray-300';

  useEffect(() => {
    fetchDecisions();
  }, []);

  const fetchDecisions = async () => {
    try {
      const response = await api.get('/api/decisions/');
      const data = response.data.data || response.data.results || response.data || [];
      const decisionsArray = Array.isArray(data) ? data : [];
      
      const sorted = decisionsArray.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );
      setDecisions(sorted);
    } catch (error) {
      console.error('Failed to fetch decisions:', error);
      setDecisions([]);
    } finally {
      setLoading(false);
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

  const statusConfig = {
    proposed: { bg: darkMode ? '#312e81' : '#e0e7ff', text: darkMode ? '#a5b4fc' : '#3730a3', label: 'Proposed' },
    under_review: { bg: darkMode ? '#1e3a8a' : '#dbeafe', text: darkMode ? '#93c5fd' : '#1e40af', label: 'Under Review' },
    approved: { bg: darkMode ? '#065f46' : '#d1fae5', text: darkMode ? '#6ee7b7' : '#065f46', label: 'Approved' },
    rejected: { bg: darkMode ? '#7f1d1d' : '#fee2e2', text: darkMode ? '#fca5a5' : '#991b1b', label: 'Rejected' },
    implemented: { bg: darkMode ? '#065f46' : '#d1fae5', text: darkMode ? '#6ee7b7' : '#065f46', label: 'Implemented' },
    cancelled: { bg: darkMode ? '#374151' : '#f3f4f6', text: darkMode ? '#9ca3af' : '#4b5563', label: 'Cancelled' }
  };

  const impactConfig = {
    low: { bg: darkMode ? '#1e3a8a' : '#dbeafe', text: darkMode ? '#93c5fd' : '#1e40af' },
    medium: { bg: darkMode ? '#78350f' : '#fef3c7', text: darkMode ? '#fcd34d' : '#92400e' },
    high: { bg: darkMode ? '#7c2d12' : '#fed7aa', text: darkMode ? '#fdba74' : '#9a3412' },
    critical: { bg: darkMode ? '#7f1d1d' : '#fecaca', text: darkMode ? '#fca5a5' : '#991b1b' }
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${bgPrimary}`}>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className={`p-6 ${bgSecondary} border ${borderColor} rounded-lg animate-pulse`}>
                <div className={`h-4 ${bgPrimary} rounded w-3/4 mb-3`}></div>
                <div className={`h-3 ${bgPrimary} rounded w-full mb-2`}></div>
                <div className={`h-3 ${bgPrimary} rounded w-2/3`}></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bgPrimary}`}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className={`text-3xl font-bold ${textPrimary} mb-2`}>Decisions</h1>
            <p className={`text-sm ${textSecondary}`}>Track decisions, their status, and impact across your team</p>
          </div>
          <button
            onClick={() => navigate('/conversations')}
            className={`flex items-center gap-2 px-4 py-2 bg-transparent border-2 ${borderColor} ${textPrimary} rounded ${hoverBg} ${hoverBorder} font-medium text-sm transition-all`}
          >
            <PlusIcon className="w-4 h-4" />
            New Decision
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className={`${bgSecondary} border ${borderColor} rounded-lg p-5`}>
            <div className={`text-3xl font-bold ${textPrimary} mb-1`}>{decisions.length}</div>
            <div className={`text-xs ${textSecondary} font-medium`}>Total Decisions</div>
          </div>
          <div className={`${bgSecondary} border ${borderColor} rounded-lg p-5`}>
            <div className="text-3xl font-bold text-blue-500 mb-1">{statusCounts.approved || 0}</div>
            <div className={`text-xs ${textSecondary} font-medium`}>Approved</div>
          </div>
          <div className={`${bgSecondary} border ${borderColor} rounded-lg p-5`}>
            <div className="text-3xl font-bold text-amber-500 mb-1">{statusCounts.under_review || 0}</div>
            <div className={`text-xs ${textSecondary} font-medium`}>Under Review</div>
          </div>
          <div className={`${bgSecondary} border ${borderColor} rounded-lg p-5`}>
            <div className="text-3xl font-bold text-green-500 mb-1">{statusCounts.implemented || 0}</div>
            <div className={`text-xs ${textSecondary} font-medium`}>Implemented</div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            {['all', 'proposed', 'under_review', 'approved', 'implemented'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 text-xs font-semibold rounded transition-all capitalize ${
                  filter === status
                    ? 'bg-blue-600 text-white'
                    : `${bgSecondary} ${textSecondary} border ${borderColor} ${hoverBg}`
                }`}
              >
                {status === 'all' ? 'All' : status.replace('_', ' ')}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 border ${borderColor} rounded transition-all ${
                viewMode === 'grid' ? bgSecondary : 'bg-transparent'
              }`}
            >
              <Squares2X2Icon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 border ${borderColor} rounded transition-all ${
                viewMode === 'list' ? bgSecondary : 'bg-transparent'
              }`}
            >
              <ListBulletIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {filteredDecisions.length === 0 ? (
          <div className={`text-center py-20 ${textSecondary}`}>
            <p className="text-lg mb-4">No decisions found</p>
            <button
              onClick={() => navigate('/conversations')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-all"
            >
              Create Decision
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDecisions.map((decision) => {
              const status = statusConfig[decision.status] || statusConfig.proposed;
              const impact = impactConfig[decision.impact_level] || impactConfig.medium;
              
              return (
                <div
                  key={decision.id}
                  onClick={() => navigate(`/decisions/${decision.id}`)}
                  className={`p-6 ${bgSecondary} border ${borderColor} rounded-lg cursor-pointer transition-all ${hoverBorder} hover:-translate-y-1`}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-3 py-1 text-xs font-semibold rounded" style={{ backgroundColor: status.bg, color: status.text }}>
                      {status.label}
                    </span>
                    <span className="px-3 py-1 text-xs font-semibold rounded capitalize" style={{ backgroundColor: impact.bg, color: impact.text }}>
                      {decision.impact_level}
                    </span>
                  </div>

                  <h3 className={`text-lg font-semibold ${textPrimary} mb-2`}>
                    {decision.title}
                  </h3>
                  {decision.description && (
                    <p className={`text-sm ${textSecondary} line-clamp-2 mb-4`}>
                      {decision.description}
                    </p>
                  )}

                  <div className={`flex items-center justify-between pt-4 border-t ${borderColor} text-xs ${textSecondary}`}>
                    <span>{decision.decision_maker_name}</span>
                    <span>{new Date(decision.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDecisions.map((decision) => {
              const status = statusConfig[decision.status] || statusConfig.proposed;
              const impact = impactConfig[decision.impact_level] || impactConfig.medium;
              
              return (
                <div
                  key={decision.id}
                  onClick={() => navigate(`/decisions/${decision.id}`)}
                  className={`p-5 ${bgSecondary} border ${borderColor} rounded-lg cursor-pointer transition-all ${hoverBg} ${hoverBorder} flex items-center gap-5`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 text-xs font-semibold rounded" style={{ backgroundColor: status.bg, color: status.text }}>
                        {status.label}
                      </span>
                      <span className="px-2 py-1 text-xs font-semibold rounded capitalize" style={{ backgroundColor: impact.bg, color: impact.text }}>
                        {decision.impact_level}
                      </span>
                    </div>
                    <h3 className={`text-base font-semibold ${textPrimary} mb-1`}>
                      {decision.title}
                    </h3>
                    {decision.description && (
                      <p className={`text-sm ${textSecondary} truncate`}>
                        {decision.description}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={`text-sm ${textSecondary}`}>{decision.decision_maker_name}</span>
                    <span className={`text-xs ${textSecondary}`}>{new Date(decision.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Decisions;
