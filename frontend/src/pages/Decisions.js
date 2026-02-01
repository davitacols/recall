import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircleIcon, ClockIcon, XCircleIcon, EyeIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

function Decisions() {
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState('timeline');

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
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '24rem' }}>
        <div style={{ width: '24px', height: '24px', border: '2px solid #d97706', borderTop: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#0f0f0f', minHeight: '100vh', padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '48px', fontWeight: 900, color: '#ffffff', marginBottom: '12px' }}>Decisions</h1>
        <p style={{ fontSize: '20px', color: '#d1d5db', marginBottom: '8px' }}>The brain of your organization</p>
        <p style={{ fontSize: '16px', color: '#d1d5db' }}>Track decisions, their status, and impact across your team. Convert conversations into decisions to maintain a searchable record.</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '32px' }}>
        <div style={{ border: '1px solid #b45309', padding: '24px', backgroundColor: '#1c1917' }}>
          <div style={{ fontSize: '36px', fontWeight: 900, color: '#ffffff', marginBottom: '8px' }}>{decisions.length}</div>
          <div style={{ fontSize: '14px', fontWeight: 500, color: '#d1d5db' }}>Total Decisions</div>
        </div>
        <div style={{ border: '1px solid #b45309', padding: '24px', backgroundColor: '#1c1917' }}>
          <div style={{ fontSize: '36px', fontWeight: 900, color: '#fbbf24', marginBottom: '8px' }}>{statusCounts.approved || 0}</div>
          <div style={{ fontSize: '14px', fontWeight: 500, color: '#d1d5db' }}>Approved</div>
        </div>
        <div style={{ border: '1px solid #b45309', padding: '24px', backgroundColor: '#1c1917' }}>
          <div style={{ fontSize: '36px', fontWeight: 900, color: '#fbbf24', marginBottom: '8px' }}>{statusCounts.under_review || 0}</div>
          <div style={{ fontSize: '14px', fontWeight: 500, color: '#d1d5db' }}>Under Review</div>
        </div>
        <div style={{ border: '1px solid #b45309', padding: '24px', backgroundColor: '#1c1917' }}>
          <div style={{ fontSize: '36px', fontWeight: 900, color: '#ffffff', marginBottom: '8px' }}>{statusCounts.implemented || 0}</div>
          <div style={{ fontSize: '14px', fontWeight: 500, color: '#d1d5db' }}>Implemented</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {['all', 'proposed', 'under_review', 'approved', 'implemented'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: 500,
                textTransform: 'capitalize',
                backgroundColor: filter === status ? '#d97706' : 'transparent',
                color: filter === status ? '#ffffff' : '#d97706',
                border: filter === status ? 'none' : '1px solid #b45309',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (filter !== status) {
                  e.target.style.backgroundColor = '#292415';
                }
              }}
              onMouseLeave={(e) => {
                if (filter !== status) {
                  e.target.style.backgroundColor = 'transparent';
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
        <div style={{ textAlign: 'center', padding: '80px 24px', border: '1px solid #b45309', backgroundColor: '#1c1917' }}>
          <h3 style={{ fontSize: '24px', fontWeight: 900, color: '#ffffff', marginBottom: '12px' }}>No decisions yet</h3>
          <p style={{ fontSize: '18px', color: '#d1d5db', marginBottom: '8px' }}>
            Convert conversations into decisions to track outcomes.
          </p>
          <p style={{ fontSize: '16px', color: '#d1d5db', marginBottom: '32px' }}>
            Decisions help your team understand what was decided, why, and what the impact was.
          </p>
          <a href="/conversations" style={{ display: 'inline-block', padding: '8px 24px', backgroundColor: '#d97706', color: '#ffffff', fontWeight: 600, textDecoration: 'none' }}>
            View conversations
          </a>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          {/* Timeline Line */}
          <div style={{ position: 'absolute', left: '32px', top: 0, bottom: 0, width: '2px', backgroundColor: '#b45309' }}></div>
          
          {/* Timeline Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {filteredDecisions.map((decision, index) => (
              <div key={decision.id} style={{ position: 'relative', paddingLeft: '80px' }}>
                {/* Timeline Dot */}
                <div style={{ position: 'absolute', left: '24px', top: '8px', width: '20px', height: '20px', borderRadius: '50%', border: '4px solid #0f0f0f', backgroundColor: '#d97706' }}></div>
                
                {/* Decision Card */}
                <a href={`/decisions/${decision.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ border: '1px solid #b45309', padding: '24px', backgroundColor: '#1c1917', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = '#d97706'} onMouseLeave={(e) => e.currentTarget.style.borderColor = '#b45309'}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ padding: '4px 12px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#fbbf24' }}>
                          {decision.status.replace('_', ' ')}
                        </span>
                        <span style={{ padding: '4px 12px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', backgroundColor: '#292415', color: '#d1d5db' }}>
                          {decision.impact_level} impact
                        </span>
                      </div>
                      <span style={{ fontSize: '14px', color: '#d1d5db' }}>
                        {new Date(decision.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    
                    <h3 style={{ fontSize: '24px', fontWeight: 900, color: '#ffffff', marginBottom: '12px' }}>
                      {decision.title}
                    </h3>
                    
                    {decision.description && (
                      <p style={{ fontSize: '16px', color: '#d1d5db', marginBottom: '16px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {decision.description}
                      </p>
                    )}
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px', fontSize: '14px', color: '#d1d5db' }}>
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
