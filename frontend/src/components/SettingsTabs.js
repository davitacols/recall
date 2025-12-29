import React from 'react';

export function ProfileTab({ profile, setProfile, saveProfile, stats, badges, getBadgeIcon }) {
  return (
    <div className="space-y-8">
      {/* Profile Info */}
      <div className="bg-white border-2 border-gray-900 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 uppercase tracking-wide">Profile Information</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-900 mb-2 uppercase tracking-wider">Full Name</label>
            <input
              type="text"
              value={profile.full_name}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              className="w-full p-3 border-2 border-gray-300 focus:outline-none focus:border-gray-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-900 mb-2 uppercase tracking-wider">Email</label>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              className="w-full p-3 border-2 border-gray-300 focus:outline-none focus:border-gray-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-900 mb-2 uppercase tracking-wider">Bio</label>
            <textarea
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              rows={4}
              className="w-full p-3 border-2 border-gray-300 focus:outline-none focus:border-gray-900"
              placeholder="Tell us about yourself..."
            />
          </div>

          <button
            onClick={saveProfile}
            className="px-6 py-3 bg-gray-900 text-white hover:bg-gray-800 font-bold uppercase text-sm tracking-wide"
          >
            Save Profile
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="bg-white border-2 border-gray-900 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 uppercase tracking-wide">Your Activity</h2>
          
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-gray-50 border border-gray-200">
              <div className="text-3xl font-bold text-gray-900">{stats.total_conversations}</div>
              <div className="text-xs text-gray-600 uppercase tracking-wide font-bold">Conversations</div>
            </div>
            <div className="text-center p-4 bg-gray-50 border border-gray-200">
              <div className="text-3xl font-bold text-gray-900">{stats.total_replies}</div>
              <div className="text-xs text-gray-600 uppercase tracking-wide font-bold">Replies</div>
            </div>
            <div className="text-center p-4 bg-gray-50 border border-gray-200">
              <div className="text-3xl font-bold text-gray-900">{stats.total_decisions}</div>
              <div className="text-xs text-gray-600 uppercase tracking-wide font-bold">Decisions</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 border border-gray-200">
              <div className="text-sm font-bold text-gray-900 mb-2 uppercase">This Week</div>
              <div className="text-xs text-gray-600">
                {stats.this_week.conversations} conversations, {stats.this_week.replies} replies
              </div>
            </div>
            <div className="p-4 bg-gray-50 border border-gray-200">
              <div className="text-sm font-bold text-gray-900 mb-2 uppercase">This Month</div>
              <div className="text-xs text-gray-600">
                {stats.this_month.conversations} conversations, {stats.this_month.replies} replies
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Badges */}
      <div className="bg-white border-2 border-gray-900 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 uppercase tracking-wide">Your Badges</h2>
        {badges.length === 0 ? (
          <p className="text-gray-600">No badges earned yet. Keep contributing!</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {badges.map((badge, idx) => (
              <div key={idx} className="text-center p-4 bg-gray-50 border border-gray-200">
                <div className="text-4xl mb-2">{getBadgeIcon(badge.badge_type)}</div>
                <div className="text-xs font-bold text-gray-900 uppercase">
                  {badge.badge_type.replace('_', ' ')}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(badge.earned_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function SecurityTab({ passwords, setPasswords, changePassword }) {
  return (
    <div className="space-y-8">
      <div className="bg-white border-2 border-gray-900 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 uppercase tracking-wide">Change Password</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-900 mb-2 uppercase tracking-wider">Current Password</label>
            <input
              type="password"
              value={passwords.current_password}
              onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })}
              className="w-full p-3 border-2 border-gray-300 focus:outline-none focus:border-gray-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-900 mb-2 uppercase tracking-wider">New Password</label>
            <input
              type="password"
              value={passwords.new_password}
              onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
              className="w-full p-3 border-2 border-gray-300 focus:outline-none focus:border-gray-900"
            />
            <p className="text-xs text-gray-600 mt-1">Must be at least 8 characters</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-900 mb-2 uppercase tracking-wider">Confirm New Password</label>
            <input
              type="password"
              value={passwords.confirm_password}
              onChange={(e) => setPasswords({ ...passwords, confirm_password: e.target.value })}
              className="w-full p-3 border-2 border-gray-300 focus:outline-none focus:border-gray-900"
            />
          </div>

          <button
            onClick={changePassword}
            className="px-6 py-3 bg-gray-900 text-white hover:bg-gray-800 font-bold uppercase text-sm tracking-wide"
          >
            Change Password
          </button>
        </div>
      </div>
    </div>
  );
}

export function NotificationsTab({ notifications, setNotifications, saveNotifications }) {
  return (
    <div className="space-y-8">
      <div className="bg-white border-2 border-gray-900 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 uppercase tracking-wide">Notification Preferences</h2>
        
        <div className="space-y-4">
          <label className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 cursor-pointer">
            <div>
              <div className="font-bold text-gray-900 uppercase text-sm">Email Notifications</div>
              <div className="text-xs text-gray-600">Receive notifications via email</div>
            </div>
            <input
              type="checkbox"
              checked={notifications.email_notifications}
              onChange={(e) => setNotifications({ ...notifications, email_notifications: e.target.checked })}
              className="w-6 h-6"
            />
          </label>

          <label className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 cursor-pointer">
            <div>
              <div className="font-bold text-gray-900 uppercase text-sm">Mentions</div>
              <div className="text-xs text-gray-600">When someone mentions you</div>
            </div>
            <input
              type="checkbox"
              checked={notifications.mention_notifications}
              onChange={(e) => setNotifications({ ...notifications, mention_notifications: e.target.checked })}
              className="w-6 h-6"
            />
          </label>

          <label className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 cursor-pointer">
            <div>
              <div className="font-bold text-gray-900 uppercase text-sm">Replies</div>
              <div className="text-xs text-gray-600">When someone replies to your posts</div>
            </div>
            <input
              type="checkbox"
              checked={notifications.reply_notifications}
              onChange={(e) => setNotifications({ ...notifications, reply_notifications: e.target.checked })}
              className="w-6 h-6"
            />
          </label>

          <label className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 cursor-pointer">
            <div>
              <div className="font-bold text-gray-900 uppercase text-sm">Decisions</div>
              <div className="text-xs text-gray-600">When decisions are made or approved</div>
            </div>
            <input
              type="checkbox"
              checked={notifications.decision_notifications}
              onChange={(e) => setNotifications({ ...notifications, decision_notifications: e.target.checked })}
              className="w-6 h-6"
            />
          </label>

          <div className="p-4 bg-gray-50 border border-gray-200">
            <label className="block text-xs font-bold text-gray-900 mb-2 uppercase tracking-wider">Digest Frequency</label>
            <select
              value={notifications.digest_frequency}
              onChange={(e) => setNotifications({ ...notifications, digest_frequency: e.target.value })}
              className="w-full p-3 border-2 border-gray-300 focus:outline-none focus:border-gray-900"
            >
              <option value="realtime">Real-time</option>
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="never">Never</option>
            </select>
          </div>

          <button
            onClick={saveNotifications}
            className="px-6 py-3 bg-gray-900 text-white hover:bg-gray-800 font-bold uppercase text-sm tracking-wide"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}

export function PreferencesTab({ preferences, setPreferences, savePreferences, newTopic, setNewTopic, addMutedTopic, removeMutedTopic, togglePostType }) {
  return (
    <div className="space-y-8">
      <div className="bg-white border-2 border-gray-900 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 uppercase tracking-wide">Quiet Mode</h2>
        
        <div className="mb-6">
          <label className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 cursor-pointer">
            <div>
              <div className="font-bold text-gray-900 uppercase text-sm">Enable Quiet Mode</div>
              <div className="text-xs text-gray-600">Hide muted topics and post types</div>
            </div>
            <input
              type="checkbox"
              checked={preferences.quiet_mode}
              onChange={(e) => setPreferences({ ...preferences, quiet_mode: e.target.checked })}
              className="w-6 h-6"
            />
          </label>
        </div>

        <div className="mb-6">
          <h3 className="font-bold text-gray-900 mb-3 uppercase text-sm">Muted Topics</h3>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              placeholder="Add topic to mute..."
              className="flex-1 p-3 border-2 border-gray-300 focus:outline-none focus:border-gray-900"
            />
            <button
              onClick={addMutedTopic}
              className="px-6 py-3 bg-gray-900 text-white hover:bg-gray-800 font-bold uppercase text-sm"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {preferences.muted_topics.map((topic, idx) => (
              <span key={idx} className="px-3 py-1 bg-gray-900 text-white text-sm flex items-center">
                {topic}
                <button
                  onClick={() => removeMutedTopic(topic)}
                  className="ml-2 text-white hover:text-gray-300"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="font-bold text-gray-900 mb-3 uppercase text-sm">Muted Post Types</h3>
          <div className="space-y-2">
            {['update', 'decision', 'question', 'proposal'].map(type => (
              <label key={type} className="flex items-center p-3 bg-gray-50 border border-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.muted_post_types.includes(type)}
                  onChange={() => togglePostType(type)}
                  className="w-5 h-5 mr-3"
                />
                <span className="font-medium text-gray-900 uppercase text-sm">{type}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={savePreferences}
          className="px-6 py-3 bg-gray-900 text-white hover:bg-gray-800 font-bold uppercase text-sm tracking-wide"
        >
          Save Preferences
        </button>
      </div>

      <div className="bg-white border-2 border-gray-900 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 uppercase tracking-wide">Performance</h2>
        
        <div className="space-y-4">
          <label className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 cursor-pointer">
            <div>
              <div className="font-bold text-gray-900 uppercase text-sm">Low Data Mode</div>
              <div className="text-xs text-gray-600">Reduce image quality and limit content</div>
            </div>
            <input
              type="checkbox"
              checked={preferences.low_data_mode}
              onChange={(e) => setPreferences({ ...preferences, low_data_mode: e.target.checked })}
              className="w-6 h-6"
            />
          </label>

          <label className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 cursor-pointer">
            <div>
              <div className="font-bold text-gray-900 uppercase text-sm">Offline Mode</div>
              <div className="text-xs text-gray-600">Cache content for offline access</div>
            </div>
            <input
              type="checkbox"
              checked={preferences.offline_mode}
              onChange={(e) => setPreferences({ ...preferences, offline_mode: e.target.checked })}
              className="w-6 h-6"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
