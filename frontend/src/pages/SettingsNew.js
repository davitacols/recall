import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { ProfileTab, SecurityTab, NotificationsTab, PreferencesTab } from '../components/SettingsTabs';
import { OrganizationTab, TeamTab, DataTab } from '../components/SettingsTabsExtra';

function SettingsNew() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  
  // Profile state
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    bio: ''
  });
  
  // Password state
  const [passwords, setPasswords] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  
  // Notification settings
  const [notifications, setNotifications] = useState({
    email_notifications: true,
    mention_notifications: true,
    reply_notifications: true,
    decision_notifications: true,
    digest_frequency: 'daily'
  });
  
  // Preferences
  const [preferences, setPreferences] = useState({
    quiet_mode: false,
    muted_topics: [],
    muted_post_types: [],
    offline_mode: false,
    low_data_mode: false
  });
  
  // Stats
  const [stats, setStats] = useState(null);
  
  // Badges
  const [badges, setBadges] = useState([]);
  
  // Organization
  const [organization, setOrganization] = useState(null);
  const [members, setMembers] = useState([]);
  
  // UI state
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('contributor');

  useEffect(() => {
    loadAllSettings();
  }, []);

  const loadAllSettings = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadProfile(),
        loadNotifications(),
        loadPreferences(),
        loadStats(),
        loadBadges(),
        loadOrganization(),
        loadMembers()
      ]);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = async () => {
    try {
      const response = await api.get('/api/organizations/settings/profile/');
      setProfile({
        full_name: response.data.full_name || '',
        email: response.data.email || '',
        bio: response.data.bio || ''
      });
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  };

  const loadNotifications = async () => {
    try {
      const response = await api.get('/api/organizations/settings/notifications/');
      setNotifications(response.data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  const loadPreferences = async () => {
    try {
      const response = await api.get('/api/conversations/preferences/');
      setPreferences(response.data);
    } catch (err) {
      console.error('Failed to load preferences:', err);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get('/api/organizations/settings/stats/');
      setStats(response.data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const loadBadges = async () => {
    try {
      const response = await api.get('/api/conversations/badges/');
      setBadges(response.data);
    } catch (err) {
      console.error('Failed to load badges:', err);
    }
  };

  const loadOrganization = async () => {
    try {
      const response = await api.get('/api/organizations/settings/organization/');
      setOrganization(response.data);
    } catch (err) {
      console.error('Failed to load organization:', err);
    }
  };

  const loadMembers = async () => {
    try {
      const response = await api.get('/api/organizations/settings/members/');
      setMembers(response.data);
    } catch (err) {
      console.error('Failed to load members:', err);
    }
  };

  const saveProfile = async () => {
    try {
      await api.put('/api/organizations/settings/profile/', profile);
      showMessage('Profile updated successfully');
    } catch (err) {
      showError('Failed to update profile');
    }
  };

  const changePassword = async () => {
    if (passwords.new_password !== passwords.confirm_password) {
      showError('Passwords do not match');
      return;
    }
    
    try {
      await api.post('/api/organizations/settings/password/', passwords);
      showMessage('Password changed successfully');
      setPasswords({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to change password');
    }
  };

  const saveNotifications = async () => {
    try {
      await api.put('/api/organizations/settings/notifications/', notifications);
      showMessage('Notification settings updated');
    } catch (err) {
      showError('Failed to update notifications');
    }
  };

  const savePreferences = async () => {
    try {
      await api.put('/api/conversations/preferences/', preferences);
      showMessage('Preferences updated');
    } catch (err) {
      showError('Failed to update preferences');
    }
  };

  const addMutedTopic = () => {
    if (!newTopic.trim()) return;
    const updated = { ...preferences, muted_topics: [...preferences.muted_topics, newTopic] };
    setPreferences(updated);
    setNewTopic('');
    api.put('/api/conversations/preferences/', updated);
  };

  const removeMutedTopic = (topic) => {
    const updated = { ...preferences, muted_topics: preferences.muted_topics.filter(t => t !== topic) };
    setPreferences(updated);
    api.put('/api/conversations/preferences/', updated);
  };

  const togglePostType = (type) => {
    const muted = preferences.muted_post_types.includes(type)
      ? preferences.muted_post_types.filter(t => t !== type)
      : [...preferences.muted_post_types, type];
    const updated = { ...preferences, muted_post_types: muted };
    setPreferences(updated);
    api.put('/api/conversations/preferences/', updated);
  };

  const inviteMember = async () => {
    try {
      await api.post('/api/organizations/settings/members/invite/', {
        email: inviteEmail,
        role: inviteRole
      });
      showMessage('Invitation sent');
      setInviteEmail('');
      setInviteRole('contributor');
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to send invitation');
    }
  };

  const updateMemberRole = async (userId, newRole) => {
    try {
      await api.put(`/api/organizations/settings/members/${userId}/role/`, { role: newRole });
      showMessage('Role updated');
      loadMembers();
    } catch (err) {
      showError('Failed to update role');
    }
  };

  const removeMember = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    
    try {
      await api.delete(`/api/organizations/settings/members/${userId}/remove/`);
      showMessage('Member removed');
      loadMembers();
    } catch (err) {
      showError('Failed to remove member');
    }
  };

  const exportData = async () => {
    try {
      const response = await api.get('/api/organizations/settings/export/');
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recall-data-${new Date().toISOString()}.json`;
      a.click();
      showMessage('Data exported');
    } catch (err) {
      showError('Failed to export data');
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

  const getBadgeIcon = (type) => {
    const icons = {
      decision_owner: 'D',
      context_contributor: 'C',
      knowledge_builder: 'K',
      crisis_responder: 'R'
    };
    return icons[type] || 'B';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'profile', name: 'Profile' },
    { id: 'security', name: 'Security' },
    { id: 'notifications', name: 'Notifications' },
    { id: 'preferences', name: 'Preferences' },
    { id: 'organization', name: 'Organization' },
    { id: 'team', name: 'Team' },
    { id: 'data', name: 'Data & Privacy' }
  ];

  return (
    <div>
      <div className="mb-12">
        <h1 className="text-5xl font-bold text-gray-900 mb-3">Settings</h1>
        <p className="text-xl text-gray-600">Manage your account and preferences</p>
      </div>

      {/* Messages */}
      {message && (
        <div className="mb-6 p-4 bg-gray-900 text-white">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-6 p-4 bg-red-600 text-white">
          {error}
        </div>
      )}

      <div className="flex gap-8">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0">
          <div className="border border-gray-200">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-6 py-4 text-base font-medium border-b border-gray-200 last:border-b-0 transition-colors ${
                  activeTab === tab.id
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-900 hover:bg-gray-100'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'profile' && (
            <ProfileTab 
              profile={profile}
              setProfile={setProfile}
              saveProfile={saveProfile}
              stats={stats}
              badges={badges}
              getBadgeIcon={getBadgeIcon}
            />
          )}

          {activeTab === 'security' && (
            <SecurityTab
              passwords={passwords}
              setPasswords={setPasswords}
              changePassword={changePassword}
            />
          )}

          {activeTab === 'notifications' && (
            <NotificationsTab
              notifications={notifications}
              setNotifications={setNotifications}
              saveNotifications={saveNotifications}
            />
          )}

          {activeTab === 'preferences' && (
            <PreferencesTab
              preferences={preferences}
              setPreferences={setPreferences}
              savePreferences={savePreferences}
              newTopic={newTopic}
              setNewTopic={setNewTopic}
              addMutedTopic={addMutedTopic}
              removeMutedTopic={removeMutedTopic}
              togglePostType={togglePostType}
            />
          )}

          {activeTab === 'organization' && (
            <OrganizationTab
              organization={organization}
              user={user}
            />
          )}

          {activeTab === 'team' && (
            <TeamTab
              members={members}
              user={user}
              inviteEmail={inviteEmail}
              setInviteEmail={setInviteEmail}
              inviteRole={inviteRole}
              setInviteRole={setInviteRole}
              inviteMember={inviteMember}
              updateMemberRole={updateMemberRole}
              removeMember={removeMember}
            />
          )}

          {activeTab === 'data' && (
            <DataTab exportData={exportData} />
          )}
        </div>
      </div>
    </div>
  );
}

export default SettingsNew;
