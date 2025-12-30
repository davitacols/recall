import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Button from '../components/Button';

function Integrations() {
  const [slack, setSlack] = useState(null);
  const [github, setGithub] = useState(null);
  const [jira, setJira] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('slack');
  const [testing, setTesting] = useState(null);

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
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
      setLoading(false);
    }
  };

  const handleTestIntegration = async (type) => {
    setTesting(type);
    try {
      const response = await api.post(`/api/integrations/test/${type}/`);
      alert(`✓ ${type} connection successful`);
    } catch (error) {
      alert(`✗ ${type} connection failed`);
    } finally {
      setTesting(null);
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
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Integrations</h1>
        <p className="text-base text-gray-600">Connect Recall to your favorite tools</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-8 border-b border-gray-200">
        {['slack', 'github', 'jira'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Slack */}
      {activeTab === 'slack' && <SlackPanel data={slack} onTest={() => handleTestIntegration('slack')} testing={testing === 'slack'} onRefresh={fetchIntegrations} />}

      {/* GitHub */}
      {activeTab === 'github' && <GitHubPanel data={github} onTest={() => handleTestIntegration('github')} testing={testing === 'github'} onRefresh={fetchIntegrations} />}

      {/* Jira */}
      {activeTab === 'jira' && <JiraPanel data={jira} onTest={() => handleTestIntegration('jira')} testing={testing === 'jira'} onRefresh={fetchIntegrations} />}
    </div>
  );
}

function SlackPanel({ data, onTest, testing, onRefresh }) {
  const [webhookUrl, setWebhookUrl] = useState(data?.webhook_url || '');
  const [channel, setChannel] = useState(data?.channel || '#general');
  const [postDecisions, setPostDecisions] = useState(data?.post_decisions ?? true);
  const [postBlockers, setPostBlockers] = useState(data?.post_blockers ?? true);
  const [postSprintSummary, setPostSprintSummary] = useState(data?.post_sprint_summary ?? false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/api/integrations/slack/', {
        webhook_url: webhookUrl,
        channel,
        post_decisions: postDecisions,
        post_blockers: postBlockers,
        post_sprint_summary: postSprintSummary,
        enabled: true
      });
      alert('Slack integration saved');
      onRefresh();
    } catch (error) {
      alert('Failed to save Slack integration');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Slack Integration</h2>
        
        {data?.enabled ? (
          <div className="mb-6 p-4 bg-green-50 border border-green-200">
            <p className="text-sm text-green-800">✓ Connected</p>
          </div>
        ) : (
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200">
            <p className="text-sm text-gray-600">Not connected</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Webhook URL</label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              className="w-full px-3 py-2 border border-gray-900 focus:outline-none"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Get this from Slack App settings</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Channel</label>
            <input
              type="text"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              placeholder="#general"
              className="w-full px-3 py-2 border border-gray-900 focus:outline-none"
            />
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={postDecisions}
                onChange={(e) => setPostDecisions(e.target.checked)}
                className="w-4 h-4 border border-gray-900"
              />
              <span className="text-sm text-gray-900">Post decisions to Slack</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={postBlockers}
                onChange={(e) => setPostBlockers(e.target.checked)}
                className="w-4 h-4 border border-gray-900"
              />
              <span className="text-sm text-gray-900">Post blockers to Slack</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={postSprintSummary}
                onChange={(e) => setPostSprintSummary(e.target.checked)}
                className="w-4 h-4 border border-gray-900"
              />
              <span className="text-sm text-gray-900">Post sprint summaries to Slack</span>
            </label>
          </div>

          <div className="flex gap-3">
            <Button type="submit" loading={submitting}>Save</Button>
            <Button type="button" variant="secondary" onClick={onTest} loading={testing}>Test Connection</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function GitHubPanel({ data, onTest, testing, onRefresh }) {
  const [accessToken, setAccessToken] = useState(data?.access_token || '');
  const [repoOwner, setRepoOwner] = useState(data?.repo_owner || '');
  const [repoName, setRepoName] = useState(data?.repo_name || '');
  const [autoLinkPrs, setAutoLinkPrs] = useState(data?.auto_link_prs ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [showPrSearch, setShowPrSearch] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/api/integrations/github/', {
        access_token: accessToken,
        repo_owner: repoOwner,
        repo_name: repoName,
        auto_link_prs: autoLinkPrs,
        enabled: true
      });
      alert('GitHub integration saved');
      onRefresh();
    } catch (error) {
      alert('Failed to save GitHub integration');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">GitHub Integration</h2>
        
        {data?.enabled ? (
          <div className="mb-6 p-4 bg-green-50 border border-green-200">
            <p className="text-sm text-green-800">✓ Connected</p>
          </div>
        ) : (
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200">
            <p className="text-sm text-gray-600">Not connected</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Access Token</label>
            <input
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="ghp_..."
              className="w-full px-3 py-2 border border-gray-900 focus:outline-none"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Create a personal access token in GitHub settings</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Repository Owner</label>
              <input
                type="text"
                value={repoOwner}
                onChange={(e) => setRepoOwner(e.target.value)}
                placeholder="username"
                className="w-full px-3 py-2 border border-gray-900 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Repository Name</label>
              <input
                type="text"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                placeholder="repo-name"
                className="w-full px-3 py-2 border border-gray-900 focus:outline-none"
                required
              />
            </div>
          </div>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={autoLinkPrs}
              onChange={(e) => setAutoLinkPrs(e.target.checked)}
              className="w-4 h-4 border border-gray-900"
            />
            <span className="text-sm text-gray-900">Auto-link pull requests to decisions</span>
          </label>

          <div className="flex gap-3">
            <Button type="submit" loading={submitting}>Save</Button>
            <Button type="button" variant="secondary" onClick={onTest} loading={testing}>Test Connection</Button>
            {data?.enabled && (
              <button
                type="button"
                onClick={() => setShowPrSearch(!showPrSearch)}
                className="px-4 py-2 border border-gray-900 text-gray-900 font-medium hover:bg-gray-50 transition-colors"
              >
                {showPrSearch ? 'Hide' : 'Search'} PRs
              </button>
            )}
          </div>
        </form>
      </div>

      {showPrSearch && <GitHubPrSearch />}
    </div>
  );
}

function GitHubPrSearch() {
  const [decisionId, setDecisionId] = useState('');
  const [prs, setPrs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [decisions, setDecisions] = useState([]);

  useEffect(() => {
    fetchDecisions();
  }, []);

  const fetchDecisions = async () => {
    try {
      const res = await api.get('/api/decisions/');
      setDecisions(res.data);
    } catch (error) {
      console.error('Failed to fetch decisions:', error);
    }
  };

  const handleSearch = async () => {
    if (!decisionId) return;
    setLoading(true);
    try {
      const res = await api.get(`/api/integrations/github/search/${decisionId}/`);
      setPrs(res.data.prs);
      console.log('PRs found:', res.data.prs);
    } catch (error) {
      console.error('Search error:', error);
      alert('Failed to search PRs: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleLinkPr = async (prUrl) => {
    try {
      await api.post(`/api/integrations/github/link/${decisionId}/`, { pr_url: prUrl });
      alert('PR linked to decision');
    } catch (error) {
      alert('Failed to link PR');
    }
  };

  return (
    <div className="border border-gray-200 p-6 mt-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Link PRs to Decisions</h3>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-900 mb-2">Select Decision</label>
        <select
          value={decisionId}
          onChange={(e) => setDecisionId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-900 focus:outline-none"
        >
          <option value="">Choose a decision...</option>
          {decisions.map(d => (
            <option key={d.id} value={d.id}>{d.title}</option>
          ))}
        </select>
      </div>

      <Button onClick={handleSearch} loading={loading} className="mb-6">Search Related PRs</Button>

      {prs.length > 0 && (
        <div className="space-y-3">
          {prs.map(pr => (
            <div key={pr.number} className="border border-gray-200 p-4 flex items-start justify-between">
              <div>
                <h4 className="font-medium text-gray-900">{pr.title}</h4>
                <p className="text-sm text-gray-600">#{pr.number} - {pr.state}</p>
                <a href={pr.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                  View on GitHub
                </a>
              </div>
              <Button onClick={() => handleLinkPr(pr.url)} variant="secondary">Link</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function JiraPanel({ data, onTest, testing, onRefresh }) {
  const [siteUrl, setSiteUrl] = useState(data?.site_url || '');
  const [email, setEmail] = useState(data?.email || '');
  const [apiToken, setApiToken] = useState(data?.api_token || '');
  const [autoSyncIssues, setAutoSyncIssues] = useState(data?.auto_sync_issues ?? false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/api/integrations/jira/', {
        site_url: siteUrl,
        email,
        api_token: apiToken,
        auto_sync_issues: autoSyncIssues,
        enabled: true
      });
      alert('Jira integration saved');
      onRefresh();
    } catch (error) {
      alert('Failed to save Jira integration');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Jira Integration</h2>
        
        {data?.enabled ? (
          <div className="mb-6 p-4 bg-green-50 border border-green-200">
            <p className="text-sm text-green-800">✓ Connected</p>
          </div>
        ) : (
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200">
            <p className="text-sm text-gray-600">Not connected</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Jira Site URL</label>
            <input
              type="url"
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              placeholder="https://your-domain.atlassian.net"
              className="w-full px-3 py-2 border border-gray-900 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-3 py-2 border border-gray-900 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">API Token</label>
            <input
              type="password"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              placeholder="Your Jira API token"
              className="w-full px-3 py-2 border border-gray-900 focus:outline-none"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Create an API token in Jira account settings</p>
          </div>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={autoSyncIssues}
              onChange={(e) => setAutoSyncIssues(e.target.checked)}
              className="w-4 h-4 border border-gray-900"
            />
            <span className="text-sm text-gray-900">Auto-sync blockers with Jira issues</span>
          </label>

          <div className="flex gap-3">
            <Button type="submit" loading={submitting}>Save</Button>
            <Button type="button" variant="secondary" onClick={onTest} loading={testing}>Test Connection</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Integrations;
