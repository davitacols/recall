import React, { useState, useEffect } from 'react';
import api from '../services/api';

function StaffInvitations() {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('contributor');
  const [generatedLink, setGeneratedLink] = useState('');
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    try {
      const response = await api.get('/api/organizations/invitations/');
      setInvitations(response.data);
    } catch (err) {
      console.error('Failed to load invitations:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateInviteLink = async () => {
    if (!inviteEmail.trim()) {
      showError('Email is required');
      return;
    }

    try {
      const response = await api.post('/api/organizations/invitations/send/', {
        email: inviteEmail,
        role: inviteRole
      });

      const fullLink = `${window.location.origin}${response.data.invite_link}`;
      setGeneratedLink(fullLink);
      setShowLinkModal(true);
      setInviteEmail('');
      setInviteRole('contributor');
      loadInvitations();
      showMessage('Invitation link generated successfully');
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to generate invitation');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    showMessage('Link copied to clipboard!');
  };

  const resendInvitation = async (invitation) => {
    // Just copy the link again
    const link = `${window.location.origin}/invite/${invitation.token}`;
    navigator.clipboard.writeText(link);
    showMessage('Link copied to clipboard!');
  };

  const revokeInvitation = async (invitationId) => {
    if (!window.confirm('Are you sure you want to revoke this invitation?')) return;

    try {
      await api.delete(`/api/organizations/invitations/${invitationId}/revoke/`);
      showMessage('Invitation revoked');
      loadInvitations();
    } catch (err) {
      showError('Failed to revoke invitation');
    }
  };

  const showMessage = (msg) => {
    setMessage(msg);
    setError('');
    setTimeout(() => setMessage(''), 3000);
  };

  const showError = (msg) => {
    setError(msg);
    setMessage('');
    setTimeout(() => setError(''), 3000);
  };

  const getRoleColor = (role) => {
    const colors = {
      admin: 'bg-red-600',
      manager: 'bg-blue-600',
      contributor: 'bg-green-600'
    };
    return colors[role] || 'bg-gray-600';
  };

  const getStatusColor = (isValid) => {
    return isValid ? 'text-green-600' : 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-5xl font-bold text-gray-900 mb-8 uppercase tracking-wide">Staff Invitations</h1>

      {/* Messages */}
      {message && (
        <div className="mb-6 p-4 bg-green-50 border-2 border-green-600 text-green-900 font-bold">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border-2 border-red-600 text-red-900 font-bold">
          {error}
        </div>
      )}

      {/* Generate Invitation */}
      <div className="bg-white border-2 border-gray-900 p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 uppercase tracking-wide">Generate Invitation Link</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-900 mb-2 uppercase tracking-wider">Email Address</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="w-full p-3 border-2 border-gray-300 focus:outline-none focus:border-gray-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-900 mb-2 uppercase tracking-wider">Role</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="w-full p-3 border-2 border-gray-300 focus:outline-none focus:border-gray-900"
            >
              <option value="contributor">Contributor</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        <button
          onClick={generateInviteLink}
          className="px-8 py-4 bg-gray-900 text-white hover:bg-gray-800 font-bold uppercase text-sm tracking-wide"
        >
          Generate Invitation Link
        </button>

        <div className="mt-6 p-4 bg-gray-50 border border-gray-200">
          <h3 className="text-sm font-bold text-gray-900 mb-2 uppercase">How it works:</h3>
          <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
            <li>Enter the staff member's email address</li>
            <li>Select their role (Contributor, Manager, or Admin)</li>
            <li>Click "Generate Invitation Link"</li>
            <li>Copy and share the link with them</li>
            <li>They'll use the link to create their account</li>
          </ol>
        </div>
      </div>

      {/* Pending Invitations */}
      <div className="bg-white border-2 border-gray-900 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 uppercase tracking-wide">
          Pending Invitations ({invitations.length})
        </h2>

        {invitations.length === 0 ? (
          <p className="text-gray-600">No pending invitations</p>
        ) : (
          <div className="space-y-4">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="p-4 bg-gray-50 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="font-bold text-gray-900">{invitation.email}</span>
                      <span className={`px-3 py-1 ${getRoleColor(invitation.role)} text-white text-xs font-bold uppercase`}>
                        {invitation.role}
                      </span>
                      <span className={`text-xs font-bold uppercase ${getStatusColor(invitation.is_valid)}`}>
                        {invitation.is_valid ? 'Active' : 'Expired'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Invited by {invitation.invited_by} on {new Date(invitation.created_at).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Expires: {new Date(invitation.expires_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        const link = `${window.location.origin}/invite/${invitation.token}`;
                        navigator.clipboard.writeText(link);
                        showMessage('Link copied!');
                      }}
                      className="px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 font-bold uppercase text-xs"
                    >
                      Copy Link
                    </button>
                    <button
                      onClick={() => revokeInvitation(invitation.id)}
                      className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 font-bold uppercase text-xs"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white border-2 border-gray-900 w-full max-w-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 uppercase tracking-wide">
              Invitation Link Generated
            </h2>

            <div className="mb-6">
              <label className="block text-xs font-bold text-gray-900 mb-2 uppercase tracking-wider">
                Share this link with your staff member:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={generatedLink}
                  readOnly
                  className="flex-1 p-3 border-2 border-gray-300 bg-gray-50 font-mono text-sm"
                />
                <button
                  onClick={copyToClipboard}
                  className="px-6 py-3 bg-gray-900 text-white hover:bg-gray-800 font-bold uppercase text-sm"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="p-4 bg-yellow-50 border-2 border-yellow-600 mb-6">
              <p className="text-sm text-yellow-900 font-bold mb-2">⚠️ Important:</p>
              <ul className="text-sm text-yellow-900 space-y-1 list-disc list-inside">
                <li>This link expires in 7 days</li>
                <li>It can only be used once</li>
                <li>Share it securely with the intended recipient</li>
                <li>They'll need to create a password when accepting</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowLinkModal(false)}
                className="px-6 py-3 border-2 border-gray-900 text-gray-900 hover:bg-gray-100 font-bold uppercase text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StaffInvitations;
