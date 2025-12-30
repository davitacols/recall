import React, { useState, useEffect } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import Button from '../components/Button';

function BlockerTracker() {
  const [blockers, setBlockers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const [resolving, setResolving] = useState(null);

  useEffect(() => {
    fetchBlockers();
  }, []);

  const fetchBlockers = async () => {
    try {
      const response = await api.get('/api/agile/blockers/');
      const sorted = response.data.sort((a, b) => b.days_open - a.days_open);
      setBlockers(sorted);
    } catch (error) {
      console.error('Failed to fetch blockers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (blockerId) => {
    setResolving(blockerId);
    try {
      await api.post(`/api/agile/blockers/${blockerId}/resolve/`);
      fetchBlockers();
    } catch (error) {
      alert('Failed to resolve blocker');
    } finally {
      setResolving(null);
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'technical': return 'bg-red-100 text-red-900';
      case 'dependency': return 'bg-amber-100 text-amber-900';
      case 'decision': return 'bg-blue-100 text-blue-900';
      case 'resource': return 'bg-purple-100 text-purple-900';
      default: return 'bg-gray-100 text-gray-900';
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-5xl font-bold text-gray-900 mb-3">Blockers</h1>
          <p className="text-xl text-gray-600">Make blockers visible without meetings</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-6 py-3 bg-gray-900 text-white hover:bg-gray-800 font-medium transition-colors"
        >
          Report Blocker
        </button>
      </div>

      {blockers.length === 0 ? (
        <div className="text-center py-20 border border-gray-200 bg-gray-50">
          <h3 className="text-2xl font-bold text-gray-900 mb-3">No blockers — sprint is moving smoothly</h3>
        </div>
      ) : (
        <div className="space-y-3">
          {blockers.map((blocker) => (
            <div key={blocker.id} className="border-l-4 border-red-600 bg-white p-6 flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-medium text-gray-900">{blocker.title}</h3>
                  <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium">
                    {blocker.days_open} days open
                  </span>
                </div>
                <p className="text-base text-gray-700 mb-3">{blocker.description}</p>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>Blocked by: {blocker.blocked_by}</span>
                  {blocker.assigned_to && <span>Assigned: {blocker.assigned_to}</span>}
                  {blocker.ticket_url && (
                    <a href={blocker.ticket_url} target="_blank" rel="noopener noreferrer" className="text-gray-900 hover:underline">
                      View ticket →
                    </a>
                  )}
                </div>
              </div>
              <Button
                onClick={() => handleResolve(blocker.id)}
                loading={resolving === blocker.id}
                className="ml-6 text-sm"
              >
                Mark Resolved
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default BlockerTracker;
