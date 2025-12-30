import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeftIcon, CheckCircleIcon, ClockIcon, XCircleIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import DecisionLockBanner from '../components/DecisionLockBanner';
import AISuggestionsPanel from '../components/AISuggestionsPanel';
import ImpactReviewModal from '../components/ImpactReviewModal';

function DecisionDetail() {
  const { id } = useParams();
  const [decision, setDecision] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);

  useEffect(() => {
    fetchDecision();
  }, [id]);

  const fetchDecision = async () => {
    try {
      const response = await api.get(`/api/decisions/${id}/`);
      setDecision(response.data);
    } catch (error) {
      console.error('Failed to fetch decision:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      await api.post(`/api/decisions/${id}/approve/`);
      fetchDecision();
    } catch (error) {
      console.error('Failed to approve:', error);
    }
  };

  const handleImplement = async () => {
    try {
      await api.post(`/api/decisions/${id}/implement/`);
      fetchDecision();
    } catch (error) {
      console.error('Failed to mark as implemented:', error);
    }
  };

  const handleLock = async () => {
    const reason = prompt('Why are you locking this decision?');
    if (!reason) return;
    try {
      await api.post(`/api/decisions/${id}/lock/`, { reason });
      fetchDecision();
    } catch (error) {
      alert('Failed to lock decision');
    }
  };

  const handleOverride = async (reason) => {
    try {
      await api.post(`/api/decisions/${id}/override-lock/`, { reason });
      fetchDecision();
    } catch (error) {
      alert('Failed to override lock');
    }
  };

  const handleSubmitReview = async (reviewData) => {
    try {
      await api.post(`/api/decisions/${id}/impact-review/`, reviewData);
      fetchDecision();
    } catch (error) {
      alert('Failed to submit review');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
      case 'implemented':
        return <CheckCircleIcon className="w-4 h-4" />;
      case 'under_review':
      case 'proposed':
        return <ClockIcon className="w-4 h-4" />;
      case 'rejected':
      case 'cancelled':
        return <XCircleIcon className="w-4 h-4" />;
      default:
        return <ClockIcon className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!decision) {
    return (
      <div className="text-center py-20">
        <h3 className="text-2xl font-semibold text-gray-900 mb-4">Decision Not Found</h3>
        <Link to="/decisions" className="text-gray-600 hover:text-gray-900">
          ← Back to Decisions
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex gap-8">
        {/* Main Content */}
        <div className="flex-1">
          {/* Header */}
          <div className="mb-6">
            <Link 
              to="/decisions" 
              className="inline-flex items-center text-sm text-gray-600 hover:text-blue-600 mb-6 transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Back to Decisions
            </Link>
            
            <div className="flex items-center space-x-3 mb-6">
              <span className="px-3 py-1 bg-gray-900 text-white text-xs font-medium flex items-center space-x-2">
                {getStatusIcon(decision.status)}
                <span>{decision.status.replace('_', ' ')}</span>
              </span>
              <span className="text-xs text-gray-500">
                {new Date(decision.created_at).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </div>
            
            <h1 className="text-3xl font-semibold text-gray-900 mb-6">{decision.title}</h1>
            
            <div className="flex items-center space-x-3">
              <Link to="/profile" className="w-10 h-10 bg-gray-900 flex items-center justify-center">
                <span className="text-white font-medium text-sm">
                  {decision.decision_maker_name?.charAt(0).toUpperCase()}
                </span>
              </Link>
              <div>
                <Link to="/profile" className="font-medium text-gray-900 hover:text-blue-600 transition-colors">{decision.decision_maker_name}</Link>
                <div className="text-sm text-gray-500">Decision Maker</div>
              </div>
            </div>
          </div>

          {/* Phase 2: Lock Banner */}
          <DecisionLockBanner decision={decision} onOverride={handleOverride} />

          {/* Phase 2: AI Suggestions */}
          <AISuggestionsPanel decisionId={id} />

          {/* Content */}
          <div className="bg-white border border-gray-200 mb-8">
            <div className="p-8">
              <h3 className="font-semibold text-gray-900 mb-4 text-sm">
                Description
              </h3>
              <p className="text-base leading-relaxed text-gray-700 mb-8">
                {decision.description}
              </p>

              {decision.rationale && (
                <>
                  <h3 className="font-semibold text-gray-900 mb-4 text-sm">
                    Rationale
                  </h3>
                  <div className="p-6 bg-blue-50 border-l-4 border-blue-600 mb-8">
                    <p className="text-gray-700">{decision.rationale}</p>
                  </div>
                </>
              )}

              {decision.impact && (
                <>
                  <h3 className="font-semibold text-gray-900 mb-4 text-sm">
                    Impact
                  </h3>
                  <p className="text-gray-700 mb-8">{decision.impact}</p>
                </>
              )}

              {/* Actions */}
              {decision.status === 'approved' && (
                <div className="pt-6 border-t border-gray-200 flex gap-3">
                  <button
                    onClick={handleImplement}
                    className="px-6 py-3 bg-gray-900 text-white hover:bg-gray-800 transition-colors"
                  >
                    Mark as Implemented
                  </button>
                  {!decision.is_locked && (
                    <button
                      onClick={handleLock}
                      className="px-6 py-3 border border-gray-900 text-gray-900 hover:bg-gray-100 transition-colors"
                    >
                      Lock Decision
                    </button>
                  )}
                </div>
              )}

              {decision.status === 'implemented' && !decision.review_completed_at && (
                <div className="pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setShowReviewModal(true)}
                    className="px-6 py-3 bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    Submit Impact Review
                  </button>
                </div>
              )}

              {decision.status === 'under_review' && (
                <div className="pt-6 border-t border-gray-200 flex space-x-3">
                  <button
                    onClick={handleApprove}
                    className="px-6 py-3 bg-green-600 text-white hover:bg-green-700 transition-colors"
                  >
                    Approve Decision
                  </button>
                  <button
                    className="px-6 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Request Changes
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-96 flex-shrink-0 sticky top-4 self-start space-y-6">
          {/* Confidence Indicator */}
          {decision.confidence && (
            <div className={`border p-6 ${
              decision.confidence.color === 'green' ? 'bg-green-50 border-green-200' :
              decision.confidence.color === 'blue' ? 'bg-blue-50 border-blue-200' :
              'bg-yellow-50 border-yellow-200'
            }`}>
              <h3 className="font-semibold text-gray-900 mb-4 text-sm">
                Decision Confidence
              </h3>
              <div className="text-center mb-4">
                <div className={`text-5xl font-bold ${
                  decision.confidence.color === 'green' ? 'text-green-600' :
                  decision.confidence.color === 'blue' ? 'text-blue-600' :
                  'text-yellow-600'
                }`}>
                  {decision.confidence.score}%
                </div>
                <div className="text-sm font-semibold text-gray-900 mt-2">
                  {decision.confidence.level}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm p-3 bg-white">
                  <span className="text-gray-700">👍 Agree</span>
                  <span className="font-semibold text-gray-900">{decision.confidence.agree_count}</span>
                </div>
                <div className="flex items-center justify-between text-sm p-3 bg-white">
                  <span className="text-gray-700">🤔 Unsure</span>
                  <span className="font-semibold text-gray-900">{decision.confidence.unsure_count}</span>
                </div>
                <div className="flex items-center justify-between text-sm p-3 bg-white">
                  <span className="text-gray-700">👎 Concern</span>
                  <span className="font-semibold text-gray-900">{decision.confidence.concern_count}</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-300">
                <p className="text-xs text-gray-700">
                  Based on {decision.confidence.factors.join(', ')}
                </p>
              </div>
            </div>
          )}
          
          {/* Timeline */}
          <div className="bg-white border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm">
              Timeline
            </h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-gray-900 mt-2 flex-shrink-0"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Created</p>
                  <p className="text-xs text-gray-500">
                    {new Date(decision.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
              {decision.approved_at && (
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-600 mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Approved</p>
                    <p className="text-xs text-gray-500">
                      {new Date(decision.approved_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              )}
              {decision.implemented_at && (
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-purple-600 mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Implemented</p>
                    <p className="text-xs text-gray-500">
                      {new Date(decision.implemented_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Related Conversation */}
          {decision.conversation && (
            <div className="bg-white border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 text-sm">
                Related Conversation
              </h3>
              <Link 
                to={`/conversations/${decision.conversation}`}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                View Original Discussion →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Phase 2: Impact Review Modal */}
      {showReviewModal && (
        <ImpactReviewModal
          decision={decision}
          onSubmit={handleSubmitReview}
          onClose={() => setShowReviewModal(false)}
        />
      )}
    </div>
  );
}

export default DecisionDetail;
