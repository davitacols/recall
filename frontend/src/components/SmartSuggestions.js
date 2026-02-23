import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LightBulbIcon } from '@heroicons/react/24/outline';

export default function SmartSuggestions({ title, content, type = 'conversation' }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (title?.length > 5 || content?.length > 20) {
      const timer = setTimeout(() => fetchSuggestions(), 500);
      return () => clearTimeout(timer);
    }
  }, [title, content]);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/knowledge/ai-suggestions/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: `${title} ${content}`,
          type
        })
      });
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!suggestions.length && !loading) return null;

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <LightBulbIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <h3 className="font-semibold text-blue-900 dark:text-blue-200">
          Similar Content Found
        </h3>
      </div>
      {loading ? (
        <p className="text-sm text-blue-700 dark:text-blue-300">Searching...</p>
      ) : (
        <div className="space-y-2">
          {suggestions.map((item, idx) => (
            <Link
              key={idx}
              to={item.url}
              className="block p-3 bg-white dark:bg-gray-800 rounded border border-blue-200 dark:border-blue-700 hover:border-blue-400 transition"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {item.type}
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{item.title}</span>
                </div>
                <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                  {Math.round(item.relevance * 100)}%
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1 mb-1">{item.excerpt}</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 italic">{item.reason}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
