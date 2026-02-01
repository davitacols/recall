import React, { useState, useEffect } from 'react';
import { useTheme } from '../utils/ThemeAndAccessibility';
import { CheckIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

export default function TeamInvitation() {
  const { darkMode } = useTheme();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('contributor');
  const [loading, setLoading] = useState(false);
  const [invitations, setInvitations] = useState([]);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [generatedLink, setGeneratedLink] = useState(null);

  const bgColor = darkMode ? '#000000' : '#ffffff';
  const textColor = darkMode ? '#f3f4f6' : '#111827';
  const borderColor = darkMode ? '#1a1a1a' : '#e5e7eb';
  const hoverBg = darkMode ? '#1a1a1a' : '#f3f4f6';
  const secondaryText = darkMode ? '#d1d5db' : '#6b7280';

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      const response = await api.get('/api/organizations/invitations/');
      setInvitations(response.data);
    } catch (err) {
      console.error('Failed to fetch invitations:', err);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/api/organizations/invitations/send/', {
        email,
        role
      });
      
      setGeneratedLink(response.data.invite_link);
      setEmail('');
      setRole('contributor');
      fetchInvitations();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (invitationId) => {
    if (!window.confirm('Cancel this invitation?')) return;

    try {
      await api.delete(`/api/organizations/invitations/${invitationId}/revoke/`);
      fetchInvitations();
    } catch (err) {
      setError('Failed to cancel invitation');
    }
  };

  const copyToClipboard = (link, id) => {
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '48px' }}>
        <h1 style={{ fontSize: '36px', fontWeight: 900, color: textColor, marginBottom: '12px' }}>Team Invitations</h1>
        <p style={{ fontSize: '16px', color: secondaryText }}>Invite team members via email or shareable link</p>
      </div>

      {/* Invite Form */}
      <div style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, padding: '32px', marginBottom: '48px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: textColor, marginBottom: '24px' }}>Create Invitation</h2>
        <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: textColor, marginBottom: '8px' }}>Email (Optional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@example.com"
              style={{ width: '100%', paddingLeft: '16px', paddingRight: '16px', paddingTop: '12px', paddingBottom: '12px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, color: textColor, outline: 'none', transition: 'all 0.2s' }}
              onFocus={(e) => e.target.style.borderColor = textColor}
              onBlur={(e) => e.target.style.borderColor = borderColor}
            />
            <p style={{ fontSize: '12px', color: secondaryText, marginTop: '6px' }}>Leave empty to generate link only</p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: textColor, marginBottom: '8px' }}>Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{ width: '100%', paddingLeft: '16px', paddingRight: '16px', paddingTop: '12px', paddingBottom: '12px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, color: textColor, outline: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              <option value="contributor">Contributor</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ paddingLeft: '24px', paddingRight: '24px', paddingTop: '12px', paddingBottom: '12px', backgroundColor: loading ? '#6b7280' : '#374151', color: '#ffffff', border: 'none', fontWeight: 700, fontSize: '14px', cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', opacity: loading ? 0.6 : 1 }}
            onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = '#4b5563')}
            onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = '#374151')}
          >
            {loading ? 'Creating...' : 'Generate Invitation'}
          </button>
        </form>
        {error && <p style={{ marginTop: '16px', color: '#ef4444', fontSize: '14px' }}>{error}</p>}
      </div>

      {/* Generated Link Display */}
      {generatedLink && (
        <div style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, padding: '32px', marginBottom: '48px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: textColor, marginBottom: '16px' }}>Invitation Link Generated</h2>
          <div style={{ backgroundColor: hoverBg, padding: '16px', borderRadius: '4px', marginBottom: '16px' }}>
            <p style={{ fontSize: '12px', color: secondaryText, marginBottom: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Share this link</p>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input
                type="text"
                value={generatedLink}
                readOnly
                style={{ flex: 1, paddingLeft: '12px', paddingRight: '12px', paddingTop: '10px', paddingBottom: '10px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, color: textColor, fontSize: '13px', fontFamily: 'monospace', outline: 'none' }}
              />
              <button
                onClick={() => copyToClipboard(generatedLink, 'generated')}
                style={{ paddingLeft: '16px', paddingRight: '16px', paddingTop: '10px', paddingBottom: '10px', backgroundColor: '#374151', color: '#ffffff', border: 'none', fontWeight: 600, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#4b5563'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#374151'}
              >
                {copiedId === 'generated' ? (
                  <>
                    <CheckIcon style={{ width: '16px', height: '16px' }} />
                    Copied
                  </>
                ) : (
                  <>
                    <DocumentDuplicateIcon style={{ width: '16px', height: '16px' }} />
                    Copy
                  </>
                )}
              </button>
            </div>
            <p style={{ fontSize: '12px', color: secondaryText, marginTop: '12px' }}>Expires in 7 days • Can only be used once</p>
          </div>
          <button
            onClick={() => setGeneratedLink(null)}
            style={{ paddingLeft: '16px', paddingRight: '16px', paddingTop: '8px', paddingBottom: '8px', backgroundColor: 'transparent', color: secondaryText, border: `1px solid ${borderColor}`, fontWeight: 600, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={(e) => { e.target.style.backgroundColor = hoverBg; e.target.style.color = textColor; }}
            onMouseLeave={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.color = secondaryText; }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Pending Invitations */}
      <div style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, padding: '32px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: textColor, marginBottom: '24px' }}>Pending Invitations ({invitations.length})</h2>
        {invitations.length === 0 ? (
          <p style={{ color: secondaryText, fontSize: '14px' }}>No pending invitations</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {invitations.map(inv => (
              <div key={inv.id} style={{ backgroundColor: hoverBg, border: `1px solid ${borderColor}`, padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = textColor} onMouseLeave={(e) => e.currentTarget.style.borderColor = borderColor}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, color: textColor, marginBottom: '4px' }}>{inv.email}</p>
                  <p style={{ fontSize: '12px', color: secondaryText }}>
                    Role: {inv.role} • Expires: {new Date(inv.expires_at).toLocaleDateString()}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
                  <button
                    onClick={() => copyToClipboard(inv.invite_link, inv.id)}
                    style={{ paddingLeft: '12px', paddingRight: '12px', paddingTop: '8px', paddingBottom: '8px', backgroundColor: 'transparent', color: secondaryText, border: `1px solid ${borderColor}`, fontWeight: 600, fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }}
                    onMouseEnter={(e) => { e.target.style.backgroundColor = hoverBg; e.target.style.color = textColor; }}
                    onMouseLeave={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.color = secondaryText; }}
                  >
                    {copiedId === inv.id ? (
                      <>
                        <CheckIcon style={{ width: '14px', height: '14px' }} />
                        Copied
                      </>
                    ) : (
                      <>
                        <DocumentDuplicateIcon style={{ width: '14px', height: '14px' }} />
                        Copy Link
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleRevoke(inv.id)}
                    style={{ paddingLeft: '12px', paddingRight: '12px', paddingTop: '8px', paddingBottom: '8px', backgroundColor: '#ef4444', color: '#ffffff', border: 'none', fontWeight: 600, fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#dc2626'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#ef4444'}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
