import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';

function Settings() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState({
    quiet_mode: false,
    muted_topics: [],
    muted_post_types: [],
    offline_mode: false,
    low_data_mode: false
  });
  const [badges, setBadges] = useState([]);
  const [newTopic, setNewTopic] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPreferences();
    fetchBadges();
  }, []);

  const fetchPreferences = async () => {
    try {
      const response = await api.get('/api/conversations/preferences/');
      setPreferences(response.data);
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBadges = async () => {
    try {
      const response = await api.get('/api/conversations/badges/');
      setBadges(response.data);
    } catch (error) {
      console.error('Failed to fetch badges:', error);
    }
  };

  const handleToggle = async (field) => {
    const updated = { ...preferences, [field]: !preferences[field] };
    setPreferences(updated);
    try {
      await api.put('/api/conversations/preferences/', updated);
    } catch (error) {
      console.error('Failed to update preferences:', error);
    }
  };

  const handleAddMutedTopic = () => {
    if (!newTopic.trim()) return;
    const updated = { ...preferences, muted_topics: [...preferences.muted_topics, newTopic] };
    setPreferences(updated);
    setNewTopic('');
    api.put('/api/conversations/preferences/', updated);
  };

  const handleRemoveMutedTopic = (topic) => {
    const updated = { ...preferences, muted_topics: preferences.muted_topics.filter(t => t !== topic) };
    setPreferences(updated);
    api.put('/api/conversations/preferences/', updated);
  };

  const handleTogglePostType = (type) => {
    const muted = preferences.muted_post_types.includes(type)
      ? preferences.muted_post_types.filter(t => t !== type)
      : [...preferences.muted_post_types, type];
    const updated = { ...preferences, muted_post_types: muted };
    setPreferences(updated);
    api.put('/api/conversations/preferences/', updated);
  };

  const getBadgeIcon = (type) => {
    switch(type) {
      case 'decision_owner': return '🏆';
      case 'context_contributor': return '📚';
      case 'knowledge_builder': return '🧠';
      case 'crisis_responder': return '🚨';
      default: return '⭐';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-5xl font-bold text-gray-900 mb-8 uppercase tracking-wide">Settings</h1>

      {/* Badges */}
      <div className="bg-white border-2 border-gray-900 p-8 mb-8">
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

      {/* Quiet Mode */}
      <div className="bg-white border-2 border-gray-900 p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 uppercase tracking-wide">Quiet Mode</h2>
        <p className="text-gray-600 mb-6">Control what you see in your feed</p>

        <div className="mb-6">
          <label className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 cursor-pointer">
            <div>
              <div className="font-bold text-gray-900 uppercase text-sm">Enable Quiet Mode</div>
              <div className="text-xs text-gray-600">Hide muted topics and post types</div>
            </div>
            <input
              type="checkbox"
              checked={preferences.quiet_mode}
              onChange={() => handleToggle('quiet_mode')}
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
              onClick={handleAddMutedTopic}
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
                  onClick={() => handleRemoveMutedTopic(topic)}
                  className="ml-2 text-white hover:text-gray-300"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-bold text-gray-900 mb-3 uppercase text-sm">Muted Post Types</h3>
          <div className="space-y-2">
            {['update', 'decision', 'question', 'proposal'].map(type => (
              <label key={type} className="flex items-center p-3 bg-gray-50 border border-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.muted_post_types.includes(type)}
                  onChange={() => handleTogglePostType(type)}
                  className="w-5 h-5 mr-3"
                />
                <span className="font-medium text-gray-900 uppercase text-sm">{type}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Settings */}
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
              onChange={() => handleToggle('low_data_mode')}
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
              onChange={() => handleToggle('offline_mode')}
              className="w-6 h-6"
            />
          </label>
        </div>
      </div>
    </div>
  );
}

export default Settings;
