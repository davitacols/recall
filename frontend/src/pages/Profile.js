import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { useToast } from '../components/Toast';
import { CameraIcon, ChatBubbleLeftIcon, CheckCircleIcon, DocumentTextIcon, CalendarIcon, ClockIcon } from '@heroicons/react/24/outline';

function Profile() {
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  const [profile, setProfile] = useState({
    full_name: '',
    bio: '',
    timezone: 'UTC',
    avatar: null
  });
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [passwords, setPasswords] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [stats, setStats] = useState({
    conversations: 0,
    replies: 0,
    decisions: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    fetchProfile();
    fetchStats();
    fetchRecentActivity();
    fetchBookmarks();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/api/auth/profile/');
      setProfile({
        full_name: response.data.full_name || '',
        bio: response.data.bio || '',
        timezone: response.data.timezone || 'UTC',
        avatar: null
      });
      setAvatarPreview(response.data.avatar);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/api/auth/profile/stats/');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const response = await api.get('/api/conversations/');
      const conversations = response.data.results || response.data;
      const userActivity = conversations
        .filter(c => c.author_id === user?.id)
        .slice(0, 5);
      setRecentActivity(userActivity);
    } catch (error) {
      console.error('Failed to fetch activity:', error);
    }
  };

  const fetchBookmarks = async () => {
    try {
      const response = await api.get('/api/conversations/bookmarks/');
      setBookmarks(response.data);
    } catch (error) {
      console.error('Failed to fetch bookmarks:', error);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfile({...profile, avatar: file});
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('full_name', profile.full_name);
    formData.append('bio', profile.bio);
    formData.append('timezone', profile.timezone);
    if (profile.avatar) {
      formData.append('avatar', profile.avatar);
    }

    try {
      await api.put('/api/auth/profile/update/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      addToast('Profile updated successfully', 'success');
      fetchProfile();
    } catch (err) {
      addToast('Failed to update profile', 'error');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (passwords.new_password !== passwords.confirm_password) {
      addToast('Passwords do not match', 'error');
      return;
    }

    try {
      await api.post('/api/auth/profile/change-password/', {
        old_password: passwords.old_password,
        new_password: passwords.new_password
      });
      addToast('Password changed successfully', 'success');
      setPasswords({ old_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to change password', 'error');
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Profile Header */}
      <div className="bg-white border border-gray-200 p-8 mb-8">
        <div className="flex items-start gap-6">
          <div className="relative group">
            {avatarPreview ? (
              <img src={avatarPreview} alt="" className="w-18 h-18 object-cover" />
            ) : (
              <div className="w-18 h-18 bg-gray-900 flex items-center justify-center">
                <span className="text-white font-bold text-3xl">{user?.full_name?.charAt(0) || 'U'}</span>
              </div>
            )}
            <label className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
              <span className="text-white text-xs font-medium">Change photo</span>
              <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </label>
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{user?.full_name || user?.username}</h1>
            <p className="text-sm text-gray-600 mb-2">{user?.role}</p>
            <p className="text-xs text-gray-500">{user?.organization_name}</p>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-white border border-gray-200 p-8 mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-6">Personal information</h2>
        <form onSubmit={handleUpdateProfile}>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Full name</label>
              <input
                type="text"
                value={profile.full_name}
                onChange={(e) => setProfile({...profile, full_name: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Email address</label>
              <input
                type="email"
                value={user?.email}
                disabled
                className="w-full px-4 py-2 border border-gray-200 bg-gray-50 text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Bio</label>
              <textarea
                value={profile.bio}
                onChange={(e) => setProfile({...profile, bio: e.target.value})}
                placeholder="A short description about you"
                className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-gray-900"
                rows={4}
              />
            </div>
          </div>
          <button type="submit" className="mt-6 px-6 py-2 bg-gray-900 text-white text-sm font-medium hover:bg-gray-800">
            Save changes
          </button>
        </form>
      </div>

      {/* Preferences */}
      <div className="bg-white border border-gray-200 p-8 mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-6">Preferences</h2>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Timezone</label>
            <select
              value={profile.timezone}
              onChange={(e) => setProfile({...profile, timezone: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-gray-900"
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="Europe/London">London (GMT)</option>
              <option value="Europe/Paris">Paris (CET)</option>
              <option value="Asia/Tokyo">Tokyo (JST)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Activity */}
      <div className="bg-white border border-gray-200 p-8 mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-6">Activity</h2>
        {stats.conversations > 0 || stats.replies > 0 || stats.decisions > 0 ? (
          <div className="grid grid-cols-3 gap-6">
            <div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{stats.conversations}</div>
              <div className="text-sm text-gray-600">Conversations created</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{stats.replies}</div>
              <div className="text-sm text-gray-600">Replies posted</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{stats.decisions}</div>
              <div className="text-sm text-gray-600">Decisions contributed to</div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Your activity will appear here as you participate</p>
        )}
      </div>

      {/* Security */}
      <div className="bg-white border border-gray-200 p-8">
        <h2 className="text-lg font-bold text-gray-900 mb-6">Security</h2>
        <form onSubmit={handleChangePassword} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Current password</label>
            <input
              type="password"
              value={passwords.old_password}
              onChange={(e) => setPasswords({...passwords, old_password: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">New password</label>
            <input
              type="password"
              value={passwords.new_password}
              onChange={(e) => setPasswords({...passwords, new_password: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Confirm new password</label>
            <input
              type="password"
              value={passwords.confirm_password}
              onChange={(e) => setPasswords({...passwords, confirm_password: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-gray-900"
            />
          </div>
          <button type="submit" className="px-6 py-2 bg-gray-900 text-white text-sm font-medium hover:bg-gray-800">
            Change password
          </button>
        </form>
      </div>
    </div>
  );
}

export default Profile;
