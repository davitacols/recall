import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { useTheme } from "../utils/ThemeAndAccessibility";

const PROVIDERS = [
  {
    key: "slack",
    name: "Slack",
    category: "Comms",
    desc: "Push decisions, blockers, and sprint summaries to channels.",
  },
  {
    key: "github",
    name: "GitHub",
    category: "Engineering",
    desc: "Link PRs to decisions and track implementation flow.",
  },
  {
    key: "jira",
    name: "Jira",
    category: "Delivery",
    desc: "Sync work items and keep status aligned across systems.",
  },
];

export default function Integrations() {
  const { darkMode } = useTheme();
  const [active, setActive] = useState("slack");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [flash, setFlash] = useState(null);

  const [slack, setSlack] = useState(null);
  const [github, setGithub] = useState(null);
  const [jira, setJira] = useState(null);

  const [slackForm, setSlackForm] = useState({
    webhook_url: "",
    channel: "#general",
    post_decisions: true,
    post_blockers: true,
    post_sprint_summary: false,
    enabled: false,
  });
  const [githubForm, setGithubForm] = useState({
    access_token: "",
    repo_owner: "",
    repo_name: "",
    webhook_secret: "",
    auto_link_prs: true,
    enabled: false,
  });
  const [jiraForm, setJiraForm] = useState({
    site_url: "",
    email: "",
    api_token: "",
    auto_sync_issues: false,
    enabled: false,
  });

  useEffect(() => {
    fetchIntegrations();
  }, []);

  useEffect(() => {
    if (!slack) return;
    setSlackForm({
      webhook_url: slack.webhook_url || "",
      channel: slack.channel || "#general",
      post_decisions: slack.post_decisions ?? true,
      post_blockers: slack.post_blockers ?? true,
      post_sprint_summary: slack.post_sprint_summary ?? false,
      enabled: Boolean(slack.enabled),
    });
  }, [slack]);

  useEffect(() => {
    if (!github) return;
    setGithubForm({
      access_token: "",
      repo_owner: github.repo_owner || "",
      repo_name: github.repo_name || "",
      webhook_secret: "",
      auto_link_prs: github.auto_link_prs ?? true,
      enabled: Boolean(github.enabled),
    });
  }, [github]);

  useEffect(() => {
    if (!jira) return;
    setJiraForm({
      site_url: jira.site_url || "",
      email: jira.email || "",
      api_token: jira.api_token || "",
      auto_sync_issues: jira.auto_sync_issues ?? false,
      enabled: Boolean(jira.enabled),
    });
  }, [jira]);

  const byKey = { slack, github, jira };
  const connectedCount = useMemo(
    () => Object.values(byKey).filter((item) => Boolean(item?.enabled)).length,
    [slack, github, jira]
  );
  const activeProvider = PROVIDERS.find((p) => p.key === active);
  const activeData = byKey[active] || {};
  const tone = useMemo(
    () =>
      darkMode
        ? {
            hero: "rounded-2xl border border-stone-700 bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 p-6",
            heroEyebrow: "text-xs font-semibold tracking-[0.16em] text-stone-400 uppercase",
            heroTitle: "mt-2 text-2xl md:text-3xl font-black text-stone-100",
            heroText: "mt-2 text-sm text-stone-300 max-w-2xl",
            card: "rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-center min-w-[95px]",
            cardValue: "text-lg font-bold text-stone-100",
            cardLabel: "text-[10px] tracking-wider uppercase text-stone-400",
            shellAside: "rounded-2xl border border-stone-700 bg-stone-900 p-3",
            shellMain: "space-y-4 rounded-2xl border border-stone-700 bg-stone-900 p-5",
            muted: "text-stone-400",
            text: "text-stone-100",
            subtext: "text-stone-300",
            testBtn: "rounded-lg border border-stone-600 px-3 py-2 text-xs font-semibold text-stone-200 hover:bg-stone-800 disabled:opacity-60",
            saveBtn: "rounded-lg border border-emerald-500 bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-60",
          }
        : {
            hero: "rounded-2xl border border-stone-200 bg-gradient-to-r from-amber-50 via-orange-50 to-emerald-50 p-6",
            heroEyebrow: "text-xs font-semibold tracking-[0.16em] text-stone-500 uppercase",
            heroTitle: "mt-2 text-2xl md:text-3xl font-black text-stone-900",
            heroText: "mt-2 text-sm text-stone-600 max-w-2xl",
            card: "rounded-xl border border-stone-200 bg-white px-3 py-2 text-center min-w-[95px]",
            cardValue: "text-lg font-bold text-stone-900",
            cardLabel: "text-[10px] tracking-wider uppercase text-stone-500",
            shellAside: "rounded-2xl border border-stone-200 bg-white p-3",
            shellMain: "space-y-4 rounded-2xl border border-stone-200 bg-white p-5",
            muted: "text-stone-500",
            text: "text-stone-900",
            subtext: "text-stone-600",
            testBtn: "rounded-lg border border-stone-300 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-60",
            saveBtn: "rounded-lg border border-stone-900 bg-stone-900 px-3 py-2 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-60",
          },
    [darkMode]
  );

  const fetchIntegrations = async () => {
    setLoading(true);
    try {
      const [s, g, j] = await Promise.all([
        api.get("/api/integrations/slack/"),
        api.get("/api/integrations/fresh/github/config/"),
        api.get("/api/integrations/jira/"),
      ]);
      setSlack(s.data || null);
      setGithub(g.data || null);
      setJira(j.data || null);
    } catch (error) {
      setFlash({ type: "error", text: "Failed to load integrations." });
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setFlash(null);
    try {
      await api.post(`/api/integrations/test/${active}/`);
      setFlash({ type: "success", text: `${activeProvider?.name} test passed.` });
    } catch {
      setFlash({ type: "error", text: `${activeProvider?.name} test failed.` });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setFlash(null);
    try {
      if (active === "slack") {
        await api.post("/api/integrations/slack/", slackForm);
      } else if (active === "github") {
        await api.post("/api/integrations/fresh/github/config/", githubForm);
      } else {
        await api.post("/api/integrations/jira/", jiraForm);
      }
      await fetchIntegrations();
      setFlash({ type: "success", text: `${activeProvider?.name} settings saved.` });
    } catch {
      setFlash({ type: "error", text: `Failed to save ${activeProvider?.name} settings.` });
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = () => {
    if (active === "slack") {
      setSlackForm((prev) => ({ ...prev, enabled: !prev.enabled }));
    } else if (active === "github") {
      setGithubForm((prev) => ({ ...prev, enabled: !prev.enabled }));
    } else {
      setJiraForm((prev) => ({ ...prev, enabled: !prev.enabled }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] grid place-items-center">
        <div
          className={`w-8 h-8 rounded-full border-2 border-t-transparent animate-spin ${
            darkMode ? "border-stone-500" : "border-stone-300"
          }`}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className={tone.hero}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className={tone.heroEyebrow}>Integrations Hub</p>
            <h1 className={tone.heroTitle}>Connect Your Workspace Stack</h1>
            <p className={tone.heroText}>
              Centralize comms, delivery, and code tooling so decisions and execution stay synchronized.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Providers" value={`${PROVIDERS.length}`} tone={tone} />
            <Stat label="Connected" value={`${connectedCount}`} tone={tone} />
            <Stat label="Not Connected" value={`${PROVIDERS.length - connectedCount}`} tone={tone} />
          </div>
        </div>
      </section>

      {flash ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            flash.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-700"
          }`}
        >
          {flash.text}
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className={tone.shellAside}>
          <p className={`px-3 pb-2 text-xs font-semibold uppercase tracking-wider ${tone.muted}`}>Providers</p>
          <div className="space-y-2">
            {PROVIDERS.map((provider) => {
              const connected = Boolean(byKey[provider.key]?.enabled);
              const isActive = provider.key === active;
              return (
                <button
                  key={provider.key}
                  onClick={() => setActive(provider.key)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    isActive
                      ? darkMode
                        ? "border-emerald-500 bg-emerald-600 text-white"
                        : "border-stone-900 bg-stone-900 text-white"
                      : darkMode
                      ? "border-stone-700 bg-stone-900 hover:border-stone-500"
                      : "border-stone-200 bg-white hover:border-stone-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`text-sm font-semibold ${isActive ? "text-white" : tone.text}`}>
                        {provider.name}
                      </p>
                      <p className={`mt-1 text-xs ${isActive ? "text-stone-100" : tone.muted}`}>
                        {provider.desc}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        connected
                          ? isActive
                            ? "bg-emerald-500 text-white"
                            : "bg-emerald-100 text-emerald-700"
                          : isActive
                          ? "bg-stone-700 text-stone-200"
                          : "bg-stone-100 text-stone-600"
                      }`}
                    >
                      {connected ? "Connected" : "Not connected"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <main className={tone.shellMain}>
          <div className={`flex flex-wrap items-center justify-between gap-3 border-b pb-4 ${darkMode ? "border-stone-700" : "border-stone-200"}`}>
            <div>
              <p className={`text-xs uppercase tracking-widest ${tone.muted}`}>{activeProvider?.category}</p>
              <h2 className={`mt-1 text-xl font-bold ${tone.text}`}>{activeProvider?.name}</h2>
              <p className={`mt-1 text-sm ${tone.subtext}`}>{activeProvider?.desc}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleEnabled}
                className={`rounded-lg px-3 py-2 text-xs font-semibold border ${
                  activeData?.enabled
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : darkMode
                    ? "border-stone-600 bg-stone-800 text-stone-200"
                    : "border-stone-300 bg-stone-50 text-stone-700"
                }`}
              >
                {activeData?.enabled ? "Disable" : "Enable"}
              </button>
              <button
                onClick={handleTest}
                disabled={testing}
                className={tone.testBtn}
              >
                {testing ? "Testing..." : "Test"}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className={tone.saveBtn}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>

          {active === "slack" ? (
            <SlackConfig value={slackForm} onChange={setSlackForm} darkMode={darkMode} />
          ) : null}
          {active === "github" ? (
            <GitHubConfig value={githubForm} status={github} onChange={setGithubForm} darkMode={darkMode} />
          ) : null}
          {active === "jira" ? (
            <JiraConfig value={jiraForm} onChange={setJiraForm} darkMode={darkMode} />
          ) : null}
        </main>
      </section>
    </div>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className={tone.card}>
      <p className={tone.cardValue}>{value}</p>
      <p className={tone.cardLabel}>{label}</p>
    </div>
  );
}

function Field({ label, hint, children, darkMode }) {
  return (
    <div>
      <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-stone-100" : "text-stone-900"}`}>{label}</label>
      {children}
      {hint ? <p className={`mt-1 text-xs ${darkMode ? "text-stone-400" : "text-stone-500"}`}>{hint}</p> : null}
    </div>
  );
}

function TextInput({ darkMode, ...props }) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${
        darkMode
          ? "border-stone-600 bg-stone-800 text-stone-100 focus:border-stone-400"
          : "border-stone-300 bg-white text-stone-900 focus:border-stone-500"
      }`}
    />
  );
}

function Check({ checked, onChange, label, darkMode }) {
  return (
    <label
      className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
        darkMode ? "border-stone-700 bg-stone-800" : "border-stone-200"
      }`}
    >
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4" />
      <span className={`text-sm ${darkMode ? "text-stone-200" : "text-stone-800"}`}>{label}</span>
    </label>
  );
}

function SlackConfig({ value, onChange, darkMode }) {
  return (
    <div className="space-y-5">
      <Field label="Webhook URL" hint="Create an incoming webhook in your Slack app settings." darkMode={darkMode}>
        <TextInput
          darkMode={darkMode}
          type="url"
          value={value.webhook_url}
          placeholder="https://hooks.slack.com/services/..."
          onChange={(e) => onChange((prev) => ({ ...prev, webhook_url: e.target.value }))}
        />
      </Field>
      <Field label="Channel" darkMode={darkMode}>
        <TextInput
          darkMode={darkMode}
          value={value.channel}
          placeholder="#general"
          onChange={(e) => onChange((prev) => ({ ...prev, channel: e.target.value }))}
        />
      </Field>
      <div className="grid gap-2 md:grid-cols-2">
        <Check
          checked={value.post_decisions}
          onChange={(e) => onChange((prev) => ({ ...prev, post_decisions: e.target.checked }))}
          label="Post decisions to Slack"
          darkMode={darkMode}
        />
        <Check
          checked={value.post_blockers}
          onChange={(e) => onChange((prev) => ({ ...prev, post_blockers: e.target.checked }))}
          label="Post blockers to Slack"
          darkMode={darkMode}
        />
        <Check
          checked={value.post_sprint_summary}
          onChange={(e) => onChange((prev) => ({ ...prev, post_sprint_summary: e.target.checked }))}
          label="Post sprint summary"
          darkMode={darkMode}
        />
      </div>
    </div>
  );
}

function GitHubConfig({ value, status, onChange, darkMode }) {
  const readiness = status?.webhook_readiness;
  const observability = status?.webhook_observability;
  const readinessTone =
    readiness?.state === "ready"
      ? darkMode
        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
        : "border-emerald-200 bg-emerald-50 text-emerald-800"
      : readiness?.state === "missing_secret"
        ? darkMode
          ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
          : "border-amber-200 bg-amber-50 text-amber-800"
        : darkMode
          ? "border-stone-700 bg-stone-800 text-stone-300"
          : "border-stone-200 bg-stone-50 text-stone-700";

  return (
    <div className="space-y-5">
      {status?.configured ? (
        <div className="grid gap-3 md:grid-cols-4">
          <SignalCard label="Repository" value={status.repo_slug || "-"} darkMode={darkMode} />
          <SignalCard
            label="Decision PRs"
            value={`${status.engineering_summary?.decision_pull_requests || 0}`}
            darkMode={darkMode}
          />
          <SignalCard
            label="Issue PRs"
            value={`${status.engineering_summary?.issue_pull_requests || 0}`}
            darkMode={darkMode}
          />
          <SignalCard
            label="Deployments"
            value={`${status.engineering_summary?.deployments || 0}`}
            darkMode={darkMode}
          />
        </div>
      ) : null}

      {status?.configured ? (
        <div className="grid gap-3 md:grid-cols-4">
          <SignalCard
            label="Webhook Health"
            value={(observability?.health || "awaiting_events").replaceAll("_", " ")}
            darkMode={darkMode}
          />
          <SignalCard
            label="Last Delivery"
            value={observability?.last_delivery_at ? new Date(observability.last_delivery_at).toLocaleDateString() : "None"}
            darkMode={darkMode}
          />
          <SignalCard
            label="Last Processed"
            value={observability?.last_success_at ? new Date(observability.last_success_at).toLocaleDateString() : "None"}
            darkMode={darkMode}
          />
          <SignalCard
            label="Recent Failures"
            value={`${observability?.recent_failure_count || 0}`}
            darkMode={darkMode}
          />
        </div>
      ) : null}

      <Field label="Access Token" hint="Use a PAT with repo read access." darkMode={darkMode}>
        <TextInput
          darkMode={darkMode}
          type="password"
          value={value.access_token}
          placeholder="ghp_..."
          onChange={(e) => onChange((prev) => ({ ...prev, access_token: e.target.value }))}
        />
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Repository Owner" darkMode={darkMode}>
          <TextInput
            darkMode={darkMode}
            value={value.repo_owner}
            placeholder="org-or-user"
            onChange={(e) => onChange((prev) => ({ ...prev, repo_owner: e.target.value }))}
          />
        </Field>
        <Field label="Repository Name" darkMode={darkMode}>
          <TextInput
            darkMode={darkMode}
            value={value.repo_name}
            placeholder="repo-name"
            onChange={(e) => onChange((prev) => ({ ...prev, repo_name: e.target.value }))}
          />
        </Field>
      </div>
      <Field
        label="Webhook Secret"
        hint="Use the same secret in GitHub so pull_request and push events can be verified."
        darkMode={darkMode}
      >
        <TextInput
          darkMode={darkMode}
          type="password"
          value={value.webhook_secret}
          placeholder={status?.has_webhook_secret ? "Webhook secret already configured" : "Add webhook secret"}
          onChange={(e) => onChange((prev) => ({ ...prev, webhook_secret: e.target.value }))}
        />
      </Field>
      <Check
        checked={value.auto_link_prs}
        onChange={(e) => onChange((prev) => ({ ...prev, auto_link_prs: e.target.checked }))}
        label="Auto-link pull requests to decisions"
        darkMode={darkMode}
      />
      <div className={`rounded-xl border p-4 text-sm ${readinessTone}`}>
        <p className="font-semibold">{readiness?.label || "Webhook setup"}</p>
        <p className="mt-1">{readiness?.detail || "Connect the repo to unlock engineering timelines."}</p>
        {readiness?.webhook_url ? (
          <p className="mt-2 break-all text-xs opacity-80">Webhook URL: {readiness.webhook_url}</p>
        ) : null}
      </div>
      {status?.configured ? (
        <div
          className={`rounded-xl border p-4 space-y-3 ${
            darkMode ? "border-stone-700 bg-stone-800/70" : "border-stone-200 bg-stone-50/60"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className={`text-sm font-semibold ${darkMode ? "text-stone-100" : "text-stone-900"}`}>Webhook Delivery Monitor</p>
              <p className={`mt-1 text-xs ${darkMode ? "text-stone-400" : "text-stone-500"}`}>
                Recent GitHub deliveries are tracked as processed, ignored, or failed so repo health is visible inside Knoledgr.
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <StatusPill label="Processed" value={observability?.recent_processed_count || 0} tone="emerald" darkMode={darkMode} />
              <StatusPill label="Ignored" value={observability?.recent_ignored_count || 0} tone="amber" darkMode={darkMode} />
              <StatusPill label="Failed" value={observability?.recent_failure_count || 0} tone="rose" darkMode={darkMode} />
            </div>
          </div>
          {observability?.recent_deliveries?.length ? (
            <div className="space-y-2">
              {observability.recent_deliveries.slice(0, 5).map((delivery) => (
                <div
                  key={delivery.id}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    darkMode ? "border-stone-700 bg-stone-900 text-stone-200" : "border-stone-200 bg-white text-stone-700"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {[delivery.event, delivery.action || null].filter(Boolean).join(" | ")}
                      </p>
                      <p className={`mt-1 text-xs ${darkMode ? "text-stone-400" : "text-stone-500"}`}>
                        {[
                          delivery.delivery_id ? `Delivery ${delivery.delivery_id}` : null,
                          delivery.created_at ? new Date(delivery.created_at).toLocaleString() : null,
                          delivery.repository_owner && delivery.repository_name
                            ? `${delivery.repository_owner}/${delivery.repository_name}`
                            : null,
                        ].filter(Boolean).join(" | ")}
                      </p>
                      {delivery.message ? (
                        <p className={`mt-2 text-xs ${darkMode ? "text-stone-300" : "text-stone-600"}`}>{delivery.message}</p>
                      ) : null}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <DeliveryStateBadge state={delivery.processing_state} darkMode={darkMode} />
                      <DeliveryStateBadge
                        state={delivery.signature_valid ? "signed" : "unsigned"}
                        darkMode={darkMode}
                        kind="signature"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              className={`rounded-lg border border-dashed px-3 py-4 text-sm ${
                darkMode ? "border-stone-600 text-stone-400" : "border-stone-300 text-stone-500"
              }`}
            >
              No webhook deliveries yet. Once GitHub starts sending events, Knoledgr will show the last processed and failed deliveries here.
            </div>
          )}
        </div>
      ) : null}
      {status?.recent_activity?.length ? (
        <div
          className={`rounded-xl border p-4 space-y-3 ${
            darkMode ? "border-stone-700 bg-stone-800/70" : "border-stone-200 bg-stone-50/60"
          }`}
        >
          <p className={`text-sm font-semibold ${darkMode ? "text-stone-100" : "text-stone-900"}`}>Recent Engineering Activity</p>
          <div className="space-y-2">
            {status.recent_activity.slice(0, 4).map((item, index) => (
              <div
                key={`${item.type}-${item.url || index}`}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  darkMode ? "border-stone-700 bg-stone-900 text-stone-200" : "border-stone-200 bg-white text-stone-700"
                }`}
              >
                <p className="font-medium">{item.title || item.type}</p>
                <p className={`mt-1 text-xs ${darkMode ? "text-stone-400" : "text-stone-500"}`}>
                  {[item.subtitle, item.author, item.timestamp ? new Date(item.timestamp).toLocaleString() : null].filter(Boolean).join(" | ")}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <GitHubDecisionLinker enabled={value.enabled} darkMode={darkMode} />
    </div>
  );
}

function StatusPill({ label, value, tone, darkMode }) {
  const styles = {
    emerald: darkMode ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200" : "border-emerald-200 bg-emerald-50 text-emerald-800",
    amber: darkMode ? "border-amber-500/40 bg-amber-500/10 text-amber-200" : "border-amber-200 bg-amber-50 text-amber-800",
    rose: darkMode ? "border-rose-500/40 bg-rose-500/10 text-rose-200" : "border-rose-200 bg-rose-50 text-rose-800",
  };
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${styles[tone]}`}>
      {label}
      <span>{value}</span>
    </span>
  );
}

function DeliveryStateBadge({ state, darkMode, kind = "state" }) {
  const stateMap =
    kind === "signature"
      ? {
          signed: darkMode ? "border-sky-500/40 bg-sky-500/10 text-sky-200" : "border-sky-200 bg-sky-50 text-sky-800",
          unsigned: darkMode ? "border-stone-600 bg-stone-800 text-stone-300" : "border-stone-200 bg-stone-50 text-stone-700",
        }
      : {
          processed: darkMode ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200" : "border-emerald-200 bg-emerald-50 text-emerald-800",
          ignored: darkMode ? "border-amber-500/40 bg-amber-500/10 text-amber-200" : "border-amber-200 bg-amber-50 text-amber-800",
          failed: darkMode ? "border-rose-500/40 bg-rose-500/10 text-rose-200" : "border-rose-200 bg-rose-50 text-rose-800",
        };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${stateMap[state] || stateMap.failed}`}>
      {state.replaceAll("_", " ")}
    </span>
  );
}

function SignalCard({ label, value, darkMode }) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        darkMode ? "border-stone-700 bg-stone-800/70" : "border-stone-200 bg-stone-50/60"
      }`}
    >
      <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${darkMode ? "text-stone-400" : "text-stone-500"}`}>
        {label}
      </p>
      <p className={`mt-2 text-base font-semibold ${darkMode ? "text-stone-100" : "text-stone-900"}`}>{value}</p>
    </div>
  );
}

function JiraConfig({ value, onChange, darkMode }) {
  return (
    <div className="space-y-5">
      <Field label="Site URL" hint="Example: https://your-team.atlassian.net" darkMode={darkMode}>
        <TextInput
          darkMode={darkMode}
          type="url"
          value={value.site_url}
          placeholder="https://your-team.atlassian.net"
          onChange={(e) => onChange((prev) => ({ ...prev, site_url: e.target.value }))}
        />
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Jira Email" darkMode={darkMode}>
          <TextInput
            darkMode={darkMode}
            type="email"
            value={value.email}
            placeholder="name@company.com"
            onChange={(e) => onChange((prev) => ({ ...prev, email: e.target.value }))}
          />
        </Field>
        <Field label="API Token" darkMode={darkMode}>
          <TextInput
            darkMode={darkMode}
            type="password"
            value={value.api_token}
            placeholder="Atlassian API token"
            onChange={(e) => onChange((prev) => ({ ...prev, api_token: e.target.value }))}
          />
        </Field>
      </div>
      <Check
        checked={value.auto_sync_issues}
        onChange={(e) => onChange((prev) => ({ ...prev, auto_sync_issues: e.target.checked }))}
        label="Auto-sync Jira issues"
        darkMode={darkMode}
      />
    </div>
  );
}

function GitHubDecisionLinker({ enabled, darkMode }) {
  const [decisionId, setDecisionId] = useState("");
  const [decisions, setDecisions] = useState([]);
  const [prs, setPrs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(null);

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
    try {
      const res = await api.get(`/api/integrations/github/search/${decisionId}/`);
      setPrs(res.data?.prs || []);
    } catch {
      setPrs([]);
    } finally {
      setLoading(false);
    }
  };

  const linkPR = async (prUrl) => {
    setLinking(prUrl);
    try {
      await api.post(`/api/integrations/github/link/${decisionId}/`, { pr_url: prUrl });
    } finally {
      setLinking(null);
    }
  };

  if (!enabled) {
    return (
      <div
        className={`rounded-xl border border-dashed p-4 text-sm ${
          darkMode ? "border-stone-600 text-stone-400" : "border-stone-300 text-stone-500"
        }`}
      >
        Enable GitHub integration to search and link pull requests.
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border p-4 space-y-3 ${
        darkMode ? "border-stone-700 bg-stone-800/70" : "border-stone-200 bg-stone-50/60"
      }`}
    >
      <p className={`text-sm font-semibold ${darkMode ? "text-stone-100" : "text-stone-900"}`}>Link PRs To Decisions</p>
      <div className="flex flex-col gap-2 md:flex-row">
        <select
          className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
            darkMode ? "border-stone-600 bg-stone-900 text-stone-100" : "border-stone-300 bg-white"
          }`}
          value={decisionId}
          onChange={(e) => setDecisionId(e.target.value)}
        >
          <option value="">Select a decision...</option>
          {decisions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title}
            </option>
          ))}
        </select>
        <button
          onClick={searchPRs}
          disabled={!decisionId || loading}
          className={`rounded-lg border px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 ${
            darkMode ? "border-emerald-500 bg-emerald-600" : "border-stone-900 bg-stone-900"
          }`}
        >
          {loading ? "Searching..." : "Search PRs"}
        </button>
      </div>
      {prs.length > 0 ? (
        <div className="space-y-2">
          {prs.map((pr) => (
            <div
              key={pr.number}
              className={`rounded-lg border p-3 ${
                darkMode ? "border-stone-700 bg-stone-900" : "border-stone-200 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={`text-sm font-semibold ${darkMode ? "text-stone-100" : "text-stone-900"}`}>{pr.title}</p>
                  <p className={`text-xs mt-1 ${darkMode ? "text-stone-400" : "text-stone-500"}`}>
                    #{pr.number} | {pr.state}
                  </p>
                </div>
                <button
                  onClick={() => linkPR(pr.url)}
                  disabled={linking === pr.url}
                  className={`rounded-md border px-2 py-1 text-xs font-semibold ${
                    darkMode ? "border-stone-600 text-stone-200" : "border-stone-300 text-stone-700"
                  }`}
                >
                  {linking === pr.url ? "Linking..." : "Link"}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
