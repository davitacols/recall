import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { useToast } from '../components/Toast';
import { useAutoSave } from '../hooks/useAutoSave';
import SaveIndicator from '../components/SaveIndicator';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import { CheckIcon, TrashIcon } from '@heroicons/react/24/outline';
import { colors, spacing } from '../utils/designTokens';

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

  const handleToggle = (key) => {
    const updated = { ...notifications, [key]: !notifications[key] };
    setNotifications(updated);
    triggerSave(updated);
  };

  const handleDigestChange = (value) => {
    const updated = { ...notifications, digest_frequency: value };
    setNotifications(updated);
    triggerSave(updated);
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
    <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
      <div style={{ marginBottom: spacing.xl }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: colors.primary, marginBottom: spacing.md }}>Settings</h1>
        <p style={{ fontSize: '16px', color: colors.secondary }}>Manage your preferences</p>
      </div>

      <div style={{ display: 'flex', gap: spacing.xl }}>
        {/* Sidebar Navigation */}
        <aside style={{ width: '192px', flexShrink: 0 }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: `${spacing.md} ${spacing.lg}`,
                  fontSize: '14px',
                  fontWeight: 500,
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: activeSection === section.id ? colors.accentLight : 'transparent',
                  color: activeSection === section.id ? colors.accent : colors.secondary,
                  cursor: 'pointer',
                  transition: '150ms ease-out',
                  borderLeft: activeSection === section.id ? `3px solid ${colors.accent}` : 'none',
                  paddingLeft: activeSection === section.id ? '13px' : spacing.lg
                }}
              >
                {section.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div style={{ flex: 1 }}>
          <SaveIndicator status={status} statusText={getStatusText()} />

          {/* Notifications Section */}
          {activeSection === 'notifications' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xl }}>
              <Card title="Quiet Mode" subtitle="Pause notifications temporarily">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '14px', color: colors.secondary }}>Disable all notifications</span>
                  <button
                    onClick={() => setQuietMode(!quietMode)}
                    style={{
                      width: '44px',
                      height: '24px',
                      borderRadius: '12px',
                      border: 'none',
                      backgroundColor: quietMode ? colors.accent : colors.border,
                      cursor: 'pointer',
                      transition: '150ms ease-out'
                    }}
                  />
                </div>
              </Card>

              <Card title="Notification Preferences">
                {['mention_notifications', 'reply_notifications', 'decision_notifications'].map((key) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
                    <span style={{ fontSize: '14px', color: colors.primary, textTransform: 'capitalize' }}>
                      {key.replace('_', ' ')}
                    </span>
                    <button
                      onClick={() => handleToggle(key)}
                      style={{
                        width: '44px',
                        height: '24px',
                        borderRadius: '12px',
                        border: 'none',
                        backgroundColor: notifications[key] ? colors.accent : colors.border,
                        cursor: 'pointer',
                        transition: '150ms ease-out'
                      }}
                    />
                  </div>
                ))}
              </Card>

              <Card title="Email Digests">
                {['realtime', 'hourly', 'daily', 'weekly', 'never'].map((freq) => (
                  <label key={freq} style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="digest"
                      checked={notifications.digest_frequency === freq}
                      onChange={() => handleDigestChange(freq)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '14px', color: colors.primary, textTransform: 'capitalize' }}>{freq}</span>
                  </label>
                ))}
              </Card>
            </div>
          )}

          {/* Organization Section */}
          {activeSection === 'organization' && user?.role === 'admin' && organization && (
            <Card title="Organization Profile" subtitle="Manage your organization details">
              <Input
                label="Organization name"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
              />
              <div style={{ marginBottom: spacing.lg }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: colors.primary, marginBottom: spacing.sm }}>
                  Description
                </label>
                <textarea
                  value={orgDescription}
                  onChange={(e) => setOrgDescription(e.target.value)}
                  rows="4"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '10px 12px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    transition: '150ms ease-out'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = colors.accent;
                    e.target.style.boxShadow = `0 0 0 3px rgba(79, 70, 229, 0.1)`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = colors.border;
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
              <Button onClick={saveOrganization}>Save changes</Button>
            </Card>
          )}

          {/* Team Section */}
          {activeSection === 'team' && user?.role === 'admin' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xl }}>
              <Card title="Invite Team Member">
                <Input
                  label="Email address"
                  type="email"
                  placeholder="member@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
                <div style={{ marginBottom: spacing.lg }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: colors.primary, marginBottom: spacing.sm }}>
                    Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontFamily: 'Inter, system-ui, sans-serif',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="contributor">Contributor</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <Button onClick={inviteMember}>Generate link</Button>
              </Card>

              {pendingInvitations.length > 0 && (
                <Card title="Pending Invitations" subtitle={`${pendingInvitations.length} pending`}>
                  {pendingInvitations.map((invitation) => (
                    <div key={invitation.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, border: `1px solid ${colors.border}`, borderRadius: '8px', marginBottom: spacing.md }}>
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: 500, color: colors.primary, margin: 0 }}>{invitation.email}</p>
                        <p style={{ fontSize: '13px', color: colors.secondary, margin: 0 }}>Invited as {invitation.role}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
                        {invitationLinks[invitation.id] ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                            <input
                              type="text"
                              value={invitationLinks[invitation.id]}
                              readOnly
                              style={{
                                padding: '8px 12px',
                                fontSize: '12px',
                                border: `1px solid ${colors.border}`,
                                borderRadius: '6px',
                                backgroundColor: colors.background,
                                width: '256px'
                              }}
                            />
                            <Button
                              variant="secondary"
                              onClick={() => {
                                navigator.clipboard.writeText(invitationLinks[invitation.id]);
                                addToast('Link copied', 'success');
                              }}
                            >
                              Copy
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="secondary"
                            onClick={() => generateInvitationLink(invitation.id)}
                          >
                            Generate link
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </Card>
              )}

              <Card title="Team Members" subtitle={`${members.length} members`}>
                {members.map((member) => (
                  <div key={member.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, border: `1px solid ${colors.border}`, borderRadius: '8px', marginBottom: spacing.md }}>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 500, color: colors.primary, margin: 0 }}>{member.full_name}</p>
                      <p style={{ fontSize: '13px', color: colors.secondary, margin: 0 }}>{member.email}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
                      <span style={{ fontSize: '12px', fontWeight: 500, color: colors.secondary, textTransform: 'uppercase' }}>{member.role}</span>
                      {member.id !== user?.id && (
                        <button
                          onClick={() => removeMember(member.id)}
                          style={{
                            padding: '8px',
                            backgroundColor: 'transparent',
                            border: 'none',
                            color: '#EF4444',
                            cursor: 'pointer',
                            borderRadius: '6px',
                            transition: '150ms ease-out'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#FEE2E2'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                        >
                          <TrashIcon style={{ width: '16px', height: '16px' }} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          )}

          {/* Advanced Section */}
          {activeSection === 'advanced' && (
            <Card title="Data & Privacy">
              <p style={{ fontSize: '14px', color: colors.secondary }}>
                AI assistance helps summarize conversations and extract action items. Your data stays private to your organization.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default Settings;
