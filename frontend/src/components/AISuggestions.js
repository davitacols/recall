import React, { useState, useEffect } from 'react';
import { SparklesIcon, UserIcon, TagIcon, ClockIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

export const AISuggestions = ({ title, description, projectId, onApply }) => {
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (title && title.length > 10) {
      const timer = setTimeout(() => {
        fetchSuggestions();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [title, description]);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const response = await api.post('/api/agile/ml/analyze-issue/', {
        title,
        description,
        project_id: projectId
      });
      setSuggestions(response.data);
    } catch (error) {
      console.error('Failed to fetch AI suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!suggestions && !loading) return null;

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <SparklesIcon className="w-5 h-5 text-purple-600" />
        <h3 className="font-semibold text-gray-900">AI Suggestions</h3>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          Analyzing...
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions?.suggested_assignee && (
            <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-purple-100">
              <UserIcon className="w-5 h-5 text-purple-600 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-gray-900">Suggested Assignee</span>
                  <span className="text-xs text-purple-600 font-medium">
                    {Math.round(suggestions.suggested_assignee.confidence * 100)}% match
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-2">{suggestions.suggested_assignee.name}</p>
                <p className="text-xs text-gray-500">{suggestions.suggested_assignee.reason}</p>
                <button
                  onClick={() => onApply?.('assignee', suggestions.suggested_assignee.user_id)}
                  className="mt-2 text-xs text-purple-600 hover:text-purple-700 font-medium"
                >
                  Apply suggestion
                </button>
              </div>
            </div>
          )}

          {suggestions?.tags && suggestions.tags.length > 0 && (
            <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-purple-100">
              <TagIcon className="w-5 h-5 text-purple-600 mt-0.5" />
              <div className="flex-1">
                <span className="text-sm font-semibold text-gray-900 block mb-2">Suggested Tags</span>
                <div className="flex flex-wrap gap-2">
                  {suggestions.tags.map((tag, i) => (
                    <button
                      key={i}
                      onClick={() => onApply?.('tag', tag)}
                      className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium hover:bg-purple-200 transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {suggestions?.estimated_points && (
            <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-purple-100">
              <ClockIcon className="w-5 h-5 text-purple-600 mt-0.5" />
              <div className="flex-1">
                <span className="text-sm font-semibold text-gray-900 block mb-1">Estimated Story Points</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-purple-600">{suggestions.estimated_points}</span>
                  <button
                    onClick={() => onApply?.('points', suggestions.estimated_points)}
                    className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          )}

          {suggestions?.sentiment && suggestions.sentiment !== 'neutral' && (
            <div className={`p-3 rounded-lg border ${
              suggestions.sentiment === 'urgent' ? 'bg-red-50 border-red-200' :
              suggestions.sentiment === 'negative' ? 'bg-orange-50 border-orange-200' :
              'bg-green-50 border-green-200'
            }`}>
              <span className="text-sm font-semibold">
                Sentiment: <span className="capitalize">{suggestions.sentiment}</span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const SprintPrediction = ({ sprintId }) => {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrediction();
  }, [sprintId]);

  const fetchPrediction = async () => {
    try {
      const response = await api.get(`/api/agile/ml/predict-sprint/${sprintId}/`);
      setPrediction(response.data);
    } catch (error) {
      console.error('Failed to fetch prediction:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="animate-pulse h-24 bg-gray-200 rounded-lg"></div>;
  if (!prediction) return null;

  return (
    <div className={`p-6 rounded-xl border-2 ${
      prediction.at_risk ? 'bg-red-50 border-red-300' : 'bg-green-50 border-green-300'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <SparklesIcon className="w-6 h-6 text-purple-600" />
          <h3 className="text-lg font-bold text-gray-900">AI Prediction</h3>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
          prediction.at_risk ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'
        }`}>
          {prediction.recommendation}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-3xl font-bold text-gray-900">{prediction.probability}%</div>
          <div className="text-sm text-gray-600">Completion Probability</div>
        </div>
        <div>
          <div className="text-3xl font-bold text-gray-900">{prediction.completed}/{prediction.total}</div>
          <div className="text-sm text-gray-600">Issues Completed</div>
        </div>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className={`h-3 rounded-full transition-all ${
            prediction.at_risk ? 'bg-red-500' : 'bg-green-500'
          }`}
          style={{ width: `${prediction.probability}%` }}
        ></div>
      </div>
    </div>
  );
};
