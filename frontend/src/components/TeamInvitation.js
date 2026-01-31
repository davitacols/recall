import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function TeamInvitation() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('contributor');
  const [loading, setLoading] = useState(false);
  const [invitations, setInvitations] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [emailSent, setEmailSent] = useState(false);

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
    setMessage('');

    try {
      const response = await api.post('/api/organizations/invitations/send/', {
        email,
        role
      });
      
      setInviteLink(response.data.invite_link);
      setEmailSent(response.data.email_sent);
      setShowLinkModal(true);
      setEmail('');
      setRole('contributor');
      fetchInvitations();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (invitationId) => {
    if (!window.confirm('Revoke this invitation?')) return;

    try {
      await api.delete(`/api/organizations/invitations/${invitationId}/revoke/`);
      fetchInvitations();
    } catch (err) {
      setError('Failed to revoke invitation');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteLink);
    setMessage('Link copied to clipboard!');
  };

  return (
    <div className="space-y-6">
      {/* Invite Form */}
      <div className="p-6 bg-white border border-gray-200 rounded-lg">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Invite Team Member</h3>
        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="contributor">Contributor</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Invitation'}
          </button>
        </form>
        {message && <p className="mt-4 text-green-600 text-sm">{message}</p>}
        {error && <p className="mt-4 text-red-600 text-sm">{error}</p>}
      </div>

      {/* Pending Invitations */}
      <div className="p-6 bg-white border border-gray-200 rounded-lg">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Pending Invitations</h3>
        {invitations.length === 0 ? (
          <p className="text-gray-600">No pending invitations</p>
        ) : (
          <div className="space-y-3">
            {invitations.map(inv => (
              <div key={inv.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{inv.email}</p>
                  <p className="text-xs text-gray-600">
                    Role: {inv.role} • Expires: {new Date(inv.expires_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(inv.invite_link);
                      setMessage('Link copied!');
                    }}
                    className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded text-sm font-semibold"
                  >
                    Copy Link
                  </button>
                  <button
                    onClick={() => handleRevoke(inv.id)}
                    className="px-3 py-1 text-red-600 hover:bg-red-50 rounded text-sm font-semibold"
                  >
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invite Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 w-full max-w-md rounded-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Invitation Created</h2>
            
            {!emailSent && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800">
                  ⚠️ Email could not be sent. Share this link manually:
                </p>
              </div>
            )}
            
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-900 mb-2">Invitation Link</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inviteLink}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
                />
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded mb-6">
              <p className="text-sm text-blue-900">
                ℹ️ This link expires in 7 days and can only be used once.
              </p>
            </div>

            <button
              onClick={() => setShowLinkModal(false)}
              className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-semibold"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
