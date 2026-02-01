import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { useToast } from '../components/Toast';
import { TrashIcon } from '@heroicons/react/24/outline';

function Settings() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [activeSection, setActiveSection] = useState('notifications');
  const [notifications, setNotifications] = useState({
    mention_notifications: true,
    reply_notifications: true,
    decision_notifications: true,
    digest_frequency: 'daily'
  });
  const [organization, setOrganization] = useState(null);
  const [members, setMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('contributor');
  const [orgName, setOrgName] = useState('');
  const [orgDescription, setOrgDescription] = useState('');
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [generatedLink, setGeneratedLink] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
    if (user?.role === 'admin') {
      fetchOrganization();
      fetchMembers();
      fetchPendingInvitations();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/api/auth/profile/');
      setNotifications({
        mention_notifications: response.data.mention_notifications ?? true,
        reply_notifications: response.data.reply_notifications ?? true,
        decision_notifications: response.data.decision_notifications ?? true,
        digest_frequency: response.data.digest_frequency || 'daily'
      });
    } catch (error) {
      addToast('Failed to fetch settings', 'error');
    }
  };

  const fetchOrganization = async () => {
    try {
      const response = await api.get('/api/organizations/me/');
      setOrganization(response.data);
      setOrgName(response.data.name || '');
      setOrgDescription(response.data.description || '');
    } catch (error) {
      addToast('Failed to fetch organization', 'error');
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await api.get('/api/organizations/members/');
      setMembers(response.data);
    } catch (error) {
      addToast('Failed to fetch members', 'error');
    }
  };

  const fetchPendingInvitations = async () => {
    try {
      const response = await api.get('/api/organizations/settings/invitation-links/');
      setPendingInvitations(response.data);
    } catch (error) {
      addToast('Failed to fetch pending invitations', 'error');
    }
  };

  const handleToggle = (key) => {
    const updated = { ...notifications, [key]: !notifications[key] };
    setNotifications(updated);
    api.put('/api/auth/profile/update/', updated).catch(() => addToast('Failed to save', 'error'));
  };

  const handleDigestChange = (value) => {
    const updated = { ...notifications, digest_frequency: value };
    setNotifications(updated);
    api.put('/api/auth/profile/update/', updated).catch(() => addToast('Failed to save', 'error'));
  };

  const saveOrganization = async () => {
    setLoading(true);
    try {
      await api.put('/api/organizations/me/', {
        name: orgName,
        description: orgDescription
      });
      addToast('Organization updated', 'success');
      fetchOrganization();
    } catch (error) {
      addToast('Failed to update organization', 'error');
    } finally {
      setLoading(false);
    }
  };

  const inviteMember = async () => {
    if (!inviteEmail.trim()) return;
    setLoading(true);
    try {
      const response = await api.post('/api/organizations/invitations/send/', {
        email: inviteEmail,
        role: inviteRole
      });
      setGeneratedLink(response.data.invite_link);
      addToast('Invitation created', 'success');
      setInviteEmail('');
      setInviteRole('contributor');
      fetchPendingInvitations();
    } catch (error) {
      addToast('Failed to invite member', 'error');
    } finally {
      setLoading(false);
    }
  };

  const cancelInvitation = async (invitationId) => {
    try {
      await api.delete(`/api/organizations/invitations/${invitationId}/revoke/`);
      addToast('Invitation cancelled', 'success');
      fetchPendingInvitations();
      setConfirmDelete(null);
    } catch (error) {
      addToast('Failed to cancel invitation', 'error');
    }
  };

  const removeMember = async (memberId) => {
    try {
      await api.delete(`/api/organizations/members/${memberId}/`);
      addToast('Member removed', 'success');
      fetchMembers();
      setConfirmDelete(null);
    } catch (error) {
      addToast('Failed to remove member', 'error');
    }
  };

  const sections = [
    { id: 'notifications', label: 'Notifications' },
    ...(user?.role === 'admin' ? [
      { id: 'organization', label: 'Organization' },
      { id: 'team', label: 'Team' }
    ] : []),
    { id: 'advanced', label: 'Advanced' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-black text-gray-900 mb-1">Settings</h1>
          <p className="text-gray-600">Manage your preferences and organization</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-1">
            <nav className="space-y-2 sticky top-24">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg font-bold text-sm uppercase tracking-wide transition-all ${
                    activeSection === section.id
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {section.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Notifications Section */}
            {activeSection === 'notifications' && (
              <>
                <div className="bg-white border-2 border-gray-900 p-8 shadow-sm">
                  <h2 className="text-2xl font-black text-gray-900 mb-6">Notification Preferences</h2>
                  <div className="space-y-4">
                    {['mention_notifications', 'reply_notifications', 'decision_notifications'].map((key) => (
                      <div key={key} className="flex items-center justify-between p-4 border border-gray-200 hover:border-gray-900 transition-all">
                        <span className="font-bold text-gray-900 capitalize">{key.replace(/_/g, ' ')}</span>
                        <button
                          onClick={() => handleToggle(key)}
                          className={`w-12 h-6 rounded-full transition-all ${
                            notifications[key] ? 'bg-gray-900' : 'bg-gray-300'
                          }`}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border-2 border-gray-900 p-8 shadow-sm">
                  <h2 className="text-2xl font-black text-gray-900 mb-6">Email Digests</h2>
                  <div className="space-y-3">
                    {['realtime', 'hourly', 'daily', 'weekly', 'never'].map((freq) => (
                      <label key={freq} className="flex items-center gap-3 p-3 border border-gray-200 hover:border-gray-900 cursor-pointer transition-all">
                        <input
                          type="radio"
                          name="digest"
                          checked={notifications.digest_frequency === freq}
                          onChange={() => handleDigestChange(freq)}
                          className="w-4 h-4"
                        />
                        <span className="font-bold text-gray-900 capitalize">{freq}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Organization Section */}
            {activeSection === 'organization' && user?.role === 'admin' && organization && (
              <div className="bg-white border-2 border-gray-900 p-8 shadow-sm">
                <h2 className="text-2xl font-black text-gray-900 mb-6">Organization Profile</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-600 uppercase tracking-wide mb-2">Organization Name</label>
                    <input
                      type="text"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 focus:border-gray-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-600 uppercase tracking-wide mb-2">Description</label>
                    <textarea
                      value={orgDescription}
                      onChange={(e) => setOrgDescription(e.target.value)}
                      rows="4"
                      className="w-full px-4 py-3 border-2 border-gray-200 focus:border-gray-900 focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={saveOrganization}
                    disabled={loading}
                    className="px-6 py-3 bg-gray-900 text-white hover:bg-black font-bold uppercase text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}

            {/* Team Section */}
            {activeSection === 'team' && user?.role === 'admin' && (
              <>
                <div className="bg-white border-2 border-gray-900 p-8 shadow-sm">
                  <h2 className="text-2xl font-black text-gray-900 mb-6">Invite Team Member</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-600 uppercase tracking-wide mb-2">Email Address</label>
                      <input
                        type="email"
                        placeholder="member@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 focus:border-gray-900 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-600 uppercase tracking-wide mb-2">Role</label>
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 focus:border-gray-900 focus:outline-none"
                      >
                        <option value="contributor">Contributor</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <button
                      onClick={inviteMember}
                      disabled={loading}
                      className="px-6 py-3 bg-gray-900 text-white hover:bg-black font-bold uppercase text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Sending...' : 'Send Invite'}
                    </button>
                  </div>
                </div>

                {generatedLink && (
                  <div className="bg-white border-2 border-gray-900 p-8 shadow-sm">
                    <h2 className="text-2xl font-black text-gray-900 mb-6">Invitation Link Generated</h2>
                    <div className="bg-gray-50 p-4 border border-gray-200 rounded mb-4">
                      <p className="text-sm font-bold text-gray-600 uppercase mb-2">Share this link</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={generatedLink}
                          readOnly
                          className="flex-1 px-3 py-2 border border-gray-300 bg-white text-sm font-mono"
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(generatedLink);
                            addToast('Link copied!', 'success');
                          }}
                          className="px-4 py-2 bg-gray-900 text-white hover:bg-black font-bold text-sm transition-all"
                        >
                          Copy
                        </button>
                      </div>
                      <p className="text-xs text-gray-600 mt-2">Expires in 7 days • Can only be used once</p>
                    </div>
                    <button
                      onClick={() => setGeneratedLink(null)}
                      className="px-4 py-2 border border-gray-300 text-gray-900 hover:bg-gray-50 font-bold text-sm transition-all"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {pendingInvitations.length > 0 && (
                  <div className="bg-white border-2 border-gray-900 p-8 shadow-sm">
                    <h2 className="text-2xl font-black text-gray-900 mb-6">Pending Invitations ({pendingInvitations.length})</h2>
                    <div className="space-y-3">
                      {pendingInvitations.map((invitation) => (
                        <div key={invitation.id} className="flex items-center justify-between p-4 border border-gray-200">
                          <div>
                            <p className="font-bold text-gray-900">{invitation.email}</p>
                            <p className="text-sm text-gray-600">Role: {invitation.role}</p>
                          </div>
                          <button
                            onClick={() => setConfirmDelete({ type: 'invitation', id: invitation.id })}
                            className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 font-bold text-sm transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-white border-2 border-gray-900 p-8 shadow-sm">
                  <h2 className="text-2xl font-black text-gray-900 mb-6">Team Members ({members.length})</h2>
                  <div className="space-y-3">
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-4 border border-gray-200">
                        <div>
                          <p className="font-bold text-gray-900">{member.full_name}</p>
                          <p className="text-sm text-gray-600">{member.email}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-bold uppercase text-gray-600 bg-gray-100 px-3 py-1">{member.role}</span>
                          {member.id !== user?.id && (
                            <button
                              onClick={() => setConfirmDelete({ type: 'member', id: member.id })}
                              className="p-2 text-red-600 hover:bg-red-50 transition-all"
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Advanced Section */}
            {activeSection === 'advanced' && (
              <div className="bg-white border-2 border-gray-900 p-8 shadow-sm">
                <h2 className="text-2xl font-black text-gray-900 mb-6">Data & Privacy</h2>
                <p className="text-gray-600">AI assistance helps summarize conversations and extract action items. Your data stays private to your organization.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg max-w-sm">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {confirmDelete.type === 'invitation' ? 'Cancel Invitation?' : 'Remove Member?'}
            </h3>
            <p className="text-gray-600 mb-6">
              {confirmDelete.type === 'invitation' 
                ? 'This invitation will be cancelled and cannot be used.' 
                : 'This member will be removed from the organization.'}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 border border-gray-300 text-gray-900 hover:bg-gray-50 font-bold transition-all"
              >
                Keep
              </button>
              <button
                onClick={() => {
                  if (confirmDelete.type === 'invitation') {
                    cancelInvitation(confirmDelete.id);
                  } else {
                    removeMember(confirmDelete.id);
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 font-bold transition-all"
              >
                {confirmDelete.type === 'invitation' ? 'Cancel' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;
