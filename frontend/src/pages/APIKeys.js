import React, { useState, useEffect } from 'react';
import { useTheme } from '../utils/ThemeAndAccessibility';
import api from '../services/api';
import { KeyIcon, TrashIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

function APIKeys() {
  const { darkMode } = useTheme();
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [newKey, setNewKey] = useState(null);

  const bgColor = darkMode ? 'bg-stone-950' : 'bg-white';
  const cardBg = darkMode ? 'bg-stone-900' : 'bg-white';
  const borderColor = darkMode ? 'border-stone-800' : 'border-gray-200';
  const textColor = darkMode ? 'text-stone-100' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-stone-400' : 'text-gray-600';

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const response = await api.get('/api/organizations/api-keys/');
      setKeys(response.data);
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/api/organizations/api-keys/', { name: keyName });
      setNewKey(response.data.key);
      setKeyName('');
      fetchKeys();
    } catch (error) {
      alert('Failed to create API key');
    }
  };

  const handleDelete = async (keyId) => {
    if (!window.confirm('Delete this API key? This cannot be undone.')) return;
    try {
      await api.delete(`/api/organizations/api-keys/${keyId}/`);
      fetchKeys();
    } catch (error) {
      alert('Failed to delete API key');
    }
  };

  const handleToggle = async (keyId) => {
    try {
      await api.put(`/api/organizations/api-keys/${keyId}/toggle/`);
      fetchKeys();
    } catch (error) {
      alert('Failed to toggle API key');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
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
            <h1 className={`text-4xl font-bold ${textColor} mb-2`}>API Keys</h1>
            <p className={textSecondary}>Manage API keys for integrations</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
          >
            <KeyIcon className="w-5 h-5" />
            Create API Key
          </button>
        </div>

        {/* API Keys List */}
        <div className={`${cardBg} border ${borderColor} rounded-lg p-6`}>
          {keys.length === 0 ? (
            <div className="text-center py-12">
              <KeyIcon className={`w-12 h-12 ${textSecondary} mx-auto mb-4`} />
              <p className={textSecondary}>No API keys yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {keys.map(key => (
                <div key={key.id} className={`flex items-center justify-between p-4 border ${borderColor} rounded-lg`}>
                  <div className="flex-1">
                    <div className={`font-semibold ${textColor} mb-1`}>{key.name}</div>
                    <div className={`text-sm ${textSecondary} font-mono`}>{key.key}</div>
                    <div className={`text-xs ${textSecondary} mt-1`}>
                      Created {new Date(key.created_at).toLocaleDateString()}
                      {key.last_used_at && ` • Last used ${new Date(key.last_used_at).toLocaleDateString()}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggle(key.id)}
                      className={`px-3 py-1 text-xs font-semibold rounded-full ${key.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                    >
                      {key.is_active ? 'Active' : 'Inactive'}
                    </button>
                    <button
                      onClick={() => handleDelete(key.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition-all"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className={`${cardBg} border ${borderColor} rounded-lg p-6 w-full max-w-md`}>
              <h2 className={`text-xl font-bold ${textColor} mb-4`}>Create API Key</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium ${textSecondary} mb-2`}>Key Name</label>
                  <input
                    type="text"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    placeholder="Production API"
                    className={`w-full px-3 py-2 border ${borderColor} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-stone-800 text-stone-100' : 'bg-white text-gray-900'}`}
                    required
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className={`px-4 py-2 border ${borderColor} rounded-lg ${textColor} hover:bg-gray-50 transition-all`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                  >
                    Create Key
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* New Key Modal */}
        {newKey && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className={`${cardBg} border ${borderColor} rounded-lg p-6 w-full max-w-md`}>
              <h2 className={`text-xl font-bold ${textColor} mb-4`}>API Key Created</h2>
              <p className={`${textSecondary} mb-4`}>Copy this key now. You won't be able to see it again!</p>
              <div className={`p-3 ${darkMode ? 'bg-stone-800' : 'bg-gray-50'} rounded-lg mb-4 font-mono text-sm break-all`}>
                {newKey}
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => copyToClipboard(newKey)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                >
                  Copy to Clipboard
                </button>
                <button
                  onClick={() => {
                    setNewKey(null);
                    setShowCreateModal(false);
                  }}
                  className={`px-4 py-2 border ${borderColor} rounded-lg ${textColor} hover:bg-gray-50 transition-all`}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default APIKeys;
