import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import Button from '../components/Button';

function BlockerDetail() {
  const { id } = useParams();
  const [blocker, setBlocker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showJiraCreate, setShowJiraCreate] = useState(false);

  useEffect(() => {
    fetchBlocker();
  }, [id]);

  const fetchBlocker = async () => {
    try {
      const res = await api.get(`/api/agile/blockers/${id}/`);
      setBlocker(res.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch blocker:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!blocker) {
    return <div className="text-center py-8">Blocker not found</div>;
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{blocker.title}</h1>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span className={`px-2 py-1 ${blocker.status === 'active' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
            {blocker.status}
          </span>
          <span>Type: {blocker.type}</span>
          <span>Reported by: {blocker.blocked_by}</span>
          <span>{blocker.days_open} days open</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="col-span-2 space-y-6">
          <div className="border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Description</h2>
            <p className="text-base text-gray-700">{blocker.description}</p>
          </div>

          {blocker.ticket_url && (
            <div className="border border-green-200 bg-green-50 p-6">
              <h2 className="text-lg font-bold text-green-900 mb-2">Jira Issue</h2>
              <a
                href={blocker.ticket_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 hover:underline"
              >
                {blocker.ticket_id} →
              </a>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Actions</h3>
            {!blocker.ticket_url ? (
              <button
                onClick={() => setShowJiraCreate(!showJiraCreate)}
                className="w-full px-4 py-2 border border-gray-900 text-gray-900 font-medium hover:bg-gray-50 transition-colors"
              >
                📋 Create Jira Issue
              </button>
            ) : (
              <a
                href={blocker.ticket_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full px-4 py-2 border border-gray-900 text-gray-900 font-medium hover:bg-gray-50 transition-colors text-center"
              >
                View Jira Issue
              </a>
            )}
          </div>

          {showJiraCreate && <JiraCreatePanel blockerId={id} onCreated={fetchBlocker} />}
        </div>
      </div>
    </div>
  );
}

function JiraCreatePanel({ blockerId, onCreated }) {
  const [creating, setCreating] = useState(false);

  const handleCreateIssue = async () => {
    if (!window.confirm('Create a Jira issue for this blocker?')) return;
    
    setCreating(true);
    try {
      const res = await api.post(`/api/integrations/jira/create/${blockerId}/`);
      alert(`Jira issue created: ${res.data.ticket_id}`);
      window.open(res.data.ticket_url, '_blank');
      onCreated();
    } catch (error) {
      alert('Failed to create Jira issue: ' + (error.response?.data?.error || error.message));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="border border-gray-200 p-4 bg-gray-50">
      <p className="text-sm text-gray-700 mb-3">Create a Jira issue to track this blocker</p>
      <Button onClick={handleCreateIssue} loading={creating} className="w-full">
        Create Issue
      </Button>
    </div>
  );
}

export default BlockerDetail;
