import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

function FAQ() {
  const [faqItems, setFaqItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchFAQ();
  }, []);

  const fetchFAQ = async () => {
    try {
      const response = await api.get('/api/knowledge/faq/');
      setFaqItems(response.data.faq_items || []);
    } catch (error) {
      console.error('Failed to fetch FAQ:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = faqItems.filter(item =>
    item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8 pb-6 border-b-2 border-gray-900">
        <h1 className="text-5xl font-bold text-gray-900 mb-2 uppercase tracking-tight">
          Frequently Asked Questions
        </h1>
        <p className="text-lg text-gray-600">
          {faqItems.length} questions answered • Auto-generated from resolved conversations
        </p>
      </div>

      {/* Search */}
      <div className="mb-8">
        <input
          type="text"
          placeholder="SEARCH FAQ..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-4 border-2 border-gray-900 focus:outline-none focus:border-gray-700 text-lg font-medium uppercase tracking-wide"
        />
      </div>

      {/* FAQ Items */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 border-2 border-gray-900">
          <h3 className="text-2xl font-bold text-gray-900 mb-4 uppercase">
            {searchTerm ? 'No Results Found' : 'No FAQ Items Yet'}
          </h3>
          <p className="text-gray-600 max-w-md mx-auto">
            {searchTerm 
              ? 'Try a different search term' 
              : 'FAQ items are automatically generated from resolved questions'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <div key={item.id} className="bg-white border-2 border-gray-900">
              <button
                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                className="w-full p-6 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {item.question}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>{item.reply_count} replies</span>
                      <span>•</span>
                      <span>{item.view_count} views</span>
                      {item.keywords?.length > 0 && (
                        <>
                          <span>•</span>
                          <div className="flex space-x-2">
                            {item.keywords.slice(0, 3).map((keyword, idx) => (
                              <span key={idx} className="px-2 py-1 bg-gray-100 text-xs font-bold uppercase">
                                {keyword}
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 text-2xl font-bold text-gray-900">
                    {expandedId === item.id ? '−' : '+'}
                  </div>
                </div>
              </button>
              
              {expandedId === item.id && (
                <div className="border-t-2 border-gray-900 p-6 bg-gray-50">
                  <p className="text-lg text-gray-700 leading-relaxed mb-4">
                    {item.full_answer}
                  </p>
                  <Link
                    to={`/conversations/${item.id}`}
                    className="inline-block px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 font-bold uppercase tracking-wide text-sm"
                  >
                    View Full Discussion
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      {faqItems.length > 0 && (
        <div className="mt-8 p-6 bg-white border-2 border-gray-900">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-gray-900">{faqItems.length}</div>
              <div className="text-sm text-gray-600 uppercase tracking-wide font-bold mt-1">
                Total Questions
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">
                {faqItems.reduce((sum, item) => sum + item.reply_count, 0)}
              </div>
              <div className="text-sm text-gray-600 uppercase tracking-wide font-bold mt-1">
                Total Answers
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">
                {faqItems.reduce((sum, item) => sum + item.view_count, 0)}
              </div>
              <div className="text-sm text-gray-600 uppercase tracking-wide font-bold mt-1">
                Total Views
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FAQ;
