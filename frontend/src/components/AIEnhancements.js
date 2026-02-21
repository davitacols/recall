import React, { useState } from 'react';
import { useToast } from './Toast';
import { 
  SparklesIcon, 
  TagIcon, 
  FaceSmileIcon, 
  LightBulbIcon,
  ArrowPathIcon 
} from '@heroicons/react/24/outline';

export function AIEnhancementButton({ content, title, type = 'conversation', onResult }) {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const processAI = async (feature) => {
    setLoading(true);
    setShowMenu(false);
    
    try {
      const token = localStorage.getItem('token');
      const endpoint = feature === 'batch' 
        ? '/api/organizations/ai/batch/'
        : `/api/organizations/ai/${feature}/`;
      
      const res = await fetch(`http://localhost:8000${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content, title, type })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        onResult(feature, data);
        success(`AI ${feature} completed`);
      } else {
        error(data.error || 'AI processing failed');
      }
    } catch (err) {
      error('Failed to process with AI');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-1.5 bg-transparent border-2 border-purple-600 text-purple-600 rounded hover:bg-purple-600 hover:text-white transition disabled:opacity-50 text-sm font-medium"
      >
        {loading ? (
          <ArrowPathIcon className="w-4 h-4 animate-spin" />
        ) : (
          <SparklesIcon className="w-4 h-4" />
        )}
        AI
      </button>

      {showMenu && (
        <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-lg shadow-lg py-2 w-56 z-10">
          <button
            onClick={() => processAI('summarize')}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-3"
          >
            <SparklesIcon className="w-4 h-4 text-blue-600" />
            <span>Auto-Summarize</span>
          </button>
          
          <button
            onClick={() => processAI('tags')}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-3"
          >
            <TagIcon className="w-4 h-4 text-green-600" />
            <span>Generate Tags</span>
          </button>
          
          <button
            onClick={() => processAI('sentiment')}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-3"
          >
            <FaceSmileIcon className="w-4 h-4 text-yellow-600" />
            <span>Sentiment Analysis</span>
          </button>
          
          <button
            onClick={() => processAI('suggestions')}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-3"
          >
            <LightBulbIcon className="w-4 h-4 text-orange-600" />
            <span>Smart Suggestions</span>
          </button>
          
          <div className="border-t border-gray-200 my-2"></div>
          
          <button
            onClick={() => processAI('batch')}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-3 font-medium"
          >
            <SparklesIcon className="w-4 h-4 text-purple-600" />
            <span>Process All</span>
          </button>
        </div>
      )}
    </div>
  );
}

export function AIResultsPanel({ results, onClose }) {
  if (!results) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <SparklesIcon className="w-6 h-6 text-purple-600" />
              AI Analysis Results
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {results.summary && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <SparklesIcon className="w-5 h-5 text-blue-600" />
                Summary
              </h3>
              <p className="text-gray-700 bg-blue-50 p-4 rounded-lg">{results.summary}</p>
            </div>
          )}

          {results.tags && results.tags.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <TagIcon className="w-5 h-5 text-green-600" />
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {results.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {results.sentiment && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <FaceSmileIcon className="w-5 h-5 text-yellow-600" />
                Sentiment Analysis
              </h3>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="flex items-center gap-4 mb-2">
                  <span className="font-medium">Sentiment:</span>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    results.sentiment === 'positive' ? 'bg-green-200 text-green-800' :
                    results.sentiment === 'negative' ? 'bg-red-200 text-red-800' :
                    'bg-gray-200 text-gray-800'
                  }`}>
                    {results.sentiment}
                  </span>
                </div>
                {results.confidence && (
                  <div className="flex items-center gap-4 mb-2">
                    <span className="font-medium">Confidence:</span>
                    <span>{(results.confidence * 100).toFixed(0)}%</span>
                  </div>
                )}
                {results.tone && (
                  <div className="flex items-center gap-4 mb-2">
                    <span className="font-medium">Tone:</span>
                    <span className="capitalize">{results.tone}</span>
                  </div>
                )}
                {results.key_emotions && results.key_emotions.length > 0 && (
                  <div className="flex items-center gap-4">
                    <span className="font-medium">Emotions:</span>
                    <span>{results.key_emotions.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {results.suggestions && results.suggestions.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <LightBulbIcon className="w-5 h-5 text-orange-600" />
                Smart Suggestions
              </h3>
              <ul className="bg-orange-50 p-4 rounded-lg space-y-2">
                {results.suggestions.map((suggestion, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-orange-600 mt-1">•</span>
                    <span className="text-gray-700">{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {results.actions && results.actions.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <LightBulbIcon className="w-5 h-5 text-orange-600" />
                Action Items
              </h3>
              <ul className="bg-orange-50 p-4 rounded-lg space-y-2">
                {results.actions.map((action, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-orange-600 mt-1">✓</span>
                    <span className="text-gray-700">{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function QuickAIButton({ itemType, itemId, onComplete }) {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);

  const processItem = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `http://localhost:8000/api/organizations/ai/${itemType}/${itemId}/process/`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      const data = await res.json();
      
      if (res.ok) {
        success('AI processing complete');
        onComplete(data);
      } else {
        error(data.error || 'AI processing failed');
      }
    } catch (err) {
      error('Failed to process with AI');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={processItem}
      disabled={loading}
      className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition disabled:opacity-50 text-sm"
    >
      {loading ? (
        <ArrowPathIcon className="w-4 h-4 animate-spin" />
      ) : (
        <SparklesIcon className="w-4 h-4" />
      )}
      AI Process
    </button>
  );
}
