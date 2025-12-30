import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';

function MyQuestions() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchMyQuestions();
  }, []);

  const fetchMyQuestions = async () => {
    try {
      const response = await api.get('/api/conversations/?post_type=question');
      const myQuestions = (response.data.results || response.data).filter(
        q => q.author_id === user?.id
      );
      setQuestions(myQuestions);
    } catch (error) {
      console.error('Failed to fetch questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredQuestions = questions.filter(q => {
    if (filter === 'all') return true;
    if (filter === 'answered') return q.reply_count > 0;
    if (filter === 'unanswered') return q.reply_count === 0;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-5xl font-bold text-gray-900 mb-3">My Questions</h1>
        <p className="text-xl text-gray-600">Questions you've asked the team</p>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="border border-gray-200 p-6">
          <div className="text-4xl font-bold text-gray-900 mb-2">{questions.length}</div>
          <div className="text-sm text-gray-600 font-medium">Total Questions</div>
        </div>
        <div className="border border-gray-200 p-6">
          <div className="text-4xl font-bold text-green-600 mb-2">
            {questions.filter(q => q.reply_count > 0).length}
          </div>
          <div className="text-sm text-gray-600 font-medium">Answered</div>
        </div>
        <div className="border border-gray-200 p-6">
          <div className="text-4xl font-bold text-amber-600 mb-2">
            {questions.filter(q => q.reply_count === 0).length}
          </div>
          <div className="text-sm text-gray-600 font-medium">Unanswered</div>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-8">
        {['all', 'answered', 'unanswered'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 text-sm font-medium transition-colors capitalize ${
              filter === status
                ? 'bg-gray-900 text-white'
                : 'border border-gray-900 text-gray-900 hover:bg-gray-100'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {filteredQuestions.length === 0 ? (
        <div className="text-center py-20 border border-gray-200 bg-gray-50">
          <h3 className="text-2xl font-bold text-gray-900 mb-3">No questions yet</h3>
          <p className="text-lg text-gray-600 mb-8">
            Ask questions to get clarity from your team.
          </p>
          <a href="/conversations" className="recall-btn-primary inline-block">
            Ask a question
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQuestions.map((question) => (
            <Link
              key={question.id}
              to={`/conversations/${question.id}`}
              className="border border-gray-200 p-6 block hover:border-gray-900 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 text-xs font-bold uppercase bg-amber-100 text-amber-700">
                    QUESTION
                  </span>
                  {question.reply_count > 0 ? (
                    <span className="text-xs text-green-600 font-medium">
                      ✓ {question.reply_count} {question.reply_count === 1 ? 'answer' : 'answers'}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500 font-medium">
                      No answers yet
                    </span>
                  )}
                </div>
                <span className="text-sm text-gray-500">
                  {new Date(question.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">{question.title}</h3>
              {question.ai_summary && (
                <div className="bg-gray-50 border-l-2 border-gray-900 p-3">
                  <p className="text-sm text-gray-700">{question.ai_summary}</p>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyQuestions;
