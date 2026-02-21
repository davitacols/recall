import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlassIcon, ClockIcon, DocumentTextIcon, ChatBubbleLeftIcon, ListBulletIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

export const GlobalSearch = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ issues: [], conversations: [], decisions: [], recent: [] });
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      loadRecent();
    }
  }, [isOpen]);

  useEffect(() => {
    if (query.length > 2) {
      const timer = setTimeout(() => search(), 300);
      return () => clearTimeout(timer);
    } else {
      setResults({ ...results, issues: [], conversations: [], decisions: [] });
    }
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const total = getTotalResults();
        setSelected(s => (s + 1) % total);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const total = getTotalResults();
        setSelected(s => (s - 1 + total) % total);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        navigateToSelected();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selected, results]);

  const loadRecent = async () => {
    try {
      const recent = JSON.parse(localStorage.getItem('recentSearches') || '[]');
      setResults({ ...results, recent });
    } catch (error) {
      console.error('Failed to load recent:', error);
    }
  };

  const search = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/organizations/search/?q=${query}`);
      const data = res.data || [];
      
      setResults({
        issues: data.filter(r => r.type === 'project'),
        conversations: data.filter(r => r.type === 'conversation'),
        decisions: data.filter(r => r.type === 'decision'),
        goals: data.filter(r => r.type === 'goal'),
        documents: data.filter(r => r.type === 'document'),
        recent: results.recent
      });
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTotalResults = () => {
    return results.issues.length + results.conversations.length + results.decisions.length + 
           (results.goals?.length || 0) + (results.documents?.length || 0) + results.recent.length;
  };

  const navigateToSelected = () => {
    const allResults = [
      ...results.recent.map(r => ({ ...r, type: 'recent' })),
      ...results.issues.map(i => ({ ...i, type: 'issue' })),
      ...results.conversations.map(c => ({ ...c, type: 'conversation' })),
      ...results.decisions.map(d => ({ ...d, type: 'decision' })),
      ...(results.goals || []).map(g => ({ ...g, type: 'goal' })),
      ...(results.documents || []).map(d => ({ ...d, type: 'document' }))
    ];

    const item = allResults[selected];
    if (!item) return;

    saveToRecent(item);

    if (item.type === 'issue') navigate(`/issues/${item.id}`);
    else if (item.type === 'conversation') navigate(`/conversations/${item.id}`);
    else if (item.type === 'decision') navigate(`/decisions/${item.id}`);
    else if (item.type === 'goal') navigate(`/business/goals/${item.id}`);
    else if (item.type === 'document') navigate(`/business/documents/${item.id}`);
    else if (item.url) navigate(item.url);

    onClose();
  };

  const saveToRecent = (item) => {
    try {
      const recent = JSON.parse(localStorage.getItem('recentSearches') || '[]');
      const newRecent = [
        { title: item.title, url: item.url || `/${item.type}s/${item.id}`, type: item.type },
        ...recent.filter(r => r.url !== (item.url || `/${item.type}s/${item.id}`))
      ].slice(0, 5);
      localStorage.setItem('recentSearches', JSON.stringify(newRecent));
    } catch (error) {
      console.error('Failed to save recent:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-32 z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Search Input */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search issues, conversations, decisions..."
              className="flex-1 text-lg outline-none"
            />
            {loading && <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>}
          </div>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {query.length === 0 && results.recent.length > 0 && (
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Recent</div>
              {results.recent.map((item, i) => (
                <button
                  key={i}
                  onClick={() => { navigate(item.url); onClose(); }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left ${
                    i === selected ? 'bg-purple-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <ClockIcon className="w-5 h-5 text-gray-400" />
                  <span className="flex-1 text-gray-900">{item.title}</span>
                </button>
              ))}
            </div>
          )}

          {results.issues.length > 0 && (
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Issues</div>
              {results.issues.map((issue, i) => {
                const index = results.recent.length + i;
                return (
                  <button
                    key={issue.id}
                    onClick={() => { navigate(`/issues/${issue.id}`); onClose(); }}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left ${
                      index === selected ? 'bg-purple-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <ListBulletIcon className="w-5 h-5 text-blue-500" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 truncate">{issue.title}</div>
                      <div className="text-sm text-gray-500">{issue.key} • {issue.status}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {results.conversations.length > 0 && (
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Conversations</div>
              {results.conversations.map((conv, i) => {
                const index = results.recent.length + results.issues.length + i;
                return (
                  <button
                    key={conv.id}
                    onClick={() => { navigate(`/conversations/${conv.id}`); onClose(); }}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left ${
                      index === selected ? 'bg-purple-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <ChatBubbleLeftIcon className="w-5 h-5 text-green-500" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 truncate">{conv.title}</div>
                      <div className="text-sm text-gray-500">{conv.reply_count || 0} replies</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {results.decisions.length > 0 && (
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Decisions</div>
              {results.decisions.map((decision, i) => {
                const index = results.recent.length + results.issues.length + results.conversations.length + i;
                return (
                  <button
                    key={decision.id}
                    onClick={() => { navigate(`/decisions/${decision.id}`); onClose(); }}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left ${
                      index === selected ? 'bg-purple-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <DocumentTextIcon className="w-5 h-5 text-purple-500" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 truncate">{decision.title}</div>
                      <div className="text-sm text-gray-500">{decision.status}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {query.length > 2 && getTotalResults() === 0 && !loading && (
            <div className="p-8 text-center text-gray-500">
              No results found for "{query}"
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-600 flex items-center justify-between">
          <div className="flex gap-4">
            <span><kbd className="px-2 py-1 bg-white border border-gray-300 rounded">↑↓</kbd> Navigate</span>
            <span><kbd className="px-2 py-1 bg-white border border-gray-300 rounded">Enter</kbd> Select</span>
            <span><kbd className="px-2 py-1 bg-white border border-gray-300 rounded">Esc</kbd> Close</span>
          </div>
        </div>
      </div>
    </div>
  );
};
