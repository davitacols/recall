import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../utils/ThemeAndAccessibility';
import { AIEnhancementButton, AIResultsPanel } from '../components/AIEnhancements';
import api from '../services/api';
import ContextPanel from '../components/ContextPanel';
import QuickLink from '../components/QuickLink';
import { 
  LinkIcon, 
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  CalendarIcon,
  UserIcon,
  ClockIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import {
  FavoriteButton,
  ExportButton,
  DecisionReminder,
  UndoRedoButtons
} from '../components/QuickWinFeatures';

function DecisionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const [decision, setDecision] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showLinkPR, setShowLinkPR] = useState(false);
  const [prUrl, setPrUrl] = useState('');
  const [linking, setLinking] = useState(false);
  const [aiResults, setAiResults] = useState(null);

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

  const bgColor = darkMode ? '#1c1917' : '#ffffff';
  const textColor = darkMode ? '#e7e5e4' : '#111827';
  const borderColor = darkMode ? '#292524' : '#e5e7eb';
  const hoverBg = darkMode ? '#292524' : '#f9fafb';
  const secondaryText = darkMode ? '#a8a29e' : '#6b7280';
  const cardBg = darkMode ? '#0c0a09' : '#f9fafb';

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
    low: { bg: '#dbeafe', text: '#1e40af', label: 'Low Impact' },
    medium: { bg: '#fef3c7', text: '#92400e', label: 'Medium Impact' },
    high: { bg: '#fed7aa', text: '#9a3412', label: 'High Impact' },
    critical: { bg: '#fecaca', text: '#991b1b', label: 'Critical Impact' }
  };

  const statusConfig = {
    proposed: { bg: '#e0e7ff', text: '#3730a3', label: 'Proposed' },
    under_review: { bg: '#dbeafe', text: '#1e40af', label: 'Under Review' },
    approved: { bg: '#d1fae5', text: '#065f46', label: 'Approved' },
    rejected: { bg: '#fee2e2', text: '#991b1b', label: 'Rejected' },
    implemented: { bg: '#d1fae5', text: '#065f46', label: 'Implemented' },
    cancelled: { bg: '#f3f4f6', text: '#4b5563', label: 'Cancelled' }
  };

  if (darkMode) {
    impactConfig.low = { bg: '#1e3a8a', text: '#93c5fd', label: 'Low Impact' };
    impactConfig.medium = { bg: '#78350f', text: '#fcd34d', label: 'Medium Impact' };
    impactConfig.high = { bg: '#7c2d12', text: '#fdba74', label: 'High Impact' };
    impactConfig.critical = { bg: '#7f1d1d', text: '#fca5a5', label: 'Critical Impact' };
    
    statusConfig.proposed = { bg: '#312e81', text: '#a5b4fc', label: 'Proposed' };
    statusConfig.under_review = { bg: '#1e3a8a', text: '#93c5fd', label: 'Under Review' };
    statusConfig.approved = { bg: '#065f46', text: '#6ee7b7', label: 'Approved' };
    statusConfig.rejected = { bg: '#7f1d1d', text: '#fca5a5', label: 'Rejected' };
    statusConfig.implemented = { bg: '#065f46', text: '#6ee7b7', label: 'Implemented' };
    statusConfig.cancelled = { bg: '#374151', text: '#9ca3af', label: 'Cancelled' };
  }

  const impact = impactConfig[decision.impact_level] || impactConfig.medium;
  const status = statusConfig[decision.status] || statusConfig.proposed;

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <button 
          onClick={() => navigate('/decisions')}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            fontSize: '14px', 
            color: secondaryText, 
            background: 'none', 
            border: 'none', 
            cursor: 'pointer',
            marginBottom: '20px',
            padding: '8px 0'
          }}
        >
          <ArrowLeftIcon style={{ width: '16px', height: '16px' }} />
          Back to Decisions
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '24px', marginBottom: '24px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 600, borderRadius: '6px', backgroundColor: status.bg, color: status.text }}>
                {status.label}
              </span>
              <span style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 600, borderRadius: '6px', backgroundColor: impact.bg, color: impact.text }}>
                {impact.label}
              </span>
            </div>
            <h1 style={{ fontSize: '32px', fontWeight: 700, color: textColor, lineHeight: '1.2', marginBottom: '16px' }}>
              {decision.title}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserIcon style={{ width: '16px', height: '16px', color: secondaryText }} />
                <span style={{ fontSize: '14px', color: secondaryText }}>{decision.decision_maker_name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalendarIcon style={{ width: '16px', height: '16px', color: secondaryText }} />
                <span style={{ fontSize: '14px', color: secondaryText }}>{new Date(decision.created_at).toLocaleDateString()}</span>
              </div>
              {decision.confidence && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ChartBarIcon style={{ width: '16px', height: '16px', color: secondaryText }} />
                  <span style={{ fontSize: '14px', color: secondaryText }}>{decision.confidence.score}% Confidence</span>
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <QuickLink sourceType="decisions.decision" sourceId={id} />
            <AIEnhancementButton
              content={decision?.description}
              title={decision?.title}
              type="decision"
              onResult={(feature, data) => setAiResults(data)}
            />
            <FavoriteButton decisionId={id} />
            <ExportButton decisionId={id} type="decision" />
            <UndoRedoButtons />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '32px' }}>
        {/* Left Column */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
        <div>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: `1px solid ${borderColor}` }}>
            {['overview', 'rationale', 'code', 'details'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  padding: '12px 20px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === tab ? `2px solid ${textColor}` : '2px solid transparent',
                  color: activeTab === tab ? textColor : secondaryText,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  marginBottom: '-1px'
                }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '12px', padding: '32px' }}>
            {activeTab === 'overview' && (
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: textColor, marginBottom: '16px' }}>Overview</h2>
                <div style={{ color: textColor, fontSize: '15px', lineHeight: '1.7' }}>
                  {decision.description.split('\n\n').map((paragraph, idx) => (
                    <p key={idx} style={{ marginBottom: '16px' }}>{paragraph}</p>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'rationale' && (
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: textColor, marginBottom: '16px' }}>Rationale</h2>
                {decision.rationale ? (
                  <div style={{ color: textColor, fontSize: '15px', lineHeight: '1.7' }}>
                    {decision.rationale.split('\n\n').map((paragraph, idx) => (
                      <p key={idx} style={{ marginBottom: '16px' }}>{paragraph}</p>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: secondaryText, fontSize: '14px' }}>No rationale provided</p>
                )}
              </div>
            )}

            {activeTab === 'code' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 600, color: textColor }}>Related Code</h2>
                  <button
                    onClick={() => setShowLinkPR(!showLinkPR)}
                    style={{ 
                      padding: '8px 16px', 
                      border: `1px solid ${borderColor}`, 
                      borderRadius: '6px', 
                      backgroundColor: bgColor, 
                      color: textColor, 
                      fontSize: '13px', 
                      fontWeight: 500, 
                      cursor: 'pointer' 
                    }}
                  >
                    {showLinkPR ? 'Cancel' : '+ Link PR'}
                  </button>
                </div>

                {showLinkPR && (
                  <form onSubmit={handleLinkPR} style={{ marginBottom: '20px', padding: '20px', backgroundColor: cardBg, border: `1px solid ${borderColor}`, borderRadius: '8px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: textColor, marginBottom: '8px' }}>PR URL</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="url"
                        value={prUrl}
                        onChange={(e) => setPrUrl(e.target.value)}
                        placeholder="https://github.com/owner/repo/pull/123"
                        style={{ 
                          flex: 1, 
                          padding: '10px 14px', 
                          border: `1px solid ${borderColor}`, 
                          borderRadius: '6px', 
                          backgroundColor: bgColor, 
                          color: textColor, 
                          fontSize: '14px' 
                        }}
                      />
                      <button
                        type="submit"
                        disabled={!prUrl.trim() || linking}
                        style={{ 
                          padding: '10px 20px', 
                          backgroundColor: '#3b82f6', 
                          border: 'none', 
                          color: '#ffffff', 
                          borderRadius: '6px', 
                          fontSize: '14px', 
                          fontWeight: 500, 
                          cursor: 'pointer',
                          opacity: (!prUrl.trim() || linking) ? 0.5 : 1
                        }}
                      >
                        {linking ? 'Linking...' : 'Link'}
                      </button>
                    </div>
                  </form>
                )}

                {decision.code_links && decision.code_links.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {decision.code_links.map((link, idx) => (
                      <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '12px', 
                          padding: '16px', 
                          border: `1px solid ${borderColor}`, 
                          borderRadius: '8px', 
                          textDecoration: 'none',
                          backgroundColor: cardBg,
                          transition: 'all 0.2s'
                        }}
                      >
                        <LinkIcon style={{ width: '20px', height: '20px', color: secondaryText, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: textColor, fontSize: '14px', marginBottom: '4px' }}>
                            {link.title || `PR #${link.number}`}
                          </div>
                          <div style={{ fontSize: '12px', color: secondaryText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {link.url}
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '60px 24px' }}>
                    <LinkIcon style={{ width: '48px', height: '48px', color: borderColor, margin: '0 auto 16px' }} />
                    <p style={{ color: secondaryText, fontWeight: 500, fontSize: '14px', marginBottom: '4px' }}>No linked PRs</p>
                    <p style={{ fontSize: '13px', color: secondaryText }}>Link PRs to track implementation</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'details' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {decision.context_reason && (
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: secondaryText, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Context</h3>
                    <p style={{ color: textColor, fontSize: '15px', lineHeight: '1.7' }}>{decision.context_reason}</p>
                  </div>
                )}

                {decision.if_this_fails && (
                  <div style={{ padding: '20px', backgroundColor: darkMode ? '#7f1d1d' : '#fef2f2', border: `1px solid ${darkMode ? '#991b1b' : '#fecaca'}`, borderRadius: '8px' }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <ExclamationTriangleIcon style={{ width: '20px', height: '20px', color: darkMode ? '#fca5a5' : '#dc2626', flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <h3 style={{ fontSize: '14px', fontWeight: 600, color: darkMode ? '#fca5a5' : '#dc2626', marginBottom: '8px' }}>If This Fails</h3>
                        <p style={{ color: darkMode ? '#fca5a5' : '#dc2626', fontSize: '14px', lineHeight: '1.6' }}>{decision.if_this_fails}</p>
                      </div>
                    </div>
                  </div>
                )}

                {decision.alternatives_considered && decision.alternatives_considered.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: secondaryText, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Alternatives Considered</h3>
                    <ul style={{ display: 'flex', flexDirection: 'column', gap: '10px', listStyle: 'none', padding: 0, margin: 0 }}>
                      {(Array.isArray(decision.alternatives_considered) ? decision.alternatives_considered : [decision.alternatives_considered]).map((alt, idx) => (
                        <li key={idx} style={{ display: 'flex', gap: '10px', color: textColor, fontSize: '15px', lineHeight: '1.6' }}>
                          <span style={{ color: '#3b82f6', flexShrink: 0 }}>•</span>
                          <span>{alt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Context Panel */}
        <div>
          <ContextPanel contentType="decisions.decision" objectId={id} />
        </div>
        </div>

        {/* Right Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Confidence Score */}
          {decision.confidence && (
            <div style={{ padding: '24px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '12px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: secondaryText, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>Confidence Score</h3>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '12px' }}>
                <span style={{ fontSize: '40px', fontWeight: 700, color: textColor }}>{decision.confidence.score}%</span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  backgroundColor: decision.confidence.level === 'High' ? (darkMode ? '#065f46' : '#d1fae5') : decision.confidence.level === 'Medium' ? (darkMode ? '#78350f' : '#fef3c7') : (darkMode ? '#7f1d1d' : '#fee2e2'),
                  color: decision.confidence.level === 'High' ? (darkMode ? '#6ee7b7' : '#065f46') : decision.confidence.level === 'Medium' ? (darkMode ? '#fcd34d' : '#92400e') : (darkMode ? '#fca5a5' : '#991b1b')
                }}>
                  {decision.confidence.level}
                </span>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: borderColor, borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' }}>
                <div
                  style={{
                    height: '8px',
                    width: `${decision.confidence.score}%`,
                    transition: 'all 0.3s',
                    backgroundColor: decision.confidence.level === 'High' ? '#10b981' : decision.confidence.level === 'Medium' ? '#f59e0b' : '#ef4444'
                  }}
                ></div>
              </div>
              {decision.confidence.factors && (
                <div style={{ paddingTop: '16px', borderTop: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {decision.confidence.factors.map((factor, idx) => (
                    <div key={idx} style={{ fontSize: '13px', color: secondaryText, lineHeight: '1.5', display: 'flex', gap: '8px' }}>
                      <span style={{ color: '#3b82f6' }}>•</span>
                      <span>{factor}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Decision Reminder */}
          <DecisionReminder decisionId={id} />

          {/* Quick Info */}
          <div style={{ padding: '24px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: secondaryText, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {decision.decided_at && (
                <div>
                  <p style={{ fontSize: '12px', color: secondaryText, marginBottom: '6px' }}>Decided Date</p>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: textColor }}>{new Date(decision.decided_at).toLocaleDateString()}</p>
                </div>
              )}
              {decision.implementation_deadline && (
                <div>
                  <p style={{ fontSize: '12px', color: secondaryText, marginBottom: '6px' }}>Implementation Deadline</p>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: textColor }}>{new Date(decision.implementation_deadline).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <AIResultsPanel results={aiResults} onClose={() => setAiResults(null)} />
    </div>
  );
}

export default DecisionDetail;
