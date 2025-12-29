import React from 'react';
import { Link } from 'react-router-dom';

export function OrganizationTab({ organization, user }) {
  if (!organization) {
    return <div className="text-gray-600">Loading organization...</div>;
  }

  if (user.role !== 'admin') {
    return (
      <div className="bg-white border-2 border-gray-900 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 uppercase tracking-wide">Organization</h2>
        <p className="text-gray-600">Admin access required to view organization settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-white border-2 border-gray-900 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 uppercase tracking-wide">Organization Details</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-900 mb-2 uppercase tracking-wider">Organization Name</label>
            <div className="p-3 bg-gray-50 border border-gray-200 text-gray-900 font-medium">
              {organization.name}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-900 mb-2 uppercase tracking-wider">Slug</label>
            <div className="p-3 bg-gray-50 border border-gray-200 text-gray-900 font-medium">
              {organization.slug}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-900 mb-2 uppercase tracking-wider">Created</label>
            <div className="p-3 bg-gray-50 border border-gray-200 text-gray-900 font-medium">
              {new Date(organization.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border-2 border-gray-900 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 uppercase tracking-wide">Statistics</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-gray-50 border border-gray-200">
            <div className="text-3xl font-bold text-gray-900">{organization.total_users}</div>
            <div className="text-xs text-gray-600 uppercase tracking-wide font-bold">Total Users</div>
          </div>
          <div className="text-center p-4 bg-gray-50 border border-gray-200">
            <div className="text-3xl font-bold text-gray-900">{organization.active_users}</div>
            <div className="text-xs text-gray-600 uppercase tracking-wide font-bold">Active Users</div>
          </div>
          <div className="text-center p-4 bg-gray-50 border border-gray-200">
            <div className="text-3xl font-bold text-gray-900">{organization.total_conversations}</div>
            <div className="text-xs text-gray-600 uppercase tracking-wide font-bold">Conversations</div>
          </div>
          <div className="text-center p-4 bg-gray-50 border border-gray-200">
            <div className="text-3xl font-bold text-gray-900">{organization.total_decisions}</div>
            <div className="text-xs text-gray-600 uppercase tracking-wide font-bold">Decisions</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TeamTab({ members, user, inviteEmail, setInviteEmail, inviteRole, setInviteRole, inviteMember, updateMemberRole, removeMember }) {
  return (
    <div className="space-y-8">
      {user.role === 'admin' && (
        <div className="bg-white border border-gray-200 p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Invite Team Member</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-base font-bold text-gray-900 mb-3">Email Address</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="w-full px-4 py-3 border border-gray-300 text-base focus:outline-none focus:border-gray-900"
              />
            </div>

            <div>
              <label className="block text-base font-bold text-gray-900 mb-3">Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 text-base focus:outline-none focus:border-gray-900"
              >
                <option value="contributor">Contributor</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <button
              onClick={inviteMember}
              className="recall-btn-primary"
            >
              Send Invitation
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 p-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Team Members</h2>
        <p className="text-lg text-gray-600 mb-8">{members.length} members</p>
        
        <div className="space-y-4">
          {members.map(member => (
            <div key={member.id} className="flex items-center justify-between p-6 border border-gray-200 hover:border-gray-900 transition-colors">
              <div className="flex items-center gap-4">
                {member.avatar ? (
                  <img src={member.avatar} alt={member.full_name} className="w-14 h-14 object-cover" />
                ) : (
                  <div className="w-14 h-14 bg-gray-900 flex items-center justify-center">
                    <span className="text-white text-xl font-bold">
                      {member.full_name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <div className="text-lg font-bold text-gray-900">{member.full_name}</div>
                  <div className="text-base text-gray-600">{member.email}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    Joined {new Date(member.joined_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {user.role === 'admin' && member.id !== user.id ? (
                  <>
                    <select
                      value={member.role}
                      onChange={(e) => updateMemberRole(member.id, e.target.value)}
                      className="px-4 py-2 border border-gray-900 text-base font-medium focus:outline-none"
                    >
                      <option value="contributor">Contributor</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      onClick={() => removeMember(member.id)}
                      className="px-5 py-2.5 bg-red-600 text-white hover:bg-red-700 text-sm font-bold uppercase"
                    >
                      Remove
                    </button>
                  </>
                ) : (
                  <span className="px-5 py-2.5 bg-gray-900 text-white text-sm font-bold uppercase">
                    {member.role}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {user.role === 'admin' && (
        <div className="bg-gray-50 border border-gray-200 p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-3">Need to invite multiple people?</h3>
          <p className="text-base text-gray-600 mb-6">
            Generate invitation links that can be shared with your team.
          </p>
          <Link
            to="/invitations"
            className="recall-btn-secondary inline-block"
          >
            Manage Invitations
          </Link>
        </div>
      )}
    </div>
  );
}

export function DataTab({ exportData }) {
  return (
    <div className="space-y-8">
      <div className="bg-white border-2 border-gray-900 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 uppercase tracking-wide">Export Your Data</h2>
        <p className="text-gray-600 mb-6">
          Download all your conversations, replies, and decisions in JSON format.
        </p>
        <button
          onClick={exportData}
          className="px-6 py-3 bg-gray-900 text-white hover:bg-gray-800 font-bold uppercase text-sm tracking-wide"
        >
          Export Data
        </button>
      </div>

      <div className="bg-white border-2 border-gray-900 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 uppercase tracking-wide">Privacy</h2>
        <div className="space-y-4 text-gray-600">
          <p>Your data is stored securely and never shared with third parties.</p>
          <p>You can export or delete your data at any time.</p>
          <p>For more information, see our <a href="/privacy" className="text-gray-900 font-bold underline">Privacy Policy</a>.</p>
        </div>
      </div>

      <div className="bg-white border-2 border-red-600 p-8">
        <h2 className="text-2xl font-bold text-red-900 mb-6 uppercase tracking-wide">Danger Zone</h2>
        <p className="text-gray-600 mb-6">
          Once you delete your account, there is no going back. Please be certain.
        </p>
        <button
          onClick={() => alert('Account deletion requires password confirmation. Contact admin.')}
          className="px-6 py-3 bg-red-600 text-white hover:bg-red-700 font-bold uppercase text-sm tracking-wide"
        >
          Delete Account
        </button>
      </div>
    </div>
  );
}
