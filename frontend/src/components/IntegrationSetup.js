import React, { useState } from 'react';
import api from '../services/api';
import { useToast } from './Toast';

export const SlackSetup = ({ onClose, onSuccess }) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const { addToast } = useToast();

  const testConnection = async () => {
    setTesting(true);
    try {
      const response = await api.post('/api/integrations/slack/test/', { webhook_url: webhookUrl });
      if (response.data.success) {
        addToast('Slack connected successfully!', 'success');
        onSuccess?.({ type: 'slack', config: { webhook_url: webhookUrl } });
      } else {
        addToast('Connection failed', 'error');
      }
    } catch (error) {
      addToast('Connection failed', 'error');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Connect Slack</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Slack Webhook URL
            </label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900"
            />
            <p className="text-xs text-gray-500 mt-2">
              Get your webhook URL from Slack's Incoming Webhooks app
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={testConnection}
              disabled={!webhookUrl || testing}
              className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-semibold disabled:opacity-50"
            >
              {testing ? 'Testing...' : 'Test & Connect'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const TeamsSetup = ({ onClose, onSuccess }) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const { addToast } = useToast();

  const testConnection = async () => {
    setTesting(true);
    try {
      const response = await api.post('/api/integrations/teams/test/', { webhook_url: webhookUrl });
      if (response.data.success) {
        addToast('Teams connected successfully!', 'success');
        onSuccess?.({ type: 'teams', config: { webhook_url: webhookUrl } });
      } else {
        addToast('Connection failed', 'error');
      }
    } catch (error) {
      addToast('Connection failed', 'error');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Connect Microsoft Teams</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Teams Webhook URL
            </label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://outlook.office.com/webhook/..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900"
            />
            <p className="text-xs text-gray-500 mt-2">
              Get your webhook URL from Teams Incoming Webhook connector
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={testConnection}
              disabled={!webhookUrl || testing}
              className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-semibold disabled:opacity-50"
            >
              {testing ? 'Testing...' : 'Test & Connect'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const GitLabSetup = ({ onClose, onSuccess }) => {
  const [projectId, setProjectId] = useState('');
  const [token, setToken] = useState('');
  const [testing, setTesting] = useState(false);
  const { addToast } = useToast();

  const testConnection = async () => {
    setTesting(true);
    try {
      const response = await api.post('/api/integrations/gitlab/commits/', {
        project_id: projectId,
        token: token
      });
      if (response.data.commits) {
        addToast('GitLab connected successfully!', 'success');
        onSuccess?.({ type: 'gitlab', config: { project_id: projectId, token } });
      } else {
        addToast('Connection failed', 'error');
      }
    } catch (error) {
      addToast('Connection failed', 'error');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Connect GitLab</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Project ID
            </label>
            <input
              type="text"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="12345678"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Access Token
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="glpat-..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900"
            />
            <p className="text-xs text-gray-500 mt-2">
              Create a personal access token with 'read_api' scope
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={testConnection}
              disabled={!projectId || !token || testing}
              className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-semibold disabled:opacity-50"
            >
              {testing ? 'Testing...' : 'Test & Connect'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const BitbucketSetup = ({ onClose, onSuccess }) => {
  const [workspace, setWorkspace] = useState('');
  const [repo, setRepo] = useState('');
  const [token, setToken] = useState('');
  const [testing, setTesting] = useState(false);
  const { addToast } = useToast();

  const testConnection = async () => {
    setTesting(true);
    try {
      const response = await api.post('/api/integrations/bitbucket/commits/', {
        workspace,
        repo,
        token
      });
      if (response.data.commits) {
        addToast('Bitbucket connected successfully!', 'success');
        onSuccess?.({ type: 'bitbucket', config: { workspace, repo, token } });
      } else {
        addToast('Connection failed', 'error');
      }
    } catch (error) {
      addToast('Connection failed', 'error');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Connect Bitbucket</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Workspace
            </label>
            <input
              type="text"
              value={workspace}
              onChange={(e) => setWorkspace(e.target.value)}
              placeholder="my-workspace"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Repository
            </label>
            <input
              type="text"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder="my-repo"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              App Password
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900"
            />
            <p className="text-xs text-gray-500 mt-2">
              Create an app password with 'repository:read' permission
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={testConnection}
              disabled={!workspace || !repo || !token || testing}
              className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-semibold disabled:opacity-50"
            >
              {testing ? 'Testing...' : 'Test & Connect'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
