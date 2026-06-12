import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowTopRightOnSquareIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import api from "../../services/api";
import "./GitHubPRPicker.css";

/**
 * GitHubPRPicker — modal-ish slide-down picker for linking a GitHub PR to
 * a decision via the new GitHub App integration. Replaces the old
 * regex-scrape-the-PR-body approach with a structured pick.
 *
 * Props:
 *   - decisionId: number (required)
 *   - onClose: () => void
 *   - onLinked: (link) => void  — called once a link is created
 *
 * Flow:
 *   1. Load workspace repos. If none enabled, render an empty state.
 *   2. User picks a repo. We fetch the recent open PRs.
 *   3. User types to filter (client-side substring, plus server-side q
 *      for repos with many open PRs).
 *   4. User clicks a PR. We POST to /api/decisions/<id>/github/links/.
 *   5. onLinked() fires, picker closes.
 */
export default function GitHubPRPicker({ decisionId, onClose, onLinked }) {
  const [repos, setRepos] = useState([]);
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [repoId, setRepoId] = useState(null);
  const [pulls, setPulls] = useState([]);
  const [loadingPulls, setLoadingPulls] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [linkingNumber, setLinkingNumber] = useState(null);
  const debounceRef = useRef(null);
  const reqIdRef = useRef(0);

  // Load repos once
  useEffect(() => {
    let mounted = true;
    api
      .get("/api/integrations/github/app/repos/")
      .then(({ data }) => {
        if (!mounted) return;
        const enabled = (data?.results || []).filter((r) => r.is_enabled_for_decisions);
        setRepos(enabled);
        if (enabled.length === 1) setRepoId(enabled[0].id);
      })
      .catch(() => {
        if (!mounted) return;
        setRepos([]);
      })
      .finally(() => mounted && setLoadingRepos(false));
    return () => {
      mounted = false;
    };
  }, []);

  // Load PRs whenever the repo or query changes (debounced).
  const fetchPulls = useCallback(async () => {
    if (!repoId) return;
    const myReqId = ++reqIdRef.current;
    setLoadingPulls(true);
    setError("");
    try {
      const { data } = await api.get(`/api/integrations/github/app/repos/${repoId}/pulls/`, {
        params: { state: "open", q: query.trim(), limit: 30 },
      });
      if (myReqId !== reqIdRef.current) return; // stale request
      setPulls(Array.isArray(data?.results) ? data.results : []);
    } catch (err) {
      if (myReqId !== reqIdRef.current) return;
      setError(err?.response?.data?.error || "Could not load PRs");
      setPulls([]);
    } finally {
      if (myReqId === reqIdRef.current) setLoadingPulls(false);
    }
  }, [repoId, query]);

  useEffect(() => {
    if (!repoId) return undefined;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchPulls, query ? 300 : 0);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchPulls, repoId, query]);

  const repo = useMemo(() => repos.find((r) => r.id === repoId), [repos, repoId]);

  const handleLink = async (pr) => {
    setLinkingNumber(pr.pr_number);
    try {
      const { data } = await api.post(`/api/decisions/${decisionId}/github/links/`, {
        repo_id: repoId,
        pr_number: pr.pr_number,
      });
      onLinked?.(data);
      onClose?.();
    } catch (err) {
      setError(err?.response?.data?.error || "Could not link PR");
    } finally {
      setLinkingNumber(null);
    }
  };

  return (
    <div className="ghp-scrim" onClick={onClose}>
      <div className="ghp" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <header className="ghp-head">
          <h3 className="ghp-title">Link a pull request</h3>
          <button className="ghp-close" onClick={onClose} aria-label="Close">
            <XMarkIcon />
          </button>
        </header>

        {loadingRepos ? (
          <div className="ghp-empty">Loading repos…</div>
        ) : repos.length === 0 ? (
          <div className="ghp-empty">
            <p>No repos are enabled for decisions yet.</p>
            <p className="ghp-empty-sub">
              <a href="/integrations/github" target="_blank" rel="noopener noreferrer">
                Connect the GitHub App
              </a>{" "}
              or enable a repo from <a href="/integrations/github">the integration page</a>.
            </p>
          </div>
        ) : (
          <>
            <div className="ghp-controls">
              <div className="ghp-repo-select">
                <label className="ghp-label">Repository</label>
                <div className="ghp-select-wrap">
                  <select
                    className="ghp-select"
                    value={repoId || ""}
                    onChange={(e) => setRepoId(Number(e.target.value))}
                  >
                    <option value="" disabled>
                      Pick a repo
                    </option>
                    {repos.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.full_name}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon />
                </div>
              </div>
              <div className="ghp-search-wrap">
                <label className="ghp-label">Search</label>
                <div className="ghp-search-input">
                  <MagnifyingGlassIcon />
                  <input
                    type="search"
                    value={query}
                    placeholder={repo ? `Filter open PRs in ${repo.full_name}` : "Pick a repo first"}
                    onChange={(e) => setQuery(e.target.value)}
                    disabled={!repoId}
                  />
                </div>
              </div>
            </div>

            {error ? <div className="ghp-error">{error}</div> : null}

            <div className="ghp-results">
              {loadingPulls ? (
                <div className="ghp-empty">Loading PRs…</div>
              ) : !repoId ? (
                <div className="ghp-empty">Pick a repository to see open PRs.</div>
              ) : pulls.length === 0 ? (
                <div className="ghp-empty">No open PRs match that filter.</div>
              ) : (
                <ul className="ghp-list">
                  {pulls.map((pr) => (
                    <li key={`${pr.pr_number}`}>
                      <button
                        type="button"
                        className="ghp-pr"
                        onClick={() => handleLink(pr)}
                        disabled={linkingNumber !== null}
                      >
                        <span className="ghp-pr-meta">
                          <span className="ghp-pr-number">#{pr.pr_number}</span>
                          <span className={`ghp-state ghp-state-${pr.state}`}>{pr.state}</span>
                        </span>
                        <span className="ghp-pr-title">{pr.title}</span>
                        <span className="ghp-pr-foot">
                          {pr.author_avatar_url ? (
                            <img className="ghp-pr-avatar" src={pr.author_avatar_url} alt={pr.author_login} />
                          ) : null}
                          <span>{pr.author_login}</span>
                          <span className="ghp-dot" />
                          <span className="ghp-branch">
                            {pr.head_branch} → {pr.base_branch}
                          </span>
                        </span>
                        <a
                          className="ghp-pr-open"
                          href={pr.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          aria-label="Open on GitHub"
                        >
                          <ArrowTopRightOnSquareIcon />
                        </a>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
