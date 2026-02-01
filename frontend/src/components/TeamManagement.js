import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, TrashIcon, ShieldIcon } from '@heroicons/react/24/outline';

export default function TeamManagement() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState({});

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch('/api/organizations/team/members/', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });
      const data = await response.json();
      setMembers(data);
    } catch (error) {
      console.error('Failed to fetch team members:', error);
    } finally {
      setLoading(false);
    }
  };

  const changeUserRole = async (userId, newRole) => {
    try {
      const response = await fetch(`/api/organizations/team/users/${userId}/role/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      });
      
      if (response.ok) {
        fetchTeamMembers();
        setSelectedRole({});
      }
    } catch (error) {
      console.error('Failed to change role:', error);
    }
  };

  const removeUser = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this user?')) return;
    
    try {
      const response = await fetch(`/api/organizations/team/users/${userId}/remove/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });
      
      if (response.ok) {
        fetchTeamMembers();
      }
    } catch (error) {
      console.error('Failed to remove user:', error);
    }
  };

  if (loading) return <div className="p-4">Loading team members...</div>;

  return (
    <div className="p-6 max-w-4xl">
      <h2 className="text-2xl font-bold mb-6">Team Management</h2>
      
      <div className="space-y-2">
        {members.map(member => (
          <div key={member.id} className="border rounded-lg p-4">
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setExpandedUser(expandedUser === member.id ? null : member.id)}
            >
              <div className="flex-1">
                <div className="font-semibold">{member.full_name || member.username}</div>
                <div className="text-sm text-gray-600">{member.email}</div>
              </div>
              
              <div className="flex items-center gap-4">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  {member.role}
                </span>
                <ChevronDownIcon 
                  className={`w-5 h-5 transition-transform ${expandedUser === member.id ? 'rotate-180' : ''}`}
                />
              </div>
            </div>

            {expandedUser === member.id && (
              <div className="mt-4 pt-4 border-t space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Change Role</label>
                  <select 
                    value={selectedRole[member.id] || member.role}
                    onChange={(e) => setSelectedRole({...selectedRole, [member.id]: e.target.value})}
                    className="border rounded px-3 py-2 w-full"
                  >
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="contributor">Contributor</option>
                  </select>
                  <button
                    onClick={() => changeUserRole(member.id, selectedRole[member.id] || member.role)}
                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Update Role
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <ShieldIcon className="w-4 h-4" />
                    Permissions
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {member.permissions && member.permissions.map(perm => (
                      <div key={perm} className="text-sm bg-gray-100 px-2 py-1 rounded">
                        {perm.replace(/_/g, ' ')}
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => removeUser(member.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  <TrashIcon className="w-4 h-4" />
                  Remove User
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
