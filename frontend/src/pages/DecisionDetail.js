import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import Button from '../components/Button';

function DecisionDetail() {
  const { id } = useParams();
  const [decision, setDecision] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showGithubSearch, setShowGithubSearch] = useState(false);
  const [showJiraCreate, setShowJiraCreate] = useState(false);

  useEffect(() => {
    fetchDecision();
  }, [id]);

  const fetchDecision = async () => {
    try {
      const res = await api.get(`/api/decisions/${id}/`);
      setDecision(res.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch decision:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!decision) {
    return <div className="text-center py-8 text-gray-600">Decision not found</div>;
  }

  const impactColors = {
    low: 'bg-blue-50 border-blue-200 text-blue-900',
    medium: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    high: 'bg-orange-50 border-orange-200 text-orange-900',
    critical: 'bg-red-50 border-red-200 text-red-900'
  };

  const statusColors = {
    proposed: 'bg-gray-100 text-gray-800',
    under_review: 'bg-blue-100 text-blue-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    implemented: 'bg-green-100 text-green-800',
    cancelled: 'bg-gray-100 text-gray-800'
  };

  return (
    <div className="flex justify-center">
      <div className="max-w-6xl w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-gray-900 mb-3">{decision.title}</h1>
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`px-3 py-1 text-sm font-medium border ${impactColors[decision.impact_level]}`}>
                  {decision.impact_level.charAt(0).toUpperCase() + decision.impact_level.slice(1)} Impact
                </span>
                <span className={`px-3 py-1 text-sm font-medium ${statusColors[decision.status]}`}>
                  {decision.status.replace('_', ' ').charAt(0).toUpperCase() + decision.status.replace('_', ' ').slice(1)}
                </span>
                <span className="text-sm text-gray-600">By {decision.decision_maker_name}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="col-span-2 space-y-6">
            {/* Description */}
            <section className="border border-gray-200 p-8">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Overview</h2>
              <div className="prose prose-sm max-w-none text-gray-700 space-y-4">
                {decision.description.split('\n\n').map((paragraph, idx) => (
                  <div key={idx}>
                    {paragraph.split('\n').map((line, lineIdx) => {
                      if (line.trim().startsWith('-') || line.trim().startsWith('•')) {
                        return (
                          <div key={lineIdx} className="flex gap-3 ml-4">
                            <span className="text-gray-900 font-bold">•</span>
                            <span>{line.replace(/^[-•]\s*/, '')}</span>
                          </div>
                        );
                      }
                      if (/^\d+\./.test(line.trim())) {
                        return (
                          <div key={lineIdx} className="flex gap-3 ml-4">
                            <span className="text-gray-900 font-bold">{line.match(/^\d+/)[0]}.</span>
                            <span>{line.replace(/^\d+\.\s*/, '')}</span>
                          </div>
                        );
                      }
                      return <p key={lineIdx} className="leading-relaxed">{line}</p>;
                    })}
                  </div>
                ))}
              </div>
            </section>

            {/* Rationale */}
            {decision.rationale && (
              <section className="border border-gray-200 p-8">
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Rationale</h2>
                <div className="prose prose-sm max-w-none text-gray-700 space-y-4">
                  {decision.rationale.split('\n\n').map((paragraph, idx) => (
                    <div key={idx}>
                      {paragraph.split('\n').map((line, lineIdx) => {
                        if (line.trim().startsWith('-') || line.trim().startsWith('•')) {
                          return (
                            <div key={lineIdx} className="flex gap-3 ml-4">
                              <span className="text-gray-900 font-bold">•</span>
                              <span>{line.replace(/^[-•]\s*/, '')}</span>
                            </div>
                          );
                        }
                        if (/^\d+\./.test(line.trim())) {
                          return (
                            <div key={lineIdx} className="flex gap-3 ml-4">
                              <span className="text-gray-900 font-bold">{line.match(/^\d+/)[0]}.</span>
                              <span>{line.replace(/^\d+\.\s*/, '')}</span>
                            </div>
                          );
                        }
                        return <p key={lineIdx} className="leading-relaxed">{line}</p>;
                      })}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Code Links */}
            <section className="border border-gray-200 p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Related Code</h2>
                <button
                  onClick={() => setShowGithubSearch(!showGithubSearch)}
                  className="text-sm font-medium text-gray-900 border border-gray-900 px-3 py-1 hover:bg-gray-50 transition-colors"
                >
                  {showGithubSearch ? '−' : '+'} Link PR
                </button>
              </div>

              {decision.code_links && decision.code_links.length > 0 ? (
                <div className="space-y-3">
                  {decision.code_links.map((link, idx) => (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-4 border border-gray-200 hover:border-gray-900 transition-colors group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 group-hover:underline">
                            {link.title || `PR #${link.number}`}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">{link.url}</div>
                        </div>
                        <span className="text-xs text-gray-500 ml-2">→</span>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-600">
                  <p className="text-sm">No linked PRs yet</p>
                  <p className="text-xs text-gray-500 mt-1">Link PRs to track implementation</p>
                </div>
              )}

              {showGithubSearch && <GitHubSearchPanel decisionId={id} onLinked={fetchDecision} onClose={() => setShowGithubSearch(false)} />}
            </section>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <section className="border border-gray-200 p-6">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setShowGithubSearch(!showGithubSearch)}
                  className="w-full px-4 py-2 text-sm font-medium border border-gray-900 text-gray-900 hover:bg-gray-50 transition-colors text-left"
                >
                  Link GitHub PR
                </button>
                <button
                  onClick={() => setShowJiraCreate(!showJiraCreate)}
                  className="w-full px-4 py-2 text-sm font-medium border border-gray-900 text-gray-900 hover:bg-gray-50 transition-colors text-left"
                >
                  Create Jira Issue
                </button>
              </div>
            </section>

            {/* Metadata */}
            <section className="border border-gray-200 p-6">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Details</h3>
              <div className="space-y-4 text-sm">
                <div>
                  <div className="text-gray-600 mb-1">Status</div>
                  <div className="font-medium text-gray-900">{decision.status.replace('_', ' ')}</div>
                </div>
                <div>
                  <div className="text-gray-600 mb-1">Impact</div>
                  <div className="font-medium text-gray-900">{decision.impact_level}</div>
                </div>
                <div>
                  <div className="text-gray-600 mb-1">Owner</div>
                  <div className="font-medium text-gray-900">{decision.decision_maker_name}</div>
                </div>
                <div>
                  <div className="text-gray-600 mb-1">Created</div>
                  <div className="font-medium text-gray-900">{new Date(decision.created_at).toLocaleDateString()}</div>
                </div>
              </div>
            </section>

            {/* Jira Integration */}
            {showJiraCreate && <JiraCreatePanel decisionId={id} onCreated={fetchDecision} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function GitHubSearchPanel({ decisionId, onLinked, onClose }) {
  const [prs, setPrs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(null);
  const [manualUrl, setManualUrl] = useState('');

  useEffect(() => {
    handleSearch();
  }, []);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/integrations/github/search/${decisionId}/`);
      setPrs(res.data.prs);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkPr = async (prUrl) => {
    setLinking(prUrl);
    try {
      await api.post(`/api/integrations/github/link/${decisionId}/`, { pr_url: prUrl });
      alert('PR linked successfully');
      onLinked();
      onClose();
    } catch (error) {
      alert('Failed to link PR');
    } finally {
      setLinking(null);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualUrl.trim()) {
      handleLinkPr(manualUrl);
      setManualUrl('');
    }
  };

  return (
    <div className="mt-6 p-6 bg-gray-50 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-gray-900">Link PR</h4>
        <button onClick={onClose} className="text-gray-600 hover:text-gray-900">✕</button>
      </div>

      <div className="space-y-4">
        {/* Manual URL Input */}
        <form onSubmit={handleManualSubmit}>
          <label className="block text-sm font-medium text-gray-900 mb-2">PR URL</label>
          <div className="flex gap-2">
            <input
              type="url"
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              placeholder="https://github.com/owner/repo/pull/123"
              className="flex-1 px-3 py-2 border border-gray-900 focus:outline-none text-sm"
            />
            <button
              type="submit"
              disabled={!manualUrl.trim()}
              className="px-3 py-2 border border-gray-900 text-gray-900 font-medium hover:bg-gray-100 disabled:opacity-50 text-sm"
            >
              Link
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">Paste any PR URL directly</p>
        </form>

        {/* Search Results */}
        <div className="border-t border-gray-200 pt-4">
          <h5 className="text-sm font-medium text-gray-900 mb-2">Search Results</h5>
          {loading ? (
            <div className="text-sm text-gray-600 text-center py-4">Searching GitHub...</div>
          ) : prs.length > 0 ? (
            <div className="space-y-2">
              {prs.map(pr => (
                <div key={pr.number} className="flex items-start justify-between p-3 bg-white border border-gray-200 hover:border-gray-900 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{pr.title}</div>
                    <div className="text-xs text-gray-600 mt-1">#{pr.number} · {pr.state}</div>
                  </div>
                  <button
                    onClick={() => handleLinkPr(pr.url)}
                    disabled={linking === pr.url}
                    className="ml-2 px-2 py-1 text-xs border border-gray-900 text-gray-900 hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap"
                  >
                    {linking === pr.url ? 'Linking...' : 'Link'}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-600">
              <p className="text-sm">No PRs found matching this decision</p>
              <p className="text-xs text-gray-500 mt-1">Paste URL above to link manually</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function JiraCreatePanel({ decisionId, onCreated }) {
  const [creating, setCreating] = useState(false);

  const handleCreateIssue = async () => {
    if (!window.confirm('Create a Jira issue for this decision?')) return;
    
    setCreating(true);
    try {
      const res = await api.post(`/api/integrations/jira/create/${decisionId}/`);
      alert(`Jira issue created: ${res.data.ticket_id}`);
      window.open(res.data.ticket_url, '_blank');
      onCreated();
    } catch (error) {
      alert('Failed to create Jira issue: ' + (error.response?.data?.error || error.message));
    } finally {
      setCreating(false);
    }
  };

  return (
    <section className="border border-gray-200 p-6 bg-blue-50">
      <h3 className="text-sm font-bold text-gray-900 mb-3">Create Jira Issue</h3>
      <p className="text-sm text-gray-700 mb-4">Create a Jira issue to track implementation of this decision</p>
      <Button onClick={handleCreateIssue} loading={creating} className="w-full">
        Create Issue
      </Button>
    </section>
  );
}

export default DecisionDetail;
