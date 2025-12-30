import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { useToast } from '../components/Toast';
import { useAutoSave } from '../hooks/useAutoSave';
import SaveIndicator from '../components/SaveIndicator';
import { CheckIcon } from '@heroicons/react/24/outline';

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

  const saveSettings = async (data) => {
    await api.put('/api/auth/profile/update/', data);
  };

  const { status, triggerSave, getStatusText } = useAutoSave(saveSettings, 1000);

  useEffect(() => {
    fetchSettings();
  }, []);

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
              <p className="text-sm text-gray-600">Organization settings coming soon</p>
            </div>
          )}

          {/* Team Section (Admin Only) */}
          {activeSection === 'team' && user?.role === 'admin' && (
            <div className="bg-white border border-gray-200 p-6">
              <h3 className="text-base font-bold text-gray-900 mb-6">Team members</h3>
              <p className="text-sm text-gray-600">Team management coming soon</p>
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
