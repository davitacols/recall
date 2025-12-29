import React, { useState } from 'react';
import { SparklesIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

function AskRecall() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await api.post('/api/knowledge/search/', { query });
      const answer = {
        question: query,
        answer: response.data.results?.length > 0 
          ? `Based on ${response.data.results.length} relevant conversations, here's what I found: ${response.data.results[0].content_preview}`
          : 'I couldn\'t find specific information about this in your organization\'s memory.',
        confidence: response.data.results?.length > 0 ? 'High' : 'Low',
        sources: response.data.results?.slice(0, 5).map(r => ({
          id: r.id,
          title: r.title,
          type: r.content_type,
          date: new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        })) || []
      };
      setResults(answer);
      setHistory([answer, ...history]);
    } catch (error) {
      console.error('Search failed:', error);
      setResults({
        question: query,
        answer: 'Failed to search. Please try again.',
        confidence: 'Low',
        sources: []
      });
    } finally {
      setLoading(false);
    }
  };

  const suggestedQuestions = [
    'Why did we choose this architecture?',
    'What were the main concerns about security?',
    'How did we decide on the tech stack?',
    'What are our performance requirements?'
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-12 animate-fadeIn">
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-16 h-16 bg-gray-900 flex items-center justify-center">
            <SparklesIcon className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-5xl font-bold text-gray-900">Ask Recall</h1>
            <p className="text-xl text-gray-600 mt-2">AI-powered search through your organization's memory</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-12">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask anything about your organization..."
            className="w-full px-6 py-5 border border-gray-300 text-lg focus:border-gray-900 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 recall-btn-primary disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Ask'}
          </button>
        </div>
      </form>

      {/* Suggested Questions */}
      {!results && !loading && (
        <div className="mb-12">
          <p className="text-lg font-bold text-gray-900 mb-4">Try asking:</p>
          <div className="space-y-3">
            {suggestedQuestions.map((question, idx) => (
              <button
                key={idx}
                onClick={() => setQuery(question)}
                className="w-full text-left px-6 py-4 border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white transition-all"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-20">
          <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-lg text-gray-600 mt-6">Searching through your organization's memory...</p>
        </div>
      )}

      {/* Results */}
      {results && !loading && (
        <div className="space-y-8">
          {/* Question */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Question</h2>
            <div className="border border-gray-200 p-6">
              <p className="text-lg text-gray-700">{results.question}</p>
            </div>
          </div>

          {/* Answer */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Answer</h2>
              <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                results.confidence === 'High' ? 'bg-gray-900 text-white' : 'border border-gray-900 text-gray-900'
              }`}>
                {results.confidence} Confidence
              </span>
            </div>
            <div className="border border-gray-200 p-8">
              <p className="text-lg text-gray-700 leading-relaxed">
                {results.answer}
              </p>
            </div>
          </div>

          {/* Sources */}
          {results.sources.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Related Sources</h2>
              <div className="space-y-3">
                {results.sources.map((source, idx) => (
                  <a
                    key={idx}
                    href={`/conversations/${source.id}`}
                    className="block border border-gray-200 p-6 hover:border-gray-900 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">{source.title}</h3>
                        <span className="px-3 py-1 bg-gray-900 text-white text-xs font-bold uppercase tracking-wide">
                          {source.type}
                        </span>
                      </div>
                      <span className="text-gray-600">{source.date}</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* New Search */}
          <div className="text-center pt-8">
            <button
              onClick={() => {
                setQuery('');
                setResults(null);
              }}
              className="recall-btn-secondary"
            >
              Ask Another Question
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AskRecall;
