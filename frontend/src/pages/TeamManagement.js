import React, { useState, useEffect } from 'react';
import { useTheme } from '../utils/ThemeAndAccessibility';
import { PlusIcon, UserIcon, EnvelopeIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import { useToast } from '../components/Toast';

export default function TeamManagement() {
  const { darkMode } = useTheme();
  const { addToast } = useToast();
  const [members, setMembers] = useState([]);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [loading, setLoading] = useState(true);

  const bgColor = darkMode ? '#1c1917' : '#ffffff';
  const textColor = darkMode ? '#e7e5e4' : '#111827';
  const borderColor = darkMode ? '#292524' : '#e5e7eb';
  const cardBg = darkMode ? '#0c0a09' : '#ffffff';
  const secondaryText = darkMode ? '#a8a29e' : '#6b7280';

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const res = await api.get('/api/organizations/team/');
      setMembers(res.data);
    } catch (error) {
      console.error('Failed to fetch members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/organizations/invitations/', {
        email: inviteEmail,
        role: inviteRole
      });
      addToast('Invitation sent successfully', 'success');
      setShowInvite(false);
      setInviteEmail('');
      setInviteRole('member');
    } catch (error) {
      addToast('Failed to send invitation', 'error');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.put(`/api/organizations/team/${userId}/`, { role: newRole });
      addToast('Role updated successfully', 'success');
      fetchMembers();
    } catch (error) {
      addToast('Failed to update role', 'error');
    }
  };

  const roleConfig = {
    admin: { bg: darkMode ? '#7f1d1d' : '#fee2e2', text: darkMode ? '#fca5a5' : '#991b1b', label: 'Admin' },
    manager: { bg: darkMode ? '#1e3a8a' : '#dbeafe', text: darkMode ? '#93c5fd' : '#1e40af', label: 'Manager' },
    member: { bg: darkMode ? '#374151' : '#f3f4f6', text: darkMode ? '#9ca3af' : '#4b5563', label: 'Member' }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px', color: secondaryText }}>Loading...</div>;
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 700, color: textColor, marginBottom: '8px' }}>Team Management</h1>
          <p style={{ fontSize: '15px', color: secondaryText }}>Manage your team members and permissions</p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            backgroundColor: '#3b82f6',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <PlusIcon style={{ width: '18px', height: '18px' }} />
          Invite Member
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div style={{ padding: '20px', backgroundColor: cardBg, border: `1px solid ${borderColor}`, borderRadius: '12px' }}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: textColor }}>{members.length}</div>
          <div style={{ fontSize: '13px', color: secondaryText, marginTop: '4px' }}>Total Members</div>
        </div>
        <div style={{ padding: '20px', backgroundColor: cardBg, border: `1px solid ${borderColor}`, borderRadius: '12px' }}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#ef4444' }}>{members.filter(m => m.role === 'admin').length}</div>
          <div style={{ fontSize: '13px', color: secondaryText, marginTop: '4px' }}>Admins</div>
        </div>
        <div style={{ padding: '20px', backgroundColor: cardBg, border: `1px solid ${borderColor}`, borderRadius: '12px' }}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#3b82f6' }}>{members.filter(m => m.role === 'manager').length}</div>
          <div style={{ fontSize: '13px', color: secondaryText, marginTop: '4px' }}>Managers</div>
        </div>
        <div style={{ padding: '20px', backgroundColor: cardBg, border: `1px solid ${borderColor}`, borderRadius: '12px' }}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#6b7280' }}>{members.filter(m => m.role === 'member').length}</div>
          <div style={{ fontSize: '13px', color: secondaryText, marginTop: '4px' }}>Members</div>
        </div>
      </div>

      {/* Members List */}
      <div style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}`, borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: `1px solid ${borderColor}`, display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '16px', fontSize: '12px', fontWeight: 600, color: secondaryText, textTransform: 'uppercase' }}>
          <div>Member</div>
          <div>Role</div>
          <div>Joined</div>
          <div>Actions</div>
        </div>
        {members.map((member) => {
          const role = roleConfig[member.role] || roleConfig.member;
          return (
            <div key={member.id} style={{ padding: '20px 24px', borderBottom: `1px solid ${borderColor}`, display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '16px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: '16px', fontWeight: 600 }}>
                  {member.full_name?.charAt(0) || member.email.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: textColor }}>{member.full_name || 'No name'}</div>
                  <div style={{ fontSize: '13px', color: secondaryText }}>{member.email}</div>
                </div>
              </div>
              <div>
                <span style={{ padding: '4px 12px', fontSize: '12px', fontWeight: 600, borderRadius: '6px', backgroundColor: role.bg, color: role.text }}>
                  {role.label}
                </span>
              </div>
              <div style={{ fontSize: '14px', color: secondaryText }}>
                {new Date(member.created_at).toLocaleDateString()}
              </div>
              <div>
                <select
                  value={member.role}
                  onChange={(e) => handleRoleChange(member.id, e.target.value)}
                  style={{
                    padding: '6px 12px',
                    border: `1px solid ${borderColor}`,
                    borderRadius: '6px',
                    backgroundColor: bgColor,
                    color: textColor,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  <option value="member">Member</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
          );
        })}
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: bgColor, borderRadius: '12px', padding: '32px', width: '100%', maxWidth: '500px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, color: textColor, marginBottom: '24px' }}>Invite Team Member</h2>
            <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: textColor, marginBottom: '8px' }}>Email Address</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  style={{ width: '100%', padding: '12px', border: `2px solid ${borderColor}`, borderRadius: '8px', backgroundColor: bgColor, color: textColor, fontSize: '15px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: textColor, marginBottom: '8px' }}>Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  style={{ width: '100%', padding: '12px', border: `2px solid ${borderColor}`, borderRadius: '8px', backgroundColor: bgColor, color: textColor, fontSize: '15px' }}
                >
                  <option value="member">Member</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowInvite(false)}
                  style={{ padding: '12px 20px', border: `1px solid ${borderColor}`, borderRadius: '8px', backgroundColor: 'transparent', color: textColor, fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '12px 20px', backgroundColor: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
