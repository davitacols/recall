import React, { useState, useEffect } from 'react';
import { useTheme } from '../utils/ThemeAndAccessibility';
import api from '../services/api';
import { UserPlusIcon, TrashIcon } from '@heroicons/react/24/outline';

function TeamManagement() {
  const { darkMode } = useTheme();
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('contributor');

  const bgColor = darkMode ? 'bg-stone-950' : 'bg-white';
  const cardBg = darkMode ? 'bg-stone-900' : 'bg-white';
  const borderColor = darkMode ? 'border-stone-800' : 'border-gray-200';
  const textColor = darkMode ? 'text-stone-100' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-stone-400' : 'text-gray-600';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [membersRes, invitesRes] = await Promise.all([
        api.get('/api/organizations/members/'),
        api.get('/api/organizations/invitations/')
      ]);
      setMembers(membersRes.data);
      setInvitations(invitesRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/organizations/invitations/send/', {
        email: inviteEmail,
        role: inviteRole
      });
      setShowInviteModal(false);
      setInviteEmail('');
      fetchData();
    } catch (error) {
      alert('Failed to send invitation');
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Remove this member?')) return;
    try {
      await api.delete(`/api/organizations/members/${userId}/remove/`);
      fetchData();
    } catch (error) {
      alert('Failed to remove member');
    }
  };

  const handleRevokeInvite = async (inviteId) => {
    try {
      await api.delete(`/api/organizations/invitations/${inviteId}/revoke/`);
      fetchData();
    } catch (error) {
      alert('Failed to revoke invitation');
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${bgColor} flex items-center justify-center`}>
        <div className={`w-8 h-8 border-2 ${darkMode ? 'border-stone-700 border-t-stone-400' : 'border-gray-300 border-t-gray-600'} rounded-full animate-spin`}></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bgColor}`}>
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className={`text-4xl font-bold ${textColor} mb-2`}>Team Management</h1>
            <p className={textSecondary}>Manage your team members and permissions</p>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
          >
            <UserPlusIcon className="w-5 h-5" />
            Invite Member
          </button>
        </div>

        {/* Team Members */}
        <div className={`${cardBg} border ${borderColor} rounded-lg p-6 mb-6`}>
          <h2 className={`text-xl font-bold ${textColor} mb-4`}>Team Members ({members.length})</h2>
          <div className="space-y-3">
            {members.map(member => (
              <div key={member.id} className={`flex items-center justify-between p-4 border ${borderColor} rounded-lg`}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                    {member.full_name?.charAt(0) || member.username.charAt(0)}
                  </div>
                  <div>
                    <div className={`font-semibold ${textColor}`}>{member.full_name || member.username}</div>
                    <div className={`text-sm ${textSecondary}`}>{member.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${member.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                    {member.role}
                  </span>
                  {member.role !== 'admin' && (
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition-all"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Invitations */}
        {invitations.length > 0 && (
          <div className={`${cardBg} border ${borderColor} rounded-lg p-6`}>
            <h2 className={`text-xl font-bold ${textColor} mb-4`}>Pending Invitations ({invitations.length})</h2>
            <div className="space-y-3">
              {invitations.map(invite => (
                <div key={invite.id} className={`flex items-center justify-between p-4 border ${borderColor} rounded-lg`}>
                  <div>
                    <div className={`font-semibold ${textColor}`}>{invite.email}</div>
                    <div className={`text-sm ${textSecondary}`}>Invited {new Date(invite.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      {invite.role}
                    </span>
                    <button
                      onClick={() => handleRevokeInvite(invite.id)}
                      className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-all"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invite Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className={`${cardBg} border ${borderColor} rounded-lg p-6 w-full max-w-md`}>
              <h2 className={`text-xl font-bold ${textColor} mb-4`}>Invite Team Member</h2>
              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium ${textSecondary} mb-2`}>Email</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className={`w-full px-3 py-2 border ${borderColor} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-stone-800 text-stone-100' : 'bg-white text-gray-900'}`}
                    required
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${textSecondary} mb-2`}>Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className={`w-full px-3 py-2 border ${borderColor} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-stone-800 text-stone-100' : 'bg-white text-gray-900'}`}
                  >
                    <option value="contributor">Contributor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className={`px-4 py-2 border ${borderColor} rounded-lg ${textColor} hover:bg-gray-50 transition-all`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                  >
                    Send Invitation
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TeamManagement;
