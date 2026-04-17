import React, { useEffect, useState } from "react";

import api from "../../services/api";

function GitHubEmptyCard({ title, description, darkMode }) {
  return (
    <div
      className={`rounded-[14px] border border-dashed px-4 py-5 ${
        darkMode ? "border-stone-600 bg-stone-950/70 text-stone-300" : "border-stone-300 bg-stone-50/60 text-stone-600"
      }`}
    >
      <p className={`text-sm font-semibold ${darkMode ? "text-stone-100" : "text-stone-900"}`}>{title}</p>
      <p className="mt-2 text-sm leading-6">{description}</p>
    </div>
  );
}

export default function GitHubDecisionLinker({ enabled, darkMode, repoSlug }) {
  const [decisionId, setDecisionId] = useState("");
  const [decisions, setDecisions] = useState([]);
  const [prs, setPrs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(null);
  const [searched, setSearched] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (!enabled) return;
    fetchDecisions();
  }, [enabled]);

  const fetchDecisions = async () => {
    try {
      const res = await api.get("/api/decisions/");
      const payload = Array.isArray(res.data) ? res.data : res.data?.results || [];
      setDecisions(payload);
    } catch {
      setDecisions([]);
    }
  };

  const searchPRs = async () => {
    if (!decisionId) return;
    setLoading(true);
    setSearched(true);
    setFeedback(null);
    try {
      const res = await api.get(`/api/integrations/fresh/github/decisions/${decisionId}/prs/`);
      setPrs(res.data?.prs || []);
    } catch (error) {
      setPrs([]);
      const detail =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Could not search GitHub pull requests.";
      setFeedback({ tone: "error", text: detail });
    } finally {
      setLoading(false);
    }
  };

  const linkPR = async (prUrl) => {
    setLinking(prUrl);
    setFeedback(null);
    try {
      await api.post(`/api/integrations/fresh/github/decisions/${decisionId}/prs/`, { pr_url: prUrl });
      setFeedback({ tone: "success", text: "Pull request linked to the selected decision." });
    } catch (error) {
      const detail =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Could not link that pull request.";
      setFeedback({ tone: "error", text: detail });
    } finally {
      setLinking(null);
    }
  };

  const selectedDecision = decisions.find((item) => String(item.id) === String(decisionId));

  if (!enabled) {
    return (
      <GitHubEmptyCard
        title="Enable GitHub before linking pull requests"
        description="Turn the GitHub integration on, validate the repository connection, then return here to attach pull requests directly to decisions."
        darkMode={darkMode}
      />
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div
        className={`rounded-[14px] border p-4 ${
          darkMode ? "border-stone-700 bg-stone-950/70" : "border-stone-200 bg-stone-50/60"
        }`}
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="max-w-2xl">
            <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${darkMode ? "text-stone-400" : "text-stone-500"}`}>
              Search the connected repository
            </p>
            <p className={`mt-2 text-sm leading-6 ${darkMode ? "text-stone-300" : "text-stone-600"}`}>
              Choose a decision, search {repoSlug || "the connected repository"}, then link the pull request that best represents the implementation path.
            </p>
          </div>
          <div
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
              darkMode ? "border-stone-600 bg-stone-900 text-stone-200" : "border-stone-300 bg-white text-stone-700"
            }`}
          >
            {repoSlug || "Repository pending"}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 md:flex-row">
          <select
            className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
              darkMode ? "border-stone-600 bg-stone-950 text-stone-100" : "border-stone-300 bg-white"
            }`}
            value={decisionId}
            onChange={(e) => setDecisionId(e.target.value)}
          >
            <option value="">Select a decision...</option>
            {decisions.map((decision) => (
              <option key={decision.id} value={decision.id}>
                {decision.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={searchPRs}
            disabled={!decisionId || loading}
            className={`rounded-lg border px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 ${
              darkMode ? "border-sky-500 bg-sky-600" : "border-stone-900 bg-stone-900"
            }`}
          >
            {loading ? "Searching..." : "Search PRs"}
          </button>
        </div>

        {feedback ? (
          <div
            className={`mt-3 rounded-xl border px-3 py-2 text-sm ${
              feedback.tone === "success"
                ? darkMode
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800"
                : darkMode
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
                  : "border-rose-200 bg-rose-50 text-rose-800"
            }`}
          >
            {feedback.text}
          </div>
        ) : null}

        <div className="mt-4 space-y-3">
          {prs.length > 0 ? (
            prs.map((pr) => (
              <div
                key={pr.number}
                className={`rounded-2xl border p-4 ${
                  darkMode ? "border-stone-700 bg-stone-950/90" : "border-stone-200 bg-white"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${darkMode ? "text-stone-100" : "text-stone-900"}`}>{pr.title}</p>
                    <p className={`mt-1 text-xs ${darkMode ? "text-stone-400" : "text-stone-500"}`}>
                      #{pr.number} | {(pr.state || "open").replaceAll("_", " ")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {pr.url ? (
                      <a
                        href={pr.url}
                        target="_blank"
                        rel="noreferrer"
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                          darkMode
                            ? "border-stone-600 bg-stone-900 text-stone-100 hover:border-sky-400"
                            : "border-stone-300 bg-stone-50 text-stone-800 hover:border-sky-500"
                        }`}
                      >
                        Open GitHub
                      </a>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => linkPR(pr.url)}
                      disabled={linking === pr.url || !pr.url}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                        darkMode
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                          : "border-emerald-200 bg-emerald-50 text-emerald-800"
                      }`}
                    >
                      {linking === pr.url ? "Linking..." : "Link to decision"}
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : searched && !loading ? (
            <GitHubEmptyCard
              title="No matching pull requests found"
              description="Try a different decision, confirm the repository is correct, or create a PR title that includes the decision reference format."
              darkMode={darkMode}
            />
          ) : (
            <GitHubEmptyCard
              title="Search for pull requests after selecting a decision"
              description="Knoledgr will look for repository pull requests that can be attached to the selected decision record."
              darkMode={darkMode}
            />
          )}
        </div>
      </div>

      <div
        className={`rounded-[14px] border p-4 ${
          darkMode ? "border-stone-700 bg-stone-950/70 text-stone-200" : "border-stone-200 bg-stone-50/60 text-stone-700"
        }`}
      >
        <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${darkMode ? "text-sky-300/80" : "text-sky-700"}`}>
          Selected decision
        </p>
        <p className={`mt-2 text-base font-semibold ${darkMode ? "text-stone-100" : "text-stone-900"}`}>
          {selectedDecision?.title || "Choose a decision to begin"}
        </p>
        <p className={`mt-2 text-sm leading-6 ${darkMode ? "text-stone-300" : "text-stone-600"}`}>
          {selectedDecision
            ? "Search pull requests, review the candidate list, then link the PR that best represents the implementation path."
            : "The linker becomes useful once you pick the decision record that should own the engineering work."}
        </p>
        <div className="mt-4 space-y-2">
          {[
            "Search after saving the repository configuration and validating the GitHub connection.",
            "Prefer pull requests whose titles, branches, or commits already include DECISION-123, RECALL-123, or #123.",
            "Link the cleanest implementation record first so decision timelines stay readable.",
          ].map((tip) => (
            <div
              key={tip}
              className={`rounded-xl border px-3 py-3 text-sm ${
                darkMode ? "border-stone-700 bg-stone-950/70 text-stone-300" : "border-stone-200 bg-stone-50 text-stone-700"
              }`}
            >
              {tip}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
