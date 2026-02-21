import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  CheckCircleIcon, 
  ClockIcon, 
  XCircleIcon, 
  PlusIcon,
  FunnelIcon,
  Squares2X2Icon,
  ListBulletIcon
} from '@heroicons/react/24/outline';
import { useTheme } from '../utils/ThemeAndAccessibility';
import api from '../services/api';
import { ListSkeleton } from '../components/Skeleton';
import { NoData } from '../components/EmptyState';

function Decisions() {
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');

  const bgColor = darkMode ? '#1c1917' : '#ffffff';
  const textColor = darkMode ? '#e7e5e4' : '#111827';
  const borderColor = darkMode ? '#292524' : '#e5e7eb';
  const hoverBg = darkMode ? '#292524' : '#f9fafb';
  const secondaryText = darkMode ? '#a8a29e' : '#6b7280';
  const cardBg = darkMode ? '#0c0a09' : '#ffffff';

  useEffect(() => {
    fetchDecisions();
  }, []);

  const fetchDecisions = async () => {
    try {
      const response = await api.get('/api/decisions/');
      const data = response.data.data || response.data.results || response.data || [];
      const decisionsArray = Array.isArray(data) ? data : [];
      
      const sorted = decisionsArray.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );
      setDecisions(sorted);
    } catch (error) {
      console.error('Failed to fetch decisions:', error);
      setDecisions([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredDecisions = decisions.filter(decision => {
    if (filter === 'all') return true;
    return decision.status === filter;
  });

  const statusCounts = decisions.reduce((acc, decision) => {
    acc[decision.status] = (acc[decision.status] || 0) + 1;
    return acc;
  }, {});

  const statusConfig = {
    proposed: { bg: darkMode ? '#312e81' : '#e0e7ff', text: darkMode ? '#a5b4fc' : '#3730a3', label: 'Proposed' },
    under_review: { bg: darkMode ? '#1e3a8a' : '#dbeafe', text: darkMode ? '#93c5fd' : '#1e40af', label: 'Under Review' },
    approved: { bg: darkMode ? '#065f46' : '#d1fae5', text: darkMode ? '#6ee7b7' : '#065f46', label: 'Approved' },
    rejected: { bg: darkMode ? '#7f1d1d' : '#fee2e2', text: darkMode ? '#fca5a5' : '#991b1b', label: 'Rejected' },
    implemented: { bg: darkMode ? '#065f46' : '#d1fae5', text: darkMode ? '#6ee7b7' : '#065f46', label: 'Implemented' },
    cancelled: { bg: darkMode ? '#374151' : '#f3f4f6', text: darkMode ? '#9ca3af' : '#4b5563', label: 'Cancelled' }
  };

  const impactConfig = {
    low: { bg: darkMode ? '#1e3a8a' : '#dbeafe', text: darkMode ? '#93c5fd' : '#1e40af' },
    medium: { bg: darkMode ? '#78350f' : '#fef3c7', text: darkMode ? '#fcd34d' : '#92400e' },
    high: { bg: darkMode ? '#7c2d12' : '#fed7aa', text: darkMode ? '#fdba74' : '#9a3412' },
    critical: { bg: darkMode ? '#7f1d1d' : '#fecaca', text: darkMode ? '#fca5a5' : '#991b1b' }
  };

  if (loading) {
    return <ListSkeleton count={5} />;
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 700, color: textColor, marginBottom: '8px', letterSpacing: '-0.02em' }}>Decisions</h1>
          <p style={{ fontSize: '15px', color: secondaryText }}>Track decisions, their status, and impact across your team</p>
        </div>
        <button
          onClick={() => navigate('/conversations')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            backgroundColor: '#3b82f6',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <PlusIcon style={{ width: '18px', height: '18px' }} />
          New Decision
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div style={{ border: `1px solid ${borderColor}`, borderRadius: '12px', padding: '20px', backgroundColor: cardBg }}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: textColor, marginBottom: '4px' }}>{decisions.length}</div>
          <div style={{ fontSize: '13px', color: secondaryText, fontWeight: 500 }}>Total Decisions</div>
        </div>
        <div style={{ border: `1px solid ${borderColor}`, borderRadius: '12px', padding: '20px', backgroundColor: cardBg }}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#3b82f6', marginBottom: '4px' }}>{statusCounts.approved || 0}</div>
          <div style={{ fontSize: '13px', color: secondaryText, fontWeight: 500 }}>Approved</div>
        </div>
        <div style={{ border: `1px solid ${borderColor}`, borderRadius: '12px', padding: '20px', backgroundColor: cardBg }}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#f59e0b', marginBottom: '4px' }}>{statusCounts.under_review || 0}</div>
          <div style={{ fontSize: '13px', color: secondaryText, fontWeight: 500 }}>Under Review</div>
        </div>
        <div style={{ border: `1px solid ${borderColor}`, borderRadius: '12px', padding: '20px', backgroundColor: cardBg }}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#10b981', marginBottom: '4px' }}>{statusCounts.implemented || 0}</div>
          <div style={{ fontSize: '13px', color: secondaryText, fontWeight: 500 }}>Implemented</div>
        </div>
      </div>

      {/* Filters & View Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {['all', 'proposed', 'under_review', 'approved', 'implemented'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 600,
                textTransform: 'capitalize',
                backgroundColor: filter === status ? '#3b82f6' : 'transparent',
                color: filter === status ? '#ffffff' : textColor,
                border: `1px solid ${filter === status ? '#3b82f6' : borderColor}`,
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {status === 'all' ? 'All' : status.replace('_', ' ')}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setViewMode('grid')}
            style={{
              padding: '8px',
              backgroundColor: viewMode === 'grid' ? hoverBg : 'transparent',
              border: `1px solid ${borderColor}`,
              borderRadius: '6px',
              cursor: 'pointer',
              color: textColor
            }}
          >
            <Squares2X2Icon style={{ width: '18px', height: '18px' }} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            style={{
              padding: '8px',
              backgroundColor: viewMode === 'list' ? hoverBg : 'transparent',
              border: `1px solid ${borderColor}`,
              borderRadius: '6px',
              cursor: 'pointer',
              color: textColor
            }}
          >
            <ListBulletIcon style={{ width: '18px', height: '18px' }} />
          </button>
        </div>
      </div>

      {/* Decisions Grid/List */}
      {filteredDecisions.length === 0 ? (
        <NoData 
          type="decisions" 
          onCreate={() => navigate('/conversations')}
        />
      ) : viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
          {filteredDecisions.map((decision) => {
            const status = statusConfig[decision.status] || statusConfig.proposed;
            const impact = impactConfig[decision.impact_level] || impactConfig.medium;
            
            return (
              <div
                key={decision.id}
                onClick={() => navigate(`/decisions/${decision.id}`)}
                style={{
                  border: `1px solid ${borderColor}`,
                  borderRadius: '12px',
                  padding: '24px',
                  backgroundColor: cardBg,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = darkMode ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = borderColor;
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 600, borderRadius: '6px', backgroundColor: status.bg, color: status.text }}>
                    {status.label}
                  </span>
                  <span style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 600, borderRadius: '6px', backgroundColor: impact.bg, color: impact.text, textTransform: 'capitalize' }}>
                    {decision.impact_level}
                  </span>
                </div>

                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: textColor, marginBottom: '8px', lineHeight: '1.4' }}>
                    {decision.title}
                  </h3>
                  {decision.description && (
                    <p style={{ fontSize: '14px', color: secondaryText, lineHeight: '1.6', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {decision.description}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: `1px solid ${borderColor}`, fontSize: '13px', color: secondaryText }}>
                  <span>{decision.decision_maker_name}</span>
                  <span>{new Date(decision.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredDecisions.map((decision) => {
            const status = statusConfig[decision.status] || statusConfig.proposed;
            const impact = impactConfig[decision.impact_level] || impactConfig.medium;
            
            return (
              <div
                key={decision.id}
                onClick={() => navigate(`/decisions/${decision.id}`)}
                style={{
                  border: `1px solid ${borderColor}`,
                  borderRadius: '12px',
                  padding: '20px',
                  backgroundColor: cardBg,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.backgroundColor = hoverBg;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = borderColor;
                  e.currentTarget.style.backgroundColor = cardBg;
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 600, borderRadius: '6px', backgroundColor: status.bg, color: status.text }}>
                      {status.label}
                    </span>
                    <span style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 600, borderRadius: '6px', backgroundColor: impact.bg, color: impact.text, textTransform: 'capitalize' }}>
                      {decision.impact_level}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: textColor, marginBottom: '4px' }}>
                    {decision.title}
                  </h3>
                  {decision.description && (
                    <p style={{ fontSize: '13px', color: secondaryText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {decision.description}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                  <span style={{ fontSize: '13px', color: secondaryText }}>{decision.decision_maker_name}</span>
                  <span style={{ fontSize: '12px', color: secondaryText }}>{new Date(decision.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Decisions;
