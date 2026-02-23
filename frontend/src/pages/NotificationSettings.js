import React, { useState, useEffect } from 'react';
import { useTheme } from '../utils/ThemeAndAccessibility';
import { useToast } from '../components/Toast';
import { BellIcon } from '@heroicons/react/24/outline';

export default function NotificationSettings() {
  const { darkMode } = useTheme();
  const { success, error } = useToast();
  const [settings, setSettings] = useState({
    email_notifications: true,
    mention_notifications: true,
    reply_notifications: true,
    decision_notifications: true,
    task_notifications: true,
    goal_notifications: true,
    meeting_notifications: true,
    digest_frequency: 'daily'
  });
  const [loading, setLoading] = useState(true);

  const bgPrimary = darkMode ? 'bg-stone-950' : 'bg-gray-50';
  const bgSecondary = darkMode ? 'bg-stone-900' : 'bg-white';
  const borderColor = darkMode ? 'border-stone-800' : 'border-gray-200';
  const textPrimary = darkMode ? 'text-stone-100' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-stone-400' : 'text-gray-600';

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/organizations/settings/notifications/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setSettings(data);
    } catch (err) {
      error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (field) => {
    const newValue = !settings[field];
    setSettings({ ...settings, [field]: newValue });

    try {
      const token = localStorage.getItem('token');
      await fetch('http://localhost:8000/api/organizations/settings/notifications/', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...settings, [field]: newValue })
      });
      success('Settings updated');
    } catch (err) {
      error('Failed to update settings');
      setSettings({ ...settings, [field]: !newValue });
    }
  };

  const handleFrequencyChange = async (frequency) => {
    setSettings({ ...settings, digest_frequency: frequency });

    try {
      const token = localStorage.getItem('token');
      await fetch('http://localhost:8000/api/organizations/settings/notifications/', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...settings, digest_frequency: frequency })
      });
      success('Settings updated');
    } catch (err) {
      error('Failed to update settings');
    }
  };

  if (loading) return <div className={`min-h-screen ${bgPrimary} p-8`}><div className={textPrimary}>Loading...</div></div>;

  return (
    <div className={`min-h-screen ${bgPrimary}`}>
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-8">
          <BellIcon className={`w-8 h-8 ${textPrimary}`} />
          <h1 className={`text-3xl font-bold ${textPrimary}`}>Notification Settings</h1>
        </div>

        <div className={`${bgSecondary} border ${borderColor} rounded-lg p-6 space-y-6`}>
          <div>
            <h2 className={`text-xl font-semibold ${textPrimary} mb-4`}>Email Notifications</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className={`font-medium ${textPrimary}`}>Enable Email Notifications</div>
                  <div className={`text-sm ${textSecondary}`}>Receive notifications via email</div>
                </div>
                <button
                  onClick={() => handleToggle('email_notifications')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.email_notifications ? 'bg-blue-600' : 'bg-gray-300 dark:bg-stone-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.email_notifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className={`font-medium ${textPrimary}`}>Mentions</div>
                  <div className={`text-sm ${textSecondary}`}>When someone mentions you</div>
                </div>
                <button
                  onClick={() => handleToggle('mention_notifications')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.mention_notifications ? 'bg-blue-600' : 'bg-gray-300 dark:bg-stone-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.mention_notifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className={`font-medium ${textPrimary}`}>Replies</div>
                  <div className={`text-sm ${textSecondary}`}>When someone replies to your content</div>
                </div>
                <button
                  onClick={() => handleToggle('reply_notifications')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.reply_notifications ? 'bg-blue-600' : 'bg-gray-300 dark:bg-stone-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.reply_notifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className={`font-medium ${textPrimary}`}>Decisions</div>
                  <div className={`text-sm ${textSecondary}`}>Updates on decisions you're involved in</div>
                </div>
                <button
                  onClick={() => handleToggle('decision_notifications')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.decision_notifications ? 'bg-blue-600' : 'bg-gray-300 dark:bg-stone-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.decision_notifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className={`font-medium ${textPrimary}`}>Tasks</div>
                  <div className={`text-sm ${textSecondary}`}>When tasks are assigned to you</div>
                </div>
                <button
                  onClick={() => handleToggle('task_notifications')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.task_notifications ? 'bg-blue-600' : 'bg-gray-300 dark:bg-stone-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.task_notifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className={`font-medium ${textPrimary}`}>Goals</div>
                  <div className={`text-sm ${textSecondary}`}>When goals are assigned or updated</div>
                </div>
                <button
                  onClick={() => handleToggle('goal_notifications')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.goal_notifications ? 'bg-blue-600' : 'bg-gray-300 dark:bg-stone-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.goal_notifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className={`font-medium ${textPrimary}`}>Meetings</div>
                  <div className={`text-sm ${textSecondary}`}>When you're invited to meetings</div>
                </div>
                <button
                  onClick={() => handleToggle('meeting_notifications')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.meeting_notifications ? 'bg-blue-600' : 'bg-gray-300 dark:bg-stone-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.meeting_notifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className={`border-t ${borderColor} pt-6`}>
            <h2 className={`text-xl font-semibold ${textPrimary} mb-4`}>Digest Frequency</h2>
            <div className={`text-sm ${textSecondary} mb-4`}>How often would you like to receive email digests?</div>
            
            <div className="space-y-2">
              {[
                { value: 'realtime', label: 'Real-time', desc: 'Get notified immediately' },
                { value: 'hourly', label: 'Hourly', desc: 'Receive a digest every hour' },
                { value: 'daily', label: 'Daily', desc: 'Once per day summary' },
                { value: 'weekly', label: 'Weekly', desc: 'Weekly summary' },
                { value: 'never', label: 'Never', desc: 'No email digests' }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => handleFrequencyChange(option.value)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    settings.digest_frequency === option.value
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                      : `border-transparent ${darkMode ? 'bg-stone-800 hover:bg-stone-700' : 'bg-gray-50 hover:bg-gray-100'}`
                  }`}
                >
                  <div className={`font-medium ${textPrimary}`}>{option.label}</div>
                  <div className={`text-sm ${textSecondary}`}>{option.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
