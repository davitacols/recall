import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LightBulbIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

function AISuggestionsPanel({ decisionId, conversationId }) {
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSuggestions();
  }, [decisionId, conversationId]);

  const fetchSuggestions = async () => {
    try {
      const endpoint = decisionId 
        ? `/api/decisions/${decisionId}/suggestions/`
        : `/api/conversations/${conversationId}/decision-suggestions/`;
      const response = await api.get(endpoint);
      setSuggestions(response.data);
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;
  if (!suggestions || (suggestions.similar.length === 0 && suggestions.conflicts.length === 0)) return null;

  return (
    <div className="border border-gray-200 bg-white mb-8">
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center gap-3">
          <LightBulbIcon className="w-6 h-6 text-gray-900" />
          <h3 className="text-lg font-bold text-gray-900">AI Suggestions</h3>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {suggestions.similar.length > 0 && (
          <div>
            <h4 className="text-sm font-bold text-gray-900 mb-3">Similar decisions exist</h4>
            <div className="space-y-3">
              {suggestions.similar.map((similar) => (
                <Link
                  key={similar.id}
                  to={`/decisions/${similar.id}`}
                  className="block border border-gray-200 p-4 hover:border-gray-900 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h5 className="font-medium text-gray-900">{similar.title}</h5>
                    <span className="text-xs text-gray-600 ml-4">
                      {Math.round(similar.similarity_score * 100)}% match
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{similar.similarity_reason}</p>
                  <div className="text-xs text-gray-500">
                    {similar.status} • {new Date(similar.created_at).toLocaleDateString()}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {suggestions.conflicts.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />
              <h4 className="text-sm font-bold text-amber-900">Potential conflicts</h4>
            </div>
            <div className="space-y-3">
              {suggestions.conflicts.map((conflict) => (
                <Link
                  key={conflict.id}
                  to={`/decisions/${conflict.id}`}
                  className="block border-2 border-amber-200 bg-amber-50 p-4 hover:border-amber-600 transition-colors"
                >
                  <h5 className="font-medium text-amber-900 mb-2">{conflict.title}</h5>
                  <p className="text-sm text-amber-800">{conflict.conflict_reason}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AISuggestionsPanel;
