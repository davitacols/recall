import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../utils/ThemeAndAccessibility';
import api from '../services/api';
import { useToast } from '../components/Toast';
import { BellIcon, UserIcon, ShieldCheckIcon, UsersIcon, BuildingOfficeIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

function Settings() {
  const { user } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
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
    { id: 'notifications', label: 'Notifications', icon: BellIcon },
    { id: 'appearance', label: 'Appearance', icon: Cog6ToothIcon },
    ...(user?.role === 'admin' ? [
      { id: 'organization', label: 'Organization', icon: BuildingOfficeIcon },
      { id: 'team', label: 'Team', icon: UsersIcon }
    ] : []),
    { id: 'advanced', label: 'Privacy', icon: ShieldCheckIcon }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-lg text-gray-600">Manage your account and preferences</p>
        </div>

        <div className="flex gap-8">
          <aside className="w-64 flex-shrink-0">
            <nav className="space-y-1 sticky top-8">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      activeSection === section.id
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {section.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="flex-1 space-y-6">
            {activeSection === 'notifications' && (
              <>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Notification Preferences</h2>
                  <div className="space-y-4">
                    {[
                      { key: 'mention_notifications', label: 'Mentions', desc: 'Get notified when someone mentions you' },
                      { key: 'reply_notifications', label: 'Replies', desc: 'Get notified when someone replies to your posts' },
                      { key: 'decision_notifications', label: 'Decisions', desc: 'Get notified about decision updates' }
                    ].map(({ key, label, desc }) => (
                      <div key={key} className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
                        <div>
                          <div className="font-semibold text-gray-900">{label}</div>
                          <div className="text-sm text-gray-500">{desc}</div>
                        </div>
                        <button
                          onClick={() => handleToggle(key)}
                          className={`relative w-11 h-6 rounded-full transition-colors ${
                            notifications[key] ? 'bg-gray-900' : 'bg-gray-300'
                          }`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                            notifications[key] ? 'translate-x-5' : 'translate-x-0'
                          }`} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Email Digest</h2>
                  <div className="space-y-3">
                    {[
                      { value: 'realtime', label: 'Real-time', desc: 'Instant notifications' },
                      { value: 'hourly', label: 'Hourly', desc: 'Summary every hour' },
                      { value: 'daily', label: 'Daily', desc: 'One digest per day' },
                      { value: 'weekly', label: 'Weekly', desc: 'Weekly summary' },
                      { value: 'never', label: 'Never', desc: 'No email notifications' }
                    ].map(({ value, label, desc }) => (
                      <label key={value} className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-gray-900 cursor-pointer transition-all">
                        <input
                          type="radio"
                          name="digest"
                          checked={notifications.digest_frequency === value}
                          onChange={() => handleDigestChange(value)}
                          className="w-4 h-4 text-gray-900"
                        />
                        <div>
                          <div className="font-semibold text-gray-900">{label}</div>
                          <div className="text-sm text-gray-500">{desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            {activeSection === 'appearance' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Theme</h2>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-gray-900 cursor-pointer transition-all">
                    <input
                      type="radio"
                      name="theme"
                      checked={darkMode}
                      onChange={() => !darkMode && toggleDarkMode()}
                      className="w-4 h-4 text-gray-900"
                    />
                    <div>
                      <div className="font-semibold text-gray-900">Dark</div>
                      <div className="text-sm text-gray-500">Dark theme with stone colors</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-gray-900 cursor-pointer transition-all">
                    <input
                      type="radio"
                      name="theme"
                      checked={!darkMode}
                      onChange={() => darkMode && toggleDarkMode()}
                      className="w-4 h-4 text-gray-900"
                    />
                    <div>
                      <div className="font-semibold text-gray-900">Light</div>
                      <div className="text-sm text-gray-500">Light theme with white backgrounds</div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {activeSection === 'organization' && user?.role === 'admin' && organization && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Organization Profile</h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Organization Name</label>
                    <input
                      type="text"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-gray-900 focus:ring-2 focus:ring-gray-900 focus:ring-opacity-20 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                    <textarea
                      value={orgDescription}
                      onChange={(e) => setOrgDescription(e.target.value)}
                      rows="4"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-gray-900 focus:ring-2 focus:ring-gray-900 focus:ring-opacity-20 outline-none transition-all"
                    />
                  </div>
                  <button
                    onClick={saveOrganization}
                    disabled={loading}
                    className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}

            {activeSection === 'team' && user?.role === 'admin' && (
              <>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Invite Team Member</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                      <input
                        type="email"
                        placeholder="member@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-gray-900 focus:ring-2 focus:ring-gray-900 focus:ring-opacity-20 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Role</label>
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-gray-900 focus:ring-2 focus:ring-gray-900 focus:ring-opacity-20 outline-none transition-all"
                      >
                        <option value="contributor">Contributor</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <button
                      onClick={inviteMember}
                      disabled={loading}
                      className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Sending...' : 'Send Invite'}
                    </button>
                  </div>
                </div>

                {generatedLink && (
                  <div className="bg-green-50 rounded-xl border border-green-200 p-8">
                    <h2 className="text-xl font-bold text-green-900 mb-4">Invitation Link Generated</h2>
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={generatedLink}
                        readOnly
                        className="flex-1 px-4 py-2 rounded-lg border border-green-300 bg-white text-sm font-mono"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(generatedLink);
                          addToast('Link copied!', 'success');
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-all"
                      >
                        Copy
                      </button>
                    </div>
                    <p className="text-sm text-green-700 mb-3">Expires in 7 days • Single use only</p>
                    <button
                      onClick={() => setGeneratedLink(null)}
                      className="text-sm text-green-700 hover:text-green-900 font-semibold"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {pendingInvitations.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Pending Invitations ({pendingInvitations.length})</h2>
                    <div className="space-y-3">
                      {pendingInvitations.map((invitation) => (
                        <div key={invitation.id} className="flex items-center justify-between p-4 rounded-lg border border-gray-200">
                          <div>
                            <p className="font-semibold text-gray-900">{invitation.email}</p>
                            <p className="text-sm text-gray-500">Role: {invitation.role}</p>
                          </div>
                          <button
                            onClick={() => setConfirmDelete({ type: 'invitation', id: invitation.id })}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold text-sm transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Team Members ({members.length})</h2>
                  <div className="space-y-3">
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-all">
                        <div>
                          <p className="font-semibold text-gray-900">{member.full_name}</p>
                          <p className="text-sm text-gray-500">{member.email}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold uppercase">{member.role}</span>
                          {member.id !== user?.id && (
                            <button
                              onClick={() => setConfirmDelete({ type: 'member', id: member.id })}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {activeSection === 'advanced' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Data & Privacy</h2>
                <div className="space-y-4 text-gray-600">
                  <p>AI assistance helps summarize conversations and extract action items.</p>
                  <p>Your data stays private to your organization and is never shared with third parties.</p>
                  <p>You can export or delete your data at any time by contacting support.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
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
                className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-all"
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
                className="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition-all"
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
