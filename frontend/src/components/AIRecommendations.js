import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SparklesIcon, ChatBubbleLeftIcon, LightBulbIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

export default function AIRecommendations({ darkMode }) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  const bgColor = darkMode ? '#1c1917' : '#ffffff';
  const textColor = darkMode ? '#e7e5e4' : '#111827';
  const borderColor = darkMode ? '#292524' : '#e5e7eb';
  const hoverBg = darkMode ? '#292524' : '#f3f4f6';
  const secondaryText = darkMode ? '#a8a29e' : '#6b7280';

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/knowledge/ai/recommendations/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setRecommendations(data.recommendations || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'conversation': return ChatBubbleLeftIcon;
      case 'decision': return LightBulbIcon;
      default: return DocumentTextIcon;
    }
  };

  const getLink = (item) => {
    switch (item.type) {
      case 'conversation': return `/conversations/${item.id}`;
      case 'decision': return `/decisions/${item.id}`;
      default: return '#';
    }
  };

  if (loading) return null;
  if (recommendations.length === 0) return null;

  return (
    <div style={{
      backgroundColor: bgColor,
      border: `1px solid ${borderColor}`,
      borderRadius: '8px',
      padding: '20px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <SparklesIcon style={{ width: '20px', height: '20px', color: '#f59e0b' }} />
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: textColor, margin: 0 }}>
          AI Recommendations
        </h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {recommendations.slice(0, 5).map((item, idx) => {
          const Icon = getIcon(item.type);
          return (
            <Link
              key={idx}
              to={getLink(item)}
              style={{
                display: 'flex',
                alignItems: 'start',
                gap: '10px',
                padding: '10px',
                borderRadius: '6px',
                textDecoration: 'none',
                transition: 'background 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBg}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <Icon style={{ width: '16px', height: '16px', color: secondaryText, marginTop: '2px', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: textColor, marginBottom: '2px' }}>
                  {item.title}
                </div>
                <div style={{ fontSize: '11px', color: secondaryText }}>
                  {item.reason}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
