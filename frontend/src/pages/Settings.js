import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { useToast } from '../components/Toast';
import { useAutoSave } from '../hooks/useAutoSave';
import SaveIndicator from '../components/SaveIndicator';
import { CheckIcon, TrashIcon } from '@heroicons/react/24/outline';

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
  const [quietMode, setQuietMode] = useState(false);
  const [organization, setOrganization] = useState(null);
  const [members, setMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('contributor');
  const [orgName, setOrgName] = useState('');
  const [orgDescription, setOrgDescription] = useState('');
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [invitationLinks, setInvitationLinks] = useState({});

  const saveSettings = async (data) => {
    await api.put('/api/auth/profile/update/', data);
  };

  const { status, triggerSave, getStatusText } = useAutoSave(saveSettings, 1000);

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
      console.error('Failed to fetch settings:', error);
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

  const generateInvitationLink = async (invitationId) => {
    try {
      const response = await api.get(`/api/organizations/settings/test-invitation/?invitation_id=${invitationId}`);
      setInvitationLinks(prev => ({
        ...prev,
        [invitationId]: response.data.invitation_link
      }));
      addToast('Link generated', 'success');
    } catch (error) {
      addToast('Failed to generate link', 'error');
    }
  };

  const handleSave = async (updates) => {
    triggerSave(updates);
  };

  const handleToggle = (key) => {
    const updated = { ...notifications, [key]: !notifications[key] };
    setNotifications(updated);
    handleSave(updated);
  };

  const handleDigestChange = (value) => {
    const updated = { ...notifications, digest_frequency: value };
    setNotifications(updated);
    handleSave(updated);
  };

  const saveOrganization = async () => {
    try {
      await api.put('/api/organizations/me/', {
        name: orgName,
        description: orgDescription
      });
      addToast('Organization updated', 'success');
      fetchOrganization();
    } catch (error) {
      addToast('Failed to update organization', 'error');
    }
  };

  const inviteMember = async () => {
    if (!inviteEmail.trim()) return;
    try {
      const response = await api.post('/api/organizations/members/invite/', {
        email: inviteEmail,
        role: inviteRole
      });
      const invitationId = response.data.invitation_id;
      try {
        const linkResponse = await api.get(`/api/organizations/settings/test-invitation/?invitation_id=${invitationId}`);
        setInvitationLinks(prev => ({
          ...prev,
          [invitationId]: linkResponse.data.invitation_link
        }));
        addToast('Invitation link generated', 'success');
      } catch (linkError) {
        addToast('Invitation created but failed to generate link', 'error');
      }
      setInviteEmail('');
      setInviteRole('contributor');
      fetchPendingInvitations();
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Failed to generate invitation';
      addToast(errorMsg, 'error');
    }
  };

  const removeMember = async (memberId) => {
    if (!window.confirm('Remove this member?')) return;
    try {
      await api.delete(`/api/organizations/members/${memberId}/`);
      addToast('Member removed', 'success');
      fetchMembers();
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
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-base text-gray-600">Manage your preferences</p>
      </div>

      <div className="flex gap-8">
        {/* Sidebar Navigation */}
        <aside className="w-48 flex-shrink-0">
          <nav className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors ${
                  activeSection === section.id
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-900 hover:bg-gray-100'
                }`}
              >
                {section.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1">
          <SaveIndicator status={status} statusText={getStatusText()} />

          {/* Notifications Section */}
          {activeSection === 'notifications' && (
            <div className="space-y-8">
              {/* Reassurance Banner */}
              <div className="bg-gray-50 border border-gray-200 p-6">
                <p className="text-sm font-medium text-gray-900 mb-2">Feeling overwhelmed?</p>
                <p className="text-sm text-gray-600">
                  Try Quiet Mode or switch to Daily summaries to reduce noise.
                </p>
              </div>

              {/* Quiet Mode */}
              <div className="bg-white border border-gray-200 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-gray-900 mb-1">Quiet Mode</h3>
                    <p className="text-sm text-gray-600">
                      Pause notifications temporarily without missing anything
                    </p>
                  </div>
                  <button
                    onClick={() => setQuietMode(!quietMode)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      quietMode ? 'bg-gray-900' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        quietMode ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Notification Preferences */}
              <div className="bg-white border border-gray-200 p-6">
                <h3 className="text-base font-bold text-gray-900 mb-6">Notification preferences</h3>
                <div className="space-y-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 mb-1">Mentions</p>
                      <p className="text-sm text-gray-600">Get notified when someone mentions you</p>
                    </div>
                    <button
                      onClick={() => handleToggle('mention_notifications')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        notifications.mention_notifications ? 'bg-gray-900' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          notifications.mention_notifications ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 mb-1">Replies</p>
                      <p className="text-sm text-gray-600">Get notified when someone replies to your post</p>
                    </div>
                    <button
                      onClick={() => handleToggle('reply_notifications')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        notifications.reply_notifications ? 'bg-gray-900' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          notifications.reply_notifications ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 mb-1">Decisions</p>
                      <p className="text-sm text-gray-600">Get notified when a decision is made or updated</p>
                    </div>
                    <button
                      onClick={() => handleToggle('decision_notifications')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        notifications.decision_notifications ? 'bg-gray-900' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          notifications.decision_notifications ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Email Digests */}
              <div className="bg-white border border-gray-200 p-6">
                <h3 className="text-base font-bold text-gray-900 mb-6">Email digests</h3>
                <div className="space-y-3">
                  {['realtime', 'hourly', 'daily', 'weekly', 'never'].map((freq) => (
                    <label key={freq} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="digest"
                        checked={notifications.digest_frequency === freq}
                        onChange={() => handleDigestChange(freq)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-900 capitalize">{freq}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Organization Section (Admin Only) */}
          {activeSection === 'organization' && user?.role === 'admin' && (
            <div className="bg-white border border-gray-200 p-6">
              <h3 className="text-base font-bold text-gray-900 mb-6">Organization profile</h3>
              {organization && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Organization name</label>
                    <input
                      type="text"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 text-sm focus:border-gray-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Description</label>
                    <textarea
                      value={orgDescription}
                      onChange={(e) => setOrgDescription(e.target.value)}
                      rows="4"
                      className="w-full px-4 py-2 border border-gray-300 text-sm focus:border-gray-900 focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={saveOrganization}
                    className="px-6 py-2 bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
                  >
                    Save changes
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Team Section (Admin Only) */}
          {activeSection === 'team' && user?.role === 'admin' && (
            <div className="space-y-6">
              {/* Invite Member */}
              <div className="bg-white border border-gray-200 p-6">
                <h3 className="text-base font-bold text-gray-900 mb-6">Invite team member</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Email address</label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="member@example.com"
                      className="w-full px-4 py-2 border border-gray-300 text-sm focus:border-gray-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Role</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 text-sm focus:border-gray-900 focus:outline-none"
                    >
                      <option value="contributor">Contributor</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <button
                    onClick={inviteMember}
                    className="px-6 py-2 bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
                  >
                    Generate link
                  </button>
                </div>
              </div>

              {/* Pending Invitations */}
              {pendingInvitations.length > 0 && (
                <div className="bg-white border border-gray-200 p-6">
                  <h3 className="text-base font-bold text-gray-900 mb-6">Pending invitations ({pendingInvitations.length})</h3>
                  <div className="space-y-3">
                    {pendingInvitations.map((invitation) => (
                      <div key={invitation.id} className="flex items-center justify-between p-4 border border-gray-200">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{invitation.email}</p>
                          <p className="text-xs text-gray-600">Invited as {invitation.role}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {invitationLinks[invitation.id] ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={invitationLinks[invitation.id]}
                                readOnly
                                className="px-3 py-1 text-xs border border-gray-300 bg-gray-50 w-64"
                              />
                              <button
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(invitationLinks[invitation.id]);
                                    addToast('Link copied', 'success');
                                  } catch (err) {
                                    addToast('Failed to copy link', 'error');
                                  }
                                }}
                                className="px-3 py-1 text-xs bg-gray-900 text-white hover:bg-gray-800"
                              >
                                Copy
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => generateInvitationLink(invitation.id)}
                              className="px-4 py-1 text-xs bg-gray-900 text-white hover:bg-gray-800"
                            >
                              Generate link
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Team Members */}
              <div className="bg-white border border-gray-200 p-6">
                <h3 className="text-base font-bold text-gray-900 mb-6">Team members ({members.length})</h3>
                <div className="space-y-3">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 border border-gray-200">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{member.full_name}</p>
                        <p className="text-xs text-gray-600">{member.email}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-gray-600 uppercase">{member.role}</span>
                        {member.id !== user?.id && (
                          <button
                            onClick={() => removeMember(member.id)}
                            className="p-2 text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Advanced Section */}
          {activeSection === 'advanced' && (
            <div className="space-y-8">
              {/* Data & Privacy */}
              <div className="bg-white border border-gray-200 p-6">
                <h3 className="text-base font-bold text-gray-900 mb-6">Data & Privacy</h3>
                <div className="space-y-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 mb-1">AI assistance</p>
                      <p className="text-sm text-gray-600">
                        Helps summarize conversations and extract action items. Your data stays private to your organization.
                      </p>
                    </div>
                    <button
                      className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-900"
                    >
                      <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Danger Zone (Admin Only) */}
              {user?.role === 'admin' && (
                <div className="bg-white border-2 border-red-600 p-6">
                  <h3 className="text-base font-bold text-red-600 mb-2">Danger zone</h3>
                  <p className="text-sm text-gray-600 mb-6">
                    These actions are permanent and affect your organization.
                  </p>
                  <button className="px-6 py-2 border-2 border-red-600 text-red-600 text-sm font-medium hover:bg-red-50">
                    Delete organization
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Settings;
