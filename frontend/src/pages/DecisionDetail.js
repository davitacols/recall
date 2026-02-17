import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { LinkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import {
  FavoriteButton,
  ExportButton,
  DecisionReminder,
  UndoRedoButtons
} from '../components/QuickWinFeatures';

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

  const bgColor = '#1c1917';
  const textColor = '#e7e5e4';
  const borderColor = '#292524';
  const hoverBg = '#292524';
  const secondaryText = '#a8a29e';

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
        <div style={{ width: '24px', height: '24px', border: '2px solid #292524', borderTop: '2px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  if (!decision) {
    return <div style={{ textAlign: 'center', padding: '32px', color: secondaryText, fontSize: '14px' }}>Decision not found</div>;
  }

  const impactConfig = {
    low: { bg: '#1e3a8a', text: '#93c5fd', label: 'Low' },
    medium: { bg: '#78350f', text: '#fcd34d', label: 'Medium' },
    high: { bg: '#7c2d12', text: '#fdba74', label: 'High' },
    critical: { bg: '#7f1d1d', text: '#fca5a5', label: 'Critical' }
  };

  const statusConfig = {
    proposed: { bg: hoverBg, text: secondaryText, label: 'Proposed' },
    under_review: { bg: '#1e3a8a', text: '#93c5fd', label: 'Under Review' },
    approved: { bg: '#065f46', text: '#6ee7b7', label: 'Approved' },
    rejected: { bg: '#7f1d1d', text: '#fca5a5', label: 'Rejected' },
    implemented: { bg: '#065f46', text: '#6ee7b7', label: 'Implemented' },
    cancelled: { bg: hoverBg, text: secondaryText, label: 'Cancelled' }
  };

  const impact = impactConfig[decision.impact_level] || impactConfig.medium;
  const status = statusConfig[decision.status] || statusConfig.proposed;

  return (
    <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <a href="/decisions" style={{ fontSize: '13px', color: secondaryText, textDecoration: 'none', fontWeight: 500, marginBottom: '12px', display: 'inline-block' }}>← Back to Decisions</a>
        
        <div style={{ marginBottom: '16px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: textColor, marginBottom: '12px', letterSpacing: '-0.01em' }}>{decision.title}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', borderRadius: '3px', backgroundColor: impact.bg, color: impact.text }}>
              {impact.label} Impact
            </span>
            <span style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', borderRadius: '3px', backgroundColor: status.bg, color: status.text }}>
              {status.label}
            </span>
            <FavoriteButton decisionId={id} />
            <ExportButton decisionId={id} type="decision" />
            <UndoRedoButtons />
          </div>
        </div>

        {/* Metadata Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          <div style={{ padding: '14px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px' }}>
            <p style={{ fontSize: '10px', color: secondaryText, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '6px' }}>Owner</p>
            <p style={{ fontSize: '14px', fontWeight: 600, color: textColor }}>{decision.decision_maker_name}</p>
          </div>
          <div style={{ padding: '14px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px' }}>
            <p style={{ fontSize: '10px', color: secondaryText, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '6px' }}>Created</p>
            <p style={{ fontSize: '14px', fontWeight: 600, color: textColor }}>{new Date(decision.created_at).toLocaleDateString()}</p>
          </div>
          <div style={{ padding: '14px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px' }}>
            <p style={{ fontSize: '10px', color: secondaryText, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '6px' }}>Decided</p>
            <p style={{ fontSize: '14px', fontWeight: 600, color: textColor }}>{decision.decided_at ? new Date(decision.decided_at).toLocaleDateString() : '−'}</p>
          </div>
          <div style={{ padding: '14px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px' }}>
            <p style={{ fontSize: '10px', color: secondaryText, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '6px' }}>Confidence</p>
            <p style={{ fontSize: '14px', fontWeight: 600, color: textColor }}>{decision.confidence?.score || '−'}%</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', borderBottom: `1px solid ${borderColor}`, paddingBottom: '0' }}>
          {['overview', 'rationale', 'code', 'details'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                padding: '10px 0',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab ? `2px solid ${textColor}` : '2px solid transparent',
                color: activeTab === tab ? textColor : secondaryText,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
          {/* Main Content */}
          <div>
            {activeTab === 'overview' && (
              <div style={{ padding: '20px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: textColor, marginBottom: '12px' }}>Overview</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', color: secondaryText, fontSize: '14px', lineHeight: '1.6' }}>
                  {decision.description.split('\n\n').map((paragraph, idx) => (
                    <p key={idx}>{paragraph}</p>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'rationale' && (
              <div style={{ padding: '20px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: textColor, marginBottom: '12px' }}>Rationale</h2>
                {decision.rationale ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', color: secondaryText, fontSize: '14px', lineHeight: '1.6' }}>
                    {decision.rationale.split('\n\n').map((paragraph, idx) => (
                      <p key={idx}>{paragraph}</p>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: secondaryText, fontSize: '13px' }}>No rationale provided</p>
                )}
              </div>
            )}

            {activeTab === 'code' && (
              <div style={{ padding: '20px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: 600, color: textColor }}>Related Code</h2>
                  <button
                    onClick={() => setShowLinkPR(!showLinkPR)}
                    style={{ padding: '7px 12px', border: `1px solid ${borderColor}`, borderRadius: '4px', backgroundColor: bgColor, color: textColor, fontSize: '12px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBg}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = bgColor}
                  >
                    {showLinkPR ? 'Cancel' : 'Link PR'}
                  </button>
                </div>

                {showLinkPR && (
                  <form onSubmit={handleLinkPR} style={{ marginBottom: '16px', padding: '14px', backgroundColor: hoverBg, border: `1px solid ${borderColor}`, borderRadius: '5px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: textColor, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>PR URL</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="url"
                        value={prUrl}
                        onChange={(e) => setPrUrl(e.target.value)}
                        placeholder="https://github.com/owner/repo/pull/123"
                        style={{ flex: 1, padding: '8px 12px', border: `1px solid ${borderColor}`, borderRadius: '4px', backgroundColor: '#0c0a09', color: textColor, fontSize: '13px', outline: 'none' }}
                      />
                      <button
                        type="submit"
                        disabled={!prUrl.trim() || linking}
                        style={{ padding: '8px 14px', backgroundColor: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', opacity: (!prUrl.trim() || linking) ? 0.5 : 1 }}
                      >
                        {linking ? 'Linking...' : 'Link'}
                      </button>
                    </div>
                  </form>
                )}

                {decision.code_links && decision.code_links.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {decision.code_links.map((link, idx) => (
                      <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', border: `1px solid ${borderColor}`, borderRadius: '5px', textDecoration: 'none', transition: 'all 0.15s' }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.backgroundColor = hoverBg; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = borderColor; e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                          <LinkIcon style={{ width: '16px', height: '16px', color: secondaryText, flexShrink: 0 }} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, color: textColor, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {link.title || `PR #${link.number}`}
                            </div>
                            <div style={{ fontSize: '11px', color: secondaryText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.url}</div>
                          </div>
                        </div>
                        <span style={{ color: secondaryText, marginLeft: '12px' }}>→</span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                    <LinkIcon style={{ width: '40px', height: '40px', color: borderColor, margin: '0 auto 12px' }} />
                    <p style={{ color: secondaryText, fontWeight: 500, fontSize: '13px', marginBottom: '4px' }}>No linked PRs</p>
                    <p style={{ fontSize: '12px', color: secondaryText }}>Link PRs to track implementation</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'details' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {decision.context_reason && (
                  <div style={{ padding: '20px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px' }}>
                    <h3 style={{ fontSize: '10px', fontWeight: 600, color: secondaryText, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '10px' }}>Context</h3>
                    <p style={{ color: secondaryText, fontSize: '14px', lineHeight: '1.6' }}>{decision.context_reason}</p>
                  </div>
                )}

                {decision.if_this_fails && (
                  <div style={{ padding: '20px', backgroundColor: '#7f1d1d', border: `1px solid ${borderColor}`, borderRadius: '5px' }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <ExclamationTriangleIcon style={{ width: '16px', height: '16px', color: '#fca5a5', flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <h3 style={{ fontSize: '10px', fontWeight: 600, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '8px' }}>If This Fails</h3>
                        <p style={{ color: '#fca5a5', fontSize: '14px', lineHeight: '1.6' }}>{decision.if_this_fails}</p>
                      </div>
                    </div>
                  </div>
                )}

                {decision.alternatives_considered && decision.alternatives_considered.length > 0 && (
                  <div style={{ padding: '20px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px' }}>
                    <h3 style={{ fontSize: '10px', fontWeight: 600, color: secondaryText, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '10px' }}>Alternatives Considered</h3>
                    <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px', listStyle: 'none', padding: 0, margin: 0 }}>
                      {(Array.isArray(decision.alternatives_considered) ? decision.alternatives_considered : [decision.alternatives_considered]).map((alt, idx) => (
                        <li key={idx} style={{ display: 'flex', gap: '8px', color: secondaryText, fontSize: '14px', lineHeight: '1.6' }}>
                          <span style={{ color: borderColor, flexShrink: 0 }}>•</span>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Decision Reminder */}
            <DecisionReminder decisionId={id} />

            {/* Confidence Score */}
            {decision.confidence && (
              <div style={{ padding: '20px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px' }}>
                <h3 style={{ fontSize: '10px', fontWeight: 600, color: secondaryText, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '12px' }}>Confidence</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '28px', fontWeight: 600, color: textColor }}>{decision.confidence.score}%</span>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        padding: '3px 8px',
                        borderRadius: '3px',
                        backgroundColor: decision.confidence.level === 'High' ? '#065f46' : decision.confidence.level === 'Medium' ? '#78350f' : '#7f1d1d',
                        color: decision.confidence.level === 'High' ? '#6ee7b7' : decision.confidence.level === 'Medium' ? '#fcd34d' : '#fca5a5'
                      }}>
                        {decision.confidence.level}
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '6px', backgroundColor: borderColor, borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '6px',
                          width: `${decision.confidence.score}%`,
                          transition: 'all 0.3s',
                          backgroundColor: decision.confidence.level === 'High' ? '#10b981' : decision.confidence.level === 'Medium' ? '#f59e0b' : '#ef4444'
                        }}
                      ></div>
                    </div>
                  </div>
                  {decision.confidence.factors && (
                    <div style={{ paddingTop: '12px', borderTop: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {decision.confidence.factors.map((factor, idx) => (
                        <div key={idx} style={{ fontSize: '11px', color: secondaryText, lineHeight: '1.5' }}>
                          <span style={{ color: borderColor }}>•</span> {factor}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Info */}
            <div style={{ padding: '20px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px' }}>
              <h3 style={{ fontSize: '10px', fontWeight: 600, color: secondaryText, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '12px' }}>Quick Info</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <p style={{ fontSize: '10px', color: secondaryText, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '6px' }}>Status</p>
                  <span style={{ display: 'inline-block', padding: '3px 8px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', borderRadius: '3px', backgroundColor: status.bg, color: status.text }}>
                    {status.label}
                  </span>
                </div>
                <div>
                  <p style={{ fontSize: '10px', color: secondaryText, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '6px' }}>Impact</p>
                  <span style={{ display: 'inline-block', padding: '3px 8px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', borderRadius: '3px', backgroundColor: impact.bg, color: impact.text }}>
                    {impact.label}
                  </span>
                </div>
                {decision.implementation_deadline && (
                  <div>
                    <p style={{ fontSize: '10px', color: secondaryText, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '6px' }}>Deadline</p>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: textColor }}>{new Date(decision.implementation_deadline).toLocaleDateString()}</p>
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
