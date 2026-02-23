import React, { useState } from 'react';
import { SparklesIcon } from '@heroicons/react/24/outline';

export default function AISummaryButton({ content, darkMode }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  const bgColor = darkMode ? '#1c1917' : '#ffffff';
  const textColor = darkMode ? '#e7e5e4' : '#111827';
  const borderColor = darkMode ? '#292524' : '#e5e7eb';
  const secondaryText = darkMode ? '#a8a29e' : '#6b7280';

  const generateSummary = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/knowledge/ai/summarize-v2/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content, type: 'text' })
      });
      const data = await res.json();
      setSummary(data);
      setShow(true);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={generateSummary}
        disabled={loading}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '7px 12px',
          backgroundColor: 'transparent',
          border: '2px solid #f59e0b',
          color: '#f59e0b',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.15s',
          opacity: loading ? 0.5 : 1
        }}
        onMouseEnter={(e) => {
          if (!loading) {
            e.currentTarget.style.backgroundColor = '#f59e0b';
            e.currentTarget.style.color = '#ffffff';
          }
        }}
        onMouseLeave={(e) => {
          if (!loading) {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#f59e0b';
          }
        }}
      >
        <SparklesIcon style={{ width: '14px', height: '14px' }} />
        {loading ? 'Generating...' : 'AI Summary'}
      </button>

      {show && summary && (
        <div style={{
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
        }} onClick={() => setShow(false)}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <SparklesIcon style={{ width: '20px', height: '20px', color: '#f59e0b' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: textColor, margin: 0 }}>
                AI Summary
              </h3>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: secondaryText, marginBottom: '8px', textTransform: 'uppercase', fontWeight: 600 }}>
                Summary
              </div>
              <p style={{ fontSize: '14px', color: textColor, lineHeight: '1.6' }}>
                {summary.summary}
              </p>
            </div>

            {summary.key_points && summary.key_points.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', color: secondaryText, marginBottom: '8px', textTransform: 'uppercase', fontWeight: 600 }}>
                  Key Points
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {summary.key_points.map((point, idx) => (
                    <li key={idx} style={{ fontSize: '13px', color: textColor, marginBottom: '6px' }}>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: secondaryText }}>
              <span>{summary.word_count} words</span>
              <span>•</span>
              <span>{summary.reading_time} min read</span>
            </div>

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
