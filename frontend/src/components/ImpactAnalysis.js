import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowsRightLeftIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function ImpactAnalysis({ contentType, objectId, darkMode }) {
  const [impact, setImpact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);

  const bgColor = darkMode ? '#1c1917' : '#ffffff';
  const textColor = darkMode ? '#e7e5e4' : '#111827';
  const borderColor = darkMode ? '#292524' : '#e5e7eb';
  const hoverBg = darkMode ? '#292524' : '#f3f4f6';
  const secondaryText = darkMode ? '#a8a29e' : '#6b7280';

  useEffect(() => {
    if (show) {
      fetchImpact();
    }
  }, [show]);

  const fetchImpact = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:8000/api/knowledge/context/${contentType}/${objectId}/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      // Calculate impact
      const downstream = data.related_content?.length || 0;
      const experts = data.experts?.length || 0;
      const risks = data.risks?.length || 0;
      
      setImpact({
        downstream_items: downstream,
        affected_experts: experts,
        risk_level: risks > 2 ? 'high' : risks > 0 ? 'medium' : 'low',
        related: data.related_content || [],
        risks: data.risks || []
      });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShow(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '7px 12px',
          backgroundColor: 'transparent',
          border: '2px solid #8b5cf6',
          color: '#8b5cf6',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.15s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#8b5cf6';
          e.currentTarget.style.color = '#ffffff';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = '#8b5cf6';
        }}
      >
        <ArrowsRightLeftIcon style={{ width: '14px', height: '14px' }} />
        Impact Analysis
      </button>

      {show && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px'
          }}
          onClick={() => setShow(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: bgColor,
              border: `1px solid ${borderColor}`,
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <ArrowsRightLeftIcon style={{ width: '20px', height: '20px', color: '#8b5cf6' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: textColor, margin: 0 }}>
                Impact Analysis
              </h3>
            </div>

            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: secondaryText }}>
                Analyzing impact...
              </div>
            ) : impact ? (
              <>
                {/* Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                  <div style={{
                    padding: '16px',
                    backgroundColor: hoverBg,
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: textColor }}>
                      {impact.downstream_items}
                    </div>
                    <div style={{ fontSize: '11px', color: secondaryText, marginTop: '4px' }}>
                      Connected Items
                    </div>
                  </div>
                  <div style={{
                    padding: '16px',
                    backgroundColor: hoverBg,
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: textColor }}>
                      {impact.affected_experts}
                    </div>
                    <div style={{ fontSize: '11px', color: secondaryText, marginTop: '4px' }}>
                      Affected Experts
                    </div>
                  </div>
                  <div style={{
                    padding: '16px',
                    backgroundColor: hoverBg,
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      fontSize: '24px',
                      fontWeight: 700,
                      color: impact.risk_level === 'high' ? '#ef4444' :
                             impact.risk_level === 'medium' ? '#f59e0b' : '#10b981'
                    }}>
                      {impact.risk_level.toUpperCase()}
                    </div>
                    <div style={{ fontSize: '11px', color: secondaryText, marginTop: '4px' }}>
                      Risk Level
                    </div>
                  </div>
                </div>

                {/* Risks */}
                {impact.risks.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: textColor, marginBottom: '12px' }}>
                      ⚠️ Potential Risks
                    </div>
                    {impact.risks.map((risk, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '10px 12px',
                          backgroundColor: darkMode ? '#7f1d1d' : '#fef2f2',
                          border: `1px solid ${darkMode ? '#991b1b' : '#fecaca'}`,
                          borderRadius: '6px',
                          fontSize: '12px',
                          color: darkMode ? '#fca5a5' : '#dc2626',
                          marginBottom: '8px'
                        }}
                      >
                        {risk}
                      </div>
                    ))}
                  </div>
                )}

                {/* Related Items */}
                {impact.related.length > 0 && (
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: textColor, marginBottom: '12px' }}>
                      🔗 Downstream Impact
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {impact.related.slice(0, 5).map((item, idx) => (
                        <Link
                          key={idx}
                          to={`/${item.type}s/${item.id}`}
                          style={{
                            padding: '10px 12px',
                            backgroundColor: hoverBg,
                            borderRadius: '6px',
                            textDecoration: 'none',
                            transition: 'all 0.15s',
                            display: 'block'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = borderColor}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = hoverBg}
                        >
                          <div style={{ fontSize: '13px', fontWeight: 500, color: textColor }}>
                            {item.title}
                          </div>
                          <div style={{ fontSize: '11px', color: secondaryText, textTransform: 'capitalize' }}>
                            {item.type} • {item.relationship}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : null}

            <button
              onClick={() => setShow(false)}
              style={{
                marginTop: '20px',
                padding: '8px 16px',
                backgroundColor: 'transparent',
                border: `2px solid ${borderColor}`,
                color: textColor,
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
