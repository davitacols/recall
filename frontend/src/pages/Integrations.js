import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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

function hasText(value) {
  return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
}

function buildNextAction(fieldChecklist, fallback) {
  const firstMissing = fieldChecklist.find((item) => !item.ready);
  if (firstMissing) {
    return {
      title: `Next: ${firstMissing.label}`,
      detail: firstMissing.helper,
      targetId: firstMissing.targetId || null,
    };
  }
  return fallback;
}

function buildIntegrationGuide(providerKey, form, status) {
  const repoConfigured = hasText(form.repo_owner) && hasText(form.repo_name);
  const githubReadiness = status?.webhook_readiness;
  const githubWebhookUrl = githubReadiness?.webhook_url || null;
  const githubObservability = status?.webhook_observability;
  const githubRepoOwner = status?.repo_owner || form.repo_owner;
  const githubRepoName = status?.repo_name || form.repo_name;
  const githubRepoUrl =
    hasText(githubRepoOwner) && hasText(githubRepoName)
      ? `https://github.com/${githubRepoOwner}/${githubRepoName}`
      : null;
  const githubWebhookSettingsUrl = githubRepoUrl ? `${githubRepoUrl}/settings/hooks` : null;
  const githubHasDeliveries = Boolean(
    githubObservability?.last_delivery_at || githubObservability?.recent_deliveries?.length
  );

  if (providerKey === "slack") {
    const slackAlerts = [
      form.post_decisions ? "Decisions" : null,
      form.post_blockers ? "Blockers" : null,
      form.post_sprint_summary ? "Sprint summaries" : null,
    ].filter(Boolean);
    const fieldChecklist = [
      {
        label: "Webhook URL",
        ready: hasText(form.webhook_url),
        helper: "Paste the Incoming Webhook URL copied from Slack app settings.",
        targetId: "slack-webhook-url",
        value: hasText(form.webhook_url) ? "Webhook added" : "Missing",
      },
      {
        label: "Channel",
        ready: hasText(form.channel),
        helper: "Choose the Slack channel that should receive Knoledgr alerts.",
        targetId: "slack-channel",
        value: hasText(form.channel) ? form.channel : "Missing",
      },
      {
        label: "Alert types",
        ready: slackAlerts.length > 0,
        helper: "Choose at least one signal so Knoledgr has something meaningful to send.",
        value: slackAlerts.length ? slackAlerts.join(", ") : "No alerts selected",
      },
      {
        label: "Integration enabled",
        ready: Boolean(form.enabled),
        helper: "Turn Slack on after saving, then run Test to validate delivery.",
        value: form.enabled ? "Enabled" : "Disabled",
      },
    ];
    return {
      title: "Set up Slack alerts without guesswork",
      description:
        "Use one dedicated webhook and one predictable channel so Knoledgr updates stay visible instead of disappearing into general chat.",
      docHref: "/docs/integrations/slack",
      docLabel: "Open Slack guide",
      needs: [
        "Slack workspace access that can create or edit an app.",
        "A destination channel like #decision-log or #delivery-signals.",
        "An incoming webhook URL copied from Slack app settings.",
      ],
      steps: [
        {
          title: "Create an incoming webhook in Slack",
          detail:
            "Enable Incoming Webhooks in your Slack app, choose the destination channel, and copy the webhook URL.",
          done: hasText(form.webhook_url),
        },
        {
          title: "Choose the Knoledgr destination channel",
          detail:
            "Set the channel that should receive updates so decisions and blockers are easy to find later.",
          done: hasText(form.channel),
        },
        {
          title: "Choose the alert types Knoledgr should send",
          detail:
            "Turn on decisions, blockers, or sprint summaries based on what your team actually wants to see in Slack.",
          done: Boolean(form.post_decisions || form.post_blockers || form.post_sprint_summary),
        },
        {
          title: "Enable the integration and run a test",
          detail:
            "Save the settings, turn Slack on, and use Test to confirm messages land in the right channel.",
          done: Boolean(form.enabled),
        },
      ],
      nextAction: buildNextAction(fieldChecklist, {
        title: "Next: run a live Slack test",
        detail: "Use Test after saving so you can confirm the exact channel receives the message.",
      }),
      fieldChecklist,
      setupValues: {
        title: "Exact Slack plan",
        items: [
          {
            label: "Destination channel",
            value: hasText(form.channel) ? form.channel : "#decision-log",
            helper: "Keep the channel specific so alerts do not disappear into general chat noise.",
            copyValue: hasText(form.channel) ? form.channel : "#decision-log",
          },
          {
            label: "Alerts selected",
            value: slackAlerts.length ? slackAlerts.join(", ") : "Choose at least one alert type",
            helper: "Start with the smallest useful alert set, then expand if the signal stays valuable.",
            copyValue: slackAlerts.length ? slackAlerts.join(", ") : null,
          },
          {
            label: "Verification step",
            value: "Save, enable, then click Test",
            helper: "Slack should receive a message immediately if the webhook is valid.",
            copyValue: "Save, enable, then click Test",
          },
        ],
      },
      shortcuts: [
        {
          label: "Open Slack apps",
          href: "https://api.slack.com/apps",
          external: true,
        },
        {
          label: "Copy Slack setup checklist",
          copyValue: `Slack setup for Knoledgr

1. Create an incoming webhook in Slack.
2. Bind it to ${hasText(form.channel) ? form.channel : "#decision-log"}.
3. Enable alerts: ${slackAlerts.length ? slackAlerts.join(", ") : "choose at least one alert type"}.
4. Save the integration in Knoledgr.
5. Enable Slack and run Test.`,
        },
      ],
      verification: [
        "Use Test after saving and confirm Slack receives the message immediately.",
        "Post one decision or blocker update and verify the message appears in the expected channel.",
      ],
      pitfalls: [
        "Using an expired or revoked Slack webhook URL.",
        "Sending alerts into a noisy general channel where teams ignore them.",
        "Leaving every alert type on even when the team only needs one or two signals.",
      ],
    };
  }

  if (providerKey === "github") {
    const fieldChecklist = [
      {
        label: "Access token",
        ready: Boolean(status?.configured) || hasText(form.access_token),
        helper: "Paste a GitHub personal access token with repository read access.",
        targetId: "github-access-token",
        value: status?.configured ? "Stored in Knoledgr" : hasText(form.access_token) ? "Ready to save" : "Missing",
      },
      {
        label: "Repository owner",
        ready: Boolean(status?.repo_owner) || hasText(form.repo_owner),
        helper: "Use the exact GitHub organization or user that owns the repository.",
        targetId: "github-repo-owner",
        value: status?.repo_owner || form.repo_owner || "Missing",
      },
      {
        label: "Repository name",
        ready: Boolean(status?.repo_name) || hasText(form.repo_name),
        helper: "Use the exact repository name so Knoledgr can validate and monitor the repo.",
        targetId: "github-repo-name",
        value: status?.repo_name || form.repo_name || "Missing",
      },
      {
        label: "Webhook secret",
        ready: Boolean(status?.has_webhook_secret) || hasText(form.webhook_secret),
        helper: "Use the same webhook secret in GitHub and Knoledgr so deliveries can be verified safely.",
        targetId: "github-webhook-secret",
        value: status?.has_webhook_secret ? "Stored in Knoledgr" : hasText(form.webhook_secret) ? "Ready to save" : "Missing",
      },
      {
        label: "Integration enabled",
        ready: Boolean(form.enabled || status?.enabled),
        helper: "Turn GitHub on after saving, then validate the repo credentials and webhook health.",
        value: form.enabled || status?.enabled ? "Enabled" : "Disabled",
      },
    ];
    let nextAction = buildNextAction(fieldChecklist, {
      title: "Next: run the GitHub connection test",
      detail: "Save the repo settings and use Test to confirm GitHub credentials are valid.",
    });
    if (fieldChecklist.every((item) => item.ready) && githubWebhookUrl && !githubHasDeliveries) {
      nextAction = {
        title: "Next: create the GitHub webhook",
        detail:
          "In GitHub repository settings, add a webhook with the Knoledgr payload URL, set the content type to application/json, use the saved secret, and subscribe to push plus pull_request events.",
      };
    } else if (
      fieldChecklist.every((item) => item.ready) &&
      githubHasDeliveries &&
      !(githubObservability?.recent_processed_count > 0)
    ) {
      nextAction = {
        title: "Next: inspect the last webhook delivery",
        detail:
          "Open the delivery list below and fix any failed or ignored webhook events before relying on GitHub timelines.",
      };
    } else if (fieldChecklist.every((item) => item.ready) && githubObservability?.recent_processed_count > 0) {
      nextAction = {
        title: "Next: link real code work back to Knoledgr",
        detail:
          "Use decision IDs like DECISION-123 or #123 in PR titles, branches, or commit messages so engineering activity attaches itself cleanly.",
      };
    }
    return {
      title: "Connect GitHub for implementation timelines",
      description:
        "GitHub works best when the repo, token, and webhook are all configured together so pull requests, commits, and deliveries can flow back into Knoledgr.",
      docHref: "/docs/integrations/github",
      docLabel: "Open GitHub guide",
      needs: [
        "A personal access token with repository read access.",
        "The exact repository owner and repository name.",
        "A webhook secret and repo admin access to add the webhook in GitHub.",
      ],
      steps: [
        {
          title: "Add a repository access token",
          detail:
            "Use a GitHub PAT with repo read access so Knoledgr can validate the repository and fetch activity.",
          done: Boolean(status?.configured) || hasText(form.access_token),
        },
        {
          title: "Point Knoledgr at the correct repository",
          detail:
            "Enter the repository owner and repository name exactly as they appear in GitHub.",
          done: Boolean(status?.repo_slug) || repoConfigured,
        },
        {
          title: "Set the webhook secret on both sides",
          detail:
            "Use the same secret in GitHub and Knoledgr so incoming pull_request and push events can be verified safely.",
          done: Boolean(status?.has_webhook_secret) || hasText(form.webhook_secret),
        },
        {
          title: "Enable GitHub and confirm delivery health",
          detail:
            "Save the config, turn the integration on, run Test, then watch the Webhook Delivery Monitor for processed events.",
          done: Boolean(form.enabled || status?.enabled),
        },
      ],
      nextAction,
      fieldChecklist,
      setupValues: {
        title: "Exact GitHub webhook settings",
        items: [
          {
            label: "Payload URL",
            value: githubWebhookUrl || "Save the GitHub config once to reveal the webhook URL",
            helper: "Paste this into the GitHub webhook Payload URL field.",
            copyValue: githubWebhookUrl || null,
          },
          {
            label: "Content type",
            value: "application/json",
            helper: "Use JSON payloads so Knoledgr can parse webhook events cleanly.",
            copyValue: "application/json",
          },
          {
            label: "Events",
            value: "push, pull_request",
            helper: "These events power PR, commit, and engineering timeline updates.",
            copyValue: "push,pull_request",
          },
          {
            label: "Secret state",
            value: status?.has_webhook_secret ? "Stored in Knoledgr" : hasText(form.webhook_secret) ? "Ready to save from this form" : "Add a secret in Knoledgr and GitHub",
            helper: "The GitHub webhook secret must exactly match the secret saved here.",
          },
          {
            label: "Linking format",
            value: "DECISION-123, RECALL-123, or #123",
            helper: "Use one of these patterns in PR titles, branches, or commit messages for automatic linking.",
            copyValue: "DECISION-123, RECALL-123, #123",
          },
        ],
      },
      shortcuts: [
        ...(githubRepoUrl
          ? [
              {
                label: "Open repository",
                href: githubRepoUrl,
                external: true,
              },
            ]
          : []),
        ...(githubWebhookSettingsUrl
          ? [
              {
                label: "Open webhook settings",
                href: githubWebhookSettingsUrl,
                external: true,
              },
            ]
          : []),
        {
          label: "Copy webhook checklist",
          copyValue: `GitHub webhook setup for Knoledgr

Payload URL: ${githubWebhookUrl || "Save the GitHub config once to reveal the webhook URL"}
Content type: application/json
Events: push, pull_request
Secret: use the same value saved in Knoledgr

After saving the webhook, send a test delivery or push a commit and confirm Knoledgr marks the delivery as processed.`,
        },
        {
          label: "Copy linking guidance",
          copyValue:
            "Use DECISION-123, RECALL-123, or #123 in PR titles, branches, or commit messages so GitHub activity links back to Knoledgr records automatically.",
        },
      ],
      verification: [
        "Run Test after saving to validate the repository credentials.",
        "In GitHub webhook settings, subscribe to pull_request and push events.",
        "Check the Webhook Delivery Monitor until the latest delivery shows as processed.",
      ],
      pitfalls: [
        "Using a token without repo access or with the wrong account scope.",
        "Pointing Knoledgr to the wrong owner or repository slug.",
        "Using a webhook secret in GitHub that does not match the saved secret in Knoledgr.",
      ],
      extraNote: githubWebhookUrl
        ? `GitHub webhook URL: ${githubWebhookUrl}`
        : "Save the GitHub config once to reveal the webhook URL Knoledgr expects.",
      statusLabel:
        githubReadiness?.label ||
        (status?.configured ? "Repository connected" : "Repository not configured"),
    };
  }

  const fieldChecklist = [
    {
      label: "Site URL",
      ready: hasText(form.site_url),
      helper: "Use the root Atlassian site URL, like https://your-team.atlassian.net.",
      targetId: "jira-site-url",
      value: form.site_url || "Missing",
    },
    {
      label: "Atlassian email",
      ready: hasText(form.email),
      helper: "Use the email address for the Atlassian account that generated the token.",
      targetId: "jira-email",
      value: form.email || "Missing",
    },
    {
      label: "API token",
      ready: hasText(form.api_token),
      helper: "Paste an Atlassian API token here rather than an account password.",
      targetId: "jira-api-token",
      value: hasText(form.api_token) ? "Ready to save" : "Missing",
    },
    {
      label: "Sync mode",
      ready: true,
      helper: "Leave auto-sync off if Jira should only be queried manually, or turn it on for continuous issue refresh.",
      value: form.auto_sync_issues ? "Auto-sync enabled" : "Manual sync only",
    },
    {
      label: "Integration enabled",
      ready: Boolean(form.enabled || status?.enabled),
      helper: "Turn Jira on after saving, then validate the connection against a real issue flow.",
      value: form.enabled || status?.enabled ? "Enabled" : "Disabled",
    },
  ];
  return {
    title: "Get Jira ready for delivery sync",
    description:
      "Jira setup is simplest when you connect one trusted Atlassian account, validate the site URL, and decide early whether automatic issue sync should be on.",
    docHref: "/docs/integrations/jira",
    docLabel: "Open Jira guide",
    needs: [
      "Your Atlassian site URL, like https://your-team.atlassian.net.",
      "The Atlassian email tied to the API token you plan to use.",
      "An Atlassian API token generated for that same account.",
    ],
    steps: [
      {
        title: "Add the Jira site URL",
        detail:
          "Enter the root Atlassian site URL so Knoledgr can authenticate against the right Jira workspace.",
        done: hasText(form.site_url),
      },
      {
        title: "Use the correct Atlassian identity",
        detail:
          "The Jira email and API token must belong to the same Atlassian account or requests will fail.",
        done: hasText(form.email) && hasText(form.api_token),
      },
      {
        title: "Decide whether issues should auto-sync",
        detail:
          "Turn on auto-sync only if Jira should remain the continuously refreshed source for issue state inside Knoledgr.",
        done: Boolean(status) || Boolean(form.auto_sync_issues),
      },
      {
        title: "Enable Jira and validate one issue flow",
        detail:
          "Save the settings, turn Jira on, run Test, and confirm one issue updates cleanly inside the workspace.",
        done: Boolean(form.enabled || status?.enabled),
      },
    ],
    nextAction: buildNextAction(fieldChecklist, {
      title: "Next: test Jira against one real issue",
      detail: "After saving, run Test and then confirm one issue can sync or refresh cleanly in Knoledgr.",
    }),
    fieldChecklist,
    setupValues: {
      title: "Exact Jira connection values",
      items: [
        {
          label: "Site URL format",
          value: form.site_url || "https://your-team.atlassian.net",
          helper: "Use the base Atlassian site URL, not a deep issue or project URL.",
          copyValue: form.site_url || "https://your-team.atlassian.net",
        },
        {
          label: "Authentication method",
          value: "Atlassian email + API token",
          helper: "Jira Cloud integrations expect an API token rather than your Atlassian password.",
          copyValue: "Atlassian email + API token",
        },
        {
          label: "Sync mode",
          value: form.auto_sync_issues ? "Automatic issue sync" : "Manual sync only",
          helper: "Choose automatic sync only if Jira should remain the continuously refreshed source.",
        },
      ],
    },
    shortcuts: [
      ...(hasText(form.site_url)
        ? [
            {
              label: "Open Jira site",
              href: form.site_url,
              external: true,
            },
          ]
        : []),
      {
        label: "Open Atlassian API tokens",
        href: "https://id.atlassian.com/manage-profile/security/api-tokens",
        external: true,
      },
      {
        label: "Copy Jira setup checklist",
        copyValue: `Jira setup for Knoledgr

Site URL: ${form.site_url || "https://your-team.atlassian.net"}
Authentication: Atlassian email + API token
Sync mode: ${form.auto_sync_issues ? "automatic issue sync" : "manual sync only"}

Save the Jira integration, enable it, run Test, and verify one real issue refreshes successfully.`,
      },
    ],
    verification: [
      "Run Test after saving and make sure Jira auth succeeds.",
      "Confirm one real issue can sync or refresh without permission or token errors.",
    ],
    pitfalls: [
      "Using an Atlassian password instead of an API token.",
      "Entering the wrong site URL or a URL for a different Jira tenant.",
      "Using an email that does not match the account that created the token.",
    ],
  };
}

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
  const activeForm = active === "slack" ? slackForm : active === "github" ? githubForm : jiraForm;
  const activeGuide = useMemo(
    () => buildIntegrationGuide(active, activeForm, activeData),
    [active, activeData, activeForm]
  );
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

          <IntegrationAssistant
            providerName={activeProvider?.name}
            guide={activeGuide}
            darkMode={darkMode}
          />

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
          id="slack-webhook-url"
          darkMode={darkMode}
          type="url"
          value={value.webhook_url}
          placeholder="https://hooks.slack.com/services/..."
          onChange={(e) => onChange((prev) => ({ ...prev, webhook_url: e.target.value }))}
        />
      </Field>
      <Field label="Channel" darkMode={darkMode}>
        <TextInput
          id="slack-channel"
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
          id="github-access-token"
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
            id="github-repo-owner"
            darkMode={darkMode}
            value={value.repo_owner}
            placeholder="org-or-user"
            onChange={(e) => onChange((prev) => ({ ...prev, repo_owner: e.target.value }))}
          />
        </Field>
        <Field label="Repository Name" darkMode={darkMode}>
          <TextInput
            id="github-repo-name"
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
          id="github-webhook-secret"
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

function IntegrationAssistant({ providerName, guide, darkMode }) {
  const completedSteps = guide.steps.filter((step) => step.done).length;
  const complete = completedSteps === guide.steps.length;
  const statusTone = complete
    ? darkMode
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
      : "border-emerald-200 bg-emerald-50 text-emerald-800"
    : darkMode
      ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
      : "border-amber-200 bg-amber-50 text-amber-800";

  return (
    <section
      className={`rounded-2xl border p-4 space-y-4 ${
        darkMode ? "border-stone-700 bg-stone-800/60" : "border-stone-200 bg-stone-50/70"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${darkMode ? "text-stone-400" : "text-stone-500"}`}>
            Integration Assistant
          </p>
          <h3 className={`mt-2 text-lg font-bold ${darkMode ? "text-stone-100" : "text-stone-900"}`}>
            {guide.title}
          </h3>
          <p className={`mt-2 text-sm ${darkMode ? "text-stone-300" : "text-stone-600"}`}>
            {guide.description}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusTone}`}>
            {completedSteps}/{guide.steps.length} steps ready
          </span>
          <Link
            to={guide.docHref}
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
              darkMode
                ? "border-stone-600 bg-stone-900 text-stone-100 hover:border-stone-400"
                : "border-stone-300 bg-white text-stone-800 hover:border-stone-500"
            }`}
          >
            {guide.docLabel}
          </Link>
          <Link
            to="/feedback"
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
              darkMode
                ? "border-stone-600 bg-stone-900 text-stone-300 hover:border-stone-400"
                : "border-stone-300 bg-white text-stone-700 hover:border-stone-500"
            }`}
          >
            Need help?
          </Link>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
        <div className="space-y-3">
          {guide.nextAction ? (
            <NextActionCard nextAction={guide.nextAction} darkMode={darkMode} />
          ) : null}
          {guide.statusLabel ? (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${
                darkMode ? "border-stone-700 bg-stone-900 text-stone-200" : "border-stone-200 bg-white text-stone-700"
              }`}
            >
              <span className={`font-semibold ${darkMode ? "text-stone-100" : "text-stone-900"}`}>{providerName} status:</span>{" "}
              {guide.statusLabel}
            </div>
          ) : null}
          {guide.steps.map((step, index) => (
            <div
              key={step.title}
              className={`rounded-xl border px-4 py-3 ${
                step.done
                  ? darkMode
                    ? "border-emerald-500/30 bg-emerald-500/10"
                    : "border-emerald-200 bg-emerald-50/80"
                  : darkMode
                    ? "border-stone-700 bg-stone-900"
                    : "border-stone-200 bg-white"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${
                    step.done
                      ? darkMode
                        ? "border-emerald-400 bg-emerald-500/20 text-emerald-200"
                        : "border-emerald-300 bg-emerald-100 text-emerald-700"
                      : darkMode
                        ? "border-stone-600 bg-stone-800 text-stone-300"
                        : "border-stone-300 bg-stone-100 text-stone-700"
                  }`}
                >
                  {step.done ? "OK" : index + 1}
                </span>
                <div>
                  <p className={`text-sm font-semibold ${darkMode ? "text-stone-100" : "text-stone-900"}`}>{step.title}</p>
                  <p className={`mt-1 text-sm leading-6 ${darkMode ? "text-stone-300" : "text-stone-600"}`}>{step.detail}</p>
                </div>
              </div>
            </div>
          ))}
          {guide.extraNote ? (
            <div
              className={`rounded-xl border border-dashed px-4 py-3 text-sm break-all ${
                darkMode ? "border-stone-600 text-stone-300" : "border-stone-300 text-stone-700"
              }`}
            >
              {guide.extraNote}
            </div>
          ) : null}
        </div>

        <div className="space-y-3">
          <AssistantFieldChecklist items={guide.fieldChecklist} darkMode={darkMode} />
          <SetupValuesCard config={guide.setupValues} darkMode={darkMode} />
          <ShortcutActionsCard shortcuts={guide.shortcuts} darkMode={darkMode} />
          <GuideList title="What you need" items={guide.needs} darkMode={darkMode} />
          <GuideList title="Verify the connection" items={guide.verification} darkMode={darkMode} />
          <GuideList title="Common setup mistakes" items={guide.pitfalls} darkMode={darkMode} />
        </div>
      </div>
    </section>
  );
}

function NextActionCard({ nextAction, darkMode }) {
  return (
    <div
      className={`rounded-xl border px-4 py-4 ${
        darkMode ? "border-sky-500/30 bg-sky-500/10" : "border-sky-200 bg-sky-50/80"
      }`}
    >
      <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${darkMode ? "text-sky-200" : "text-sky-700"}`}>
        Next Best Step
      </p>
      <p className={`mt-2 text-sm font-semibold ${darkMode ? "text-stone-100" : "text-stone-900"}`}>{nextAction.title}</p>
      <p className={`mt-1 text-sm leading-6 ${darkMode ? "text-stone-300" : "text-stone-600"}`}>{nextAction.detail}</p>
      {nextAction.targetId ? (
        <a
          href={`#${nextAction.targetId}`}
          className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
            darkMode
              ? "border-stone-600 bg-stone-900 text-stone-100 hover:border-stone-400"
              : "border-stone-300 bg-white text-stone-800 hover:border-stone-500"
          }`}
        >
          Jump to field
        </a>
      ) : null}
    </div>
  );
}

function AssistantFieldChecklist({ items = [], darkMode }) {
  if (!items.length) return null;
  return (
    <div
      className={`rounded-xl border p-4 ${
        darkMode ? "border-stone-700 bg-stone-900" : "border-stone-200 bg-white"
      }`}
    >
      <p className={`text-sm font-semibold ${darkMode ? "text-stone-100" : "text-stone-900"}`}>Live field checklist</p>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div
            key={item.label}
            className={`rounded-lg border px-3 py-3 ${
              item.ready
                ? darkMode
                  ? "border-emerald-500/20 bg-emerald-500/10"
                  : "border-emerald-200 bg-emerald-50/70"
                : darkMode
                  ? "border-stone-700 bg-stone-800"
                  : "border-stone-200 bg-stone-50"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={`text-sm font-medium ${darkMode ? "text-stone-100" : "text-stone-900"}`}>{item.label}</p>
                <p className={`mt-1 text-xs break-all ${darkMode ? "text-stone-300" : "text-stone-600"}`}>{item.value}</p>
                <p className={`mt-1 text-xs leading-5 ${darkMode ? "text-stone-400" : "text-stone-500"}`}>{item.helper}</p>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-2">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                    item.ready
                      ? darkMode
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : darkMode
                        ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                        : "border-amber-200 bg-amber-50 text-amber-700"
                  }`}
                >
                  {item.ready ? "Ready" : "Missing"}
                </span>
                {item.targetId ? (
                  <a
                    href={`#${item.targetId}`}
                    className={`text-[11px] font-semibold ${
                      darkMode ? "text-sky-300 hover:text-sky-200" : "text-sky-700 hover:text-sky-800"
                    }`}
                  >
                    Go to field
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SetupValuesCard({ config, darkMode }) {
  const [copiedLabel, setCopiedLabel] = useState("");

  const handleCopy = async (label, value) => {
    if (!value || !navigator?.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedLabel(label);
      window.setTimeout(() => {
        setCopiedLabel((current) => (current === label ? "" : current));
      }, 1500);
    } catch {
      setCopiedLabel("");
    }
  };

  if (!config?.items?.length) return null;
  return (
    <div
      className={`rounded-xl border p-4 ${
        darkMode ? "border-stone-700 bg-stone-900" : "border-stone-200 bg-white"
      }`}
    >
      <p className={`text-sm font-semibold ${darkMode ? "text-stone-100" : "text-stone-900"}`}>{config.title}</p>
      <div className="mt-3 space-y-2">
        {config.items.map((item) => (
          <div
            key={item.label}
            className={`rounded-lg border px-3 py-3 ${
              darkMode ? "border-stone-700 bg-stone-800" : "border-stone-200 bg-stone-50"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${darkMode ? "text-stone-400" : "text-stone-500"}`}>
                {item.label}
              </p>
              {item.copyValue ? (
                <button
                  type="button"
                  onClick={() => handleCopy(item.label, item.copyValue)}
                  className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                    darkMode
                      ? "border-stone-600 bg-stone-900 text-stone-200 hover:border-stone-400"
                      : "border-stone-300 bg-white text-stone-700 hover:border-stone-500"
                  }`}
                >
                  {copiedLabel === item.label ? "Copied" : "Copy"}
                </button>
              ) : null}
            </div>
            <p className={`mt-2 text-sm font-medium break-all ${darkMode ? "text-stone-100" : "text-stone-900"}`}>{item.value}</p>
            <p className={`mt-1 text-xs leading-5 ${darkMode ? "text-stone-400" : "text-stone-500"}`}>{item.helper}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ShortcutActionsCard({ shortcuts = [], darkMode }) {
  const [copiedLabel, setCopiedLabel] = useState("");

  const handleCopy = async (label, value) => {
    if (!value || !navigator?.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedLabel(label);
      window.setTimeout(() => {
        setCopiedLabel((current) => (current === label ? "" : current));
      }, 1500);
    } catch {
      setCopiedLabel("");
    }
  };

  if (!shortcuts.length) return null;
  return (
    <div
      className={`rounded-xl border p-4 ${
        darkMode ? "border-stone-700 bg-stone-900" : "border-stone-200 bg-white"
      }`}
    >
      <p className={`text-sm font-semibold ${darkMode ? "text-stone-100" : "text-stone-900"}`}>Setup shortcuts</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {shortcuts.map((shortcut) =>
          shortcut.href ? (
            <a
              key={shortcut.label}
              href={shortcut.href}
              target={shortcut.external ? "_blank" : undefined}
              rel={shortcut.external ? "noreferrer" : undefined}
              className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${
                darkMode
                  ? "border-stone-600 bg-stone-800 text-stone-100 hover:border-stone-400"
                  : "border-stone-300 bg-stone-50 text-stone-800 hover:border-stone-500"
              }`}
            >
              {shortcut.label}
            </a>
          ) : (
            <button
              key={shortcut.label}
              type="button"
              onClick={() => handleCopy(shortcut.label, shortcut.copyValue)}
              className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${
                darkMode
                  ? "border-stone-600 bg-stone-800 text-stone-100 hover:border-stone-400"
                  : "border-stone-300 bg-stone-50 text-stone-800 hover:border-stone-500"
              }`}
            >
              {copiedLabel === shortcut.label ? "Copied" : shortcut.label}
            </button>
          )
        )}
      </div>
    </div>
  );
}

function GuideList({ title, items, darkMode }) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        darkMode ? "border-stone-700 bg-stone-900" : "border-stone-200 bg-white"
      }`}
    >
      <p className={`text-sm font-semibold ${darkMode ? "text-stone-100" : "text-stone-900"}`}>{title}</p>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div key={item} className="flex items-start gap-2">
            <span className={`mt-1 inline-flex h-2.5 w-2.5 rounded-full ${darkMode ? "bg-stone-500" : "bg-stone-400"}`} />
            <p className={`text-sm leading-6 ${darkMode ? "text-stone-300" : "text-stone-600"}`}>{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function JiraConfig({ value, onChange, darkMode }) {
  return (
    <div className="space-y-5">
      <Field label="Site URL" hint="Example: https://your-team.atlassian.net" darkMode={darkMode}>
        <TextInput
          id="jira-site-url"
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
            id="jira-email"
            darkMode={darkMode}
            type="email"
            value={value.email}
            placeholder="name@company.com"
            onChange={(e) => onChange((prev) => ({ ...prev, email: e.target.value }))}
          />
        </Field>
        <Field label="API Token" darkMode={darkMode}>
          <TextInput
            id="jira-api-token"
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
