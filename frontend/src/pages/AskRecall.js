import React, { useState } from 'react';
import { SparklesIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

function AskRecall() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

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
          : 'No specific information found in your organization\'s memory.',
        confidence: response.data.results?.length > 0 ? 85 : 20,
        linkedDecisions: response.data.results?.filter(r => r.content_type === 'decision').slice(0, 3) || [],
        sources: response.data.results?.slice(0, 5).map(r => ({
          id: r.id,
          title: r.title,
          type: r.content_type,
          date: new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        })) || []
      };
      setResults(answer);
    } catch (error) {
      console.error('Search failed:', error);
      setResults({
        question: query,
        answer: 'Search failed. Please try again.',
        confidence: 0,
        linkedDecisions: [],
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
      <div className="mb-12">
        <h1 className="text-5xl font-bold text-gray-900 mb-3">Ask Recall</h1>
        <p className="text-xl text-gray-600">Search your organization's memory</p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-12">
        <div className="border border-gray-300 focus-within:border-gray-900 transition-colors">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask anything about your organization..."
            className="w-full px-6 py-5 text-lg focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="mt-4 recall-btn-primary disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {/* Suggested Questions */}
      {!results && !loading && (
        <div className="mb-12">
          <p className="text-base font-bold text-gray-900 mb-4">Suggested questions:</p>
          <div className="space-y-2">
            {suggestedQuestions.map((question, idx) => (
              <button
                key={idx}
                onClick={() => setQuery(question)}
                className="w-full text-left px-5 py-3 border border-gray-200 text-gray-700 hover:border-gray-900 transition-all text-base"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="py-20">
          <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-center text-base text-gray-600">Searching...</p>
        </div>
      )}

      {/* Results */}
      {results && !loading && (
        <div className="space-y-8">
          {/* Answer */}
          <div className="bg-gray-50 border border-gray-200 p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Answer</h2>
            <p className="text-base text-gray-700 leading-relaxed mb-6">
              {results.answer}
            </p>
            
            {/* Confidence Indicator */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Confidence</span>
                <span className="text-sm font-bold text-gray-900">{results.confidence}%</span>
              </div>
              <div className="w-full bg-gray-200 h-2">
                <div 
                  className="bg-gray-900 h-2" 
                  style={{ width: `${results.confidence}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Linked Decisions */}
          {results.linkedDecisions.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">Related Decisions</h2>
              <div className="space-y-2">
                {results.linkedDecisions.map((decision, idx) => (
                  <a
                    key={idx}
                    href={`/decisions/${decision.id}`}
                    className="block border border-gray-200 p-4 hover:border-gray-900 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base font-medium text-gray-900">{decision.title}</span>
                      <span className="text-sm text-gray-500">{decision.date}</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Sources */}
          {results.sources.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">Sources</h2>
              <div className="space-y-2">
                {results.sources.map((source, idx) => (
                  <a
                    key={idx}
                    href={`/conversations/${source.id}`}
                    className="block border border-gray-200 p-4 hover:border-gray-900 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-base font-medium text-gray-900">{source.title}</span>
                        <span className="ml-3 text-xs px-2 py-1 bg-gray-100 text-gray-700 font-medium">
                          {source.type}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">{source.date}</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* New Search */}
          <div className="pt-4">
            <button
              onClick={() => {
                setQuery('');
                setResults(null);
              }}
              className="recall-btn-secondary"
            >
              New Search
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AskRecall;
