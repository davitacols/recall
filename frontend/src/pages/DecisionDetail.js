import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { LinkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

function DecisionDetail() {
  const { id } = useParams();
  const [decision, setDecision] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showLinkPR, setShowLinkPR] = useState(false);
  const [prUrl, setPrUrl] = useState('');
  const [linking, setLinking] = useState(false);

  const fetchDecision = async () => {
    try {
      const res = await api.get(`/api/decisions/${id}/`);
      setDecision(res.data);
    } catch (error) {
      console.error('Failed to fetch decision:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDecision();
  }, [id]);

  const handleLinkPR = async (e) => {
    e.preventDefault();
    if (!prUrl.trim()) return;
    
    setLinking(true);
    try {
      await api.post(`/api/decisions/${id}/link-pr/`, { pr_url: prUrl });
      setPrUrl('');
      setShowLinkPR(false);
      fetchDecision();
    } catch (error) {
      console.error('Failed to link PR:', error);
      alert('Failed to link PR');
    } finally {
      setLinking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (!decision) {
    return <div className="text-center py-8 text-gray-600">Decision not found</div>;
  }

  const impactConfig = {
    low: { bg: 'bg-blue-50', text: 'text-blue-900', label: 'Low' },
    medium: { bg: 'bg-amber-50', text: 'text-amber-900', label: 'Medium' },
    high: { bg: 'bg-orange-50', text: 'text-orange-900', label: 'High' },
    critical: { bg: 'bg-red-50', text: 'text-red-900', label: 'Critical' }
  };

  const statusConfig = {
    proposed: { bg: 'bg-gray-100', text: 'text-gray-900', label: 'Proposed' },
    under_review: { bg: 'bg-blue-100', text: 'text-blue-900', label: 'Under Review' },
    approved: { bg: 'bg-green-100', text: 'text-green-900', label: 'Approved' },
    rejected: { bg: 'bg-red-100', text: 'text-red-900', label: 'Rejected' },
    implemented: { bg: 'bg-emerald-100', text: 'text-emerald-900', label: 'Implemented' },
    cancelled: { bg: 'bg-gray-100', text: 'text-gray-900', label: 'Cancelled' }
  };

  const impact = impactConfig[decision.impact_level] || impactConfig.medium;
  const status = statusConfig[decision.status] || statusConfig.proposed;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-16">
        <a href="/decisions" className="text-sm text-gray-600 hover:text-gray-900 font-medium mb-4 inline-block">← Back to Decisions</a>
        
        <div className="mb-12">
          <h1 className="text-6xl font-black text-gray-900 mb-4 tracking-tight">{decision.title}</h1>
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`px-4 py-2 text-xs font-bold uppercase tracking-wide ${impact.bg} ${impact.text}`}>
              {impact.label} Impact
            </span>
            <span className={`px-4 py-2 text-xs font-bold uppercase tracking-wide ${status.bg} ${status.text}`}>
              {status.label}
            </span>
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-4 gap-6 mb-16">
          <div className="p-6 bg-white border border-gray-200">
            <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-2">Owner</p>
            <p className="text-lg font-bold text-gray-900">{decision.decision_maker_name}</p>
          </div>
          <div className="p-6 bg-white border border-gray-200">
            <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-2">Created</p>
            <p className="text-lg font-bold text-gray-900">{new Date(decision.created_at).toLocaleDateString()}</p>
          </div>
          <div className="p-6 bg-white border border-gray-200">
            <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-2">Decided</p>
            <p className="text-lg font-bold text-gray-900">{decision.decided_at ? new Date(decision.decided_at).toLocaleDateString() : '−'}</p>
          </div>
          <div className="p-6 bg-white border border-gray-200">
            <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-2">Confidence</p>
            <p className="text-lg font-bold text-gray-900">{decision.confidence?.score || '−'}%</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-8 mb-12 border-b border-gray-200 pb-4">
          {['overview', 'rationale', 'code', 'details'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-sm font-bold uppercase tracking-wide transition-all ${
                activeTab === tab
                  ? 'text-gray-900 border-b-2 border-gray-900 pb-4'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="grid grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="col-span-2">
            {activeTab === 'overview' && (
              <div className="p-8 bg-white border border-gray-200">
                <h2 className="text-2xl font-black text-gray-900 mb-6">Overview</h2>
                <div className="space-y-4 text-gray-700 font-light">
                  {decision.description.split('\n\n').map((paragraph, idx) => (
                    <p key={idx} className="leading-relaxed">{paragraph}</p>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'rationale' && (
              <div className="p-8 bg-white border border-gray-200">
                <h2 className="text-2xl font-black text-gray-900 mb-6">Rationale</h2>
                {decision.rationale ? (
                  <div className="space-y-4 text-gray-700 font-light">
                    {decision.rationale.split('\n\n').map((paragraph, idx) => (
                      <p key={idx} className="leading-relaxed">{paragraph}</p>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">No rationale provided</p>
                )}
              </div>
            )}

            {activeTab === 'code' && (
              <div className="p-8 bg-white border border-gray-200">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black text-gray-900">Related Code</h2>
                  <button
                    onClick={() => setShowLinkPR(!showLinkPR)}
                    className="px-6 py-3 border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white font-bold uppercase text-sm transition-all"
                  >
                    {showLinkPR ? 'Cancel' : 'Link PR'}
                  </button>
                </div>

                {showLinkPR && (
                  <form onSubmit={handleLinkPR} className="mb-8 p-6 bg-gray-50 border border-gray-200">
                    <label className="block text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">PR URL</label>
                    <div className="flex gap-3">
                      <input
                        type="url"
                        value={prUrl}
                        onChange={(e) => setPrUrl(e.target.value)}
                        placeholder="https://github.com/owner/repo/pull/123"
                        className="flex-1 px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
                      />
                      <button
                        type="submit"
                        disabled={!prUrl.trim() || linking}
                        className="px-6 py-3 bg-gray-900 text-white hover:bg-black font-bold uppercase text-sm transition-all disabled:opacity-50"
                      >
                        {linking ? 'Linking...' : 'Link'}
                      </button>
                    </div>
                  </form>
                )}

                {decision.code_links && decision.code_links.length > 0 ? (
                  <div className="space-y-3">
                    {decision.code_links.map((link, idx) => (
                      <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-6 border border-gray-200 hover:border-gray-900 hover:shadow-md transition-all"
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <LinkIcon className="w-5 h-5 text-gray-600 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="font-bold text-gray-900 truncate">
                              {link.title || `PR #${link.number}`}
                            </div>
                            <div className="text-xs text-gray-600 truncate">{link.url}</div>
                          </div>
                        </div>
                        <span className="text-gray-600 ml-4">→</span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <LinkIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">No linked PRs</p>
                    <p className="text-sm text-gray-500 mt-2">Link PRs to track implementation</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'details' && (
              <div className="space-y-6">
                {decision.context_reason && (
                  <div className="p-8 bg-white border border-gray-200">
                    <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-4">Context</h3>
                    <p className="text-gray-700 font-light">{decision.context_reason}</p>
                  </div>
                )}

                {decision.if_this_fails && (
                  <div className="p-8 bg-red-50 border border-red-200">
                    <div className="flex gap-4">
                      <ExclamationTriangleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="text-xs font-bold text-red-900 uppercase tracking-wide mb-2">If This Fails</h3>
                        <p className="text-red-800 font-light">{decision.if_this_fails}</p>
                      </div>
                    </div>
                  </div>
                )}

                {decision.alternatives_considered && decision.alternatives_considered.length > 0 && (
                  <div className="p-8 bg-white border border-gray-200">
                    <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-4">Alternatives Considered</h3>
                    <ul className="space-y-3">
                      {(Array.isArray(decision.alternatives_considered) ? decision.alternatives_considered : [decision.alternatives_considered]).map((alt, idx) => (
                        <li key={idx} className="flex gap-3 text-gray-700 font-light">
                          <span className="text-gray-400 flex-shrink-0">•</span>
                          <span>{alt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Confidence Score */}
            {decision.confidence && (
              <div className="p-8 bg-white border border-gray-200">
                <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-6">Confidence</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-end justify-between mb-3">
                      <span className="text-4xl font-black text-gray-900">{decision.confidence.score}%</span>
                      <span className={`text-xs font-bold uppercase px-3 py-1 ${
                        decision.confidence.level === 'High' ? 'bg-green-100 text-green-900' :
                        decision.confidence.level === 'Medium' ? 'bg-amber-100 text-amber-900' :
                        'bg-red-100 text-red-900'
                      }`}>
                        {decision.confidence.level}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200">
                      <div
                        className={`h-2 transition-all ${
                          decision.confidence.level === 'High' ? 'bg-green-600' :
                          decision.confidence.level === 'Medium' ? 'bg-amber-600' :
                          'bg-red-600'
                        }`}
                        style={{ width: `${decision.confidence.score}%` }}
                      ></div>
                    </div>
                  </div>
                  {decision.confidence.factors && (
                    <div className="pt-4 border-t border-gray-200 space-y-2">
                      {decision.confidence.factors.map((factor, idx) => (
                        <div key={idx} className="text-xs text-gray-600 font-light">
                          <span className="text-gray-400">•</span> {factor}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Info */}
            <div className="p-8 bg-white border border-gray-200">
              <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-6">Quick Info</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-2">Status</p>
                  <span className={`inline-block px-3 py-1 text-xs font-bold uppercase ${status.bg} ${status.text}`}>
                    {status.label}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-2">Impact</p>
                  <span className={`inline-block px-3 py-1 text-xs font-bold uppercase ${impact.bg} ${impact.text}`}>
                    {impact.label}
                  </span>
                </div>
                {decision.implementation_deadline && (
                  <div>
                    <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-2">Deadline</p>
                    <p className="text-sm font-bold text-gray-900">{new Date(decision.implementation_deadline).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DecisionDetail;
