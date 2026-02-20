import React, { useState } from 'react';
import { useTheme } from '../utils/ThemeAndAccessibility';

export default function AIAssistant({ content, contentType = 'conversation', onApply }) {
  const { darkMode } = useTheme();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [actionItems, setActionItems] = useState([]);
  const [tags, setTags] = useState([]);
  const [showPanel, setShowPanel] = useState(false);

  const bgSecondary = darkMode ? 'bg-stone-900' : 'bg-white';
  const borderColor = darkMode ? 'border-stone-800' : 'border-gray-200';
  const textPrimary = darkMode ? 'text-stone-100' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-stone-400' : 'text-gray-600';

  const generateSummary = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/organizations/ai/summary/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content, content_type: contentType })
      });
      const data = await res.json();
      setSummary(data.summary);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSuggestions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/organizations/ai/suggestions/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content, content_type: contentType })
      });
      const data = await res.json();
      setSuggestions(data.suggestions);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const extractActions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/organizations/ai/actions/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      });
      const data = await res.json();
      setActionItems(data.action_items);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const suggestTags = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/organizations/ai/tags/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      });
      const data = await res.json();
      setTags(data.tags);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const runAll = async () => {
    await Promise.all([
      generateSummary(),
      getSuggestions(),
      extractActions(),
      suggestTags()
    ]);
    setShowPanel(true);
  };

  if (!content) return null;

  return (
    <div className="mb-4">
      <button
        onClick={runAll}
        disabled={loading}
        className={`px-4 py-2 ${darkMode ? 'bg-stone-800 hover:bg-stone-700 text-stone-100 border-stone-700' : 'bg-white hover:bg-gray-50 text-gray-900 border-gray-200'} border rounded-lg transition-all disabled:opacity-50 font-medium text-sm`}
      >
        {loading ? 'Analyzing...' : 'Recall Insights'}
      </button>

      {showPanel && (
        <div className={`mt-4 ${bgSecondary} border ${borderColor} rounded-lg overflow-hidden`}>
          {summary && (
            <div className={`p-4 border-b ${borderColor}`}>
              <h3 className={`text-xs font-semibold ${textSecondary} uppercase tracking-wide mb-2`}>
                Summary
              </h3>
              <p className={`${textPrimary} text-sm leading-relaxed`}>{summary}</p>
            </div>
          )}

          {suggestions.length > 0 && (
            <div className={`p-4 border-b ${borderColor}`}>
              <h3 className={`text-xs font-semibold ${textSecondary} uppercase tracking-wide mb-3`}>
                Related Topics
              </h3>
              <div className="space-y-2">
                {suggestions.map((s, i) => (
                  <div key={i} className={`${textPrimary} text-sm flex items-start gap-2`}>
                    <span className={`${textSecondary} mt-0.5`}>{i + 1}.</span>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {actionItems.length > 0 && (
            <div className={`p-4 border-b ${borderColor}`}>
              <h3 className={`text-xs font-semibold ${textSecondary} uppercase tracking-wide mb-3`}>
                Action Items
              </h3>
              <div className="space-y-2">
                {actionItems.map((item, i) => (
                  <div key={i} className={`${textPrimary} text-sm flex items-start gap-2`}>
                    <span className={`${textSecondary}`}>•</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tags.length > 0 && (
            <div className="p-4">
              <h3 className={`text-xs font-semibold ${textSecondary} uppercase tracking-wide mb-3`}>Suggested Tags</h3>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, i) => (
                  <span key={i} className={`px-2.5 py-1 ${darkMode ? 'bg-stone-800 text-stone-300' : 'bg-gray-100 text-gray-700'} rounded text-xs font-medium`}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
