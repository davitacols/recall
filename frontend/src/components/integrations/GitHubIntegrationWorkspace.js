import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import GitHubDecisionLinker from "./GitHubDecisionLinker";
import { Check, ClipboardInput, Field } from "./IntegrationFormControls";

function hasText(value) {
  return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
}

function parseGitHubRepositoryInput(rawValue) {
  const raw = (rawValue || "").trim();
  if (!raw) return null;

  const withoutProtocol = raw
    .replace(/^https?:\/\/github\.com\//i, "")
    .replace(/^github\.com\//i, "")
    .replace(/^git@github\.com:/i, "")
    .replace(/\.git$/i, "")
    .replace(/^\/+|\/+$/g, "");

  const parts = withoutProtocol.split("/").filter(Boolean);
  if (parts.length < 2) return null;

  const owner = parts[0];
  const repo = parts[1];
  if (!owner || !repo) return null;

  return {
    owner,
    repo,
    slug: `${owner}/${repo}`,
  };
}

function StatusPill({ label, value, tone, darkMode }) {
  const styles = {
    emerald: darkMode ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200" : "border-emerald-200 bg-emerald-50 text-emerald-800",
    amber: darkMode ? "border-amber-500/40 bg-amber-500/10 text-amber-200" : "border-amber-200 bg-amber-50 text-amber-800",
    rose: darkMode ? "border-rose-500/40 bg-rose-500/10 text-rose-200" : "border-rose-200 bg-rose-50 text-rose-800",
    sky: darkMode ? "border-sky-500/40 bg-sky-500/10 text-sky-200" : "border-sky-200 bg-sky-50 text-sky-800",
    slate: darkMode ? "border-stone-600 bg-stone-900 text-stone-300" : "border-stone-200 bg-stone-50 text-stone-700",
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

function GitHubPanel({ eyebrow, title, description, darkMode, action = null, children }) {
  return (
    <section
      className={`rounded-[18px] border p-4 ${
        darkMode
          ? "border-stone-700 bg-stone-900/85"
          : "border-stone-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.04)]"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${darkMode ? "text-sky-300/80" : "text-sky-700"}`}>
            {eyebrow}
          </p>
          <h4 className={`mt-2 text-lg font-bold ${darkMode ? "text-stone-100" : "text-stone-900"}`}>{title}</h4>
          <p className={`mt-2 text-sm leading-6 ${darkMode ? "text-stone-300" : "text-stone-600"}`}>{description}</p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function GitHubStepCard({ step, title, detail, state, tone = "slate", darkMode }) {
  const tones = {
    emerald: darkMode ? "border-emerald-500/30 bg-emerald-500/10" : "border-emerald-200 bg-emerald-50/90",
    amber: darkMode ? "border-amber-500/30 bg-amber-500/10" : "border-amber-200 bg-amber-50/90",
    sky: darkMode ? "border-sky-500/30 bg-sky-500/10" : "border-sky-200 bg-sky-50/90",
    slate: darkMode ? "border-stone-700 bg-stone-900/90" : "border-stone-200 bg-white/90",
  };

  return (
    <div className={`rounded-[14px] border px-4 py-4 ${tones[tone] || tones.slate}`}>
      <div className="flex items-start justify-between gap-3">
        <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${darkMode ? "text-stone-400" : "text-stone-500"}`}>
          {step}
        </p>
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
            darkMode ? "border-stone-600 bg-stone-900 text-stone-200" : "border-stone-200 bg-white text-stone-700"
          }`}
        >
          {state}
        </span>
      </div>
      <p className={`mt-3 text-base font-semibold ${darkMode ? "text-stone-100" : "text-stone-900"}`}>{title}</p>
      <p className={`mt-2 text-sm leading-6 ${darkMode ? "text-stone-300" : "text-stone-600"}`}>{detail}</p>
    </div>
  );
}

function CopyShortcutButton({ label, value, darkMode, compact = false }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value || !navigator?.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex rounded-full border font-semibold ${
        compact ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs"
      } ${
        darkMode
          ? "border-stone-600 bg-stone-900 text-stone-100 hover:border-sky-400"
          : "border-stone-300 bg-white text-stone-800 hover:border-sky-500"
      }`}
    >
      {copied ? "Copied" : label}
    </button>
  );
}

function GitHubValueRow({ label, value, helper, darkMode, copyValue = null }) {
  return (
    <div
      className={`rounded-[14px] border px-4 py-3 ${
        darkMode ? "border-stone-700 bg-stone-950/70 text-stone-200" : "border-stone-200 bg-stone-50/60 text-stone-700"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${darkMode ? "text-stone-400" : "text-stone-500"}`}>
            {label}
          </p>
          <p className={`mt-2 break-all text-sm font-semibold ${darkMode ? "text-stone-100" : "text-stone-900"}`}>{value}</p>
          <p className={`mt-1 text-xs leading-5 ${darkMode ? "text-stone-400" : "text-stone-500"}`}>{helper}</p>
        </div>
        {copyValue ? <CopyShortcutButton label="Copy" value={copyValue} darkMode={darkMode} compact /> : null}
      </div>
    </div>
  );
}

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

function GitHubDeliveryRow({ delivery, darkMode }) {
  return (
    <div
      className={`rounded-[14px] border px-4 py-4 ${
        darkMode ? "border-stone-700 bg-stone-950/70 text-stone-200" : "border-stone-200 bg-stone-50/60 text-stone-700"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-sm font-semibold ${darkMode ? "text-stone-100" : "text-stone-900"}`}>
            {[delivery.event, delivery.action || null].filter(Boolean).join(" | ")}
          </p>
          <p className={`mt-1 text-xs ${darkMode ? "text-stone-400" : "text-stone-500"}`}>
            {[
              delivery.delivery_id ? `Delivery ${delivery.delivery_id}` : null,
              delivery.created_at ? new Date(delivery.created_at).toLocaleString() : null,
              delivery.repository_owner && delivery.repository_name ? `${delivery.repository_owner}/${delivery.repository_name}` : null,
            ]
              .filter(Boolean)
              .join(" | ")}
          </p>
          {delivery.message ? (
            <p className={`mt-2 text-xs leading-5 ${darkMode ? "text-stone-300" : "text-stone-600"}`}>{delivery.message}</p>
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
  );
}

function GitHubActivityRow({ item, darkMode }) {
  const itemType = (item.type || "activity").replaceAll("_", " ");

  return (
    <div
      className={`rounded-[14px] border px-4 py-4 ${
        darkMode ? "border-stone-700 bg-stone-950/70 text-stone-200" : "border-stone-200 bg-stone-50/60 text-stone-700"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-sm font-semibold ${darkMode ? "text-stone-100" : "text-stone-900"}`}>{item.title || itemType}</p>
          <p className={`mt-1 text-xs ${darkMode ? "text-stone-400" : "text-stone-500"}`}>
            {[itemType, item.subtitle, item.author, item.timestamp ? new Date(item.timestamp).toLocaleString() : null]
              .filter(Boolean)
              .join(" | ")}
          </p>
        </div>
        {item.url ? (
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
              darkMode
                ? "border-stone-600 bg-stone-800 text-stone-100 hover:border-sky-400"
                : "border-stone-300 bg-stone-50 text-stone-800 hover:border-sky-500"
            }`}
          >
            Open
          </a>
        ) : null}
      </div>
    </div>
  );
}

export default function GitHubIntegrationWorkspace({
  value,
  status,
  darkMode,
  onChange,
  onSave,
  saving = false,
}) {
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
            action={webhookUrl ? <CopyShortcutButton label="Copy payload URL" value={webhookUrl} darkMode={darkMode} /> : null}
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
}
