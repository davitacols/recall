import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import GitHubIntegrationWorkspace from "../components/integrations/GitHubIntegrationWorkspace";
import api from "../services/api";
import { useTheme } from "../utils/ThemeAndAccessibility";

const PROVIDERS = [
  {
    key: "github",
    name: "GitHub",
    category: "Engineering",
    desc: "Link PRs to decisions and track implementation flow.",
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

function buildTestGuidance(providerKey, passed, form, status, errorText = "") {
  if (providerKey === "slack") {
    return passed
      ? {
          state: "success",
          title: "Slack test reached the integration",
          detail: "Confirm the message landed in the expected Slack channel, then keep the alert scope tight so the signal stays useful.",
          tips: [
            "Look for the test post in the destination channel immediately after running Test.",
            "If it reached the wrong place, adjust the selected channel or webhook source before enabling more alert types.",
            "After the test passes, try one live decision or blocker event and confirm the format looks right in Slack.",
          ],
        }
      : {
          state: "error",
          title: "Slack test did not complete",
          detail: errorText || "Slack could not validate the current webhook configuration.",
          tips: [
            "Re-copy the Incoming Webhook URL from Slack and paste it again without extra spaces.",
            "Make sure the Slack app still has an active webhook for the channel you want to use.",
            "Keep one or two alert types enabled first, then retest before widening the signal set.",
          ],
        };
  }

  if (providerKey === "github") {
    const processedCount = status?.webhook_observability?.recent_processed_count || 0;
    return passed
      ? {
          state: "success",
          title: "GitHub connection test passed",
          detail:
            processedCount > 0
              ? "Repository credentials are working and Knoledgr is already receiving real webhook traffic."
              : "Repository credentials are working. The next step is making sure the webhook is configured and starts delivering events.",
          tips: processedCount > 0
            ? [
                "Open the webhook delivery monitor and confirm the latest events show as processed.",
                "Use DECISION-123, RECALL-123, or #123 in PR titles or commits so code work links back automatically.",
                "If a later delivery fails, inspect the signature and event details before relying on the timeline.",
              ]
            : [
                "Open GitHub webhook settings and paste the payload URL, content type, events, and secret from Knoledgr.",
                "Trigger a test delivery or push a small commit so the delivery monitor has something real to inspect.",
                "If deliveries appear but stay failed, compare the saved webhook secret in GitHub with the one in Knoledgr.",
              ],
        }
      : {
          state: "error",
          title: "GitHub connection test failed",
          detail: errorText || "Knoledgr could not validate the current GitHub repository credentials.",
          tips: [
            "Check that the access token has repository read access and belongs to an account that can see the repo.",
            "Verify the repository owner and repository name exactly match GitHub.",
            "If the repo is correct but tests still fail, generate a fresh token and paste it again before retesting.",
          ],
        };
  }

  return passed
    ? {
        state: "success",
        title: "Jira connection test passed",
        detail: "Jira authentication succeeded. The next step is validating one real issue flow so the integration is trustworthy in daily use.",
        tips: [
          "Open one real issue and confirm Jira data can refresh without errors.",
          "Decide whether auto-sync should stay on or off before more teams depend on the integration.",
          "If this workspace spans multiple Jira projects, validate the highest-risk project first.",
        ],
      }
    : {
        state: "error",
        title: "Jira connection test failed",
        detail: errorText || "Knoledgr could not authenticate against the Jira site with the current credentials.",
        tips: [
          "Make sure the site URL is the root Atlassian URL, not a deep issue link.",
          "Use an Atlassian API token, not a password, and make sure it belongs to the same account as the email.",
          "Paste a fresh token if the current one may have been revoked or created in a different Atlassian account.",
        ],
      };
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
      title: "Connect GitHub in four clear steps",
      description:
        "Save the repo access, save the webhook secret, add the webhook in GitHub, then confirm one delivery lands in Knoledgr.",
      docHref: "/docs/integrations/github",
      docLabel: "Open GitHub guide",
      needs: [
        "A personal access token with repository read access.",
        "The exact repository owner and repository name.",
        "A webhook secret and repo admin access to add the webhook in GitHub.",
      ],
      steps: [
        {
          title: "Save a repository access token",
          detail:
            "Use a GitHub PAT with repo read access so Knoledgr can validate the repository and fetch activity.",
          done: Boolean(status?.configured) || hasText(form.access_token),
        },
        {
          title: "Save the repository owner and name",
          detail:
            "Enter the repository owner and repository name exactly as they appear in GitHub.",
          done: Boolean(status?.repo_slug) || repoConfigured,
        },
        {
          title: "Save the webhook secret",
          detail:
            "Use the same secret in GitHub and Knoledgr so incoming pull_request and push events can be verified safely.",
          done: Boolean(status?.has_webhook_secret) || hasText(form.webhook_secret),
        },
        {
          title: "Test the connection and confirm a delivery",
          detail:
            "Save the config, turn the integration on, run Test, then watch the Webhook Delivery Monitor for processed events.",
          done: Boolean(form.enabled || status?.enabled),
        },
      ],
      nextAction,
      fieldChecklist,
      setupValues: {
        title: "GitHub values to copy",
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
        "In GitHub webhook settings, subscribe to push and pull_request.",
        "Check the Webhook Delivery Monitor until the newest delivery shows as processed.",
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

export default function Integrations({ forceActive = null, focusedProvider = null }) {
  const { darkMode } = useTheme();
  const [active, setActive] = useState(forceActive || "github");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [flash, setFlash] = useState(null);
  const [testResults, setTestResults] = useState({});

  const [github, setGithub] = useState(null);
  const [githubForm, setGithubForm] = useState({
    access_token: "",
    repo_owner: "",
    repo_name: "",
    webhook_secret: "",
    auto_link_prs: true,
    enabled: false,
  });

  useEffect(() => {
    if (forceActive) {
      setActive(forceActive);
    }
  }, [forceActive]);

  useEffect(() => {
    fetchIntegrations();
  }, []);

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

  const byKey = { github };
  const formByKey = { github: githubForm };
  const connectedCount = useMemo(() => (github?.enabled ? 1 : 0), [github]);
  const activeProvider = PROVIDERS.find((p) => p.key === active);
  const activeData = byKey[active] || {};
  const activeForm = githubForm;
  const activeGuide = useMemo(
    () => buildIntegrationGuide(active, activeForm, activeData),
    [active, activeData, activeForm]
  );
  const activeTestResult = testResults[active] || null;
  const providerSummaries = useMemo(
    () =>
      PROVIDERS.map((provider) => {
        const guide = buildIntegrationGuide(provider.key, formByKey[provider.key], byKey[provider.key] || {});
        return {
          ...provider,
          connected: Boolean(byKey[provider.key]?.enabled),
          completedSteps: guide.steps.filter((step) => step.done).length,
          totalSteps: guide.steps.length,
          nextAction: guide.nextAction?.title || "Continue setup",
          statusLabel: guide.statusLabel || (byKey[provider.key]?.enabled ? "Connected" : "Setup in progress"),
          lastTest: testResults[provider.key] || null,
        };
      }),
    [githubForm, github, testResults]
  );
  const visibleProviderSummaries = useMemo(
    () => (focusedProvider ? providerSummaries.filter((provider) => provider.key === focusedProvider) : providerSummaries),
    [focusedProvider, providerSummaries]
  );
  const activeSummary = providerSummaries.find((provider) => provider.key === active) || null;
  const isFocusedGitHub = focusedProvider === "github";
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
  const connectionSetupIntro =
    "Use the GitHub setup flow below to save the repository, reveal the payload URL, and confirm one real webhook delivery.";
  const handleProviderSelect = (providerKey) => {
    setActive(providerKey);
  };

  const fetchIntegrations = async () => {
    setLoading(true);
    try {
      const g = await api.get("/api/integrations/fresh/github/config/");
      setGithub(g.data || null);
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
      setTestResults((prev) => ({
        ...prev,
        [active]: buildTestGuidance(active, true, activeForm, activeData),
      }));
    } catch (error) {
      const detail =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "";
      setFlash({
        type: "error",
        text: detail ? `${activeProvider?.name} test failed: ${detail}` : `${activeProvider?.name} test failed.`,
      });
      setTestResults((prev) => ({
        ...prev,
        [active]: buildTestGuidance(active, false, activeForm, activeData, detail),
      }));
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setFlash(null);
    try {
      const response = await api.post("/api/integrations/fresh/github/config/", githubForm);
      if (response?.data?.github) {
        setGithub(response.data.github);
      }
      await fetchIntegrations();
      setFlash({ type: "success", text: `${activeProvider?.name} settings saved.` });
    } catch (error) {
      const detail =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "";
      setFlash({
        type: "error",
        text: detail ? `${activeProvider?.name} save failed: ${detail}` : `Failed to save ${activeProvider?.name} settings.`,
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = () => {
    setGithubForm((prev) => ({ ...prev, enabled: !prev.enabled }));
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

  if (isFocusedGitHub) {
    const repoOwner = github?.repo_owner || githubForm.repo_owner;
    const repoName = github?.repo_name || githubForm.repo_name;
    const repoSlug =
      github?.repo_slug || (hasText(repoOwner) && hasText(repoName) ? `${repoOwner}/${repoName}` : null);
    const repoUrl = repoSlug ? `https://github.com/${repoSlug}` : null;
    const webhookSettingsUrl = repoUrl ? `${repoUrl}/settings/hooks` : null;
    const webhookObservability = github?.webhook_observability;
    const processedCount = webhookObservability?.recent_processed_count || 0;
    const failedCount = webhookObservability?.recent_failure_count || 0;
    const nextMoveLabel = activeGuide.nextAction?.title || "Finish the setup flow";
    const deliveryValue = processedCount
      ? `${processedCount} processed`
      : webhookObservability?.recent_deliveries?.length
        ? "Needs review"
        : "No deliveries yet";

    return (
      <div className="space-y-6">
        <section className={`${tone.hero} overflow-hidden`}>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
            <div className="space-y-5">
              <div>
                <p className={tone.heroEyebrow}>Engineering Integration</p>
                <h1 className={tone.heroTitle}>GitHub Workspace</h1>
                <p className={tone.heroText}>
                  Connect repository access, webhook delivery, and code-to-decision linking in one place so engineering signals stay anchored to real work.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {repoUrl ? (
                  <a
                    href={repoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${
                      darkMode
                        ? "border-stone-600 bg-stone-900 text-stone-100 hover:border-stone-400"
                        : "border-stone-300 bg-white text-stone-800 hover:border-stone-500"
                    }`}
                  >
                    Open repo
                  </a>
                ) : null}
                {webhookSettingsUrl ? (
                  <a
                    href={webhookSettingsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${
                      darkMode
                        ? "border-stone-600 bg-stone-900 text-stone-100 hover:border-stone-400"
                        : "border-stone-300 bg-white text-stone-800 hover:border-stone-500"
                    }`}
                  >
                    Webhook settings
                  </a>
                ) : null}
                <Link
                  to="/docs/integrations/github"
                  className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    darkMode
                      ? "border-stone-600 bg-stone-900 text-stone-100 hover:border-stone-400"
                      : "border-stone-300 bg-white text-stone-800 hover:border-stone-500"
                  }`}
                >
                  GitHub guide
                </Link>
              </div>
            </div>

            <div
              className={`rounded-[28px] border p-5 ${
                darkMode
                  ? "border-stone-700 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),_transparent_55%),linear-gradient(180deg,rgba(28,25,23,0.95),rgba(17,24,39,0.92))]"
                  : "border-white/70 bg-[radial-gradient(circle_at_top,_rgba(125,211,252,0.22),_transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.92),rgba(239,246,255,0.9))] shadow-[0_24px_60px_rgba(28,25,23,0.08)]"
              }`}
            >
              <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${darkMode ? "text-stone-400" : "text-stone-500"}`}>
                GitHub signal
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <SignalCard label="Repository" value={repoSlug || "Not saved"} darkMode={darkMode} />
                <SignalCard label="Connection" value={github?.enabled ? "Enabled" : "Setup in progress"} darkMode={darkMode} />
                <SignalCard label="Deliveries" value={deliveryValue} darkMode={darkMode} />
                <SignalCard label="Next step" value={nextMoveLabel} darkMode={darkMode} />
              </div>
              <div className="mt-5 space-y-2">
                {[activeGuide.nextAction?.detail, activeTestResult?.detail, failedCount ? `${failedCount} recent delivery failure${failedCount === 1 ? "" : "s"} still need review.` : null]
                  .filter(Boolean)
                  .map((note) => (
                    <div
                      key={note}
                      className={`rounded-xl border px-3 py-3 text-sm ${
                        darkMode ? "border-stone-700 bg-stone-900/80 text-stone-200" : "border-stone-200 bg-white/90 text-stone-700"
                      }`}
                    >
                      {note}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </section>

        {flash ? (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              flash.type === "success"
                ? darkMode
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                  : "bg-emerald-50 border-emerald-200 text-emerald-800"
                : darkMode
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
                  : "bg-rose-50 border-rose-200 text-rose-700"
            }`}
          >
            {flash.text}
          </div>
        ) : null}

        {activeTestResult ? <TestResultCard testResult={activeTestResult} darkMode={darkMode} /> : null}

        <section className={tone.shellMain}>
          <div className={`flex flex-wrap items-end justify-between gap-4 border-b pb-4 ${darkMode ? "border-stone-700" : "border-stone-200"}`}>
            <div>
              <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${tone.muted}`}>GitHub workspace</p>
              <h3 className={`mt-1 text-lg font-bold ${tone.text}`}>Configure GitHub</h3>
            </div>
            <div className="flex flex-col items-start gap-3 sm:items-end">
              <p className={`max-w-xl text-sm ${tone.subtext}`}>
                Use the setup flow below to connect the repo, reveal the webhook payload URL, and validate one real delivery before relying on engineering signals.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setGithubForm((prev) => ({ ...prev, enabled: !prev.enabled }))}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold border ${
                    githubForm.enabled
                      ? darkMode
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                        : "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : darkMode
                        ? "border-stone-600 bg-stone-900 text-stone-200"
                        : "border-stone-300 bg-white text-stone-700"
                  }`}
                >
                  {githubForm.enabled ? "Disable" : "Enable"}
                </button>
                <button onClick={handleTest} disabled={testing} className={tone.testBtn}>
                  {testing ? "Testing..." : "Test"}
                </button>
                <button onClick={handleSave} disabled={saving} className={tone.saveBtn}>
                  {saving ? "Saving..." : "Save GitHub"}
                </button>
              </div>
            </div>
          </div>

          <GitHubConfig
            value={githubForm}
            status={github}
            onChange={setGithubForm}
            darkMode={darkMode}
            onSave={handleSave}
            saving={saving}
          />
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className={`${tone.hero} overflow-hidden`}>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
          <div className="space-y-5">
              <div>
                <p className={tone.heroEyebrow}>Integrations Hub</p>
                <h1 className={tone.heroTitle}>Connect GitHub without guesswork</h1>
                <p className={tone.heroText}>
                  Keep the integration layer focused on GitHub with clear credentials, exact webhook values to copy, validation steps, and live health checks.
                </p>
              </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <Stat label="Providers" value={`${visibleProviderSummaries.length}`} tone={tone} />
              <Stat label="Connected" value={`${connectedCount}`} tone={tone} />
              <Stat label="Ready Steps" value={`${providerSummaries.reduce((sum, provider) => sum + provider.completedSteps, 0)}`} tone={tone} />
            </div>
            <div className="grid gap-3 lg:grid-cols-3">
              {visibleProviderSummaries.map((provider) => (
                <button
                  key={provider.key}
                  type="button"
                  onClick={() => handleProviderSelect(provider.key)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    provider.key === active
                      ? darkMode
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-stone-900 bg-white shadow-[0_16px_40px_rgba(28,25,23,0.08)]"
                      : darkMode
                        ? "border-stone-700 bg-stone-900/70 hover:border-stone-500"
                        : "border-white/70 bg-white/80 hover:border-stone-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`text-sm font-semibold ${darkMode ? "text-stone-100" : "text-stone-900"}`}>{provider.name}</p>
                      <p className={`mt-1 text-xs uppercase tracking-[0.14em] ${darkMode ? "text-stone-400" : "text-stone-500"}`}>
                        {provider.category}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        provider.connected
                          ? darkMode
                            ? "bg-emerald-500/20 text-emerald-200"
                            : "bg-emerald-100 text-emerald-700"
                          : darkMode
                            ? "bg-stone-800 text-stone-300"
                            : "bg-stone-100 text-stone-600"
                      }`}
                    >
                      {provider.connected ? "Live" : "Needs setup"}
                    </span>
                  </div>
                  <p className={`mt-3 text-sm ${darkMode ? "text-stone-300" : "text-stone-600"}`}>{provider.desc}</p>
                  <div className={`mt-4 h-2 overflow-hidden rounded-full ${darkMode ? "bg-stone-800" : "bg-stone-200"}`}>
                    <div
                      className={`h-full rounded-full ${
                        provider.connected ? "bg-emerald-500" : darkMode ? "bg-stone-500" : "bg-stone-400"
                      }`}
                      style={{ width: `${(provider.completedSteps / provider.totalSteps) * 100}%` }}
                    />
                  </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className={`text-xs ${darkMode ? "text-stone-400" : "text-stone-500"}`}>
                        {provider.completedSteps}/{provider.totalSteps} steps ready
                      </p>
                      <p className={`text-xs font-medium ${darkMode ? "text-stone-300" : "text-stone-700"}`}>
                        {provider.key === "github" ? "Open workspace" : provider.lastTest ? provider.lastTest.title : provider.nextAction}
                      </p>
                    </div>
                  </button>
              ))}
            </div>
          </div>

          <div
            className={`rounded-[28px] border p-5 ${
              darkMode
                ? "border-stone-700 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.14),_transparent_55%),linear-gradient(180deg,rgba(28,25,23,0.95),rgba(17,24,39,0.92))]"
                : "border-white/70 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.22),_transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,251,235,0.9))] shadow-[0_24px_60px_rgba(28,25,23,0.08)]"
            }`}
            >
              <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${darkMode ? "text-stone-400" : "text-stone-500"}`}>
                Selected Integration
              </p>
              <h2 className={`mt-3 text-2xl font-black ${darkMode ? "text-stone-100" : "text-stone-900"}`}>
                {activeProvider?.name} setup
              </h2>
              <p className={`mt-2 text-sm leading-6 ${darkMode ? "text-stone-300" : "text-stone-600"}`}>
                {activeGuide.nextAction?.detail || activeProvider?.desc}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <SignalCard
                label="Connection State"
                value={activeSummary?.connected ? "Connected" : "Setup in progress"}
                darkMode={darkMode}
              />
              <SignalCard
                label="Setup Progress"
                value={`${activeSummary?.completedSteps || 0}/${activeSummary?.totalSteps || 0} steps`}
                darkMode={darkMode}
              />
              <SignalCard
                label="Latest Test"
                value={activeTestResult ? activeTestResult.title : "Not run yet"}
                darkMode={darkMode}
              />
              <SignalCard
                label="Next Move"
                value={activeGuide.nextAction?.title || "Review setup"}
                darkMode={darkMode}
              />
            </div>

            <div className="mt-5 space-y-2">
              <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${darkMode ? "text-stone-400" : "text-stone-500"}`}>
                What To Do Next
              </p>
              {[
                activeGuide.nextAction?.detail || "Use the assistant to finish the next missing step.",
                activeTestResult?.detail || "Run Test after saving to turn configuration into validated setup.",
                activeGuide.verification?.[0] || "Verify at least one real workflow before calling the integration ready.",
              ].map((note) => (
                <div
                  key={note}
                  className={`rounded-xl border px-3 py-3 text-sm ${
                    darkMode ? "border-stone-700 bg-stone-900/80 text-stone-200" : "border-stone-200 bg-white/90 text-stone-700"
                  }`}
                >
                  {note}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {flash ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            flash.type === "success"
              ? darkMode
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                : "bg-emerald-50 border-emerald-200 text-emerald-800"
              : darkMode
                ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
                : "bg-rose-50 border-rose-200 text-rose-700"
          }`}
        >
          {flash.text}
        </div>
      ) : null}

      <section className="grid gap-4 2xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className={tone.shellAside}>
            <p className={`px-3 pb-2 text-xs font-semibold uppercase tracking-wider ${tone.muted}`}>Git Integration</p>
            <div className="space-y-3">
              {visibleProviderSummaries.map((provider) => {
                const isActive = provider.key === active;
                return (
                  <button
                    key={provider.key}
                    type="button"
                    onClick={() => handleProviderSelect(provider.key)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      isActive
                        ? darkMode
                          ? "border-emerald-500 bg-emerald-500/10"
                          : "border-stone-900 bg-stone-900 text-white"
                        : darkMode
                          ? "border-stone-700 bg-stone-900 hover:border-stone-500"
                          : "border-stone-200 bg-white hover:border-stone-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className={`text-sm font-semibold ${isActive && !darkMode ? "text-white" : darkMode ? "text-stone-100" : "text-stone-900"}`}>
                          {provider.name}
                        </p>
                        <p className={`mt-1 text-[11px] uppercase tracking-[0.14em] ${isActive && !darkMode ? "text-stone-200" : darkMode ? "text-stone-400" : "text-stone-500"}`}>
                          {provider.category}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          provider.connected
                            ? isActive && !darkMode
                              ? "bg-white/15 text-white"
                              : darkMode
                                ? "bg-emerald-500/20 text-emerald-200"
                                : "bg-emerald-100 text-emerald-700"
                            : isActive && !darkMode
                              ? "bg-white/10 text-stone-100"
                              : darkMode
                                ? "bg-stone-800 text-stone-300"
                                : "bg-stone-100 text-stone-600"
                        }`}
                      >
                        {provider.connected ? "Live" : "Setup"}
                      </span>
                    </div>
                    <p className={`mt-3 text-sm ${isActive && !darkMode ? "text-stone-100" : darkMode ? "text-stone-300" : "text-stone-600"}`}>
                      {provider.desc}
                    </p>
                    <div className={`mt-4 h-2 overflow-hidden rounded-full ${darkMode ? "bg-stone-800" : isActive && !darkMode ? "bg-white/15" : "bg-stone-200"}`}>
                      <div
                        className={`h-full rounded-full ${provider.connected ? "bg-emerald-500" : isActive && !darkMode ? "bg-white" : darkMode ? "bg-stone-500" : "bg-stone-400"}`}
                        style={{ width: `${(provider.completedSteps / provider.totalSteps) * 100}%` }}
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className={`text-xs ${isActive && !darkMode ? "text-stone-200" : darkMode ? "text-stone-400" : "text-stone-500"}`}>
                        {provider.completedSteps}/{provider.totalSteps} steps ready
                      </p>
                      <p className={`text-xs font-medium ${isActive && !darkMode ? "text-white" : darkMode ? "text-stone-200" : "text-stone-700"}`}>
                        {provider.key === "github" ? "Open workspace" : provider.lastTest ? (provider.lastTest.state === "success" ? "Test passed" : "Needs attention") : "Not tested"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={tone.shellAside}>
            <p className={`px-3 pb-2 text-xs font-semibold uppercase tracking-wider ${tone.muted}`}>Setup Rules</p>
            <div className="space-y-2">
              {[
                "Save credentials or URLs before running the first validation test.",
                "Use the assistant to finish the next missing step instead of filling everything blindly.",
                "Enable a provider only after the test passes and one real workflow looks correct.",
              ].map((note) => (
                <div
                  key={note}
                  className={`rounded-xl border px-3 py-3 text-sm ${
                    darkMode ? "border-stone-700 bg-stone-900 text-stone-300" : "border-stone-200 bg-stone-50 text-stone-700"
                  }`}
                >
                  {note}
                </div>
              ))}
            </div>
          </div>

          <div className={tone.shellAside}>
            <p className={`px-3 pb-2 text-xs font-semibold uppercase tracking-wider ${tone.muted}`}>Current Signal</p>
            <div className="grid gap-3">
              <SignalCard
                label="Active Provider"
                value={activeProvider?.name || "-"}
                darkMode={darkMode}
              />
              <SignalCard
                label="Status"
                value={activeSummary?.statusLabel || "Review setup"}
                darkMode={darkMode}
              />
              <SignalCard
                label="Latest Test"
                value={activeTestResult ? activeTestResult.title : "Not run yet"}
                darkMode={darkMode}
              />
            </div>
          </div>
        </aside>

        <div className="space-y-4">
          <section className={tone.shellMain}>
            <div
              className={`rounded-[24px] border p-5 ${
                darkMode
                  ? "border-stone-700 bg-[linear-gradient(135deg,rgba(31,41,55,0.75),rgba(17,24,39,0.88))]"
                  : "border-stone-200 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(250,245,237,0.96))]"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className={`text-xs uppercase tracking-widest ${tone.muted}`}>{activeProvider?.category}</p>
                  <h2 className={`mt-1 text-2xl font-black ${tone.text}`}>{activeProvider?.name} setup</h2>
                  <p className={`mt-2 max-w-3xl text-sm leading-6 ${tone.subtext}`}>{activeProvider?.desc}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleEnabled}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold border ${
                      activeData?.enabled
                        ? darkMode
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                          : "border-emerald-300 bg-emerald-50 text-emerald-700"
                        : darkMode
                          ? "border-stone-600 bg-stone-900 text-stone-200"
                          : "border-stone-300 bg-white text-stone-700"
                    }`}
                  >
                    {activeData?.enabled ? "Disable" : "Enable"}
                  </button>
                  <button onClick={handleTest} disabled={testing} className={tone.testBtn}>
                    {testing ? "Testing..." : "Test"}
                  </button>
                  <button onClick={handleSave} disabled={saving} className={tone.saveBtn}>
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <SignalCard
                  label="Setup Progress"
                  value={`${activeSummary?.completedSteps || 0}/${activeSummary?.totalSteps || 0} steps`}
                  darkMode={darkMode}
                />
                <SignalCard
                  label="Connection"
                  value={activeSummary?.connected ? "Connected" : "Not connected"}
                  darkMode={darkMode}
                />
                <SignalCard
                  label="Latest Test"
                  value={activeTestResult ? activeTestResult.title : "Not run yet"}
                  darkMode={darkMode}
                />
                <SignalCard
                  label="Next Step"
                  value={activeGuide.nextAction?.title || "Review setup"}
                  darkMode={darkMode}
                />
              </div>
            </div>
          </section>

          <IntegrationAssistant
            providerName={activeProvider?.name}
            guide={activeGuide}
            darkMode={darkMode}
            testResult={activeTestResult}
          />

          <section className={tone.shellMain}>
            <div className={`flex flex-wrap items-end justify-between gap-4 border-b pb-4 ${darkMode ? "border-stone-700" : "border-stone-200"}`}>
              <div>
                <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${tone.muted}`}>Setup</p>
                <h3 className={`mt-1 text-lg font-bold ${tone.text}`}>Configure {activeProvider?.name}</h3>
              </div>
              <div className="flex flex-col items-start gap-3 sm:items-end">
                <p className={`max-w-xl text-sm ${tone.subtext}`}>
                  {connectionSetupIntro}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={handleTest} disabled={testing} className={tone.testBtn}>
                    {testing ? "Testing..." : "Test"}
                  </button>
                  <button onClick={handleSave} disabled={saving} className={tone.saveBtn}>
                    {saving ? "Saving..." : `Save ${activeProvider?.name}`}
                  </button>
                </div>
              </div>
            </div>

            <GitHubIntegrationWorkspace
              value={githubForm}
              status={github}
              onChange={setGithubForm}
              darkMode={darkMode}
              onSave={handleSave}
              saving={saving}
            />
          </section>
        </div>
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

function GitHubConfig() {
  return null;
  /*
  const readiness = status?.webhook_readiness;
  const observability = status?.webhook_observability;
  const repoOwner = status?.repo_owner || value.repo_owner;
  const repoName = status?.repo_name || value.repo_name;
  const repoSlug =
    status?.repo_slug || (hasText(repoOwner) && hasText(repoName) ? `${repoOwner}/${repoName}` : null);
  const repoUrl = repoSlug ? `https://github.com/${repoSlug}` : null;
  const webhookUrl = readiness?.webhook_url || null;
  const webhookSettingsUrl = repoUrl ? `${repoUrl}/settings/hooks` : null;
  const deliveries = observability?.recent_deliveries || [];
  const recentActivity = status?.recent_activity || [];
  const hasToken = Boolean(status?.configured) || hasText(value.access_token);
  const hasRepoTarget = Boolean(repoSlug);
  const hasSecret = Boolean(status?.has_webhook_secret) || hasText(value.webhook_secret);
  const hasWebhookReady = Boolean(webhookUrl);
  const hasDeliveries = Boolean(observability?.last_delivery_at || deliveries.length);
  const processedCount = observability?.recent_processed_count || 0;
  const ignoredCount = observability?.recent_ignored_count || 0;
  const failedCount = observability?.recent_failure_count || 0;
  const connectionReady = hasToken && hasRepoTarget;
  const canOperate = Boolean(hasWebhookReady || hasDeliveries || recentActivity.length);
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
  const overviewShell = darkMode
    ? "rounded-[18px] border border-stone-700 bg-stone-900/90 p-5"
    : "rounded-[18px] border border-stone-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.05)]";
  const surfaceTone = darkMode
    ? "rounded-[14px] border border-stone-700 bg-stone-950/70"
    : "rounded-[14px] border border-stone-200 bg-stone-50/60";
  const [repoReference, setRepoReference] = useState(repoSlug || "");

  useEffect(() => {
    if (repoSlug) {
      setRepoReference(repoSlug);
    }
  }, [repoSlug]);

  const parsedRepoReference = parseGitHubRepositoryInput(repoReference);
  const setupSteps = [
    {
      step: "Step 1",
      title: "Choose the repository",
      detail: hasRepoTarget
        ? `Knoledgr is pointed at ${repoSlug}.`
        : "Paste a GitHub URL or owner/repo, confirm the token, then save.",
      state: hasToken && hasRepoTarget ? "Ready" : "Needs input",
      tone: hasToken && hasRepoTarget ? "sky" : "slate",
    },
    {
      step: "Step 2",
      title: "Save one shared webhook secret",
      detail: hasSecret
        ? "Use the same secret in GitHub and Knoledgr so deliveries can be verified."
        : "Add the webhook secret here first, then reuse that exact same value in GitHub.",
      state: hasSecret ? "Ready" : "Missing secret",
      tone: hasSecret ? "emerald" : "amber",
    },
    {
      step: "Step 3",
      title: "Add the webhook in GitHub",
      detail: processedCount
        ? `${processedCount} recent GitHub deliveries have already been processed by Knoledgr.`
        : hasDeliveries
          ? "GitHub is sending traffic, but the latest deliveries still need review."
          : hasWebhookReady
            ? "Payload URL is ready. Add it in GitHub, subscribe to push and pull_request, then send one delivery."
            : "Save the repository and webhook secret first so Knoledgr can reveal the payload URL.",
      state: processedCount ? "Live" : hasDeliveries ? "Check deliveries" : hasWebhookReady ? "Ready in GitHub" : "Save first",
      tone: processedCount ? "emerald" : hasDeliveries ? "amber" : hasWebhookReady ? "sky" : "slate",
    },
  ];
  const nextActionTitle = !connectionReady
    ? "Save the repository target"
    : !hasSecret
      ? "Save the shared webhook secret"
      : !hasWebhookReady
        ? "Save once to reveal the payload URL"
        : !hasDeliveries
          ? "Create the webhook in GitHub and send one event"
          : failedCount > 0 || ignoredCount > 0
            ? "Review the newest webhook deliveries"
            : "GitHub is live";
  const nextActionDetail = !connectionReady
    ? "Paste a GitHub URL or owner/repo, confirm the PAT, then save so Knoledgr knows which repository to watch."
    : !hasSecret
      ? "Use one shared secret in Knoledgr and GitHub so deliveries can be verified safely."
      : !hasWebhookReady
        ? "Save the repository target and secret first. Knoledgr then reveals the exact payload URL GitHub should send to."
        : !hasDeliveries
          ? "Open GitHub webhook settings, paste the payload URL, keep application/json, subscribe to push plus pull_request, then trigger one test event."
          : failedCount > 0 || ignoredCount > 0
            ? "GitHub is reaching Knoledgr, but the latest deliveries still need review before this setup is trustworthy."
            : "The connection, webhook, and live delivery flow are all working.";
  const webhookValues = [
    {
      label: "Payload URL",
      value: webhookUrl || "Save the repository and secret first to reveal the payload URL",
      helper: "Paste this into the Payload URL field in GitHub.",
      copyValue: webhookUrl || null,
    },
    {
      label: "Where to add it",
      value: "GitHub -> Settings -> Webhooks -> Add webhook",
      helper: "Create the webhook on the same repository shown above.",
      copyValue: "GitHub -> Settings -> Webhooks -> Add webhook",
    },
    {
      label: "Content type",
      value: "application/json",
      helper: "Use JSON so Knoledgr can parse the delivery cleanly.",
      copyValue: "application/json",
    },
    {
      label: "Events",
      value: "push, pull_request",
      helper: "These events power commit, pull request, and delivery updates.",
      copyValue: "push,pull_request",
    },
    {
      label: "Secret",
      value: hasSecret ? "Use the same webhook secret saved in Knoledgr" : "Add the webhook secret here before creating the GitHub webhook",
      helper: "The GitHub webhook secret must match Knoledgr exactly.",
    },
    {
      label: "Linking format",
      value: "DECISION-123, RECALL-123, or #123",
      helper: "Use one of these patterns in PR titles, branches, or commits for automatic linking.",
      copyValue: "DECISION-123, RECALL-123, #123",
    },
  ];

  const applyParsedRepoReference = () => {
    if (!parsedRepoReference) return;
    onChange((prev) => ({
      ...prev,
      repo_owner: parsedRepoReference.owner,
      repo_name: parsedRepoReference.repo,
    }));
  };

  return (
    <div className="space-y-4">
      <section className={overviewShell}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${darkMode ? "text-stone-400" : "text-stone-500"}`}>
              GitHub setup
            </p>
            <h3 className={`mt-2 text-2xl font-bold ${darkMode ? "text-stone-100" : "text-stone-900"}`}>
              Connect one repository, reveal the webhook, then confirm live delivery traffic
            </h3>
            <p className={`mt-3 text-sm leading-6 ${darkMode ? "text-stone-300" : "text-stone-600"}`}>
              The setup flow is now simple: choose the repository, save one shared webhook secret, copy the exact values into GitHub,
              and wait for one real push or pull request delivery to land in Knoledgr.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {repoUrl ? (
              <a
                href={repoUrl}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  darkMode
                    ? "border-stone-600 bg-stone-950 text-stone-100 hover:border-stone-400"
                    : "border-stone-300 bg-white text-stone-800 hover:border-stone-500"
                }`}
              >
                Open repo
              </a>
            ) : null}
            {webhookSettingsUrl ? (
              <a
                href={webhookSettingsUrl}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  darkMode
                    ? "border-stone-600 bg-stone-950 text-stone-100 hover:border-stone-400"
                    : "border-stone-300 bg-white text-stone-800 hover:border-stone-500"
                }`}
              >
                Webhook settings
              </a>
            ) : null}
            {webhookUrl ? <CopyShortcutButton label="Copy webhook URL" value={webhookUrl} darkMode={darkMode} /> : null}
            <Link
              to="/docs/integrations/github"
              className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${
                darkMode
                  ? "border-stone-600 bg-stone-950 text-stone-100 hover:border-stone-400"
                  : "border-stone-300 bg-white text-stone-800 hover:border-stone-500"
              }`}
            >
                GitHub guide
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {setupSteps.map((step) => (
            <GitHubStepCard
              key={step.title}
              step={step.step}
              title={step.title}
              detail={step.detail}
              state={step.state}
              tone={step.tone}
              darkMode={darkMode}
            />
          ))}
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)]">
          <div className={`${surfaceTone} px-4 py-4`}>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${darkMode ? "text-sky-300/80" : "text-sky-700"}`}>
              Next move
            </p>
            <p className={`mt-2 text-base font-semibold ${darkMode ? "text-stone-100" : "text-stone-900"}`}>{nextActionTitle}</p>
            <p className={`mt-2 text-sm leading-6 ${darkMode ? "text-stone-300" : "text-stone-600"}`}>{nextActionDetail}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <StatusPill label="Repository" value={repoSlug || "Not saved yet"} tone={hasRepoTarget ? "sky" : "slate"} darkMode={darkMode} />
              <StatusPill label="Secret" value={hasSecret ? "Ready" : "Missing"} tone={hasSecret ? "emerald" : "amber"} darkMode={darkMode} />
              <StatusPill label="Webhook" value={hasWebhookReady ? "Ready to copy" : "Save first"} tone={hasWebhookReady ? "sky" : "slate"} darkMode={darkMode} />
            </div>
          </div>
          <div className={`rounded-[14px] border p-4 ${readinessTone}`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-80">Current readiness</p>
            <p className="mt-2 text-base font-semibold">{readiness?.label || "Finish the saved setup before GitHub can send events"}</p>
            <p className="mt-2 text-sm leading-6">
              {readiness?.detail ||
                "Save the repository and webhook secret first. Then paste the payload URL into GitHub, use application/json, and subscribe to push plus pull_request."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {webhookUrl ? <CopyShortcutButton label="Copy payload URL" value={webhookUrl} darkMode={darkMode} /> : null}
              {webhookSettingsUrl ? (
                <a
                  href={webhookSettingsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    darkMode
                      ? "border-stone-600 bg-stone-950 text-stone-100 hover:border-stone-400"
                      : "border-stone-300 bg-white text-stone-800 hover:border-stone-500"
                  }`}
                >
                  Open webhook settings
                </a>
              ) : null}
              <StatusPill label="Processed" value={processedCount} tone={processedCount > 0 ? "emerald" : "slate"} darkMode={darkMode} />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
        <div className="space-y-4">
          <GitHubPanel
            eyebrow="Step 1"
            title="Choose the repository"
            description="Paste a GitHub URL or owner/repo first, then confirm the access token. This keeps the setup anchored on one exact repository."
            darkMode={darkMode}
          >
            <div className="flex flex-wrap gap-2">
              <StatusPill
                label="Token"
                value={status?.configured ? "Stored" : hasText(value.access_token) ? "Ready to save" : "Missing"}
                tone={hasToken ? "sky" : "slate"}
                darkMode={darkMode}
              />
              <StatusPill label="Repository" value={repoSlug || "Missing"} tone={hasRepoTarget ? "sky" : "slate"} darkMode={darkMode} />
            </div>
            <Field
              label="Repository URL or owner/repo"
              hint="Paste https://github.com/owner/repo or owner/repo and Knoledgr will split it for you."
              darkMode={darkMode}
            >
              <ClipboardInput
                id="github-repo-reference"
                darkMode={darkMode}
                value={repoReference}
                placeholder="https://github.com/acme/platform-api or acme/platform-api"
                pasteLabel="Paste repo"
                onPasteValue={(pasted) => setRepoReference(pasted)}
                onChange={(e) => setRepoReference(e.target.value)}
              />
            </Field>
            <div className={`${surfaceTone} px-4 py-4`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="max-w-2xl">
                  <p className={`text-sm font-semibold ${darkMode ? "text-stone-100" : "text-stone-900"}`}>Repository target preview</p>
                  <p className={`mt-1 text-sm leading-6 ${darkMode ? "text-stone-300" : "text-stone-600"}`}>
                    {parsedRepoReference
                      ? `Ready to use ${parsedRepoReference.slug}. Apply it below if the repository fields do not already match.`
                      : "Paste a full GitHub URL or owner/repo here to avoid manually splitting the repository."}
                  </p>
                </div>
                {parsedRepoReference ? (
                  <button
                    type="button"
                    onClick={applyParsedRepoReference}
                    className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${
                      darkMode
                        ? "border-stone-600 bg-stone-900 text-stone-100 hover:border-stone-400"
                        : "border-stone-300 bg-white text-stone-800 hover:border-stone-500"
                    }`}
                  >
                    Use {parsedRepoReference.slug}
                  </button>
                ) : null}
              </div>
            </div>
            <Field label="Access Token" hint="Use a PAT with repo read access." darkMode={darkMode}>
              <ClipboardInput
                id="github-access-token"
                darkMode={darkMode}
                type="password"
                value={value.access_token}
                placeholder="ghp_..."
                pasteLabel="Paste token"
                onPasteValue={(pasted) => onChange((prev) => ({ ...prev, access_token: pasted }))}
                onChange={(e) => onChange((prev) => ({ ...prev, access_token: e.target.value }))}
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Repository Owner" darkMode={darkMode}>
                <ClipboardInput
                  id="github-repo-owner"
                  darkMode={darkMode}
                  value={value.repo_owner}
                  placeholder="org-or-user"
                  pasteLabel="Paste owner"
                  onPasteValue={(pasted) => onChange((prev) => ({ ...prev, repo_owner: pasted }))}
                  onChange={(e) => onChange((prev) => ({ ...prev, repo_owner: e.target.value }))}
                />
              </Field>
              <Field label="Repository Name" darkMode={darkMode}>
                <ClipboardInput
                  id="github-repo-name"
                  darkMode={darkMode}
                  value={value.repo_name}
                  placeholder="repo-name"
                  pasteLabel="Paste repo"
                  onPasteValue={(pasted) => onChange((prev) => ({ ...prev, repo_name: pasted }))}
                  onChange={(e) => onChange((prev) => ({ ...prev, repo_name: e.target.value }))}
                />
              </Field>
            </div>
            <div className={`${surfaceTone} px-4 py-3 text-sm ${darkMode ? "text-stone-300" : "text-stone-700"}`}>
              Save after filling these fields. Once Knoledgr knows which repository to watch, the exact webhook payload URL appears in the next step.
            </div>
          </GitHubPanel>

          <GitHubPanel
            eyebrow="Step 2"
            title="Save one shared webhook secret"
            description="Use one secret in Knoledgr and GitHub. That single shared value is what keeps incoming push and pull_request deliveries verifiable."
            darkMode={darkMode}
            action={
              webhookSettingsUrl ? (
                <a
                  href={webhookSettingsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    darkMode
                      ? "border-stone-600 bg-stone-950 text-stone-100 hover:border-stone-400"
                      : "border-stone-300 bg-white text-stone-800 hover:border-stone-500"
                  }`}
                >
                  Open webhook settings
                </a>
              ) : null
            }
          >
            <div className="flex flex-wrap gap-2">
              <StatusPill
                label="Secret"
                value={status?.has_webhook_secret ? "Stored" : hasText(value.webhook_secret) ? "Ready to save" : "Missing"}
                tone={hasSecret ? "emerald" : "amber"}
                darkMode={darkMode}
              />
              <StatusPill label="Auto-link" value={value.auto_link_prs ? "On" : "Off"} tone={value.auto_link_prs ? "sky" : "slate"} darkMode={darkMode} />
            </div>
            <Field
              label="Webhook Secret"
              hint="Use the same secret in GitHub so pull_request and push events can be verified."
              darkMode={darkMode}
            >
              <ClipboardInput
                id="github-webhook-secret"
                darkMode={darkMode}
                type="password"
                value={value.webhook_secret}
                placeholder={status?.has_webhook_secret ? "Webhook secret already configured" : "Add webhook secret"}
                pasteLabel="Paste secret"
                onPasteValue={(pasted) => onChange((prev) => ({ ...prev, webhook_secret: pasted }))}
                onChange={(e) => onChange((prev) => ({ ...prev, webhook_secret: e.target.value }))}
              />
            </Field>
            <Check
              checked={value.auto_link_prs}
              onChange={(e) => onChange((prev) => ({ ...prev, auto_link_prs: e.target.checked }))}
              label="Auto-link pull requests to decisions"
              darkMode={darkMode}
            />
            {!webhookUrl ? (
              <div
                className={`rounded-[14px] border px-4 py-4 ${
                  darkMode ? "border-amber-500/30 bg-amber-500/10 text-amber-100" : "border-amber-200 bg-amber-50 text-amber-900"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="max-w-2xl">
                    <p className="text-sm font-semibold">Payload URL appears after you save</p>
                    <p className={`mt-1 text-sm leading-6 ${darkMode ? "text-amber-100/90" : "text-amber-900/80"}`}>
                      Save the repository target and webhook secret first. Knoledgr then reveals the exact payload URL GitHub should send to.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onSave}
                    disabled={saving}
                    className={`inline-flex rounded-full border px-4 py-2 text-xs font-semibold ${
                      darkMode
                        ? "border-amber-300/40 bg-stone-950 text-amber-100 hover:border-amber-200 disabled:opacity-60"
                        : "border-amber-300 bg-white text-amber-900 hover:border-amber-400 disabled:opacity-60"
                    }`}
                  >
                    {saving ? "Saving..." : "Save GitHub setup"}
                  </button>
                </div>
              </div>
            ) : null}
          </GitHubPanel>
        </div>

        <div className="space-y-4">
          <GitHubPanel
            eyebrow="Step 3"
            title="Copy these exact GitHub values"
            description="After the repository target and secret are saved, copy these values into GitHub exactly as shown."
            darkMode={darkMode}
            action={
              webhookUrl ? <CopyShortcutButton label="Copy payload URL" value={webhookUrl} darkMode={darkMode} /> : null
            }
          >
            {!webhookUrl ? (
              <GitHubEmptyCard
                title="Payload URL appears after you save"
                description="Save the repository target and webhook secret first. Knoledgr will then reveal the exact payload URL GitHub should send to."
                darkMode={darkMode}
              />
            ) : null}
            <div className="grid gap-3">
              {webhookValues.map((item) => (
                <GitHubValueRow
                  key={item.label}
                  label={item.label}
                  value={item.value}
                  helper={item.helper}
                  copyValue={item.copyValue || null}
                  darkMode={darkMode}
                />
              ))}
            </div>
          </GitHubPanel>

          <GitHubPanel
            eyebrow="Validation"
            title="Webhook deliveries"
            description="Use this monitor to confirm that GitHub is actually reaching Knoledgr after you add the webhook."
            darkMode={darkMode}
            action={
              <div className="flex gap-2 flex-wrap">
                <StatusPill label="Processed" value={processedCount} tone="emerald" darkMode={darkMode} />
                <StatusPill label="Ignored" value={ignoredCount} tone="amber" darkMode={darkMode} />
                <StatusPill label="Failed" value={failedCount} tone="rose" darkMode={darkMode} />
              </div>
            }
          >
            {deliveries.length ? (
              <div className="space-y-2">
                {deliveries.slice(0, 5).map((delivery) => (
                  <GitHubDeliveryRow key={delivery.id} delivery={delivery} darkMode={darkMode} />
                ))}
              </div>
            ) : (
              <GitHubEmptyCard
                title="No webhook deliveries yet"
                description="After you add the GitHub webhook and trigger a push or pull request event, Knoledgr will show the newest deliveries here."
                darkMode={darkMode}
              />
            )}
          </GitHubPanel>
        </div>
      </div>

      <GitHubPanel
        eyebrow="After setup"
        title="Use the connected repository"
        description="These tools matter after the connection is in place. Knoledgr keeps them below the setup flow so they stop competing with the initial rollout."
        darkMode={darkMode}
      >
        {canOperate ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <GitHubPanel
              eyebrow="Decision links"
              title="Link pull requests to decision records"
              description="Search the connected repository, review the candidate list, and attach the cleanest implementation record to the right decision."
              darkMode={darkMode}
            >
              <GitHubDecisionLinker enabled={value.enabled} darkMode={darkMode} repoSlug={repoSlug} />
            </GitHubPanel>

            <GitHubPanel
              eyebrow="Repository activity"
              title="Recent repository activity"
              description="Use recent pull requests and commits to confirm the connection is seeing real engineering work."
              darkMode={darkMode}
            >
              {recentActivity.length ? (
                <div className="space-y-2">
                  {recentActivity.slice(0, 5).map((item, index) => (
                    <GitHubActivityRow key={`${item.type}-${item.url || index}`} item={item} darkMode={darkMode} />
                  ))}
                </div>
              ) : (
                <GitHubEmptyCard
                  title="No recent activity yet"
                  description="Once the repository is connected and GitHub starts sending traffic, pull requests and commits will appear here."
                  darkMode={darkMode}
                />
              )}
            </GitHubPanel>
          </div>
        ) : (
          <GitHubEmptyCard
            title="Finish the connection first"
            description="Advanced GitHub tools appear here after the repository target is saved and Knoledgr can start observing real repo traffic."
            darkMode={darkMode}
          />
        )}
      </GitHubPanel>
    </div>
  );
  */
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

function IntegrationAssistant({ providerName, guide, darkMode, testResult }) {
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
          {testResult ? <TestResultCard testResult={testResult} darkMode={darkMode} /> : null}
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

function TestResultCard({ testResult, darkMode }) {
  const tone =
    testResult.state === "success"
      ? darkMode
        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
        : "border-emerald-200 bg-emerald-50/80 text-emerald-800"
      : darkMode
        ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
        : "border-rose-200 bg-rose-50/80 text-rose-800";

  return (
    <div className={`rounded-xl border px-4 py-4 ${tone}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">Latest Test Result</p>
      <p className={`mt-2 text-sm font-semibold ${darkMode ? "text-stone-100" : "text-stone-900"}`}>{testResult.title}</p>
      <p className={`mt-1 text-sm leading-6 ${darkMode ? "text-stone-300" : "text-stone-700"}`}>{testResult.detail}</p>
      {testResult.tips?.length ? (
        <div className="mt-3 space-y-2">
          {testResult.tips.map((tip) => (
            <div key={tip} className="flex items-start gap-2">
              <span className={`mt-1 inline-flex h-2.5 w-2.5 rounded-full ${darkMode ? "bg-current/70" : "bg-current/60"}`} />
              <p className={`text-sm leading-6 ${darkMode ? "text-stone-200" : "text-stone-700"}`}>{tip}</p>
            </div>
          ))}
        </div>
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
