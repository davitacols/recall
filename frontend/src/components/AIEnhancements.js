import React, { useState } from 'react';
import { useToast } from './Toast';
import { 
  SparklesIcon, 
  TagIcon, 
  FaceSmileIcon, 
  LightBulbIcon,
  ArrowPathIcon 
} from '@heroicons/react/24/outline';

export function AIEnhancementButton({ content, title, type = 'conversation', onResult, documentId }) {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const processAI = async (feature) => {
    setLoading(true);
    setShowMenu(false);
    
    try {
      const token = localStorage.getItem('token');
      let finalContent = content;
      
      // If type is document and we have documentId, try to extract PDF text
      if (type === 'document' && documentId) {
        try {
          const extractRes = await fetch(`http://localhost:8000/api/business/documents/${documentId}/extract-text/`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (extractRes.ok) {
            const extractData = await extractRes.json();
            if (extractData.text && extractData.text.trim()) {
              finalContent = extractData.text;
            }
          }
        } catch (e) {
          console.error('PDF extraction failed:', e);
        }
      }
      
      const endpoint = feature === 'batch' 
        ? '/api/organizations/ai/batch/'
        : `/api/organizations/ai/${feature}/`;
      
      const res = await fetch(`http://localhost:8000${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: finalContent, title, content_type: type })
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
        <div className="absolute top-full mt-2 right-0 bg-white dark:bg-stone-900 border border-gray-200 dark:border-stone-700 rounded-lg shadow-lg py-2 w-56 z-10">
          <button
            onClick={() => processAI('summarize')}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-stone-800 flex items-center gap-3 text-gray-900 dark:text-stone-100"
          >
            <SparklesIcon className="w-4 h-4 text-blue-600" />
            <span>Auto-Summarize</span>
          </button>
          
          <button
            onClick={() => processAI('tags')}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-stone-800 flex items-center gap-3 text-gray-900 dark:text-stone-100"
          >
            <TagIcon className="w-4 h-4 text-green-600" />
            <span>Generate Tags</span>
          </button>
          
          <button
            onClick={() => processAI('sentiment')}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-stone-800 flex items-center gap-3 text-gray-900 dark:text-stone-100"
          >
            <FaceSmileIcon className="w-4 h-4 text-yellow-600" />
            <span>Sentiment Analysis</span>
          </button>
          
          <button
            onClick={() => processAI('suggestions')}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-stone-800 flex items-center gap-3 text-gray-900 dark:text-stone-100"
          >
            <LightBulbIcon className="w-4 h-4 text-orange-600" />
            <span>Smart Suggestions</span>
          </button>
          
          <div className="border-t border-gray-200 dark:border-stone-700 my-2"></div>
          
          <button
            onClick={() => processAI('batch')}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-stone-800 flex items-center gap-3 font-medium text-gray-900 dark:text-stone-100"
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
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });
  
  const handleMouseDown = (e) => {
    if (e.target.closest('button') || e.target.closest('.content-area')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  if (!results) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div 
        className="bg-white dark:bg-stone-900 rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
        style={{ transform: `translate(${position.x}px, ${position.y}px)`, cursor: isDragging ? 'grabbing' : 'default' }}
      >
        <div className="p-6 cursor-grab active:cursor-grabbing" onMouseDown={handleMouseDown}>
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-stone-100 flex items-center gap-2">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Recall
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 dark:text-stone-500 hover:text-gray-600 dark:hover:text-stone-300 text-2xl"
            >
              ×
            </button>
          </div>

          <div className="content-area overflow-y-auto max-h-[60vh]">
            {results.summary && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-stone-100 mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Summary
                </h3>
                <p className="text-gray-700 dark:text-stone-300 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">{results.summary}</p>
              </div>
            )}

            {results.tags && results.tags.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-stone-100 mb-2 flex items-center gap-2">
                  <TagIcon className="w-5 h-5 text-green-600" />
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {results.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 rounded-full text-sm"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {results.sentiment && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-stone-100 mb-2 flex items-center gap-2">
                  <FaceSmileIcon className="w-5 h-5 text-yellow-600" />
                  Sentiment Analysis
                </h3>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                  <div className="flex items-center gap-4 mb-2">
                    <span className="font-medium text-gray-900 dark:text-stone-100">Sentiment:</span>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      results.sentiment === 'positive' ? 'bg-green-200 dark:bg-green-900/30 text-green-800 dark:text-green-400' :
                      results.sentiment === 'negative' ? 'bg-red-200 dark:bg-red-900/30 text-red-800 dark:text-red-400' :
                      'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                    }`}>
                      {results.sentiment}
                    </span>
                  </div>
                  {results.confidence && (
                    <div className="flex items-center gap-4 mb-2 text-gray-700 dark:text-stone-300">
                      <span className="font-medium">Confidence:</span>
                      <span>{(results.confidence * 100).toFixed(0)}%</span>
                    </div>
                  )}
                  {results.tone && (
                    <div className="flex items-center gap-4 mb-2 text-gray-700 dark:text-stone-300">
                      <span className="font-medium">Tone:</span>
                      <span className="capitalize">{results.tone}</span>
                    </div>
                  )}
                  {results.key_emotions && results.key_emotions.length > 0 && (
                    <div className="flex items-center gap-4 text-gray-700 dark:text-stone-300">
                      <span className="font-medium">Emotions:</span>
                      <span>{results.key_emotions.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {results.suggestions && results.suggestions.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-stone-100 mb-2 flex items-center gap-2">
                  <LightBulbIcon className="w-5 h-5 text-orange-600" />
                  Smart Suggestions
                </h3>
                <ul className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg space-y-2">
                  {results.suggestions.map((suggestion, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-orange-600 mt-1">•</span>
                      <span className="text-gray-700 dark:text-stone-300">{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {results.actions && results.actions.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-stone-100 mb-2 flex items-center gap-2">
                  <LightBulbIcon className="w-5 h-5 text-orange-600" />
                  Action Items
                </h3>
                <ul className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg space-y-2">
                  {results.actions.map((action, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-orange-600 mt-1">✓</span>
                      <span className="text-gray-700 dark:text-stone-300">{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-900 dark:bg-stone-800 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-stone-700 transition mt-4"
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
