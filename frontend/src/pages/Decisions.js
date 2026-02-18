import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircleIcon, ClockIcon, XCircleIcon, EyeIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import { ListSkeleton } from '../components/Skeleton';
import { NoData } from '../components/EmptyState';

function Decisions() {
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState('timeline');

  const bgColor = '#1c1917';
  const textColor = '#e7e5e4';
  const borderColor = '#292524';
  const hoverBg = '#292524';
  const secondaryText = '#a8a29e';
  const mainBg = '#0c0a09';

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

  if (loading) {
    return <ListSkeleton count={5} />;
  }

  return (
    <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: textColor, marginBottom: '4px', letterSpacing: '-0.01em' }}>Decisions</h1>
        <p style={{ fontSize: '14px', color: secondaryText, marginBottom: '2px' }}>The brain of your organization</p>
        <p style={{ fontSize: '13px', color: secondaryText }}>Track decisions, their status, and impact across your team</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        <div style={{ border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '16px', backgroundColor: bgColor }}>
          <div style={{ fontSize: '24px', fontWeight: 600, color: textColor, marginBottom: '4px' }}>{decisions.length}</div>
          <div style={{ fontSize: '12px', color: secondaryText }}>Total Decisions</div>
        </div>
        <div style={{ border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '16px', backgroundColor: bgColor }}>
          <div style={{ fontSize: '24px', fontWeight: 600, color: '#3b82f6', marginBottom: '4px' }}>{statusCounts.approved || 0}</div>
          <div style={{ fontSize: '12px', color: secondaryText }}>Approved</div>
        </div>
        <div style={{ border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '16px', backgroundColor: bgColor }}>
          <div style={{ fontSize: '24px', fontWeight: 600, color: '#f59e0b', marginBottom: '4px' }}>{statusCounts.under_review || 0}</div>
          <div style={{ fontSize: '12px', color: secondaryText }}>Under Review</div>
        </div>
        <div style={{ border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '16px', backgroundColor: bgColor }}>
          <div style={{ fontSize: '24px', fontWeight: 600, color: '#10b981', marginBottom: '4px' }}>{statusCounts.implemented || 0}</div>
          <div style={{ fontSize: '12px', color: secondaryText }}>Implemented</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {['all', 'proposed', 'under_review', 'approved', 'implemented'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              style={{
                padding: '7px 12px',
                fontSize: '13px',
                fontWeight: 500,
                textTransform: 'capitalize',
                backgroundColor: filter === status ? '#3b82f6' : 'transparent',
                color: filter === status ? '#ffffff' : textColor,
                border: `1px solid ${filter === status ? '#3b82f6' : borderColor}`,
                borderRadius: '5px',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              onMouseEnter={(e) => {
                if (filter !== status) {
                  e.currentTarget.style.backgroundColor = hoverBg;
                }
              }}
              onMouseLeave={(e) => {
                if (filter !== status) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {status === 'all' ? 'All' : status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline View */}
      {filteredDecisions.length === 0 ? (
        <NoData 
          type="decisions" 
          onCreate={() => window.location.href = '/conversations'}
        />
      ) : (
        <div style={{ position: 'relative' }}>
          {/* Timeline Line */}
          <div style={{ position: 'absolute', left: '20px', top: 0, bottom: 0, width: '2px', backgroundColor: borderColor }}></div>
          
          {/* Timeline Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredDecisions.map((decision, index) => (
              <div key={decision.id} style={{ position: 'relative', paddingLeft: '52px' }}>
                {/* Timeline Dot */}
                <div style={{ position: 'absolute', left: '14px', top: '16px', width: '14px', height: '14px', borderRadius: '50%', border: `3px solid ${mainBg}`, backgroundColor: '#3b82f6' }}></div>
                
                {/* Decision Card */}
                <a href={`/decisions/${decision.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '16px', backgroundColor: bgColor, cursor: 'pointer', transition: 'all 0.15s' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.backgroundColor = '#1f2937'; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = borderColor; e.currentTarget.style.backgroundColor = bgColor; }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ padding: '3px 8px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', borderRadius: '3px', backgroundColor: hoverBg, border: `1px solid ${borderColor}`, color: textColor }}>
                          {decision.status.replace('_', ' ')}
                        </span>
                        <span style={{ padding: '3px 8px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', borderRadius: '3px', backgroundColor: hoverBg, border: `1px solid ${borderColor}`, color: secondaryText }}>
                          {decision.impact_level} impact
                        </span>
                      </div>
                      <span style={{ fontSize: '12px', color: secondaryText }}>
                        {new Date(decision.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: textColor, marginBottom: '8px' }}>
                      {decision.title}
                    </h3>
                    
                    {decision.description && (
                      <p style={{ fontSize: '13px', color: secondaryText, marginBottom: '10px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {decision.description}
                      </p>
                    )}
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: secondaryText }}>
                      <div>
                        <span style={{ fontWeight: 500 }}>Decision Maker:</span> {decision.decision_maker_name}
                      </div>
                      {decision.review_date && (
                        <div>
                          <span style={{ fontWeight: 500 }}>Review:</span> {new Date(decision.review_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      )}
                    </div>
                  </div>
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Decisions;
