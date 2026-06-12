import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  BoltIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  LinkIcon,
  PuzzlePieceIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";
import { useToast } from "../components/Toast";
import { PageHeader, Button, SectionMessage } from "../components/atlas";
import "./GitHubIntegration.css";

const INSTALL_URL_ENDPOINT = "/api/integrations/github/app/install-url/";
const INSTALLATION_ENDPOINT = "/api/integrations/github/app/";
const REPOS_ENDPOINT = "/api/integrations/github/app/repos/";
const RESYNC_ENDPOINT = "/api/integrations/github/app/resync/";

function GitHubGlyph({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56l-.01-2c-3.2.7-3.87-1.54-3.87-1.54-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.26 5.68.41.36.78 1.06.78 2.14l-.01 3.17c0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

function relTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const sec = Math.max(1, Math.round((Date.now() - d.getTime()) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const m = Math.round(sec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function GitHubIntegration() {
  const toast = useToast?.() || { addToast: () => {} };
  const navigate = useNavigate();
  const [installation, setInstallation] = useState(null);
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [installing, setInstalling] = useState(false);
  const [resyncing, setResyncing] = useState(false);
  const [filter, setFilter] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get(REPOS_ENDPOINT);
      const inst = data?.github_app;
      setInstallation(inst && inst.connected ? inst : null);
      setRepos(Array.isArray(data?.results) ? data.results : []);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Could not load GitHub integration");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleConnect = async () => {
    setInstalling(true);
    try {
      const { data } = await api.get(INSTALL_URL_ENDPOINT);
      if (data?.install_url) {
        // Full-page redirect — GitHub will bounce back to our setup URL.
        window.location.href = data.install_url;
      } else {
        toast.addToast?.("GitHub App is not configured for this deployment.", "error");
      }
    } catch (err) {
      const status = err?.response?.status;
      if (status === 503) {
        toast.addToast?.(
          "The GitHub App is not configured on this deployment yet. Ask the workspace admin to set GITHUB_APP_ID, GITHUB_APP_SLUG, GITHUB_APP_PRIVATE_KEY, and GITHUB_APP_WEBHOOK_SECRET.",
          "error"
        );
      } else {
        toast.addToast?.(err?.response?.data?.error || "Could not start GitHub install", "error");
      }
    } finally {
      setInstalling(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm("Disconnect the GitHub App from this workspace? Linked PRs stay in the audit, but new events will stop arriving.")) return;
    try {
      const { data } = await api.delete(INSTALLATION_ENDPOINT);
      setInstallation(null);
      setRepos([]);
      toast.addToast?.(data?.message || "GitHub App disconnected", "success");
    } catch (err) {
      toast.addToast?.(err?.response?.data?.error || "Could not disconnect", "error");
    }
  };

  const handleResync = async () => {
    setResyncing(true);
    try {
      const { data } = await api.post(RESYNC_ENDPOINT);
      setRepos(Array.isArray(data?.results) ? data.results : []);
      toast.addToast?.(data?.message || "Repos synced", "success");
    } catch (err) {
      toast.addToast?.(err?.response?.data?.error || "Resync failed", "error");
    } finally {
      setResyncing(false);
    }
  };

  const toggleRepo = async (repo, next) => {
    // Optimistic update — flip back if the server rejects.
    setRepos((prev) =>
      prev.map((r) => (r.id === repo.id ? { ...r, is_enabled_for_decisions: next } : r))
    );
    try {
      await api.patch(`${REPOS_ENDPOINT}${repo.id}/`, { is_enabled_for_decisions: next });
    } catch (err) {
      setRepos((prev) =>
        prev.map((r) => (r.id === repo.id ? { ...r, is_enabled_for_decisions: !next } : r))
      );
      toast.addToast?.(err?.response?.data?.error || "Could not update repo", "error");
    }
  };

  const filteredRepos = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return repos;
    return repos.filter((r) => r.full_name.toLowerCase().includes(q));
  }, [repos, filter]);

  const enabledCount = useMemo(() => repos.filter((r) => r.is_enabled_for_decisions).length, [repos]);

  return (
    <div className="gh-page">
      <PageHeader
        breadcrumb={[{ label: "Knoledgr", to: "/" }, { label: "Integrations", to: "/integrations" }, { label: "GitHub" }]}
        title="GitHub"
        subtitle="Link decisions to pull requests via a proper GitHub App install — no personal access tokens, no per-repo webhook setup."
        style={{ padding: "24px 0 0", background: "transparent" }}
      />

      {error ? <SectionMessage tone="error" style={{ marginBottom: 16 }}>{error}</SectionMessage> : null}

      <section className="gh-connection">
        <div className="gh-connection-id">
          <span className="gh-connection-mark"><GitHubGlyph size={26} /></span>
          {installation ? (
            <div>
              <p className="gh-eyebrow">Connected</p>
              <h2 className="gh-account">{installation.account_login}</h2>
              <p className="gh-sub">
                {installation.repository_selection === "all" ? "All repositories" : `${enabledCount} of ${repos.length} repos enabled for decisions`}
                {installation.installed_by ? ` · installed by ${installation.installed_by}` : ""}
              </p>
              {!installation.is_active ? (
                <p className="gh-warning">
                  <ExclamationCircleIcon />
                  {installation.revoked_at ? "Install was revoked on the GitHub side." : "Install is suspended."} Webhook events have stopped.
                </p>
              ) : null}
            </div>
          ) : (
            <div>
              <p className="gh-eyebrow">Not connected</p>
              <h2 className="gh-account">Install the Knoledgr GitHub App</h2>
              <p className="gh-sub">
                Pick the repos you want to share. You can change the selection at any time from GitHub settings.
              </p>
            </div>
          )}
        </div>
        <div className="gh-connection-actions">
          {installation ? (
            <>
              <Button
                onClick={handleResync}
                iconBefore={<ArrowPathIcon style={{ width: 14, height: 14 }} />}
                isDisabled={resyncing}
              >
                {resyncing ? "Syncing…" : "Resync repos"}
              </Button>
              <Button
                appearance="primary"
                onClick={() =>
                  window.open(`https://github.com/settings/installations`, "_blank", "noopener,noreferrer")
                }
                iconBefore={<ArrowTopRightOnSquareIcon style={{ width: 14, height: 14 }} />}
              >
                Manage on GitHub
              </Button>
              <Button
                appearance="subtle"
                onClick={handleDisconnect}
                iconBefore={<TrashIcon style={{ width: 14, height: 14 }} />}
              >
                Disconnect
              </Button>
            </>
          ) : (
            <Button
              appearance="primary"
              onClick={handleConnect}
              isDisabled={installing}
              iconBefore={<PuzzlePieceIcon style={{ width: 14, height: 14 }} />}
            >
              {installing ? "Opening GitHub…" : "Connect GitHub"}
            </Button>
          )}
        </div>
      </section>

      {installation ? (
        <section className="gh-card">
          <div className="gh-card-head">
            <div>
              <h3 className="gh-card-title">Connected repositories</h3>
              <p className="gh-card-sub">
                Toggle which repos count for decision linking. Disabling a repo stops the PR picker from showing it, but past links stay intact.
              </p>
            </div>
            <input
              className="gh-search"
              type="search"
              value={filter}
              placeholder="Filter by name"
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="gh-empty">Loading…</div>
          ) : repos.length === 0 ? (
            <div className="gh-empty">
              <p>No repositories have been shared with the App.</p>
              <p className="gh-empty-sub">
                Go to <a href="https://github.com/settings/installations" target="_blank" rel="noopener noreferrer">GitHub installation settings</a> and grant access to the repos you want to track. Then come back and click <strong>Resync repos</strong>.
              </p>
            </div>
          ) : (
            <ul className="gh-repo-list">
              {filteredRepos.map((repo) => (
                <li key={repo.id} className="gh-repo">
                  <div className="gh-repo-id">
                    <span className="gh-repo-name">{repo.full_name}</span>
                    <span className="gh-repo-meta">
                      {repo.private ? <span className="gh-chip">Private</span> : <span className="gh-chip is-public">Public</span>}
                      {repo.archived ? <span className="gh-chip is-archived">Archived</span> : null}
                      {repo.default_branch ? <span className="gh-branch">{repo.default_branch}</span> : null}
                      {repo.last_synced_at ? <span className="gh-relative">synced {relTime(repo.last_synced_at)}</span> : null}
                    </span>
                  </div>
                  <label className="gh-toggle" title={repo.is_enabled_for_decisions ? "Enabled for decisions" : "Disabled"}>
                    <input
                      type="checkbox"
                      checked={repo.is_enabled_for_decisions}
                      onChange={(e) => toggleRepo(repo, e.target.checked)}
                    />
                    <span className="gh-toggle-track" />
                  </label>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {installation ? (
        <section className="gh-card">
          <div className="gh-card-head">
            <h3 className="gh-card-title">What this connects</h3>
          </div>
          <ul className="gh-bullets">
            <li><LinkIcon /> Link decisions to specific pull requests from the decision detail page (the picker shows PRs across all enabled repos).</li>
            <li><CheckCircleIcon /> PR state, branch, and merged-at metadata sync into Knoledgr so decision pages stay current without re-fetching GitHub on every render.</li>
            <li><BoltIcon /> Webhook events (PR opened, push, installation changes) are recorded in the audit trail and trigger workspace activity entries.</li>
          </ul>
          <p className="gh-foot">
            Looking for the old personal-access-token integration?{" "}
            <Link to="/integrations">Switch back to the legacy view</Link> — it'll keep working until you reconnect via the App.
          </p>
        </section>
      ) : null}
    </div>
  );
}
