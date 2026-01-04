import React, { useState, useEffect } from 'react';
import { PlusIcon, CheckIcon, XMarkIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function IntegrationManagement() {
  const [integrations, setIntegrations] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [formData, setFormData] = useState({
    integration_type: 'slack',
    name: '',
    credentials: {}
  });

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const response = await fetch('/api/integrations/', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });
      const data = await response.json();
      setIntegrations(data);
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
    }
  };

  const createIntegration = async () => {
    try {
      const response = await fetch('/api/integrations/create/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        fetchIntegrations();
        setShowCreateForm(false);
        setFormData({
          integration_type: 'slack',
          name: '',
          credentials: {}
        });
      }
    } catch (error) {
      console.error('Failed to create integration:', error);
    }
  };

  const testIntegration = async (integrationId) => {
    try {
      const response = await fetch(`/api/integrations/${integrationId}/test/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });

      if (response.ok) {
        fetchIntegrations();
      }
    } catch (error) {
      console.error('Failed to test integration:', error);
    }
  };

  const deleteIntegration = async (integrationId) => {
    if (!window.confirm('Delete this integration?')) return;

    try {
      const response = await fetch(`/api/integrations/${integrationId}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });

      if (response.ok) {
        fetchIntegrations();
      }
    } catch (error) {
      console.error('Failed to delete integration:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800';
      case 'disconnected':
        return 'bg-gray-100 text-gray-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Integrations</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          <PlusIcon className="w-5 h-5" />
          Add Integration
        </button>
      </div>

      {showCreateForm && (
        <div className="border rounded-lg p-6 mb-6 bg-gray-50">
          <h3 className="text-lg font-semibold mb-4">Add Integration</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Integration Type</label>
              <select
                value={formData.integration_type}
                onChange={(e) => setFormData({...formData, integration_type: e.target.value})}
                className="border rounded px-3 py-2 w-full"
              >
                <option value="slack">Slack</option>
                <option value="github">GitHub</option>
                <option value="jira">Jira</option>
                <option value="asana">Asana</option>
                <option value="trello">Trello</option>
                <option value="webhook">Webhook</option>
                <option value="zapier">Zapier</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="border rounded px-3 py-2 w-full"
                placeholder="e.g., Team Slack Workspace"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">API Key / Token</label>
              <input
                type="password"
                onChange={(e) => setFormData({
                  ...formData,
                  credentials: {...formData.credentials, api_key: e.target.value}
                })}
                className="border rounded px-3 py-2 w-full"
                placeholder="Enter API key or token"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={createIntegration}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add Integration
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {integrations.map(integration => (
          <div key={integration.id} className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="font-semibold">{integration.name}</div>
                <div className="text-sm text-gray-600">{integration.integration_type}</div>
                {integration.last_sync && (
                  <div className="text-xs text-gray-500 mt-1">
                    Last synced: {new Date(integration.last_sync).toLocaleString()}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(integration.status)}`}>
                  {integration.status}
                </span>

                <button
                  onClick={() => testIntegration(integration.id)}
                  className="px-3 py-2 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 text-sm"
                >
                  Test
                </button>

                <button
                  onClick={() => deleteIntegration(integration.id)}
                  className="px-3 py-2 bg-red-100 text-red-600 rounded hover:bg-red-200"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {integrations.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No integrations configured yet
          </div>
        )}
      </div>
    </div>
  );
}
