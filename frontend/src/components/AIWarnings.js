import React, { useState, useEffect } from 'react';
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function AIWarnings({ type, title, description, keywords, darkMode }) {
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  const bgColor = darkMode ? '#1c1917' : '#ffffff';
  const textColor = darkMode ? '#e7e5e4' : '#111827';
  const borderColor = darkMode ? '#292524' : '#e5e7eb';

  useEffect(() => {
    if (title || description) {
      checkFailures();
    }
  }, [title, description]);

  const checkFailures = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/knowledge/ai/check-failures/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type, title, description, keywords })
      });
      const data = await res.json();
      setWarnings(data.warnings || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || warnings.length === 0 || dismissed) return null;

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return { bg: '#7f1d1d', border: '#991b1b', text: '#fca5a5' };
      case 'medium': return { bg: '#78350f', border: '#92400e', text: '#fcd34d' };
      default: return { bg: '#1e3a8a', border: '#1e40af', text: '#93c5fd' };
    }
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      {warnings.map((warning, idx) => {
        const colors = getSeverityColor(warning.severity);
        return (
          <div
            key={idx}
            style={{
              backgroundColor: darkMode ? colors.bg : '#fef2f2',
              border: `2px solid ${darkMode ? colors.border : '#fecaca'}`,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '12px',
              position: 'relative'
            }}
          >
            <button
              onClick={() => setDismissed(true)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: colors.text,
                padding: '4px'
              }}
            >
              <XMarkIcon style={{ width: '16px', height: '16px' }} />
            </button>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'start' }}>
              <ExclamationTriangleIcon style={{ width: '24px', height: '24px', color: colors.text, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: colors.text, marginBottom: '8px' }}>
                  {warning.type === 'similar_failure' && '⚠️ Similar Decisions Failed'}
                  {warning.type === 'rapid_iteration' && '🔄 Rapid Iteration Detected'}
                  {warning.type === 'low_success_rate' && '📉 Low Success Rate'}
                </div>
                <div style={{ fontSize: '13px', color: colors.text, marginBottom: '12px' }}>
                  {warning.message}
                </div>

                {warning.items && warning.items.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {warning.items.map((item, i) => (
                      <div
                        key={i}
                        style={{
                          padding: '10px',
                          backgroundColor: darkMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}
                      >
                        <div style={{ fontWeight: 600, color: colors.text, marginBottom: '4px' }}>
                          {item.title} ({item.similarity}% similar)
                        </div>
                        <div style={{ color: colors.text, opacity: 0.8 }}>
                          Status: {item.status} • {item.date}
                        </div>
                        {item.reason && (
                          <div style={{ color: colors.text, opacity: 0.8, marginTop: '4px' }}>
                            Reason: {item.reason}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {warning.success_rate !== undefined && (
                  <div style={{
                    marginTop: '12px',
                    padding: '8px 12px',
                    backgroundColor: darkMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: colors.text
                  }}>
                    Success Rate: {warning.success_rate}% ({warning.total} similar decisions)
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
