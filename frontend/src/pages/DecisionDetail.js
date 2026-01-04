import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { CheckCircleIcon, ExclamationTriangleIcon, LinkIcon, CalendarIcon } from '@heroicons/react/24/outline';

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
        <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!decision) {
    return <div className="text-center py-8 text-slate-600">Decision not found</div>;
  }

  const impactConfig = {
    low: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900', label: 'Low' },
    medium: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900', label: 'Medium' },
    high: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-900', label: 'High' },
    critical: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-900', label: 'Critical' }
  };

  const statusConfig = {
    proposed: { bg: 'bg-slate-100', text: 'text-slate-800', icon: '◯' },
    under_review: { bg: 'bg-blue-100', text: 'text-blue-800', icon: '◐' },
    approved: { bg: 'bg-green-100', text: 'text-green-800', icon: '✓' },
    rejected: { bg: 'bg-red-100', text: 'text-red-800', icon: '✕' },
    implemented: { bg: 'bg-emerald-100', text: 'text-emerald-800', icon: '✓' },
    cancelled: { bg: 'bg-slate-100', text: 'text-slate-800', icon: '−' }
  };

  const impact = decision ? (impactConfig[decision.impact_level] || impactConfig.medium) : impactConfig.medium;
  const status = decision ? (statusConfig[decision.status] || statusConfig.proposed) : statusConfig.proposed;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-slate-900 mb-4">{decision.title}</h1>
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium border ${impact.bg} ${impact.border} ${impact.text}`}>
                  <span className="w-2 h-2 rounded-full bg-current"></span>
                  {impact.label} Impact
                </span>
                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium ${status.bg} ${status.text}`}>
                  {status.icon} {decision.status.replace('_', ' ').charAt(0).toUpperCase() + decision.status.replace('_', ' ').slice(1)}
                </span>
              </div>
            </div>
          </div>

          {/* Metadata Bar */}
          <div className="grid grid-cols-4 gap-4 pt-6 border-t border-slate-200">
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Owner</div>
              <div className="text-sm font-medium text-slate-900">{decision.decision_maker_name}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Created</div>
              <div className="text-sm font-medium text-slate-900">{new Date(decision.created_at).toLocaleDateString()}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Decided</div>
              <div className="text-sm font-medium text-slate-900">
                {decision.decided_at ? new Date(decision.decided_at).toLocaleDateString() : '−'}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Confidence</div>
              <div className="text-sm font-medium text-slate-900">{decision.confidence?.score || '−'}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-8">
            {['overview', 'rationale', 'code', 'details'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="col-span-2">
            {activeTab === 'overview' && (
              <div className="bg-white rounded-lg border border-slate-200 p-8">
                <h2 className="text-lg font-bold text-slate-900 mb-6">Overview</h2>
                <div className="prose prose-sm max-w-none text-slate-700 space-y-4">
                  {decision.description.split('\n\n').map((paragraph, idx) => (
                    <p key={idx} className="leading-relaxed">{paragraph}</p>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'rationale' && (
              <div className="bg-white rounded-lg border border-slate-200 p-8">
                <h2 className="text-lg font-bold text-slate-900 mb-6">Rationale</h2>
                {decision.rationale ? (
                  <div className="prose prose-sm max-w-none text-slate-700 space-y-4">
                    {decision.rationale.split('\n\n').map((paragraph, idx) => (
                      <p key={idx} className="leading-relaxed">{paragraph}</p>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-600">No rationale provided</p>
                )}
              </div>
            )}

            {activeTab === 'code' && (
              <div className="bg-white rounded-lg border border-slate-200 p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-slate-900">Related Code</h2>
                  <button
                    onClick={() => setShowLinkPR(!showLinkPR)}
                    className="px-3 py-1 text-sm font-medium border border-slate-900 text-slate-900 hover:bg-slate-50 transition-colors"
                  >
                    {showLinkPR ? '−' : '+'} Link PR
                  </button>
                </div>

                {showLinkPR && (
                  <form onSubmit={handleLinkPR} className="mb-6 p-4 bg-slate-50 border border-slate-200">
                    <label className="block text-sm font-medium text-slate-900 mb-2">PR URL</label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={prUrl}
                        onChange={(e) => setPrUrl(e.target.value)}
                        placeholder="https://github.com/owner/repo/pull/123"
                        className="flex-1 px-3 py-2 border border-slate-300 text-sm focus:border-slate-900 focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={!prUrl.trim() || linking}
                        className="px-4 py-2 bg-slate-900 text-white font-medium hover:bg-slate-800 disabled:opacity-50 text-sm"
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
                        className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-slate-900 hover:bg-slate-50 transition-all group"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <LinkIcon className="w-5 h-5 text-slate-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="font-medium text-slate-900 group-hover:underline truncate">
                              {link.title || `PR #${link.number}`}
                            </div>
                            <div className="text-xs text-slate-500 truncate">{link.url}</div>
                          </div>
                        </div>
                        <span className="text-slate-400 group-hover:text-slate-900 ml-2">→</span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <LinkIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600 font-medium">No linked PRs</p>
                    <p className="text-sm text-slate-500 mt-1">Link PRs to track implementation</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'details' && (
              <div className="space-y-6">
                {decision.context_reason && (
                  <div className="bg-white rounded-lg border border-slate-200 p-8">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">Context</h3>
                    <p className="text-slate-700">{decision.context_reason}</p>
                  </div>
                )}

                {decision.if_this_fails && (
                  <div className="bg-red-50 rounded-lg border border-red-200 p-8">
                    <div className="flex gap-3">
                      <ExclamationTriangleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="text-sm font-bold text-red-900 uppercase tracking-wide mb-2">If This Fails</h3>
                        <p className="text-red-800">{decision.if_this_fails}</p>
                      </div>
                    </div>
                  </div>
                )}

                {decision.alternatives_considered && decision.alternatives_considered.length > 0 && (
                  <div className="bg-white rounded-lg border border-slate-200 p-8">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">Alternatives Considered</h3>
                    <ul className="space-y-2">
                      {(Array.isArray(decision.alternatives_considered) ? decision.alternatives_considered : [decision.alternatives_considered]).map((alt, idx) => (
                        <li key={idx} className="flex gap-3 text-slate-700">
                          <span className="text-slate-400 flex-shrink-0">•</span>
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
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">Confidence</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-end justify-between mb-2">
                      <span className="text-2xl font-bold text-slate-900">{decision.confidence.score}%</span>
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${
                        decision.confidence.level === 'High' ? 'bg-green-100 text-green-800' :
                        decision.confidence.level === 'Medium' ? 'bg-amber-100 text-amber-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {decision.confidence.level}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          decision.confidence.level === 'High' ? 'bg-green-500' :
                          decision.confidence.level === 'Medium' ? 'bg-amber-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${decision.confidence.score}%` }}
                      ></div>
                    </div>
                  </div>
                  {decision.confidence.factors && (
                    <div className="pt-4 border-t border-slate-200 space-y-2">
                      {decision.confidence.factors.map((factor, idx) => (
                        <div key={idx} className="text-xs text-slate-600">
                          <span className="text-slate-400">•</span> {factor}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Info */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">Quick Info</h3>
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Status</div>
                  <div className={`inline-flex items-center gap-2 px-2 py-1 rounded text-xs font-medium ${status.bg} ${status.text}`}>
                    {status.icon} {decision.status.replace('_', ' ')}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Impact Level</div>
                  <div className={`inline-flex items-center gap-2 px-2 py-1 rounded text-xs font-medium ${impact.bg} ${impact.border} ${impact.text}`}>
                    {impact.label}
                  </div>
                </div>
                {decision.implementation_deadline && (
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Deadline</div>
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <CalendarIcon className="w-4 h-4 text-slate-400" />
                      {new Date(decision.implementation_deadline).toLocaleDateString()}
                    </div>
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
