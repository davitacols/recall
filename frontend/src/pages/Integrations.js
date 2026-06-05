import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  GitBranch,
  RadioTower,
  ShieldCheck,
  Users,
} from "lucide-react";

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
  const totalReadySteps = providerSummaries.reduce((sum, provider) => sum + provider.completedSteps, 0);
  const totalSetupSteps = providerSummaries.reduce((sum, provider) => sum + provider.totalSteps, 0);
  const setupProgress = totalSetupSteps ? Math.round((totalReadySteps / totalSetupSteps) * 100) : 0;
  const repoOwner = github?.repo_owner || githubForm.repo_owner;
  const repoName = github?.repo_name || githubForm.repo_name;
  const repoSlug = github?.repo_slug || (hasText(repoOwner) && hasText(repoName) ? `${repoOwner}/${repoName}` : null);
  const webhookObservability = github?.webhook_observability;
  const processedCount = webhookObservability?.recent_processed_count || 0;
  const failedCount = webhookObservability?.recent_failure_count || 0;
  const deliveryState = processedCount
    ? `${processedCount} processed`
    : webhookObservability?.recent_deliveries?.length
      ? "Needs review"
      : "Waiting";
  const hubSignals = [
    {
      label: "Repository",
      value: repoSlug || "Choose repo",
      detail: "One trusted source of engineering truth",
      icon: GitBranch,
    },
    {
      label: "Webhook",
      value: deliveryState,
      detail: failedCount ? `${failedCount} recent failure${failedCount === 1 ? "" : "s"}` : "Push and PR events",
      icon: RadioTower,
    },
    {
      label: "Readiness",
      value: `${setupProgress}%`,
      detail: `${totalReadySteps}/${totalSetupSteps || 0} setup checks ready`,
      icon: ClipboardCheck,
    },
  ];
  const teamPaths = [
    {
      title: "Admin",
      detail: "Saves repo access and keeps credentials owned by the workspace.",
      done: Boolean(github?.configured) || hasText(githubForm.access_token),
      icon: ShieldCheck,
    },
    {
      title: "Repo owner",
      detail: "Adds the webhook once, then checks delivery health when events arrive.",
      done: Boolean(processedCount),
      icon: RadioTower,
    },
    {
      title: "Engineers",
      detail: "Use decision IDs in PRs and commits so work links itself.",
      done: Boolean(githubForm.auto_link_prs),
      icon: GitBranch,
    },
  ];
  const tone = useMemo(
    () =>
      darkMode
        ? {
            hero: "rounded-2xl border border-slate-700 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6",
            heroEyebrow: "text-xs font-semibold tracking-[0.16em] text-slate-400 uppercase",
            heroTitle: "mt-2 text-2xl md:text-3xl font-black text-slate-100",
            heroText: "mt-2 text-sm text-slate-300 max-w-2xl",
            card: "rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-center min-w-[95px]",
            cardValue: "text-lg font-bold text-slate-100",
            cardLabel: "text-[10px] tracking-wider uppercase text-slate-400",
            shellAside: "rounded-2xl border border-slate-700 bg-slate-900 p-3",
            shellMain: "space-y-4 rounded-2xl border border-slate-700 bg-slate-900 p-5",
            muted: "text-slate-400",
            text: "text-slate-100",
            subtext: "text-slate-300",
            testBtn: "rounded-lg border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-60",
            saveBtn: "rounded-lg border border-indigo-500 bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60",
          }
        : {
            hero: "rounded-2xl border border-slate-200 bg-gradient-to-r from-indigo-50 via-violet-50 to-indigo-50 p-6",
            heroEyebrow: "text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase",
            heroTitle: "mt-2 text-2xl md:text-3xl font-black text-slate-900",
            heroText: "mt-2 text-sm text-slate-600 max-w-2xl",
            card: "rounded-xl border border-slate-200 bg-white px-3 py-2 text-center min-w-[95px]",
            cardValue: "text-lg font-bold text-slate-900",
            cardLabel: "text-[10px] tracking-wider uppercase text-slate-500",
            shellAside: "rounded-2xl border border-slate-200 bg-white p-3",
            shellMain: "space-y-4 rounded-2xl border border-slate-200 bg-white p-5",
            muted: "text-slate-500",
            text: "text-slate-900",
            subtext: "text-slate-600",
            testBtn: "rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60",
            saveBtn: "rounded-lg border border-indigo-600 bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60",
          },
    [darkMode]
  );
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

  const handleConnectAndVerify = async () => {
    setSaving(true);
    setTesting(true);
    setFlash(null);
    try {
      const response = await api.post("/api/integrations/fresh/github/config/", githubForm);
      const nextGithub = response?.data?.github || github;
      if (response?.data?.github) {
        setGithub(response.data.github);
      }

      try {
        await api.post(`/api/integrations/test/${active}/`);
        setTestResults((prev) => ({
          ...prev,
          [active]: buildTestGuidance(active, true, activeForm, nextGithub),
        }));
        setFlash({ type: "success", text: `${activeProvider?.name} is connected and verified.` });
      } catch (testError) {
        const detail =
          testError?.response?.data?.detail ||
          testError?.response?.data?.message ||
          testError?.response?.data?.error ||
          "";
        setTestResults((prev) => ({
          ...prev,
          [active]: buildTestGuidance(active, false, activeForm, nextGithub, detail),
        }));
        setFlash({
          type: "error",
          text: detail
            ? `${activeProvider?.name} details were stored, but verification needs attention: ${detail}`
            : `${activeProvider?.name} details were stored, but verification needs attention.`,
        });
      }
    } catch (error) {
      const detail =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "";
      setFlash({
        type: "error",
        text: detail ? `${activeProvider?.name} connection failed: ${detail}` : `Failed to connect ${activeProvider?.name}.`,
      });
    } finally {
      setSaving(false);
      setTesting(false);
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
            darkMode ? "border-slate-500" : "border-slate-300"
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
                        ? "border-slate-600 bg-slate-900 text-slate-100 hover:border-slate-400"
                        : "border-slate-300 bg-white text-slate-800 hover:border-slate-500"
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
                        ? "border-slate-600 bg-slate-900 text-slate-100 hover:border-slate-400"
                        : "border-slate-300 bg-white text-slate-800 hover:border-slate-500"
                    }`}
                  >
                    Webhook settings
                  </a>
                ) : null}
                <Link
                  to="/docs/integrations/github"
                  className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    darkMode
                      ? "border-slate-600 bg-slate-900 text-slate-100 hover:border-slate-400"
                      : "border-slate-300 bg-white text-slate-800 hover:border-slate-500"
                  }`}
                >
                  GitHub guide
                </Link>
              </div>
            </div>

            <div
              className={`rounded-[28px] border p-5 ${
                darkMode
                  ? "border-slate-700 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),_transparent_55%),linear-gradient(180deg,rgba(28,25,23,0.95),rgba(17,24,39,0.92))]"
                  : "border-white/70 bg-[radial-gradient(circle_at_top,_rgba(125,211,252,0.22),_transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.92),rgba(239,246,255,0.9))] shadow-[0_24px_60px_rgba(28,25,23,0.08)]"
              }`}
            >
              <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
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
                        darkMode ? "border-slate-700 bg-slate-900/80 text-slate-200" : "border-slate-200 bg-white/90 text-slate-700"
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
          <GitHubConnectConsole
            value={githubForm}
            status={github}
            onChange={setGithubForm}
            darkMode={darkMode}
            onConnect={handleConnectAndVerify}
            onToggleEnabled={toggleEnabled}
            busy={saving || testing}
            activeSummary={activeSummary}
            setupProgress={setupProgress}
            deliveryState={deliveryValue}
            testResult={activeTestResult}
            guide={activeGuide}
          />
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className={`${tone.hero} overflow-hidden`}>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_420px]">
          <div className="space-y-6">
            <div>
              <p className={tone.heroEyebrow}>Integrations Hub</p>
              <h1 className={tone.heroTitle}>Team integrations that feel handled</h1>
              <p className={tone.heroText}>
                Connect GitHub once, validate the signal path, and give every team role a clear next move.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {hubSignals.map((signal) => (
                <SignalTile key={signal.label} signal={signal} darkMode={darkMode} />
              ))}
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              {teamPaths.map((path) => (
                <TeamPathTile key={path.title} item={path} darkMode={darkMode} />
              ))}
            </div>
          </div>

          <IntegrationMap
            darkMode={darkMode}
            setupProgress={setupProgress}
            connectedCount={connectedCount}
            providerCount={visibleProviderSummaries.length}
            activeProvider={activeProvider}
            activeSummary={activeSummary}
            activeTestResult={activeTestResult}
          />
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

      <section className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className={tone.shellAside}>
            <div className="flex items-center justify-between gap-3 px-2 pb-3">
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wider ${tone.muted}`}>Providers</p>
                <p className={`mt-1 text-sm ${tone.subtext}`}>Choose the signal source to configure.</p>
              </div>
              <span
                className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border ${
                  darkMode ? "border-slate-700 bg-slate-800 text-slate-200" : "border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                <Activity size={18} />
              </span>
            </div>
            <div className="space-y-3">
              {visibleProviderSummaries.map((provider) => (
                <ProviderSelectCard
                  key={provider.key}
                  provider={provider}
                  active={provider.key === active}
                  darkMode={darkMode}
                  onClick={() => handleProviderSelect(provider.key)}
                />
              ))}
            </div>
          </div>

          <div className={tone.shellAside}>
            <p className={`px-2 text-xs font-semibold uppercase tracking-wider ${tone.muted}`}>Rollout rhythm</p>
            <div className="mt-3 space-y-2">
              {[
                { label: "Configure", done: activeSummary?.completedSteps > 0 },
                { label: "Validate", done: Boolean(activeTestResult) || processedCount > 0 },
                { label: "Share with team", done: processedCount > 0 && Boolean(githubForm.auto_link_prs) },
              ].map((item, index) => (
                <div
                  key={item.label}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-3 ${
                    item.done
                      ? darkMode
                        ? "border-emerald-500/30 bg-emerald-500/10"
                        : "border-emerald-200 bg-emerald-50"
                      : darkMode
                        ? "border-slate-700 bg-slate-900"
                        : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <span
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      item.done
                        ? darkMode
                          ? "bg-emerald-500/20 text-emerald-200"
                          : "bg-emerald-100 text-emerald-700"
                        : darkMode
                          ? "bg-slate-800 text-slate-400"
                          : "bg-white text-slate-500"
                    }`}
                  >
                    {item.done ? <CheckCircle2 size={15} /> : index + 1}
                  </span>
                  <p className={`text-sm font-semibold ${darkMode ? "text-slate-100" : "text-slate-900"}`}>{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <div className="space-y-4">
          <section className={tone.shellMain}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${tone.muted}`}>{activeProvider?.category}</p>
                <h2 className={`mt-1 text-2xl font-black ${tone.text}`}>{activeProvider?.name} command center</h2>
                <p className={`mt-2 max-w-3xl text-sm leading-6 ${tone.subtext}`}>
                  {activeGuide.nextAction?.title || "Review setup"}: {activeGuide.nextAction?.detail || activeProvider?.desc}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <SignalCard label="Setup" value={`${activeSummary?.completedSteps || 0}/${activeSummary?.totalSteps || 0}`} darkMode={darkMode} />
              <SignalCard label="Connection" value={activeSummary?.connected ? "Connected" : "Not connected"} darkMode={darkMode} />
              <SignalCard label="Test" value={activeTestResult ? activeTestResult.title : "Not run"} darkMode={darkMode} />
              <SignalCard label="Delivery" value={deliveryState} darkMode={darkMode} />
            </div>
          </section>

          <GitHubConnectConsole
            value={githubForm}
            status={github}
            onChange={setGithubForm}
            darkMode={darkMode}
            onConnect={handleConnectAndVerify}
            onToggleEnabled={toggleEnabled}
            busy={saving || testing}
            activeSummary={activeSummary}
            setupProgress={setupProgress}
            deliveryState={deliveryState}
            testResult={activeTestResult}
            guide={activeGuide}
          />
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

function GitHubConnectConsole({
  value,
  status,
  onChange,
  darkMode,
  onConnect,
  onToggleEnabled,
  busy,
  activeSummary,
  setupProgress,
  deliveryState,
  testResult,
  guide,
}) {
  const [copied, setCopied] = useState("");
  const [activeStep, setActiveStep] = useState("repo");
  const repoOwner = status?.repo_owner || value.repo_owner;
  const repoName = status?.repo_name || value.repo_name;
  const repoSlug = status?.repo_slug || (hasText(repoOwner) && hasText(repoName) ? `${repoOwner}/${repoName}` : "");
  const rawWebhookUrl = status?.webhook_readiness?.webhook_url || "";
  const webhookUrlIsLocal = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(?::|\/)/i.test(rawWebhookUrl);
  const webhookUrl = rawWebhookUrl && !webhookUrlIsLocal ? rawWebhookUrl : "";
  const webhookDisplay = webhookUrl || (rawWebhookUrl && webhookUrlIsLocal ? "Public API URL needed" : "Connect once to reveal this");
  const processedCount = status?.webhook_observability?.recent_processed_count || 0;
  const connectionReady = Boolean(status?.configured) || hasText(value.access_token);
  const secretReady = Boolean(status?.has_webhook_secret) || hasText(value.webhook_secret);
  const repoReady = hasText(repoOwner) && hasText(repoName);
  const actionLabel = busy ? "Securing connection..." : setupProgress >= 80 ? "Reconnect and verify" : "Connect and verify";
  const inputClass = `mt-2 w-full rounded-xl border px-3 py-3 text-sm outline-none transition ${
    darkMode
      ? "border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:border-emerald-400"
      : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-slate-900"
  }`;
  const labelClass = `text-[11px] font-semibold uppercase tracking-[0.14em] ${darkMode ? "text-slate-400" : "text-slate-500"}`;

  const update = (field, fieldValue) => {
    onChange((prev) => ({ ...prev, [field]: fieldValue }));
  };

  const copyValue = async (label, copyText) => {
    if (!copyText || !navigator?.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(label);
      window.setTimeout(() => {
        setCopied((current) => (current === label ? "" : current));
      }, 1400);
    } catch {
      setCopied("");
    }
  };

  const setupCards = [
    {
      id: "repo",
      title: "Repository",
      detail: repoSlug || "Choose the GitHub owner and repository.",
      done: repoReady,
      icon: GitBranch,
    },
    {
      id: "secure",
      title: "Credentials",
      detail: connectionReady ? "Access token is ready." : "Add a token with repository read access.",
      done: connectionReady,
      icon: ShieldCheck,
    },
    {
      id: "webhook",
      title: "Webhook",
      detail: processedCount
        ? `${processedCount} processed deliveries.`
        : webhookUrl
          ? "Payload URL is ready to copy."
          : rawWebhookUrl && webhookUrlIsLocal
            ? "Localhost cannot receive GitHub webhook deliveries."
            : "Connect once to reveal the payload URL.",
      done: Boolean(processedCount || webhookUrl),
      icon: RadioTower,
    },
    {
      id: "launch",
      title: "Launch",
      detail: value.enabled ? "Automation is on for the team." : "Turn automation on when the setup is verified.",
      done: Boolean(value.enabled && (processedCount || testResult?.state === "success")),
      icon: Users,
    },
  ];
  const activeStepIndex = Math.max(0, setupCards.findIndex((card) => card.id === activeStep));
  const currentStep = setupCards[activeStepIndex] || setupCards[0];
  const nextStep = setupCards[Math.min(activeStepIndex + 1, setupCards.length - 1)];
  const previousStep = setupCards[Math.max(activeStepIndex - 1, 0)];
  const goNext = () => setActiveStep(nextStep.id);
  const goPrevious = () => setActiveStep(previousStep.id);

  return (
    <section
      className={`rounded-[28px] border p-5 ${
        darkMode
          ? "border-slate-700 bg-[linear-gradient(135deg,rgba(28,25,23,0.96),rgba(15,23,42,0.94))]"
          : "border-slate-200 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(240,253,244,0.92))]"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className={labelClass}>Guided GitHub connection</p>
          <h3 className={`mt-2 text-2xl font-black ${darkMode ? "text-slate-100" : "text-slate-900"}`}>
            One clean flow from repo to team signal
          </h3>
          <p className={`mt-2 max-w-3xl text-sm leading-6 ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
            Add the repository details, connect once, then use the webhook packet below to finish the GitHub side.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleEnabled}
            className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
              value.enabled
                ? darkMode
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                  : "border-emerald-300 bg-emerald-50 text-emerald-700"
                : darkMode
                  ? "border-slate-600 bg-slate-900 text-slate-200"
                  : "border-slate-300 bg-white text-slate-700"
            }`}
          >
            {value.enabled ? "Automation on" : "Automation off"}
          </button>
          <button
            type="button"
            onClick={onConnect}
            disabled={busy}
            className={`rounded-xl border px-4 py-2 text-xs font-semibold text-white disabled:opacity-60 ${
              darkMode
                ? "border-indigo-500 bg-indigo-600 hover:bg-indigo-500"
                : "border-indigo-600 bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {actionLabel}
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="space-y-4">
          <div className={`rounded-2xl border p-3 ${darkMode ? "border-slate-700 bg-slate-900/75" : "border-white bg-white/90"}`}>
            <div className="grid gap-2 md:grid-cols-4">
              {setupCards.map((card, index) => {
                const Icon = card.icon;
                const selected = card.id === activeStep;
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => setActiveStep(card.id)}
                    className={`rounded-xl border p-3 text-left transition ${
                      selected
                        ? darkMode
                          ? "border-emerald-500 bg-emerald-500/10"
                          : "border-slate-900 bg-slate-900 text-white"
                        : card.done
                          ? darkMode
                            ? "border-emerald-500/20 bg-emerald-500/10"
                            : "border-emerald-200 bg-emerald-50"
                          : darkMode
                            ? "border-slate-700 bg-slate-950 hover:border-slate-500"
                            : "border-slate-200 bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${
                          selected && !darkMode
                            ? "bg-white/15 text-white"
                            : card.done
                              ? darkMode
                                ? "bg-emerald-500/20 text-emerald-200"
                                : "bg-white text-emerald-700"
                              : darkMode
                                ? "bg-slate-800 text-slate-300"
                                : "bg-white text-slate-600"
                        }`}
                      >
                        <Icon size={16} />
                      </span>
                      <span className={`text-xs font-bold ${selected && !darkMode ? "text-white" : darkMode ? "text-slate-300" : "text-slate-600"}`}>
                        {card.done ? <CheckCircle2 size={15} /> : index + 1}
                      </span>
                    </div>
                    <p className={`mt-3 text-sm font-bold ${selected && !darkMode ? "text-white" : darkMode ? "text-slate-100" : "text-slate-900"}`}>
                      {card.title}
                    </p>
                    <p className={`mt-1 line-clamp-2 text-xs leading-5 ${selected && !darkMode ? "text-slate-200" : darkMode ? "text-slate-400" : "text-slate-600"}`}>
                      {card.detail}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={`rounded-2xl border p-5 ${darkMode ? "border-slate-700 bg-slate-900/75" : "border-white bg-white/90"}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className={labelClass}>Step {activeStepIndex + 1} of {setupCards.length}</p>
                <h4 className={`mt-1 text-xl font-black ${darkMode ? "text-slate-100" : "text-slate-900"}`}>{currentStep.title}</h4>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  currentStep.done
                    ? darkMode
                      ? "bg-emerald-500/15 text-emerald-200"
                      : "bg-emerald-100 text-emerald-700"
                    : darkMode
                      ? "bg-slate-800 text-slate-300"
                      : "bg-slate-100 text-slate-600"
                }`}
              >
                {currentStep.done ? "Ready" : "Needs input"}
              </span>
            </div>

            {activeStep === "repo" ? (
              <div className="mt-5 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label>
                    <span className={labelClass}>Owner</span>
                    <input
                      id="github-repo-owner"
                      value={value.repo_owner}
                      onChange={(event) => update("repo_owner", event.target.value)}
                      placeholder="your-org"
                      className={inputClass}
                    />
                  </label>
                  <label>
                    <span className={labelClass}>Repository</span>
                    <input
                      id="github-repo-name"
                      value={value.repo_name}
                      onChange={(event) => update("repo_name", event.target.value)}
                      placeholder="product-app"
                      className={inputClass}
                    />
                  </label>
                </div>
                <PreviewStrip
                  darkMode={darkMode}
                  label="Repository preview"
                  value={repoSlug || "No repository selected yet"}
                  helper="This is the exact owner/repo Knoledgr will use for validation and webhook guidance."
                />
              </div>
            ) : null}

            {activeStep === "secure" ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className={labelClass}>Access token</span>
                  <input
                    id="github-access-token"
                    type="password"
                    value={value.access_token}
                    onChange={(event) => update("access_token", event.target.value)}
                    placeholder={status?.configured ? "Token stored. Add a new one to replace it." : "Paste GitHub token"}
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>Webhook secret</span>
                  <input
                    id="github-webhook-secret"
                    type="password"
                    value={value.webhook_secret}
                    onChange={(event) => update("webhook_secret", event.target.value)}
                    placeholder={status?.has_webhook_secret ? "Secret stored. Add a new one to replace it." : "Use a strong shared secret"}
                    className={inputClass}
                  />
                </label>
                <PreviewStrip
                  darkMode={darkMode}
                  label="Security state"
                  value={`${connectionReady ? "Token ready" : "Token missing"} · ${secretReady ? "Secret ready" : "Secret missing"}`}
                  helper="Stored values are kept masked. Enter a new value only when you want to replace it."
                />
              </div>
            ) : null}

            {activeStep === "webhook" ? (
              <div className="mt-5 space-y-3">
                {[
                  ["Payload URL", webhookDisplay],
                  ["Content type", "application/json"],
                  ["Events", "push, pull_request"],
                ].map(([label, display]) => (
                  <CopyRow
                    key={label}
                    darkMode={darkMode}
                    label={label}
                    value={display}
                    disabled={display.startsWith("Connect") || display.startsWith("Public")}
                    copied={copied === label}
                    onCopy={() => copyValue(label, display)}
                  />
                ))}
                <PreviewStrip
                  darkMode={darkMode}
                  label="Delivery monitor"
                  value={deliveryState}
                  helper={
                    webhookUrlIsLocal
                      ? "Set PUBLIC_API_URL to the deployed API domain before copying a GitHub webhook URL."
                      : processedCount
                        ? "GitHub is already sending usable events."
                        : "After the webhook is added in GitHub, trigger a push or PR event."
                  }
                />
              </div>
            ) : null}

            {activeStep === "launch" ? (
              <div className="mt-5 space-y-4">
                <div className={`rounded-2xl border p-4 ${darkMode ? "border-slate-700 bg-slate-950" : "border-slate-200 bg-slate-50"}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className={`text-sm font-bold ${darkMode ? "text-slate-100" : "text-slate-900"}`}>Team automation</p>
                      <p className={`mt-1 text-sm ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
                        Enable after connection and webhook delivery are verified.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onToggleEnabled}
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                        value.enabled
                          ? darkMode
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                            : "border-emerald-300 bg-emerald-50 text-emerald-700"
                          : darkMode
                            ? "border-slate-600 bg-slate-900 text-slate-200"
                            : "border-slate-300 bg-white text-slate-700"
                      }`}
                    >
                      {value.enabled ? "Automation on" : "Automation off"}
                    </button>
                  </div>
                </div>
                <label className={`flex items-center justify-between gap-3 rounded-2xl border p-4 ${darkMode ? "border-slate-700 bg-slate-950" : "border-slate-200 bg-slate-50"}`}>
                  <span>
                    <span className={`block text-sm font-bold ${darkMode ? "text-slate-100" : "text-slate-900"}`}>Auto-link PRs</span>
                    <span className={`mt-1 block text-sm ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
                      PR titles, branches, and commits can attach to decisions automatically.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={Boolean(value.auto_link_prs)}
                    onChange={(event) => update("auto_link_prs", event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </label>
              </div>
            ) : null}

            <div className={`mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4 ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
              <button
                type="button"
                onClick={goPrevious}
                disabled={activeStepIndex === 0}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold disabled:opacity-40 ${
                  darkMode ? "border-slate-600 text-slate-200 hover:bg-slate-800" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                Back
              </button>
              <div className="flex flex-wrap items-center gap-2">
                {activeStepIndex < setupCards.length - 1 ? (
                  <button
                    type="button"
                    onClick={goNext}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                      darkMode ? "border-slate-600 text-slate-100 hover:bg-slate-800" : "border-slate-300 bg-white text-slate-800 hover:bg-slate-100"
                    }`}
                  >
                    Next: {nextStep.title}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={onConnect}
                  disabled={busy}
                  className={`rounded-xl border px-4 py-2 text-xs font-semibold disabled:opacity-60 ${
                    darkMode
                      ? "border-emerald-500 bg-emerald-600 text-white hover:bg-emerald-500"
                      : "border-slate-900 bg-slate-900 text-white hover:bg-slate-800"
                  }`}
                >
                  {actionLabel}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className={`rounded-2xl border p-4 ${darkMode ? "border-slate-700 bg-slate-900/75" : "border-white bg-white/90"}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className={labelClass}>Setup health</p>
                <p className={`mt-1 text-3xl font-black ${darkMode ? "text-slate-100" : "text-slate-900"}`}>{setupProgress}%</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${darkMode ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"}`}>
                {activeSummary?.connected ? "Connected" : "In progress"}
              </span>
            </div>
            <div className={`mt-4 h-2 overflow-hidden rounded-full ${darkMode ? "bg-slate-800" : "bg-slate-200"}`}>
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${setupProgress}%` }} />
            </div>
            <div className="mt-4 grid gap-2">
              {setupCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.title}
                    className={`flex items-start gap-3 rounded-xl border px-3 py-3 ${
                      card.done
                        ? darkMode
                          ? "border-emerald-500/25 bg-emerald-500/10"
                          : "border-emerald-200 bg-emerald-50"
                        : darkMode
                          ? "border-slate-700 bg-slate-950"
                          : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <Icon size={17} className={card.done ? "text-emerald-500" : darkMode ? "text-slate-400" : "text-slate-500"} />
                    <div>
                      <p className={`text-sm font-bold ${darkMode ? "text-slate-100" : "text-slate-900"}`}>{card.title}</p>
                      <p className={`mt-1 text-xs leading-5 ${darkMode ? "text-slate-400" : "text-slate-600"}`}>{card.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={`rounded-2xl border p-4 ${darkMode ? "border-slate-700 bg-slate-900/75" : "border-white bg-white/90"}`}>
            <p className={labelClass}>Webhook packet</p>
            <div className="mt-3 space-y-2">
              {[
                ["Payload URL", webhookDisplay],
                ["Content type", "application/json"],
                ["Events", "push, pull_request"],
                ["Delivery state", deliveryState],
              ].map(([label, display]) => (
                <div
                  key={label}
                  className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-3 ${
                    darkMode ? "border-slate-700 bg-slate-950" : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="min-w-0">
                    <p className={labelClass}>{label}</p>
                    <p className={`mt-1 truncate text-sm font-semibold ${darkMode ? "text-slate-100" : "text-slate-900"}`}>{display}</p>
                  </div>
                  {label !== "Delivery state" && display && !display.startsWith("Connect") && !display.startsWith("Public") ? (
                    <button
                      type="button"
                      onClick={() => copyValue(label, display)}
                      className={`shrink-0 rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${
                        darkMode ? "border-slate-600 text-slate-200 hover:bg-slate-800" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {copied === label ? "Copied" : "Copy"}
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={`mt-4 rounded-2xl border px-4 py-3 ${darkMode ? "border-slate-700 bg-slate-900/70" : "border-slate-200 bg-white/80"}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className={`text-sm font-bold ${darkMode ? "text-slate-100" : "text-slate-900"}`}>
              {testResult ? testResult.title : guide?.nextAction?.title || "Ready for a clean connection"}
            </p>
            <p className={`mt-1 text-sm ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
              {testResult ? testResult.detail : guide?.nextAction?.detail || "Connect and verify when the repository details are ready."}
            </p>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(value.auto_link_prs)}
              onChange={(event) => update("auto_link_prs", event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className={`text-sm font-semibold ${darkMode ? "text-slate-200" : "text-slate-700"}`}>Auto-link PRs</span>
          </label>
        </div>
      </div>
    </section>
  );
}

function PreviewStrip({ darkMode, label, value, helper }) {
  return (
    <div className={`rounded-xl border px-3 py-3 ${darkMode ? "border-slate-700 bg-slate-950" : "border-slate-200 bg-slate-50"}`}>
      <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
        {label}
      </p>
      <p className={`mt-1 break-words text-sm font-bold ${darkMode ? "text-slate-100" : "text-slate-900"}`}>{value}</p>
      <p className={`mt-1 text-xs leading-5 ${darkMode ? "text-slate-400" : "text-slate-600"}`}>{helper}</p>
    </div>
  );
}

function CopyRow({ darkMode, label, value, disabled, copied, onCopy }) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-3 ${
        darkMode ? "border-slate-700 bg-slate-950" : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="min-w-0">
        <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
          {label}
        </p>
        <p className={`mt-1 truncate text-sm font-semibold ${darkMode ? "text-slate-100" : "text-slate-900"}`}>{value}</p>
      </div>
      {!disabled ? (
        <button
          type="button"
          onClick={onCopy}
          className={`shrink-0 rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${
            darkMode ? "border-slate-600 text-slate-200 hover:bg-slate-800" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
          }`}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      ) : null}
    </div>
  );
}

function SignalTile({ signal, darkMode }) {
  const Icon = signal.icon;
  return (
    <div
      className={`rounded-2xl border p-4 ${
        darkMode
          ? "border-slate-700 bg-slate-900/80"
          : "border-white/80 bg-white/85 shadow-[0_16px_40px_rgba(28,25,23,0.06)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${
            darkMode ? "bg-slate-800 text-emerald-200" : "bg-emerald-50 text-emerald-700"
          }`}
        >
          <Icon size={18} />
        </span>
        <span className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
          Live
        </span>
      </div>
      <p className={`mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
        {signal.label}
      </p>
      <p className={`mt-1 truncate text-lg font-black ${darkMode ? "text-slate-100" : "text-slate-900"}`}>{signal.value}</p>
      <p className={`mt-1 text-sm ${darkMode ? "text-slate-400" : "text-slate-600"}`}>{signal.detail}</p>
    </div>
  );
}

function TeamPathTile({ item, darkMode }) {
  const Icon = item.icon;
  return (
    <div
      className={`rounded-2xl border p-4 ${
        item.done
          ? darkMode
            ? "border-emerald-500/30 bg-emerald-500/10"
            : "border-emerald-200 bg-emerald-50/80"
          : darkMode
            ? "border-slate-700 bg-slate-900/70"
            : "border-white/80 bg-white/75"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${
            item.done
              ? darkMode
                ? "bg-emerald-500/20 text-emerald-200"
                : "bg-white text-emerald-700"
              : darkMode
                ? "bg-slate-800 text-slate-300"
                : "bg-slate-100 text-slate-600"
          }`}
        >
          <Icon size={17} />
        </span>
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            item.done
              ? darkMode
                ? "bg-emerald-500/15 text-emerald-200"
                : "bg-emerald-100 text-emerald-700"
              : darkMode
                ? "bg-slate-800 text-slate-300"
                : "bg-slate-100 text-slate-600"
          }`}
        >
          {item.done ? "Ready" : "Next"}
        </span>
      </div>
      <p className={`mt-3 text-sm font-bold ${darkMode ? "text-slate-100" : "text-slate-900"}`}>{item.title}</p>
      <p className={`mt-1 text-sm leading-6 ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{item.detail}</p>
    </div>
  );
}

function IntegrationMap({
  darkMode,
  setupProgress,
  connectedCount,
  providerCount,
  activeProvider,
  activeSummary,
  activeTestResult,
}) {
  const ringStyle = {
    background: `conic-gradient(${darkMode ? "#34d399" : "#059669"} ${setupProgress * 3.6}deg, ${
      darkMode ? "rgba(68,64,60,0.9)" : "rgba(231,229,228,0.95)"
    } 0deg)`,
  };

  return (
    <div
      className={`rounded-[28px] border p-5 ${
        darkMode
          ? "border-slate-700 bg-[linear-gradient(180deg,rgba(28,25,23,0.96),rgba(12,18,26,0.94))]"
          : "border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(240,253,244,0.9))] shadow-[0_24px_60px_rgba(28,25,23,0.08)]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
            Integration map
          </p>
          <h2 className={`mt-2 text-xl font-black ${darkMode ? "text-slate-100" : "text-slate-900"}`}>Signal path</h2>
        </div>
        <div className="grid h-24 w-24 place-items-center rounded-full p-2" style={ringStyle}>
          <div className={`grid h-full w-full place-items-center rounded-full ${darkMode ? "bg-slate-950" : "bg-white"}`}>
            <span className={`text-xl font-black ${darkMode ? "text-slate-100" : "text-slate-900"}`}>{setupProgress}%</span>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {[
          { label: "Provider", value: activeProvider?.name || "GitHub", icon: GitBranch },
          { label: "Connected", value: `${connectedCount}/${providerCount}`, icon: CheckCircle2 },
          { label: "Latest test", value: activeTestResult ? activeTestResult.title : "Not run", icon: Activity },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${
                darkMode ? "border-slate-700 bg-slate-900/85" : "border-slate-200 bg-white/85"
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    darkMode ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  <Icon size={16} />
                </span>
                <div className="min-w-0">
                  <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                    {item.label}
                  </p>
                  <p className={`truncate text-sm font-bold ${darkMode ? "text-slate-100" : "text-slate-900"}`}>{item.value}</p>
                </div>
              </div>
              <ArrowRight size={16} className={darkMode ? "text-slate-500" : "text-slate-400"} />
            </div>
          );
        })}
      </div>

      <div className={`mt-5 rounded-2xl border p-4 ${darkMode ? "border-slate-700 bg-slate-900/70" : "border-slate-200 bg-white/80"}`}>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${
              darkMode ? "bg-emerald-500/15 text-emerald-200" : "bg-emerald-100 text-emerald-700"
            }`}
          >
            <Users size={18} />
          </span>
          <div>
            <p className={`text-sm font-bold ${darkMode ? "text-slate-100" : "text-slate-900"}`}>Team handoff</p>
            <p className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
              {activeSummary?.nextAction || "Finish setup, then share the workflow."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProviderSelectCard({ provider, active, darkMode, onClick }) {
  const progress = provider.totalSteps ? Math.round((provider.completedSteps / provider.totalSteps) * 100) : 0;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left transition ${
        active
          ? darkMode
            ? "border-emerald-500 bg-emerald-500/10"
            : "border-slate-900 bg-slate-900 text-white"
          : darkMode
            ? "border-slate-700 bg-slate-900 hover:border-slate-500"
            : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-sm font-semibold ${active && !darkMode ? "text-white" : darkMode ? "text-slate-100" : "text-slate-900"}`}>
            {provider.name}
          </p>
          <p className={`mt-1 text-[11px] uppercase tracking-[0.14em] ${active && !darkMode ? "text-slate-200" : darkMode ? "text-slate-400" : "text-slate-500"}`}>
            {provider.category}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            provider.connected
              ? active && !darkMode
                ? "bg-white/15 text-white"
                : darkMode
                  ? "bg-emerald-500/20 text-emerald-200"
                  : "bg-emerald-100 text-emerald-700"
              : active && !darkMode
                ? "bg-white/10 text-slate-100"
                : darkMode
                  ? "bg-slate-800 text-slate-300"
                  : "bg-slate-100 text-slate-600"
          }`}
        >
          {provider.connected ? "Live" : "Setup"}
        </span>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <div className={`h-2 flex-1 overflow-hidden rounded-full ${darkMode ? "bg-slate-800" : active && !darkMode ? "bg-white/15" : "bg-slate-200"}`}>
          <div
            className={`h-full rounded-full ${provider.connected ? "bg-emerald-500" : active && !darkMode ? "bg-white" : darkMode ? "bg-slate-500" : "bg-slate-400"}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className={`text-xs font-semibold ${active && !darkMode ? "text-white" : darkMode ? "text-slate-300" : "text-slate-700"}`}>
          {progress}%
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className={`text-xs ${active && !darkMode ? "text-slate-200" : darkMode ? "text-slate-400" : "text-slate-500"}`}>
          {provider.completedSteps}/{provider.totalSteps} checks
        </p>
        <p className={`truncate text-xs font-medium ${active && !darkMode ? "text-white" : darkMode ? "text-slate-200" : "text-slate-700"}`}>
          {provider.key === "github" ? "Open workspace" : provider.nextAction}
        </p>
      </div>
    </button>
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
          ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-200"
          : "border-indigo-200 bg-indigo-50 text-indigo-800"
        : darkMode
          ? "border-slate-700 bg-slate-800 text-slate-300"
          : "border-slate-200 bg-slate-50 text-slate-700";
  const overviewShell = darkMode
    ? "rounded-[18px] border border-slate-700 bg-slate-900/90 p-5"
    : "rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.05)]";
  const surfaceTone = darkMode
    ? "rounded-[14px] border border-slate-700 bg-slate-950/70"
    : "rounded-[14px] border border-slate-200 bg-slate-50/60";
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
            <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
              GitHub setup
            </p>
            <h3 className={`mt-2 text-2xl font-bold ${darkMode ? "text-slate-100" : "text-slate-900"}`}>
              Connect one repository, reveal the webhook, then confirm live delivery traffic
            </h3>
            <p className={`mt-3 text-sm leading-6 ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
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
                    ? "border-slate-600 bg-slate-950 text-slate-100 hover:border-slate-400"
                    : "border-slate-300 bg-white text-slate-800 hover:border-slate-500"
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
                    ? "border-slate-600 bg-slate-950 text-slate-100 hover:border-slate-400"
                    : "border-slate-300 bg-white text-slate-800 hover:border-slate-500"
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
                  ? "border-slate-600 bg-slate-950 text-slate-100 hover:border-slate-400"
                  : "border-slate-300 bg-white text-slate-800 hover:border-slate-500"
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
            <p className={`mt-2 text-base font-semibold ${darkMode ? "text-slate-100" : "text-slate-900"}`}>{nextActionTitle}</p>
            <p className={`mt-2 text-sm leading-6 ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{nextActionDetail}</p>
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
                      ? "border-slate-600 bg-slate-950 text-slate-100 hover:border-slate-400"
                      : "border-slate-300 bg-white text-slate-800 hover:border-slate-500"
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
                  <p className={`text-sm font-semibold ${darkMode ? "text-slate-100" : "text-slate-900"}`}>Repository target preview</p>
                  <p className={`mt-1 text-sm leading-6 ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
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
                        ? "border-slate-600 bg-slate-900 text-slate-100 hover:border-slate-400"
                        : "border-slate-300 bg-white text-slate-800 hover:border-slate-500"
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
            <div className={`${surfaceTone} px-4 py-3 text-sm ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
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
                      ? "border-slate-600 bg-slate-950 text-slate-100 hover:border-slate-400"
                      : "border-slate-300 bg-white text-slate-800 hover:border-slate-500"
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
                  darkMode ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-100" : "border-indigo-200 bg-indigo-50 text-indigo-900"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="max-w-2xl">
                    <p className="text-sm font-semibold">Payload URL appears after you save</p>
                    <p className={`mt-1 text-sm leading-6 ${darkMode ? "text-indigo-100/90" : "text-indigo-900/80"}`}>
                      Save the repository target and webhook secret first. Knoledgr then reveals the exact payload URL GitHub should send to.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onSave}
                    disabled={saving}
                    className={`inline-flex rounded-full border px-4 py-2 text-xs font-semibold ${
                      darkMode
                        ? "border-indigo-300/40 bg-slate-950 text-indigo-100 hover:border-indigo-200 disabled:opacity-60"
                        : "border-indigo-300 bg-white text-indigo-900 hover:border-indigo-400 disabled:opacity-60"
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
        darkMode ? "border-slate-700 bg-slate-800/70" : "border-slate-200 bg-slate-50/60"
      }`}
    >
      <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
        {label}
      </p>
      <p className={`mt-2 text-base font-semibold ${darkMode ? "text-slate-100" : "text-slate-900"}`}>{value}</p>
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
      ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-200"
      : "border-indigo-200 bg-indigo-50 text-indigo-800";

  return (
    <section
      className={`rounded-2xl border p-4 space-y-4 ${
        darkMode ? "border-slate-700 bg-slate-800/60" : "border-slate-200 bg-slate-50/70"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
            Integration Assistant
          </p>
          <h3 className={`mt-2 text-lg font-bold ${darkMode ? "text-slate-100" : "text-slate-900"}`}>
            {guide.title}
          </h3>
          <p className={`mt-2 text-sm ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
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
                ? "border-slate-600 bg-slate-900 text-slate-100 hover:border-slate-400"
                : "border-slate-300 bg-white text-slate-800 hover:border-slate-500"
            }`}
          >
            {guide.docLabel}
          </Link>
          <Link
            to="/feedback"
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
              darkMode
                ? "border-slate-600 bg-slate-900 text-slate-300 hover:border-slate-400"
                : "border-slate-300 bg-white text-slate-700 hover:border-slate-500"
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
                darkMode ? "border-slate-700 bg-slate-900 text-slate-200" : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              <span className={`font-semibold ${darkMode ? "text-slate-100" : "text-slate-900"}`}>{providerName} status:</span>{" "}
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
                    ? "border-slate-700 bg-slate-900"
                    : "border-slate-200 bg-white"
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
                        ? "border-slate-600 bg-slate-800 text-slate-300"
                        : "border-slate-300 bg-slate-100 text-slate-700"
                  }`}
                >
                  {step.done ? "OK" : index + 1}
                </span>
                <div>
                  <p className={`text-sm font-semibold ${darkMode ? "text-slate-100" : "text-slate-900"}`}>{step.title}</p>
                  <p className={`mt-1 text-sm leading-6 ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{step.detail}</p>
                </div>
              </div>
            </div>
          ))}
          {guide.extraNote ? (
            <div
              className={`rounded-xl border border-dashed px-4 py-3 text-sm break-all ${
                darkMode ? "border-slate-600 text-slate-300" : "border-slate-300 text-slate-700"
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
      <p className={`mt-2 text-sm font-semibold ${darkMode ? "text-slate-100" : "text-slate-900"}`}>{nextAction.title}</p>
      <p className={`mt-1 text-sm leading-6 ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{nextAction.detail}</p>
      {nextAction.targetId ? (
        <a
          href={`#${nextAction.targetId}`}
          className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
            darkMode
              ? "border-slate-600 bg-slate-900 text-slate-100 hover:border-slate-400"
              : "border-slate-300 bg-white text-slate-800 hover:border-slate-500"
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
      <p className={`mt-2 text-sm font-semibold ${darkMode ? "text-slate-100" : "text-slate-900"}`}>{testResult.title}</p>
      <p className={`mt-1 text-sm leading-6 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>{testResult.detail}</p>
      {testResult.tips?.length ? (
        <div className="mt-3 space-y-2">
          {testResult.tips.map((tip) => (
            <div key={tip} className="flex items-start gap-2">
              <span className={`mt-1 inline-flex h-2.5 w-2.5 rounded-full ${darkMode ? "bg-current/70" : "bg-current/60"}`} />
              <p className={`text-sm leading-6 ${darkMode ? "text-slate-200" : "text-slate-700"}`}>{tip}</p>
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
        darkMode ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"
      }`}
    >
      <p className={`text-sm font-semibold ${darkMode ? "text-slate-100" : "text-slate-900"}`}>Live field checklist</p>
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
                  ? "border-slate-700 bg-slate-800"
                  : "border-slate-200 bg-slate-50"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={`text-sm font-medium ${darkMode ? "text-slate-100" : "text-slate-900"}`}>{item.label}</p>
                <p className={`mt-1 text-xs break-all ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{item.value}</p>
                <p className={`mt-1 text-xs leading-5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{item.helper}</p>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-2">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                    item.ready
                      ? darkMode
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : darkMode
                        ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-200"
                        : "border-indigo-200 bg-indigo-50 text-indigo-700"
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
        darkMode ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"
      }`}
    >
      <p className={`text-sm font-semibold ${darkMode ? "text-slate-100" : "text-slate-900"}`}>{config.title}</p>
      <div className="mt-3 space-y-2">
        {config.items.map((item) => (
          <div
            key={item.label}
            className={`rounded-lg border px-3 py-3 ${
              darkMode ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-slate-50"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                {item.label}
              </p>
              {item.copyValue ? (
                <button
                  type="button"
                  onClick={() => handleCopy(item.label, item.copyValue)}
                  className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                    darkMode
                      ? "border-slate-600 bg-slate-900 text-slate-200 hover:border-slate-400"
                      : "border-slate-300 bg-white text-slate-700 hover:border-slate-500"
                  }`}
                >
                  {copiedLabel === item.label ? "Copied" : "Copy"}
                </button>
              ) : null}
            </div>
            <p className={`mt-2 text-sm font-medium break-all ${darkMode ? "text-slate-100" : "text-slate-900"}`}>{item.value}</p>
            <p className={`mt-1 text-xs leading-5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{item.helper}</p>
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
        darkMode ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"
      }`}
    >
      <p className={`text-sm font-semibold ${darkMode ? "text-slate-100" : "text-slate-900"}`}>Setup shortcuts</p>
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
                  ? "border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-400"
                  : "border-slate-300 bg-slate-50 text-slate-800 hover:border-slate-500"
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
                  ? "border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-400"
                  : "border-slate-300 bg-slate-50 text-slate-800 hover:border-slate-500"
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
        darkMode ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"
      }`}
    >
      <p className={`text-sm font-semibold ${darkMode ? "text-slate-100" : "text-slate-900"}`}>{title}</p>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div key={item} className="flex items-start gap-2">
            <span className={`mt-1 inline-flex h-2.5 w-2.5 rounded-full ${darkMode ? "bg-slate-500" : "bg-slate-400"}`} />
            <p className={`text-sm leading-6 ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
