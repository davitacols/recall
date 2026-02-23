import React, { useState } from 'react';
import { LinkIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../utils/ThemeAndAccessibility';

export default function QuickLink({ sourceType, sourceId }) {
  const { darkMode } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [targetType, setTargetType] = useState('conversations.conversation');
  const [targetId, setTargetId] = useState('');
  const [linkType, setLinkType] = useState('relates_to');
  const [loading, setLoading] = useState(false);

  const bgSecondary = darkMode ? '#1c1917' : '#ffffff';
  const borderColor = darkMode ? '#292524' : '#d1d5db';
  const textPrimary = darkMode ? '#e7e5e4' : '#111827';
  const textSecondary = darkMode ? '#a8a29e' : '#374151';
  const inputBg = darkMode ? '#292524' : '#ffffff';

  const createLink = async () => {
    if (!targetId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await fetch('http://localhost:8000/api/knowledge/link/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source_type: sourceType,
          source_id: sourceId,
          target_type: targetType,
          target_id: targetId,
          link_type: linkType,
        }),
      });
      setShowModal(false);
      window.location.reload();
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to create link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '7px 12px',
          backgroundColor: 'transparent',
          border: '2px solid #3b82f6',
          color: '#3b82f6',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.15s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#3b82f6';
          e.currentTarget.style.color = '#ffffff';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = '#3b82f6';
        }}
      >
        <LinkIcon style={{ width: '14px', height: '14px' }} />
        Link to...
      </button>

      {showModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50
        }}>
          <div style={{
            backgroundColor: bgSecondary,
            border: `1px solid ${borderColor}`,
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '400px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: textPrimary }}>
              Link to Content
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: textSecondary }}>
                  Type
                </label>
                <select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: `1px solid ${borderColor}`,
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: textPrimary,
                    backgroundColor: inputBg
                  }}
                >
                  <option value="conversations.conversation">Conversation</option>
                  <option value="decisions.decision">Decision</option>
                  <option value="business.task">Task</option>
                  <option value="business.meeting">Meeting</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: textSecondary }}>
                  ID
                </label>
                <input
                  type="number"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  placeholder="Enter ID"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: `1px solid ${borderColor}`,
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: textPrimary,
                    backgroundColor: inputBg
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: textSecondary }}>
                  Relationship
                </label>
                <select
                  value={linkType}
                  onChange={(e) => setLinkType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: `1px solid ${borderColor}`,
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: textPrimary,
                    backgroundColor: inputBg
                  }}
                >
                  <option value="relates_to">Relates to</option>
                  <option value="implements">Implements</option>
                  <option value="blocks">Blocks</option>
                  <option value="references">References</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
              <button
                onClick={createLink}
                disabled={!targetId || loading}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  backgroundColor: '#3b82f6',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  opacity: (!targetId || loading) ? 0.5 : 1
                }}
              >
                {loading ? 'Creating...' : 'Create Link'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  backgroundColor: darkMode ? '#292524' : '#f3f4f6',
                  color: textSecondary,
                  border: `1px solid ${borderColor}`,
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
