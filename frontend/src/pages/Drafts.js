import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { DocumentDuplicateIcon } from '@heroicons/react/24/outline';

function Drafts() {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDrafts();
  }, []);

  const fetchDrafts = async () => {
    try {
      const response = await api.get('/api/conversations/?drafts=true');
      setDrafts(response.data.results || response.data || []);
    } catch (error) {
      console.error('Failed to fetch drafts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this draft?')) return;
    try {
      await api.delete(`/api/conversations/${id}/`);
      fetchDrafts();
    } catch (error) {
      console.error('Failed to delete draft:', error);
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Drafts</h1>
        <p className="text-base text-gray-600">{drafts.length} unfinished conversations</p>
      </div>

      {drafts.length === 0 ? (
        <div className="text-center py-20 border border-gray-200 bg-gray-50">
          <DocumentDuplicateIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No drafts</h3>
          <p className="text-base text-gray-600">
            Your unfinished conversations will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {drafts.map((draft) => (
            <div
              key={draft.id}
              className="border border-gray-200 p-6 hover:border-gray-900 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {draft.title || 'Untitled'}
                  </h3>
                  {draft.content && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{draft.content}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{draft.post_type}</span>
                    <span>Last saved {new Date(draft.draft_saved_at).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    to={`/conversations/edit/${draft.id}`}
                    className="px-4 py-2 border border-gray-900 text-gray-900 text-sm font-medium hover:bg-gray-100"
                  >
                    Resume
                  </Link>
                  <button
                    onClick={() => handleDelete(draft.id)}
                    className="px-4 py-2 border border-red-600 text-red-600 text-sm font-medium hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Drafts;
