import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { CameraIcon, ChatBubbleLeftIcon, CheckCircleIcon, DocumentTextIcon, CalendarIcon, ClockIcon } from '@heroicons/react/24/outline';

function Profile() {
  const { user, logout } = useAuth();
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
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
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
    setMessage('');
    setError('');

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
      setMessage('Profile updated successfully');
      fetchProfile();
    } catch (err) {
      setError('Failed to update profile');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (passwords.new_password !== passwords.confirm_password) {
      setError('Passwords do not match');
      return;
    }

    try {
      await api.post('/api/auth/profile/change-password/', {
        old_password: passwords.old_password,
        new_password: passwords.new_password
      });
      setMessage('Password changed successfully');
      setPasswords({ old_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column - Profile Card & Stats */}
      <div className="lg:col-span-1 space-y-6">
        {/* Profile Card */}
        <div className="bg-white border-2 border-gray-900">
          <div className="h-32 bg-gradient-to-br from-gray-900 to-gray-700"></div>
          <div className="px-6 pb-6">
            <div className="relative -mt-16 mb-4">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-32 h-32 object-cover border-4 border-white" />
              ) : (
                <div className="w-32 h-32 bg-gray-900 border-4 border-white flex items-center justify-center">
                  <span className="text-white font-bold text-4xl">
                    {user?.full_name?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">{user?.full_name || user?.username}</h2>
            <p className="text-sm text-gray-600 mb-2">{user?.email}</p>
            <div className="inline-block px-3 py-1 bg-gray-900 text-white text-xs font-bold uppercase tracking-wider">
              {user?.role}
            </div>
            {profile.bio && (
              <p className="mt-4 text-sm text-gray-700 leading-relaxed">{profile.bio}</p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="bg-white border-2 border-gray-900 p-6">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4">Activity Stats</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-900 flex items-center justify-center">
                  <ChatBubbleLeftIcon className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-700">Conversations</span>
              </div>
              <span className="text-2xl font-bold text-gray-900">{stats.conversations}</span>
            </div>
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-900 flex items-center justify-center">
                  <DocumentTextIcon className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-700">Replies</span>
              </div>
              <span className="text-2xl font-bold text-gray-900">{stats.replies}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-900 flex items-center justify-center">
                  <CheckCircleIcon className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-700">Decisions</span>
              </div>
              <span className="text-2xl font-bold text-gray-900">{stats.decisions}</span>
            </div>
          </div>
        </div>

        {/* Bookmarks */}
        <div className="bg-white border-2 border-gray-200 p-6">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4">Bookmarks</h3>
          <div className="space-y-3">
            {bookmarks.length > 0 ? (
              bookmarks.slice(0, 5).map((bookmark) => (
                <a
                  key={bookmark.id}
                  href={`/conversations/${bookmark.conversation_id}`}
                  className="block pb-3 border-b border-gray-100 last:border-0 last:pb-0 hover:bg-gray-50 p-2 -m-2"
                >
                  <div className="flex items-start space-x-2 mb-1">
                    <span className="text-yellow-600 text-lg">★</span>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900 line-clamp-1">{bookmark.conversation_title}</p>
                      {bookmark.note && (
                        <p className="text-xs text-gray-600 italic mt-1 line-clamp-2">{bookmark.note}</p>
                      )}
                    </div>
                  </div>
                </a>
              ))
            ) : (
              <p className="text-sm text-gray-500">No bookmarks yet</p>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white border-2 border-gray-900 p-6">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div key={activity.id} className="pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                  <div className="flex items-start space-x-2 mb-1">
                    <span className="px-2 py-0.5 bg-gray-900 text-white text-xs font-bold uppercase">
                      {activity.post_type}
                    </span>
                    <span className="text-xs text-gray-500 flex items-center">
                      <ClockIcon className="w-3 h-3 mr-1" />
                      {new Date(activity.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900 font-medium line-clamp-2">{activity.title}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No recent activity</p>
            )}
          </div>
        </div>
      </div>

      {/* Right Column - Settings */}
      <div className="lg:col-span-2">
        <div className="mb-6">
          <h1 className="text-5xl font-bold text-gray-900 mb-2">Account Settings</h1>
          <p className="text-lg text-gray-600">Manage your profile and preferences</p>
        </div>

        {message && (
          <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-600 text-green-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-600 text-red-700">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex space-x-2 mb-6 border-b-2 border-gray-900">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-6 py-3 font-bold uppercase tracking-wide text-sm transition-colors ${
              activeTab === 'profile'
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-6 py-3 font-bold uppercase tracking-wide text-sm transition-colors ${
              activeTab === 'security'
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Security
          </button>
          <button
            onClick={() => setActiveTab('danger')}
            className={`px-6 py-3 font-bold uppercase tracking-wide text-sm transition-colors ${
              activeTab === 'danger'
                ? 'bg-red-600 text-white'
                : 'text-gray-600 hover:text-red-600'
            }`}
          >
            Danger Zone
          </button>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-white border-2 border-gray-900 p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Profile Information</h2>
            
            <form onSubmit={handleUpdateProfile}>
              {/* Avatar Upload */}
              <div className="mb-8">
                <label className="block text-xs font-bold text-gray-900 mb-4 uppercase tracking-wider">
                  Profile Picture
                </label>
                <div className="flex items-center space-x-6">
                  <div className="relative">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" className="w-32 h-32 object-cover border-2 border-gray-900" />
                    ) : (
                      <div className="w-32 h-32 bg-gray-900 flex items-center justify-center">
                        <span className="text-white font-bold text-4xl">
                          {user?.full_name?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <label className="absolute bottom-0 right-0 w-10 h-10 bg-gray-900 flex items-center justify-center cursor-pointer hover:bg-gray-800 transition-colors">
                      <CameraIcon className="w-5 h-5 text-white" />
                      <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                    </label>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Upload a new profile picture</p>
                    <p className="text-xs text-gray-500">JPG, PNG or GIF. Max size 5MB.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-2 uppercase tracking-wider">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profile.full_name}
                    onChange={(e) => setProfile({...profile, full_name: e.target.value})}
                    className="w-full p-4 border-2 border-gray-300 focus:outline-none focus:border-gray-900 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-2 uppercase tracking-wider">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={user?.email}
                    disabled
                    className="w-full p-4 border-2 border-gray-200 bg-gray-50 text-gray-500"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-xs font-bold text-gray-900 mb-2 uppercase tracking-wider">
                  Bio
                </label>
                <textarea
                  value={profile.bio}
                  onChange={(e) => setProfile({...profile, bio: e.target.value})}
                  className="w-full p-4 border-2 border-gray-300 focus:outline-none focus:border-gray-900 text-gray-900"
                  rows={5}
                  placeholder="Tell us about yourself, your role, and what you're working on..."
                />
              </div>

              <div className="mb-8">
                <label className="block text-xs font-bold text-gray-900 mb-2 uppercase tracking-wider">
                  Timezone
                </label>
                <select
                  value={profile.timezone}
                  onChange={(e) => setProfile({...profile, timezone: e.target.value})}
                  className="w-full p-4 border-2 border-gray-300 focus:outline-none focus:border-gray-900 text-gray-900"
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

              <button type="submit" className="px-8 py-4 bg-gray-900 text-white hover:bg-gray-800 font-bold uppercase tracking-wide text-sm transition-colors">
                Save Changes
              </button>
            </form>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="bg-white border-2 border-gray-900 p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Security Settings</h2>
            
            <form onSubmit={handleChangePassword}>
              <div className="mb-6">
                <label className="block text-xs font-bold text-gray-900 mb-2 uppercase tracking-wider">
                  Current Password
                </label>
                <input
                  type="password"
                  value={passwords.old_password}
                  onChange={(e) => setPasswords({...passwords, old_password: e.target.value})}
                  className="w-full p-4 border-2 border-gray-300 focus:outline-none focus:border-gray-900 text-gray-900"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-2 uppercase tracking-wider">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={passwords.new_password}
                    onChange={(e) => setPasswords({...passwords, new_password: e.target.value})}
                    className="w-full p-4 border-2 border-gray-300 focus:outline-none focus:border-gray-900 text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-2 uppercase tracking-wider">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={passwords.confirm_password}
                    onChange={(e) => setPasswords({...passwords, confirm_password: e.target.value})}
                    className="w-full p-4 border-2 border-gray-300 focus:outline-none focus:border-gray-900 text-gray-900"
                    required
                  />
                </div>
              </div>

              <div className="bg-gray-50 border-l-4 border-gray-900 p-4 mb-8">
                <p className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Password Requirements</p>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Minimum 8 characters</li>
                  <li>• At least one uppercase letter</li>
                  <li>• At least one number</li>
                </ul>
              </div>

              <button type="submit" className="px-8 py-4 bg-gray-900 text-white hover:bg-gray-800 font-bold uppercase tracking-wide text-sm transition-colors">
                Update Password
              </button>
            </form>
          </div>
        )}

        {/* Danger Zone Tab */}
        {activeTab === 'danger' && (
          <div className="bg-white border-2 border-red-600 p-8">
            <h2 className="text-3xl font-bold text-red-600 mb-8">Danger Zone</h2>
            
            <div className="bg-red-50 border-l-4 border-red-600 p-6 mb-8">
              <p className="text-sm font-bold text-red-900 mb-2 uppercase tracking-wider">Warning</p>
              <p className="text-sm text-red-800">
                Once you delete your account, there is no going back. All your conversations, replies, and decisions will be permanently removed.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border-2 border-red-200">
                <div>
                  <p className="font-bold text-gray-900 mb-1">Delete Account</p>
                  <p className="text-sm text-gray-600">Permanently remove your account and all associated data</p>
                </div>
                <button className="px-6 py-3 bg-red-600 text-white hover:bg-red-700 font-bold uppercase tracking-wide text-sm transition-colors">
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Profile;
