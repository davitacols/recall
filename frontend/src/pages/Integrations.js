import React, { useState, useEffect } from 'react';
import api from '../services/api';

function Integrations() {
  const [slack, setSlack] = useState({ enabled: false, webhook_url: '', channel: '#general' });
  const [github, setGithub] = useState({ enabled: false, access_token: '', repo_owner: '', repo_name: '' });
  const [jira, setJira] = useState({ enabled: false, site_url: '', email: '', api_token: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const [slackRes, githubRes, jiraRes] = await Promise.all([
        api.get('/api/integrations/slack/'),
        api.get('/api/integrations/github/'),
        api.get('/api/integrations/jira/')
      ]);
      setSlack(slackRes.data);
      setGithub(githubRes.data);
      setJira(jiraRes.data);
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSlackSave = async () => {
    try {
      await api.post('/api/integrations/slack/', slack);
      alert('Slack connected! Check your channel for test message.');
    } catch (error) {
      alert('Failed to connect Slack');
    }
  };

  const handleGitHubSave = async () => {
    try {
      await api.post('/api/integrations/github/', github);
      alert('GitHub connected!');
    } catch (error) {
      alert('Failed to connect GitHub');
    }
  };

  const handleJiraSave = async () => {
    try {
      await api.post('/api/integrations/jira/', jira);
      alert('Jira connected!');
    } catch (error) {
      alert('Failed to connect Jira');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-5xl font-bold text-gray-900 mb-3">Integrations</h1>
        <p className="text-xl text-gray-600">Connect Recall to your tools</p>
      </div>

      {/* Slack */}
      <div className="border border-gray-200 p-8 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Slack</h2>
            <p className="text-base text-gray-600">Post updates to Slack channels</p>
          </div>
          <div className={`px-4 py-2 ${slack.enabled ? 'bg-green-100 text-green-900' : 'bg-gray-100 text-gray-600'} text-sm font-bold`}>
            {slack.enabled ? 'Connected' : 'Not connected'}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Webhook URL</label>
            <input
              type="url"
              value={slack.webhook_url}
              onChange={(e) => setSlack({...slack, webhook_url: e.target.value})}
              placeholder="https://hooks.slack.com/services/..."
              className="w-full p-3 border border-gray-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Channel</label>
            <input
              type="text"
              value={slack.channel}
              onChange={(e) => setSlack({...slack, channel: e.target.value})}
              placeholder="#general"
              className="w-full p-3 border border-gray-900 focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={slack.post_decisions}
                onChange={(e) => setSlack({...slack, post_decisions: e.target.checked})}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-900">Post new decisions</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={slack.post_blockers}
                onChange={(e) => setSlack({...slack, post_blockers: e.target.checked})}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-900">Post new blockers</span>
            </label>
          </div>

          <button
            onClick={handleSlackSave}
            className="px-6 py-3 bg-gray-900 text-white hover:bg-gray-800 font-medium transition-colors"
          >
            Save Slack Settings
          </button>
        </div>
      </div>

      {/* GitHub */}
      <div className="border border-gray-200 p-8 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">GitHub</h2>
            <p className="text-base text-gray-600">Auto-link PRs to decisions</p>
          </div>
          <div className={`px-4 py-2 ${github.enabled ? 'bg-green-100 text-green-900' : 'bg-gray-100 text-gray-600'} text-sm font-bold`}>
            {github.enabled ? 'Connected' : 'Not connected'}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Access Token</label>
            <input
              type="password"
              value={github.access_token}
              onChange={(e) => setGithub({...github, access_token: e.target.value})}
              placeholder="ghp_..."
              className="w-full p-3 border border-gray-900 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Repo Owner</label>
              <input
                type="text"
                value={github.repo_owner}
                onChange={(e) => setGithub({...github, repo_owner: e.target.value})}
                placeholder="organization"
                className="w-full p-3 border border-gray-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Repo Name</label>
              <input
                type="text"
                value={github.repo_name}
                onChange={(e) => setGithub({...github, repo_name: e.target.value})}
                placeholder="repository"
                className="w-full p-3 border border-gray-900 focus:outline-none"
              />
            </div>
          </div>

          <button
            onClick={handleGitHubSave}
            className="px-6 py-3 bg-gray-900 text-white hover:bg-gray-800 font-medium transition-colors"
          >
            Save GitHub Settings
          </button>
        </div>
      </div>

      {/* Jira */}
      <div className="border border-gray-200 p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Jira</h2>
            <p className="text-base text-gray-600">Link issues to decisions</p>
          </div>
          <div className={`px-4 py-2 ${jira.enabled ? 'bg-green-100 text-green-900' : 'bg-gray-100 text-gray-600'} text-sm font-bold`}>
            {jira.enabled ? 'Connected' : 'Not connected'}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Site URL</label>
            <input
              type="url"
              value={jira.site_url}
              onChange={(e) => setJira({...jira, site_url: e.target.value})}
              placeholder="https://yourcompany.atlassian.net"
              className="w-full p-3 border border-gray-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Email</label>
            <input
              type="email"
              value={jira.email}
              onChange={(e) => setJira({...jira, email: e.target.value})}
              placeholder="you@company.com"
              className="w-full p-3 border border-gray-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">API Token</label>
            <input
              type="password"
              value={jira.api_token}
              onChange={(e) => setJira({...jira, api_token: e.target.value})}
              placeholder="API token from Jira"
              className="w-full p-3 border border-gray-900 focus:outline-none"
            />
          </div>

          <button
            onClick={handleJiraSave}
            className="px-6 py-3 bg-gray-900 text-white hover:bg-gray-800 font-medium transition-colors"
          >
            Save Jira Settings
          </button>
        </div>
      </div>
    </div>
  );
}

export default Integrations;
